import { canWater, evaluateTree, groundState, TreeInput } from './treeRules';

// September 2026: the 7th is a Monday, and no daylight-saving change falls inside the month.
const at = (day: number, hour = 12, min = 0) => new Date(2026, 8, day, hour, min).getTime();
const oct = (day: number, hour = 12, min = 0) => new Date(2026, 9, day, hour, min).getTime();
const daily = (from: number, to: number) => {
  const out: number[] = [];
  for (let d = from; d <= to; d++) out.push(at(d));
  return out;
};
const dailyTree = (waterings: number[], plantedAt = at(7, 6)): TreeInput => ({
  period: 'day',
  target: 1,
  plantedAt,
  waterings,
});

describe('growing', () => {
  test('a watering in the planting period counts once that period closes', () => {
    const t = dailyTree([at(7, 15)], at(7, 14));
    expect(evaluateTree(t, at(8, 12)).progress).toBe(1);
  });

  test('the planting period is never punished if unwatered', () => {
    const s = evaluateTree(dailyTree([], at(7, 14)), at(8, 12));
    expect(s.progress).toBe(0);
    expect(s.streak).toBe(0);
  });

  test('missing a day sets you back one extra day', () => {
    const w = [...daily(7, 10), at(12)]; // 5 waterings, one miss -> 4 progress
    expect(evaluateTree(dailyTree(w), at(13, 12)).progress).toBe(4);
  });

  test('21 met periods fully grows a daily tree', () => {
    const w = daily(7, 27);
    expect(evaluateTree(dailyTree(w), at(28, 4)).phase).toBe('growing'); // 27th not closed yet
    const s = evaluateTree(dailyTree(w), at(28, 6));
    expect(s.phase).toBe('grown');
    expect(s.witherStage).toBe(0);
  });
});

describe('droplet', () => {
  test('shows between 00:00 and 05:00 while unmet, not before or after', () => {
    const t = dailyTree([], at(7, 6));
    expect(evaluateTree(t, at(7, 20)).thirsty).toBe(false);
    expect(evaluateTree(t, at(8, 2)).thirsty).toBe(true);
    expect(evaluateTree(t, at(8, 6)).thirsty).toBe(false); // new period started
  });

  test('a watering in the grace window counts for the ending day', () => {
    const t = dailyTree([at(7, 12), at(9, 3)]); // the 8th's period is filled at 03:00 on the 9th
    expect(evaluateTree(t, at(9, 12)).progress).toBe(2);
  });
});

describe('grown tree decay and recovery', () => {
  const grownWaterings = daily(7, 27); // grown by the 28th 05:00; first miss registers the 29th 05:00

  test('withering stages arrive 3 days apart after the miss', () => {
    const t = dailyTree(grownWaterings);
    expect(evaluateTree(t, oct(2, 4)).witherStage).toBe(0);
    expect(evaluateTree(t, oct(2, 6)).witherStage).toBe(1);
    expect(evaluateTree(t, oct(5, 4)).witherStage).toBe(1);
    expect(evaluateTree(t, oct(5, 6)).witherStage).toBe(2);
    expect(evaluateTree(t, oct(20)).witherStage).toBe(2); // capped, never dies
    expect(evaluateTree(t, oct(20)).phase).toBe('grown');
  });

  test('any watering before the clock runs out stops the decay', () => {
    const t = dailyTree([...grownWaterings, oct(1, 12)]);
    const s = evaluateTree(t, oct(2, 12));
    expect(s.witherStage).toBe(0);
    expect(s.nextDecayAt).toBeNull();
  });

  test('each withering stage needs 2 met periods to recover', () => {
    const w = [...grownWaterings, oct(6), oct(7), oct(8), oct(9), oct(10)]; // stage 2 by Oct 5
    const t = dailyTree(w);
    expect(evaluateTree(t, oct(6, 13)).witherStage).toBe(2);
    expect(evaluateTree(t, oct(8, 6)).witherStage).toBe(1);
    expect(evaluateTree(t, oct(10, 6)).witherStage).toBe(0);
  });
});

describe('weekly tree with a 3x target', () => {
  const base = { period: 'week' as const, target: 3, plantedAt: at(7, 6) }; // planted Monday

  test('counts waterings toward the bar', () => {
    const s = evaluateTree({ ...base, waterings: [at(8), at(10)] }, at(11));
    expect(s.period.done).toBe(2);
    expect(s.period.target).toBe(3);
  });

  test('week closes Monday 05:00; an unmet week shows the droplet in the grace window', () => {
    const t = { ...base, waterings: [at(8), at(10)] };
    expect(evaluateTree(t, at(14, 2)).thirsty).toBe(true);
    expect(evaluateTree(t, at(14, 6)).thirsty).toBe(false);
    expect(evaluateTree(t, at(14, 6)).progress).toBe(0); // planting week isn't punished, and unmet
  });

  test('no droplet if the weekly tree was already watered today, even in the last hours of the week', () => {
    const t = { ...base, waterings: [at(8), at(13, 20)] }; // 2/3, watered Sunday evening
    expect(evaluateTree(t, at(14, 0, 2)).period.done).toBe(2);
    expect(evaluateTree(t, at(14, 0, 2)).thirsty).toBe(false);
    const u = { ...base, waterings: [at(8), at(10)] }; // 2/3, nothing watered today
    expect(evaluateTree(u, at(14, 0, 2)).thirsty).toBe(true);
  });

  test('a met week counts as growth', () => {
    const t = { ...base, waterings: [at(8), at(10), at(12)] };
    expect(evaluateTree(t, at(14, 6)).progress).toBe(1);
  });
});

describe('canWater', () => {
  const weekly = (waterings: number[]) => ({ period: 'week' as const, target: 3, plantedAt: at(7, 6), waterings });

  test('weekly 3x: only one watering per day, spread over different days', () => {
    expect(canWater(weekly([]), at(8, 12))).toBe(true);
    expect(canWater(weekly([at(8, 12)]), at(8, 18))).toBe(false); // same day
    expect(canWater(weekly([at(8, 12)]), at(9, 12))).toBe(true); // next day
  });

  test('weekly 3x: blocked once the target is met', () => {
    expect(canWater(weekly([at(8), at(9), at(10)]), at(11))).toBe(false);
  });

  test('the day boundary is 05:00, not midnight', () => {
    const w = weekly([at(8, 3)]); // 03:00 belongs to the day that started the 7th at 05:00
    expect(canWater(w, at(8, 4))).toBe(false);
    expect(canWater(w, at(8, 6))).toBe(true);
  });

  test('daily tree with a target of 3 can be watered several times in one day', () => {
    const d = (waterings: number[]) => ({ period: 'day' as const, target: 3, plantedAt: at(7, 6), waterings });
    expect(canWater(d([at(7, 8), at(7, 10)]), at(7, 12))).toBe(true);
    expect(canWater(d([at(7, 8), at(7, 10), at(7, 11)]), at(7, 12))).toBe(false);
  });
});

describe('groundState', () => {
  const daily3 = (waterings: number[]) => ({ period: 'day' as const, target: 3, plantedAt: at(7, 6), waterings });
  const weekly3 = (waterings: number[]) => ({ period: 'week' as const, target: 3, plantedAt: at(7, 6), waterings });
  const daily1 = (waterings: number[]) => ({ period: 'day' as const, target: 1, plantedAt: at(7, 6), waterings });

  test('daily tree needing 3 waterings: dry, then damp, then wet', () => {
    expect(groundState(daily3([]), at(8, 12))).toBe('dry');
    expect(groundState(daily3([at(8, 8)]), at(8, 12))).toBe('damp');
    expect(groundState(daily3([at(8, 8), at(8, 10)]), at(8, 12))).toBe('damp');
    expect(groundState(daily3([at(8, 8), at(8, 10), at(8, 11)]), at(8, 12))).toBe('wet');
  });

  test('daily tree needing 1 watering: dry, then straight to wet', () => {
    expect(groundState(daily1([]), at(8, 12))).toBe('dry');
    expect(groundState(daily1([at(8, 8)]), at(8, 12))).toBe('wet');
  });

  test('weekly tree is never damp: watered today means wet, yesterday only means dry', () => {
    expect(groundState(weekly3([at(8, 8)]), at(8, 12))).toBe('wet');
    expect(groundState(weekly3([at(8, 8)]), at(9, 12))).toBe('dry');
  });

  test('resets to dry when the 05:00 day rolls over', () => {
    const w = daily3([at(8, 8), at(8, 10)]);
    expect(groundState(w, at(9, 4))).toBe('damp'); // still the same day
    expect(groundState(w, at(9, 6))).toBe('dry');
  });
});