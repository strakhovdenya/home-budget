import { redirect } from 'next/navigation';
import { currentOwner } from '@/infrastructure/auth/auth';

export async function requirePageOwner() {
  const owner = await currentOwner();
  if (!owner) redirect('/login');
  return owner;
}
