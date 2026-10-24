import { useEffect, useRef } from "react";
import { ApiError } from "../../api/client";
import {
  createGame,
  getGame,
  resetGame,
  submitMove,
  undoGame,
} from "../../api/games";
import type { GameResponse, Mode, Player } from "../../api/types";
import {
  setError as setGameError,
  setGame,
  setGameId,
  setLoading,
  setMode,
  setPendingMove,
  setPendingUndo,
  setUndoMessage,
} from "../../store/gameSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";

const errorMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : "Something went wrong. Please try again.";

interface UseGameOptions {
  onGameCompleted?: () => void;
}

export const useGame = ({ onGameCompleted }: UseGameOptions = {}) => {
  const dispatch = useAppDispatch();
  const {
    mode,
    gameId,
    game,
    loading,
    pendingMove,
    pendingUndo,
    error,
    undoMessage,
  } = useAppSelector((state) => state.game);
  const requestNumber = useRef(0);
  const sessionNumber = useRef(0);
  const mounted = useRef(true);
  const activeController = useRef<AbortController | null>(null);

  const updateGameId = (value: string) => dispatch(setGameId(value));
  const updateMode = (value: Mode) => dispatch(setMode(value));
  const updateGame = (value: GameResponse | null) => dispatch(setGame(value));
  const updateLoading = (value: boolean) => dispatch(setLoading(value));
  const updatePendingMove = (value: boolean) => dispatch(setPendingMove(value));
  const updatePendingUndo = (value: boolean) => dispatch(setPendingUndo(value));
  const updateError = (value: string | null) => dispatch(setGameError(value));
  const updateUndoMessage = (value: string | null) => dispatch(setUndoMessage(value));

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
      activeController.current?.abort();
      activeController.current = null;
      requestNumber.current += 1;
      sessionNumber.current += 1;
    };
  }, []);

  const startRequest = () => {
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    const request = ++requestNumber.current;
    return {
      request,
      session: sessionNumber.current,
      signal: controller.signal,
    };
  };

  const isCurrent = (request: number, session: number, id?: string) =>
    mounted.current &&
    request === requestNumber.current &&
    session === sessionNumber.current &&
    (id === undefined || game?.id === id);

  const finishRequest = (request: number) => {
    if (request !== requestNumber.current) return;
    activeController.current = null;
  };

  const create = async (selectedMode: Mode = mode) => {
    const session = ++sessionNumber.current;
    const { request, signal } = startRequest();
    updatePendingMove(false);
    updatePendingUndo(false);
    updateLoading(true);
    updateError(null);
    updateUndoMessage(null);

    try {
      const nextGame = await createGame({ mode: selectedMode }, signal);
      if (
        request === requestNumber.current &&
        session === sessionNumber.current
      ) {
        updateGame(nextGame);
        updateGameId(nextGame.id);
        if (nextGame.status === "won" || nextGame.status === "draw")
          onGameCompleted?.();
      }
    } catch (cause) {
      if (
        request === requestNumber.current &&
        session === sessionNumber.current
      ) {
        updateError(errorMessage(cause));
      }
    } finally {
      if (
        request === requestNumber.current &&
        session === sessionNumber.current
      ) {
        updateLoading(false);
      }
      finishRequest(request);
    }
  };

  const load = async () => {
    const id = gameId.trim();
    if (!id) {
      updateError("Enter a game ID to load.");
      return;
    }

    const session = ++sessionNumber.current;
    const { request, signal } = startRequest();
    updatePendingMove(false);
    updatePendingUndo(false);
    updateLoading(true);
    updateError(null);
    updateUndoMessage(null);

    try {
      const loadedGame = await getGame(id, signal);
      if (
        request === requestNumber.current &&
        session === sessionNumber.current
      ) {
        updateGame(loadedGame);
      }
    } catch (cause) {
      if (
        request === requestNumber.current &&
        session === sessionNumber.current
      ) {
        updateError(errorMessage(cause));
      }
    } finally {
      if (
        request === requestNumber.current &&
        session === sessionNumber.current
      ) {
        updateLoading(false);
      }
      finishRequest(request);
    }
  };

  const reset = async () => {
    if (!game) return;

    const previousId = game.id;
    const { request, session, signal } = startRequest();
    updatePendingMove(false);
    updatePendingUndo(false);
    updateLoading(true);
    updateError(null);
    updateUndoMessage(null);

    try {
      const result = await resetGame(previousId, signal);
      if (isCurrent(request, session, previousId)) {
        updateGame(result.game);
        updateGameId(result.game.id);
      }
    } catch (cause) {
      if (isCurrent(request, session, previousId))
        updateError(errorMessage(cause));
    } finally {
      if (isCurrent(request, session, previousId)) updateLoading(false);
      finishRequest(request);
    }
  };

  const move = async (row: number, column: number) => {
    if (
      !game ||
      game.status !== "active" ||
      pendingMove ||
      pendingUndo ||
      game.currentPlayer === null ||
      (game.mode === "computer" && game.currentPlayer !== "X")
    ) {
      return;
    }

    const player: Player = game.currentPlayer;
    const id = game.id;
    const { request, session, signal } = startRequest();
    updatePendingMove(true);
    updateError(null);
    updateUndoMessage(null);

    try {
      const nextGame = await submitMove(
        id,
        {
          row,
          column,
          player,
          requestId: `${id}-${request}`,
        },
        signal,
      );
      if (isCurrent(request, session, id)) {
        updateGame(nextGame);
        if (nextGame.status === "won" || nextGame.status === "draw")
          onGameCompleted?.();
      }
    } catch (cause) {
      if (isCurrent(request, session, id)) updateError(errorMessage(cause));
    } finally {
      if (isCurrent(request, session, id)) updatePendingMove(false);
      finishRequest(request);
    }
  };

  const undo = async () => {
    if (!game || !game.canUndo || pendingUndo || pendingMove || loading) return;

    const id = game.id;
    const { request, session, signal } = startRequest();
    updatePendingUndo(true);
    updateError(null);
    updateUndoMessage(null);

    try {
      const nextGame = await undoGame(id, signal);
      if (isCurrent(request, session, id)) {
        updateGame(nextGame);
        updateUndoMessage("Move undone.");
      }
    } catch (cause) {
      if (isCurrent(request, session, id)) updateError(errorMessage(cause));
    } finally {
      if (isCurrent(request, session, id)) updatePendingUndo(false);
      finishRequest(request);
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
    setGameId: updateGameId,
    setMode: updateMode,
    undo,
    undoMessage,
  };
};
