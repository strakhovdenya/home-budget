import { calendarDaysBetween, type BerlinDate } from '@/shared/pure/calendar';
import { periodOf, startOfMonth } from '@/domain/periods/period';
import type { CompleteSnapshot, Freshness, Notice } from './contracts';

export function freshness(s: CompleteSnapshot, asOf: BerlinDate, currentAllocated: bigint): Freshness {
  const ageDays = calendarDaysBetween(s.checkpoint.observedDate, asOf), notices: Notice[] = [];
  if (ageDays > 0) notices.push('EARLIER_OBSERVATION');
  if (ageDays >= 7) notices.push('REMINDER_DUE');
  const start = startOfMonth(periodOf(asOf));
  if (s.checkpoint.observedDate < start || s.allocationEffectiveDate < start) notices.push('MONTH_REVIEW_REQUIRED');
  if (currentAllocated === 0n) notices.push('CURRENT_UNFUNDED');
  return { basisDate: s.checkpoint.observedDate, ageDays, showReminder: ageDays >= 7, notices };
}
