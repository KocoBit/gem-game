// Pure board logic: creation, match detection, move search, shuffling.
import { N, T } from './constants.js';

export const inBounds = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
export const randType = () => Math.floor(Math.random() * T);

/** A gem; x/y are its animated display position in cell units. */
export const makeGem = (t, r, c) => ({ t, kind: null, x: c, y: r, s: 1, a: 1, dying: false });

export const swapCells = (grid, a, b) => {
  const tmp = grid[a[0]][a[1]];
  grid[a[0]][a[1]] = grid[b[0]][b[1]];
  grid[b[0]][b[1]] = tmp;
};

const sameColor = (a, b) =>
  a && b && a.kind !== 'rainbow' && b.kind !== 'rainbow' && a.t === b.t;

/**
 * Returns match groups: arrays of [r, c]. Line groups (PRD M-1) and
 * 2x2 square groups (PRD M-2, flagged with `.square = true`).
 */
export function findMatches(grid) {
  const groups = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; ) {
      let e = c + 1;
      while (e < N && sameColor(grid[r][c], grid[r][e])) e++;
      if (e - c >= 3) groups.push(Array.from({ length: e - c }, (_, i) => [r, c + i]));
      c = e;
    }
  }
  for (let c = 0; c < N; c++) {
    for (let r = 0; r < N; ) {
      let e = r + 1;
      while (e < N && sameColor(grid[r][c], grid[e][c])) e++;
      if (e - r >= 3) groups.push(Array.from({ length: e - r }, (_, i) => [r + i, c]));
      r = e;
    }
  }
  for (let r = 0; r < N - 1; r++) {
    for (let c = 0; c < N - 1; c++) {
      const a = grid[r][c];
      if (sameColor(a, grid[r][c + 1]) && sameColor(a, grid[r + 1][c]) && sameColor(a, grid[r + 1][c + 1])) {
        const g = [[r, c], [r, c + 1], [r + 1, c], [r + 1, c + 1]];
        g.square = true;
        groups.push(g);
      }
    }
  }
  return groups;
}

/** Finds one valid move as [[r1,c1],[r2,c2]], or null. */
export function findMove(grid) {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (grid[r][c].kind === 'rainbow') return [[r, c], c + 1 < N ? [r, c + 1] : [r, c - 1]];
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const r2 = r + dr, c2 = c + dc;
        if (!inBounds(r2, c2)) continue;
        if (grid[r2][c2].kind === 'rainbow') return [[r, c], [r2, c2]];
        swapCells(grid, [r, c], [r2, c2]);
        const ok = findMatches(grid).length > 0;
        swapCells(grid, [r, c], [r2, c2]);
        if (ok) return [[r, c], [r2, c2]];
      }
    }
  }
  return null;
}

/** New board with no pre-made matches and at least one move (PRD B-3, B-4). */
export function createBoard() {
  for (;;) {
    const grid = [];
    for (let r = 0; r < N; r++) {
      grid.push([]);
      for (let c = 0; c < N; c++) {
        let t;
        do t = randType();
        while (
          (c >= 2 && grid[r][c - 1].t === t && grid[r][c - 2].t === t) ||
          (r >= 2 && grid[r - 1][c].t === t && grid[r - 2][c].t === t) ||
          (r >= 1 && c >= 1 && grid[r - 1][c].t === t && grid[r][c - 1].t === t && grid[r - 1][c - 1].t === t)
        );
        grid[r].push(makeGem(t, r - N - 1, c)); // start above the board, then drop in
      }
    }
    if (findMove(grid)) return grid;
  }
}

/** Shuffle in place until there is a move and no ready-made match (PRD H-3). */
export function shuffleBoard(grid) {
  do {
    const all = grid.flat();
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) grid[r][c] = all[r * N + c];
  } while (!findMove(grid) || findMatches(grid).length);
}
