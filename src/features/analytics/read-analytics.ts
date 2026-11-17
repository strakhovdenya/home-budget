import type { AuthorizedScope } from '@/domain/updates/contracts';
import type {
  AnalyticsReader,
  AnalyticsResult,
  Choices,
  ChoicesQuery,
  OpenQuery,
  Page,
  Query
} from '@/domain/analytics/contracts';
import { parseChoices, parseOpen, parseQuery } from '@/domain/analytics/validation';

export type AnalyticsActions = Readonly<{
  open(input: unknown): Promise<AnalyticsResult<Page>>;
  read(input: unknown): Promise<AnalyticsResult<Page>>;
  choices(input: unknown): Promise<AnalyticsResult<Choices>>;
}>;

export function createAnalytics(
  authorize: (selector: unknown) => Promise<AuthorizedScope>,
  reader: AnalyticsReader
) {
  return {
    async choices(selector: unknown, raw: unknown): Promise<AnalyticsResult<Choices>> {
      let query: ChoicesQuery;

      try {
        query = parseChoices(raw);
      } catch {
        return {
          ok: false,
          code: 'INVALID_INPUT'
        };
      }

      let scope: AuthorizedScope;

      try {
        scope = await authorize(selector);
      } catch {
        return {
          ok: false,
          code: 'FORBIDDEN'
        };
      }

      return reader.choices(scope, query);
    },
    async open(selector: unknown, raw: unknown): Promise<AnalyticsResult<Page>> {
      let query: OpenQuery;

      try {
        query = parseOpen(raw);
      } catch {
        return {
          ok: false,
          code: 'INVALID_INPUT'
        };
      }

      let scope: AuthorizedScope;

      try {
        scope = await authorize(selector);
      } catch {
        return {
          ok: false,
          code: 'FORBIDDEN'
        };
      }

      return reader.open(scope, query);
    },
    async read(selector: unknown, raw: unknown): Promise<AnalyticsResult<Page>> {
      let query: Query;

      try {
        query = parseQuery(raw);
      } catch {
        return {
          ok: false,
          code: 'INVALID_INPUT'
        };
      }

      let scope: AuthorizedScope;

      try {
        scope = await authorize(selector);
      } catch {
        return {
          ok: false,
          code: 'FORBIDDEN'
        };
      }

      return reader.read(scope, query);
    },
  };
}
