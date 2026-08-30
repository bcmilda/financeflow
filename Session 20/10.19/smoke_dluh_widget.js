// FIX-284 (S20) – widget „Jak pracuješ pro banky":
//   1) dny pro banku se barvily podle ZATÍŽENÍ (barColor), takže při bezpečném
//      pásmu byly zelené – stejně jako dny pro sebe. Den odpracovaný pro banku
//      není dobrá zpráva, i když je jich málo.
//   2) legenda a čísla v kalendáři byly nečitelné (opacity na celém prvku
//      vybledla i text).
//   3) bar měl popisky „0 dní / 21 dní", ale kalendář pod ním má 28–31 dní
//      a výplň se počítala z % příjmu – tři různé jednotky v jednom widgetu.
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('debts.js','utf8');
const i=src.indexOf('function renderDebtFreedomWidget');
if(i<0) throw new Error('renderDebtFreedomWidget nenalezen');
let d=0,j=src.indexOf('{',i),end=0;
for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d){end=k+1;break}}}
const body=src.slice(i,end);

function render(income, payment){
  const els={};
  const sb={console,Date,Math,Array,Object,String,Number,isFinite,
    document:{getElementById(id){if(!els[id])els[id]={innerHTML:''};return els[id];}},
    getData:()=>({debts:[{id:'d1',remaining:200000,payment,freq:'monthly',interest:5,startDate:'2026-01-15'}]}),
    computeBaseIncome:()=>income,
    fmtB:v=>Math.round(v)+' Kč',
    generateSchedule:()=>[{num:1,date:'2035-10-30',payment,interest:0,principal:payment,remaining:0}],
    els};
  sb.window=sb; vm.createContext(sb);
  vm.runInContext(body,sb);
  vm.runInContext('renderDebtFreedomWidget(getData())',sb);
  return els['debtFreedomWidget'] ? els['debtFreedomWidget'].innerHTML : '';
}

let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m||'assert')};

console.log('── FIX-284 · widget „Jak pracuješ pro banky" ──');

// Milanův případ ze screenshotu: 2 500 Kč splátky z příjmu 28 620 = 9 %
const safeHtml = render(28620, 2500);

check('dny pro banku jsou ČERVENÉ i v bezpečném pásmu (jádro opravy)',()=>{
  assert(safeHtml.includes('debt-days-big" style="color:var(--expense)'),
    'hlavní číslo není v barvě dluhu – pořád se barví podle zatížení');
});
check('hodnocení „Bezpečné pásmo" zůstává zelené (dvě různé barvy vedle sebe)',()=>{
  assert(safeHtml.includes('Bezpečné pásmo'),'chybí hodnocení');
  assert(safeHtml.includes('color:var(--income)">✅ Bezpečné pásmo'),
    'hodnocení se přebarvilo – to má zůstat podle zatížení');
});
check('kalendář: dny banky červené, dny pro sebe zelené',()=>{
  assert(safeHtml.includes('background:var(--expense);display:flex'),'chybí červené dny');
  assert(safeHtml.includes('background:var(--income);display:flex'),'chybí zelené dny');
});
check('žádná opacity na dnech ani legendě (nečitelnost)',()=>{
  const kalendar = safeHtml.slice(safeHtml.indexOf('Vizuální kalendář'), safeHtml.indexOf('Fun metriky'));
  assert(kalendar.indexOf('opacity')<0,'opacity se vrátila – text bude znovu vybledlý');
});
check('bar má popisky ve DNECH podle délky měsíce, ne pevných 21',()=>{
  assert(safeHtml.indexOf('21 dní</span>')<0,'pořád tam je pevných 21 dní');
  assert(/2[89] dní<\/span>|3[01] dní<\/span>/.test(safeHtml),'chybí popisek podle délky měsíce');
});
check('výplň baru odpovídá dnům, ne procentu příjmu',()=>{
  // 2500/28620 = 8,7 % → 3 dny z 31 = 9,7 %. Kdyby se použilo pct, bylo by 9 %.
  const m = safeHtml.match(/trap-bar-fill" style="width:(\d+)%/);
  assert(m,'nenalezena výplň baru');
  const w = Number(m[1]);
  // pozor: „0 dní" je levý popisek, délku měsíce nese ten PRAVÝ
  const dm = Number((safeHtml.match(/<span>(\d+) dní<\/span>\s*<\/div>/)||[])[1]);
  const dni = Number((safeHtml.match(/debt-days-big[^>]*>(\d+)</)||[])[1]);
  assert(w===Math.round(dni/dm*100),`výplň ${w}% neodpovídá ${dni}/${dm} dní`);
});
check('skloňování v legendě (1 den · 3 dny · 28 dní)',()=>{
  assert(/3 dny pro banky/.test(safeHtml),'špatné skloňování dnů pro banky');
  assert(/2[89] dní pro tebe|3[01] dní pro tebe/.test(safeHtml),'špatné skloňování dnů pro tebe');
});

console.log('\n── vysoké zatížení ──');
const badHtml = render(28620, 20000);   // 70 % příjmu
check('při kritickém zatížení zůstává hodnocení červené',()=>{
  assert(badHtml.includes('Kritické'),'chybí kritické hodnocení');
});
check('dny pro banku jsou červené i tady (konzistence)',()=>{
  assert(badHtml.includes('debt-days-big" style="color:var(--expense)'));
});

console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ FIX-284 OVĚŘEN');
process.exit(fails?1:0);
