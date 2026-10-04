import { ReactNode } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PixelFrame } from './BorderUi';

const BAR_COLOR = '#000000'; // color behind the status bar and home buttons

type Props = { children?: ReactNode; background?: string };

export function ScreenFrame({ children, background = '#8bbf6a' }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: BAR_COLOR }}>
      <StatusBar style="light" />
      <View
        style={{
          flex: 1,
          backgroundColor: background,
          marginTop: insets.top,
          marginBottom: insets.bottom,
          marginLeft: insets.left,
          marginRight: insets.right,
        }}
      >
        <PixelFrame style={{ flex: 1 }} contentStyle={{ flex: 1 }}>
          {children}
        </PixelFrame>
      </View>
    </View>
  );
}