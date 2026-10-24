import { request } from "./client";
import type { Scoreboard } from "./types";

export const getScoreboard = (signal?: AbortSignal) =>
  request<Scoreboard>("/scoreboard", { signal });

export const resetScoreboard = (signal?: AbortSignal) =>
  request<Scoreboard>("/scoreboard/reset", { method: "POST", signal });
