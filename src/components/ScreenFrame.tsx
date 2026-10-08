import { ReactNode } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ART, PixelFrame } from './BorderUi';

const BAR_COLOR = '#000000'; // color behind the status bar and home buttons
const BORDER_ART = 5;        // art pixels from the edge of the frame to the inner edge of the border
const GAP_ART = 1;           // space between the border and things placed next to it, in art pixels
const GEAR_INTO_BORDER_ART = 1; // how far the bottom-right item overlaps the border, in art pixels
// Depth of the border from the frame edge, in dp. With `fill`, content starts at the frame edge,
// so things that should sit inside the border need this much room.
export const FRAME_INSET = BORDER_ART * ART;
// How far a scrolling screen should push its first item down so it starts below the header.
// Use it as paddingTop on the ScrollView's contentContainerStyle.
export const headerInset = (headerHeightArt: number) => (headerHeightArt + GAP_ART) * ART;

type Props = {
  children?: ReactNode;
  background?: string;
  header?: ReactNode;      // hangs at the top center, just under the border, in front of the content
  bottomRight?: ReactNode; // sits in the bottom-right corner, just inside the border (e.g. the settings button)
  bottomLeft?: ReactNode;  // the same, in the bottom-left corner (e.g. the plant button)
  overlay?: ReactNode;     // popups: drawn in front of everything, including the border
  fill?: boolean;          // content reaches the screen edges, under the border (e.g. the world map)
};

export function ScreenFrame({ children, background = '#8bbf6a', header, bottomRight, bottomLeft, overlay, fill }: Props) {
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
        {/* 1. the content, with the border art behind it */}
        <PixelFrame
          style={{ flex: 1 }}
          contentStyle={
            fill
              ? { flex: 1, padding: 0 }
              : header
                ? { flex: 1, paddingTop: BORDER_ART * ART, paddingBottom: BORDER_ART * ART }
                : { flex: 1 }
          }
        >
          {children}
        </PixelFrame>

        {/* 2. the header (park sign), in front of the content */}
        {header && (
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              top: BORDER_ART * ART,
              left: BORDER_ART * ART,
              right: BORDER_ART * ART,
              alignItems: 'center',
              zIndex: 1,
            }}
          >
            {header}
          </View>
        )}

        {/* 2b. something in the bottom-right corner, overlapping the border, drawn in front of it */}
        {bottomRight && (
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              bottom: (BORDER_ART - GEAR_INTO_BORDER_ART) * ART,
              right: (BORDER_ART - GEAR_INTO_BORDER_ART) * ART,
              zIndex: 3,
            }}
          >
            {bottomRight}
          </View>
        )}

        {/* 2c. the same in the bottom-left corner */}
        {bottomLeft && (
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              bottom: (BORDER_ART - GEAR_INTO_BORDER_ART) * ART,
              left: (BORDER_ART - GEAR_INTO_BORDER_ART) * ART,
              zIndex: 3,
            }}
          >
            {bottomLeft}
          </View>
        )}

        {/* 3. the border again, on top of the content and the header, so nothing can draw over it */}
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2 }}>
          <PixelFrame style={{ flex: 1 }} />
        </View>

        {/* 4. popups, in front of everything */}
        {overlay}
      </View>
    </View>
  );
}