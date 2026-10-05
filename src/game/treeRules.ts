export type PeriodUnit = 'day' | 'week' | 'month';

export const RULES = {
  dayStartHour: 5,          // a "day" runs 05:00 to 05:00 (week: Mon 05:00, month: 1st 05:00)
  graceHours: 5,            // droplet shows during the last 5 h before a period closes
  decayDays: 3,             // days without watering to reach each withering stage
  maxWitherStage: 2,        // raise this when you draw more withering sprites
  recoveryPeriodsPerStage: 2, // met periods needed to climb back one stage
};

// Met periods needed for a tree to be fully grown, per period length.
export const GROWTH_PERIODS: Record<PeriodUnit, number> = { day: 21, week: 6, month: 3 };

const H = RULES.dayStartHour;
const HOUR = 3600 * 1000;
const DECAY_MS = RULES.decayDays * 24 * HOUR;
const GRACE_MS = RULES.graceHours * HOUR;

export type TreeInput = {
  period: PeriodUnit;
  target: number;      // waterings needed per period (1 for a daily habit, 3 for "3x a week")
  plantedAt: number;   // ms timestamp
  waterings: number[]; // ms timestamps
};

export type TreeState = {
  phase: 'growing' | 'grown';
  progress: number;          // met periods while growing (0..growthPeriods)
  growthPeriods: number;
  witherStage: number;       // 0 = healthy, 1..maxWitherStage = withering
  recoveryProgress: number;  // met periods toward the next recovery step
  recoveryNeeded: number;
  streak: number;            // consecutive met periods, including the current one if already met
  bestStreak: number;
  period: { start: number; end: number; done: number; target: number };
  thirsty: boolean;          // show the droplet
  nextDecayAt: number | null; // when the next withering stage will hit, if nothing changes
};

export function periodStart(t: number, unit: PeriodUnit): number {
  const d = new Date(t);
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();
  if (unit === 'month') {
    let s = new Date(y, m, 1, H);
    if (s.getTime() > t) s = new Date(y, m - 1, 1, H);
    return s.getTime();
  }
  let s = new Date(y, m, day, H);
  if (s.getTime() > t) s = new Date(y, m, day - 1, H);
  if (unit === 'week') {
    const back = (s.getDay() + 6) % 7; // days since Monday
    s = new Date(s.getFullYear(), s.getMonth(), s.getDate() - back, H);
  }
  return s.getTime();
}

export function nextPeriodStart(start: number, unit: PeriodUnit): number {
  const s = new Date(start);
  if (unit === 'day') return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 1, H).getTime();
  if (unit === 'week') return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7, H).getTime();
  return new Date(s.getFullYear(), s.getMonth() + 1, 1, H).getTime();
}

export function evaluateTree(tree: TreeInput, now: number): TreeState {
  const { period, target, plantedAt } = tree;
  const growthPeriods = GROWTH_PERIODS[period];
  const MAX = RULES.maxWitherStage;
  const waterings = tree.waterings.filter((t) => t >= plantedAt && t <= now).sort((a, b) => a - b);

  let progress = 0;
  let grown = false;
  let stage = 0;
  let recovery = 0;
  let streak = 0;
  let best = 0;
  let clockStart: number | null = null; // when the current "unwatered since a miss" clock began
  let wi = 0;

  // A watering stops the decay clock; first bank any stages the clock already earned.
  const commitDecay = (t: number) => {
    if (clockStart === null) return;
    const steps = Math.floor((t - clockStart) / DECAY_MS);
    if (steps > 0 && stage < MAX) {
      stage = Math.min(MAX, stage + steps);
      recovery = 0;
    }
    clockStart = null;
  };

  let start = periodStart(plantedAt, period);
  let isFirst = true; // the period the tree was planted in is never counted as a miss

  for (;;) {
    const end = nextPeriodStart(start, period);

    let done = 0;
    while (wi < waterings.length && waterings[wi] < end) {
      if (done === 0) commitDecay(waterings[wi]);
      done++;
      wi++;
    }

    if (end > now) {
      // current, still-open period
      const metNow = done >= target;
      let effStage = stage;
      let nextDecayAt: number | null = null;
      if (grown && clockStart !== null) {
        const steps = Math.floor((now - clockStart) / DECAY_MS);
        effStage = Math.min(MAX, stage + steps);
        if (effStage < MAX) nextDecayAt = clockStart + (steps + 1) * DECAY_MS;
      }
      const shownStreak = streak + (metNow ? 1 : 0);
      // Week/month trees allow one watering per 05:00-05:00 day. If today's is already used, the
      // droplet would ask for something you can't do, so it stays hidden.
      const dayStart = periodStart(now, 'day');
      const wateredToday = period !== 'day' && waterings.some((t) => t >= dayStart);
      return {
        phase: grown ? 'grown' : 'growing',
        progress,
        growthPeriods,
        witherStage: effStage,
        recoveryProgress: recovery,
        recoveryNeeded: RULES.recoveryPeriodsPerStage,
        streak: shownStreak,
        bestStreak: Math.max(best, shownStreak),
        period: { start, end, done, target },
        thirsty: !metNow && !wateredToday && now >= end - GRACE_MS,
        nextDecayAt,
      };
    }

    // closed period
    if (done >= target) {
      streak++;
      best = Math.max(best, streak);
      if (!grown) {
        progress++;
        if (progress >= growthPeriods) grown = true;
      } else if (stage > 0) {
        recovery++;
        if (recovery >= RULES.recoveryPeriodsPerStage) {
          stage--;
          recovery = 0;
        }
      }
    } else if (!isFirst) {
      streak = 0;
      if (!grown) progress = Math.max(0, progress - 1);
      else if (clockStart === null) clockStart = end;
    }

    isFirst = false;
    start = end;
  }
}

// Can the user water this tree right now?
// - never once this period's target is reached (extra waterings don't count)
// - week/month trees: at most one watering per 05:00-05:00 day, so "3x a week" means 3 different days
export function canWater(tree: TreeInput, now: number): boolean {
  const s = evaluateTree(tree, now);
  if (s.period.done >= s.period.target) return false;
  if (tree.period === 'day') return true;
  const dayStart = periodStart(now, 'day');
  return !tree.waterings.some((t) => t >= dayStart && t <= now);
}

// How the soil under a tree looks:
// - wet:  nothing more can be watered right now (period done, or today's watering already used)
// - damp: watered today, but the tree needs more waterings today (a daily tree with a target above 1)
// - dry:  can be watered and hasn't been watered today
export type Ground = 'dry' | 'damp' | 'wet';

export function groundState(tree: TreeInput, now: number): Ground {
  if (!canWater(tree, now)) return 'wet';
  const s = evaluateTree(tree, now);
  return tree.period === 'day' && s.period.done > 0 ? 'damp' : 'dry';
}