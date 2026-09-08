// FIX-285 (S20, Milan) – „Vklad do cíle" se choval jako investiční aktivum.
// Kategorie „Virtuální přesun" nespadala do žádného vzoru v assetCatLiq, takže
// dostala výchozí 'mid' = Střednědobá a investiční aktiva. Peníze odložené na
// cíl tak nafukovaly částku „investováno", přestože o investici nejde – je to
// jen přehození v rámci vlastních peněz.
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('assets.js','utf8');
const pick=n=>{const i=src.indexOf('function '+n);if(i<0)throw new Error('nenalezeno: '+n);
  let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};
const grabConst=n=>{const i=src.indexOf('const '+n+' =');let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)+';'}}};

const CATS=[
  {id:'cVirt',name:'Virtuální přesun'},
  {id:'cInv', name:'Investice'},
  {id:'cSav', name:'Spoření'},
  {id:'cPen', name:'Penzijní spoření'},
];
function mkSandbox(assets,wallets){
  const sb={console,Object,Array,Math,String,Number};
  sb.S={categories:CATS};
  sb.getData=()=>({assets:assets||[],wallets:wallets||[],debts:[],categories:CATS});
  sb.walletBalanceCZK=(id,D)=>((D.wallets||[]).find(w=>w.id===id)||{}).balance||0;
  sb.computeWalletBalance=sb.walletBalanceCZK;
  vm.createContext(sb);
  // S21: odhad podle názvu je nově samostatný helper (assetLiqFromName) – testy
  //   ho musí vytáhnout taky, jinak assetCatLiq spadne na ReferenceError.
  vm.runInContext([grabConst('LIQ_GROUPS'),pick('assetCatLiq'),pick('assetLiqFromName'),pick('assetTier'),pick('assetLiqTotals')].join('\n'),sb);
  return sb;
}

let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m||'assert')};

console.log('── FIX-285 · virtuální přesuny mimo investice ──');

const VKLAD={id:'a1',name:'Vklad do cíle',value:19510,linkedCatId:'cVirt'};
const ETF  ={id:'a2',name:'ETF',value:126110,linkedCatId:'cInv'};
const SPOR ={id:'a3',name:'Spořicí účet',value:6322,linkedCatId:'cSav'};

check('„Vklad do cíle" už NENÍ investiční aktivum (jádro opravy)',()=>{
  const sb=mkSandbox([VKLAD]);
  assert(sb.assetTier(VKLAD)==='virtual','tier je '+sb.assetTier(VKLAD)+', čekal jsem virtual');
});
check('nezvyšuje součet Střednědobých investic',()=>{
  const sb=mkSandbox([VKLAD,ETF]);
  const lt=sb.assetLiqTotals();
  assert(lt.mid===126110,'Střednědobá '+lt.mid+' místo 126110 – vklad do cíle se tam pořád počítá');
  assert(lt.virtual===19510,'virtual '+lt.virtual);
});
check('ETF a spoření zůstávají tam, kde byly (žádná regrese)',()=>{
  const sb=mkSandbox([VKLAD,ETF,SPOR]);
  assert(sb.assetTier(ETF)==='mid',sb.assetTier(ETF));
  assert(sb.assetTier(SPOR)==='reserve',sb.assetTier(SPOR));
  const lt=sb.assetLiqTotals();
  assert(lt.mid===126110&&lt.reserve===6322,JSON.stringify(lt));
});
check('penzijko patří mezi dlouhodobá aktiva, ne do rezervy (FIX-303)',()=>{
  const sb=mkSandbox([]);
  // Do S21 tady stálo očekávání 'reserve' – test tím POTVRZOVAL chybu jako
  // správné chování. „Penzijní spoření" obsahuje „spoř", a vzor pro reserve
  // se testoval dřív než vzor pro long, takže peníze vázané do 60 let padaly
  // do likvidní rezervy a nafukovaly Emergency Fund. FIX-303 prohodil pořadí.
  assert(sb.assetTier({id:'x',value:0,linkedCatId:'cPen'})==='fixed','penzijní spoření má být dlouhodobé');
  sb.S.categories=[{id:'cP2',name:'Penzijko'}];
  assert(sb.assetTier({id:'x2',value:0,linkedCatId:'cP2'})==='fixed','„Penzijko" bez slova spoření má být dlouhodobé');
});
check('rozpoznání nezávisí na diakritice („virtualni presun")',()=>{
  const sb=mkSandbox([]);
  sb.S.categories=[{id:'c9',name:'Virtualni presun'}];
  assert(sb.assetTier({id:'y',value:1,linkedCatId:'c9'})==='virtual');
});
check('ručně nastavený liqTier=virtual se respektuje',()=>{
  const sb=mkSandbox([]);
  assert(sb.assetTier({id:'z',value:1,liqTier:'virtual'})==='virtual');
});
check('sekce Virtuální přesuny existuje v LIQ_GROUPS',()=>{
  const sb=mkSandbox([]);
  const g=vm.runInContext('LIQ_GROUPS',sb);
  assert(g.virtual,'sekce chybí');
  assert(/nejde o investici/i.test(g.virtual.desc),'popis nevysvětluje, proč to není investice');
});
check('čisté jmění zůstává stejné – peníze se jen přeřadily',()=>{
  const sb=mkSandbox([VKLAD,ETF,SPOR],[{id:'w1',balance:-19500}]);
  const lt=sb.assetLiqTotals();
  const celkem=lt.wallets+lt.reserve+lt.mid+lt.fixed+lt.virtual;
  // -19500 + 6322 + 126110 + 0 + 19510 = 132442
  assert(celkem===132442,'součet '+celkem+' – přeřazení změnilo celkové jmění!');
});

console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ FIX-285 OVĚŘEN');
process.exit(fails?1:0);
