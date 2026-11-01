# Home Budget

Private, documentation-first personal budget planning web app.

**Status:** product specification and Codex workflow prepared; **application code not yet implemented**.

## Key principles
- User-entered **bank balance checkpoints are authoritative** for card balance; no requirement to log each purchase.
- Obligations reserve their **full outstanding amount**; marking as paid does **not** debit the card again.
- Independent bank dates and **budget periods**; funds can be assigned across past/current/future periods.
- Savings, obligations, carryover, daily forecast, monthly closing snapshots, and complete history.
- Future PDF import assists categorization/reconciliation, never double-books already reflected balance changes.
- One card in v1, expandable account model; **web only, no PWA**.

## Decisions
Next.js App Router + TypeScript, MUI light/dark/system, next-intl (RU/DE/EN), Google OAuth single allowlisted user, Vercel, PostgreSQL (Neon candidate) + Drizzle, EUR cents and Europe/Berlin dates.

## Start reading
1. [Product scope](docs/PRODUCT.md) and [Business rules](docs/BUSINESS_RULES.md)
2. [Architecture](docs/ARCHITECTURE.md) and [Data model](docs/DATA_MODEL.md)
3. [UX](docs/UX.md), [Roadmap](docs/ROADMAP.md) and [test scenarios](tests/scenarios/README.md)
4. [Codex workflow](docs/CODEX_WORKFLOW.md), [VS Code setup](docs/VS_CODE_CODEX.md), and root [AGENTS.md](AGENTS.md)

The .agents/skills/ tree contains original **Codex adaptations of Dark Factory's nine foundational planning workflows**, not the Claude-only Dark Factory runtime.

## Status / safety
This is a **documentation-and-agent-workflow** bootstrap, not a running app. Implement it in bounded phases using Codex, starting with [Phase 01](docs/planning/phase-01-foundation.md). No secrets or real bank data in Git, even while private: this repository may become public later.
