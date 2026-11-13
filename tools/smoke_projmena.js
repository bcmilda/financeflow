const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('projects.js','utf8');
const pick=n=>{const i=src.indexOf('function '+n);let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};
let BASE='CZK';
const sb={console,Object,Array,Math,get baseCur(){return()=>BASE},
  curSym:c=>({CZK:'Kč',EUR:'€',PLN:'zł',GBP:'£'}[c]||c),
  fmt:n=>new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:0}).format(n||0),Intl};
sb.window=sb;vm.createContext(sb);
vm.runInContext(pick('projectCurBreakdown')+'\n'+pick('projectCurLabel'),sb);

const D={wallets:[{id:'w1',currency:'CZK'},{id:'w2',currency:'EUR'},{id:'w3',currency:'PLN'}]};
const txs=[{type:'expense',wallet:'w2',amount:600},{type:'expense',wallet:'w2',amount:400},
           {type:'expense',wallet:'w1',amount:25000},{type:'expense',wallet:'w3',amount:300},
           {type:'income', wallet:'w2',amount:150}];
let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m)};
// Intl vkládá pevnou mezeru (U+00A0) – pro porovnání normalizujeme
const norm=x=>String(x).replace(/[\u00a0\u202f]/g,' ');
const lbl=t=>norm(vm.runInContext('projectCurLabel',sb)(txs,D,t));

console.log('── Projekty · rozpad podle měny ──');
check('základní CZK → ukáže EUR i PLN, koruny ne',()=>{
  BASE='CZK'; const l=lbl('expense');
  assert(l.includes('1 000 €'),'chybí eura: '+l);
  assert(l.includes('300 zł'),'chybí zloté: '+l);
  assert(!l.includes('Kč'),'základní měna se nemá opakovat: '+l);
});
check('základní EUR → koruny a zloté, eura ne',()=>{
  BASE='EUR'; const l=lbl('expense');
  assert(l.includes('25 000 Kč')&&l.includes('300 zł'),l);
  assert(!l.includes('€'),'základní měna se nemá opakovat: '+l);
});
check('projekt jen v základní měně → prázdný popisek',()=>{
  BASE='CZK';
  assert(norm(vm.runInContext('projectCurLabel',sb)([{type:'expense',wallet:'w1',amount:500}],D,'expense'))==='','má být prázdné');
});
check('příjmy se počítají zvlášť od výdajů',()=>{
  BASE='CZK'; assert(lbl('income')==='150 €',lbl('income'));
});
check('seřazeno od největší částky',()=>{
  BASE='CZK'; assert(lbl('expense').indexOf('1 000 €')<lbl('expense').indexOf('300 zł'),lbl('expense'));
});
console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ ROZPAD MĚN OVĚŘEN');
process.exit(fails?1:0);
