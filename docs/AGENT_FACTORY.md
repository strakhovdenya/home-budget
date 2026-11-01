# Codex Factory — Dark Factory-inspired governance, NOT godark runtime

## Why
We adopt the **philosophy** of Dark Factory: human-controlled architecture and specifications, agent implementation under constraints, separate quality and functional verification, measurable gates. This is a **Codex-native local workflow**, not an installation or fork of the Claude-specific Dark Factory pipeline.

## Roles (can be separate Codex runs)
1. **Product/architect (human + Codex):** maintains docs/BUSINESS_RULES.md, ADRs, roadmap and user-facing acceptance examples.
2. **Planner (Codex):** writes small phase spec with dependencies, up to 5 acceptance criteria and 7 tests per task; no surprise scope.
3. **Implementer (Codex):** codes in feature branch, first fails then passes relevant tests; touches only authorized files.
4. **Quality reviewer (fresh Codex context or human):** static review, security, layering, authorization, race/idempotency, tests; must not silently edit code.
5. **Functional reviewer (fresh Codex context or human):** independently checks behavior against scenario markdown and actual app; calls out untested claims.
6. **Human owner:** decides tradeoffs, confirms security-sensitive changes and approves merge/deploy.

## Gates
G0 approved product behavior; G1 explicit architecture, schema + acceptance scenarios; G2 failing tests demonstrate intended change; G3 green lint/types/unit/integration/e2e as relevant; G4 reviewer reports; G5 manual user acceptance, deploy if authorized.

## Working constraints
- Single phase / small PR at a time. Do not run autonomous unlimited agent loops.
- No auto-merge, no auto-deploy, no direct prod DB modifications, no shell commands that upload secrets.
- Use PR body to include requirement IDs (BR-*), scenario IDs, tests actually executed and residual risks.
- Use .agents/skills/ for workflow scaffolding; AGENTS.md as compact router. No .claude folder/CLAUDE.md/godark.yaml.
- Pin package versions in lockfile during implementation. Require explicit approval for changing foundational stack or domain semantics.

## Source inspiration and license boundary
Inspired by publicly described nine scaffolding skills and human-owned constraints of https://godarkfactory.com/docs/skills/ (peter-stratton/dark-factory). Files in this repo are **new, project-specific instructions**, not a verbatim copy of Dark Factory's copyrighted implementation. Adapted for Codex from the listed task descriptions. No Dark Factory installation, Docker harness or Anthropic key required.
