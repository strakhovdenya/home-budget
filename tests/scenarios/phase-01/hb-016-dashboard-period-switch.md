# HB-016 - dashboard acceptance scenarios

Owner authorized implementation after independent plan review APPROVED on 2026-11-03. Implementation acceptance remains pending.
Synthetic fixtures only. Exact approved GIVEN/WHEN/THEN reproduced below; executed evidence belongs to docs/planning/hb-016-verification.md.

Синтетические EUR cents, Europe/Berlin; C=checkpoint, V=полная allocation revision, K=knowledge cut. Если не сказано иначе: observed/effective2026-11-20, asOf2026-11-28, n3, один owner/account, ACTIVE_COMPLETE, только названные A/R/S. Обычные R — full selected UNPAID. WHEN всегда **чтение/рендер/навигация**, не update. THEN во всех случаях: C/V/R/S/period funding, audit, account counters и любые original reports не меняются, никаких inferred income/expenses. Это спецификации, **не выполненные тесты**.

| ID | GIVEN → WHEN → THEN |
|---|---|
| HB16-A01 | Нет server session → прямой `/` или `/months?period=2026-12` → login; account lookup/projection не вызваны |
| HB16-A02 | Trusted owner, accounts0; либо только foreign accounts → load → NO_ACCOUNT, без INSERT и чужих refs/сумм |
| HB16-A03 | Один свой account, другой foreign; client пытается передать чужой selector/owner/H/K → load → ввод отклонён, а обычный load берёт только свой server selector и проходит ownership внутри HB-014 |
| HB16-A04 | Два своих account → load → ACCOUNT_SELECTION_REQUIRED, без произвольного выбора и без вызова projection |
| HB16-A05 | Lookup бросает private driver details; отдельно HB-014 возвращает STORAGE_ERROR/PROJECTION_LIMIT_EXCEEDED/integrity error → безопасные разные UI branches, никаких partial money/error stack |
| HB16-A06 | Ownership изменилось после lookup; отдельно UNAUTHORIZED/FORBIDDEN от boundary → отказ без утечки. В успешном lookup→projection полный DB baseline до/после равен, включая nonempty report fixtures |

| ID | GIVEN → WHEN → THEN |
|---|---|
| HB16-B01 | B10000,A Nov10000,R Dec20000 → current → bank100.00 поNov20; safeAvailable/daily0, ordinary3333 cents/day; R Dec не становится Nov expense. Coverage10000 показан один раз со всеми тремя meanings |
| HB16-B02 | B50000,A Nov40000/Dec10000,R Nov30000/S Nov5000,R Dec2000/S Dec1000 → current → F5000, full R30000/S5000 выбранного месяца; safe5000, daily1666/r2; будущий funded overlap не вычитается повторно |
| HB16-B03 | B8000,A Nov8000,R Nov9000,S Nov2000 → current → F-3000/deficit3000,R9000,S2000, main0/ordinary0, без capping и automatic release |
| HB16-B04 | NO_OBSERVATION с known R20000/S5000 → render → B/A/F/deficit/safe отсутствуют; отдельно известные earmarks с неизвестным покрытием, не bank0 |
| HB16-B05 | INCOMPLETE_STATE с missing ALLOCATIONS; отдельно NEGATIVE_BANK_OBSERVATION B-100 → render → в первом нет numeric forecast, во втором видны -1.00 и observedDate, нет A/F/credit/daily/deficit |
| HB16-B06 | Complete B=A=0,R=S=0 → render → реальные money0, CURRENT_UNFUNDED; отсутствующий virtual future period в COMPLETE также0, но помечен preview |
| HB16-B07 | Canonical cents0,1,-1,100,101,9007199254740993,MAX9223372036854775807 и MIN-9223372036854775808 → format RU/DE/EN → exact fractional digits/group/sign/currency; MAX EUR92233720368547758.07, MIN EUR-92233720368547758.08; неверная/oversize строка не становится0 |

| ID | GIVEN → WHEN → THEN |
|---|---|
| HB16-C01 | F-003: B123000,A Nov3000/Dec120000,R Dec90000 → Nov→Dec→Nov поURL → current safe1000/day; future F30000/preview967/r23 на31день, liquidity unavailable; current возвращается без прибавления Dec денег |
| HB16-C02 | После подтверждённого December transfer active Nov0/Dec75000,R Dec30000,bank Dec2; immutable Nov report fixture отдельно содержит прежние данные → выбратьNov → активные Nov A/R/S/F0, daily unavailable, пояснение о неисторическом срезе; Dec bank не назван Nov30 balance; report bytes прежние |
| HB16-C03 | Last Nov20 B10000,A Nov4000/Dec6000,R Nov2000 → новый server asOf Dec1 → default Dec, safe6000/daily193/r17, age11, review/reminder; Nov cash не переносится. НаJan5 без новых checks ни Dec31 observation, ни fresh start не создаются |
| HB16-C04 | Valid selected future period, deep link/reload/back/forward и смена RU→DE → тот же YYYY-MM/суммы; смена темы не меняет selection/forecast; «Текущий месяц» удаляет period |
| HB16-C05 | repeated/empty/malformed/out-of-range period; boundary0001-01/9999-12; годы0001/0099 и Feb2026/2028 → invalid не читает finance; стрелки bounded; month/date labels без1900 offset; future divisor28/29 из DTO |
| HB16-C06 | Navigation на новый period, ответы задержаны/ошибка, отдельно concurrent financial commit → ни старые деньги под новым заголовком, ни смешанный K; один projection read на render; повторное чтение показывает coherent новый state, errors не показывают прежний success как свежий |

| ID | GIVEN → WHEN → THEN |
|---|---|
| HB16-D01 | ObservedNov20, asOfNov20/21/26/27/28 → age0/1/6/7/8 → older label iff>0, reminder iff>=7; все валидные limits/date видимы. Transfer-only с новой allocation date не освежает bank date |
| HB16-D02 | Spring observedMar22, asOfMar28/29/30; autumn observedOct18, asOfOct24/25/26 2026 → ages6/7/8 через DST; UTC/LA host TZ не меняют reminder; server Berlin month boundary определяет period |
| HB16-D03 | B10000,A Nov10000,R Nov12000,S Nov2000 → warnings O2000,E/P4000 → две суммы20.00/40.00 с полными meanings и «не складываются», без total60.00; budget gap не третий shortage |
| HB16-D04 | Complete stale/deficit и noncurrent views RU/DE/EN × light/dark/system → локализованы все labels/reasons/date/money; preferences сохраняются, ICU/catalog и SSR hydration без errors; D36 визуально главный только current |
| HB16-D05 | Keyboard-only → skip, links, selects, выбор месяца, возврат к current и Drawer Escape/focus → предсказуемый focus, accessible names, polite update; warnings не требуют согласия и не блокируют |
| HB16-D06 | 320/375/768/1280px, длинные DE labels и MAX/MIN amounts, zoom200% и reflow400% → нет horizontal page overflow/скрытого minus/обрезанных сумм, порядок чтения и 44px targets сохранены; reduced-motion и контраст обеих тем |
| HB16-D07 | Перезагрузка, повторный вход, GET/prefetch/navigation/retry всех состояний → нет acknowledgment/новых financial rows или audit reads; отсутствуют update/pay/release/carry/close controls и demo money; logout/direct return не отдаёт защищённые данные без server auth |

## Executable mapping and QA boundary

P = `tests/dashboard-presentation.test.ts`, B = `tests/dashboard-boundary.test.ts`,
UI = `tests/dashboard.test.tsx`, AUTH = `tests/auth-boundaries.test.ts`,
PG-A = `tests/integration/auth.test.ts`, PG-P = `tests/integration/budget-projection.test.ts`.
Test names contain the HB16 IDs below; existing foundation assertions keep their original names.
Browser evidence is separate in the verification report; jsdom does not prove real geometry or browser history.

| Scenario | Assertions / execution surface |
|---|---|
| A01 | B no-session before discovery; AUTH actual explicit-period page redirect; browser direct unauthenticated request |
| A02 | B no-account state; PG-A foreign-only rows excluded; AUTH actual empty dashboard |
| A03 | B rejects owner/account/H/K injection, one trusted selector; PG-A real owner predicate; retained HB14 auth tests |
| A04 | B ambiguous selection refusal; PG-A bounded two-row lookup with three own accounts |
| A05 | B private lookup error; UI all safe error branches; retained HB14 resource/integrity/storage failures |
| A06 | B unauthorized/forbidden outcomes; PG-P real SQL ownership at discovery, authorization and repository; nonempty report/baseline proof |
| B01 | P exact owner oracle; UI safe versus ordinary and equal-amount group with all meanings |
| B02 | P funded-overlap exact safe values; retained domain HB14 numeric019 |
| B03 | P full deficit/full R/S; UI signed negative free and separate budget deficit |
| B04 | UI real projected no-observation fixture with separately labelled known full earmarks |
| B05 | UI real incomplete and unsupported-negative projections; bank fact only in negative branch |
| B06 | UI real confirmed zero; P virtual target; retained HB14 virtual zero/source completeness |
| B07 | P exact localized strings at cents, above-safe-integer and signed-int64 boundaries; UI locale formatting; browser MAX geometry where recorded |
| C01 | P F-003 preview967/r23; UI future forecast scope; browser real Next period link |
| C02 | P post-transition active Nov0 at Dec observation; UI historical caveat; PG-P retained nonempty original report bytes |
| C03 | P Dec1 and Jan5 without mutation; retained HB14/HBL rollover facts |
| C04 | UI validated href and year/month submission; browser Next link, reload/Back, locales and persisted theme |
| C05 | P invalid/repeated query, early years, leap/nonleap preview; UI lower/upper calendar boundary controls |
| C06 | B one delayed whole read and fresh request failure; UI loading without counterfeit money; retained real HB14-059 concurrency |
| D01 | UI age0/1/6/7/8 with visible estimates; retained HB14-041 transfer-only freshness |
| D02 | UI real spring/autumn projected civil age; P/retained domain calendar tests; recorded UTC/LA executions |
| D03 | UI O2000/E4000/P4000 groups and no summed6000; retained HB14 grouping proof |
| D04 | UI all locales and theme modes plus hydration; existing shell preferences; browser real locale actions and light/dark/system |
| D05 | UI accessible controls; retained HBU-005 keyboard/Drawer; browser skip link and Drawer Escape/focus |
| D06 | UI semantic dd/no truncated money; exact formatter; recorded real browser viewport/reflow/theme QA. Native zoom/screen-reader limits remain explicit |
| D07 | B no cross-request cache; UI no write/ack controls; PG-P full no-write baseline; browser logout then direct protected period refusal |

All financial fixture creation is test setup through existing accepted writers. The
dashboard itself exposes no financial write endpoint, provisioning or update controls.
The approved scenario assertions above are not a declaration that every manual QA
subcase passed; actual commands, counts and unavailable aspects belong to verification.
