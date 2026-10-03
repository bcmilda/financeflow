// Runtime smoke test pro pristi.js (SKILL 14 – node --check nestačí).
// Spouští OBĚ větve: prázdná data i plná data, oba režimy (kalendářní / od výplaty).
const fs = require('fs');
const vm = require('vm');

// ── stuby globálů, které modul očekává ────────────────────────
const CZ_M = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];
const FREQ_LABELS = {weekly:'Týdně',biweekly:'Každé 2 týdny',monthly:'Měsíčně',quarterly:'Čtvrtletně',yearly:'Ročně'};
const SEASON = {0:{mult:.85},1:{mult:1.05},2:{mult:1.0},3:{mult:1.02},4:{mult:1.15},5:{mult:1.1},6:{mult:1.1},7:{mult:1.08},8:{mult:1.05},9:{mult:1.0},10:{mult:1.12},11:{mult:1.35}};

let DATA = null;
let S = { curMonth: new Date().getMonth(), curYear: new Date().getFullYear() };

const sandbox = {
  console, Date, Math, JSON, Object, Array, String, Number, parseInt, parseFloat, isFinite, encodeURIComponent, decodeURIComponent,
  CZ_M, FREQ_LABELS, SEASON,
  get S(){ return S; }, set S(v){ S = v; },
  viewingUid: null,
  localStorage: { getItem:()=>null, setItem:()=>{} },
  document: { getElementById: () => null, addEventListener: () => {} },
  getData: () => DATA,
  getTx: (m,y,D) => ((D||DATA).transactions||[]).filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y;}),
  txCZK: (t) => t.amtCZK != null ? t.amtCZK : (t.amount || t.amt || 0),
  isTransferTx: (t) => !!(t && (t.transferId || t.catId === 'transfer')),
  fmt: n => String(Math.round(n||0)),
  fmtB: n => String(Math.round(n||0)) + ' Kč',
  czkToBase: v => v||0,
  curSym: () => 'Kč',
  escHtml: s => String(s==null?'':s),
  statCard: (v,l)=>`[${v}/${l}]`,
  statGrid: (c)=>c.map(x=>`[${x.value}]`).join(''),
  sectionCard: (t,b)=>`<sec>${t}${b}</sec>`,
  emptyState: (i,t,d)=>`<empty>${t}</empty>`,
  computeBank: () => 12345,
  predictCat: (catId,sub,m,y,D) => {
    const cats = ((D||DATA).categories||[]);
    const c = cats.find(x=>x.id===catId);
    if(!c || (c.type!=='expense' && c.type!=='both')) return null;
    const hist = ((D||DATA).transactions||[]).filter(t=>t.type==='expense' && t.catId===catId);
    if(!hist.length) return null;
    return Math.round(hist.reduce((a,t)=>a+(t.amount||0),0)/3 * (SEASON[m]?.mult||1));
  },
  budouciSourceLabel: s => s,
  budouciGetAll: (D, horizonDays) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const out = [];
    (( D||DATA).sablony||[]).forEach(s=>{
      if(s.type==='income') return;
      for(let i=0;i<4;i++){
        const d=new Date(today.getFullYear(), today.getMonth()+i, s.den||1); d.setHours(0,0,0,0);
        if(d>today && (d-today)/86400000 <= horizonDays)
          out.push({id:'sablona-'+s.id+'-'+i, source:'sablona', icon:'🔄', name:s.name, amount:s.amount,
                    date:d, note:'Měsíčně', isTransfer:s.type==='transfer'});
      }
    });
    (((D||DATA).debts)||[]).forEach(x=>{
      for(let i=0;i<4;i++){
        const d=new Date(today.getFullYear(), today.getMonth()+i, 25); d.setHours(0,0,0,0);
        if(d>today && (d-today)/86400000 <= horizonDays)
          out.push({id:'debt-'+x.id+'-'+i, source:'debt', icon:'🏦', name:'Splátka – '+x.name, amount:x.payment, date:d, note:''});
      }
    });
    return out.sort((a,b)=>a.date-b.date);
  },
  radarPaydayInfo: () => ({ anchor: 15 }),
  save: () => { sandbox._saved = (sandbox._saved||0)+1; },
  forceRender: () => {},
  renderPage: () => {},
  showToast: () => {},
  showPage: () => {},
  prompt: () => null,
  confirm: () => true,
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('pristi.js','utf8'), sandbox, {filename:'pristi.js'});

// ── datové sady ───────────────────────────────────────────────
function emptyData(){ return {transactions:[],categories:[],sablony:[],debts:[],wishes:[],birthdays:[],wallets:[],bank:{startBalance:0}}; }

function fullData(){
  const D = emptyData();
  D.categories = [
    {id:'cat7',  name:'Výplata',      icon:'💰', type:'income',  stable:true,  stabilityWeight:1.0},
    {id:'cat8',  name:'Brigáda',      icon:'💵', type:'income',  stable:false, stabilityWeight:0.4},
    {id:'cat40', name:'Dávky',        icon:'🏛️', type:'income',  stable:true,  stabilityWeight:0.9},
    {id:'cat20', name:'Jídlo & Pití', icon:'🍽️', type:'expense'},
    {id:'cat3',  name:'Bydlení',      icon:'🏠', type:'expense'},
  ];
  D.sablony = [
    {id:'s1', name:'Výplata',  amount:28400, type:'income',  catId:'cat7',  freq:'monthly', den:15},
    {id:'s2', name:'Nájem',    amount:12000, type:'expense', catId:'cat3',  freq:'monthly', den:20},
    {id:'s3', name:'Spoření',  amount:2000,  type:'transfer',catId:'transfer', freq:'monthly', den:2},
  ];
  D.debts = [{id:'d1', name:'Úvěr', payment:3200, remaining:80000}];
  // 8 měsíců historie zpět od dneška
  const now = new Date();
  for(let i=1;i<=8;i++){
    const m = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const y = m.getFullYear(), mm = m.getMonth();
    D.transactions.push({id:'t'+i+'a', type:'income',  catId:'cat7',  amount:28400, date:`${y}-${String(mm+1).padStart(2,'0')}-15`, name:'Výplata'});
    D.transactions.push({id:'t'+i+'c', type:'income',  catId:'cat40', amount:13900, date:`${y}-${String(mm+1).padStart(2,'0')}-05`, name:'Dávka'});
    if(i%3===0) D.transactions.push({id:'t'+i+'b', type:'income', catId:'cat8', amount:9000, date:`${y}-${String(mm+1).padStart(2,'0')}-22`, name:'Brigáda'});
    D.transactions.push({id:'t'+i+'e', type:'expense', catId:'cat20', amount:9500,  date:`${y}-${String(mm+1).padStart(2,'0')}-10`, name:'Potraviny'});
    D.transactions.push({id:'t'+i+'f', type:'expense', catId:'cat3',  amount:12000, date:`${y}-${String(mm+1).padStart(2,'0')}-20`, name:'Nájem'});
    // pasti: split, vyrovnání, přesun, cizí měna
    D.transactions.push({id:'t'+i+'g', type:'expense', catId:'cat20', amount:999, splitParent:'x', date:`${y}-${String(mm+1).padStart(2,'0')}-11`, name:'SPLIT (nesmí se počítat)'});
    D.transactions.push({id:'t'+i+'h', type:'income',  catId:'cat7',  amount:5000, isBalancing:true, date:`${y}-${String(mm+1).padStart(2,'0')}-12`, name:'VYROVNÁNÍ (nesmí se počítat)'});
    D.transactions.push({id:'t'+i+'i', type:'income',  catId:'transfer', transferId:'tr'+i, amount:7000, date:`${y}-${String(mm+1).padStart(2,'0')}-13`, name:'PŘESUN (nesmí se počítat)'});
    D.transactions.push({id:'t'+i+'j', type:'income',  catId:'cat7',  amount:100, amtCZK:2500, date:`${y}-${String(mm+1).padStart(2,'0')}-16`, name:'EUR příjem'});
  }
  return D;
}

// ── běh ───────────────────────────────────────────────────────
let fails = 0;
function check(name, fn){
  try { fn(); console.log('  ✅', name); }
  catch(e){ fails++; console.log('  ❌', name, '→', e.message); }
}
function assert(c,msg){ if(!c) throw new Error(msg||'assert'); }

for (const mode of ['cal','pay']) {
  for (const label of ['PRÁZDNÁ DATA','PLNÁ DATA']) {
    DATA = label === 'PRÁZDNÁ DATA' ? emptyData() : fullData();
    sandbox._pristiMode = mode;
    vm.runInContext(`_pristiMode='${mode}'`, sandbox);
    console.log(`\n── režim ${mode} · ${label} ──`);

    let P;
    check('pristiBuildData() proběhne', () => { P = vm.runInContext('pristiBuildData(getData())', sandbox); assert(P); });
    if(!P) continue;

    check('žádné NaN/Infinity v součtech', () => {
      ['incSure','incLikely','incRisky','incPlanned','expKnown','expEst','savTotal','rest','predTotal','minBal','drip']
        .forEach(k => assert(typeof P[k]==='number' && isFinite(P[k]), k+' = '+P[k]));
    });
    check('okno má správný rozsah dnů', () => {
      assert(P.dayCount >= 27 && P.dayCount <= 32, 'dayCount='+P.dayCount);
      assert(P.W.from <= P.W.to, 'from > to');
    });
    check('render nespadne a vrátí HTML', () => {
      const h = vm.runInContext('_pristiLast=pristiBuildData(getData());pristiRenderHTML(_pristiLast)', sandbox);
      assert(typeof h === 'string' && h.length > 200, 'délka '+(h&&h.length));
      assert(h.indexOf('NaN') < 0, 'HTML obsahuje NaN');
      assert(h.indexOf('undefined') < 0, 'HTML obsahuje undefined');
      assert(h.indexOf('Infinity') < 0, 'HTML obsahuje Infinity');
    });

    if (label === 'PLNÁ DATA') {
      check('výplata ze šablony je 🟢 jistá a v součtu', () => {
        const r = P.inc.find(x => x.name === 'Výplata' && x.level === 1);
        assert(r, 'řádek výplaty nenalezen');
        assert(r.amount === 28400, 'částka '+r.amount);
      });
      check('šablona nezdvojuje historii (dopočet jen nad rámec)', () => {
        const h = P.inc.find(x => x.key === 'h:cat7');
        // historie cat7 ≈ 28400 + 2500 (EUR) → nad rámec šablony jen ~2500
        assert(!h || h.amount < 5000, 'dopočet nad šablonu je '+(h&&h.amount));
      });
      check('EUR příjem přepočten přes txCZK (2500, ne 100)', () => {
        const h = P.inc.find(x => x.key === 'h:cat7');
        assert(h && h.amount > 2000, 'EUR se nezapočetlo v CZK: '+(h&&h.amount));
      });
      check('split / vyrovnání / přesun se do příjmů nedostaly', () => {
        const bad = P.inc.find(x => /SPLIT|VYROVNÁNÍ|PŘESUN/.test(x.name));
        assert(!bad, 'prosákl řádek '+(bad&&bad.name));
        assert(P.incSure + P.incLikely < 60000, 'součet nafouknutý: '+(P.incSure+P.incLikely));
      });
      check('nepravidelný příjem (weight 0,4) je ⚪ a MIMO součet', () => {
        const r = P.inc.find(x => x.name === 'Brigáda');
        assert(r, 'brigáda chybí');
        assert(r.level === 3, 'level '+r.level);
        assert(P.incPlanned === P.incSure + P.incLikely, 'nejisté se dostalo do plánu');
      });
      check('stabilní dávky (weight 0,9) jsou 🟡 a v součtu', () => {
        const r = P.inc.find(x => x.name === 'Dávky');
        assert(r && r.level === 2, 'level '+(r&&r.level));
      });
      check('přesun/spoření je mimo výdaje', () => {
        assert(!P.exp.find(x => x.name === 'Spoření'), 'spoření mezi výdaji');
        assert(P.sav.length > 0, 'spoření se ztratilo úplně');
      });
      check('odhad výdajů nepočítá známé platby dvakrát', () => {
        assert(P.expEst === Math.max(0, P.predTotal - P.knownExp), 'vzorec nesedí');
        assert(P.expEst >= 0, 'záporný odhad');
      });
      check('timeline je chronologická a má běžný odtok', () => {
        for (let i = 1; i < P.timeline.length; i++)
          assert(P.timeline[i].date >= P.timeline[i-1].date, 'timeline není seřazená');
        assert(P.drip > 0, 'drip = '+P.drip);
      });
      check('ruční úprava přepíše částku a vypnutí ji odečte', () => {
        const key = P.inc.find(x => x.level === 1).key;
        DATA.pristiCfg = { [P.ym]: { start: null, rows: { [key]: { amt: 1000 } } } };
        const P2 = vm.runInContext('pristiBuildData(getData())', sandbox);
        const r2 = P2.inc.find(x => x.key === key);
        assert(r2.amount === 1000 && r2.edited === true, 'úprava se neprojevila');
        DATA.pristiCfg[P2.ym].rows[key] = { off: true };
        const P3 = vm.runInContext('pristiBuildData(getData())', sandbox);
        assert(P3.incSure < P.incSure, 'vypnutý řádek se pořád počítá');
        const h3 = vm.runInContext('_pristiLast=pristiBuildData(getData());pristiRenderHTML(_pristiLast)', sandbox);
        assert(h3.indexOf('NaN') < 0, 'render s úpravami vyrobil NaN');
        delete DATA.pristiCfg;
      });
      check('prohlížení partnera (viewingUid) neukáže editační tlačítka', () => {
        vm.runInContext("viewingUid='partner123'", sandbox);
        const h = vm.runInContext('_pristiLast=pristiBuildData(getData());pristiRenderHTML(_pristiLast)', sandbox);
        assert(h.indexOf('pristiEditRow') < 0, 'editace nabízena při prohlížení partnera');
        vm.runInContext('viewingUid=null', sandbox);
      });
    } else {
      check('prázdná data → hasAnything=false, nulové součty', () => {
        assert(P.hasAnything === false, 'hasAnything=true nad prázdnými daty');
        assert(P.rest === 0 && P.incPlanned === 0 && P.expEst === 0, 'nenulové součty');
      });
    }
  }
}

// ── minulý měsíc (kalibrace) ─────────────────────────────────
console.log('\n── cílový měsíc už proběhl (kalibrace) ──');
DATA = fullData();
vm.runInContext("_pristiMode='cal'", sandbox);
const back = new Date(); back.setMonth(back.getMonth() - 3);
S.curMonth = back.getMonth(); S.curYear = back.getFullYear();
check('minulý měsíc: build i render projdou', () => {
  const P = vm.runInContext('_pristiLast=pristiBuildData(getData())', sandbox);
  assert(P.isPastWindow === true, 'nerozpoznán jako minulý');
  assert(P.real && P.real.complete === true, 'chybí srovnání se skutečností');
  const h = vm.runInContext('pristiRenderHTML(_pristiLast)', sandbox);
  assert(h.indexOf('NaN') < 0 && h.indexOf('undefined') < 0, 'NaN/undefined v renderu');
});
check('minulý měsíc: prázdná data nespadnou', () => {
  DATA = emptyData();
  const P = vm.runInContext('_pristiLast=pristiBuildData(getData())', sandbox);
  assert(P && !P.hasAnything, 'nečekaný výsledek');
});

// ── přelom roku ───────────────────────────────────────────────
console.log('\n── přelom roku (prosinec → leden) ──');
DATA = fullData();
S.curMonth = 11; S.curYear = 2026;
check('prosinec → cíl leden 2027', () => {
  const P = vm.runInContext('_pristiLast=pristiBuildData(getData())', sandbox);
  assert(P.W.m === 0 && P.W.y === 2027, `cíl ${P.W.m}/${P.W.y}`);
  assert(P.ym === '2027-01', 'ym='+P.ym);
  const h = vm.runInContext('pristiRenderHTML(_pristiLast)', sandbox);
  assert(h.indexOf('NaN') < 0, 'NaN v renderu');
});


// ── FIX-253: výplatní cyklus musí začínat na SKUTEČNÉ hlavní výplatě ──
// Milanův scénář ze screenshotů: hlavní příjem 5. 9., drobná šablona 1. dne,
// radarPaydayInfo vrací nesouvisejících 9 → dřív cyklus 9.9.–8.10. a výplata
// se posunula na 5. 10. (celý měsíc pryč).
console.log('\n── FIX-253 · kotva výplatního cyklu ──');
S.curMonth = 7; S.curYear = 2026;   // srpen → cíl září 2026
DATA = emptyData();
DATA.categories = [
  {id:'c7', name:'Výplata',        icon:'💰', type:'income', stable:true, stabilityWeight:1.0},
  {id:'c9', name:'Pasivní příjem', icon:'🌱', type:'income', stable:true, stabilityWeight:0.6},
  {id:'c20',name:'Jídlo',          icon:'🍽️', type:'expense'},
];
DATA.sablony = [{id:'s9', name:'prachy navíc', amount:800, type:'income', catId:'c9', freq:'monthly', den:1}];
for (let i = 1; i <= 6; i++) {
  const b = new Date(2026, 7 - i, 1), y = b.getFullYear(), m = String(b.getMonth()+1).padStart(2,'0');
  DATA.transactions.push({id:'x'+i, type:'income', catId:'c7', amount:28383, date:`${y}-${m}-05`, name:'Výplata'});
  DATA.transactions.push({id:'z'+i, type:'expense',catId:'c20',amount:6000,  date:`${y}-${m}-12`, name:'Jídlo'});
}
vm.runInContext("_pristiMode='pay'", sandbox);
check('cyklus začíná dnem hlavní výplaty (5. 9.), ne obecnou kotvou (9.)', () => {
  const P = vm.runInContext('pristiBuildData(getData())', sandbox);
  assert(P.W.from.getDate() === 5 && P.W.from.getMonth() === 8,
    `okno začíná ${P.W.from.getDate()}.${P.W.from.getMonth()+1}. místo 5.9.`);
});
check('výplata je PRVNÍ řádek cyklu a zůstala v září', () => {
  const P = vm.runInContext('pristiBuildData(getData())', sandbox);
  const v = P.inc.find(r => r.name === 'Výplata');
  assert(v, 'výplata z výpisu zmizela');
  assert(v.date.getMonth() === 8, `výplata se posunula na měsíc ${v.date.getMonth()+1} (regrese FIX-253)`);
  assert(v.date.getDate() === 5, 'výplata není 5.');
  assert(P.inc[0].name === 'Výplata', 'výplata není první řádek');
});
check('drobná šablona z 1. spadne až na 1. 10. (konec cyklu) – dle Milana správně', () => {
  const P = vm.runInContext('pristiBuildData(getData())', sandbox);
  const r = P.inc.find(x => x.name === 'prachy navíc');
  assert(r && r.date.getMonth() === 9 && r.date.getDate() === 1,
    `prachy navíc na ${r && r.date.getDate()}.${r && (r.date.getMonth()+1)}.`);
});
check('kalendářní režim zůstal nedotčen (výplata 5. 9., prachy 1. 9.)', () => {
  vm.runInContext("_pristiMode='cal'", sandbox);
  const P = vm.runInContext('pristiBuildData(getData())', sandbox);
  assert(P.W.from.getDate() === 1 && P.W.from.getMonth() === 8, 'kalendářní okno nezačíná 1. 9.');
  const r = P.inc.find(x => x.name === 'prachy navíc');
  assert(r.date.getMonth() === 8 && r.date.getDate() === 1, 'prachy navíc nejsou 1. 9.');
});
check('práh 0,5: pasivní příjem (weight 0,6) je 🟡, ne ⚪', () => {
  vm.runInContext("_pristiMode='cal'", sandbox);
  DATA.transactions.push({id:'p1', type:'income', catId:'c9', amount:3333, date:'2026-06-05', name:'Pasivní'});
  DATA.transactions.push({id:'p2', type:'income', catId:'c9', amount:3333, date:'2026-07-05', name:'Pasivní'});
  const P = vm.runInContext('pristiBuildData(getData())', sandbox);
  const r = P.inc.find(x => x.name === 'Pasivní příjem');
  assert(r && r.level === 2, 'level ' + (r && r.level) + ' (má být 2)');
});

// ── vlastní ručně zapsané řádky ──
console.log('\n── vlastní zápis příjmu / výdaje ──');
check('vlastní příjem i výdaj se objeví a promítnou do součtů', () => {
  const P0 = vm.runInContext('pristiBuildData(getData())', sandbox);
  DATA.pristiCfg = { [P0.ym]: { start:null, rows:{}, custom:[
    {id:'k1', type:'income',  name:'Vratka daní', amount:9000, day:12},
    {id:'k2', type:'expense', name:'Zubař',       amount:4500, day:22},
  ]}};
  const P = vm.runInContext('_pristiLast=pristiBuildData(getData())', sandbox);
  const i = P.inc.find(x => x.name === 'Vratka daní');
  const e = P.exp.find(x => x.name === 'Zubař');
  assert(i && i.level === 1 && i.date.getDate() === 12, 'vlastní příjem chybí/špatné datum');
  assert(e && e.date.getDate() === 22, 'vlastní výdaj chybí/špatné datum');
  assert(P.incPlanned - P0.incPlanned === 9000, 'vlastní příjem se nepromítl do součtu');
  const h = vm.runInContext('pristiRenderHTML(_pristiLast)', sandbox);
  assert(h.indexOf('NaN') < 0 && h.indexOf('undefined') < 0, 'NaN/undefined v renderu');
  delete DATA.pristiCfg;
});

console.log(fails ? `\n❌ SELHALO ${fails} testů` : '\n✅ VŠECHNY SMOKE TESTY PROŠLY');
process.exit(fails ? 1 : 0);
