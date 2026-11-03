import { indexHistory } from './history';
import type { History, Placement, CheckpointErrorCode, Ordering } from './contracts';
import type { BerlinDate } from '@/shared/pure/calendar';
import type { Result } from '@/shared/pure/result';

/** Shared immutable placement policy; no insertion-order or fabricated-date fallback. */
export function planPosition(history: History, date: BerlinDate, seq: bigint, positionId: string,
  orderingId: string, placement: Placement | null): Result<Readonly<{ history: History; order: Ordering }>, CheckpointErrorCode> {
  const index = indexHistory(history);
  if (!index.ok) return index;
  const day = index.value.days.get(date), members = [...(day?.positionIds ?? [])], p = placement;
  if (!p && members.length) return {ok:false,code:'ORDERING_CONFLICT'};
  const at = p?.afterPositionId ? members.indexOf(p.afterPositionId) + 1 : 0;
  if (p && (p.expectedOrderingRevisionId !== (day?.id ?? null) || (p.afterPositionId && !at)
    || (members[at] ?? null) !== p.beforePositionId)) return {ok:false,code:'ORDERING_CONFLICT'};
  members.splice(at, 0, positionId);
  const order = {id:orderingId,historicalDate:date,recordedSeq:seq,previousRevisionId:day?.id??null,positionIds:members,edges:day?.edges??[]};
  return {ok:true,value:{order,history:{...history,knowledgeCut:seq,
    positions:[...history.positions,{id:positionId,historicalDate:date,recordedSeq:seq}],orderings:[...history.orderings,order]}}};
}
