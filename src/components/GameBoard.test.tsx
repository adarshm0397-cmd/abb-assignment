import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GameBoard } from "./GameBoard";
import type { BoardState } from "./GameBoard";

const emptyBoard: BoardState = [
  [null, null, null],
  [null, null, null],
  [null, null, null],
];

describe("GameBoard", () => {
  it("renders exactly nine cells and labels their state", () => {
    render(
      <GameBoard
        board={[[null, "X", "O"], ...emptyBoard.slice(1)]}
        onCellSelect={() => undefined}
      />,
    );

    expect(screen.getAllByRole("button")).toHaveLength(9);
    expect(
      screen.getByRole("button", { name: "Row 1, Column 1, empty" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Row 1, Column 2, X" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Row 1, Column 3, O" }),
    ).toBeDisabled();
  });

  it("reports the selected row and column for an eligible cell", async () => {
    const onCellSelect = jest.fn();
    render(<GameBoard board={emptyBoard} onCellSelect={onCellSelect} />);

    userEvent.click(
      screen.getByRole("button", { name: "Row 2, Column 3, empty" }),
    );

    expect(onCellSelect).toHaveBeenCalledWith(1, 2);
  });

  it("does not select occupied or disabled cells", async () => {
    const onCellSelect = jest.fn();
    render(
      <GameBoard
        board={[[null, "X", null], ...emptyBoard.slice(1)]}
        isCellDisabled={(row, column) => row === 0 && column === 0}
        onCellSelect={onCellSelect}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Row 1, Column 1, empty" }),
    ).toBeDisabled();
    userEvent.click(screen.getByRole("button", { name: "Row 1, Column 2, X" }));
    expect(onCellSelect).not.toHaveBeenCalled();
  });

  it("supports keyboard selection and exposes visible focus styling", async () => {
    const onCellSelect = jest.fn();
    render(<GameBoard board={emptyBoard} onCellSelect={onCellSelect} />);
    const cell = screen.getByRole("button", { name: "Row 1, Column 1, empty" });

    userEvent.tab();
    expect(cell).toHaveFocus();
    userEvent.click(cell);
    expect(onCellSelect).toHaveBeenCalledWith(0, 0);
  });

  it("operates a focused cell with the keyboard", async () => {
    const onCellSelect = jest.fn();
    render(<GameBoard board={emptyBoard} onCellSelect={onCellSelect} />);

    await userEvent.tab();
    await userEvent.keyboard("{Enter}");

    expect(onCellSelect).toHaveBeenCalledWith(0, 0);
  });
});
