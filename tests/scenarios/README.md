# Acceptance scenario contract

Scenarios use **synthetic** EUR values. They are normative behavioral expectations that Codex should convert into deterministic automated tests. In an implementation PR, map every scenario ID to one or more executable test files, state what ran, and capture any gaps.

Start: tests/scenarios/phase-01/core-rules.md. Add new scenarios per phase/issue, do not overwrite existing specs silently.

Scenario format: ID, preconditions, actions, expected observed bank balance, reserve/free, period allocations, history, and negative checks (what MUST NOT happen).
