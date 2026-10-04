import { ReactNode, useState } from 'react';
import { Image, LayoutChangeEvent, PixelRatio, View, ViewStyle } from 'react-native';

const FRAME = 32;       // size of the original popup art, in art pixels
const CORNER = 8;       // corner square, in art pixels
const EDGE = 6;         // border thickness, in art pixels (the parchment starts after it)
const SCALE = 16;       // export multiple of the PNG (512 px / 32)
const TILE = 4;         // length of the repeating unit along the edges, in art pixels
const FILL = '#E8D5A3'; // parchment base color, painted from code so it never stretches badly
const SOURCE = require('../../assets/ui/PopupUiGiant.png');

// dp per art pixel, so one art pixel = SCALE physical pixels and the image is never resampled
export const POPUP_ART = SCALE / PixelRatio.get();
const A = POPUP_ART;
const C = CORNER * A;
const E = EDGE * A;
const T = TILE * A;
const TS = (FRAME - TILE) / 2; // where the repeating unit is cut from (the middle of each edge)

type SliceProps = {
  sx: number; sy: number; sw: number; sh: number; // source rect (art px)
  dx: number; dy: number; dw: number; dh: number; // destination rect (dp)
};

function Slice({ sx, sy, sw, sh, dx, dy, dw, dh }: SliceProps) {
  const kx = dw / sw;
  const ky = dh / sh;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: dx, top: dy, width: dw, height: dh, overflow: 'hidden' }}
    >
      <Image
        source={SOURCE}
        resizeMode="stretch"
        fadeDuration={0}
        style={{ position: 'absolute', left: -sx * kx, top: -sy * ky, width: FRAME * kx, height: FRAME * ky }}
      />
    </View>
  );
}

type StripProps = {
  sx: number; sy: number; sw: number; sh: number; // source rect of ONE tile (art px)
  horizontal: boolean;
  x: number; y: number; w: number; h: number;     // area to fill (dp)
};

// Fills an area by repeating one tile; the last tile is clipped if it doesn't fit exactly.
function Strip({ sx, sy, sw, sh, horizontal, x, y, w, h }: StripProps) {
  const count = Math.ceil((horizontal ? w : h) / T);
  const tiles = [];
  for (let i = 0; i < count; i++) {
    tiles.push(
      <Slice
        key={i}
        sx={sx} sy={sy} sw={sw} sh={sh}
        dx={horizontal ? i * T : 0}
        dy={horizontal ? 0 : i * T}
        dw={horizontal ? T : w}
        dh={horizontal ? h : T}
      />
    );
  }
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: x, top: y, width: w, height: h, overflow: 'hidden' }}
    >
      {tiles}
    </View>
  );
}

type Props = { children?: ReactNode; style?: ViewStyle; contentStyle?: ViewStyle };

export function PopupFrame({ children, style, contentStyle }: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  const { w, h } = size;
  const far = FRAME - CORNER;   // where the right/bottom corners start in the source
  const edgeFar = FRAME - EDGE; // where the right/bottom edges start in the source

  return (
    <View onLayout={onLayout} style={style}>
      {w > 0 && h > 0 && (
        <>
          {/* parchment fill, behind everything */}
          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: E, top: E, width: w - 2 * E, height: h - 2 * E, backgroundColor: FILL }}
          />

          {/* edges: repeating tiles */}
          <Strip sx={TS} sy={0} sw={TILE} sh={EDGE} horizontal x={C} y={0} w={w - 2 * C} h={E} />
          <Strip sx={TS} sy={edgeFar} sw={TILE} sh={EDGE} horizontal x={C} y={h - E} w={w - 2 * C} h={E} />
          <Strip sx={0} sy={TS} sw={EDGE} sh={TILE} horizontal={false} x={0} y={C} w={E} h={h - 2 * C} />
          <Strip sx={edgeFar} sy={TS} sw={EDGE} sh={TILE} horizontal={false} x={w - E} y={C} w={E} h={h - 2 * C} />

          {/* corners: never stretched or repeated */}
          <Slice sx={0} sy={0} sw={CORNER} sh={CORNER} dx={0} dy={0} dw={C} dh={C} />
          <Slice sx={far} sy={0} sw={CORNER} sh={CORNER} dx={w - C} dy={0} dw={C} dh={C} />
          <Slice sx={0} sy={far} sw={CORNER} sh={CORNER} dx={0} dy={h - C} dw={C} dh={C} />
          <Slice sx={far} sy={far} sw={CORNER} sh={CORNER} dx={w - C} dy={h - C} dw={C} dh={C} />
        </>
      )}
      <View style={[{ padding: C }, contentStyle]}>{children}</View>
    </View>
  );
}