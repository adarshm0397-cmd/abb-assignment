import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createGame,
  getGame,
  resetGame,
  submitMove,
  undoGame,
} from "../../api/games";
import type { GameResponse } from "../../api/types";
import { GameSection } from "./GameSection";

jest.mock("../../api/games");

const mockedCreateGame = createGame as jest.MockedFunction<typeof createGame>;
const mockedGetGame = getGame as jest.MockedFunction<typeof getGame>;
const mockedResetGame = resetGame as jest.MockedFunction<typeof resetGame>;
const mockedSubmitMove = submitMove as jest.MockedFunction<typeof submitMove>;
const mockedUndoGame = undoGame as jest.MockedFunction<typeof undoGame>;

const game = (overrides: Partial<GameResponse> = {}): GameResponse => ({
  id: "game-1",
  mode: "two-player",
  board: [null, null, null, null, null, null, null, null, null],
  currentPlayer: "X",
  status: "active",
  winner: null,
  winningCells: [],
  moveHistory: [],
  canUndo: false,
  ...overrides,
});

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

describe("GameSection", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates a selected game mode and loads an existing session", async () => {
    const created = game({ id: "computer-game", mode: "computer" });
    mockedCreateGame.mockResolvedValue(created);
    mockedGetGame.mockResolvedValue(game({ id: "loaded-game" }));
    render(<GameSection />);

    await userEvent.selectOptions(
      screen.getByLabelText("Game mode"),
      "computer",
    );
    await userEvent.click(screen.getByRole("button", { name: "New game" }));
    expect(mockedCreateGame).toHaveBeenCalledWith(
      { mode: "computer" },
      expect.any(AbortSignal),
    );
    expect(await screen.findByText("It is X's turn.")).toBeInTheDocument();
    expect(
      await screen.findByText("Playing against the computer"),
    ).toBeInTheDocument();

    const input = screen.getByLabelText("Existing game ID");
    await userEvent.clear(input);
    await userEvent.type(input, "loaded-game");
    await userEvent.click(screen.getByRole("button", { name: "Load game" }));
    await waitFor(() =>
      expect(mockedGetGame).toHaveBeenCalledWith(
        "loaded-game",
        expect.any(AbortSignal),
      ),
    );
    expect(await screen.findByText("Game ID: loaded-game")).toBeInTheDocument();
  });

  it("submits a move and displays the server-confirmed turn", async () => {
    mockedCreateGame.mockResolvedValue(game());
    mockedSubmitMove.mockResolvedValue(
      game({
        board: ["X", null, null, null, null, null, null, null, null],
        currentPlayer: "O",
        moveHistory: [{ moveNumber: 1, player: "X", row: 1, column: 1 }],
      }),
    );
    render(<GameSection />);
    await userEvent.click(screen.getByRole("button", { name: "New game" }));
    await screen.findByText("It is X's turn.");
    await userEvent.click(
      screen.getByRole("gridcell", { name: "Row 1, column 1" }),
    );

    await waitFor(() =>
      expect(mockedSubmitMove).toHaveBeenCalledWith(
        "game-1",
        expect.objectContaining({ row: 1, column: 1, player: "X" }),
        expect.any(AbortSignal),
      ),
    );
    expect(await screen.findByText("It is O's turn.")).toBeInTheDocument();
    expect(screen.getByText("Move 1: X — row 1, column 1")).toBeInTheDocument();
  });

  it("allows O to move next in two-player mode", async () => {
    mockedCreateGame.mockResolvedValue(game());
    mockedSubmitMove.mockResolvedValue(
      game({
        board: ["X", null, null, null, null, null, null, null, null],
        currentPlayer: "O",
        moveHistory: [{ moveNumber: 1, player: "X", row: 1, column: 1 }],
      }),
    );
    render(<GameSection />);
    await userEvent.click(screen.getByRole("button", { name: "New game" }));
    await screen.findByText("It is X's turn.");
    await userEvent.click(
      screen.getByRole("gridcell", { name: "Row 1, column 1" }),
    );
    await screen.findByText("It is O's turn.");

    expect(
      screen.getByRole("gridcell", { name: "Row 1, column 2" }),
    ).toBeEnabled();
  });

  it("renders the server history in chronological order with one-based coordinates", async () => {
    mockedCreateGame.mockResolvedValue(
      game({
        moveHistory: [
          { moveNumber: 1, player: "X", row: 3, column: 2 },
          { moveNumber: 2, player: "O", row: 1, column: 3 },
        ],
        canUndo: true,
      }),
    );
    render(<GameSection />);
    await userEvent.click(screen.getByRole("button", { name: "New game" }));

    await screen.findByText("Move 1: X — row 3, column 2");
    const entries = screen.getAllByRole("listitem");
    expect(entries).toHaveLength(2);
    expect(entries[0]).toHaveTextContent("Move 1: X — row 3, column 2");
    expect(entries[1]).toHaveTextContent("Move 2: O — row 1, column 3");
  });

  it("enables undo only when the server allows it and follows the returned state", async () => {
    mockedCreateGame.mockResolvedValue(
      game({
        board: ["X", null, null, null, null, null, null, null, null],
        currentPlayer: "O",
        moveHistory: [{ moveNumber: 1, player: "X", row: 1, column: 1 }],
        canUndo: true,
      }),
    );
    mockedUndoGame.mockResolvedValue(game());
    render(<GameSection />);
    await userEvent.click(screen.getByRole("button", { name: "New game" }));
    const undo = await screen.findByRole("button", { name: "Undo" });
    expect(undo).toBeEnabled();
    await userEvent.click(undo);

    await waitFor(() =>
      expect(mockedUndoGame).toHaveBeenCalledWith(
        "game-1",
        expect.any(AbortSignal),
      ),
    );
    expect(
      screen.getByRole("gridcell", { name: "Row 1, column 1" }),
    ).toHaveTextContent("");
    expect(screen.getByText("No moves yet.")).toBeInTheDocument();
    expect(screen.getByText("Move undone.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
  });

  it("disables undo while a request is pending and preserves state on failure", async () => {
    const pending = deferred<GameResponse>();
    mockedCreateGame.mockResolvedValue(
      game({
        board: ["X", null, null, null, null, null, null, null, null],
        currentPlayer: "O",
        moveHistory: [{ moveNumber: 1, player: "X", row: 1, column: 1 }],
        canUndo: true,
      }),
    );
    mockedUndoGame.mockReturnValue(pending.promise);
    render(<GameSection />);
    await userEvent.click(screen.getByRole("button", { name: "New game" }));
    await userEvent.click(await screen.findByRole("button", { name: "Undo" }));
    expect(screen.getByRole("button", { name: "Undoing…" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Undoing…" }));
    expect(mockedUndoGame).toHaveBeenCalledTimes(1);

    pending.reject(new Error("Undo service unavailable"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
    expect(
      screen.getByRole("gridcell", { name: "Row 1, column 1, X" }),
    ).toHaveTextContent("X");
    expect(screen.getByText("Move 1: X — row 1, column 1")).toBeInTheDocument();
  });

  it("uses the backend result for computer-mode undo pairs", async () => {
    mockedCreateGame.mockResolvedValue(
      game({
        mode: "computer",
        board: ["X", null, "O", null, null, null, null, null, null],
        currentPlayer: "X",
        moveHistory: [
          { moveNumber: 1, player: "X", row: 1, column: 1 },
          { moveNumber: 2, player: "O", row: 1, column: 3 },
        ],
        canUndo: true,
      }),
    );
    mockedUndoGame.mockResolvedValue(game({ mode: "computer" }));
    render(<GameSection />);
    await userEvent.click(screen.getByRole("button", { name: "New game" }));
    await userEvent.click(await screen.findByRole("button", { name: "Undo" }));

    await waitFor(() =>
      expect(mockedUndoGame).toHaveBeenCalledWith(
        "game-1",
        expect.any(AbortSignal),
      ),
    );
    expect(screen.getByText("No moves yet.")).toBeInTheDocument();
    expect(screen.getByText("It is X's turn.")).toBeInTheDocument();
  });

  it("shows a win and highlights the server-provided winning cells", async () => {
    mockedCreateGame.mockResolvedValue(game());
    mockedSubmitMove.mockResolvedValue(
      game({
        board: ["X", "X", "X", null, null, null, null, null, null],
        currentPlayer: null,
        status: "won",
        winner: "X",
        winningCells: [
          [
            { row: 1, column: 1 },
            { row: 1, column: 2 },
            { row: 1, column: 3 },
          ],
        ],
      }),
    );
    render(<GameSection />);
    await userEvent.click(screen.getByRole("button", { name: "New game" }));
    await screen.findByText("It is X's turn.");
    await userEvent.click(
      screen.getByRole("gridcell", { name: "Row 1, column 1" }),
    );

    expect(await screen.findByText("X wins!")).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("gridcell")
        .slice(0, 3)
        .every((cell) => cell.className.includes("game-cell--winner")),
    ).toBe(true);
    expect(
      screen.getByRole("gridcell", {
        name: "Row 1, column 1, X, winning cell",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("gridcell", { name: "Row 2, column 1" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
  });

  it("announces a draw without changing the board interaction model", async () => {
    mockedCreateGame.mockResolvedValue(
      game({ status: "draw", currentPlayer: null }),
    );
    render(<GameSection />);

    await userEvent.click(screen.getByRole("button", { name: "New game" }));
    await screen.findByRole("gridcell", { name: "Row 1, column 1" });

    expect(screen.getByText("It is a draw.")).toHaveAttribute(
      "aria-live",
      "polite",
    );
    expect(screen.getAllByRole("gridcell")).toHaveLength(9);
    expect(
      screen
        .getAllByRole("gridcell")
        .every((cell) => cell.hasAttribute("disabled")),
    ).toBe(true);
  });

  it("announces loading feedback while a move is pending", async () => {
    const pending = deferred<GameResponse>();
    mockedCreateGame.mockResolvedValue(game());
    mockedSubmitMove.mockReturnValue(pending.promise);
    render(<GameSection />);

    await userEvent.click(screen.getByRole("button", { name: "New game" }));
    await screen.findByRole("gridcell", { name: "Row 1, column 1" });
    await userEvent.click(
      screen.getByRole("gridcell", { name: "Row 1, column 1" }),
    );

    expect(screen.getByText("Submitting move…")).toHaveAttribute(
      "aria-live",
      "polite",
    );
    pending.resolve(
      game({
        board: ["X", null, null, null, null, null, null, null, null],
        currentPlayer: "O",
      }),
    );
  });

  it("keeps undo unavailable for a draw and clears history from a fresh reset state", async () => {
    mockedCreateGame.mockResolvedValue(
      game({
        moveHistory: [{ moveNumber: 1, player: "X", row: 2, column: 2 }],
        canUndo: true,
      }),
    );
    mockedResetGame.mockResolvedValue({ game: game({ id: "game-2" }) });
    render(<GameSection />);
    await userEvent.click(screen.getByRole("button", { name: "New game" }));
    expect(
      await screen.findByText("Move 1: X — row 2, column 2"),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reset game" }));
    expect(await screen.findByText("No moves yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();

    mockedCreateGame.mockResolvedValueOnce(
      game({ status: "draw", currentPlayer: null, canUndo: false }),
    );
    await userEvent.click(screen.getByRole("button", { name: "New game" }));
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
  });

  it("prevents duplicate submissions while a move is pending", async () => {
    const pending = deferred<GameResponse>();
    mockedCreateGame.mockResolvedValue(game());
    mockedSubmitMove.mockReturnValue(pending.promise);
    render(<GameSection />);
    await userEvent.click(screen.getByRole("button", { name: "New game" }));
    await screen.findByText("It is X's turn.");
    const cell = screen.getByRole("gridcell", { name: "Row 1, column 1" });
    await userEvent.click(cell);
    await userEvent.click(cell);
    expect(mockedSubmitMove).toHaveBeenCalledTimes(1);
    pending.resolve(
      game({
        board: ["X", null, null, null, null, null, null, null, null],
        currentPlayer: "O",
      }),
    );
  });

  it("does not allow selecting a cell while the computer owns the server turn", async () => {
    mockedCreateGame.mockResolvedValue(
      game({
        mode: "computer",
        board: ["X", null, null, null, "O", null, null, null, null],
        currentPlayer: "O",
        moveHistory: [
          { moveNumber: 1, player: "X", row: 1, column: 1 },
          { moveNumber: 2, player: "O", row: 2, column: 2 },
        ],
      }),
    );
    render(<GameSection />);
    await userEvent.click(screen.getByRole("button", { name: "New game" }));

    expect(
      await screen.findByText("Playing against the computer"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("gridcell", { name: "Row 1, column 2" }),
    ).toBeDisabled();
    expect(mockedSubmitMove).not.toHaveBeenCalled();
  });

  it("keeps the confirmed state when a move fails", async () => {
    mockedCreateGame.mockResolvedValue(game());
    mockedSubmitMove.mockRejectedValue(new Error("Network unavailable"));
    render(<GameSection />);
    await userEvent.click(screen.getByRole("button", { name: "New game" }));
    await screen.findByText("It is X's turn.");
    await userEvent.click(
      screen.getByRole("gridcell", { name: "Row 1, column 1" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
    expect(
      screen.getByRole("gridcell", { name: "Row 1, column 1" }),
    ).toHaveTextContent("");
    expect(screen.getByText("It is X's turn.")).toBeInTheDocument();
  });

  it("ignores a late response from a previous session", async () => {
    const first = deferred<GameResponse>();
    mockedGetGame
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(game({ id: "new-game" }));
    render(<GameSection />);
    const input = screen.getByLabelText("Existing game ID");
    await userEvent.type(input, "old-game");
    await userEvent.click(screen.getByRole("button", { name: "Load game" }));
    await userEvent.clear(input);
    await userEvent.type(input, "new-game");
    await userEvent.click(screen.getByRole("button", { name: "Load game" }));
    expect(await screen.findByText("Game ID: new-game")).toBeInTheDocument();

    first.resolve(game({ id: "old-game", currentPlayer: "O" }));
    await waitFor(() =>
      expect(screen.queryByText("Game ID: old-game")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("It is X's turn.")).toBeInTheDocument();
  });

  it("resets to the new server-created session", async () => {
    mockedCreateGame.mockResolvedValue(game());
    mockedResetGame.mockResolvedValue({ game: game({ id: "game-2" }) });
    render(<GameSection />);
    await userEvent.click(screen.getByRole("button", { name: "New game" }));
    await screen.findByText("It is X's turn.");
    await userEvent.click(screen.getByRole("button", { name: "Reset game" }));
    expect(await screen.findByText("Game ID: game-2")).toBeInTheDocument();
    expect(mockedResetGame).toHaveBeenCalledWith(
      "game-1",
      expect.any(AbortSignal),
    );
  });

  it("aborts an in-flight request when the game UI unmounts", async () => {
    const pending = deferred<GameResponse>();
    mockedCreateGame.mockReturnValue(pending.promise);
    const view = render(<GameSection />);

    await userEvent.click(screen.getByRole("button", { name: "New game" }));
    const signal = mockedCreateGame.mock.calls[0]?.[1];
    expect(signal).toBeInstanceOf(AbortSignal);

    view.unmount();
    expect(signal?.aborted).toBe(true);
    pending.resolve(game());
  });
});
