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

First ADR: [0001-checkpoints-and-allocations.md](0001-checkpoints-and-allocations.md), revision 2 with final observation-date/statistics clarifications under HB-001; **Accepted** after owner-reported independent review and approval. The model selects checkpoint-first full allocations, confirmed transfer and incomplete-data closing. HB-002 details closing/history, HB-003 final forecast. Future ADRs still require explicit owner approval.
