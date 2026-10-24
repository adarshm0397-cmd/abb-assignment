import { request } from './client';
import type { Scoreboard } from './types';

export const getScoreboard = () => request<Scoreboard>('/scoreboard');

export const resetScoreboard = () =>
  request<Scoreboard>('/scoreboard/reset', { method: 'POST' });
