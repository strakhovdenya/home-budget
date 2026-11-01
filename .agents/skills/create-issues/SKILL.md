---
name: create-issues
description: Convert an approved Home Budget phase planning document to small, traceable GitHub issue drafts or issues with acceptance gates.
---
# Issues from specs
1. Select approved phase plan under docs/planning and load docs/ROADMAP.md.
2. Check remote GitHub issues for duplicates before writing (use gh if available or GitHub tool).
3. For each bounded task create title, BR-* traceability, dependency, 'done when', max 5 acceptance criteria, max 7 explicit tests, validation recipe and security scope.
4. Label proposed priority and phase; links to docs/scenarios. Only create remote issues with user authorization; otherwise prepare issue bodies in docs/planning/phase-NN-issues.md.
5. Update roadmap/planning with real issue numbers *only after* successful creation.
6. Avoid automatically assigning, scheduling, closing, or merging issues.
7. Report created, skipped and unresolved dependencies.
