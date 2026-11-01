# HB-005 — responsive shell and locale/theme preferences

Scope: UI foundation only. Owner authorizes HB-005 after accepting HB-001..004.
No ADR or financial behavior changes. BR-01..05 remain protected by showing
explicit unavailable states without amounts, calculations or financial actions.

Implementation: MUI AppRouterCacheProvider for Next 16 streaming SSR, one CSS-variable
ThemeProvider with light/dark color schemes and InitColorSchemeScript. MUI owns
system preference listeners and localStorage persistence. next-intl reads a validated
locale cookie on the server; a Server Action changes it and refreshes the current
route. Russian is the default, independent of browser language. No locale URL prefix
is needed for this personal application. All five routes share the same shell.

Acceptance/proof before implementation:

- HBU-001: RU/DE/EN render overview, five navigation links and honest placeholders.
- HBU-002: selecting a language writes a validated, one-year cookie; reload and
  direct routes retain it and HTML lang. Invalid cookie falls back to RU.
- HBU-003: Light/Dark/System selection persists across provider remounts;
  System follows a live media-query change. SSR uses the official initialization script.
- HBU-004: every catalog has the same nonempty keys; translated accessible labels
  identify preferences, navigation, mobile menu, close button and skip link.
- HBU-005: desktop sidebar/mobile modal drawer, one-column small-screen content,
  44px targets, visible keyboard focus, Escape/focus return and no horizontal overflow.

Automated proof: Vitest + Testing Library/jsdom for rendered UI, real MUI theme
behavior, cookie action validation, catalog parity and source import boundaries.
Run lint/typecheck/test/build, then HTTP checks against dev and production servers.
Browser visual/hydration/geometry checks require an available browser runtime;
report any unavailable checks explicitly. Independent review and owner acceptance
remain separate gates. No commit, push or PR.
