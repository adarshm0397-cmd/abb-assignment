# ABB Tic Tac Toe

A full-stack Tic Tac Toe application built with React, TypeScript, Vite, Node.js, Express, and SQLite.

## Current status

The frontend and backend are connected through Vite's `/api` development proxy. The backend exposes the complete game, move, undo, reset, scoreboard, health, and OpenAPI endpoints.

## Requirements

- Node.js 20 or newer
- npm 10 or newer

## Install dependencies

```bash
npm install
```

## Run the applications

Run the frontend and backend together:

```bash
npm run dev
```

Run them separately:

```bash
npm run dev:frontend
npm run dev:backend
```

The frontend runs on Vite's default development port. The backend runs on `http://localhost:3001` by default.

The frontend proxies `/api/*` to the backend, so requests from `http://localhost:5173` work without CORS or a separate frontend configuration. The backend health check is available at `GET /api/health`. The game API is documented at `GET /api/docs` (OpenAPI JSON is available at `GET /api/openapi.json`). Set `DATABASE_PATH` to choose the SQLite file and `CORS_ORIGIN` to a comma-separated list of allowed browser origins.

### API quick check

With `npm run dev` running, these commands exercise the API through the same URL used by the frontend:

```bash
curl http://localhost:5173/api/health
curl -X POST http://localhost:5173/api/games \
  -H 'Content-Type: application/json' \
  -d '{"mode":"two-player"}'
curl http://localhost:5173/api/scoreboard
```

Use the game ID returned by the create request for `GET /api/games/:gameId`, `POST /api/games/:gameId/moves`, `POST /api/games/:gameId/undo`, and `POST /api/games/:gameId/reset`. The backend can also be called directly at `http://localhost:3001/api/*`.

## Local SQLite database

The persistence layer is independent of HTTP handling. Create and open a database with `openGameDatabase`, for example:

```ts
const database = openGameDatabase('./data/tic-tac-toe.sqlite');
const repository = new SqliteGameSessionRepository(database);
const service = new GameService(repository);
```

The first open creates the `games` and `moves` tables and sets schema version 1. The schema uses SQLite foreign keys, check constraints, a unique position per game, and parameterized statements. `SqliteGameSessionRepository.save` updates the game row and replaces its move rows in one transaction.

To reset a development database, stop the backend and remove the explicitly configured database file (or the local `data/` directory):

```bash
rm -f data/tic-tac-toe.sqlite
```

Database files, SQLite journals, and the `data/` directory are ignored by Git. Tests create isolated temporary database files and remove them after each test.

## Feature specifications

The implementation is specification-driven. The feature index, reusable template, dependencies, acceptance criteria, API contracts, persistence rules, and test plans are maintained in [docs/README.md](./docs/README.md).

## Quality checks

```bash
npm test
npm run test:backend
npm run typecheck
npm run lint
npm run build
npm run build:backend
```

## Planned behavior

- Reset Game will clear the active board and move history without resetting the scoreboard.
- Reset Scoreboard will zero the displayed scoreboard without deleting historical games or moves.
- The backend will remain authoritative for validation, turns, outcomes, computer moves, undo, and scoreboard updates.

## Project structure

```text
src/                  React frontend
server/src/           Express backend
vite.config.ts        Vite configuration
tsconfig*.json        Strict TypeScript configuration
jest.config.ts        Frontend test configuration
```
