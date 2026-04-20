/** Поле 8×8, компактная партия. */
export const BS_SIZE = 8;

/** Длины кораблей: один 3, два 2, два 1. */
export const BS_FLEET_LENGTHS = [3, 2, 2, 1, 1] as const;

export function bsIdx(r: number, c: number): number {
  return r * BS_SIZE + c;
}

export function bsRc(i: number): [number, number] {
  return [Math.floor(i / BS_SIZE), i % BS_SIZE];
}

/** Случайная расстановка без пересечений. */
export function bsPlaceShips(lengths: readonly number[]): number[][] | null {
  const occupied = new Set<number>();
  const ships: number[][] = [];
  for (const len of lengths) {
    let placed = false;
    for (let t = 0; t < 600 && !placed; t++) {
      const horiz = Math.random() < 0.5;
      const r = Math.floor(Math.random() * BS_SIZE);
      const c = Math.floor(Math.random() * BS_SIZE);
      const cells: number[] = [];
      if (horiz) {
        if (c + len > BS_SIZE) continue;
        for (let k = 0; k < len; k++) cells.push(bsIdx(r, c + k));
      } else {
        if (r + len > BS_SIZE) continue;
        for (let k = 0; k < len; k++) cells.push(bsIdx(r + k, c));
      }
      if (cells.some((i) => occupied.has(i))) continue;
      for (const i of cells) occupied.add(i);
      ships.push(cells);
      placed = true;
    }
    if (!placed) return null;
  }
  return ships;
}

export function bsNewFleet(): number[][] {
  for (let attempt = 0; attempt < 120; attempt++) {
    const s = bsPlaceShips(BS_FLEET_LENGTHS);
    if (s && s.length === BS_FLEET_LENGTHS.length) return s;
  }
  const fallback = bsPlaceShips(BS_FLEET_LENGTHS);
  if (fallback) return fallback;
  return [];
}

export function bsFleetDestroyed(ships: number[][], hits: ReadonlySet<number>): boolean {
  if (!ships.length) return false;
  return ships.every((ship) => ship.length > 0 && ship.every((cell) => hits.has(cell)));
}

/** Случайный выстрел ИИ по ещё не обстрелянным клеткам. */
export function bsRandomShot(already: ReadonlySet<number>): number {
  const pool: number[] = [];
  for (let i = 0; i < BS_SIZE * BS_SIZE; i++) {
    if (!already.has(i)) pool.push(i);
  }
  if (pool.length === 0) return -1;
  return pool[Math.floor(Math.random() * pool.length)]!;
}
