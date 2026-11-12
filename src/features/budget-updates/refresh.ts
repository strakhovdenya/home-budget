/** In-memory invalidation only; no financial DTO, storage or optimistic mutation. */
const eventName='home-budget:confirmed-update';
export function notifyBudgetCommitted(){if(typeof window!=='undefined')window.dispatchEvent(new Event(eventName));}
export function onBudgetCommitted(listener:()=>void){window.addEventListener(eventName,listener);return()=>window.removeEventListener(eventName,listener);}
