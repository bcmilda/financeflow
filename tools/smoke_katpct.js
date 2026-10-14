// FIX-292 (S20) – přehled „Rozděleno napříč kategoriemi" přeskakoval kategorie
// typu PŘESUN. Přitom právě ty bývají označené jako spoření/investice a mají
// healthPct (Milanovo „Penzijní spoření" typu Přesun s 20 %). Editovaná kategorie
// se přitom přičítala vždy → součet se choval jinak podle otevřené kategorie.
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('stats.js','utf8');
const i=src.indexOf('function updateCatPctInfo');
let d=0,j=src.indexOf('{',i),end=0;
for(let k=j;k<src.length;k++){if(src[k]=='{')d++;else if(src[k]=='}'){d--;if(!d){end=k+1;break}}}

function run(cats, form){
  const els={catPctAllocInfo:{innerHTML:''},
    editCatId:{value:form.eid||''}, catHealthPct:{value:String(form.pct||'')},
    catIsSaving:{checked:!!form.saving}, catIsInvest:{checked:!!form.invest}};
  const sb={console,Math,parseFloat,String,Number,
    S:{categories:cats}, document:{getElementById:id=>els[id]}};
  vm.createContext(sb); vm.runInContext(src.slice(i,end),sb);
  vm.runInContext('updateCatPctInfo()',sb);
  return els.catPctAllocInfo.innerHTML;
}
const num=(h,re)=>{const m=h.match(re);return m?parseFloat(m[1]):null;};
const exp=h=>num(h,/>([\d.]+) %<\/strong> výdaje/);
const sav=h=>num(h,/>([\d.]+) %<\/strong> spoření/);

let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m||'assert')};

console.log('── FIX-292 · rozdělení % napříč kategoriemi ──');

const CATS=[
  {id:'c1',name:'Jídlo',type:'expense',healthPct:30},
  {id:'c2',name:'Bydlení',type:'expense',healthPct:25},
  {id:'c3',name:'Penzijní spoření',type:'transfer',healthPct:20,isInvest:true},
  {id:'c4',name:'Rezerva',type:'transfer',healthPct:10,isSaving:true},
];

check('přesunové kategorie se ZAPOČÍTAJÍ do spoření (jádro opravy)',()=>{
  const h=run(CATS,{eid:'',pct:0});
  assert(sav(h)===30,'spoření '+sav(h)+' místo 30 (20 investice + 10 rezerva)');
  assert(exp(h)===55,'výdaje '+exp(h)+' místo 55');
});
check('součet nezávisí na tom, kterou kategorii mám otevřenou',()=>{
  // otevřu „Penzijní spoření" (20 %, invest) – celek musí zůstat stejný
  const h=run(CATS,{eid:'c3',pct:20,invest:true});
  assert(sav(h)===30,'při otevřené transfer kategorii: '+sav(h));
  assert(exp(h)===55,'výdaje: '+exp(h));
  // otevřu běžný výdaj
  const h2=run(CATS,{eid:'c1',pct:30});
  assert(sav(h2)===30&&exp(h2)===55,'při otevřeném výdaji: '+exp(h2)+'/'+sav(h2));
});
check('zbývá do 100 % sedí',()=>{
  const h=run(CATS,{eid:'',pct:0});
  assert(/zbývá 15 %/.test(h),'čekal jsem zbývá 15 %, je: '+h.replace(/<[^>]*>/g,''));
});
check('překročení se hlásí',()=>{
  const h=run(CATS.concat([{id:'c5',type:'expense',healthPct:60}]),{eid:'',pct:0});
  assert(/překročeno o 45/.test(h),'čekal jsem překročeno o 45 (115 výdaje + 30 spoření − 100), je: '+h.replace(/<[^>]*>/g,''));
});
check('příjmové kategorie se nepočítají',()=>{
  const h=run(CATS.concat([{id:'c6',type:'income',healthPct:99}]),{eid:'',pct:0});
  assert(exp(h)===55,'příjmová kategorie se započetla: '+exp(h));
});
check('editovaná hodnota z pole nahradí uloženou',()=>{
  const h=run(CATS,{eid:'c1',pct:5});   // Jídlo dočasně 5 místo 30
  assert(exp(h)===30,'výdaje '+exp(h)+' místo 30 (25 Bydlení + 5 z pole)');
});
check('bez spoření se zmínka o něm nezobrazí',()=>{
  const h=run([{id:'x',type:'expense',healthPct:40}],{eid:'',pct:0});
  assert(sav(h)===null,'zobrazilo spoření, i když žádné není');
});

console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ FIX-292 OVĚŘEN');
process.exit(fails?1:0);
