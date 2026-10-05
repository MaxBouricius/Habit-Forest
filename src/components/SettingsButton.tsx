import { Image, PixelRatio, Pressable } from 'react-native';

// The settings icon is shown at exactly its file size (1 file pixel = 1 screen pixel), so it stays crisp.
// Right-click the file > Properties > Details to read these two numbers.
const FILE_W = 176;
const FILE_H = 176;
const ICON = require('../../assets/ui/settingsButtonUpscale.png'); // use your real folder if it isn't assets/ui

export function SettingsButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <Image
        source={ICON}
        fadeDuration={0}
        style={{ width: FILE_W / PixelRatio.get(), height: FILE_H / PixelRatio.get() }}
      />
    </Pressable>
  );
}