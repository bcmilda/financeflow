// FinanceFlow · smoke_sablony_prvni.js
// S28 (v12.19, Milan: „u čtvrtletní, roční atd. je jen den v měsíci, což stačí u měsíčního, ale ne pro delší
// horizont – bude třeba zapsat první den platby (splatnost)“). Šablona má s.prvni, výskyty se počítají od ní
// v Budoucích platbách (+ Radar, Kalkulačky), v Příštím měsíci i v „Příště:“ v seznamu šablon.
// Negativní kontrola: na v12.18 test padá (roční platba se počítala od dnešního měsíce).
const fs = require('fs'), path = require('path'), vm = require('vm');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const R = (...c) => fs.readFileSync(najdi(...c), 'utf8');
let ok = 0, bad = 0;
const t = (n, p, x) => { if (p) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n + (x === undefined ? '' : ' → ' + x)); } };
const vyber = (src, n) => { const i = src.indexOf('function ' + n + '('); if (i < 0) return ''; let d = 0, k = src.indexOf('{', i);
  for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) break; } } return src.slice(i, k + 1); };
const P = R('premium.js', '../js/premium.js'), B = R('budouci.js', '../js/budouci.js'), PR = R('pristi.js', '../js/pristi.js');
const c = { Date, Math, String, window: {} }; vm.createContext(c);
const kotva = (P.match(/const SABLONA_KOTVA = [^\n]*/) || [''])[0].replace('const ', 'var ');
vm.runInContext(kotva + '\n' + vyber(P, 'ffKotvaVyskyty') + '\n' + B.split('\n').filter(l => /^const _b(Iso|Den) =/.test(l)).join('\n').replace(/^const /gm, 'var ')
  + '\n' + vyber(B, 'budouciGetOccurrences') + '\n' + vyber(PR, 'pristiOccurrences'), c);
const iso = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
t('ffKotvaVyskyty existuje', typeof c.ffKotvaVyskyty === 'function');
if (typeof c.ffKotvaVyskyty !== 'function') { console.log(`\n${ok} ✓  ${bad} ✗`); process.exit(1); }

console.log('── výpočet od první splatnosti ──');
t('ročně od 15. 3. 2025: další 15. 3. 2027 (po 28. 10. 2026)', c.ffKotvaVyskyty('yearly', '2025-03-15', '2026-10-28', '2027-12-31').join(',') === '2027-03-15');
t('čtvrtletně od 10. 1. 2026: 10. 1. 2027, 10. 4. 2027', c.ffKotvaVyskyty('quarterly', '2026-01-10', '2026-10-28', '2027-05-01').join(',') === '2027-01-10,2027-04-10', c.ffKotvaVyskyty('quarterly', '2026-01-10', '2026-10-28', '2027-05-01').join(','));
t('čtvrtletně od 31. 8.: 30. 11., 28. 2., 31. 5. (konec měsíce)', c.ffKotvaVyskyty('quarterly', '2026-08-31', '2026-10-28', '2027-06-30').join(',') === '2026-11-30,2027-02-28,2027-05-31');
t('týdně od pondělí 5. 10. 2026: 2. 11., 9. 11.', c.ffKotvaVyskyty('weekly', '2026-10-05', '2026-10-28', '2026-11-10').join(',') === '2026-11-02,2026-11-09');
t('každé 2 týdny od 5. 10.: 2. 11., 16. 11.', c.ffKotvaVyskyty('biweekly', '2026-10-05', '2026-10-28', '2026-11-20').join(',') === '2026-11-02,2026-11-16');
t('první splatnost v budoucnu: první výskyt = ona', c.ffKotvaVyskyty('yearly', '2027-01-20', '2026-10-28', '2027-12-31')[0] === '2027-01-20');
t('týdně od roku 2015 (dlouhá historie) – nic nechybí', c.ffKotvaVyskyty('weekly', '2015-01-05', '2026-10-28', '2026-11-30').length === 5);

console.log('── Budoucí platby a Příští měsíc ──');
const dnes = new Date(2026, 9, 28), za1 = new Date(2027, 9, 28);
t('Budoucí platby: roční pojistka s 1. splatností 15. 3. → 15. 3. 2027 (dřív 28. 10. 2027 „za rok od dneška“)',
  c.budouciGetOccurrences('yearly', 15, dnes, za1, '2025-03-15').map(iso).join(',') === '2027-03-15', c.budouciGetOccurrences('yearly', 15, dnes, za1, '2025-03-15').map(iso).join(','));
t('Budoucí platby: bez první splatnosti beze změny (stará šablona: od dnešního měsíce + rok = 15. 10. 2027)', c.budouciGetOccurrences('yearly', 15, dnes, za1).map(iso).join(',') === '2027-10-15', c.budouciGetOccurrences('yearly', 15, dnes, za1).map(iso).join(','));
const pm = c.pristiOccurrences('quarterly', 10, new Date(2027, 0, 1), new Date(2027, 0, 31), { prvni: '2026-01-10' });
t('Příští měsíc (leden 2027): čtvrtletní od 10. 1. 2026 → 10. 1. 2027', pm.map(iso).join(',') === '2027-01-10', pm.map(iso).join(','));
const pm2 = c.pristiOccurrences('quarterly', 10, new Date(2026, 11, 1), new Date(2026, 11, 31), { prvni: '2026-01-10' });
t('Příští měsíc (prosinec 2026): čtvrtletní od 10. 1. → nic', pm2.length === 0, pm2.map(iso).join(','));

console.log('── formulář a seznam ──');
const A = R('app.html', '../app.html');
t('formulář má pole První platba (splatnost)', /id="sablonaPrvni"/.test(A));
t('uložení vyžaduje první splatnost u čtvrtletní / roční / týdenní', /includes\(_freq\) && !_prvni/.test(P));
t('seznam šablon: bez první splatnosti upozornění „doplň datum první platby“', /doplň datum první platby/.test(P));
t('formulář říká, že automaticky se zapisují jen měsíční a jednorázové', /Automaticky se do transakcí zatím zapisují jen měsíční a jednorázové/.test(A));

console.log(`\n${ok} ✓  ${bad} ✗`);
process.exit(bad ? 1 : 0);
