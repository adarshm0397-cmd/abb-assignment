import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../api/client";
import { getScoreboard, resetScoreboard } from "../../api/scoreboard";
import type { Scoreboard } from "../../api/types";
import { AppStatus } from "../../components/AppStatus";

const errorMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : "Something went wrong. Please try again.";

const useScoreboard = (refreshToken: number) => {
  const [scoreboard, setScoreboard] = useState<Scoreboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingReset, setPendingReset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestNumber = useRef(0);
  const mounted = useRef(true);
  const activeController = useRef<AbortController | null>(null);

  useEffect(() => {
    // React Strict Mode replays effects in development. Re-arm the guard when
    // the effect is installed again after its development-only cleanup.
    mounted.current = true;

    return () => {
      mounted.current = false;
      activeController.current?.abort();
      activeController.current = null;
      requestNumber.current += 1;
    };
  }, []);

  const load = useCallback(async () => {
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    const request = ++requestNumber.current;
    setLoading(true);
    setError(null);

    try {
      const confirmed = await getScoreboard(controller.signal);
      if (mounted.current && request === requestNumber.current)
        setScoreboard(confirmed);
    } catch (cause) {
      if (mounted.current && request === requestNumber.current)
        setError(errorMessage(cause));
    } finally {
      if (mounted.current && request === requestNumber.current)
        setLoading(false);
      if (request === requestNumber.current) activeController.current = null;
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  const reset = useCallback(async () => {
    if (!window.confirm("Reset the scoreboard? This cannot be undone.")) return;

    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    const request = ++requestNumber.current;
    setPendingReset(true);
    setError(null);

    try {
      const confirmed = await resetScoreboard(controller.signal);
      if (mounted.current && request === requestNumber.current)
        setScoreboard(confirmed);
    } catch (cause) {
      if (mounted.current && request === requestNumber.current)
        setError(errorMessage(cause));
    } finally {
      if (mounted.current && request === requestNumber.current)
        setPendingReset(false);
      if (request === requestNumber.current) activeController.current = null;
    }
  }, []);

  return { scoreboard, loading, pendingReset, error, reset };
};

export function ScoreboardSection({
  refreshToken = 0,
}: {
  refreshToken?: number;
}) {
  const { scoreboard, loading, pendingReset, error, reset } =
    useScoreboard(refreshToken);

  return (
    <section className="feature-card" aria-labelledby="scoreboard-heading">
      <h2 id="scoreboard-heading">Scoreboard</h2>
      {loading && <AppStatus kind="loading" message="Loading scoreboard…" />}
      {error && <AppStatus kind="error" message={error} />}
      {scoreboard && (
        <>
          <dl className="scoreboard-values">
            <div>
              <dt>X wins</dt>
              <dd>{scoreboard.xWins}</dd>
            </div>
            <div>
              <dt>O wins</dt>
              <dd>{scoreboard.oWins}</dd>
            </div>
            <div>
              <dt>Draws</dt>
              <dd>{scoreboard.draws}</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => void reset()}
            disabled={loading || pendingReset}
          >
            {pendingReset ? "Resetting…" : "Reset scoreboard"}
          </button>
        </>
      )}
    </section>
  );
}
