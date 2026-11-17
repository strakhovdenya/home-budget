import 'server-only';

import { createAnalytics } from '@/features/analytics/read-analytics';
import { requireOwnedAccount } from '@/infrastructure/auth/auth';
import { databaseFromEnvironment } from '@/infrastructure/db/client';
import { createAnalyticsReader } from '@/infrastructure/db/analytics-reader';

export const analytics = createAnalytics(
  requireOwnedAccount,
  {
    open: (scope, query) => createAnalyticsReader(databaseFromEnvironment()).open(scope, query),
    read: (scope, query) => createAnalyticsReader(databaseFromEnvironment()).read(scope, query),
    choices: (scope, query) => createAnalyticsReader(databaseFromEnvironment()).choices(scope, query),
  }
);
