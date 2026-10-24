# Feature: Move validation and turns

- Status: Proposed
- Depends on: Game sessions and modes
- Planned branch: `feature/move-validation`

## Objective

Ensure every move is validated by the backend before it changes authoritative game state.

## Behavior and rules

- Coordinates are one-based and must be between 1 and 3.
- The submitted player must be X or O and must match the current turn.
- A cell must be empty.
- A completed or reset game cannot accept moves.
- A valid move is persisted and changes the current player when the game remains active.
- Computer mode may append the server-selected O move in the same request.

## API contract

`POST /api/games/:gameId/moves`

```json
{ "player": "X", "row": 1, "column": 3, "requestId": "client-id" }
```

Errors: `INVALID_COORDINATES`, `INVALID_PLAYER`, `WRONG_TURN`, `CELL_OCCUPIED`, `GAME_COMPLETED`.

## Acceptance criteria

- [ ] Valid moves are accepted and returned in the complete game state.
- [ ] Invalid coordinates, player, turn, cell, and status are rejected.
- [ ] No rejected request changes board, history, or scoreboard.
- [ ] Duplicate request IDs do not create duplicate moves.

## Test plan

- Domain tests for every validation rule.
- API tests for successful and rejected requests.
- Transaction tests prove failed validation has no persistence side effects.
