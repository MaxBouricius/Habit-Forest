import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { FONT, Text, pixelSize } from '../components/PixelText';
import { router } from 'expo-router';
import { Btn } from '../components/Btn';
import { ART } from '../components/BorderUi';
import { ScreenFrame } from '../components/ScreenFrame';
import { WaterBar } from '../components/WaterBar';
import { PendingTree, useForest } from '../db/useForest';
import { firstFreeCell } from '../game/grid';
import { GROWTH_PERIODS, PeriodUnit } from '../game/treeRules';

// max = highest waterings-per-period offered. Week/month trees allow one watering per day,
// and the bar only reads well up to about 10 segments.
const PERIODS: { id: PeriodUnit; label: string; per: string; unit: string; max: number }[] = [
  { id: 'day', label: 'Day', per: 'day', unit: 'days', max: 10 },
  { id: 'week', label: 'Week', per: 'week', unit: 'weeks', max: 7 },
  { id: 'month', label: 'Month', per: 'month', unit: 'months', max: 10 },
];

export default function Plant() {
  const { plant, trees } = useForest();
  const [name, setName] = useState('');
  const [period, setPeriod] = useState<PeriodUnit>('day');
  const [target, setTarget] = useState(1);
  const [saving, setSaving] = useState(false);

  const info = PERIODS.find((p) => p.id === period)!;
  const canPlant = name.trim().length > 0 && !saving;

  const choosePeriod = (id: PeriodUnit) => {
    const max = PERIODS.find((p) => p.id === id)!.max;
    setPeriod(id);
    setTarget((t) => Math.min(t, max));
  };

  // Back to the map, where you pick the spot; the tree is only planted once you tap a cell.
  // If the map is full there is nothing to pick, so it is planted right away without a spot.
  const submit = async () => {
    if (!canPlant) return;
    const taken = trees.flatMap((t) => (t.gridX != null && t.gridY != null ? [{ x: t.gridX, y: t.gridY }] : []));
    if (firstFreeCell(taken) === null) {
      setSaving(true);
      await plant(name.trim(), 'pine', period, target);
      router.back();
      return;
    }
    const pending: PendingTree = { name: name.trim(), species: 'pine', period, target };
    router.dismissTo({ pathname: '/', params: { plant: JSON.stringify(pending) } });
  };

  return (
    <ScreenFrame>
      <ScrollView contentContainerStyle={{ padding: 8 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 24, fontWeight: '700' }}>Plant a tree</Text>

        <Text style={{ marginTop: 16, fontWeight: '700' }}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          maxLength={24}
          placeholder="e.g. Morning run"
          placeholderTextColor="#777"
          style={{
            marginTop: 6,
            backgroundColor: '#fff',
            borderWidth: ART,
            borderColor: '#000',
            paddingHorizontal: 10,
            paddingVertical: 8,
            fontSize: pixelSize(16),
            fontFamily: FONT,
          }}
        />

        <Text style={{ marginTop: 16, fontWeight: '700' }}>How often?</Text>
        <View style={{ flexDirection: 'row' }}>
          {PERIODS.map((p) => (
            <Btn key={p.id} label={p.label} selected={p.id === period} onPress={() => choosePeriod(p.id)} />
          ))}
        </View>

        <Text style={{ marginTop: 16, fontWeight: '700' }}>Waterings per {info.per}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Btn label="-" disabled={target <= 1} onPress={() => setTarget((t) => t - 1)} />
          <Text style={{ fontSize: 20, fontWeight: '700', minWidth: 32, textAlign: 'center' }}>{target}</Text>
          <Btn label="+" disabled={target >= info.max} onPress={() => setTarget((t) => t + 1)} />
        </View>
        {period !== 'day' && <Text>At most one watering per day, spread over different days.</Text>}

        <Text style={{ marginTop: 16, fontWeight: '700' }}>Preview</Text>
        <View style={{ marginVertical: 6 }}>
          <WaterBar done={0} target={target} />
        </View>
        <Text>
          Grows in {GROWTH_PERIODS[period]} {info.unit} if you keep it up.
        </Text>

        <View style={{ flexDirection: 'row', marginTop: 24 }}>
          <Btn label="Plant" disabled={!canPlant} onPress={submit} />
          <Btn label="Cancel" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </ScreenFrame>
  );
}