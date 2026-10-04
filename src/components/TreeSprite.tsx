import { Image, PixelRatio, Text, View } from 'react-native';
import { spriteFor } from '../game/treeSprites';
import { TreeState } from '../game/treeRules';

const CANVAS = 32;      // size of the original sprites, in art pixels
const SPRITE_SCALE = 16; // your upscaled files' width divided by 32 (256 px wide = 8)
export const SIZE = (CANVAS * SPRITE_SCALE) / PixelRatio.get();

export function TreeSprite({ species, state }: { species: string; state: TreeState }) {
  return (
    <View style={{ width: SIZE, height: SIZE }}>
      <Image source={spriteFor(species, state)} fadeDuration={0} style={{ width: SIZE, height: SIZE }} />
      {state.thirsty && <Text style={{ position: 'absolute', top: 0, right: 0, fontSize: 28 }}>💧</Text>}
    </View>
  );
}