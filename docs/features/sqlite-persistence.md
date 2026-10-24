# Feature: SQLite persistence

- Status: Proposed
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

## Acceptance criteria

- [ ] Schema can be created from a clean database.
- [ ] Games and moves survive restart.
- [ ] Invalid records are rejected by constraints.
- [ ] Completion scoring is exactly once.
- [ ] Multi-record updates roll back together on failure.

## Test plan

- Repository tests against a temporary SQLite database.
- Constraint and foreign-key tests.
- Transaction rollback and exactly-once scoring tests.
