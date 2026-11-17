# Codex Code Quality Hooks — publication, 2026-11-17

Owner authorization D66 publishes the existing local tooling together with HB-023
cancellation. This supersedes the earlier R3 documentation-only availability
statements: the files below are now included in this change and available from
its clean checkout. R3 application changes and historical test evidence are unchanged.

## Published files

| Path | Purpose |
|---|---|
| `.codex/hooks.json` | Project definitions for SessionStart, PreToolUse, PostToolUse and Stop. |
| `scripts/codex-quality/hooks.json` | Matching portable candidate/template for those definitions. |
| `scripts/codex-quality/hook.cjs` | Lifecycle handling, full skill injection and check receipts. |
| `scripts/codex-quality/scope.cjs` | Original dirty baseline, Git diff ranges and source hashes. |
| `scripts/codex-quality/lint.cjs` | Three mechanical rules limited to directly changed TS/TSX. |
| `tests/tooling/codex-quality-hooks.test.mjs` | Node handler tests using disposable synthetic repositories. |
| `tests/tooling/codex-hooks-runtime.mjs` | Optional native Codex test with an isolated profile and loopback model fixture. |
| `eslint.config.mjs` | Scoped Node globals/style override for the new CJS/MJS tooling and tests. |

No new dependencies, application code, financial tests, database/schema or financial
logic changes. The ESLint override does not apply the three rules globally to old
TS/TSX. No personal/global configuration, trust hashes, profiles, environment files,
secrets, local snapshots, receipts or generated evidence are published. Only
`.codex/hooks.json` is included from `.codex/`; no config.toml is required.

## Activation

The project definitions are already included; a clean checkout does not require
copying the candidate. Install the existing locked dependencies through the normal
project setup. Review the four command definitions and use the native `/hooks`
review/trust flow in a trusted project. Configuration alone does not grant trust.
No user/global configuration or trust state is installed by this commit.

Start a fresh Codex session after first trusting the definitions. Resume/compact
without an original baseline deliberately refuses rather than adopting unknown
prior edits. Changed definitions require review again. Do not bypass hook trust.
Inspect event output and ignored `tmp/codex-quality/<session-hash>/skills.json`
for the two actual skill hashes; SessionStart supplies both full SKILL.md files.
This publication does not claim a new startup, trust operation or native smoke test.

For later definition maintenance, update both JSON files consistently. If a local
active definition differs, inspect it before replacing anything. The launcher
resolves the Git root in Node instead of interpolating repository paths in a shell.
See the [official hooks reference](https://learn.chatgpt.com/docs/hooks).

## Lifecycle and scope

| Event | Behavior |
|---|---|
| SessionStart startup/fork/clear | Inject both complete skills with hashes; capture original TS/TSX once. |
| SessionStart resume/compact | Reload skills and preserve baseline; missing baseline stops the flow. |
| PreToolUse | Verify baseline/skill hashes, remind the model; setup failure emits deny. |
| PostToolUse | Inspect actual disk edits, report scoped findings; no auto-fix or rollback. |
| Stop | Recheck disk and hashes; findings/unavailable checks block ordinary completion. |

The required skills are `.agents/skills/clean-code-ts-react/SKILL.md` and
`.agents/skills/code-simplifier/SKILL.md`. The mechanical rules are `curly: all`,
`brace-style: 1tbs` without single-line blocks, and `max-statements-per-line: 1`.
Installed ESLint/typescript-eslint parse the files. Inline disables cannot suppress
these rules; the hook does not load the application's ESLint config or run --fix.

Scope is relative to actual file bytes at SessionStart, not HEAD. Tracked and
non-ignored untracked TS/TSX are included. Original dirty work and unchanged old
violations are excluded; new files are checked in full. Whole-file parsing is
necessary, but ordinary findings must intersect added/replaced lines. Parse errors
block verification even outside the edited range. Pure deletions add no code lines.
Documentation-only work is NOT_APPLICABLE, not code PASS. Missing baseline/skill,
Git/parser/checker failures, missing diff hunks and observed concurrent edits cannot
produce PASS; failure invalidates a previous successful receipt.

Snapshots/receipts stay in ignored `tmp/codex-quality/`; test/native evidence stays
in ignored `tmp/code-quality-hooks-review/`. Never publish these directories or
remove the active session baseline. Limits are 2 MiB/file and 64 MiB initial source;
unsupported input and symlinks escaping the repository are refused. Long-path Git
configuration is per child invocation and does not change repository/global config.

## Verification evidence and reproduction

**This publication:** no local tests, lint, typecheck, build, PostgreSQL or native
runtime checks were run, by owner instruction. Static file/scope review only;
no new PASS is claimed. The existing GitHub workflows must succeed on the exact
PR HEAD before squash merge; CI must not be skipped or bypassed.

The existing CI runs application lint/typecheck/unit/build and synthetic PostgreSQL
checks plus the documentation workflow. It does not explicitly run the Node tooling
suite or the optional native runtime script; its success must not be described as
fresh execution of those two suites.

**Historical local evidence, not rerun here:** the prior tooling review recorded
28/28 Node tests with zero skipped, scoped ESLint/syntax checks and a native offline
scenario with four synthetic model requests: violating edit, Stop rejection, repair,
then successful Stop. R3 separately recorded 28/28 unchanged handler tests. These
historical reports are retained as history, not exact-publication-SHA validation.
Native resume/compaction, timeout/crash cases and other runtime versions/platforms
were not fully verified. The prior real-session activation does not install trust
for other users or fresh clones. Mechanical rules do not prove subjective quality.

Commands below are for an independently authorized future reproduction only;
they were not run in this finalization:

```powershell
node --test --test-reporter=tap tests/tooling/codex-quality-hooks.test.mjs
node node_modules/eslint/bin/eslint.js scripts/codex-quality tests/tooling/codex-quality-hooks.test.mjs tests/tooling/codex-hooks-runtime.mjs eslint.config.mjs --max-warnings=0
```

The optional native script requires a reviewed executable via
`HB_CODEX_RUNTIME_BINARY`, uses its own isolated child CODEX_HOME and synthetic
loopback Responses server, and reviews/trusts only its disposable fixture.
It requires no real model, OAuth, financial data or production access.

## Limits

Hooks are a guardrail, not a tamper-proof security boundary. Users can disable or
untrust them; unsupported tool paths may miss events. Runtime bootstrap/timeout
failure can occur before the handler emits deny. Stop blocking requests continuation;
source files and receipts remain writable. Concurrent hashes cannot freeze later
external edits. Full skill injection proves delivery, not subjective compliance.
Preserve dirty work and protected tests; never infer financial correctness from
these three rules or from NOT_APPLICABLE.
