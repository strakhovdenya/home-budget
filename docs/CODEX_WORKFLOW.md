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

**Current state:** HB-001/HB-002 Done;ADRs0001/0002 re-Accepted for corrected D32..D35 after owner-reported repeated independent review and resolution of all four findings. Original acceptance/reopening/evidence remain historical. HB-003 Done,ADR0003 Accepted after owner-reported final independent review;Q-HB1-01 resolved for D36 safe-main mathematics;D37..D39 settles old-state visibility,informational warnings and Berlin civil age>=7 reminder. A>=0,sum(A)=actual B>=0;F=A-R-S may be negative with full R/S even above A/B. Explicit CARRY/FRESH_START/DEFER,no default,history and actual-check semantics remain. Multi-source CARRY,overdraft and historical-overspend features are not approved. No app/data migration or implementation;HB-004 not started.

## Safety / quality

**Delivery update (HB-005 request, completed verification 2026-11-02):** the owner
confirms HB-001..HB-004 completed and accepted. HB-005 is Done with a working
MUI/next-intl shell; finance remains unimplemented. The earlier current-state
paragraph above is a retained specification-stage snapshot, not the runtime status.
See [TASKS](TASKS.md) and [HB-005 evidence](planning/hb-005-verification.md).
No unreviewed auto-merge, no hidden model delegation or unlimited background loops, no Claude command requirements. Before every change ask: does it preserve latest bank checkpoint, exact cents, full reserves and closed month histories?

## Related docs
docs/PRD.md (product goals), docs/IMPLEMENTATION_PLAN.md (milestones), docs/TASKS.md (task register), docs/AGENT_FACTORY.md (roles and gates), docs/ROADMAP.md, docs/planning/phase-01-foundation.md, tests/scenarios/README.md, docs/VS_CODE_CODEX.md.

## Attribution / limitation
Workflow inspired by https://godarkfactory.com/docs/skills/ (peter-stratton/dark-factory). The nine Codex skill files were newly authored for this repo from public descriptions, not directly copied. There are multiple unrelated 'dark-factory' projects in the ecosystem; this adaptation targets the godark documentation specifically.
