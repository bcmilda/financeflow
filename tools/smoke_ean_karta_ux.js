// smoke_ean_karta_ux.js — karta výrobku: návrh názvu ze zkratky na účtence, výrazné pole
// „Český název výrobku“, přiřazený výrobek ukazuje ✓ místo tlačítka Přiřadit.
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const e = R('ean-sken.js');
let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log('  ✅', n)) : (fail++, console.log('  ❌', n)); };
console.log('smoke_ean_karta_ux.js');
const sb = { normQty: null }; vm.createContext(sb);
vm.runInContext(R('helpers.js').match(/const NORM_JEDNOTKY_RE[\s\S]*?\nfunction normQty[\s\S]*?\n}\n/)[0], sb);
const vyrez = n => { const i = e.indexOf('function ' + n + '('); let d = 0, j = e.indexOf('{', i); for (let k = j; k < e.length; k++) { if (e[k] === '{') d++; else if (e[k] === '}') { d--; if (!d) return e.slice(i, k + 1); } } };
vm.runInContext(vyrez('eanNavrhZUctenky') + '\n' + vyrez('eanBaleniZUctenky'), sb);
const N = t => vm.runInContext('eanNavrhZUctenky', sb)(t), B = t => vm.runInContext('eanBaleniZUctenky', sb)(t);
ok('návrh: „Smet.jogurt bílý 1kg KK“ → bez gramáže, mezera za tečkou', N('Smet.jogurt bílý 1kg KK') === 'Smet. jogurt bílý KK');
ok('návrh: VELKÁ PÍSMENA → normální', N('KOSTICI BARVICI 109G') === 'Kostici barvici');
ok('balení ze zkratky: 1kg → 1000 g, 109G → 109 g', B('Smet.jogurt bílý 1kg KK') === '1000 g' && B('KOSTICI BARVICI 109G') === '109 g');
ok('formulář karty: předvyplní návrh z účtenky, když jiný název není', /const navrh = !moje && !nalez && zUct\.length \? eanNavrhZUctenky\(zUct\[0\]\) : ''/.test(e) && /\|\| navrh\)\}">/.test(e));
ok('chybí český název → výrazné pole „🇨🇿 Český název výrobku (opiš z obalu)“ + Uložit', /🇨🇿 Český název výrobku/.test(e) && /eanNazevRychle\('\$\{escHtml\(ean\)\}','\$\{id\}'\)">💾 Uložit/.test(e));
ok('…s jedním ťuknutím „použít z účtenky“', /↳ použít z účtenky/.test(e));
ok('neznámý výrobek: uložení názvu rovnou založí kartu (i s balením)', /if \(p && p\.stav === 'nalezeno'\) return eanNazevUloz\(ean, id\);/.test(e) && /eanKartaUlozData\(ean, \{ nazev: v, mnozstvi:/.test(e));
ok('přiřazený výrobek: ✓ Přiřazeno místo hlavního tlačítka', /✓ Přiřazeno k položce z účtenky/.test(e) && /přiřadit i k jiné položce/.test(e));
ok('obě okna výsledku používají stejný stav přiřazení', (e.match(/eanPrirazeniHTML\(ean\)/g) || []).length >= 2);
ok('Moje výrobky: zkratka z účtenky = „Potvrdit název“, ne „databáze nezná“', /zatím jen zkratka z účtenky/.test(e) && /✓ Potvrdit název z účtenky/.test(e));
ok('K vyřízení: zkratka z účtenky = „Potvrdit název“', /x\.zUct\[0\] \? '✓ Potvrdit název' : '✍️ Zapiš název'/.test(e));
console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail ? 1 : 0);
