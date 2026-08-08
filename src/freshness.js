import {state} from './state.js?v=0.6.7';

export const DEFAULT_MAX_SNAPSHOT_AGE_HOURS=24;

export function evaluationTime(){
  return Number.isFinite(state.referenceTime)?state.referenceTime:Date.now();
}

export function snapshotFreshness(data=state.data,now=evaluationTime()){
  const maxAgeHours=data?.rules?.maxSnapshotAgeHours??DEFAULT_MAX_SNAPSHOT_AGE_HOURS;
  const snapshot=Date.parse(data?.snapshotDate);
  if(!Number.isFinite(snapshot))return{ageHours:null,maxAgeHours,isStale:true,dateKnown:false};
  const ageHours=(now-snapshot)/3600000;
  return{ageHours,maxAgeHours,isStale:ageHours>maxAgeHours,dateKnown:true};
}
