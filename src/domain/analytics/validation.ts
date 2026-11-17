import { exactKeys } from '@/domain/checkpoints/validation';
import { requestCopy, sequence } from '@/domain/history/validation';
import { parsePeriod } from '@/domain/periods/period';
import { validUuid } from '@/domain/updates/validation';
import { parseBerlinDate } from '@/shared/pure/calendar';
import { berlinDateOfInstant, parseInstant } from '@/shared/pure/instant';
import type { Basis, ChoicesQuery, OpenQuery, Query } from './contracts';

function rejectInvalidInput(): never {
  throw new Error('INVALID_INPUT');
}

function isNullableId(value: unknown): boolean {
  return value === null || validUuid(value);
}

function isCalendarDate(value: unknown): value is string {
  return parseBerlinDate(value).ok;
}

function isReportSelection(value: unknown, allowUnpinned = false): boolean {
  if (value === null) {
    return true;
  }

  if (!exactKeys(value, ['id', 'batchId', 'version', 'digest'])) {
    return false;
  }

  return validUuid(value.id)
    && validUuid(value.batchId)
    && Number.isSafeInteger(value.version)
    && Number(value.version) > 0
    && (
      (allowUnpinned && value.digest === null)
      || (typeof value.digest === 'string' && /^[0-9a-f]{64}$/.test(value.digest))
    );
}

export function parseBasis(input: unknown): Basis {
  if (
    !exactKeys(
      input,
      [
        'schemaVersion',
        'accountId',
        'indexAnchor',
        'indexCut',
        'stateAnchor',
        'stateCut',
        'dayH',
        'today',
        'capturedAt',
        'report'
      ])
    || input.schemaVersion !== 1
    || !validUuid(input.accountId)
    || !isNullableId(input.indexAnchor)
    || !isNullableId(input.stateAnchor)
    || !sequence(input.indexCut)
    || !sequence(input.stateCut)
    || BigInt(input.stateCut) > BigInt(input.indexCut)
    || !isCalendarDate(input.dayH)
    || !isCalendarDate(input.today)
    || input.dayH > input.today
    || !isReportSelection(input.report)
  ) {
    rejectInvalidInput();
  }

  const instant = parseInstant(input.capturedAt);
  if (
    !instant.ok
    || instant.value !== input.capturedAt
  ) {
    rejectInvalidInput();
  }

  const today = berlinDateOfInstant(instant.value);
  if (
    !today.ok
    || today.value !== input.today
    || (input.indexCut === '0') !== (input.indexAnchor === null)
    || (input.stateCut === '0') !== (input.stateAnchor === null)
  ) {
    rejectInvalidInput();
  }

  return input as Basis;
}

export function parseOpen(raw: unknown): OpenQuery {
  const input = requestCopy(raw);
  if (
    !exactKeys(input, ['schemaVersion', 'selection'])
    || input.schemaVersion !== 1
    || !exactKeys(input.selection, ['dayH', 'knowledgeAnchor', 'report'])
  ) {
    rejectInvalidInput();
  }

  const selection = input.selection;
  if (
    selection.dayH !== null
    && !isCalendarDate(selection.dayH)
    || !isNullableId(selection.knowledgeAnchor)
    || !isReportSelection(selection.report, true)
  ) {
    rejectInvalidInput();
  }

  if (
    selection.report !== null
    && (selection.knowledgeAnchor !== null
      || selection.dayH !== null)
  ) {
    rejectInvalidInput();
  }

  return input as OpenQuery;
}

export function parseQuery(raw: unknown): Query {
  const input = requestCopy(raw);
  if (
    !exactKeys(input, ['schemaVersion', 'basis', 'view', 'filters', 'cursor', 'compare'])
    || input.schemaVersion !== 1
    || !['CHECKPOINTS', 'MONTHS', 'FUNDING'].includes(String(input.view))
  ) {
    rejectInvalidInput();
  }

  parseBasis(input.basis);
  if (!exactKeys(input.filters, ['from', 'to', 'origin', 'funding'])) {
    rejectInvalidInput();
  }

  const filters = input.filters;
  if (
    !isCalendarDate(filters.from)
    || !isCalendarDate(filters.to)
    || filters.from > filters.to
    || filters.origin !== null
    && !parsePeriod(filters.origin).ok
    || filters.funding !== null
    && !parsePeriod(filters.funding).ok
  ) {
    rejectInvalidInput();
  }

  const monthNumber = (value: string) => Number(value.slice(0, 4)) * 12 + Number(value.slice(5, 7));
  if (monthNumber(filters.to) - monthNumber(filters.from) >= 12) {
    rejectInvalidInput();
  }

  if (
    input.cursor !== null
    && (!exactKeys(input.cursor, ['binding', 'lastKey'])
      || typeof input.cursor.binding !== 'string'
      || !/^[0-9a-f]{64}$/.test(input.cursor.binding)
      || typeof input.cursor.lastKey !== 'string'
      || input.cursor.lastKey.length > 100)
  ) {
    rejectInvalidInput();
  }

  if (
    input.compare !== null
    && (!Array.isArray(input.compare)
      || input.compare.length !== 2
      || !input.compare.every(validUuid)
      || input.compare[0].toLowerCase() === input.compare[1].toLowerCase())
  ) {
    rejectInvalidInput();
  }

  if (
    (input.basis as Basis).report !== null
    && input.compare !== null
  ) {
    rejectInvalidInput();
  }

  return input as Query;
}

export function sameBasis(left: Basis, right: Basis): boolean {
  const hasSameCapture = left.schemaVersion === right.schemaVersion
    && left.accountId === right.accountId
    && left.indexAnchor === right.indexAnchor
    && left.indexCut === right.indexCut
    && left.stateAnchor === right.stateAnchor
    && left.stateCut === right.stateCut
    && left.dayH === right.dayH
    && left.today === right.today
    && left.capturedAt === right.capturedAt;

  if (!hasSameCapture) {
    return false;
  }

  if (left.report === null) {
    return right.report === null;
  }

  return right.report !== null
    && left.report.id === right.report.id
    && left.report.batchId === right.report.batchId
    && left.report.version === right.report.version
    && left.report.digest === right.report.digest;
}

export function parseChoices(raw: unknown): ChoicesQuery {
  const input = requestCopy(raw);
  if (
    !exactKeys(input, ['schemaVersion', 'basis', 'beforeSeq'])
    || input.schemaVersion !== 1
  ) {
    rejectInvalidInput();
  }

  const basis = parseBasis(input.basis);
  if (
    input.beforeSeq !== null
    && (!sequence(input.beforeSeq)
      || input.beforeSeq === '0'
      || BigInt(input.beforeSeq) > BigInt(basis.indexCut))
  ) {
    rejectInvalidInput();
  }

  return input as ChoicesQuery;
}
