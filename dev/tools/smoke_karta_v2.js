// smoke_karta_v2.js — přestavba karty výrobku: bloky, aliasy bez opakování, název z EAN,
// COICOP panel se stejným základem a obdobím (3/6/12 měsíců, rok, vše; potraviny / všechny výdaje).
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const rc = R('receipts.js'), h = R('helpers.js');
let pass = 0, fail = 0;
const ok = (n, c, x) => { c ? (pass++, console.log('  ✅', n)) : (fail++, console.log('  ❌', n, x !== undefined ? JSON.stringify(x) : '')); };
console.log('smoke_karta_v2.js');
const vyrez = (src, n) => { const i = src.indexOf('function ' + n + '('); let d = 0, j = src.indexOf('{', i); for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } } };
const sb = {}; vm.createContext(sb);
vm.runInContext(h.match(/const NORM_JEDNOTKY_RE[\s\S]*?\nfunction normQty[\s\S]*?\n}\n/)[0] + '\n' + vyrez(h, 'normName'), sb);
vm.runInContext(['mapaAliasySkupiny', 'mapaObdobiOd', 'mapaVyberObdobi'].map(n => vyrez(rc, n)).join('\n'), sb);

const al = sb.mapaAliasySkupiny({ nakupy: [
  { raw: 'NEW REMYS ZÁZVOR KOSTKY 100G', obchodNazev: 'Můj obchod' }, { raw: 'New Remys Zázvor kostky 100g', obchodNazev: 'Můj obchod' },
  { raw: 'New Remys Zazvor kostky 100 g', obchodNazev: 'Penny' }, { raw: 'Zázvor čerstvý', obchodNazev: 'Lidl' }] });
ok('aliasy: VELKÁ/malá, diakritika i gramáž = jeden název', al.length === 2 && al[0].pocet === 3, al.map(a => a.nazev));
ok('aliasy: ukáže se nejčitelnější podoba (malá písmena + diakritika)', al[0].nazev === 'New Remys Zázvor kostky 100g', al[0].nazev);
ok('aliasy: obchody se sečtou', al[0].obchody.length === 2);
const d = new Date(); const ym = k => { const x = new Date(d); x.setDate(1); x.setMonth(x.getMonth() - k); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0'); };
ok('období: 3 měsíce = tento + 2 předchozí', sb.mapaObdobiOd('3') === ym(2) && sb.mapaObdobiOd('12') === ym(11) && sb.mapaObdobiOd('vse') === null);
const r = [{ mesic: ym(0), castka: 1 }, { mesic: ym(4), castka: 1 }, { mesic: '2020-05', castka: 1 }];
ok('období: výběr 3 / 6 / rok / vše', sb.mapaVyberObdobi(r, '3').length === 1 && sb.mapaVyberObdobi(r, '6').length === 2 && sb.mapaVyberObdobi(r, '2020').length === 1 && sb.mapaVyberObdobi(r, 'vse').length === 3);

const karta = rc.slice(rc.indexOf('function mapaUzivKartaHTML('), rc.indexOf('window.mapaUzivKartaHTML'));
ok('bloky: Výrobek → Zařazení → Názvy z účtenek → Balení a složení → Moje nákupy', ['Výrobek', 'Zařazení', 'Názvy z účtenek', 'Balení a složení', 'Moje nákupy'].every((t, i, a) => karta.indexOf("tit('" + t + "')") > -1 && (i === 0 || karta.indexOf("tit('" + a[i - 1] + "')") < karta.indexOf("tit('" + t + "')"))));
ok('řádky v mřížce (popisek | hodnota) – hodnota se zalomí, nepřeteče', /\.mk-r\{display:grid;grid-template-columns:minmax\(92px,36%\) minmax\(0,1fr\)/.test(rc) && /\.mk-r>\.v\{[^}]*overflow-wrap:anywhere/.test(rc));
ok('EAN: kód nebo „zatím nepřiřazen“ + Naskenovat kód', /— ZATÍM NEPŘIŘAZEN/.test(karta) && /\$\{rpIk\('skenovat', 16\) \|\| '▮▮'\} Naskenovat kód/.test(karta));
ok('název z EAN jen z databáze (ne z fotky)', /const zDb = p && p\.nazev && p\.zdroj !== 'fotka obalu' \? p\.nazev : '';/.test(karta));
ok('COICOP: kód + název v řádku, hierarchie a srovnání v panelu', /mapaKoicopRadekHTML\(/.test(karta) && /const telo = mapaKoicopPanelHTML\(kodC, D\);/.test(rc));
const panel = vyrez(rc, 'mapaKoicopPanelHTML');
ok('panel: přepínač období 3/6/12 měsíců, rok, vše', /\['3', '3 měs\.'\], \['6', '6 měs\.'\], \['12', '12 měs\.'\], \['vse', 'vše'\]/.test(panel) && /rok…/.test(panel));
ok('panel: přepínač základu – výdaje za potraviny / všechny výdaje', /mapaVahaZaklad\('potraviny'\)/.test(panel) && /mapaVahaZaklad\('vse'\)/.test(panel));
ok('panel: ČSÚ i tvůj podíl VŽDY se stejným základem (žádné míchání ‰ a %)', /const csu = _mapaVahaZaklad === 'vse' \? w \/ 10 : \(wOdd \? w \/ wOdd \* 100 : null\);/.test(panel) && /const jm = _mapaVahaZaklad === 'vse' \? vse : potr;/.test(panel));
ok('všechny výdaje = transakce bez převodů a vyrovnání (expSum)', /expSum\(vyb, D \|\| getData\(\)\)/.test(vyrez(rc, 'mapaVsechnyVydaje')));
ok('Nutri-Score jen jednou (v Balení a složení)', !/Nutri-Score \$\{p\.nutriscore\.toUpperCase\(\)\}/.test(karta) && /mkR\('Nutri-Score'/.test(karta));
ok('identifikace a zdroje dat sbalené', /<details class="mk-roz" style="margin-top:16px"><summary class="mk-tit"/.test(karta));
//  v11.57: tři názvy, COICOP rozbalovaný z řádku, fotka českého popisku
const w = R('worker.js'), es = R('ean-sken.js');
ok('tři názvy: Název z EAN / Obal – přední strana / Obal – CZ popisek', /mkR\('Název z EAN'/.test(karta) && /Obal – přední strana/.test(karta) && /Obal – CZ popisek/.test(karta));
ok('CZ popisek: fotka popisku → opsaný → česky z přední strany → databáze → návrh AI', /p && p\.nazevPopisek \? \[p\.nazevPopisek, '📸 z českého popisku'\]/.test(karta) && /návrh AI – ověř podle popisku/.test(karta));
ok('u řádků tlačítka 📸 přední strana / 📸 český popisek', /fotoBtn\('obal'/.test(karta) && /eanFoto\('\$\{e\(z\.ean\)\}','popisek',mapaUzivFotoHotovo\)/.test(karta));
ok('COICOP: číselník se rozbaluje přímo z řádku', /<summary class="mk-r" style="border-top:none;cursor:pointer"><span class="l">COICOP<\/span>/.test(rc) && /mapaKoicopRadekHTML\(kodC, posl, D\)/.test(karta));
ok('worker: fotka „popisek“ → nazevPopisek (+ složení, dovozce), zachová se při obnově', /body\.druh === 'popisek' \? 'popisek'/.test(w) && /p\.nazevPopisek = eanStr\(j\.nazev_cs, 100\)/.test(w) && /'nazevPopisek', 'dovozce'\]/.test(w));
ok('zobrazovaný název: český popisek má přednost', /return p \? \(p\.nazevPopisek \|\| /.test(es));
ok('živiny jen v bloku Balení (žádná dvojí tlačítka)', !/eanFotoTlacitkaHTML\(z\.ean, produkt, 'mapaUzivFotoHotovo', true\)/.test(karta));
console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail ? 1 : 0);
