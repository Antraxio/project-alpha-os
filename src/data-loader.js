async function loadAlphaData(){
  const files=['core','portfolios','opportunities','universe','research'];
  const responses=await Promise.all(files.map(async name=>{
    const response=await fetch(`data/${name}.json?v=0.6.1`,{cache:'no-store'});
    if(!response.ok)throw new Error(`data/${name}.json`);
    return response.json();
  }));
  return Object.assign({},...responses);
}
