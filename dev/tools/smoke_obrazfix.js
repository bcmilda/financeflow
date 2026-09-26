// FinanceFlow · v10.69 · tools/smoke_obrazfix.js · 2026-09-12
// S22 · FIX debt:0 ve zpětném okně + inflační reference.
const fs=require('fs'), vm=require('vm');
let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n);}catch(e){fails++;console.log('  ❌',n,'→',e.message);}};
const assert=(c,m)=>{if(!c)throw new Error(m);};
const noop=()=>{};const el=new Proxy({},{get:(t,k)=>k==='style'?{}:noop});
const sb={console,Math,Date,JSON,Object,Array,String,Number,Boolean,RegExp,Map,Set,Promise,Intl,
 Infinity,NaN,isFinite,isNaN,parseInt,parseFloat,setTimeout,clearTimeout,
 window:{},document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>el,addEventListener:noop,body:el,documentElement:el},
 localStorage:{getItem:()=>null,setItem:noop,removeItem:noop},navigator:{language:'cs-CZ'},location:{href:'x',pathname:'/'},
 fetch:()=>Promise.resolve({ok:false,json:()=>Promise.resolve({})}),requestAnimationFrame:c=>setTimeout(c,0),
 IntersectionObserver:class{observe(){}disconnect(){}},confirm:()=>true,alert:noop};
sb.window=sb;sb.globalThis=sb;sb.self=sb;vm.createContext(sb);
['helpers.js','assets.js','debts.js','projects.js'].forEach(f=>{
  try{vm.runInContext(fs.readFileSync(f,'utf8'),sb,{filename:f});}
  catch(e){console.error('❌ '+f+': '+e.message);process.exit(2);}});
sb.S={curMonth:6,curYear:2026,diary:{}};
vm.runInContext("S=globalThis.S; save=()=>{};",sb);

console.log('── FIX · zpětné okno bere dluh v potaz ──');
//  Uživatel splácí: dnes dluží 200k, za posledních 12 měsíců splatil 10k/měs.
const tx=[];
for(let i=0;i<13;i++){ let m=6-i,y=2026; while(m<0){m+=12;y--;}
  const iso=`${y}-${String(m+1).padStart(2,'0')}-15`;
  tx.push({id:'i'+i,date:iso,type:'income',amount:40000,catId:'v'});
  //  Appka drží částky KLADNĚ a směr určuje `type` – záporné číslo by
  //  obrátilo znaménko splátek a dluh by v minulosti vycházel nižší.
  tx.push({id:'e'+i,date:iso,type:'expense',amount:26000,catId:'z'});
  tx.push({id:'d'+i,date:iso,type:'expense',amount:10000,catId:'z',debtId:'d1'});
}
sb.__D={transactions:tx,debts:[{id:'d1',name:'Půjčka',remaining:200000}],
  wallets:[],assets:[],categories:[],shareSettings:{}};

check('zpětná řada už neplní debt:0',()=>{
  const src=fs.readFileSync('projects.js','utf8');
  const i=src.indexOf('function computeObrazScoreBack');
  const usek=src.slice(i,i+1600);
  assert(!/debt:\s*0\s*\}/.test(usek),'pořád plní nulu');
  assert(/paidAfter/.test(usek),'nerekonstruuje zůstatek ze splátek');
});
check('zpětné skóre se spočítá',()=>{
  const back=vm.runInContext('computeObrazScoreBack(__D,6,0)',sb);
  assert(back && typeof back.score==='number','skóre se nespočítalo');
});
check('KLÍČOVÉ · splácející dostane za dluh KLADNÉ body i ve zpětném okně',()=>{
  //  Dřív tu byla nula pokaždé, protože se plnilo debt:0.
  const r=vm.runInContext('computeObrazScoreBack(__D,6,0)',sb);
  const d=(r.parts||[]).find(x=>x&&x.key==='debt');
  assert(d,'složka dluhu ve výsledku není');
  assert(d.d>0,'body za dluh '+d.d+' (poznámka: '+d.note+') – splácení se neprojevilo');
});
check('bez dluhu zůstane složka na nule (nemá co měřit)',()=>{
  sb.__D2={transactions:tx.filter(t=>!t.debtId),debts:[],wallets:[],assets:[],categories:[],shareSettings:{}};
  const r=vm.runInContext('computeObrazScoreBack(__D2,6,0)',sb);
  const d=(r.parts||[]).find(x=>x&&x.key==='debt');
  assert(d && d.d===0,'bez dluhu vyšlo '+(d&&d.d));
});
check('druhý výskyt (v kartě Obrazu) opraven taky',()=>{
  const src=fs.readFileSync('projects.js','utf8');
  const zbyle=(src.match(/debt:\s*0\s*\}\)/g)||[]).length;
  assert(zbyle===0,'zbývá '+zbyle+' míst plnících debt:0');
});

console.log('\n── Inflační reference ──');
const ref=()=>vm.runInContext('obrazInflaceRef()',sb);
check('bez účtenek se použije pevná záloha 3 %',()=>{
  const r=ref();
  assert(r.zdroj==='fix','zdroj '+r.zdroj);
  assert(r.hodnota===3,'hodnota '+r.hodnota);
  assert(/naskenuj účtenky/.test(r.popis),'uživatel se nedozví, jak to zlepšit');
});
check('malý vzorek účtenek se NEPOUŽIJE (pod 5 položek je to šum)',()=>{
  vm.runInContext("_inflCollect=()=>[]; _inflCompute=()=>({yoy:9.5,yoyCount:2});",sb);
  assert(ref().zdroj==='fix','použilo inflaci ze 2 položek');
});
check('dost velký vzorek se použije a je vidět z čeho',()=>{
  vm.runInContext("_inflCompute=()=>({yoy:6.2,yoyCount:14});",sb);
  const r=ref();
  assert(r.zdroj==='osobni','zdroj '+r.zdroj);
  assert(Math.abs(r.hodnota-6.2)<0.01,'hodnota '+r.hodnota);
  assert(/14 položek/.test(r.popis),'popis '+r.popis);
});
check('ČSÚ: když je hodnota k dispozici, má přednost před pevnou',()=>{
  vm.runInContext("_inflCompute=()=>({yoy:null,yoyCount:0}); S.cnbInflace=2.4;",sb);
  const r=ref();
  assert(r.zdroj==='csu','zdroj '+r.zdroj);
  assert(r.hodnota===2.4,'hodnota '+r.hodnota);
});
check('u ČSÚ je vidět, odkud číslo je',()=>{
  vm.runInContext("S.cnbInflaceObd='2026-08';",sb);
  assert(/ČSÚ/.test(ref().popis),'popis neuvádí zdroj: '+ref().popis);
  assert(/2026-08/.test(ref().popis),'popis neuvádí období: '+ref().popis);
});
check('osobní přebije i ČSÚ',()=>{
  vm.runInContext("_inflCompute=()=>({yoy:6.2,yoyCount:14});",sb);
  assert(ref().zdroj==='osobni','ČSÚ přebil osobní inflaci');
});
check('rozbitý výpočet účtenek shodí na zálohu, ne na pád',()=>{
  vm.runInContext("_inflCompute=()=>{throw new Error('x')}; delete S.cnbInflace;",sb);
  assert(ref().zdroj==='fix','zdroj '+ref().zdroj);
});
console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ OPRAVY OVĚŘENY');
process.exit(fails?1:0);
