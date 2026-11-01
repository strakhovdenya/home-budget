# Home Budget — Codex instructions

You are working on a **specification-first financial product**. This file is the Codex counterpart of a compact CLAUDE.md; do **not** create a Claude runtime.

**Read before work:** docs/PRD.md (WHAT), docs/BUSINESS_RULES.md (normative domain behavior), docs/IMPLEMENTATION_PLAN.md (phases), docs/TASKS.md (stable HB-* issue IDs), docs/ARCHITECTURE.md, docs/DATA_MODEL.md, docs/conventions.md, docs/AGENT_FACTORY.md.

**Execution order:** Choose **one Ready HB-* task** from docs/TASKS.md, read its BR and scenario links, propose scoped changes and proof before coding. Begin with **HB-001**, a domain ADR + test-scenario task. Do not implement all milestones in one PR. Only mark task Done after reviewed changes and *actual* test evidence. Linked GitHub Issues are optional; docs/TASKS.md is the initial task register.

Rules:
1. Keep user-entered balance checkpoints authoritative. Closing a bill releases its reserve; **never automatically debit the bank balance**. The user confirms a fresh balance in the same budget update.
2. Calendar bank date and financing budget month are separate. No future-month income inflating current-month daily forecast.
3. Full reserves for unpaid obligations; no partial reservation. Partial **payments** are allowed, remaining amount remains fully reserved.
4. Every meaningful change is recorded as an auditable event. Month closing is versioned; corrections must not erase the original report.
5. Do not treat checkpoint differences as confirmed income/expenses. Bank statement import must not double count them.
6. Money is integer minor units (EUR cents), dates use Europe/Berlin calendar semantics. No floating money math.
7. Web app only — do not add PWA, service worker or offline cache.
8. Never commit real user bank figures, bank PDFs, identifiers, secrets, or production exports. Synthetic fixtures only.
9. Test finance invariants and scenario specs before changing UI. Use narrow, reviewable changes.
10. Document ambiguity in docs/OPEN_QUESTIONS.md and ask for a decision before implementing risky assumptions.

Work loop: requirement → small HB-* task/spec → scenarios/tests → implementation → self-review → independent review where available → report exact evidence. Do not claim tests passed unless run.

Skills: .agents/skills/ contains nine original Codex adaptations of Dark Factory's project scaffolding workflows plus project finance verification. Consult docs/CODEX_WORKFLOW.md.
