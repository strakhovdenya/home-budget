# Home Budget

**A personal budgeting app built around confirmed balances—not a perfect record of every purchase.**

Most expense trackers ask you to reconstruct where your money went. Home Budget starts with a simpler, verifiable fact: **how much is actually on your bank card right now?** You confirm that balance, allocate it across months, and see what remains safe to spend after obligations and savings are protected. Recording individual transactions is optional.

This is a personal engineering project exploring a practical question: **how do you build trustworthy financial software when the input data is intentionally incomplete?** The answer is explicit user confirmation, conservative calculations, immutable history, and clear treatment of what is *unknown*.

## The product at a glance

- **Reconcile on your schedule.** Confirm a real card balance whenever convenient; no daily expense-entry requirement.
- **Plan across months.** Assign all confirmed money to budget months, including money set aside for a future month. Expected income is never treated as available cash.
- **Protect commitments.** Reserve the full unpaid amount of bills and selected potential claims; track savings separately. Payments do not debit the confirmed bank balance a second time.
- **Make safer spending decisions.** A daily spending limit protects obligations and savings across *all* funding months, not only the currently viewed month.
- **Keep an explainable history.** Explore actual checkpoints, later corrections, monthly closing versions, and read-only analytics without inventing transactions or intermediate balances.
- **Use it in your language.** Responsive desktop/mobile interface with Russian, German, and English localization and light/dark/system themes.

**Scope and status.** The checkpoint, obligation, savings, forecasting, budget-update, month-closing, saved-history, recurring-template, and read-only analytics features have been implemented and owner-accepted. The app is designed for one allowlisted user and one tracked bank card—not public sign-up or multi-bank synchronization. Optional categories/export and PDF statement processing are future work. See the [task register](docs/TASKS.md) for the authoritative status and accepted limitations.

---

## Engineering deep dive

### Architecture: a deliberately modular monolith

Home Budget uses **Next.js App Router, React, TypeScript, and MUI** for the web experience; **PostgreSQL and Drizzle** for persistence; **Auth.js / Google OAuth** with an explicit allowlist; and **Vitest, PostgreSQL integration tests, and GitHub Actions** for verification. Neon is the selected PostgreSQL provider, and Vercel is the deployment target.

The architecture favors one deployable application with enforceable internal boundaries over premature microservices:

```text
src/app/                 Next.js routes, authenticated entry points
    ↓
src/features/            UI and application-level orchestration
    ↓
src/domain/              Pure finance rules, state transitions, projections
    ↑
src/infrastructure/      Persistence/auth adapters implementing domain ports

src/shared/pure/         Framework-independent money, date, and other primitives
drizzle/                 Versioned PostgreSQL migrations
tests/scenarios/         Normative, traceable acceptance specifications
```

The domain does not depend on React, Next.js, MUI, or the ORM. Import-boundary tests and explicit architectural contracts guard this separation. Server Actions compose authorization, use cases, and transactional adapters; the browser is never the authority for account ownership or financial invariants.

**Design trade-off:** a small, well-factored monolith is easier to reason about and audit here than a distributed system. Financial correctness takes priority over infrastructure complexity.

### Financial model: facts before assumptions

Each checkpoint records an **actually observed** bank-card balance and a **complete, confirmed** allocation of that money:

| Symbol | Meaning |
| --- | --- |
| `B` | Confirmed bank balance |
| `A[p]` | Money allocated to budget period `p` |
| `R[p]` | Full reserves for selected, unpaid obligations |
| `S[p]` | Savings assigned to that period |
| `F[p]` | Free budget: `A[p] - R[p] - S[p]` |

The non-negotiable invariants are `B >= 0`, `A[p] >= 0`, and **`sum(A) = B`**. Negative free budget is allowed: an obligation does not disappear just because cash is insufficient. Money is represented as **checked 64-bit integer EUR cents** (`bigint` in TypeScript, decimal strings at API boundaries), not floating-point currency.

A payment changes the outstanding obligation and its reserve; it **does not deduct money from the card again**. Differences between checkpoints are never automatically labelled income or spending. Possible obligations contribute to reserves only after explicit selection, and partial payments keep the remaining amount fully reserved.

#### All-period safe spending limit

The primary daily limit protects not only the current month's obligations but also money already allocated or reserved for *other* months:

```text
E[p] = R[p] + S[p]
T    = E[current] + sum(max(A[p], E[p])) for every p != current
L    = B - T

safeAvailable  = max(0, L)
safeDailyLimit = safeAvailable div remainingCalendarDays
```

The day count includes today and follows the **Europe/Berlin** calendar, including DST and leap-year boundaries. Using `max(A, E)` for other months is intentional: their protected allocation and commitments must not be double-counted. An ordinary period-only budget estimate is secondary to this conservative limit.

### Historical correctness and auditability

An observed date and the date a fact was *recorded* are different. The model retains immutable checkpoints, complete allocation revisions, obligation/savings lifecycle events, audit evidence, and versioned month-closing snapshots.

Historical reading distinguishes:

1. **`state(H, K)`** — the state through historical date `H`, using only evidence known at recorded cutoff `K`.
2. **Later-corrected history** — the same historical date with a later, explicit knowledge cutoff.
3. **An immutable closing version** — a saved report with pinned source revisions and historical cutoffs.

A backdated correction does not overwrite the original report or silently replace a newer valid bank checkpoint. Unknown balances and missing transaction detail remain **unknown**, never zero or interpolated. The supported history interface has calendar-day precision; exact reconstruction after every individual same-day event is explicitly deferred rather than claimed.

Read paths use owned, consistent database snapshots. Financial writes are scoped to the authenticated owner/account and committed under an account lock, with input validation, immutable before/after audit, optimistic revision checks, and **idempotent request receipts**. Failed writes roll back; an uncertain commit outcome is resolved from the original request instead of blindly replaying a new one.

Month transitions are also deliberate: **FRESH_START, CARRY, and DEFER** are distinct, user-confirmed choices. None is performed merely because a new calendar month begins. Recurring templates propose obligations; creating or declining a monthly instance is explicit and auditable.

### Verification: executable contracts, not just a green test count

The CI pipeline runs lint, strict typechecking, unit/component tests, a production build, PostgreSQL migrations (including reapplication), integration tests against a disposable PostgreSQL service, and calendar-sensitive tests under an alternative host timezone. A separate **finance coverage gate** maps normative business scenarios to concrete executed test identities and rejects missing, skipped, failed, or stale evidence.

For scale, the **documented HB-021 acceptance run (16 November 2026)** recorded:

| Evidence | Recorded result |
| --- | ---: |
| Unit and component tests | 1,170 passed |
| PostgreSQL integration tests | 544 passed |
| Alternate-timezone test replay | 552 passed |
| Finance coverage manifest | 596 scenarios / 803 proof obligations / 1,171 test references |

These are **dated execution results, not a live count on the latest commit**. The timezone run deliberately repeats a subset of the unit tests and must not be added to the unique-test total. A passing suite establishes specific tested guarantees, not the absence of all bugs. See the [HB-021 acceptance record](docs/TASKS.md#hb-021--core-browser-e2e-a11y-and-responsive-qa), [financial verification design](docs/planning/hb-015-finance-tests-ci.md), and [CI workflow](.github/workflows/ci.yml).

The verification focus includes money conservation, full reserves, no double debit, history/version consistency, authorization and account isolation, race conditions, retries/unknown commits, integer overflow, timezone boundaries, and read paths without hidden financial writes.

### Technology choices

| Concern | Choice |
| --- | --- |
| Application | Next.js App Router, React, strict TypeScript |
| Interface | MUI, responsive layouts, next-intl (RU / DE / EN) |
| Identity | Auth.js, Google OAuth, allowlisted access, server-side account checks |
| Persistence | PostgreSQL (Neon-compatible), Drizzle, SQL constraints and migrations |
| Correctness | Pure domain functions, `bigint` cents, explicit Berlin dates, immutable revisions |
| Testing | Vitest, real PostgreSQL integration, synthetic fixtures, scenario-to-test evidence |
| Delivery | pnpm lockfile, GitHub Actions, Vercel deployment target |

### Run locally

**Requirements:** a supported Node.js version (`^22.13.0 || ^24.0.0 || >=26.0.0`) and **pnpm 12.16.1**.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

The application starts on [localhost:3000](http://localhost:3000) by default. Authenticated financial workflows require local configuration for Google authentication and PostgreSQL; follow [AUTH.md](docs/AUTH.md) and the [database runbook](docs/DATABASE.md). **Do not use production secrets or real financial data for tests.**

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration  # requires an explicitly configured isolated test PostgreSQL
pnpm build
```

The integration runner is intentionally separate from ordinary unit tests. The project also includes scoped [Codex quality hooks](docs/CODE_QUALITY_HOOKS.md); these are developer guardrails, not a substitute for executable financial verification.

### Source of truth and project decisions

- [Product requirements](docs/PRD.md) — problem, workflows, and scope
- [Normative financial rules](docs/BUSINESS_RULES.md) and [accepted ADRs](docs/adr/) — invariants and algorithms
- [Architecture](docs/ARCHITECTURE.md), [data model](docs/DATA_MODEL.md), and [database contract](docs/DATABASE.md)
- [Task register](docs/TASKS.md), [decision log](docs/DECISIONS.md), and [acceptance scenarios](tests/scenarios/README.md)

**Privacy by design:** this repository contains code, specifications, and synthetic test data—not personal bank statements, real balances, account identifiers, or credentials. Home Budget is a personal portfolio project, not a public banking service or a substitute for the bank's official balance.
