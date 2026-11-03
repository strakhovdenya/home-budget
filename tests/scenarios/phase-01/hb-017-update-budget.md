# HB-017 — Update budget: финализированные сценарии MVP

**2026-11-03 · DOCUMENTATION ONLY · scope принят, реализация не разрешена, не PASS.**
Владелец сообщил результат независимого ревью ChatGPT: **APPROVED,
Critical 0 / High 0 / Medium 0** и утвердил Q-HB17-01/02/03.
[Принятые решения](../../../docs/DECISIONS.md#hb-017-scope-decisions--2026-11-03).
Это owner-reported plan review, не утверждение о выполненной реализации/тестах.
[Технический план](../../../docs/planning/hb-017-update-budget.md).
Authority: [BR-01–11](../../../docs/BUSINESS_RULES.md), Accepted ADR0001–0003,
D26–39. Существующие HB-009–016 scenarios/tests сохраняются. Новые HB17 IDs
не объявляют выполненной finance coverage; executable mappings добавляются после
разрешения реализации и реального запуска. U/P/X/A — разные группы, не HB-задачи.

## Общие условия и оракулы

Все данные синтетические; деньги bigint EUR cents (на wire decimal strings),
даты — Europe/Berlin. U — pure unit, P — настоящий PostgreSQL integration,
X — boundary/component/browser QA, A — обязательные auth UX tests изолированного
change set внутри HB-017. Финансовый и auth change sets требуют независимых evidence;
финансовый PASS не заменяет A01–A07. Всего51 scenario IDs: U16/P14/X14/A7.
Каждый сценарий независим, если явно не указана последовательность. Неуказанные
allocations/funding равны0 **только в полном состоянии**, не при отсутствии C/V.
H — историческая дата/позиция, K — inclusive account recordedSeq; revision и K
могут отличаться численно. Их увеличивать ровно на1 на новый финансовый commit.

**Fixture D:** owned EUR account, C0 от2026-10-30 B50000,
V0 A{2026-11:40000,2026-12:10000}; O1 ordinary UNPAID original/outstanding20000
fundedNov, S1 ACTIVE5000 fundedNov. CREATE O/S выполнены на отдельных более ранних
позициях; их актуальные revision refs входят в baseline. На H2026-11-03/K0
RNov20000,SNov5000,FNov15000,FDec10000; safe15000, inclusiveDays28,
daily535/remainder20, ordinary535/20. Dec cash10000 защищён один раз.
Здесь K0 — метка захваченного cut, не literal seq0 с уже существующими facts.

**Fixture C:** C0 от2026-10-28 B90000,
A{Oct:40000,Nov:50000}; O1 unpaid30000 и S1 active5000 fundedOct,
другая identity O2 unpaid2000 fundedNov. H/asOf2026-11-03.
F before Oct5000/Nov48000. CARRY Oct→Nov в REUSE даёт
A{Oct:0,Nov:90000}, RNov32000,SNov5000,FNov53000;
safe53000,daily1892/remainder24 на28 дней.

**Fixture F:** C0 от2026-09-20 B10000,A{Sep:4000,Oct:4000,Dec:2000}.
O1 Sep3000,O2 Oct1000,O3 Nov500; S1 Sep500,S2 Nov200,S3 Dec700.
Все identities созданы на отдельных позициях после C0 и доNov3, full current
state refs сохранены. H/asOfNov3. Fresh actual B9000 и FRESH_START дают
A{Sep:0,Oct:0,Nov:7000,Dec:2000}, RNov4500,SNov700,SDec700,
FNov1800,FDec1300; safe1800,daily64/remainder8, ordinary64/8 на28 дней.
Past free/history не переносятся как долг. O3/S2/S3 уже current/future и не
получают повторных funding events.

**SUCCESS**: один budget_update/receipt, counters+1, все explicit changes/audit
в одном commit; C создаётся ровно1 iff ACTUAL_CHECK, V ровно1, одна новая позиция
на дату для co-located distinct identities. Каждое событие содержит проверенные
before/after/effective/recorded/actor/consent refs; payment/release amounts не
выводятся из checkpoint delta. Оригинальные C/V/events/audits/reports неизменны.
Никаких inferred income/expense, operations/PDF postings или automatic B debit.

**NONE**: после отказа полное содержимое scoped tables и account row
(counters/pointer/flags включительно) равно baseline, не только counts.
Replay успешного запроса тоже не создаёт rows. **PREVIEW**: financial state,
audit/receipt/counters/heads неизменны; cash-only preview полностью read-only.
Если transition prepare создаёт immutable proposal/period control rows, отдельно
сравнить allowlisted control writes; их нельзя считать financial commit или
заявлять полное отсутствие SQL writes. Failed confirm сохраняет ранее созданный
proposal, но откатывает все financial writes.

Серверные P tests используют actual recording clock и прошлые dates; transition
fixtures привязываются к текущему Berlin месяцу через существующий calendar helper
с сохранением offsets/смыслов. Не замораживать production clock и не отключать
future/target checks ради фиксированнойNov3. Pure U/X fixture clock инъецируется.

## U01–U07 — состояние, баланс, полное распределение

| ID | GIVEN | WHEN | THEN / будущий proof |
|---|---|---|---|
| HB17-U01 | D | ActualNov3 B47000,A{Nov37000,Dec10000}, без O/S edits | R20000,S5000,FNov12000,FDec10000,safe12000,daily428/r16; ΔB−3000 не назван расходом; SUCCESS. U+P |
| HB17-U02 | Owned account без C/V, известный O20000/S5000 fundedNov | Первый actualNov3 B10000,A{Nov10000} | R20000/S5000 сохранены,F−15000,deficit15000,safe/daily0; до save B/A/F unavailable, не0; SUCCESS без повторных CREATE O/S. Отдельная ветка B0/A[] также valid, F−25000. U+P |
| HB17-U03 | D | Новый реальный actual checkNov3 с B50000 и прежним A; затем replay той же команды | Один новый C/dateNov3/V; replay возвращает исходный receipt, не второй C. R/S/F прежние. Equality не означает REUSE. U+P |
| HB17-U04 | D | Явный ALLOCATION_ONLY/REUSE Nov3 A{Nov35000,Dec15000}, reviewed funding unchanged | B50000,C0/dateOct30/count прежние,R/SNov прежние,FNov10000,FDec15000,safe10000,daily357/r4; V новая, no checkpoint, SUCCESS. Без consent unchanged funding — NONE. U+P |
| HB17-U05 | D | Preview/confirm вариантов: A sum49999/50001 приB50000; A{Nov55000,Dec−5000}; duplicateNov; B−1 | Sum mismatch / NEGATIVE_CASH_ALLOCATION / DUPLICATE_PERIOD / OVERDRAFT_POLICY_REQUIRED соответственно, NONE, без clamping/suspense/кредитного лимита. Проверять каждый вариант отдельным parameterized case. U+P |
| HB17-U06 | D, ожидаемые ещё не полученные5000 только planning metadata | Не меняя actual B50000 пытаться подтвердить A total55000; отдельно actual получено B55000,A{Nov40000,Dec15000} | Первый NONE; второй valid,R/S прежние,FNov15000,current safe15000; будущие полученные деньги не прибавляются к Nov guidance. Нет auto income event. U+P |
| HB17-U07 | Owned complete B1,A{Nov1},R=S0 | PreviewNov3, затем отдельноNov30; parsing 0.01/0,01,MAX и >MAX/number/fraction/exponent | Nov3 safe1,daily0/r1; Nov30 daily1/r0. Exact MAX9223372036854775807 сохраняется, +1/range/float inputs reject; неоднозначное1,000 reject, no rounding. NONE на invalid. U+boundary |

## U08–U14 — обязательства, накопления, переходы

| ID | GIVEN | WHEN | THEN / будущий proof |
|---|---|---|---|
| HB17-U08 | D | ActualB45000,A{Nov35000,Dec10000}; partial O1=5000 и release S1=2000 одним submit | outstanding/R15000,S3000,FNov17000,FDec10000,safe17000,daily607/r4; один C/V, точное payment evidence5000/release2000; B45000, не40000 или47000; SUCCESS. U+P |
| HB17-U09 | D плюс independent O2 unpaid3000 fundedNov, totalR23000 | ActualB50000/A прежний и partial O1=5000 + PAID O2=3000 | Без fresh affirmation и отдельного unchangedBalanceAcknowledged — NONE для всего batch. После explicit ack один C наNov3,R15000,S5000,FNov20000; оба payments ссылаются на этот C, bank остаётся50000. REUSE не обходит требование. U+P |
| HB17-U10 | D | OUTSIDE_TRACKED_CARD partial5000 при actual B50000/A прежний и ack; альтернативы B45000 или no prior C | Первая SUCCESS,R15000,S5000,FNov20000, source/reason/evidence сохранены,no debit. Обе альтернативы conservative PAYMENT_CONFIRMATION_REQUIRED/NONE даже сack по HB-011; не ослаблять под UX. U+P |
| HB17-U11 | D | Cancel O1 + INCREASE S1=3000, actualB50000/A прежний | CANCELLED не PAID,R0,S8000,FNov32000,safe32000,daily1142/r24,B50000; SUCCESS, retained cancelled original outstanding не резервируется. Альтернатива possible UNPAID20000: explicit full selection→R20000, unselected→R0; ordinary partial reserve input reject. U+P |
| HB17-U12 | C | CARRY Oct→Nov REUSE с явным funding consent; отдельно ACTUAL B84000,A{Oct0,Nov84000} | REUSE результат fixtureC; ACTUAL ровно1 новый C,V; RNov32000,S5000,FNov47000,safe47000,daily1678/r16. O/S identity/origin сохранены, target cash один раз; Δ−6000 не expense. Negative source F (напримерO1=50000) перенос не блокирует. U+P |
| HB17-U13 | F | Explicit FRESH_START actualB9000 с preservedDec2000; альтернативы future editDec1000/actual1500 | База результатfixtureF. При явном Dec2000→1000 A Nov8000,FNov2800,FDec300,safe2800,daily100/r0; без future consent NONE. При actual1500 с untouchedDec2000 PRESERVED_ALLOCATION_CONFLICT/NONE; explicitDec1000 даёт ANov500,FNov−4700,fullR/S, safe0; SUCCESS. Старые месяцы/неизвестные month-end balances остаются в истории. U+P |
| HB17-U14 | C; для FRESH_START также F | DEFER actualB84000,A{Oct34000,Nov50000}; отдельно multi-source CARRY; параметризованные CARRY/FRESH_START + lifecycle edit той же переносимой obligation/saving identity | DEFER: ROct30000,SOct5000,RNov2000,F Oct−1000/Nov48000,safe47000; no funding move/transfer. Multi-source — OWNER_POLICY_REQUIRED/NONE. **Принятый Q-HB17-01, вариант A:** O1 AMEND/PARTIAL_SETTLEMENT/PAID/CANCELLED + FUNDING_TRANSFER, S1 AMEND/INCREASE/PARTIAL_RELEASE/FULL_RELEASE + FUNDING_TRANSFER дают явный typed refusal `SAME_IDENTITY_COMPOUND_NOT_SUPPORTED` (планируемый orchestration code, ещё не runtime API), NONE для всего batch, draft/input retained. Проверить пересечение на preview и confirm, включая неявно вычисленный funding set FRESH_START. Не auto-select mode, не дробить commits, не создавать фиктивные позиции/даты, не ослаблять SQL/ordering. Это обязательный MVP refusal, не поддержка compound. U+P+component |

## U15–U16 — положительная композиция disjoint identities

U14 проверяет funding set по исходной согласованной базе: нельзя обойти refusal,
сначала применив PAID/CANCELLED/FULL_RELEASE и скрыв переносимую identity из
финального funding set. Такой запрос остаётся NONE; draft сохраняется.

Один общий historical position допустим для разных typed identities. Пересечение
lifecycle set с funding set пусто; original predecessor каждой identity строго
раньше. Запрет U14 не должен блокировать эти допустимые атомарные обновления.

| ID | GIVEN | WHEN | THEN / будущий proof |
|---|---|---|---|
| HB17-U15 | C: O1 unpaid30000/S1 active5000 fundedOct; другая O2 unpaid2000 fundedNov | Один CARRY Oct→Nov + ACTUAL Nov3 B88000,A{Oct0,Nov88000} + PAID O2=2000, fresh affirmation, reviewed vector/funding/payment consent | SUCCESS одним commit/C/V/position/receipt, counters+1. O1/S1 получают только FUNDING_TRANSFER, identity/origin/amounts сохраняются; O2 получает только PAID, outstanding0/reservefalse и payment evidence2000 с общим actual C. RNov30000,SNov5000,FNov53000,safe53000,daily1892/r24; B88000, не86000, старые facts/report versions неизменны. Retry — original receipt без новых events. U+realPG+component/browser |
| HB17-U16 | F: old O1/O2/S1 переносятся; другая S2 active200 уже fundedNov, S3 active700 fundedDec | Один FRESH_START + ACTUAL B9000,A{Sep0,Oct0,Nov7000,Dec2000} + PARTIAL_RELEASE S2=100, explicit nonCarry/funding/release consent | SUCCESS одним commit/C/V/position/receipt, counters+1. Только old O1/O2/S1 получают funding events; S2 получает только release с exact evidence100/after100, S3 неизменна. RNov4500,SNov600,SDec700,FNov1900,FDec1300,safe1900,daily67/r24; B9000, не8900/9100. Origins/full unpaid reserves/history сохранены; future cash protected один раз. Retry без повторного release/transfer. U+realPG+component/browser |

## P01–P07 — атомарность, повтор и конкуренция

Общий финансовый successful command для этой группы — U08 с frozen requestId Kreq,
expectedRevision r0. Каждая проверка использует новую fixture D и свой database
baseline; ни одна не зависит от «чистоты» чужого контейнера.

| ID | GIVEN | WHEN | THEN / будущий proof |
|---|---|---|---|
| HB17-P01 | D | Сохранить U08 через реальную app/application/repository composition | SUCCESS; U08 exact numbers/refs; все C/V/O/S/audit/receipt принадлежат одному batch/seq, account revision+1, нет промежуточного vector50000. PG |
| HB17-P02 | P01 успешно; более поздний независимый update уже advanced head | Повторить original Kreq/exact payload/expectedRevision | Тот же validated receipt **до** stale/calendar, old state не reapplied, ни новых rows/counters. PG |
| HB17-P03 | P01 либо prepared transition aggregate | С тем же ключом изменить release amount, payment source/ack, allocation, reason/date/base ref/expectedRevision; для confirmed proposal новым ключом изменить earmark edit | Same-key REQUEST_PAYLOAD_CONFLICT; proposal replay не игнорирует lifecycle edits и отказывает изменённому документу. NONE относительно committed baseline; exact semantic replay по HB-013 возвращает original receipt только после проверки полного evidence. PG |
| HB17-P04 | Две реальные connections, одинаковый Kreq/U08 | Первая удерживает account lock, вторая доказанно ждёт, затем release barrier | Обе получают один receipt; writer once, один C/V/payment/release; R15000/S3000, SUCCESS ровно1. PG lock waiting доказать, не задержкой sleep |
| HB17-P05 | Две connections, разные requestId, одинаковаяr0 | Одновременно сохранить разные edits после barrier | Один winner, другой STALE_REVISION; полный winner state сохранён, loser не добавил audit/receipt/events. UI сохраняет loser draft для нового review. PG+X |
| HB17-P06 | Writer успел вставить C/V/O event | Test-only controlled failure в savings persist, затем отдельный audit INSERT failure и deferred COMMIT constraint failure | Каждый вариант полный rollback NONE включая periods/pointer/flags/receipt/counters; исходные evidence неизменны. Не Result.error из callback. PG |
| HB17-P07 | Реальный COMMIT выполнен, acknowledgement намеренно потерян | Сначала получить COMMIT_OUTCOME_UNKNOWN, затем status/same-key replay | В БД один successU08; UI не объявляет rollback/новый request, retry возвращает original receipt. Отдельный pre-commit retryable failure даёт rollback и тот же ключ может успешно завершиться1раз. PG+boundary |

## P08–P14 — scope, H/K, report impact и limits

| ID | GIVEN | WHEN | THEN / будущий proof |
|---|---|---|---|
| HB17-P08 | D с committed receipt, второй чужой owner/account | Direct load/preview/confirm/status/history, подмена own account selector либо foreign O/S/proposal revision refs | Нет foreign state/receipt/IDs/amounts, owned mutation NONE. Проверки до replay и under account lock; expired session не сохраняет. PG+boundary |
| HB17-P09 | D, preview приK0/r0 | Между preview и confirm изменены selected O/S head, ordering, vector либо был равный actual check | STALE_REVISION либо соответствующий typed stale/history refusal, NONE; нет auto-rebase на новый partial balance. Чужой client H/K не выбирает серверный cut. PG |
| HB17-P10 | Согласованный read приK0; конкурентный writer после захвата account snapshot | Задержать load/preview в actual REPEATABLE READ READ ONLY, завершить concurrent commit | DTO целикомK0 или следующий запрос целикомK1; не oldB/newR/newS. Read zero financial writes; полный identity/evidence inventory обязателен. PG |
| HB17-P11 | Есть C5Oct5 B50000/AOct50000 и C10Oct10 B45000/AOct45000, coherent O/S, no incompatible suffix | НаNov3 actual insert C7Oct7 B48000/AOct48000 с reviewed placement | Active C10/V10/B45000 сохранены; HOct7/newK C7, oldK C5; one historicalC/V, не replayΔ вC10. Более поздний incompatible payment/release suffix в отдельной ветке вызывает full NONE, а не rewrite. PG |
| HB17-P12 | C и nonempty immutable Oct reportv1 с pinned HOct31/K0/refs; unrelated Sep headfalse | Nov3 переход/оплата current; отдельно historical change с доказанным Oct impact | Current action не меняет Octv1/pending. Историческое изменение ставит только affected pending+audit, no v2; старые report bytes/refs/cutoff/version прежние. Missing/invalid manifest или исходный unflagged drift отказывает NONE даже если sibling step уже пытался поставить pending. PG |
| HB17-P13 | Prepared CARRY/DEFER aggregate с exact edits, затем independent update/новый Berlin месяц/cancel | Confirm нового действия; отдельно доказанный replay старого success после смены месяца | Stale/target/cancel refusal для нового действия, no partial writes. Proven original replay до calendar guard возвращает receipt. Cancel/confirm race ровно один terminal outcome; funding/paid/savings manifest полностью проверен. PG |
| HB17-P14 | Draft с >MAX totals, duplicate identity, отсутствующей identity creation/evidence, corrupt receipt либо превышением limits | Preview/confirm/status/history с adversarial bounded input, mutate original DTO пока auth await | Typed safe refusal/NONE, no truncation/implicit zero; mutable object не меняет frozen command/hash. Unknown actor/audit/state fields не принимаются. LIMIT refusal не содержит financial values; existing MAX controls exact. PG+unit |

## X01–X07 — форма и предпросмотр

UI transport может мокаться для component tests; actual local browser QA использует
синтетическую БД и существующую авторизацию. Нет test bypass в runtime. При
недоступном test login записать browser limitation, не объявлять E2E пройденным.

| ID | GIVEN | WHEN | THEN / будущий proof |
|---|---|---|---|
| HB17-X01 | D, dashboardcurrent/future/past | CTA→/update-budget | Server account selection/authorization, fresh Berlin defaultdateNov3; весь A видим, dashboard period не меняет rollover target/observedDate. Initial noC на owned account открывает initial form; no/multiple account не создаёт счёт. Boundary+browser |
| HB17-X02 | D form, incomplete draft A{Nov30000,Dec10000},B50000 | Preview | Показано недостаёт10000, input retained, никакой suspense row; confirm недоступен без valid preview. Ввести37000/10000/B47000→U01 server result. UI не считает local F/safe своими формулами. Component+browser |
| HB17-X03 | D, готовый previewU08 | Изменить balance/date/release/source/mode/consent; delayed response от старого preview | Review invalidated; old response не заменяет новый draft/не активирует submit. Новый preview отражает exact input; нет save старого hidden payload. Component+boundary |
| HB17-X04 | D+O2 изU09 | Paid with same B и попытка submit безack; затем explicit ack | Accessible warning о fresh card check; первый no writes, второй один financial submit с двумя payment evidence и одним C. Увеличение F не выдаётся за cash receipt. Component+browser |
| HB17-X05 | C/F draft при смене месяца | Открыть mode selection/уйти/вернуться; выбрать CARRY/FRESH_START/DEFER | Ни mode, ни funding/nonCarry/future-edit consent не preselected; cancel/abandon не делает финансовых действий. FRESH_START показывает identities/full amounts/not-carried history; new month invalidates old review. Component+browser |
| HB17-X06 | U08 final reviewed command | Double-click/Enter/две отправки; отдельно back to edit до submit | Pending UI защищает, backend same-key idempotency обязателен; ровно1success. Edit без save не создаёт финансовой истории. Confirm — единственный mutation submit, Preview не равен Save. Component+browser |
| HB17-X07 | D, loader/field error/history conflict/storage failure/negativeF | Возврат server result | Различимые safe states; focus first error, aria-live без repeated view-blocking warning consent; draft не сброшен. NegativeF valid и виден как deficit, no autoS release/partialR. Component |

## X08–X14 — результат, история, локали и устойчивость

| ID | GIVEN | WHEN | THEN / будущий proof |
|---|---|---|---|
| HB17-X08 | ReceiptU08 success, read result временно fails | Отобразить success/нажать retry read | «Сохранено, результат не загружен», тот же updateId; no second save. После read точный confirmed B45000/R15000/S3000/F17000, bound update history. Component+browser |
| HB17-X09 | Committed U08; затем metadata change того же O/S | Открыть history original update | Исходные copied before/after/date/payment/release/consent, separate recorded time, original refs/versions, а не live join новых title/amount. Replay не добавляет timeline item; foreign/unknown IDs дают одинаковый безопасный отказ без чужих refs. Boundary+PG+browser |
| HB17-X10 | Dirty draftU08 и draftU14 с запрещённым same-identity пересечением | Обычные ошибки/конфликты/refusal, переходы внутри mounted form, back/cancel/link navigation, locale/theme change | По принятому Q-HB17-03 memory-only сохраняет raw input/канонические cents и выбор действий при mounted navigation/error/conflict/refusal; dirty guard предупреждает перед уходом, отказ от ухода оставляет ввод. Нет auto-rebase и смены intent от locale/theme. Нет financial values в URL/log/localStorage/sessionStorage/IndexedDB/offline persistence; проверить соответствующие browser APIs. Component+browser |
| HB17-X11 | Pending/unknown request в живой вкладке; отдельно full reload/OAuth/crash | Safe status/read; явный same-key retry по HB-009; отдельно перезагрузить и вернуться | Живая вкладка сохраняет original requestId/exact payload до разрешения outcome; нет нового ключа/автоматического нового финансового действия. После reload сначала scoped recent result/read confirmed state без auto-resubmit; memory-only draft/requestId могут быть утрачены. Q-HB17-03 решён: **не обещать recovery после reload/crash/OAuth redirect**, не восстанавливать через financial browser/offline storage. Boundary+browser |
| HB17-X12 | RU/DE/EN × light/dark/system | Input0,01/0.01 иMAX, previewU08, errors/conflicts/history; смена локали | Exact cents и две дробные цифры, localized dates/messages/buttons, нет необработанных технических кодов/SQL; early years0001/0099 иFeb2028 корректны; SSR/hydration/catalogs без ошибки. Unit+component+browser |
| HB17-X13 | Screen320/375/768/1280px, длинныеDE labels, MAX иsignedF, zoom200%/reflow400% | Keyboard-only/виртуальная mobile keyboard/skip/drawer/back/error/result | Полные суммы/минусы видимы, no page overflow, 44px targets, sticky area не перекрывает focus/поле; labels/headings/focus/error summary/status доступны, reduced motion и контраст проверены. Component не доказывает геометрию — отдельный реальный browser record |
| HB17-X14 | Berlin DST2026-03-29/10-25, UTC/LA hostTZ, month/year boundary, stale age6/7/8 | Preview и committed result read; REUSE после старого checkpoint | Civil dates/инклюзивные дни и age отHB-008/014; reminder iff>=7, bank freshness не освежён REUSE. GET/open/Back не создают финансовых действий или closingv2. Записать фактический UTC/LA/regression gate и browser scope, не наследовать PASS старых verification. Unit+PG+browser |

## A01–A07 — обязательный изолированный auth change set HB-017

Q-HB17-02 принят: все семь сценариев обязательны для приёмки HB-017, без нового
HB-ID. Отдельно записать auth unit/real local PostgreSQL/actual Auth.js callback
и session boundary/component/browser evidence. Mock signIn и financial regression
не заменяют реальные callback/session проверки. Публичные messages, HTTP statuses,
redirects и cookies не должны различать membership/existence по новой диагностике.

Ни один сценарий не допускает Google/OAuth/network/production secrets в fixtures.
Auth.js callbacks/routes/session tests используют synthetic identity и controlled
provider transport. PostgreSQL failure tests — только собственный disposable local
target; не останавливать чужой контейнер и не подставлять Neon для проверки.
Во всех отказах нет новой сессии/identity binding/financial save, секретов/PII в
body/redirect/log; точные balances D/C/F не меняются.

| ID | GIVEN | WHEN | THEN / будущий proof |
|---|---|---|---|
| HB17-A01 | Локальная PostgreSQL недоступна при identity-independent check; две альтернативные synthetic identities: allowed/other | Login/callback/error rendering | Одинаковый public service message наRU/DE/EN, одинаковая response class независимо отallowlist; private AUTH_STORAGE_UNAVAILABLE stage/correlation only; fail closed. Real local unavailable connection + route/component |
| HB17-A02 | Healthy storage; unverified/nonallowed/provider-subject mismatch/known binding collision/unknown identity | Actual policy/callback outcome | Neutral access/sign-in message, не «Google запретил». Public result не различает существование/stored subject/allowlist; private policy vs binding categories достоверны; repository не вызывается для invalid policy. Unit+route+PG |
| HB17-A03 | Actual Auth.js synthetic provider flow: cancel/access_denied, invalidstate/nonce/PKCE, discovery/token failure | Callback и error redirect (не только login action catch) | No session/no disabled checks, known OAuth-safe class даёт OAuth message; неоднозначный AccessDenied/CallbackRouteError fallback neutral. Preserve same-origin redirect/Next control-flow. Route/integration transport |
| HB17-A04 | Missing/malformed auth config; отдельно синтаксически valid, но ошибочные credentials либо неверный responsive DBtarget | Login и callback | Independent invalid config→service text+AUTH_CONFIG_INVALID; plausible wrong config не определяется изAccessDenied автоматически. Нет env/URL/allowlist вcopy/log, нет automatic target switch/repair; actual wrong environment verification вне теста. Unit+route |
| HB17-A05 | Health сначала healthy, но bind/matches/ownsAccount бросает private synthetic error после policy; затем healthy recovery | Signin/session/write, сопоставление allowed/denied public outputs | Private storage/session category сохранена в достоверной stage; service-specific public result не появляется **только** уallowed. Без независимого общего outage evidence neutral fallback; session/ownership fail closed, не успешный допуск. Нельзя считать every FORBIDDEN policydeny. Unit+route+boundary |
| HB17-A06 | ?error=AccessDenied/Configuration/произвольныйHTML/URL, concurrent failures двухrequests | Render login, log capture, back/reload/no-session route | Query не достоверный diagnostic; fixed allowlisted escaped copy, no rawHTML/redirect, no global lastError/cross-request contamination/no error-page auth loop. Логи только category/stage/random correlation/time, noSQL/rawcause/stack/email/subject/cookies. Unit+component+route |
| HB17-A07 | Все A01–06; logs содержат только synthetic sentinels для forbidden fields; healthy provider/PGpositive control | No-enumeration matrix сравнивает status/redirect/body/cookie/marker поidentity, затем successful login→logout/direct submit | Нет membership/existence oracle в новой классификации, genuine success с прежними policy/cookie/revalidation/CSRF/Origin checks. Auth diagnostics не меняют financial state. Record limitations timing/live Google separately; не заявлять constant-time илиliveOAuth PASS по mocks. Route+PG+browser |

## Будущая evidence и границы приёмки

Implementation authorization владельца получено отдельно 2026-11-03 после
финализации planning. Исходные 51 ID и числовые оракулы ниже/выше сохранены;
историческое «планируемый orchestration code» в U14 относится к моменту planning.
Текущий typed refusal — `SAME_IDENTITY_COMPOUND_NOT_SUPPORTED`, MVP restriction
same-identity compound не снят. Executable mapping и фактические результаты:
[HB-017 verification](../../../docs/planning/hb-017-verification.md).
Unit/component, real PostgreSQL и real Chrome evidence различаются явно;
jsdom не заменяет browser QA, synthetic OAuth transport не доказывает live Google.

Сначала U и P financial tests, затем screen wiring/X. Сохранить HB-009–016 tests,
HB-015 exact evidence gate и UTC/LA coverage; не считать новые markdown scenarios
исполняемыми тестами. Каждый executable title должен явно маппиться на HB17 ID;
unit, real PG, component, browser evidence разделять. Для отказов baseline включает
nonempty original report/audit/event fixtures. Числовые оракулы проверять независимо
от функции, которую тестируют; screenshot не заменяет PG rollback assertion.

Q-HB17-01/02/03 [решены владельцем](../../../docs/DECISIONS.md#hb-017-scope-decisions--2026-11-03),
исходные вопросы сохранены в [OPEN_QUESTIONS](../../../docs/OPEN_QUESTIONS.md#hb-017-planning-review--2026-11-03).
U14 — обязательный same-identity refusal в принятом MVP; U15/U16 — обязательные
положительные disjoint cases, без поддержки same-identity compound. A01–A07 —
обязательная часть приёмки, financial/auth evidence независимы. X10/X11 закрепляют
принятый memory-only и честные ограничения восстановления. Нерешённых scope gates
по этим трём вопросам нет, но implementation/tests ещё не выполнены.
**Остановиться после финализации документов. Код без отдельного разрешения не писать.**
