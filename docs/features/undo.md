# Feature: Undo

- Status: Proposed
- Depends on: Move history, win and draw resolution
- Planned branch: `feature/undo`

## Objective

Allow players to reverse recent moves while the game is active.

## Behavior and rules

- Two-player mode removes exactly the latest move.
- Computer mode removes the latest computer move and preceding human move together when that pair exists.
- If only a human move exists, that move is removed.
- Undo is rejected after a win, draw, or reset.
- The response contains the complete resulting game state and correct current player.
- Scoreboard never changes because completed games cannot be undone.

## API contract

`POST /api/games/:gameId/undo`

Errors: `GAME_COMPLETED`, `UNDO_NOT_ALLOWED`, `GAME_NOT_FOUND`.

## Acceptance criteria

- [ ] Undo removes the correct number of moves in each mode.
- [ ] Board, turn, and history are restored consistently.
- [ ] Empty-history and completed-game requests are safely rejected.
- [ ] UI disables undo when the server state does not allow it.

## Test plan

- Domain tests for every history shape.
- Transaction tests for atomic deletion and game-state update.
- API and React interaction tests.
