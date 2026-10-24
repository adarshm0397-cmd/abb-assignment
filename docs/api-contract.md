# ABB Tic Tac Toe API contract

- Status: Proposed — awaiting approval before backend implementation
- Scope: Shared contract for the frontend and backend
- Base URL: `/api`
- Content type: `application/json`

This document is the source of truth for the game and scoreboard API. It defines transport shapes and state transitions at the API boundary; it does not implement game rules.

## Conventions

### Identifiers and coordinates

- `gameId` is an opaque, server-generated string. Clients must not infer its format.
- Public move coordinates are one-based: `row` and `column` are integers from `1` through `3`.
- Rows are counted top to bottom and columns left to right.
- The board is a nine-element row-major array: indices `0`–`2` are row 1, `3`–`5` are row 2, and `6`–`8` are row 3.
- Board cells are `"X"`, `"O"`, or `null`.
- `winningCells` uses the same public coordinate object as move history, with one-based `row` and `column` values.
- A backend may use zero-based cell indices internally, but zero-based indices are never exposed by this contract.

### Enums

```text
Mode   = "two-player" | "computer"
Player = "X" | "O"
Status = "active" | "won" | "draw" | "reset"
```

`X` always starts. In `computer` mode, the human is `X` and the computer is `O`. A reset marks the old game `reset` and returns a new game session.

### Move history

Each accepted move is represented independently, including a computer response:

```json
{
  "moveNumber": 1,
  "player": "X",
  "row": 1,
  "column": 3
}
```

`moveNumber` starts at 1 and increases by one in chronological order. After an undo, the server renumbers all remaining moves in chronological order starting at 1; move numbers are positions in the current history, not permanent identifiers. A computer-mode move response includes both the submitted human move and the automatically selected computer move in the same `moveHistory`, when the computer move is made. There is no nested or combined move record.

### Undo

`canUndo` is `true` only when the server allows undo for the current state. It is `false` for an empty history, a completed game (`won` or `draw`), or a reset game. Players cannot undo after a game has been won or drawn. In two-player mode, undo removes one latest move. In computer mode, undo removes the latest computer move and its preceding human move as a pair when that pair exists; if only the human move exists, it removes that move. After removal, the remaining moves are renumbered from 1 and the response returns the complete resulting game state.

### Scoreboard

The scoreboard is the current scoring period and is independent of an individual game:

```json
{
  "xWins": 2,
  "oWins": 1,
  "draws": 3
}
```

All values are non-negative integers. A completed game contributes at most once, identified by its game ID. Completion and its scoreboard increment are one atomic operation. Scoreboard reset is also serialized with completion: if a game finishes while reset is in progress, the completion is applied to exactly one well-defined scoreboard period and is neither double-counted nor silently lost. Resetting a game does not change the scoreboard; resetting the scoreboard sets all three values to zero.

## Common schemas

### Game response

Every successful game mutation and game retrieval returns the complete current game state:

```json
{
  "id": "game_01J9ZQ7M7W8J5G9R3V4K2N6P1A",
  "mode": "computer",
  "board": ["X", null, "O", null, "X", null, null, null, null],
  "currentPlayer": "O",
  "status": "active",
  "winner": null,
  "winningCells": [],
  "moveHistory": [
    { "moveNumber": 1, "player": "X", "row": 1, "column": 1 },
    { "moveNumber": 2, "player": "O", "row": 1, "column": 3 },
    { "moveNumber": 3, "player": "X", "row": 2, "column": 2 }
  ],
  "canUndo": true
}
```

Fields:

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Opaque game identifier |
| `mode` | `Mode` | Session mode |
| `board` | `(Player \| null)[]` | Exactly nine row-major cells |
| `currentPlayer` | `Player \| null` | Next player when `active`; `null` otherwise |
| `status` | `Status` | Current lifecycle/result status |
| `winner` | `Player \| null` | Winner when `won`; `null` for all other statuses |
| `winningCells` | `Coordinate[]` | Exactly three cells when `won`; empty otherwise |
| `moveHistory` | `Move[]` | Chronological accepted moves |
| `canUndo` | boolean | Server-authoritative undo availability |

### Scoreboard response

```json
{
  "xWins": 0,
  "oWins": 0,
  "draws": 0
}
```

### Error response

Every expected error uses this shape:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request body contains invalid fields.",
    "details": {
      "fields": [
        {
          "field": "row",
          "code": "INVALID_TYPE",
          "message": "row must be an integer."
        }
      ]
    }
  }
}
```

`code` is stable for client behavior; `message` is readable and may change. `details` is optional and may contain a `fields` array for field-level validation errors. Each field error contains the submitted field name, a stable field error code, and a readable message. Unknown failures use `INTERNAL_ERROR` and do not expose stack traces.

Malformed or invalid request data is handled consistently:

- Missing body, invalid JSON syntax, a non-object body, missing required fields, unknown fields, or incorrectly typed fields return `400 INVALID_REQUEST`.
- Valid JSON values that violate a documented domain constraint use the most specific stable code, such as `INVALID_MODE`, `INVALID_COORDINATES`, or `INVALID_PLAYER`.
- Requests without `Content-Type: application/json` return `415 INVALID_CONTENT_TYPE` when a JSON body is required.
- Validation errors do not change game, move-history, or scoreboard state.

## Endpoints

The API exposes the canonical paths below. There is no collection-list endpoint in this contract.

### Create a game

`POST /api/games`

Request:

```json
{ "mode": "two-player" }
```

The request body is required and must contain exactly one valid `mode` field.

Response `201 Created`: [Game response](#game-response), initialized with an empty board, `currentPlayer: "X"`, `status: "active"`, `winner: null`, empty `winningCells` and `moveHistory`, and `canUndo: false`.

Errors: `400 INVALID_MODE`, `400 INVALID_REQUEST`, `415 INVALID_CONTENT_TYPE`.

### Get a game

`GET /api/games/:gameId`

Request body: none.

Response `200 OK`: [Game response](#game-response).

Errors: `404 GAME_NOT_FOUND`.

### Submit a move

`POST /api/games/:gameId/moves`

Request:

```json
{
  "player": "X",
  "row": 1,
  "column": 3,
  "requestId": "client-request-123"
}
```

`requestId` is a required opaque idempotency key. If the same `requestId` is sent again with identical request data, the server returns the already-confirmed result without processing the move again or duplicating moves, history entries, computer responses, or scoreboard effects. If the same `requestId` is reused with different request data, the server rejects the request with `409 DUPLICATE_REQUEST`.

Response `200 OK`: [Game response](#game-response). In `computer` mode, this response includes both accepted moves when an automatic `O` response is made.

Errors: `400 INVALID_REQUEST`, `400 INVALID_COORDINATES`, `400 INVALID_PLAYER`, `409 WRONG_TURN`, `409 CELL_OCCUPIED`, `409 GAME_COMPLETED`, `404 GAME_NOT_FOUND`, `409 DUPLICATE_REQUEST` when a request ID is reused for a different request, `415 INVALID_CONTENT_TYPE`.

### Undo the latest move(s)

`POST /api/games/:gameId/undo`

Request body: none.

Response `200 OK`: [Game response](#game-response) after the permitted move(s) are removed and the remaining move history is renumbered from 1.

Errors: `404 GAME_NOT_FOUND`, `409 UNDO_NOT_ALLOWED` for an empty history or otherwise unavailable undo, `409 GAME_COMPLETED` when the game status is `won` or `draw`.

### Reset a game

`POST /api/games/:gameId/reset`

Request body: none.

Response `201 Created`:

```json
{
  "game": {
    "id": "game_01J9ZR2B3Y4N5P6Q7R8S9T0U1V",
    "mode": "two-player",
    "board": [null, null, null, null, null, null, null, null, null],
    "currentPlayer": "X",
    "status": "active",
    "winner": null,
    "winningCells": [],
    "moveHistory": [],
    "canUndo": false
  }
}
```

The old game remains available with `status: "reset"`; the returned game has a new ID. The scoreboard is unchanged.

Errors: `404 GAME_NOT_FOUND`, `400 INVALID_REQUEST`.

### Get the scoreboard

`GET /api/scoreboard`

Request body: none.

Response `200 OK`: [Scoreboard response](#scoreboard-response).

This endpoint has no expected request-specific error other than `500 INTERNAL_ERROR`.

### Reset the scoreboard

`POST /api/scoreboard/reset`

Request body: none.

Response `200 OK`: [Scoreboard response](#scoreboard-response) with all values set to zero. The current game, completed games, and move history are unchanged. The reset is serialized with game completion so a concurrent completion is applied exactly once to either the period before or after the reset, according to transaction ordering.

Errors: `500 INTERNAL_ERROR`.

## Status code policy

| Status | Use |
|---:|---|
| `200` | Successful retrieval or mutation returning an existing resource/state |
| `201` | A new game resource/session was created |
| `400` | Malformed request or invalid field value |
| `415` | Missing or unsupported content type for a JSON request body |
| `404` | Referenced game does not exist |
| `409` | Request conflicts with authoritative game state or idempotency history |
| `500` | Unexpected server failure |

## Unresolved decisions recorded for approval

1. The reset response is wrapped as `{ "game": GameResponse }` to make the new-session result explicit; all other game endpoints return `GameResponse` directly.
2. No authentication, pagination, CORS policy, rate limiting, or API versioning is defined because none is required by the current feature specifications.

## Approval gate

Backend game behavior, persistence, and route implementation should begin only after this contract and the unresolved decisions above are approved.
