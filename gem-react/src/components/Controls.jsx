export default function Controls({ onHint, onToggleSound, soundOn, onNewGame }) {
  return (
    <div className="controls">
      <button type="button" onClick={onHint}>💡 힌트</button>
      <button type="button" onClick={onToggleSound}>{soundOn ? '🔊' : '🔇'} 소리</button>
      <button type="button" onClick={onNewGame}>🔄 새 게임</button>
    </div>
  );
}
