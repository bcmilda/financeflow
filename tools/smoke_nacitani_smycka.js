// FinanceFlow · smoke_nacitani_smycka.js
// S29 (v12.46): Vozidla a Energie se načítají z vlastního uzlu. Bez přihlášeného uživatele (nebo bez tokenu)
// loadVozidla / loadMeridla nic nenačtou a nechají _vozidla / _meridla = null. Vykreslení pak volalo načtení
// znovu a znovu – nekonečná smyčka, stránka zamrzla (nalezeno při proklikávání Průvodce v Chromiu; týká se
// i otevření formuláře transakce: tankObnov, merPlatbaObnov). Negativní kontrola: na v12.45 padá (časový limit).
const fs = require('fs'), path = require('path'), vm = require('vm');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const R = (...c) => fs.readFileSync(najdi(...c), 'utf8');
let ok = 0, bad = 0;
const t = (n, p, x) => { if (p) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n + (x === undefined ? '' : ' → ' + JSON.stringify(x))); } };
const vyber = (src, n) => { const i = src.search(new RegExp('(async )?function ' + n + '\\(')); if (i < 0) return ''; let d = 0, k = src.indexOf('{', i);
  for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) break; } } return src.slice(i, k + 1); };
const V = R('vozidla.js', '../js/vozidla.js'), M = R('meridla.js', '../js/meridla.js');
(async () => {
  const zkus = async (nazev, kod, volani) => {
    const c = { console, JSON, Promise, setTimeout, window: { _currentUser: null }, localStorage: { getItem: () => null }, el: { innerHTML: '', style: {} }, n: 0 };
    c.document = { getElementById: () => c.el };
    vm.createContext(c);
    vm.runInContext(kod + `\nthis.go=()=>{${volani}};`, c);
    c.go();
    await new Promise(z => setTimeout(z, 50));   // smyčka by tu proběhla tisíckrát
    t(nazev + ': bez přihlášení jedno načtení, žádná smyčka', c.n <= 2, c.n);
  };
  await zkus('Vozidla (stránka)', 'let _vozidla=null;' + vyber(V, 'loadVozidla').replace('async function loadVozidla(vynutit) {', 'async function loadVozidla(vynutit) { this.n++;') + vyber(V, 'renderVozidlaPage'), 'renderVozidlaPage()');
  await zkus('Energie (stránka)', 'let _meridla=null;' + vyber(M, 'loadMeridla').replace('async function loadMeridla(vynutit) {', 'async function loadMeridla(vynutit) { this.n++;') + vyber(M, 'renderEnergiePage'), 'renderEnergiePage()');
  const tk = /if \(_vozidla === null\) \{ loadVozidla\(\)\.then\(\(\) => \{ if \(_vozidla !== null\) tankObnov\(\); \}\); \}/g;
  t('formulář transakce: ⛽ Tankování (2 místa) se po neúspěšném načtení nevolá znovu', (V.match(tk) || []).length === 2);
  t('formulář transakce: záloha na měřidlo se po neúspěšném načtení nevolá znovu', /loadMeridla\(\)\.then\(\(\) => \{ if \(_meridla !== null\) merPlatbaObnov\(\); \}\)/.test(M));
  console.log(`\n${ok} ✓  ${bad} ✗`);
  process.exit(bad ? 1 : 0);
})();
