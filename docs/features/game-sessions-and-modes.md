# Feature: Game sessions and modes

- Status: Proposed
- Depends on: Project foundation, SQLite persistence
- Planned branch: `feature/game-sessions-and-modes`

## Objective

Allow the server to create and identify active games in two-player and computer modes.

## Behavior and rules

- A game has a unique ID, mode, active status, empty board, no winner, and X as the current player.
- Supported modes are `two-player` and `computer`.
- In computer mode, the human is X and the computer is O.
- Unknown game IDs return `GAME_NOT_FOUND`.
- A reset creates a new session; the old session remains historical with status `reset`.

## API contract

- `POST /api/games` with `{ "mode": "two-player" | "computer" }` returns `201` and the complete game state.
- `GET /api/games/:gameId` returns the complete latest state.
- Invalid modes return `400 INVALID_MODE`.

## Acceptance criteria

- [ ] Both modes can be created.
- [ ] New games always begin with X.
- [ ] Game IDs are unique and retrievable.
- [ ] Unknown modes and IDs return structured errors.

## Test plan

- Service unit tests for initial state.
- API tests for creation, retrieval, invalid mode, and unknown ID.
- Persistence tests across application restart.
