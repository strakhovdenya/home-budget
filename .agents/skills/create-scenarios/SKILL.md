---
name: create-scenarios
description: Author acceptance scenario specifications for a phase or issue, especially financial invariants and reconciliation edge cases.
---
# Scenario specifications
1. Read docs/BUSINESS_RULES.md and existing tests/scenarios/phase-01/core-rules.md.
2. For specified issue/phase create tests/scenarios/phase-NN/slug.md without overwriting earlier specs.
3. Each scenario includes ID, precise GIVEN state (bank card, active full reserve, savings, periods and dates), WHEN update, THEN physical balance, reserves/free, period allocation and history.
4. Include negative assertions: no double bank debit, no future income leaking into current forecast, no duplicate PDF imported cash, no overwrite of closed month versions.
5. Use synthetic values only. EUR cents exact; Europe/Berlin days, inclusive day count and floor rounding.
6. Hand scenarios to implementer and functional reviewer independently. Tests must be executable later, not just prose 'works'.
7. Mark gaps and assumptions openly.
