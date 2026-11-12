import type {BudgetResult} from '@/domain/budget-update/ports';
import type {AuthorizedScope,PreparedCommand,CommitReceipt,CanonicalValue} from '@/domain/updates/contracts';
import type {Accept,Template} from './templates';
export type TemplateSeed={schemaVersion:1;revision:string;today:string;originPeriod:string;configs:Template[];offers:Template[];
  decisions:{title:string;input:{action:'ACCEPT'|'DECLINE';templateId:string;originPeriod:string};receipt:CommitReceipt}[];placement:Accept['placement']};
export interface TemplateRepository{
  load(scope:AuthorizedScope,originPeriod:string):Promise<BudgetResult<CanonicalValue>>;
  commit(scope:AuthorizedScope,command:PreparedCommand):Promise<BudgetResult<CommitReceipt>>;
  status(scope:AuthorizedScope,requestId:string):Promise<BudgetResult<CommitReceipt|null>>;
}
export type TemplateActions={load:(origin:unknown)=>Promise<BudgetResult<CanonicalValue>>;commit:(command:unknown)=>Promise<BudgetResult<CommitReceipt>>;
  status:(key:unknown)=>Promise<BudgetResult<CommitReceipt|null>>};
