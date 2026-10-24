# ABB requirement-to-test matrix

Results below are from the verification run on 2026-10-24. Backend HTTP tests use a fresh temporary SQLite database per test. `PASS` means the scenario has an explicit passing test; `GAP` means the behavior is not yet directly covered.

| Area | Behavior verified | Test file / case | Result | Remaining gap or blocker |
| --- | --- | --- | --- | --- |
| Backend | Valid moves and turn switching | [`game-engine.test.ts`](../server/src/game-engine.test.ts), “makes valid moves and switches turns” | PASS | — |
| Backend | Invalid coordinates, wrong turn, occupied cell | [`game-engine.test.ts`](../server/src/game-engine.test.ts), validation cases | PASS | — |
| Backend | Every winning combination | [`game-engine.test.ts`](../server/src/game-engine.test.ts), “detects a win for line %s” | PASS | — |
| Backend | Draw resolution | [`game-engine.test.ts`](../server/src/game-engine.test.ts), draw case; [`api.test.ts`](../server/src/api.test.ts), “completes a draw over HTTP…” | PASS | — |
| Backend | No moves after win or draw | [`game-engine.test.ts`](../server/src/game-engine.test.ts), terminal-state case; [`api.test.ts`](../server/src/api.test.ts), completed undo case | PASS | — |
| Backend | Undo in two-player mode | [`api.test.ts`](../server/src/api.test.ts), “undoes an active two-player move…” | PASS | — |
| Backend | Undo in computer mode as a pair | [`game-service.test.ts`](../server/src/game-service.test.ts), computer response; [`api.test.ts`](../server/src/api.test.ts), computer undo case | PASS | — |
| Backend | Five computer priorities and deterministic tie-breaking | [`computer-strategy.test.ts`](../server/src/computer-strategy.test.ts), priority and row-major cases | PASS | — |
| Backend | Scoreboard wins, draws, and exactly-once counting | [`game-repository.test.ts`](../server/src/persistence/game-repository.test.ts), scoreboard case; [`api.test.ts`](../server/src/api.test.ts), draw replay case | PASS | — |
| Backend | Game reset and scoreboard reset are independent | [`api.test.ts`](../server/src/api.test.ts), “keeps a completed result when resetting…” | PASS | — |
| Backend | SQLite persistence across service instances | [`game-repository.test.ts`](../server/src/persistence/game-repository.test.ts), persistence case | PASS | — |
| Backend | Transaction rollback and recovery after failed operation | [`game-repository.test.ts`](../server/src/persistence/game-repository.test.ts), rollback and recovery cases | PASS | — |
| Backend | Unknown sessions and malformed API requests | [`game-service.test.ts`](../server/src/game-service.test.ts), missing session; [`api.test.ts`](../server/src/api.test.ts), malformed/content-type case | PASS | — |
| Integration | HTTP creation, retrieval, moves, persistence, resets, scoreboard, computer turns | [`api.test.ts`](../server/src/api.test.ts), all 8 REST flow cases | PASS | — |
| Frontend | Board rendering and accessible cell labels | [`GameBoard.test.tsx`](../src/components/GameBoard.test.tsx) | PASS | — |
| Frontend | Game mode selection and mode-specific UI | [`GameSection.test.tsx`](../src/features/game/GameSection.test.tsx), creation/loading and computer-turn cases | PASS | — |
| Frontend | Loading indicators, API errors, and request payloads | [`GameSection.test.tsx`](../src/features/game/GameSection.test.tsx), pending/failure cases; [`client.test.ts`](../src/api/client.test.ts), payload/error cases | PASS | — |
| Frontend | Current-player display and winning-cell highlighting | [`GameSection.test.tsx`](../src/features/game/GameSection.test.tsx), move and win cases | PASS | — |
| Frontend | Move history and Undo availability | [`GameSection.test.tsx`](../src/features/game/GameSection.test.tsx), history/undo cases | PASS | — |
| Frontend | Scoreboard values and reset confirmation | [`ScoreboardSection.test.tsx`](../src/features/scoreboard/ScoreboardSection.test.tsx) | PASS | — |
| Frontend | Failed actions, pending requests, and stale responses after session change | [`GameSection.test.tsx`](../src/features/game/GameSection.test.tsx), failure/duplicate/late-load cases; [`ScoreboardSection.test.tsx`](../src/features/scoreboard/ScoreboardSection.test.tsx), reset failure/pending cases | PASS | No separate stale move-vs-reset case; controls intentionally prevent that overlap. |

## Verification commands

- `OPENSSL_CONF=/dev/null node_modules/.bin/jest --runInBand` — PASS, 5 suites / 26 tests.
- `OPENSSL_CONF=/dev/null node_modules/.bin/vitest run --config server/vitest.config.ts` — PASS, 6 files / 59 tests.
- `OPENSSL_CONF=/dev/null node_modules/.bin/eslint . --ext .ts,.tsx --ignore-pattern dist --ignore-pattern server/dist` — PASS.
- `OPENSSL_CONF=/dev/null node_modules/.bin/tsc --noEmit && OPENSSL_CONF=/dev/null node_modules/.bin/tsc --noEmit -p server/tsconfig.json` — PASS.
- `OPENSSL_CONF=/dev/null node_modules/.bin/tsc -b && OPENSSL_CONF=/dev/null node_modules/.bin/vite build` — PASS.
- `OPENSSL_CONF=/dev/null node_modules/.bin/tsc -p server/tsconfig.json` — PASS.
- `OPENSSL_CONF=/dev/null node_modules/.bin/jest --runInBand --coverage` — PASS, 91.02% statements / 82.7% branches.
- `OPENSSL_CONF=/dev/null node_modules/.bin/vitest run --config server/vitest.config.ts --coverage` — NOT RUN: `@vitest/coverage-v8` is not installed.

The first sandboxed backend attempt reported `listen EPERM` for Supertest’s loopback listener. The same command was rerun with the required local-loopback permission and passed; this was an environment restriction, not a product or test failure.
