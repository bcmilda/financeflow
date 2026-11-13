// FinanceFlow · smoke_v1244.js
// S29 (v12.44, Milan: „Proč se automaticky zapisují jen měsíční šablony? A ne čtvrtletní atd.? Můžeš udělat opravy pro šablony.“)
// Týdenní, dvoutýdenní, čtvrtletní a roční šablona s datem první platby se zapisuje v den splatnosti
// (s.zapsanoDo = vyřízeno do), minulé měsíce se nedoplňují, smazaná se znovu nezaloží, Transakce ji ukazují
// jako 📅 naplánovanou, seznam šablon „Příště“ po zápisu ukáže další platbu. Negativní kontrola: na v12.43 padá.
const fs = require('fs'), path = require('path'), vm = require('vm');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const R = (...c) => fs.readFileSync(najdi(...c), 'utf8');
let ok = 0, bad = 0;
const t = (n, p, x) => { if (p) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n + (x === undefined ? '' : ' → ' + JSON.stringify(x).slice(0, 400))); } };
const vyber = (src, n) => { const i = src.indexOf('function ' + n + '('); if (i < 0) return ''; let d = 0, k = src.indexOf('{', i);
  for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) break; } } return src.slice(i, k + 1); };
const P = R('premium.js', '../js/premium.js'), DEB = R('debts.js', '../js/debts.js'), H = R('app.html', '../app.html');
const kotva = (P.match(/const SABLONA_KOTVA = \[[^\]]*\];/) || [''])[0];
const RealDate = Date;
function sDnem(iso) {
  const fix = new RealDate(iso + 'T12:00:00').getTime();
  class FDate extends RealDate { constructor(...a) { if (!a.length) super(fix); else super(...a); } static now() { return fix; } }
  const c = { console, Math, JSON, Object, Array, String, Number, Set, Date: FDate, S: null, uid: (() => { let n = 0; return () => 'id' + (++n); })(), save() { c.ulozeno = (c.ulozeno || 0) + 1; }, renderPage() {} };
  c.window = c; vm.createContext(c);
  vm.runInContext(kotva + '\n' + ['ffKotvaVyskyty', 'ffKonecMinulehoMesice', 'sablonaKotvaKZapisu', 'sablonaZapisTx', '_sablonaSplatka', 'sablonaCastka', 'sablonyNaplanovane', 'sablonaDoTx', 'processAutoSablony', '_d0', 'getNextSablonaDate'].map(n => vyber(P, n)).join('\n') + '\nthis.SABLONA_KOTVA=SABLONA_KOTVA;', c);
  return c;
}
const beh = (iso, stav) => { const c = sDnem(iso); c.S = stav; c.processAutoSablony(); return c; };
const kopie = o => JSON.parse(JSON.stringify(o));
const jmeno = (S, n) => S.transactions.filter(x => x.name === n).map(x => x.date).sort();

console.log('── čtvrtletní pojištění (starší šablona bez zapsanoDo) ──');
let S0 = { sablony: [{ id: 'q', name: 'Pojištění domácnosti', type: 'expense', amount: 1500, catId: 'cat9', subcat: 'Domácnost', freq: 'quarterly', prvni: '2026-08-15', den: 15, auto: true, payType: 'karta', tags: ['byt'] }], transactions: [] };
let c = beh('2026-11-12', kopie(S0));
t('12. 11.: splatnost až 15. 11. → nic se nezapíše', c.S.transactions.length === 0);
t('… srpnová platba se zpětně nedoplňuje', !c.S.transactions.some(x => x.date === '2026-08-15'));
t('… šablona si uloží, odkud počítat (a appka uloží data)', c.S.sablony[0].zapsanoDo === '2026-11-12' && c.ulozeno === 1, c.S.sablony[0]);
t('Transakce ukážou 📅 naplánovanou platbu 15. 11.', JSON.stringify(c.sablonyNaplanovane(c.S.sablony, 10, 2026, '2026-11-12', c.S.transactions).map(x => x.date)) === '["2026-11-15"]');
t('prosinec ani leden nic (další až 15. 2.)', c.sablonyNaplanovane(c.S.sablony, 11, 2026, '2026-11-12', []).length === 0 && c.sablonyNaplanovane(c.S.sablony, 1, 2027, '2026-11-12', []).length === 1);
let st = c.S;
c = beh('2026-11-15', st);
const z = c.S.transactions.filter(x => x.name === 'Pojištění domácnosti');
t('15. 11.: zapíše se s datem 15. 11., kategorií, podkategorií, typem platby a tagy', z.length === 1 && z[0].date === '2026-11-15' && z[0].amount === 1500 && z[0].catId === 'cat9' && z[0].subcat === 'Domácnost' && z[0].payType === 'karta' && JSON.stringify(z[0].tags) === '["byt"]' && /Auto-šablona/.test(z[0].note), z);
t('… „Příště“ v seznamu šablon ukáže 15. 2. 2027 (ne dnešek)', /15\. ?2\. ?2027/.test(c.getNextSablonaDate(c.S.sablony[0])), c.getNextSablonaDate(c.S.sablony[0]));
t('… listopad už není naplánovaný', c.sablonyNaplanovane(c.S.sablony, 10, 2026, '2026-11-15', c.S.transactions).length === 0);
c = beh('2026-11-20', c.S);
t('20. 11.: podruhé se nezapíše', jmeno(c.S, 'Pojištění domácnosti').length === 1);
c.S.transactions = []; c.processAutoSablony();
t('smazaná platba se znovu nezaloží', c.S.transactions.length === 0);
c = beh('2027-02-16', c.S);
t('appka otevřená až den po splatnosti → únorová platba se zapíše k 15. 2.', JSON.stringify(jmeno(c.S, 'Pojištění domácnosti')) === '["2027-02-15"]', jmeno(c.S, 'Pojištění domácnosti'));

console.log('── týdenní ──');
c = beh('2026-11-12', { sablony: [{ id: 'w', name: 'Kapesné', type: 'expense', amount: 200, catId: 'cat4', freq: 'weekly', prvni: '2026-09-07', den: 7, auto: true }], transactions: [] });
t('starší týdenní (od září): zapíšou se listopadové 2. a 9. 11., září a říjen ne', JSON.stringify(jmeno(c.S, 'Kapesné')) === '["2026-11-02","2026-11-09"]', jmeno(c.S, 'Kapesné'));
t('… naplánované zbytek listopadu 16., 23., 30.', JSON.stringify(c.sablonyNaplanovane(c.S.sablony, 10, 2026, '2026-11-12', c.S.transactions).map(x => x.date)) === '["2026-11-16","2026-11-23","2026-11-30"]');
c = beh('2026-11-25', c.S);
t('appka neotevřená 13 dní → doplní 16. a 23. 11.', JSON.stringify(jmeno(c.S, 'Kapesné')) === '["2026-11-02","2026-11-09","2026-11-16","2026-11-23"]', jmeno(c.S, 'Kapesné'));

console.log('── ochrany ──');
c = beh('2026-11-12', { sablony: [{ id: 'y', name: 'Dálniční známka', type: 'expense', amount: 2440, freq: 'yearly', prvni: '2026-11-03', den: 3, auto: true }],
  transactions: [{ id: 'r', type: 'expense', name: 'Dálniční známka', amount: 2440, date: '2026-11-03', note: '' }] });
t('ručně zapsaná stejná platba (název + datum) → nezapíše se podruhé', jmeno(c.S, 'Dálniční známka').length === 1);
c = beh('2026-11-12', { sablony: [{ id: 'n', name: 'Bez data', type: 'expense', amount: 1, freq: 'quarterly', den: 1, auto: true }], transactions: [] });
t('šablona bez data první platby se nezapisuje', c.S.transactions.length === 0 && !c.S.sablony[0].zapsanoDo);
c = beh('2026-11-12', { sablony: [{ id: 'a', name: 'Ručně', type: 'expense', amount: 1, freq: 'weekly', prvni: '2026-11-02', den: 2, auto: false }], transactions: [] });
t('bez „Automatické vytváření“ se nezapisuje', c.S.transactions.length === 0);
c = beh('2026-11-12', { sablony: [{ id: 'e', name: 'Konec', type: 'expense', amount: 1, freq: 'weekly', prvni: '2026-11-02', den: 2, auto: true, endDate: '2026-11-05' }], transactions: [] });
t('po datu ukončení se nezapisuje (2. 11. ano, 9. 11. ne)', JSON.stringify(jmeno(c.S, 'Konec')) === '["2026-11-02"]', jmeno(c.S, 'Konec'));
c = beh('2026-11-12', { sablony: [{ id: 'd', name: 'Splátka – leasing', type: 'expense', amount: 3000, freq: 'quarterly', prvni: '2026-11-10', den: 10, auto: true, debtId: 'dl1' }], transactions: [] });
const sp = c.S.transactions[0];
t('čtvrtletní splátka dluhu nese vazbu na dluh (Zbývá se sníží)', sp && sp.debtId === 'dl1' && sp.debtCeka === true && sp.date === '2026-11-10', sp);
c = beh('2026-11-12', { sablony: [{ id: 'm', name: 'Netflix', type: 'expense', amount: 349, freq: 'monthly', den: 5, auto: true }], transactions: [] });
t('měsíční šablona beze změny (5. 11. zapsáno, posledniZapis)', JSON.stringify(jmeno(c.S, 'Netflix')) === '["2026-11-05"]' && c.S.sablony[0].posledniZapis === '2026-11' && !c.S.sablony[0].zapsanoDo);

console.log('── nová šablona a 🔁 z transakce ──');
t('uložení šablony: čtvrtletní/roční/týdenní dostane zapsanoDo = konec minulého měsíce, úprava ho zachová', /if\(SABLONA_KOTVA\.includes\(s\.freq\)\) s\.zapsanoDo=\(_o&&_o\.zapsanoDo\)\|\|ffKonecMinulehoMesice\(_d0\(\)\)/.test(vyber(P, 'saveSablona')));
c = sDnem('2026-11-12');
t('konec minulého měsíce: 12. 11. → 31. 10., 15. 3. → 28. 2.', c.ffKonecMinulehoMesice('2026-11-12') === '2026-10-31' && c.ffKonecMinulehoMesice('2027-03-15') === '2027-02-28');
const d = { S: { sablony: [] }, Math, parseInt, String, Array, Object, ffKonecMinulehoMesice: c.ffKonecMinulehoMesice, uid: () => 'x' }; vm.createContext(d);
vm.runInContext(vyber(DEB, 'txOpakSablona'), d);
const q1 = d.txOpakSablona({ type: 'expense', name: 'Pojistka', amount: 900, date: '2026-11-12' }, 'quarterly', '2026-11-12');
t('🔁 čtvrtletní z dnešní transakce: dnešek je vyřízený (nezapíše se podruhé)', q1 && q1.prvni === '2026-11-12' && q1.zapsanoDo === '2026-11-12', q1);
const q2 = d.txOpakSablona({ type: 'expense', name: 'Pojistka', amount: 900, date: '2026-09-01' }, 'weekly', '2026-11-12');
t('🔁 týdenní ze zářijové transakce: září a říjen se nedoplní (vyřízeno do 31. 10.)', q2 && q2.zapsanoDo === '2026-10-31', q2);
t('formulář šablony už neříká „zapisují jen měsíční“', !/zatím zapisují jen měsíční/.test(H) && /i čtvrtletní, roční a týdenní/.test(H));

console.log(`\nv12.44: ${ok} ✓  ${bad} ✗`);
process.exit(bad ? 1 : 0);
