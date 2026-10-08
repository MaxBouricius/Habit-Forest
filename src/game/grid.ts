// Tree placement on the world map. Pure logic, no React or database in here.

export const MAP_COLS = 6;
export const MAP_ROWS = 8;

export type Cell = { x: number; y: number };

export type Placed = { id: number; gridX: number | null; gridY: number | null };

export function inBounds(c: Cell): boolean {
  return (
    Number.isInteger(c.x) &&
    Number.isInteger(c.y) &&
    c.x >= 0 &&
    c.x < MAP_COLS &&
    c.y >= 0 &&
    c.y < MAP_ROWS
  );
}

export function isFree(c: Cell, taken: Cell[]): boolean {
  return inBounds(c) && !taken.some((t) => t.x === c.x && t.y === c.y);
}

// First free cell, filling row by row from the top-left. Null when the map is full.
export function firstFreeCell(taken: Cell[]): Cell | null {
  for (let y = 0; y < MAP_ROWS; y++) {
    for (let x = 0; x < MAP_COLS; x++) {
      if (isFree({ x, y }, taken)) return { x, y };
    }
  }
  return null;
}

// Gives every tree without a valid, unique spot a free one.
// Returns only the trees that need updating.
export function assignMissing(trees: Placed[]): { id: number; x: number; y: number }[] {
  const taken: Cell[] = [];
  const needs: Placed[] = [];
  for (const t of trees) {
    const c = { x: t.gridX ?? -1, y: t.gridY ?? -1 };
    if (t.gridX != null && t.gridY != null && isFree(c, taken)) taken.push(c);
    else needs.push(t);
  }
  const out: { id: number; x: number; y: number }[] = [];
  for (const t of needs) {
    const c = firstFreeCell(taken);
    if (!c) break;
    taken.push(c);
    out.push({ id: t.id, x: c.x, y: c.y });
  }
  return out;
}