// TODO-229 – platnost slev v Nákupním seznamu.
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('nakup.js','utf8');
const pick=n=>{const i=src.indexOf('function '+n);let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};
let KATALOG=[];
const sb={console,Date,Math,String,Number,isNaN,
  get _nakupCatalog(){return KATALOG}};
sb.window=sb;vm.createContext(sb);
vm.runInContext(['const NAKUP_SLEVA_CERSTVA = 7;','const NAKUP_SLEVA_MAX = 30;',
  pick('nakupPriceAge'),pick('nakupPriceState'),pick('nakupIsTriggered'),pick('nakupGetDrop')].join('\n'),sb);
const stav=vm.runInContext('nakupPriceState',sb);
const trig=vm.runInContext('nakupIsTriggered',sb);
const stari=vm.runInContext('nakupPriceAge',sb);

let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m)};
const pred=d=>{const x=new Date();x.setDate(x.getDate()-d);return x.toISOString().slice(0,10)};

console.log('── TODO-229 · platnost slevy ──');
check('cena z dneška = čerstvá',()=>{
  assert(stav({latestDate:pred(0)})==='fresh');
  assert(stari({latestDate:pred(0)})===0,'stáří '+stari({latestDate:pred(0)}));
});
check('hranice 7 dní je včetně',()=>{
  assert(stav({latestDate:pred(7)})==='fresh','7. den má být ještě čerstvá');
  assert(stav({latestDate:pred(8)})==='stale','8. den už má být stará');
});
check('nad 30 dní nález zaniká',()=>{
  assert(stav({latestDate:pred(30)})==='stale','30. den ještě stale');
  assert(stav({latestDate:pred(31)})==='expired','31. den má expirovat');
});
check('bez data se chová jako dřív (null)',()=>{
  assert(stav({latestPrice:20})===null,'starší záznamy se nesmí přestat hlásit');
  assert(stari({})===null);
});

console.log('\n── nález se počítá jen u čerstvé ceny ──');
const polozka={catalogKey:'meloun',refPrice:100,alertPct:20};
check('🎉 čerstvá sleva 30 % → nález',()=>{
  KATALOG=[{key:'meloun',latestPrice:70,latestDate:pred(2)}];
  assert(trig(polozka)===true,'nález se nespustil');
});
check('⏳ táž sleva po 10 dnech → NENÍ nález',()=>{
  KATALOG=[{key:'meloun',latestPrice:70,latestDate:pred(10)}];
  assert(trig(polozka)===false,'stará cena se pořád počítá jako sleva');
});
check('po 40 dnech taky ne',()=>{
  KATALOG=[{key:'meloun',latestPrice:70,latestDate:pred(40)}];
  assert(trig(polozka)===false);
});
check('bez data se nález zachová (zpětná kompatibilita)',()=>{
  KATALOG=[{key:'meloun',latestPrice:70}];
  assert(trig(polozka)===true,'položky bez data se přestaly hlásit');
});
check('malá sleva nespustí nález ani když je čerstvá',()=>{
  KATALOG=[{key:'meloun',latestPrice:95,latestDate:pred(1)}];
  assert(trig(polozka)===false,'5 % < práh 20 %');
});

console.log('\n── formulace ──');
check('píše „naposledy viděno", ne „je za"',()=>{
  assert(/naposledy viděno/.test(src),'chybí opatrná formulace');
  assert(/BYLA SLEVA/.test(src),'chybí stav pro starou cenu');
});
console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ PLATNOST SLEV OVĚŘENA');
process.exit(fails?1:0);
