// FinanceFlow · smoke_uctenka_vazba.js
// S28 (v12.33, Milan: „jak to, že se mi v transakcích nezobrazuje transakce z naskenované účtenky 1. 10. 2026?“):
// transakce se k upravené účtence hledala jen podle data a obchodu → po opravě data (↔ Prohodit den a měsíc)
// nebo obchodu se nenašla, zůstala se starým datem a editor přesto hlásil „promítnuto do transakcí“.
// Negativní kontrola: na v12.32 padá.
const fs = require('fs'), path = require('path'), vm = require('vm');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const R = (...c) => fs.readFileSync(najdi(...c), 'utf8');
let ok = 0, bad = 0;
const t = (n, p, x) => { if (p) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n + (x === undefined ? '' : ' → ' + JSON.stringify(x))); } };
const vyber = (src, n) => { const i = src.indexOf('function ' + n + '('); if (i < 0) return ''; let d = 0, k = src.indexOf('{', i);
  for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) break; } } return src.slice(i, k + 1); };
const RC = R('receipts.js', '../js/receipts.js'), PR = R('premium.js', '../js/premium.js'), AP = R('app.js', '../js/app.js');
const c = { S: {}, Math, JSON, Object, Array, String, Number, isFinite, viewingUid: null, rpDefaultWalletId: () => 'wk' };
c.window = c; vm.createContext(c);
vm.runInContext(vyber(RC, 'syncReceiptToTransactions') + '\n' + vyber(RC, 'rcptOpravVazby'), c);
const uct = (o) => Object.assign({ id: 'rc1', addedAt: 1700, store: 'Lidl', date: '2026-10-01', total: 448.4, items: [{ name: 'HARIBO čoko.', price: 19.9, qty: 2 }] }, o);
const tx = (o) => Object.assign({ id: 't1', type: 'expense', name: 'Lidl', amount: 448.4, date: '2026-01-10', receiptDate: '2026-01-10', receiptStore: 'Lidl', receiptAddedAt: 1700, note: '📸 Naskenováno' }, o);

console.log('── oprava data v editoru (↔ Prohodit 10. 1. → 1. 10.) ──');
c.S = { wallets: [{ id: 'wk' }], transactions: [tx()], receipts: [] };
let n = c.syncReceiptToTransactions(uct(), { date: '2026-01-10', store: 'Lidl' });
t('transakce se najde podle pevné vazby a dostane datum účtenky 1. 10. 2026 (dřív zůstala v lednu)', n === 1 && c.S.transactions[0].date === '2026-10-01' && c.S.transactions[0].receiptDate === '2026-10-01', c.S.transactions[0]);

console.log('── oprava obchodu ──');
c.S.transactions = [tx({ date: '2026-10-01', receiptDate: '2026-10-01', name: 'LIDL', receiptStore: 'LIDL' })];
c.syncReceiptToTransactions(uct({ store: 'Lidl Sviadnov' }), { date: '2026-10-01', store: 'LIDL' });
t('nový obchod se propíše do transakce i do jejího názvu', c.S.transactions[0].receiptStore === 'Lidl Sviadnov' && c.S.transactions[0].name === 'Lidl Sviadnov');
c.S.transactions = [tx({ date: '2026-10-01', receiptDate: '2026-10-01', name: 'Nákup na chatu', receiptStore: 'LIDL' })];
c.syncReceiptToTransactions(uct({ store: 'Lidl' }), { date: '2026-10-01', store: 'LIDL' });
t('… ale název, který sis u transakce přepsal, zůstane', c.S.transactions[0].name === 'Nákup na chatu');

console.log('── starší transakce bez pevné vazby ──');
c.S.transactions = [tx({ receiptAddedAt: undefined, date: '2026-01-10', receiptDate: '2026-01-10' })];
n = c.syncReceiptToTransactions(uct(), { date: '2026-01-10', store: 'Lidl' });
t('najde se podle data a obchodu PŘED úpravou, dostane nové datum i pevnou vazbu', n === 1 && c.S.transactions[0].date === '2026-10-01' && c.S.transactions[0].receiptAddedAt === 1700);
c.S.transactions = [tx({ date: '2026-02-03', receiptDate: '2026-01-10' })];
c.syncReceiptToTransactions(uct(), { date: '2026-01-10', store: 'Lidl' });
t('datum, které sis v transakci změnil sám, se nepřepíše', c.S.transactions[0].date === '2026-02-03' && c.S.transactions[0].receiptDate === '2026-10-01');
c.S.transactions = [];
t('bez transakce vrátí 0 (editor pak varuje, místo „promítnuto do transakcí“)', c.syncReceiptToTransactions(uct(), null) === 0
  && /nenašel jsem k ní transakci/.test(vyber(RC, 'rpSave')) && /_nTx = syncReceiptToTransactions\(cil \|\| upr, stare\)/.test(vyber(RC, 'rpSave')));

console.log('── už rozpojené dvojice (oprava po spuštění) ──');
c.S = { receipts: [uct()], transactions: [tx(), tx({ id: 't2', receiptAddedAt: 999, date: '2026-03-03', receiptDate: '2026-03-03' })] };
n = c.rcptOpravVazby();
t('transakce účtenky Lidl se přesune z 10. 1. na 1. 10. 2026', n >= 1 && c.S.transactions[0].date === '2026-10-01', c.S.transactions[0]);
t('transakce jiné účtenky (bez shody) zůstane', c.S.transactions[1].date === '2026-03-03');
t('podruhé už nic (idempotentní)', c.rcptOpravVazby() === 0);
t('oprava běží po spuštění appky i při ukládání', /rcptOpravVazby\(\)/.test(vyber(PR, 'processAutoSablony')) && /rcptOpravVazby\(\)/.test(vyber(AP, 'save')));
console.log(`\n${ok} ✓  ${bad} ✗`);
process.exit(bad ? 1 : 0);
