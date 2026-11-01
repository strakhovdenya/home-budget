---
name: configure-project
description: Use to detect or set up executable local verification commands and environment for Next.js Home Budget as implementation starts.
---
# Configure project
1. Inspect package.json, lockfile, scripts, .env.example, migrations, CI and docs/PROJECT_CONFIG.md. This repository is docs-only at bootstrap.
2. Propose exact versions after consulting maintained official docs for Next.js, MUI, next-intl, Auth.js, Drizzle, Neon, Vitest, Playwright.
3. Set dev, lint, typecheck, unit, integration, e2e and build scripts progressively; update docs/PROJECT_CONFIG.md.
4. Add local example environment variables ONLY as placeholders; never write secrets, tokens or real financial data to Git.
5. Avoid godark.yaml and Claude runtime: there is no factory agent config here.
6. Configure reproducible local tests and Vercel-safe persistence; validate scripts actually work and report commands.
7. Merge changes non-destructively; do not overwrite existing developer settings without review.
