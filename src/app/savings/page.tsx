import { ManagementPage } from '../management-page';
import { requirePageOwner } from '../require-page-owner';

export default async function SavingsPage() {
  await requirePageOwner();
  return <ManagementPage kind="SAVING" />;
}
