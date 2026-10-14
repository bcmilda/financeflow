// FinanceFlow · smoke test · S24 · v11.16 Free 3 skeny účtenek měsíčně + kategorie Péče o sebe, výběr ATM jako přesun
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
let ok=0,bad=0;const t=(n,c,i)=>{c?ok++:(bad++,console.log('❌',n,i===undefined?'':JSON.stringify(i)));};
const RC=R('receipts.js','../js/receipts.js'), PM=R('premium.js','../js/premium.js'), W=R('worker.js','../cloudflare-worker/worker.js'), A=R('app.js','../js/app.js');
t('Analýza účtenek už není celá zamčená',!/const PREMIUM_PAGES = \[[^\]]*'uctenky'/.test(PM));
t('sken je Free, nástroje Premium',/receiptAnalyze: 'free'/.test(PM)&&/receiptTools:   'premium'/.test(PM));
t('worker: Free 3 účtenky měsíčně',/free:\s*\{ receipt: 3,/.test(W));
t('worker 429 vrací čitelnou zprávu a appka ji ukáže',/Měsíční limit pro/.test(W)&&(RC.match(/err\?\.message\|\|err\?\.error|err\?\.message \|\| err\?\.error/g)||[]).length===2);
// brána záložek
const els={};const el=()=>({style:{},classList:{remove(){},add(){}},innerHTML:''});
let pay=0, premium=false;
const ctx={console,window:{},document:{getElementById:id=>els[id]||(els[id]=el())},showPaywall:()=>pay++,hasPremiumAccess:()=>premium,setTimeout:()=>{},
  fetch:async()=>({ok:true,json:async()=>2})};
ctx.window=ctx; vm.createContext(ctx);
const a=RC.indexOf('const UCTENKY_PREMIUM_TABS'), b=RC.indexOf('function switchUctenkyTab');
const cutF=n=>{const x=RC.indexOf('function '+n+'(');let i=RC.indexOf('{',x),d=0;for(;i<RC.length;i++){if(RC[i]==='{')d++;else if(RC[i]==='}'){d--;if(!d)break;}}return RC.slice(x,i+1);};
vm.runInContext('var _activeUctenkyTab="scan";'+RC.slice(a,b).replace(/const /g,'var ')+cutF('switchUctenkyTab'),ctx);
ctx.switchUctenkyTab('prices',{classList:{add(){},remove(){}}}); t('Free: klik na Zdražování → paywall, záložka se nezmění',pay===1&&vm.runInContext('_activeUctenkyTab',ctx)==='scan');
ctx.switchUctenkyTab('stores'); t('Free: obnovení zamčené záložky → Skenovat bez paywallu',pay===1&&vm.runInContext('_activeUctenkyTab',ctx)==='scan');
ctx.switchUctenkyTab('mapa',{classList:{add(){},remove(){}}}); t('Free: Mapa položek je volná',vm.runInContext('_activeUctenkyTab',ctx)==='mapa');
t('Free: 💎 u zamčených záložek',ctx._utDia().includes('💎'));
premium=true; ctx.switchUctenkyTab('prices',{classList:{add(){},remove(){}}}); t('Premium: Zdražování otevře',vm.runInContext('_activeUctenkyTab',ctx)==='prices'&&ctx._utDia()==='');
premium=false;
(async()=>{
  ctx._currentUser={uid:'u',getIdToken:async()=>'T'};
  await ctx.uctenkyKvotaObnov(); t('kvóta: zbývá 1 ze 3',els.uctenkyKvota.innerHTML.includes('1 ze 3'));
  ctx.fetch=async()=>({ok:true,json:async()=>3}); await ctx.uctenkyKvotaObnov(); t('kvóta: vyčerpáno',els.uctenkyKvota.innerHTML.includes('vyčerpané'));
  premium=true; await ctx.uctenkyKvotaObnov(); t('Premium: bez hlášky o kvótě',els.uctenkyKvota.innerHTML==='');
  // kategorie
  t('výchozí sada: Péče o sebe (cat47, COICOP 13, sdílí se Službami)',/\{id:'cat47',name:'Péče o sebe'[^}]*coicop:13/.test(A)&&/shared:\['cat34'\]/.test(A));
  t('výchozí sada: Výběry ATM (cat39) odstraněny',!/\{id:'cat39'/.test(A));
  const J=JSON.parse(R('categories.json','../data/categories.json'));
  t('categories.json sjednocený se seedem',J.some(c=>c.id==='cat47')&&!J.some(c=>c.id==='cat39'));
  const T=JSON.parse(R('taxonomie.json','../data/taxonomie.json'));
  t('taxonomie: Osobní péče → cat47, Zvířata → cat44',T.oblasti.find(o=>o.id==='osobni-pece').rozpocet==='cat47'&&T.oblasti.find(o=>o.id==='zvirata').rozpocet==='cat44');
  t('nápověda u přesunu: výběr z bankomatu',R('app.html','../app.html').includes('Výběr z bankomatu</b> zapiš sem'));
  console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
})();
