# Codex code quality hooks — tooling review, 2026-11-17

## Current R3 documentation audit — 2026-11-17

**Availability and commit scope:** `scripts/codex-quality/`, `.codex/hooks.json` and the related hooks tests in `tests/tooling/` currently exist only in this local, uncommitted working tree. They are absent from the published `main` baseline and are **not included in the R3 commit scope**. The associated uncommitted ESLint override is also excluded. R3 includes this document only; it does not publish or install the hooks mechanism. References and historical results below describe those local files, not tooling available from a clean checkout of published `main`.

This addendum is authorized by owner D64. The activation/setup paragraphs below describe earlier stages of the tooling work; their statements that real-session activation was not claimed do not describe the current R3 tool events. No mechanism, configuration, dependency or trust setting was changed by R3.

During R3, actual native PreToolUse reminders and PostToolUse results are visible after shell/apply-patch calls. The live receipt is `tmp/codex-quality/002d9bf2558375cde290d6030813d9b46fc979edced817c5ae6db0c41d9ad69b/PostToolUse.json`: PASS for the three changed TS/TSX files (charts, screen, new UI tests). Its sibling `skills.json` matches both current SKILL.md hashes. Full skill contents were supplied in this conversation. These observations prove the running bounded checks, not subjective code quality or a newly executed startup/resume event.

Fresh unchanged handler tests in R3: **28/28 passed, zero skipped**, `node --test --test-reporter=tap tests/tooling/codex-quality-hooks.test.mjs`; TAP retained at `tmp/hb22-r3/hooks-tests.tap`. They include failure/Stop behavior in disposable fixtures. Earlier native offline-model runs below remain historical evidence; that native runtime scenario, startup/resume/compaction, timeout/crash and cross-platform checks were not rerun in R3. Current automatic Stop will recheck at handoff; no unobserved future Stop outcome is claimed here. Scoped typecheck/UI tests and human-readable self-review are reported separately in [R3 verification](planning/hb-022-r3-verification.md), not inferred from the three mechanical rules.

`docs/CODE_QUALITY_HOOKS.md` is **not tracked in the R3 main baseline** (`1092835`) and is explicitly included in the owner-approved R3 commit scope and review ZIP. Independent ZIP review APPROVED (0/0/0/0) and Owner Acceptance were granted on 2026-11-17 (D65); the earlier condition to wait for that acceptance is satisfied. This document is included in R3 release finalization. Its inclusion does not authorize committing the unrelated dirty hook implementation/configuration, ESLint override or tooling tests, which remain local and uncommitted. Local original snapshots, profile/trust configuration, environment files and secrets must not enter that commit/ZIP. The historical verification/limitations below are preserved.

**Configured and trusted in the real user profile — owner activation request, 2026-11-17.** All four `.codex/hooks.json` definitions are enabled/trusted in the native runtime. A fresh IDE session is still required; SessionStart in this already-open conversation was not claimed. The candidate is [scripts/codex-quality/hooks.json](../scripts/codex-quality/hooks.json). Existing application sources, test files, financial rules, DB/schema/migrations and financial checks are unchanged. No commit/push/PR/deploy or dependency installation.

## Activation after review

These instructions require the separately reviewed local, uncommitted tooling files described above. They are **not reproducible from published `main` or from the R3 documentation commit alone**. A clean checkout does not contain the candidate, implementation or hooks tests; no separate tooling publication is authorized by R3. The steps below describe local activation only when those prerequisites are already present.

1. Review the candidate and the three files in `scripts/codex-quality/`, including the existing-dependency lint configuration. Run the tooling tests below with the already installed dependencies.
2. From the repository root, copy the candidate to `.codex/hooks.json`. In PowerShell:

   ```powershell
   New-Item -ItemType Directory -Path .codex -Force
   Copy-Item -LiteralPath scripts/codex-quality/hooks.json -Destination .codex/hooks.json
   ```

   If an active file already exists, merge the reviewed handlers rather than overwriting it. No user/global config or trust state is installed by this tooling change.
3. Restart Codex in this repository and make sure the project `.codex/` layer is trusted. Open `/hooks`, inspect each command/source, and trust the four reviewed definitions. A hook definition changed later needs review again. Resume/restart once after trusting to ensure SessionStart has run. Do not use `--dangerously-bypass-hook-trust` as an activation shortcut.
4. Start a **fresh session** for the first activation. Otherwise a resume/compact with no original baseline is deliberately stopped; it cannot recover which dirty changes predated activation.
5. Check the UI/event output and `tmp/codex-quality/<session-hash>/skills.json`. The receipt contains the two actual skill SHA-256 values. SessionStart must deliver both complete files, not an instruction merely asking the model to read them. Run a synthetic edit in a disposable repository if a negative activation smoke test is needed; do not modify financial source just to test the hook.

Official Codex documentation describes project discovery, trust via `/hooks`, lifecycle inputs and blocking responses. Hooks need trust and some tool paths are not covered; this is a guardrail, not a complete enforcement boundary. See [official hooks reference](https://learn.chatgpt.com/docs/hooks).

In this managed IDE session, creating a project `.codex/` directory was followed by exec-helper `setup refresh had errors`. Renaming the active candidate did not clear it. The candidate was therefore moved into the ordinary tooling directory, and only the newly created empty `.codex/` directory was removed after inspection. Verification commands used reviewed escalated execution while native Codex testing used an isolated temporary profile/project. Activation of this real session is **not** claimed. Restart the IDE/client and verify `/hooks` normally after independent review; do not infer active protection from the presence of a candidate file. The final verification report records whether the helper recovered after directory removal.

After removing that verified empty directory, ordinary sandboxed exec immediately worked again (`SANDBOX_HELPER_RECOVERED`). The final tests therefore ran without escalation. This observation does not establish the helper's internal root cause. Activation in this managed IDE should happen in a fresh client/session after review.

## Lifecycle behavior

| Event | Behavior |
|---|---|
| SessionStart: startup/fork/clear | Read both real SKILL.md files, bound their size, inject full contents with hashes and capture the original TS/TSX working tree once. An existing session baseline is never overwritten. |
| SessionStart: resume/compact | Re-read and inject both full skills, preserving the original dirty baseline. Missing baseline stops the flow rather than adopting unknown edits. |
| PreToolUse | Verify baseline and loaded-skill hashes, then remind the model of the two loaded skills. Setup failure returns `permissionDecision: deny`. It does not deny repair simply because current source has a style violation. |
| PostToolUse | Inspect actual disk changes for all matched local tools, including shell writes. Report changed-code violations with filename, line, column, rule and repair instruction. No auto-fix or rollback. |
| Stop | Run the same check afresh, re-read source hashes to detect edits during checking, and block ordinary completion on failures or unavailable checks. `stop_hook_active` never skips the gate. |

The launcher computes the Git root in Node, avoiding shell interpolation of repository paths. The exact configured launcher was tested in Git Bash and Windows PowerShell with spaces in the working path. `core.longpaths=true` applies to child Git commands only; no Git config is changed.

The three mechanical rules are `curly: all`, `brace-style: 1tbs` with no single-line blocks, and `max-statements-per-line: 1`. Existing ESLint and typescript-eslint dependencies parse TS and TSX. Inline eslint-disable comments cannot suppress these rules. The hook does not load/replace the application's ESLint config and never runs `--fix`.

## Scope and baseline

The comparison is against actual file bytes at SessionStart, **not HEAD**. Tracked and non-ignored untracked TS/TSX are included. Already dirty source is saved locally; unchanged baseline code is not linted. For modified files the parser sees the whole file, but ordinary rule diagnostics are reported only where their reported line range intersects added/replaced diff lines. A parse failure prevents verification of the touched file and is reported even if it points outside the edited range.

Unchanged old violations in the same file remain excluded. New files are checked in full. Pure deletions have no new code lines to style-check. Markdown-only work returns `NOT_APPLICABLE`, not a fabricated code PASS. An unexpected Git exit, changed content without diff hunks, parser/checker error, missing skill/snapshot or an edit detected during checking cannot produce PASS. A failure overwrites an older successful receipt with `NOT_EXECUTED`.

Baseline/receipts live under the already ignored `tmp/codex-quality/`. Do not delete them during an active session. They contain local original source snapshots and must not be committed or shared indiscriminately. A new task that needs a different dirty baseline should use a fresh Codex session. Resource limits are 2 MiB/file and 64 MiB of initial TS/TSX snapshots; unsupported/oversized input is refused, not partially checked. Symlinks escaping the repository are refused.

In the earlier, still-uncommitted local tooling work, the only existing tooling file changed was `eslint.config.mjs`: a file-pattern override for these new CJS/MJS implementation/tests provides Node globals and the same three style rules. It is not an R3 change or published-main setup. Application/domain/financial-test rule configurations were compared before/after and remain equal. The override does not enforce new rules on old TS/TSX files globally.

## Verification commands

The following commands apply only to the local tooling prerequisites above. They cannot be run from a clean published-main checkout without those separately supplied files. These are historical/local reproduction commands, not checks to rerun for the minimal R3 documentation correction.

```powershell
node --test --test-reporter=tap tests/tooling/codex-quality-hooks.test.mjs
node node_modules/eslint/bin/eslint.js scripts/codex-quality tests/tooling/codex-quality-hooks.test.mjs tests/tooling/codex-hooks-runtime.mjs eslint.config.mjs --max-warnings=0
node --check scripts/codex-quality/hook.cjs
node --check scripts/codex-quality/scope.cjs
node --check scripts/codex-quality/lint.cjs
```

The optional native test uses the reviewed local executable, a new disposable Git fixture, an isolated child-only `CODEX_HOME` and a loopback-only synthetic Responses server. It does not use a real model or application data:

```powershell
$env:HB_CODEX_RUNTIME_BINARY = 'C:/path/to/installed/codex.exe'
node tests/tooling/codex-hooks-runtime.mjs
```

It reviews/trusts **only its own fixture** through the same config API used by the hook UI. It checks untrusted → trusted → modified, the four real lifecycle events, complete skill text in the actual model request, and Stop rejection followed by a synthetic repair and successful Stop. Windows command execution approvals are limited to the two known fixture writes. The script closes its own HTTP server and Codex child in `finally`.

## Actual evidence and limits

Final tooling verification: **28/28 Node tests, zero skipped**, scoped ESLint with zero warnings, and syntax checks for all five new CJS/MJS implementation/test files passed. The native offline test exited0 and verified four actual model requests: violating write → premature completion blocked by Stop → repair → completion accepted by Stop. Earlier exploratory failures remain in the local evidence directory and do not count as passes. Machine-readable TAP and the sanitized native summary accompany the review diff.

Self-review used the two required skills on this tooling scope only. Explicit guards, readable blocks, unchanged application behavior, scoped diagnostics, fresh Stop checks, error-to-NOT_EXECUTED handling and lack of auto-fix were reviewed. No outstanding implementation finding is claimed within that bounded scope; the integration/coverage limitations below remain open and are not recast as PASS. This is not independent approval.

Installed runtime: `codex-cli 0.169.0-alpha.11.1` from the VS Code extension. Its generated app-server schema contains SessionStart/PreToolUse/PostToolUse/Stop, and `features list` reports `hooks stable true`. Native execution confirmed these events, not just schema recognition. The full required skills were returned by the handler and appeared in the first request to the owned synthetic model endpoint.

The native scenario first wrote a violating synthetic TS file. PostToolUse and Stop reported `curly`; Stop requested continuation. The next synthetic tool call repaired only that file, and the subsequent Stop passed. The original exploratory test also exposed a genuine Windows long-path defect: Git returned exit1 with empty stdout. The implementation now enables long paths per invocation and rejects missing hunks. Failed exploratory outputs are retained separately; they are not counted as passes.

The installed interactive CLI displayed the hook review browser in a disposable profile: SessionStart installed1/active1/review0 and the changed Stop installed1/active0/review1. Automated literal `/hooks` command entry through this ConPTY transport was unreliable; that command-entry automation is **not verified**. No real-project trust was granted. The short-lived TUI probe was stopped after exact executable/fixture-command-line verification.

Native resume/automatic compaction flows: **NOT EXECUTED**; their configured sources and baseline-preserving behavior are covered by handler tests and the installed schema/reference. Real IDE integration after activation, native timeout/crash scenarios and other Codex versions/platforms: **NOT EXECUTED**. Financial tests, full app lint/typecheck/build: **NOT EXECUTED** and not needed for this tooling-only change.

**This cannot provide an unconditional mandatory security boundary.** A user can disable/untrust hooks, unsupported tool paths may bypass tool events, Stop blocking is a continuation request, and Codex may continue after a hook process/bootstrap/timeout failure before our handler can emit a deny. Hook-state/source files are writable and are not a tamper-proof store. The code rechecks visible concurrent edits but cannot freeze external writers after it returns. Full skill text injection proves loading; it cannot prove the model used every subjective design principle. The three objective checks and normal Stop gate are what this implementation enforces when trusted and running. Independent review remains required.
