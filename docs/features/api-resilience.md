# Feature: API resilience and consistency

- Status: Proposed
- Depends on: All API features
- Planned branch: `feature/api-resilience`

## Objective

Prevent duplicate, stale, failed, or out-of-order requests from producing inconsistent UI or persisted state.

## Behavior and rules

- The backend validates every state transition.
- Client requests include a unique request ID where mutation retries are possible.
- Duplicate request IDs are idempotent.
- Frontend renders only the latest server-confirmed state.
- Failed mutations preserve the last confirmed board and scoreboard.
- Loading state prevents conflicting user actions.
- Structured error responses are safe to display and useful for debugging.

## Acceptance criteria

- [ ] Duplicate move submissions do not duplicate moves or scores.
- [ ] Stale responses cannot overwrite a newer confirmed state.
- [ ] Network failures leave the UI consistent with the last confirmed response.
- [ ] Every expected API failure has a documented error code.

## Test plan

- API idempotency and concurrency-oriented tests.
- Frontend tests for rejected requests, retries, and stale responses.
- Manual verification using browser network throttling.
