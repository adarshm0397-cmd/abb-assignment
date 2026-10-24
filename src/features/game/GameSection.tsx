import { AppStatus } from '../../components/AppStatus';
import { ActionButton } from '../../components/ActionButton';
import { GameBoard } from '../../components/GameBoard';
import { GameModeSelector } from '../../components/GameModeSelector';
import { GameStatus } from '../../components/GameStatus';

export function GameSection() {
  return (
    <section className="feature-card" aria-labelledby="game-heading">
      <h2 id="game-heading">Game</h2>
      <AppStatus kind="empty" message="No game selected yet." />
      <div className="game-controls">
        <GameModeSelector onChange={() => undefined} value="two-player" />
        <GameStatus>Waiting for a game to start.</GameStatus>
        <GameBoard board={[[null, null, null], [null, null, null], [null, null, null]]} onCellSelect={() => undefined} />
        <div className="game-actions">
          <ActionButton disabled>Undo</ActionButton>
          <ActionButton disabled>Reset</ActionButton>
        </div>
      </div>
    </section>
  );
}
