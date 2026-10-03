// FinanceFlow · v10.67 · tools/smoke_nwm.js · 2026-09-12
// S22 · Net Worth Momentum – složka Finančního obrazu měřící STAV majetku.
// Milanova volba: bodují se dva pohledy (proti výdajům 70 %, zrychlení 30 %),
// třetí (v korunách) je jen text. Historie čistého jmění se ukládá teprve od
// v10.67, takže bez ní musí složka vypadnout z výpočtu – NE dostat nulu.
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
vm.runInContext("S=globalThis.S; save=()=>{}; renderPage=()=>{};",sb);

// 12 měsíců výdajů po 25 000 Kč
const tx=[]; for(let i=0;i<13;i++){ let m=6-i,y=2026; while(m<0){m+=12;y--;}
  tx.push({id:'e'+i,date:`${y}-${String(m+1).padStart(2,'0')}-15`,type:'expense',amount:25000,catId:'z'}); }
sb.__D={transactions:tx,debts:[],wallets:[],assets:[],categories:[],shareSettings:{}};
vm.runInContext("getData=()=>__D;",sb);
const nastavNW=(ted,pred,pred2)=>{
  vm.runInContext(`computeAssetsNetWorth=()=>(${ted===null?'null':`{netWorth:${ted}}`});`,sb);
  sb.S.diary={};
  if(pred!==null&&pred!==undefined) sb.S.diary['2026-01']={netWorth:pred};   // 6 měs. zpět
  if(pred2!==null&&pred2!==undefined) sb.S.diary['2025-07']={netWorth:pred2}; // 12 měs. zpět
};
const nwm=()=>vm.runInContext('obrazNetWorthMomentum(__D,6)',sb);
const text=()=>vm.runInContext('obrazNWMText(obrazNetWorthMomentum(__D,6))',sb);

console.log('── Dostupnost ──');
check('bez historie složka NENÍ měřitelná (nedostane nulu)',()=>{
  nastavNW(500000,null,null); const r=nwm();
  assert(r.avail===false,'tváří se jako měřitelná');
  assert(r.sub===null,'dostala body '+r.sub+' – nula by tvrdila, že jmění stagnuje');
  assert(/za pár měsíců/.test(r.duvod),'chybí vysvětlení: '+r.duvod);
});
check('se snímkem 6 měs. zpět už měřitelná je',()=>{
  nastavNW(500000,400000,null);
  assert(nwm().avail===true,'pořád nedostupná');
});

console.log('\n── 1) Proti výdajům (70 %) ──');
check('přírůstek 150k při výdajích 25k = 6 měsíců života → strop',()=>{
  nastavNW(550000,400000,null); const r=nwm();
  assert(Math.abs(r.mesiceZivota-6)<0.01,'měsíců '+r.mesiceZivota);
  assert(r.subVydaje===100,'body '+r.subVydaje);
});
check('KLÍČOVÉ · vyšší příjem se neztratí (neměří se proti příjmu)',()=>{
  // Stejné výdaje, dvojnásobný přírůstek → musí vyjít VÝRAZNĚ líp.
  nastavNW(425000,400000,null); const maly=nwm().subVydaje;
  nastavNW(475000,400000,null); const velky=nwm().subVydaje;
  assert(velky>maly,'dvojnásobný přírůstek nedal víc bodů ('+maly+' vs '+velky+')');
});
check('propad jmění dává záporné body',()=>{
  nastavNW(350000,400000,null);
  assert(nwm().subVydaje<0,'body '+nwm().subVydaje);
});

console.log('\n── 2) Zrychlení (30 %) ──');
check('bez okna navíc se zrychlení nepočítá a složku nese jen výdajový pohled',()=>{
  nastavNW(450000,400000,null); const r=nwm();
  assert(r.zrychleni===null,'zrychlení '+r.zrychleni);
  assert(r.sub===r.subVydaje,'sub '+r.sub+' ≠ subVydaje '+r.subVydaje+' – dopočítalo zrychlení nulou');
});
check('dvojnásobné tempo = +100 % zrychlení',()=>{
  nastavNW(460000,400000,370000); const r=nwm();   // dřív +30k, teď +60k
  assert(Math.abs(r.zrychleni-100)<0.01,'zrychlení '+r.zrychleni);
  assert(r.subZrychl===100,'body '+r.subZrychl);
});
check('stejné tempo = nulové zrychlení (ne trest)',()=>{
  nastavNW(460000,400000,340000); const r=nwm();   // dřív +60k, teď +60k
  assert(Math.abs(r.zrychleni)<0.01,'zrychlení '+r.zrychleni);
  assert(r.subZrychl===0,'body '+r.subZrychl);
});
check('záporné dřívější tempo → zrychlení se nepočítá (procento by nedávalo smysl)',()=>{
  nastavNW(460000,400000,450000); const r=nwm();   // dřív -50k
  assert(r.zrychleni===null,'spočítalo zrychlení z propadu: '+r.zrychleni);
});
check('míchání 70/30 sedí',()=>{
  nastavNW(460000,400000,370000); const r=nwm();
  const ocekavano=Math.round((r.subVydaje*70+r.subZrychl*30)/100);
  assert(Math.abs(r.sub-ocekavano)<=1,'sub '+r.sub+', čekáno '+ocekavano);
});

console.log('\n── 3) V korunách: jen text, žádné body ──');
check('text nese všechny tři pohledy',()=>{
  nastavNW(484000,400000,370000); const t=text();
  assert(/84/.test(t),'chybí částka v korunách: '+t);
  assert(/měsíce života/.test(t),'chybí měsíce života: '+t);
  assert(/rychleji|pomaleji|tempo/.test(t),'chybí zrychlení: '+t);
});
check('pokles se popíše správným směrem',()=>{
  nastavNW(350000,400000,null); const t=text();
  assert(/kleslo/.test(t),'popisuje pokles jako růst: '+t);
  assert(/míň/.test(t),'neříká, že měsíců ubylo: '+t);
});
check('bez historie text vysvětlí proč, místo prázdna',()=>{
  nastavNW(500000,null,null);
  assert(/za pár měsíců/.test(text()),'text: '+text());
});

console.log('\n── Ukládání historie ──');
check('snímek ukládá netWorth',()=>{
  const src=fs.readFileSync('projects.js','utf8');
  const i=src.indexOf('function _denikBuildSnap');
  assert(/netWorth:/.test(src.slice(i,i+3000)),'snímek netWorth neukládá – řada se nezačne kupit');
});
console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ NET WORTH MOMENTUM OVĚŘENO');
process.exit(fails?1:0);
