# Engineering conventions

- Strict TypeScript, named functions for finance domain, no any in domain, no money Number fractions. Use branded MoneyCents / PeriodKey / AccountId where practical.
- All finance domain calculations are pure and deterministic with injected clock. Database updates within transaction, idempotency key, optimistic version.
- Layer imports follow docs/architecture.json; domain never imports Next/MUI/Drizzle.
- Server-side auth, input Zod validation, no trust in client account ids or period state.
- UI locale keys in RU/DE/EN dictionaries; no hardcoded finance copy in components. Default RU and Europe/Berlin.
- Semantic MUI, WCAG contrast, keyboard access; correct currency format and locale.
- Feature tests cover BR-* IDs using deterministic fixtures in tests/scenarios. E2E for update budget and closing flow.
- Schema migrations reversible where practical, but never drop historical event data casually.
- No unsafe bulk edits, production writes, arbitrary external code downloads or dependency changes without user awareness.
- Logging: no full bank balances, names, account identifiers, PDFs, OAuth tokens; redact server logs.
- Conventional commit/PR title; PR includes scope, risks, proof and screenshots for UI.
- No PWA, no offline state, no automatic bill double-debit, no partial reserves.
