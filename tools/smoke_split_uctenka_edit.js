// FinanceFlow · smoke_split_uctenka_edit.js
// S28 (v12.34, Milan):
//  1) „editace v Transakci byla přesměrována na účtenku… nyní edituješ přímo v transakcích, dole vidíš modré tagy,
//     které jsou ve skutečnosti zelené štítky“ → transakce z účtenky se upravuje v editoru účtenky,
//  2) „při Rozdělení transakce je přednastavená kategorie a chybí podkategorie“ + „vyskočilo upozornění na jasný
//     duplikát“ → kategorie a podkategorie rozdělované platby, výběr podkategorie, části nejsou duplikáty,
//  3) „jednorázové prodeje ani cashbacky se do průměru příjmu nepočítají – váha 0 %“ → výhled příjmů s vahami.
// Negativní kontrola: na v12.33 padá.
const fs = require('fs'), path = require('path'), vm = require('vm');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const R = (...c) => fs.readFileSync(najdi(...c), 'utf8');
let ok = 0, bad = 0;
const t = (n, p, x) => { if (p) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n + (x === undefined ? '' : ' → ' + JSON.stringify(x))); } };
const vyber = (src, n) => { const i = src.indexOf('function ' + n + '('); if (i < 0) return ''; let d = 0, k = src.indexOf('{', i);
  for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) break; } } return src.slice(i, k + 1); };
const RC = R('receipts.js', '../js/receipts.js'), UI = R('ui.js', '../js/ui.js'), DU = R('duplicates.js', '../js/duplicates.js'),
  AD = R('admin.js', '../js/admin.js'), PJ = R('projects.js', '../js/projects.js'), RM = R('report-mesicni.js', '../js/report-mesicni.js');

console.log('── 1) úprava transakce z účtenky ──');
const c1 = { S: { transactions: [{ id: 'r1', receiptAddedAt: 1700, receiptItems: [{ name: 'X' }], receiptDate: '2026-01-10', receiptStore: 'Lidl' }, { id: 'n', name: 'Kafe' }],
  receipts: [{ id: 'a', addedAt: 1, date: '2026-10-01', store: 'Lidl' }, { id: 'b', addedAt: 1700, date: '2026-10-01', store: 'Lidl' }] }, Array, String, otevreno: null };
c1.openReceiptInHistory = (d, s, i) => { c1.otevreno = [d, s, i]; }; c1.window = c1; vm.createContext(c1);
vm.runInContext(vyber(RC, 'rcptJeTxUctenky') + '\n' + vyber(RC, 'openReceiptForTx'), c1);
t('transakce z účtenky se pozná (položky nebo pevná vazba), běžná ne', c1.rcptJeTxUctenky(c1.S.transactions[0]) && !c1.rcptJeTxUctenky(c1.S.transactions[1]));
t('otevře SPRÁVNOU účtenku podle pevné vazby (ne první se stejným datem a obchodem)', c1.openReceiptForTx('r1') && c1.otevreno && c1.otevreno[2] === 1, c1.otevreno);
t('✎ (editTx) u transakce z účtenky otevře editor účtenky, ne formulář transakce', /rcptJeTxUctenky\(t\) && typeof openReceiptForTx==='function' && openReceiptForTx\(id\)\) return;/.test(vyber(UI, 'editTx')));
t('📷 a swipe „Upravit“ hledají účtenku podle pevné vazby', (UI.match(/openReceiptForTx\('\$\{t\.id\}'\)\)\|\|openReceiptInHistory/g) || []).length >= 3);

console.log('── 2) rozdělení transakce ──');
const kat = [{ id: 'cat23', name: 'Dárky', icon: '🎁', type: 'expense', subs: ['Narozeniny', 'Vánoce'] }, { id: 'cat1', name: 'Nákupy potravin', icon: '🛒', type: 'expense', subs: [] }];
const c2 = { getData: () => ({ categories: kat }), escHtml: s => s, String, document: { getElementById: () => null } }; c2.window = c2; vm.createContext(c2);
vm.runInContext('var _splitParentSub="";' + vyber(AD, 'splitSubOptions') + '\n' + vyber(AD, 'buildSplitRow'), c2);
const opts = kat.map(x => `<option value="${x.id}">${x.icon} ${x.name}</option>`).join('');
const row = c2.buildSplitRow(0, 'cat23', 10, opts, false, 'Narozeniny');
t('první část má vybranou kategorii rozdělované platby (Dárky, ne první v seznamu)', /value="cat23" selected/.test(row) && !/value="cat1" selected/.test(row));
t('… a výběr podkategorie s předvybranou podkategorií', /id="split-sub-0"/.test(row) && /value="Narozeniny" selected/.test(row));
const sv = vyber(AD, 'saveSplit');
t('část uloží podkategorii a název rozdělované platby', /subcat: it\.subcat \|\| ''/.test(sv) && /name: tx\.name \|\| catObj\.name/.test(sv));
t('druhý řádek i přidaná část začínají kategorií rozdělované platby', /buildSplitRow\(1, tx\.catId\|\|tx\.category\|\|''/.test(vyber(AD, 'openSplitModal')) && /_tx0\.catId/.test(vyber(AD, 'splitAddItem')));
t('části se čtou podle id řádku (po odebrání řádku se neztratí)', /row\.id\.replace\('split-row-', ''\)/.test(sv));
const c3 = { S: { uiCfg: {} }, _dupIgnored: {}, DUP_CONFIG: { IGNORE_CATS: [], FUZZY_DAYS: 3, NAME_SIM_THR: 0.9 }, fmt: x => x, Math, Date, String, Object, Number };
c3.window = c3; vm.createContext(c3);
vm.runInContext(['dupZastupuje', 'dupNeniKlic', 'dupJeNeni', 'dupCastka', 'dupPorovnej', 'dupPary', 'dupPridano', 'nameSim', 'jaroWinkler'].map(n => vyber(DU, n)).join('\n')
  + '\nfunction dupParyPolozka(){return [];}', c3);
const txs = [{ id: 'p', type: 'expense', amount: 20, date: '2026-10-18', catId: 'cat23', splitId: 's1', splitParent: true, name: 'Dárek' },
  { id: 'c1', type: 'expense', amount: 10, date: '2026-10-18', catId: 'cat23', splitId: 's1', name: 'Dárek' },
  { id: 'c2', type: 'expense', amount: 10, date: '2026-10-18', catId: 'cat23', splitId: 's1', name: 'Dárek' },
  { id: 'x', type: 'expense', amount: 20, date: '2026-10-18', catId: 'cat23', name: 'Jiný dárek' }];
const par = c3.dupPary(txs).map(p => [p.a.id, p.b.id].sort().join('-'));
t('části téže rozdělené platby nejsou duplikáty jedna druhé', !par.includes('c1-c2'), par);
t('rodič rozdělené platby se neporovnává (jeho částku nesou části)', !par.some(x => x.includes('p')), par);
t('skutečný duplikát běžných transakcí se pozná dál', c3.dupPary([txs[3], Object.assign({}, txs[3], { id: 'y' })]).length === 1);

console.log('── 3) výhled příjmů s vahami stability ──');
const c4 = { Number }; vm.createContext(c4); vm.runInContext(vyber(PJ, 'catVahaPrijmu'), c4);
t('váha: uložená stabilityWeight, legacy stable:true = 1, neoznačené = 0', c4.catVahaPrijmu({ stabilityWeight: 0 }) === 0 && c4.catVahaPrijmu({ stabilityWeight: 0.5 }) === 0.5 && c4.catVahaPrijmu({ stable: true }) === 1 && c4.catVahaPrijmu({}) === 0);
t('základ příjmu i výhled berou stejnou váhu', /catVahaPrijmu\(cat\)/.test(vyber(PJ, 'computeBaseIncome')) && /txCZK\(t, D\) \* _vaha\(t\)/.test(RM));
console.log(`\n${ok} ✓  ${bad} ✗`);
process.exit(bad ? 1 : 0);
