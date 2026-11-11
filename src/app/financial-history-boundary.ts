import 'server-only';
import {createFinancialHistory} from '@/features/financial-history/read-history';
import {requireOwnedAccount} from '@/infrastructure/auth/auth';
import {databaseFromEnvironment} from '@/infrastructure/db/client';
import {createHistoryIndexReader} from '@/infrastructure/db/financial-history-index';
import {createHistoryDetailReader} from '@/infrastructure/db/financial-history-detail';
export const financialHistory=createFinancialHistory(requireOwnedAccount,{
  open:(...args)=>createHistoryIndexReader(databaseFromEnvironment()).open(...args),
  page:(...args)=>createHistoryIndexReader(databaseFromEnvironment()).page(...args),
},{read:(...args)=>createHistoryDetailReader(databaseFromEnvironment()).read(...args)});
