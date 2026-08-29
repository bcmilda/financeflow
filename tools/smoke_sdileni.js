// KROK 0 (S20) – oddělení úložiště od výdejního okénka.
// Jádro: vypnutí přepínače ve „Sdílení & Partneři" NESMÍ sáhnout na
// users/{uid}/data. Do v10.10 to mazalo transakce z cloudu i uživatelům,
// kteří nikdy žádného partnera neměli.
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('app.js','utf8');
const pick=n=>{const i=src.indexOf('function '+n);if(i<0)throw new Error('nenalezeno: '+n);
  let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};

function mkSandbox(shareSettings){
  const sb={console,JSON,Object,Array,Set,Map,Date,Math,String,isFinite,
    S:{
      transactions:[{id:'t1',amount:100},{id:'t2',amount:200}],
      debts:[{id:'d1',remaining:5000}],
      categories:[{id:'c1',name:'Jídlo'}],
      wallets:[{id:'w1',currency:'CZK'}],
      receipts:[{id:'r1'}],
      bank:{startBalance:1000},
      shareSettings:shareSettings||{}
    }};
  sb.window=sb; vm.createContext(sb);
  vm.runInContext([
    "const _DW_META=['debts','categories','bank','birthdays','wishes','wallets','payTypes','sablony','projects','receipts','nakupList','assets','noSyncKeys','importHistory','shareSettings','calNotes','workCal','diary','idleCfg','milestones','reportSectors','pristiCfg'];",
    pick('_dwMetaVals'), pick('_dwTxObj'), pick('_shMetaVals'), pick('_shTxObj')
  ].join('\n'), sb);
  return sb;
}

let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m||'assert')};

console.log('── KROK 0 · úložiště vs. výdejní okénko ──');

check('ÚLOŽIŠTĚ ignoruje vypnuté přepínače (jádro opravy)',()=>{
  const sb=mkSandbox({transactions:false,debts:false,categories:false,receipts:false,wallets:false,bank:false});
  const tx=sb._dwTxObj(), meta=sb._dwMetaVals();
  assert(Object.keys(tx).length===2,'transakce zmizely z úložiště! '+JSON.stringify(tx));
  assert(meta.debts.length===1,'dluhy zmizely z úložiště');
  assert(meta.categories.length===1,'kategorie zmizely z úložiště');
  assert(meta.receipts.length===1,'účtenky zmizely z úložiště');
  assert(meta.wallets.length===1,'peněženky zmizely z úložiště');
  assert(meta.bank.startBalance===1000,'zůstatek se vynuloval v úložišti');
});

check('VÝDEJNÍ OKÉNKO vypnuté sekce skutečně skryje',()=>{
  const sb=mkSandbox({transactions:false,debts:false,receipts:false});
  const tx=sb._shTxObj(), meta=sb._shMetaVals();
  assert(Object.keys(tx).length===0,'transakce se sdílejí i po vypnutí');
  assert(meta.debts.length===0,'dluhy se sdílejí i po vypnutí');
  assert(meta.receipts.length===0,'účtenky se sdílejí i po vypnutí');
});

check('bez vypnutých přepínačů jsou úložiště i výřez shodné',()=>{
  const sb=mkSandbox({});
  assert(JSON.stringify(sb._dwTxObj())===JSON.stringify(sb._shTxObj()),'transakce se liší');
  assert(sb._shMetaVals().debts.length===sb._dwMetaVals().debts.length,'dluhy se liší');
  assert(sb._shMetaVals().categories.length===1,'kategorie chybí ve výřezu');
});

check('zapnutá sekce se sdílí i když je jiná vypnutá (filtr netrefí sousedy)',()=>{
  const sb=mkSandbox({transactions:false});
  const meta=sb._shMetaVals();
  assert(meta.debts.length===1,'vypnutí transakcí schovalo i dluhy');
  assert(meta.categories.length===1,'vypnutí transakcí schovalo i kategorie');
  assert(Object.keys(sb._shTxObj()).length===0,'transakce se přesto sdílejí');
});

check('sekce bez přepínače (payTypes, nakupList) se sdílejí vždy',()=>{
  const sb=mkSandbox({transactions:false,debts:false});
  sb.S.payTypes=[{id:'p1'}]; sb.S.nakupList=[{id:'n1'}];
  const meta=sb._shMetaVals();
  assert(meta.payTypes.length===1,'payTypes zmizely');
  assert(meta.nakupList.length===1,'nakupList zmizel');
});

check('prázdný shareSettings nic neschovává (výchozí stav = sdílím)',()=>{
  const sb=mkSandbox(undefined);
  assert(Object.keys(sb._shTxObj()).length===2,'prázdné nastavení schovalo transakce');
  assert(sb._shMetaVals().debts.length===1,'prázdné nastavení schovalo dluhy');
});

check('shareSettings samotné se do výřezu propíše (partner ví, co nevidí)',()=>{
  const sb=mkSandbox({transactions:false});
  assert(sb._shMetaVals().shareSettings.transactions===false,'shareSettings se nepropsalo');
});

console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ KROK 0 OVĚŘEN');
process.exit(fails?1:0);
