// FinanceFlow · smoke test · Session 27 (v11.99) · S3 Rezerva ve Finančním skóre
//  Milan (22. 10.): do rezervy hotovost, běžný účet, peněženky, spořicí účty („peníze rychle
//  k dispozici“); investice, penzijko a DIP NE („dlouhodobé, při rychlém výběru neurčitá ztráta“);
//  průměr výdajů za 6 měsíců; stav ke konci vybraného měsíce (dřív dnešek i pro staré měsíce).
const fs = require('fs'), path = require('path'), vm = require('vm');
let ok = 0, bad = 0;
const t = (n, c, i) => { if (c) { ok++; console.log('  ✅', n); } else { bad++; console.log('  ❌', n, i === undefined ? '' : JSON.stringify(i)); } };
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
const najdi=f=>[f,path.join(__dirname,f),path.join(__dirname,'../js',f)].find(p=>fs.existsSync(p));
['helpers.js','assets.js','debts.js','projects.js','premium.js'].forEach(f=>load(najdi(f)));
sandbox.S = { curMonth: 6, curYear: 2026, wallets: [] };   // "dnes" = červenec 2026 (fixní)
vm.runInContext('S = globalThis.S;', sandbox);


const R = (D, m, y) => { sandbox.__D = D; return vm.runInContext(`_s3Rezerva(__D, ${m}, ${y}, 0)`, sandbox); };
const kat = [{ id: 'z', name: 'Život', type: 'expense' }];

console.log('── minulý měsíc (říjen 2025) ──');
const A = {
  categories: kat, debts: [],
  wallets: [{ id: 'u', name: 'Běžný účet', type: 'account', balance: 50000, balanceDate: '2025-11-15' },
            { id: 'h', name: 'Hotovost', type: 'cash', balance: 5000 },
            { id: 'p', name: 'Penzijní spoření', type: 'savings', balance: 100000 },
            { id: 'i', name: 'Akcie', type: 'investment', balance: 80000 },
            { id: 'k', name: 'Kreditka', type: 'card', balance: -2000 }],
  assets: [{ id: 'a1', name: 'Termínovaný vklad', type: 'savings', value: 45000, valuations: [{ d: '2025-09-01', v: 40000 }, { d: '2025-12-01', v: 45000 }] },
           { id: 'a2', name: 'DIP', type: 'savings', value: 60000 },
           { id: 'a3', name: 'ETF', type: 'investment', value: 70000 }],
  transactions: [
    { id: 'x0', wallet: 'u', type: 'income', amount: 20000, date: '2025-11-01', catId: 'z' },
    ...['2025-05-10', '2025-06-10', '2025-07-10'].map((d, i) => ({ id: 'e' + i, type: 'expense', amount: 20000, date: d, catId: 'z' })),
    { id: 'e9', type: 'expense', amount: 30000, date: '2025-10-10', catId: 'z' },
    { id: 'e8', type: 'expense', amount: 99999, date: '2025-04-10', catId: 'z' }],
};
const a = R(A, 9, 2025);
t('běžný účet ke 31. 10. = 50 000 − příjem z 1. 11. (zadaný zůstatek ke 15. 11.)', a.kDni === '2025-10-31');
t('rezerva = účet 30 000 + hotovost 5 000 + termínovaný vklad k tomu dni 40 000 = 75 000', Math.round(a.castka) === 75000, a);
t('penzijko, akcie, kreditka, DIP a ETF se nepočítají', a.penezenek === 2 && a.aktiv === 1, a);
t('výdaje = průměr měsíců s výdaji v okně květen–říjen (srpen, září bez výdajů vynechány; duben mimo okno) = 22 500', Math.round(a.vydaje) === 22500 && a.mesicu === 4, a);
t('rezerva vydrží 3,3 měsíce', Math.abs(a.castka / a.vydaje - 3.333) < 0.01);

console.log('── aktuální (rozběhnutý) měsíc ──');
const d = new Date(), K = d.getFullYear() * 12 + d.getMonth(), iso = k => `${Math.floor(k / 12)}-${String(k % 12 + 1).padStart(2, '0')}-10`;
const B = { categories: kat, debts: [], assets: [], wallets: [{ id: 'h', name: 'Hotovost', type: 'cash', balance: 30000 }],
  transactions: [...[1, 2, 3, 4, 5, 6].map(i => ({ id: 'b' + i, type: 'expense', amount: 10000, date: iso(K - i), catId: 'z' })),
                 { id: 'b0', type: 'expense', amount: 50000, date: iso(K), catId: 'z' }] };
const b = R(B, d.getMonth(), d.getFullYear());
t('aktuální měsíc: stav k dnešku', b.kDni === null);
t('rozběhnutý měsíc se do průměru nepočítá (6 uzavřených po 10 000)', Math.round(b.vydaje) === 10000 && b.mesicu === 6, b);
t('30 000 ÷ 10 000 = 3 měsíce', Math.round(b.castka / b.vydaje * 10) / 10 === 3);

console.log('── nový účet (jen aktuální měsíc) ──');
const C = { categories: kat, debts: [], assets: [], wallets: [{ id: 'h', name: 'Hotovost', type: 'cash', balance: 30000 }],
  transactions: [{ id: 'c0', type: 'expense', amount: 10000, date: iso(K), catId: 'z' }] };
sandbox.__D = C; const c = vm.runInContext(`_s3Rezerva(__D, ${d.getMonth()}, ${d.getFullYear()}, 10000)`, sandbox);
t('bez uzavřených měsíců → výdaje vybraného měsíce', c.avail && c.vydaje === 10000 && c.mesicu === 0, c);
const Bez = { ...C, wallets: [{ id: 'i', name: 'Akcie', type: 'investment', balance: 1 }] };
t('jen investiční peněženka → rezerva nezměřena (ne 0)', R(Bez, d.getMonth(), d.getFullYear()).avail === false);

console.log('── napojení na skóre ──');
sandbox.__D = A; const sc = vm.runInContext('computeFinancialScore(__D, 9, 2025)', sandbox);
const s3 = sc.components.find(x => x.label.includes('Rezerva'));
t('skóre za říjen 2025 počítá rezervu přes _s3Rezerva (3,3 měsíce)', s3 && s3.avail && /3\.3 měs/.test(s3.detail), s3);
console.log(`\n${ok} ✅  ${bad} ❌`); process.exit(bad ? 1 : 0);
