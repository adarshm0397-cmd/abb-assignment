import './App.css';
import { useState } from 'react';
import { GameSection } from './features/game/GameSection';
import { ScoreboardSection } from './features/scoreboard/ScoreboardSection';

function App() {
  const [scoreboardRefresh, setScoreboardRefresh] = useState(0);

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">Frontend foundation</p>
        <h1>ABB Tic Tac Toe</h1>
        <p>Play games and track the shared scoreboard.</p>
      </header>
      <div className="feature-grid">
        <GameSection onGameCompleted={() => setScoreboardRefresh((value) => value + 1)} />
        <ScoreboardSection refreshToken={scoreboardRefresh} />
      </div>
    </main>
  );
}

export default App;
