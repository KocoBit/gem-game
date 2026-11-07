import Header from './components/Header.jsx';
import Board from './components/Board.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import Controls from './components/Controls.jsx';
import { useGemGame } from './hooks/useGemGame.js';

export default function App() {
  const { engine, hud, message, soundOn, hint, newGame, toggleSound } = useGemGame();

  return (
    <div className="app">
      <Header level={hud.level} score={hud.score} />
      <Board engine={engine} message={message} />
      <ProgressBar value={hud.progress} />
      <Controls onHint={hint} onToggleSound={toggleSound} soundOn={soundOn} onNewGame={newGame} />
      <p className="help">
        같은 보석 3개 이상을 가로·세로로 맞추거나, 2×2 사각형으로 모으세요. 클릭 또는 드래그로 이웃한 보석과 자리를 바꿉니다.
        <br />
        4개를 맞추면 <b>폭탄 보석</b>(주변 3×3 제거), 5개를 맞추면 <b>무지개 보석</b>(같은 색 전부 제거)이 생겨요.
      </p>
    </div>
  );
}
