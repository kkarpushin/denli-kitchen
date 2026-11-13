import {mkdir,writeFile} from 'node:fs/promises';
import {plan,price,STYLES} from '../engine.mjs';
await mkdir(new URL('../examples/',import.meta.url),{recursive:true});
for(const layout of ['straight','L','U']){
 const input={layout,island:false,walls:Array.from({length:{straight:1,L:2,U:3}[layout]},()=>({length:3800,height:2700})),style:'scandi',opt:{...STYLES.scandi.d},app:{fridge:'builtin',oven:'under',dw:600,micro:false}};
 const p=plan(input),quote=price(p,input);
 if(!p.valid||!quote)throw Error('Invalid demo '+layout);
 const doc={schema:'denli-project/1',status:'draft-not-for-production',input,plan:p,quote,measurement:input.walls.map(()=>({source:'demo',confirmed:true})),references:[],notes:'Демонстраційний проєкт для перевірки імпорту',budget:200000,limitations:['Illustrative prices','No validated accuracy','No live SketchUp or VIYAR calculation','Photos not embedded']};
 await writeFile(new URL(`../examples/${layout}.json`,import.meta.url),JSON.stringify(doc,null,2)+'\n');
}
console.log('Created three draft project examples');
