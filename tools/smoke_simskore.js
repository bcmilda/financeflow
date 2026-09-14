// FinanceFlow · v10.60 · tools/smoke_simskore.js · 2026-09-12
// S22 (Milan) · SIMULÁTOR SKÓRE v admin panelu.
// Behaviorální test (SKILL 35): volá renderScoringSim() do fiktivního elementu
// a čte vygenerované HTML. Nejdůležitější kontrola je ta předposlední – ostrá
// _SCORING_V2 se simulací NESMÍ změnit, jinak by si admin posunutím posuvníku
// přepsal skóre všem.
const fs=require('fs'),vm=require('vm');
const noop=()=>{};const el=new Proxy({},{get:(t,k)=>k==='style'?{}:noop});
const karta={innerHTML:''};
const sb={console,Math,Date,JSON,Object,Array,String,Number,Boolean,RegExp,Map,Set,Promise,Infinity,NaN,isFinite,isNaN,parseInt,parseFloat,setTimeout,clearTimeout,
 window:{},document:{getElementById:id=>id==='adminScoringSim'?karta:null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>el,addEventListener:noop,body:el,documentElement:el},
 localStorage:{getItem:()=>null,setItem:noop,removeItem:noop},navigator:{language:'cs-CZ',clipboard:{writeText:()=>Promise.resolve()}},location:{href:'x',pathname:'/'},
 fetch:()=>Promise.resolve({ok:false,json:()=>Promise.resolve({})}),requestAnimationFrame:c=>setTimeout(c,0),IntersectionObserver:class{observe(){}disconnect(){}},confirm:()=>true,alert:noop};
sb.window=sb;sb.globalThis=sb;sb.self=sb;vm.createContext(sb);
['helpers.js','assets.js','debts.js','projects.js','premium.js'].forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),sb,{filename:f}));
// jen konec admin.js (simulator) – cely soubor tahne spoustu zavislosti
const adm=fs.readFileSync('admin.js','utf8');
vm.runInContext(adm.slice(adm.indexOf('//  S22 (Milan) · SIMULÁTOR')),sb,{filename:'admin-sim'});
sb.S={curMonth:6,curYear:2026,wallets:[]};
vm.runInContext("S=globalThis.S;_settings={lang:'cs',currency:'CZK'};_settings.hasDebts=false;isAdmin=()=>true;",sb);
const iso='2026-07-15';
sb.__D={transactions:[{id:'a',date:iso,type:'income',amount:40000,catId:'v'},{id:'b',date:iso,type:'expense',amount:26000,catId:'z'}],
 debts:[],wallets:[],assets:[],categories:[],shareSettings:{}};
vm.runInContext("getData=()=>__D;showToast=()=>{};",sb);

let f=0; const ok=(n,c)=>{ if(c) console.log('  ✅',n); else {f++;console.log('  ❌',n);} };
console.log('── Simulátor skóre ──');
const ostraPred=JSON.stringify(vm.runInContext('_SCORING_V2',sb));
vm.runInContext('renderScoringSim()',sb);
ok('vykreslí se',karta.innerHTML.length>1000);
ok('ukazuje součet 100 %',/100 %[\s\S]{0,120}✓ platné/.test(karta.innerHTML));
ok('spočítá skóre z mých dat',/\/ 310/.test(karta.innerHTML));
ok('vygeneruje export blok',/vahy: \{ S1:30/.test(karta.innerHTML));

// zmena vahy -> soucet 105 -> neplatne
vm.runInContext("simSetVaha('S1',35)",sb);
ok('součet 105 % → označen jako neplatný',/105 %/.test(karta.innerHTML)&&/musí být přesně 100 %/.test(karta.innerHTML));
ok('neplatný součet NEVYGENERUJE export',!/vahy: \{ S1:35/.test(karta.innerHTML));
ok('neplatný součet nepočítá simulaci',/simulace se nepočítá/.test(karta.innerHTML));

// srovnat zpet na 100 (S1 35, S5 5)
vm.runInContext("simSetVaha('S5',5)",sb);
ok('po srovnání na 100 % se zase počítá',/✓ platné/.test(karta.innerHTML)&&/vahy: \{ S1:35/.test(karta.innerHTML));
const mx=vm.runInContext('JSON.stringify(_simCfg.maxBody310)',sb);
const soucetBodu=Object.values(JSON.parse(mx)).reduce((a,b)=>a+b,0);
ok('body na displeji dávají přesně 310 (je '+soucetBodu+')',soucetBodu===310);

// KLICOVE: ostra konfigurace se nesmi zmenit
const ostraPo=JSON.stringify(vm.runInContext('_SCORING_V2',sb));
ok('ostrá _SCORING_V2 zůstala NEDOTČENÁ',ostraPred===ostraPo);
const skoreOstre=vm.runInContext('computeFinancialScore(__D)',sb);
ok('skóre bez 4. parametru počítá pořád podle ostré (total='+skoreOstre.total+')',skoreOstre.total===92);

// hasDebts se musi vratit
ok('_settings.hasDebts se vrátil na původní',vm.runInContext('_settings.hasDebts',sb)===false);

// reset
vm.runInContext('simResetVse()',sb);
ok('reset vrátí váhy na ostré',/vahy: \{ S1:30/.test(karta.innerHTML));
console.log(f?`\n❌ SELHALO ${f}`:'\n✅ SIMULÁTOR OVĚŘEN');
process.exit(f?1:0);
