// FIX-276 – hláška u termínu cíle (prošlý termín hlásil „Deadline za −88 dní!")
// FIX-277 – import hledal podkategorie v `subcats`, pole se jmenuje `subs`
const fs=require('fs'),vm=require('vm');
const pick=(src,n)=>{const i=src.indexOf('function '+n);if(i<0)throw new Error('nenalezeno: '+n);
  let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};

let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m||'assert')};

// ══════ FIX-276 · termín cíle ══════
const nakupSrc=fs.readFileSync('nakup.js','utf8');
function mkGoalSandbox(dnesISO){
  const sb={console,Math,Number,isNaN,String,Object,Array};
  // Zmrazený „dnešek", ať test nezestárne
  const FIXED=new Date(dnesISO+'T14:30:00');
  sb.Date=class extends Date{ constructor(...a){ if(!a.length) super(FIXED.getTime()); else super(...a); } };
  sb._goalDeposits={g1:[{id:'d1',amount:3000}]};
  vm.createContext(sb);
  vm.runInContext([pick(nakupSrc,'_goalDnu'),pick(nakupSrc,'goalGetSaved'),pick(nakupSrc,'goalGetStatus')].join('\n'),sb);
  return sb;
}
const goal=(deadline)=>({id:'g1',targetAmount:10000,monthlyTarget:1000,deadline});

console.log('── FIX-276 · termín cíle ──');

check('prošlý termín NEHLÁSÍ záporné dny',()=>{
  const sb=mkGoalSandbox('2026-08-28');
  const st=sb.goalGetStatus(goal('2026-06-01'));
  assert(st.deadlineInfo.daysLeft===-88,'daysLeft='+st.deadlineInfo.daysLeft);
  assert(!/-\d/.test(st.moodText),'v hlášce je záporné číslo: '+st.moodText);
  assert(st.moodText==='Termín uplynul před 88 dny','hláška: '+st.moodText);
});

check('termín dnes = 0 dní bez ohledu na denní dobu',()=>{
  const sb=mkGoalSandbox('2026-08-28');
  const st=sb.goalGetStatus(goal('2026-08-28'));
  assert(st.deadlineInfo.daysLeft===0,'daysLeft='+st.deadlineInfo.daysLeft);
  assert(st.moodText==='Termín je dnes','hláška: '+st.moodText);
});

check('blížící se termín říká, kolik zbývá',()=>{
  const sb=mkGoalSandbox('2026-08-28');
  const st=sb.goalGetStatus(goal('2026-09-05'));
  assert(st.deadlineInfo.daysLeft===8,'daysLeft='+st.deadlineInfo.daysLeft);
  assert(st.moodText==='Zbývá 8 dní','hláška: '+st.moodText);
});

check('vzdálený termín motivační hlášku nepřebíjí',()=>{
  const sb=mkGoalSandbox('2026-08-28');
  const st=sb.goalGetStatus(goal('2027-06-01'));
  assert(st.mood!=='🔴','vzdálený termín zbytečně alarmuje');
  assert(st.moodText==='Pokračuj dál','hláška: '+st.moodText);
});

check('splněný cíl termín neřeší (ani prošlý)',()=>{
  const sb=mkGoalSandbox('2026-08-28');
  sb._goalDeposits={g1:[{id:'d1',amount:10000}]};
  const st=sb.goalGetStatus(goal('2026-06-01'));
  assert(st.moodText==='Cíl splněn!','splněnému cíli se vnutila hláška o termínu: '+st.moodText);
});

check('skloňování: 1 den · 3 dny · 8 dní · před 1 dnem · před 5 dny',()=>{
  const sb=mkGoalSandbox('2026-08-28');
  const d=sb._goalDnu;
  assert(d(1)==='1 den',d(1));
  assert(d(3)==='3 dny',d(3));
  assert(d(8)==='8 dní',d(8));
  assert(d(-1,'pred')==='1 dnem',d(-1,'pred'));
  assert(d(-5,'pred')==='5 dny',d(-5,'pred'));
});

check('cíl bez termínu nespadne',()=>{
  const sb=mkGoalSandbox('2026-08-28');
  const st=sb.goalGetStatus(goal(null));
  assert(st.deadlineInfo===null,'deadlineInfo má být null');
  assert(st.moodText==='Pokračuj dál','hláška: '+st.moodText);
});

// ══════ FIX-277 · podkategorie v importu ══════
const impSrc=fs.readFileSync('import.js','utf8');
function mkImportSandbox(cats){
  const sb={console,Object,Array,String};
  sb.getData=()=>({categories:cats});
  vm.createContext(sb);
  vm.runInContext(pick(impSrc,'guessCategoryFromKeyword'),sb);
  return sb;
}

console.log('\n── FIX-277 · návrh podkategorie při importu ──');

const CATS=[{id:'c1',name:'Doprava',subs:['Benzín','MHD']},
            {id:'c2',name:'Jídlo',subs:['Restaurace','Potraviny']}];

check('podkategorie se najde přes pole `subs` (jádro opravy)',()=>{
  const sb=mkImportSandbox(CATS);
  const r=sb.guessCategoryFromKeyword('Shell benzín Praha');
  assert(r,'nenašlo vůbec nic');
  assert(r.subcat==='Benzín','podkategorie nenavržena, subcat='+JSON.stringify(r.subcat));
  assert(r.catId==='c1','špatná kategorie: '+r.catId);
});

check('shoda na hlavní kategorii má přednost před podkategorií',()=>{
  const sb=mkImportSandbox(CATS);
  const r=sb.guessCategoryFromKeyword('Doprava měsíční');
  assert(r && r.catId==='c1' && r.subcat==='','čekal jsem kategorii bez podkategorie: '+JSON.stringify(r));
});

check('podkategorie jako objekt {name} taky funguje',()=>{
  const sb=mkImportSandbox([{id:'c3',name:'Bydlení',subs:[{name:'Elektřina'}]}]);
  const r=sb.guessCategoryFromKeyword('Platba elektřina ČEZ');
  assert(r && r.subcat==='Elektřina','objektová podkategorie nenalezena: '+JSON.stringify(r));
});

check('nic nesedí → null (nevymýšlí si)',()=>{
  const sb=mkImportSandbox(CATS);
  assert(sb.guessCategoryFromKeyword('XYZ 12345')===null,'vymyslel si kategorii');
});

check('kategorie bez podkategorií nespadne',()=>{
  const sb=mkImportSandbox([{id:'c4',name:'Ostatní'}]);
  assert(sb.guessCategoryFromKeyword('něco jiného')===null);
});

console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ FIX-276 + FIX-277 OVĚŘENY');
process.exit(fails?1:0);
