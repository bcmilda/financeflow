// FinanceFlow · smoke_audit_11_16.js
// S28 (v12.38, Milan): audit bod 11 (záloha na daň 23 % nad 3× průměrnou mzdu), bod 16 (komunitní průměr
// na spotřební jednotku OECD z Nastavení → Složení domácnosti + popisek „průměr lidí, kteří za to utrácejí · n z k“),
// bod 23 dokončení (staré uvítací okno a druhá showToast smazané) a /inflace bez cache prohlížeče.
// Negativní kontrola: na v12.37 padá.
const fs = require('fs'), path = require('path'), vm = require('vm');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const R = (...c) => fs.readFileSync(najdi(...c), 'utf8');
let ok = 0, bad = 0;
const t = (n, p, x) => { if (p) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n + (x === undefined ? '' : ' → ' + JSON.stringify(x))); } };
const vyber = (src, n) => { const i = src.indexOf('function ' + n + '('); if (i < 0) return ''; let d = 0, k = src.indexOf('{', i);
  for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) break; } } return src.slice(i, k + 1); };
const blok = (src, z, konec) => { const i = src.indexOf(z); return i < 0 ? '' : src.slice(i, src.indexOf(konec, i) + konec.length); };
const VY = R('vyplatnice.js', '../js/vyplatnice.js'), AD = R('admin.js', '../js/admin.js'), WK = R('worker.js', '../cloudflare-worker/worker.js'),
  UI = R('ui.js', '../js/ui.js'), DU = R('duplicates.js', '../js/duplicates.js'), HT = R('app.html', '../app.html'), PJ = R('projects.js', '../js/projects.js');

console.log('── 11) záloha na daň ze mzdy ──');
const c = { S: { payslipTemplate: { prijmy: [{ key: 'zaklad' }], odvody: [], srazky: [], pripocty: [] } }, Math, Object, Set, String, parseInt, Date };
vm.createContext(c);
vm.runInContext(blok(VY, 'const _ceil', ';') + '\n' + blok(VY, 'const VYPL_RZ_PARAM', '};') + '\n' + ['vyplSablona', '_vyplRzParam', 'vyplDopocet'].map(n => vyber(VY, n)).join('\n'), c);
const v = (kc, m, sl) => c.vyplDopocet({ m: m || '2026-11', prijmy: { zaklad: kc }, odvody: sl ? { slevaZak: sl } : {} });
t('40 000 Kč: 15 % = 6 000 Kč (beze změny)', v(40000).danPred === 6000, v(40000).danPred);
t('146 900 Kč (pod hranicí 146 901): jen 15 % = 22 035 Kč', v(146900).danPred === 22035, v(146900).danPred);
t('200 000 Kč: 15 % z 146 901 + 23 % ze zbytku = 34 248 Kč (dřív 30 000)', v(200000).danPred === 34248, v(200000).danPred);
t('… po slevě na poplatníka 2 570 Kč záloha 31 678 Kč', v(200000, '2026-11', 2570).dan === 31678, v(200000, '2026-11', 2570).dan);
t('hranice podle roku: 2025 = 3 × 46 557 = 139 671 Kč', v(150000, '2025-06').danPred === Math.ceil(139671 * 0.15 + (150000 - 139671) * 0.23 - 1e-9), v(150000, '2025-06').danPred);

console.log('── 16) komunitní průměr ──');
t('příspěvek nese OECD ekvivalent domácnosti z Nastavení (jen číslo 1–10)', /const _eq = \(typeof calcOECD === 'function'\) \? calcOECD\(_settings\?\.household_adults/.test(AD) && /\(_eq >= 1 && _eq <= 10\) \? \{ eq: _eq \}/.test(AD));
t('worker: průměr na spotřební jednotku (avgJ) vedle průměru (avg)', /catSumsJ\[c\] = \(catSumsJ\[c\] \|\| 0\) \+ v \/ eq/.test(WK) && /cats\[c\]\.avgJ = Math\.round\(catSumsJ\[c\] \/ catCountsJ\[c\]\)/.test(WK));
t('Já vs. komunita: průměr přepočtený na TVOU domácnost (avgJ × tvůj OECD)', /const avg = avgJ > 0 \? Math\.round\(avgJ \* _myEq\) : _avgRaw/.test(AD));
t('Já vs. ČSÚ: bar Komunita podle režimu osoba / domácnost', /_csuMode==='osoba' \? _c\.avgJ : _c\.avgJ\*oecd/.test(AD));
t('popisek „průměr lidí, kteří za to utrácejí · n z k“ a „Průměr“ místo nepravdivého „Medián“', (AD.match(/průměr lidí, kteří za to utrácejí · \$\{/g) || []).length >= 2 && /Průměr: \$\{fmtB\(avg\)\}/.test(AD) && !/Medián: \$\{fmtB\(avg\)\}/.test(AD));
const cW = { Math };   // výpočet jako ve workeru, na dvou domácnostech
const lid = [{ cats: { 1: 9000 }, eq: 2.1 }, { cats: { 1: 3000 }, eq: 1 }];
let sJ = 0, nJ = 0; lid.forEach(u => { sJ += u.cats[1] / u.eq; nJ++; });
t('příklad: rodina 9 000 Kč (OECD 2,1) a jednotlivec 3 000 Kč → 3 643 Kč na jednotku, pro rodinu 2,1 = 7 650 Kč', Math.round(sJ / nJ) === 3643 && Math.round(Math.round(sJ / nJ) * 2.1) === 7650);

console.log('── 23) mrtvý kód ──');
t('staré uvítací okno smazané (ui.js funkce i #modalOnboard)', !/function (obFillDefaults|saveOnboarding|skipOnboarding|obSetDebts|obToggleFirstDay)\(/.test(UI) && !/id="modalOnboard"/.test(HT) && /id="modalOnboarding"/.test(HT));
t('showToast už jen v nakup.js', !/function showToast\(/.test(DU));

console.log('── inflace ──');
t('aplikace se ptá workeru bez cache prohlížeče (nová data hned po nasazení)', /fetch\(wu \+ '\/inflace', \{ cache: 'no-cache' \}\)/.test(PJ));
console.log(`\n${ok} ✓  ${bad} ✗`);
process.exit(bad ? 1 : 0);
