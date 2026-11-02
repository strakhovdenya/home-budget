import { PlaceholderScreen } from '@/features/shell/placeholder-screen';
import { requirePageOwner } from './require-page-owner';

export default async function HomePage() {
  await requirePageOwner();
  return <PlaceholderScreen section="overview" />;
}
