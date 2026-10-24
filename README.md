# ABB Tic Tac Toe

Full-stack Tic Tac Toe built with React and TypeScript on the frontend, an Express API on the backend, and SQLite persistence. The backend is authoritative for game rules, turns, undo, computer moves, game completion, and scoreboard updates.

## Features

- Two-player and computer game modes.
- Server-validated one-based board coordinates, turns, wins, draws, and winning cells.
- Deterministic computer opponent: win, block, center, corners, then the first available cell.
- Persistent game sessions and move history.
- Undo for one move in two-player mode, or the latest human/computer pair in computer mode.
- Independent game reset and scoreboard reset.
- Exactly-once scoreboard completion handling and idempotent move requests.
- Responsive, keyboard-accessible board with loading and API error states.
- Health and OpenAPI endpoints for backend checks.

## Architecture

```text
React components (src/)
        │ fetches /api/*
        ▼
Express routes (server/src/api.ts)
        │ validates requests and maps responses
        ▼
GameService ── GameEngine ── ComputerStrategy
        │ transactional repository operations
        ▼
SQLite (games, moves, request_records, scoreboard, completion_events)
```

The browser renders the server-confirmed state; it does not implement a second copy of the rules. `GameEngine` is a pure rule module, `GameService` coordinates state transitions, and `SqliteGameSessionRepository` persists a complete session and its move history. SQLite transactions update game state, moves, and completion/scoreboard data together.

## Technology and structure

- React 19, TypeScript, Vite 7, and Testing Library.
- Node.js, Express 5, `tsx`, and `better-sqlite3`.
- Jest for frontend tests and Vitest for backend tests.
- ESLint 9 with the TypeScript ESLint recommended configuration.

```text
src/
  api/                 typed browser API client
  components/          reusable UI components
  features/game/       game controls, board state, move history, undo/reset
  features/scoreboard/ scoreboard display and reset
server/src/
  api.ts               Express routes, validation, CORS, errors
  game-engine.ts       pure Tic Tac Toe rules
  game-service.ts      game/session orchestration
  computer-strategy.ts deterministic O-player strategy
  persistence/         SQLite schema and repository
  server.ts             production HTTP entry point
docs/                  feature specifications and API contract
vite.config.ts         frontend build and local API proxy
netlify.toml           Netlify frontend build settings
```

## Prerequisites and installation

- Node.js 20 or newer.
- npm 10 or newer.

From a clean checkout:

```bash
npm ci
```

`package-lock.json` is committed and should be used for reproducible installs. Do not commit `node_modules`, build output, environment files, or SQLite files.

## Local development

Start both processes with one command:

```bash
npm run dev
```

Or start them separately:

```bash
npm run dev:frontend   # Vite, normally http://localhost:5173
npm run dev:backend    # Express, http://localhost:3001 by default
```

In development, Vite proxies `/api` to `http://localhost:3001` (or `VITE_API_PROXY_TARGET`). The browser therefore calls the same `/api` paths used by the deployed frontend. The backend can also be called directly at `http://localhost:3001/api`.

## Configuration

Frontend variables are read by Vite at build time:

| Variable | Use | Local default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | API base URL used by the browser, including `/api` if the server uses that prefix | `/api` |
| `VITE_API_PROXY_TARGET` | Development-only Vite proxy target | `http://localhost:3001` |

Backend variables are read when Node starts:

| Variable | Use | Default |
| --- | --- | --- |
| `PORT` | HTTP listening port | `3001` |
| `DATABASE_PATH` | SQLite file path | `./data/tic-tac-toe.sqlite` |
| `CORS_ORIGIN` | Comma-separated exact browser origins allowed by CORS | `http://localhost:5173` |

Example local backend configuration:

```bash
PORT=3001 DATABASE_PATH=./data/tic-tac-toe.sqlite CORS_ORIGIN=http://localhost:5173 npm run dev:backend
```

Do not put secrets in the repository. The current application does not require an API key or other secret.

Vite loads frontend values from its supported environment files. The backend reads `process.env` directly and does not load `.env` files itself; export backend variables in the shell or configure them in the backend host. [`.env.example`](./.env.example) shows the local frontend defaults and backend variable names.

## Database and persistence

On startup, `openGameDatabase` creates the parent directory and opens the configured SQLite file. The schema creates `games`, `moves`, `request_records`, `scoreboard`, and `completion_events`, enables foreign keys, initializes the scoreboard row, and records schema version 3. The default file is `data/tic-tac-toe.sqlite`.

Games, move history, scoreboard values, and idempotency records survive backend restarts when the SQLite file is retained. Resetting a game creates a new active session while the old session remains marked `reset`; resetting the scoreboard only zeroes the scoreboard. Local SQLite files and journal files are ignored by Git. Tests use isolated temporary databases.

The backend must run on a host with a persistent writable filesystem for this design to work. A frontend-only Netlify deployment does not host the Express process or provide the required durable SQLite volume. Use a separate Node-capable backend host with persistent disk (or an externally managed database) and configure its HTTPS URL in the frontend; migrating that backend is outside this PR.

## API

Base path: `/api`. Mutation requests with JSON bodies require `Content-Type: application/json`; bodyless actions such as undo and reset do not.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Returns `{ "status": "ok" }`. |
| GET | `/docs` | Links to the OpenAPI JSON document. |
| GET | `/openapi.json` | Returns the generated OpenAPI document. |
| POST | `/games` | Creates a `two-player` or `computer` game. |
| GET | `/games/:gameId` | Retrieves a persisted game. |
| POST | `/games/:gameId/moves` | Validates and applies a move; computer mode may apply O in the same response. |
| POST | `/games/:gameId/undo` | Removes the permitted latest move(s). |
| POST | `/games/:gameId/reset` | Marks the old game reset and returns a new game. |
| GET | `/scoreboard` | Reads the current scoreboard. |
| POST | `/scoreboard/reset` | Sets all scoreboard counters to zero. |

Create a game:

```bash
curl -X POST http://localhost:3001/api/games \
  -H 'Content-Type: application/json' \
  -d '{"mode":"computer"}'
```

The `201` response is a complete game state, for example:

```json
{
  "id": "<game-id>", "mode": "computer",
  "board": [null, null, null, null, null, null, null, null, null],
  "currentPlayer": "X", "status": "active", "winner": null,
  "winningCells": [], "moveHistory": [], "canUndo": false
}
```

Submit a move using the returned ID. `requestId` is required so retrying the same request returns the confirmed result without duplicating the move or scoreboard effect:

```bash
curl -X POST http://localhost:3001/api/games/<game-id>/moves \
  -H 'Content-Type: application/json' \
  -d '{"player":"X","row":1,"column":1,"requestId":"move-1"}'
```

The `200` response contains the complete updated game. In computer mode it contains both the human X move and the selected O move in `moveHistory`. Undo returns the complete resulting game; two-player mode removes one move and computer mode removes the latest human/computer pair when present. Typical errors use `{ "error": { "code": "...", "message": "..." } }` and include `details.fields` for field validation errors. See [docs/api-contract.md](./docs/api-contract.md) and `/api/openapi.json` for the full shapes and status codes.

## Netlify frontend deployment

`netlify.toml` configures the existing Vite build:

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: 20

In Netlify, set `VITE_API_BASE_URL` to the public HTTPS backend URL plus `/api`, for example `https://api.example.com/api`, then trigger a new build. The backend must set `CORS_ORIGIN` to the exact Netlify site origin, for example `https://example.netlify.app` (comma-separate additional approved origins). The backend should itself be served over HTTPS; Netlify cannot make an HTTP backend safe or persistent.

There is no client-side router in this application, so no redirect rule is required for route refreshes. Netlify hosts only the static frontend here. A public deployment remains blocked until a separately hosted Express backend has a stable HTTPS URL, correct CORS configuration, and persistent SQLite storage.

## Quality commands

```bash
npm test                  # frontend Jest tests
npm run test:backend      # backend Vitest tests
npm run lint              # ESLint
npm run typecheck         # frontend and backend TypeScript checks
npm run build             # frontend production build in dist/
npm run build:backend     # backend JavaScript in server/dist/
```

For a production-like backend run:

```bash
npm run build:backend
PORT=3001 DATABASE_PATH=./data/tic-tac-toe.sqlite CORS_ORIGIN=https://your-netlify-site.netlify.app npm run start:backend
```

## Design decisions and review guide

- `App` composes `GameSection` and `ScoreboardSection`; the game feature owns game-session request sequencing, while the scoreboard refreshes after a server-confirmed completion.
- The backend owns rules and state so browser clients cannot bypass turn, coordinate, completion, or undo validation. React displays confirmed responses and disables controls while requests are pending.
- The API returns complete game snapshots after mutations, which keeps the client simple and makes reload/load-by-ID reliable. Reset creates a new ID so the prior session remains auditable.
- The computer strategy is intentionally small and deterministic rather than minimax: take an O win, block X, take center, take the first corner, then the first available cell. This is predictable and easy to test, at the cost of not being unbeatable.
- Undo is server-defined: one move in two-player mode, or the human/computer pair in computer mode. Completed games cannot be undone.
- Client-generated `requestId` values and persisted `request_records` make move retries idempotent. Completion events keyed by game ID prevent duplicate scoreboard increments.
- Repository writes use SQLite transactions and optimistic session versions, keeping board, move history, request records, and scoreboard updates consistent when a write fails or a stale session races with another write.
- Tests cover React rendering/interactions and API client behavior; backend tests cover contracts, validation, game rules, computer priorities, undo/reset, idempotency, persistence, transactions, and concurrency conflicts.
- AI tools were used during development for implementation assistance and review prompts. The resulting code was checked manually against the feature specifications and API contract, and by the automated tests, lint, type checks, and builds listed below.

If more time were available, the deployment would be completed on an approved persistent Node/SQLite host, followed by HTTPS smoke tests. Other improvements could include a stronger computer strategy, migrations for more schema versions, authenticated/private game ownership, and end-to-end tests against a deployed environment.

## Submission and reviewer checklist

Only check an item after performing it for the current commit.

- [ ] Dependencies install from a clean checkout.
- [ ] Backend starts successfully.
- [ ] Frontend starts successfully.
- [ ] Two-player mode works.
- [ ] Computer mode works.
- [ ] Undo follows the agreed rules.
- [ ] Game reset and scoreboard reset work independently.
- [ ] Tests, linting, type checks, and builds pass where configured.
- [ ] README instructions have been checked.
- [ ] No secrets or unintended local database files are committed.
- [ ] Netlify build settings are correct.
- [ ] GitHub Actions checks run successfully.
- [ ] Backend hosting and database persistence requirements are clear.
- [ ] The repository is accessible to the intended reviewers.
- [ ] The deployed application has been smoke-tested, if deployment is available.

Suggested demonstration: create a two-player game, make a legal sequence and undo; reset the game and show the scoreboard is unchanged; create a computer game and show the automatic response and pair undo; complete a win or draw and verify the scoreboard increments once; reset the scoreboard independently; reload a game by ID; and open `/api/health` and `/api/docs`.

## Verification status for this PR

Local verification is recorded in the PR description and should be reflected in the checklist only after the commands and smoke tests have actually been run. GitHub Actions and Netlify deployment status cannot be claimed from this repository alone; they depend on the remote repository/site settings and an available backend host.
