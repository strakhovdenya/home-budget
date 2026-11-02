import type { FundingProof } from './contracts';
export function validFundingProof(e:{id:string;previousRevisionId:string|null;positionId:string;fundingPeriodId:string;budgetUpdateId?:string;transitionDecisionId?:string|null;fundingProof?:FundingProof|null},before:{fundingPeriodId:string}):boolean{
  const p=e.fundingProof;
  return !!p&&!!e.transitionDecisionId&&!!e.budgetUpdateId&&p.budgetUpdateId===e.budgetUpdateId&&p.decisionId===e.transitionDecisionId&&p.afterRevisionId===e.id&&p.beforeRevisionId===e.previousRevisionId
    &&p.positionId===e.positionId&&p.sourcePeriodId===before.fundingPeriodId&&p.targetPeriodId===e.fundingPeriodId&&p.sourcePeriodId!==p.targetPeriodId;
}
