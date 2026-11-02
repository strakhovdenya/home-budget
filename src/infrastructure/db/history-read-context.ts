import 'server-only';
import type { History } from '@/domain/checkpoints/contracts';
import * as s from './schema';

/** Optional bulk materialization for a bounded projection read; ordinary writers keep their existing path. */
export type HistoryReadContext = Readonly<{
  history: History; audits: readonly (typeof s.auditEvents.$inferSelect)[];
  auditByEntity: ReadonlyMap<string, readonly (typeof s.auditEvents.$inferSelect)[]>;
  auditByBatch: ReadonlyMap<string, readonly (typeof s.auditEvents.$inferSelect)[]>;
  decisions: ReadonlyMap<string, typeof s.transitionDecisions.$inferSelect>;
}>;
export function indexAudits(audits: HistoryReadContext['audits']) {
  const auditByEntity = new Map<string, (typeof s.auditEvents.$inferSelect)[]>(), auditByBatch = new Map<string, (typeof s.auditEvents.$inferSelect)[]>();
  for (const a of audits) {
    const b = auditByBatch.get(a.budgetUpdateId) ?? []; b.push(a); auditByBatch.set(a.budgetUpdateId, b);
    const d = a.beforeAfter as { entity?: { type?: unknown; id?: unknown } } | null;
    if (typeof d?.entity?.type === 'string' && typeof d.entity.id === 'string') {
      const key = `${d.entity.type}:${d.entity.id}`, list = auditByEntity.get(key) ?? [];
      list.push(a); auditByEntity.set(key, list);
    }
  }
  return { auditByEntity, auditByBatch };
}
