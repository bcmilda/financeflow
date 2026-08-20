// TODO-215 fáze 2+3 – výpočet a rozpad kurzových ztrát.
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('helpers.js','utf8');
const pick=n=>{const i=src.indexOf('function '+n);let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};
let DATA={wallets:[{id:'w1',name:'ČSOB',icon:'💳'}],payTypes:[
  {id:'p1',name:'Karta',icon:'💳'},{id:'p2',name:'Bankomat',icon:'🏧'},{id:'p3',name:'Přepážka',icon:'🏦'}]};
const sb={console,Math,Object,Array,isFinite,Number,getData:()=>DATA};
sb.window=sb;vm.createContext(sb);
vm.runInContext(pick('fxLossOf')+'\n'+pick('fxLossSummary'),sb);
const loss=vm.runInContext('fxLossOf',sb), sum=vm.runInContext('fxLossSummary',sb);

let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m)};

console.log('── TODO-215/2 · výpočet ztráty ──');
check('20 € za 594 Kč proti ČNB 24,16 → 111 Kč (+22,9 %)',()=>{
  const r=loss({currency:'EUR',amount:20,amtCZK:594,fxRef:24.16});
  assert(Math.abs(r.loss-110.8)<0.2,'ztráta '+r.loss.toFixed(1));
  assert(Math.abs(r.pct-22.9)<0.2,'pct '+r.pct.toFixed(1));
});
check('LEPŠÍ kurz než ČNB vyjde záporně, ne nulově',()=>{
  const r=loss({currency:'EUR',amount:100,amtCZK:2400,fxRef:24.16});
  assert(r.loss<0,'loss '+r.loss+' – výhodná směna se má ukázat jako zisk');
});
check('korunová transakce nemá kurzovou ztrátu',()=>{
  assert(loss({amount:500,amtCZK:500})===null);
  assert(loss({currency:'CZK',amount:500,amtCZK:500,fxRef:1})===null);
});
check('chybějící fxRef → null (nedopočítáváme)',()=>{
  assert(loss({currency:'EUR',amount:20,amtCZK:594})===null);
});
check('nulový kurz nebo nulová částka nespadne na dělení nulou',()=>{
  assert(loss({currency:'EUR',amount:0,amtCZK:594,fxRef:24})===null);
  assert(loss({currency:'EUR',amount:20,amtCZK:594,fxRef:0})===null);
});

console.log('\n── fáze 3 · rozpad podle způsobu platby ──');
const txs=[
  {id:'1',currency:'EUR',amount:100,amtCZK:2465,fxRef:24.16,wallet:'w1',payType:'p1'},  // +2 %
  {id:'2',currency:'EUR',amount:100,amtCZK:2465,fxRef:24.16,wallet:'w1',payType:'p1'},
  {id:'3',currency:'EUR',amount:200,amtCZK:5240,fxRef:24.16,wallet:'w1',payType:'p2'},  // +8,4 %
  {id:'4',currency:'EUR',amount:100,amtCZK:2687,fxRef:24.16,wallet:'w1',payType:'p3'},  // +11,2 %
  {id:'5',currency:'EUR',amount:50,amtCZK:1300,wallet:'w1',payType:'p1'},               // bez fxRef
  {id:'6',currency:'EUR',amount:99,amtCZK:9999,fxRef:24.16,splitParent:true},           // split
  {id:'7',amount:500,amtCZK:500,wallet:'w1',payType:'p1'}];                             // CZK
check('souhrn počítá jen transakce s oběma čísly',()=>{
  const r=sum(txs,DATA);
  assert(r.n===4,'n='+r.n);
  assert(r.missing===1,'missing='+r.missing+' – uživatel musí vědět, že souhrn není z celé historie');
});
check('split se do souhrnu nedostane',()=>{
  assert(sum(txs,DATA).n===4,'prosákl splitParent');
});
check('rozpad seřadí způsoby platby a spočte přirážku',()=>{
  const r=sum(txs,DATA);
  const byPct=r.pays.slice().sort((a,b)=>b.pct-a.pct);
  assert(/Přepážka/.test(byPct[0].label),'nejdražší '+byPct[0].label);
  assert(/Karta/.test(byPct[byPct.length-1].label),'nejlevnější '+byPct[byPct.length-1].label);
  assert(Math.abs(byPct[0].pct-11.2)<0.3,'přepážka '+byPct[0].pct.toFixed(1));
});
check('celková přirážka je vážená částkou, ne průměr procent',()=>{
  const r=sum(txs,DATA);
  assert(r.pct>2&&r.pct<11,'celkem '+r.pct.toFixed(1)+' – musí ležet mezi nejlevnějším a nejdražším');
});
check('prázdný vstup vrátí nuly, ne NaN',()=>{
  const r=sum([],DATA);
  assert(r.n===0&&r.loss===0&&isFinite(r.pct),'pct '+r.pct);
});
console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ KURZOVÉ ZTRÁTY OVĚŘENY');
process.exit(fails?1:0);
