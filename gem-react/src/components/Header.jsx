export default function Header({ level, score }) {
  return (
    <header>
      <h1>💎 보석 반짝</h1>
      <div className="stats">
        <div>레벨<b>{level}</b></div>
        <div>점수<b>{score}</b></div>
      </div>
    </header>
  );
}
