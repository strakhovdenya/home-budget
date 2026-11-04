'use server';
import { normalizeValue } from '@/domain/updates/canonical-value';
import { monthClosing } from '../month-closing-boundary';
import { resolveDashboardAccount } from '../dashboard-account-boundary';
async function owned(){const a=await resolveDashboardAccount();return a.kind==='ACCOUNT'?a.accountId:null;}
function capture(input:unknown){try{return normalizeValue(input);}catch{return undefined;}}
export async function loadMonth(input:unknown){const c=capture(input),id=await owned();return id&&c!==undefined?monthClosing.load(id,c):{ok:false as const,code:'FORBIDDEN' as const};}
export async function previewClose(input:unknown){const c=capture(input),id=await owned();return id&&c!==undefined?monthClosing.preview(id,c):{ok:false as const,code:'FORBIDDEN' as const};}
export async function confirmClose(input:unknown){const c=capture(input),id=await owned();return id&&c!==undefined?monthClosing.confirm(id,c):{ok:false as const,code:'FORBIDDEN' as const};}
export async function closeStatus(input:unknown){const c=capture(input),id=await owned();return id&&c!==undefined?monthClosing.status(id,c):{ok:false as const,code:'FORBIDDEN' as const};}
export async function readReportChunk(input:unknown){const c=capture(input),id=await owned();return id&&c!==undefined?monthClosing.chunk(id,c):{ok:false as const,code:'FORBIDDEN' as const};}
export async function readReviewPage(input:unknown,offset:unknown){const c=capture(input),o=typeof offset==='number'?offset:null,id=await owned();return id&&c!==undefined?monthClosing.review(id,c,o):{ok:false as const,code:'FORBIDDEN' as const};}
