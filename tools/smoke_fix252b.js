// FIX-252 fáze A+B – regrese: přesuny mimo výdaje, ale skóre spoření zachováno.
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('helpers.js','utf8');
const pick=(n,k)=>{const i=src.indexOf(k+n);let d=0,j=src.indexOf('{',i);
  for(let x=j;x<src.length;x++){if(src[x]==='{')d++;else if(src[x]==='}'){d--;if(!d)return src.slice(i,x+1)+(k.startsWith('const')?';':'')}}};
let DATA=null;
const sb={console,Date,Math,Set,Object,Array,Number,isNaN,isFinite,get S(){return{curMonth:7,curYear:2026}},
  SEASON:Object.fromEntries([...Array(12)].map((_,i)=>[i,{mult:1}])),
  getData:()=>DATA,
  getTx:(m,y,D)=>((D||DATA).transactions||[]).filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y}),
  getCat:(id,c)=>(c||[]).find(x=>x.id===id)||{}};
sb.window=sb;vm.createContext(sb);
vm.runInContext(src.match(/const isTransferTx=[^\n]*/)[0],sb);
vm.runInContext(src.match(/const txCZK=[\s\S]*?\n};/)[0],sb);
vm.runInContext(pick('getActual','const '),sb);
vm.runInContext(pick('getHistAvg','function '),sb);
vm.runInContext(pick('predictCat','function '),sb);

let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m||'assert')};
const g=c=>vm.runInContext(`getActual("${c}",null,7,2026,getData())`,sb);

DATA={categories:[
  {id:'cat_t_savings',name:'Spoření',type:'transfer',isSaving:true},
  {id:'cat_t_invest', name:'Investice',type:'transfer',isSaving:true},
  {id:'cat32',name:'Půjčka',type:'both'},
  {id:'cat20',name:'Jídlo',type:'expense'}],
 transactions:[
  {id:'1',type:'expense',catId:'cat_t_savings',amount:5000,date:'2026-08-05'},
  {id:'2',type:'expense',catId:'cat_t_invest', amount:3000,date:'2026-08-06'},
  {id:'3',type:'expense',catId:'cat32',transferId:'tr1',amount:4000,date:'2026-08-07'},
  {id:'4',type:'expense',catId:'cat32',amount:1500,date:'2026-08-08'},
  {id:'5',type:'expense',catId:'cat20',amount:2200,date:'2026-08-09'},
  {id:'6',type:'expense',catId:'cat20',amount:100,amtCZK:2500,date:'2026-08-10'}]};
vm.runInContext("window._transferCatIds=new Set(getData().categories.filter(c=>c.type==='transfer').map(c=>c.id))",sb);

console.log('── FÁZE B · přesuny ──');
check('SKÓRE ZACHOVÁNO: spoření + investice = 8000 (ne 0)',()=>{
  const tot=DATA.categories.filter(c=>c.isSaving).reduce((a,c)=>a+g(c.id),0);
  assert(tot===8000,'totalSaved='+tot+' → S4 a savingScore by se rozbily');
});
check('přesun pod kategorií "both" už není výdaj (5500 → 1500)',()=>{
  assert(g('cat32')===1500,'Půjčka='+g('cat32'));
});
check('běžná výdajová kategorie nedotčena, cizí měna v CZK',()=>{
  assert(g('cat20')===4700,'Jídlo='+g('cat20')+' (2200 + 2500 z EUR)');
});
check('getHistAvg zrcadlí getActual i pro přesunovou kategorii',()=>{
  const h=vm.runInContext('getHistAvg("cat_t_savings",null,8,2026,getData())',sb);
  assert(Math.round(h)===5000,'histAvg='+h+' – u spoření se musí chovat stejně jako getActual');
});
check('getHistAvg zrcadlí getActual i pro "both" s přesunem',()=>{
  const h=vm.runInContext('getHistAvg("cat32",null,8,2026,getData())',sb);
  assert(Math.round(h)===g('cat32'),`predikce ${Math.round(h)} != skutečnost ${g('cat32')}`);
});
check('SOUČET ŘÁDKŮ = CELKOVÝ SOUČET (rozpor v Souhrnu odstraněn)',()=>{
  const expCats=DATA.categories.filter(c=>c.type==='expense'||c.type==='both');
  const rows=expCats.reduce((a,c)=>a+g(c.id),0);
  const total=DATA.transactions.filter(t=>t.type==='expense'&&!t.isBalancing&&!t.splitParent
    &&!vm.runInContext('isTransferTx',sb)(t)).reduce((a,t)=>a+(t.amtCZK!=null?t.amtCZK:t.amount),0);
  assert(rows===total,`řádky ${rows} != součet ${total}`);
});

console.log('\n── FÁZE A · txCZK (statická kontrola) ──');
check('žádné surové sčítání nezůstalo v opravených souborech',()=>{
  const bad=[];
  ['projects.js','stats.js','ui.js','debts.js','ai.js','helpers.js'].forEach(f=>{
    fs.readFileSync(f,'utf8').split('\n').forEach((l,i)=>{
      if(/a\+\(t\.amount\|\|t\.amt\|\|0\)|a\+t\.amt\b/.test(l)) bad.push(`${f}:${i+1}`);
    });
  });
  assert(!bad.length,'zbylo: '+bad.join(', '));
});
console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ FÁZE A+B OVĚŘENA');
process.exit(fails?1:0);
