import {state} from './state.js?v=0.7.1';

export const DEFAULT_MAX_SNAPSHOT_AGE_HOURS=24;

export function evaluationTime(){
  return Number.isFinite(state.referenceTime)?state.referenceTime:Date.now();
}

// Fail closed: only a parseable snapshot date, a finite positive threshold and a
// non-negative age may ever report a fresh snapshot. A snapshot dated in the
// future is treated as unusable, not as especially fresh.
export function snapshotFreshness(data=state.data,now=evaluationTime()){
  const configured=data?.rules?.maxSnapshotAgeHours;
  const thresholdValid=Number.isFinite(configured)&&configured>0;
  const maxAgeHours=thresholdValid?configured:null;
  const snapshot=Date.parse(data?.snapshotDate);
  const dateKnown=Number.isFinite(snapshot)&&Number.isFinite(now);
  const ageHours=dateKnown?(now-snapshot)/3600000:null;
  if(!dateKnown||!thresholdValid)return{ageHours,maxAgeHours,isStale:true,dateKnown,thresholdValid,future:false};
  const future=ageHours<0;
  return{ageHours,maxAgeHours,isStale:future||ageHours>maxAgeHours,dateKnown:true,thresholdValid:true,future};
}
