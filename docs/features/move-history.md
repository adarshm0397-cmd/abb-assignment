# Feature: Move history

- Status: Proposed
- Depends on: Move validation and turns, SQLite persistence
- Planned branch: `feature/move-history`

## Objective

Show the authoritative sequence of moves for the active game.

## Behavior and rules

- Each move has a sequential number, player, row, and column.
- Computer responses are included as individual moves.
- History order is chronological and server-provided.
- Reset creates a new empty history; historical records remain persisted.

## Acceptance criteria

- [ ] Every accepted move appears exactly once.
- [ ] Move numbers are sequential per game.
- [ ] Player and one-based coordinates are accurate.
- [ ] Failed requests do not create history entries.

## Test plan

- Repository tests for ordering and uniqueness.
- API tests for human and computer moves.
- React tests for rendering move number, player, row, and column.
