// FinanceFlow · smoke_uctenka_rozdeleni.js
// S28 (v12.35, Milan: „v editu účtenky může být více kategorií i podkategorií a Statistiky a další funkce s tím
// musí počítat… proč se to nepřenese do Transakcí?“ → „ano, proveď… u starých i nových účtenek“):
// transakce účtenky se rozdělí podle kategorie + podkategorie položek (jako ✂️ Rozdělit).
// Negativní kontrola: na v12.34 padá.
const fs = require('fs'), path = require('path'), vm = require('vm');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const R = (...c) => fs.readFileSync(najdi(...c), 'utf8');
let ok = 0, bad = 0;
const t = (n, p, x) => { if (p) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n + (x === undefined ? '' : ' → ' + JSON.stringify(x))); } };
const vyber = (src, n) => { const i = src.indexOf('function ' + n + '('); if (i < 0) return ''; let d = 0, k = src.indexOf('{', i);
  for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) break; } } return src.slice(i, k + 1); };
const radek = (src, z) => { const i = src.indexOf(z); return i < 0 ? '' : src.slice(i, src.indexOf('\n', i)); };
const RC = R('receipts.js', '../js/receipts.js'), UI = R('ui.js', '../js/ui.js'), DU = R('duplicates.js', '../js/duplicates.js'),
  AP = R('app.js', '../js/app.js'), PR = R('premium.js', '../js/premium.js'), IB = R('inbox.js', '../js/inbox.js'),
  VZ = R('vozidla.js', '../js/vozidla.js'), KA = R('kalkulacky.js', '../js/kalkulacky.js'), DO = R('dotazy.js', '../js/dotazy.js'),
  TE = R('temata.js', '../js/temata.js'), AD = R('admin.js', '../js/admin.js'), PJ = R('projects.js', '../js/projects.js');

const kontext = () => {
  const c = { S: {}, Math, JSON, Object, Array, String, Number, Set, Map, isFinite, viewingUid: null, rpDefaultWalletId: () => 'wk' };
  c.txCZK = (x, D) => { if (x.amtCZK != null) return x.amtCZK; const w = ((D || c.S).wallets || []).find(v => v.id === x.wallet); return (x.amount || 0) * (w && w.kurz || 1); };
  c.window = c; vm.createContext(c);
  vm.runInContext(['RCPT_CAST_POLE', 'RCPT_CAST_START', '_rcptKc2', '_rcptItKc'].map(n => radek(RC, 'const ' + n + ' ')).join('\n') + '\n'
    + ['_rcptHash', 'rcptCastiTx', 'rcptRodicTx', 'rcptJeRozdelitelna', 'rcptRozdelTx', 'rcptRozdelVse', 'syncReceiptToTransactions'].map(n => vyber(RC, n)).join('\n'), c);
  return c;
};
const pol = (name, kc, cat, sub, o) => Object.assign({ name, price: kc, qty: 1, lineTotal: kc, itemCatId: cat, itemSubcat: sub || '', tag: '' }, o);
const uctTx = (items, o) => Object.assign({ id: 1700000, type: 'expense', name: 'Lidl', amount: 268.1, amt: 268.1, date: '2026-10-18', wallet: 'wk', catId: 'darky', category: 'darky',
  subcat: 'Narozeniny', receiptAddedAt: 1700, receiptDate: '2026-10-18', receiptStore: 'Lidl', note: '📸 Naskenováno', tags: 'mamka', receiptItems: items }, o);
const vydaje = D => D.transactions.filter(x => x.type === 'expense' && !x.splitParent).reduce((a, x) => a + x.amount, 0);
const podleKat = D => { const o = {}, srov = x => Object.keys(x).sort().reduce((a, k) => (a[k] = x[k], a), {}); D.transactions.filter(x => x.type === 'expense' && !x.splitParent).forEach(x => { const k = x.catId + (x.subcat ? '›' + x.subcat : ''); o[k] = Math.round(((o[k] || 0) + x.amount) * 100) / 100; }); return srov(o); };
const zustatek = (D, w) => D.transactions.filter(x => x.wallet === w).reduce((a, x) => a - x.amount, 0);

console.log('── účtenka s dárky a potravinami (Milanův příklad) ──');
let c = kontext();
const polozky1 = [pol('Svíčka', 89.9, 'darky', 'Narozeniny', { tag: 'mamka' }), pol('Rohlík', 3.9, 'potr', ''), pol('Přání', 99.8, 'darky', 'Narozeniny', { tag: 'mamka' }),
  pol('Mléko', 24.5, 'potr', ''), pol('Banány', 50, 'potr', 'Ovoce')];
c.S = { wallets: [{ id: 'wk' }], transactions: [uctTx(polozky1)], receipts: [{ id: 'r1', addedAt: 1700, date: '2026-10-18', store: 'Lidl', total: 268.1, items: polozky1 }] };
let n = c.rcptRozdelVse();
const P = c.S.transactions.find(x => x.id === 1700000), casti = c.S.transactions.filter(x => x.rcptCast);
t('transakce se rozdělí na části podle kategorie a podkategorie položek', n >= 1 && P.splitParent && P.rcptSplit && casti.length === 3, casti.map(x => x.catId + '|' + x.subcat));
t('do výdajů jdou Dárky›Narozeniny 189,70 · Potraviny 28,40 · Potraviny›Ovoce 50 (dřív 268,10 v Dárkách)',
  JSON.stringify(podleKat(c.S)) === JSON.stringify({ 'darky›Narozeniny': 189.7, potr: 28.4, 'potr›Ovoce': 50 }) || JSON.stringify(podleKat(c.S)) === JSON.stringify({ 'darky›Narozeniny': 189.7, 'potr›Ovoce': 50, potr: 28.4 }), podleKat(c.S));
t('součet výdajů = zaplaceno 268,10 (rodič se nepočítá)', Math.abs(vydaje(c.S) - 268.1) < 0.001, vydaje(c.S));
t('peněženka se odečte jednou (peněženku drží jen rodič)', Math.abs(zustatek(c.S, 'wk') + 268.1) < 0.001 && casti.every(x => !x.wallet));
t('rodič drží vazbu na účtenku, položky nesou části (každá položka jednou, pořadí účtenky)', P.receiptAddedAt === 1700 && !P.receiptItems
  && casti.reduce((a, x) => a + x.receiptItems.length, 0) === 5 && casti.find(x => x.catId === 'darky').receiptItems.map(it => it.ri).join() === '0,2');
t('zelené štítky jdou s položkami do části (rodič je nemá, nic se nesčítá dvakrát)', P.tags === '' && casti.find(x => x.catId === 'darky').tags === 'mamka' && casti.find(x => x.subcat === '').tags === '');
t('část má obchod a datum účtenky, název = obchod, bez wallet a bez 📸 poznámky', casti.every(x => x.name === 'Lidl' && x.date === '2026-10-18' && x.receiptStore === 'Lidl' && !x.receiptAddedAt && !String(x.note || '').startsWith('📸')));
const snimek = JSON.stringify(c.S.transactions);
t('podruhé se nic nemění (stejná id, stejná data)', c.rcptRozdelVse() === 0 && JSON.stringify(c.S.transactions) === snimek);
const c2 = kontext(); c2.S = { wallets: [{ id: 'wk' }], transactions: [uctTx(polozky1.map(x => Object.assign({}, x)))] }; c2.rcptRozdelVse();
t('id částí jsou stejná na každém zařízení (odvozená z rodiče a skupiny)', c2.S.transactions.filter(x => x.rcptCast).map(x => x.id).join() === casti.map(x => x.id).join());

console.log('── úprava účtenky v editoru ──');
const nove = polozky1.map(x => Object.assign({}, x, { itemCatId: 'potr', itemSubcat: '' }));
c.syncReceiptToTransactions({ addedAt: 1700, date: '2026-10-19', store: 'Lidl', total: 268.1, items: nove }, null);
const P2 = c.S.transactions.find(x => x.id === 1700000);
t('všechny položky do jedné kategorie → rozdělení zmizí, transakce dostane kategorii položek', !c.S.transactions.some(x => x.rcptCast) && !P2.splitParent && !P2.splitId
  && P2.catId === 'potr' && P2.receiptItems.length === 5 && P2.date === '2026-10-19', P2);
c.syncReceiptToTransactions({ addedAt: 1700, date: '2026-10-19', store: 'Lidl', total: 268.1, items: polozky1 }, null);
t('… a zpět na dvě kategorie → znovu části', c.S.transactions.filter(x => x.rcptCast).length === 3 && c.S.transactions.filter(x => x.rcptCast).every(x => x.date === '2026-10-19'));

console.log('── částky ──');
c = kontext();
c.S = { wallets: [{ id: 'wk' }], transactions: [uctTx([pol('Pivo', 61.3, 'alko'), pol('Chleba', 61.3, 'potr'), pol('Záloha lahve', -3, 'zaloha')], { amount: 123, amt: 123 })] };
c.rcptRozdelVse();
let cc = c.S.transactions.filter(x => x.rcptCast);
t('zaokrouhlení hotovosti (položky 119,60 · zaplaceno 123) se rozpočítá, haléře sedí', cc.length === 2 && Math.abs(cc.reduce((a, x) => a + x.amount, 0) - 123) < 1e-9, cc.map(x => x.amount));
t('vratná záloha −3 Kč (vlastní kategorie) jde do největší části, ne jako záporný výdaj', !cc.some(x => x.catId === 'zaloha') && cc.every(x => x.amount > 0));
c = kontext();
c.S = { wallets: [{ id: 'we', kurz: 25 }], transactions: [uctTx([pol('A', 6, 'x'), pol('B', 4, 'y')], { amount: 10, amt: 10, wallet: 'we' })] };
c.rcptRozdelVse(); cc = c.S.transactions.filter(x => x.rcptCast);
t('cizí měna: části nesou přepočet na Kč (součet = Kč rodiče)', cc.length === 2 && Math.abs(cc.reduce((a, x) => a + x.amtCZK, 0) - 250) < 1e-9, cc.map(x => x.amtCZK));
c = kontext();
c.S = { wallets: [], transactions: [uctTx([pol('A', 50, ''), pol('B', 50, 'potr')], { catId: 'drog', category: 'drog', subcat: '' })] };
c.rcptRozdelVse();
t('položka bez kategorie jde podle kategorie transakce', c.S.transactions.filter(x => x.rcptCast).map(x => x.catId).sort().join() === 'drog,potr');
c = kontext();
c.S = { wallets: [], transactions: [uctTx([pol('A', 50, 'potr'), pol('B', 50, 'potr')], { catId: 'nakup', category: 'nakup', subcat: 'Chata' })] };
c.rcptRozdelVse(); const J = c.S.transactions[0];
t('jedna kategorie položek: bez rozdělení, kategorie z položek (ručně zadaná podkategorie zůstane)', c.S.transactions.length === 1 && !J.splitParent && J.catId === 'potr' && J.subcat === '', J);

console.log('── co zůstává a co se uklidí ──');
c = kontext();
const man = [{ id: 5, type: 'expense', amount: 20, catId: 'darky', splitId: 's1', splitParent: true, receiptItems: [pol('X', 20, 'a')] },
  { id: 6, type: 'expense', amount: 10, catId: 'a', splitId: 's1' }, { id: 7, type: 'expense', amount: 10, catId: 'b', splitId: 's1' }];
c.S = { wallets: [], transactions: JSON.parse(JSON.stringify(man)) };
t('ruční rozdělení (✂️ Rozdělit) se nemění', c.rcptRozdelVse() === 0 && JSON.stringify(c.S.transactions) === JSON.stringify(man));
c.S = { wallets: [{ id: 'wk' }], transactions: [uctTx(polozky1.map(x => Object.assign({}, x)), { priority: 'ok', payType: 'karta' })] };
c.rcptRozdelVse();
let ch = c.S.transactions.filter(x => x.rcptCast);
t('část převezme typ platby a hodnocení rodiče', ch.every(x => x.payType === 'karta' && x.priority === 'ok'));
ch[0].priority = 'zbytecne'; c.S.transactions[0].payType = 'hotovost'; c.rcptRozdelVse();
t('hodnocení části (Hodnocení měsíce) zůstane, změna typu platby u rodiče se propíše', ch[0].priority === 'zbytecne' && c.S.transactions.filter(x => x.rcptCast).every(x => x.payType === 'hotovost'));
c.S.transactions = c.S.transactions.filter(x => !x.splitParent); c.rcptRozdelVse();
t('části bez rodiče (smazaná transakce nebo účtenka) se smažou – nezůstanou ve výdajích', c.S.transactions.length === 0);
c.viewingUid = 'partner'; c.S = { wallets: [], transactions: [uctTx(polozky1.map(x => Object.assign({}, x)))] };
t('při prohlížení partnera se nic nepřepisuje', c.rcptRozdelVse() === 0 && !c.S.transactions[0].splitParent);

console.log('── napojení v aplikaci ──');
t('přepočet při každém uložení dat a po spuštění (staré účtenky)', /rcptRozdelVse\(\)/.test(vyber(AP, 'save')) && /rcptRozdelVse\(\)/.test(vyber(PR, 'processAutoSablony')));
t('uložení účtenky v editoru rozdělí transakci hned', /rcptRozdelTx\(S, t\)/.test(vyber(RC, 'syncReceiptToTransactions')) && /rozdělená na \$\{_nCast\}/.test(RC));
t('✎ / 📷 u části i rodiče otevře editor účtenky', /t\.rcptCast \|\| t\.rcptSplit/.test(vyber(RC, 'rcptJeTxUctenky')) && /rcptRodicTx\(S, t\)/.test(vyber(RC, 'openReceiptForTx')));
t('smazání části = smazání celé transakce účtenky (přes ochranu účtenky), ✕ u části nahrazuje 📷',
  /_t\.rcptCast&&typeof rcptRodicTx/.test(vyber(UI, 'deleteTx')) && /child\.rcptCast/.test(vyber(AD, 'deleteSplitChild')) && /t\.rcptCast\s*\?\s*`<button[^`]*openReceiptForTx/.test(UI));
t('smazání rozdělené platby smaže i její části (dřív části zůstaly ve výdajích)', /!\(_sid&&t\.splitId===_sid\)/.test(vyber(UI, 'deleteTx')) && /!\(sid && x\.splitId === sid\)/.test(vyber(DU, 'txSmazSUctenkou')));
t('Podezřelé a Doručené: účtenku zastupuje rodič (celá částka), části se neporovnávají', /dupZastupuje\(t\)/.test(vyber(DU, 'dupPary')) && /dupZastupuje\(t\)/.test(vyber(DU, 'dupParyPolozka'))
  && /rcptRodicTx\(S, t\)/.test(vyber(DU, 'dupUctenkaPro')) && /!t\.splitParent \|\| t\.rcptSplit\) && !t\.rcptCast/.test(vyber(IB, 'inboxUctenkaK')));
const c5 = { DUP_CONFIG: { IGNORE_CATS: [] }, _dupIgnored: {} }; vm.createContext(c5); vm.runInContext(vyber(DU, 'dupZastupuje'), c5);
t('… rodič účtenky ano, ruční rodič ne, část ne', c5.dupZastupuje({ splitParent: true, rcptSplit: true }) && !c5.dupZastupuje({ splitParent: true }) && !c5.dupZastupuje({ rcptCast: true }) && c5.dupZastupuje({}));
t('peněženka se částem nedoplní, tankování a kalkulačka zlozvyku je nepočítají dvakrát', /!t\.rcptCast && \(t\.receiptItems/.test(vyber(RC, 'rpFixReceiptTxWallets'))
  && /!t\.tank && !t\.rcptCast/.test(vyber(VZ, 'tankUctenkyBez')) && /p\.tx\.rcptSplit\) return/.test(vyber(KA, 'kalkZlozvykMoznosti')));
t('Dotazy: rozdělená účtenka = jeden nákup', /nakup = t\.rcptCast && t\.splitId/.test(vyber(DO, 'dotazSpocitej')) && /x\.nakup \|\| x\.txId/.test(vyber(DO, 'dotazSouhrn')));
t('⭐ téma položky části se zapíše na správnou položku účtenky (it.ri)', /it\.ri != null \? it\.ri : i/.test(vyber(TE, 'temaPrepniPolozku')));
t('filtr kategorie v Transakcích ukáže část, jejíž rodič vypadl', /t\.rcptCast && !_vidRodic\.has\(t\.splitId\)/.test(UI) && /samostatne=false/.test(UI));
t('Projekt: smazání části jde přes celou transakci účtenky', /_t\.rcptCast \|\| _t\.rcptSplit/.test(vyber(PJ, 'deleteTxFromProject')));
console.log(`\n${ok} ✓  ${bad} ✗`);
process.exit(bad ? 1 : 0);
