// FinanceFlow · smoke_audit_57913.js
// S28 (v12.36, audit body 5, 7, 9, 13 – Milan: „souhlasím s opravama“):
//  9) základ příjmu bez vyrovnání, rodičů rozdělených plateb a přesunů,
//  7) Měsíční report: šablony podle frekvence a první splatnosti, částka podle rozpisu záloh,
//  5) odhad výdajů: posledních 12 dokončených měsíců, dělí se sledovanými měsíci,
// 13) osobní inflace se srovnává s průměrnou roční mírou ČSÚ.
// Negativní kontrola: na v12.35 padá.
const fs = require('fs'), path = require('path'), vm = require('vm');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const R = (...c) => fs.readFileSync(najdi(...c), 'utf8');
let ok = 0, bad = 0;
const t = (n, p, x) => { if (p) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n + (x === undefined ? '' : ' → ' + JSON.stringify(x))); } };
const vyber = (src, n) => { const i = src.indexOf('function ' + n + '('); if (i < 0) return ''; let d = 0, k = src.indexOf('{', i);
  for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) break; } } return src.slice(i, k + 1); };
const radek = (src, z) => { const i = src.indexOf(z); return i < 0 ? '' : src.slice(i, src.indexOf('\n', i)); };
const H = R('helpers.js', '../js/helpers.js'), PJ = R('projects.js', '../js/projects.js'), RM = R('report-mesicni.js', '../js/report-mesicni.js'),
  PR = R('pristi.js', '../js/pristi.js'), IN = R('inflace.js', '../js/inflace.js'), WK = R('worker.js', '../cloudflare-worker/worker.js');

console.log('── 9) základ příjmu ──');
const c9 = { S: { curMonth: 10, curYear: 2026 }, Math, window: {} };
c9.txCZK = x => x.amount; c9.getData = () => c9.D;
c9.getTx = (m, y, D) => (D.transactions || []).filter(x => { const d = new Date(x.date); return d.getMonth() === m && d.getFullYear() === y; });
c9.incSum = (txs) => txs.filter(x => x.type === 'income' && !x.isBalancing && !x.splitParent && !c9.isTransferTx(x)).reduce((a, x) => a + x.amount, 0);
vm.createContext(c9);
vm.runInContext(radek(H, 'const isTransferTx=') + '\nthis.isTransferTx=isTransferTx;\n' + vyber(PJ, 'catVahaPrijmu') + '\n' + vyber(PJ, 'computeBaseIncome'), c9);
const vypl = m => ({ type: 'income', catId: 'vyp', amount: 40000, date: `2026-${m}-10` });
c9.D = { categories: [{ id: 'vyp', type: 'income', stabilityWeight: 1 }], transactions: [vypl('08'), vypl('09'), vypl('10'),
  { type: 'income', catId: 'vyp', amount: 30000, date: '2026-09-20', isBalancing: true },
  { type: 'income', catId: 'vyp', amount: 9000, date: '2026-10-25', splitId: 's', splitParent: true },
  { type: 'income', catId: 'vyp', amount: 5000, date: '2026-10-25', transferId: 'tr1' }] };
const zaklad = c9.computeBaseIncome(c9.D, 10, 2026);
t('výplata 3 × 40 000 + vyrovnání 30 000 + rodič splitu + přesun → základ 40 000 Kč (dřív 54 667)', zaklad === 40000, zaklad);

console.log('── 5) odhad výdajů ──');
const c5 = { S: { curMonth: 10, curYear: 2026 }, Math, window: { _transferCatIds: new Set() }, isTransferTx: () => false, txCZK: x => x.amount,
  SEASON: Array.from({ length: 12 }, (_, m) => ({ mult: m === 10 ? 1.12 : 1 })), ffDnes: () => '2026-11-06' };
c5.getCat = (id, cats) => (cats || []).find(x => x.id === id) || {};
c5.getActual = () => 0;
vm.createContext(c5);
vm.runInContext(vyber(H, 'getHistAvg') + '\n' + vyber(H, 'predictCat'), c5);
const tx = (cat, kc, d, o) => Object.assign({ type: 'expense', catId: cat, amount: kc, date: d }, o);
const bezne = []; for (let m = 1; m <= 10; m++) bezne.push(tx('jidlo', 6000, `2026-${String(m).padStart(2, '0')}-15`));
bezne.push(tx('jidlo', 6000, '2025-11-15'), tx('jidlo', 6000, '2025-12-15'), tx('jidlo', 900, '2026-11-03'));
const D5 = { categories: [{ id: 'poj', name: 'Pojištění' }, { id: 'lek', name: 'Zdraví' }, { id: 'el', name: 'Elektronika' }, { id: 'jidlo', name: 'Jídlo' }, { id: 'kr', name: 'Kroužky' }],
  birthdays: [], transactions: bezne.concat([tx('poj', 12000, '2025-03-10', { name: 'Pojistka' }), tx('poj', 12000, '2026-03-10', { name: 'Pojistka' }),
    tx('lek', 500, '2025-08-01'), tx('lek', 500, '2026-02-01'), tx('lek', 500, '2026-05-01'), tx('lek', 500, '2026-09-01'),
    tx('el', 15000, '2024-10-01'), tx('kr', 1500, '2026-09-05'), tx('kr', 1500, '2026-10-05')]) };
const p = id => c5.predictCat(id, null, 10, 2026, D5);
t('roční pojistka 12 000 Kč v březnu → listopad 1 120 Kč (1 000 × sezóna 1,12; dřív 13 440)', p('poj') === 1120, p('poj'));
t('lékař 500 Kč 3× ročně → 140 Kč (125 × 1,12; dřív 560)', p('lek') === 140, p('lek'));
t('televize před dvěma lety → 0 (dřív 16 800 každý měsíc)', p('el') === 0, p('el'));
t('pravidelný výdaj 6 000 Kč měsíčně zůstává 6 000 (× 1,12), běžící listopad (900 Kč za 6 dní) se nepočítá', p('jidlo') === 6720, p('jidlo'));
t('nová kategorie s pravidelnou platbou (2 měsíce) se nepodhodnotí: 1 500 × 1,12', p('kr') === 1680, p('kr'));
t('volající může platby vynechat (Příští měsíc: čtvrtletní a roční šablony)', c5.predictCat('poj', null, 10, 2026, D5, undefined, { vynechat: x => x.name === 'Pojistka' }) === 0);
t('Příští měsíc: platby čtvrtletních / ročních šablon mimo odhad a neodečítají se od něj',
  /vynechat: t => _neMesNazvy\.has/.test(PR) && /exp\.filter\(r => !r\.neMes\)/.test(PR) && /_pristiNeMes\(sb\)\) row\.neMes = true/.test(PR));

console.log('── 7) Měsíční report a šablony ──');
const md = vyber(RM, 'mesReportData');
t('příští měsíc: všechny frekvence přes budouciGetOccurrences s první splatností (dřív jen měsíční)', /budouciGetOccurrences\(f, s\.den \|\| 1, new Date\(od\.getTime\(\) - 86400000\), dO, s\.prvni\)/.test(md)
  && !/sab\.filter\(s => \(s\.freq \|\| 'monthly'\) === 'monthly'\)\.map/.test(md));
t('částka podle rozpisu záloh platného v den platby (sablonaCastka)', /sablonaCastka\(s, _iso\(d\)\)/.test(md) && /_kc\(s, d\)/.test(md) && /_kc\(s, _konecM\)/.test(md));
t('výhled výdajů: + čtvrtletní / roční / jednorázové platby příštího měsíce, bez nich v průměru', /fcV = \(_vydB \+ _avgVB \* 2\) \/ 3 \+ vNeMes/.test(md) && /_bezNeMes\(tx\)/.test(md));
t('výhled příjmů: čtvrtletní / roční příjem ze šablony navíc (mimo strop měsíčních)', /\+ sabPrijJine/.test(md) && /pJine: sabPrijJine, vNeMes/.test(md));
t('„Z čeho odhad vychází“ ukáže čtvrtletní a roční platby zvlášť', /Čtvrtletní, roční a jednorázové platby/.test(RM));

console.log('── 13) inflace ──');
const cW = { Math, Object, String, Number }; vm.createContext(cW); vm.runInContext(vyber(WK, 'csuPrumerRocni'), cW);
const mes = []; for (let k = 23; k >= 0; k--) { const d = new Date(2026, 8 - k, 1); mes.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); }
const body = mes.map((o, i) => ({ obd: o, kod: '0', mira: 1.5 + i * 0.05, raw: 1.5 + i * 0.05 }));
const pr = cW.csuPrumerRocni(body)['0'];
const ocek = Math.round(body.slice(-12).reduce((a, b) => a + b.raw, 0) / 12 * 10) / 10;
t('worker: průměrná roční míra = průměr 12 meziročních měr, 13 bodů z 24 měsíců', pr.length === 13 && pr[12].obd === '2026-09' && pr[12].mira === ocek, pr && pr.slice(-2));
t('… při rostoucí inflaci je nižší než meziroční (proto se nesmí míchat)', pr[12].mira < body[23].mira);
t('worker vrací prumerRocni, radaPrumer, oddilyPrumer (nová cache inflace-v6)', /prumerRocni:/.test(WK) && /radaPrumer, oddilyPrumer/.test(WK) && /inflace-v6/.test(WK));
const karta = vyber(IN, '_inflOficialniCard');
t('karta srovnává s průměrnou roční mírou, bez ní meziroční jen orientačně', /const rada = _pr \|\| S\.cnbInflaceRada/.test(karta) && /orientačně – oficiální číslo je meziroční/.test(karta));
t('popis tvé inflace odpovídá výpočtu (12 měsíců proti předchozím 12)', /stejná metoda jako průměrná roční míra/.test(karta) && !/meziroční inflace porovnává stejný nákup dnes a před rokem/.test(IN));
const cO = { S: { cnbInflace: 2.5, cnbInflacePrumer: 2.0, cnbInflaceObd: '2026-09' }, OBRAZ_INFLACE_FIX: 3, OBRAZ_INFLACE_MIN_POLOZEK: 5 };
vm.createContext(cO); vm.runInContext(vyber(PJ, 'obrazInflaceRef'), cO);
const ref = cO.obrazInflaceRef();
t('Finanční obraz bere průměrnou roční míru (stejná metoda jako osobní), ne meziroční', ref.hodnota === 2.0 && /průměrná roční/.test(ref.popis), ref);
console.log(`\n${ok} ✓  ${bad} ✗`);
process.exit(bad ? 1 : 0);
