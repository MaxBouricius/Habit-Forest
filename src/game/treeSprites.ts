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

// First filled pixel row of each sprite (0 = top of the 32-row canvas), same order as above.
// Used to float the droplet just above the tree. Update these if you redraw the sprites.
const TOP_ROWS: Record<string, { growing: number[]; grown: number[] }> = {
  pine: { growing: [23, 19, 8], grown: [0, 0, 0] },
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

export function spriteTop(species: string, s: TreeState) {
  const rows = TOP_ROWS[species] ?? TOP_ROWS.pine;
  if (s.phase === 'growing') return rows.growing[growingIndex(s)];
  return rows.grown[Math.min(s.witherStage, rows.grown.length - 1)];
}