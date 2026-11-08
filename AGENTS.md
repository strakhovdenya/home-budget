# Home Budget — Codex instructions

You are working on a **specification-first financial product**. This file is the Codex counterpart of a compact CLAUDE.md; do **not** create a Claude runtime.

**Product principle:** Home Budget shows available money from the last confirmed financial state with the real bank-check date, and lets the user reconstruct saved financial states. Unknown movements and balances remain unknown. See [PRD](docs/PRD.md) and [current owner decisions](docs/DECISIONS.md#saved-financial-history-and-evidence-scope--2026-11-08). Complete user-accessible history is MVP scope (HB-019.2), separate from extended analytics (HB-022).

**Read before work:** docs/PRD.md (WHAT), docs/BUSINESS_RULES.md (normative domain behavior), docs/IMPLEMENTATION_PLAN.md (phases), docs/TASKS.md (stable HB-* issue IDs), docs/ARCHITECTURE.md, docs/DATA_MODEL.md, docs/conventions.md, docs/AGENT_FACTORY.md.

**Execution order:** Choose **one Ready HB-* task** from docs/TASKS.md, read its BR and scenario links, propose scoped changes and proof before coding. The original bootstrap began with **HB-001**; follow the current task register and the owner-authorized scope now. Do not implement all milestones in one PR. Only mark task Done after reviewed changes and *actual* test evidence. Linked GitHub Issues are optional; docs/TASKS.md is the initial task register.

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

Additional project-local Codex skills: use `.agents/skills/vercel-react-best-practices/SKILL.md` for React/Next.js work, `.agents/skills/security-best-practices/SKILL.md` for server authorization, and `.agents/skills/web-design-guidelines/SKILL.md` for the login page. Read relevant references before use; inspect scripts before running them. Project ADRs, architecture and installed Next.js APIs take precedence over generic skill advice. Do not add libraries or change architecture merely to follow a skill.
