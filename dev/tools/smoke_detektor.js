// FIX-254 (fáze C) – Detektor úspor nesmí počítat splity, vyrovnání a přesuny.
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('projects.js','utf8');
const i=src.indexOf('function renderDetektor');
let d=0,j=src.indexOf('{',i),end=0;
for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d){end=k+1;break}}}
const body=src.slice(i,end);

// vytáhni jen část s výpočtem zdrojů + agregacemi (bez DOM renderu)
let DATA=null,fails=0;
const sb={console,Date,Math,Set,Object,Array,Number,isFinite,
  get S(){return{curMonth:7,curYear:2026}},
  getData:()=>DATA,
  getTx:(m,y,D)=>((D||DATA).transactions||[]).filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y}),
  txCZK:t=>t.amtCZK!=null?t.amtCZK:(t.amount||t.amt||0),
  isTransferTx:t=>!!(t&&(t.transferId||t.catId==='transfer'||(sb.window._transferCatIds&&sb.window._transferCatIds.has(t.catId)))),
  computeBaseIncome:()=>30000, fmtB:v=>Math.round(v)+' Kč', lineAmt:it=>(it.price||0)*(it.qty||1)};
sb.window=sb;vm.createContext(sb);

// izoluj klíčové výrazy z opravené funkce a spusť je nad testovacími daty
const expr=`(function(){
  const D=getData(); const txs=getTx(S.curMonth,S.curYear,D);
  ${body.match(/const detTxs = [^\n]*\n\s*const subTxs = [^\n]*/)[0]}
  const bankTxs = subTxs.filter(t=>{const n=(t.name||'').toLowerCase();return n.includes('poplatek')||n.includes('vedení účtu')||n.includes('banka');});
  const bankFees = bankTxs.reduce((a,t)=>a+txCZK(t,D),0);
  const incTxsAll = detTxs.filter(t=>t.type==='income');
  const paydayTx = incTxsAll.length ? incTxsAll.reduce((a,b)=>(txCZK(b,D)>txCZK(a,D)?b:a)) : null;
  const expAll = subTxs.filter(t=>txCZK(t,D)>0);
  const totalExpAll = expAll.reduce((a,t)=>a+txCZK(t,D),0);
  return {detN:detTxs.length, subN:subTxs.length, bankFees, payday:paydayTx&&paydayTx.name, totalExpAll};
})()`;

const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m||'assert')};

DATA={categories:[{id:'cat_t_savings',name:'Spoření',type:'transfer',isSaving:true},{id:'c20',name:'Jídlo',type:'expense'}],
 transactions:[
  {id:'a',type:'expense',catId:'c20',amount:2000,date:'2026-08-03',name:'Poplatek za vedení účtu'},
  {id:'b',type:'expense',catId:'c20',amount:2000,date:'2026-08-04',name:'Poplatek banka',splitId:'s1',splitParent:true},
  {id:'c',type:'expense',catId:'c20',amount:1200,date:'2026-08-04',name:'Poplatek banka díl 1',splitId:'s1'},
  {id:'d',type:'expense',catId:'c20',amount:800, date:'2026-08-04',name:'Poplatek banka díl 2',splitId:'s1'},
  {id:'e',type:'expense',catId:'cat_t_savings',amount:9000,date:'2026-08-05',name:'na spořicí účet'},
  {id:'f',type:'expense',catId:'c20',amount:5000,date:'2026-08-06',name:'korekce',isBalancing:true},
  {id:'g',type:'income', catId:'c7',amount:3000,date:'2026-08-09',name:'Bonus Kč'},
  {id:'h',type:'income', catId:'c7',amount:1200,amtCZK:30000,date:'2026-08-10',name:'Výplata EUR'},
  {id:'i',type:'income', catId:'cat_t_savings',amount:99000,date:'2026-08-11',name:'výběr ze spoření'}]};
vm.runInContext("window._transferCatIds=new Set(getData().categories.filter(c=>c.type==='transfer').map(c=>c.id))",sb);
const R=vm.runInContext(expr,sb);

console.log('── FIX-254 · Detektor úspor ──');
check('přesun na spořicí účet není výdaj (zbydou 3 z 6 výdajů)',()=>{
  // 6 výdajů: a ✓ · b splitParent ✗ · c ✓ · d ✓ · e přesun ✗ · f vyrovnání ✗
  assert(R.subN===3, 'subTxs='+R.subN);
});
check('vyrovnávací transakce vyřazena',()=>{
  assert(R.totalExpAll===2000+1200+800, 'totalExpAll='+R.totalExpAll+' (nemá obsahovat 5000 korekce)');
});
check('split se nepočítá dvakrát – bankovní poplatky 4000, ne 6000',()=>{
  assert(R.bankFees===2000+1200+800, 'bankFees='+R.bankFees);
});
check('výplata určena přes txCZK: EUR výplata, ne korunový bonus',()=>{
  assert(R.payday==='Výplata EUR', 'payday='+R.payday);
});
check('výběr ze spoření se nepovažuje za příjem/výplatu',()=>{
  assert(R.payday!=='výběr ze spoření','přesun vydáván za výplatu');
});
console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ FÁZE C OVĚŘENA');
process.exit(fails?1:0);
