import { PlaceholderScreen } from '@/features/shell/placeholder-screen';
import { requirePageOwner } from '../require-page-owner';

export default async function SettingsPage() {
  await requirePageOwner();
  return <PlaceholderScreen section="settings" />;
}
