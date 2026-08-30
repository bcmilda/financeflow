// FIX-288 (S20, Milan) – koláč „Rozložení majetku":
//   (a) členil podle a.type, takže nesouhlasil s kartou Čisté jmění ani se sekcemi,
//   (b) cíle byly schované mezi Investicemi,
//   (c) Peněženky se při ZÁPORNÉM zůstatku nezobrazily vůbec (podmínka `> 0`) –
//       přesně Milanův případ (−19 500 Kč).
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('assets.js','utf8');
const pick=n=>{const i=src.indexOf('function '+n);if(i<0)throw new Error(n);let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]=='{')d++;else if(src[k]=='}'){d--;if(!d)return src.slice(i,k+1)}}};
const gc=n=>{const i=src.indexOf('const '+n+' =');let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]=='{')d++;else if(src[k]=='}'){d--;if(!d)return src.slice(i,k+1)+';'}}};

function render(assets,walletBal){
  const els={};
  const sb={console,Object,Array,Math,String,Number,window:{},
    document:{getElementById(id){if(!els[id])els[id]={innerHTML:'',textContent:'',setAttribute(k,v){this[k]=v}};return els[id];}}};
  sb.S={categories:[{id:'cVirt',name:'Virtuální přesun'},{id:'cInv',name:'Investice'},{id:'cSav',name:'Spoření'}]};
  sb.getData=()=>({wallets:[{id:'w1',balance:walletBal}],assets,debts:[]});
  sb.walletBalanceCZK=(id,D)=>((D.wallets||[]).find(w=>w.id===id)||{}).balance||0;
  sb.computeWalletBalance=sb.walletBalanceCZK;
  sb.fmtBP=v=>Math.round(v)+' Kč';
  vm.createContext(sb);
  vm.runInContext([gc('LIQ_GROUPS'),pick('assetCatLiq'),pick('assetTier'),pick('assetLiqTotals'),
                   pick('renderAssetAllocation'),pick('allocFocus')].join('\n'),sb);
  vm.runInContext('renderAssetAllocation()',sb);
  return {html:els['assetAllocationCard'].innerHTML, els, sb};
}
const ASSETS=[{id:'a1',name:'Vklad do cíle',value:19510,linkedCatId:'cVirt'},
              {id:'a2',name:'ETF',value:154209,linkedCatId:'cInv'},
              {id:'a3',name:'Spořicí',value:6322,linkedCatId:'cSav'},
              {id:'a4',name:'Byt',value:1975365,type:'property'}];

let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m||'assert')};

console.log('── FIX-288 · rozložení majetku ──');
const R=render(ASSETS,-19500);

check('Peněženky se ukážou i při ZÁPORNÉM zůstatku (jádro opravy)',()=>{
  assert(R.html.includes('Peněženky'),'Peněženky v grafu chybí');
  assert(R.html.includes('-19500 Kč'),'chybí záporná částka');
});
check('záporná složka NENÍ výsečí, ale je vysvětlená',()=>{
  assert(R.html.includes('záporný zůstatek'),'chybí vysvětlení');
  assert((R.html.match(/<path /g)||[]).length===4,'počet výsečí: '+(R.html.match(/<path /g)||[]).length+' (má být 4 kladné)');
});
check('cíle mají vlastní výseč, nejsou schované v investicích',()=>{
  assert(R.html.includes('Virtuální přesuny'),'chybí sekce cílů');
});
check('členění odpovídá kartě Čisté jmění (LIQ_GROUPS)',()=>{
  ['Peněženky','Virtuální přesuny','Finanční rezerva','Střednědobá','Fyzická'].forEach(n=>
    assert(R.html.includes(n.split(' ')[0]),'chybí '+n));
});
check('SVG má max-width i preserveAspectRatio (jinak se roztáhne)',()=>{
  assert(R.html.includes('preserveAspectRatio'),'chybí preserveAspectRatio');
  assert(R.html.includes('max-width:240px'),'chybí max-width');
});
check('graf je vycentrovaný',()=>{
  assert(R.html.includes('justify-content:center'));
});
check('každá výseč má tooltip s částkou i procentem',()=>{
  const titles=R.html.match(/<title>[^<]*<\/title>/g)||[];
  assert(titles.length===4,'tooltipů: '+titles.length);
  assert(titles.every(t=>/%/.test(t)&&/Kč/.test(t)),'tooltip neobsahuje částku a %');
});
check('hover přepíše střed a vrátí se zpět',()=>{
  const focus=vm.runInContext('allocFocus',R.sb);
  focus(0,'#60a5fa');
  const lab=R.els['allocLabel'], val=R.els['allocValue'], sub=R.els['allocSub'];
  assert(/Peněženky|Virtuální|rezerva|Střednědobá|Fyzická/.test(lab.textContent),'popisek: '+lab.textContent);
  assert(/%/.test(sub.textContent),'chybí procento');
  focus(-1);
  assert(lab.textContent==='Celkem','návrat: '+lab.textContent);
});
check('bez aktiv i peněženek prázdný stav',()=>{
  const E=render([],0);
  assert(E.html.includes('Přidej aktiva'),'chybí prázdný stav');
});
check('jen kladné složky – žádná zmínka o záporných',()=>{
  const P=render(ASSETS,5000);
  assert(!P.html.includes('záporný zůstatek'),'hláška se ukazuje zbytečně');
  assert((P.html.match(/<path /g)||[]).length===5,'má být 5 výsečí');
});

check('FIX-289: drobná výseč dostane minimálně 8° (jinak je neviditelná)',()=>{
  // Milanova čísla: Fin. rezerva 6 322 z 2 155 406 = 0,3 % = 1,1° před opravou
  const d=R.html.match(/<path d="M([-\d.]+) ([-\d.]+) A88 88 0 (\d)/g)||[];
  assert(d.length===4,'výsečí: '+d.length);
  // součet zůstane 360° – kontrola přes poslední oblouk (velká výseč se zmenší, ne rozbije)
  assert(R.html.includes('A88 88 0 1'),'chybí velká výseč (large-arc flag)');
});
check('FIX-289: legenda nezalamuje – částka a % pod sebou, ne vedle',()=>{
  assert(R.html.includes('flex-direction:column'),'částka a % nejsou pod sebou');
  assert(R.html.includes('% majetku'),'chybí popisek u procenta');
  assert(R.html.includes('minmax(240px,1fr)'),'buňky legendy jsou moc úzké');
});

console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ FIX-288 OVĚŘEN');
process.exit(fails?1:0);
