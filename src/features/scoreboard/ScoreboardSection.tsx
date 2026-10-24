import { AppStatus } from '../../components/AppStatus';

export function ScoreboardSection() {
  return (
    <section className="feature-card" aria-labelledby="scoreboard-heading">
      <h2 id="scoreboard-heading">Scoreboard</h2>
      <AppStatus kind="empty" message="Scoreboard data will appear here." />
    </section>
  );
}
