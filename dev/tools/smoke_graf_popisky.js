// FinanceFlow · smoke_graf_popisky.js
// FIX-497 (S28, v12.16, Milan: „popis sloupečků se překrývá“ – Energie a voda → Plyn).
//   ffGrafSloupce (vozidla.js, sdílí meridla.js) psal pod každý sloupec „05/25“ – u 12 sloupců
//   na telefonu širší než sloupec. Teď: číslo měsíce, rok jen pod prvním sloupcem a pod lednem
//   (mimo šířku sloupce), menší písmo a mezera u víc sloupců. Rozložení ověřeno v Chromiu (390 px).
const fs = require('fs'), path = require('path'), vm = require('vm');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const VOZ = fs.readFileSync(najdi('vozidla.js', '../js/vozidla.js'), 'utf8');
const MER = fs.readFileSync(najdi('meridla.js', '../js/meridla.js'), 'utf8');
let ok = 0, bad = 0;
const t = (n, c, i) => { if (c) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n + (i === undefined ? '' : ' → ' + String(i).slice(0, 200))); } };
const vyber = n => { const i = VOZ.indexOf('function ' + n + '('); let d = 0; const j = VOZ.indexOf('{', i);
  for (let k = j; k < VOZ.length; k++) { if (VOZ[k] === '{') d++; else if (VOZ[k] === '}') { d--; if (!d) return VOZ.slice(i, k + 1); } } };
const c = { console, String, Math }; vm.createContext(c);
vm.runInContext("const _vozEsc = s => String(s == null ? '' : s);\n" + vyber('ffGrafSloupce'), c);

const mesice = ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
const h = c.ffGrafSloupce(mesice.map((k, i) => ({ mesic: k, a: i + 1 })), {});
const txt = h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
t('žádný popisek „MM/RR“', !/\d\d\/\d\d/.test(h), txt);
t('rok jen 2× – pod prvním sloupcem (’25) a pod lednem (’26)', (h.match(/’\d\d/g) || []).join(',') === '’25,’26', (h.match(/’\d\d/g) || []).join(','));
t('čísla měsíců 10 11 12 1 … 9', txt.replace(/’\d\d/g, '').replace(/\s+/g, ' ').trim() === '10 11 12 1 2 3 4 5 6 7 8 9', txt);
t('rok mimo šířku sloupce (position:absolute)', /position:absolute[^>]*>’25/.test(h));
t('12 sloupců: menší písmo .64rem a mezera 4 px', /font-size:\.64rem/.test(h) && /gap:4px/.test(h));
const h24 = c.ffGrafSloupce(Array.from({ length: 24 }, (_, i) => ({ mesic: `20${24 + Math.floor((i + 9) / 12)}-${String((i + 9) % 12 + 1).padStart(2, '0')}`, a: 1 })), {});
t('24 sloupců: písmo .58rem a mezera 1 px', /font-size:\.58rem/.test(h24) && /gap:1px/.test(h24));
const h3 = c.ffGrafSloupce([{ popis: 'Po', a: 1 }, { popis: 'Út', a: 2 }], {});
t('jiný popisek (bez měsíce) zůstává beze změny', /Po/.test(h3) && /Út/.test(h3) && !/’/.test(h3));
t('Energie a voda (karta i detail) posílají měsíc, ne „MM/RR“', (MER.match(/mesic: k, a, b/g) || []).length === 2 && !/popis: k\.slice\(5\)/.test(MER));
t('Vozidla posílají měsíc, ne „MM/RR“', /mesic: m\.mesic, a: m\.kc/.test(VOZ) && !/popis: m\.mesic\.slice\(5\)/.test(VOZ));

console.log(`\n${ok} ✓  ${bad} ✗`);
process.exit(bad ? 1 : 0);
