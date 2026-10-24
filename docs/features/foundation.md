# Feature: Project foundation

- Status: Implemented pending dependency verification
- Depends on: None
- Planned branch: `feature/project-foundation`

## Objective

Provide the frontend, backend, TypeScript, test, lint, and build foundation required for all later features.

## Scope

Included: Vite React frontend, Express TypeScript backend, strict TypeScript, health check, test configuration, and developer scripts.

Excluded: game rules, SQLite persistence, game endpoints, and user-facing gameplay.

## Acceptance criteria

- [ ] Frontend starts with Vite.
- [ ] Backend starts independently and exposes `GET /api/health`.
- [ ] TypeScript is strict in frontend and backend.
- [ ] Test, lint, type-check, and build commands are documented.
- [ ] No game behavior is implemented in this phase.

## Test plan

- Frontend smoke test renders the foundation screen.
- Backend health-check integration test returns `{ "status": "ok" }`.
- Run `npm test`, `npm run test:backend`, `npm run typecheck`, `npm run lint`, and both builds.

## Open questions

- Dependency installation and lockfile regeneration must be verified in an environment with npm available.
