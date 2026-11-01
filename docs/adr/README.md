# Architecture Decision Records (ADRs)

Use this folder for implementation decisions that affect correctness, persistence, finance semantics or security.

## Template

```markdown
# ADR-NNN — Short descriptive decision

Status: Proposed | Accepted | Superseded
Date: YYYY-MM-DD
Related requirements: BR-*, HB-*, F-*

## Context
What is uncertain, including a minimal scenario?

## Decision
The exact implementation-level behavior and invariants.

## Alternatives considered
Benefits, risks and why each was rejected.

## Consequences
Schema/API/test impact, security and migration implications.

## Verification
Synthetic scenario IDs, test names and exact results (if executed).
```

First ADR: [0001-checkpoints-and-allocations.md](0001-checkpoints-and-allocations.md), **Accepted** (corrected D32..D35 re-acceptance after owner-reported repeated independent review). Original revision2 was Accepted after owner-reported review;D32..D35 supersedes its signed cash allocation interpretation. Current A>=0,sum(A)=actual B>=0,full R/S and optional non-posting detail are accepted in the corrected contract;original evidence remains archived.

Second ADR: [0002-month-closing-and-corrections.md](0002-month-closing-and-corrections.md), **Accepted** (corrected D32..D35 re-acceptance after owner-reported repeated independent review). Original acceptance of46 scenarios is retained. Corrected cash examples preserve two-cut selection,immutable versions,explicit ordinary CARRY/FRESH_START,full earmarks and missed-month behavior. Multi-source CARRY remains excluded;negative F is valid,negative A is not. No migration/runtime work.

Third ADR: [0003-daily-forecast-and-liquidity.md](0003-daily-forecast-and-liquidity.md), **Accepted**,HB-003 Done. Input cash is nonnegative;budget free/deficit/guideline formulas unchanged. D36 selects option B safe main guidance over all periods;D37..D39 settles stale display,informational warnings and age>=7 reminder;preserved formula/specification is Accepted following owner-reported final independent review. Scenario sets:[HB1](../../tests/scenarios/phase-01/hb-001-checkpoints-and-allocations.md),[HB2](../../tests/scenarios/phase-01/hb-002-month-closing-and-corrections.md),[HB3](../../tests/scenarios/phase-01/hb-003-daily-forecast.md),[correction regressions](../../tests/scenarios/phase-01/hb-003-allocation-correction.md). ADR0001/0002 re-acceptance is owner-confirmed;ADR0003 final acceptance and HB-003 completion are owner-confirmed;Q-HB1-01 is resolved.
