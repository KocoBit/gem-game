// Game engine: owns the mutable board and runs the swap → match → cascade flow.
// React reads HUD state via the onHud / onMessage callbacks; the canvas
// renderer reads `engine.grid`, `engine.sel`, etc. every animation frame.
import { N, COLORS, HINT_MS, AUTO_HINT_MS, levelGoal } from './constants.js';
import {
  inBounds, randType, makeGem, swapCells, findMatches, findMove, createBoard, shuffleBoard,
} from './board.js';
import { sfx } from './sound.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class GemEngine {
  constructor({ onHud, onMessage }) {
    // Build the first board silently so React state isn't set during render.
    this.onHud = () => {};
    this.start();
    this.onHud = onHud;
    this.onMessage = onMessage;
  }

  /* ---------- lifecycle ---------- */
  start() {
    this.grid = createBoard();
    this.score = 0;
    this.level = 1;
    this.levelBase = 0;
    this.busy = false;
    this.sel = null;
    this.hintCells = null;
    this.particles = [];
    this.idleSince = performance.now();
    this.emitHud();
  }

  emitHud() {
    const progress = Math.min(1, (this.score - this.levelBase) / levelGoal(this.level));
    this.onHud({ score: this.score, level: this.level, progress });
  }

  /* ---------- per-frame update (positions, scale, auto-hint) ---------- */
  update(now) {
    if (!this.busy && !this.hintCells && now - this.idleSince > AUTO_HINT_MS) {
      this.idleSince = now;
      this.showHint();
    }
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const g = this.grid[r][c];
        if (!g) continue;
        if (g.y < r) g.y = Math.min(r, g.y + Math.max(0.12, (r - g.y) * 0.15));
        else g.y += (r - g.y) * 0.22;
        g.x += (c - g.x) * 0.22;
        if (Math.abs(g.x - c) < 0.01) g.x = c;
        if (Math.abs(g.y - r) < 0.01) g.y = r;
        if (g.dying) { g.s *= 0.8; g.a *= 0.8; } else g.s += (1 - g.s) * 0.15;
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.particles) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.008; p.life -= 0.03;
    }
  }

  settled() {
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const g = this.grid[r][c];
        if (g && (Math.abs(g.x - c) > 0.01 || Math.abs(g.y - r) > 0.01)) return false;
      }
    }
    return true;
  }

  async waitSettle() {
    await sleep(30);
    while (!this.settled()) await sleep(16);
  }

  /* ---------- input (PRD 3.2) ---------- */
  /** Click/tap on a cell. Returns true if it started a swap. */
  tap(p) {
    if (this.busy) return false;
    const s = this.sel;
    if (s && Math.abs(s[0] - p[0]) + Math.abs(s[1] - p[1]) === 1) {
      this.trySwap(s, p);
      return true;
    }
    this.sel = s && s[0] === p[0] && s[1] === p[1] ? null : p;
    sfx.select();
    return false;
  }

  /** Drag from cell p toward direction (dr, dc). */
  drag(p, dr, dc) {
    const t = [p[0] + dr, p[1] + dc];
    if (!this.busy && inBounds(t[0], t[1])) this.trySwap(p, t);
  }

  showHint() {
    if (this.busy) return;
    this.hintCells = findMove(this.grid);
    clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => { this.hintCells = null; }, HINT_MS);
  }

  /* ---------- core flow ---------- */
  async trySwap(a, b) {
    if (this.busy) return;
    this.busy = true;
    this.sel = null;
    this.hintCells = null;
    const grid = this.grid;
    const ga = grid[a[0]][a[1]], gb = grid[b[0]][b[1]];
    swapCells(grid, a, b);
    sfx.swap();
    await this.waitSettle();

    if (ga.kind === 'rainbow' || gb.kind === 'rainbow') {
      // PRD S-2: clear every gem of the partner's color (or all, rainbow+rainbow)
      const rb = ga.kind === 'rainbow' ? ga : gb;
      const other = rb === ga ? gb : ga;
      const targetT = other.kind === 'rainbow' ? -1 : other.t;
      const preset = new Set();
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const g = grid[r][c];
          if (g === rb || g === other || targetT === -1 || (g.t === targetT && g.kind !== 'rainbow')) preset.add(r * N + c);
        }
      }
      await this.resolve(b, preset);
    } else if (findMatches(grid).length) {
      await this.resolve(b);
    } else {
      sfx.fail(); // PRD C-3
      swapCells(grid, a, b);
      await this.waitSettle();
    }
    this.busy = false;
    this.idleSince = performance.now();
  }

  async resolve(focus, preset = null) {
    const grid = this.grid;
    let combo = 0;
    for (;;) {
      const groups = preset ? [] : findMatches(grid);
      if (!groups.length && !preset) break;
      combo++;
      const clear = new Set(preset || []);
      preset = null;

      // Special gem creation (PRD S-1 / S-2); squares never create one.
      const creates = [];
      for (const g of groups) {
        g.forEach(([r, c]) => clear.add(r * N + c));
        if (g.length >= 4 && !g.square) {
          const pos = g.find(([r, c]) => focus && r === focus[0] && c === focus[1]) || g[Math.floor(g.length / 2)];
          if (!creates.some((cr) => cr.r === pos[0] && cr.c === pos[1])) {
            creates.push({ r: pos[0], c: pos[1], t: grid[g[0][0]][g[0][1]].t, kind: g.length >= 5 ? 'rainbow' : 'bomb' });
          }
        }
      }

      // Chain specials caught in the clear set.
      const queue = [...clear];
      const done = new Set();
      const add = (k) => { if (!clear.has(k)) { clear.add(k); queue.push(k); } };
      while (queue.length) {
        const k = queue.pop();
        if (done.has(k)) continue;
        done.add(k);
        const r = Math.floor(k / N), c = k % N, g = grid[r][c];
        if (g.kind === 'bomb') {
          sfx.bomb();
          for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (inBounds(r + dr, c + dc)) add((r + dr) * N + c + dc);
        } else if (g.kind === 'rainbow') {
          const tt = randType();
          for (let rr = 0; rr < N; rr++) for (let cc = 0; cc < N; cc++) if (grid[rr][cc].t === tt) add(rr * N + cc);
        }
      }
      for (const cr of creates) clear.delete(cr.r * N + cr.c);

      // Scoring (PRD P-1, P-2)
      this.score += clear.size * 10 * combo + creates.length * 50;
      sfx.combo(combo);
      if (combo >= 2) this.onMessage(combo >= 4 ? `굉장해요! x${combo}` : `콤보 x${combo}`);

      // Clear animation + particles (PRD M-3)
      for (const k of clear) {
        const r = Math.floor(k / N), c = k % N, g = grid[r][c];
        g.dying = true;
        for (let i = 0; i < 6; i++) {
          this.particles.push({
            x: c + 0.5, y: r + 0.5,
            vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.7) * 0.18,
            life: 1, col: COLORS[g.t][0],
          });
        }
      }
      for (const cr of creates) {
        const g = grid[cr.r][cr.c];
        g.t = cr.t; g.kind = cr.kind; g.s = 1.4;
      }
      await sleep(230);
      for (const k of clear) grid[Math.floor(k / N)][k % N] = null;

      // Gravity + refill (PRD M-4)
      for (let c = 0; c < N; c++) {
        let w = N - 1;
        for (let r = N - 1; r >= 0; r--) {
          if (grid[r][c]) { const g = grid[r][c]; grid[r][c] = null; grid[w][c] = g; w--; }
        }
        let spawn = -1;
        for (let r = w; r >= 0; r--) grid[r][c] = makeGem(randType(), spawn--, c);
      }
      this.emitHud();
      await this.waitSettle();
      focus = null;
    }

    // Level up (PRD P-4)
    while (this.score - this.levelBase >= levelGoal(this.level)) {
      this.levelBase += levelGoal(this.level);
      this.level++;
      this.onMessage(`레벨 ${this.level}!`);
      sfx.levelUp();
      this.emitHud();
    }

    // No moves → shuffle (PRD H-3)
    if (!findMove(grid)) {
      this.onMessage('섞는 중…');
      await sleep(700);
      shuffleBoard(grid);
      await this.waitSettle();
    }
  }
}
