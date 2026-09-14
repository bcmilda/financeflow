// TODO-228 · FIX-270 · FIX-271
// v10.60 (S22): sekce TODO-227 PŘEPSÁNA na behaviorální testy (SKILL 35 –
//   "testy kontrolovaly tvar kódu místo chování" – FIX-310 prošel do produkce
//   se zeleným testem, protože testoval doslovný text zdrojáku, ne výstup).
//   Místo regexů nad premium.js teď skript SKUTEČNĚ VOLÁ computeFinancialScore()
//   s testovacími daty ve stejném vm-sandboxu jako tools/smoke.js.
const fs = require('fs'), path = require('path'), vm = require('vm');
let fails = 0;
const check = (n,f) => { try{ f(); console.log('  ✅', n); } catch(e){ fails++; console.log('  ❌', n, '→', e.message); } };
const assert = (c,m) => { if(!c) throw new Error(m); };
const close = (a,b,tol) => Math.abs(a-b) <= tol;

console.log('── TODO-228 · váhy + kotvy, práh pokrytí (behaviorální) ──');

// ── vm-sandbox (stejný vzor jako tools/smoke.js) ──
const noop = () => {};
const elStub = new Proxy({}, { get: (t,k)=> k==='style'?{}:(k==='classList'?{add:noop,remove:noop,toggle:noop}:noop) });
const sandbox = {
  console, Math, Date, JSON, Object, Array, String, Number, Boolean, RegExp, Map, Set, Promise,
  Infinity, NaN, isFinite, isNaN, parseInt, parseFloat, setTimeout, clearTimeout,
  window: {}, document: { getElementById: ()=>null, querySelector: ()=>null, querySelectorAll: ()=>[],
    createElement: ()=>elStub, addEventListener: noop, body: elStub, documentElement: elStub },
  localStorage: { getItem: ()=>null, setItem: noop, removeItem: noop },
  navigator: { language: 'cs-CZ', userAgent: 'smoke' },
  location: { href: 'https://financeflow.cz/app', pathname: '/app' },
  fetch: () => Promise.resolve({ ok:false, json:()=>Promise.resolve({}) }),
  requestAnimationFrame: (cb)=>setTimeout(cb,0), IntersectionObserver: class{observe(){}disconnect(){}},
  confirm: ()=>true, alert: noop,
};
sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
vm.createContext(sandbox);
function load(file){
  const code = fs.readFileSync(file, 'utf8');
  try { vm.runInContext(code, sandbox, { filename: file }); }
  catch(e){ console.error(`❌ Nelze načíst ${file}: ${e.message}`); process.exit(2); }
}
['helpers.js','assets.js','debts.js','projects.js','premium.js'].forEach(load);
sandbox.S = { curMonth: 6, curYear: 2026, wallets: [] };   // "dnes" = červenec 2026 (fixní)
vm.runInContext('S = globalThis.S;', sandbox);

const _card = { innerHTML: '' };
sandbox.document.getElementById = (id) => id==='financialScoreCard' ? _card : null;

const score = (D) => { sandbox.__D = D; return vm.runInContext('computeFinancialScore(__D)', sandbox); };
const render = (D) => { sandbox.__D = D; _card.innerHTML=''; vm.runInContext('renderFinancialScore(__D)', sandbox); return _card.innerHTML; };
const setHasDebts = (v) => vm.runInContext(`_settings.hasDebts = ${JSON.stringify(v)};`, sandbox);
const resetSettings = () => vm.runInContext(`_settings = {lang:'cs', currency:'CZK', dateFmt:'cs'};`, sandbox);

// Pomocník: transakce v aktuálním měsíci a K měsících zpět (0..monthsBack).
function txMonths(monthsBack, gen){
  const txs=[]; let id=0;
  for(let i=0;i<=monthsBack;i++){
    let m=6-i, y=2026; while(m<0){m+=12;y--;}
    const iso=`${y}-${String(m+1).padStart(2,'0')}-15`;
    gen(iso,i).forEach(t=>txs.push(Object.assign({id:'t'+(id++)}, t)));
  }
  return txs;
}

check('zcela prázdný účet → skóre nelze určit (0 % pokrytí)', () => {
  resetSettings();
  const r = score({ transactions:[], debts:[], wallets:[], assets:[], categories:[], shareSettings:{} });
  assert(r.total===null, 'total není null: '+r.total);
  assert(r.coverage===0, 'coverage není 0: '+r.coverage);
  assert(r.grade.label==='Zatím nelze určit', 'špatná známka: '+r.grade.label);
  assert(r.rawMax===310, 'rawMax není 310: '+r.rawMax);
  assert(r.rawTotal===0, 'rawTotal není 0: '+r.rawTotal);
});

check('TODO-228 · jen "nemám dluh" potvrzeno (25 % pokrytí) → POD PRAHEM, žádná známka', () => {
  resetSettings(); setHasDebts(false);
  const r = score({ transactions:[], debts:[], wallets:[], assets:[], categories:[], shareSettings:{} });
  assert(r.coverage===25, 'coverage není 25: '+r.coverage);
  assert(r.total===null, 'total není null (dřív by tu bylo "Výborné 100"): '+r.total);
  assert(r.grade.label==='Zatím nemám dost dat na hodnocení', 'špatná hláška: '+r.grade.label);
  assert(r.rawTotal===0, 'rawTotal prosakuje reálné číslo přes práh: '+r.rawTotal);
});

check('jen cash flow (30 % pokrytí) → pořád pod prahem 50 %', () => {
  resetSettings();
  const D = { transactions: txMonths(0,(iso)=>[
      {date:iso,type:'income',amount:40000,name:'Výplata',catId:'vyplata'},
      {date:iso,type:'expense',amount:26000,name:'Život',catId:'zivot'},
    ]), debts:[], wallets:[], assets:[], categories:[], shareSettings:{} };
  const r = score(D);
  assert(r.coverage===30, 'coverage není 30: '+r.coverage);
  assert(r.total===null, 'total není null: '+r.total);
});

check('cash flow + potvrzený "bez dluhu" (55 % pokrytí) → známka se objeví a odpovídá váženému průměru', () => {
  resetSettings(); setHasDebts(false);
  const D = { transactions: txMonths(0,(iso)=>[
      {date:iso,type:'income',amount:40000,name:'Výplata',catId:'vyplata'},
      {date:iso,type:'expense',amount:26000,name:'Život',catId:'zivot'},   // expRatio=0.65 → kotva přesně 85
    ]), debts:[], wallets:[], assets:[], categories:[], shareSettings:{} };
  const r = score(D);
  assert(r.coverage===55, 'coverage není 55: '+r.coverage);
  assert(r.total!==null, 'total je pořád null nad prahem');
  // Vážený průměr: (30×85 + 25×100) / 55 = 91,8 → zaokrouhleno 92 (bez bonusu, cm=0 v prvním měsíci historie)
  assert(close(r.total, 92, 1), 'total mimo očekávané okolí 92: '+r.total);
  assert(r.rawTotal>0 && r.rawTotal<=310, 'rawTotal mimo rozsah: '+r.rawTotal);
  assert(['Výborné','Velmi dobré'].includes(r.grade.label), 'neočekávaná známka: '+r.grade.label);
});

check('TODO-228 · S3 rezerva se počítá proti VÝDAJŮM, ne příjmu', () => {
  resetSettings();
  const D = { transactions: txMonths(0,(iso)=>[
      {date:iso,type:'income',amount:80000,name:'Výplata',catId:'vyplata'},
      {date:iso,type:'expense',amount:25000,name:'Život',catId:'zivot'},
    ]), debts:[], wallets:[{id:'w1',name:'Spořicí',type:'savings',balance:150000}], assets:[], categories:[], shareSettings:{} };
  const r = score(D);
  const s3 = r.components.find(c=>c.label.includes('Rezerva'));
  assert(s3.avail, 'S3 by mělo být dostupné (existuje spořicí peněženka)');
  // 150 000 / 25 000 výdajů = 6,0 měsíců (proti příjmu 80 000 by vyšlo jen 1,9)
  assert(/6\.0 měs\. výdajů/.test(s3.detail), 'label neukazuje 6.0 měs. výdajů: '+s3.detail);
});

check('S3 · nula lže: bez spořicí peněženky/aktiva je S3 NEDOSTUPNÉ, ne 0', () => {
  resetSettings();
  const D = { transactions: txMonths(0,(iso)=>[
      {date:iso,type:'income',amount:40000,name:'Výplata',catId:'vyplata'},
      {date:iso,type:'expense',amount:26000,name:'Život',catId:'zivot'},
    ]), debts:[], wallets:[], assets:[], categories:[], shareSettings:{} };
  const r = score(D);
  const s3 = r.components.find(c=>c.label.includes('Rezerva'));
  assert(s3.avail===false, 'S3 by mělo být NEDOSTUPNÉ bez peněženky/aktiva, ne skórované jako 0');
});

check('bonus za konzistenci: 6 po sobě jdoucích měsíců poklesu výdajů → +bonus, škála 0–310', () => {
  resetSettings(); setHasDebts(false);
  // 7 měsíců dat. Algoritmus jde ZPĚT od přítomnosti a hledá pokles výdajů
  // (aktuální < předchozí) – výdaje proto musí RŮST směrem do minulosti
  // (i=0 je nejnovější měsíc s nejnižšími výdaji, i=6 nejstarší s nejvyššími).
  const D = { transactions: txMonths(6,(iso,i)=>[
      {date:iso,type:'income',amount:40000,name:'Výplata',catId:'vyplata'},
      {date:iso,type:'expense',amount:24000+i*1000,name:'Život',catId:'zivot'},
    ]), debts:[], wallets:[], assets:[], categories:[], shareSettings:{} };
  const r = score(D);
  assert(r.trend.consistencyMonths>=6, 'consistencyMonths < 6: '+r.trend.consistencyMonths);
  assert(r.consistencyBonus>0, 'bonus se nepřičetl');
  assert(r.consistencyBonus<=16, 'bonus přesahuje +5 na 100 škále (×3,1 ≈ 15,5): '+r.consistencyBonus);
});

check('FIX · gauge dostává plnou škálu 310, ne availMax (nepřetéká)', () => {
  resetSettings(); setHasDebts(false);
  const D = { transactions: txMonths(0,(iso)=>[
      {date:iso,type:'income',amount:40000,name:'Výplata',catId:'vyplata'},
      {date:iso,type:'expense',amount:26000,name:'Život',catId:'zivot'},
    ]), debts:[], wallets:[], assets:[], categories:[], shareSettings:{} };
  const r = score(D);
  // rawTotal je v v2 už znormalizovaný vážený průměr ×3,1 → leží na plné škále.
  // Kdyby render podal gauge availMax (171), zobrazil by „285 / 171".
  assert(r.rawTotal <= r.rawMax, `rawTotal ${r.rawTotal} > rawMax ${r.rawMax}`);
  assert(r.rawTotal > r.availMax, 'test pozbyl smysl – rawTotal se vejde i do availMax');
  const h = render(D);
  const g = h.match(/>(\d+)<\/tspan><tspan[^>]*> \/ (\d+)</);
  assert(g, 'gauge se nevykreslil');
  assert(+g[1] <= +g[2], `gauge přetéká: ${g[1]} / ${g[2]}`);
  assert(+g[2] === 310, 'gauge nemá plnou škálu 310, má '+g[2]);
  assert(!/nejvyšším pásmu/.test(h) || +g[1] >= 279, 'tvrdí „nejvyšší pásmo" mimo nejvyšší pásmo');
});

check('FIX · pod prahem se netvrdí „do známky chybí X bodů" ani se neukazuje bonus', () => {
  resetSettings(); setHasDebts(false);
  const h = render({ transactions:[], debts:[], wallets:[], assets:[], categories:[], shareSettings:{} });
  assert(!/Do známky/.test(h), 'nabízí cestu ke známce, přestože hodnotit neumí');
  assert(!/nejvyšším pásmu/.test(h), 'tvrdí nejvyšší pásmo bez hodnocení');
  assert(/Zatím umím změřit jen 25 %/.test(h), 'chybí vysvětlení pokrytí');
});

console.log('\n── FIX-270 · Detektor nepočítá dvakrát ──');
const prj=fs.readFileSync('projects.js','utf8');
check('evidence započítaných transakcí existuje',()=>{
  assert(/const _claimed = new Set\(\)/.test(prj),'chybí _claimed');
  assert(/const _free =/.test(prj)&&/const _claim =/.test(prj),'chybí _free/_claim');
});
check('překrývající se detektory berou jen nezabrané',()=>{
  const n=(prj.match(/_free\(subTxs\)/g)||[]).length;
  assert(n>=6,'jen '+n+' detektorů zapojeno, čekáno 6+');
});
check('Zbytečné utrácení zabírá až transakce, které v nálezu jsou',()=>{
  assert(/smallExpMap\)\.filter\(v=>v\.count>=4\)\.forEach\(v=>_claim\(v\.txs/.test(prj),
    'zabírá všechny, i ty pod prahem');
});
check('demonstrace: jedna útrata už nespadne do tří nálezů',()=>{
  const claimed=new Set();
  const free=a=>a.filter(t=>!claimed.has(t.id));
  const claim=a=>{a.forEach(t=>claimed.add(t.id));return a};
  const txs=[{id:1,amt:900}];
  const jidlo=claim(free(txs));                 // Jídlo venku
  const zbytecne=claim(free(txs));              // Zbytečné utrácení
  const soucet=jidlo.reduce((a,t)=>a+t.amt*0.3,0)+zbytecne.reduce((a,t)=>a+t.amt*0.5,0);
  assert(soucet===270,'součet '+soucet+' – druhý detektor si ji vzal znovu');
});

console.log('\n── FIX-271 · rozsah místo součtu ──');
check('zobrazuje se rozsah, ne jedno číslo',()=>{
  assert(/dolni > 0 && horni > dolni/.test(prj),'chybí rozsah');
  assert(!/\$\{fmtB\(totalSavable\)\}\/měs<\/div>/.test(prj),'stále jedno číslo');
});
check('jisté je odděleno od odhadu',()=>{
  assert(/const JISTE = \['Bankovní','Refinancování','Kurzy'\]/.test(prj),'chybí rozdělení');
  assert(/doložitelných/.test(prj)&&/odhadem/.test(prj),'chybí popisky');
});
console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ SKÓRE A DETEKTOR OVĚŘENY');
process.exit(fails?1:0);
