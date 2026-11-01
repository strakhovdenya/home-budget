# Historical import: October 2026 (private follow-up)

User intends to seed an October 2026 history from prior Markdown budget files. **Do not commit those raw files to Git**, even while repo is private and may later become public.

## Approach
1. On user's local machine only, select historical Markdown file and review parsed checkpoint rows.
2. Import only known observation dates and bank balances as provenance-tagged checkpoints with complete user-confirmed month distributions summing to each balance. If historical allocation is unknown, ask the owner to confirm a proposed full vector before committing; no suspense or fabricated transaction/observation.
3. Create obligations from user-confirmed current unpaid list and as-of period creation, preserve already-paid/cancelled statuses.
4. Import known savings and historical close with provenance. If actual month-end balance is unknown, retain last historical observation/date, known allocation/earmark state, incomplete-data flag and unknown end balance; never fill a missing final-day checkpoint from a later balance.
5. Preserve noted unexplained discrepancy as reconciliation annotation, NOT as assumed income.
6. Verify totals against source manually; allow correcting imported historical rows with audit.
7. Preserve unpaid obligations and savings with full earmarks/identity. Propose cash transfer into the next month and require explicit one-button confirmation; retain existing target funds once and immutable October as-closed state. No automatic cash carryover.
8. Never include personal names, benefit documents, PDFs or bank identifiers in fixtures/screenshots.

The actual importer is **not yet implemented**; keep this as a future user-controlled local workflow with privacy review.
