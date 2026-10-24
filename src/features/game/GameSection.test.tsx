import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createGame, getGame, resetGame, submitMove } from '../../api/games';
import type { GameResponse } from '../../api/types';
import { GameSection } from './GameSection';

jest.mock('../../api/games');

const mockedCreateGame = createGame as jest.MockedFunction<typeof createGame>;
const mockedGetGame = getGame as jest.MockedFunction<typeof getGame>;
const mockedResetGame = resetGame as jest.MockedFunction<typeof resetGame>;
const mockedSubmitMove = submitMove as jest.MockedFunction<typeof submitMove>;

const game = (overrides: Partial<GameResponse> = {}): GameResponse => ({
  id: 'game-1',
  mode: 'two-player',
  board: [null, null, null, null, null, null, null, null, null],
  currentPlayer: 'X',
  status: 'active',
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

describe('GameSection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a selected game mode and loads an existing session', async () => {
    const created = game({ id: 'computer-game', mode: 'computer' });
    mockedCreateGame.mockResolvedValue(created);
    mockedGetGame.mockResolvedValue(game({ id: 'loaded-game' }));
    render(<GameSection />);

    await userEvent.selectOptions(screen.getByLabelText('Game mode'), 'computer');
    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    expect(mockedCreateGame).toHaveBeenCalledWith({ mode: 'computer' });
    expect(await screen.findByText('It is X\'s turn.')).toBeInTheDocument();

    const input = screen.getByLabelText('Existing game ID');
    await userEvent.clear(input);
    await userEvent.type(input, 'loaded-game');
    await userEvent.click(screen.getByRole('button', { name: 'Load game' }));
    await waitFor(() => expect(mockedGetGame).toHaveBeenCalledWith('loaded-game'));
    expect(await screen.findByText('Game ID: loaded-game')).toBeInTheDocument();
  });

  it('submits a move and displays the server-confirmed turn', async () => {
    mockedCreateGame.mockResolvedValue(game());
    mockedSubmitMove.mockResolvedValue(game({
      board: ['X', null, null, null, null, null, null, null, null],
      currentPlayer: 'O',
    }));
    render(<GameSection />);
    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    await screen.findByText("It is X's turn.");
    await userEvent.click(screen.getByRole('gridcell', { name: 'Row 1, column 1' }));

    await waitFor(() => expect(mockedSubmitMove).toHaveBeenCalledWith('game-1', expect.objectContaining({ row: 1, column: 1, player: 'X' })));
    expect(await screen.findByText('It is O\'s turn.')).toBeInTheDocument();
  });

  it('shows a win and highlights the server-provided winning cells', async () => {
    mockedCreateGame.mockResolvedValue(game());
    mockedSubmitMove.mockResolvedValue(game({
      board: ['X', 'X', 'X', null, null, null, null, null, null],
      currentPlayer: null,
      status: 'won',
      winner: 'X',
      winningCells: [[{ row: 1, column: 1 }, { row: 1, column: 2 }, { row: 1, column: 3 }]],
    }));
    render(<GameSection />);
    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    await screen.findByText("It is X's turn.");
    await userEvent.click(screen.getByRole('gridcell', { name: 'Row 1, column 1' }));

    expect(await screen.findByText('X wins!')).toBeInTheDocument();
    expect(screen.getAllByRole('gridcell').slice(0, 3).every((cell) => cell.className.includes('game-cell--winner'))).toBe(true);
    expect(screen.getByRole('gridcell', { name: 'Row 2, column 1' })).toBeDisabled();
  });

  it('prevents duplicate submissions while a move is pending', async () => {
    const pending = deferred<GameResponse>();
    mockedCreateGame.mockResolvedValue(game());
    mockedSubmitMove.mockReturnValue(pending.promise);
    render(<GameSection />);
    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    await screen.findByText("It is X's turn.");
    const cell = screen.getByRole('gridcell', { name: 'Row 1, column 1' });
    await userEvent.click(cell);
    await userEvent.click(cell);
    expect(mockedSubmitMove).toHaveBeenCalledTimes(1);
    pending.resolve(game({ board: ['X', null, null, null, null, null, null, null, null], currentPlayer: 'O' }));
  });

  it('keeps the confirmed state when a move fails', async () => {
    mockedCreateGame.mockResolvedValue(game());
    mockedSubmitMove.mockRejectedValue(new Error('Network unavailable'));
    render(<GameSection />);
    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    await screen.findByText("It is X's turn.");
    await userEvent.click(screen.getByRole('gridcell', { name: 'Row 1, column 1' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.');
    expect(screen.getByRole('gridcell', { name: 'Row 1, column 1' })).toHaveTextContent('');
    expect(screen.getByText('It is X\'s turn.')).toBeInTheDocument();
  });

  it('ignores a late response from a previous session', async () => {
    const first = deferred<GameResponse>();
    mockedGetGame.mockReturnValueOnce(first.promise).mockResolvedValueOnce(game({ id: 'new-game' }));
    render(<GameSection />);
    const input = screen.getByLabelText('Existing game ID');
    await userEvent.type(input, 'old-game');
    await userEvent.click(screen.getByRole('button', { name: 'Load game' }));
    await userEvent.clear(input);
    await userEvent.type(input, 'new-game');
    await userEvent.click(screen.getByRole('button', { name: 'Load game' }));
    expect(await screen.findByText('Game ID: new-game')).toBeInTheDocument();

    first.resolve(game({ id: 'old-game', currentPlayer: 'O' }));
    await waitFor(() => expect(screen.queryByText('Game ID: old-game')).not.toBeInTheDocument());
    expect(screen.getByText("It is X's turn.")).toBeInTheDocument();
  });

  it('resets to the new server-created session', async () => {
    mockedCreateGame.mockResolvedValue(game());
    mockedResetGame.mockResolvedValue({ game: game({ id: 'game-2' }) });
    render(<GameSection />);
    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    await screen.findByText("It is X's turn.");
    await userEvent.click(screen.getByRole('button', { name: 'Reset game' }));
    expect(await screen.findByText('Game ID: game-2')).toBeInTheDocument();
    expect(mockedResetGame).toHaveBeenCalledWith('game-1');
  });
});
