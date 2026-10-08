import { ReactNode } from 'react';
import { Image, PixelRatio, Pressable, View } from 'react-native';
import { Btn } from './Btn';

// The settings icon is shown at exactly its file size (1 file pixel = 1 screen pixel), so it stays crisp.
// Right-click the file > Properties > Details to read these two numbers.
const FILE_W = 176;
const FILE_H = 176;
const ICON = require('../../assets/ui/settingsButtonUpscale.png'); // use your real folder if it isn't assets/ui

// A corner button (settings, plant): pressable, dims while pressed.
function IconButton({ onPress, children }: { onPress: () => void; children: ReactNode }) {
  return (
    <Pressable onPress={onPress} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      {children}
    </Pressable>
  );
}

export function SettingsButton({ onPress }: { onPress: () => void }) {
  return (
    <IconButton onPress={onPress}>
      <Image
        source={ICON}
        fadeDuration={0}
        style={{ width: FILE_W / PixelRatio.get(), height: FILE_H / PixelRatio.get() }}
      />
    </IconButton>
  );
}

// PLACEHOLDER until plantButtonUpscale.png (22x22 art px, exported at 8x = 176x176) exists:
// then show it with an Image inside IconButton, exactly like the settings icon above.
// For now a small "P" button, centered in the same space as the settings icon.
export function PlantButton({ onPress }: { onPress: () => void }) {
  return (
    <View
      style={{
        width: FILE_W / PixelRatio.get(),
        height: FILE_H / PixelRatio.get(),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Btn label="P" onPress={onPress} />
    </View>
  );
}
