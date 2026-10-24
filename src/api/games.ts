import { request } from './client';
import type { CreateGameRequest, GameResponse, MoveRequest, ResetGameResponse } from './types';

export const createGame = (body: CreateGameRequest) =>
  request<GameResponse>('/games', { method: 'POST', body: JSON.stringify(body) });

export const getGame = (gameId: string) => request<GameResponse>(`/games/${encodeURIComponent(gameId)}`);

export const submitMove = (gameId: string, body: MoveRequest) =>
  request<GameResponse>(`/games/${encodeURIComponent(gameId)}/moves`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const undoGame = (gameId: string) =>
  request<GameResponse>(`/games/${encodeURIComponent(gameId)}/undo`, { method: 'POST' });

export const resetGame = (gameId: string) =>
  request<ResetGameResponse>(`/games/${encodeURIComponent(gameId)}/reset`, { method: 'POST' });
