import { AppStatus } from '../../components/AppStatus';
import { useGame } from './useGame';
import type { GameResponse, Mode } from '../../api/types';

const statusMessage = (game: GameResponse) => {
  if (game.status === 'won') return `${game.winner} wins!`;
  if (game.status === 'draw') return 'It is a draw.';
  if (game.status === 'reset') return 'This game has been reset.';
  return `It is ${game.currentPlayer}'s turn.`;
};

const isWinningCell = (game: GameResponse, index: number) =>
  game.winningCells.some((line) =>
    line.some(({ row, column }) => (row - 1) * 3 + column - 1 === index),
  );

export const GameSection = ({
  onGameCompleted,
}: {
  onGameCompleted?: () => void;
}) => {
  const {
    create,
    error,
    game,
    gameId,
    load,
    loading,
    mode,
    move,
    pendingMove,
    pendingUndo,
    reset,
    setGameId,
    setMode,
    undo,
    undoMessage,
  } = useGame({ onGameCompleted });

  return (
    <section
      aria-busy={loading || pendingMove || pendingUndo}
      aria-labelledby="game-heading"
      className="feature-card"
    >
      <h2 id="game-heading">Game</h2>
      <div className="game-controls">
        <label>
          Game mode
          <select
            value={mode}
            onChange={(event) => {
              const nextMode = event.target.value as Mode;
              setMode(nextMode);
              void create(nextMode);
            }}
            disabled={loading || pendingMove}
          >
            <option value="two-player">Two players</option>
            <option value="computer">Play computer</option>
          </select>
        </label>
        <button type="button" onClick={() => void create()} disabled={loading || pendingMove || pendingUndo}>New game</button>
        <label>
          Existing game ID
          <input value={gameId} onChange={(event) => setGameId(event.target.value)} placeholder="Paste game ID" />
        </label>
        <button type="button" onClick={() => void load()} disabled={!gameId.trim() || pendingMove || pendingUndo}>Load game</button>
      </div>
      {loading && <AppStatus kind="loading" message="Loading game…" />}
      {error && <AppStatus kind="error" message={error} />}
      {!game && !loading && !error && <AppStatus kind="empty" message="No game selected yet." />}
      {game && (
        <div className="game-board-area">
          <div className="game-meta">
            <p
              aria-atomic="true"
              aria-live="polite"
              className={game.status === 'won' ? 'game-status game-status--winner' : 'game-status'}
              id="game-status"
              role="status"
            >
              {statusMessage(game)}
            </p>
            {game.mode === 'computer' && <p className="game-mode-indicator">Playing against the computer</p>}
            <span>Game ID: {game.id}</span>
            <div className="game-actions">
              <button type="button" onClick={() => void reset()} disabled={loading || pendingMove || pendingUndo}>Reset game</button>
              <button type="button" onClick={() => void undo()} disabled={!game.canUndo || loading || pendingMove || pendingUndo}>
                {pendingUndo ? 'Undoing…' : 'Undo'}
              </button>
            </div>
          </div>
          <div
            aria-colcount={3}
            aria-label="Tic tac toe board"
            aria-rowcount={3}
            className="game-board"
            role="grid"
          >
            {game.board.map((cell, index) => {
              const row = Math.floor(index / 3) + 1;
              const column = (index % 3) + 1;
              const winningCell = isWinningCell(game, index);

              return (
                <button
                  key={`${row}-${column}`}
                  type="button"
                  role="gridcell"
                  aria-colindex={column}
                  aria-label={`Row ${row}, column ${column}${cell ? `, ${cell}` : ''}${winningCell ? ', winning cell' : ''}`}
                  aria-rowindex={row}
                  className={winningCell ? 'game-cell game-cell--winner' : 'game-cell'}
                  onClick={() => void move(row, column)}
                  disabled={pendingMove || game.status !== 'active' || cell !== null || (game.mode === 'computer' && game.currentPlayer !== 'X')}
                >
                  {cell}
                </button>
              );
            })}
          </div>
          {pendingMove && <AppStatus kind="loading" message="Submitting move…" />}
          {pendingUndo && <AppStatus kind="loading" message="Undoing move…" />}
          {undoMessage && <p className="app-status app-status--success" role="status" aria-live="polite">{undoMessage}</p>}
          <section className="move-history" aria-labelledby="move-history-heading">
            <h3 id="move-history-heading">Move history</h3>
            {game.moveHistory.length === 0 ? (
              <p>No moves yet.</p>
            ) : (
              <ol>
                {game.moveHistory.map((move) => (
                  <li key={`${move.moveNumber}-${move.player}-${move.row}-${move.column}`}>
                    Move {move.moveNumber}: {move.player} — row {move.row}, column {move.column}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}
    </section>
  );
};
