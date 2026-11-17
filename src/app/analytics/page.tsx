import { requirePageOwner } from '../require-page-owner';
import { AnalyticsScreen } from '@/features/analytics/analytics-screen';
import { analyticsChoices, openAnalytics, readAnalytics } from './actions';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  await requirePageOwner();

  return (
    <AnalyticsScreen
      actions={{
        open: openAnalytics,
        read: readAnalytics,
        choices: analyticsChoices
      }}
    />
  );
}
