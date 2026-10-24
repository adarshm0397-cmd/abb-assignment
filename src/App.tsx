import './App.css';
import { GameSection } from './features/game/GameSection';
import { ScoreboardSection } from './features/scoreboard/ScoreboardSection';

function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">Frontend foundation</p>
        <h1>ABB Tic Tac Toe</h1>
        <p>Game and scoreboard features will be added in the next phase.</p>
      </header>
      <div className="feature-grid">
        <GameSection />
        <ScoreboardSection />
      </div>
    </main>
  );
}

export default App;
