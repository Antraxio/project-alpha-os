import {readFile,writeFile} from 'node:fs/promises';

const names=['core','portfolios','opportunities','universe','research'];
const parts=await Promise.all(names.map(async name=>JSON.parse(await readFile(new URL(`../data/${name}.json`,import.meta.url),'utf8'))));
const payload=Object.assign({},...parts);
await writeFile(new URL('../alpha-data.json',import.meta.url),`${JSON.stringify(payload,null,2)}\n`);
