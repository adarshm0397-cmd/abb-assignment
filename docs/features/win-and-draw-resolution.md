# Feature: Win and draw resolution

- Status: Proposed
- Depends on: Move validation and turns
- Planned branch: `feature/win-and-draw-resolution`

## Objective

Resolve a game on the server when a move produces a win or fills the board.

## Behavior and rules

- Detect all three rows, three columns, and two diagonals.
- A win records the winner and the exact winning cells.
- A full board with no winner becomes a draw.
- Resolution happens immediately after the move that causes it.
- No further moves or undo operations are allowed after resolution.

## Acceptance criteria

- [ ] Every winning line is detected.
- [ ] Winning cells are returned in the response.
- [ ] Full non-winning boards become draws.
- [ ] Completed games reject further changes.

## Test plan

- Unit tests for eight winning lines and draw boards.
- API tests for win, draw, and post-completion requests.
- Frontend tests for winning-cell presentation once the UI exists.
