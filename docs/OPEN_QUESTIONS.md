# Remaining implementation-level questions (not blockers for planning)

No need to restart the long product interview. Resolve these with concise ADRs and scenario tests before coding affected domain behavior:

1. **Net checkpoint difference vs exact income:** How to allocate an increase that includes a known larger deposit and hidden spending? Keep provisional net movement separate; never manufacture exact income from difference.
2. **Past-period expenditure after closing:** if user decides to charge current banking activity against old remaining budget, historical closure must remain as originally closed; presentation must distinguish later use of carryover from backdated correction.
3. **Backdated same-day observations:** ordering (observed_at optional) and stable tie-breaking for several checkpoints with same observation date; do not let earlier entry overwrite newer known bank fact.
4. **Unconfirmed paid but bank balance unchanged:** require confirmation; warn, do not assume money was debited.
5. **Budget available computation across source periods:** choose internal ledger vs event projections and prove no double counted rolled-over funds, negative advance allocations or obligations.
6. **Recurring templates:** clear separation 'next financial period proposal' and actual month of physical debit; no duplicates.
7. **User locale vs calendar boundary:** Europe/Berlin by default; clarify timezone change policy if ever multi-user.
8. **Permissions/provider choice:** finalize Auth.js version/identity handling and Neon pricing during implementation from current official docs.

Any new business decision must be recorded in docs/DECISIONS.md with tests before implementation.
