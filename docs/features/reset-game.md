# Feature: Reset Game

- Status: Proposed
- Depends on: Game sessions and modes, move history, scoreboard
- Planned branch: `feature/reset-game`

## Objective

Start a clean game without erasing scoreboard data.

## Behavior and rules

- `POST /api/games/:gameId/reset` creates a fresh active session.
- The new session has an empty board and history and starts with X.
- The old session is retained with status `reset`.
- The scoreboard remains unchanged.

## Acceptance criteria

- [ ] Board and move history become empty.
- [ ] A new game ID is returned.
- [ ] The old game remains historical.
- [ ] Scoreboard is unchanged.
- [ ] Reset works from an active or completed game.

## Test plan

- API and persistence tests for active and completed games.
- React test confirms current board changes while scoreboard remains visible and unchanged.
