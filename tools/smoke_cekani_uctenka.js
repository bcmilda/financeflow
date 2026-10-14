// smoke_cekani_uctenka.js — během analýzy účtenky čekací okno: přesýpací hodiny, kroky,
// nedá se klikat pod něj, Zpět ho nezavře, jedna analýza naráz, okno zmizí i po chybě.
const fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const h = R('helpers.js'), rc = R('receipts.js');
let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log('  ✅', n)) : (fail++, console.log('  ❌', n)); };
const telo = (src, jm) => { const i = src.indexOf('async function ' + jm + '('); let d = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } } return ''; };
console.log('smoke_cekani_uctenka.js');

ok('helpers: čekací okno (start / krok / konec / běží)', ['ffCekaniStart', 'ffCekaniKrok', 'ffCekaniKonec', 'ffCekaniBezi'].every(f => new RegExp('function ' + f + '\\(').test(h)));
ok('okno je přes celou obrazovku a nad vším', /#ffCekani\{position:fixed;inset:0;z-index:12000/.test(h));
ok('okno pohltí kliknutí a posun pod sebou', /\['click', 'pointerdown', 'touchstart', 'wheel'\]\.forEach/.test(h) && /touch-action:none/.test(h));
ok('přesýpací hodiny se otáčejí (a respektují omezení animací)', /ffc-hodiny/.test(h) && /prefers-reduced-motion/.test(h));
ok('ukazuje uběhlý čas a orientační průběh (max 90 % do konce)', /ffc-cas-ted/.test(h) && /Math\.min\(90,/.test(h));
ok('Zrušit se nabídne až po 20 s', /_ffCek\.zrusit && s >= 20/.test(h));
ok('tlačítko Zpět na telefonu okno nezavře', /ffCekaniBezi\(\)\) \{\s*if \(typeof showToast === 'function'\) showToast\('⏳ Počkej prosím, analýza ještě běží'\);/.test(h));

for (const [jm, vnitrni] of [['analyzeReceipt', '_analyzeReceipt'], ['analyzeMultiReceipt', '_analyzeMultiReceipt']]) {
  const obal = telo(rc, jm), t = telo(rc, vnitrni);
  ok(`${jm}: jedna analýza naráz (pojistka hned na začátku)`, /if\(_rpAnalyzaBezi\) return;[^\n]*\n\s*_rpAnalyzaBezi = true;/.test(obal) && /finally \{ _rpAnalyzaBezi = false; \}/.test(obal));
  ok(`${jm}: otevře čekací okno s kroky`, /ffCekaniStart\(/.test(t) && /AI čte obchod, položky a ceny/.test(t));
  ok(`${jm}: Zrušit opravdu zastaví dotaz`, /zrusit: \(\) => \{ zruseno = true; ctrl\.abort\(\); \}/.test(t));
  ok(`${jm}: okno zmizí vždy (finally – i po chybě)`, /\} finally \{[\s\S]{0,120}ffCekaniKonec\(\)/.test(t));
  ok(`${jm}: zrušení ≠ chyba (vlastní hláška)`, /Analýza zrušena\./.test(t));
  ok(`${jm}: chybová zpráva escapovaná`, /\$\{escHtml\(e\.message\)\}/.test(t));
}
console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail ? 1 : 0);
