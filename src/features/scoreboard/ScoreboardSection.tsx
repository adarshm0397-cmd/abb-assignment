import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../api/client';
import { getScoreboard, resetScoreboard } from '../../api/scoreboard';
import type { Scoreboard } from '../../api/types';
import { AppStatus } from '../../components/AppStatus';

const errorMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';

export function ScoreboardSection({ refreshToken = 0 }: { refreshToken?: number }) {
  const [scoreboard, setScoreboard] = useState<Scoreboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingReset, setPendingReset] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const confirmed = await getScoreboard();
      setScoreboard(confirmed);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load, refreshToken]);

  const reset = async () => {
    if (!window.confirm('Reset the scoreboard? This cannot be undone.')) return;
    setPendingReset(true);
    setError(null);
    try {
      const confirmed = await resetScoreboard();
      setScoreboard(confirmed);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPendingReset(false);
    }
  };

  return (
    <section className="feature-card" aria-labelledby="scoreboard-heading">
      <h2 id="scoreboard-heading">Scoreboard</h2>
      {loading && <AppStatus kind="loading" message="Loading scoreboard…" />}
      {error && <AppStatus kind="error" message={error} />}
      {scoreboard && (
        <>
          <dl className="scoreboard-values">
            <div><dt>X wins</dt><dd>{scoreboard.xWins}</dd></div>
            <div><dt>O wins</dt><dd>{scoreboard.oWins}</dd></div>
            <div><dt>Draws</dt><dd>{scoreboard.draws}</dd></div>
          </dl>
          <button type="button" onClick={() => void reset()} disabled={loading || pendingReset}>
            {pendingReset ? 'Resetting…' : 'Reset scoreboard'}
          </button>
        </>
      )}
    </section>
  );
}
