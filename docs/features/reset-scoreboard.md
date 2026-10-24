# Feature: Reset Scoreboard

- Status: Proposed
- Depends on: Scoreboard
- Planned branch: `feature/reset-scoreboard`

## Objective

Start a new scoreboard period without changing the current game or deleting history.

## Behavior and rules

- `POST /api/scoreboard/reset` sets X wins, O wins, and draws to zero.
- The active game, completed game, and move history remain unchanged.
- Historical database records are not deleted.

## Acceptance criteria

- [ ] All displayed counters become zero.
- [ ] Current board and move history are unchanged.
- [ ] Historical games and moves remain queryable by persistence tests.
- [ ] Repeated reset is safe.

## Test plan

- API and persistence tests for preservation behavior.
- React test confirms only scoreboard state changes.
