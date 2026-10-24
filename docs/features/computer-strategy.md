# Feature: Computer strategy

- Status: Implemented
- Depends on: Move validation and turns, win and draw resolution
- Planned branch: `feature/computer-strategy`

## Objective

Select the computer's O move on the backend using the required deterministic priority order.

## Behavior and rules

Priority is strictly:

1. Win if possible.
2. Block X's immediate win.
3. Take the center.
4. Take a corner.
5. Take any available cell.

The computer never chooses an occupied cell or moves after completion. Ties within a priority use stable row-major ordering.

```text
chooseComputerMove(board):
  if board is terminal or full: return no move
  if O can win in one empty cell: return first such cell
  if X can win in one empty cell: return first such cell
  if center is empty: return center
  if a corner is empty: return first corner in fixed order
  return first empty cell in row-major order
```

For example, `O O _ / X X _ / _ _ _` selects the top-right winning cell;
`X X _ / O _ _ / _ _ _` blocks at top-right; `X _ _ / _ _ _ / _ _ O`
selects the center; `X O _ / O X X / _ _ O` selects the top-right corner;
and `X _ O / _ O X / X _ O` selects the first remaining cell, top-middle.

## Deterministic tie-breaking

All tactical and fallback candidates are considered in row-major order (top to bottom, then left to right). The center is checked before corners, and corners use the fixed order top-left, top-right, bottom-left, bottom-right.

## Transaction and UI behavior

The service applies the human move and, if the game remains active, the selected O move before calling the repository. The repository saves the resulting session, move history, request record, and completion effect in one SQLite transaction. If strategy selection or move validation fails, the service returns `500 INTERNAL_ERROR` and does not save the human move. React submits only X moves and renders the complete session returned by the server.

## Acceptance criteria

- [x] A winning move beats every lower-priority option.
- [x] Blocking X beats center, corner, and fallback choices.
- [x] Center is selected when no win or block exists and is available.
- [x] Corners precede non-corner cells.
- [x] The fallback is deterministic.

## Test plan

- Pure strategy unit tests for every priority and tie-breaker.
- API tests confirm computer moves are included in computer-mode responses.
- Regression tests confirm computer moves cannot violate validation rules.
