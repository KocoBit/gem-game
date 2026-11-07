import { useCallback, useEffect, useRef, useState } from 'react';
import { GemEngine } from '../game/engine.js';
import { setSoundEnabled } from '../game/sound.js';

/** Creates one GemEngine for the component's lifetime and exposes HUD state + actions. */
export function useGemGame() {
  const [hud, setHud] = useState({ score: 0, level: 1, progress: 0 });
  const [message, setMessage] = useState({ text: '', id: 0 });
  const [soundOn, setSoundOn] = useState(true);
  const engineRef = useRef(null);

  if (!engineRef.current) {
    engineRef.current = new GemEngine({
      onHud: (h) => setHud(h),
      onMessage: (text) => setMessage((m) => ({ text, id: m.id + 1 })),
    });
  }

  useEffect(() => { setSoundEnabled(soundOn); }, [soundOn]);

  // Dev-only handle for debugging in the browser console.
  useEffect(() => {
    if (import.meta.env.DEV) window.__game = engineRef.current;
  }, []);

  const hint = useCallback(() => engineRef.current.showHint(), []);
  const newGame = useCallback(() => { if (!engineRef.current.busy) engineRef.current.start(); }, []);
  const toggleSound = useCallback(() => setSoundOn((s) => !s), []);

  return { engine: engineRef.current, hud, message, soundOn, hint, newGame, toggleSound };
}
