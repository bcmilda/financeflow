// smoke_ikony.js — S25 (v11.58, TODO-323): vlastní SVG ikony (js/ikony.js) a jejich
// automatické přiřazení k položkám přes taxonomii. node tools/smoke_ikony.js
const fs = require('fs'), path = require('path');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const R = (...c) => fs.readFileSync(najdi(...c), 'utf8');
const IK = require(najdi('ikony.js', '../js/ikony.js'));
const tax = JSON.parse(R('taxonomie.json', '../data/taxonomie.json'));
const rc = R('receipts.js', '../js/receipts.js'), ean = R('ean-sken.js', '../js/ean-sken.js'), app = R('app.html', '../app.html');
let pass = 0, fail = 0;
const ok = (n, c, x) => { c ? (pass++, console.log('  ✅', n)) : (fail++, console.log('  ❌', n, x !== undefined ? JSON.stringify(x) : '')); };
console.log('smoke_ikony.js');

// ── sada ──
const oblasti = tax.oblasti.map(o => o.id);
const podkat = new Set(tax.oblasti.flatMap(o => o.podkategorie.map(p => p.id)));
ok('každá ze 13 oblastí má ikonu i barvu', oblasti.length === 13 && oblasti.every(id => IK.FF_IKONY[id] && /^#[0-9a-f]{6}$/.test(IK.FF_IKONY_BARVY[id])), oblasti.filter(id => !IK.FF_IKONY[id]));
ok('mapa podkategorií míří na existující ikony a existující podkategorie',
  Object.entries(IK.FF_IKONY_PODKAT).every(([p, i]) => podkat.has(p) && IK.FF_IKONY[i]),
  Object.entries(IK.FF_IKONY_PODKAT).filter(([p, i]) => !podkat.has(p) || !IK.FF_IKONY[i]));
ok('ikony karty výrobku existují', ['vyrobek', 'zarazeni', 'uctenka', 'slozeni', 'nakupy', 'kraj', 'ean', 'foto', 'upravit', 'skenovat', 'nezname'].every(i => IK.FF_IKONY[i]));
const dOk = Object.entries(IK.FF_IKONY).every(([, [o, f]]) => [o, f].join('').replace(/<(path|circle|rect|ellipse) [^>]*\/>/g, '') === '' && (o + f).match(/ d="[^"]*"/g)?.every(d => /^ d="[MmLlHhVvCcSsQqTtAaZz0-9 .,\-]+"$/.test(d)) !== false);
ok('obrys i výplň obsahují jen path/circle/rect/ellipse s platnými daty', dOk);

// ── výstup ──
const s = IK.ffIkona('jogurty', 20);
ok('ffIkona: SVG 24×24, tah 1,75, currentColor, skrytá pro čtečku', /^<svg class="ff-ik" viewBox="0 0 24 24" width="20" height="20"/.test(s) && s.includes('stroke-width="1.75"') && s.includes('stroke="currentColor"') && s.includes('aria-hidden="true"') && s.endsWith('</svg>'));
ok('styl B: výplň stejnou barvou na 22 %', s.includes('fill-opacity=".22"'));
ok('styl obrys jde vypnout výplní', !IK.ffIkona('jogurty', 20, { styl: 'obrys' }).includes('fill-opacity'));
ok('neznámé id → ikona Nezařazené', IK.ffIkona('neexistuje', 20) === IK.ffIkona('nezname', 20));
ok('titulek se escapuje a dá role="img"', /role="img" aria-label="a &lt;b&gt; &quot;c&quot;"/.test(IK.ffIkona('foto', 20, { titulek: 'a <b> "c"' })));
ok('barva projde jen jako hex / var(--x) / slovo', IK.ffIkona('foto', 20, { barva: '#4ade80' }).includes('color:#4ade80;') && !IK.ffIkona('foto', 20, { barva: 'red;background:url(x)' }).includes('url('));

// ── automatické přiřazení ──
ok('jogurt → vlastní ikona podkategorie v barvě Potravin', JSON.stringify(IK.ffIkonaTax({ oblastId: 'potraviny', podId: 'jogurty' })) === JSON.stringify({ id: 'jogurty', barva: '#4ade80' }));
ok('uzeniny → maso (sdílená ikona)', IK.ffIkonaTax({ oblastId: 'potraviny', podId: 'uzeniny' }).id === 'maso');
ok('podkategorie bez vlastní ikony → ikona oblasti (pivo → Alkohol)', JSON.stringify(IK.ffIkonaTax({ oblastId: 'alkohol', podId: 'pivo' })) === JSON.stringify({ id: 'alkohol', barva: '#f59e0b' }));
ok('mimo taxonomii → šedá Nezařazené', IK.ffIkonaTax(null).id === 'nezname' && IK.ffIkonaTax({ oblastId: 'xx' }).id === 'nezname');
ok('všech 139 podkategorií dostane ikonu (vlastní nebo oblasti)', tax.oblasti.every(o => o.podkategorie.every(p => IK.ffIkonaTax({ oblastId: o.id, podId: p.id }).id !== 'nezname')));
global.taxInfo = id => id === 'jogurt' ? { podId: 'jogurty', oblastId: 'potraviny' } : null;
global.taxNavrh = t => /pivo/i.test(t) ? { info: { podId: 'pivo', oblastId: 'alkohol' } } : null;
ok('výrobek s kódem: obecný název z databáze, jinak zkratka z účtenky',
  IK.ffIkonaTaxVyrobku({ obecnyId: 'jogurt' }, []).podId === 'jogurty' && IK.ffIkonaTaxVyrobku({}, ['Pivo Radegast 10']).oblastId === 'alkohol' && IK.ffIkonaTaxVyrobku(null, ['xyz']) === null);
const dl = IK.ffIkonaDlazdice({ oblastId: 'potraviny', podId: 'jogurty' }, 76, 40);
ok('dlaždice: barva oblasti, tónované pozadí, ikona uvnitř', dl.includes('width:76px') && dl.includes('background:#4ade8024') && dl.includes('color:#4ade80') && dl.includes('width="40"'));

// ── zapojení ──
const iIk = app.indexOf('js/ikony.js?v='), iTax = app.indexOf('js/taxonomie.js?v='), iRc = app.indexOf('js/receipts.js?v=');
ok('app.html načítá ikony.js před taxonomií a účtenkami', iIk > 0 && iIk < iTax && iIk < iRc);
ok('karta výrobku: ikony u nadpisů bloků', /const MK_IK = \{ 'Výrobek': 'vyrobek', 'Zařazení': 'zarazeni'/.test(rc) && rc.includes("${MK_IK[t] ? rpIk(MK_IK[t], 17) : ''}${t}"));
ok('karta výrobku: dlaždice podle taxonomie místo emoji', rc.includes("rpIkDlazdice(z.tax, 76, 40,") && rc.includes("rpIkDlazdice(z.tax, 38, 22,"));
ok('Zařazení: ikona oblasti a kategorie', rc.includes('ffIkonaOblasti(z.tax.oblastId, 18)') && rc.includes('rpIkTax(z.tax, 18)'));
ok('Zdražování, Za co utrácíš a převod do rozpočtu nesou podId + oblastId', rc.includes('id: m.tax.podId, podId: m.tax.podId, oblastId: m.tax.oblastId') && rc.includes('podNazev: m.tax.podNazev, podId: m.tax.podId, oblastId: m.tax.oblastId') && rc.includes('oblastId:z.tax.oblastId'));
ok('bez modulu ikon zůstanou emoji (záloha)', rc.includes("if (typeof ffIkonaTax !== 'function') return escHtml(tax ? tax.ikona : '📦');") && rc.includes("rpIk('skenovat', 16) || '▮▮'"));
ok('📦 Moje výrobky: dlaždice podle taxonomie výrobku', ean.includes('ffIkonaDlazdice(ffIkonaTaxVyrobku(p, z.nazvy), 38, 22)'));

console.log(`\n${pass} ✅  ${fail} ❌`);
process.exit(fail ? 1 : 0);
