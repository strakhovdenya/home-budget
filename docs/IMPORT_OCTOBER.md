# Historical import: October 2026 (private follow-up)

User intends to seed an October 2026 history from prior Markdown budget files. **Do not commit those raw files to Git**, even while repo is private and may later become public.

## Approach
1. On user's local machine only, select historical Markdown file and review parsed checkpoint rows.
2. Import known observation dates and bank balance amounts as provenance-tagged checkpoint records, not artificial individual bank transactions.
3. Create obligations from user-confirmed current unpaid list and as-of period creation, preserve already-paid/cancelled statuses.
4. Import any known savings and month-end closed snapshot, with explicit status 'historical user-supplied' and confidence level.
5. Preserve noted unexplained discrepancy as reconciliation annotation, NOT as assumed income.
6. Verify totals against source manually; allow correcting imported historical rows with audit.
7. Ensure unresolved obligations carry forward, free cash carries forward, and October's 'as closed' view stays stable.
8. Never include personal names, benefit documents, PDFs or bank identifiers in fixtures/screenshots.

The actual importer is **not yet implemented**; keep this as a future user-controlled local workflow with privacy review.
