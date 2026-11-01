# Codex workflow and Dark Factory skill mapping

We adopt the nine **foundational** workflow ideas described by godark Dark Factory, rewritten for Codex and Home Budget. These are **project-local original SKILL.md files**, not copied Claude commands and not an automation runtime.

| Dark Factory idea | Codex skill | Output |
|---|---|---|
| create-milestone | create-milestone | docs/ROADMAP.md and optional GitHub milestones |
| create-planning-doc | create-planning-doc | docs/planning/phase-NN-*.md |
| create-issues | create-issues | GitHub issues if authorized, or issue drafts |
| create-scenarios | create-scenarios | tests/scenarios/phase-NN/*.md |
| create-phase-overview | create-phase-overview | docs/phase-overviews/phase-NN-*.md |
| define-architecture | define-architecture | docs/ARCHITECTURE.md + docs/architecture.json |
| define-conventions | define-conventions | docs/conventions.md |
| configure-project | configure-project | docs/PROJECT_CONFIG.md / scripts once code exists |
| harness-claude-md | maintain-agent-instructions | concise AGENTS.md routing |

Additional project-specific skill: verify-financial-invariants.

## Recommended sequence
Read [PRD](PRD.md) → normative business rules → architecture/conventions → [Implementation Plan](IMPLEMENTATION_PLAN.md) → choose **one Ready HB-* task** in [Tasks](TASKS.md) → scenario specs → small implementation with tests → independent review → phase overview. GitHub actions require user authorization; a skill describes procedure, it does not auto-execute a cloud factory.

**Current state:** HB-001 documentation/scenarios complete and ADR 0001 Accepted after owner-reported independent review. The next specification task is HB-002; no finance implementation starts yet. The accepted model uses complete checkpoint-first balance distributions, user-confirmed month transfer and optional independent reconciliation. User enters balance and confirms all month amounts; never require a transaction/residual source ledger. HB-002 details incomplete-data closing/history, HB-003 final forecast/liquidity edge. The initial task ledger is docs/TASKS.md; GitHub Issues may be linked when created. A completed document task still requires review, not just a changed checkbox.

## Safety / quality
No unreviewed auto-merge, no hidden model delegation or unlimited background loops, no Claude command requirements. Before every change ask: does it preserve latest bank checkpoint, exact cents, full reserves and closed month histories?

## Related docs
docs/PRD.md (product goals), docs/IMPLEMENTATION_PLAN.md (milestones), docs/TASKS.md (task register), docs/AGENT_FACTORY.md (roles and gates), docs/ROADMAP.md, docs/planning/phase-01-foundation.md, tests/scenarios/README.md, docs/VS_CODE_CODEX.md.

## Attribution / limitation
Workflow inspired by https://godarkfactory.com/docs/skills/ (peter-stratton/dark-factory). The nine Codex skill files were newly authored for this repo from public descriptions, not directly copied. There are multiple unrelated 'dark-factory' projects in the ecosystem; this adaptation targets the godark documentation specifically.
