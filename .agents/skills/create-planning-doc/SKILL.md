---
name: create-planning-doc
description: Use when user asks Codex to plan a roadmap phase or feature into small code-ready issues, acceptance criteria and risks.
---
# Planning document
1. Read normative rules and roadmap; inspect actual code if any before specifying changed layers.
2. Write docs/planning/phase-NN-descriptive-name.md. Include goal, non-goals, requirement IDs (BR-*), data changes, API/UI behavior, security and migration concerns.
3. Break tasks into independently reviewable pieces. Each task at most **five acceptance criteria** and **seven test cases**; split if larger.
4. State case for intermittent bank balance checkpoints, paid flag without duplicate debit, future allocations and versioned monthly closing if touched.
5. Define deterministic success checks (Vitest/DB/Playwright or manual until code exists) and failure examples.
6. Mark ambiguity as question in docs/OPEN_QUESTIONS.md; do not change product meaning just to make task easy.
7. Do not mark a task complete before tests and review run; planning is not implementation.
