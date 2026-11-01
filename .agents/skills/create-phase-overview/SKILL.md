---
name: create-phase-overview
description: Document a completed Home Budget phase from the actual merged code and test evidence, not planned intentions.
---
# Phase overview
1. Verify phase is implemented by checking code, commit/PR references, migrations and executed test logs.
2. Read phase planning doc and scenario specs; map each requirement to actual behavior and paths.
3. Write docs/phase-overviews/phase-NN-slug.md with architecture, public UI flows, schema, known gaps, tested commands, results and screenshots where safe.
4. Explicitly state anything not implemented or not verified. Never invent code paths, successful tests or deployed URLs.
5. Describe what changed relative to earlier phase and how historical data/finance invariants remain protected.
6. Link roadmap milestone, issues and relevant ADRs if they exist.
