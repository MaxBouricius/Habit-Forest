import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Btn } from '../components/Btn';
import { Panel } from '../components/Panel';
import { ParkPlaque, PLAQUE_H } from '../components/ParkPlaque';
import { Text } from '../components/PixelText';
import { headerInset, ScreenFrame } from '../components/ScreenFrame';
import { TreePanel } from '../components/TreePanel';
import { TreeSprite } from '../components/TreeSprite';
import { WelcomePanel } from '../components/WelcomePanel';
import { useForest } from '../db/useForest';
import { useParkName } from '../db/useParkName';

export default function Index() {
  const { trees, loaded, water, archive, rename } = useForest();
  const park = useParkName();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = trees.find((t) => t.id === selectedId) ?? null;

  return (
    <ScreenFrame
      header={<ParkPlaque name={park.name ?? 'Forest'} />}
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
              />
            )}
          </Panel>

          {/* Shown on any launch where the park has no name yet, and can't be dismissed */}
          <Panel visible={park.loaded && park.name === null}>
            <WelcomePanel onSave={park.save} />
          </Panel>
        </>
      }
    >
            <ScrollView contentContainerStyle={{ padding: 8, paddingTop: headerInset(PLAQUE_H), paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row' }}>
          <Btn label="Plant a tree" onPress={() => router.push('/plant')} />
        </View>

        {loaded && trees.length === 0 && <Text style={{ marginTop: 16 }}>No trees yet. Plant your first one!</Text>}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
          {trees.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setSelectedId(t.id)}
              style={{ width: '50%', alignItems: 'center', marginBottom: 16 }}
            >
              <TreeSprite species={t.species} state={t.state} ground={t.ground} />
              <Text numberOfLines={1} style={{ marginTop: 4 }}>
                {t.name}
              </Text>
              <Text>
                {t.state.phase === 'growing'
                  ? `${t.state.progress}/${t.state.growthPeriods}`
                  : t.state.witherStage > 0
                  ? 'Withering'
                  : 'Grown'}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ScreenFrame>
  );
}