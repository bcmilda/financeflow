// TODO-226 – kontrola úplnosti účtenky.
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('receipts.js','utf8');
const pick=n=>{const i=src.indexOf('function '+n);let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};
const sb={console,Math,parseFloat,
  lineAmt:it=>(it.lineTotal!=null?it.lineTotal:(it.price||0)*(it.qty||1))};
sb.window=sb;vm.createContext(sb);
vm.runInContext('const RECEIPT_TOLERANCE = 1;\n'+pick('receiptCompleteness'),sb);
const chk=vm.runInContext('receiptCompleteness',sb);

let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m)};

console.log('── TODO-226 · úplnost účtenky ──');
check('sedící účtenka projde',()=>{
  const r=chk({total:250,items:[{lineTotal:100},{lineTotal:150}]});
  assert(r&&r.ok,'hlásí nesoulad: '+JSON.stringify(r));
});
check('🚩 AI přehlédla položku → rozdíl se ohlásí',()=>{
  const r=chk({total:250,items:[{lineTotal:100},{lineTotal:80}]});
  assert(r&&!r.ok,'nesoulad neodhalen');
  assert(r.diff===70&&r.chybi===true,'diff '+r.diff+' chybi '+r.chybi);
});
check('přebytek se hlásí opačně (položka navíc / vratná záloha)',()=>{
  const r=chk({total:180,items:[{lineTotal:100},{lineTotal:100}]});
  assert(r&&!r.ok&&r.chybi===false,'nerozlišuje směr: '+JSON.stringify(r));
});
check('zaokrouhlení hotovosti do 1 Kč projde',()=>{
  assert(chk({total:250,items:[{lineTotal:249.4}]}).ok,'1 Kč tolerance nefunguje');
  assert(!chk({total:250,items:[{lineTotal:248}]}).ok,'2 Kč rozdíl se má ohlásit');
});
check('používá lineAmt, ne price×qty (sleva se promítne)',()=>{
  // 2 ks po 30 se slevou na 50; suma dokladu 50
  const r=chk({total:50,items:[{price:30,qty:2,lineTotal:50}]});
  assert(r&&r.ok,'sleva ignorována → falešné hlášení: '+JSON.stringify(r));
});
check('bez sumy nebo bez položek se nekontroluje',()=>{
  assert(chk({total:0,items:[{lineTotal:10}]})===null,'kontroluje bez sumy');
  assert(chk({total:100,items:[]})===null,'kontroluje bez položek');
  assert(chk(null)===null,'spadne na null');
});
check('text odkazuje na EXISTUJÍCÍ ovládání',()=>{
  assert(!/\+ Položka<\/strong>/.test(src),'odkazuje na tlačítko, které v UI není');
  assert(/rpAddItem/.test(src),'funkce pro přidání položky chybí');
});
console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ ÚPLNOST ÚČTENKY OVĚŘENA');
process.exit(fails?1:0);
