# HB-015 — execution evidence and paired protection scenarios

Synthetic fixtures only; BR-01/02/04/10/11, Accepted ADR0001–0003. This is an
implementation specification, not a passing test claim. Owner accepted HB-015 on
2026-11-03; owner-reported independent ChatGPT R1 review: APPROVED, open findings
Critical/High/Medium/Low 0/0/0/0. Execution evidence is recorded separately in
`docs/planning/hb-015-verification.md`. No bank/PDF/secret data enters the manifest
or diagnostic output. Scenario GIVEN/WHEN/THEN below are unchanged by acceptance.

## HB15-G01 — exact passed runtime identities from one fresh run

GIVEN a reviewed normative manifest, one current-run context and nonempty unit,
PostgreSQL and LA JSON reports, with required bank/allocation/history assertions.
WHEN the checker validates path + exact expanded fullName + passed status for every
required reference and compares the actual LA identities with the UTC subset.
THEN accept only complete, unambiguous execution. Missing/empty/invalid/stale reports,
failed/skipped/todo tests, incorrect suite/path/title, duplicate identities and
missing/extra TZ cases reject nonzero. No financial writes or printed snapshots.

## HB15-G02 — complete normative inventory and explicit future obligations

GIVEN normative definitions in headings, tables and lists, local namespaces/ranges,
reviewed implemented obligations, and explicitly owned future capability deferrals.
WHEN mapping is checked independently against the actual source definitions.
THEN missing/duplicate/nonexistent definitions, empty obligations/tests, invalid
dispositions and deferral of implemented guarantees reject. Historical narration
and incidental IDs do not create definitions. Type-only proofs remain typecheck,
never invented Vitest cases. Bank B/A/R/S/F and immutable report history unchanged.

## HB15-G03 — bounded safe CLI and repository contract

GIVEN the real manifest/source files and temporary evidence directory.
WHEN the CLI runs with absent or malformed evidence or an invalid source/path.
THEN return nonzero, with a fixed safe diagnostic. A valid current-run U/P/Z
execution can pass. Parser/report limits bound input; no credentials, financial
snapshots, SQL/driver errors or hidden financial writes. The manifest owns the
approved fourteen timezone files. Evidence lives outside Git.

For M01–M06: observation/effective date 2026-11-20, asOf/H 2026-11-28 in
Europe/Berlin, K=5, n=3 inclusive civil days. Each pair is two alternative complete
pure production inputs with the same checkpoint, full A vector and funding identity
coordinates. Increase R/S only as stated; input objects must remain unchanged.
No persisted update/payment, inferred income, carry, bank debit or report version.
All other periods/earmarks zero. Amounts are exact bigint EUR cents. Compare both
safeAvailable and safeDailyLimit for nonincrease and exact q/remainder below.

## HB15-M01 — current full unpaid reserve increases

GIVEN B10000,A Nov10000,R Nov1000,S0. WHEN R becomes1001 in the alternative input.
THEN safe9000→8999, q/r3000/0→2999/2; B/A/observation/funding identities retained.

## HB15-M02 — current retained savings increases

GIVEN B10000,A Nov10000,R0,S Nov1000. WHEN S becomes1001.
THEN safe9000→8999, q/r3000/0→2999/2; no automatic savings debit/release.

## HB15-M03 — other-period earmark reaches allocation overlap

GIVEN B10000,A Nov5000/Dec5000,R Dec4999,S0. WHEN R Dec becomes5000.
THEN safe5000→5000, q/r1666/2→1666/2; protect max(A,E), not A+E.

## HB15-M04 — other-period reserve exceeds its allocation

GIVEN B10000,A Nov5000/Dec5000,R Dec5000,S0. WHEN R Dec becomes5001.
THEN safe5000→4999, q/r1666/2→1666/1; entire unpaid requirement protected.

## HB15-M05 — other-period retained savings crosses the overlap

GIVEN B10000,A Nov5000/Dec5000,R Dec4000,S Dec1000. WHEN S Dec becomes1001.
THEN safe5000→4999, q/r1666/2→1666/1; both identities/funding retained once.

## HB15-M06 — signed int64 protection boundary

GIVEN B=A Nov=9223372036854775807,R Nov=B-1,S0. WHEN full R becomes B.
THEN safe1→0, q/r0/1→0/0; exact bigint, no floating coercion or overflow.

Normative IDs and executable labels are distinct. HB10 normative DB02 maps to
executable DB20; normative DB03 maps to executable DB21. Historical HB10 DB01's
three-migration/19-table expectation is retained as original evidence; the current
six-migration/20-table regression is explicitly annotated in the manifest.
