// FinanceFlow · smoke_vaha_oddilu.js
// S28 (v12.22, FIX-500, Milan: „proč mám +1316 % větší útratu než průměr, když jsem koupil jen 3 balení kapesníků?
// Ten výpočet bude špatně.“). Váha oddílu se sčítala přes všechny úrovně číselníku → ~3× víc → „Váha ČSÚ“
// v kartě ~3× menší a „proti průměru“ nafouknuté.
// v12.24 (Milan: „nemůžeš v jedné kartě používat 2 různé výpočty“): karta má JEDEN výpočet – ze všech výdajů.
// Malá útrata = malé procento; koupě ledničky (jiná věc z oddílu) procento čisticích věcí nezmění.
// + 🚫 Bez živin: značka v osobní kartě, Moje výrobky ji berou jako kompletní, živiny za měsíc ji nepočítají.
// v12.28 (Milan: „vrať porovnání útraty za oddíl, pokud máme data z ČSÚ i výpočet, kterým ho oni počítají“):
// ② samostatný blok „Uvnitř oddílu“ (váha podtřídy / váha oddílu proti tvé útratě za oddíl z účtenek +
// transakcí bez účtenky) a období od první naskenované účtenky. ① zůstává beze změny.
// Negativní kontrola: na v12.21–v12.24 i v12.27 test padá.
const fs = require('fs'), path = require('path'), vm = require('vm');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const R = (...c) => fs.readFileSync(najdi(...c), 'utf8');
let ok = 0, bad = 0;
const t = (n, p, x) => { if (p) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n + (x === undefined ? '' : ' → ' + x)); } };
const vyber = (src, n) => { const i = src.indexOf('function ' + n + '('); if (i < 0) return ''; let d = 0, k = src.indexOf('{', i);
  for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) break; } } return src.slice(i, k + 1); };
const HL = R('helpers.js', '../js/helpers.js');
const RC = R('receipts.js', '../js/receipts.js'), PD = R('product-db.js', '../js/product-db.js'), E = R('ean-sken.js', '../js/ean-sken.js');
const PG = JSON.parse(R('product-groups.json', '../data/product-groups.json'));
const S = { uiCfg: {}, receipts: [], transactions: [] };
const c = { console, S, getData: () => S, Math, JSON, Object, Array, String, Number, Set, Date, parseFloat, isFinite,
  _productDB: PG, escHtml: x => String(x == null ? '' : x), save() {}, showToast() {}, normName: x => String(x || '').toLowerCase().trim() };
c.window = c; vm.createContext(c);
const fn = ['mapaVahaPodtridy', 'mapaVahaOddilu', 'mapaObdobiOd', 'mapaVyberObdobi', 'mapaVahaRoky', 'mapaVahaObdobiNazev', 'mapaVsechnyVydaje',
  'mapaPrvniMesicUctenek', 'mapaTxObdobi', 'mapaJeTxUctenky', 'mapaOddilZTransakci',
  'mapaKoicopPanelHTML', 'mapaKartaKlic', 'mapaKartaLok', 'mapaKartaLokUloz', 'mapaBezZivin', 'dnaZivinyData', 'dnaKartaPolozky', 'dnaMnozstvi', 'dnaJeJidlo'];
vm.runInContext(vyber(PD, 'coicopNorm') + '\nvar DEFAULT_CATEGORIES = [{ id: "cat17", coicop: 5 }, { id: "cat1", coicop: 1 }];\n' + vyber(HL, 'computeCoicopAggregates') + '\nvar _mapaVahaObdobi = "vse", _mapaVahaZaklad = "potraviny", MAPA_ZAKLAD_ODDIL_KC = 500;\nvar mapaUzivDetail = function () {}, _mapaKartaI = -1;\nvar DNA_ZIVINY = [["kcal","Energie","kcal"]];\n'
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
const proti = x => (x.match(/[−+-]?\d+ % proti průměru/) || [''])[0];
t('Váha ČSÚ 0,63 % ze všech výdajů (6,3 ‰)', /class="h">0,63 %/.test(h), (h.match(/class="h"[^>]*>([^<]*)/) || [])[1]);
t('Tvůj podíl 0,22 % (43 z 20 000 Kč) – malá útrata = malé procento', /0,22 %/.test(h) && /43 Kč z 20[\s\u00a0]000 Kč/.test(h));
t('pod průměrem: −66 % proti průměru (dřív +1316 %)', /[−-]66 % proti průměru/.test(proti(h)), proti(h));
t('žádný přepínač „Základ srovnání“ ani automatické přepínání (v12.23)', !/Základ srovnání/.test(h) && !/mapaVahaZaklad\(/.test(h));
t('① Ze všech výdajů a ② Uvnitř oddílu jsou dva samostatné bloky s nadpisem', /① Ze všech výdajů/.test(h) && /② Uvnitř oddílu 05/.test(h) && h.indexOf('①') < h.indexOf('②'));
const blok2 = x => x.slice(x.indexOf('②'));
t('② ČSÚ: podtřída 6,3 ‰ z 51,2 ‰ oddílu = 12,3 % z výdajů za oddíl', /class="h">12,3 %/.test(blok2(h)), (blok2(h).match(/class="h"[^>]*>([^<]*)/) || [])[1]);
t('② ty: 43 z 74 Kč za oddíl (jen účtenky) = 58,1 %', /58,1 %/.test(blok2(h)) && /43 Kč z 74 Kč/.test(blok2(h)));
t('žádná hláška „málo dat“', !/málo dat/.test(h));
//  koupě ledničky: oddíl 05 roste o 5 000 Kč, čisticích věcí stejně → procento čisticích věcí se nezmění
c.mapaVahaRadky = () => [{ coicop: '05.6.1.1', castka: 43, mesic: '2026-10' }, { coicop: '05.6.1.9', castka: 31, mesic: '2026-10' }, { coicop: '05.3.1.1', castka: 5000, mesic: '2026-10' }];
S.transactions = [{ type: 'expense', amount: 20000, date: '2026-10-05' }];
const h2 = c.mapaKoicopPanelHTML('05.6.1.1', S, 'srov');
t('lednička za 5 000 Kč (stejné celkové výdaje) → houbičky pořád 0,22 %, −66 % (dřív v oddílu −93 %)', /0,22 %/.test(h2) && proti(h2) === proti(h), proti(h2));
c.mapaVahaRadky = () => [{ coicop: '05.6.1.1', castka: 300, mesic: '2026-10' }, { coicop: '05.1.1.1', castka: 2700, mesic: '2026-10' }];
const h3 = c.mapaKoicopPanelHTML('05.6.1.1', S, 'srov');
t('i s 3 000 Kč za oddíl stejný výpočet: 300 z 20 000 = 1,5 % proti 0,63 % = +138 %', /1,5 %/.test(h3) && /\+138 % proti průměru/.test(proti(h3)), proti(h3));
console.log('── ② oddíl z účtenek + transakcí bez účtenky ──');
c.mapaVahaRadky = () => [{ coicop: '05.6.1.1', castka: 43, mesic: '2026-10' }, { coicop: '05.6.1.9', castka: 31, mesic: '2026-10' }];
S.transactions = [{ type: 'expense', amount: 19000, date: '2026-10-05', catId: 'cat1' },
  { type: 'expense', amount: 426, date: '2026-10-08', catId: 'cat17', name: 'Mop a kbelík' },                       // bez účtenky → oddíl 05
  { type: 'expense', amount: 574, date: '2026-10-09', catId: 'cat17', receiptAddedAt: 1, receiptItems: [{}] }];   // z účtenky → nepočítá se 2×
const h4 = c.mapaKoicopPanelHTML('05.6.1.1', S, 'srov');
t('② za oddíl = 74 Kč z účtenek + 426 Kč z transakcí bez účtenky (transakce z účtenky se nezdvojí)', /74 Kč z účtenek \+ 426 Kč z transakcí bez účtenky/.test(blok2(h4)), blok2(h4).slice(0, 0));
t('② ty: 43 z 500 Kč = 8,6 % proti 12,3 % → −30 % proti průměru', /8,6 %/.test(blok2(h4)) && /[−-]30 % proti průměru/.test(blok2(h4)));
t('① se tím nemění: 43 z 20 000 Kč = 0,22 %', /0,22 %/.test(h4.slice(0, h4.indexOf('②'))));
const h5 = (() => { c.mapaVahaRadky = () => [{ coicop: '05.6.1.1', castka: 43, mesic: '2026-10' }, { coicop: '05.3.1.1', castka: 5000, mesic: '2026-10' }]; return c.mapaKoicopPanelHTML('05.6.1.1', S, 'srov'); })();
t('② lednička: podíl uvnitř oddílu klesne a karta vysvětlí proč; ① zůstane', /lednička/.test(blok2(h5)) && /0,22 %/.test(h5.slice(0, h5.indexOf('②'))));
console.log('── období od první naskenované účtenky ──');
vm.runInContext('_mapaVahaObdobi = "vse"', c);
c.mapaVahaRadky = () => [{ coicop: '05.6.1.1', castka: 40, mesic: '2026-09' }, { coicop: '05.6.1.1', castka: 40, mesic: '2026-10' }];
S.transactions = ['2025-11','2025-12','2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08','2026-09','2026-10']
  .map(m => ({ type: 'expense', amount: 10000, date: m + '-10', catId: 'cat1' }));
const h6 = c.mapaKoicopPanelHTML('05.6.1.1', S, 'srov');
t('skenuje od září: jmenovatel jen září–říjen (80 z 20 000 Kč = 0,4 %), ne 12 měsíců (0,07 %)', /80 Kč z 20[\s\u00a0]000 Kč/.test(h6) && /0,4 %/.test(h6));
t('karta řekne, od kdy se počítá', /Počítá se od září 2026/.test(h6));
S.transactions.push({ type: 'expense', amount: 10000, date: '2026-08-20', catId: 'cat1' });
t('podíl za 2 měsíce = podíl za „celou dobu“ (výdaje před první účtenkou se nepočítají)', /0,4 %/.test(c.mapaKoicopPanelHTML('05.6.1.1', S, 'srov')));
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
