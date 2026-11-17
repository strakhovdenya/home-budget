import type { Page, Query, Selection } from '@/domain/analytics/contracts';
import { parseBasis, sameBasis } from '@/domain/analytics/validation';

export function matchesQuery(page: Page, query: Query): boolean {
  const echo = page.query;

  return page.view === query.view
    && echo.view === query.view
    && sameBasis(page.basis, query.basis)
    && sameBasis(echo.basis, query.basis)
    && echo.filters.from === query.filters.from
    && echo.filters.to === query.filters.to
    && echo.filters.origin === query.filters.origin
    && echo.filters.funding === query.filters.funding
    && echo.cursor?.binding === query.cursor?.binding
    && echo.cursor?.lastKey === query.cursor?.lastKey
    && echo.compare?.[0] === query.compare?.[0]
    && echo.compare?.[1] === query.compare?.[1];
}

export function matchesSelection(page: Page, selection: Selection): boolean {
  parseBasis(page.basis);
  if (selection.report !== null) {
    return page.basis.report !== null
      && page.basis.report.id === selection.report.id
      && page.basis.report.batchId === selection.report.batchId
      && page.basis.report.version === selection.report.version
      && (selection.report.digest === null
        || page.basis.report.digest === selection.report.digest);
  }

  return page.basis.report === null
    && (selection.dayH === null
      || page.basis.dayH === selection.dayH)
    && (selection.knowledgeAnchor === null
      || page.basis.stateAnchor === selection.knowledgeAnchor);
}
