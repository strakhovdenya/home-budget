export const dynamic='force-dynamic';
import {requirePageOwner} from '../require-page-owner';
import {resolveDashboardAccount} from '../dashboard-account-boundary';
import {FinancialHistoryScreen} from '@/features/financial-history/history-screen';
import {openHistory,pageHistory,readHistoryDetail} from './actions';
export default async function HistoryPage(){
  await requirePageOwner();
  const account=await resolveDashboardAccount();
  return <FinancialHistoryScreen key={account.kind==='ACCOUNT'?account.accountId:account.kind} initial={null} actions={{open:openHistory,page:pageHistory,detail:readHistoryDetail}}/>;
}
