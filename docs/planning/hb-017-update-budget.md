# HB-017 — Single atomic «Update budget» flow

**2026-11-03 · DOCUMENTATION FINALIZED · утверждённый scope MVP.** Владелец сообщил результат независимого ревью ChatGPT: **APPROVED, Critical 0 / High 0 / Medium 0**, и утвердил Q-HB17-01/02/03. [Принятые решения](../DECISIONS.md#hb-017-scope-decisions--2026-11-03). Это owner-reported review, не новый локальный review или runtime evidence. **Реализация не разрешена**, HB-017 остаётся **Planned**; требуется отдельное разрешение владельца. BR, ADR, формулы, архитектурные границы и существующие runtime contracts не меняются.

## 1. Проверенная база и источники

При первоначальном планировании ветка `main`, рабочее дерево и index были чистыми. `HEAD`, локальные `main`, `origin/main` и удалённая `refs/heads/main` совпали с **`9bf449e641818c1bfaa15d8b76a0dd9d3d8a740a`** (HB-016). Тогда удалённый SHA проверен `git ls-remote origin refs/heads/main`: первая попытка ограничена сетью sandbox, повторная read-only проверка успешна. При финализации HEAD тот же; исходные локальные изменения OPEN_QUESTIONS и двух untracked HB-017 документов сохранены. Сеть повторно не проверялась. Fetch/reset/stash/checkout не требовались; `.vscode/` и прочие локальные файлы не тронуты. Git предупреждает о недоступном глобальном ignore; настройки не менялись.

Основание: [PRD UC-01/04/06](../PRD.md), [TASKS HB-017](../TASKS.md), [BR-01–11](../BUSINESS_RULES.md), [DECISIONS D26–39](../DECISIONS.md), принятые [ADR0001](../adr/0001-checkpoints-and-allocations.md), [ADR0002](../adr/0002-month-closing-and-corrections.md), [ADR0003](../adr/0003-daily-forecast-and-liquidity.md), [ARCHITECTURE](../ARCHITECTURE.md), [architecture.json](../architecture.json), [DATA_MODEL](../DATA_MODEL.md), [DATABASE](../DATABASE.md), [conventions](../conventions.md), [workflow](../CODEX_WORKFLOW.md), [AGENT_FACTORY](../AGENT_FACTORY.md), [implementation plan](../IMPLEMENTATION_PLAN.md), [AUTH](../AUTH.md), [PROJECT_CONFIG](../PROJECT_CONFIG.md), [open questions](../OPEN_QUESTIONS.md). Текущие code/tests важнее исторических «ещё не реализовано» в старых документах; архивные signed-A примеры не являются разрешением отрицательных A.

Проверены сценарии и соответствующие domain/application/boundary/writer/test contracts HB-009–016. Точки входа перечислены ниже; исторические результаты verification не выдаются за заново выполненные проверки. Новый [сценарный документ](../../tests/scenarios/phase-01/hb-017-update-budget.md) задаёт будущие assertions, не PASS.

Изучены все восемь запрошенных `.agents/skills/*/SKILL.md`. `create-planning-doc`/`create-scenarios` определяют небольшие части и точные оракулы; `verify-financial-invariants` — BR crosswalk; `define-architecture` — границы и transaction design без их изменения; `configure-project` — существующие команды, без env loaders/настройки окружения. Для security рассмотрены Next.js server, React и general frontend references (actions/auth/cache/error/logs/storage/redirects); для React — `server-auth-actions`, `server-serialization`, `server-no-shared-module-state`, `async-parallel`. [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) проверены как checklist будущего UX, не как выполненный визуальный аудит. Новых библиотек или runtime skills не требуется.

## 2. Scope и границы

Один доступный со смартфона и desktop экран: фактическая проверка карты → полное распределение B по месяцам → необязательные изменения обязательств/накоплений → серверный предпросмотр → **одно итоговое подтверждение** → один финансовый commit → подтверждённый результат и связанная история.

Включить initial checkpoint для **уже существующего** owned account без наблюдений; обычную изменившуюся и равную прежней реальную проверку; отдельный явно выбранный режим перераспределения без проверки карты; CARRY одного источника, FRESH_START и DEFER по HB-013. Не превращать выбранный на dashboard будущий/прошлый месяц в дату проверки или target rollover: target перехода — текущий Berlin месяц сервера.

В форме доступны CREATE/AMEND/PARTIAL_SETTLEMENT/PAID/CANCELLED обязательства и CREATE/AMEND/INCREASE/PARTIAL_RELEASE/FULL_RELEASE накопления в пределах существующих контрактов. `reserveFull` редактируется только для possible UNPAID; ordinary unpaid всегда полный. Терминальные состояния и отдельные amounts не обходить. Полные standalone lists/details/history из HB-018, создание счёта, recurring templates, операции/PDF, ручное закрытие/публикация v2 HB-019, overdraft, multi-source CARRY вне scope. Встроенная история этого update не подменяет будущие management/report screens.

**Утверждённое ограничение MVP (Q-HB17-01, вариант A):** lifecycle edits и FUNDING_TRANSFER допускаются в одном атомарном обновлении для **разных identities**. Пересечение по одной obligation/saving identity в общей позиции запрещено. Проверять пересечение typed identity sets до persistence: draft edits против полного набора funding transitions, включая участников FRESH_START. Вернуть явный typed refusal (планируемый orchestration code `SAME_IDENTITY_COMPOUND_NOT_SUPPORTED`, ещё не runtime API), сохранить draft; никаких частичных финансовых записей. Не разделять действие автоматически на commits, не создавать фиктивные позиции/даты, не ослаблять SQL constraints/historical ordering и не подменять FUNDING_TRANSFER на AMEND. Это сохраняет HB-013: predecessor строго раньше, два зависимых состояния одной identity в общей позиции не допускаются. Same-identity compound вне утверждённого MVP; его реализации не заявляется.

В этой сессии разрешена только финализация четырёх документов: DECISIONS, OPEN_QUESTIONS, этот план и сценарии. Не менять код, формулы, schema/migrations, deps, configuration, TASKS status; не создавать feature-ветку, не подключаться к БД, Neon/production, OAuth, Docker или реальным данным. Нет commit/push/PR/merge/deploy.

## 3. Что существует и что переиспользовать

| Основа | Использование / реальный пробел |
|---|---|
| `src/app/dashboard-account-boundary.ts`, `require-page-owner.ts`, HB-007 `requireOwnedAccount` | Session-derived owner и bounded lookup одного owned account; 0/multiple/error честные состояния, без provisioning. Каждая новая action авторизуется самостоятельно |
| `src/app/budget-update-boundary.ts`, `features/budget-updates/execute-update.ts` | Нормализация/copy-freeze до await, injected authorizer/repository. Private boundary не является публичной универсальной action |
| `infrastructure/db/commit.ts`, `update-repository.ts`, `audit-writer.ts` | Один READ COMMITTED tx, owned account `FOR UPDATE`, replay до stale, checked counters, immutable receipt + audit, `rejectBatch`, безопасные outcome codes |
| `domain/checkpoints/{validation,confirmation,history}.ts` | Полный A, реальные/равные проверки, correction-before-H-at-K, placement и chronological head. `checkpoint-persistence.ts`, `allocation-writer.ts`, `historical-placement.ts` — внутренние tx helpers |
| `domain/obligations/{validation,lifecycle,history}.ts`, HB-011 readers/writer | Full outstanding, partial payment, possible selection, payment affirmation/evidence и immutable before/after. Writer сейчас сам создаёт checkpoint/position; нужен общий candidate context |
| `domain/savings/{validation,lifecycle,history,evidence}.ts`, HB-012 readers/writer | Точные подтверждённые increase/release amounts, full retained S, совместимость suffix, no implicit debit. Аналогичный пробел композиции |
| `features/period-transitions/use-cases.ts`, `domain/transitions/*`, `transfer-proposal-repository.ts`, `transition-writer.ts` | Prepare/read/confirm/cancel, отдельные согласия и funding proofs, immutable proposals. Prepare имеет control writes (proposal/period), это не полностью read-only preview; replay hook разрешён только для `PERIOD_TRANSITION` |
| HB-014 `projection-reader.ts`, `history-read-context.ts`, `domain/forecast/*` | Coherent snapshot, source/evidence completeness, bounded loading, D36 и D37–39. Preview должен применять эти же pure projections к кандидату, а не читать старый DB forecast как новый |
| HB-016 `dashboard-loader.ts`, `dashboard-screen.tsx`, `presentation.ts`, `format-money.ts` | Отображение exact cents, Berlin dates/month labels, safe/ordinary/deficit/warning groups, состояние загрузки. В нынешнем dashboard ещё нет Update CTA |
| MUI shell, shared UI/i18n, money/date/period codecs | RU default + DE/EN, light/dark/system, semantic controls; canonical decimal-cent strings на wire, bigint внутри domain |
| HB-015 `tests/finance/coverage.json`, `check-finance-coverage.mjs`, CI; Vitest/Testing Library | Сохранить утверждения HB-009–016 и актуальную evidence policy; не заменять PG/jsdom/browser доказательства друг другом |

**Недостаёт** aggregate draft/preview/read context, typed unified confirmation action, writer-композиции нескольких streams, bounded update-history DTO и UI. Отдельные `confirmBankCheckpoint`, `markObligationPaid`, `updateSavingWithActualCheckpoint`, `periodTransitions.confirm` нельзя вызывать из React последовательно: это несколько receipt/locks/revisions и частичное сохранение при ошибке.

## 4. Предлагаемый точный набор будущих изменений

Имена новых файлов — планируемые; окончательные имена сверить с ревью. Import directions остаются прежними: app composition → features/domain + injected infrastructure; feature не импортирует infrastructure/app.

1. Добавить `src/domain/budget-update/{contracts,validation,planning}.ts`: bounded typed aggregate DTO, intent, полный A, согласия, набор изменений разных identities, exact base/source refs и общий candidate plan. Только orchestration существующих validators/lifecycle/selectors, без новой математики R/S/forecast. В `domain/updates/contracts.ts` при будущей реализации добавить typed orchestration refusal для same-identity пересечения по принятому Q-HB17-01; существующие use-case contracts не ослаблять. Не принимать arbitrary event/audit/actor input.
2. Добавить `src/features/budget-updates/{prepare-update,preview-update,read-update-history}.ts` с domain ports: один согласованный load draft, preview candidate, history по owned updateId. `execute-update.ts` переиспользовать для submit; input normalization/auth errors не переделывать широко ради UI.
3. Добавить `src/infrastructure/db/{budget-update-reader,budget-update-writer,update-history-reader}.ts`. Выделить общие candidate/persist primitives из `obligation-writer.ts`, `savings-writer.ts`, `transition-state.ts`, `transition-writer.ts`, `allocation-writer.ts` и report-impact helpers; старые private use cases перевести на те же primitives с сохранением публичных контрактов/регрессий. Не копировать финансовую логику в новый writer.
4. Расширить `transfer-proposal-repository.ts` внутренним typed aggregate prepare/confirm путём: immutable proposal document связывает полный draft, review и все earmark edits; `PERIOD_TRANSITION` replay проверяет **весь** compound payload и evidence, а не только cash/funding. Старый путь и identity bytes старых commands сохранить. Proposal JSON extensible, но schema не менять; совместимость существующих читателей/evidence — обязательный gate. Не превращать hook в универсальный client writer.
5. Добавить `src/app/update-budget/{page.tsx,loading.tsx,actions.ts}` и private `src/app/update-budget-boundary.ts`; actions только load/preview/confirm/status/history с узкими DTO. Status — authorized read receipt по исходной request identity, без повторного эффекта. Если typed adapter не помещается в существующий port, расширить domain port, не ослаблять архитектурный allowlist.
6. Добавить `src/features/budget-updates/{update-budget-screen,allocation-editor,earmark-editor,review-panel,update-result}.tsx` и draft-state/presentation mapper. Добавить CTA в `dashboard-screen.tsx` (и empty NO_OBSERVATION при наличии account), ссылки на scoped результат. Noncurrent period — только начальный UI context, весь вектор всё равно видим. Финансовые формулы в React запрещены; допустимы parsing/formatting и вызов общих pure validators.
7. Дополнить только нужные keys `src/shared/i18n/messages/{ru,de,en}.json`; test suites `tests/{budget-update-planning,update-budget-boundary,update-budget-history}.test.ts`, `tests/update-budget.test.tsx`, `tests/integration/update-budget.test.ts`. Расширить нужные HB-015 mappings/evidence при реализации согласно существующей политике, без переписывания исторических results.
8. После разрешённой реализации синхронно описать новый публичный narrow endpoint и aggregate contract в `ARCHITECTURE.md` и `architecture.json`, data/transaction enforcement в `DATA_MODEL.md`/`DATABASE.md`; направления импорта и таблицы не менять. Подготовить отдельный verification artifact с фактическими командами и ограничениями. Сейчас эти файлы не меняются.

Auth UX **обязательно входит в HB-017 отдельным изолированным change set** (§9), без нового HB-ID. Финансовая композиция и auth diagnostics имеют отдельные diff/review и независимые test evidence; приёмка HB-017 требует обе части, включая A01–A07. Любая необходимость миграции, новых deps/config, изменения существующих action semantics или фундаментальных границ требует отдельного согласования до кода.

## 5. Draft, preview и подтверждение

### 5.1. Контракт

Wire использует versioned DTO и canonical cents strings; counters тоже строки. Все поля/размеры/IDs/датировки проверяются server-side; unknown keys, number money, sparse/getter/cyclic/oversize input отклоняются до работы с данными. Owner/actor/recordedAt берутся только на сервере.

Draft содержит: `observationMode=ACTUAL_CHECK|REUSE_CONFIRMED`, balance/date/optional actual instant (только ACTUAL), полный A, `expectedRevision`, base checkpoint/vector, K и выбранные ordering/state refs; intent `ORDINARY|ALLOCATION_ONLY|TRANSITION`; mode перехода и source/target; набор typed obligation/saving edits с revision refs и exact amounts; explicit vector/payment/funding/non-carry/future-edit consents. У initial check base refs nullable, no rollover/reuse без anchor. H/K от клиента — ожидаемые coordinates, **не право выбрать произвольную серверную историю**. Сервер пересобирает их из scoped facts.

Обычная форма не требует произвольного reason о разнице B: server задаёт фиксированное business reason вроде подтверждения actual check. Для требующих объяснения действий (например вне карты) хранить явный reason по существующему контракту. Не называть K knowledge cut подтверждёнными операциями из optional reconciliation: это разные понятия.

### 5.2. Coherent read и preview

Load/preview захватывает owned account, revision/K/pointer, server Berlin date и нужные immutable histories в **одном REPEATABLE READ READ ONLY** snapshot. Не собирать checkpoint/obligations/savings тремя независимыми feature reads с разными K. Переиспользовать bounded HB-014 loaders/completeness/evidence, отдельно сохранить оригинальные report-head flags. Oversize/incomplete/conflicting history — безопасный отказ, без усечения identities и фиктивных нулей.

Pure aggregate planner строит кандидат с одной новой исторической позицией на дату: C/V при ACTUAL, V при REUSE, distinct-identity O/S events и допустимые funding events. На разных identities события могут быть co-located; пересечение lifecycle edits и funding set одной identity даёт `SAME_IDENTITY_COMPOUND_NOT_SUPPORTED` до persistence и повторно проверяется под lock. Funding set определяется по согласованной исходной базе до lifecycle edits: нельзя скрыть конфликт, сначала сделав переносимую identity PAID/CANCELLED/RELEASED и исключив её из набора переноса. Селекторы и suffix validators видят **финальный кандидат всех streams**, а не неполное состояние после первого writer. Прогноз и review вычисляются existing HB-014 domain functions; финансовые суммы возвращаются сервером.

Preview возвращает до/после B/date, полный A/R/S/F/deficit по всем затронутым периодам, safe/ordinary estimates с asOfDate, manifest changes/unchanged earmarks, реальные источники/target, bank-date versus funding-date, payment warning и closed-report impact. Это явно **«Предпросмотр — ещё не сохранено»**, отдельный от dashboard confirmed state. В режиме REUSE bank date/freshness остаются прежними. Для historical update показать отдельно historical candidate и неизменный более новый active head; не выдавать historical free за текущий safe limit.

Cash-only preview не пишет ничего. Existing transition prepare допускает только immutable proposal + отсутствующие period control rows: они не меняют financial counters, C/V/O/S, report heads или receipt. Если вызывается prepare, обозначить это явно в tests; не утверждать zero SQL writes. Aggregate proposal должен включать earmark edits, иначе его review/replay не доказывает единый flow. Abandoned draft/control proposal не считается финансовым обновлением.

### 5.3. Consent и соответствие сохранению

Кнопка «Проверить результат» не сохраняет. Кнопка «Подтвердить обновление» — единственное финансовое submit. До неё пользователь видит итог и явные невыбранные согласия: full vector; payment unchanged balance; выбранный CARRY/FRESH_START/DEFER и funding; future edits при FRESH_START. Это подтверждения смыслов внутри одного review, без нескольких финансовых save.

Любая правка money/date/mode/entity/source/consent после preview делает его недействительным, требует нового preview и нового requestId после завершения прежней попытки. Нельзя сохранять скрыто поменявшиеся значения. Confirm повторно строит кандидат под lock и сравнивает exact normalized reviewed command/manifest, а не доверяет client forecast/hash. Изменение Berlin target/asOf с влиянием на показанный review требует нового preview; сохранённый proven replay проверяется раньше текущего calendar gate. Общий nonce/requestId не служит авторизацией.

## 6. Граница транзакции, безопасность и ошибки

Подтверждение — **один вызов существующего `commitBatch`**, одна Node pg connection, account lock и один budget_update/receipt. Не outer transaction вокруг нескольких независимых use-case commits. Порядок:

1. Action нормализует ограниченный input до await, получает trusted owner, выбирает owned account, заново проверяет authorization. В tx снова owner/account predicate + lock. Нельзя возвращать чужой receipt даже для известного requestId.
2. Проверить same request+full canonical payload replay **до stale/calendar**. Для transition сохранить HB-013 proven proposal replay/cancellation semantics; подмена payment/release/consent должна конфликтовать. Replay не создаёт новых rows/counters/events.
3. Для новой команды сверить expected aggregate revision, chronological head, base C/V, K, ordering, все changed/retained funding/lifecycle refs, исходные report flags, server dates/target. Ни один согласованный immutable revision не заменять молча новым.
4. Построить и проверить общий финальный candidate; все сущности scope-bound, identity-complete, H/K-selected и bounded; отдельные state transitions/reports/suffix подтверждены. Payment связан с **одним** actual checkpoint и exact per-payment evidence. Никакого fake bankCheck для каждого paid item.
5. Persist C iff ACTUAL, один final complete V и позицию/order, явные O/S changes и funding proofs, decision/transfer iff соответствующий mode. Report impact посчитать один раз по original→final candidate: только affected pending heads + audit, без v2/изменения snapshot. Сохранить весь before/after/amount/source/consent evidence, audit, result, pointers, counters +1 в том же tx.
6. Ошибки expected validation внутри writer бросают `rejectBatch`, а не возвращают Result из tx. Audit insertion и deferred constraint/COMMIT failures должны откатить весь набор, включая periods созданные этим commit. Контрольный proposal, созданный раньше, может остаться PROPOSED; это не частичный financial save.

Auth каждой load/preview/confirm/status/history action обязателен; page guard/скрытая кнопка недостаточны. Origin/Host/CSRF defaults Next/Auth.js сохраняются; no wildcard allowedOrigins, public generic events, raw audit endpoint. Только private no-store/request-scoped financial reads; нет global mutable user state/cache, финансовых values в URL/analytics/logs.

| Исход | Что видит пользователь / следующий шаг |
|---|---|
| Field/domain invalid, sum/sign/range, missing consent | Inline ошибка и focus на поле/summary, draft сохранён, ноль финансовых writes. F<0 — информация, не field error |
| `STALE_REVISION`, `STALE_OBLIGATION/SAVING/PROPOSAL`, ordering/history/report-impact conflict | Сохранение не выполнено; сохранить ввод, показать обновлённую базу и различия, повторный review. Нет auto-merge/rebase/force-save |
| `TARGET_PERIOD_CHANGED` | Новый Berlin месяц: refresh mode/target/vector/funding preview и явное согласие; не переключать CARRY на FRESH_START автоматически |
| `OWNER_POLICY_REQUIRED` / `SAME_IDENTITY_COMPOUND_NOT_SUPPORTED` | Разные причины: multi-source CARRY policy gate либо утверждённый запрет same-identity lifecycle+funding. Без частичных финансовых writes; сохранить draft и понятное объяснение. Не разбивать на commits, не менять позиции/даты, не выбирать другой mode автоматически |
| `UNAUTHORIZED/FORBIDDEN` | Не показывать чужие данные/receipt; при истёкшей сессии вход с возвратом на фиксированный same-origin маршрут. Черновик в текущей памяти остаётся, но reload/OAuth redirect может его потерять — см. §7 и Q-HB17-03 |
| `TRANSACTION_FAILED` | Подтверждённый rollback; draft и ошибки доступны, safe retry исходной неизменённой команды; изменённая команда — только новый review |
| `RETRYABLE_STORAGE_ERROR` | Явный ручной повтор той же команды, без нового ключа/авторебейза |
| `COMMIT_OUTCOME_UNKNOWN`, network loss после submit | «Результат сохранения пока неизвестен». Сначала authorized status/original same-key replay. Не заявлять rollback и не разрешать новую независимую попытку, пока исход не разрешён |
| Receipt success, затем read/refresh error | Сохранение уже подтверждено receipt; «Обновление сохранено, результат пока не удалось загрузить». Только повтор read, без нового update |

## 7. UX desktop/mobile и потеря данных

Предлагаемый маршрут `/update-budget`: полноэкранная страница в существующем shell, без сложного вложенного modal wizard. Секция 1 — real B/date и предыдущая проверка; 2 — полное распределение по месяцам; 3 — выбранные O/S edits; 4 — review. Переходы назад не сбрасывают ввод. Default mode ACTUAL_CHECK отражает основной use case, но не означает уже совершённую проверку; дата по Berlin server today, сумма не считается подтверждённой от предзаполнения. REUSE включается отдельным явно названным действием «Только перераспределить уже подтверждённые деньги»; недоступен без anchor и при payment.

Desktop: форма слева, summary/review справа; все месяцы/earmarks доступны, без обрезания длинных строк. Mobile 320/375px: одна колонка, allocation rows как подписанные cards, раскрываемые edit blocks, финальное summary выше submit. Sticky submit допустим только с safe-area/отступом, чтобы не скрывать fields/focus при виртуальной клавиатуре. Нет горизонтального page scroll; суммы полностью видны с минусом. Target area 44px, semantic buttons/links, labels/fieldsets, error summary + `aria-describedby`/`aria-invalid`, polite status, focus на первую ошибку/заголовок результата, reduced motion и обе темы; 200% zoom/400% reflow проверяются браузером.

Money input — text + `inputMode=decimal`, строковая обработка. RU/DE допускают однозначную десятичную запятую, EN точку; отдельно можно принять точку как machine form при ясном hint. Без тысячных separators/exponent/лишних дробных цифр: неоднозначное `1,000` отвергать, не округлять. Новый узкий presentation adapter нормализует в existing `parseEuroDecimal` → canonical cents; `parseFloat`, `Number`, `valueAsNumber`, умножение float на100 запрещены. Примеры 0,01/0.01 и MAX проверять на сервере тоже. Отдельный date-only string без local-midnight Date conversion; реальные instants только с offset по HB-010.

Вектор может быть неполным **в черновике**; показать точную нераспределённую разницу как validation helper, не создавать suspense category/period. Нет auto-distribute, auto-trim R/S, auto-carry или автоматического принятия suggestions. Кнопка preview объясняет ошибки, сохраняет ввод; final submit блокируется лишь pending/неактуальным preview/недостающим обязательным consent. Shortage warnings не требуют «Понятно» и не блокируют корректный deficit update.

Draft хранится в памяти mounted client feature, не в URL, local/sessionStorage, IndexedDB или offline cache. При locale/theme смене сохранять mounted draft/канонические суммы либо предупредить перед reload; на own navigation/back/cancel — dirty guard, `beforeunload` где поддержан. Ошибки валидации, серверные ошибки и конфликты не размонтируют форму. Save pending защищает от double-click/Enter, backend idempotency защищает даже при обходе disabled UI. Success очищает draft только после receipt и показывает update reference + scoped history link, before/after и bank date.

**Утверждённое ограничение memory-only (Q-HB17-03):** память вкладки не переживает crash/reload/full OAuth redirect, а beforeunload не гарантирован на mobile. Durable draft recovery не обещается; localStorage, sessionStorage, IndexedDB и offline persistence финансовых данных запрещены. При pending/unknown исходе сохранять в живой вкладке исходный requestId и exact payload, использовать безопасный status/read либо явный same-key retry по HB-009; не генерировать новый ключ и не запускать автоматическое новое финансовое действие. После reload сначала scoped проверка недавнего результата/confirmed state, без auto-resubmit и без обещания восстановить утраченный requestId/draft.

## 8. Финансовые gates и доказательства

| BR / контракт | Что обязательно проверить |
|---|---|
| BR-01/02/05/11 | B>=0, каждый A>=0, ΣA=B; одно ACTUAL observation даже при равном B; REUSE без нового C/freshness; complete state без обязательных операций/объяснения net |
| BR-02/03/06 | Partial settlement уменьшает outstanding, резервирует **весь** remainder; PAID/CANCELLED distinct; никакого B debit; при unchanged payment отдельный ack и fresh actual affirmation, в том числе несколько payments на один check |
| BR-03/07/11 | F=A−R−S допускает минус; R/S не capped; possible reserve0/full только явным выбором; увеличение/release savings с exact amount evidence; duplicate identities не считают дважды |
| BR-04/D36–39 | Существующие `ALL_PERIOD_MAX_V1` safe и secondary ordinary; future cash/expected income не повышают current, warnings не складываются; дату проверки не освежает redistribution |
| BR-05/08 | Explicit independent CARRY/FRESH_START/DEFER; future preservation/edit consent; один current funding state; H/K и исторические даты; old versions неизменны, pending только при доказанном impact |
| BR-09/10/11 | Нет операция/PDF posting; bigint/int64/overflow, Berlin date/leap/DST; ownership до replay, immutable audit/receipt и один counter increment; zero partial writes при всех отказах |

Последовательность будущей реализации — внутренние части **одного HB-017, не новые HB-задачи**. У каждой максимум5 acceptance criteria и7 групп проверок:

| Часть | Критерии приёмки | Проверки (группы сценариев) |
|---|---|---|
| A1. Draft/cash candidate до UI | Typed bounded draft; existing validators; один H/K candidate; complete vector; actual/reuse distinction | U01–U07 |
| A2. Lifecycle/transition candidate до UI | Full R/S; payment affirmation; exact release evidence; explicit transition consents; unsupported compounds refuse | U08–U14 |
| A3. Disjoint composition | CARRY + payment другой identity; FRESH_START + release другой identity; exact bank/vector; retained identities; one commit/evidence | U15–U16 |
| B1. Atomic persistence | Один commit/position/vector; exact payment evidence; replay; no races; safe rollback/outcome | P01–P07 |
| B2. История и scope persistence | Ownership; coherent H/K; exact funding evidence; original→final report impact; limits/target/cancellation | P08–P14 |
| C. Screen/review | Полный editable draft; server preview; один final submit; retained errors/draft; RU/DE/EN responsive/a11y | X01–X07 |
| D. Result/history и regression | Scoped history; receipt/read distinction; no lost edits on ordinary failures; сохранение HB-009–016 gates; независимое ревью + owner acceptance | X08–X14 |
| E. Изолированный обязательный auth change set | Честная классификация; no enumeration; fail-closed; safe logs/copy; actual Auth.js callback/session tests | A01–A07 обязательны; отдельная auth evidence, не заменяемая financial PASS |

Unit: pure candidate/invalid inputs/consents/invariants/serialization/history refs/locale input mapper; не mocks вместо финансового оракула. Integration: настоящий disposable loopback PostgreSQL и actual migrations, barriers на двух connections, snapshot/row comparison всех scoped tables + pointers/flags до/после failures, injection audit/deferred COMMIT и lost acknowledgement. Component: Testing Library/user-event/jsdom для state machine, focus/names, draft retention, consent, delayed preview и duplicate submit, fake replies только на transport boundary. Browser QA: настоящий local Next + isolated synthetic DB; прямые action requests/auth/logout, полный flow без UI bypass, history/back/reload, mobile keyboard/layout, локали/темы, pending/network loss/concurrent tabs. Live Google OAuth и production QA — отдельная ручная acceptance, не имитировать её зелёным unit test.

Будущие команды: `pnpm.cmd lint`, `pnpm.cmd typecheck`, `pnpm.cmd test`, `pnpm.cmd build`; `pnpm.cmd test:integration` **только** после проверки собственного disposable container и явного override всех трёх DB URLs + target marker по DATABASE. HB-015 gate запускать по актуальной CI/evidence процедуре (inspect scripts first) с fresh UTC/LA reports; расширять/повторять checks только по новым рискам. Playwright package/script сейчас отсутствует: browser QA через доступный browser tool/manual, автоматизация HB-021 не добавляется молча. Не загружать `.env.local`/production values ради проверки документов.

## 9. Дополнительный auth UX: анализ и рекомендация

### 9.1. Подтверждённая причина неоднозначности

В `infrastructure/auth/config.ts` `signIn` возвращает false и при policy rejection, и при `repository.bind` exception. JWT repository errors превращаются в null; `currentOwner` ловит ошибки как отсутствие owner, `requireOwnedAccount` сводит repository failure к FORBIDDEN. `app/auth-actions.ts` maps **все** `AuthError` в `AccessDenied`. `login/page.tsx` показывает одну общую error key независимо от query code. Logger сохраняет только `AUTH_REQUEST_FAILED`, поэтому причина теряется даже в разрешённых безопасных категориях.

Установленные Auth.js `next-auth 5.0.0-beta.32` / `@auth/core 0.41.3`, `handleAuthorized` в `lib/actions/callback/index.ts`: false вызывает AccessDenied; exception, не являющийся AuthError, тоже оборачивается в AccessDenied. Поэтому просто бросить driver error вместо false не решает задачу. OAuth callback возвращается через route handler, а не обязательно через catch login action. Классификацию надо проверять на реальном callback/session/redirect path. [Официальный reference Auth.js errors](https://authjs.dev/reference/core/errors) подтверждает разные error categories; привязку к установленной версии сверять с локальным исходником. `AccessDenied` **не доказывает отказ Google**.

Инцидент «локально ожидали PostgreSQL, подключились к Neon» известен из сообщения владельца. Секреты/активный DATABASE_URL не читались; фактическую доступность или настройку Neon этот план не проверяет. Выбранный production provider в архитектуре — Neon, поэтому нельзя глобально запретить его или назвать любой remote URL ошибкой. Валидный, но неверно выбранный доступный DB target нельзя распознать по одному OAuth error.

### 9.2. Безопасное предложение

В server-only auth code в месте известного отказа фиксировать закрытую категорию: `AUTH_CONFIG_INVALID`, `AUTH_STORAGE_UNAVAILABLE`, `AUTH_POLICY_DENIED`, `AUTH_IDENTITY_BINDING_CONFLICT`, `AUTH_OAUTH_FAILED`, `AUTH_SESSION_VALIDATION_FAILED`, `AUTH_UNKNOWN_FAILURE`. Логировать только category, фиксированную stage (`signin|callback|session|ownership`), безопасный случайный correlationId и time. Не логировать raw error/cause/stack/SQL/host/URL/parameters, headers/cookies, subject/email/allowlist, account IDs или financial input. Category не является финансовым audit event; no DB logging dependency для auth outage.

Публичная классификация **шире** серверной. Не отправлять `POLICY_DENIED` versus `IDENTITY_BINDING_CONFLICT`; неверифицированная identity, неизвестный account и несовпавший stored subject получают одинаковый neutral result/status/redirect. Нельзя показывать «сервис недоступен» только тем, кто прошёл allowlist и дошёл до bind: это oracle для разрешённых аккаунтов.

Различать сервисный сбой публично только по **не зависящей от identity** достоверной проверке: синтаксически invalid server config либо одинаковый для всех запросов ограниченный health-check нужного auth storage перед identity-specific решением/на error page. Проверка не выполняет bind, account lookup, чтение users, provisioning или migrations; нет публичного DB diagnostic endpoint, remote target probe, периодического polling, driver details или общего user-state cache. Бюджет timeout/нагрузки и same response class для всех identities покрыть тестами. Это предлагаемая будущая опция, а не уже существующая гарантия; пока нет такой независимой причины, использовать neutral fallback + private category. Health-check, успешный после transient bind failure, не доказывает причину исходного отказа; fallback остаётся нейтральным.

OAuth-specific copy допустима только для allowlisted достоверной provider/exchange failure category, не для произвольного AccessDenied/CallbackRouteError и не из client `?error=...`. Unknown/spoofed query → generic text, React escaping. Без доверенного server evidence query не является доказательством причины; конфигурацию/health показывать из собственного server state. Для callback failure сохранить безопасное same-origin error redirect по supported Auth.js API; не патчить node_modules, не выносить driver message в query и не использовать global lastError. Точный transport typed categories через callback/session boundary — обязательная проверка implementation spike, не обещание кастомного error code в публичном URL.

Пример утверждаемого текста (keys в существующих каталогах):

| Публичная группа / когда | RU | DE | EN |
|---|---|---|---|
| Достоверный общий service/config сбой | Вход временно недоступен из-за технического сбоя сервиса. Попробуйте позже. | Die Anmeldung ist wegen eines technischen Problems vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut. | Sign-in is temporarily unavailable due to a service issue. Please try again later. |
| Известный доступ/identity refusal или неизвестный AccessDenied | Не удалось войти или подтвердить доступ. Повторите попытку; если ошибка сохранится, проверьте настройку доступа к приложению. | Die Anmeldung oder Zugriffsprüfung war nicht erfolgreich. Versuchen Sie es erneut. Prüfen Sie bei anhaltenden Problemen die Zugriffseinrichtung der App. | Sign-in or access verification could not be completed. Try again. If the problem continues, check the app's access setup. |
| Достоверный OAuth flow failure | Не удалось завершить вход через Google. Повторите попытку. | Die Anmeldung über Google konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut. | Sign-in with Google could not be completed. Please try again. |

Текст не утверждает, что Google запретил аккаунт, и не сообщает, существует ли запись/allowlist membership. Нет email input/check-account API. Проверить также различия HTTP status/redirect/body/наличия marker, а не только слова; не обещать constant-time без отдельной проверки. PKCE/state/nonce, verified email+subject, JWT/cookie/CSRF, current allowlist revalidation, ownership и fail-closed сохраняются полностью.

### 9.3. Утверждённый изолированный change set внутри HB-017

**Q-HB17-02 принят: auth diagnostics включены в HB-017 отдельным изолированным change set, без нового HB-ID.** Финансовый и auth diff/review/test evidence разделены; financial commit не зависит от нового health UI. A01–A07 обязательны для общей приёмки HB-017, включая реальные Auth.js callback/session boundaries, а не только mock signIn. Сначала сохранить financial domain/transaction regression evidence, затем независимо доказать auth classification/no-enumeration и выполнить совместную boundary regression. Порядок change sets допустимо переставить при будущей реализации без смешивания доказательств. Принятый scope не разрешает код в текущей сессии.

Будущие файлы при разрешении: `infrastructure/auth/{config,auth,repository}.ts` + узкий server-only diagnostic helper, `app/auth-actions.ts`, `app/login/page.tsx`, RU/DE/EN auth keys, auth config/routes/boundary/integration/component tests, AUTH runbook. `policy.ts` business admission rules не ослаблять; DB URL/config/deps/schema не менять ради UX. Test categories: PostgreSQL unavailable, genuine policy deny, provider OAuth failure/cancel/invalid checks, missing/malformed config, plausible wrong credentials/target, JWT/ownership storage exception, spoofed query и no-enumeration matrix — A01–A07 в сценариях.

## 10. Принятые решения и оставшиеся технические риски

1. **Q-HB17-01 — решён, вариант A.** Разные identities могут иметь lifecycle edits и funding transitions в одном update; same-identity пересечение запрещено в MVP с явным typed refusal, NONE и сохранением draft. Положительные U15/U16 и отрицательные U14 обязательны. Никаких автоматических split commits, фиктивных позиций/дат, weakened SQL/ordering или поддержки same-identity compound.
2. **Q-HB17-02 — решён, включён в HB-017.** Изолированный обязательный auth change set, без нового HB-ID; A01–A07 и независимые auth/financial evidence обязательны. Fail-closed/OAuth/JWT/CSRF/ownership и отсутствие enumeration oracle проверяются на actual callback/session boundaries.
3. **Q-HB17-03 — решён, memory-only.** Input сохраняется при обычных ошибках/конфликтах и навигации внутри mounted form, dirty guard предупреждает. Нет financial browser/offline persistence и обещания recovery после reload/crash/OAuth redirect. Unknown commit outcome разрешается исходным requestId и безопасной проверкой, без автоматического нового финансового действия.

Все три решения приняты владельцем2026-11-03 и записаны в [DECISIONS](../DECISIONS.md#hb-017-scope-decisions--2026-11-03); исходные формулировки сохранены как история в [OPEN_QUESTIONS](../OPEN_QUESTIONS.md#hb-017-planning-review--2026-11-03). Открытых продуктовых решений Q-HB17-01/02/03 больше нет. Multi-source CARRY Q-HB2-02, overdraft Q-HB3-02, historical overspend Q-HB3-03 и recurrence membership Q-HB1-03 остаются вне реализации. Historical checkpoint и поддержанные одиночные edits использовать по HB-010–012; unsupported joint corrections/suffix conflicts — отказ с review, не новая корректирующая политика.

Другие технические риски: смешанные K при чтении; ложный preview из текущего DB state; двойной checkpoint при нескольких paid; partial transaction из независимых saves; report pending flag скрывает исходный drift; cross-proposal replay игнорирует новые edits; target меняется в полночь; большой draft переполняет transport. Для каждого есть обязательные assertions в сценариях. Необходимость существенного расширения guards/schema — основание пересмотреть план до кода.

## 11. Общая приёмка и передача ревьюеру

1. В утверждённых MVP границах один review/submit сохраняет фактический C + полный A + согласованные O/S/transition changes для disjoint identities, без обязательных операций/net explanations и второго debit; same-identity conflict даёт typed refusal/NONE с сохранением draft, без обхода SQL/ordering или split commits.
2. Preview и commit используют те же domain rules/coherent H/K candidate; exact B/A/R/S/F/safe, immutable history и original report versions подтверждены тестами; один receipt/counter increment.
3. Ownership/idempotency/race/outcome/error ветки проверены на actual boundaries/PostgreSQL; draft и unresolved request не теряются из-за обычных ошибок, повтор не создаёт второй update.
4. RU/DE/EN mobile/desktop/keyboard/result/history UX и обязательный изолированный auth change set прошли component/реальный browser QA и actual Auth.js callback/session tests с точными ограничениями. A01–A07 обязательны; financial и auth change sets имеют независимые evidence. Нет shared financial cache/browser/offline persistence/утечек и обещаний recovery после reload/crash/OAuth redirect.
5. Сохранены HB-009–016 regressions и HB-015 gates, recorded exact evidence рассмотрена независимым reviewer и владельцем; только затем возможно обсуждать Done/публикацию.

Независимый ChatGPT review плана **APPROVED, Critical0/High0/Medium0** и три решения зарегистрированы со слов владельца. Финализация документов не является runtime acceptance или разрешением реализации. При будущем исполнении отдельно проверить atomic writers/evidence/replay, disjoint identity guard, report impact, auth enumeration и memory-only guarantees. **Остановиться после документации. Реализацию не начинать без отдельного разрешения владельца; feature-ветку не создавать, HB-017 не отмечать Done.**

## 12. Первоначальная проверка документов — историческая evidence до финализации

На2026-11-03 выполнены `git ls-remote origin refs/heads/main` (совпавший base SHA), `git diff --check` (PASS) и read-only Node stdin проверки трёх документов: 31 local link target существует; 49 уникальных sequential HB17 scenario IDs (U14/P14/X14/A7); UTF-8/новый trailing whitespace проверены; 11 synthetic arithmetic vectors, 55 exact BigInt assertions (ΣA/sign/F/safe/quotient/remainder) — PASS. В первом вспомогательном арифметическом прогоне была ошибочная ожидаемая safe-сумма для F explicit-future варианта; ожидание исправлено на2800/daily100, повторный полный прогон успешен. Это проверка независимых документальных оракулов, не запуск production financial functions.

После чтения `scripts/check_agent_docs.py` Node-эквивалент проверил22 required core files, frontmatter10 bootstrap skills и7 architecture layers — PASS; **сам Python script не запускался**. Этот bootstrap не является finance coverage gate. Unit/integration/component/browser/lint/typecheck/build и liveOAuth здесь не запускались: изменена только документация, приложение/БД не проверялись и не подключались. Новые файлы проверены явно; обычный `git diff --check` сам по себе не охватывает untracked files.

Scope первоначального planning diff: modified `docs/OPEN_QUESTIONS.md`, новые `docs/planning/hb-017-update-budget.md` и `tests/scenarios/phase-01/hb-017-update-budget.md`; index пустой, ветка `main...origin/main`. Эти первоначальные локальные изменения сохранены при финализации, которая дополнительно обновляет DECISIONS. TASKS/код/schema/deps/config не изменены; commit/push/PR/merge/deploy не выполнялись.

## 13. Проверка финализации — 2026-11-03 (только документы)

Три принятых решения и owner-reported review APPROVED (Critical0/High0/Medium0) согласованы между четырьмя документами, этапами и acceptance. Исторические49 сценариев из §12 дополнены U15/U16: итог **51 ID — U16/P14/X14/A7**, без gaps/duplicates. U14 — утверждённый same-identity refusal, U15/U16 — disjoint success, A01–A07 — обязательные, X10/X11 — принятый memory-only. Предлагаемое имя нового typed refusal обозначено как будущий orchestration code, не как существующий runtime contract.

Read-only Node stdin проверка: **56 local links и13 anchors — PASS**, 51 unique sequential scenario IDs — PASS; **10 BigInt assertions** для двух новых vectors U15/U16 (ΣA/nonnegative, F, safe, quotient, remainder) — PASS. Проверено сохранение всего прежнего содержимого DECISIONS и прежнего question register вне блока HB-017. BUSINESS_RULES/TASKS/Accepted ADR и текущие lifecycle/history/transition/auth boundaries сверены без изменения их правил; D36–39 и runtime contracts не переписывались.

`git diff --check` проверяет tracked diff; для каждого нового untracked документа отдельно выполнен `git diff --no-index --check -- NUL <path>`. Whitespace diagnostics отсутствуют; no-index вернул1 из-за различия с пустым файлом и предупредил о будущей LF→CRLF конверсии. Дополнительная явная проверка UTF-8/trailing whitespace новых документов — PASS. Это документальная проверка, не unit/integration/component/browser evidence; runtime-тесты, БД/OAuth/Neon/production не запускались.

Изменены только DECISIONS, OPEN_QUESTIONS, HB-017 plan и scenarios; `.vscode/`, исходные локальные файлы и index сохранены. Ветка `main`, HEAD `9bf449e`; feature-ветка не создавалась, TASKS status не менялся. **Финализация завершена; остановиться до отдельного разрешения владельца на реализацию.**

## 14. Исполнение по отдельному разрешению владельца — 2026-11-03

Владелец отдельно разрешил локальную реализацию после §13. Предыдущие запреты
начала реализации и создания feature-ветки описывают исторический planning этап.
Работа выполняется в `feat/hb-017-update-budget` от `9bf449e641818c1bfaa15d8b76a0dd9d3d8a740a`;
commit/push/PR/merge/deploy и Done по-прежнему не разрешены.

Фактическая композиция: `domain/budget-update` (bounded draft, pure candidate на
existing selectors/lifecycles), `features/budget-updates` (authorized use cases и
memory-only form), приватный `infrastructure/db/budget-update-*`, server actions
`app/update-budget` и dashboard CTA. Один commitBatch/lock/position/vector/receipt;
actual checkpoint только при ACTUAL_CHECK. Private replay proof hook сохраняет
старые canonical identity bytes и legacy callers. FRESH_START source union берётся
из existing pure `planAllocationChange.affectedPast` при исходном K, а не из позднее
созданных period controls. Immutable report versions не переписываются.

Предпросмотр показывает суммы до/после, funding month, полный unpaid remainder,
payment/release/increase evidence, current estimate и actual date. Confirm отдельный;
scope/revision/order/H/K/consents проверяются повторно. Unknown outcome удерживает
исходный requestId/payload только в живой форме. Q-HB17-01/02/03 не пересмотрены.
Auth diagnostics реализуются отдельными файлами и проверяются отдельными тестами;
новый HB-ID не создавался. Схема/миграции/deps/config/ADR/D36–39 не меняются.

[Verification report](hb-017-verification.md) содержит точные команды, отдельные
financial/auth evidence, 51-ID matrix, browser scope и ограничения. Документальные
PASS из §12–13 не считаются runtime доказательствами. Независимое review реализации
и приёмка владельца остаются обязательными; этот раздел не объявляет Done.
