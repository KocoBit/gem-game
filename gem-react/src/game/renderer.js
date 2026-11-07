// Canvas drawing: gem sprites (pre-rendered) and the per-frame board draw.
import { N, T, COLORS } from './constants.js';

function shapePath(c, t, s) {
  const h = s / 2, r = s * 0.4;
  c.beginPath();
  switch (t) {
    case 0: c.arc(h, h, r, 0, Math.PI * 2); break;
    case 1:
      for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i + Math.PI / 6; c.lineTo(h + Math.cos(a) * r, h + Math.sin(a) * r); }
      break;
    case 2:
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2, rr = i % 2 ? r * 0.5 : r * 1.05;
        c.lineTo(h + Math.cos(a) * rr, h + Math.sin(a) * rr + s * 0.03);
      }
      break;
    case 3: {
      const w = r * 1.6, x = h - w / 2, y = h - w / 2, k = w * 0.2;
      c.moveTo(x + k, y); c.lineTo(x + w - k, y); c.lineTo(x + w, y + k); c.lineTo(x + w, y + w - k);
      c.lineTo(x + w - k, y + w); c.lineTo(x + k, y + w); c.lineTo(x, y + w - k); c.lineTo(x, y + k);
      break;
    }
    case 4: c.moveTo(h, h - r * 1.05); c.lineTo(h + r * 0.85, h); c.lineTo(h, h + r * 1.05); c.lineTo(h - r * 0.85, h); break;
    case 5: c.moveTo(h, h - r); c.lineTo(h + r, h + r * 0.75); c.lineTo(h - r, h + r * 0.75); break;
    case 6: {
      const y0 = h - r * 0.45;
      c.moveTo(h, h + r * 0.9);
      c.bezierCurveTo(h - r * 1.3, h, h - r * 0.9, y0 - r * 0.8, h, y0);
      c.bezierCurveTo(h + r * 0.9, y0 - r * 0.8, h + r * 1.3, h, h, h + r * 0.9);
      break;
    }
  }
  c.closePath();
}

function makeSprite(t, s) {
  const oc = document.createElement('canvas');
  oc.width = oc.height = s;
  const c = oc.getContext('2d');
  const [lt, dk] = COLORS[t];
  c.shadowColor = '#0009'; c.shadowBlur = s * 0.08; c.shadowOffsetY = s * 0.04;
  shapePath(c, t, s);
  const g = c.createRadialGradient(s * 0.38, s * 0.32, s * 0.03, s * 0.5, s * 0.5, s * 0.5);
  g.addColorStop(0, '#fff'); g.addColorStop(0.25, lt); g.addColorStop(1, dk);
  c.fillStyle = g; c.fill();
  c.shadowColor = 'transparent';
  c.lineWidth = s * 0.03; c.strokeStyle = '#ffffff66'; c.stroke();
  c.save(); shapePath(c, t, s); c.clip();
  c.fillStyle = '#ffffff40';
  c.beginPath(); c.ellipse(s * 0.4, s * 0.3, s * 0.2, s * 0.09, -0.5, 0, Math.PI * 2); c.fill();
  c.restore();
  return oc;
}

export function buildSprites(sizePx) {
  const s = Math.max(1, Math.round(sizePx));
  return Array.from({ length: T }, (_, t) => makeSprite(t, s));
}

function drawSpecial(ctx, g, x, y, s, now) {
  if (g.kind === 'bomb') {
    const pulse = 0.5 + 0.5 * Math.sin(now / 150);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(x, y, 0, x, y, s * 0.55);
    gr.addColorStop(0, `rgba(255,220,120,${0.35 + pulse * 0.4})`);
    gr.addColorStop(1, 'rgba(255,120,0,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, s * 0.55, 0, 7); ctx.fill();
    ctx.restore();
    return false;
  }
  if (g.kind === 'rainbow') {
    ctx.save(); ctx.translate(x, y); ctx.rotate(now / 400);
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = COLORS[i][0];
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.arc(0, 0, s * 0.38, (i / 7) * Math.PI * 2, ((i + 1) / 7) * Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, s * 0.13, 0, 7); ctx.fill();
    ctx.restore();
    return true;
  }
  return false;
}

/** Draws one frame. S = cell size in device pixels. */
export function drawFrame(ctx, engine, sprites, S, dpr, now) {
  const { grid, sel, hintCells, particles } = engine;
  ctx.clearRect(0, 0, S * N, S * N);

  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    ctx.fillStyle = (r + c) % 2 ? '#2e2259' : '#382a6b';
    ctx.fillRect(c * S, r * S, S, S);
  }
  if (sel) {
    ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 3 * dpr;
    ctx.strokeRect(sel[1] * S + 2 * dpr, sel[0] * S + 2 * dpr, S - 4 * dpr, S - 4 * dpr);
  }
  if (hintCells) {
    const a = 0.4 + 0.4 * Math.sin(now / 120);
    ctx.fillStyle = `rgba(255,255,255,${a * 0.35})`;
    hintCells.forEach(([r, c]) => ctx.fillRect(c * S, r * S, S, S));
  }

  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const g = grid[r][c];
    if (!g || g.y < -0.9) continue;
    const isHint = hintCells && hintCells.some(([hr, hc]) => hr === r && hc === c);
    const isSel = sel && sel[0] === r && sel[1] === c;
    const scale = g.s * (isSel ? 1 + 0.06 * Math.sin(now / 90) : 1) * (isHint ? 1.08 : 1);
    const cx = (g.x + 0.5) * S, cy = (g.y + 0.5) * S, sz = S * scale;
    ctx.globalAlpha = g.a;
    if (!drawSpecial(ctx, g, cx, cy, sz, now)) ctx.drawImage(sprites[g.t], cx - sz / 2, cy - sz / 2, sz, sz);
    if (g.kind === 'bomb') {
      ctx.fillStyle = '#fff'; ctx.font = `bold ${S * 0.28}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('✦', cx, cy + S * 0.02);
    }
    ctx.globalAlpha = 1;
  }

  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.col;
    ctx.beginPath(); ctx.arc(p.x * S, p.y * S, S * 0.06 * p.life + 1, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
