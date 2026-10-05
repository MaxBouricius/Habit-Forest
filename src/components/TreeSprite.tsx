import { Image, PixelRatio, View } from 'react-native';
import { Droplet, DROP_H } from './Droplet';
import { spriteFor, spriteTop } from '../game/treeSprites';
import { Ground, TreeState } from '../game/treeRules';

const CANVAS = 32;      // size of the original sprites, in art pixels
const SPRITE_SCALE = 16; // your upscaled files' width divided by 32 (keep your own value)
export const SIZE = (CANVAS * SPRITE_SCALE) / PixelRatio.get(); // dp size where 1 art pixel = SPRITE_SCALE physical pixels
export const ROW = SIZE / CANVAS; // one art pixel row, in dp

// Ground tiles, drawn at the same SPRITE_SCALE as the trees. Edit these three to match your art.
const TILE_W = 16;    // tile canvas, in art pixels
const TILE_H = 16;
const TRUNK_ROW = 10;  // the tile row that lines up with the bottom of the tree trunk
const GROUND = {
  dry: require('../../assets/ground/ground-dryUpscale.png'),
  damp: require('../../assets/ground/ground-dampUpscale.png'),
  wet: require('../../assets/ground/ground-wetUpscale.png'),
};
const GROUND_TOP = (CANVAS - 1 - TRUNK_ROW) * ROW;
const GROUND_LEFT = ((CANVAS - TILE_W) / 2) * ROW;
// Total height of a tree plus its ground, which hangs below the tree's own canvas.
export const SPRITE_HEIGHT = Math.max(CANVAS * ROW, GROUND_TOP + TILE_H * ROW);

type Props = {
  species: string;
  state: TreeState;
  ground?: Ground; // 'dry' | 'damp' | 'wet', or leave out for no ground tile
};

export function TreeSprite({ species, state, ground }: Props) {
  const top = spriteTop(species, state);
  // Full-height trees: droplet in the empty top-right corner. Small trees: floating just above them.
  const corner = top <= 4;
  const showGround = ground !== undefined;

  return (
    <View style={{ width: SIZE, height: showGround ? SPRITE_HEIGHT : SIZE }}>
      {showGround && (
        <Image
          source={GROUND[ground]}
          fadeDuration={0}
          style={{ position: 'absolute', left: GROUND_LEFT, top: GROUND_TOP, width: TILE_W * ROW, height: TILE_H * ROW }}
        />
      )}
      <Image
        source={spriteFor(species, state)}
        fadeDuration={0}
        style={{ position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE }}
      />
      {state.thirsty && (
        <View
          pointerEvents="none"
          style={
            corner
              ? { position: 'absolute', top: 0, right: 0 }
              : { position: 'absolute', left: 0, right: 0, top: Math.max(0, (top - DROP_H - 1) * ROW), alignItems: 'center' }
          }
        >
          <Droplet row={ROW} />
        </View>
      )}
    </View>
  );
}