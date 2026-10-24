import { useRef, useState } from 'react';
import { ApiError } from '../../api/client';
import { createGame, getGame, resetGame, submitMove, undoGame } from '../../api/games';
import type { GameResponse, Mode, Player } from '../../api/types';

const errorMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';

interface UseGameOptions {
  onGameCompleted?: () => void;
}

export function useGame({ onGameCompleted }: UseGameOptions = {}) {
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
        if (nextGame.status === 'won' || nextGame.status === 'draw') onGameCompleted?.();
      }
    } catch (cause) {
      if (request === requestNumber.current && session === sessionNumber.current) {
        setError(errorMessage(cause));
      }
    } finally {
      if (request === requestNumber.current && session === sessionNumber.current) {
        setLoading(false);
      }
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
      if (request === requestNumber.current && session === sessionNumber.current) {
        setGame(loadedGame);
      }
    } catch (cause) {
      if (request === requestNumber.current && session === sessionNumber.current) {
        setError(errorMessage(cause));
      }
    } finally {
      if (request === requestNumber.current && session === sessionNumber.current) {
        setLoading(false);
      }
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
    ) {
      return;
    }

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
      if (isCurrent(request, session, id)) {
        setGame(nextGame);
        if (nextGame.status === 'won' || nextGame.status === 'draw') onGameCompleted?.();
      }
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

  return {
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
  };
}
