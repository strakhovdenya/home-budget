---
name: define-conventions
description: Define or refine Codex-friendly TypeScript, money, test, error, logging, naming and review conventions for Home Budget.
---
# Project conventions
1. Read docs/conventions.md and normative product rules. Inspect representative existing files (if any).
2. Keep explicit simple patterns that an agent can follow: pure finance domain, cents not floats, typed validation, minimal indirection, idempotent writes.
3. Specify names, error handling, logger redaction, server auth, data migration policy, i18n rules and test style.
4. Update docs/conventions.md and examples without contradicting AGENTS.md. Add tooling where practical.
5. Favor enforceable rules over aesthetic preferences; avoid hidden generated code or magic state.
6. Show before/after convention changes and impact on active code.
