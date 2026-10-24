# Feature: SQLite persistence

- Status: Implemented
- Depends on: Project foundation
- Planned branch: `feature/sqlite-persistence`

## Objective

Persist game sessions, moves, and scoreboard data with relational integrity and transactional updates.

## Data model

- `games`: session mode, status, turn, winner, winning cells, and timestamps.
- `moves`: ordered moves belonging to one game.
- `scoreboard`: current scoreboard period.
- `scoreboard_events`: unique completion record per game.

## Behavior and rules

- Foreign keys and check constraints protect valid data.
- Queries use parameters, never string-concatenated user input.
- Completion and scoreboard update use one transaction.
- Reset Game retains historical records.
- Reset Scoreboard changes counters only.

## Implementation notes

- `server/src/persistence/database.ts` creates the schema and tracks schema version with SQLite `PRAGMA user_version`.
- `server/src/persistence/game-repository.ts` maps rows to `GameSession` and validates board/history consistency before writes.
- `server/src/game-service.ts` applies moves through the game engine, then persists the resulting state and appended move history together.
- The current schema is version 3; the version-3 migration adds the per-game optimistic-concurrency version used to reject stale writes.
- SQLite files are local-only and ignored by Git. Tests use temporary files, not a shared test database.

## Acceptance criteria

- [x] Schema can be created from a clean database.
- [x] Games and moves survive restart.
- [x] Invalid records are rejected by constraints.
- [x] Completion scoring is exactly once.
- [x] Multi-record updates roll back together on failure.

## Test plan

- Repository tests against a temporary SQLite database.
- Constraint and foreign-key tests.
- Transaction rollback and exactly-once scoring tests.
