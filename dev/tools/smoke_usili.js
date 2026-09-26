// FinanceFlow · v10.65 · tools/smoke_usili.js · 2026-09-12
// S22 · Přesčasy: zápis z checklistu + bonus za úsilí v Obrazu.
// Klíčové vlastnosti, které se testují:
//   • bonus se počítá ze STAVU, ne ze změny → omezení přesčasů NIKDY nestojí body
//   • neodpovězený měsíc není nula (nula = „neměl jsem", null = „nevíme")
//   • strop 15 z 200, protože údaj je neověřitelný
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
vm.runInContext("S=globalThis.S; getData=()=>({}); save=()=>{}; renderPage=()=>{};",sb);
const set=(h,m,y)=>vm.runInContext(`otSet(${h===null?'null':h}${m!==undefined?','+m+','+y:''})`,sb);
const get=(m,y)=>vm.runInContext(`otGet(${m!==undefined?m+','+y:''})`,sb);
const bonus=()=>vm.runInContext('obrazUsiliBonus(null,6)',sb);

console.log('── Zápis přesčasů ──');
check('bez odpovědi vrací null, ne nulu',()=>{
  sb.S.diary={}; assert(get()===null,'vrátilo '+get());
});
check('odpověď „žádný" se uloží jako 0 (jiná informace než neodpovězeno)',()=>{
  set(0); assert(get()===0,'vrátilo '+get());
});
check('odpověď se uloží i když snímek měsíce neexistuje',()=>{
  sb.S.diary={}; set(17);
  assert(get()===17,'vrátilo '+get());
  assert(sb.S.diary['2026-07'].onlyOvertime===true,'chybí značka záznamu bez predikce');
});
check('zápis nepřepíše existující snímek predikce',()=>{
  sb.S.diary={'2026-07':{predExp:25000,predInc:40000,auto:true}};
  set(10);
  assert(sb.S.diary['2026-07'].predExp===25000,'predikce se ztratila');
  assert(sb.S.diary['2026-07'].overtimeH===10,'přesčas se nezapsal');
  assert(!sb.S.diary['2026-07'].onlyOvertime,'označilo snímek s predikcí jako pouze-přesčas');
});
check('„změnit" odpověď zruší, nenastaví nulu',()=>{
  sb.S.diary={}; set(20); assert(get()===20);
  set(null); assert(get()===null,'po zrušení vrací '+get()+' místo null');
});
check('zrušení nechá snímek s predikcí na pokoji',()=>{
  sb.S.diary={'2026-07':{predExp:25000,auto:true}};
  set(8); set(null);
  assert(sb.S.diary['2026-07'],'smazalo celý snímek i s predikcí!');
  assert(sb.S.diary['2026-07'].predExp===25000,'predikce zmizela');
});

console.log('\n── Bonus za úsilí (0–15) ──');
const naplnit=(hodiny)=>{ sb.S.diary={};
  hodiny.forEach((h,i)=>{ let m=6-i,y=2026; while(m<0){m+=12;y--;} if(h!==null) set(h,m,y); }); };

check('bez odpovědí je bonus 0 a je vidět, že se nikdo nevyjádřil',()=>{
  sb.S.diary={}; const b=bonus();
  assert(b.bonus===0,'bonus '+b.bonus); assert(b.mesicu===0,'měsíců '+b.mesicu);
  assert(b.prumer===null,'průměr má být null, je '+b.prumer);
});
check('žádné přesčasy → bonus 0, ale odpovězeno',()=>{
  naplnit([0,0,0,0,0,0]); const b=bonus();
  assert(b.bonus===0,'bonus '+b.bonus); assert(b.mesicu===6,'měsíců '+b.mesicu);
});
check('20 h/měs → bonus 10',()=>{
  naplnit([20,20,20,20,20,20]); assert(bonus().bonus===10,'bonus '+bonus().bonus);
});
check('strop drží: i extrémní přesčasy dají max 15',()=>{
  naplnit([80,80,80,80,80,80]); assert(bonus().bonus===15,'bonus '+bonus().bonus);
});
check('KLÍČOVÉ · omezení ze 4× na 2× týdně NESTOJÍ body (bonus jen klesne)',()=>{
  naplnit([32,32,32,32,32,32]); const drive=bonus().bonus;
  naplnit([17,17,17,32,32,32]); const ted=bonus().bonus;
  assert(ted>0,'po omezení bonus spadl na nulu – trestá za ubrání');
  assert(ted<=drive,'bonus po omezení vzrostl');
  assert(ted>=6,'bonus po omezení je '+ted+' – propad je moc strmý');
});
check('bonus nikdy není záporný',()=>{
  naplnit([0,0,0,32,32,32]); assert(bonus().bonus>=0,'záporný bonus '+bonus().bonus);
});
check('neodpovězené měsíce se do průměru nepočítají',()=>{
  naplnit([20,null,null,null,null,null]); const b=bonus();
  assert(b.mesicu===1,'počítá '+b.mesicu+' měsíců místo 1');
  assert(b.prumer===20,'průměr '+b.prumer+' – neodpovězené bere jako nulu');
});

console.log('\n── Pozdní snímek nekazí přesnost predikce ──');
check('den pořízení se ukládá',()=>{
  const src=fs.readFileSync('projects.js','utf8');
  assert(/snap\.day=now\.getDate\(\)/.test(src),'den se neukládá');
});
check('snímek po 5. dni se nepočítá do průměrné odchylky',()=>{
  const src=fs.readFileSync('transactions.js','utf8');
  assert(/const pozdni = \(typeof s\.day==='number'\) && s\.day > 5/.test(src),'chybí detekce pozdního snímku');
  assert(/if\(closed && dev!==null && !pozdni\)/.test(src),'pozdní snímek se pořád počítá do MAPE');
  assert(/částečný/.test(src),'uživatel se nedozví, proč se nepočítá');
});
check('záznam bez predikce se v tabulce přesnosti přeskočí',()=>{
  const src=fs.readFileSync('transactions.js','utf8');
  assert(/if\(!\(s\.predExp>0\)\) return;/.test(src),'záznam jen s přesčasy by vypsal prázdný řádek');
});
console.log('\n── Výplatnice mají přednost před ručním zápisem ──');
const pasky=(arr)=>{ sb.S.payslips=arr; };

check('přesčas z pásky = odpracováno nad fond',()=>{
  sb.S.diary={}; pasky([{m:'2026-07',hlavicka:{fond:168,odprac:196}}]);
  assert(get()===28,'vrátilo '+get()+', čekáno 28');
});
check('páska přebije ruční odpověď',()=>{
  sb.S.diary={}; set(5);
  pasky([{m:'2026-07',hlavicka:{fond:168,odprac:196}}]);
  assert(get()===28,'ruční 5 h přebilo pásku: '+get());
  assert(vm.runInContext("otZdroj()",sb)==='payslip','zdroj hlásí '+vm.runInContext("otZdroj()",sb));
});
check('bez pásky se použije ruční odpověď',()=>{
  pasky([]); sb.S.diary={}; set(12);
  assert(get()===12,'vrátilo '+get());
  assert(vm.runInContext("otZdroj()",sb)==='rucne','zdroj hlásí '+vm.runInContext("otZdroj()",sb));
});
check('neúplná páska (chybí fond) se ignoruje, nevrátí nesmysl',()=>{
  sb.S.diary={}; pasky([{m:'2026-07',hlavicka:{odprac:196}}]);
  assert(get()===null,'z neúplné pásky vyšlo '+get());
});
check('odpracováno POD fond = 0 přesčasů, ne záporné číslo',()=>{
  pasky([{m:'2026-07',hlavicka:{fond:168,odprac:140}}]);
  assert(get()===0,'vrátilo '+get()+' (dovolená by dělala záporný přesčas)');
});
check('checklist se na přesčas neptá, když je páska',()=>{
  const src=fs.readFileSync('ui.js','utf8');
  assert(/otask:!otZPasky/.test(src),'otázka se zobrazí i když appka odpověď zná');
  assert(/z výplatnice/.test(src),'uživatel se nedozví, odkud číslo je');
});

console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ ÚSILÍ OVĚŘENO');
process.exit(fails?1:0);
