// FinanceFlow · smoke_temata.js
// S28 (v12.20, Milan): ⭐ SLEDOVANÁ TÉMATA – položka / platba → téma (káva, pivo, Mac),
// AI paměť podle názvu, bez štítků a bez automatických slov. Kategorie, COICOP a statistiky se nemění,
// nic se nepočítá dvakrát, klíče paměti jsou platné pro Firebase (FIX-315).
const fs = require('fs'), path = require('path'), vm = require('vm');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const R = (...c) => fs.readFileSync(najdi(...c), 'utf8');
let ok = 0, bad = 0;
const t = (n, p, x) => { if (p) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n + (x === undefined ? '' : ' → ' + JSON.stringify(x).slice(0, 260))); } };
const tx = [
  { id: 'a', type: 'expense', name: 'Lidl', amount: 640, date: '2026-10-25', catId: 'cat1', receiptDate: '2026-10-25', receiptStore: 'Lidl',
    receiptItems: [{ name: 'Pilsner Urquell 0,5 l', lineTotal: 119, itemCatId: 'cat1' }, { name: 'Rohlík', lineTotal: 30, itemCatId: 'cat1' }, { name: 'Jacobs káva 250g', lineTotal: 129, itemCatId: 'cat1' }] },
  { id: 'b', type: 'expense', name: 'Hospoda U Lípy', amount: 186, date: '2026-10-24', catId: 'cat20', subcat: 'Bar' },
  { id: 'c', type: 'expense', name: 'Albert', amount: 300, date: '2026-09-21', catId: 'cat1', receiptDate: '2026-09-21', receiptStore: 'Albert',
    receiptItems: [{ name: 'Pilsner Urquell 0,5 l', lineTotal: 58, itemCatId: 'cat1' }, { name: 'Mléko', lineTotal: 25, itemCatId: 'cat1' }] },
  { id: 'd', type: 'expense', name: 'Převod', amount: 500, date: '2026-10-02', transferId: 'x' },
  { id: 'e', type: 'expense', name: 'Hospoda U Lípy', amount: 210, date: '2026-09-10', catId: 'cat20', subcat: 'Bar' },
];
const S = { transactions: tx, receipts: [{ date: '2026-10-25', store: 'Lidl', items: [{ name: 'Pilsner Urquell 0,5 l' }, { name: 'Rohlík' }, { name: 'Jacobs káva 250g' }] }],
  categories: [{ id: 'cat1', name: 'Potraviny', icon: '🛒' }, { id: 'cat20', name: 'Restaurace', icon: '☕' }], uiCfg: {}, curMonth: 9, curYear: 2026 };
const c = { console, S, getData: () => S, viewingUid: null, Date, Math, JSON, Array, Object, String, Number, Set, parseFloat, isFinite, window: {},
  save() { c.ulozeno = (c.ulozeno || 0) + 1; }, document: { getElementById: () => null } };
c.window = c; vm.createContext(c);
vm.runInContext(R('helpers.js', '../js/helpers.js'), c);
vm.runInContext(R('temata.js', '../js/temata.js'), c);
const soucty = () => vm.runInContext('[incSum(S.transactions, S), expSum(S.transactions, S)]', c);
const pred = soucty(), katPred = JSON.stringify(tx.map(x => [x.catId, (x.receiptItems || []).map(i => i.itemCatId)]));

console.log('── témata a označení ──');
const pivo = c.temaUloz(null, 'Pivo', '🍺'), kava = c.temaUloz(null, 'Káva', '☕');
t('témata založena', c.temataSeznam(S).map(x => x.nazev).join(',') === 'Pivo,Káva');
c.temaPrepniPolozku('a', 0, pivo);            // Pilsner v Lidlu
c.temaPrepniTx('b', pivo);                    // hospoda celá
c.temaPrepniPolozku('a', 2, kava);            // Jacobs
const s = c.temaSouhrn(S, pivo, 2026, 9);
t('Pivo říjen = Pilsner 119 + hospoda 186 = 305', s.kc === 305 && s.pocet === 2, [s.kc, s.pocet]);
console.log('── AI paměť ──');
const sz = c.temaSouhrn(S, pivo, 2026, 8);
t('paměť: Pilsner v Albertu (září) se označil sám, hospoda v září taky (podle názvu platby)', sz.kc === 58 + 210, sz.kc);
t('klíč paměti bez . # $ / [ ] (Firebase)', Object.keys(S.uiCfg.temataPamet).every(k => !/[.#$\[\]\/]/.test(k)) && Object.keys(S.uiCfg.temataPamet).length === 2, Object.keys(S.uiCfg.temataPamet));
c.temaPrepniPolozku('c', 0, pivo);            // ✕ v Albertu = sem nepatří
t('✕ u položky: vyřazena a paměť pro název zapomenuta', c.temaSouhrn(S, pivo, 2026, 8).kc === 210 && !S.uiCfg.temataPamet[c.temaKlic('Pilsner Urquell 0,5 l')], c.temaSouhrn(S, pivo, 2026, 8).kc);
t('… ručně označená položka v Lidlu zůstává', c.temaSouhrn(S, pivo, 2026, 9).kc === 305);
console.log('── nic dvakrát, nic se nemíchá ──');
c.temaPrepniTx('a', kava);                    // celá platba Lidl do Kávy + položka Jacobs taky v Kávě
const k = c.temaSouhrn(S, kava, 2026, 9);
t('celá platba v tématu = počítá se jen celá (640), ne + položka 129', k.kc === 640 && k.pocet === 1, [k.kc, k.pocet]);
c.temaPrepniTx('a', kava);
t('po zrušení celé platby zase jen položka 129', c.temaSouhrn(S, kava, 2026, 9).kc === 129);
t('přesun se nikdy nezapočítá', !c.temaZaznamy(S, pivo).some(z => z.t.id === 'd'));
t('statistiky beze změny (příjmy, výdaje)', JSON.stringify(soucty()) === JSON.stringify(pred), [pred, soucty()]);
t('kategorie platby i položek beze změny', JSON.stringify(tx.map(x => [x.catId, (x.receiptItems || []).map(i => i.itemCatId)])) === katPred);
t('značka se propsala i do účtenky (editor ukáže totéž)', JSON.stringify(S.receipts[0].items[0].temata) === JSON.stringify([pivo]));
t('kde to je v kategoriích: Potraviny 119, Restaurace › Bar 186', JSON.stringify(c.temaSouhrn(S, pivo, 2026, 9).kategorie) === JSON.stringify([['☕ Restaurace › Bar', 186], ['🛒 Potraviny', 119]]), c.temaSouhrn(S, pivo, 2026, 9).kategorie);
console.log('── přehled 12 měsíců ──');
const r = c.temaSouhrn(S, pivo, 2026, 9);
t('12 měsíců do října, Ø od prvního měsíce s daty (září+říjen → 2)', r.rada.length === 12 && r.rada[11].ym === '2026-10' && Math.abs(r.prumer - (305 + 210) / 2) < 1e-9, r.prumer);
c.temaSmaz(pivo);
t('smazání tématu: zmizí ze seznamu i paměti, platby zůstanou', c.temataSeznam(S).length === 1 && !Object.values(S.uiCfg.temataPametTx || {}).some(a => a.includes(pivo)) && tx.length === 5);
const RC = R('receipts.js', '../js/receipts.js');
t('editor účtenky: ⭐ u položky a výběr pod řádkem', /rpTemaTlacitko\(it, i\)/.test(RC) && /rpTemaPodRadkem\(it, i\)/.test(RC));
t('obě cesty účtenka → transakce přenášejí značku', (RC.match(/temata: it\.temata\.slice\(\)/g) || []).length === 2);

console.log(`\n${ok} ✓  ${bad} ✗`);
process.exit(bad ? 1 : 0);
