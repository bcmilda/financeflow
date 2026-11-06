// FinanceFlow · smoke_budouci_vyskyty.js
// FIX-498 (S28, v12.18, Milan: „Jak to myslíš, že budoucí platby nefungují? Proč tam je taková chyba? Oprav ji.“)
//   budouciGetOccurrences – měsíční platba od v6.49 vždy vynechala nejbližší výskyt (počítadlo měsíce
//   o jeden napřed) a den 31 v kratším měsíci přetekl do dalšího měsíce. Generátor neměl žádný test
//   (smoke_budouci.js testuje jen „zaplaceno“), proto chyba přežila půl roku.
//   Negativní kontrola: na v12.17 test padá.
const fs = require('fs'), path = require('path'), vm = require('vm');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const src = fs.readFileSync(najdi('budouci.js', '../js/budouci.js'), 'utf8');
const i = src.indexOf('function budouciGetOccurrences'); let d = 0, k = src.indexOf('{', i);
for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) break; } }
const c = { Date, Math }; vm.createContext(c); vm.runInContext(src.slice(i, k + 1), c);
let ok = 0, bad = 0;
const t = (n, p, x) => { if (p) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n + (x === undefined ? '' : ' → ' + x)); } };
const iso = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
const vy = (dnes, den, dni) => { const od = new Date(dnes + 'T12:00:00'); return c.budouciGetOccurrences('monthly', den, od, new Date(od.getTime() + dni * 864e5)).map(iso); };

console.log('── měsíční platba: nejbližší výskyt ──');
let r = vy('2026-10-28', 15, 100);
t('28. 10., den 15 → první 15. 11. (dřív 15. 12.)', r[0] === '2026-11-15', r.join(', '));
t('… a dál 15. 12., 15. 1. (bez mezer)', r.slice(0, 3).join(',') === '2026-11-15,2026-12-15,2027-01-15', r.join(', '));
r = vy('2026-10-10', 15, 60);
t('10. 10., den 15 → první 15. 10. (dřív 15. 11.)', r[0] === '2026-10-15', r.join(', '));
r = vy('2026-10-15', 15, 40);
t('v den platby: dnešek se nebere (jako dřív), první 15. 11.', r[0] === '2026-11-15', r.join(', '));
r = vy('2026-12-20', 5, 50);
t('přes konec roku: 20. 12., den 5 → 5. 1. 2027', r[0] === '2027-01-05', r.join(', '));
console.log('── den 29.–31. v kratším měsíci ──');
r = vy('2026-10-31', 31, 130);
t('den 31: 30. 11., 31. 12., 31. 1., 28. 2. (žádný měsíc nechybí ani dvakrát)', r.slice(0, 4).join(',') === '2026-11-30,2026-12-31,2027-01-31,2027-02-28', r.join(', '));
r = vy('2028-01-31', 30, 40);
t('den 30 v přestupném únoru = 29. 2.', r[0] === '2028-02-29', r.join(', '));
console.log('── horizont ──');
r = vy('2026-10-28', 15, 30);
t('horizont 30 dní: jen 15. 11.', r.join(',') === '2026-11-15', r.join(', '));
t('každý měsíc nejvýš jednou za 2 roky', (() => { const x = vy('2026-01-01', 31, 730); return new Set(x.map(s => s.slice(0, 7))).size === x.length && x.length === 24; })());

console.log(`\n${ok} ✓  ${bad} ✗`);
process.exit(bad ? 1 : 0);
