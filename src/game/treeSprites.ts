import { TreeState } from './treeRules';

const pine = {
  growing: [
    require('../../assets/trees/PineStage1Upscale.png'),
    require('../../assets/trees/PineStage2Upscale.png'),
    require('../../assets/trees/PineStage3Upscale.png'),
  ],
  // index = withering stage: 0 healthy, 1 and 2 withering
  grown: [
    require('../../assets/trees/PineStage4Upscale.png'),
    require('../../assets/trees/PineWitheredStage1Upscale.png'),
    require('../../assets/trees/PineWithered2Upscale.png'),
  ],
};

// The highest pixel of each sprite, same order as above: its row and column on the 32x32 canvas
// (0,0 = top left). When a row has several pixels at the top, use the rightmost one.
// The droplet is placed relative to this point. Update these if you redraw the sprites.
type Tip = { row: number; col: number };
const TIPS: Record<string, { growing: Tip[]; grown: Tip[] }> = {
  pine: {
    growing: [
      { row: 23, col: 17 },
      { row: 19, col: 17 },
      { row: 8, col: 18 },
    ],
    grown: [
      { row: 0, col: 18 }, // healthy
      { row: 0, col: 16 }, // withering 1
      { row: 0, col: 16 }, // withering 2
    ],
  },
};

const SPECIES: Record<string, typeof pine> = { pine };

function growingIndex(s: TreeState) {
  return s.progress * 3 < s.growthPeriods ? 0 : s.progress * 3 < s.growthPeriods * 2 ? 1 : 2;
}

export function spriteFor(species: string, s: TreeState) {
  const set = SPECIES[species] ?? pine; // unknown species fall back to pine
  if (s.phase === 'growing') return set.growing[growingIndex(s)];
  return set.grown[Math.min(s.witherStage, set.grown.length - 1)];
}

export function spriteTip(species: string, s: TreeState): Tip {
  const tips = TIPS[species] ?? TIPS.pine;
  if (s.phase === 'growing') return tips.growing[growingIndex(s)];
  return tips.grown[Math.min(s.witherStage, tips.grown.length - 1)];
}