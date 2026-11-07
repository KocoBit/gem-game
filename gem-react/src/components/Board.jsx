import { useEffect, useRef } from 'react';
import { N } from '../game/constants.js';
import { buildSprites, drawFrame } from '../game/renderer.js';
import Message from './Message.jsx';

/** Canvas board: runs the animation loop and turns pointer input into engine calls. */
export default function Board({ engine, message }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const view = useRef({ cell: 0, dpr: 1, sprites: [] });
  const down = useRef(null);

  // Size the canvas to its container and rebuild sprites on resize.
  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      const w = wrapRef.current.clientWidth - 12;
      const cell = Math.max(24, Math.floor(w / N));
      const dpr = window.devicePixelRatio || 1;
      if (cell === view.current.cell && dpr === view.current.dpr) return;
      canvas.width = canvas.height = cell * N * dpr;
      canvas.style.height = `${cell * N}px`;
      view.current = { cell, dpr, sprites: buildSprites(cell * dpr) };
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrapRef.current);
    window.addEventListener('resize', resize);
    return () => { ro.disconnect(); window.removeEventListener('resize', resize); };
  }, []);

  // Animation loop.
  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    let raf;
    const frame = (now) => {
      const { cell, dpr, sprites } = view.current;
      engine.update(now);
      if (cell) drawFrame(ctx, engine, sprites, cell * dpr, dpr, now);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [engine]);

  const cellAt = (e) => {
    const rc = canvasRef.current.getBoundingClientRect();
    const c = Math.floor(((e.clientX - rc.left) / rc.width) * N);
    const r = Math.floor(((e.clientY - rc.top) / rc.height) * N);
    return r >= 0 && r < N && c >= 0 && c < N ? [r, c] : null;
  };

  const onPointerDown = (e) => {
    if (engine.busy) return;
    const p = cellAt(e);
    if (!p) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const swapped = engine.tap(p);
    down.current = { p, x: e.clientX, y: e.clientY, used: swapped };
  };

  const onPointerMove = (e) => {
    const d = down.current;
    if (!d || d.used || engine.busy) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    const th = (canvasRef.current.getBoundingClientRect().width / N) * 0.35; // PRD C-2
    if (Math.max(Math.abs(dx), Math.abs(dy)) < th) return;
    d.used = true;
    engine.sel = null;
    if (Math.abs(dx) > Math.abs(dy)) engine.drag(d.p, 0, Math.sign(dx));
    else engine.drag(d.p, Math.sign(dy), 0);
  };

  const onPointerUp = () => { down.current = null; };

  return (
    <div className="board-wrap" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      <Message message={message} />
    </div>
  );
}
