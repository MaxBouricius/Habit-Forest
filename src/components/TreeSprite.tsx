import { Image, PixelRatio, View } from "react-native";
import { Droplet, DROP_HEIGHT } from "./Droplet";
import { spriteFor, spriteTip } from "../game/treeSprites";
import { Ground, TreeState } from "../game/treeRules";

const CANVAS = 32; // size of the original sprites, in art pixels
const SPRITE_SCALE = 16; // your upscaled files' width divided by 32 (keep your own value)
export const SIZE = (CANVAS * SPRITE_SCALE) / PixelRatio.get(); // dp size where 1 art pixel = SPRITE_SCALE physical pixels
export const ROW = SIZE / CANVAS; // one art pixel row, in dp
const DROP_OFFSET_X = 2; // gap to the right of the highest pixel, in tree art pixels
const DROP_OFFSET_Y = 1; // gap above the highest pixel, in tree art pixels
// Ground tiles, drawn at the same SPRITE_SCALE as the trees. Edit these three to match your art.
const TILE_W = 16; // tile canvas, in art pixels
const TILE_H = 16;
const TRUNK_ROW = 10; // the tile row that lines up with the bottom of the tree trunk
const GROUND = {
	dry: require("../../assets/ground/ground-dryUpscale.png"),
	damp: require("../../assets/ground/ground-dampUpscale.png"),
	wet: require("../../assets/ground/ground-wetUpscale.png"),
};
const GROUND_TOP = (CANVAS - 1 - TRUNK_ROW) * ROW;
const GROUND_LEFT = ((CANVAS - TILE_W) / 2) * ROW;
// Total height of a tree plus its ground, which hangs below the tree's own canvas.
export const SPRITE_HEIGHT = Math.max(CANVAS * ROW, GROUND_TOP + TILE_H * ROW);

type Props = {
	species: string;
	state: TreeState;
	ground?: Ground; // 'dry' | 'damp' | 'wet', or leave out for no ground tile
};

export function TreeSprite({ species, state, ground }: Props) {
	const tip = spriteTip(species, state); // the highest pixel of the sprite that is showing
	const showGround = ground !== undefined;

	return (
		<View style={{ width: SIZE, height: showGround ? SPRITE_HEIGHT : SIZE }}>
			{showGround && (
				<Image
					source={GROUND[ground]}
					fadeDuration={0}
					style={{
						position: "absolute",
						left: GROUND_LEFT,
						top: GROUND_TOP,
						width: TILE_W * ROW,
						height: TILE_H * ROW,
					}}
				/>
			)}
			<Image
				source={spriteFor(species, state)}
				fadeDuration={0}
				style={{
					position: "absolute",
					left: 0,
					top: 0,
					width: SIZE,
					height: SIZE,
				}}
			/>
			{state.thirsty && (
				<View
					pointerEvents="none"
					style={{
						position: "absolute",
						left: (tip.col + 1 + DROP_OFFSET_X) * ROW,
						top: Math.max(0, tip.row * ROW - DROP_HEIGHT - DROP_OFFSET_Y * ROW),
					}}>
					<Droplet />
				</View>
			)}
		</View>
	);
}
