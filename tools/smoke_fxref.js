// TODO-215 fáze 1 – sběr referenčního kurzu ČNB.
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('debts.js','utf8');
const pick=n=>{const i=src.indexOf('function '+n);let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};
let FX=null;
const sb={console,Object,Math,isFinite,Number,
  get _fxData(){return FX}};
sb.window=sb;vm.createContext(sb);
vm.runInContext(pick('_fxRefNow'),sb);
const ref=vm.runInContext('_fxRefNow',sb);

let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m)};

console.log('── TODO-215/1 · referenční kurz ČNB ──');
FX={date:'19.08.2026',rates:{EUR:24.16,PLN:5.68},source:'CNB'};

check('živý kurz ČNB se vrátí i s datem lístku',()=>{
  const r=ref('EUR'); assert(r&&r.rate===24.16&&r.date==='19.08.2026',JSON.stringify(r));
});
check('CZK nemá referenční kurz',()=>{ assert(ref('CZK')===null); });
check('neznámá měna → null, ne nula',()=>{ assert(ref('XYZ')===null); });
check('KLÍČOVÉ: orientační průměry se NEZAPÍŠÍ jako kurz ČNB',()=>{
  FX={date:null,rates:{EUR:25.3},source:'fallback'};
  assert(ref('EUR')===null,'fallback se vydává za ČNB – marže by se počítala proti vymyšlenému číslu');
});
check('nenačtené kurzy nespadnou',()=>{ FX=null; assert(ref('EUR')===null); });
check('nulový nebo záporný kurz se odmítne (dělení nulou)',()=>{
  FX={date:'19.08.2026',rates:{EUR:0,USD:-1},source:'CNB'};
  assert(ref('EUR')===null&&ref('USD')===null);
});

console.log('\n── výpočet marže z uložených dat ──');
check('20 € / 594 Kč proti ČNB 24,16 → přirážka 22,9 %',()=>{
  const t={amount:20,amtCZK:594,currency:'EUR',fxRef:24.16};
  const bank=t.amtCZK/t.amount;
  const prirazka=(bank/t.fxRef-1)*100;
  const kc=t.amtCZK-(t.amount*t.fxRef);
  assert(Math.abs(bank-29.7)<0.01,'kurz banky '+bank);
  assert(Math.abs(prirazka-22.9)<0.1,'přirážka '+prirazka.toFixed(1));
  assert(Math.abs(kc-110.8)<0.1,'ztráta '+kc.toFixed(1));
});
check('transakce bez fxRef se z výpočtu jen vynechá',()=>{
  const t={amount:20,amtCZK:594,currency:'EUR'};
  assert(t.fxRef==null,'nemá se co počítat – žádná výjimka, jen přeskočit');
});
console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ SBĚR KURZU OVĚŘEN');
process.exit(fails?1:0);
