import { AppStatus } from '../../components/AppStatus';

export function GameSection() {
  return (
    <section className="feature-card" aria-labelledby="game-heading">
      <h2 id="game-heading">Game</h2>
      <AppStatus kind="empty" message="No game selected yet." />
    </section>
  );
}
