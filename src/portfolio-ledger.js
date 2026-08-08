const money=value=>Math.round((value+Number.EPSILON)*100)/100;

export const CASH_EVENT_TYPES=Object.freeze(['DEPOSIT','WITHDRAWAL','FEE','TAX','DIVIDEND','INTEREST']);
export const TRADE_TYPES=Object.freeze(['BUY','SELL']);
export const OPENING_TYPES=Object.freeze(['OPENING_CASH','OPENING_POSITION']);
export const LEDGER_TYPES=Object.freeze([...OPENING_TYPES,...TRADE_TYPES,...CASH_EVENT_TYPES]);

// Cost basis follows the average-cost method: every buy of an instrument raises the
// pooled cost, and a sale removes the sold shares at the pooled average. Scalable
// reports the same basis, which is why a two-share Microsoft position bought at
// 337.20 and 337.10 shows an entry of 337.15.

function requireNumber(value,label,{positive=false,nonNegative=false}={}){
  if(!Number.isFinite(value))throw new Error(`Invalid portfolio ledger value: ${label}`);
  if(positive&&value<=0)throw new Error(`Invalid portfolio ledger value: ${label}`);
  if(nonNegative&&value<0)throw new Error(`Invalid portfolio ledger value: ${label}`);
}

function requireInstrument(transaction){
  if(!transaction.ticker)throw new Error(`Invalid portfolio ledger instrument: ${transaction.id}`);
}

function validate(transaction){
  const {id,type}=transaction;
  if(!LEDGER_TYPES.includes(type))throw new Error(`Invalid portfolio ledger type: ${type}`);
  if(type==='OPENING_CASH'){
    requireNumber(transaction.amount,`${id}.amount`);
    return;
  }
  if(type==='OPENING_POSITION'||type==='BUY'||type==='SELL'){
    requireInstrument(transaction);
    requireNumber(transaction.shares,`${id}.shares`,{positive:true});
    requireNumber(transaction.amount,`${id}.amount`,{positive:true});
    return;
  }
  requireNumber(transaction.amount,`${id}.amount`,{positive:true});
}

function cashDelta(transaction){
  switch(transaction.type){
    case'OPENING_CASH':return transaction.amount;
    case'DEPOSIT':case'DIVIDEND':case'INTEREST':case'SELL':return transaction.amount;
    case'WITHDRAWAL':case'FEE':case'TAX':case'BUY':return-transaction.amount;
    default:return 0;
  }
}

// Cash is only tracked from `cashTrackedFrom`, because the opening balance on that date
// already reflects every earlier movement. Trades booked before it still build the
// position and its cost basis, but must not be deducted from cash a second time.
function affectsCash(transaction,trackedFrom){
  if(!trackedFrom)return true;
  if(transaction.type==='OPENING_CASH')return true;
  return!transaction.date||transaction.date>=trackedFrom;
}

export function derivePortfolio(portfolio){
  if(!Array.isArray(portfolio.transactions))throw new Error('Invalid portfolio ledger: transactions');
  const trackedFrom=portfolio.cashTrackedFrom??null;
  const ids=new Set();
  const holdings=new Map();
  const closedTrades=[];
  let cash=0;
  let deposited=0;
  let withdrawn=0;
  let fees=0;
  let taxes=0;
  let income=0;

  for(const transaction of portfolio.transactions){
    if(!transaction.id||ids.has(transaction.id))throw new Error('Invalid portfolio ledger: transaction id');
    ids.add(transaction.id);
    validate(transaction);
    if(affectsCash(transaction,trackedFrom))cash+=cashDelta(transaction);

    if(transaction.type==='DEPOSIT')deposited+=transaction.amount;
    if(transaction.type==='WITHDRAWAL')withdrawn+=transaction.amount;
    if(transaction.type==='FEE')fees+=transaction.amount;
    if(transaction.type==='TAX')taxes+=transaction.amount;
    if(transaction.type==='DIVIDEND'||transaction.type==='INTEREST')income+=transaction.amount;

    if(transaction.type==='OPENING_POSITION'||transaction.type==='BUY'){
      const held=holdings.get(transaction.ticker)??{...transaction,shares:0,cost:0,orders:[]};
      held.shares+=transaction.shares;
      held.cost+=transaction.amount;
      held.orders.push(transaction.id);
      if(transaction.date&&!held.openedAt)held.openedAt=transaction.date;
      holdings.set(transaction.ticker,held);
    }

    if(transaction.type==='SELL'){
      const held=holdings.get(transaction.ticker);
      if(!held||held.shares<transaction.shares)throw new Error(`Invalid portfolio ledger sale: ${transaction.id}`);
      const soldCost=held.cost/held.shares*transaction.shares;
      held.shares-=transaction.shares;
      held.cost-=soldCost;
      closedTrades.push({
        ticker:transaction.ticker,
        name:transaction.name??held.name,
        date:transaction.date,
        shares:transaction.shares,
        proceeds:money(transaction.amount),
        cost:money(soldCost),
        result:money(transaction.amount-soldCost),
        reason:transaction.reason,
        openedAt:held.openedAt
      });
      if(held.shares<=0.0000001)holdings.delete(transaction.ticker);
    }
  }

  const prices=portfolio.marketData?.prices??{};
  const plans=portfolio.plans??{};
  const positions=[...holdings.values()]
    .map(({type,id,amount,price,source,cost,orders,...rest})=>{
      const current=prices[rest.ticker];
      if(!Number.isFinite(current))throw new Error(`Missing market price: ${rest.ticker}`);
      return{
        ...rest,
        ...plans[rest.ticker],
        cost:money(cost),
        entry:money(cost/rest.shares),
        current,
        orders
      };
    })
    .sort((a,b)=>b.current*b.shares-a.current*a.shares);

  return{
    ...portfolio,
    cash:money(cash),
    positions,
    closedTrades,
    cashFlow:{
      deposited:money(deposited),
      withdrawn:money(withdrawn),
      fees:money(fees),
      taxes:money(taxes),
      income:money(income)
    }
  };
}

// The bank statement is the authority for cash. Any gap between the derived balance and
// the reported one is surfaced rather than absorbed, so an unrecorded booking cannot hide.
export function cashReconciliation(portfolio){
  const latest=Number.isFinite(portfolio.marketData?.reportedCash)
    ?{reported:portfolio.marketData.reportedCash,asOf:portfolio.marketData.asOf,source:portfolio.marketData.source}
    :Number.isFinite(portfolio.statement?.reportedCash)
      ?{reported:portfolio.statement.reportedCash,asOf:portfolio.statement.reportedCashDate,source:portfolio.statement.source}
      :null;
  if(!latest)return{reported:null,asOf:null,source:null,derived:portfolio.cash,difference:null,reconciled:false};
  const difference=money(portfolio.cash-latest.reported);
  return{...latest,derived:portfolio.cash,difference,reconciled:difference===0};
}

export function derivePortfolioData(data){
  if(!data?.portfolio)throw new Error('Invalid portfolio data: portfolio');
  return{...data,portfolio:derivePortfolio(data.portfolio)};
}
