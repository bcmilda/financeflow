// S20 – kontrola integrity dat v admin panelu (bod 3 z rešerše admin panelu).
// Hledá nesrovnalosti, které se v UI neprojeví chybou, jen tiše špatným číslem.
// Test hlídá hlavně DVĚ věci: že kontrola najde, co má, a že na čistých datech
// NEHLÁSÍ nic (falešný poplach by ji udělal nepoužitelnou).
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('admin.js','utf8');
const i=src.indexOf('function runIntegrityCheck');
let d=0,j=src.indexOf('{',i),end=0;
for(let k=j;k<src.length;k++){if(src[k]=='{')d++;else if(src[k]=='}'){d--;if(!d){end=k+1;break}}}

function run(D){
  const els={integrityResult:{innerHTML:''}};
  const sb={console,Math,Number,Date,isNaN,parseFloat,Object,Set,Array,String,
    getData:()=>D, document:{getElementById:id=>els[id]}};
  vm.createContext(sb); vm.runInContext(src.slice(i,end),sb);
  vm.runInContext('runIntegrityCheck()',sb);
  return els.integrityResult.innerHTML;
}
const CLEAN={categories:[{id:'c1',type:'expense',healthPct:30}],
  wallets:[{id:'w1',currency:'CZK'}],
  transactions:[{id:'t1',catId:'c1',wallet:'w1',date:'2026-08-05',amount:100,type:'expense'}],
  debts:[],wishes:[],assets:[]};

let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m||'assert')};
const clone=o=>JSON.parse(JSON.stringify(o));

console.log('── Kontrola integrity dat ──');

check('čistá data → žádný poplach',()=>{
  const h=run(CLEAN);
  assert(/Nic k nahl\u00e1\u0161en\u00ed/.test(h),'hlásí problém na čistých datech: '+h.replace(/<[^>]*>/g,'').slice(0,120));
});
check('transakce na smazanou peněženku (riziko špatné měny)',()=>{
  const D=clone(CLEAN); D.transactions.push({id:'t2',wallet:'nope',date:'2026-08-06',amount:50,type:'expense'});
  assert(/smazanou pen\u011b\u017eenku/.test(run(D)),'nenašlo');
});
check('transakce na smazanou kategorii',()=>{
  const D=clone(CLEAN); D.transactions.push({id:'t3',catId:'nope',wallet:'w1',date:'2026-08-06',amount:50,type:'expense'});
  assert(/smazanou kategorii/.test(run(D)),'nenašlo');
});
check('rozdělená transakce bez položek',()=>{
  const D=clone(CLEAN); D.transactions.push({id:'t4',splitParent:true,splitId:'s1',wallet:'w1',catId:'c1',date:'2026-08-06',amount:500,type:'expense'});
  assert(/bez polo\u017eek/.test(run(D)),'nenašlo osamocený split');
});
check('rozdělená transakce S položkami se NEhlásí',()=>{
  const D=clone(CLEAN);
  D.transactions.push({id:'t5',splitParent:true,splitId:'s2',wallet:'w1',catId:'c1',date:'2026-08-06',amount:500,type:'expense'});
  D.transactions.push({id:'t6',splitId:'s2',wallet:'w1',catId:'c1',date:'2026-08-06',amount:500,type:'expense'});
  assert(!/bez polo\u017eek/.test(run(D)),'falešný poplach u korektního splitu');
});
check('přesun jen s jednou stranou',()=>{
  const D=clone(CLEAN); D.transactions.push({id:'t7',transferId:'x1',wallet:'w1',date:'2026-08-06',amount:100,type:'expense'});
  assert(/jednou stranou/.test(run(D)),'nenašlo');
});
check('úplný přesun se NEhlásí',()=>{
  const D=clone(CLEAN);
  D.transactions.push({id:'t8',transferId:'x2',wallet:'w1',date:'2026-08-06',amount:100,type:'expense'});
  D.transactions.push({id:'t9',transferId:'x2',wallet:'w1',date:'2026-08-06',amount:100,type:'income'});
  assert(!/jednou stranou/.test(run(D)),'falešný poplach u korektního přesunu');
});
check('splátka nepokryje úrok (dluh neklesá)',()=>{
  const D=clone(CLEAN); D.debts.push({creditor:'Banka',remaining:1000000,interest:12,payment:5000});
  const h=run(D);
  assert(/nepokryje ani \u00farok/.test(h),'nenašlo');
  assert(/Banka/.test(h),'chybí jméno věřitele');
});
check('zdravá splátka se NEhlásí',()=>{
  const D=clone(CLEAN); D.debts.push({creditor:'OK',remaining:100000,interest:5,payment:5000});
  assert(!/nepokryje/.test(run(D)),'falešný poplach');
});
check('limity kategorií nad 100 %',()=>{
  const D=clone(CLEAN);
  D.categories.push({id:'c2',type:'expense',healthPct:60});
  D.categories.push({id:'c3',type:'transfer',healthPct:30,isInvest:true});
  assert(/120 % p\u0159\u00edjmu/.test(run(D)),'špatný součet');
});
check('transakce bez platného data',()=>{
  const D=clone(CLEAN); D.transactions.push({id:'t10',wallet:'w1',catId:'c1',date:'',amount:10,type:'expense'});
  assert(/bez platn\u00e9ho data/.test(run(D)),'nenašlo');
});
check('aktivum na smazané kategorii',()=>{
  const D=clone(CLEAN); D.assets.push({id:'a1',name:'X',value:100,linkedCatId:'nope'});
  assert(/aktivum napojen\u00e9 na smazanou/.test(run(D)),'nenašlo');
});
check('prázdná data nespadnou',()=>{
  const h=run({});
  assert(/Nic k nahl\u00e1\u0161en\u00ed/.test(h),'prázdná data hlásí problém');
});

console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ KONTROLA INTEGRITY OVĚŘENA');
process.exit(fails?1:0);
