# HB-005 — verification and review handoff

Implemented on branch `feat/hb-005-mui-i18n`, 2026-11-01..02 (Europe/Warsaw).
Status: **Review**, not Done. Independent review and owner acceptance are pending.
No commit, push, PR, database, authentication or financial implementation.

## Delivered behavior

- `/`: overview with an honest empty state and links to future sections.
- `/obligations`, `/savings`, `/months`: translated development placeholders;
  no made-up amounts or financial operation buttons.
- `/settings`: working language and appearance controls; the same controls are
  available in the header. Unknown routes have a translated 404 and return link.
- Desktop sidebar; mobile modal Drawer with close/Escape/focus return; skip link,
  semantic header/nav/main and one h1 per screen. Small screens use one column.
- Custom MUI typography, spacing, neutral surfaces, rounded outlined cards,
  emerald primary/success, amber warning and red error palettes in both schemes.
  UI state always includes text. Interactive controls have minimum 44px targets
  in theme styles; navigation items are 48px. Visible keyboard outlines are defined.

MUI components: ThemeProvider, CssBaseline, AppRouterCacheProvider,
InitColorSchemeScript, Box, Stack, Typography, List/ListItemButton/ListItemIcon/
ListItemText, Drawer, IconButton, Divider, Chip, Card/CardContent/CardActionArea,
Alert, FormControl/InputLabel/Select, Button and SvgIcon. Icons are local SVG paths.

## Preferences and SSR

One CSS-variable theme supplies both light and dark palettes. `useColorScheme`
offers Light/Dark/System; MUI persists the choice in localStorage under
`home-budget-mode`, follows live OS changes and synchronizes tabs. Matching
InitColorSchemeScript runs before content with the same System default and
`data-mui-color-scheme` selector. AppRouterCacheProvider uses the v16 App Router
entry point and collects streamed styles. Only the html attribute controlled by
the early theme script uses suppressHydrationWarning.

next-intl loads namespaced JSON dictionaries from `src/shared/i18n/messages`.
RU is the default; DE and EN have the same keys. A validated, HttpOnly,
SameSite=Lax, path=/, one-year `home-budget-locale` cookie stores language
(Secure in production). The Server Action writes it before refreshing the
current route; server HTML lang and client messages use that same request locale.
No database or URL prefix is involved. Language errors have translated feedback.

## Dependencies

Exact versions and resolved graph are in package.json/pnpm-lock.yaml:

| Added runtime package | Version |
| --- | --- |
| @mui/material, @mui/material-nextjs | 9.5.0 |
| @emotion/react, @emotion/cache | 11.14.0 |
| @emotion/styled | 11.14.1 |
| next-intl | 4.14.9 |

| Added test package | Version |
| --- | --- |
| @testing-library/react | 16.3.3 |
| @testing-library/dom | 10.4.2 |
| @testing-library/user-event | 14.6.8 |
| jsdom | 30.1.3 |

No Tailwind, shadcn, PWA or additional UI/browser-test stack.
pnpm explicitly denies optional native fallback build/download scripts for
@swc/core and @parcel/watcher; platform registry dependencies provide binaries.

## Actual checks

The initial test run failed because the planned provider/component modules did
not yet exist. Intermediate checks caught the selector mismatch, removed MUI 9
system props, a translator-key type error and Node-script lint globals; these
were corrected before the final successful runs.

| Executed command | Result |
| --- | --- |
| `pnpm.cmd install --frozen-lockfile --offline` | Passed, no resolution changes |
| `pnpm.cmd lint` | Passed, zero warnings |
| `pnpm.cmd typecheck` | Passed, route generation and strict TypeScript |
| `pnpm.cmd test` | Passed: 3 files, 26 tests |
| `pnpm.cmd build` | Passed, Turbopack; five routes plus localized not-found |
| `pnpm.cmd start --hostname 127.0.0.1 --port 3005` | Ready, production HTTP checks passed |
| `pnpm.cmd dev --hostname 127.0.0.1 --port 3006` | Ready, dev HTTP checks passed |
| `node scripts/check-shell-http.mjs http://127.0.0.1:3005` | 20 checks passed |
| `node scripts/check-shell-http.mjs http://127.0.0.1:3006` | 20 checks passed |
| `git diff --check` | Passed |

HTTP checks cover all five direct routes in each locale, translated h1/copy,
HTML lang, theme initialization, three localized 404 responses, and absent/invalid
locale-cookie fallbacks. They do not execute browser JavaScript.

Automated acceptance trace:

- HBU-001: all five screens in RU/DE/EN; overview navigation/current link and
  explicit unavailable state; no pretend Update Budget action.
- HBU-002: language selection invokes persistence and route refresh; failed save
  gives feedback; real Server Action writes cookie options, rejects unsupported
  locale, and request configuration restores each saved locale with Berlin timezone.
- HBU-003: actual MUI mode/localStorage behavior, dark preference after remount,
  live System dark/light changes with System still selected; SSR markup hydrated
  in jsdom with a saved dark choice and no onRecoverableError calls.
- HBU-004: exact catalog-key parity, nonempty strings, every message formatted by
  next-intl without missing-message errors; rendered accessible preference labels;
  localized 404; TS-AST import-boundary test using architecture.json and explicit
  external allowlists, including shared path classification/type/dynamic imports.
- HBU-005: Tab order through skip link and five navigation links; mobile Drawer
  labels, Escape dismissal and focus restoration. CSS defines responsive layouts
  and target sizes; real geometry remains a browser review item.

## Limitations and reviewer checks

The in-app browser/Node REPL tools are unavailable in this session. No visual
screenshots, browser-console hydration check, computed contrast audit, actual
touch measurements or horizontal-overflow measurements are claimed. jsdom
hydration and HTTP SSR are real executed checks, but do not replace those checks.
Review at 320/375/768/1440px, both palettes and RU/DE/EN; test reload, actual
language switching/navigation, System changes, keyboard/focus, 200% zoom and
disabled browser storage. Persistence requires browser cookies/localStorage;
clearing or blocking storage removes persistence. No server preference fallback
or financial data storage is implemented.

Managed Windows sandbox access to SWC's native cache and pnpm's external store
lock failed. Install, typecheck, build, dev and start succeeded with approved
outside-sandbox access; no global permissions/cache settings were changed.
`python scripts/check_agent_docs.py` could not execute because Python is not
installed; no Python-check success is claimed. The existing CI check is unchanged.
Both verification servers were stopped after the HTTP checks.
Independent quality/functional review has not been performed.

The pre-existing untracked `.vscode/extensions.json` was not edited. ADR0001/0002/
0003, business rules, financial scenarios and docs-check.yml were preserved.

## File inventory and Git evidence

Recorded after implementation below. `git diff --stat` counts tracked files only;
new files are shown in status and the inventory. The evidence report itself is
an untracked new file at capture time. No files were staged.


### Changed / added / removed files (40 task files)

```text
README.md
docs/CODEX_WORKFLOW.md
docs/IMPLEMENTATION_PLAN.md
docs/PROJECT_CONFIG.md
docs/TASKS.md
docs/planning/hb-005-ui-shell.md
docs/planning/hb-005-verification.md
next.config.ts
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
scripts/check-shell-http.mjs
src/app/globals.css
src/app/layout.tsx
src/app/months/page.tsx
src/app/not-found.tsx
src/app/obligations/page.tsx
src/app/page.tsx
src/app/savings/page.tsx
src/app/settings/page.tsx
src/features/shell/app-shell.tsx
src/features/shell/not-found-screen.tsx
src/features/shell/placeholder-screen.tsx
src/features/shell/section-icon.tsx
src/features/shell/sections.ts
src/shared/i18n/actions.ts
src/shared/i18n/catalogs.ts
src/shared/i18n/config.ts
src/shared/i18n/messages/de.json
src/shared/i18n/messages/en.json
src/shared/i18n/messages/ru.json
src/shared/i18n/request.ts
src/shared/ui/app-theme-provider.tsx
src/shared/ui/preferences.tsx
src/shared/ui/theme.ts
tests/architecture.test.ts
tests/bootstrap.test.tsx
tests/i18n.test.ts
tests/shell.test.tsx
vitest.config.ts
```

### git diff --stat

```text
 README.md                   |   38 +-
 docs/CODEX_WORKFLOW.md      |    6 +
 docs/IMPLEMENTATION_PLAN.md |    4 +-
 docs/PROJECT_CONFIG.md      |   63 +-
 docs/TASKS.md               |    8 +-
 next.config.ts              |    3 +-
 package.json                |   10 +
 pnpm-lock.yaml              | 1528 ++++++++++++++++++++++++++++++++++++++++++-
 src/app/globals.css         |   70 +-
 src/app/layout.tsx          |   39 +-
 src/app/page.tsx            |   15 +-
 tests/bootstrap.test.tsx    |   14 -
 vitest.config.ts            |    2 +
 13 files changed, 1654 insertions(+), 146 deletions(-)
```

### git status --short

```text
 M README.md
 M docs/CODEX_WORKFLOW.md
 M docs/IMPLEMENTATION_PLAN.md
 M docs/PROJECT_CONFIG.md
 M docs/TASKS.md
 M next.config.ts
 M package.json
 M pnpm-lock.yaml
 M src/app/globals.css
 M src/app/layout.tsx
 M src/app/page.tsx
 D tests/bootstrap.test.tsx
 M vitest.config.ts
?? .vscode/extensions.json
?? docs/planning/hb-005-ui-shell.md
?? docs/planning/hb-005-verification.md
?? pnpm-workspace.yaml
?? scripts/check-shell-http.mjs
?? src/app/months/
?? src/app/not-found.tsx
?? src/app/obligations/
?? src/app/savings/
?? src/app/settings/
?? src/features/shell/
?? src/shared/i18n/actions.ts
?? src/shared/i18n/catalogs.ts
?? src/shared/i18n/config.ts
?? src/shared/i18n/messages/
?? src/shared/i18n/request.ts
?? src/shared/ui/app-theme-provider.tsx
?? src/shared/ui/preferences.tsx
?? src/shared/ui/theme.ts
?? tests/architecture.test.ts
?? tests/i18n.test.ts
?? tests/shell.test.tsx
```

Git also emitted local global-ignore permission and LF/CRLF notices. Commands
completed successfully; no global Git configuration was changed.

