import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Btn } from "../components/Btn";
import { Panel } from "../components/Panel";
import { ParkPlaque, PLAQUE_H } from "../components/ParkPlaque";
import { FRAME_INSET, headerInset, ScreenFrame } from "../components/ScreenFrame";
import { TreePanel } from "../components/TreePanel";
import { WelcomePanel } from "../components/WelcomePanel";
import { WorldMap } from "../components/WorldMap";
import { useForest } from "../db/useForest";
import { useParkName } from "../db/useParkName";
import { PlantButton, SettingsButton } from "../components/SettingsButton";
import { SettingsPanel } from "../components/SettingsPanel";
export default function Index() {
	const {
		trees,
		water,
		archive,
		rename,
		advance,
		move,
		simNight,
		setSimNight,
		reload,
	} = useForest();
	const park = useParkName();
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [movingId, setMovingId] = useState<number | null>(null); // tree picked up by the Move button
	const [settingsOpen, setSettingsOpen] = useState(false);
	const selected = trees.find((t) => t.id === selectedId) ?? null;

	return (
		<ScreenFrame
			fill
			header={<ParkPlaque name={park.name ?? "Forest"} />}
			bottomRight={<SettingsButton onPress={() => setSettingsOpen(true)} />}
			bottomLeft={<PlantButton onPress={() => router.push("/plant")} />}
			overlay={
				<>
					<Panel visible={!!selected} onClose={() => setSelectedId(null)}>
						{selected && (
							<TreePanel
								tree={selected}
								onWater={() => water(selected.id)}
								onRename={(name) => rename(selected.id, name)}
								onArchive={async () => {
									await archive(selected.id);
									setSelectedId(null);
								}}
								onAdvance={() => advance(selected.id, 3)}
								onMove={() => {
									setMovingId(selected.id);
									setSelectedId(null);
								}}
								frozen={simNight}
							/>
						)}
					</Panel>
					<Panel visible={settingsOpen} onClose={() => setSettingsOpen(false)}>
						<SettingsPanel
							onClose={() => setSettingsOpen(false)}
							onRestored={() => {
								setSelectedId(null);
								reload();
								park.reload();
							}}
						/>
					</Panel>
					{/* Shown on any launch where the park has no name yet, and can't be dismissed */}
					<Panel visible={park.loaded && park.name === null}>
						<WelcomePanel onSave={park.save} />
					</Panel>
				</>
			}>
			<WorldMap
				trees={trees}
				movingId={movingId}
				onTreePress={(id) => {
					if (movingId === null) setSelectedId(id);
					else if (movingId === id) setMovingId(null); // tap the picked-up tree again to cancel
				}}
				onCellPress={async (x, y) => {
					if (movingId === null) return;
					if (await move(movingId, x, y)) setMovingId(null);
				}}
			/>

			{/* Buttons float over the map, just under the park plaque */}
			<View
				pointerEvents="box-none"
				style={{
					position: "absolute",
					top: FRAME_INSET + headerInset(PLAQUE_H),
					left: FRAME_INSET,
					right: FRAME_INSET,
					flexDirection: "row",
					flexWrap: "wrap",
					padding: 8,
				}}>
				{movingId !== null ? (
					<Btn label="Cancel" onPress={() => setMovingId(null)} />
				) : (
					__DEV__ && (
						<Btn
							label={simNight ? "Time: 00:30" : "Time: normal"}
							onPress={() => setSimNight((s) => !s)}
						/>
					)
				)}
			</View>
		</ScreenFrame>
	);
}
