---
name: define-architecture
description: Use when design or code changes require revisiting Home Budget's layered Next.js architecture and machine-readable import boundaries.
---
# Architecture
1. Read docs/ARCHITECTURE.md, docs/DATA_MODEL.md, docs/architecture.json and docs/BUSINESS_RULES.md.
2. If code exists, inspect src and imports for circular dependencies or accidental domain coupling to UI/ORM.
3. Propose changed layers, allowed dependencies, storage/API boundaries and concurrency/idempotency choices; do not silently rewrite user constraints.
4. Update both human-readable docs/ARCHITECTURE.md and machine-readable docs/architecture.json consistently.
5. Document bank checkpoint authority and derived financial projections as separate concepts.
6. Add architecture fitness tests/lint enforcement when implementation exists.
7. Get approval for foundational stack/database change; avoid CLAUDE, godark CLI and PWA.
