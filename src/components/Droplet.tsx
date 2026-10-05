import { Image, PixelRatio } from 'react-native';

export const DROP_W = 13; // droplet canvas, in art pixels (edit to match your art)
export const DROP_H = 18;
const DROP_SCALE = 4;     // export multiple of droplet.png = screen pixels per droplet art pixel

export const DROP_WIDTH = (DROP_W * DROP_SCALE) / PixelRatio.get();
export const DROP_HEIGHT = (DROP_H * DROP_SCALE) / PixelRatio.get();

export function Droplet() {
  return (
    <Image
      source={require('../../assets/ui/dropletUpscale.png')}
      fadeDuration={0}
      style={{ width: DROP_WIDTH, height: DROP_HEIGHT }}
    />
  );
}