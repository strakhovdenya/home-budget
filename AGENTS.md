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

**Practical UI QA — owner D62, 2026-11-17:** verify desktop mouse and phone touch flows, readable text/amounts/chart labels (including dark mode), working controls/errors/retries, no overlap/clipping/horizontal overflow, RU/DE/EN and light/dark themes, and exact financial information. Separate keyboard suites, screen readers, formal WCAG/ARIA audits, zoom200%, physical accessibility devices and live OS theme switching are not default acceptance gates unless explicitly requested. Preserve existing semantics, keyboard support and tests. This changes future QA scope, not historical results or financial/auth/privacy/release gates. See [D62](docs/DECISIONS.md#practical-ui-qa--owner-2026-11-17).

Additional project-local Codex skills: use `.agents/skills/vercel-react-best-practices/SKILL.md` for React/Next.js work, `.agents/skills/security-best-practices/SKILL.md` for server authorization, and `.agents/skills/web-design-guidelines/SKILL.md` for the login page. Read relevant references before use; inspect scripts before running them. Project ADRs, architecture and installed Next.js APIs take precedence over generic skill advice. Do not add libraries or change architecture merely to follow a skill.

## Code quality skills / Scope discipline

Third-party guidance from `pproenca/dot-skills`, pinned at `cf93c57cac89d6fc3e4194686000411567f5caf3`; `clean-code-ts-react` is experimental. Priority: owner authorization > BUSINESS_RULES/ADRs > architecture/security > AGENTS.md/project conventions > third-party skills.

- Use [clean-code-ts-react](.agents/skills/clean-code-ts-react/SKILL.md) for new backend/frontend TypeScript, React/Next.js, domain/application code and new tests.
- Before handing off an authorized coding task, use [code-simplifier](.agents/skills/code-simplifier/SKILL.md) to review readability and report completion. Scope is only that task's new/directly edited hunks, excluding pre-existing dirty work, neighboring code and the rest of a touched file.
- Neither installation nor review authorizes automatic refactoring, rewriting, reformatting, fix-all or scanning old code for cleanup. Improve existing production code only within the directly edited, authorized portion while preserving behavior.
- Existing tests are protected: no style-driven refactoring, simplifying, formatting, rewriting, recreating, deleting or changing assertions/fixtures/mocks. Changes require an independent functional reason, explicit scope and evidence; never adjust an old test merely to make changed production code pass. New tests follow the guidance.
- Clarity outranks brevity, generation speed, line counts, diff size and token cost. Use semantic names, normal multiline layout, explicit if/guard clauses, clear error handling and reasonable function boundaries; do not compress code.
- No nested ternaries or ternary control logic for auth, validation, errors, state or financial decisions. A simple, obvious pure-expression ternary is allowed. JSX rendering advice does not prescribe Server Action control flow.
- No helpers, generic abstractions, universal layers or API variants without demonstrated benefit. Do not mechanically split functions or extract every duplicate. Preserve throw/Result, null/undefined, side-effect order, idempotency and external contracts, including receipts and atomic operations.
- Financial invariants, H/K and historical versions, authorization/ownership, integer EUR cents, Berlin dates, strict types/contracts and test evidence take precedence. Preserve deliberate safe error boundaries; do not add sensitive logging, telemetry or rethrows just to follow generic advice.
- Interpret upstream CLAUDE.md references as this AGENTS.md; create no Claude runtime. Skills authorize no extra tools, dependencies, configuration, production access or commit/push/deploy. Verification uses synthetic data and approved isolated environments only.
