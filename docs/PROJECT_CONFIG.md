# Tooling configuration contract

**Current state: docs-only**; no package.json, lockfile, migration or CI scripts are implemented yet. These are intended verification contracts, not commands that already work.

At foundation phase Codex should install/pin versions from official maintained docs, then add:
- pnpm dev — Next.js development server
- pnpm lint — ESLint + architecture boundary checks
- pnpm typecheck — tsc --noEmit
- pnpm test — Vitest finance unit tests
- pnpm test:integration — DB integration tests
- pnpm test:e2e — Playwright critical flows
- pnpm build — production build
- pnpm db:migrate — Drizzle migrations for dev/staging only, guarded in production

Current approved design: Next.js App Router, React + TypeScript, MUI with Next integration, next-intl, Zod, Neon PostgreSQL + Drizzle, Auth.js Google OAuth allowlist. Decide exact package versions at implementation time.

Never print real environment values; .env.example contains placeholders only. Use Vercel environment variables for deployments. No hard-coded credentials, no public PDF blobs.
