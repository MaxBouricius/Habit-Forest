import { MAP_COLS, MAP_ROWS, assignMissing, firstFreeCell, inBounds, isFree } from './grid';

describe('grid', () => {
  test('inBounds rejects outside and fractions', () => {
    expect(inBounds({ x: 0, y: 0 })).toBe(true);
    expect(inBounds({ x: MAP_COLS - 1, y: MAP_ROWS - 1 })).toBe(true);
    expect(inBounds({ x: MAP_COLS, y: 0 })).toBe(false);
    expect(inBounds({ x: 0, y: -1 })).toBe(false);
    expect(inBounds({ x: 1.5, y: 0 })).toBe(false);
  });

  test('isFree respects taken cells', () => {
    expect(isFree({ x: 1, y: 1 }, [{ x: 1, y: 1 }])).toBe(false);
    expect(isFree({ x: 2, y: 1 }, [{ x: 1, y: 1 }])).toBe(true);
  });

  test('firstFreeCell fills row by row and returns null when full', () => {
    expect(firstFreeCell([])).toEqual({ x: 0, y: 0 });
    expect(firstFreeCell([{ x: 0, y: 0 }])).toEqual({ x: 1, y: 0 });
    const all = [];
    for (let y = 0; y < MAP_ROWS; y++) for (let x = 0; x < MAP_COLS; x++) all.push({ x, y });
    expect(firstFreeCell(all)).toBeNull();
  });

  test('assignMissing places unplaced trees and keeps placed ones', () => {
    const r = assignMissing([
      { id: 1, gridX: 0, gridY: 0 },
      { id: 2, gridX: null, gridY: null },
      { id: 3, gridX: null, gridY: null },
    ]);
    expect(r).toEqual([
      { id: 2, x: 1, y: 0 },
      { id: 3, x: 2, y: 0 },
    ]);
  });

  test('assignMissing fixes duplicates and out-of-bounds', () => {
    const r = assignMissing([
      { id: 1, gridX: 0, gridY: 0 },
      { id: 2, gridX: 0, gridY: 0 },
      { id: 3, gridX: 99, gridY: 0 },
    ]);
    expect(r).toEqual([
      { id: 2, x: 1, y: 0 },
      { id: 3, x: 2, y: 0 },
    ]);
  });
});