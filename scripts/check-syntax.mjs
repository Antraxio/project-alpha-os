import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';

async function javascriptFiles(directory){
  const entries=await readdir(directory,{withFileTypes:true});
  const nested=await Promise.all(entries.map(entry=>{
    const path=`${directory}/${entry.name}`;
    if(entry.isDirectory())return javascriptFiles(path);
    return /\.(?:js|mjs)$/.test(entry.name)?[path]:[];
  }));
  return nested.flat();
}

const files=['app.js',...await javascriptFiles('src'),...await javascriptFiles('scripts'),...await javascriptFiles('tests')];
for(const file of files){
  const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});
  if(result.status!==0)process.exit(result.status||1);
}
console.log(`Syntax OK: ${files.length} JavaScript files`);
