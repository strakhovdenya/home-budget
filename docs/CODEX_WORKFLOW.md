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
Read business rules → define architecture/conventions → roadmap → phase planning → scenario specs → small implementation with tests → independent review → phase overview. GitHub actions require user authorization; a skill describes procedure, it does not auto-execute a cloud factory.

## Safety / quality
No unreviewed auto-merge, no hidden model delegation or unlimited background loops, no Claude command requirements. Before every change ask: does it preserve latest bank checkpoint, exact cents, full reserves and closed month histories?

## Related docs
docs/AGENT_FACTORY.md (roles and gates), docs/ROADMAP.md, docs/planning/phase-01-foundation.md, tests/scenarios/README.md, docs/VS_CODE_CODEX.md.

## Attribution / limitation
Workflow inspired by https://godarkfactory.com/docs/skills/ (peter-stratton/dark-factory). The nine Codex skill files were newly authored for this repo from public descriptions, not directly copied. There are multiple unrelated 'dark-factory' projects in the ecosystem; this adaptation targets the godark documentation specifically.
