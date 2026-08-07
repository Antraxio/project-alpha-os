const money=value=>Math.round((value+Number.EPSILON)*100)/100;

function requireNumber(value,label,{positive=false}={}){
  if(!Number.isFinite(value)||(positive&&value<=0))throw new Error(`Invalid portfolio ledger value: ${label}`);
}

export function derivePortfolio(portfolio){
  requireNumber(portfolio.startCapital,'startCapital',{positive:true});
  if(!Array.isArray(portfolio.transactions))throw new Error('Invalid portfolio ledger: transactions');
  const ids=new Set();
  for(const transaction of portfolio.transactions){
    if(!transaction.id||ids.has(transaction.id))throw new Error('Invalid portfolio ledger: transaction id');
    ids.add(transaction.id);
    if(transaction.type==='BUY'){
      requireNumber(transaction.shares,`${transaction.id}.shares`,{positive:true});
      requireNumber(transaction.price,`${transaction.id}.price`,{positive:true});
    }else if(transaction.type==='CLOSE'){
      requireNumber(transaction.result,`${transaction.id}.result`);
    }else throw new Error(`Invalid portfolio ledger type: ${transaction.type}`);
  }
  const positions=portfolio.transactions.filter(item=>item.type==='BUY').map(({id,type,date,price,...item})=>({
    ...item,
    ...(date?{openedAt:date}:{}),
    entry:price
  }));
  const closedTrades=portfolio.transactions.filter(item=>item.type==='CLOSE').map(({id,type,...item})=>item);
  const openCost=positions.reduce((sum,item)=>sum+item.entry*item.shares,0);
  const realised=closedTrades.reduce((sum,item)=>sum+item.result,0);
  return {...portfolio,cash:money(portfolio.startCapital+realised-openCost),positions,closedTrades};
}

export function derivePortfolioData(data){
  if(!data?.portfolios)throw new Error('Invalid portfolio data: portfolios');
  return {...data,portfolios:Object.fromEntries(Object.entries(data.portfolios).map(([key,portfolio])=>[key,derivePortfolio(portfolio)]))};
}
