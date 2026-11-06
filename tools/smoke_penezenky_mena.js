// FinanceFlow · smoke_penezenky_mena.js
// FIX-495 (S28, v12.14, Milan) – zůstatek peněženky v cizí měně se ukazoval jako koruny.
//   Peněženky → 👛 Moje peněženky: EUR účet s 199,50 € ukazoval „200 Kč“ (fmtB = Kč, celá čísla).
//   Měsíční report → Peněženky: součet sčítal eura s korunami (100 € + 10 000 Kč = „10 100 Kč“),
//   stejně tak AI podklady reportu (penezenkyCelkem, rezervaMesicu).
//   Negativní kontrola: na v12.13 tenhle test padá.
const vm = require('vm'), fs = require('fs'), path = require('path');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const R = (...c) => fs.readFileSync(najdi(...c), 'utf8');
let ok = 0, bad = 0;
const t = (n, c, i) => { if (c) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n + (i === undefined ? '' : ' → ' + JSON.stringify(i))); } };

const PREM = R('premium.js', '../js/premium.js');
const pick = n => {
  let i = PREM.indexOf('\nfunction ' + n + '('); if (i < 0) throw new Error('nenalezeno: ' + n); i++;
  let d = 0; const j = PREM.indexOf('{', i);
  for (let k = j; k < PREM.length; k++) { if (PREM[k] === '{') d++; else if (PREM[k] === '}') { d--; if (!d) return PREM.slice(i, k + 1); } }
};
const lineConst = n => { const m = new RegExp('\\nconst ' + n + ' = [^\\n]*').exec(PREM); if (!m) throw new Error('nenalezeno: ' + n); return m[0].replace('const ', 'var '); };

const cats = [{ id: 'cat1', name: 'Jídlo', type: 'expense', coicop: 1 }, { id: 'cat7', name: 'Výplata', type: 'income' }];
const S = {
  categories: cats, sablony: [], debts: [], wishes: [], receipts: [], uiCfg: {},
  transactions: [
    { id: 1, type: 'income', catId: 'cat7', amount: 40000, date: '2026-10-12', wallet: 'wCZK' },
    { id: 2, type: 'income', catId: 'transfer', category: 'transfer', transferId: 'x', amount: 99.5, date: '2026-10-20', wallet: 'wEUR' },
  ],
  wallets: [
    { id: 'wCZK', name: 'Účet KB', type: 'account', currency: 'CZK', balance: 10000 },
    { id: 'wEUR', name: 'Revolut EUR', type: 'account', currency: 'EUR', balance: 100 },
  ],
};
const el = { walletList: { innerHTML: '' } };
const ctx = {
  console, S, getData: () => S, viewingUid: null,
  localStorage: { getItem: () => null, setItem() {} },
  document: { getElementById: id => el[id] || null, querySelectorAll: () => [], createElement: () => ({ style: {} }), head: { appendChild() {} }, body: { appendChild() {} } },
  fetch: () => Promise.reject(), _FX_RATES: { EUR: 25.3, USD: 23.1 },
  renderTransferDropdowns: () => {}, onPenezenkyRender: undefined,
};
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(R('helpers.js', '../js/helpers.js'), ctx);
vm.runInContext([
  lineConst('WALLET_TYPES'), pick('getWallets'), pick('findWallet'), pick('walletUsageCount'),
  pick('_txVytvorenoMs'), pick('_walletTxPoStavu'), pick('_walletTxZnak'), pick('computeWalletBalance'),
  pick('toCZK'), pick('renderWalletList'),
].join('\n'), ctx);

console.log('── FIX-495 · Peněženky → 👛 Moje peněženky ──');
vm.runInContext('renderWalletList()', ctx);
const h = el.walletList.innerHTML.replace(/\s+/g, ' ');
t('EUR účet: zůstatek v eurech s desetinami (199,50 €)', /199,50\s€/.test(h), (h.match(/Revolut EUR[\s\S]{0,700}/) || [''])[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 160));
t('EUR účet: nikde „200 Kč“ ani „199,50 Kč“', !/200\sKč|199,50\sKč/.test(h));
t('EUR účet: pod zůstatkem ≈ v Kč (5 047 Kč)', /≈ 5\s047\sKč/.test(h));
t('Kč účet beze změny: 50 000 Kč a pod ním CZK', /50\s000\sKč/.test(h) && />CZK</.test(h));

console.log('── FIX-495 · Měsíční report → Peněženky ──');
const P = R('projects.js', '../js/projects.js');
vm.runInContext(P.slice(P.indexOf('const REPORT_KARTY = ['), P.indexOf('function renderReport() {')).replace(/const (REPORT_\w+) =/g, 'var $1 ='), ctx);
vm.runInContext(R('report-mesicni.js', '../js/report-mesicni.js'), ctx);
const rd = ctx.mesReportData(S, 9, 2026);
t('report zná měnu peněženky a hodnotu v Kč', rd.penezenky.length === 2 && rd.penezenky.some(w => w.cur === 'EUR' && Math.abs(w.bk - 199.5 * 25.3) < 0.01), rd.penezenky);
const ai = ctx.mesReportAIPodklady(rd);
t('AI podklady: peněženky celkem v Kč (50 000 + 5 047 = 55 047)', ai.penezenkyCelkem === 55047, ai.penezenkyCelkem);
const html = ctx.mesReportHTML(rd, false).replace(/\s+/g, ' ');
const blok = (html.match(/<h2>Peněženky<\/h2>[\s\S]*?<\/ul>/) || [''])[0];
t('report: součet peněženek 55 047 Kč (ne 50 199,5)', /55\s047\sKč/.test(blok), blok.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
t('report: řádek EUR účtu v eurech (199,50 €)', /Revolut EUR<\/span><b>199,50\s€/.test(blok), blok.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
t('report: bez undefined / NaN', !/undefined|NaN/.test(blok));

console.log(`\n${ok} ✓  ${bad} ✗`);
process.exit(bad ? 1 : 0);
