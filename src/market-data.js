import {state} from './state.js?v=0.7.5';

// Price history is stored as a shared date axis plus one ragged series per security, so a
// security that started trading later carries no empty leading entries. High and low are
// kept alongside the close because the true range - and therefore every volatility-derived
// stop - cannot be computed without them.
//
// {
//   dates:  ["2016-08-08", ...],
//   venue:  "XETRA",  currency: "EUR",
//   series: { MSFT: { firstIndex: 0, high: [...], low: [...], close: [...] } }
// }

export const BAR_OK='ok';
export const BAR_REVIEW='review';
export const BAR_CORPORATE_ACTION='corporateAction';
export const BAR_REJECT='reject';

// A move that lands on one of these ratios is far more likely a split than a market event.
export const SPLIT_RATIOS=Object.freeze([
  1/20,1/10,1/5,1/4,1/3,1/2,2/3,3/2,2,3,4,5,10,20
]);

export const DEFAULT_VALIDATION=Object.freeze({
  maxDailyMovePct:25,
  splitTolerancePct:2,
  atrPeriod:14,
  atrMultiplier:2.5
});

export function validationConfig(data=state.data){
  return{...DEFAULT_VALIDATION,...(data?.rules?.priceValidation??{})};
}

// Classifies a day-on-day move. A large move is not wrong by itself - an earnings surprise
// is real - so it is never silently discarded. It is either attributed to a corporate
// action or marked for review.
export function classifyMove(close,previousClose,config=DEFAULT_VALIDATION){
  if(!Number.isFinite(previousClose)||previousClose<=0)return{severity:BAR_OK,movePct:null,ratio:null};
  const ratio=close/previousClose;
  const movePct=(ratio-1)*100;
  if(Math.abs(movePct)<=config.maxDailyMovePct)return{severity:BAR_OK,movePct,ratio:null};
  const tolerance=config.splitTolerancePct/100;
  const split=SPLIT_RATIOS.find(candidate=>Math.abs(ratio/candidate-1)<=tolerance);
  return split
    ?{severity:BAR_CORPORATE_ACTION,movePct,ratio:split}
    :{severity:BAR_REVIEW,movePct,ratio:null};
}

// Structural impossibilities are rejected outright: a fetch that produces one of these is
// broken, not surprising, and must never reach the ledger or the model.
export function validateBar(bar,{previousClose=null,currency=null,expectedCurrency=null,config=DEFAULT_VALIDATION}={}){
  const reasons=[];
  for(const key of ['high','low','close']){
    if(!Number.isFinite(bar?.[key])||bar[key]<=0)reasons.push(`${key}Invalid`);
  }
  if(!reasons.length){
    if(bar.low>bar.high)reasons.push('lowAboveHigh');
    if(bar.close<bar.low||bar.close>bar.high)reasons.push('closeOutsideRange');
  }
  if(expectedCurrency&&currency&&currency!==expectedCurrency)reasons.push('currencyMismatch');
  if(reasons.length)return{severity:BAR_REJECT,reasons,movePct:null,ratio:null};
  const move=classifyMove(bar.close,previousClose,config);
  return{severity:move.severity,reasons:[],movePct:move.movePct,ratio:move.ratio};
}

export function seriesBars(history,ticker){
  const series=history?.series?.[ticker];
  if(!series||!Array.isArray(series.close))return[];
  const start=series.firstIndex??0;
  return series.close.map((close,index)=>({
    date:history.dates?.[start+index]??null,
    high:series.high?.[index],
    low:series.low?.[index],
    close
  }));
}

export function validateSeries(history,ticker,{expectedCurrency=null,config=DEFAULT_VALIDATION}={}){
  const bars=seriesBars(history,ticker);
  const findings=[];
  bars.forEach((bar,index)=>{
    const result=validateBar(bar,{
      previousClose:index?bars[index-1].close:null,
      currency:history?.currency,
      expectedCurrency,
      config
    });
    if(result.severity!==BAR_OK)findings.push({date:bar.date,...result});
  });
  return{
    ticker,
    bars:bars.length,
    findings,
    rejected:findings.filter(item=>item.severity===BAR_REJECT).length,
    corporateActions:findings.filter(item=>item.severity===BAR_CORPORATE_ACTION).length,
    review:findings.filter(item=>item.severity===BAR_REVIEW).length,
    usable:findings.every(item=>item.severity!==BAR_REJECT)
  };
}

export function trueRange(bar,previousClose){
  if(!Number.isFinite(previousClose))return bar.high-bar.low;
  return Math.max(
    bar.high-bar.low,
    Math.abs(bar.high-previousClose),
    Math.abs(bar.low-previousClose)
  );
}

// Wilder's average true range. Returns null rather than a guess when the series is too
// short, so a stop can never be derived from a volatility estimate that does not exist.
export function averageTrueRange(bars,period=DEFAULT_VALIDATION.atrPeriod){
  if(!Array.isArray(bars)||!Number.isInteger(period)||period<1)return null;
  if(bars.length<period+1)return null;
  const ranges=bars.slice(1).map((bar,index)=>trueRange(bar,bars[index].close));
  if(ranges.some(value=>!Number.isFinite(value)))return null;
  let atr=ranges.slice(0,period).reduce((sum,value)=>sum+value,0)/period;
  for(let index=period;index<ranges.length;index++){
    atr=(atr*(period-1)+ranges[index])/period;
  }
  return atr;
}

// Two venues, two purposes. A holding is valued at the venue the broker quotes - the German
// listing in EUR - because that is the number the account statement shows. Volatility must
// come from the primary listing, where the security actually trades. Measured on Biomarin:
// Frankfurt shows a median daily range of 0.00 % on a median volume of 100 shares, with 70 %
// of days quoting high = low, against 2.51 % and 1.97 million shares in the US. True range
// still captures the overnight gap, so the Frankfurt estimate is not worthless - 2.35 %
// against 2.77 % - but it understates volatility by roughly 15 % and rests on quotes rather
// than trades.
//
// Expressing the result as a percentage keeps it currency-neutral, so a US-derived ATR can
// size a stop on the EUR price without an exchange rate entering the calculation.
export function stopFromAtrPct(price,atrPct,multiplier=DEFAULT_VALIDATION.atrMultiplier){
  if(!Number.isFinite(price)||price<=0)return null;
  if(!Number.isFinite(atrPct)||atrPct<=0)return null;
  if(!Number.isFinite(multiplier)||multiplier<=0)return null;
  const stop=price*(1-multiplier*atrPct/100);
  return stop>0?stop:null;
}

// A venue whose bars are mostly quotes rather than trades cannot carry a volatility
// estimate. Reported rather than silently accepted, so the wrong series cannot be used by
// accident.
export function venueQuality(bars){
  if(!Array.isArray(bars)||!bars.length)return{bars:0,flatPct:null,zeroVolumePct:null,tradable:false};
  const flat=bars.filter(bar=>bar.high===bar.low).length;
  const zero=bars.filter(bar=>Number.isFinite(bar.volume)&&bar.volume===0).length;
  const flatPct=flat/bars.length*100;
  return{
    bars:bars.length,
    flatPct,
    zeroVolumePct:zero/bars.length*100,
    tradable:flatPct<=25
  };
}

// The stop sits outside the security's ordinary daily noise, so a quiet security receives a
// tight stop and a volatile one a wide stop without either being guessed.
export function volatilityStop(entryPrice,atr,multiplier=DEFAULT_VALIDATION.atrMultiplier){
  if(!Number.isFinite(entryPrice)||entryPrice<=0)return null;
  if(!Number.isFinite(atr)||atr<=0)return null;
  if(!Number.isFinite(multiplier)||multiplier<=0)return null;
  const stop=entryPrice-multiplier*atr;
  return stop>0?stop:null;
}

// Everything a scenario needs from the history, or nulls when it cannot be derived.
export function volatilityProfile(history,ticker,{price=null,config=DEFAULT_VALIDATION}={}){
  const bars=seriesBars(history,ticker);
  const atr=averageTrueRange(bars,config.atrPeriod);
  const reference=Number.isFinite(price)?price:bars.at(-1)?.close??null;
  const stop=volatilityStop(reference,atr,config.atrMultiplier);
  return{
    ticker,
    bars:bars.length,
    atr,
    atrPct:atr&&reference?atr/reference*100:null,
    reference,
    stop,
    stopDistancePct:stop&&reference?(reference-stop)/reference*100:null
  };
}
