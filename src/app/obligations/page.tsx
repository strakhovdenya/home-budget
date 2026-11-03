import { ManagementPage } from '../management-page';
import { requirePageOwner } from '../require-page-owner';

export default async function ObligationsPage() {
  await requirePageOwner();
  return <ManagementPage kind="OBLIGATION" />;
}
