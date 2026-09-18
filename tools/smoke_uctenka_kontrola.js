// FinanceFlow · v10.70 · tools/smoke_uctenka_kontrola.js · 2026-09-12
// S22 · Kontrola účtenky hned po skenu (nahlásil Milan na živých datech).
//
// Reprodukuje OBĚ účtenky z hlášení:
//   Kaufland   – analyzér přehlédl slevu „Tvoje cena s −49,90" → 1540,88 vs 1490,99
//   Řeznictví  – SOUČET 122,60 vs CELKEM 123,00 → rozdíl je ZAOKROUHLENÍ, ne chyba
const fs = require('fs'), vm = require('vm');
let fails = 0;
const check = (n,f) => { try{ f(); console.log('  ✅', n); } catch(e){ fails++; console.log('  ❌', n, '→', e.message); } };
const assert = (c,m) => { if(!c) throw new Error(m); };

const src = fs.readFileSync('receipts.js','utf8');

//  Vytáhne funkci párováním závorek (stejný postup jako smoke_sdileni.js).
function vytahni(nazev){
  const i = src.indexOf('function '+nazev);
  assert(i >= 0, 'v receipts.js chybí '+nazev);
  let d = 0;
  for(let k = src.indexOf('{', i); k < src.length; k++){
    if(src[k]==='{') d++;
    else if(src[k]==='}'){ d--; if(!d) return src.slice(i, k+1); }
  }
  throw new Error('nepodařilo se vytáhnout '+nazev);
}
const sb = { console, Math, Number, parseFloat, isFinite };
vm.createContext(sb);
vm.runInContext('const RECEIPT_TOLERANCE = 1;', sb);
vm.runInContext(vytahni('receiptCompleteness'), sb);
const kontrola = (r) => { sb.__r = r; return vm.runInContext('receiptCompleteness(__r)', sb); };

console.log('── Kaufland: neodečtená sleva ──');

//  Součet položek 1540,88 (bez slevy) vs natištěno 1490,99.
const kaufland = {
  printedTotal: 1490.99, total: 1540.88,
  items: [ {lineTotal:1490.98}, {lineTotal:49.90} ],   // 1540,88 dohromady
};

check('rozpor se odhalí',()=>{
  const c = kontrola(kaufland);
  assert(c && c.ok === false, 'kontrola rozpor nenašla');
});
check('rozdíl odpovídá neodečtené slevě 49,90',()=>{
  const c = kontrola(kaufland);
  assert(Math.abs(Math.abs(c.diff) - 49.89) < 0.02, 'rozdíl '+c.diff);
});
check('pozná se, že položky PŘESAHUJÍ účtenku (ne že chybí)',()=>{
  assert(kontrola(kaufland).chybi === false, 'hlásí chybějící položku místo přebytku');
});
check('KLÍČOVÉ · porovnává se proti NATIŠTĚNÉ částce, ne proti průběžnému součtu',()=>{
  //  r.total se mění s každou úpravou položek. Kdyby se porovnával on,
  //  obě čísla by pocházela ze stejného zdroje a nikdy by nenesedla.
  const r = Object.assign({}, kaufland, { total: 1540.88 });
  const c = kontrola(r);
  assert(c.total === 1490.99, 'porovnává se proti '+c.total+' místo 1490.99');
});
check('bez printedTotal se sáhne po total (starší uložené účtenky)',()=>{
  const c = kontrola({ total: 1490.99, items: [{lineTotal:1540.88}] });
  assert(c && c.ok === false, 'stará účtenka se nezkontroluje');
});

console.log('\n── Řeznictví: zaokrouhlení NENÍ chyba ──');

//  SOUČET 122,60 · CELKEM 123,00 · položky 27,60 + 25,00 + 32,70 + 37,30
const reznictvi = {
  printedTotal: 123.00, subtotal: 122.60, total: 123.00,
  items: [ {lineTotal:27.60}, {lineTotal:25.00}, {lineTotal:32.70}, {lineTotal:37.30} ],
};

check('položky sedí na SOUČET → žádné varování',()=>{
  const c = kontrola(reznictvi);
  assert(c && c.ok === true, 'varuje, přestože položky sedí (diff '+(c&&c.diff)+')');
});
check('zaokrouhlení se vyčíslí zvlášť (0,40 Kč)',()=>{
  const c = kontrola(reznictvi);
  assert(Math.abs(c.zaokrouhleni - 0.40) < 0.001, 'zaokrouhlení '+c.zaokrouhleni);
});
check('zaplacená částka zůstává 123,00 (to odešlo z účtu)',()=>{
  assert(kontrola(reznictvi).total === 123.00, 'total '+kontrola(reznictvi).total);
});
check('bez subtotal se porovnává proti total (jednočíselné účtenky)',()=>{
  const c = kontrola({ printedTotal:122.60, total:122.60,
    items:[{lineTotal:27.60},{lineTotal:25.00},{lineTotal:32.70},{lineTotal:37.30}] });
  assert(c.ok === true, 'hlásí rozpor u sedící účtenky');
});

console.log('\n── Meze ──');
check('rozdíl do 1 Kč projde jako zaokrouhlení',()=>{
  assert(kontrola({printedTotal:100, total:100, items:[{lineTotal:99.3}]}).ok === true, 'varuje u 70 haléřů');
});
check('rozdíl nad 1 Kč se ohlásí',()=>{
  assert(kontrola({printedTotal:100, total:100, items:[{lineTotal:97}]}).ok === false, 'mlčí u 3 Kč');
});
check('bez položek nebo bez částky se nekontroluje (není co porovnat)',()=>{
  assert(kontrola({printedTotal:100, total:100, items:[]}) === null, 'kontroluje bez položek');
  assert(kontrola({items:[{lineTotal:50}]}) === null, 'kontroluje bez částky');
});

console.log('\n── Ochrana natištěné částky a výchozí kategorie ──');
check('rpUpdateTotal už nepřepisuje zamčenou částku',()=>{
  assert(/if\(!r\._totalLocked\) r\.total = sum;/.test(src), 'součet položek pořád přebije volbu uživatele');
});
check('natištěná částka se zapamatuje při otevření karty',()=>{
  assert(/r\.printedTotal == null && r\.total != null/.test(src), 'printedTotal se neukládá');
});
check('kontrola se vykreslí hned po skenu, ne až v Historii',()=>{
  assert(/rp_check/.test(src), 'chybí místo pro upozornění v kartě');
  assert(/function rpRenderCheck/.test(src), 'chybí vykreslení kontroly');
  assert(/rpRenderCheck\(\);/.test(src.slice(src.indexOf('function rpUpdateTotal'))), 'kontrola se nepřekresluje');
});
check('částka se nikdy nepřepisuje sama – jen na klik',()=>{
  assert(/function rpUseReceiptTotal/.test(src), 'chybí oprava jedním klikem');
  assert(/appka sama nic nepřepisuje/.test(src), 'uživateli se neřekne, že se nic neděje za jeho zády');
});
check('výchozí kategorie položek je Nákup, ne Ostatní',()=>{
  assert(/catName:\s*'Nákup'/.test(src), 'fallback pořád Ostatní');
  assert(/📦 Nákup<\/option>/.test(src), 'rozbalovátko pořád nabízí Ostatní');
});
check('položky nejdřív zkusí kategorii celé účtenky (ušetří proklikávání)',()=>{
  assert(/if\(receiptCat\)/.test(src), 'nevyužívá kategorii účtenky');
});
check('hlavička se na mobilu zalomí místo mačkání',()=>{
  assert(/flex-wrap:wrap[\s\S]{0,400}rp_date/.test(src), 'datum a kategorie se pořád mačkají');
});

console.log(fails ? `\n❌ SELHALO ${fails}` : '\n✅ KONTROLA ÚČTENKY OVĚŘENA');
process.exit(fails ? 1 : 0);
