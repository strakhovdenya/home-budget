# HB-018 — Obligations and savings management screens

**2026-11-03 · PLANNING ONLY · Proposed for independent ChatGPT review.**
План и сценарии не утверждены и не разрешают реализацию. HB-018 остаётся Planned.
После независимого ревью требуется отдельное разрешение владельца. Код, тестовые
реализации, ADR, формулы, БД, зависимости и конфигурация в этой работе не меняются.

## 1. База и источники

Ветка `main`; исходные index и рабочее дерево чистые. HEAD, локальные `main`,
`origin/main` и удалённая `refs/heads/main` равны
`8e650d1b286a14b2ae4bb1a20cd625fa816f9f7a`. Read-only `git ls-remote` сначала
не прошёл из sandbox, повторная разрешённая проверка успешна. Fetch, reset,
stash, checkout не выполнялись; игнорируемая `.vscode/` сохранена. Git сообщает
о недоступном глобальном ignore; настройки не изменялись.

Нормативная база: [PRD](../PRD.md), [BR-01–11](../BUSINESS_RULES.md),
[TASKS HB-018](../TASKS.md), [DECISIONS](../DECISIONS.md),
[OPEN_QUESTIONS](../OPEN_QUESTIONS.md), [ADR0001](../adr/0001-checkpoints-and-allocations.md),
[ADR0002](../adr/0002-month-closing-and-corrections.md),
[ADR0003](../adr/0003-daily-forecast-and-liquidity.md),
[ARCHITECTURE](../ARCHITECTURE.md), [границы](../architecture.json),
[DATA_MODEL](../DATA_MODEL.md), [DATABASE](../DATABASE.md),
[conventions](../conventions.md), [IMPLEMENTATION_PLAN](../IMPLEMENTATION_PLAN.md),
[AGENT_FACTORY](../AGENT_FACTORY.md), [CODEX_WORKFLOW](../CODEX_WORKFLOW.md).

Текущую реализацию читать вместе с [планом HB-017](hb-017-update-budget.md) и
[фактической приёмкой HB-017](hb-017-verification.md): ранние разделы плана
описывают исторический planning этап. HB-017 принят владельцем с исключением
Medium **HB17-A03**; независимое implementation review осталось CHANGES REQUESTED.
Отдельное сообщение о достоверном OAuth failure не полностью реализовано.
HB-018 не исправляет это исключение и не расширяет auth scope.

Проверены контракты/реализация и связанные сценарии/тесты HB-009–017: immutable
commands/receipts, checkpoints, lifecycle O/S, funding, forecast, coverage gate,
dashboard и atomic update. Точные переиспользуемые файлы перечислены ниже.
Исторические verification results не являются новыми выполненными тестами.

Прочитаны восемь запрошенных project skills: create-planning-doc,
create-scenarios, verify-financial-invariants, define-architecture,
security-best-practices, configure-project, vercel-react-best-practices,
web-design-guidelines. Для React рассмотрены server-auth-actions,
server-serialization, server-no-shared-module-state, async-parallel; security
references Next.js/React/general frontend используются как checklist границ,
без отдельного security audit или изменения auth. Актуальные
[Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)
прочитаны для будущей UX-проверки. Проектные privacy/architecture rules имеют
приоритет над общими советами о URL state, caches и browser storage.

## 2. Scope и exclusions

Два защищённых раздела `/obligations` и `/savings`: текущий список, детали,
immutable история, создание и разрешённые действия. Все действия с денежным
состоянием завершаются существующим review/confirm `/update-budget`.
На management-экранах нет quick-save, write-on-open, автоплатежа или auto-release.
Даже переименование проходит тот же update для единого audit/receipt.

Включить фильтр funding month и lifecycle status, possible/reservation indicator,
due date, current totals, дефицит и безопасный дневной лимит D36, явное
предложение release для выбранного накопления. Список по умолчанию показывает
все identities, с фильтром «Все месяцы»; скрытый текущий месяц не должен прятать
старые долги или future-funded reserves. Сортировка обязательств: UNPAID раньше,
внутри — due date по возрастанию, null после дат, затем стабильный identity tie-break.
PAID/CANCELLED доступны отдельными фильтрами; savings ACTIVE/RELEASED аналогично.

Не входят удаление, reopen терминальных identities, произвольная установка
outstanding/S, target savings amounts/deadlines/progress, recurring HB-020,
операции/PDF/import/export, multi-source CARRY, overdraft, historical overspend,
ручное закрытие/создание report v2 HB-019, новый correction editor. История уже
поддержанных corrections отображается, но новые risky historical corrections
не создаются этим экраном. Нет новых business actions/schema/dependencies/PWA.

## 3. Точные lifecycle contracts

Основа: `src/domain/obligations/{contracts,lifecycle,validation,history}.ts`,
`src/domain/savings/{contracts,lifecycle,validation,history,evidence,proposal}.ts`,
`src/domain/budget-update/{contracts,validation,planning}.ts`.

| UI действие | Existing action / ограничения |
|---|---|
| Новое обязательство | CREATE: title 1–200 Unicode code points, positive originalCents; outstanding=original, UNPAID; origin/funding явно заданы |
| Изменить обязательство | AMEND только title, dueDate, originalCents, isPossible, reserveFull; оплаченная часть сохраняется: new outstanding=new total−already settled, должен остаться >0 |
| Зарезервировать возможное | AMEND reserveFull=true/false, весь remainder либо 0; смена isPossible требует явного reserveFull; ordinary UNPAID всегда true |
| Частичная оплата | PARTIAL_SETTLEMENT: 0<amount<outstanding; remainder полностью резервируется при reserveFull=true |
| Полная оплата | PAID: amount ровно outstanding, after outstanding=0/reserveFull=false |
| Отмена | CANCELLED: пустые data, reserveFull=false; unpaid remainder сохраняется как историческое состояние, не платёж |
| Создать накопление | CREATE: title 1–200 Unicode code points, amount>0, ACTIVE, origin/funding |
| Изменить накопление | AMEND только изменившийся title; amount нельзя переписать через AMEND |
| Увеличить | INCREASE: отдельная положительная подтверждённая сумма, exact increase evidence |
| Освободить часть / всё | PARTIAL_RELEASE: 0<amount<S; FULL_RELEASE: amount=S, after RELEASED/S=0; exact release evidence |
| Перенести funding | Только существующий transition flow с FUNDING_TRANSFER; не поле AMEND и не самостоятельная management write action |

PAID/CANCELLED и RELEASED терминальны для обычных команд: доступны просмотр и
история. Возможность — флаг `isPossible`, не четвёртый lifecycle status.
Нет savings cancel/delete, отдельного reserve amount или автоматического reopen.
При AMEND суммы название «Сумма обязательства» относится к total выбранной ревизии;
история отдельно сохраняет сумму при создании. Не выдавать revised total за
неизменяемый первоначальный ввод.

Payment требует actual check в том же aggregate update, bankStateAffirmed и
точный source. Если B равен прежнему — отдельные warning и
unchangedBalanceAcknowledged. OUTSIDE_TRACKED_CARD требует reason и по текущему
контракту прежний checkpoint с тем же B плюс acknowledgment; changed B/no prior
checkpoint отклоняются, даже если UI мог бы предположить объяснение.
Не подставлять B−payment, не выводить payment amount из checkpoint difference.

## 4. Интеграция с HB-017 и сравнение вариантов

| Вариант | Удобство | Сложность / риски | Решение |
|---|---|---|---|
| Выбор identity/action в памяти → единый `/update-budget`, общие editors | Один предсказуемый review, пользователь видит B/A и согласия | Нужен scoped handoff и сохранение mounted draft; URL не несёт identity/суммы | **Предлагается** |
| Встроенный полный UpdateBudgetScreen в drawer каждого раздела | Не покидает список | Повторная композиция большого flow, focus/scroll, несколько активных drafts/unknown outcomes | Не выбирать в первом HB-018 |
| Отдельные direct saves для O/S с последующим checkpoint | Меньше полей | Раздельные commits, bypass согласий, частично сохранённый бюджет | Несовместимо с требованиями |

### 4.1. Handoff и draft lifecycle

Предложение: client-only `BudgetDraftProvider` в существующем root layout вокруг
route children. Он хранит **один** активный draft, одно выбранное намерение,
review generation и исходный requestId/payload при неизвестном исходе.
Это React instance state, не server module singleton и не persisted entity.
Не класть финансовое состояние в shared-ui, cookie, localStorage, sessionStorage,
IndexedDB, history.state, query/hash/path URL или analytics. Locale/theme
preferences используют существующий разрешённый механизм отдельно.

Management link ведёт на статический `/update-budget`; обработчик передаёт
kind, opaque identityId, expected state revision, requested existing action и
статический return route в provider. Передача ничего не сохраняет и не даёт
авторизации. На новом owned seed сервер подтверждает scope, identity/revision и
доступное действие; только после совпадения seed выбирается editor и получает
актуальные title/amount. Не переносить checkbox consents: все остаются false.
CREATE передаёт только kind/action, без выдуманной identity или checkpoint.

Прямой вход/new tab/middle-click без handoff открывает обычную форму HB-017:
не восстанавливать выбор из URL и не обещать cross-tab draft. Context потребляется
однократно; back/forward не добавляет второй edit. Если уже есть draft — показать
явный выбор «вернуться к черновику / заменить после предупреждения»; не merge
автоматически. Для unknown outcome замену/новый submit блокировать до status или
повтора **исходной** команды. Обычные ошибки и навигация в том же provider
сохраняют ввод; любое изменение invalidates preview. Reload/crash/full OAuth
redirect могут потерять память — честно предупредить, не обещать recovery.

Смена/утрата owner/account уничтожает видимость старого state; новый authorized
seed не может получить старый draft. Выход/сессия: fail-closed, no auto resume
financial submit. Перед confirm каждый endpoint заново авторизуется. Root layout
не делает page-specific финансовые reads на login и не сериализует draft в HTML.
Проверка scope и mounted provider navigation — отдельный обязательный spike до UI.
У нынешнего `UpdateSeed` нет scope marker: будущий app composition adapter должен
передать минимальный opaque owner/account binding marker из authenticated server
context. Он служит только для очистки/изоляции React state, не является credential
и не заменяет authorize. Не добавлять его в существующий canonical financial
payload/hash и не принимать client marker как доказательство account ownership.

### 4.2. Единственный write path

Переиспользовать `src/app/update-budget/actions.ts`:
loadBudgetDraft → previewBudgetUpdate → confirmBudgetUpdate;
budgetUpdateStatus и budgetUpdateHistory для неизвестного исхода/receipt.
`createBudgetUpdates` и существующий repository снова строят review под lock.
Никаких вызовов legacy standalone confirmObligation/confirmSaving из нового UI.

Nonpayment edit может использовать **явный** существующий
ALLOCATION_ONLY/REDISTRIBUTE + REUSE_CONFIRMED и unchanged-funding/vector review:
новая vector revision допустима, checkpoint и last-observed date неизменны.
Можно вместо этого выбрать реальный ACTUAL_CHECK; одинаковый B тогда создаёт
реальное новое наблюдение. Не выбирать reuse/actual по равенству сумм.
Без anchor доступен initial actual check, а не фиктивный zero checkpoint.

Остаются пределы HB-017: до 7 O и 7 S edits, одна правка каждой typed identity;
payment и FUNDING_TRANSFER одной identity запрещены, как и AMEND/release/increase
в сочетании с её funding transfer. Guard проверяет полный moving set, включая
FRESH_START/A=0 identities, до изменения lifecycle. Ошибка
SAME_IDENTITY_COMPOUND_NOT_SUPPORTED сохраняет draft и оставляет zero financial
writes. Объяснить пользователю ограничение; он сам пересматривает выбор.
Не создавать автоматическую цепочку commits, фиктивные даты/позиции или default
DEFER. Разные identities допускаются существующим контрактом.

## 5. Read model, история и безопасность

`/obligations` и `/savings` сейчас защищённые placeholders.
`features/obligations/read-obligations.ts` и `features/savings/read-savings.ts`
с соответствующими ports возвращают **выбранные состояния**, не готовый timeline.
`UpdateSeed` не содержит origin и полного evidence; последние 10 update receipts
также не являются полной историей identity. Не строить timeline из live seed.

Предлагается узкий owned management read port и infrastructure adapter. На один
запрос списка/деталей: REPEATABLE READ READ ONLY, server Berlin today, один K,
account aggregate revision, scoped source enumeration, bounded row/byte/work
checks через `readProjectionContext` и существующие selectors/evidence decoders.
Не соединять независимо прочитанные O/S/current forecast при разных K.
Feature не импортирует infrastructure/app; app boundary внедряет reader.
Не раскрывать private projection `readAt` как универсальную public action.

DTO списка: stable identity, selected revision, origin/funding month, title,
status, dueDate для O, total/outstanding/reservation selection для O, retained S,
точные суммы A/R/S/F из существующей projection и актуальные freshness/safe.
Не приписывать отдельной obligation «профинансировано X», когда allocation не
распределена по identities. Дефицит относится к funding period/account comparison.
Нет bank observation — соответствующие B/A/F/safe unavailable, известные O/S
по-прежнему можно показать; это не empty list и не 0.

Timeline запрашивается narrow action с captured opaque identity и optional cursor;
authorizer получает account из session/resolver, не из client owner. Сервер
сначала проверяет полную bounded lineage и evidence, затем отдаёт страницу
**50** записей с opaque cursor, привязанным к scope/identity/H/K/order. При лимите
source/wire возвращать typed unavailable/refusal, никогда неполную сумму/«полную
историю» из обрезанных данных. Новый cursor transport проектируется как read-only
DTO, не capability доступа; tamper/cross-account отклоняются. На новой K показать
«есть новые данные» и явный reload, не смешивать страницы разных K.

Timeline хранит event/revision/action, собственные before/after title/amount/status,
effective date/position, confirmed/recorded coordinates, bankDate/payment source
и amount/affirmation/checkpoint refs для payments, confirmed increase/release
amounts для S, funding proof/decision/source/target и неизменяемый origin.
Corrected/superseded записи показываются отдельно с явной связью; resolved state
вычисляется correction-before-H-at-K. Нельзя повторно применять deltas к full
states или считать superseded запись второй оплатой. H = исторический срез,
K = доступные на тот момент записанные свидетельства, а не «известный доход».
История не подменяет as-closed snapshot: report v1/его cutoff/version показываются
лишь из сохранённого report; его создание/коррекция остаются HB-019.

Доступ проверяется для page, list/detail/history, handoff resolution и всех update
actions. Unknown/foreign identities дают безопасный одинаковый отказ без title,
counts, receipt или existence oracle. Нормализация/copy-freeze до await, bounded
IDs/filter/cursor/DTO, plain text React rendering, безопасные коды ошибок, никакого
SQL/driver details. Нет cross-request financial cache, route prefetch финансовых
деталей и telemetry с payload. Сохранить Origin/CSRF/session/ownership guards.

## 6. UX и финансовые обозначения

Desktop: heading + create, status/month filters, summary, semantic rows, detail
panel с отдельной history. На 320/375px — cards с подписью каждого значения,
вертикальный detail flow и кнопки без горизонтального скролла страницы. Длинный
200-code-point title переносится; суммы точные, tabular numbers, не сокращать до
округлённых k/M. Loading skeleton без выдуманных чисел; empty list с Create;
empty filter с Clear; storage/evidence error с Retry; no-account как HB-016,
без provisioning. Фильтрация/чтение/открытие истории не пишут финансовые данные.

| Значение | Предлагаемая подпись RU / DE / EN | Смысл |
|---|---|---|
| originalCents выбранной ревизии | Сумма обязательства / Gesamtbetrag / Obligation total | Total, при AMEND может меняться; первоначальное значение видно в истории |
| outstandingCents | Осталось оплатить / Noch offen / Outstanding | Непогашенный остаток; не вычислять из bank delta |
| selected reserve | Зарезервировано / Reserviert / Reserved | Для UNPAID+reserveFull весь outstanding, иначе 0; это требование резерва, не гарантия покрытия |
| F[p] | Свободно в месяце / Frei im Monat / Free in month | A−R−S; отрицательное значение подписать «Дефицит», не прятать |

Обычный O total30000/outstanding20000 показывает reserved20000, не30000; possible
unselected с тем же outstanding показывает reserved0 и «Не зарезервировано».
Это не автоматически свободные деньги: summary учитывает остальные R/S и D36.
Savings показывают retained amount и «уменьшает свободный бюджет, не меняет
остаток карты». Release preview показывает точный S before/after, F и safe;
увеличение F не обещает роста safe при дефиците другого периода.

При F<0: кнопка «Рассмотреть освобождение накоплений» → выбор ACTIVE saving
**этого funding period** → existing `proposeSavingRelease` с pinned K/revision.
Proposal=min(deficit,S), это read-only предложение. При S<deficit показать
оставшийся дефицит; при suggestedRelease=0 не предлагать нулевой release.
Пользователь отдельно выбирает amount/action и проходит общий review/confirm.
Нельзя выбирать saving другого месяца, суммировать release по всем goals,
изменять funding или повторно дебетовать B.

Все copy keys RU/DE/EN в существующих каталогах, включая errors/empty/history/
terminal/source/correction/consent. Тема light/dark/system берётся из shell.
Статус выражается текстом и доступной иконкой, не только цветом. Label для каждого
поля, focus-visible, native buttons/links, логичный heading/tab order, focus return
при закрытии detail, focus first error, status/aria-live для async, disabled/busy
на submit, reduced motion и zoom200%. Touch targets не менее44px. Modal не
обрезает focus/клавиатуру; cancellation/release имеют конкретный review before/after.
Ни один consent не включается при выборе identity, смене locale или reload base.

## 7. Файлы будущих изменений и review slices

Это предлагаемые имена, не уже существующие API. Не создавать их в planning.

| Slice | Файлы / переиспользование | До 5 acceptance gates; до 7 scenario IDs |
|---|---|---|
| A. Coherent read/history | Новые `src/domain/management/{contracts,ports}.ts`, `src/features/management/read-management.ts`, `src/infrastructure/db/management-reader.ts`, `src/app/management-boundary.ts`; использовать projection-reader/history-read-context, obligation/savings-history, funding-evidence, selectors | Один scoped H/K; полный валидированный evidence до pagination; immutable copied values. H01–H07 |
| B. Obligations | Заменить `src/app/obligations/page.tsx`; новые `loading.tsx`, `actions.ts`; `src/features/obligations/{obligations-screen,obligation-detail}.tsx`, `presentation.ts`; existing obligation contracts | Все разрешённые действия; полные reserves/терминалы; никакого direct save. U01–U07 |
| C. Savings | Заменить `src/app/savings/page.tsx`; новые `loading.tsx`, `actions.ts`; `src/features/savings/{savings-screen,saving-detail}.tsx`, `presentation.ts`; reuse proposal.ts | Точные actions/evidence; explicit proposal; S никогда не меняет B. U08–U14 |
| D. Handoff/common editors | Новые `src/features/budget-updates/{budget-draft-provider.tsx,entry-intent.ts,obligation-editor.tsx,saving-editor.tsx}`; narrow refactor `update-budget-screen.tsx`, `presentation.ts`; app/layout.tsx, update-budget/page.tsx | Один memory-only draft/unknown request; selected revision проверена; общие editors/consents/preview. C01–C07 |
| E. Atomic boundary proof | Existing update-budget actions/use-cases/repository без изменения financial semantics; новые `tests/management-boundary.test.ts`, `tests/integration/management.test.ts`; расширить `tests/integration/update-budget.test.ts` только для handoff regressions | Тот же single commit/replay; stale/rollback/account isolation; disjoint guard сохранён. P01–P07 |
| F. UX/QA/docs | `src/shared/i18n/messages/{ru,de,en}.json`; новые `tests/management.test.tsx`, `tests/management-presentation.test.ts`; существующие i18n/architecture/update-budget tests; отдельный будущий verification artifact | Mobile/desktop/locale/theme/a11y; privacy/navigation; точное evidence и независимый review. B01–B07 |

Slices — части одного HB-018, не новые HB-ID и не разрешение реализации.
A/B/C unit specifications проверять до использования новых экранов. D сначала
изолированно доказывает сохранение HB-017 behavior, затем B/C подключают actions.
Финальная verification объединяет все slices. Schema/migrations/writers/формулы
не требуют изменения; если spike выявит обратное, остановить соответствующую
часть и согласовать scope до кода.

## 8. Финансовые риски и traceability

| Риск / BR | Обязательное доказательство |
|---|---|
| Double debit / fabricated fresh check — BR-01/02 | U04/U05/U07/U10/U13; P01/P04; reuse не меняет observation date, actual равный B создаёт новый C |
| Partial reserve/hidden deficit — BR-03/06/11 | U01–U07/U11–U14; B02; полный remainder, отрицательный F допустим |
| Future funding leakage / wrong main limit — BR-04/05 | U14/H02/B02; D36 через существующий forecast, secondary guideline не main |
| Потеря lineage/history/report — BR-05/07/08 | H01–H07/P07; same identity restrictions и immutable v1 |
| Retry/stale/partial commit — BR-02/10 | P01–P07/C04–C07; same request/payload, NONE при отказе, no automatic rebase |
| Приписывание checkpoint delta доходу/расходу, импорт — BR-01/09/11 | U04/P01/H07; нет operations/PDF posting, историю импортов не изменять |
| Разные K, missing evidence, большие списки — BR-08/10 | H03–H06/P02; bounded coherent reader, не truncation totals |
| Memory handoff/unknown outcome/security — BR-10 | C01–C07/B04/B06; никакой persistent копии, direct actions scoped |

Главный технический риск — изменение lifetime существующей формы при выделении
provider/editors. Риск ограничивается сохранением exact original command,
generation invalidation, исходных HB-017 tests и новых navigation/unknown checks.
Другой риск — pagination выдаёт видимость полного audit при непроверенном suffix;
поэтому сначала existing full-source validation и limits, затем paging DTO.

## 9. Тестовая стратегия и общая приёмка

[42 новых сценария](../../tests/scenarios/phase-01/hb-018-obligations-savings.md):
U01–U14 pure/unit, H01–H07 history unit + PostgreSQL, P01–P07 PostgreSQL integration,
C01–C07 component, B01–B07 browser QA. Это будущая specification, **не PASS**.
Матрица включает concrete cents/даты/expected financial and write sets.

При отдельно разрешённой реализации: текущие `pnpm.cmd test`, `pnpm.cmd lint`,
`pnpm.cmd typecheck`, `pnpm.cmd build`; targeted unit/component через existing
Vitest, `pnpm.cmd test:integration` только с явно принадлежащей задаче disposable
local PostgreSQL и принятыми local-target guards. Не запускать миграционный script
с неявным `.env.local`, не подключаться к Neon. Сначала inspect scripts/config.
Нет `test:e2e`/Playwright dependency в package.json: использовать доступный browser
QA с evidence, не обещать автоматизацию до отдельного согласования инструментов.

Сохранить HB-009–017 regressions, HB-015 finance coverage gate и TZ=UTC/LA primitive
parity. Этот planning diff не меняет normativeContexts coverage checker; новый
scenario file пока не входит в его `sources`. Не добавлять fake executed mappings
или менять coverage.json сейчас. В реализации новые IDs сопоставить реальным
tests/evidence отдельно, текущие mappings/исходные receipts не переписывать.

Общая приёмка (пять gates):

1. Оба раздела дают списки/details/history и все существующие разрешённые actions;
   терминалы/possible/full reserve/retained savings отображены однозначно.
2. Все writes проходят один HB-017 review/commit; B/A/reserves/savings/freshness,
   D36, funding и согласия подтверждены без auto debit/release/transfer.
3. Owned coherent reads и история валидируют evidence/H/K, scope, bounds и
   сохраняют original facts/report versions; нет live-value joins в старые записи.
4. Memory-only navigation, replay/stale/rollback/unknown outcome и отсутствие
   URL/log/storage leaks доказаны на соответствующих уровнях, не только mocks.
5. RU/DE/EN, light/dark/system, 320/375/desktop, keyboard/screen reader прошли
   фактическую QA; exact results и ограничения прошли независимое ревью и owner
   acceptance. Только затем обсуждать Done, публикацию отдельным разрешением.

## 10. Зависимости, вопросы и передача

HB-011/012/016/017 в TASKS Done; их реальный code/API — техническая база.
HB17-A03 Medium остаётся принятым исключением, не gate на новый auth refactor.
Multi-source CARRY, overdraft, historical overspend и recurring MVP membership
сохраняют существующие вопросы и остаются вне HB-018.

**Новых нерешённых продуктовых вопросов не обнаружено.** Поэтому
OPEN_QUESTIONS не изменяется. Предложенные provider/read DTO/pagination/UI labels
— решения этого ещё не утверждённого технического плана. Blocking gates:
независимое ChatGPT review документов и отдельное разрешение владельца;
технический spike на scope-safe memory handoff и bounded immutable history при
будущей реализации. Risky противоречие с контрактом регистрируется в
OPEN_QUESTIONS до dependent implementation, а не решается новым business action.

Передать ревьюеру этот план, сценарии и base SHA. Просить отдельно проверить:
payment freshness, reserve vs funding, exact amend semantics, disjoint identities,
history evidence/cursors, provider scope/unknown lifetime, D36 и financial privacy.
Независимый review в этой сессии **не выполнен**; отдельные agents не запускались.
Документы готовы для передачи владельцем в ChatGPT. Остановиться после planning.

## 11. Документальные проверки этой сессии

Выполнена read-only Node stdin проверка обоих документов: **27 local link targets,
42 unique sequential scenario IDs (U14/H7/P7/C7/B7), strict UTF-8 и отсутствие
trailing whitespace — PASS**. Независимый от production functions BigInt oracle:
**22 synthetic vectors, 158 assertions — PASS** (nonnegative B/A, sum(A)=B,
F/sum(F), D36 available/quotient/remainder, включая Nov8/Nov9). Это проверка
записанных ожиданий, не тестовая реализация продукта и не independent review.
При self-review уточнены K100 для 51-event history fixture и явный funding carry
перед последующей оплатой в историческом примере; эти исправления входят в
проверенный документ. Уточнено фактическое ограничение history repository:10 updates.

`git diff --check` — PASS для tracked diff; оба новых untracked файла дополнительно
проверены явно Node на UTF-8/whitespace/links/IDs. Runtime
unit/integration/component/browser/lint/typecheck/build не запускались;
БД/OAuth/production не использовались. Commit/push/PR/merge/deploy не выполнялись,
feature branch не создавалась, TASKS/OPEN_QUESTIONS не менялись. Финальный
`git status --short --branch`: `main...origin/main`, только два новых untracked
документа HB-018; index пустой. `.vscode/` остаётся ignored и не изменялась.
