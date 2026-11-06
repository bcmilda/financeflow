// FinanceFlow · smoke_ean_oprava.js
// S28 (v12.21, FIX-499, Milan: „udělal jsem chybu při přiřazování položky k účtence, jak to opravit? V nabídce bylo
// málo účtenek a málo položek… chybí druhá cesta, pokud nepřiřadím k účtence, co potom?“).
// Zelený stav „Přiřazeno“ má ✎ Změnit / ✕ Odebrat, přiřazená položka je ve výběru vždy nahoře (i ze starší účtenky),
// výběr se stránkuje po 12 a nevolný sken ukazuje druhou cestu (Moje výrobky / K vyřízení / přiřadím později).
// Negativní kontrola: na v12.20 test padá.
const fs = require('fs'), path = require('path'), vm = require('vm');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const R = (...c) => fs.readFileSync(najdi(...c), 'utf8');
let ok = 0, bad = 0;
const t = (n, p, x) => { if (p) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n + (x === undefined ? '' : ' → ' + x)); } };
const vyber = (src, n) => { const i = src.indexOf('function ' + n + '('); if (i < 0) return ''; let d = 0, k = src.indexOf('{', i);
  for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) break; } } return src.slice(i, k + 1); };
const E = R('ean-sken.js', '../js/ean-sken.js');
const EAN = '4000539003004';
const rec = [];
for (let k = 0; k < 20; k++) {
  const items = [{ name: 'Rohlík ' + k, lineTotal: 15 }, { name: 'Mléko ' + k, lineTotal: 25 }];
  if (k === 16) items.push({ name: 'Kaiserka natural 55g', lineTotal: 10, ean: EAN });
  rec.push({ store: 'Lidl', date: '2026-10-' + String(28 - k).padStart(2, '0'), items });
}
const el = { innerHTML: '', appendChild() {} }, box = { innerHTML: '', scrollIntoView() {} };
const S = { receipts: rec, transactions: [], uiCfg: {} };
const c = { console, S, getData: () => S, Math, JSON, Object, Array, String, Set, Map, Date,
  document: { getElementById: id => id === 'eanVysledek' ? el : id === 'eanVyber' ? box : null },
  escHtml: s => String(s == null ? '' : s), localStorage: { getItem: () => null, setItem() {} }, _eanStav: { vysledek: { ean: EAN, produkt: {} }, cil: { volne: true } } };
c.window = c; vm.createContext(c);
const lim = (E.match(/^var _eanVyberLimit = \d+;/m) || [''])[0];
t('výběr má stránkovací limit (var _eanVyberLimit = 12)', lim === 'var _eanVyberLimit = 12;');
const pomocne = (E.match(/^function (ean\w+)\(/gm) || []).map(x => x.slice(9, -1)).filter(n => n !== 'eanVyberPolozku');
//  proměnné modulu (bez _eanStav – ten dává test) jako var, aby šly do kontextu
const glob = E.split('\n').filter(l => /^(let|const) (_ean|EAN_)/.test(l) && !/^let _eanStav/.test(l) && /;\s*(\/\/.*)?$/.test(l)).join('\n').replace(/^(let|const) /gm, 'var ');
try { vm.runInContext(glob + '\n' + (lim || 'var _eanVyberLimit = 12;') + '\n' + pomocne.map(n => vyber(E, n)).join('\n') + '\n' + vyber(E, 'eanVyberPolozku'), c); } catch (e) { t('načtení funkcí', false, e.message); }
let h = '';
try { c.eanVyberPolozku(''); h = box.innerHTML; } catch (e) { t('eanVyberPolozku běží', false, e.message); }
console.log('── oprava špatného přiřazení ──');
t('přiřazená položka (Kaiserka, 17. nejnovější účtenka) je nahoře s ✕ Odebrat', /je přiřazený k/.test(h) && /Kaiserka natural 55g[\s\S]*eanOdebratZPolozky\(/.test(h.split('Nejpravděpodobnější')[0]), h.slice(0, 200));
t('… s datem účtenky 12. 10.', /12\. 10\. 2026/.test(h));
console.log('── málo účtenek ──');
t('tlačítko „Zobrazit další účtenky (12 z 20)“', /Zobrazit další účtenky \(12 z 20\)/.test(h));
c._eanVyberLimit = 24; try { c.eanVyberPolozku(''); } catch (e) { console.log('  ! ' + e.message); }
t('po „Zobrazit další“ je vidět všech 20 účtenek a tlačítko zmizí', !/Zobrazit další účtenky/.test(box.innerHTML) && /Rohlík 19/.test(box.innerHTML));
t('vysvětlení, proč má starší účtenka málo položek (zkratka jednou)', /Každá zkratka z obchodu je tu jednou/.test(h));
console.log('── zelený stav a druhá cesta ──');
const P = vyber(E, 'eanPrirazeniHTML');
t('zelený stav „Přiřazeno“ má ✎ Změnit / ✕ Odebrat přiřazení', /Přiřazeno k položce z účtenky[\s\S]*Změnit \/ ✕ Odebrat přiřazení/.test(P));
t('nový nepřiřazený sken: „Nechceš ho teď přiřazovat?“ + Otevřít kartu + přiřadím později', /Nechceš ho teď přiřazovat\?[\s\S]*eanOtevriKartu\([\s\S]*Hotovo, přiřadím později/.test(vyber(E, 'eanVysledekKresli')));
t('znovu otevřený uložený výrobek bez přiřazení: přiřadím později', /přiřadím později/.test(vyber(E, 'eanNalezenZobraz')));
t('po ✕ Odebrat se výběr i stav překreslí', /eanVysledekKresli\(v\.ean, v\.produkt\)[\s\S]*eanVyberPolozku\(/.test(vyber(E, 'eanOdebratZPolozky')));
console.log(`\n${ok} ✓  ${bad} ✗`);
process.exit(bad ? 1 : 0);
