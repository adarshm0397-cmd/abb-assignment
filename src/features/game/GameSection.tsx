import { useRef, useState } from 'react';
import { AppStatus } from '../../components/AppStatus';
import { ApiError } from '../../api/client';
import { createGame, getGame, resetGame, submitMove, undoGame } from '../../api/games';
import type { GameResponse, Mode, Player } from '../../api/types';

const errorMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';

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

export function GameSection() {
  const [mode, setMode] = useState<Mode>('two-player');
  const [gameId, setGameId] = useState('');
  const [game, setGame] = useState<GameResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingMove, setPendingMove] = useState(false);
  const [pendingUndo, setPendingUndo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undoMessage, setUndoMessage] = useState<string | null>(null);
  const requestNumber = useRef(0);
  const sessionNumber = useRef(0);

  const startRequest = () => {
    const request = ++requestNumber.current;
    return { request, session: sessionNumber.current };
  };

  const isCurrent = (request: number, session: number, id?: string) =>
    request === requestNumber.current &&
    session === sessionNumber.current &&
    (id === undefined || game?.id === id);

  const create = async () => {
    const session = ++sessionNumber.current;
    const request = ++requestNumber.current;
    setPendingMove(false);
    setPendingUndo(false);
    setLoading(true);
    setError(null);
    setUndoMessage(null);
    try {
      const nextGame = await createGame({ mode });
      if (request === requestNumber.current && session === sessionNumber.current) {
        setGame(nextGame);
        setGameId(nextGame.id);
      }
    } catch (cause) {
      if (request === requestNumber.current && session === sessionNumber.current) setError(errorMessage(cause));
    } finally {
      if (request === requestNumber.current && session === sessionNumber.current) setLoading(false);
    }
  };

  const load = async () => {
    const id = gameId.trim();
    if (!id) {
      setError('Enter a game ID to load.');
      return;
    }
    const session = ++sessionNumber.current;
    const request = ++requestNumber.current;
    setPendingMove(false);
    setPendingUndo(false);
    setLoading(true);
    setError(null);
    setUndoMessage(null);
    try {
      const loadedGame = await getGame(id);
      if (request === requestNumber.current && session === sessionNumber.current) setGame(loadedGame);
    } catch (cause) {
      if (request === requestNumber.current && session === sessionNumber.current) setError(errorMessage(cause));
    } finally {
      if (request === requestNumber.current && session === sessionNumber.current) setLoading(false);
    }
  };

  const reset = async () => {
    if (!game) return;
    const previousId = game.id;
    const { request, session } = startRequest();
    setPendingMove(false);
    setPendingUndo(false);
    setLoading(true);
    setError(null);
    setUndoMessage(null);
    try {
      const result = await resetGame(previousId);
      if (isCurrent(request, session, previousId)) {
        setGame(result.game);
        setGameId(result.game.id);
      }
    } catch (cause) {
      if (isCurrent(request, session, previousId)) setError(errorMessage(cause));
    } finally {
      if (isCurrent(request, session, previousId)) setLoading(false);
    }
  };

  const move = async (row: number, column: number) => {
    if (
      !game ||
      game.status !== 'active' ||
      pendingMove ||
      pendingUndo ||
      game.currentPlayer === null ||
      (game.mode === 'computer' && game.currentPlayer !== 'X')
    ) return;
    const player: Player = game.currentPlayer;
    const id = game.id;
    const { request, session } = startRequest();
    setPendingMove(true);
    setError(null);
    setUndoMessage(null);
    try {
      const nextGame = await submitMove(id, {
        row,
        column,
        player,
        requestId: `${id}-${request}`,
      });
      if (isCurrent(request, session, id)) setGame(nextGame);
    } catch (cause) {
      if (isCurrent(request, session, id)) setError(errorMessage(cause));
    } finally {
      if (isCurrent(request, session, id)) setPendingMove(false);
    }
  };

  const undo = async () => {
    if (!game || !game.canUndo || pendingUndo || pendingMove || loading) return;
    const id = game.id;
    const { request, session } = startRequest();
    setPendingUndo(true);
    setError(null);
    setUndoMessage(null);
    try {
      const nextGame = await undoGame(id);
      if (isCurrent(request, session, id)) {
        setGame(nextGame);
        setUndoMessage('Move undone.');
      }
    } catch (cause) {
      if (isCurrent(request, session, id)) setError(errorMessage(cause));
    } finally {
      if (isCurrent(request, session, id)) setPendingUndo(false);
    }
  };

  return (
    <section className="feature-card" aria-labelledby="game-heading">
      <h2 id="game-heading">Game</h2>
      <div className="game-controls">
        <label>
          Game mode
          <select value={mode} onChange={(event) => setMode(event.target.value as Mode)} disabled={loading || pendingMove}>
            <option value="two-player">Two players</option>
            <option value="computer">Play computer</option>
          </select>
        </label>
        <button type="button" onClick={create}>New game</button>
        <label>
          Existing game ID
          <input value={gameId} onChange={(event) => setGameId(event.target.value)} placeholder="Paste game ID" />
        </label>
        <button type="button" onClick={load} disabled={!gameId.trim()}>Load game</button>
      </div>
      {loading && <AppStatus kind="loading" message="Loading game…" />}
      {error && <AppStatus kind="error" message={error} />}
      {!game && !loading && !error && <AppStatus kind="empty" message="No game selected yet." />}
      {game && (
        <div className="game-board-area">
          <div className="game-meta">
            <p role="status">{statusMessage(game)}</p>
            {game.mode === 'computer' && <p className="game-mode-indicator">Playing against the computer</p>}
            <span>Game ID: {game.id}</span>
            <div className="game-actions">
              <button type="button" onClick={reset} disabled={loading || pendingUndo}>Reset game</button>
              <button type="button" onClick={() => void undo()} disabled={!game.canUndo || loading || pendingMove || pendingUndo}>
                {pendingUndo ? 'Undoing…' : 'Undo'}
              </button>
            </div>
          </div>
          <div className="game-board" role="grid" aria-label="Tic tac toe board">
            {game.board.map((cell, index) => {
              const row = Math.floor(index / 3) + 1;
              const column = (index % 3) + 1;
              return (
                <button
                  key={`${row}-${column}`}
                  type="button"
                  role="gridcell"
                  aria-label={`Row ${row}, column ${column}${cell ? `, ${cell}` : ''}`}
                  className={isWinningCell(game, index) ? 'game-cell game-cell--winner' : 'game-cell'}
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
}
