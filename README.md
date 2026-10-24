# ABB Tic Tac Toe

A full-stack Tic Tac Toe application built with React, TypeScript, Vite, Node.js, Express, and SQLite.

## Current status

The project foundation is complete. The frontend currently renders a placeholder screen and the backend exposes a health-check endpoint. Game rules and persistence will be implemented in later phases.

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

The backend health check is available at `GET /api/health`.

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
