// FinanceFlow · v10.73 · tools/smoke_jednatx.js · 2026-09-16
// S22 · JEDNA ÚČTENKA = JEDNA TRANSAKCE (oprava vedlejšího produktu z v6.88/S9).
// Zadání TODO-014 bylo o KATEGORIZACI (učení obchodník→kategorie), ne o dělení
// nákupu. Dělení vyrobilo z jednoho Kauflandu sedm řádků a celková zaplacená
// částka nebyla nikde.
const fs=require('fs'), vm=require('vm');
let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n);}catch(e){fails++;console.log('  ❌',n,'→',e.message);}};
const assert=(c,m)=>{if(!c)throw new Error(m);};
const src=fs.readFileSync('receipts.js','utf8');
function vytahni(n){const i=src.indexOf('function '+n);assert(i>=0,'chybi '+n);let d=0;
  for(let k=src.indexOf('{',i);k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1);}}}

const sb={console,Math,Number,parseFloat,parseInt,isFinite,Object,Array,Set,JSON,Date,String};
vm.createContext(sb);
let mapovani=[];
vm.runInContext(`
  var S={transactions:[],receipts:[]};
  var _D={categories:[{id:'c1',name:'Jídlo & Nákupy'},{id:'c2',name:'Drogerie'},{id:'c3',name:'Zdraví'}]};
  function getData(){return _D;}
  function genTxId(){return 't'+(S.transactions.length+1);}
  function lookupCategoryMapping(){return null;}
  function saveCategoryMapping(k,c){globalThis.__map.push([k,c]);}
  function updateItemStats(){return {catch:function(){}};}
  function save(){return null;}
  function fmtP(v){return String(v);}
  function publishPricesToCatalog(){}
  var document={getElementById:function(){return null;}};
  var _lastReceiptResult=null;
  function renderUctenky(){}
`,sb);
sb.__map=mapovani;
vm.runInContext(vytahni('addReceiptAsTx'),sb);
const pridej=(r)=>{sb.__r=r; sb.__map.length=0; sb.S.transactions=[]; sb.S.receipts=[];
  vm.runInContext('addReceiptAsTx(__r)',sb); return sb.S.transactions;};

//  Milanův Kaufland: položky ve třech kategoriích, zaplaceno 1490,99
const kaufland={ date:'2026-09-12', store:'Kaufland Česká republika v.o.s.',
  total:1490.99, subtotal:1490.99,
  items:[
    {name:'Rohlík', price:2.90, qty:4, lineTotal:11.60, itemCatId:'c1'},
    {name:'Hovězí mleté', price:181.90, qty:0.708, lineTotal:128.79, itemCatId:'c1'},
    {name:'Linteo Gr.Tea', price:149.90, qty:1, lineTotal:149.90, itemCatId:'c2'},
    {name:'Dobrý sirup', price:59.90, qty:1, lineTotal:59.90, itemCatId:'c3'},
  ]};

console.log('── Jedna účtenka = jedna transakce ──');
check('vznikne PRÁVĚ JEDNA transakce, ne sedm',()=>{
  const t=pridej(kaufland);
  assert(t.length===1,'vzniklo '+t.length+' transakcí');
});
check('částka je ta, co byla ZAPLACENA',()=>{
  assert(pridej(kaufland)[0].amount===1490.99,'částka '+pridej(kaufland)[0].amount);
});
check('kategorie transakce = ta s nejvíc penězi',()=>{
  //  c1 = 140,39 · c2 = 149,90 · c3 = 59,90  → vyhrává c2
  assert(pridej(kaufland)[0].catId==='c2','catId '+pridej(kaufland)[0].catId);
});
check('KLÍČOVÉ · kategorie položek se NEZTRATÍ (žijí v receiptItems)',()=>{
  const ri=pridej(kaufland)[0].receiptItems;
  assert(ri && ri.length===4,'položek '+(ri&&ri.length));
  assert(ri.filter(x=>x.itemCatId).length===4,'položky přišly o kategorie');
  assert(ri[2].itemCatId==='c2','třetí položka má '+ri[2].itemCatId);
});
check('lineTotal má přednost před price×qty (nese slevu)',()=>{
  const t=pridej({date:'2026-09-12',store:'X',total:49.90,
    items:[{name:'Ramen',price:49.90,qty:2,lineTotal:49.90,itemCatId:'c1'}]});
  assert(t[0].amount===49.90,'sleva se ztratila: '+t[0].amount);
  assert(t[0].receiptItems[0].lineTotal===49.90,'položka nese '+t[0].receiptItems[0].lineTotal);
});

console.log('\n── Učení mapování (skutečné zadání TODO-014) ──');
check('uloží se mapování za KAŽDOU položku',()=>{
  pridej(kaufland);
  const klice=sb.__map.map(x=>x[0]);
  ['Rohlík','Hovězí mleté','Linteo Gr.Tea','Dobrý sirup'].forEach(n=>
    assert(klice.indexOf(n)>=0,'chybí mapování pro '+n));
});
check('uloží se i mapování obchodu',()=>{
  pridej(kaufland);
  assert(sb.__map.some(x=>/Kaufland/.test(x[0])),'obchod se nenaučil');
});

console.log('\n── Zaokrouhlení a okrajové případy ──');
check('hotovostní účtenka: zaplaceno 123, položky 122,60',()=>{
  const t=pridej({date:'2026-09-09',store:'Řeznictví',total:123.00,subtotal:122.60,
    items:[{name:'Uzeniny',price:27.60,qty:1,lineTotal:27.60,itemCatId:'c1'},
           {name:'Uzeniny',price:95.00,qty:1,lineTotal:95.00,itemCatId:'c1'}]});
  assert(t[0].amount===123.00,'transakce za '+t[0].amount+' místo zaplacených 123');
  assert(Math.abs(t[0].receiptRounding-0.40)<0.001,'zaokrouhlení '+t[0].receiptRounding);
});
check('bez částky se použije součet položek',()=>{
  const t=pridej({date:'2026-09-12',store:'X',
    items:[{name:'A',price:10,qty:2,itemCatId:'c1'}]});
  assert(t[0].amount===20,'částka '+t[0].amount);
});
check('účtenka bez položek pořád vytvoří transakci',()=>{
  const t=pridej({date:'2026-09-12',store:'X',total:500,items:[]});
  assert(t.length===1 && t[0].amount===500,'transakce '+JSON.stringify(t));
});
check('položky bez kategorie transakci neshodí',()=>{
  const t=pridej({date:'2026-09-12',store:'X',total:100,
    items:[{name:'A',price:100,qty:1}]});
  assert(t.length===1,'vzniklo '+t.length);
});
check('tagy a podkategorie se z položek přenesou',()=>{
  const t=pridej({date:'2026-09-12',store:'X',total:30,
    items:[{name:'A',price:10,qty:1,itemCatId:'c1',tag:'Pečivo',itemSubcat:'Chléb'},
           {name:'B',price:20,qty:1,itemCatId:'c1',tag:'Maso'}]});
  assert(/Pečivo/.test(t[0].tags) && /Maso/.test(t[0].tags),'tagy: '+t[0].tags);
  assert(t[0].subcat==='Chléb','podkategorie '+t[0].subcat);
});
check('stará větev multi-tx je z kódu pryč',()=>{
  assert(!/Multi-tx: jedna transakce per kategorii/.test(src),'zbytek staré logiky');
  assert(!/addedCount\+\+/.test(src),'pořád počítá víc transakcí');
});
console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ JEDNA TRANSAKCE OVĚŘENA');
process.exit(fails?1:0);
