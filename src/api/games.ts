import { request } from "./client";
import type {
  CreateGameRequest,
  GameResponse,
  MoveRequest,
  ResetGameResponse,
} from "./types";

export const createGame = (body: CreateGameRequest, signal?: AbortSignal) =>
  request<GameResponse>("/games", {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });

export const getGame = (gameId: string, signal?: AbortSignal) =>
  request<GameResponse>(`/games/${encodeURIComponent(gameId)}`, { signal });

export const submitMove = (
  gameId: string,
  body: MoveRequest,
  signal?: AbortSignal,
) =>
  request<GameResponse>(`/games/${encodeURIComponent(gameId)}/moves`, {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });

export const undoGame = (gameId: string, signal?: AbortSignal) =>
  request<GameResponse>(`/games/${encodeURIComponent(gameId)}/undo`, {
    method: "POST",
    signal,
  });

export const resetGame = (gameId: string, signal?: AbortSignal) =>
  request<ResetGameResponse>(`/games/${encodeURIComponent(gameId)}/reset`, {
    method: "POST",
    signal,
  });
