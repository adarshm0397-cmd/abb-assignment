import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getScoreboard, resetScoreboard } from '../../api/scoreboard';
import { ScoreboardSection } from './ScoreboardSection';

jest.mock('../../api/scoreboard');

const mockedGetScoreboard = getScoreboard as jest.MockedFunction<typeof getScoreboard>;
const mockedResetScoreboard = resetScoreboard as jest.MockedFunction<typeof resetScoreboard>;

describe('ScoreboardSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => jest.restoreAllMocks());

  it('displays values returned by the backend and refreshes after a game result', async () => {
    mockedGetScoreboard
      .mockResolvedValueOnce({ xWins: 2, oWins: 1, draws: 3 })
      .mockResolvedValueOnce({ xWins: 3, oWins: 1, draws: 3 });
    const { rerender } = render(<ScoreboardSection />);
    expect((await screen.findAllByText('2')).length).toBe(1);
    rerender(<ScoreboardSection refreshToken={1} />);
    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument());
    expect(mockedGetScoreboard).toHaveBeenCalledTimes(2);
  });

  it('confirms a reset, disables it while pending, and shows confirmed zeroes', async () => {
    let resolveReset!: (value: { xWins: number; oWins: number; draws: number }) => void;
    mockedGetScoreboard.mockResolvedValue({ xWins: 2, oWins: 1, draws: 3 });
    mockedResetScoreboard.mockReturnValue(new Promise((resolve) => { resolveReset = resolve; }));
    render(<ScoreboardSection />);
    await screen.findByText('2');
    await userEvent.click(screen.getByRole('button', { name: 'Reset scoreboard' }));
    expect(window.confirm).toHaveBeenCalledWith('Reset the scoreboard? This cannot be undone.');
    expect(screen.getByRole('button', { name: 'Resetting…' })).toBeDisabled();
    await act(async () => resolveReset({ xWins: 0, oWins: 0, draws: 0 }));
    expect(await screen.findAllByText('0')).toHaveLength(3);
  });

  it('keeps the last confirmed values and reports reset errors', async () => {
    mockedGetScoreboard.mockResolvedValue({ xWins: 2, oWins: 1, draws: 3 });
    mockedResetScoreboard.mockRejectedValue(new Error('Service unavailable'));
    render(<ScoreboardSection />);
    await screen.findAllByText('2');
    await userEvent.click(screen.getByRole('button', { name: 'Reset scoreboard' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.');
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('does not call the API when reset is not confirmed', async () => {
    jest.mocked(window.confirm).mockReturnValue(false);
    mockedGetScoreboard.mockResolvedValue({ xWins: 1, oWins: 1, draws: 1 });
    render(<ScoreboardSection />);
    await screen.findAllByText('1');
    await userEvent.click(screen.getByRole('button', { name: 'Reset scoreboard' }));
    expect(mockedResetScoreboard).not.toHaveBeenCalled();
  });
});
