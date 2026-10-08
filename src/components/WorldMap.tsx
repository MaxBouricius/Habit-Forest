import { useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, Pressable, View } from 'react-native';
import type { Tree } from '../db/useForest';
import { MAP_COLS, MAP_ROWS } from '../game/grid';
import { GROUND_LEFT, GROUND_TOP, ROW, SIZE, TreeSprite } from './TreeSprite';

// A cell is square: 32 x 32 art pixels, exactly one tree.
const CELL_W = SIZE;
const CELL_H = SIZE;

// Trees are drawn this many times bigger than their art, so the 16x16 ground patch fills a cell.
const TREE_SCALE = 2;

// Room around the map, so the big trees in the top row and outer columns are not cut off.
const PAD_X = TREE_SCALE * GROUND_LEFT;
const PAD_TOP = TREE_SCALE * GROUND_TOP;
const PAD_BOTTOM = CELL_H;
const WORLD_W = MAP_COLS * CELL_W + 2 * PAD_X;
const WORLD_H = PAD_TOP + MAP_ROWS * CELL_H + PAD_BOTTOM;

// Placeholder ground (drawn from code until the real tiles exist)
const GROUND_FILL = '#5a9e4b';
const GROUND_EDGE = '#3d7a33';

// Zoom stops are k/16 for whole k: every one is a whole number of screen pixels per art pixel,
// so pixels stay even. Pinch moves freely, then snaps. You can zoom out until the whole map fits
// (never below 2/16); the ground is drawn far beyond the map, so the screen is always green.
const START_LEVEL = 0.5;
const MAX_SCALE = 1.25;
const BEYOND = 6000; // how far the ground reaches past the map edges

function levelsFor(w: number, h: number) {
  const fit = Math.min(w / WORLD_W, h / WORLD_H);
  const kMin = Math.max(2, Math.min(16, Math.floor(16 * fit)));
  const out: number[] = [];
  for (let k = kMin; k <= 16; k++) out.push(k / 16);
  return out;
}

type View2D = { s: number; x: number; y: number };

const left = (x: number) => PAD_X + x * CELL_W;
const top = (y: number) => PAD_TOP + y * CELL_H;

function clampPos(v: View2D, w: number, h: number): View2D {
  const cw = WORLD_W * v.s;
  const ch = WORLD_H * v.s;
  const x = cw <= w ? (w - cw) / 2 : Math.min(0, Math.max(w - cw, v.x));
  const y = ch <= h ? (h - ch) / 2 : Math.min(0, Math.max(h - ch, v.y));
  return { s: v.s, x, y };
}

function nearestLevel(s: number, levels: number[]) {
  let best = levels[0];
  for (const l of levels) if (Math.abs(Math.log(s / l)) < Math.abs(Math.log(s / best))) best = l;
  return best;
}

type Props = {
  trees: Tree[];
  movingId: number | null; // while set, free cells light up and can be tapped
  onTreePress: (id: number) => void;
  onCellPress: (x: number, y: number) => void;
};

export function WorldMap({ trees, movingId, onTreePress, onCellPress }: Props) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View2D>({ s: START_LEVEL, x: 0, y: 0 });
  const viewRef = useRef(view);
  const boxRef = useRef(box);
  const originRef = useRef({ x: 0, y: 0 });
  const hostRef = useRef<View>(null);
  const gesture = useRef<{
    pan: { view: View2D; dx: number; dy: number } | null;
    pinch: { view: View2D; dist: number; mx: number; my: number } | null;
  }>({ pan: null, pinch: null });

  const apply = (v: View2D) => {
    viewRef.current = v;
    setView(v);
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const first = boxRef.current.w === 0;
    boxRef.current = { w: width, h: height };
    setBox({ w: width, h: height });
    hostRef.current?.measureInWindow((px, py) => {
      originRef.current = { x: px, y: py };
    });
    const levels = levelsFor(width, height);
    const startS = nearestLevel(START_LEVEL, levels);
    const cur = first ? { s: startS, x: 0, y: 0 } : { ...viewRef.current, s: Math.max(levels[0], viewRef.current.s) };
    apply(clampPos(cur, width, height));
  };

  const responder = useMemo(() => {
    const touchesOf = (e: { nativeEvent: { touches: readonly { pageX: number; pageY: number }[] } }) =>
      e.nativeEvent.touches;
    const pinchInfo = (t: readonly { pageX: number; pageY: number }[]) => ({
      dist: Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY) || 1,
      mx: (t[0].pageX + t[1].pageX) / 2 - originRef.current.x,
      my: (t[0].pageY + t[1].pageY) / 2 - originRef.current.y,
    });

    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (e) => touchesOf(e).length >= 2,
      onMoveShouldSetPanResponder: (e, gs) =>
        touchesOf(e).length >= 2 || Math.abs(gs.dx) + Math.abs(gs.dy) > 8,
      onPanResponderGrant: (_e, gs) => {
        gesture.current = { pan: { view: viewRef.current, dx: gs.dx, dy: gs.dy }, pinch: null };
      },
      onPanResponderMove: (e, gs) => {
        const t = touchesOf(e);
        const g = gesture.current;
        const { w, h } = boxRef.current;
        if (t.length >= 2) {
          if (!g.pinch) g.pinch = { view: viewRef.current, ...pinchInfo(t) };
          g.pan = null;
          const cur = pinchInfo(t);
          const s = Math.min(MAX_SCALE, Math.max(levelsFor(w, h)[0], g.pinch.view.s * (cur.dist / g.pinch.dist)));
          // keep the world point that was between the fingers between the fingers
          const wx = (g.pinch.mx - g.pinch.view.x) / g.pinch.view.s;
          const wy = (g.pinch.my - g.pinch.view.y) / g.pinch.view.s;
          apply(clampPos({ s, x: cur.mx - wx * s, y: cur.my - wy * s }, w, h));
        } else {
          if (g.pinch) {
            g.pinch = null;
            g.pan = { view: viewRef.current, dx: gs.dx, dy: gs.dy };
          }
          if (!g.pan) g.pan = { view: viewRef.current, dx: gs.dx, dy: gs.dy };
          apply(
            clampPos(
              { s: g.pan.view.s, x: g.pan.view.x + gs.dx - g.pan.dx, y: g.pan.view.y + gs.dy - g.pan.dy },
              w,
              h
            )
          );
        }
      },
      onPanResponderRelease: () => finish(),
      onPanResponderTerminate: () => finish(),
    });

    function finish() {
      const g = gesture.current;
      const { w, h } = boxRef.current;
      const v = viewRef.current;
      const s = nearestLevel(v.s, levelsFor(w, h));
      if (s !== v.s) {
        // snap around the middle of the screen
        const wx = (w / 2 - v.x) / v.s;
        const wy = (h / 2 - v.y) / v.s;
        apply(clampPos({ s, x: w / 2 - wx * s, y: h / 2 - wy * s }, w, h));
      }
      g.pan = null;
      g.pinch = null;
    }
  }, []);

  const occupied = new Set<string>();
  for (const t of trees) {
    if (t.gridX != null && t.gridY != null && t.id !== movingId) occupied.add(`${t.gridX},${t.gridY}`);
  }

  // Lower rows are drawn later, so they stand in front of the rows behind them.
  const placed = trees
    .filter((t) => t.gridX != null && t.gridY != null)
    .sort((a, b) => a.gridY! - b.gridY! || a.gridX! - b.gridX!);

  const cells = [];
  for (let y = 0; y < MAP_ROWS; y++) {
    for (let x = 0; x < MAP_COLS; x++) {
      const free = movingId != null && !occupied.has(`${x},${y}`);
      cells.push(
        <View
          key={`c${x},${y}`}
          style={{
            position: 'absolute',
            left: left(x),
            top: top(y),
            width: CELL_W,
            height: CELL_H,
            borderWidth: ROW,
            borderColor: GROUND_EDGE,
          }}
        />
      );
    }
  }

  return (
    <View ref={hostRef} style={{ flex: 1, overflow: 'hidden' }} onLayout={onLayout} {...responder.panHandlers}>
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: WORLD_W,
          height: WORLD_H,
          transformOrigin: 'top left',
          transform: [{ translateX: view.x }, { translateY: view.y }, { scale: view.s }],
        }}
      >
        {/* Ground reaches far past the map, so no dark edge can show on screen */}
        <View
          style={{
            position: 'absolute',
            left: -BEYOND,
            top: -BEYOND,
            width: WORLD_W + 2 * BEYOND,
            height: WORLD_H + 2 * BEYOND,
            backgroundColor: GROUND_FILL,
          }}
        />
        {cells}

        {/* Placed so the ground patch covers the tree's cell; lower rows stand in front */}
        {placed.map((t) => (
          <View
            key={`t${t.id}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: left(t.gridX!) - TREE_SCALE * GROUND_LEFT,
              top: top(t.gridY!) - TREE_SCALE * GROUND_TOP,
              opacity: t.id === movingId ? 0.6 : 1,
            }}
          >
            <TreeSprite species={t.species} state={t.state} ground={t.ground} scale={TREE_SCALE} />
          </View>
        ))}

        {/* A tree is tapped on its own cell only, since the big sprites overlap the cells above */}
        {placed.map((t) => (
          <Pressable
            key={`p${t.id}`}
            onPress={() => onTreePress(t.id)}
            style={{ position: 'absolute', left: left(t.gridX!), top: top(t.gridY!), width: CELL_W, height: CELL_H }}
          />
        ))}

        {/* Free-tile highlight, on top of the trees so the cells stay tappable */}
        {movingId != null &&
          Array.from({ length: MAP_COLS * MAP_ROWS }, (_, i) => ({ x: i % MAP_COLS, y: Math.floor(i / MAP_COLS) }))
            .filter(({ x, y }) => !occupied.has(`${x},${y}`))
            .map(({ x, y }) => (
              <Pressable
                key={`h${x},${y}`}
                onPress={() => onCellPress(x, y)}
                style={{
                  position: 'absolute',
                  left: left(x),
                  top: top(y),
                  width: CELL_W,
                  height: CELL_H,
                  backgroundColor: 'rgba(255,255,255,0.35)',
                  borderWidth: ROW,
                  borderColor: 'rgba(255,255,255,0.9)',
                }}
              />
            ))}
      </View>
    </View>
  );
}
