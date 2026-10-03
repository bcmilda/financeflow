#!/usr/bin/env node
// ══════════════════════════════════════════════════════
//  FinanceFlow · tests/smoke.js · S16.8
//  SMOKE-TESTY SKÓRE: 3 fixní profily → klíčové metriky se musí rovnat očekávání.
//  Spouštění: node tests/smoke.js   (z kořene repa; žádné závislosti)
//  Kdy: před každým odevzdáním změn ve scoring kódu (helpers/debts/premium).
//  Když čísla nesedí: buď regrese (opravit!), nebo záměrná změna vzorce
//  → aktualizovat EXPECTED níže + zapsat do patch notes.
// ══════════════════════════════════════════════════════
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');

// ── Stub prostředí prohlížeče (jen co skripty potřebují při definici) ──
const noop = () => {};
const elStub = new Proxy({}, { get: (t,k)=> k==='style'?{}:(k==='classList'?{add:noop,remove:noop,toggle:noop}:noop) });
const sandbox = {
  console, Math, Date, JSON, Object, Array, String, Number, Boolean, RegExp, Map, Set, Promise, Infinity, NaN, isFinite, isNaN, parseInt, parseFloat, setTimeout, clearTimeout, structuredClone: (typeof structuredClone!=='undefined'?structuredClone:(o)=>JSON.parse(JSON.stringify(o))),
  window: {}, document: { getElementById: ()=>null, querySelector: ()=>null, querySelectorAll: ()=>[], createElement: ()=>elStub, addEventListener: noop, body: elStub, documentElement: elStub },
  localStorage: { getItem: ()=>null, setItem: noop, removeItem: noop },
  navigator: { language: 'cs-CZ', userAgent: 'smoke' },
  location: { href: 'https://financeflow.cz/app', pathname: '/app' },
  fetch: () => Promise.resolve({ ok:false, json:()=>Promise.resolve({}) }),
  requestAnimationFrame: (cb)=>setTimeout(cb,0), IntersectionObserver: class{observe(){}disconnect(){}},
};
sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
vm.createContext(sandbox);

function load(file){
  const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
  try { vm.runInContext(code, sandbox, { filename: file }); }
  catch(e){ console.error(`❌ Nelze načíst ${file}: ${e.message}`); process.exit(2); }
}
load('helpers.js');   // _SCORING, msc_*, computeEffectiveIncome, expSum/incSum, txCZK, sanitizeUserData…
load('assets.js');    // assetLiqTotals, assetTier
load('debts.js');     // computeStressIndex, computeMonthlyDebtPayments

// ── Globály, které výpočty čtou ──
sandbox.S = { curMonth: 6, curYear: 2026, wallets: [] }; // "dnes" = červenec 2026 (fixní!)
vm.runInContext('S = globalThis.S;', sandbox);
const call = (expr) => vm.runInContext(expr, sandbox);

// ── Pomocník na výrobu transakcí: 12 měsíců historie ──
function months12(gen){
  const txs=[]; let id=0;
  for(let i=0;i<12;i++){
    let m=6-i, y=2026; while(m<0){m+=12;y--;}
    const iso=`${y}-${String(m+1).padStart(2,'0')}-15`;
    gen(iso, i).forEach(t=>txs.push(Object.assign({id:'t'+(id++)}, t)));
  }
  return txs;
}

// ══ PROFIL A: „Zadlužený s malou rezervou" ══
const A = {
  transactions: months12((iso)=>[
    { date: iso, type:'income',  amount: 30000, name:'Výplata', catId:'vyplata' },
    { date: iso, type:'expense', amount: 24000, name:'Život',   catId:'zivot' },
  ]),
  debts: [
    { id:'d1', name:'Hypotéka',  remaining: 2000000, interest: 5,  payment: 12000 },
    { id:'d2', name:'Nebankovka', remaining: 100000, interest: 25, payment: 4000, type:'nonbank' },
  ],
  wallets: [ { id:'w1', name:'Účet', balance: 20000 } ],
  assets: [], categories: [], shareSettings: {},
};

// ══ PROFIL B: „Zdravý spořič" ══
const B = {
  transactions: months12((iso)=>[
    { date: iso, type:'income',  amount: 60000, name:'Výplata', catId:'vyplata' },
    { date: iso, type:'expense', amount: 30000, name:'Život',   catId:'zivot' },
  ]),
  debts: [ { id:'d1', name:'Hypotéka', remaining: 1500000, interest: 3, payment: 10000 } ],
  wallets: [ { id:'w1', name:'Účet', balance: 120000 } ],
  assets: [ { id:'a1', name:'Spořicí účet', value: 180000, type:'savings' } ],
  categories: [], shareSettings: {},
};

// ══ PROFIL C: „Prázdný nováček" ══
const C = { transactions: [], debts: [], wallets: [], assets: [], categories: [], shareSettings: {} };

// ── Baseline (v8.90). Při ZÁMĚRNÉ změně vzorců aktualizuj + zapiš do patch notes. ──
// Baseline v8.90 – ručně ověřeno proti vzorcům (viz patch notes S16.8):
//   A: DSTI 18/20 + rezerva 13/15 + DTI 10/15 + úroky 10/10 + počet 2/8 + váž.úrok 1/7 + likvidita 5/5 + velocity 5/5 = 64
//   B: DSTI 6/20 + DTI 3/15 + úroky 4/10 + velocity 3/5 = 16 (rezerva 10 měs. → 0)
const EXPECTED = {
  A: { income12: 30000, stressTotal: 64, dsti: 53, dti: 583, emergencyMonths: 0.8 },
  B: { income12: 60000, stressTotal: 16, dsti: 17, dti: 208, emergencyMonths: 10.0 },
  C: { income12: 0, stress: null },
};

let fails = 0;
const eq = (label, got, want, tol=0) => {
  const ok = (got===null&&want===null) || (typeof want==='number' ? Math.abs(got-want)<=tol : got===want);
  console.log(`${ok?'✅':'❌'} ${label}: ${got}${ok?'':`  (očekáváno ${want})`}`);
  if(!ok) fails++;
};

function runProfile(name, D, exp){
  console.log(`\n══ Profil ${name} ══`);
  sandbox.__D = D; 
  const inc = call('computeEffectiveIncome(__D, 12)');
  eq('Příjem 12M Ø', Math.round(inc), exp.income12, 1);
  const st = call('computeStressIndex(__D)');
  if(exp.stress===null){ eq('Stres index (bez dluhů)', st, null); return; }
  eq('Stres index celkem', st.total, exp.stressTotal, 1);
  eq('DSTI %', Math.round(st.inputs.dsti), exp.dsti, 1);
  eq('DTI %', Math.round(st.inputs.dti), exp.dti, 2);
  eq('Emergency (měsíce)', Math.round(st.inputs.emMonths*10)/10, exp.emergencyMonths, 0.15);
  // Invarianty (platí vždy, bez ohledu na vzorce):
  eq('Invariant: 0 ≤ total ≤ 100', st.total>=0 && st.total<=100, true);
  eq('Invariant: Σ faktorů ≥ total-1', st.factors.reduce((a,f)=>a+f.score,0) >= st.total-1, true);
  eq('Invariant: žádný faktor nad váhu', st.factors.every(f=>f.score<=f.max), true);
}

console.log('FinanceFlow smoke-testy skóre (fixní datum: červenec 2026)');
runProfile('A – zadlužený', A, EXPECTED.A);
runProfile('B – zdravý spořič', B, EXPECTED.B);
runProfile('C – nováček', C, EXPECTED.C);

console.log(fails ? `\n🔴 ${fails} selhání` : '\n🟢 Vše OK');
process.exit(fails ? 1 : 0);
