// FinanceFlow · smoke_sablony_vden.js
// S28 (v12.26, Milan: „je 1. 11. a aplikace už zapsala transakce, které se mají započítat až 15. 11.“):
// automatická šablona zapisuje transakci až V DEN splatnosti, do té doby ji Transakce ukazují jako
// 📅 naplánovanou (sablonyNaplanovane, nepočítá se). Dopředu zapsané a neupravené se stáhnou.
// Negativní kontrola: na v12.25 padá.
const fs = require('fs'), path = require('path'), vm = require('vm');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const R = (...c) => fs.readFileSync(najdi(...c), 'utf8');
let ok = 0, bad = 0;
const t = (n, p, x) => { if (p) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n + (x === undefined ? '' : ' → ' + JSON.stringify(x))); } };
const vyber = (src, n) => { const i = src.indexOf('function ' + n + '('); if (i < 0) return ''; let d = 0, k = src.indexOf('{', i);
  for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) break; } } return src.slice(i, k + 1); };
const P = R('premium.js', '../js/premium.js');
const RealDate = Date;
function sDnem(iso) {   // kontext s „dneškem“ = iso (12:00 místního času)
  const fix = new RealDate(iso + 'T12:00:00').getTime();
  class FDate extends RealDate { constructor(...a) { if (!a.length) super(fix); else super(...a); } static now() { return fix; } }
  const c = { console, Math, JSON, Object, Array, String, Number, Set, Date: FDate, S: null, uid: (() => { let n = 0; return () => 'id' + (++n); })(), save() {}, renderPage() {} };
  c.window = c; vm.createContext(c);
  vm.runInContext(['sablonaCastka', 'sablonyNaplanovane', 'processAutoSablony'].map(n => vyber(P, n)).join('\n'), c);
  return c;
}
const sab = () => [{ id: 's1', name: 'Záloha – Plyn', type: 'expense', amount: 1240, catId: 'cat3', subcat: 'Plyn', freq: 'monthly', den: 15, auto: true },
  { id: 's2', name: 'Netflix', type: 'expense', amount: 349, catId: 'cat5', freq: 'monthly', den: 20, auto: true }];
let c = sDnem('2026-11-01');
c.S = { sablony: sab(), transactions: [
  { id: 'a1', type: 'expense', name: 'Záloha – Plyn', amount: 1240, date: '2026-11-15', note: 'Auto-šablona: Záloha – Plyn' },
  { id: 'a2', type: 'expense', name: 'Netflix', amount: 299, date: '2026-11-20', note: 'Auto-šablona: Netflix' }] };
c.processAutoSablony();
t('1. 11.: neupravená záloha zapsaná dopředu na 15. 11. se stáhne', !c.S.transactions.some(x => x.id === 'a1'));
t('1. 11.: upravená (jiná částka) zůstává', c.S.transactions.some(x => x.id === 'a2'));
t('1. 11.: nic nového se nezapíše (splatnost až 15. a 20.)', c.S.transactions.length === 1);
const pl = c.sablonyNaplanovane(c.S.sablony, 10, 2026, '2026-11-01', c.S.transactions);
t('Transakce ukážou zálohu jako 📅 naplánovanou na 15. 11. (upravený Netflix ne – už je zapsaný)', pl.length === 1 && pl[0].date === '2026-11-15' && pl[0].amount === 1240, pl);
t('prosinec: obě šablony naplánované', c.sablonyNaplanovane(c.S.sablony, 11, 2026, '2026-11-01', c.S.transactions).length === 2);
const stav = JSON.parse(JSON.stringify(c.S));
c = sDnem('2026-11-15'); c.S = stav;
c.processAutoSablony();
const z = c.S.transactions.filter(x => x.name === 'Záloha – Plyn');
t('15. 11.: záloha se zapíše s datem 15. 11. a podkategorií', z.length === 1 && z[0].date === '2026-11-15' && z[0].subcat === 'Plyn', z);
t('… a šablona si pamatuje, že listopad je zapsaný', c.S.sablony[0].posledniZapis === '2026-11');
c.S.transactions = c.S.transactions.filter(x => x.name !== 'Záloha – Plyn'); c.processAutoSablony();
t('smazaná platba se v tom měsíci znovu nezaloží', !c.S.transactions.some(x => x.name === 'Záloha – Plyn'));
c = sDnem('2026-11-20'); c.S = { sablony: [Object.assign(sab()[0], { zalozeno: '2026-11-18' })], transactions: [] }; c.processAutoSablony();
t('„ne zpětně“: šablona založená 18. 11. se splatností 15. se v listopadu nezapíše', c.S.transactions.length === 0);
t('… a v prosinci je naplánovaná', c.sablonyNaplanovane(c.S.sablony, 11, 2026, '2026-11-20', []).length === 1);
console.log(`\n${ok} ✓  ${bad} ✗`);
process.exit(bad ? 1 : 0);
