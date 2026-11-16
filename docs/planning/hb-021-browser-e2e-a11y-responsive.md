# HB-021 — план реальных browser E2E, accessibility и responsive QA

## Current authority — Owner Acceptance 2026-11-16

HB-021 is **Done** by explicit owner acceptance after independent review of A–J; J is **APPROVED with no findings**. Accepted proof: unit1170/1170, PostgreSQL544/544, LA552/552, DB17 two selected tests, H48/48, reduced I smoke2/2, Finance Gate596 scenarios /803 obligations /1171 references. See [D58](../DECISIONS.md#hb-021-owner-acceptance--2026-11-16), the preserved [J report](hb-021-j-verification.md) and [publication record](hb-021-publication.md).

The owner accepts Google provider login/relogin and native browser zoom200% as **NOT EXECUTED**, without further checks. Full WCAG/AT/NVDA/VoiceOver is outside mandatory personal-MVP acceptance; reduced MVP Accessibility Smoke is the accepted I scope. These exceptions supersede all earlier blocking zoom/provider/physical-AT wording below for HB-021 acceptance only. They do not turn unexecuted checks into PASS, replace financial/privacy/authorization proofs, or grant separate HB-019.2/HB-020 task acceptance. The integrated dependency runtime is accepted through A–I evidence.

Documentation finalization, necessary context-hash maintenance, commit, ordinary push and a PR into main are authorized. A fresh CI Finance Gate must validate the final proposed source after protected documentation edits. Historical J receipts and A–I proof remain unmodified and are not evidence of a post-edit Gate PASS. No merge/main update/deploy is authorized. Earlier planning text and failures below remain dated history.

## Archived planning baseline — 2026-11-13

Дата: 2026-11-13 (Europe/Warsaw). **PLANNING ONLY / на независимое ревью ChatGPT.**
Ни реализация, ни запуск тестов, ни публикация этим документом не разрешаются.
HB-021 остаётся Planned. Все будущие проверки ниже — **NOT EXECUTED**.

## Изменение scope I по решению владельца — 2026-11-16

Владелец заменил полный accessibility-аудит части I минимальным Accessibility
Smoke для MVP. Эта запись имеет приоритет над прежними требованиями I/AT ниже;
первоначальная planning-хронология не является текущим verification report.
H-R02, диагностика WebKit и полная H-матрица остаются обязательными, включая
отдельное честное evidence для native 200% zoom. Недоступный zoom — NOT EXECUTED.

Обязательные критерии I теперь:

- Keyboard smoke основных действий onboarding, update-budget, history и
  month-closing: Tab/Shift+Tab, Enter/Space, доступные основные controls и
  навигация по сохранённому отчёту/версии. Финансовые подтверждения через реальные
  Server Actions; чтение/preview/cancel не создают финансовых записей.
- Доступные имена и required основных обязательных полей; видимый клавиатурный
  фокус и понятная ошибка при неверном вводе.
- Компактный axe smoke основных экранов уже установленным инструментом, без
  новых зависимостей, исключения найденных правил или заявления WCAG compliance.
- Достаточны два RU/320 потока (onboarding/update и history/closing); повторять
  I по всем языкам, браузерам, темам и размерам не требуется. Это не сокращает H.

NVDA/VoiceOver, physical AT, исчерпывающая WCAG-матрица и подробная проверка каждого
ARIA-состояния исключены из обязательной приёмки I. Они не выполнялись и не
заявляются PASS; отсутствие AT больше не блокирует I по решению владельца.
Очевидные блокирующие keyboard-дефекты исправляются минимально; прочие находки
документируются. Новый scope не разрешает расширение production-изменений ради
необязательных улучшений. Уже полученное evidence и FAIL сохраняются.

## 1. Основание и фактическая main

Репозиторий: `strakhovdenya/home-budget`. Проверенный GitHub `main` и локальный
HEAD: `f8bfca7f836271cff87858c04be2cbf3643ce4e9` (2026-11-12,
`fix(release): enforce required Neon channel binding (#25)`). Чистая локальная
main обновлена fast-forward с `fde8f62`; новый коммит не создавался.

Прочитаны AGENTS.md, PRD, BUSINESS_RULES, DECISIONS (включая D50–D57), TASKS,
IMPLEMENTATION_PLAN, ARCHITECTURE/DATA_MODEL, conventions, AGENT_FACTORY,
CODEX_WORKFLOW; Accepted ADR0001–0003; AUTH/PROJECT_CONFIG; сценарии и отчёты
HB-019/019.1/019.2/020, finance-fingerprint и production initializer/channel binding.
Просмотрены package.json, CI, локальный DB guard/мигратор, Auth.js configuration,
ownership/session policy, history actions и существующие integration fixtures.

Навыки: `.agents/skills/create-planning-doc`, `create-scenarios`,
`verify-financial-invariants`, `configure-project`; для авторизации —
`security-best-practices` с Next.js/React/frontend references; для будущих
минимальных UI-исправлений — `vercel-react-best-practices` и
`web-design-guidelines`. Проектные ADR и установленные API имеют приоритет.

На этой main уже есть реальный Next.js runtime, Auth.js JWT, PostgreSQL/Drizzle,
onboarding, templates, history и closing. **Playwright, playwright.config и
test:e2e пока отсутствуют**; компонентный jsdom/синтетический Chrome harness
не равен browser E2E работающего приложения.

Существующий production-релиз принимается как контекст владельца. Его текущее
состояние здесь не проверялось. Release-документы main описывают исторический
этап подготовки и NOT EXECUTED для live-проверок; это не доказательство ни
отсутствия релиза, ни работоспособности production сегодня. Не запускать
`scripts/production-init/operator.ts`, не повторять initialization, не менять
channel binding/TLS, роли, production schema, Google OAuth или Vercel.

## 2. Цель, обязательный объём и исключения

Доказать работу критического пути **браузер → Next.js page/Server Action →
реальная изолированная PostgreSQL → результат → reload**. Числовые оракулы
берутся из существующих BR/сценариев, независимо от отображаемого результата.
Финансовые ответы не подменяются route mocks или вычислениями самого UI.

Обязательны: session/ownership boundaries; first run и существующий аккаунт;
actual checkpoint/full A; полные R/S и D36; paid/partial/cancel/release;
FRESH_START/CARRY/DEFER и same-identity two-step; templates ACCEPT/DECLINE;
полная история и три H/K/report perspectives; close/correction v1/v2;
RU/DE/EN, mobile/desktop, клавиатура, native 200% zoom и физический screen reader;
privacy, no-write reads, retries/conflicts/UNKNOWN и свежие доказательства.

Не входят: новые финансовые правила, DB migrations/schema, новая auth policy,
публичная регистрация/test-login endpoint, multi-account UX, HB-022 analytics,
HB-027 exact intra-day reconstruction, PDF/import, PWA/offline, production smoke,
OAuth/cloud configuration, deploy/rollback/restore. Старые утверждения «нет
реальных данных, можно менять схему» не применяются к существующему релизу.

**Необязательные UX-улучшения:** декоративные отступы/типографика/анимация,
редизайн dashboard, дополнительные подсказки и shortcuts, новые графики,
массовая визуальная snapshot suite. Выносить в отдельный backlog после QA.
Неверные суммы/даты/basis, скрытая UNKNOWN, недоступный Confirm, потеря focus,
нечитаемость на 320px/200%, неподписанная кнопка или отсутствующее announcement
ошибки — обязательные дефекты, а не косметика. Исправлять узко по воспроизведению;
финансовый дефект сначала доказывать нижележащим regression test.

## 3. Зависимости и точки остановки

| Зависимость | Что известно | Gate для последующей реализации/приёмки |
|---|---|---|
| HB-016–019.1 | Runtime есть; прежние тесты/приёмки имеют свои ограничения | Повторить актуальные критические пути; старый PASS не переносить |
| HB-019.2 | TASKS: Review / awaiting Owner Acceptance; D54 переносит browser/AT в HB-021 | Исполнить весь B/AT-объём HBH-001–007; отдельную Owner Acceptance не выдумывать |
| HB-020 | Код merged #23, но TASKS: Planned, локальная реализация/review; browser/AT и acceptance pending | Сохранить HB20-B01–B04 и T01–T03 как собственные HB-020 acceptance proofs; HB-021 их интегрирует, не освобождает от них |
| Production | Релиз уже существует по сообщению владельца | Только локальная копия кода и новая synthetic DB; не использовать release operator или cloud |
| Finance fingerprint | Стадия принята в HB-019.1; main содержит более поздний fresh release gate | Новый source/config/test diff требует нового run; context maintenance отдельно согласовывать, если потребуется |
| Auth transport | Нет разрешения менять OAuth, нет test bypass; Google-only admission одного пользователя | Разрешить Q-HB21-AUTH; независимо исполнить session и provider-login proof B01/B03/B04 до полного PASS этих сценариев |
| Tooling/AT | Playwright отсутствует; native zoom/physical AT требуют реального окружения | После одобрения плана pin devDependencies; зарезервировать оператора/браузер/AT; отсутствие проверки блокирует полную приёмку |

Документальные статусы не исправлять массово под факт merge/release. Перед финальным
HB-021 Owner Acceptance нужно отдельно подтвердить зависимости HB-019.2/HB-020.
Планирование и подготовка независимых локальных проверок не требуют объявления их Done.

## 4. Изолированное окружение и данные

1. После отдельного разрешения реализации: отдельный checkout/worktree и output
   build, PostgreSQL 18 disposable container с меткой HB-021/runId, порт только
   `127.0.0.1`, новые synthetic database/roles. Не использовать уже работающий
   ручной бюджет, его контейнер/том, `:3007` или иной найденный сервер.
2. До любого подключения проверить **все три** DATABASE_URL,
   DATABASE_URL_UNPOOLED, TEST_DATABASE_URL существующим
   `requireLocalDatabaseTargets`; добавить test-run admission, доказывающий один
   принадлежащий запуску контейнер/порт/DB и исключающий host override options.
   Одного слова local или одного env marker недостаточно. Приложение и SQL
   assertions должны смотреть в одну свежую E2E DB.
3. Для build/server/seed/migrate/test дочерних процессов передавать явно собранный
   environment. Не читать/копировать `.env.local`, `.env.production`, `.vercel`,
   shell profile или облачные credentials. Allowlist env вместо наследования
   process.env; synthetic auth secret существует только в памяти процесса.
   Next сам умеет читать env-файлы: применять отдельный чистый checkout без них;
   явные DB overrides одни не являются достаточной изоляцией.
4. Существующие `drizzle/0000…0005` применить обычным локальным migrator,
   повторно проверить его idempotence. Не вызывать production initializer.
   На E2E соединение runtime дать только необходимые права; migrator/seed отдельно.
   Никаких DISABLE TRIGGER, удаления immutable rows или TRUNCATE для reset.
5. Запускать fresh `next build`/`next start` на новом loopback origin/порту;
   `reuseExistingServer:false`. Readiness проверяет принадлежащий запуску процесс,
   а не только любой HTTP 200. Browser/server egress ограничен loopback;
   browser route blocking дополняет, но не заменяет запрет server-side network.
   Это граница offline session-authenticated E2E. Будущий настоящий Google
   login/relogin требует внешнего доступа и не запускается на этом loopback-only
   стенде: возможен только отдельный заранее согласованный изолированный тест
   по §5. Эта оговорка не разрешает внешнюю сеть текущему E2E run.
6. Начальный вариант — workers=1; независимая БД/свежий сервер на тест либо
   изолированную последовательность. BrowserContext на каждую проверку; two-tab
   race делит только свою fixture. Для будущего parallelism — отдельная DB,
   build/server и cookies на worker, без общей mutating storageState.
7. Данные создавать существующими validators/use-cases/repositories и реальными
   audit/receipts. Setup не подменяет проверяемое действие: например, first
   confirmation, payment и close в соответствующих E2E выполняет сам браузер.
   Legacy/corrupt-source fixtures допускаются только для собственных negative
   случаев, с документированными валидными исходными фактами.
8. Cleanup закрывает только принадлежащие run процессы/контейнеры и temp files;
   перед удалением проверить точные ID, label и абсолютные пути. Не очищать общий
   Docker/порты/тома/чужие DB. После сбоя сохранить безопасный диагноз и владение.

PG dump/restore из production запрещён даже для «анонимизации». Имена, UUID,
email вида `owner@example.test`, subject, title, суммы и календарные истории
генерируются синтетически. Не выводить DB URL, auth secret, cookie/JWT или env.

## 5. Авторизация: что именно будет доказано

Приложение допускает **одного** verified Google owner. Не расширять allowlist
для двух тестовых пользователей. Для account isolation: один admitted owner,
один owned budget и явно посторонняя synthetic identity/account как forbidden
fixtures; второй полноценный пользователь продукта не требуется.

Предлагаемый offline session fixture: test-only Node helper в `tests/e2e/support`
создаёт encrypted JWT через установленный Auth.js encode и временный synthetic
secret с корректным cookie name/salt. Заполняет только ожидаемые claims и
проверяет seeded Google subject/email binding. Настоящие `auth()`, callbacks,
`currentOwner`, ownership lookup, Server Actions и PostgreSQL остаются активны.
Нет runtime E2E flag, header shortcut, нового route/provider или mock requireOwner.
Этот helper требует отдельного review как test infrastructure, не попадает в src
или production bundle; cookie существует в памяти browser context, без файла.

Это **session-authenticated application E2E**, а не Google login E2E.
Синтетическая Auth.js-сессия не доказывает настоящий Google login/relogin в
**HB20-B01, HB20-B03 и HB20-B04**. Для каждого сохраняются две независимые
строки evidence; статус одной не наследуется другой:

| Сценарий | Session-authenticated browser proof | Provider-login proof | Текущие независимые статусы |
|---|---|---|---|
| HB20-B01 | После synthetic session: UNKNOWN, форма/review и одна реальная первая финансовая confirmation с PG proof | Настоящий первый admitted Google login, затем тот же first-run путь без cookie injection | Session: NOT EXECUTED; Provider: BLOCKED BY CONSTRAINT / NOT EXECUTED |
| HB20-B03 | Cancel/reload, UNKNOWN/known0, existing empty account и восстановление сохранённого состояния в session-authenticated browser | Настоящий logout→Google relogin с проверкой отсутствующего/сохранённого состояния; установка новой synthetic cookie не является relogin | Session: NOT EXECUTED; Provider: BLOCKED BY CONSTRAINT / NOT EXECUTED |
| HB20-B04 | Existing-account navigation/history и отказ expired-form action при synthetic session; точный no-write | Настоящий admitted Google login/relogin существующего пользователя и продолжение normal navigation/history без принудительного first run | Session: NOT EXECUTED; Provider: BLOCKED BY CONSTRAINT / NOT EXECUTED |

В дальнейшем каждой строке присваивать собственный фактический run/result/artifact.
Полный PASS B01/B03/B04 требует обоих доказательств и всех исходных assertions;
session PASS при provider NOT EXECUTED не закрывает сценарий.

При текущих ограничениях provider-login proof остаётся BLOCKED BY CONSTRAINT.
Внешний доступ для настоящего Google OAuth возможен **только в отдельно
согласованном изолированном тесте**, с заранее определёнными владельцем test
client/identity/redirect, разрешёнными внешними адресами и границами запуска.
Его приложение и финансовые данные по-прежнему используют только отдельную
synthetic local PostgreSQL; production-секреты, production client и реальные
финансовые данные запрещены. Такой тест не является исключением внутри offline
run: у него отдельные environment, сетевые разрешения, run ID и evidence.
Сейчас не разрешены ни этот запуск, ни изменение OAuth/secrets/redirects.
Владелец должен отдельно решить способ получения требуемого provider proof;
альтернатива, эквивалентность доказательств или waiver здесь не выбираются.
Локальный fake OIDC с изменением provider также не выбран.
Решение фиксируется в [OPEN_QUESTIONS](../OPEN_QUESTIONS.md#hb-021-local-auth-proof--planning-question).
До решения можно проверить все независимые session/financial пути; полная
приёмка HB-020/HB-021 с неисполненным provider proof B01/B03/B04 не заявляется.

Обязательные negative checks: anonymous, expired, tampered JWT, wrong subject,
missing/changed DB identity, invalid/foreign account/source/report/requestId;
сессия истекла после открытия формы; повторная авторизация каждого
preview/confirm/status/read; foreign Origin/Host и отсутствие required CSRF на
Auth.js HTTP actions; logout и direct return. Проверять ответ и точный no-write,
не один redirect. UI отказ нейтрален, не раскрывает чужой объект или winner.
Server Action запрос брать из настоящего браузерного запроса текущего build,
не hardcode внутренние action IDs и не добавлять test API.

После logout browser cookie очищен, fresh navigation/direct requests закрыты.
Не требовать глобальной revocation скопированного JWT: AUTH.md прямо описывает
эту существующую границу; новую revocation persistence не добавлять.

## 6. Независимые финансовые оракулы и календарь

Все суммы ниже — integer EUR cents, wire — canonical strings. Проверять
`A[p]>=0`, `ΣA=B`, `R=полный выбранный unpaid remainder`, `F=A-R-S`;
состояния/версии не суммировать. Возможные claims дают либо весь R, либо 0.
D36: `E=R+S`, `T=E[current]+Σ max(A[p],E[p])` по прочим периодам,
`safeAvailable=max(0,B-T)`, `safeDaily=safeAvailable div inclusiveBerlinDays`.
Expected income не попадает в B/A; checkpoint delta не называется расходом/доходом.

| Fixture / источники | Исходное состояние и действие | Независимый ожидаемый результат |
|---|---|---|
| HB20-A02/A07 | Нет account; подтвердить B100000,A={P:70000,Q:30000} | Один account+C+V+receipt; F[P]70000,F[Q]30000,safe70000; до Confirm B/A/F UNKNOWN |
| F-001 | B100000,R20000; actual B90000, partial payment5400 | B90000,R14600,F75400; банк не84600; remainder полностью reserved |
| F-002 | B50000,R20000; actual unchanged B50000, payment5400 | Без предупреждения/affirmation commit запрещён; после них R14600,F35400,B50000 |
| F-006/008 | B15000,R20000; отдельно B40000,R20000,S5000→release2000 | Дефицит5000,safe0,полный R; отдельно S3000,F17000,B40000,без debit |
| ADR0003 | B20000,A P15000/Q5000,R[Q]10000 | T10000,safe10000, F[P]15000; Q защищён один раз; при n3 main3333, remainder1 |
| HBUX-002/005/007 | Старые O20000,S15000; FRESH_START B80000 в P, затем отдельная оплата O при actual B60000 | Те же O/S: после transition R20000,S15000,F45000; после payment R0,S15000,F45000,B60000, без второго debit |
| HB20-T01/T02 | B100000,A P70000/Q30000, template5400 | ACCEPT R[P]5400,F64600; edited5000→F65000; DECLINE сохраняет F70000 и cash, но пишет только decision evidence |
| HB20-T03 | Те же B/A, старое R[M]5400,A[M]0; новая ACCEPT P5400 | Rtotal10800,F[M]-5400,F[P]64600,safe59200; DECLINE вместо ACCEPT оставляет safe64600,старый долг цел |
| HBH-002/003 | H=M-end,K0: B80000,A M60000/P20000,O20000,S10000; поздняя actual end B76000,A M56000/P20000 при K2 | Original F[M]30000/end UNKNOWN; later F26000/end76000; current B100000 не меняется; v1 immutable, v2 только Confirm |
| HBH-004 | Actual end B0,A0,R2000,S1000; отдельно нет C/V | Первая ветка observed0,F-3000; вторая B/A/F/end UNKNOWN с известными R/S; не подмена latest B |

Для браузера/PG P — текущий серверный Berlin month, Q — следующий, M — полностью
завершённый. HBH fixed Oct/Nov переносится в эквивалентные **завершённые** периоды
с теми же день/порядок/сумма отношениями; сохранить manifest соответствия и реальные
K/source IDs. При необходимости использовать P-2/P-1, чтобы поздние effective
дни тоже оставались в прошлом. Никакого fake server Date, auth/calendar bypass
или отмены PERIOD_NOT_ENDED. Снимок Berlin date до/после теста: пересечение
полуночи явно инвалидирует calendar-sensitive run, а не меняет oracle на лету.

Fixed-date leap/DST/year/age6→7→8/1-cent boundary assertions остаются в pure/PG
слое с существующим clock injection. В browser запустить TZ Europe/Berlin и
America/Los_Angeles при одном серверном asOf; проверить отсутствие device-month
подмены. Browser clock mock не доказывает серверный rollover. Реальные полуночь/
DST, если не наступили, отдельно NOT EXECUTED; соответствующий browser event
не объявлять выполненным по unit-тесту.

## 7. Матрица сценариев: существующие ID, без смены владельца

Каждая строка — обязательный proof group, не новый финансовый scenario ID.
B = реальный Next browser E2E; PG = отдельная проверка persisted facts;
M = ручной browser/physical AT. Подслучаи разбить на test functions, не скрывать
частичные результаты одним общим PASS. Полный список original IDs остаётся
в исходных [HBUX](../../tests/scenarios/phase-01/hb-019-1-budget-update-ux.md),
[HBH](../../tests/scenarios/phase-01/hb-019-2-financial-history.md),
[HB20](../../tests/scenarios/phase-01/hb-020-first-run-and-recurring-templates.md).

| Группа | Контракт | Действие / обязательное доказательство | Слой |
|---|---|---|---|
| Auth | HB20-A01/A03/A09,B01/B03/B04; BR-10 | Две независимые proof/status строки на каждый B01/B03/B04 по §5; anonymous/expired/tampered/subject/foreign denial; direct actions, logout, no disclosure/no-write | B+PG; provider login/relogin отдельно |
| First run | A01/A02/A07/A08,B01/B03 | UNKNOWN, cancel/reload, one Confirm, known0, existing empty account без rename/recreation; saved reload | B+PG |
| First run failure | A03–A06,B02/B04 | Invalid sum/sign/date/range, two tabs, same/different keys, lost response, status/retry; один winner, rollback/UNKNOWN | B+PG |
| Existing release regression | A09,B04 | Seed established account с C/V/O/S, preferences/history/v1/v2; login/session entry не запускает onboarding и не меняет данные | B+PG |
| Same-month update | HBUX-006/014/020/023/024/034/035; F-001/002/003/005 | Fresh check+full vector, equal amount новый check; no double debit/future inflation; backdated preview/result distinct from current | B+PG |
| Obligations/savings | HBUX-003–005/007/021; F-006/007/008; HB18 | Full R, partial payment, possible claim election, cancellation vs paid, S increase/release; deficits, no auto trimming/debit | B+PG |
| Transitions | HBUX-001/002/011–019/025/036 | Explicit FRESH_START; CARRY actual/reuse, DEFER; target once, old O/S identity, missed months; no default/write on visit | B+PG |
| Compound/stale | HBUX-008–010/017/018/023/036 | Same moving identity+lifecycle отказ и draft; затем два Confirm; disjoint allowed; stale/unsupported multi-source CARRY без writes | B+PG |
| Templates | HB20-T01–T03,F-016,D57 | Offer P, amount edit, origin=funding=P/dueDate null; ACCEPT/DECLINE terminal, Later no-write, disable/re-enable, old debt, next context | B+PG |
| Template races | T01/T02,B02 | Две вкладки ACCEPT↔DECLINE/ACCEPT↔ACCEPT, original-key replay, UNKNOWN resolution, context/config stale; truthful winner | B+PG |
| Month hierarchy | HBUX-026–033 | CURRENT dated card; PAST report first, FUTURE budget first; full-month future preview; UNKNOWN/0 и last check не month-end; Overview/Months различны | B+PG+M |
| Complete history | HBH-001 | Независимый census ≥45 saved batches, страницы20/20/5, >10; legacy/control/report/lifecycle/correction источники; ни omission, ни duplicate | B+PG |
| Original/later H/K | HBH-002/005 | Тот же H,K0/K2: точные суммы §6; source order/identity/funding/payment evidence; daily caption, не «после этого события» | B+PG |
| Immutable versions | HBH-003; HBUX-019/027/028 | Separate daily/report v1/v2, explicit v1 reload; source/hash/predecessor; browse не публикует v2 | B+PG |
| Missing/zero | HBH-004; HBUX-028/029 | Observed0, incomplete и no-observation отдельно; full R/S/negative F; no interpolation/current substitution/past live forecast | B+PG |
| Stable owned reads | HBH-006 | Concurrent append после page1; pinned K_index/lastSeq, prev/next/filter/refresh; tampered/foreign/oversize/source error; basis mismatch discard | B+PG |
| History accessibility/privacy | HBH-007; HBUX-022/032 | RU/DE/EN,320/desktop/native200%, keyboard/focus/announcements, screen reader; URL/log/storage clean, no money writes | B+PG+M |
| Closing | HB19/BR-08,F-009/013 | Incomplete v1 без final-day check; observed-end/0; late correction pending, explicit reason/v2, v1 bytes intact, current head intact | B+PG |
| Closing failures | HB19 E/R/Q06/Q07; HBUX-023/035 | Stale head/no-change/rollback/replay, saved-but-history-failed vs UNKNOWN; real navigation/Suspense/reload при Q07 | B+PG |

Lower-layer race proof использует независимые connections/backend PIDs и barrier;
две вкладки и disabled button сами не доказывают atomicity. Lost browser response
не считается lost COMMIT ack: отдельно существующий PG fault test с **реальным
COMMIT**, новой connection и original receipt. Отчёт связывает оба доказательства.
Транспортный abort/delay допустим для error/recovery cases; happy path не мокируется.
Corrupt-source case требует owned disposable DB и видимой ошибки, не фиктивной
успешной истории. Сохранять соответствующие исходные PG proofs HB-020/HBH.

HB19-Q07 (React/render/Suspense diagnosis) остаётся OPEN / NOT REPRODUCED,
пока конкретный authenticated route/reload reproduction не доказан. Если не
воспроизведён — приложить точные шаги/browser/build/log categories и отдельную
review disposition, не писать FIXED. Воспроизведённый crash критического пути
блокирует приёмку; невоспроизведённый риск требует явного owner disposition.

## 8. Locale, viewport, accessibility и no-write

Обязательный основной проект: Chromium desktop1280×900 и mobile320×800,
RU/DE/EN (6 комбинаций). В каждой — first confirmation/session entry, ordinary
update/reload, template decisions, transition→отдельный payment, history three
perspectives и closing v1/v2. Invalid/race/fault combinatorics выполнять на RU
desktop; во всех языках проверить локализованные ошибки/UNKNOWN/status и recovery.
Дополнительно обязательный smoke Chromium375×812 и Firefox/WebKit desktop+375
для session/update/history/closing; iOS device emulation не называть реальным Safari.
Это граница плана QA, не обещание поддержки всех устройств.

RU — default; locale переключается существующим control/cookie без locale prefix.
Проверять EUR separators/NBSP, dates и cents, отсутствие raw enums/untranslated
keys; русские/немецкие длинные labels. Для каждого языка light/dark и system
switch: contrast/focus/deficit/unknown meanings сохраняются, деньги не меняются.

Native browser zoom **200%** вручную, каждый язык и три history perspectives,
form/review/error/result и month versions. Записать browser/OS, native zoom и
исходный viewport; CSS zoom/deviceScaleFactor/маленький viewport не замена.
320px проверить геометрией и screenshot: нет page-wide overflow/clipping,
Confirm/Next/Previous доступны, допустимая локальная прокрутка таблиц подписана.

Accessibility I после решения владельца 2026-11-16: минимальный keyboard smoke
onboarding/update/history/month-closing, основные accessible names/required,
видимый focus и понятная validation error. Компактный axe smoke уже установленным
`@axe-core/playwright` на основных экранах, без отключения правил ради PASS.
Неразрешённая находка на проверяемом smoke-экране фиксируется как FAIL; axe не
является сертификатом WCAG. Полная language/theme/browser/viewport a11y-матрица,
каждое ARIA-состояние и физические NVDA/VoiceOver проверки не входят в обязательную
I-приёмку. Фактическое отсутствие screen-reader proof отмечается NOT EXECUTED,
а не подменяется ARIA snapshot. H-матрица и native 200% остаются отдельными.

No-write: до/после browse/preview/cancel/locale/theme/history/report navigation
снимать канонический census/digests C/V/A,O/S/events/funding, batches/audits/
receipts, periods/counters/pointers, transition controls, report heads/bytes.
Read transactions не создают financial/audit/receipt rows. Auth login может
создать только users identity в своём отдельном сценарии; locale/theme cookies
не финансовые записи. DECLINE/CONFIG — **явные writes**, для них whitelist
decision/config audit/receipt/counters, cash/R/S/report неизменны. ACCEPT пишет
один обычный CREATE/full reserve. Не называть DECLINE all-table no-write.

Privacy: inspect owned-browser URLs, query/referrer, console/server categories,
localStorage/sessionStorage/IndexedDB, service-worker/cache registration и
непреднамеренные external requests. Допустимы существующие locale/theme settings
и HttpOnly auth cookie; финансовые drafts/history/basis/requestId не сохраняются
в URL или browser persistence. Запрет относится к утечкам/логам, а не к необходимым
same-origin request bodies и UI authenticated пользователя.

Не сохранять storageState/cookies/HAR/token headers. Trace может содержать cookie:
по умолчанию отключён; для диагностики только временно, локально, без публикации,
с проверкой/очисткой перед экспортом. Screenshots/video/report содержат только
synthetic UI; публикуемый пакет не включает auth traces, env или сырые headers.

## 9. Узкие части реализации после одобрения

Это части **одного HB-021**, не новые задачи TASKS и не команда реализовать их сейчас.
Каждая часть имеет ≤5 acceptance criteria и ≤7 proof groups; отдельные test
functions внутри группы сохраняют исходные IDs/подслучаи и результаты.

| Часть / зависимости | Критерии приёмки (до 5) | Proof groups (до 7) |
|---|---|---|
| A. Harness / review плана | Fail-closed local admission; clean env/build; real PG+server; owned cleanup; pinned dev-only tooling | Remote target refusal; URL override refusal; fresh migration/reapply; fresh server; synthetic seed; cleanup-on-failure |
| B. Auth/session / A,Q-HB21-AUTH | Real auth callbacks; foreign/expired denial; per-action ownership; logout; login gap честно указан | Anonymous; valid session; tampered/expired; subject/DB mismatch; foreign actions/status; Origin/CSRF; logout |
| C. Onboarding / A,B | UNKNOWN/0; atomic first Confirm; original retry; safe failure; established account unchanged | B01 application portion; B02 invalid/double; A05 race; A06 UNKNOWN/rollback; B03 cancel/zero; existing empty; B04 regression |
| D. Finance / A,B,C | Exact B/A/R/S/D36; paid no debit; savings explicit; no auto transition; same-identity two-step | Routine; partial/pay/cancel; S lifecycle; FRESH_START/missed; CARRY/reuse; DEFER; compound/stale/future |
| E. Templates / A,B,D | P origin=funding; ACCEPT unique; DECLINE terminal; Later inert; old debt/history retained | T01; T02 edited; T02 DECLINE/relogin; Later/disable; T03; races; UNKNOWN/config/context |
| F. History / A,B,D,E | Complete census; H/K exact; immutable versions; basis/ownership; read-only/privacy | HBH-001;002;003;004;005;006;007 browser flow |
| G. Closing / A,B,D,F | Unknown-end close; real0; v1 retained; v2 explicit; failures safe | Incomplete close; observed-end; late point; v2; stale/no-change; UNKNOWN/replay; Q07 navigation |
| H. Locale/layout / C–G | RU/DE/EN meaning;320+desktop; native zoom; themes; browser smoke | Locale dates/money; mobile; desktop; 200%; dark/system; Firefox; WebKit |
| I. MVP accessibility smoke / H | Основные names/required; keyboard/visible focus; понятная ошибка; компактный axe уже установленным инструментом | Два RU/320 smoke: onboarding/update и history/month-closing; без обязательной physical AT/WCAG-матрицы (решение владельца 2026-11-16) |
| J. Evidence/review / A–I | Fresh lower-layer gate; source frozen; exact mapped B/PG/M results; no secret artifacts; independent review+Owner Acceptance | Lint/types; unit UTC; PG+DB17; timezone LA; build; current finance gate; Playwright+manual matrix audit |

При обнаружении финансового/schema/auth-policy дефекта: сохранить reproduction,
добавить failing lower-layer scenario/test, описать минимальный diff и влияние на
существующий release. Если нужна смена BR/ADR/schema/OAuth — остановить зависимую
реализацию и запросить отдельное решение, не «исправлять ради зелёных тестов».

## 10. Ожидаемые файлы изменений

Сейчас меняются только этот план и запись вопроса в OPEN_QUESTIONS.
Дальнейший список — прогноз, уточняемый после ревью, не разрешение на правку.

| Файлы | Назначение / граница |
|---|---|
| `playwright.config.ts` (новый) | Loopback baseURL, projects/locales/viewports, timeouts/reporters, no reused server/hidden retries |
| `scripts/e2e/run.mjs` (новый) | Env/container/build/server admission, orchestration и owned cleanup; без dotenv/production operator |
| `tests/e2e/support/{database,seed,session,assert-state}.ts` (новые) | Local targets, fixtures, offline session, независимый persisted census/no-write |
| `tests/e2e/{auth,onboarding,budget-update,transitions,obligations-savings,recurring,history,month-closing,accessibility}.spec.ts` (новые) | Реальные browser actions и assertions с оригинальными ID |
| `tests/e2e/README.md` (новый) | Safe local launch, scopes, manual native zoom/AT и auth limits |
| `package.json`, `pnpm-lock.yaml` | Только pinned devDependencies Playwright/axe и реальные `test:e2e` scripts; без stack upgrade/runtime dependency |
| `.gitignore` | Exclude results/reports/auth/temp, без скрытия исходников и уникального sanitized evidence |
| `vitest.config.ts`, `vitest.integration.config.ts` — только при доказанной необходимости | Текущий Vitest уже выбирает только `*.test.ts/tsx`, поэтому новые `*.spec.ts` не требуют его правки; не менять assertions/timeouts ради PASS |
| `tests/integration/*.test.ts`, соответствующие unit/component tests — условно | Минимальный independent oracle/fault regression, reuse существующих fixture factories без weakening |
| `src/features/**`, `src/app/**`, `src/shared/i18n/messages/{ru,de,en}.json`, `src/app/globals.css` — только по доказанному дефекту | Узкие focus/label/layout/copy/refresh fixes; конкретные пути включить в diff после reproduction |
| `docs/planning/hb-021-verification.md` (позже) | Один основной итоговый отчёт: IDs→test names→actual run/artifacts и manual results, limitations и dispositions |
| `docs/PROJECT_CONFIG.md`, `docs/TASKS.md` — позднее, при разрешении | Документировать реальные команды/состояние, не отмечать Done до review+acceptance |

Не планируется менять `drizzle/**`, `src/infrastructure/db/schema.ts`, domain
формулы/selectors, auth production config, release operator/channel binding,
OAuth/secrets/env, Vercel, старые receipts или архивные evidence. CI/checker/
coverage.json/HBH bindings не расширять: D53 сохраняет существующий gate.
Локальный отдельный Playwright run/report — обязательный proof, а не новый CI gate.
Если protected context pins устареют, нужна отдельная узкая согласованная freshness
maintenance и fresh runs; не менять список охваченных источников или пороги.
Добавленная сейчас запись в OPEN_QUESTIONS меняет protected normative context:
прежний gate PASS не является доказательством этого planning diff. В этом turn
hashes/manifest/receipts не обновляются и gate не запускается.

## 11. Риски и меры

| Риск | Контроль / что блокирует |
|---|---|
| Унаследованный remote env или чужой сервер | Clean checkout+env allowlist+все URL guard+container identity+fresh server; отказ до connect |
| Cookie fixture ошибочно назван Google login/relogin | Независимые session/provider evidence и статусы для каждого B01/B03/B04; Q-HB21-AUTH; cookie не закрывает provider proof |
| Seed обходит проверяемую логику | Valid audited histories; действие под тестом через UI; SQL oracle независим от UI |
| Shared state/flaky retries | DB/context isolation, explicit barriers, eventual assertions вместо sleep; retries=0 для acceptance, rerun с причиной |
| Calendar drift | Server-relative completed months, captured Berlin date, lower-layer fixed DST/leap; честный actual-clock scope |
| Тихая потеря истории | ≥45 census, page/filter coverage, legacy/control/corrupt entry, basis comparison, immutable bytes |
| UNKNOWN или saved-history error превращён в повторный debit | Real commit/rollback split, original key/status/replay, fresh connection, UI truthful outcome |
| Трасса содержит секрет | No storageState/HAR, trace off, redact/inspect export; temp auth artefacts не входят в review package |
| Zoom отсутствует; AT исключена из I | Native zoom H — NOT EXECUTED до ручной проверки; AT не выполнялась, но более не обязательна для I по решению владельца 2026-11-16 |
| Широкий UI/финансовый refactor ради тестов | Reproduction→small test→small fix→review; schema/BR decision отдельно |
| Старые статусы/gate PASS выданы за новые | Не менять исторические claims; fresh SHA/run mapping; explicit pending dependencies |
| Уже существующий production затронут QA | Только synthetic local resources; release operator/deploy/cloud запрещены; патч проверяется как регрессия работающего продукта |

## 12. Итоговые критерии приёмки и evidence protocol

1. На зафиксированном SHA реальный Playwright проходит mandatory matrix по
   UI→server→local PG, включая invalid/auth/conflict/UNKNOWN; точные суммы,
   audit/receipt counts, identity/funding/H/K и immutable versions проверены.
2. HBH-001–007 browser evidence, 20-row complete census и все три perspectives
   доступны; H сохраняет RU/DE/EN,320/desktop/native200%. I принимается по
   минимальному MVP smoke, определённому решением владельца 2026-11-16 выше;
   physical AT и полная WCAG-матрица не обязательны. Неисполненное не получает PASS.
3. HB20-B01–B04/T01–T03 имеют собственное honest evidence; provider-login gap и
   зависимости acceptance разрешены явно. Для каждого B01/B03/B04 отдельно
   исполнены session-authenticated browser proof и настоящий provider-login/relogin
   proof; независимые статусы/run IDs сохранены. Session injection не закрывает
   provider proof или полный сценарий. Исходные критерии приёмки не ослабляются.
4. Нет обращения к production/Neon/Vercel/реальным данным, auth weakening,
   финансового schema/rules изменения; артефакты sanitized. Обязательные дефекты
   устранены/reviewed; optional UX отделены, Q07 имеет явную disposition.
5. На final source выполнены lint/typecheck/build, unit UTC, isolated-PG,
   DB17, timezone LA и неизменный Finance Gate с новыми receipts; browser/manual
   отчёт отдельно. Независимое review и отдельная Owner Acceptance предшествуют Done.

Будущий запуск: после реализации `test:e2e` orchestrator создаёт local environment,
мигрирует, seed-ит, build/start и вызывает `playwright test`; точные команды и
exit codes фиксировать из выполненного run, а не обещать существующий script
сейчас. Existing gate protocol — init → unit/record → integration/record →
timezone/record → check; не переиспользовать прошлые receipts. Significant edit
после freeze требует нового evidence по соответствующему scope.

В основном verification report: source SHA+dirty diff digest, Node/pnpm/browser/
Playwright/PostgreSQL versions, synthetic fixture ID/calendar mapping,
container identity без credentials, runId, command+exit+counts/duration,
original scenario ID→test title→locale/viewport→PG oracle→artifact,
native zoom/AT transcript/оператор/date, unresolved risks. Отдельные статусы:
PASS / FAIL / NOT EXECUTED / BLOCKED BY CONSTRAINT; retry не стирает failure.
Run-bound reports исходных suites сохраняются без редактирования.

## 13. Проверено сейчас и передача на ревью

В этом planning turn: read-only inspection перечисленных документов/кода,
проверка GitHub main, fetch и fast-forward без нового коммита; подготовлен план.
Runtime/unit/integration/Playwright/AT, DB migrations/containers, production
операции **не запускались**. `.env.local` не читался и не изменялся.
Документальная проверка: `git diff --check` exit0; Node read-only проверка UTF-8
и всех относительных file links в обоих изменённых Markdown — exit0.
Git status показывает только этот новый план и OPEN_QUESTIONS; index не менялся.
Это не runtime/finance/browser PASS.

Пункты для независимого ChatGPT review: безопасный offline session fixture и
незакрытый Google proof; достаточность матрицы/ручной AT; no-write whitelist;
calendar-relative fixtures; D53/fingerprint boundaries; размер частей и условные
файлы UI. После плана работа останавливается. Commit/push/PR/deploy не выполняются.

Справочные первоисточники tooling, просмотрены 2026-11-13:
[Playwright authentication](https://playwright.dev/docs/auth) — contexts и
конфиденциальность auth state;
[webServer](https://playwright.dev/docs/test-webserver) — управление test server;
[accessibility](https://playwright.dev/docs/accessibility-testing) — automated
checks не заменяют manual accessibility;
[Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)
— labels/focus/forms/reflow. Они не меняют продуктовые BR или acceptance scope.
