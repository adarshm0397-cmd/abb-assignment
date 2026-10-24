# Feature: Computer strategy

- Status: Proposed
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

## Acceptance criteria

- [ ] A winning move beats every lower-priority option.
- [ ] Blocking X beats center, corner, and fallback choices.
- [ ] Center is selected when no win or block exists and is available.
- [ ] Corners precede non-corner cells.
- [ ] The fallback is deterministic.

## Test plan

- Pure strategy unit tests for every priority and tie-breaker.
- API tests confirm computer moves are included in computer-mode responses.
- Regression tests confirm computer moves cannot violate validation rules.
