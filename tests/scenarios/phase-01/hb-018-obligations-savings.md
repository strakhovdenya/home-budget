# HB-018 — сценарии obligations/savings management

**2026-11-03 · PLANNING ONLY · 42 новых сценария, не выполненные тесты.**
Связан с [техническим планом](../../../docs/planning/hb-018-obligations-savings.md),
[BR-01–11](../../../docs/BUSINESS_RULES.md),
[core rules](core-rules.md), [HB-011](hb-011-obligations.md),
[HB-012](hb-012-savings.md), [HB-013](hb-013-period-allocations.md),
[HB-014](hb-014-daily-forecast.md), [HB-017](hb-017-update-budget.md).
Независимое ревью и отдельное разрешение владельца нужны до реализации.

## Общие GIVEN, суммы и write-set assertions

Все суммы **integer EUR cents**, в domain bigint, wire canonical decimal strings;
в таблицах числа без разделителей. Date semantics Europe/Berlin.
Каждая строка начинается с независимой копии fixture, если явно не дана цепочка.
Источники/actor/owner/IDs синтетические; O1/S1 — aliases test UUIDs, не реальные IDs.

**D:** today=2026-11-03, 28 inclusive days до Nov30; owned account alpha,
aggregateRevision=10, K=10, C0 actual2026-11-02 B100000,
V0 A{Nov80000,Dec20000}; O1 title «Счёт A», UNPAID ordinary,
total=outstanding30000, reserveFull=true, origin=fundingNov, dueNov20;
S1 «Резерв A», ACTIVE10000, origin=fundingNov.
RNov30000/SNov10000/FNov40000, FDec20000; safeAvailable40000,
mainDaily1428/remainder16, secondary current budget daily1428.
Все CREATE predecessors уже подтверждены раньше новых edits; explicit same-day
placement используется при наличии других positions. Не предполагать UUID order.

**N:** nonpayment edit2026-11-03 через явный ALLOCATION_ONLY/REDISTRIBUTE,
REUSE_CONFIRMED C0, прежний полный A, explicit vector/funding-unchanged consent.
Новый V/event/receipt и counters+1, **нет нового C**, last observed Nov2.
Не генерировать actual check по умолчанию или только потому, что B совпал.

**SUCCESS:** один account-locked batch/update/receipt, один position/vector,
один actual C только при ACTUAL_CHECK; точные O/S revisions/audits и counters+1.
Проверить selected financial state, exact immutable evidence, origin/identity,
report bytes/heads, отсутствие cash movement/income/expense/PDF rows.
Preview/list/detail/history/handoff никогда не подтверждают financial facts;
существующие transition preview controls не считать финансовым commit.

**NONE:** ни одного нового checkpoint/vector/lifecycle/funding/financial audit/
receipt, counters/active pointer/reports unchanged; введённые данные сохраняются.
Для всех invalid/stale cases сравнить фактические before/after row counts+bytes,
не только возвращённый code. Unknown outcome — **не** утверждение NONE:
проверить status/replay исходной команды до решения о новом действии.

Для каждого SUCCESS проверить B>=0, каждый A>=0, sum(A)=B;
R=sum(full outstanding только UNPAID reserveFull), S=sum(ACTIVE retained),
F=A−R−S, sum(F)=B−sum(R)−sum(S), future cash не расходуется текущим forecast.
Safe/main брать из D36 existing pure projection; no React financial math.
При NONE состояние D сохраняет B100000/R30000/S10000/F40000, если не задано иное.
Все незатронутые Dec allocation20000 и history refs сохраняются.

## U01–U07 — обязательства, future unit/domain/presentation proof

| ID | GIVEN | WHEN | THEN / проверяемые суммы и ограничения |
|---|---|---|---|
| HB18-U01 | D | CREATE O2 ordinary12000 fundedNov через N | O2 UNPAID total/outstanding/reserve12000; total R42000,S10000,FNov28000,safe28000,daily1000; B100000/A прежний, SUCCESS; title/due/origin revisioned, no bank debit |
| HB18-U02 | D | CREATE possible O2=12000 reserveFull=false; затем отдельный подтверждённый AMEND true и отдельный AMEND false | Сначала O2 outstanding12000/reserve0,R30000,F40000; после explicit true R42000,F28000; после false R30000,F40000. Каждый submit по N и свежей revision, no partial reserve. Возможность не новый status; no auto selection |
| HB18-U03 | D, но O1 total30000/outstanding20000 после подтверждённой оплаты10000; R20000,F50000 | AMEND total35000/title «Счёт B»/dueDec05 через N | Settled10000 сохраняется, outstanding/reserve25000,R25000,S10000,F45000,safe45000; funding/originNov, B100000; creation total30000/title A остаются в истории. total10000/9000 вместо35000 отклоняется: не UNPAID с0/negative и не implicit PAID, NONE |
| HB18-U04 | D | PARTIAL_SETTLEMENT10000 TRACKED_CARD + actualNov3 B90000,A{Nov70000,Dec20000}, fresh affirmation | O1 UNPAID outstanding/reserve20000,total30000; S10000,FNov40000,safe40000,daily1428/r16; один actual C, B90000, не80000; payment amount10000/source/checkpoint/before-after refs exact. SUCCESS, checkpoint delta не считается confirmed expense |
| HB18-U05 | D | PAID30000 с actualNov3 B70000,A{Nov50000,Dec20000}; отдельно actualNov3 B100000/A прежний | Первая SUCCESS: O1 PAID/outstanding0/reserve0,R0,S10000,FNov40000,B70000,не40000. Во второй без unchanged acknowledgment NONE/PAYMENT_CONFIRMATION_REQUIRED; после явных fresh affirmation+ack SUCCESS FNov70000,safe70000,daily2500,B100000. REUSE payment не допускается |
| HB18-U06 | D | CANCELLED O1 через N; затем попытка обычного AMEND/PAID отменённой identity | После cancel outstanding30000 сохранён, reserve0,R0,S10000,FNov70000,B100000; no payment evidence и no debit. Следующие действия TERMINAL_OBLIGATION/NONE; PAID identity также read-only. Отмена отдельно от оплаты |
| HB18-U07 | D | По независимым копиям: ordinary reserveFull=false/partial-reserve amount; partial amount0/30000/30001; PAID amount29999; OUTSIDE_TRACKED_CARD partial10000 | Invalid reserve/amount ветки NONE. Outside при actual B100000/A прежний, reason+fresh affirmation+ack: SUCCESS outstanding20000/R20000/F50000/B100000. Outside actual B90000 либо отсутствующий prior C: PAYMENT_CONFIRMATION_REQUIRED/NONE, не выдумывать card debit или source |

## U08–U14 — накопления, future unit/domain/presentation proof

| ID | GIVEN | WHEN | THEN / проверяемые суммы и ограничения |
|---|---|---|---|
| HB18-U08 | D | CREATE S2 «Цель B»5000 fundedNov через N | S2 ACTIVE5000,SNov15000,R30000,FNov35000,safe35000,daily1250; B100000 и C0/date прежние, SUCCESS, identity/origin и immutable state audit exact |
| HB18-U09 | D | AMEND S1 title «Резерв B» через N; отдельно AMEND amount15000 или fundingDec | Rename SUCCESS: amount10000/status ACTIVE/S10000/F40000 unchanged; old title A retained. amount/funding в AMEND INVALID_SAVING/NONE, не подменять INCREASE или FUNDING_TRANSFER |
| HB18-U10 | D | INCREASE S1 на5000 через N | S1=15000,SNov15000,FNov35000,safe35000,daily1250; B100000, no C; exact confirmedIncreaseAmount5000, releasedAmount null. Input означает increase5000, не target5000/15000 |
| HB18-U11 | D | PARTIAL_RELEASE S1 на4000 через N | S1 ACTIVE6000,SNov6000,R30000,FNov44000,safe44000,daily1571/r12; B100000,не104000; exact release4000/evidence, original amount10000 retained. SUCCESS |
| HB18-U12 | D | FULL_RELEASE amount10000 через N; затем INCREASE/AMEND RELEASED S1 | S1 RELEASED0,SNov0,R30000,FNov50000,safe50000,daily1785/r20; B100000/C0 date прежние. Terminal attempts NONE/TERMINAL_SAVING; no reopen или auto CREATE |
| HB18-U13 | D с O1=85000: R85000,S10000,FNov−15000,safe0 | Явно выбрать S1 → proposeSavingRelease; принять FULL_RELEASE10000 через N | Proposal suggested10000, no writes; commit S0,FNov−5000,deficit5000,safe/daily0, B100000,полный R85000. Proposal не обещает покрыть весь дефицит; без отдельного confirm S остаётся10000. NONE для amount0/10001, partial10000 и full9999 |
| HB18-U14 | D + O2 ordinary fundedDec50000: FNov40000/FDec−30000,safe10000,daily357/r4 | PARTIAL_RELEASE S1=4000 через N; отдельно запросить release proposal S1 для Dec deficit | После release FNov44000,FDec−30000,safe14000,daily500,R суммарно80000,S6000,B100000: safe не44000. Cross-period proposal INVALID_SAVING/NONE. Funding не переносится, future A20000 защищён один раз |

## H01–H07 — история, future unit + real PostgreSQL read proof

| ID | GIVEN | WHEN | THEN / proof |
|---|---|---|---|
| HB18-H01 | D; K11 O1 AMEND title B/total35000, N; K12 partial10000 с actual B90000,A{Nov70000,Dec20000} | Открыть detail/timeline при current K12, затем server-selected original revision K10 | K10 title A/total30000/outstanding30000/R30000/F40000; K11 title B/total35000/outstanding35000/F35000; K12 title B/outstanding25000/R25000/S10000/F35000. Payment10000 из original evidence, не15000/ΔB guess; B90000 current, old entries не получают live title |
| HB18-H02 | B100000,A{Oct40000,Nov60000}; O1=30000/S1=10000 origin/fundingOct, current FNov60000,FOct0 | Existing explicit CARRY Oct→Nov REUSE, затем читать before/after funding history | After A{Oct0,Nov100000},RNov30000,SNov10000,FNov60000,B100000/old C date сохранены; identities/originOct прежние. FUNDING_TRANSFER carries full before/after/decision/source-target; не AMEND/payment/release. Read-only timeline, safe60000 |
| HB18-H03 | D плюс owner-reviewed historical correction O1 title «Исправленный A», effectiveNov1, recorded K11; no amount/payment meaning change | Read server-validated H=Nov2 at K10 и K11; currentNov3 отдельно | K10 title A; K11 corrected title, original revision accessible as superseded; B100000/R30000/S10000/F40000 оба раза. Correction resolves before H; не выбрать newer effective date first. No new correction editor или report rewriting |
| HB18-H04 | D с повреждённым payment audit или S state evidence; отдельная ветка forged funding proof | Direct list/detail/history requests | HISTORICAL_PAYMENT_CONFLICT / HISTORICAL_SAVINGS_CONFLICT / существующий funding conflict, безопасный unavailable. Не показывать достоверные totals/timeline из invalid sources, не лечить выводом amounts из delta. B/facts остаются D, NONE, no driver/payload leakage |
| HB18-H05 | D с revision=K=100; у O1 51 подтверждённый event в разных batches/упорядоченных positions, последние изменения только title, amounts прежние; общий source size в limits | History page50 + next cursor; concurrent K101 rename после первой страницы | First page50, second1 на **исходном** pinned K100; B100000/R30000/S10000/F40000. Явный reload переключает весь view на K101. Tampered/cross-identity/cross-account cursor reject без данных; no duplicated/lost event, no mixed-K title |
| HB18-H06 | D; source cardinality/bytes/work/wire limit exceeded, либо missing creation identity/source suffix | Read management totals/history | Typed limit/evidence unavailable; не усекать inputs до «R30000/F40000 valid». Оригинальные B/A/R/S и DB bytes неизменны, NONE; Retry без writes. DTO pagination не заменяет full-source validation |
| HB18-H07 | Сохранённый Oct report v1 pinned на O1 unpaid30000/S10000 и unknown end B; позже подтверждён перенос O1/S1 в Nov с сохранением originOct, C100000/A{Nov100000}; ещё одним update PAID O1 actualB70000/A{Nov70000} | Открыть текущую identity history, затем pinned v1 | Current O1 PAID/R0,SNov10000,FNov60000/B70000; v1 O1 unpaid/reserve30000/S10000/endB null. v1 bytes/version неизменны; no inferred Oct expense из Nov payment/difference, no synthetic month-end C, no PDF row. Не заменять as-closed текущими title/status |

## P01–P07 — future real PostgreSQL integration

| ID | GIVEN | WHEN | THEN / proof |
|---|---|---|---|
| HB18-P01 | D, handoff PAID O1 и отдельный S1 partial release2000 | Единый HB-017 actual B70000,A{Nov50000,Dec20000}, payment30000+release2000, полный review/consents | SUCCESS ровно1 C/V/position/update/receipt,counters11; O1 PAID/R0,S8000,FNov42000,safe42000,daily1500,B70000. No auto debit до40000 и no release cash до72000; original history/audits retained |
| HB18-P02 | D, два клиента revision10; один выбирает AMEND O1 title B, другой INCREASE S1=5000 | Одновременные confirm после preview; отдельно concurrent management read | Ровно один winner: rename→R30000/S10000/F40000 либо increase→R30000/S15000/F35000; другой STALE_REVISION/NONE. Read видит coherent state revision10 или11, не смесь. Stale identity revision отдельно STALE_OBLIGATION/STALE_SAVING; no auto rebase |
| HB18-P03 | D, U11 partial release4000 command request q | Два concurrent exact submits; после commit повтор q; затем q с amount5000 | Один release, S6000/F44000/B100000,counters11; все exact replays original receipt до stale check. Different payload idempotency conflict/NONE, не новый release или silently new requestId |
| HB18-P04 | D, P01 aggregate | Inject lifecycle/audit INSERT failure; отдельно deferred COMMIT constraint failure; отдельно потеря COMMIT acknowledgement | Первые две ветки real rollback/NONE,D bytes/counters10. Unknown ветка: исходный q сохраняется; status/replay q доказывает либо P01 committed (R0/S8000/F42000/B70000) ровно один раз, либо отсутствие receipt пока не разрешает новый финансовый intent. Не объявлять unknown rollback |
| HB18-P05 | Alpha D; beta owned другим owner, title «Private B», B200000,R0,S0,F200000 | Direct list/detail/history/cursor/preview/confirm/status calls с beta ID либо spoofed owner/account; anonymous calls | Нет beta title/count/money/receipt. Безопасный отказ, alpha и beta bytes/counters unchanged; no financial repository access before auth where boundary requires it. Valid alpha retry даёт только D, не cache beta |
| HB18-P06 | H02 pre-transfer state; для FRESH_START отдельно B100000,A{Oct0,Nov100000},O1=30000/S1=10000 fundedOct | CARRY O1/S1 и AMEND/PARTIAL_SETTLEMENT/PAID/CANCELLED O1 либо AMEND/INCREASE/release S1 в том же update; также FRESH_START с указанной AOct0 и old-funded identity | SAME_IDENTITY_COMPOUND_NOT_SUPPORTED на preview и direct confirm, NONE. Нельзя скрыть moving identity payment/cancel/release. Отдельная disjoint ветка H02+O2 unpaid2000 fundedNov: actual B98000,A{Oct0,Nov98000}, CARRY O1/S1+PAID O2 → R30000/S10000/F58000,1 C/update, identities/origins exact |
| HB18-P07 | D; сохранённые report heads/v1 и исходные pending flags; preview N rename, затем server date/month меняется | Открыть history/filter/list; отдельно confirm перехода с устаревшим target; отдельно permitted backdated read | Reads оставляют все financial rows/pointers/reports неизменными. Stale transition TARGET_PERIOD_CHANGED/NONE, не auto target. Историческое чтение не заменяет active C/V; v1/pending не мутируют от read, current D B100000/R30000/S10000/F40000. Existing aggregate report-impact rules regression обязательна |

## C01–C07 — future component/Testing Library

| ID | GIVEN | WHEN | THEN / proof |
|---|---|---|---|
| HB18-C01 | D, provider пуст, obligations list | Выбрать O1 partial payment; перейти static `/update-budget`; back/forward; отдельно прямой/new-tab вход | Ровно один выбранный O1 edit, fresh owned seed/revision10; amount ввёл пользователь, никакого B90000 auto guess. Consents false, preview/confirm не вызваны. Direct/new-tab без handoff — generic form. Финансы D, no URL identity/amount/title |
| HB18-C02 | D, draft INCREASE S1=5000 уже введён | Выбрать PAID O1 из списка; «Вернуться к черновику», затем отдельная ветка явной замены | No silent merge/reset: первая сохраняет S increase5000; replacement предупреждает и очищает review/consents. До submit D, не S15000. Unchanged-B acknowledgment не переносится из старого draft |
| HB18-C03 | D, handoff O1 revision10; пока переходили, другой commit CANCELLED O1 | Resolve intent против fresh seed, затем manual action toggle | Stale/terminal message, текущий O1 CANCELLED/R0/S10000/F70000/B100000; old draft не превращается в платёж/новый O. Read-only details доступны, нет auto confirm. Смена данных invalidates preview |
| HB18-C04 | D; U11 draft amount4000, pending delayed preview | Исправить amount5000 до возврата response, затем получить старый response и storage/conflict error | Старый preview не активирует Confirm; amount5000 сохраняется, B/R/S/F DB как D. Новый preview ожидает S5000/F45000, но не save. Reload base очищает consents и требует нового review, no automatic rebase |
| HB18-C05 | D; submit U11 вернул COMMIT_OUTCOME_UNKNOWN | Navigate within provider, вернуться, нажать status/original retry; попробовать новый handoff | Исходные requestId/payload/amount4000 сохранены, новый intent blocked, нет automatic submit. После receipt ровно S6000/F44000/B100000. Новый URL без финансовых params, никаких storage writes |
| HB18-C06 | P01 сохранён, receipt получен; subsequent list/history reload failed | Render failure, Retry history, navigate назад в список | Success остаётся success, не предлагает заново оплатить. R0/S8000/F42000/B70000 из committed receipt; stale list подписан/обновляется, error не смешивает старое состояние с новым. Retry — read only |
| HB18-C07 | D, draft S increase5000 в provider | Обычная navigation/error и возврат; затем logout/session loss/смена scoped seed; отдельно reload/crash | В пределах того же scope/mount draft5000 удержан. Для нового scope приватный draft не виден и не отправляется; unauthorized actions fail closed. Reload/crash recovery не обещается, dirty warning есть; после fresh load D, no financial persistent storage. HB17-A03 neutral fallback не считается исправленным |

## B01–B07 — future real browser QA, не jsdom evidence

| ID | GIVEN | WHEN | THEN / evidence |
|---|---|---|---|
| HB18-B01 | D + O2 total5000/PAID/outstanding0/reservefalse и O3 total5000/CANCELLED/outstanding5000/reservefalse, identity scopes valid; totals D | Открыть оба раздела; status/month filters, details/history, Create; 320/375/1280px | UNPAID/PAID/CANCELLED и ACTIVE/RELEASED доступны, totals B100000/R30000/S10000/F40000. Possible текстом, dates/funding раздельны. No page horizontal overflow; controls>=44px. Открытие/фильтры ничего не сохраняют |
| HB18-B02 | U14 initial cross-period shortage, потом D с O1 outstanding20000/total30000/R20000/F50000 | Читать summary/detail и выбрать release4000 без confirm | В U14 main daily357, secondary1428 явно вторична; preview release main500. В reduced O1 отдельные labels total30000/outstanding20000/reserved20000/free50000. Partial reserve control отсутствует. Preview не меняет B/S/DB |
| HB18-B03 | D, длинный title200 Unicode code points, due null; no-account/empty-filter/empty-list/error fixtures отдельно | RU/DE/EN × light/dark/system на320/375/1280; изменить system preference и locale | Все status/error/history/action labels локализованы, cents10000=100 EUR без precision loss, unknown date не1970/0. Text/icons несут status, контраст/переносы/zoom200% проверены screenshot+geometry. Нет несуществующих bank0/F0 в no-observation |
| HB18-B04 | D, keyboard-only, затем screen reader | List→detail→history→payment editor→invalid amount→review→cancel navigation; reduced-motion | Семантические labels/heading/tab order, focus-visible/return/error, live async сообщения; подтверждение можно отменить, B/R/S/F=D. Нет focus за sticky/modal/mobile keyboard; проверить реальный accessibility tree и screen reader вручную, не заявлять jsdom как proof |
| HB18-B05 | D | Выполнить U04, затем на fresh state частично освободить S1 на4000 через единый flow | После partial pay B90000/R20000/S10000/F40000; после N release B90000/R20000/S6000/F44000, no second C для reuse. Один review/confirm на каждое явное действие, payment/source/affirmation/history сохранены; screenshots до/после и DB assertions |
| HB18-B06 | D, draft title «Синтетический счёт»/amount4000, unknown request в отдельной ветке | Проверить URL/history, browser storage/network/errors/log redaction; internal navigation/back и reload; foreign identity requests | Нет financial values/IDs в URL/hash/history.state/storage/cache/console/analytics. Request body для authorized action допустим, server logs не содержат payload. Memory navigation сохраняет draft, reload предупреждает без recovery promise; foreign response без данных. Original-key retry, no double release |
| HB18-B07 | D, observationNov2; отдельные часы Nov8/Nov9 и Berlin month boundary Nov30→Dec1 | Открыть list/history без save; сравнить dashboard и update summary; permission/storage error/retry | Nov3 age1 old label без reminder; Nov8 age6 без reminder; Nov9 age7 reminder. B100000/R30000/S10000/F40000 не меняются; daily по текущим inclusive days (Nov8:1739/r3, Nov9:1818/r4). Dec1 не переносит A/O/S/last-check автоматически; target устаревшего перехода reject. HB17-A03 остаётся accepted Medium |

## Передача исполнителю и ревьюеру

42 уникальных ID: U14 + H7 + P7 + C7 + B7. Каждый scenario сохраняет общие
SUCCESS/NONE invariants. Unit/component не доказывают SQL atomicity, jsdom не
доказывает responsive/a11y browser QA; browser screenshots не доказывают audit
integrity. В реализации фиксировать exact test names/commands/counts/results,
реальные environment limits и browser matrix. Сохранить HB-009–017 regression
evidence, не менять historical PASS или accepted A03 exception.

Будущие сценарии не включены автоматически в `tests/finance/coverage.json` и
checker source registry: coverage integration требует реального исполнения и
review при реализации. Сейчас только документальные проверки, без runtime tests.
