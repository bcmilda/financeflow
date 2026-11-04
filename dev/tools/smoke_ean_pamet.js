// FinanceFlow · smoke_ean_pamet.js
// S28 (v12.28, Milan: „prověř, jestli se po naskenování účtenky u známých a již dříve zaevidovaných položek
// správně zobrazí zelený čtvereček s fajfkou místo fotoaparátu – teď se to nestalo, musel jsem znovu skenovat EAN“).
// Kód se doplňoval jen ze spojení obchod + zkratka a z komunity. Nově i z ručního spojení s kartou s kódem
// (🔗 Spojit se stejným výrobkem) a z tvých dřívějších účtenek ze stejného obchodu. Negativní kontrola: na v12.27 padá.
const vm = require('vm'), fs = require('fs'), path = require('path');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const R = (...c) => fs.readFileSync(najdi(...c), 'utf8');
const el = () => ({ style: {}, innerHTML: '', remove() {}, appendChild() {} });
const ctx = { console, document: { getElementById: () => el(), createElement: () => el(), body: { appendChild() {} }, head: { appendChild() {} }, querySelectorAll: () => [] },
  navigator: {}, setTimeout, clearTimeout, URL, Promise, Date, Math, Object, Array, Set, JSON, String, Number,
  fetch: async () => ({ ok: true, status: 200, json: async () => null }) };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(R('helpers.js', '../js/helpers.js'), ctx);
const rc = R('receipts.js', '../js/receipts.js');
const vyrez = n => { const i = rc.indexOf('function ' + n + '('); const j = rc.indexOf('\n}\n', i) + 3; return i < 0 ? '' : rc.slice(i, j); };
vm.runInContext(vyrez('normalizeStoreName') + '\nfunction _mapaSpojeni(){ return (S.uiCfg && S.uiCfg.spojeni) || {}; }\n' + vyrez('mapaSpojeniKam'), ctx);
vm.runInContext(R('ean-sken.js', '../js/ean-sken.js'), ctx);
let ok = 0, bad = 0; const t = (n, c, x) => { if (c) { ok++; console.log('  ✓', n); } else { bad++; console.log('  ✗', n, x === undefined ? '' : JSON.stringify(x)); } };
const HOUB = '8590000000008', HOUB2 = '8591234000000', CHIPS = '8595237405947';
const nova = (store, ...nazvy) => ({ store, items: nazvy.map(n => ({ name: n, price: 20, qty: 1 })) });
const dopln = r => ctx.eanDoplnSeznam(r.items, r.store, {}, {}, ctx._eanOdmitnute(), null);
const set = S => vm.runInContext('S = ' + JSON.stringify(S) + '; _eanHistIdx = null;', ctx);

console.log('── dřívější účtenka ze stejného obchodu ──');
set({ uiCfg: {}, transactions: [], receipts: [{ store: 'PENNY MARKET s.r.o.', date: '2026-10-01', items: [{ name: 'HOUBICKY NA NADOBI 10KS', ean: HOUB, price: 29 }] }] });
let r = nova('Penny Market', 'HOUBICKY NA NADOBI 10KS', 'ROHLIK 43G');
t('nová účtenka z Penny: houbičky dostanou kód z dřívější účtenky (✅ místo 📷), bez spojení v eanAliasy', dopln(r) === 1 && r.items[0].ean === HOUB, r.items);
t('… neznámý rohlík zůstává bez kódu (📷)', !r.items[1].ean);
r = nova('Lidl', 'HOUBICKY NA NADOBI 10KS');
t('jiný obchod se stejnou zkratkou se nedoplní (zkratky se mezi obchody liší)', dopln(r) === 0 && !r.items[0].ean);
set({ uiCfg: {}, receipts: [], transactions: [{ type: 'expense', receiptStore: 'PENNY MARKET', receiptItems: [{ name: 'HOUBICKY NA NADOBI 10KS', ean: HOUB }] }] });
r = nova('PENNY MARKET', 'HOUBICKY NA NADOBI 10KS');
t('kód z položek transakce (účtenka bez záznamu v Účtenkách) se použije taky', dopln(r) === 1 && r.items[0].ean === HOUB);

console.log('── kdy se kód NEdoplní ──');
set({ uiCfg: {}, transactions: [], receipts: [{ store: 'PENNY MARKET', items: [{ name: 'HOUBICKY NA NADOBI 10KS', ean: HOUB }, { name: 'HOUBICKY NA NADOBI 10KS', ean: HOUB2 }] }] });
r = nova('PENNY MARKET', 'HOUBICKY NA NADOBI 10KS');
t('dvě různé kódy u stejné zkratky = nevíme který → nic (📷)', dopln(r) === 0);
const kl = ctx.eanAliasKlic('PENNY MARKET', 'HOUBICKY NA NADOBI 10KS');
set({ uiCfg: { eanOdmitnute: { [kl]: { [HOUB]: 1 } } }, transactions: [], receipts: [{ store: 'PENNY MARKET', items: [{ name: 'HOUBICKY NA NADOBI 10KS', ean: HOUB }] }] });
r = nova('PENNY MARKET', 'HOUBICKY NA NADOBI 10KS');
t('kód, který sis u zkratky odebral (✕ Odebrat přiřazení), se nevrátí', dopln(r) === 0);
set({ uiCfg: { eanDruhy: { [kl]: { [HOUB]: { n: 'a' }, [HOUB2]: { n: 'b' } } } }, transactions: [], receipts: [{ store: 'PENNY MARKET', items: [{ name: 'HOUBICKY NA NADOBI 10KS', ean: HOUB }] }] });
r = nova('PENNY MARKET', 'HOUBICKY NA NADOBI 10KS');
t('zkratka s víc druhy se nedoplní (výběr „Který druh?“)', dopln(r) === 0);

console.log('── 🔗 ruční spojení s kartou s kódem ──');
set({ uiCfg: { spojeni: { 'bl lusteninove chipsy': 'ean:' + CHIPS } }, transactions: [], receipts: [] });
r = nova('BILLA', 'BL Luštěninové chipsy 65g');
t('zkratka spojená s kartou výrobku (🔗 Spojit se stejným výrobkem) dostane kód karty', dopln(r) === 1 && r.items[0].ean === CHIPS, r.items);
r = nova('Albert', 'BL Luštěninové chipsy 65g');
t('… platí v každém obchodě (spojení je tvoje, ne obchodu)', dopln(r) === 1);

console.log('── přednost ──');
set({ uiCfg: {}, transactions: [], receipts: [{ store: 'PENNY MARKET', items: [{ name: 'HOUBICKY NA NADOBI 10KS', ean: HOUB }] }] });
r = nova('PENNY MARKET', 'HOUBICKY NA NADOBI 10KS');
ctx.eanDoplnSeznam(r.items, r.store, { [kl]: { ean: HOUB2 } }, {}, {}, null);
t('tvoje spojení obchod + zkratka má přednost před historií', r.items[0].ean === HOUB2);
t('editor má ✅ u položky s kódem a 📷 bez něj', /\$\{it\.ean\?'✅':'📷'\}/.test(rc));
console.log(`\n${ok} ✓  ${bad} ✗`);
process.exit(bad ? 1 : 0);
