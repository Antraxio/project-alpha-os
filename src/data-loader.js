import {APP_VERSION} from './version.js?v=0.6.7';
import {derivePortfolioData} from './portfolio-ledger.js?v=0.6.7';

export async function loadAlphaData(){
  const files=['core','portfolios','opportunities','universe','research'];
  const responses=await Promise.all(files.map(async name=>{
    const response=await fetch(`data/${name}.json?v=${APP_VERSION}`,{cache:'no-store'});
    if(!response.ok)throw new Error(`data/${name}.json`);
    return response.json();
  }));
  return derivePortfolioData(Object.assign({},...responses));
}
