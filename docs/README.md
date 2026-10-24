# Feature specifications

These documents are the working specifications for ABB Tic Tac Toe. Each feature document is intended to be read before implementation and updated when an approved behavior changes.

## How to use the specifications

1. Read the feature specification and its dependencies before creating a branch.
2. Resolve every open question before implementation.
3. Treat the acceptance criteria as the minimum definition of done.
4. Add or update automated tests for each acceptance criterion.
5. Record implementation notes, deviations, and verification results in the PR.
6. Update the specification only through review when behavior changes.

## Feature index

| Feature | Specification | Planned PR |
|---|---|---|
| Project foundation | [foundation.md](./features/foundation.md) | PR 1 |
| Game sessions and modes | [game-sessions-and-modes.md](./features/game-sessions-and-modes.md) | PR 2 |
| Move validation and turns | [move-validation-and-turns.md](./features/move-validation-and-turns.md) | PR 3 |
| Win and draw resolution | [win-and-draw-resolution.md](./features/win-and-draw-resolution.md) | PR 4 |
| Computer strategy | [computer-strategy.md](./features/computer-strategy.md) | PR 5 |
| Move history | [move-history.md](./features/move-history.md) | PR 6 |
| Undo | [undo.md](./features/undo.md) | PR 7 |
| Scoreboard | [scoreboard.md](./features/scoreboard.md) | PR 8 |
| Reset Game | [reset-game.md](./features/reset-game.md) | PR 9 |
| Reset Scoreboard | [reset-scoreboard.md](./features/reset-scoreboard.md) | PR 10 |
| Accessibility and responsive UI | [accessibility-and-responsive-ui.md](./features/accessibility-and-responsive-ui.md) | PR 11 |
| API resilience and consistency | [api-resilience.md](./features/api-resilience.md) | Cross-cutting |
| SQLite persistence | [sqlite-persistence.md](./features/sqlite-persistence.md) | Cross-cutting |

## Specification status

`Proposed` means the behavior is documented but not yet approved for implementation. `Approved` means the behavior may be implemented in the relevant PR. `Implemented` should only be set after the PR and its verification are complete.
