# ABB Tic Tac Toe

A full-stack Tic Tac Toe application built with React, TypeScript, Vite, Node.js, Express, and SQLite.

## Current status

The backend includes a standalone game engine and SQLite persistence layer. The frontend currently renders a placeholder screen and the backend still exposes only its health-check endpoint.

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

The backend health check is available at `GET /api/health`. The game API is documented at `GET /api/docs` (OpenAPI JSON is available at `GET /api/openapi.json`). Set `DATABASE_PATH` to choose the SQLite file and `CORS_ORIGIN` to a comma-separated list of allowed browser origins.

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
