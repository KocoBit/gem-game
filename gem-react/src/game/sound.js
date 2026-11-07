// Tiny Web Audio synth for effects (PRD 3.7). No audio files.
let actx = null;
let enabled = true;

export const setSoundEnabled = (on) => { enabled = on; };

export function tone(freq, dur = 0.12, type = 'sine', vol = 0.12) {
  if (!enabled) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
    o.connect(g).connect(actx.destination);
    o.start();
    o.stop(actx.currentTime + dur);
  } catch {
    /* audio unavailable */
  }
}

const COMBO_NOTES = [523, 587, 659, 784, 880, 988, 1047];

export const sfx = {
  select: () => tone(660, 0.04, 'sine', 0.05),
  swap: () => tone(420, 0.06, 'triangle', 0.08),
  fail: () => tone(180, 0.15, 'sawtooth', 0.05),
  bomb: () => tone(110, 0.3, 'square', 0.08),
  combo: (step) => tone(COMBO_NOTES[Math.min(step - 1, 6)], 0.18, 'sine', 0.12),
  levelUp: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'triangle', 0.1), i * 110)),
};
