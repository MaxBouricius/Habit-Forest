import { Image } from 'react-native';

export const DROP_W = 16; // droplet canvas, in art pixels (edit these two to match your art)
export const DROP_H = 18;

// `row` is dp per art pixel, passed in from TreeSprite so the droplet uses the same pixel size as the trees.
export function Droplet({ row }: { row: number }) {
  return (
    <Image
      source={require('../../assets/ui/droplet.png')}
      fadeDuration={0}
      style={{ width: DROP_W * row, height: DROP_H * row }}
    />
  );
}