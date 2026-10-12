import { type ReactElement, useMemo, useRef, useState } from 'react';
import { Image, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import {
  Atlas,
  Canvas,
  Fill,
  FilterMode,
  Group,
  MipmapMode,
  Skia,
  type SkImage,
  useImage,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDecay,
} from 'react-native-reanimated';
import type { Tree } from '../db/useForest';
import { MAP_COLS, MAP_ROWS } from '../game/grid';
import type { Ground } from '../game/treeRules';
import { GROUND_LEFT, GROUND_TOP, SIZE, TreeSprite } from './TreeSprite';

// A cell is square: 32 x 32 art pixels, exactly one tree.
const CELL_W = SIZE;
const CELL_H = SIZE;

// Trees and ground tiles are drawn this many times bigger than their art, so a 16x16 tile fills a cell.
const TREE_SCALE = 2;

// Around the map: one ring of fence cells, then at least FOREST_CELLS of forest you can still pan over.
// On screens that would show past that at the farthest zoom, the forest is made bigger (see onLayout).
const FOREST_CELLS = 2;
const MARGIN = 1 + FOREST_CELLS; // cells from the world edge to the map
const PAD = MARGIN * CELL_W;
const WORLD_W = (MAP_COLS + 2 * MARGIN) * CELL_W;
const WORLD_H = (MAP_ROWS + 2 * MARGIN) * CELL_H;

// Ground tiles: 16x16 art px, drawn at TREE_SCALE so their pixels match the trees.
// A tree's cell shows how well it is watered; empty cells use the dry tile.
const TILE: Record<Ground, number> = {
  dry: require('../../assets/ground/GroundTileUpscale.png'),
  damp: require('../../assets/ground/GroundTileDampUpscale.png'),
  wet: require('../../assets/ground/GroundTileWetUpscale.png'),
};
const HIGHLIGHT = require('../../assets/ui/MoveModeHighlightUpscale.png'); // free cells while moving a tree

// Fence ring: pieces are 32 fence px wide (finer pixels than the trees), on the ring of dry ground around
// the map. The corners sit on the ring's corner cells; in between, posts are spaced by their own gap,
// not one per cell, and overlap: a lower post's rod reaches into the post above it.
const FENCE = {
  topLeft: require('../../assets/misc/FenceCornerTopLeftUpscale.png'),
  topRight: require('../../assets/misc/FenceCornerTopRightUpscale.png'),
  bottomLeft: require('../../assets/misc/FenceCornerBottomLeftUpscale.png'),
  bottomRight: require('../../assets/misc/FenceCornerBottomRightUpscale.png'),
  middle: require('../../assets/misc/FenceMiddleUpscale.png'),
  side: require('../../assets/misc/FenceSideUpscale.png'),
};

const FENCE_PX = SIZE / 32; // dp per fence art pixel; a cell is 32 of them
const SIDE_GAP = 19; // fence px between side posts, so each rod reaches 13 px into the post above
// Top and bottom rows: at least 21 fence px, so a piece's rails never paint over the post next to it.
const ROW_GAP = 21;

// n whole-pixel steps that add up to `length`, as even as possible (e.g. 19, 19, 18, 19, ...)
function steps(length: number, n: number) {
  return Array.from({ length: n }, (_, i) => Math.floor(((i + 1) * length) / n) - Math.floor((i * length) / n));
}

type FencePost = { source: number; left: number; bottom: number }; // dp, in world coordinates

function fencePosts(): FencePost[] {
  const posts: FencePost[] = [];
  const leftX = left(-1);
  const rightX = left(MAP_COLS);
  const topB = top(-1) + CELL_H; // bottom edge of the top fence row
  const botB = top(MAP_ROWS) + CELL_H;

  // Top and bottom rows: a corner at each end, middle pieces in between
  const across = (MAP_COLS + 1) * 32;
  const hSteps = steps(across, Math.max(1, Math.floor(across / ROW_GAP)));
  const rows: [number, number, number][] = [
    [topB, FENCE.topLeft, FENCE.topRight],
    [botB, FENCE.bottomLeft, FENCE.bottomRight],
  ];
  for (const [bottom, first, last] of rows) {
    posts.push({ source: first, left: leftX, bottom });
    let x = 0;
    hSteps.forEach((s, i) => {
      x += s;
      posts.push({ source: i === hSteps.length - 1 ? last : FENCE.middle, left: leftX + x * FENCE_PX, bottom });
    });
  }

  // Left and right sides, between the corners
  const down = (MAP_ROWS + 1) * 32;
  const vSteps = steps(down, Math.max(1, Math.round(down / SIDE_GAP)));
  let y = 0;
  for (const s of vSteps.slice(0, -1)) {
    y += s;
    for (const x of [leftX, rightX]) posts.push({ source: FENCE.side, left: x, bottom: topB + y * FENCE_PX });
  }
  return posts;
}

// Forest: a grown pine on every cell outside the fence ring, placed like the park's own trees.
// Each one is mirrored or not and nudged a few tree pixels, from a fixed hash of its cell,
// so the forest looks less like a grid but the same every time.
// Hundreds of trees as separate views is far too slow, so the forest is drawn with Skia: one atlas
// (one GPU draw call) behind the map for the forest above and beside it, and one in front of the map
// for the forest below it, whose crowns cover the bottom fence.
const FOREST_TREE = require('../../assets/trees/PineStage4.png'); // the 32x32 original; scaled with nearest-neighbour
const TREE_PX = (SIZE / 32) * TREE_SCALE; // dp per tree art pixel on the map
const FOREST_FLOOR = '#2f5a2a'; // shows between the trunks (placeholder until there is a floor tile)
const PIXELATED = { filter: FilterMode.Nearest, mipmap: MipmapMode.None }; // every art pixel stays a sharp square

// The pine and a flipped copy side by side, so a tree is mirrored by picking the right half.
// Null if the device can't make the image; the forest is then drawn without mirroring.
function withMirror(pine: SkImage) {
  const surface = Skia.Surface.MakeOffscreen(64, 32);
  if (!surface) return null;
  const c = surface.getCanvas();
  c.drawImage(pine, 0, 0);
  c.save();
  c.scale(-1, 1);
  c.drawImage(pine, -64, 0);
  c.restore();
  surface.flush();
  return surface.makeImageSnapshot().makeNonTextureImage();
}

// The forest columns right beside the side fences are the only trees whose crowns can reach a fence post.
// They are drawn as normal views, sorted together with the fence, so a post can stand in front of them.
const FOREST_TREE_VIEW = require('../../assets/trees/PineStage4Upscale.png');
const besideSideFence = (cx: number, cy: number) => (cx === -2 || cx === MAP_COLS + 1) && cy >= -1 && cy <= MAP_ROWS;

type ForestTree = { bottom: number; left: number; top: number; mirror: boolean }; // dp, world coordinates

// Where the forest tree of a cell stands: nudged and mirrored from a fixed hash of the cell.
function forestTree(cx: number, cy: number): ForestTree {
  const hash = cellHash(cx, cy);
  const dx = ((hash >>> 1) % 5) - 2; // -2..2 tree px
  const dy = ((hash >>> 4) % 3) - 1; // -1..1 tree px
  return {
    bottom: top(cy) + CELL_H + dy * TREE_PX,
    left: left(cx) - TREE_SCALE * GROUND_LEFT + dx * TREE_PX,
    top: top(cy) - TREE_SCALE * GROUND_TOP + dy * TREE_PX,
    mirror: hash % 2 === 1,
  };
}

function cellHash(cx: number, cy: number) {
  let h = Math.imul(cx, 73856093) ^ Math.imul(cy, 19349663);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

type Layer = { bottom: number; left: number; el: ReactElement }; // drawn in order of bottom edge, then left

// Zoom stops are k/16 for whole k: every one is a whole number of screen pixels per art pixel,
// so pixels stay even. Pinch moves freely, then snaps. You can zoom out until the map, its fence and
// FOREST_CELLS of forest fit (never below 2/16); the forest then fills the rest of the screen.
const START_LEVEL = 4 / 16; // the app opens at this zoom, centered on the middle of the map
const MAX_SCALE = 1.25;
const TAP_SLOP = 8; // a touch that moves further than this (dp) is a pan, not a tap
const DECELERATION = 0.998; // how fast a glide after a pan slows down (closer to 1 = glides further)

// The functions marked 'worklet' also run on the UI thread, inside the gestures.

// The lowest zoom stop at which the map with its fence and FOREST_CELLS of forest still fits.
function minLevel(w: number, h: number) {
  'worklet';
  const fit = Math.min(w / WORLD_W, h / WORLD_H);
  return Math.max(2, Math.min(16, Math.floor(16 * fit))) / 16;
}

function nearestLevel(s: number, min: number) {
  'worklet';
  let best = min;
  for (let k = Math.round(min * 16); k <= 16; k++) {
    const l = k / 16;
    if (Math.abs(Math.log(s / l)) < Math.abs(Math.log(s / best))) best = l;
  }
  return best;
}

// One axis of the view, for a world running from lo to hi: centered when it is smaller than the screen,
// otherwise no world edge can be dragged inside the screen.
function clampAxis(pos: number, lo: number, hi: number, scale: number, screen: number) {
  'worklet';
  const size = (hi - lo) * scale;
  if (size <= screen) return (screen - size) / 2 - lo * scale;
  return Math.min(-lo * scale, Math.max(screen - hi * scale, pos));
}

function left(x: number) {
  return PAD + x * CELL_W;
}
function top(y: number) {
  return PAD + y * CELL_H;
}

type Props = {
  trees: Tree[];
  movingId: number | null; // the tree being moved; it is drawn faded
  choosing: boolean; // while true, free cells light up and a tap on one calls onCellPress
  onTreePress: (id: number) => void;
  onCellPress: (x: number, y: number) => void;
};

export function WorldMap({ trees, movingId, choosing, onTreePress, onCellPress }: Props) {
  // The view (zoom s, offset x/y) lives on the UI thread, so panning and pinching never re-render React.
  const s = useSharedValue(START_LEVEL);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const box = useSharedValue({ w: 0, h: 0 });
  // How far the camera may go (world dp) and how far it may zoom out; set from the screen size on layout.
  const bounds = useSharedValue({ x0: 0, y0: 0, x1: WORLD_W, y1: WORLD_H, minS: START_LEVEL });
  const panBase = useSharedValue({ x: 0, y: 0 });
  const pinchBase = useSharedValue({ s: 1, wx: 0, wy: 0 }); // zoom and world point under the fingers at pinch start
  const pinching = useSharedValue(false);
  const rebase = useSharedValue(false); // after a pinch, the pan carries on from where the pinch left the view
  const glides = useSharedValue(0); // axes still gliding after a pan
  const caughtGlide = useSharedValue(false); // the current touch stopped a glide
  // Extra forest cells on each side (beyond FOREST_CELLS) so the screen is covered at the farthest zoom.
  const [extra, setExtra] = useState({ x: 0, y: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    const first = box.value.w === 0;
    box.value = { w, h };
    const minS = minLevel(w, h);
    const ex = Math.max(0, Math.ceil((w / minS - WORLD_W) / 2 / CELL_W));
    const ey = Math.max(0, Math.ceil((h / minS - WORLD_H) / 2 / CELL_H));
    const b = { x0: -ex * CELL_W, y0: -ey * CELL_H, x1: WORLD_W + ex * CELL_W, y1: WORLD_H + ey * CELL_H, minS };
    bounds.value = b;
    setExtra((cur) => (cur.x === ex && cur.y === ey ? cur : { x: ex, y: ey }));

    const ns = first ? nearestLevel(START_LEVEL, minS) : Math.max(minS, s.value);
    s.value = ns;
    // First time: the middle of the grid goes in the middle of the screen
    const startX = w / 2 - (PAD + (MAP_COLS * CELL_W) / 2) * ns;
    const startY = h / 2 - (PAD + (MAP_ROWS * CELL_H) / 2) * ns;
    x.value = clampAxis(first ? startX : x.value, b.x0, b.x1, ns, w);
    y.value = clampAxis(first ? startY : y.value, b.y0, b.y1, ns, h);
  };

  // The fence and the forest trees beside the side fences never change, so they are built once.
  const scenery = useMemo(() => {
    const layers: Layer[] = [];

    for (let cy = -1; cy <= MAP_ROWS; cy++) {
      for (const cx of [-2, MAP_COLS + 1]) {
        const t = forestTree(cx, cy);
        layers.push({
          bottom: t.bottom,
          left: t.left,
          el: (
            <Image
              key={`w${cx},${cy}`}
              source={FOREST_TREE_VIEW}
              fadeDuration={0}
              style={{
                position: 'absolute',
                left: t.left,
                top: t.top,
                width: SIZE * TREE_SCALE,
                height: SIZE * TREE_SCALE,
                transform: t.mirror ? [{ scaleX: -1 }] : undefined,
              }}
            />
          ),
        });
      }
    }

    fencePosts().forEach((p, i) => {
      // A piece can be taller than 32 fence px; its height comes from the file and it grows upward
      const file = Image.resolveAssetSource(p.source);
      const h = (CELL_W * file.height) / file.width;
      layers.push({
        bottom: p.bottom,
        left: p.left,
        el: (
          <Image
            key={`f${i}`}
            source={p.source}
            fadeDuration={0}
            style={{ position: 'absolute', left: p.left, top: p.bottom - h, width: CELL_W, height: h }}
          />
        ),
      });
    });

    return layers;
  }, []);

  // The forest's trees: every cell outside the fence ring, out to the camera's limits, plus one column on
  // each side and two rows below whose crowns still reach into view. Rows below the fence ring go in front
  // of the map, the rest behind it (except the ones beside the side fences, drawn with the fence above);
  // each list is in bottom-edge order, so lower trees cover higher ones.
  const forest = useMemo(() => {
    const back: ForestTree[] = [];
    const front: ForestTree[] = [];
    for (let cy = -MARGIN - extra.y; cy <= MAP_ROWS + MARGIN + extra.y + 1; cy++) {
      for (let cx = -MARGIN - extra.x - 1; cx <= MAP_COLS + MARGIN + extra.x; cx++) {
        if (cx >= -1 && cx <= MAP_COLS && cy >= -1 && cy <= MAP_ROWS) continue; // map and fence ring
        if (besideSideFence(cx, cy)) continue;
        (cy > MAP_ROWS ? front : back).push(forestTree(cx, cy));
      }
    }
    const order = (a: ForestTree, b: ForestTree) => a.bottom - b.bottom || a.left - b.left;
    return { back: back.sort(order), front: front.sort(order) };
  }, [extra]);

  // The pine (and its mirrored copy) as a Skia image, and the atlas lists: which half of the image each
  // tree uses, and where it goes (scaled from art pixels to dp).
  const pine = useImage(FOREST_TREE);
  const pineSheet = useMemo(() => (pine ? withMirror(pine) : null), [pine]);
  const atlas = useMemo(() => {
    const build = (list: ForestTree[]) => ({
      sprites: list.map((t) => Skia.XYWHRect(pineSheet && t.mirror ? 32 : 0, 0, 32, 32)),
      transforms: list.map((t) => Skia.RSXform(TREE_PX, 0, t.left, t.top)),
    });
    return { back: build(forest.back), front: build(forest.front) };
  }, [forest, pineSheet]);
  const forestImage = pineSheet ?? pine;

  // The forest canvases follow the same pan and zoom as the map, on the UI thread.
  const camera = useDerivedValue(() => [{ translateX: x.value }, { translateY: y.value }, { scale: s.value }]);

  // Everything on the map itself (the forest is drawn separately, below). Rebuilt when the trees or the
  // tree being moved change; the fence's elements are reused as they are, so React skips them.
  const { content, occupied, treeAt } = useMemo(() => {
    const occupied = new Set<string>();
    const groundAt = new Map<string, Ground>();
    const treeAt = new Map<string, number>();
    for (const t of trees) {
      if (t.gridX == null || t.gridY == null) continue;
      const key = `${t.gridX},${t.gridY}`;
      groundAt.set(key, t.ground);
      treeAt.set(key, t.id);
      if (t.id !== movingId) occupied.add(key);
    }

    const cellStyle = (cx: number, cy: number) =>
      ({ position: 'absolute', left: left(cx), top: top(cy), width: CELL_W, height: CELL_H }) as const;

    // Ground for the map and the fence ring around it (-1 to MAP_COLS / MAP_ROWS); free cells can be highlighted.
    const cells = [];
    const highlights = [];
    for (let cy = -1; cy <= MAP_ROWS; cy++) {
      for (let cx = -1; cx <= MAP_COLS; cx++) {
        const key = `${cx},${cy}`;
        const inMap = cx >= 0 && cy >= 0 && cx < MAP_COLS && cy < MAP_ROWS;
        const source = inMap ? TILE[groundAt.get(key) ?? 'dry'] : TILE.dry;
        cells.push(<Image key={`c${key}`} source={source} fadeDuration={0} style={cellStyle(cx, cy)} />);
        if (inMap && choosing && !occupied.has(key)) {
          highlights.push(<Image key={`h${key}`} source={HIGHLIGHT} fadeDuration={0} style={cellStyle(cx, cy)} />);
        }
      }
    }

    // Fences, the forest trees beside them and the park's trees, sorted by their bottom edge (then left to
    // right): whatever stands lower is in front. So a lower post's rod covers the post above, and a tree
    // stands in front of the fence behind it but behind the fence in front of it.
    const layers: Layer[] = [...scenery];
    for (const t of trees) {
      if (t.gridX == null || t.gridY == null) continue;
      layers.push({
        bottom: top(t.gridY) + CELL_H,
        left: left(t.gridX),
        // Placed where the old ground patch would cover the cell, so the trunk stands in the same spot
        el: (
          <View
            key={`t${t.id}`}
            style={{
              position: 'absolute',
              left: left(t.gridX) - TREE_SCALE * GROUND_LEFT,
              top: top(t.gridY) - TREE_SCALE * GROUND_TOP,
              opacity: t.id === movingId ? 0.6 : 1,
            }}
          >
            <TreeSprite species={t.species} state={t.state} scale={TREE_SCALE} />
          </View>
        ),
      });
    }
    const sprites = layers.sort((a, b) => a.bottom - b.bottom || a.left - b.left).map((l) => l.el);

    const content = (
      <>
        {cells}
        {sprites}

        {/* Free-cell highlight, on top of the trees */}
        {highlights}
      </>
    );
    return { content, occupied, treeAt };
  }, [trees, movingId, choosing, scenery]);

  // A tap lands on one cell: while choosing, a free cell is picked; otherwise the tree there is opened.
  // Kept in a ref so the gestures below never need rebuilding.
  const tapCell = useRef((_cx: number, _cy: number) => {});
  tapCell.current = (cx, cy) => {
    if (cx < 0 || cy < 0 || cx >= MAP_COLS || cy >= MAP_ROWS) return;
    const key = `${cx},${cy}`;
    if (choosing && !occupied.has(key)) onCellPress(cx, cy);
    else {
      const id = treeAt.get(key);
      if (id != null) onTreePress(id);
    }
  };

  const gesture = useMemo(() => {
    const clampX = (pos: number, scale: number) => {
      'worklet';
      return clampAxis(pos, bounds.value.x0, bounds.value.x1, scale, box.value.w);
    };
    const clampY = (pos: number, scale: number) => {
      'worklet';
      return clampAxis(pos, bounds.value.y0, bounds.value.y1, scale, box.value.h);
    };

    // After a gesture, settle on the nearest zoom stop, around the middle of the screen.
    // Returns true if the zoom changed.
    const snap = () => {
      'worklet';
      const { w, h } = box.value;
      const cur = s.value;
      const ns = nearestLevel(cur, bounds.value.minS);
      if (ns === cur) return false;
      const wx = (w / 2 - x.value) / cur;
      const wy = (h / 2 - y.value) / cur;
      s.value = ns;
      x.value = clampX(w / 2 - wx * ns, ns);
      y.value = clampY(h / 2 - wy * ns, ns);
      return true;
    };

    // Momentum: after a pan the map glides on at the finger's speed and slows down, stopping at the
    // camera's limits. An axis on which the whole world fits the screen stays centered.
    const glideAxis = (pos: SharedValue<number>, velocity: number, lo: number, hi: number, screen: number) => {
      'worklet';
      const sc = s.value;
      if ((hi - lo) * sc <= screen) return;
      glides.value += 1;
      pos.value = withDecay(
        { velocity, deceleration: DECELERATION, clamp: [screen - hi * sc, -lo * sc] },
        () => {
          glides.value -= 1;
        }
      );
    };
    // A new touch catches the map mid-glide; that touch then doesn't count as a tap.
    const stopGlide = () => {
      'worklet';
      if (glides.value === 0) return;
      caughtGlide.value = true;
      cancelAnimation(x);
      cancelAnimation(y);
    };

    const pan = Gesture.Pan()
      .minDistance(TAP_SLOP)
      .averageTouches(true)
      .onBegin(() => stopGlide())
      .onStart((e) => {
        panBase.value = { x: x.value - e.translationX, y: y.value - e.translationY };
      })
      .onUpdate((e) => {
        if (pinching.value) return; // two fingers: the pinch moves the view
        if (rebase.value) {
          panBase.value = { x: x.value - e.translationX, y: y.value - e.translationY };
          rebase.value = false;
        }
        x.value = clampX(panBase.value.x + e.translationX, s.value);
        y.value = clampY(panBase.value.y + e.translationY, s.value);
      })
      .onEnd((e) => {
        if (snap()) return; // the zoom just changed: no glide
        const { w, h } = box.value;
        const b = bounds.value;
        glideAxis(x, e.velocityX, b.x0, b.x1, w);
        glideAxis(y, e.velocityY, b.y0, b.y1, h);
      });

    const pinch = Gesture.Pinch()
      .onBegin(() => stopGlide())
      .onStart((e) => {
        pinching.value = true;
        pinchBase.value = { s: s.value, wx: (e.focalX - x.value) / s.value, wy: (e.focalY - y.value) / s.value };
      })
      .onUpdate((e) => {
        // keep the world point that was between the fingers between the fingers
        const ns = Math.min(MAX_SCALE, Math.max(bounds.value.minS, pinchBase.value.s * e.scale));
        s.value = ns;
        x.value = clampX(e.focalX - pinchBase.value.wx * ns, ns);
        y.value = clampY(e.focalY - pinchBase.value.wy * ns, ns);
      })
      .onEnd(() => {
        pinching.value = false;
        rebase.value = true;
        snap();
      });

    const tap = Gesture.Tap()
      .maxDistance(TAP_SLOP)
      .runOnJS(true)
      .onEnd((e, success) => {
        if (!success || caughtGlide.value) return; // a touch that stopped a glide only stops it
        const wx = (e.x - x.value) / s.value;
        const wy = (e.y - y.value) / s.value;
        tapCell.current(Math.floor((wx - PAD) / CELL_W), Math.floor((wy - PAD) / CELL_H));
      })
      .onFinalize(() => {
        caughtGlide.value = false; // every touch ends here, tap or not
      });

    return Gesture.Race(tap, Gesture.Simultaneous(pan, pinch));
  }, [box, bounds, s, x, y, panBase, pinchBase, pinching, rebase, glides, caughtGlide]);

  const viewStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: s.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ flex: 1, overflow: 'hidden' }} onLayout={onLayout}>
        {/* Behind the map: the forest floor and the forest above and beside it */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Canvas style={StyleSheet.absoluteFill}>
            <Fill color={FOREST_FLOOR} />
            <Group transform={camera}>
              <Atlas image={forestImage} sampling={PIXELATED} {...atlas.back} />
            </Group>
          </Canvas>
        </View>

        <Animated.View
          style={[
            { position: 'absolute', left: 0, top: 0, width: WORLD_W, height: WORLD_H, transformOrigin: 'top left' },
            viewStyle,
          ]}
        >
          {content}
        </Animated.View>

        {/* In front of the map: the forest below it, whose crowns cover the bottom fence */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Canvas style={StyleSheet.absoluteFill}>
            <Group transform={camera}>
              <Atlas image={forestImage} sampling={PIXELATED} {...atlas.front} />
            </Group>
          </Canvas>
        </View>
      </View>
    </GestureDetector>
  );
}
