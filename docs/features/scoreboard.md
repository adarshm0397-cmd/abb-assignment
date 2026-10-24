# Feature: Scoreboard

- Status: Proposed
- Depends on: Win and draw resolution, SQLite persistence
- Planned branch: `feature/scoreboard`

## Objective

Track X wins, O wins, and draws exactly once per completed game.

## Behavior and rules

- A win increments the winning player's count.
- A draw increments the draw count.
- The same game cannot contribute more than once.
- Scoreboard update and game completion are one transaction.
- Reset Game does not alter the scoreboard.

## API contract

- `GET /api/scoreboard` returns `{ xWins, oWins, draws }`.
- Completion responses include the latest scoreboard.

## Acceptance criteria

- [ ] Each completion increments exactly one counter.
- [ ] Retries and duplicate submissions do not increment twice.
- [ ] Failed transactions leave both game and scoreboard unchanged.
- [ ] Scoreboard survives application restart.

## Test plan

- Unit tests for result mapping.
- Integration tests for wins, draws, retries, and rollback.
- Frontend tests for scoreboard rendering.
