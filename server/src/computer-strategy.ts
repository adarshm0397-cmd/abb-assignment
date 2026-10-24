import {
  WINNING_COMBINATIONS,
  type Board,
  type Move,
} from "./game-engine.js";

/**
 * Selects O's move using stable row-major ordering for all ties.
 * Corners are checked in the same order: top-left, top-right, bottom-left,
 * bottom-right. A terminal or full board has no computer move.
 */
export const chooseComputerMove = (board: Board): Move | null => {
  if (hasWinner(board) || board.every((cell) => cell !== null)) return null;

  const winningMove = findTacticalMove(board, "O");
  if (winningMove !== null) return winningMove;

  const blockingMove = findTacticalMove(board, "X");
  if (blockingMove !== null) return blockingMove;

  if (board[4] === null) return moveForIndex(4);

  for (const index of [0, 2, 6, 8])
    if (board[index] === null) return moveForIndex(index);

  const fallback = board.findIndex((cell) => cell === null);
  return fallback === -1 ? null : moveForIndex(fallback);
};

const findTacticalMove = (board: Board, player: "X" | "O"): Move | null => {
  for (let index = 0; index < board.length; index += 1) {
    if (board[index] !== null) continue;
    const candidate = [...board] as [...Board];
    candidate[index] = player;
    if (hasWinner(candidate, player)) return moveForIndex(index);
  }
  return null;
};

const hasWinner = (board: Board, player?: "X" | "O"): boolean =>
  WINNING_COMBINATIONS.some(([first, second, third]) => {
    const value = board[first];
    return (
      value !== null &&
      (player === undefined || value === player) &&
      board[second] === value &&
      board[third] === value
    );
  });

const moveForIndex = (index: number): Move => ({
  player: "O",
  row: Math.floor(index / 3) + 1,
  column: (index % 3) + 1,
});
