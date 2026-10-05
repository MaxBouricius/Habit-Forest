import { useState } from 'react';
import { Image, LayoutChangeEvent, PixelRatio, Pressable, View } from 'react-native';
import { pixelSize, Text } from './PixelText';

const FRAME_W = 24;    // size of the original button art, in art pixels
const FRAME_H = 8;
const CAP = 2;         // width of each end cap, in art pixels (holds the rounded corner)
const SCALE = 16;      // export multiple of the PNGs (384 px / 24)
const TILE = 4;        // repeating unit of the middle section, in art pixels
const TILE_FROM = 4;   // the column the repeating unit is cut from (columns 2 to 21 are identical)
const PAD = 1;         // space between a cap and the label, in art pixels
const MIN_W = 8;       // narrowest a button can get, in art pixels (for the + and - buttons)
const PRESS_NUDGE = 1; // how far the label drops while pressed, in art pixels
const LABEL = 24;      // label font size (snapped to Alagard's pixel grid by PixelText)
const LABEL_COLOR = '#FFFFFF';
const LABEL_DISABLED = '#C9C9C9';

// Folder and exact file names of your upscaled button art.
const SKINS = {
  green: {
    normal: require('../../assets/ui/btn-normalUpscale.png'),
    pressed: require('../../assets/ui/btn-pressedUpscale.png'),
  },
  water: {
    normal: require('../../assets/ui/btn-water-normalUpscale.png'),
    pressed: require('../../assets/ui/btn-water-pressedUpscale.png'),
  },
};
const DISABLED = require('../../assets/ui/btn-disabledUpscale.png');

const A = SCALE / PixelRatio.get(); // dp per art pixel, so one art pixel = SCALE physical pixels
const T = TILE * A;
const H = FRAME_H * A;
const SHADOW = pixelSize(LABEL) / 16; // one font pixel, in dp, for a crisp drop shadow on the label

type SourceProp = { source: number };

function Slice({ source, sx, sw, dx, dw }: SourceProp & { sx: number; sw: number; dx: number; dw: number }) {
  const k = dw / sw; // dp per source art pixel
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: dx, top: 0, width: dw, height: H, overflow: 'hidden' }}>
      <Image
        source={source}
        resizeMode="stretch"
        fadeDuration={0}
        style={{ position: 'absolute', left: -sx * k, top: 0, width: FRAME_W * k, height: H }}
      />
    </View>
  );
}

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean; // shown with the pressed sprite (used for the Day/Week/Month choice)
  variant?: 'green' | 'water';
};

export function Btn({ label, onPress, disabled, selected, variant = 'green' }: Props) {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onLayout={onLayout}
      style={{
        height: H,
        minWidth: MIN_W * A,
        paddingHorizontal: (CAP + PAD) * A,
        margin: 4,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {({ pressed }) => {
        const down = !disabled && (pressed || !!selected);
        const source = disabled ? DISABLED : down ? SKINS[variant].pressed : SKINS[variant].normal;
        const mid = Math.max(w - 2 * CAP * A, 0);
        const tiles = [];
        for (let i = 0; i < Math.ceil(mid / T); i++) {
          tiles.push(<Slice key={i} source={source} sx={TILE_FROM} sw={TILE} dx={i * T} dw={T} />);
        }
        return (
          <>
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
                <Slice source={source} sx={0} sw={CAP} dx={0} dw={CAP * A} />
                <Slice source={source} sx={FRAME_W - CAP} sw={CAP} dx={w - CAP * A} dw={CAP * A} />
              </>
            )}
            <Text
              numberOfLines={1}
              style={{
                fontSize: LABEL,
                color: disabled ? LABEL_DISABLED : LABEL_COLOR,
                includeFontPadding: false,
                marginTop: down ? PRESS_NUDGE * A : 0,
                textShadowColor: '#000000',
                textShadowOffset: { width: SHADOW, height: SHADOW },
                textShadowRadius: 0,
              }}
            >
              {label}
            </Text>
          </>
        );
      }}
    </Pressable>
  );
}