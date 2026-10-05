import { useState } from 'react';
import { Image, LayoutChangeEvent, PixelRatio, View } from 'react-native';
import { Text } from './PixelText';

const FRAME_W = 24;       // size of the original plaque art, in art pixels
export const PLAQUE_H = 12;
const CAP = 4;            // width of each end cap, in art pixels
const SCALE = 16;         // export multiple of the PNG (384 px / 24)
const TILE = 4;           // repeating unit of the middle section, in art pixels
const TILE_FROM = 8;      // which column the repeating unit is cut from (anywhere in the middle works)
const PAD = 2;            // empty space between a cap and the text, in art pixels
const MIN_W = 24;         // narrowest the plaque can get, in art pixels
const TEXT_NUDGE = 0;     // move the text up (negative) or down (positive), in art pixels
const INK = '#3B2A1A';
const SOURCE = require('../../assets/ui/NamePlaqueUpscale.png');

const A = SCALE / PixelRatio.get(); // dp per art pixel, so one art pixel = SCALE physical pixels
const T = TILE * A;
const H = PLAQUE_H * A;
const FONT_SCALE = PixelRatio.get() * PixelRatio.getFontScale();

// Longer names get a smaller font so the plaque still fits on the screen.
// The number is how many 16 px steps tall the text is (see PixelText).
function nameFontSize(name: string) {
  const steps = name.length <= 14 ? 5 : name.length <= 18 ? 4 : 3;
  return (steps * 16) / FONT_SCALE;
}

function Slice({ sx, sw, dx, dw }: { sx: number; sw: number; dx: number; dw: number }) {
  const k = dw / sw; // dp per source art pixel
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: dx, top: 0, width: dw, height: H, overflow: 'hidden' }}>
      <Image
        source={SOURCE}
        resizeMode="stretch"
        fadeDuration={0}
        style={{ position: 'absolute', left: -sx * k, top: 0, width: FRAME_W * k, height: H }}
      />
    </View>
  );
}

export function ParkPlaque({ name }: { name: string }) {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  const mid = Math.max(w - 2 * CAP * A, 0);
  const tiles = [];
  for (let i = 0; i < Math.ceil(mid / T); i++) {
    tiles.push(<Slice key={i} sx={TILE_FROM} sw={TILE} dx={i * T} dw={T} />);
  }

  return (
    <View
      onLayout={onLayout}
      style={{
        height: H,
        minWidth: MIN_W * A,
        maxWidth: '100%',
        paddingHorizontal: (CAP + PAD) * A,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {w > 0 && (
        <>
          {/* middle: repeating tiles, clipped to the space between the caps */}
          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: CAP * A, top: 0, width: mid, height: H, overflow: 'hidden' }}
          >
            {tiles}
          </View>
          {/* caps: never repeated or stretched */}
          <Slice sx={0} sw={CAP} dx={0} dw={CAP * A} />
          <Slice sx={FRAME_W - CAP} sw={CAP} dx={w - CAP * A} dw={CAP * A} />
        </>
      )}
      <Text
        numberOfLines={1}
        style={{ fontSize: nameFontSize(name), color: INK, includeFontPadding: false, marginTop: TEXT_NUDGE * A }}
      >
        {name}
      </Text>
    </View>
  );
}