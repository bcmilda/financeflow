// FinanceFlow · smoke_ean_zkratka.js
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

// v12.32 (Milan: „na účtence bylo ‚sušenky polom.hořké‘, v editoru ‚sušenky polomáčené hořké‘ – AI pozměnilo název,
// což vedlo k nepřiřazení známého výrobku. Jinak tu bojujeme sami proti sobě.“). Negativní kontrola: na v12.31 padá.
const POLOM = '8593893745346';
console.log('── zkratka ↔ rozepsaný název ──');
set({ uiCfg: {}, transactions: [], receipts: [{ store: 'PENNY MARKET', items: [{ name: 'sušenky polomáčené hořké', ean: POLOM }] }] });
let r = nova('Penny Market', 'SUŠENKY POLOM.HOŘKÉ');
t('nová účtenka se zkratkou najde dřívější rozepsaný název (✅ místo 📷)', dopln(r) === 1 && r.items[0].ean === POLOM, r.items);
const kl = ctx.eanAliasKlic('PENNY MARKET', 'sušenky polomáčené hořké');
r = nova('PENNY MARKET', 'SUŠENKY POLOM.HOŘKÉ');
ctx.eanDoplnSeznam(r.items, r.store, { [kl]: { ean: POLOM } }, {}, ctx._eanOdmitnute(), null);
t('… i přes tvoje spojení obchod + zkratka uložené s rozepsaným názvem', r.items[0].ean === POLOM);
set({ uiCfg: {}, transactions: [], receipts: [{ store: 'PENNY MARKET', items: [{ name: 'SUŠENKY POLOM.HOŘKÉ', ean: POLOM }] }] });
r = nova('PENNY MARKET', 'sušenky polomáčené hořké');
t('a naopak (stará zkratka, nový rozepsaný název)', dopln(r) === 1 && r.items[0].ean === POLOM);
console.log('── kdy se NEspojí ──');
set({ uiCfg: {}, transactions: [], receipts: [{ store: 'PENNY MARKET', items: [{ name: 'mléko polotučné 1l', ean: HOUB }, { name: 'jogurt bílý 150g', ean: CHIPS }] }] });
r = nova('PENNY MARKET', 'mléko plnotučné 1l', 'jogurt bílý 400g', 'jogurt bílý');
t('jiné slovo (polotučné × plnotučné) se nespojí', dopln(r) === 0 && !r.items[0].ean);
t('jiná gramáž (150 g × 400 g) ani chybějící gramáž se nespojí', !r.items[1].ean && !r.items[2].ean);
set({ uiCfg: {}, transactions: [], receipts: [{ store: 'BILLA', items: [{ name: 'sušenky polomáčené hořké', ean: POLOM }] }] });
r = nova('PENNY MARKET', 'SUŠENKY POLOM.HOŘKÉ');
t('jiný obchod se nespojí', dopln(r) === 0);
set({ uiCfg: {}, transactions: [], receipts: [{ store: 'PENNY MARKET', items: [{ name: 'sušenky polomáčené hořké', ean: POLOM }, { name: 'sušenky polomáčené hořké', ean: HOUB2 }] }] });
r = nova('PENNY MARKET', 'SUŠENKY POLOM.HOŘKÉ');
t('dva různé kódy → nic (nevíme který)', dopln(r) === 0);
set({ uiCfg: {}, transactions: [], receipts: [{ store: 'PENNY MARKET', items: [{ name: 'sýr eidam', ean: POLOM }] }] });
r = nova('PENNY MARKET', 'sý ei');
t('příliš krátká zkratka (méně než 3 písmena) se nespojí', dopln(r) === 0);
console.log('── AI opíše zkratku doslova ──');
const W = R('worker.js', '../cloudflare-worker/worker.js');
t('prompt účtenky: name doslova, výklad zvlášť ve fullName', /PRAVIDLO 8 – NÁZEV POLOŽKY OPIŠ DOSLOVA/.test(W) && /"fullName":/.test(W) && /NE "sušenky polomáčené hořké"/.test(W));
vm.runInContext(vyrez('rcptKraj').replace(/^/, 'var RCPT_KRAJE = [];\n') + '\n' + vyrez('rcptPobockaNorm'), ctx);
const rr = ctx.rcptPobockaNorm({ items: [{ name: 'SUŠENKY POLOM.HOŘKÉ', fullName: 'sušenky polomáčené hořké' }, { name: 'Banány', fullName: 'banány' }, { name: 'X', fullName: null }] });
t('výklad zkratky se uloží jako nápověda it.nazevAI, název zůstane doslova', rr.items[0].name === 'SUŠENKY POLOM.HOŘKÉ' && rr.items[0].nazevAI === 'sušenky polomáčené hořké' && !('fullName' in rr.items[0]), rr.items[0]);
t('… jen když se od názvu liší', !rr.items[1].nazevAI && !rr.items[2].nazevAI);
vm.runInContext('var lineAmt = it => it.lineTotal != null ? it.lineTotal : it.price * (it.qty || 1);\n' + vyrez('validateReceiptJSON'), ctx);
const vr = ctx.validateReceiptJSON({ store: 'PENNY', total: 39.9, items: [{ name: 'SUŠENKY POLOM.HOŘKÉ', fullName: 'sušenky polomáčené hořké', price: 39.9, qty: 1, lineTotal: 39.9 }] });
t('… a přežije kontrolu odpovědi AI (validateReceiptJSON)', vr.items[0].name === 'SUŠENKY POLOM.HOŘKÉ' && vr.items[0].nazevAI === 'sušenky polomáčené hořké', vr.items[0]);
t('editor ukáže výklad šedě pod názvem („≈ …“)', /≈ \$\{escHtml\(it\.nazevAI\)\}/.test(rc));
t('zařazení do kategorií zkusí i výklad zkratky', /productGroupLookup\(it\.nazevAI\)/.test(R('product-db.js', '../js/product-db.js')) && /it\.nazevAI/.test(R('coicop.js', '../js/coicop.js')));
console.log(`\n${ok} ✓  ${bad} ✗`);
process.exit(bad ? 1 : 0);
