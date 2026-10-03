// TODO-217 – karta Projektu: časová osa, graf, srovnávač.
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('projects.js','utf8');
const pick=n=>{const i=src.indexOf('function '+n);let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};
let DATA=null;
const sb={console,Date,Math,Object,Array,Number,isFinite,String,
  getData:()=>DATA, czkToBase:v=>v||0, fmtB:n=>Math.round(n)+' Kč',
  escHtml:s=>String(s==null?'':s).replace(/</g,'&lt;'),
  txCZK:t=>t.amtCZK!=null?t.amtCZK:(t.amount||0),
  getCat:(id,c)=>(c||[]).find(x=>x.id===id)||{name:'Ostatní',icon:'📦'},
  getProjects:D=>(D||DATA).projects||[],
  getProjectTxs:(id,D)=>((D||DATA).transactions||[]).filter(t=>t.projectId===id),
  PROJECT_TYPES:{dovolena:'🏖️ Dovolená',rekonstrukce:'🔨 Rekonstrukce'},
  PROJ_COLS:['#06b6d4','#a78bfa','#4ade80']};
sb.window=sb;vm.createContext(sb);
vm.runInContext(pick('_projGraphHTML')+'\n'+pick('_projCompareHTML'),sb);
const graf=vm.runInContext('_projGraphHTML',sb), srov=vm.runInContext('_projCompareHTML',sb);

let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m)};
const tx=(pid,d,amt,name)=>({projectId:pid,type:'expense',date:d,amount:amt,name:name||'x'});

console.log('── TODO-217 · graf vývoje ──');
check('pod 4 transakce se graf nekreslí (z úsečky nic nevyčteš)',()=>{
  const t=[tx('p1','2026-03-01',100),tx('p1','2026-04-01',200),tx('p1','2026-05-01',300)];
  assert(graf(t,DATA,10000,50)==='','graf se vykreslil ze 3 bodů');
});
check('od 4 transakcí se graf vykreslí bez NaN',()=>{
  const t=['2026-03-01','2026-04-01','2026-05-01','2026-06-01'].map((d,i)=>tx('p1',d,1000*(i+1)));
  const h=graf(t,DATA,10000,50);
  assert(h.length>400,'délka '+h.length);
  assert(h.indexOf('NaN')<0&&h.indexOf('Infinity')<0,'NaN/Infinity v SVG');
  assert(/rozpočet/.test(h),'chybí čára rozpočtu');
});
check('bez rozpočtu se čára rozpočtu nekreslí',()=>{
  const t=['2026-03-01','2026-04-01','2026-05-01','2026-06-01'].map((d,i)=>tx('p1',d,500));
  assert(!/rozpočet/.test(graf(t,DATA,0,50)),'kreslí rozpočet, který není');
});
check('všechny transakce v jednom dni nezpůsobí dělení nulou',()=>{
  const t=[1,2,3,4].map(i=>tx('p1','2026-03-01',100*i));
  const h=graf(t,DATA,5000,50);
  assert(h.indexOf('NaN')<0,'NaN při nulovém rozpětí dat');
});
check('kumulace roste, poslední bod = součet',()=>{
  const t=['2026-03-01','2026-04-01','2026-05-01','2026-06-01'].map((d,i)=>tx('p1',d,1000));
  assert(/celkem 4000 Kč/.test(graf(t,DATA,10000,50)),'poslední bod není 4000');
});

console.log('\n── srovnávač ──');
DATA={projects:[
  {id:'p1',name:'Chorvatsko',type:'dovolena',end:'2026-09-14'},
  {id:'p2',name:'Itálie',type:'dovolena',end:'2025-08-01'},
  {id:'p3',name:'Řecko',type:'dovolena',end:'2024-08-01'},
  {id:'p4',name:'Koupelna',type:'rekonstrukce',end:'2025-01-01'}],
 transactions:[
  tx('p2','2025-07-01',20000),tx('p3','2024-07-01',30000),tx('p4','2024-12-01',90000)]};
check('srovnává jen UKONČENÉ projekty téhož typu',()=>{
  const h=srov(DATA.projects[0],DATA,25000);
  assert(/Itálie/.test(h)&&/Řecko/.test(h),'chybí srovnatelné projekty');
  assert(!/Koupelna/.test(h),'míchá jiný typ projektu');
});
check('méně než 2 srovnatelné → nic (průměr z jednoho nedává smysl)',()=>{
  const D2={projects:[{id:'p1',name:'A',type:'dovolena'},{id:'p2',name:'B',type:'dovolena',end:'2025-08-01'}],
            transactions:[tx('p2','2025-07-01',20000)]};
  assert(srov(D2.projects[0],D2,25000)==='','vykreslil srovnání z jednoho projektu');
});
check('probíhající projekt se do srovnání nepočítá',()=>{
  const D3=JSON.parse(JSON.stringify(DATA));
  D3.projects[1].end='2099-01-01';              // Itálie ještě běží
  D3.transactions=DATA.transactions;
  assert(srov(D3.projects[0],D3,25000)==='','započítal neukončený projekt');
});
check('rozdíl proti průměru je popsaný správným směrem',()=>{
  const h=srov(DATA.projects[0],DATA,25000);   // průměr (20+30)/2 = 25 000
  assert(/na průměru/.test(h),'při shodě s průměrem má říct „zhruba na průměru": '+h.slice(-200));
});
check('dražší projekt se označí jako dražší',()=>{
  const h=srov(DATA.projects[0],DATA,40000);
  assert(/dražší/.test(h),'neoznačil jako dražší');
});
console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ KARTA PROJEKTU OVĚŘENA');
process.exit(fails?1:0);
