// FinanceFlow · smoke_audit_3468.js
// S28 (v12.31, audit body 3, 4, 6, 8):
//  3) investice z eurové peněženky se na Dashboardu sčítaly jako koruny (100 € = „100 Kč“),
//  4) výhled příjmů v Měsíčním reportu nahradil průměr šablonou (40 000 Kč výplata + šablona 2 000 Kč → 2 000 Kč),
//  6) limit kategorie: Report = % z průměru všech příjmů, Finanční zdraví = % ze základu příjmu,
//  8) splátky v Reportu 0 Kč u půjčky s rozpisem splátek.
// Negativní kontrola: na v12.30 padá.
const fs = require('fs'), path = require('path'), vm = require('vm');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const R = (...c) => fs.readFileSync(najdi(...c), 'utf8');
let ok = 0, bad = 0;
const t = (n, p, x) => { if (p) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n + (x === undefined ? '' : ' → ' + JSON.stringify(x))); } };
const vyber = (src, n) => { const i = src.indexOf('function ' + n + '('); if (i < 0) return ''; let d = 0, k = src.indexOf('{', i);
  for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) break; } } return src.slice(i, k + 1); };
const H = R('helpers.js', '../js/helpers.js'), PJ = R('projects.js', '../js/projects.js'), RM = R('report-mesicni.js', '../js/report-mesicni.js'), AI = R('ai.js', '../js/ai.js');
const el = () => ({ style: {}, innerHTML: '', remove() {}, appendChild() {} });
const S = { curMonth: 10, curYear: 2026, wallets: [{ id: 'wk', currency: 'CZK' }, { id: 'we', currency: 'EUR' }], categories: [], transactions: [], debts: [] };
const c = { console, S, Math, JSON, Object, Array, String, Number, Date, isFinite, Set, Map, viewingUid: null,
  document: { getElementById: () => el(), createElement: () => el(), body: { appendChild() {} }, head: { appendChild() {} }, querySelectorAll: () => [] },
  navigator: {}, localStorage: { getItem: () => null, setItem() {} }, setTimeout, clearTimeout };
c.window = c; vm.createContext(c);
vm.runInContext(H, c);
vm.runInContext(['catLimitVydaju', 'computeCatHealth', 'computeBaseIncome'].map(n => vyber(PJ, n)).join('\n')
  + (/(const|function|let|var) getData\b/.test(H) ? '' : '\nvar getData = () => S;'), c);

console.log('── bod 3: investice z eurové peněženky ──');
S.categories = [{ id: 'cat_t_invest', name: 'Investice', type: 'transfer' }];
S.transactions = [{ id: 'i1', type: 'expense', catId: 'cat_t_invest', amount: 100, amtCZK: 2500, wallet: 'we', date: '2026-11-02' },
  { id: 'i2', type: 'expense', catId: 'cat_t_invest', amount: 3000, wallet: 'wk', date: '2026-10-02' }];
const tt = c.computeTransferTotals(S);
t('vklad 100 € (2 500 Kč) se sečte jako 2 500 Kč, ne 100 Kč', tt.byGroup.investment.total === 5500, tt.byGroup.investment);

console.log('── bod 6: jeden limit kategorie ──');
S.categories = [{ id: 'cat1', name: 'Potraviny', type: 'expense', healthPct: 20 },
  { id: 'inc1', name: 'Výplata', type: 'income', stabilityWeight: 1 }, { id: 'inc3', name: 'Prodej', type: 'income', stabilityWeight: 0 }];
S.transactions = ['2026-08', '2026-09', '2026-10'].map(m => ({ type: 'income', catId: 'inc1', amount: 40000, date: m + '-10' }))
  .concat([{ type: 'income', catId: 'inc3', amount: 60000, date: '2026-09-20' }]);
const zakl = c.computeBaseIncome(S), zaklM = c.computeBaseIncome(S, 10, 2026);
t('základ příjmu = 40 000 Kč (jednorázový prodej s váhou 0 se nepočítá)', zakl === 40000 && zaklM === 40000, [zakl, zaklM]);
t('základ ke zvolenému měsíci (Report za září bere červen–srpen)', c.computeBaseIncome(S, 8, 2026) === Math.round(40000 / 3), c.computeBaseIncome(S, 8, 2026));
const kat = S.categories[0];
t('limit 20 % = 8 000 Kč (Report dřív z průměru všech příjmů = 12 000 Kč)', c.catLimitVydaju(kat, zakl) === 8000);
t('Kč strop platí, když je přísnější', c.catLimitVydaju(Object.assign({}, kat, { healthAmt: 6000 }), zakl) === 6000);
t('bez % i Kč = bez limitu (0)', c.catLimitVydaju({ healthPct: null }, zakl) === 0);
t('Finanční zdraví hodnotí proti stejnému limitu (9 000 / 8 000 → překročeno)', c.computeCatHealth(kat, 9000, zakl) < 70 && c.computeCatHealth(kat, 6000, zakl) === 100);
t('Měsíční report → Rozpočty bere základ příjmu a sdílený limit', /computeBaseIncome\(D, m, y\)/.test(RM) && /catLimitVydaju\(c, _zaklad\)/.test(RM) && !/c\.healthPct \/ 100 \* avg\.p/.test(RM));
t('Úsporné tipy: limit i s Kč stropem (sdílený výpočet)', /const limit = catLimitVydaju\(cat, baseIncome\)/.test(PJ));

console.log('── bod 8: splátky s rozpisem ──');
const dl = { id: 'd', remaining: 90000, payment: 0, installments: [{ from: '2026-01', amt: 4500 }, { from: '2027-01', amt: 3000 }] };
t('rozpis splátek: 4 500 Kč (dřív Report 0 Kč)', c.debtMesicniSplatka(dl, '2026-11') === 4500);
t('… od ledna 2027 platí nová splátka 3 000 Kč', c.debtMesicniSplatka(dl, '2027-02') === 3000);
t('týdenní splátka 1 000 Kč = 4 330 Kč měsíčně, splacená půjčka 0', Math.round(c.debtMesicniSplatka({ payment: 1000, freq: 'weekly', remaining: 5 }, '2026-11')) === 4330 && c.debtMesicniSplatka({ payment: 1000, remaining: 0 }, '2026-11') === 0);
S.debts = [dl, { id: 'e', remaining: 1000, payment: 2000 }];
t('Finanční skóre (computeMonthlyDebtPayments) = součet stejných splátek', c.computeMonthlyDebtPayments(S) === 6500);
t('Měsíční report a AI shrnutí berou splátku ze sdíleného výpočtu', /debtMesicniSplatka\(d, _mesR\)/.test(RM) && /computeMonthlyDebtPayments\(D\)/.test(AI));

console.log('── bod 4: výhled příjmů ──');
t('příjmy = šablony + průměr OSTATNÍCH příjmů (dřív šablony NEBO průměr), s pojistkou proti dvojímu započtení', /_fcSoucet = sabPrij \+ avgPBezSab/.test(RM) && /Math\.min\(_fcSoucet, _fcStrop\)/.test(RM) && !/sabPrij > 0 \? sabPrij : avg\.p/.test(RM));
t('z průměru se vynechají jen příjmy, které šablona pokrývá (název, kategorie nebo „Auto-šablona“)', /_sabPrijNazvy\.has/.test(RM) && /_sabPrijKat\.has/.test(RM) && /Auto-šablona/.test(vyber(RM, 'mesReportData')));
t('Report vypíše rozpad „šablony + průměr ostatních“', /průměr ostatních/.test(RM));
console.log(`\n${ok} ✓  ${bad} ✗`);
process.exit(bad ? 1 : 0);
