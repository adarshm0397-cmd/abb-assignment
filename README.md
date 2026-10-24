# ABB Tic Tac Toe

ABB Tic Tac Toe is a full-stack Tic Tac Toe application. The frontend is built with React and TypeScript, the backend uses Express, and game data is stored in SQLite.

The backend is the source of truth for game rules and state. It validates moves, controls turns, applies computer moves, handles undo and reset, and updates the scoreboard. The browser displays the state returned by the server instead of maintaining a second set of game rules.

## What the application supports

- Two-player games.
- Games against a deterministic computer opponent.
- Server-side validation for coordinates, turns, wins, draws, and winning cells.
- Persistent games, move history, request records, and scoreboard data.
- Undo for one move in two-player mode.
- Undo for the latest human/computer move pair in computer mode.
- Independent game and scoreboard resets.
- Idempotent move requests, so retrying a request does not duplicate a move.
- Exactly-once scoreboard updates when a game is completed.
- Keyboard-accessible and responsive UI with loading and error states.
- Health and OpenAPI endpoints for API checks and documentation.

## How it works

```text
React frontend (src/)
        │  calls /api/*
        ▼
Express API (server/src/api.ts)
        │  validates requests and maps responses
        ▼
GameService ── GameEngine ── ComputerStrategy
        │  transactional persistence
        ▼
SQLite database
```

The main backend responsibilities are:

- `GameEngine`: pure Tic Tac Toe rules.
- `GameService`: game-session orchestration and state transitions.
- `ComputerStrategy`: deterministic computer move selection.
- SQLite repository: durable game, move, request, and scoreboard data.

SQLite transactions keep the game state, move history, idempotency records, and scoreboard updates consistent when a request succeeds or fails.

## Requirements

- Node.js 20 or newer.
- npm 10 or newer.

Install the exact dependency versions from the committed lockfile:

```bash
npm ci
```

Do not commit `node_modules`, build output, environment files, or local SQLite files.

## Run locally

### Start the frontend and backend together

```bash
npm run dev
```

The frontend normally runs at <http://localhost:5173> and the backend at <http://localhost:3001>.

### Start each process separately

```bash
# Terminal 1: Vite frontend
npm run dev:frontend

# Terminal 2: Express backend
npm run dev:backend
```

During development, Vite proxies `/api` requests to `http://localhost:3001`. The proxy target can be changed with `VITE_API_PROXY_TARGET`.

## Configuration

### Frontend variables

Vite reads these variables when the frontend is built. They can be placed in a supported Vite environment file such as `.env.local`.

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | API base URL used by the browser | `/api` |
| `VITE_API_PROXY_TARGET` | Development-only Vite proxy target | `http://localhost:3001` |

### Backend variables

The backend reads these values from `process.env` when it starts:

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | HTTP port | `3001` |
| `DATABASE_PATH` | SQLite database file | `./data/tic-tac-toe.sqlite` |
| `CORS_ORIGIN` | Comma-separated list of allowed browser origins | `http://localhost:5173` |

Example:

```bash
PORT=3001 \
DATABASE_PATH=./data/tic-tac-toe.sqlite \
CORS_ORIGIN=http://localhost:5173 \
npm run dev:backend
```

The backend does not load `.env` files automatically. Export backend variables in the shell or configure them in the hosting platform. [`.env.example`](./.env.example) lists the available settings.

This application does not currently require an API key or other secret. Never commit secrets to the repository.

## Project structure

```text
src/
  api/                 Typed browser API clients and API types
  components/          Reusable React components
  store/               Redux store and game/scoreboard state
  App.tsx              Application composition
  App.css              Application styles
  index.css            Global styles

server/src/
  api.ts               Express routes, validation, CORS, and errors
  game-engine.ts       Pure Tic Tac Toe rules
  game-service.ts      Game/session orchestration
  computer-strategy.ts Deterministic computer opponent
  app.ts               Express application setup
  server.ts            HTTP server entry point

docs/
  api-contract.md      API behavior and response shapes
  features/            Feature specifications

.github/workflows/     GitHub Actions CI workflow
vite.config.ts         Vite configuration and local API proxy
netlify.toml           Netlify frontend build settings
```

## API

The API base path is `/api`. JSON mutation requests require `Content-Type: application/json`. Bodyless actions such as undo and reset do not require a request body.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Returns the service health status. |
| `GET` | `/api/docs` | Links to the OpenAPI document. |
| `GET` | `/api/openapi.json` | Returns the OpenAPI specification. |
| `POST` | `/api/games` | Creates a two-player or computer game. |
| `GET` | `/api/games/:gameId` | Retrieves a saved game. |
| `POST` | `/api/games/:gameId/moves` | Validates and applies a move. Computer games may also apply the O move. |
| `POST` | `/api/games/:gameId/undo` | Removes the permitted latest move or move pair. |
| `POST` | `/api/games/:gameId/reset` | Resets the game and creates a new session. |
| `GET` | `/api/scoreboard` | Reads the scoreboard. |
| `POST` | `/api/scoreboard/reset` | Resets all scoreboard counters. |

### Create a game

```bash
curl -X POST http://localhost:3001/api/games \
  -H 'Content-Type: application/json' \
  -d '{"mode":"computer"}'
```

The response contains the complete game state:

```json
{
  "id": "<game-id>",
  "mode": "computer",
  "board": [null, null, null, null, null, null, null, null, null],
  "currentPlayer": "X",
  "status": "active",
  "winner": null,
  "winningCells": [],
  "moveHistory": [],
  "canUndo": false
}
```

### Submit a move

Moves use one-based `row` and `column` values. A unique `requestId` is required so a retried request returns the original result without applying the move twice.

```bash
curl -X POST http://localhost:3001/api/games/<game-id>/moves \
  -H 'Content-Type: application/json' \
  -d '{"player":"X","row":1,"column":1,"requestId":"move-1"}'
```

The response is a complete updated game snapshot. In computer mode, the snapshot can include both the human X move and the automatic O move.

For the complete request and response contract, see [`docs/api-contract.md`](./docs/api-contract.md) or open `/api/openapi.json` while the backend is running. Validation errors use the following general shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "...",
    "details": { "fields": {} }
  }
}
```

## Database and persistence

By default, the backend stores data in `data/tic-tac-toe.sqlite`. On startup it creates the parent directory, opens the database, enables foreign keys, initializes the scoreboard, and creates the required tables.

The database stores:

- Active and reset game sessions.
- Move history.
- Idempotency records for move requests.
- Scoreboard values.
- Completion events used to prevent duplicate scoreboard updates.

Games and scores survive backend restarts as long as the SQLite file is retained. Tests use isolated temporary databases. The backend host must provide a persistent, writable filesystem; an ephemeral filesystem will lose game data when the process restarts.

## Deploy the frontend

The repository includes [netlify.toml](./netlify.toml), which configures:

- Build command: `npm run build`
- Publish directory: `dist`
- Node.js version: 20

Set `VITE_API_BASE_URL` in Netlify to the public HTTPS backend URL, including `/api`, for example:

```text
https://api.example.com/api
```

Configure the backend’s `CORS_ORIGIN` with the exact Netlify site origin, for example `https://example.netlify.app`.

Netlify hosts the static frontend only. The Express backend must run separately on a Node-capable host with HTTPS and persistent storage. A public deployment is not complete until the backend has a stable URL, correct CORS settings, and durable SQLite storage.

## Build, test, and quality checks

Run the same checks used by CI:

```bash
npm test                  # Frontend Jest tests
npm run test:backend      # Backend Vitest tests
npm run lint              # ESLint
npm run typecheck         # Frontend and backend TypeScript checks
npm run build             # Frontend production build
npm run build:backend     # Backend JavaScript build
```

To run the compiled backend:

```bash
npm run build:backend
PORT=3001 \
DATABASE_PATH=./data/tic-tac-toe.sqlite \
CORS_ORIGIN=https://your-netlify-site.netlify.app \
npm run start:backend
```

GitHub Actions runs the tests, linting, type checks, and both builds on pushes and pull requests targeting `main` or `master`. See [`.github/workflows/ci.yml`](./.github/workflows/ci.yml).

## Important design decisions

- The backend owns the rules so clients cannot bypass turn, coordinate, completion, or undo validation.
- API mutations return complete game snapshots, which keeps the frontend state simple and makes reloads reliable.
- Resetting a game creates a new session and keeps the previous session marked as reset.
- The computer opponent follows a predictable priority: win, block, center, first corner, then first available cell.
- Computer-mode undo removes the latest human/computer pair when that pair exists.
- Persisted request IDs make move retries safe and idempotent.
- Transactions and optimistic session versions protect state when writes fail or requests race.

## Suggested walkthrough

1. Start the frontend and backend.
2. Play a two-player game and use undo.
3. Reset the game and confirm the scoreboard is unchanged.
4. Start a computer game and observe the automatic response.
5. Use computer-mode undo to remove the latest move pair.
6. Complete a game and confirm the scoreboard increases once.
7. Reset the scoreboard independently.
8. Check `/api/health` and `/api/docs`.

## Current deployment limitation

The frontend can be deployed to Netlify, but the backend still requires a separate Node-capable host with HTTPS and persistent SQLite storage. Until that backend is available and configured, the application cannot be fully deployed as a public production service.
