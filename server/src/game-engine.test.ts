import { describe, expect, it } from "vitest";
import {
  initializeGame,
  makeMove,
  WINNING_COMBINATIONS,
  type GameState,
  type Player,
} from "./game-engine.js";

const play = (moves: Array<[Player, number, number]>): GameState => {
  let state = initializeGame();
  for (const [player, row, column] of moves) {
    const result = makeMove(state, { player, row, column });
    expect(result.ok).toBe(true);
    if (result.ok) state = result.state;
  }
  return state;
};

describe("Tic Tac Toe game engine", () => {
  it("initializes an empty board with X to move", () => {
    expect(initializeGame()).toEqual({
      board: [null, null, null, null, null, null, null, null, null],
      currentPlayer: "X",
      status: "active",
      winner: null,
      winningCells: [],
    });
  });

  it("makes valid moves and switches turns", () => {
    const initial = initializeGame();
    const result = makeMove(initial, { player: "X", row: 1, column: 2 });

    expect(result).toEqual({
      ok: true,
      state: expect.objectContaining({
        board: [null, "X", null, null, null, null, null, null, null],
        currentPlayer: "O",
        status: "active",
      }),
    });
    expect(initial.board).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it.each([
    [0, 1],
    [4, 1],
    [1, 0],
    [1, 4],
    [1.5, 2],
  ])(
    "rejects invalid coordinates (%s, %s) without changing state",
    (row, column) => {
      const state = initializeGame();
      const result = makeMove(state, { player: "X", row, column });

      expect(result).toEqual({
        ok: false,
        error: { code: "INVALID_COORDINATES", message: expect.any(String) },
      });
      expect(state).toEqual(initializeGame());
    },
  );

  it("rejects wrong turns and occupied cells without changing state", () => {
    const state = play([["X", 1, 1]]);
    expect(makeMove(state, { player: "X", row: 2, column: 2 })).toMatchObject({
      ok: false,
      error: { code: "WRONG_TURN" },
    });
    expect(makeMove(state, { player: "O", row: 1, column: 1 })).toMatchObject({
      ok: false,
      error: { code: "CELL_OCCUPIED" },
    });
    expect(state.board).toEqual([
      "X",
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it.each(WINNING_COMBINATIONS)(
    "detects a win for line %s",
    (first, second, third) => {
      const line = [first, second, third] as const;
      const coordinates = [first, second, third].map(
        (index) => [Math.floor(index / 3) + 1, (index % 3) + 1] as const,
      );
      const fillers = Array.from({ length: 9 }, (_, index) => index).filter(
        (index) => !line.includes(index),
      );
      const moves: Array<[Player, number, number]> = [];
      coordinates.forEach(([row, column], index) => {
        moves.push(["X", row, column]);
        if (index < coordinates.length - 1) {
          const filler = fillers[index];
          moves.push(["O", Math.floor(filler / 3) + 1, (filler % 3) + 1]);
        }
      });
      const state = play(moves);

      expect(state.status).toBe("won");
      expect(state.winner).toBe("X");
      expect(state.winningCells).toContainEqual([first, second, third]);
    },
  );

  it("detects a draw only after checking that the final move did not win", () => {
    const state = play([
      ["X", 1, 1],
      ["O", 1, 2],
      ["X", 1, 3],
      ["O", 2, 2],
      ["X", 2, 1],
      ["O", 2, 3],
      ["X", 3, 2],
      ["O", 3, 1],
      ["X", 3, 3],
    ]);
    expect(state.status).toBe("draw");
    expect(state.winner).toBeNull();
    expect(state.winningCells).toEqual([]);
  });

  it("rejects moves after a win or draw", () => {
    const won = play([
      ["X", 1, 1],
      ["O", 2, 1],
      ["X", 1, 2],
      ["O", 2, 2],
      ["X", 1, 3],
    ]);
    const wonResult = makeMove(won, { player: "O", row: 3, column: 3 });
    expect(wonResult).toMatchObject({
      ok: false,
      error: { code: "GAME_COMPLETED" },
    });

    const drawn = play([
      ["X", 1, 1],
      ["O", 1, 2],
      ["X", 1, 3],
      ["O", 2, 1],
      ["X", 2, 2],
      ["O", 2, 3],
      ["X", 3, 2],
      ["O", 3, 1],
      ["X", 3, 3],
    ]);
    expect(makeMove(drawn, { player: "O", row: 1, column: 1 })).toMatchObject({
      ok: false,
      error: { code: "GAME_COMPLETED" },
    });
  });
});
