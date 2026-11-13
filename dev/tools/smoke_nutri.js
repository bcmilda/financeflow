// FinanceFlow · smoke_nutri.js
// S29 (v12.47, Milan: „napojit Nutridatabase s párovací tabulkou a pak s kartou Moje výrobky a Mapa položek“)
// Hlídá: převod CSV (cp1250, „-“, nezlomitelné mezery), párovací tabulku (jen kódy, žádné hodnoty – licence čl. 5),
// worker (jen vyžádané potraviny, max 60, nahrání a úpravy jen admin, uživatel dostane jen jisté/potvrzené páry),
// pořadí zdrojů živin (čárový kód nikdy NutriDatabázi – žádné odhady), jedlý podíl v Živinách v nákupu,
// citaci a napojení v kartě výrobku. Negativní kontrola: na v12.46 padá (nutri.js neexistuje).
const fs = require('fs'), path = require('path'), vm = require('vm');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const R = (...c) => fs.readFileSync(najdi(...c), 'utf8');
let ok = 0, bad = 0;
const t = (n, p, x) => { if (p) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n + (x === undefined ? '' : ' → ' + JSON.stringify(x).slice(0, 400))); } };
const vyber = (src, n) => { const i = src.search(new RegExp('(async )?function ' + n + '\\(')); if (i < 0) return ''; let d = 0, k = src.indexOf('{', i);
  for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) break; } } return src.slice(i, k + 1); };
const N = R('nutri.js', '../js/nutri.js'), W = R('worker.js', '../cloudflare-worker/worker.js'), RC = R('receipts.js', '../js/receipts.js'),
  H = R('app.html', '../app.html'), A = R('admin.js', '../js/admin.js'), HE = R('helpers.js', '../js/helpers.js');
const MAPA = JSON.parse(R('nutri-mapa.json', '../data/nutri-mapa.json')), TAX = JSON.parse(R('taxonomie.json', '../data/taxonomie.json'));

(async () => {
console.log('── převod CSV ──');
const c = { console, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, escHtml: s => String(s).replace(/</g, '&lt;'), window: {}, Set, Map, Promise };
vm.createContext(c); vm.runInContext(N, c);
const csv = 'OrigFdCd; OrigFdNm; EngFdNam; SciNam; EDIBLE; NCF; FACF; ENERC [kJ]; ENERC [kcal]; FAT [g]; FASAT [g]; FAMS [g]; FAPU [g]; FATRN [g]; CHOT [g]; CHO [g]; SUGAR [g]; FIBT [g]; PROT [g]; ASH [g]; NA [mg]; NACL [g]; WATER [g]\r\n'
  + '0050; Banány; Bananas; ; 0.64; 6.25; 0; 397; 95; 0.2; -; 0; 0; 0; 21.8; 21.8; 17.3; 1.7; 1.1; 0.8; 1; 0; 74.4\r\n'
  + '0083; Mák  ; Poppy; ; 1.00; 6.25; 0; 2200; 525; 41,6; 4.5; 0; 0; 0; 28; 28; 3; 19.5; 18; 6; 26; 0.07; 6\r\n'
  + 'xx!; špatný řádek\r\n';
const P = c.nutriParseCSV(csv).potraviny;
t('2 potraviny, pole podle hlavičky (kcal, tuky, cukry, sůl, jedlý podíl)', Object.keys(P).length === 2 && P['0050'].kcal === 95 && P['0050'].cukry === 17.3 && P['0050'].sul === 0 && P['0050'].e === 0.64, P);
t('„-“ = chybí (ne nula), desetinná čárka i tečka, nezlomitelné mezery v názvu pryč', !('nasycene' in P['0050']) && P['0083'].tuky === 41.6 && P['0083'].n === 'Mák');
t('soubor bez hlavičky NutriDatabáze se odmítne', !!c.nutriParseCSV('a;b\n1;2').chyba);

console.log('── párovací tabulka (data/nutri-mapa.json) ──');
const hc = { console }; vm.createContext(hc);
vm.runInContext((HE.match(/const NORM_JEDNOTKY_RE_G[^\n]*\n/) || HE.match(/NORM_JEDNOTKY_RE_G\s*=[^\n]*\n/) || [''])[0] + vyber(HE, 'normName') + '\nthis.normName=normName;', hc);
const taxIds = new Set(); TAX.oblasti.forEach(o => o.podkategorie.forEach(p => (p.nazvy || []).forEach(x => taxIds.add(hc.normName(typeof x === 'string' ? x : x.n)))));
const zaznamy = Object.entries(MAPA.mapa);
t('párů aspoň 200, každý obecný název existuje v taxonomii', zaznamy.length >= 200 && zaznamy.every(([id]) => taxIds.has(id)), zaznamy.filter(([id]) => !taxIds.has(id)).map(x => x[0]));
t('jen kódy a jistota – žádné hodnoty živin ani názvy potravin (licence čl. 5)', zaznamy.every(([, v]) => Object.keys(v).every(k => ['k', 'j', 'a'].includes(k)) && /^[0-9A-Za-z]{1,8}$/.test(v.k) && ['jista', 'navrh'].includes(v.j)) && !/kcal|bilkoviny|ENERC/.test(R('nutri-mapa.json', '../data/nutri-mapa.json')));
t('káva záměrně bez páru (hodnoty jsou na 100 g zrn, ne na nápoj)', !MAPA.mapa['kava'] && !MAPA.mapa['zrnkova kava'] && !MAPA.mapa['mleta kava']);
t('rohlík, banán, mrkev, brambory, vejce jisté; chléb, jogurt, pivo jen návrh ke kontrole', ['rohlik', 'banan', 'mrkev', 'brambory', 'vejce'].every(k => MAPA.mapa[k] && MAPA.mapa[k].j === 'jista') && ['chleb', 'jogurt', 'pivo'].every(k => MAPA.mapa[k] && MAPA.mapa[k].j === 'navrh'));
const csvVRepu = (() => { const koren = path.join(__dirname, '..'); const vse = []; const pruchod = d => { if (/node_modules|\.git/.test(d)) return; for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) pruchod(p); else if (/\.csv$/i.test(f.name)) vse.push(p); } };
  try { if (fs.existsSync(path.join(koren, 'js'))) pruchod(koren); } catch (e) {} return vse.filter(p => /OrigFdCd/.test(fs.readFileSync(p, 'latin1'))); })();
t('soubor NutriDatabáze není v repozitáři', !csvVRepu.length, csvVRepu);

console.log('── worker ──');
const r2 = new Map();
const tokeny = { tAdmin: 'LNEC8VNB2QPwIv6WWQ9lqgR4O5v1', tUziv: 'uzivatel1' };
const w = { console, JSON, Date, Object, Array, String, Number, Math, isFinite, Response, Promise, Map, Set,
  fetch: async (url, o) => { const tok = JSON.parse(o.body).idToken; const uid = tokeny[tok]; return { ok: !!uid, json: async () => ({ users: uid ? [{ localId: uid }] : [] }) }; } };
vm.createContext(w);
const kodW = W.replace(/^export default[\s\S]*$/m, '');
vm.runInContext(['const ADMIN_UIDS = [\'LNEC8VNB2QPwIv6WWQ9lqgR4O5v1\'];', (W.match(/const NUTRI_DATA[^\n]*\n/) || [''])[0], (W.match(/const NUTRI_POLE[^\n]*\n/) || [''])[0], (W.match(/const NUTRI_KOD[^\n]*\n/) || [''])[0],
  'let _nutriCache = null;', 'function json(data, status = 200, headers = {}) { return new Response(JSON.stringify(data), { status, headers: { ...headers, "Content-Type": "application/json" } }); }', vyber(W, 'archivAuth'), vyber(W, 'nutriData'), vyber(W, 'nutriMapa'), vyber(W, 'nutriPotravina'), vyber(W, 'handleNutri'), 'this.handleNutri=handleNutri;'].join('\n'), w);
const env = { ARCHIV: { put: async (k, v) => { r2.set(k, v); }, get: async k => r2.has(k) ? { json: async () => JSON.parse(r2.get(k)) } : null } };
const volej = async (cesta, tok, telo) => { const r = await w.handleNutri({ headers: { get: h => h === 'Authorization' && tok ? 'Bearer ' + tok : '' }, json: async () => telo }, env, {}, cesta); return { s: r.status, b: JSON.parse(await r.text()) }; };
const potr = {}; for (let i = 0; i < 80; i++) potr[String(1000 + i)] = { n: 'Potravina ' + i, e: 1, kcal: i }; Object.assign(potr, P);
t('bez přihlášení nic', (await volej('/nutri', null, { kody: ['0050'] })).s === 401);
t('nahrát smí jen admin', (await volej('/nutri-nahrat', 'tUziv', { potraviny: potr })).s === 403 && !r2.size);
const seed = { banan: { k: '0050', j: 'jista' }, mak: { k: '0083', j: 'navrh', a: ['1001', '9999'] }, chleb: { k: '1002', j: 'navrh' } };
let r = await volej('/nutri-nahrat', 'tAdmin', { verze: '11.26', potraviny: potr, mapa: seed });
t('admin nahraje 82 potravin a výchozí párovací tabulku do R2', r.s === 200 && r.b.potravin === 82 && r.b.mapaUlozena && r2.has('nutri/data.json') && r2.has('nutri/mapa.json'), r.b);
t('neznámá alternativa (9999) se při nahrání vyřadí', JSON.parse(r2.get('nutri/mapa.json')).mapa.mak.a.join() === '1001');
r = await volej('/nutri', 'tUziv', { kody: ['0050', 'xyz!', '7777', ...Object.keys(potr)] });
t('/nutri vrátí jen vyžádané existující potraviny (z prvních 60 kódů 59 existuje), s citací', r.s === 200 && Object.keys(r.b.potraviny).length === 59 && r.b.potraviny['0050'].kcal === 95 && !r.b.potraviny['7777'] && /NutriDatabaze\.cz, verze 11\.26, ÚZEI, Praha/.test(r.b.citace), Object.keys(r.b.potraviny).length);
r = await volej('/nutri-mapa', 'tUziv', { vse: true });
t('uživatel dostane jen jisté páry (návrhy ne), bez názvů potravin', r.b.mapa.banan === '0050' && !r.b.mapa.mak && !r.b.mapa.chleb && !r.b.nazvy, r.b);
t('admin dostane celou tabulku s jistotou, alternativami a názvy', (await volej('/nutri-mapa', 'tAdmin', { vse: true })).b.nazvy['0083'] === 'Mák');
t('uložit pár smí jen admin', (await volej('/nutri-mapa-uloz', 'tUziv', { tax: 'mak', k: '0083' })).s === 403);
t('neznámý kód se neuloží', (await volej('/nutri-mapa-uloz', 'tAdmin', { tax: 'mak', k: '7777' })).s === 400);
await volej('/nutri-mapa-uloz', 'tAdmin', { tax: 'mak', k: '0083' }); await volej('/nutri-mapa-uloz', 'tAdmin', { tax: 'banan', k: null });
r = await volej('/nutri-mapa', 'tUziv', {});
t('potvrzený návrh se uživatelům objeví, zrušený pár zmizí', r.b.mapa.mak === '0083' && !r.b.mapa.banan, r.b.mapa);
await volej('/nutri-nahrat', 'tAdmin', { verze: '11.26', potraviny: potr, mapa: seed });
t('nové nahrání CSV adminovy opravy nepřepíše', JSON.parse(r2.get('nutri/mapa.json')).mapa.mak.j === 'ok');
t('worker: cesty /nutri* jsou napojené na handleNutri', /_p === '\/nutri' \|\| _p === '\/nutri-mapa' \|\| _p === '\/nutri-nahrat' \|\| _p === '\/nutri-mapa-uloz'\)\) \{\s*return handleNutri\(request, env, corsHeaders, _p\)/.test(W));

console.log('── pořadí zdrojů a Živiny v nákupu ──');
vm.runInContext("_nutriMapa = { banan: '0050', rohlik: '0400' }; _nutriHodnoty = { '0050': { n: 'Banány', e: 0.64, kcal: 95, cukry: 17.3, tuky: 0.2, sul: 0 } };", c);
c.rpMapaNavrh = name => ({ tax: { id: /ban/i.test(name) ? 'banan' : /rohl/i.test(name) ? 'rohlik' : 'x' } });
t('bez čárového kódu nebo s kódem obchodu (2…) ano, s čárovým kódem výrobku nikdy', c.nutriBezKodu('') && c.nutriBezKodu('2001234000000') && !c.nutriBezKodu('8594001234567'));
t('Banány bez kódu → hodnoty, zdroj nutri, jedlý podíl 0,64', (() => { const n = c.nutriProPolozku({ name: 'Banány' }); return n && n.kcal === 95 && n.zdroj === 'nutri' && n.jedle === 0.64; })());
t('balený výrobek s čárovým kódem NutriDatabázi nedostane (žádné odhady)', c.nutriProPolozku({ name: 'Banány chips', ean: '8594001234567' }) === null);
t('rohlík: pár je, hodnota chybí → poznamená se k dotažení', c.nutriProPolozku({ name: 'Rohlík' }) === null && vm.runInContext("_nutriChybi.has('0400')", c));
const d = { console, Math, Set, Date, Object, String, parseFloat, isFinite, normName: x => x, lineAmt: it => it.lineTotal, rpVazene: it => it.unit === 'kg', gramazPolozky: () => null, cenyKodPolozky: () => '01.1' };
vm.createContext(d);
vm.runInContext(['const DNA_ZIVINY = ' + (RC.match(/const DNA_ZIVINY = (\[[\s\S]*?\]);/) || [, '[]'])[1] + ';', vyber(RC, 'dnaKartaPolozky'), vyber(RC, 'dnaMnozstvi'), vyber(RC, 'dnaJeJidlo'), vyber(RC, 'dnaZivinyData'), 'this.D=dnaZivinyData;this.K=dnaKartaPolozky;'].join('\n'), d);
const uct = [{ store: 'Penny', date: '2026-11-11', total: 60, items: [{ name: 'Banány', qty: 1, unit: 'kg', price: 30, lineTotal: 30 }, { name: 'Oreo', ean: '8594001234567', qty: 1, price: 30, lineTotal: 30 }] }];
const nutriF = it => c.nutriProPolozku(it);
const z = d.D(uct, 10, 2026, () => null, () => null, () => false, nutriF);
t('1 kg banánů = 640 g jedlého podílu → 608 kcal, 110,7 g cukru', z.gramu === 640 && Math.round(z.sum.kcal) === 608 && Math.round(z.sum.cukry * 10) === 1107 && z.zNutri === 1, z);
t('Oreo s kódem bez dat z Open Food Facts zůstane v „chybí“ (nedostane NutriDatabázi)', z.chybi.includes('Oreo') && z.pokrytoPolozek === 1);
t('ruční zápis (osobní karta) má přednost před NutriDatabází', d.K({ name: 'Banány' }, () => null, () => ({ nutrice: { kcal: 89, zdroj: 'rucne' } }), nutriF).n.kcal === 89);
t('bez 7. parametru (starší volání) se počítá jako dřív', d.D(uct, 10, 2026, () => null, () => null).pokrytoPolozek === 0);
t('Živiny v nákupu: počet položek z NutriDatabáze a citace pod tabulkou, dotažení na pozadí', /d\.zNutri \?[\s\S]{0,300}orientační hodnoty z NutriDatabáze[\s\S]{0,120}nutriCitaceHTML\(\)/.test(RC) && /nutriNactiAKresli\(kresli\)/.test(vyber(RC, 'dnaZivinyKresli')));
t('citace podle licence čl. 6', /Na základě dat z NutriDatabaze\.cz, verze 11\.26, ÚZEI, Praha/.test(c.nutriCitaceHTML()) && /uzei\.cz/.test(c.nutriCitaceHTML()));

console.log('── karta výrobku (Mapa položek, Moje výrobky) a admin ──');
const karta = vyber(RC, 'mapaUzivKartaHTML');
t('karta: NutriDatabáze až za fotkou, ručním zápisem a Open Food Facts, jen bez kódu / s kódem obchodu', /const zivNutri = !\(\(p && \(p\.nutriceObal \|\| p\.nutrice\)\) \|\| lok\.nutrice\) && !lok\.bezZivin && z\.tax && typeof nutriBezKodu === 'function' && nutriBezKodu\(z\.ean\)/.test(karta) && /const zivN = \(p && \(p\.nutriceObal \|\| p\.nutrice\)\) \|\| lok\.nutrice \|\| zivNutri \|\| null;/.test(karta));
t('karta: zdroj „🥕 NutriDatabáze · orientační hodnoty na 100 g jedlého podílu“ s názvem a citací', /zivNutri && typeof nutriZdrojHTML === 'function' \? nutriZdrojHTML\(zivNutri\)/.test(karta) && /🥕 NutriDatabáze · orientační hodnoty na 100 g jedlého podílu/.test(c.nutriZdrojHTML({ nazev: 'Banány', jedle: 0.64 })) && /jedlý podíl 64 %/.test(c.nutriZdrojHTML({ nazev: 'Banány', jedle: 0.64 })));
t('karta: hodnoty se dotáhnou na pozadí a karta se překreslí', /nutriNactiAKresli\(\(\) => \{ if\(_mapaKartaI === i/.test(vyber(RC, 'mapaUzivDetail')));
t('Admin → 🥕 NutriDatabáze: záložka, obsah a načtení', /id="atab-nutri"/.test(A) && /id="adminNutriBody"/.test(A) && /'uloziste','nutri'\]\.forEach/.test(A) && /tab==='nutri' && typeof renderAdminNutri==='function'/.test(A));
t('nutri.js je v app.html', /<script src="js\/nutri\.js\?v=[0-9a-f]{16}"/.test(H));
t('bez přihlášení appka nic nevolá a nezacyklí se', await c.nutriNacti() === false);

console.log(`\nnutri: ${ok} ✓  ${bad} ✗`);
process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
