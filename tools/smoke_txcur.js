// TODO-214 – přepínač měny + filtr měn.
const fs=require('fs'),vm=require('vm');
const dsrc=fs.readFileSync('debts.js','utf8'), usrc=fs.readFileSync('ui.js','utf8');
const pick=(src,n)=>{const i=src.indexOf('function '+n);let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};

let DOM={}, WALLETS=[], CURTYPE='expense';
const sb={console,Object,Math,Set,Number,parseFloat,isFinite,Array,
  _FX_RATES:{EUR:25.3,PLN:5.9,GBP:28.256,USD:23.1},
  get S(){return{wallets:WALLETS}},
  get curTxType(){return CURTYPE},
  _transferMode:'wallets',
  baseCur:()=>'CZK',
  curSym:c=>({CZK:'Kč',EUR:'€',PLN:'zł',GBP:'£'}[c]||c),
  getData:()=>({wallets:WALLETS}),
  document:{getElementById:id=>DOM[id]||null},
  updateTxCzkField:()=>{},updateTxConverter:()=>{}};
sb.window=sb;vm.createContext(sb);
vm.runInContext('let _txCzkTouched=false;'+pick(dsrc,'_txCurBase')+'\n'+pick(dsrc,'_txEntryCur')+'\n'
  +pick(dsrc,'renderTxCurSel')+'\n'+pick(dsrc,'setTxCurOverride')+'\n'+pick(dsrc,'_readTxCzk')+'\n'
  +'let _txCurOverride=null;',sb);
vm.runInContext(pick(usrc,'txCurOf'),sb);

let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m)};
const set=o=>{DOM=o};

WALLETS=[{id:'w1',name:'Vaše banka',currency:'CZK'},{id:'w2',name:'EUR účet',currency:'EUR'}];

console.log('── TODO-214 · přepínač měny ──');
check('výchozí = měna peněženky (česká banka → CZK)',()=>{
  set({txWalletId:{value:'w1'},txCurSel:{innerHTML:'',style:{}}});
  vm.runInContext('_txCurOverride=null',sb);
  assert(vm.runInContext('_txEntryCur()',sb)==='CZK');
});
check('přepnutí na EUR u korunové peněženky se uplatní',()=>{
  vm.runInContext("setTxCurOverride('EUR')",sb);
  assert(vm.runInContext('_txEntryCur()',sb)==='EUR');
});
check('MILANŮV PŘÍPAD: 20 € českou kartou → uloží se 594 Kč z pole, ne 20',()=>{
  set({txWalletId:{value:'w1'},txAmtCZK:{value:'594'},txCurSel:{innerHTML:'',style:{}}});
  vm.runInContext("setTxCurOverride('EUR')",sb);
  const czk=vm.runInContext('_readTxCzk("w1",20)',sb);
  assert(czk===594,'amtCZK='+czk);
});
check('prázdné pole → předvyplní kurzem ČNB (20 × 25,3 = 506)',()=>{
  set({txWalletId:{value:'w1'},txAmtCZK:{value:''},txCurSel:{innerHTML:'',style:{}}});
  vm.runInContext("setTxCurOverride('EUR')",sb);
  assert(vm.runInContext('_readTxCzk("w1",20)',sb)===506);
});
check('rozdíl kurzu je vidět: banka 594 vs ČNB 506 = 88 Kč navíc',()=>{
  assert(594-506===88);
});
check('přepnutí zpět na měnu peněženky přepis zruší',()=>{
  set({txWalletId:{value:'w1'},txAmtCZK:{value:'594'},txCurSel:{innerHTML:'',style:{}}});
  vm.runInContext("setTxCurOverride('CZK')",sb);
  assert(vm.runInContext('_txCurOverride',sb)===null,'přepis zůstal');
  assert(vm.runInContext('_readTxCzk("w1",20)',sb)===null,'CZK nemá ukládat amtCZK');
});
check('u přesunu mezi peněženkami se přepis neuplatní',()=>{
  CURTYPE='transfer';
  vm.runInContext("_txCurOverride='EUR'",sb);
  assert(vm.runInContext('_txEntryCur()',sb)==='CZK');
  CURTYPE='expense';
});
check('rozbalovátko označí měnu peněženky',()=>{
  set({txWalletId:{value:'w2'},txCurSel:{innerHTML:'',style:{}}});
  vm.runInContext('_txCurOverride=null;renderTxCurSel()',sb);
  assert(/EUR · peněženka/.test(DOM.txCurSel.innerHTML),DOM.txCurSel.innerHTML);
});

console.log('\n── filtr měn ──');
check('uložená currency má přednost před peněženkou',()=>{
  assert(vm.runInContext('txCurOf',sb)({wallet:'w1',currency:'EUR'})==='EUR');
});
check('starší transakce bez currency se odvodí z peněženky',()=>{
  assert(vm.runInContext('txCurOf',sb)({wallet:'w2'})==='EUR');
  assert(vm.runInContext('txCurOf',sb)({wallet:'w1'})==='CZK');
});
check('transakce bez peněženky = CZK',()=>{
  assert(vm.runInContext('txCurOf',sb)({})==='CZK');
});
console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ PŘEPÍNAČ MĚN OVĚŘEN');
process.exit(fails?1:0);
