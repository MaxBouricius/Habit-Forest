import { View } from 'react-native';
import { ART } from './BorderUi';

type Props = {
  done: number;      // waterings so far this period
  target: number;    // waterings required this period
  widthArt?: number; // width of the bar body, in art pixels
  outline?: string;
  empty?: string;
  fill?: string;
};

export function WaterBar({
  done,
  target,
  widthArt = 40,
  outline = '#000000',
  empty = '#ffffff',
  fill = '#4aa3df',
}: Props) {
  const n = Math.max(1, target);
  const filled = Math.min(Math.max(done, 0), n);

  // Split the width into whole-art-pixel segments, handing leftover pixels
  // to the first segments so nothing ends up on a half pixel.
  const usable = widthArt - (n - 1); // minus the 1px dividers
  const base = Math.floor(usable / n);
  const extra = usable - base * n;

  const inner = [];
  for (let i = 0; i < n; i++) {
    const w = base + (i < extra ? 1 : 0);
    if (i > 0) {
      inner.push(<View key={`d${i}`} style={{ width: ART, height: 2 * ART, backgroundColor: outline }} />);
    }
    inner.push(
      <View
        key={`s${i}`}
        style={{ width: w * ART, height: 2 * ART, backgroundColor: i < filled ? fill : empty }}
      />
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignSelf: 'flex-start' }}>
      <View style={{ width: ART, height: 2 * ART, marginTop: ART, backgroundColor: outline }} />
      <View>
        <View style={{ width: widthArt * ART, height: ART, backgroundColor: outline }} />
        <View style={{ flexDirection: 'row' }}>{inner}</View>
        <View style={{ width: widthArt * ART, height: ART, backgroundColor: outline }} />
      </View>
      <View style={{ width: ART, height: 2 * ART, marginTop: ART, backgroundColor: outline }} />
    </View>
  );
}