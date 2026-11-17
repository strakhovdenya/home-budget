'use server';

import type {
  AnalyticsResult,
  Choices,
  ChoicesQuery,
  OpenQuery,
  Page,
  Query
} from '@/domain/analytics/contracts';
import { parseChoices, parseOpen, parseQuery } from '@/domain/analytics/validation';
import { resolveDashboardAccount } from '../dashboard-account-boundary';
import { analytics } from './boundary';

export async function openAnalytics(raw: unknown): Promise<AnalyticsResult<Page>> {
  let input: OpenQuery;

  try {
    input = parseOpen(raw);
  } catch {
    return {
      ok: false as const,
      code: 'INVALID_INPUT' as const
    };
  }

  const account = await resolveDashboardAccount();

  if (account.kind !== 'ACCOUNT') {
    return {
      ok: false as const,
      code: 'FORBIDDEN' as const
    };
  }

  return analytics.open(account.accountId, input);
}

export async function readAnalytics(raw: unknown): Promise<AnalyticsResult<Page>> {
  let input: Query;

  try {
    input = parseQuery(raw);
  } catch {
    return {
      ok: false as const,
      code: 'INVALID_INPUT' as const
    };
  }

  const account = await resolveDashboardAccount();

  if (account.kind !== 'ACCOUNT') {
    return {
      ok: false as const,
      code: 'FORBIDDEN' as const
    };
  }

  return analytics.read(account.accountId, input);
}

export async function analyticsChoices(raw: unknown): Promise<AnalyticsResult<Choices>> {
  let input: ChoicesQuery;

  try {
    input = parseChoices(raw);
  } catch {
    return {
      ok: false as const,
      code: 'INVALID_INPUT' as const
    };
  }

  const account = await resolveDashboardAccount();

  if (account.kind !== 'ACCOUNT') {
    return {
      ok: false as const,
      code: 'FORBIDDEN' as const
    };
  }

  return analytics.choices(account.accountId, input);
}
