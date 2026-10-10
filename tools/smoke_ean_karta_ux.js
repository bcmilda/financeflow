// smoke_ean_karta_ux.js — karta výrobku: návrh názvu ze zkratky na účtence, výrazné pole
// „Český název výrobku“, přiřazený výrobek ukazuje ✓ místo tlačítka Přiřadit.
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const e = R('ean-sken.js');
let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log('  ✅', n)) : (fail++, console.log('  ❌', n)); };
console.log('smoke_ean_karta_ux.js');
const rc = R('receipts.js');
const sb = { normQty: null }; vm.createContext(sb);
vm.runInContext(R('helpers.js').match(/const NORM_JEDNOTKY_RE[\s\S]*?\nfunction normQty[\s\S]*?\n}\n/)[0], sb);
const vyrez = n => { const i = e.indexOf('function ' + n + '('); let d = 0, j = e.indexOf('{', i); for (let k = j; k < e.length; k++) { if (e[k] === '{') d++; else if (e[k] === '}') { d--; if (!d) return e.slice(i, k + 1); } } };
vm.runInContext(vyrez('eanBaleniZUctenky'), sb);
const B = t => vm.runInContext('eanBaleniZUctenky', sb)(t);
ok('balení ze zkratky (fakt): 1kg → 1000 g, 109G → 109 g', B('Smet.jogurt bílý 1kg KK') === '1000 g' && B('KOSTICI BARVICI 109G') === '109 g');
ok('název z účtenky se do názvu výrobku NEpřebírá (žádný návrh, žádné „použít z účtenky“)', !/eanNavrhZUctenky/.test(e) && !/použít z účtenky/.test(e));
ok('formulář karty: název prázdný s nápovědou „opiš z obalu“', /· opiš z obalu<\/span><\/label>/.test(e) && /value="\$\{escHtml\(moje \|\| \(nalez \? eanNazevVyrobku\(p, ean\) : ''\)\)\}"/.test(e));
ok('chybí český název → výrazné pole „🇨🇿 Český název výrobku (opiš z obalu)“ + Uložit', /🇨🇿 Český název výrobku/.test(e) && /eanNazevRychle\('\$\{escHtml\(ean\)\}','\$\{id\}'\)">💾 Uložit/.test(e));
ok('neznámý výrobek: uložení názvu rovnou založí kartu (i s balením)', /if \(p && p\.stav === 'nalezeno'\) return eanNazevUloz\(ean, id\);/.test(e) && /eanKartaUlozData\(ean, \{ nazev: v, mnozstvi:/.test(e));
ok('přiřazený výrobek: ✓ Přiřazeno místo hlavního tlačítka', /✓ Přiřazeno k položce z účtenky/.test(e) && (e.match(/eanPrirazeniHTML\(ean\)/g) || []).length >= 2);
ok('…bez odkazu „přiřadit i k jiné položce“ (to řeší aliasy)', !/přiřadit i k jiné položce<\/button>/.test(e) && !/onclick="eanVyberPolozku\(\)" style="background:none/.test(e));
ok('Moje výrobky / K vyřízení: „Zapiš název z obalu“, zkratka jen jako štítek', /zatím jen zkratka z účtenky/.test(e) && /✍️ Zapiš název z obalu/.test(e) && !/Potvrdit název/.test(e));
ok('📦 Moje výrobky = samostatná záložka v Analýze účtenek', /id="utab-vyrobky" onclick="switchUctenkyTab\(\\'vyrobky\\',this\)">📦 Moje výrobky/.test(rc) && /<div class="eanMojeBox" data-samostatne="1">/.test(rc));
ok('…přepínání záložek ji zná a při otevření ji vykreslí', /\['scan','learn','mapa','vyrobky',/.test(rc) && /if\(tab==='vyrobky' && typeof eanMojeVyrobkyKresli==='function'\)/.test(rc));
ok('…a v Mapě položek už není (žádná dvojí cesta)', !/buildMapaTab[\s\S]{0,1500}eanMojeBox/.test(rc.slice(rc.indexOf('function buildMapaTab'))));
ok('K vyřízení odkazuje na novou záložku', /switchUctenkyTab\('vyrobky',b\)/.test(e));
ok('samostatná záložka: nadpis místo rozbalovací sekce + prázdný stav', /function eanMojeVyrobkyHTML\(D, samostatne\)/.test(e) && /Zatím žádné výrobky/.test(e));
console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail ? 1 : 0);
