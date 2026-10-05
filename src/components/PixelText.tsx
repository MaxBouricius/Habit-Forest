import { PixelRatio, StyleSheet, Text as RNText, TextProps } from 'react-native';
import { useFonts } from 'expo-font';

// Alagard by Hewett Tsoi (dafont.com/alagard.font). To change the font, edit only this file.
export const FONT = 'Alagard';

export function useAppFonts() {
  return useFonts({ [FONT]: require('../../assets/fonts/alagard.ttf') });
}

// Alagard is a 16 px bitmap font, so it only looks crisp when the text's physical pixel size is a
// multiple of 16. This snaps any fontSize to the nearest such size (accounting for the phone's
// screen density and font-size setting), so the rest of the code can keep using normal numbers.
const STEP = 16;
export function pixelSize(fontSize: number) {
  const scale = PixelRatio.get() * PixelRatio.getFontScale();
  return (Math.max(1, Math.round((fontSize * scale) / STEP)) * STEP) / scale;
}

// Drop-in replacement for React Native's Text. Alagard has a single weight, so bold is reset
// (otherwise Android would fake-bold it); use a bigger fontSize or a color for emphasis instead.
export function Text({ style, ...rest }: TextProps) {
  const flat = StyleSheet.flatten(style) ?? {};
  return (
    <RNText
      {...rest}
      style={[{ fontFamily: FONT }, style, { fontSize: pixelSize(flat.fontSize ?? 16), fontWeight: 'normal' }]}
    />
  );
}