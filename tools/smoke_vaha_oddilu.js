// FinanceFlow · smoke_vaha_oddilu.js
// S28 (v12.22, FIX-500, Milan: „proč mám +1316 % větší útratu než průměr, když jsem koupil jen 3 balení kapesníků?
// Ten výpočet bude špatně.“). Váha oddílu se sčítala přes všechny úrovně číselníku → ~3× víc → „Váha ČSÚ“
// v kartě ~3× menší a „proti průměru“ nafouknuté.
// v12.23 (Milan: „právě když utratím méně, mělo by to být zobrazeno tím 0,63 %“): za oddíl < 500 Kč karta sama
// porovná ze všech výdajů, bez hlášky o málo datech; ručně jde přepnout na „z výdajů za oddíl“.
// + 🚫 Bez živin: značka v osobní kartě, Moje výrobky ji berou jako kompletní, živiny za měsíc ji nepočítají.
// Negativní kontrola: na v12.21 i v12.22 test padá.
const fs = require('fs'), path = require('path'), vm = require('vm');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const R = (...c) => fs.readFileSync(najdi(...c), 'utf8');
let ok = 0, bad = 0;
const t = (n, p, x) => { if (p) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n + (x === undefined ? '' : ' → ' + x)); } };
const vyber = (src, n) => { const i = src.indexOf('function ' + n + '('); if (i < 0) return ''; let d = 0, k = src.indexOf('{', i);
  for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) break; } } return src.slice(i, k + 1); };
const RC = R('receipts.js', '../js/receipts.js'), PD = R('product-db.js', '../js/product-db.js'), E = R('ean-sken.js', '../js/ean-sken.js');
const PG = JSON.parse(R('product-groups.json', '../data/product-groups.json'));
const S = { uiCfg: {}, receipts: [], transactions: [] };
const c = { console, S, getData: () => S, Math, JSON, Object, Array, String, Number, Set, Date, parseFloat, isFinite,
  _productDB: PG, escHtml: x => String(x == null ? '' : x), save() {}, showToast() {}, normName: x => String(x || '').toLowerCase().trim() };
c.window = c; vm.createContext(c);
const fn = ['mapaVahaZaklad', 'mapaVahaPodtridy', 'mapaVahaOddilu', 'mapaObdobiOd', 'mapaVyberObdobi', 'mapaVahaRoky', 'mapaVahaObdobiNazev', 'mapaVsechnyVydaje',
  'mapaKoicopPanelHTML', 'mapaKartaKlic', 'mapaKartaLok', 'mapaKartaLokUloz', 'mapaBezZivin', 'dnaZivinyData', 'dnaKartaPolozky', 'dnaMnozstvi', 'dnaJeJidlo'];
vm.runInContext(vyber(PD, 'coicopNorm') + '\nvar _mapaVahaObdobi = "vse";\n' + ((RC.match(/^let _mapaVahaZaklad = [^\n]*/m) || [''])[0].replace('let ', 'var ')) + '\n'
  + ((RC.match(/^const MAPA_ZAKLAD_ODDIL_KC = [^\n]*/m) || [''])[0].replace('const ', 'var ')) + '\nvar mapaUzivDetail = function () {}, _mapaKartaI = -1;\nvar DNA_ZIVINY = [["kcal","Energie","kcal"]];\n'
  + fn.map(n => vyber(RC, n)).join('\n') + '\n' + ['eanMaZiviny', 'eanBezZivin', 'eanMojeStav'].map(n => vyber(E, n)).join('\n'), c);
console.log('── váha oddílu v koši ČSÚ ──');
const w05 = c.mapaVahaOddilu('05'), w01 = c.mapaVahaOddilu('01');
t('oddíl 05 = 51,2 ‰ (dřív 153,7 ‰ – sečtené tři úrovně)', Math.abs(w05 - 51.23) < 0.05, w05);
t('oddíl 01 = 168,6 ‰ (vlastní váha oddílu)', Math.abs(w01 - 168.58) < 0.05, w01);
t('součet všech oddílů ≈ 1000 ‰', Math.abs(['01','02','03','04','05','06','07','08','09','10','11','12','13'].reduce((a, o) => a + (c.mapaVahaOddilu(o) || 0), 0) - 1000) < 15);
console.log('── karta Kuchyňské houbičky (05.6.1.1) ──');
c.mapaVahaRadky = () => [{ coicop: '05.6.1.1', castka: 43, mesic: '2026-10' }, { coicop: '05.6.1.9', castka: 31, mesic: '2026-10' }];
S.transactions = [{ type: 'expense', amount: 20000, date: '2026-10-05' }];   // všechny výdaje 20 000 Kč
let h = c.mapaKoicopPanelHTML('05.6.1.1', S, 'srov');
t('74 Kč za oddíl → karta sama porovná ze všech výdajů (tlačítko zapnuté)', /class="on" onclick="mapaVahaZaklad\('vse'\)"/.test(h));
t('Váha ČSÚ 0,63 % ze všech výdajů (6,3 ‰)', /class="h">0,63 %/.test(h), (h.match(/class="h"[^>]*>([^<]*)/) || [])[1]);
t('Tvůj podíl 0,22 % (43 z 20 000 Kč) – malá útrata = malé procento', /0,22 %/.test(h) && /43 Kč z 20[\s\u00a0]000 Kč/.test(h));
t('pod průměrem: −66 % proti průměru (dřív +1316 %)', /[−-]66 % proti průměru/.test(h) && !/1316/.test(h), (h.match(/[−+-]?\d+ % proti průměru/) || [])[0]);
t('žádná hláška „málo dat“', !/málo dat/.test(h));
c.mapaVahaZaklad('potraviny'); h = c.mapaKoicopPanelHTML('05.6.1.1', S, 'srov');
t('ručně „z výdajů za oddíl“: 12,3 % proti tvým 58,1 % (zobrazí se, bez hlášky)', /12,3 %/.test(h) && /58,1 %/.test(h) && /\d+ % proti průměru/.test(h) && !/málo dat/.test(h));
vm.runInContext('_mapaVahaZaklad = "auto"', c);
c.mapaVahaRadky = () => [{ coicop: '05.6.1.1', castka: 300, mesic: '2026-10' }, { coicop: '05.1.1.1', castka: 2700, mesic: '2026-10' }];
h = c.mapaKoicopPanelHTML('05.6.1.1', S, 'srov');
t('s 3 000 Kč za oddíl zůstává základ oddíl: 10 % proti 12,3 % = −19 %', /class="on" onclick="mapaVahaZaklad\('potraviny'\)"/.test(h) && /[−-]19 % proti průměru/.test(h), (h.match(/[−+-]?\d+ % proti průměru/) || [])[0]);
console.log('── 🚫 bez živin ──');
const P = { stav: 'nalezeno', nazev: 'Pilsner Urquell' };
t('výrobek bez živin: Moje výrobky ho hlásí jako chybějící', c.eanMojeStav({ ean: '8594404000015', nakupy: 1 }, P).bezZivin === true);
c.mapaKartaLokUloz({ ean: '8594404000015', nazev: 'PILSNER 0,5' }, { bezZivin: 1 });
const st = c.eanMojeStav({ ean: '8594404000015', nakupy: 1 }, P);
t('po 🚫 Bez živin: nechybí nic, štítek „netýká se“', st.bezZivin === false && st.netyka === true);
t('značka je v osobní kartě s klíčem platným pro Firebase', S.uiCfg.karty && S.uiCfg.karty.e8594404000015 && S.uiCfg.karty.e8594404000015.bezZivin === 1);
c.mapaKartaLokUloz({ ean: '8594404000015', nazev: '' }, { bezZivin: null });
t('↺ zrušení značku smaže (ne false/null ve Firebase)', !('bezZivin' in S.uiCfg.karty.e8594404000015));
c.mapaKartaLokUloz({ ean: '8594404000015', nazev: '' }, { bezZivin: 1 });
const rec = [{ date: '2026-10-20', store: 'Lidl', total: 140, items: [{ name: 'PILSNER 0,5', ean: '8594404000015', price: 30, qty: 2, lineTotal: 60 }, { name: 'Rohlík', price: 4, qty: 20, lineTotal: 80 }] }];
const prod = e => e === '8594404000015' ? P : null;
c.cenyKodPolozky = n => /pilsner/i.test(n) ? '02.1.3.1' : '01.1.1.3';
const bez = it => c.mapaBezZivin(it.ean ? { ean: it.ean } : { klic: c.normName(it.name) });
const d0 = c.dnaZivinyData(rec, 9, 2026, prod, () => null), d1 = c.dnaZivinyData(rec, 9, 2026, prod, () => null, bez);
t('živiny za měsíc: pivo bez značky = jídlo/pití bez dat (140 Kč, 2 položky)', d0.jidloUtrata === 140 && d0.jidloPolozek === 2, d0.jidloUtrata);
t('… s 🚫 bez živin se nepočítá (80 Kč, 1 položka)', d1.jidloUtrata === 80 && d1.jidloPolozek === 1, d1.jidloUtrata);
t('karta výrobku a skener mají tlačítko 🚫 Bez živin', /mapaBezZivinPrepni\(\$\{i\}\)"[^>]*>🚫 Bez živin/.test(RC) && /eanBezZivinPrepni\(/.test(vyber(E, 'eanFotoTlacitkaHTML')));
console.log(`\n${ok} ✓  ${bad} ✗`);
process.exit(bad ? 1 : 0);
