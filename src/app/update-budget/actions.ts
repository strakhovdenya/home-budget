'use server';

import { normalizeValue } from '@/domain/updates/canonical-value';
import { budgetUpdates } from '../update-budget-boundary';
import { resolveDashboardAccount } from '../dashboard-account-boundary';

async function owned(){const a=await resolveDashboardAccount();return a.kind==='ACCOUNT'?a.accountId:null;}
export async function loadBudgetDraft(){const id=await owned();return id?budgetUpdates.load(id):{ok:false as const,code:'FORBIDDEN' as const};}
export async function previewBudgetUpdate(input:unknown){let captured;try{captured=normalizeValue(input);}catch{return {ok:false as const,code:'INVALID_INPUT' as const};}
  const id=await owned();return id?budgetUpdates.preview(id,captured):{ok:false as const,code:'FORBIDDEN' as const};}
export async function confirmBudgetUpdate(input:unknown){let captured;try{captured=normalizeValue(input);}catch{return {ok:false as const,code:'INVALID_INPUT' as const};}
  const id=await owned();return id?budgetUpdates.confirm(id,captured):{ok:false as const,code:'FORBIDDEN' as const};}
export async function budgetUpdateStatus(requestId:unknown){const captured=typeof requestId==='string'?requestId:null;const id=await owned();return id?budgetUpdates.status(id,captured):{ok:false as const,code:'FORBIDDEN' as const};}
export async function budgetUpdateHistory(updateId:unknown=null){const captured=typeof updateId==='string'||updateId===null?updateId:undefined;const id=await owned();return id?budgetUpdates.history(id,captured):{ok:false as const,code:'FORBIDDEN' as const};}
