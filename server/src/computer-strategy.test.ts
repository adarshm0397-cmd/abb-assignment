import { describe, expect, it } from "vitest";
import { chooseComputerMove } from "./computer-strategy.js";
import type { Board } from "./game-engine.js";

const board = (cells: Array<"X" | "O" | null>): Board => cells as unknown as Board;
const selected = (cells: Array<"X" | "O" | null>) =>
  chooseComputerMove(board(cells));

describe("computer strategy", () => {
  it("takes an available winning move before all other priorities", () => {
    expect(selected(["O", "O", null, "X", "X", null, null, null, null])).toEqual({
      player: "O",
      row: 1,
      column: 3,
    });
  });

  it("blocks X's immediate winning move", () => {
    expect(selected(["X", "X", null, "O", null, null, null, null, null])).toEqual({
      player: "O",
      row: 1,
      column: 3,
    });
  });

  it("takes the center when no win or block is available", () => {
    expect(selected(["X", null, null, null, null, null, null, null, "O"])).toEqual({
      player: "O",
      row: 2,
      column: 2,
    });
  });

  it("takes the first available corner when center is occupied", () => {
    expect(selected(["X", "O", null, "O", "X", "X", null, null, "O"])).toEqual({
      player: "O", row: 1, column: 3,
    });
  });

  it("takes the first remaining cell when no higher priority applies", () => {
    expect(selected(["X", null, "O", "O", "X", "X", "X", "X", "O"])).toEqual({
      player: "O",
      row: 1,
      column: 2,
    });
  });

  it("uses row-major tie-breaking for multiple winning moves", () => {
    const cells = ["O", "O", null, "O", null, null, null, null, null] as Array<"X" | "O" | null>;
    expect(selected(cells)).toEqual({ player: "O", row: 1, column: 3 });
    expect(selected(cells)).toEqual({ player: "O", row: 1, column: 3 });
  });

  it("never selects an occupied cell", () => {
    const cells: Array<"X" | "O" | null> = ["X", "O", "X", "O", "X", "O", null, null, null];
    const move = selected(cells);
    expect(move).not.toBeNull();
    expect(cells[(move!.row - 1) * 3 + move!.column - 1]).toBeNull();
  });

  it.each([
    ["X", "X", "X", "O", "O", null, null, null, null],
    ["X", "O", "X", "O", "X", "O", "O", "X", "X"],
  ] as Array<Array<"X" | "O" | null>>)("does not move after a terminal board", (...cells) => {
    expect(selected(cells)).toBeNull();
  });

  it("returns no move for a full board", () => {
    expect(selected(["X", "O", "X", "O", "X", "O", "O", "X", "X"])).toBeNull();
  });
});
