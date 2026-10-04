import { ReactNode, useState } from 'react';
import { Image, LayoutChangeEvent, PixelRatio, View, ViewStyle } from 'react-native';

const FRAME = 32;
const CORNER = 10;
const SCALE = 8;
const SOURCE = require('../../assets/ui/BorderUiGiant.png');

// dp per art pixel, chosen so one art pixel = exactly SCALE physical screen pixels.
// That way the image is never resampled, which is what caused the blur earlier.
const ART = SCALE / PixelRatio.get();
const C = CORNER * ART; // corner size in dp

type SliceProps = {
  sx: number; sy: number; sw: number; sh: number; // source rect (art px)
  dx: number; dy: number; dw: number; dh: number; // destination rect (dp)
};

function Slice({ sx, sy, sw, sh, dx, dy, dw, dh }: SliceProps) {
  const kx = dw / sw; // dp per source pixel, horizontally
  const ky = dh / sh;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: dx, top: dy, width: dw, height: dh, overflow: 'hidden' }}
    >
      <Image
        source={SOURCE}
        resizeMode="stretch"
        style={{ position: 'absolute', left: -sx * kx, top: -sy * ky, width: FRAME * kx, height: FRAME * ky }}
      />
    </View>
  );
}

type Props = { children?: ReactNode; style?: ViewStyle; contentStyle?: ViewStyle };

export function PixelFrame({ children, style, contentStyle }: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  const { w, h } = size;
  const mid = FRAME - 2 * CORNER;      // stretchable middle, in art px
  const midW = Math.max(w - 2 * C, 0); // stretched size on screen
  const midH = Math.max(h - 2 * C, 0);
  const far = FRAME - CORNER;          // where the right/bottom corner starts in the source

  return (
    <View onLayout={onLayout} style={style}>
      {w > 0 && h > 0 && (
        <>
          <Slice sx={0} sy={0} sw={CORNER} sh={CORNER} dx={0} dy={0} dw={C} dh={C} />
          <Slice sx={CORNER} sy={0} sw={mid} sh={CORNER} dx={C} dy={0} dw={midW} dh={C} />
          <Slice sx={far} sy={0} sw={CORNER} sh={CORNER} dx={w - C} dy={0} dw={C} dh={C} />

          <Slice sx={0} sy={CORNER} sw={CORNER} sh={mid} dx={0} dy={C} dw={C} dh={midH} />
          <Slice sx={CORNER} sy={CORNER} sw={mid} sh={mid} dx={C} dy={C} dw={midW} dh={midH} />
          <Slice sx={far} sy={CORNER} sw={CORNER} sh={mid} dx={w - C} dy={C} dw={C} dh={midH} />

          <Slice sx={0} sy={far} sw={CORNER} sh={CORNER} dx={0} dy={h - C} dw={C} dh={C} />
          <Slice sx={CORNER} sy={far} sw={mid} sh={CORNER} dx={C} dy={h - C} dw={midW} dh={C} />
          <Slice sx={far} sy={far} sw={CORNER} sh={CORNER} dx={w - C} dy={h - C} dw={C} dh={C} />
        </>
      )}
      <View style={[{ padding: C }, contentStyle]}>{children}</View>
    </View>
  );
}