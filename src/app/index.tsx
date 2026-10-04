import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Btn } from "../components/Btn";
import { Panel } from "../components/Panel";
import { ScreenFrame } from "../components/ScreenFrame";
import { TreePanel } from "../components/TreePanel";
import { TreeSprite } from "../components/TreeSprite";
import { WaterBar } from "../components/WaterBar";
import { useForest } from "../db/useForest";

export default function Index() {
	const { trees, loaded, water, archive, rename } = useForest();
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const selected = trees.find((t) => t.id === selectedId) ?? null;

	return (
		<ScreenFrame>
			<ScrollView contentContainerStyle={{ padding: 8 }}>
				<Text style={{ fontSize: 18, fontWeight: "700" }}>Forest</Text>
				<View style={{ flexDirection: "row" }}>
					<Btn label="Plant a tree" onPress={() => router.push("/plant")} />
				</View>

				{loaded && trees.length === 0 && (
					<Text style={{ marginTop: 16 }}>
						No trees yet. Plant your first one!
					</Text>
				)}

				<View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
					{trees.map((t) => (
						<Pressable
							key={t.id}
							onPress={() => setSelectedId(t.id)}
							style={{ width: "50%", alignItems: "center", marginBottom: 16 }}>
							<TreeSprite species={t.species} state={t.state} />
							<Text
								numberOfLines={1}
								style={{ fontWeight: "700", marginTop: 4 }}>
								{t.name}
							</Text>
							<Text>
								{t.state.phase === "growing"
									? `${t.state.progress}/${t.state.growthPeriods}`
									: t.state.witherStage > 0
										? "Withering"
										: "Grown"}
							</Text>
							<View style={{ marginVertical: 6 }}>
								<WaterBar
									done={t.state.period.done}
									target={t.state.period.target}
									widthArt={20}
								/>
							</View>
						</Pressable>
					))}
				</View>
			</ScrollView>

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
					/>
				)}
			</Panel>
		</ScreenFrame>
	);
}
