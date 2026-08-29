// FIX-278 (S20) – souhlas se sdílením do Komunitního přehledu.
// Do v10.14 se publishCommunityStats() ptalo na element 'settingCommunity',
// který v projektu NIKDY NEEXISTOVAL → podmínka byla vždy nepravdivá a data
// (příjem, výdaje po COICOP, míra úspor) se odesílala vždy a nešlo to vypnout.
const fs=require('fs'),vm=require('vm');
const pick=(src,n)=>{
  // Funkce jsou async – hledáme včetně prefixu, jinak se `await` uvnitř rozbije
  let i=src.indexOf('async function '+n);
  if(i<0) i=src.indexOf('function '+n);
  if(i<0) throw new Error('nenalezeno: '+n);
  let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};

const admSrc=fs.readFileSync('admin.js','utf8');
const setSrc=fs.readFileSync('settings.js','utf8');

function mkSandbox(settings){
  const sb={console,JSON,Object,Array,Set,Map,Date,Math,String,Number,isFinite,Promise};
  sb._settings=settings;
  sb._isLocalMode=false;
  sb.window={_currentUser:{uid:'me',isAnonymous:false}};
  sb.S={curMonth:7,curYear:2026};
  sb._writes=[];      // co se zapsalo přes _set
  sb._updates=[];     // co se zapsalo přes _update
  sb._set=(ref,val)=>{ sb._writes.push({ref,val}); return Promise.resolve(); };
  sb._update=(ref,obj)=>{ sb._updates.push(obj); return Promise.resolve(); };
  sb._ref=(db,path)=>path||'ROOT';
  sb._db={};
  sb.getTx=(m,y,D)=>((D||{}).transactions||[]);
  sb.computeBaseIncome=()=>40000;
  sb.expSum=(txs)=>txs.reduce((a,t)=>a+(t.amount||0),0);
  sb.txCZK=(t)=>t.amtCZK!=null?t.amtCZK:(t.amount||0);
  sb.isTransferTx=t=>!!(t&&t.transferId);
  sb.mapToCOICOP=()=>({coicopId:1});
  sb.localStorage={setItem(){},getItem(){return null}};
  sb.showToast=()=>{};
  sb.getData=()=>({transactions:[]});
  sb.document={getElementById:()=>null};   // element settingCommunity NEEXISTUJE
  vm.createContext(sb);
  vm.runInContext([
    "const COMMUNITY_MONTH_KEY=(m,y)=>`${y!==undefined?y:S.curYear}-${String((m!==undefined?m:S.curMonth)+1).padStart(2,'0')}`;",
    pick(admSrc,'publishCommunityStats'),
    pick(setSrc,'setCommunityShare'),
    pick(setSrc,'purgeMyCommunityData')
  ].join('\n'),sb);
  return sb;
}

const TXS={transactions:[
  {id:'a',type:'expense',amount:1000,date:'2026-08-05'},
  {id:'b',type:'expense',amount:2000,date:'2026-08-06'},
  {id:'c',type:'expense',amount:500,date:'2026-08-07'},
]};

let fails=0;
const check=async(n,f)=>{try{await f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m||'assert')};

(async()=>{
console.log('── FIX-278 · souhlas se sdílením do komunity ──');

await check('BEZ souhlasu se NEODESÍLÁ nic (jádro opravy)',async()=>{
  const sb=mkSandbox({lang:'cs'});   // community chybí = nesouhlas
  await sb.publishCommunityStats(TXS);
  assert(sb._writes.length===0,'odeslalo se '+JSON.stringify(sb._writes));
});

await check('community:false se NEODESÍLÁ',async()=>{
  const sb=mkSandbox({community:false});
  await sb.publishCommunityStats(TXS);
  assert(sb._writes.length===0,'odeslalo se i při výslovném nesouhlasu');
});

await check('chybějící _settings se NEODESÍLÁ (nespadne)',async()=>{
  const sb=mkSandbox(null);
  await sb.publishCommunityStats(TXS);
  assert(sb._writes.length===0);
});

await check('SE souhlasem se odešle správný obsah',async()=>{
  const sb=mkSandbox({community:true});
  await sb.publishCommunityStats(TXS);
  assert(sb._writes.length===1,'nic se neodeslalo');
  const w=sb._writes[0];
  assert(String(w.ref).includes('community/2026-08/users/me'),'špatná cesta: '+w.ref);
  assert(w.val.income===40000,'income: '+w.val.income);
  assert(w.val.totalExp===3500,'totalExp: '+w.val.totalExp);
  assert(typeof w.val.savingRate==='number','chybí savingRate');
  // Nesmí odejít nic navíc – jen dohodnutá čtyři pole + časová značka
  const keys=Object.keys(w.val).sort().join(',');
  assert(keys==='cats,income,savingRate,totalExp,updatedAt','odesílá se něco navíc: '+keys);
});

await check('řetězec: zapnu → publikuje se · vypnu → přestane',async()=>{
  const sb=mkSandbox({lang:'cs'});
  await sb.setCommunityShare(true);
  assert(sb._settings.community===true,'souhlas se neuložil');
  sb._writes=[];
  await sb.publishCommunityStats(TXS);
  assert(sb._writes.length===1,'po zapnutí se nepublikuje');
  await sb.setCommunityShare(false);
  assert(sb._settings.community===false,'nesouhlas se neuložil');
  sb._writes=[];
  await sb.publishCommunityStats(TXS);
  assert(sb._writes.length===0,'po vypnutí se pořád publikuje');
});

await check('vypnutí smaže i to, co už bylo odesláno',async()=>{
  const sb=mkSandbox({community:true});
  await sb.setCommunityShare(false);
  assert(sb._updates.length>=1,'nic se nemazalo');
  const del=sb._updates[sb._updates.length-1];
  const keys=Object.keys(del);
  assert(keys.length===36,'čekal jsem 36 měsíců zpětně, je '+keys.length);
  assert(keys.every(k=>del[k]===null),'mazání nezapisuje null');
  assert(keys.some(k=>k==='community/2026-08/users/me'),'chybí aktuální měsíc: '+keys[0]);
  assert(keys.every(k=>k.endsWith('/users/me')),'maže i cizí záznamy!');
});

await check('souhlas se ukládá HNED, ne až přes save bar',async()=>{
  const sb=mkSandbox({lang:'cs'});
  await sb.setCommunityShare(true);
  const settingsWrite=sb._writes.find(w=>String(w.ref).includes('/settings'));
  assert(settingsWrite,'nastavení se neuložilo do Firebase');
  assert(settingsWrite.val.community===true,'uložila se špatná hodnota');
});

console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ FIX-278 OVĚŘEN');
process.exit(fails?1:0);
})();
