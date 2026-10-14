// smoke_karta_zdroje.js — S25 (v11.61, ADR-207 + TODO-333): Open Food Facts jen doplňuje,
// každé políčko karty jde opravit (s kódem pro všechny), u políčka je vidět zdroj a karta je
// stejná i z 📦 Moje výrobky. node tools/smoke_karta_zdroje.js
const vm = require('vm'), fs = require('fs'), path = require('path');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const R = (...c) => fs.readFileSync(najdi(...c), 'utf8');
const wk = R('worker.js', '../cloudflare-worker/worker.js');
const rc = R('receipts.js', '../js/receipts.js'), ean = R('ean-sken.js', '../js/ean-sken.js'), adm = R('admin.js', '../js/admin.js');
let ok = 0, bad = 0; const t = (n, c, i) => { c ? ok++ : (bad++, console.log('❌', n, i === undefined ? '' : JSON.stringify(i))); };

// ── worker: sloučení (izolovaně) ──
const kus = (a, b) => { const i = wk.indexOf(a), j = wk.indexOf(b, i); return wk.slice(i, j); };
const W = new Function('fetch', 'json', 'eanMnozstvi', 'eanStr', 'FIREBASE_DB_URL',
  kus('const EAN_OFF_AKTUALIZOVAT', '//  Návrh českého názvu od uživatele') + ';return { eanSlouc, eanPoleHodnota, eanAkcePole, EAN_OFF_AKTUALIZOVAT, EAN_OFF_DOPLNIT };');
const eanStr = (v, n) => String(v == null ? '' : v).slice(0, n);
const eanMnozstvi = new Function(kus('function eanMnozstvi(p) {', '\nasync function eanZDatabazi') + ';return eanMnozstvi;')();
const db = {}; const log = [];
const fetchDb = async (url, o) => {
  const k = url.replace(/^https:\/\/x\//, '').replace(/\.json\?.*$/, '');
  if (o && o.method === 'PUT') { if (k.startsWith('community/eanUpravyLog')) log.push([k, JSON.parse(o.body)]); else db[k] = JSON.parse(o.body); return { ok: true }; }
  return { ok: true, json: async () => (db[k] === undefined ? null : JSON.parse(JSON.stringify(db[k]))) };
};
const jsonF = (d, s) => ({ d, s: s || 200 });
const F = W(fetchDb, jsonF, eanMnozstvi, eanStr, 'https://x');

const off = { ean: '1', stav: 'nalezeno', zdroj: 'Open Food Facts', kv: 2, nazev: 'Joghurt', znacka: 'Olma', nutriscore: 'c', alergeny: ['mléko'], nutrice: { kcal: 60 } };
const stary = Object.assign({}, off, { nazevCs: 'Jogurt bílý', nazevObal: 'Bílý jogurt', nazevPopisek: 'Jogurt bílý 3 %', obecnyId: 'jogurt', obecny: 'jogurt',
  nutriceObal: { kcal: 65, zdroj: 'rucne' }, dovozce: 'Olma a.s.', rucne: { znacka: 1 }, znacka: 'OLMA' });
const novy = Object.assign({}, off, { nazev: 'Yoghurt', znacka: 'Danone', nutriscore: 'b', alergeny: ['mléko', 'sója'], nutrice: { kcal: 70 }, puvod: 'Česko', obecny: 'yogurts', nazevObal: 'X', dovozce: 'Y' });
const s = F.eanSlouc(stary, novy, 5);
t('obnova: ručně opravená značka zůstane, hodnota z OFF se zapamatuje vedle', s.znacka === 'OLMA' && s.offPuvodni.znacka === 'Danone', s);
t('obnova: Nutri-Score, alergeny a název z EAN se smí aktualizovat', s.nutriscore === 'b' && s.alergeny.length === 2 && s.nazev === 'Yoghurt');
t('obnova: živiny z OFF jen doplní – existující se nepřepíší', s.nutrice.kcal === 60);
t('obnova: prázdné políčko se doplní (země původu)', s.puvod === 'Česko');
t('obnova: české názvy, zařazení, ruční živiny a dovozce Open Food Facts nikdy nezmění',
  s.nazevCs === 'Jogurt bílý' && s.nazevObal === 'Bílý jogurt' && s.nazevPopisek === 'Jogurt bílý 3 %' && s.obecnyId === 'jogurt' && s.obecny === 'jogurt' && s.nutriceObal.kcal === 65 && s.dovozce === 'Olma a.s.');
t('obnova: kdy = teď, karta zůstává', s.kdy === 5 && s.stav === 'nalezeno');
const hum = { ean: '2', stav: 'nalezeno', zdroj: 'zadáno ručně', nazev: 'Rohlík tukový', nazevCesky: true, znacka: 'Penam' };
const h = F.eanSlouc(hum, Object.assign({}, novy), 7);
t('ruční karta: název a značka lidí zůstanou, i když je OFF později zná', h.nazev === 'Rohlík tukový' && h.znacka === 'Penam');
t('ruční karta: doplněné z OFF se označí (zOff) + odkud a kdy', h.zOff && h.zOff.nutriscore && h.zOff.puvod && !h.zOff.znacka && h.offZdroj === 'Open Food Facts' && h.offKdy === 7, h);
t('OFF kód nezná / smazal → karta zůstane (nikdy „nenalezeno“)', F.eanSlouc(hum, { ean: '2', stav: 'nenalezeno' }, 9).nazev === 'Rohlík tukový');
t('první načtení = data z OFF', F.eanSlouc(null, off) === off && F.eanSlouc({ stav: 'nenalezeno' }, off) === off);
t('skupiny se nepřekrývají a nejsou v nich naše pole',
  !F.EAN_OFF_AKTUALIZOVAT.some(k => F.EAN_OFF_DOPLNIT.includes(k)) && !['nazevCs', 'nazevObal', 'nazevPopisek', 'obecnyId', 'nutriceObal', 'slozeniObal', 'dovozce', 'rucne'].some(k => F.EAN_OFF_AKTUALIZOVAT.concat(F.EAN_OFF_DOPLNIT).includes(k)));

// ── worker: ruční úprava políčka ──
t('hodnota: Nutri-Score jen A–E', F.eanPoleHodnota('nutriscore', 'B').v === 'b' && !!F.eanPoleHodnota('nutriscore', 'x').chyba);
t('hodnota: balení se převede (0,5 l → 500 ml)', JSON.stringify(F.eanPoleHodnota('mnozstvi', '0,5 l').v) === '{"hodnota":500,"jednotka":"ml"}' && !!F.eanPoleHodnota('mnozstvi', 'hodně').chyba);
t('hodnota: seznam podle čárek, prázdné = nevíme', JSON.stringify(F.eanPoleHodnota('alergeny', 'mléko, lepek;sója').v) === '["mléko","lepek","sója"]' && F.eanPoleHodnota('znacka', '  ').prazdne);
(async () => {
  db['community/eanProdukty/1'] = Object.assign({}, off);
  let r = await F.eanAkcePole('uidA', '1', { pole: 'znacka', hodnota: 'Olma a.s.' }, { FIREBASE_DB_URL: 'https://x', FIREBASE_DB_SECRET: 's' }, {});
  const p1 = db['community/eanProdukty/1'];
  t('úprava: uloží se pro všechny a zamkne', r.d.ok && p1.znacka === 'Olma a.s.' && p1.rucne && p1.rucne.znacka > 0, p1);
  t('úprava: původní hodnota z OFF se neztratí', p1.offPuvodni && p1.offPuvodni.znacka === 'Olma');
  t('úprava: zápis do logu pro admina (uid, pole, stará → nová)', log.length === 1 && log[0][0] === 'community/eanUpravyLog/1/uidA/znacka' && log[0][1].stara === 'Olma' && log[0][1].nova === 'Olma a.s.');
  await F.eanAkcePole('uidB', '1', { pole: 'znacka', hodnota: 'Olma' }, { FIREBASE_DB_URL: 'https://x' }, {});
  t('druhá úprava už nepřepíše zapamatovanou hodnotu z OFF', db['community/eanProdukty/1'].offPuvodni.znacka === 'Olma' && db['community/eanProdukty/1'].znacka === 'Olma');
  await F.eanAkcePole('uidA', '1', { pole: 'slozeni', hodnota: 'mléko, smetana' }, { FIREBASE_DB_URL: 'https://x' }, {});
  t('složení opsané z obalu jde do slozeniObal (zamčené)', db['community/eanProdukty/1'].slozeniObal === 'mléko, smetana' && db['community/eanProdukty/1'].rucne.slozeniObal > 0);
  await F.eanAkcePole('uidA', '1', { pole: 'nutriscore', hodnota: '' }, { FIREBASE_DB_URL: 'https://x' }, {});
  const p2 = db['community/eanProdukty/1'];
  t('prázdné = údaj nevíme: smaže se, zůstane zamčený a OFF ho nevrátí', !('nutriscore' in p2) && p2.rucne.nutriscore > 0 && !('nutriscore' in F.eanSlouc(p2, Object.assign({}, off, { nutriscore: 'a' }))));
  r = await F.eanAkcePole('uidA', '1', { pole: 'nazevCs', hodnota: 'Cokoli' }, { FIREBASE_DB_URL: 'https://x' }, {});
  t('názvy touhle cestou nejdou (jdou přes návrh adminovi – ADR-206)', r.s === 400);
  r = await F.eanAkcePole('uidA', '999', { pole: 'znacka', hodnota: 'Xyz' }, { FIREBASE_DB_URL: 'https://x' }, {});
  t('kód bez karty → nejdřív založit kartu', r.s === 400 && /založ/.test(r.d.error), r);
  t('ruční karta: doplněné z OFF se při úpravě odznačí', (() => { db['community/eanProdukty/2'] = h; return true; })());
  await F.eanAkcePole('uidA', '2', { pole: 'puvod', hodnota: 'Slovensko' }, { FIREBASE_DB_URL: 'https://x' }, {});
  const p3 = db['community/eanProdukty/2'];
  t('  … puvod: z OFF → komunita, původní hodnota z OFF zapamatovaná', p3.puvod === 'Slovensko' && !(p3.zOff || {}).puvod && p3.offPuvodni.puvod === 'Česko', p3);
  konec();
})();

function konec() {
  // ── worker: zapojení ──
  t('akce „pole“ je napojená', wk.includes("if (body.akce === 'pole') return eanAkcePole(uid, ean, body, env, cors);"));
  t('obnova po 90 dnech slučuje místo přepisu', wk.includes('else if (produkt) produkt = eanSlouc(_eanStary, produkt);') && !wk.includes('EAN_ZACHOVAT.forEach'));
  t('AI zařazení se nepřepisuje a volá se jen, když něco chybí', wk.includes("if (k && tax.nazvy[k] && !prod.obecnyId)") && wk.includes('!(produkt.aiKdy && produkt.obecnyId && (produkt.nazevCs || produkt.nazevCesky))'));
  t('ruční karta a fotka obalu zamykají, co zapsal člověk', /zamkni\('znacka'\)/.test(wk) && /zamkni\('mnozstvi'\)/.test(wk) && /p\.znacka = eanStr\(j\.znacka, 60\); p\.rucne = /.test(wk));
  t('dotaz na Open Food Facts chce i výrobce, původ a obal', ['brand_owner', 'manufacturing_places', 'origins', 'packaging_tags'].every(f => kus('const EAN_POLE = [', '].join').includes("'" + f + "'")));
  t('admin „Načíst znovu“ kartu nemaže, jen ji označí k obnově', adm.includes("body: JSON.stringify({ kdy: 0 })") && !/mapaAdminEanZnovu[\s\S]{0,400}method: 'DELETE'/.test(adm.slice(adm.indexOf('async function mapaAdminEanZnovu'))));

  // ── appka: zdroj políčka ──
  const ctx = { console, window: {}, document: { getElementById: () => null, querySelectorAll: () => [] }, S: {}, localStorage: { getItem: () => null, setItem() {} } };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(R('helpers.js', '../js/helpers.js'), ctx);
  vm.runInContext(ean, ctx);
  const Z = ctx.eanPoleZdroj;
  t('zdroj: OFF karta → 🌍, ručně opravené → 🇨🇿', Z(off, 'znacka') === 'off' && Z(Object.assign({}, off, { rucne: { znacka: 1 } }), 'znacka') === 'komunita');
  t('zdroj: naše pole jsou vždy komunita', ['nazevObal', 'nazevPopisek', 'nutriceObal', 'slozeniObal', 'dovozce'].every(k => Z(off, k) === 'komunita'));
  t('zdroj: ruční karta → komunita, doplněné z OFF → 🌍', Z(hum, 'znacka') === 'komunita' && Z(h, 'nutriscore') === 'off' && ctx.eanZdrojOff(h) === 'Open Food Facts');
  t('zdroj: bez karty nic', Z(null, 'znacka') === '' && Z({ stav: 'nenalezeno' }, 'znacka') === '');
  t('balení česky: 500 ml → 0,5 l, 150 g → 150 g', ctx.eanMnTxt({ hodnota: 500, jednotka: 'ml' }) === '500 ml' && ctx.eanMnTxt({ hodnota: 1500, jednotka: 'g' }) === '1,5 kg' && ctx.eanMnTxt({ hodnota: 0.5, jednotka: 'g' }) === '0,5 g');
  t('📦 Moje výrobky a K vyřízení otevřou stejnou kartu (mapaKartaEan)', ean.includes("onclick=\"eanOtevriKartu('${escHtml(z.ean)}')\"") && ean.includes("onclick=\"eanOtevriKartu('${escHtml(x.ean)}')\"") && ean.includes("if (typeof mapaKartaEan === 'function') return mapaKartaEan(ean);"));
  t('po skenu: „Otevřít celou kartu výrobku“', ean.includes('📇 Otevřít celou kartu výrobku'));

  // ── appka: karta (stejný harness jako smoke_karta_jednotna) ──
  const app = R('app.js', '../js/app.js');
  const cut = (a, b) => { const i = app.indexOf(a), j = app.indexOf(b, i); return app.slice(i, j); };
  const S = { categories: [{ id: 'cat1', name: 'Jídlo & Nákupy', icon: '🛒', type: 'expense' }], receipts: [], uiCfg: {} };
  const c = { console, S, localStorage: { getItem: () => null, setItem() {} }, document: { getElementById: () => null, querySelectorAll: () => [], createElement: () => ({ style: {} }), body: { appendChild() {} }, head: { appendChild() {} } },
    fetch: async () => ({ ok: true, json: async () => null }), navigator: {}, setTimeout, URL, getData: () => S, save() {} };
  c.window = c; vm.createContext(c);
  vm.runInContext(R('helpers.js', '../js/helpers.js'), c);
  vm.runInContext(R('taxonomie.js', '../js/taxonomie.js'), c);
  c.taxNastav(JSON.parse(R('taxonomie.json', '../data/taxonomie.json')));
  vm.runInContext('var _isLocalMode=false;' + cut('let _catMappingsCache = null;', '// Načti mappings po přihlášení') + ';this._set=(c,m,t)=>{_catMappingsCache=c;_productMapCache=m;_taxRozpocetCache=t;};', c);
  vm.runInContext(rc, c); vm.runInContext(ean, c);
  c._set({}, {}, {});
  S.receipts = [{ date: '2026-09-01', store: 'Penny Market', items: [{ name: 'Smet.jogurt bílý 1kg KK', price: 69.9, ean: '8590000000017' }, { name: 'Margot 80g', price: 14.9 }] }];
  c.buildMapaTab(S.receipts);
  const d = vm.runInContext('_mapaUziv', c), iE = d.findIndex(z => z.ean), iN = d.findIndex(z => !z.ean);
  const pOff = { stav: 'nalezeno', zdroj: 'Open Food Facts', nazev: 'Yoghurt', znacka: 'Olma', nutriscore: 'b', obal: ['plast'],
    rucne: { puvod: 1 }, puvod: 'Česko', offPuvodni: { puvod: 'Slovensko' }, mnozstvi: { hodnota: 1000, jednotka: 'g' } };
  vm.runInContext('_eanProdukty["8590000000017"] = ' + JSON.stringify(pOff), c);
  const k = c.mapaUzivKartaHTML(iE, pOff);
  t('karta: čip 🌍 Open Food Facts u převzatých údajů', /id="mkp_znacka"[^]*?mk-z-off[^>]*>🌍 Open Food Facts/.test(k));
  t('karta: čip 🇨🇿 komunita u ručně opravených + „Open Food Facts uvádí“', /id="mkp_puvod"[^]*?mk-z-komunita[^>]*>🇨🇿 komunita[^]*?Open Food Facts uvádí: Slovensko/.test(k));
  t('karta: balení z databáze česky (1 kg)', /id="mkp_mnozstvi" data-hodnota="1 kg"/.test(k));
  const POLE = ['znacka', 'vyrobce', 'dovozce', 'mnozstvi', 'konkretni', 'obal', 'puvod', 'zeme', 'nutriscore', 'slozeni', 'alergeny'];
  t('karta s kódem: KAŽDÉ políčko jde opravit/doplnit', POLE.every(p => k.includes(`mapaKartaUprav(${iE},'${p}')`)), POLE.filter(p => !k.includes(`mapaKartaUprav(${iE},'${p}')`)));
  const kn = c.mapaUzivKartaHTML(iN, null);
  t('karta bez kódu: stejná políčka, také upravitelná', POLE.every(p => kn.includes(`mapaKartaUprav(${iN},'${p}')`)));
  t('s kódem a kartou → oprava pro všechny; bez kódu → osobní', c.mapaKartaKomunitni(d[iE], 'znacka') && !c.mapaKartaKomunitni(d[iN], 'znacka') && !c.mapaKartaKomunitni(d[iE], 'nazevObal'));
  t('s kódem, karta se načítá → zatím bez tlačítek', !c.mapaUzivKartaHTML(iE, null).includes(`mapaKartaUprav(${iE},'znacka')`));
  c.mapaKartaLokUloz(d[iN], { mnozstvi: '80 g', nutriscore: 'd' });
  const kn2 = c.mapaUzivKartaHTML(iN, null);
  t('osobní zápis: ✍️ tvůj zápis + Nutri-Score jako štítek', /id="mkp_mnozstvi" data-hodnota="80 g"[^]*?mk-z-ty/.test(kn2) && /id="mkp_nutriscore"[^>]*><span style="background:#ee8100[^>]*>D</.test(kn2));
  // jedna karta všude: naskenovaný výrobek bez účtenky
  vm.runInContext('_eanProdukty["4000000000006"] = ' + JSON.stringify({ stav: 'nalezeno', zdroj: 'Open Food Facts', nazev: 'Schokolade', nazevCs: 'Čokoláda', znacka: 'Milka' }), c);
  const iS = c.mapaKartaIndex('4000000000006');
  t('výrobek bez účtenky dostane kartu (syntetická položka)', iS >= 100000 && c._mapaZ(iS).synt && c._mapaZ(iS).ean === '4000000000006');
  t('stejný kód → stejná karta, položka z účtenky má přednost', c.mapaKartaIndex('4000000000006') === iS && c.mapaKartaIndex('8590000000017') === iE);
  const ks = c.mapaUzivKartaHTML(iS, vm.runInContext('_eanProdukty["4000000000006"]', c));
  t('karta bez účtenky: stejná políčka + přiřazení, bez rozpočtu a „Změnit“', POLE.every(p => ks.includes(`mapaKartaUprav(${iS},'${p}')`)) && ks.includes("eanOtevriNaskenovany('4000000000006')") && !ks.includes('💼 Rozpočet') && !ks.includes('mapaUzivKartaSken(') && ks.includes('zatím není na účtence'));
  t('přepočet Mapy syntetickou kartu nesmaže', (() => { vm.runInContext('_mapaUziv = mapaUzivData(_mapaUzivReceipts)', c); return !!c._mapaZ(iS); })());
  t('ceny v kraji u karty bez účtenky nepadají', R('ceny-kraje.js', '../js/ceny-kraje.js').includes("if (z.synt) {"));
  console.log(`\nsmoke_karta_zdroje: ${ok} ✅  ${bad} ❌`);
  process.exit(bad ? 1 : 0);
}
