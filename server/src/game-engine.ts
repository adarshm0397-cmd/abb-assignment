export type Player = "X" | "O";
export type Cell = Player | null;
export type GameStatus = "active" | "won" | "draw" | "reset";

export type Board = readonly [
  Cell,
  Cell,
  Cell,
  Cell,
  Cell,
  Cell,
  Cell,
  Cell,
  Cell,
];

export type Move = {
  readonly player: Player;
  /** Public coordinates are one-based: rows and columns are 1, 2, or 3. */
  readonly row: number;
  readonly column: number;
};

export type GameState = {
  readonly board: Board;
  readonly currentPlayer: Player | null;
  readonly status: GameStatus;
  readonly winner: Player | null;
  readonly winningCells: readonly WinningCombination[];
};

export type MoveErrorCode =
  | "INVALID_COORDINATES"
  | "WRONG_TURN"
  | "CELL_OCCUPIED"
  | "GAME_COMPLETED";

export type MoveError = {
  readonly code: MoveErrorCode;
  readonly message: string;
};

export type MoveResult =
  | { readonly ok: true; readonly state: GameState }
  | { readonly ok: false; readonly error: MoveError };

export type WinningCombination = readonly [number, number, number];

/** The eight possible winning lines, expressed as zero-based board indexes. */
export const WINNING_COMBINATIONS: readonly WinningCombination[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const EMPTY_BOARD: Board = [
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
];

export const initializeGame = (): GameState => ({
  board: EMPTY_BOARD,
  currentPlayer: "X",
  status: "active",
  winner: null,
  winningCells: [],
});

const otherPlayer = (player: Player): Player => (player === "X" ? "O" : "X");

const isValidCoordinate = (value: number): boolean =>
  Number.isInteger(value) && value >= 1 && value <= 3;

const resultError = (code: MoveErrorCode, message: string): MoveResult => ({
  ok: false,
  error: { code, message },
});

export const makeMove = (state: GameState, move: Move): MoveResult => {
  if (state.status !== "active") {
    return resultError("GAME_COMPLETED", "The game is already complete.");
  }

  if (!isValidCoordinate(move.row) || !isValidCoordinate(move.column)) {
    return resultError(
      "INVALID_COORDINATES",
      "Row and column must be integers from 1 to 3.",
    );
  }

  if (move.player !== state.currentPlayer) {
    return resultError("WRONG_TURN", `It is ${state.currentPlayer}'s turn.`);
  }

  const index = (move.row - 1) * 3 + (move.column - 1);
  if (state.board[index] !== null) {
    return resultError("CELL_OCCUPIED", "That cell is already occupied.");
  }

  const board = [...state.board] as [...Board];
  board[index] = move.player;

  const winningCells = WINNING_COMBINATIONS.filter(
    ([first, second, third]) =>
      board[first] === move.player &&
      board[second] === move.player &&
      board[third] === move.player,
  );
  const hasWon = winningCells.length > 0;
  const isDraw = !hasWon && board.every((cell) => cell !== null);

  return {
    ok: true,
    state: {
      board,
      currentPlayer:
        hasWon || isDraw ? null : otherPlayer(state.currentPlayer as Player),
      status: hasWon ? "won" : isDraw ? "draw" : "active",
      winner: hasWon ? move.player : null,
      winningCells,
    },
  };
};
