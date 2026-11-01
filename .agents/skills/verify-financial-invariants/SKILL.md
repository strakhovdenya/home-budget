---
name: verify-financial-invariants
description: Use for any finance engine change or release to independently verify balance checkpoints, reserves, month allocation and history against user-approved scenarios.
---
# Financial correctness verification
1. Review docs/BUSINESS_RULES.md BR-01..BR-11, docs/DATA_MODEL.md and tests/scenarios/phase-01/core-rules.md.
2. Inspect code and test names; generate a checklist mapping every touched BR rule to assertions.
3. Verify: paid status never auto-debits balance; full reserve only; future income isolated; advance spend and split allocations net to one physical movement; carryover not doubled; closed snapshot versions immutable.
4. Exercise 1-cent rounding cases, month end leap years, Europe/Berlin daylight saving, backdated update, idempotent retry, bad/unauthorized account ids.
5. Run relevant lint/typecheck/test/integration/e2e commands if present; record **exact** results. Do not report unrun checks as passing.
6. Read-only reviewer by default: report findings with severity and repro; do not change code unless asked as a separate implementation task.
7. No real customer data in tests, logs or screenshots.
