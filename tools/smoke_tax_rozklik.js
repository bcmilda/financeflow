// FinanceFlow · smoke_tax_rozklik.js
// S28 (v12.19, TODO-372): Analýza účtenek → 📊 Statistiky → 🧭 Za co utrácíš → klepnutí na podkategorii
// = útrata po měsících (12 měsíců končících vybraným měsícem). Hotovo, když: součet měsíců = částka
// karty „Vše“ za stejné období (stejné zařazení), Ø od první položky, přechod přes rok, cache zařazení.
// Negativní kontrola: na v12.18 test padá (funkce neexistují).
const fs = require('fs'), path = require('path'), vm = require('vm');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const RC = fs.readFileSync(najdi('receipts.js', '../js/receipts.js'), 'utf8');
let ok = 0, bad = 0;
const t = (n, p, x) => { if (p) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n + (x === undefined ? '' : ' → ' + JSON.stringify(x).slice(0, 240))); } };
const vyber = n => { const i = RC.indexOf('function ' + n + '('); if (i < 0) return ''; let d = 0, k = RC.indexOf('{', i);
  for (; k < RC.length; k++) { if (RC[k] === '{') d++; else if (RC[k] === '}') { d--; if (!d) break; } } return RC.slice(i, k + 1); };
const TAX = { 'rohlík': { podId: 'pecivo', podNazev: 'Pečivo', nazev: 'Rohlík', oblastId: 'jidlo', oblastNazev: 'Jídlo', ikona: '🥖' },
  'chléb': { podId: 'pecivo', podNazev: 'Pečivo', nazev: 'Chléb', oblastId: 'jidlo', oblastNazev: 'Jídlo', ikona: '🥖' },
  jablka: { podId: 'ovoce', podNazev: 'Ovoce', nazev: 'Jablka', oblastId: 'jidlo', oblastNazev: 'Jídlo', ikona: '🍎' } };
const c = { Math, String, Object, Set, Number, parseFloat, Array, getData: () => ({}), window: {}, volani: 0 };
c.rpMapaNavrh = n => { c.volani++; const k = Object.keys(TAX).find(x => String(n).toLowerCase().includes(x)); return k ? { tax: TAX[k] } : null; };
vm.createContext(c);
const sety = ['taxUtrataPodkategorie', 'taxUtrataPoMesicich', 'taxUtrataRada'].map(vyber);
t('funkce rozkliku existují', sety.every(Boolean));
if (!sety.every(Boolean)) { console.log(`\n${ok} ✓  ${bad} ✗`); process.exit(1); }
vm.runInContext("var _taxMesCache = { klic: '', data: null }; var _taxYm = (y, m) => y + '-' + String(m + 1).padStart(2, '0');\n" + sety.join('\n'), c);

const it = (name, date, kc) => ({ name, date, lineTotal: kc });
const items = [
  it('Rohlík tuk.', '2025-09-12', 30),   // mimo okno (13 měsíců zpět)
  it('Rohlík tuk.', '2025-11-03', 40), it('Chléb Šumava', '2025-11-20', 35),
  it('Rohlík tuk.', '2026-01-05', 20), it('Jablka', '2026-01-05', 50),
  it('Rohlík tuk.', '2026-10-02', 25), it('Chléb Šumava', '2026-10-15', 38), it('Rohlík tuk.', '2026-10-20', 12),
  it('Neznámá věc', '2026-10-20', 99),
];
const data = c.taxUtrataPoMesicich(items, {});
const r = c.taxUtrataRada('pecivo', data, 2026, 9);   // vybraný měsíc říjen 2026
t('12 měsíců listopad 2025 – říjen 2026', r.rada.length === 12 && r.rada[0].ym === '2025-11' && r.rada[11].ym === '2026-10', r.rada.map(x => x.ym));
t('říjen 2026 = 25 + 38 + 12 = 75 Kč', r.rada[11].kc === 75, r.rada[11]);
t('listopad 2025 = 75 Kč, leden 2026 = 20 Kč (jablka do Pečiva nepatří)', r.rada[0].kc === 75 && r.rada[2].kc === 20);
const vOkne = items.filter(x => x.date >= '2025-11-01' && x.date <= '2026-10-31');
const vse = c.taxUtrataPodkategorie(vOkne, {}).pods.find(p => p.podId === 'pecivo');
t('součet 12 měsíců = částka „Vše“ za stejné období (170 Kč)', Math.abs(r.rada.reduce((a, x) => a + x.kc, 0) - vse.castka) < 0.001 && vse.castka === 170, [r.rada.reduce((a, x) => a + x.kc, 0), vse.castka]);
t('Ø za 12 měsíců (první položka 09/2025 je před oknem → všech 12) = 170 / 12', Math.abs(r.prumer - 170 / 12) < 1e-9 && r.mesicu === 12, r.prumer);
const r2 = c.taxUtrataRada('pecivo', c.taxUtrataPoMesicich(items.slice(3), {}), 2026, 9);
t('kratší historie (od 01/2026): Ø jen z 10 měsíců od první položky', r2.mesicu === 10 && Math.abs(r2.prumer - 95 / 10) < 1e-9, [r2.mesicu, r2.prumer]);
t('top názvy v měsíci: Chléb 38, Rohlík 37', JSON.stringify(Object.entries(r.rada[11].obec).sort((a, b) => b[1] - a[1])) === '[["Chléb",38],["Rohlík",37]]', r.rada[11].obec);
c.taxUtrataPoMesicich(items, {}); const pred = c.volani; c.taxUtrataPoMesicich(items.slice(), {});
t('zařazení se podruhé nepočítá (cache), dokud se položky nezmění', c.volani === pred);
c.taxUtrataPoMesicich(items.concat([it('Rohlík', '2026-10-28', 5)]), {});
t('… a po změně položek se přepočítá', c.volani > pred);
const r3 = c.taxUtrataRada('pecivo', data, 2026, 0);
t('vybraný leden 2026: okno únor 2025 – leden 2026 (přes rok)', r3.rada[0].ym === '2025-02' && r3.rada[11].ym === '2026-01');
t('karta: řádek je klepací, otevřený jen jeden, odkaz do Statistiky položek', /onclick="taxUtrataRozbal\(/.test(RC) && /_taxUtrOtev = _taxUtrOtev === podId \? null : podId/.test(RC) && /taxUtrataDoStatistiky\(/.test(RC));
t('graf: osa, mřížka, Ø čára, hodnota klepnutím', /Ø \$\{kc\(prumer\)\}\/měs/.test(RC) && /stroke-dasharray="4 3"/.test(RC) && /onclick="taxUtrataSloupec\(/.test(RC) && /const mrizka = /.test(RC));

console.log(`\n${ok} ✓  ${bad} ✗`);
process.exit(bad ? 1 : 0);
