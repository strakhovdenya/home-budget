# HB-008 — Executed verification and review handoff

Date: 2026-11-02 (owner timezone). Branch: `feat/hb-008-money-dates`.
Status: Done. Independent review completed; owner explicitly accepted HB-008 on 2026-11-02.
Scope/API: [implementation contract](hb-008-money-dates.md).
Runtime used: Node v22.23.0, pnpm 12.16.1.

## Independent review and owner acceptance — 2026-11-02

The owner officially reports completion of independent review and accepts HB-008
on 2026-11-02. The implementation was approved without corrections.

| Severity | Findings |
|---|---:|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |

There are no blocking findings. The independent reviewer additionally checked
money/calendar primitives with 27212 checks in TZ=UTC and 27212 checks in
TZ=America/Los_Angeles. These are reviewer-reported checks, separate from Codex's
312-test Vitest suite and earlier one-off probes; their counts are not combined.

Full lint, typecheck, Vitest and build were previously executed in the Codex
environment as recorded below. The independent reviewer did not claim to rerun
those commands. This acceptance entry records the owner's report; it is not a
new local execution of the reviewer checks or the full verification commands.

Earlier self-review, handoff/checklist and Review-status statements below are
historical evidence from before acceptance. The linked implementation contract
also retains its original review-stage status; the current task status is Done
in TASKS.md and this acceptance entry. No source/test changes, commit, push or PR
are part of finalization.

## Executed checks

| Command / check | Actual result |
|---|---|
| `pnpm.cmd exec vitest run tests/domain tests/shared/pure tests/architecture.test.ts` | Passed: 6 files, 241 tests; 240 new primitive tests plus 1 existing architecture test |
| `pnpm.cmd lint` | Passed, exit 0, zero warnings |
| `pnpm.cmd typecheck` inside sandbox | Failed before tsc: SWC native cache access/ownership restrictions on managed Windows |
| `pnpm.cmd typecheck` with approved sandbox escalation | Passed, exit 0; Next route type generation and strict tsc, including negative type assertions |
| `pnpm.cmd test` | Passed: 13 files, 312 tests; integration tests excluded by existing config |
| `pnpm.cmd build` with approved sandbox escalation | Passed, exit 0; production compilation, TypeScript, page-data collection and 8 static generation entries; app routes remain dynamic |
| Calendar/period tests with `TZ=UTC` | Passed: 3 files, 135 tests |
| Same tests with `TZ=America/Los_Angeles` | Passed: 3 files, 135 tests |
| `git diff --check` | Passed, exit 0, for tracked changes |
| Separate task-file whitespace/link check | Passed: all 19 task files, including 16 new untracked files |
| `git diff --stat`, `git diff -- tsconfig.json docs/TASKS.md docs/PROJECT_CONFIG.md`, `git status --short` | Inspected; only three tracked task files modified and the expected new files; pre-existing untracked `.vscode/extensions.json` retained |

Counts above are test cases, not the number of assertions. Repeated targeted,
full-suite and timezone runs overlap and must not be added as distinct tests.
The full suite contains 312 tests, of which 240 are new for HB-008.

The calendar round-trip case covers first and last days in 119988 months across
years 0001..9999 (239976 endpoints), with independent fixed ordinals for years
0001, 0004, 1970, 2000 and 9999. Tests also pin 0099/0100, century leap rules,
2026/2028 February, inclusive remaining days, both date-range endpoints,
period transitions, and signed differences. No Date.UTC is used.

DST cases pin the spring/autumn 23/25-hour midnight intervals and seven Berlin
civil days across 167/169 hours. UTC month/year boundaries, year 0001/0099/9999
conversion, BC/out-of-range dates and invalid milliseconds are tested separately.

Money tests include values above Number.MAX_SAFE_INTEGER, int64 extrema, overflow
of inputs/results/partial sums, cancellation/zero-factor attempts to hide invalid
inputs, MIN negation/abs, negative/zero/positive amounts, quotient/remainder,
strict malformed inputs and exact JSON/decimal round-trips. MIN decimal parsing
and formatting do not require an out-of-range positive monetary intermediate.

`tests/types/hb-008.ts` contains seven @ts-expect-error assertions checked by tsc,
covering number money, unvalidated strings, date/period interchange, signed input
to nonnegative division and invalid Result branch access. It also checks
ADR-compatible Outcome shape. Five additional @ts-expect-error assertions in
runtime tests deliberately exercise untyped boundary calls. These are compiler
checks, not extra Vitest test cases. An unused directive fails typecheck.

## Reproduction

Run from the repository root in PowerShell; `.cmd` selects the Windows pnpm shim.

```powershell
pnpm.cmd exec vitest run tests/domain tests/shared/pure tests/architecture.test.ts
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd build
```

Next's native SWC cache is inaccessible under this sandbox, as previously
documented for HB-005. The successful typecheck/build used approved escalation;
no dependency installation, cache permission change or configuration workaround
was added. Build reads existing `.env.local`; this task never edits or prints
its contents. No DB/integration/migration command or Neon connection was made.

Executed timezone command:

```powershell
$hb008PreviousTimeZone = $env:TZ
try {
  $env:TZ = 'UTC'
  pnpm.cmd exec vitest run tests/domain/period.test.ts tests/shared/pure
  if ($LASTEXITCODE -ne 0) { throw 'UTC checks failed' }
  $env:TZ = 'America/Los_Angeles'
  pnpm.cmd exec vitest run tests/domain/period.test.ts tests/shared/pure
  if ($LASTEXITCODE -ne 0) { throw 'Timezone checks failed' }
}
finally {
  $env:TZ = $hb008PreviousTimeZone
}
```

Executed Git commands:

```powershell
git diff --check
git diff --stat
git diff -- tsconfig.json docs/TASKS.md docs/PROJECT_CONFIG.md
git status --short
```

The separate checker enumerated cached and untracked paths using `git ls-files`,
limited to HB-008 directories/files and `.ts`/`.md`/`.json` extensions. For all
19 task files it checked UTF-8 without BOM, trailing whitespace, final newline
and stray CR; for the two new documents it also checked local link targets and
balanced code fences. The initial broader enumeration also picked up the
pre-existing empty `src/shared/pure/.gitkeep`, which has no final newline; it was
left unchanged and excluded from the task-file check. Git's global-ignore
permission warnings do not change the successful diff/status results.

Reproduce the all-task-file check (including untracked files):

```powershell
@'
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
const scopes = ['src/domain/money', 'src/domain/periods', 'src/shared/pure',
  'tests/domain', 'tests/shared/pure', 'tests/types/hb-008.ts',
  'tests/fixtures/hb-008.ts', 'docs/planning/hb-008-money-dates.md',
  'docs/planning/hb-008-verification.md', 'docs/TASKS.md',
  'docs/PROJECT_CONFIG.md', 'tsconfig.json'];
const paths = execFileSync('git', ['ls-files', '--cached', '--others',
  '--exclude-standard', '--', ...scopes], { encoding: 'utf8' })
  .trim().split('\n').filter(path => /\.(?:ts|md|json)$/.test(path));
const failures = [];
for (const path of paths) {
  const content = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
    .decode(readFileSync(path));
  if (content.charCodeAt(0) === 0xfeff) failures.push(`${path}: BOM`);
  if (!content.endsWith('\n')) failures.push(`${path}: missing final newline`);
  content.split(/\r?\n/).forEach((line, index) => {
    if (/[\t ]+$/.test(line)) failures.push(`${path}:${index + 1}: trailing whitespace`);
    if (line.includes('\r')) failures.push(`${path}:${index + 1}: bare CR`);
  });
  if (path.startsWith('docs/planning/hb-008')) {
    if ((content.match(/^```/gm) || []).length % 2) failures.push(`${path}: fences`);
    for (const match of content.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)) {
      if (!existsSync(resolve(dirname(path), match[1]))) failures.push(`${path}: link`);
    }
  }
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else console.log(`PASS: ${paths.length} task files checked, including new untracked files`);
'@ | node --input-type=module
```

## Self-review and financial verification scope

Applied local skills: configure-project for executable checks and ES2020 target;
verify-financial-invariants for a self-check against BR-10/11 and primitive
scenario assertions. create-planning-doc was applied during approved planning.
This is implementer self-review, not an independent reviewer run.

| Requirement / source | Evidence |
|---|---|
| BR-10 integer cents and checked ranges | money and money-codec tests; no floating money conversion |
| ADR 0003 signed F support | Cents remains bigint; subtraction can return valid negative values; sign constraints are explicit |
| ADR 0003 exact q/r | money division fixtures, HB3-008/009 and HBL-015 primitive assertions |
| BR-10 Berlin dates | calendar/period/instant tests and both timezone runs |
| ADR 0003 years 0001..9999 | strict constructors, boundary/range tests, full-range month endpoint round-trips |
| ADR 0002 date versus instant/month | distinct date/period brands; known-instant conversion only; no invented same-day time/order |
| Existing architecture | unchanged architecture test passes with no external imports allowed in either pure layer |
| No checkpoint/payment/history mutation | no financial state/write/event/forecast API introduced; existing app suite passes |

Other finance invariants (full allocation sums, paid status, reserves, carry,
historical reports, authorization and idempotency) are not implemented by HB-008.
Their complete scenarios remain later task gates; unit success here does not
prove those future use cases.

## Risks and independent-review checklist

- Cents is bigint per ADR, so range is a runtime contract rather than a brand.
  Review all operand/result checks, including factor/divisor and MIN_CENTS.
- Review input-order sum overflow and direct signed MIN string construction;
  ensure no result is rescued after an overflowing intermediate.
- Review canonical cents/EUR syntax, two-digit formatting, negative-zero
  normalization and exact JSON boundary decoding. Locale comma handling remains
  a future UI decision; dot-only machine format is explicit.
- Calendar operations consume validated brands; unsafe casts can bypass this
  precondition. Server/JSON boundaries must always call constructors.
- Independently inspect ordinal/binary-search leap/century calculations and
  years 0001/0099/0100/9999; endpoint round-trips alone are not an independent
  mathematical proof, hence the separate anchored ordinals and leap fixtures.
- Intl conversion relies on installed ICU/IANA tzdata. Verify Berlin output and
  historical era handling on deployment runtime; no hardcoded historical offset.
- Inspect Result/Outcome compatibility and compile-time negative tests; no
  forecasting DTOs or policy logic should enter this foundation task.
- Review ES2020 compatibility and the unchanged import boundaries; repeat
  lint/typecheck/tests/build in the reviewer's environment.
- Confirm only HB-008 files changed, restricted files and DB/auth/dependencies
  untouched. This was the pre-acceptance checklist; independent review is now
  recorded above. No browser QA, DB integration, live OAuth or deployed runtime
  validation is claimed by this report.

## Skill-driven review

Историческая запись от 2026-11-02, до принятия владельцем. Выполнена дополнительная самопроверка реализации перед
независимым ревью. Это не независимое ревью и не основание переводить HB-008 в
Done. На момент этой самопроверки статус оставался Review; последующее
независимое ревью и принятие владельцем зафиксированы выше.

### Изученные инструкции и применимость

Прочитаны AGENTS.md, docs/CODEX_WORKFLOW.md, docs/AGENT_FACTORY.md и реальные
SKILL.md всех восьми перечисленных ниже skills. Также сверены BR-01..BR-11,
DATA_MODEL, ARCHITECTURE/architecture.json, conventions, принятый контракт
ADR 0003 и связанные сценарии HB3/HBL. Правила skills использованы в объёме
аудита существующей реализации; генерация новой архитектуры, соглашений,
сценариев продукта или инфраструктуры не требовалась.

| Skill | Применён / не применён | Почему | Конкретные инструкции, файлы и правила | Замечания |
|---|---|---|---|---|
| [verify-financial-invariants](../../.agents/skills/verify-financial-invariants/SKILL.md) | Применён | Проверка финансовых примитивов HB-008 | Пункты 1/2/4/5/7: BR-10/11, money.ts, money-codec.ts, все unit-тесты, проверка 1 цента, signed int64, DST, повторные команды. BR-01..09 проверены как граница ответственности: примитивы не меняют checkpoint, резервы или историю | Подтверждённых ошибок нет; полные финансовые сценарии не объявлены реализованными |
| [define-architecture](../../.agents/skills/define-architecture/SKILL.md) | Применён к проверке существующей архитектуры | Проверка размещения и связей семи новых исходных модулей | Пункты 1/2/5/6: ARCHITECTURE.md, architecture.json, DATA_MODEL, BR, import-граф, tests/architecture.test.ts; domain -> shared/pure, отсутствие циклов, framework/ORM/Node/network imports, дублирующего production Outcome | Нарушений нет. Изменения слоёв не предлагаются, поэтому оба архитектурных документа сохранены |
| [define-conventions](../../.agents/skills/define-conventions/SKILL.md) | Применён к проверке соглашений | Проверка строгого TypeScript и контрактов ошибок | Пункты 1/2/3/5: conventions.md, brand.ts/result.ts, money/date/period API, тестовые fixtures; именованные функции, отсутствие any/денежных number, readonly-входы/результаты, ошибки без исходных денежных данных, отсутствие логирования | Нарушений нет. ADR-имена Cents/Period имеют приоритет над рекомендательными MoneyCents/PeriodKey; новые соглашения не вводились |
| [create-scenarios](../../.agents/skills/create-scenarios/SKILL.md) | Применён к анализу существующих сценариев; авторинг не выполнялся | Проверка трассируемости и исключённых утверждений | Пункты 1/3/4/5/7: core-rules.md, HB3-002/003/008/009/023..026/032, HBL-015/025/026, пять unit-test файлов; synthetic cents, inclusive days, floor/remainder, GIVEN/WHEN/THEN и негативные утверждения проверены в исходных спецификациях | Несоответствий примитивов нет. Нет нового финансового поведения, поэтому новые сценарии с балансами/событиями не создавались; no-double-debit/carry/history остаются воротами HB-009+ |
| [configure-project](../../.agents/skills/configure-project/SKILL.md) | Применён | Проверка реальных команд и конфигурации | Пункты 1/6/7: package.json, lockfile, .env.example, список scripts/drizzle, CI, PROJECT_CONFIG.md, tsconfig, Vitest/ESLint/Next config; ES2020, strict, включение type-level файла, отдельность integration tests | Команды проходят; native SWC cache требует ранее одобренной эскалации. Версии/зависимости не менялись, registry/новая установка не требовались, DB-скрипты не запускались |
| [security-best-practices](../../.agents/skills/security-best-practices/SKILL.md) | Не применён; SKILL.md изучен | Scope — чистые TypeScript-примитивы, без серверной авторизации, новых endpoints или OAuth; отдельный security-аудит не запрошен | Проверена применимость к списку файлов HB-008; framework references не загружались, security report не создавался | Security findings этим skill не заявляются; проверки входов выполнены по BR/денежному контракту |
| [vercel-react-best-practices](../../.agents/skills/vercel-react-best-practices/SKILL.md) | Не применён; SKILL.md изучен | Нет React-компонентов, Next-страниц, data fetching или bundle-оптимизации в diff HB-008 | Scope src/domain, src/shared/pure, tests и документация; детальные React rules не применялись | Рекомендации React не переносились механически на чистые модули |
| [web-design-guidelines](../../.agents/skills/web-design-guidelines/SKILL.md) | Не применён; SKILL.md изучен | UI, login page и accessibility не меняются | Проверен список файлов; внешние UI guidelines не загружались | UI/accessibility review не заявляется |

### Проверенные файлы

Проверены все 19 файлов HB-008, включая содержимое новых untracked-файлов,
которые не видны обычному git diff:

- Исходники: src/domain/money/money.ts, src/domain/money/money-codec.ts,
  src/domain/periods/period.ts, src/shared/pure/brand.ts,
  src/shared/pure/result.ts, src/shared/pure/calendar.ts,
  src/shared/pure/berlin-date.ts.
- Тесты: tests/domain/money.test.ts, tests/domain/money-codec.test.ts,
  tests/domain/period.test.ts, tests/shared/pure/calendar.test.ts,
  tests/shared/pure/berlin-date.test.ts, tests/fixtures/hb-008.ts,
  tests/types/hb-008.ts.
- Документация/конфигурация: docs/planning/hb-008-money-dates.md,
  docs/planning/hb-008-verification.md, docs/TASKS.md,
  docs/PROJECT_CONFIG.md, tsconfig.json.

Дополнительно прочитан и повторно выполнен существующий архитектурный тест.
Import-граф просмотрен на циклы вручную: money-codec -> money -> brand/result;
period -> calendar -> brand/result; berlin-date -> calendar/result.
Обратных связей нет. Единственный production Result имеет форму Outcome ADR 0003;
локальный Outcome в type-level fixture служит только сравнением с ADR.

### Замечания и исправления

| Severity | Подтверждённые ошибки | Исправления |
|---|---|---|
| Critical | 0 | Не требуются |
| High | 0 | Не требуются |
| Medium | 0 | Не требуются |
| Low | 0 | Не требуются |

Ошибок, требующих изменения исходников или тестов, не обнаружено. В этом проходе
изменён только данный verification report. Масштабный рефакторинг, изменение
архитектуры или добавление библиотек не выполнялись.

Существующий round-trip календаря использует функции одной реализации, поэтому
сам по себе не исключает совпадающую ошибку прямого и обратного преобразований.
Это уже описанное ограничение доказательства, а не подтверждённая ошибка кода.
В этом проходе оно дополнительно проверено отдельным oracle ниже.

### Повторные проверки: фактические результаты

| Точная команда / проверка | Результат этого прохода |
|---|---|
| pnpm.cmd lint | PASS, exit 0, без предупреждений |
| pnpm.cmd typecheck | PASS, exit 0, Next route typegen + strict tsc, с одобренной эскалацией для SWC cache |
| pnpm.cmd test | PASS, exit 0, 13 файлов / 312 тестов |
| pnpm.cmd exec vitest run tests/domain tests/shared/pure tests/architecture.test.ts | PASS, exit 0, 6 файлов / 241 тест; включает architecture test |
| pnpm.cmd build | PASS, exit 0, production compile, TypeScript, page-data collection, генерация 8 entries |
| pnpm.cmd exec vitest run tests/domain/period.test.ts tests/shared/pure при TZ=UTC | PASS, exit 0, 3 файла / 135 тестов |
| Та же команда при TZ=America/Los_Angeles | PASS, exit 0, 3 файла / 135 тестов |
| In-memory compiler probe через node --input-type=module | PASS: ровно 12 deliberate diagnostics в 12 ожидаемых местах; TS2322: 1, TS2339: 1, TS2345: 10 |
| Дополнительный invariant probe через node --input-type=module, исходник ниже | PASS: 3652059 civil dates, 66049 signed pairs, 31775 divisions, 805 codec values |
| git diff --check | PASS, exit 0; tracked changes без whitespace errors |
| Документированный отдельный checker для tracked/untracked task files | PASS, exit 0; все 19 файлов, UTF-8/BOM, whitespace, final newline, локальные ссылки и fences |
| git diff --stat; git status --short --untracked-files=all | Проверены; Review сохранён. Существовавшие до этого прохода .vscode/extensions.json и hb-008-review.tar.gz оставлены без изменений |

Результаты повторных запусков не суммируются с 312 тестами основного набора.
Дополнительные probes — разовые исполняемые проверки, а не новые постоянные
Vitest-тесты и не независимое ревью.

Проверка type-level тестов создала TypeScript Program из действующего tsconfig,
убедилась, что три файла с директивами включены в root file names, и через
CompilerHost.readFile заменила @ts-expect-error только в памяти. Каждая
диагностика проверена на ожидаемой следующей строке; лишних или отсутствующих
ошибок нет. Исходники на диске не переписывались. Обычный typecheck с исходными
директивами также прошёл.

Первоначальный запуск дополнительного probe через
node --import tsx --input-type=module завершился до выполнения проверок:
tsx вызвал uv_os_get_passwd, недоступный в этой Windows-песочнице (ENOMEM).
Это не успешная проверка и не дефект HB-008. Успешный повтор использовал уже
установленный TypeScript для транспиляции модулей в памяти без tsx, файлового
emit, установки зависимостей или изменения окружения. Он не заменяет strict tsc.

### Дополнительные инварианты и воспроизведение

Calendar oracle последовательно обходит все дни Gregorian AD 0001..9999 через
явные UTC setter-ы JavaScript Date. Инициализация setUTCFullYear(1, 0, 1) не имеет
особого поведения конструктора для 0..99; Date.UTC не используется. Для каждой
из 3652059 дат сравниваются ISO oracle, результат addCalendarDays и ordinal.
Нет деления миллисекунд на 86400000. Oracle отделён от production ordinal-кода.

Денежный probe проверяет коммутативность сложения/умножения и обратимость
сложения/вычитания для всех 66049 пар из -128..128; для 31775 комбинаций
amount=0..1024, divisor=1..31 проверяет q*d+r=amount и 0<=r<d. В окрестностях
MIN/MAX, нуля и значений вне Number safe integer проверяются EUR и JSON
round-trip для 805 допустимых сумм. Проверки диапазона и неверных аргументов
остаются в повторно выполненном постоянном наборе.

Исполненный PowerShell inline probe:

```powershell
@'
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import ts from 'typescript';
const moduleUrls = new Map();
function moduleUrl(path) {
  const file = resolve(path);
  if (moduleUrls.has(file)) return moduleUrls.get(file);
  const output = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
  }).outputText.replace(/from (['"])([^'"]+)\1/g, (_, quote, specifier) => {
    const target = specifier.startsWith('@/')
      ? resolve('src', specifier.slice(2) + '.ts')
      : resolve(dirname(file), specifier.endsWith('.ts') ? specifier : specifier + '.ts');
    return 'from ' + quote + moduleUrl(target) + quote;
  });
  const url = 'data:text/javascript;base64,' + Buffer.from(output).toString('base64');
  moduleUrls.set(file, url);
  return url;
}
const { addCalendarDays, calendarOrdinal, parseBerlinDate } = await import(moduleUrl('src/shared/pure/calendar.ts'));
const { addCents, subtractCents, multiplyCents, divideNonNegativeCents, nonNegativeCents, MIN_CENTS, MAX_CENTS } = await import(moduleUrl('src/domain/money/money.ts'));
const { parseCentsString, serializeCents, parseEuroDecimal, formatEuroDecimal } = await import(moduleUrl('src/domain/money/money-codec.ts'));
const value = r => { if (!r.ok) throw new Error(r.code); return r.value; };
const check = (condition, message) => { if (!condition) throw new Error(message); };
const first = value(parseBerlinDate('0001-01-01'));
const oracle = new Date(0);
oracle.setUTCHours(0, 0, 0, 0);
oracle.setUTCFullYear(1, 0, 1);
let civilDates = 0;
for (let ordinal = 1; ordinal <= 3652059; ordinal += 1) {
  const iso = oracle.toISOString().slice(0, 10);
  check(value(addCalendarDays(first, ordinal - 1)) === iso, 'Date oracle shift ' + iso);
  check(calendarOrdinal(value(parseBerlinDate(iso))) === ordinal, 'Date oracle ordinal ' + iso);
  oracle.setUTCDate(oracle.getUTCDate() + 1);
  civilDates += 1;
}
let signedPairs = 0;
for (let a = -128n; a <= 128n; a += 1n) {
  for (let b = -128n; b <= 128n; b += 1n) {
    check(value(addCents(a, b)) === value(addCents(b, a)), 'commutativity');
    check(value(subtractCents(value(addCents(a, b)), b)) === a, 'inverse');
    check(value(multiplyCents(a, b)) === value(multiplyCents(b, a)), 'product commutativity');
    signedPairs += 1;
  }
}
let quotients = 0;
for (let amount = 0n; amount <= 1024n; amount += 1n) {
  for (let divisor = 1n; divisor <= 31n; divisor += 1n) {
    const { quotient, remainder } = value(divideNonNegativeCents(value(nonNegativeCents(amount)), divisor));
    check(quotient * divisor + remainder === amount && remainder >= 0n && remainder < divisor, 'Euclidean division');
    quotients += 1;
  }
}
let codecValues = 0;
for (const base of [MIN_CENTS, -9007199254740993n, 0n, 9007199254740993n, MAX_CENTS]) {
  for (let delta = -100n; delta <= 100n; delta += 1n) {
    const amount = base + delta;
    if (amount < MIN_CENTS || amount > MAX_CENTS) continue;
    check(value(parseEuroDecimal(value(formatEuroDecimal(amount)))) === amount, 'EUR round-trip');
    const decoded = JSON.parse(JSON.stringify({ cents: value(serializeCents(amount)) }));
    check(value(parseCentsString(decoded.cents)) === amount, 'JSON round-trip');
    codecValues += 1;
  }
}
console.log(JSON.stringify({ civilDates, signedPairs, quotients, codecValues, status: 'PASS' }));
'@ | node --input-type=module
```

### Оставшиеся риски и передача ревьюеру

- Cents остаётся bigint по ADR: диапазон проверяется runtime; unsafe casts
  обходят календарные brands. Это явные предусловия API, а не валидация JSON
  самим TypeScript.
- Intl instant conversion зависит от ICU/tzdata deployment runtime; локальные
  успешные проверки не подтверждают каждую историческую timezone-версию.
- Dot-only EUR input, nonnegative division и signed-int64 factor/divisor
  соответствуют согласованному API; UI-localization и прогнозы ещё не реализованы.
- Одноразовые probes дополняют постоянные regression tests. Их результаты не
  доказывают будущие allocation/payment/history/idempotency use cases.
- Typecheck/build требуют доступа к существующему native SWC cache; никаких
  cache permission/dependency changes в репозиторий не внесено.
- На этапе передачи независимому ревьюеру предлагалось проверить те же границы,
  типы и математические предусловия в отдельном контексте. Итог принятого ревью
  записан выше; повторный запуск полных lint/typecheck/Vitest/build ревьюером
  не заявляется.
- Не запускались DB integration/migrations, live OAuth, browser/UI или deployment
  проверки. База/Neon/OAuth/.env.local/.vscode/extensions.json не изменялись.
  Commit, push и PR не создавались; на момент самопроверки HB-008 оставалась Review.

