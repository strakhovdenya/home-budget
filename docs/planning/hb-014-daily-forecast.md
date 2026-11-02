# HB-014 — daily forecast and private budget projection contract

**Status: Done.** Owner acceptance confirmed: 2026-11-02.
Independent source review completed: APPROVED; open findings Critical/High/Medium/Low: 0/0/0/0.
The independent reviewer inspected source and tests without running PostgreSQL/Vitest;
executed test evidence belongs to Codex and is recorded separately in verification.
Implementation was authorized after independent plan review APPROVED WITH CONDITIONS. Authority:
BR-01..08/10/11, Accepted ADR0001–0003, D32–D39. No formula is reopened.

## Scope and acceptance gates

One read-only task: complete account/period A/R/S/E/F/deficit, current and future
ordinary guidance, D36 safe main, grouped shortage warnings, D37–39 freshness,
scoped coherent PostgreSQL history assembly and private server composition.
Five gates: exact arithmetic; coherent complete H/K; ownership/no writes; bounded
runtime and wire output; executed scenario/regression evidence. Tests accompany
implementation; HB-015 later consolidates CI. No HB-016–018 UI is introduced.

No financial commands, operation ledger, inferred activity statistics, PDF,
closing/version creation, recurrence, overdraft budgeting, multi-source CARRY,
historical overspend, PWA or scheduler. Existing migrations0000–0005, dependencies,
import allowlists, auth configuration and protected environment remain unchanged.

## Inventory and layers

HB-008 money/calendar/period constructors and checked helpers are reused.
HB-010 correctionTips/indexHistory/selectState/validateHistoricalStates select
chronological C/V. HB-011/012 full lifecycle selectors and retained audit evidence
select obligations/savings. HB-013 FUNDING_TRANSFER/decision evidence is validated
by existing loaders. No deltas are posted again.

domain/forecast owns typed snapshots, assembly checks, validation, budget,
liquidity, freshness, warnings and explicit serialization. features/budget-projection
normalizes input before async authorization and invokes an injected domain port.
infrastructure/db/projection-reader owns SQL assembly. app/budget-projection-boundary
composes requireOwnedAccount and the lazy repository with server-only. No route,
Server Action, client component, cache or new import direction.

## Selection and the three review conditions

One PostgreSQL REPEATABLE READ READ ONLY transaction rechecks owner/account, captures
recordedSeq K, aggregateRevision and activeAllocationRevisionId from one account row,
then captures one server UTC microsecond instant and derives one Berlin today.
No Date.now in financial formulas. Snapshot isolation starts with account selection;
concurrent commits cannot alter later stream queries. A 10s local statement timeout
bounds individual SQL work; no account write lock or financial commit manager.

Production read accepts only targetPeriod (or null for account). H/K/owner/actor
are not query inputs. Internal readAt is a trusted repository/test capability:
0<=K<=capturedSeq and H<=captured server today. Historical H uses effective facts
through H, resolving corrections at K first. Future target changes only the budget
period/divisor, never H or bank observation. capturedAggregateRevision describes
the capture, not an invented revision-at-old-K.

Identities are independently enumerated from obligations/savings_goals by committed
creation sequence<=K, not inferred from event INNER JOIN. Every visible identity
requires its creation history and consistent origin; every event requires an
enumerated identity and valid period mapping. Full chains are validated at K even
when creation is after H. Such a later identity is absent at H legitimately.
Missing mandatory history/evidence is a typed error, never incomplete/empty R/S.
Completeness validation ignores event revisions after K, matching existing selectors.

Current pointer guard compares selected V with captured activeAllocationRevisionId
only at full captured K and when H includes all financial positions. Historical H
and old K may select another V. A provable current mismatch refuses.

Checkpoint history is loaded once. Optional HistoryReadContext bulk-loads scoped
audits/decisions and indexes audits by entity/batch, eliminating projection funding
N+1 queries and repeated checkpoint loading. Existing writer/default-reader paths
remain compatible. General obligation projection additionally validates every
OBLIGATION_STATE audit, beyond the existing payment-specific reader validation.

## Resource contract

Before materialization, scoped SQL COUNT and SUM(octet_length(to_jsonb(row)::text))
cover checkpoints, vectors, positions, orderings, identities, lifecycle events,
audits, transition decisions, allocation children at K and scoped period rows.
This includes embedded ordering/funding/audit JSON, before-state and text payloads.
Limits are technical admission limits, not financial policy:

| Limit | Inclusive maximum |
|---|---:|
| Total materialized source rows | 20000 |
| SQL textual JSON source bytes | 8388608 |
| Selected obligation+saving identities | 1000 |
| Scoped period rows / projected union including virtual current | 1200 |
| Legacy chronological validation work rows squared | 4000000 |
| Final wire JSON UTF-8 bytes | 1048576 |

Work rows are checkpoint/vector/position/ordering/obligation-event/saving-event
rows, capped at2000 to bound existing suffix/index scans. Thus the row ceiling is
not a promise every possible20000-row history is admitted. Big JSON refuses before
transport/materialization. Descriptor-only domain copying also limits nodes100000,
depth32, own keys20001 and cumulative text8MiB; title length is bounded before
Unicode point validation. Boundaries are tested at limit/limit+1. No silent
pagination/truncation: oversize returns PROJECTION_LIMIT_EXCEEDED.

## Financial calculations

B>=0, every A>=0, sum A=B. Exactly one selected state per identity, using funding
of that revision. R is full selected UNPAID outstanding; possible claims require
reserveFull; PAID/CANCELLED0. S is ACTIVE retained amount; RELEASED0. Origin does
not direct funding. R/S never capped or released automatically. E=R+S,F=A-E,
deficit=max(0,-F). Negative F is valid. Allocations/details/checkpoint differences
are not income/expense statistics.

Current days include today; future preview uses all days in its month; past daily
is HISTORICAL_PERIOD. Ordinary q/r divide max(0,F). D36 protects current E and
max(A,E) for every other period, including past and earmark-only periods:
T=E[current]+sum(other max(A,E));L=B-T;safe=max(0,L);main q/r divide safe.
Other A+E is forbidden double protection. All sums/intermediates use checked int64;
MONEY_RANGE occurs before clamp. No partial monetary response on failure.

Shortages are budget deficit, max(0,totalR-B), max(0,totalR+totalS-B),
max(0,T-B), plus gap=max(0,Fcurrent)-safe. These overlap. Positive equal coverage
amounts group once with all meanings; groups sort by amount, codes by obligations,
earmarks, protection, budget gap. Gap is explanatory, not an extra coverage group.

Civil age=calendarDaysBetween(real observedDate,H). Age>0 earlier notice; >=7
reminder; estimate stays visible. observation OR allocation date before current
month adds MONTH_REVIEW_REQUIRED; Acurrent0 adds CURRENT_UNFUNDED. No acknowledgment,
background reminder, automatic transition, checkpoint or read audit.

## DTO / unavailable / errors

Exact readonly types are in contracts.ts. ACCOUNT_ESTIMATE has schemaVersion1,
EUR/account/date/currentPeriod/COMPLETE, bank actual revision/date/nullable instant,
selectionVersion/K/captured revision/ordering/vector/anchor/effective provenance,
selected obligation/saving sources, period budgets, aggregate totals, SAFE_ESTIMATE
and freshness. Period budgets retain A/R/S/E/signed F/deficit, daily branch and
exact funded source refs. Period union is sorted allocation/funding periods plus
virtual current; origin-only periods receive no money. Virtual requested zero
period is allowed only in COMPLETE state and creates no DB row.

NO_OBSERVATION returns known complete earmarks separately, no B/A/F/daily/safe.
Explicit INCOMPLETE_STATE is a pure-input branch with missing component codes; the
production loader never uses it to hide corrupt mandatory storage. Negative real
observation is a pure-domain unsupported-overdraft branch with no allocation fields;
ordinary PG continues to prohibit B<0. Wrong branch/sign/fields are errors. Historical
ordinary and noncurrent liquidity unavailable are distinct. Scope, anchors, sums,
duplicates, lifecycle, dates, ordering and evidence contradictions are typed errors.

Wire encoder explicitly converts every money field with serializeCents; sequences
are nonnegative decimal integer strings. It uses no generic replacer. Exact UTF-8
size is checked after encoding, then output is deeply frozen. Unknown financial
fields are not accepted in snapshot/query. Error responses contain codes only.

Private exports: readAccountProjection, readPeriodProjection, readCurrentLiquidity.
Liquidity export returns SAFE_ESTIMATE plus account's bank/provenance/freshness/date;
unavailable/errors preserve their separate branches. No foreign refs or driver
messages are returned. No mutation/audit/receipt/request/counter on reads.

## Exact oracles and review evidence

Nov28,n3: B10000,Acur10000,RDec20000 -> T20000,L-10000,safe0,main0,
ordinary3333/r1,obligation/earmark/protection shortage10000. Funded overlap
B50000,A40000/10000,E35000/3000 ->T45000,safe5000,main1666/r2.
F-003 B123000,A3000/120000,RDec90000 ->current safe3000/main1000,
December free30000,preview967/r23. F-006 B15000/R20000 ->F-5000/main0.
F-008 B40000/R20000/S5000->3000 ->safe15000->17000 without bank change.
HBL-028 Nov20 B10000,A4000/6000,RNov2000 ->Dec1 T4000,safe6000,
main193/r17,age11; no auto-carry. HB13 REDISTRIBUTE B89000,Acur88000/future1000,
old R30000/S5000 ->current F88000,T36000,safe53000.

Executable traceability and actual commands are separate in the scenario and
verification documents. Self-review is not independent source review or owner
acceptance. No commit/push/PR/merge is authorized by this implementation contract.
