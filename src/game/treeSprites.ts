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

const SPECIES: Record<string, typeof pine> = { pine };

export function spriteFor(species: string, s: TreeState) {
  const set = SPECIES[species] ?? pine; // unknown species (like the old 'oak' test trees) fall back to pine
  if (s.phase === 'growing') {
    const i = s.progress * 3 < s.growthPeriods ? 0 : s.progress * 3 < s.growthPeriods * 2 ? 1 : 2;
    return set.growing[i];
  }
  return set.grown[Math.min(s.witherStage, set.grown.length - 1)];
}