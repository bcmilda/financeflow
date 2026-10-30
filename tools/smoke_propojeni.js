// FinanceFlow · smoke_propojeni.js
// S28 (v12.17, Milan: „vrácení peněz beru jako příjem… ruční dohledání a propojení transakce bez změn
// reportu a statistik“, „nenásilnou formou“). Transakce → Upravit → 🔗 Propojit s jinou transakcí.
// Odkaz na obou stranách (t.propojeno), výpočty ho nečtou. Chromium průchod: příjem 1 200 ↔ výdaj Alza.
const fs = require('fs'), path = require('path'), vm = require('vm');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const UI = fs.readFileSync(najdi('ui.js', '../js/ui.js'), 'utf8');
const H = fs.readFileSync(najdi('helpers.js', '../js/helpers.js'), 'utf8');
let ok = 0, bad = 0;
const t = (n, c, i) => { if (c) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n + (i === undefined ? '' : ' → ' + JSON.stringify(i).slice(0, 300))); } };
const a = UI.indexOf('const _txPropId'), b = UI.indexOf('let _txPropOtevreno');
t('propojení v ui.js existuje', a > 0 && b > a);
if (a < 0 || b < 0) { console.log(`\n${ok} ✓  ${bad} ✗`); process.exit(1); }
const S = { transactions: [
  { id: 'e1', type: 'expense', name: 'Alza – mobil', amount: 1200, date: '2026-09-02', catId: 'c1' },
  { id: 'e2', type: 'expense', name: 'Lidl', amount: 640, date: '2026-10-19', catId: 'c1' },
  { id: 'e3', type: 'expense', name: 'Převod', amount: 1200, date: '2026-10-19', transferId: 'x' },
  { id: 'e4', type: 'expense', name: 'Starý', amount: 1200, date: '2023-01-01', catId: 'c1' },
  { id: 'i1', type: 'income', name: 'Vrácení – reklamace', amount: 1200, date: '2026-10-20', catId: 'c13' },
], categories: [], wallets: [] };
const c = { console, S, getData: () => S, viewingUid: null, Date, Math, JSON, Array, String, Number, parseFloat, isFinite, Object, window: {},
  save() { c.ulozeno = (c.ulozeno || 0) + 1; }, showToast() {}, document: { getElementById: () => null } };
c.window = c; vm.createContext(c);
vm.runInContext(H, c);
vm.runInContext(UI.slice(a, b) + "\nfunction txPropojRender(){}", c);
const prijem = S.transactions.find(x => x.id === 'i1');
const k = c.txPropojKandidati(prijem, S, '');
t('k příjmu jen výdaje; bez přesunu a starších 2 let', k.every(x => x.type === 'expense') && !k.some(x => x.id === 'e3' || x.id === 'e4'), k.map(x => x.id));
t('stejná částka první (Alza 1 200), pak blízké datum (Lidl)', k.map(x => x.id).join(',') === 'e1,e2', k.map(x => x.id));
t('hledání podle názvu „lidl“', c.txPropojKandidati(prijem, S, 'lidl').map(x => x.id).join(',') === 'e2');
t('hledání podle částky „640“', c.txPropojKandidati(prijem, S, '640').map(x => x.id).join(',') === 'e2');
const soucty = () => vm.runInContext('[incSum(S.transactions, S), expSum(S.transactions, S)]', c);
const pred = soucty();
c.txPropoj('i1', 'e1');
t('propojeno na obou stranách', JSON.stringify(prijem.propojeno) === '["e1"]' && JSON.stringify(S.transactions[0].propojeno) === '["i1"]');
t('uloženo', c.ulozeno === 1);
t('statistiky beze změny (příjem zůstává příjmem, výdaj výdajem)', JSON.stringify(soucty()) === JSON.stringify(pred), pred);
t('protistrana se ukáže', c.txPropojene(prijem, S).map(x => x.id).join(',') === 'e1');
t('už propojená se znovu nenabídne', !c.txPropojKandidati(prijem, S, '').some(x => x.id === 'e1'));
c.txOdpoj('i1', 'e1');
t('✕ zruší propojení na obou stranách', !prijem.propojeno && !S.transactions[0].propojeno);
t('smazaná protistrana se neukáže', c.txPropojene({ propojeno: ['neni'] }, S).length === 0);
const DEB = fs.readFileSync(najdi('debts.js', '../js/debts.js'), 'utf8');
t('nová transakce: blok 🔗 skrytý (jen u úpravy)', /txPropojBox'\); if\(pb\)\{ pb\.style\.display='none'/.test(DEB));

console.log(`\n${ok} ✓  ${bad} ✗`);
process.exit(bad ? 1 : 0);
