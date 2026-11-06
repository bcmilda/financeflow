// FinanceFlow · v10.77 · tools/smoke_retezec.js · 2026-09-16
// ══════════════════════════════════════════════════════════════════════
//  PRŮCHOD ŘETĚZCEM: účtenka → transakce → editace → statistiky
//
//  Proč: v S22 se řetězec měnil na třech místech (jedna transakce místo sedmi,
//  kontrola součtu, tagy z položek). Tenhle test hlídá, že se po cestě čísla
//  neztrácejí ani nezdvojují – a hlavně, že EDITACE účtenky nezničí rozpad.
// ══════════════════════════════════════════════════════════════════════
const fs=require('fs'), vm=require('vm');
let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n);}catch(e){fails++;console.log('  ❌',n,'→',e.message);}};
const assert=(c,m)=>{if(!c)throw new Error(m);};
const blizko=(a,b,t)=>Math.abs(a-b)<=(t||0.01);
const rec=fs.readFileSync('receipts.js','utf8');
const prj=fs.readFileSync('projects.js','utf8');
function vytahni(src,n){const i=src.indexOf('function '+n);assert(i>=0,'chybi '+n);let d=0;
  for(let k=src.indexOf('{',i);k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1);}}}

const sb={console,Math,Object,Array,Number,parseFloat,parseInt,isFinite,Set,JSON,Date,String};
vm.createContext(sb);
vm.runInContext(`
  var S={transactions:[],receipts:[]};
  var _D={categories:[{id:'c1',name:'Jídlo & Nákupy'},{id:'c2',name:'Drogerie'}]};
  function getData(){return _D;}
  function genTxId(){return 't'+(S.transactions.length+1);}
  function lookupCategoryMapping(){return null;}
  function saveCategoryMapping(){}
  function updateItemStats(){return {catch:function(){}};}
  function save(){} function fmtP(v){return String(v);} function publishPricesToCatalog(){}
  var document={getElementById:function(){return null;}};
  var _lastReceiptResult=null; function renderUctenky(){}
`,sb);
vm.runInContext(vytahni(rec,'addReceiptAsTx'),sb);
vm.runInContext(vytahni(rec,'syncReceiptToTransactions'),sb);

//  Milanův Kaufland – položky ve dvou kategoriích
const uctenka=()=>({ date:'2026-09-12', store:'Kaufland', total:500, subtotal:500,
  items:[
    {name:'Rohlík',  price:10, qty:1, lineTotal:10,  itemCatId:'c1', itemSubcat:'Pečivo', tag:'Pečivo'},
    {name:'Maso',    price:290,qty:1, lineTotal:290, itemCatId:'c1', tag:'Maso'},
    {name:'Šampon',  price:200,qty:1, lineTotal:200, itemCatId:'c2', tag:'Drogerie'},
  ]});

console.log('── Účtenka → transakce ──');
let r0=uctenka();
sb.__r=r0; vm.runInContext('addReceiptAsTx(__r)',sb);
const tx=()=>sb.S.transactions[0];

check('jedna transakce v plné výši',()=>{
  assert(sb.S.transactions.length===1,'transakcí '+sb.S.transactions.length);
  assert(tx().amount===500,'částka '+tx().amount);
});
check('rozpad nese všechny položky i s kategoriemi',()=>{
  assert(tx().receiptItems.length===3,'položek '+tx().receiptItems.length);
  assert(tx().receiptItems.every(x=>x.itemCatId),'položky bez kategorie');
  assert(tx().receiptItems[0].itemSubcat==='Pečivo','podkategorie se ztratila');
});
check('součet položek sedí na částku transakce',()=>{
  const s=tx().receiptItems.reduce((a,x)=>a+x.lineTotal,0);
  assert(blizko(s,500),'součet položek '+s+' vs '+tx().amount);
});

console.log('\n── Editace účtenky v Historii ──');
check('KLÍČOVÉ · editace NEODMAŽE položky jiných kategorií',()=>{
  //  Transakce má catId podle největší kategorie (c1). Starý filtr by ponechal
  //  jen položky c1 a šampon by zmizel.
  const r=uctenka();
  sb.__r2=r; vm.runInContext('syncReceiptToTransactions(__r2)',sb);
  assert(tx().receiptItems.length===3,'po editaci zbylo '+tx().receiptItems.length+' z 3 položek');
});
check('editace nezahodí kategorie položek',()=>{
  assert(tx().receiptItems.every(x=>x.itemCatId),'itemCatId se ztratilo');
  assert(tx().receiptItems.some(x=>x.itemSubcat==='Pečivo'),'itemSubcat se ztratilo');
});
check('změna ceny na účtence se promítne do transakce',()=>{
  const r=uctenka(); r.total=650; r.items[1].lineTotal=440; r.items[1].price=440;
  sb.__r3=r; vm.runInContext('syncReceiptToTransactions(__r3)',sb);
  assert(tx().amount===650,'transakce zůstala na '+tx().amount+' místo 650');
  assert(tx().receiptItems[1].lineTotal===440,'položka nese '+tx().receiptItems[1].lineTotal);
});
check('smazaný tag z účtenky zmizí i z transakce',()=>{
  const r=uctenka(); r.items.forEach(it=>{ delete it.tag; });
  sb.__r4=r; vm.runInContext('syncReceiptToTransactions(__r4)',sb);
  assert(!tx().tags,'tagy zůstaly: '+tx().tags);
});
check('položka bez lineTotal se dopočítá z ceny a množství',()=>{
  const r=uctenka(); delete r.items[0].lineTotal; r.items[0].price=7; r.items[0].qty=3;
  sb.__r5=r; vm.runInContext('syncReceiptToTransactions(__r5)',sb);
  assert(tx().receiptItems[0].lineTotal===21,'dopočet '+tx().receiptItems[0].lineTotal);
});

console.log('\n── Hodnocení útrat: žádné dvojí započtení ──');
check('transakce s hodnocenou položkou se nepočítá zvlášť',()=>{
  assert(/_hodnocenoVUctence/.test(prj),'ochrana proti dvojímu započtení chybí');
  assert(/if \(!t\.priority\) return false;/.test(prj),'filtr transakcí se nezměnil');
});
check('přednost mají položky, ne transakce (jsou konkrétnější)',()=>{
  const i=prj.indexOf('_hodnocenoVUctence');
  const usek=prj.slice(i-700,i+700);
  assert(/Přednost mají POLOŽKY/.test(usek),'není zdokumentováno, co má přednost');
});

console.log('\n── Nezávislost Inflace a COICOP ──');
check('Inflace čte S.receipts, ne položky na transakci',()=>{
  const infl=fs.readFileSync('inflace.js','utf8');
  assert(/S\.receipts/.test(infl),'Inflace nečte účtenky');
  assert(!/receiptItems/.test(infl),'Inflace závisí na rozpadu v transakci');
});
check('COICOP čte S.receipts',()=>{
  const co=fs.readFileSync('coicop.js','utf8');
  assert(/S\.receipts/.test(co),'COICOP nečte účtenky');
  assert(!/receiptItems/.test(co),'COICOP závisí na rozpadu v transakci');
});
console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ ŘETĚZEC OVĚŘEN');
process.exit(fails?1:0);
