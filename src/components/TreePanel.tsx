import { useState } from "react";
import {
	Alert,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	useWindowDimensions,
	View,
    Image,
    PixelRatio,
} from "react-native";
import { Btn } from "./Btn";
import { POPUP_ART } from "./PopupFrame";
import { SIZE as TREE_SIZE, TreeSprite } from "./TreeSprite";
import { WaterBar } from "./WaterBar";
import { Tree } from "../db/useForest";
import { PeriodUnit, RULES } from "../game/treeRules";

const INK = "#3B2A1A";
const SOFT = "#6B5238";
const TILE_BG = "#E2C37C";
const SKY = "#9BE7FF";
const GRASS = "#62BB12";
const DIRT = "#7A3B00";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Short "time left" text: hours under two days, days after that.
function left(ms: number) {
	const h = Math.max(1, Math.ceil(ms / 3600000));
	return h < 48 ? `${h} h` : `${Math.round(h / 24)} d`;
}

function Tile({
	label,
	value,
	sub,
}: {
	label: string;
	value: string;
	sub?: string;
}) {
	return (
		<View
			style={{
				width: "48%",
				backgroundColor: TILE_BG,
				padding: 8,
				marginBottom: 8,
			}}>
			<Text style={{ fontSize: 12, color: SOFT }}>{label}</Text>
			<Text style={{ fontSize: 16, fontWeight: "700", color: INK }}>
				{value}
			</Text>
			{!!sub && <Text style={{ fontSize: 12, color: SOFT }}>{sub}</Text>}
		</View>
	);
}

// The tree on a little ground scene: sky, grass and dirt drawn from plain blocks.
function Scene({ tree }: { tree: Tree }) {
	const b = POPUP_ART; // outline thickness: one art pixel
	const row = TREE_SIZE / 32; // one sprite pixel row, in dp
	return (
		<View
			style={{
				width: TREE_SIZE + 2 * b,
				height: TREE_SIZE + 2 * b,
				borderWidth: b,
				borderColor: "#000",
				backgroundColor: SKY,
				overflow: "hidden",
				justifyContent: "flex-end",
			}}>
			<View
				style={{
					position: "absolute",
					left: 0,
					right: 0,
					bottom: 0,
					height: 14 * row,
					backgroundColor: GRASS,
				}}
			/>
			<View
				style={{
					position: "absolute",
					left: 0,
					right: 0,
					bottom: 0,
					height: 5 * row,
					backgroundColor: DIRT,
				}}
			/>
			<TreeSprite species={tree.species} state={tree.state} />
		</View>
	);
}

type Props = {
	tree: Tree;
	onWater: () => void;
	onArchive: () => void;
	onRename: (name: string) => void;
};

export function TreePanel({ tree: t, onWater, onArchive, onRename }: Props) {
	const { height } = useWindowDimensions();
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(t.name);
	const now = Date.now();
	const s = t.state;
	const unit: PeriodUnit = t.period;

	// Status tile: what the tree needs right now
	let status = { label: "Status", value: "Healthy", sub: "Keep it up" };
	if (s.phase === "grown" && s.witherStage > 0) {
		status = {
			label: "Status",
			value: `Withering ${s.witherStage}`,
			sub: s.nextDecayAt
				? `Worse in ${left(s.nextDecayAt - now)}`
				: `${s.recoveryProgress}/${s.recoveryNeeded} to recover`,
		};
	} else if (s.nextDecayAt) {
		status = {
			label: "Needs water",
			value: left(s.nextDecayAt - now),
			sub: "until it withers",
		};
	} else if (s.thirsty) {
		status = {
			label: "Status",
			value: "Thirsty",
			sub: `Water before ${String(RULES.dayStartHour).padStart(2, "0")}:00`,
		};
	} else if (s.phase === "growing") {
		status = { label: "Status", value: "Growing", sub: "On track" };
	}

	const periodDone = s.period.done >= s.period.target;
	const reason = t.canWater
		? ""
		: periodDone
			? `Done for this ${unit}`
			: `Come back after ${String(RULES.dayStartHour).padStart(2, "0")}:00`;

	const startRename = () => {
		setDraft(t.name);
		setEditing(true);
	};
	const saveRename = () => {
		const name = draft.trim();
		if (name && name !== t.name) onRename(name);
		setEditing(false);
	};

	const confirmArchive = () =>
		Alert.alert("Archive this tree?", "It will disappear from your forest.", [
			{ text: "Cancel", style: "cancel" },
			{ text: "Archive", style: "destructive", onPress: onArchive },
		]);

	return (
		<ScrollView
			style={{ maxHeight: height * 0.62 }}
			contentContainerStyle={{ alignItems: "center" }}
			keyboardShouldPersistTaps="handled">
			{editing ? (
				<View style={{ width: "100%", alignItems: "center", marginBottom: 8 }}>
					<TextInput
						value={draft}
						onChangeText={setDraft}
						maxLength={24}
						autoFocus
						selectTextOnFocus
						returnKeyType="done"
						onSubmitEditing={saveRename}
						style={{
							width: "100%",
							backgroundColor: "#fff",
							borderWidth: POPUP_ART,
							borderColor: "#000",
							paddingHorizontal: 10,
							paddingVertical: 6,
							fontSize: 18,
							color: INK,
						}}
					/>
					<View style={{ flexDirection: "row" }}>
						<Btn label="Save" disabled={!draft.trim()} onPress={saveRename} />
						<Btn label="Cancel" onPress={() => setEditing(false)} />
					</View>
				</View>
			) : (
				<>
					<Pressable
						onPress={startRename}
						hitSlop={10}
						style={{
							flexDirection: "row",
							alignItems: "center",
							maxWidth: "100%",
						}}>
						<Text
							numberOfLines={1}
							style={{
								fontSize: 20,
								fontWeight: "700",
								color: INK,
								flexShrink: 1,
							}}>
							{t.name}
						</Text>
						<Image
							source={require("../../assets/ui/Pencil.png")}
							fadeDuration={0}
							style={{
								width: 64 / PixelRatio.get(),
								height: 64 / PixelRatio.get(),
								marginLeft: 6,
							}}
						/>
					</Pressable>
					<Text style={{ fontSize: 12, color: SOFT, marginBottom: 8 }}>
						{t.target}x per {unit}
					</Text>
				</>
			)}

			<Scene tree={t} />

			<View style={{ marginTop: 10 }}>
				<WaterBar done={s.period.done} target={s.period.target} widthArt={24} />
			</View>
			<Btn label="Water" disabled={!t.canWater} onPress={onWater} />
			{!!reason && <Text style={{ fontSize: 12, color: SOFT }}>{reason}</Text>}

			<View
				style={{
					flexDirection: "row",
					flexWrap: "wrap",
					justifyContent: "space-between",
					width: "100%",
					marginTop: 12,
				}}>
				<Tile
					label="Streak"
					value={plural(s.streak, unit)}
					sub={`Best ${s.bestStreak}`}
				/>
				{s.phase === "growing" ? (
					<Tile
						label="Growth"
						value={`${s.progress}/${s.growthPeriods}`}
						sub={`${plural(s.growthPeriods - s.progress, unit)} to go`}
					/>
				) : (
					<Tile label="Growth" value="Grown" sub="Maintain it" />
				)}
				<Tile
					label={`This ${unit}`}
					value={`${s.period.done}/${s.period.target}`}
					sub={periodDone ? "Done" : `Ends in ${left(s.period.end - now)}`}
				/>
				<Tile label={status.label} value={status.value} sub={status.sub} />
			</View>

			<View
				style={{
					flexDirection: "row",
					flexWrap: "wrap",
					justifyContent: "center",
				}}>
				<Btn label="Move" disabled onPress={() => {}} />
				<Btn label="Archive" onPress={confirmArchive} />
			</View>
		</ScrollView>
	);
}
