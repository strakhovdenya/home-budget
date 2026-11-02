# HB-014 acceptance and executable traceability

Synthetic integer EUR cents only. Authority: BR-01..08/10/11, Accepted ADR0001–0003,
owner implementation authorization after independent plan review. This file maps
tests; executed outcomes belong to docs/planning/hb-014-verification.md.

U=tests/forecast.test.ts; B=tests/forecast-boundary.test.ts;
O=tests/forecast-oracles.test.ts; PG=tests/integration/budget-projection.test.ts.
Each listed test title carries the ID shown (parameterized numeric rows use their
003-style ID). Type proof: tests/forecast-types.ts. Groups are independently
reviewable, each with at most seven case rows.

GIVEN defaults: observed/effective Nov20,asOfNov28 2026,n3,C0/V0,K5; one complete
A and one selected full state per identity. U exact numeric table specifies
B/A/R/S,F/T/L,ordinary and safe q/r. Date/branch cases explicitly replace defaults.
WHEN projectAccount/projectPeriod or production repository read executes,
THEN exact asserted state/ref/quotient/remainder and immutable input are retained.
Every PG read after setup compares full18 scoped tables plus account rows;
report fixtures compare nonempty closing/head bytes too. No counts-only proof.

| HB14 | GIVEN / WHEN / THEN assertion area | Real tests |
|---|---|---|
| 001 | B3000, current n3 ->F/safe3000,q1000/r0 | U numeric001 |
| 002 | Nov29,n2 ->1500/r0 | U inclusive002 |
| 003 | Nov30,B3001,n1 ->3001/r0 | U inclusive003 |
| 004 | Jan31 preview Feb2026/2028 ->35/r21 or34/r15 | U February004/005 |
| 005 | Future month uses all days, not current remaining | U February; U051 |
| 006 | B123000,A3000/120000,RDec90000 ->current1000 | U006; U051 |
| 007 | B8000,R9000,S2000 ->F-3000,full amounts,daily0 | U numeric007 |

| HB14 | GIVEN / WHEN / THEN assertion area | Real tests |
|---|---|---|
| 008 | Savings deducted once | U numeric008; PG retained savings |
| 009 | Full unpaid reserve | U numeric009; PG owner oracle |
| 010 | Unelected possible contributes0 | U numeric010; PG possible=false |
| 011 | Elected possible contributes full20000 | U numeric011; PG possible=true |
| 012 | Paid/cancelled R0 | U numeric012 variants; PG partial then paid |
| 013 | Partial leaves full outstanding20000,bank30000 | U013; PG partial then paid |
| 014 | Released saving S0 | U numeric014 |

| HB14 | GIVEN / WHEN / THEN assertion area | Real tests |
|---|---|---|
| 015 | CARRY full funding/source refs,old observed date | U015/041; PG genuine HB13 CARRY |
| 016 | FRESH_START full earmarks and no historical debt | U016/055; PG genuine HB13 FRESH_START |
| 017 | REDISTRIBUTE preserves old funding,T36000,safe53000 | U numeric017; PG genuine HB13 REDISTRIBUTE |
| 018 | Owner D36 oracle,T20000,safe0 | U018; PG018 |
| 019 | Funded overlap uses max,T45000 | U019 |
| 020 | Future A5000/R10000 ->safe10000 | U numeric020 |
| 021 | Two future months ->T45000,shortage15000 | U numeric021 |

| HB14 | GIVEN / WHEN / THEN assertion area | Real tests |
|---|---|---|
| 022 | Only protection shortage3000,not physical obligation shortage | U numeric022 |
| 023 | Savings-only E/P shortage5000,O0 | U numeric023 |
| 024 | Equal shortages one amount,all meanings | U024/025 |
| 025 | O2000,E/P4000: two nonadditive groups | U numeric025; U024/025 |
| 026 | Ordinary1666/r2 but safe0,all physical shortages0 | U numeric026 |
| 027 | One cent survives floor and later n1 | U inclusive027 |
| 028 | Missing C does not become B0;known earmarks separate | U028/029; PG028/047 |

| HB14 | GIVEN / WHEN / THEN assertion area | Real tests |
|---|---|---|
| 029 | Explicit partial branch unavailable;missing mandatory list errors | U028/029 |
| 030 | Real negative observation,no A ->overdraft unavailable | U030/031/046 |
| 031 | Wrong negative-branch sign/fields ->typed error | U030/031/046 |
| 032 | Duplicate period/obligation/saving ->error | U typed032 variants |
| 033 | Anchor mismatch ->error | U typed033 |
| 034 | Complete sum mismatch ->error | U typed034 |
| 035 | Negative A matching sum still refuses | U typed035 |

| HB14 | GIVEN / WHEN / THEN assertion area | Real tests |
|---|---|---|
| 036 | E/H/T overflow and invalid MIN earmark | U typed036 variants |
| 037 | Civil ages0/1/6/7/8,visible dated estimates | U037/042; O HBL019..024 |
| 038 | Spring DST ages6/7/8,divisors4/3/2 | U038 |
| 039 | Autumn DST ages6/7/8,divisors8/7/6 | U039 |
| 040 | Dec31->Jan1,old cash remains protected | U040/054 |
| 041 | Transfer-only retains bank date/revision | U015/041; PG CARRY |
| 042 | Equal actual check refreshes provenance | U037/042; O HBL024; retained HB10-H02 |

| HB14 | GIVEN / WHEN / THEN assertion area | Real tests |
|---|---|---|
| 043 | Saving correction old/newK;oldH/oldK vs current pointer | B043 correction/pointer; PG043/056 |
| 044 | Repeated sameH/K equal;source/SQL rows unchanged | U044/046; PG018/044 |
| 045 | Unauthorized/foreign/unknown deny without refs | B045/063; PG045 |
| 046 | Historical ordinary/future liquidity unavailable;overdraft priority | U044/046; U030/031/046 |
| 047 | Genuine0 differs from missing;CURRENT_UNFUNDED | U047/048; PG028/047 |
| 048 | Malformed dates/period/money,future observation/effective date | U typed048; U047/048 |
| 049 | Bad reserve/lifecycle/scope;no inferred repairs | U typed049 variants |

| HB14 | GIVEN / WHEN / THEN assertion area | Real tests |
|---|---|---|
| 050 | HBL012 explicit cancellation/release,safe4000->8000->9000 | U050 |
| 051 | F003 current1000;future967/r23 | U051 |
| 052 | F006 bank15000,R20000 ->F-5000 | U numeric052; PG retained earmarks variant |
| 053 | F008 release2000,S5000->3000,bank unchanged | U numeric053 variants; PG partial/paid/release |
| 054 | HBL028 month change;F009 immutable report | U040/054; PG054 report |
| 055 | HBA015 old deficit not charged,Jan111/r3 | U016/055 |
| 056 | Correction reposition resolved before H,oldK survives | B056; PG043/056 |

| HB14 | GIVEN / WHEN / THEN assertion area | Real tests |
|---|---|---|
| 057 | Microsecond offsets/Berlin UTC month boundary | O057; retained HB10 same-day tests |
| 058 | Full27000 finite states;separate divisor/split/permutation sweeps | U058 two tests |
| 059 | Real SQL paused after capture,concurrent commit;old then new snapshot | PG059 |
| 060 | Source/wire/work limits;missing/duplicate evidence;UTF8 | B060; U060/063; PG060 variants |
| 061 | Genuine HB13 CARRY/FRESH_START/DEFER/REDISTRIBUTE and F earmarks | PG061 parameterized + preserved F fixture |
| 062 | Due metadata/expected/detail isolation,exact normative examples | U062; O062 table |
| 063 | Canonical codec,frozen async request/deep output,safe errors | U060/063; B045/063; type proof |

Additional review conditions: B identity-completeness plus PG orphan identity;
B current-pointer and PG current-pointer mismatch; B trusted-query rejection of
H/K/date/owner; PG identity creation after H; exact UTF8 source preflight and final
DTO size; explicit Gregorian month/year/DST inputs. Production clock is captured
once, not replaced for tests. PG dates use actual Berlin server day and civil
shifts, with transitionCalendar refreshed per fixture.

## Normative mapping (all IDs)

| Reference | HB14 / executable variants |
|---|---|
| HB3-001..009 | 001,002,003,006/051,009,008,007,001 floor/027,027 |
| HB3-010..013 | 035/O-C04,025,037,028 |
| HB3-014..018 | O exact014/015/016/017,016/055 |
| HB3-019..022 | 013/012,050,053,042 |
| HB3-023..027 | 038/057,039/057,004 leap,004 nonleap,047 |
| HB3-028..035 | 046/054,PG-DEFER, O030,029/033/034,030..036/048,PG-FRESH_START plus retained HB13 policy refusal, O034,037 |
| HB3-C01..C08 | 018,019,025,O-C04,020,past-allocation017/054,028/029/037,035/046 |
| HBA-001..006 | 035,052 same full-reserve deficit, O003,062, O005, O006 |
| HBA-007..010 | O007, O008, O009+PG immutable report,016 |
| HBA-011..016 | 018,035+034(no clipping), O013,030/031,055,010/011/049 |
| HBL-001..007 | 018,019,020,021,026,past017/054,022 |
| HBL-008..012 | 010/011,O009,023,O011+PG partial/paid,050 |
| HBL-013..018 | 037/020,028..031/046,027,062,062,O018 alternative branches+PG transitions |
| HBL-019..024 | O exact019/020/021/022,024/025, O024 |
| HBL-025..028 | 038,039,028/029/047,054 |
| F-003/F-006/F-008/F-009 | 051/052/053/015+041+054+061 |

Write-side refusal/idempotency/concurrency/report-version assertions in these
references remain the executed HB-010–013 regressions, not new features claimed by
forecast. Negative actual bank is domain-only; SQL still prohibits it. No constraints
or future-date validation are disabled for fixtures. Reports are prepared only by
synthetic test setup; production forecast never writes a closing or pending flag.
