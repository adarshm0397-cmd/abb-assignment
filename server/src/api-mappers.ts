import type { GameSession } from "./persistence/game-repository.js";

export const toGameResponse = (session: GameSession) => ({
  id: session.id,
  mode: session.mode,
  board: [...session.state.board],
  currentPlayer: session.state.currentPlayer,
  status: session.state.status,
  winner: session.state.winner,
  winningCells: session.state.winningCells.map((line) =>
    line.map((index) => ({
      row: Math.floor(index / 3) + 1,
      column: (index % 3) + 1,
    })),
  ),
  moveHistory: session.moveHistory.map((move, index) => ({
    moveNumber: index + 1,
    ...move,
  })),
  canUndo: session.state.status === "active" && session.moveHistory.length > 0,
});
