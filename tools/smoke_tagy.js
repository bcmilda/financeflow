// FinanceFlow · v10.75 · tools/smoke_tagy.js · 2026-09-16
// S22 · Tagy ukazovaly nesmyslné částky (nahlásil Milan na živých datech).
// Původně se ke KAŽDÉMU tagu přičetla CELÁ částka transakce. Jenže tagy chodí
// z analýzy účtenky – jeden nákup nese Pečivo, Ovoce, Zelenina… Nákup za 995 Kč
// se započítal sedmkrát v plné výši a stránka tvrdila, že za zeleninu padlo 995 Kč.
const fs=require('fs'), vm=require('vm');
let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n);}catch(e){fails++;console.log('  ❌',n,'→',e.message);}};
const assert=(c,m)=>{if(!c)throw new Error(m);};
const blizko=(a,b,t)=>Math.abs(a-b)<=(t||0.01);
const src=fs.readFileSync('admin.js','utf8');
function vytahni(n){const i=src.indexOf('function '+n);assert(i>=0,'chybi '+n);let d=0;
  for(let k=src.indexOf('{',i);k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1);}}}

const sb={console,Math,Object,Array,Number,parseFloat,isFinite,String};
vm.createContext(sb);
vm.runInContext(`
  function parseTxTags(t){ return (t.tags||'').split(/\\s+/).filter(Boolean).map(s=>s.replace(/^#/,'')); }
  function txCZK(t){ return t.amount||t.amt||0; }
  function getData(){ return globalThis.__D; }
`,sb);
vm.runInContext(vytahni('getAllTags'),sb);
const tagy=(D)=>{sb.__D=D; return vm.runInContext('getAllTags(__D)',sb);};

//  Milanův nákup: jedna transakce 995 Kč, sedm tagů z položek
const nakup={ transactions:[{
  id:'t1', amount:995, tags:'Pečivo Ovoce Zelenina Těstoviny',
  receiptItems:[
    {name:'Rohlík',   lineTotal:100, tag:'Pečivo'},
    {name:'Chléb',    lineTotal:45,  tag:'Pečivo'},
    {name:'Jablka',   lineTotal:250, tag:'Ovoce'},
    {name:'Mrkev',    lineTotal:100, tag:'Zelenina'},
    {name:'Špagety',  lineTotal:500, tag:'Těstoviny'},
  ]}]};

console.log('── Tag z položek bere jen své položky ──');
check('KLÍČOVÉ · zelenina nestojí celý nákup',()=>{
  const z=tagy(nakup).find(x=>x.name==='Zelenina');
  assert(z,'tag Zelenina chybí');
  assert(blizko(z.total,100),'zelenina za '+z.total+' místo 100');
});
check('tag na více položkách je sečte',()=>{
  const p=tagy(nakup).find(x=>x.name==='Pečivo');
  assert(blizko(p.total,145),'pečivo za '+p.total+' místo 145');
});
check('součet všech tagů dá částku transakce, ne její násobek',()=>{
  const celkem=tagy(nakup).reduce((a,x)=>a+x.total,0);
  assert(blizko(celkem,995,0.5),'součet '+celkem+' místo 995');
});
check('stará chyba je pryč: žádný tag nemá plných 995',()=>{
  assert(!tagy(nakup).some(x=>blizko(x.total,995)),'tag pořád nese celou transakci');
});
check('počet transakcí zůstává správný',()=>{
  const p=tagy(nakup).find(x=>x.name==='Pečivo');
  assert(p.count===1,'počet '+p.count);
});

console.log('\n── Ruční tag na celé transakci ──');
check('tag, který na žádné položce není, bere celou částku',()=>{
  const D={transactions:[{id:'t1',amount:995,tags:'Pečivo dovolená',
    receiptItems:[{name:'Rohlík',lineTotal:100,tag:'Pečivo'},
                  {name:'Jablka',lineTotal:895,tag:'Ovoce'}]}]};
  const d=tagy(D).find(x=>x.name==='dovolená');
  assert(blizko(d.total,995),'ruční tag za '+d.total+' místo 995');
});
check('transakce bez položek (ruční výdaj) funguje jako dřív',()=>{
  const D={transactions:[{id:'t1',amount:500,tags:'dovolená'}]};
  assert(blizko(tagy(D)[0].total,500),'částka '+tagy(D)[0].total);
});

console.log('\n── Zaokrouhlení a měny ──');
check('zaokrouhlení účtenky se rozpustí poměrem (nezmizí ani nepřebývá)',()=>{
  //  SOUČET položek 122,60 · ZAPLACENO 123,00
  const D={transactions:[{id:'t1',amount:123,tags:'Maso Uzeniny',
    receiptItems:[{lineTotal:61.30,tag:'Maso'},{lineTotal:61.30,tag:'Uzeniny'}]}]};
  const celkem=tagy(D).reduce((a,x)=>a+x.total,0);
  assert(blizko(celkem,123,0.02),'součet '+celkem+' místo 123');
});
check('částka se bere přes txCZK (cizí měny)',()=>{
  assert(/txCZK\(t, D2\)/.test(src),'nepoužívá txCZK – cizí měna by se sčítala nominálně');
});

console.log('\n── Zobrazení ──');
check('proužek měří peníze, ne počet transakcí',()=>{
  assert(/tag\.total \/ maxCastka/.test(src),'proužek pořád podle počtu');
});
check('řadí se podle částky, ne podle počtu',()=>{
  assert(/sort\(\(a,b\) => b\.total - a\.total\)/.test(src),'řazení podle počtu');
});
check('částka nese měnu (PAST 3 z smoke_mena)',()=>{
  assert(!/\$\{fmt\(Math\.round\(tag\.total\)\)\} Kč/.test(src),'fmt bez převodu měny');
  assert(/fmtB\(Math\.round\(tag\.total\)\)/.test(src),'nepoužívá fmtB');
});
console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ TAGY OVĚŘENY');
process.exit(fails?1:0);
