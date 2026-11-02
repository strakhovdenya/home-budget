import { parseBerlinDate, type BerlinDate } from '@/shared/pure/calendar';
import { endOfMonth, periodOf, shiftPeriod, startOfMonth, type Period } from '@/domain/periods/period';
import type { Result } from '@/shared/pure/result';

function checked<T>(result: Result<T, string>): T {
  if (!result.ok) throw new Error(`HB013_FIXTURE_CALENDAR_${result.code}`);
  return result.value;
}

function dayIn(period: Period, day: number): BerlinDate {
  return checked(parseBerlinDate(`${period}-${String(day).padStart(2, '0')}`));
}

/** Test-only civil calendar. The caller supplies PostgreSQL's actual Berlin date.
 * No host clock, elapsed-hour arithmetic, or production time override is used.
 */
export function transitionCalendar(serverBerlinDate: string) {
  const today = checked(parseBerlinDate(serverBerlinDate));
  const target = periodOf(today);
  const past = checked(shiftPeriod(target, -1));
  const older = checked(shiftPeriod(target, -2));
  const future = checked(shiftPeriod(target, 1));
  return {
    today, target, past, older, future,
    currentStart: startOfMonth(target),
    pastEnd: endOfMonth(past),
    pastDay: (day: number) => dayIn(past, day),
    olderDay: (day: number) => dayIn(older, day),
    agedProposalCreatedAt: `${endOfMonth(past)}T12:00:00Z`,
  };
}
