// FinanceFlow · v11.96 · dotazy.js · 2026-10-21
// ══════════════════════════════════════════════════════════════════════
//  🔎 ZEPTEJ SE SVÝCH DAT (Session 27, Milan: „najdi mi, kolik utrácím za kávu – kavárny, restaurace,
//  nákup kávy v obchodě, zelené tagy káva/kafe“, „jak často chodím do obchodu“, „kolik kupuju pečiva“,
//  „důležité je, jestli to uživatel chce za měsíc, rok, celou historii, a jestli tabulku, číslo,
//  statistiku nebo graf“)
//  cesta: menu → AI Asistent → 🤖 AI Rádce → 🔎 Zeptej se svých dat
//
//  AI otázku jen POCHOPÍ – vrátí plán hledání (pojmy i s obměnami, kategorie, štítky, obchody,
//  co měřit, období, rozpad, výstup). Dostane jen otázku a NÁZVY tvých kategorií, štítků a obchodů,
//  žádné částky. Počítá appka ze všech dat (transakce, položky účtenek, štítky, obchody) – čísla jsou
//  přesná a dají se ověřit („Co jsem započítal“). Bez AI (nepřihlášen, chyba) appka otázku rozpozná
//  sama podle slov. Období, míru, rozpad i výstup jde po odpovědi přepnout bez nového dotazu.
//
//  Každá útrata se počítá JEDNOU: transakce, která sedí celá (kategorie, obchod, tvůj štítek, název),
//  jde celá; jinak se z ní berou jen sedící položky účtenky (káva u benzínky = jen káva).
//  Přesuny, rozpady a vyrovnání se nepočítají (SKILL 20), cizí měny přes txCZK.
//  Worker beze změny – plán vrací stávající typ „chat“ (odpověď jen JSON).
// ══════════════════════════════════════════════════════════════════════

const DOT_OBDOBI = { mesic: 'Tento měsíc', '30d': '30 dní', rok: 'Letos', '12m': '12 měsíců', vse: 'Celá historie' };
const DOT_MIRA = { utrata: 'Útrata', pocet: 'Počet nákupů', mnozstvi: 'Množství (ks)' };
const DOT_ROZPAD = { mesic: 'Po měsících', tyden: 'Po týdnech', den: 'Dny v týdnu', obchod: 'Po obchodech', polozka: 'Po položkách' };
const DOT_VYSTUP = { cislo: 'Číslo', statistika: 'Statistika', graf: 'Graf', tabulka: 'Tabulka' };
const DOT_DNY = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
const DOT_DNY_V = ['v pondělí', 'v úterý', 've středu', 've čtvrtek', 'v pátek', 'v sobotu', 'v neděli'];
const DOT_OBDOBI_VETA = { mesic: 'tento měsíc', '30d': 'za posledních 30 dní', rok: 'letos', '12m': 'za posledních 12 měsíců', vse: 'za celou historii' };
const DOT_PRIKLADY = [
  'Kolik utrácím za kávu?',
  'Jak často chodím nakupovat potraviny?',
  'Kolik kupuju pečiva za měsíc?',
  'Kolik mě letos stál alkohol?',
  'Ve kterém obchodě utrácím nejvíc? Tabulka',
  'Restaurace po měsících za celou historii – graf',
];
//  Obměny pro rozpoznání bez AI (bez diakritiky; slovo do 3 písmen musí sedět celé, delší od začátku)
const DOT_SYNONYMA = {
  kav: ['kava', 'kavu', 'kavy', 'kafe', 'kafi', 'espresso', 'cappuccino', 'capuccino', 'latte', 'americano', 'nescafe', 'jacobs', 'tchibo', 'lavazza', 'dolce gusto', 'kavarna', 'kavarny', 'starbucks', 'costa coffee', 'coffee'],
  kaf: ['kava', 'kavu', 'kavy', 'kafe', 'kafi', 'espresso', 'cappuccino', 'latte', 'kavarna', 'coffee'],
  peci: ['pecivo', 'rohlik', 'rohliky', 'chleb', 'chleba', 'houska', 'housky', 'kobliha', 'koblihy', 'bageta', 'croissant', 'kaiserka', 'veka', 'loupak', 'buchta', 'kolac', 'pekarna', 'donut'],
  alko: ['alkohol', 'pivo', 'piva', 'vino', 'vina', 'rum', 'vodka', 'whisky', 'slivovice', 'fernet', 'becherovka', 'radler', 'prosecco', 'sekt', 'gin', 'tequila', 'liker'],
  piv: ['pivo', 'piva', 'radler', 'lezak', 'pilsner', 'kozel', 'gambrinus', 'radegast', 'budvar', 'staropramen', 'velkopopovicky'],
  cigar: ['cigarety', 'cigaret', 'tabak', 'iqos', 'heets', 'terea', 'marlboro', 'camel', 'trafika'],
  slad: ['sladkosti', 'cokolada', 'cokolad', 'bonbon', 'tycinka', 'susenky', 'oplatky', 'milka', 'orion', 'lindt', 'haribo', 'zmrzlina', 'dort', 'kolac'],
  mas: ['maso', 'masa', 'kure', 'kureci', 'veprove', 'hovezi', 'mlete', 'rizek', 'slanina', 'uzeniny', 'salam', 'sunka', 'klobasa', 'parky', 'reznictvi'],
  mlec: ['mleko', 'mleka', 'jogurt', 'syr', 'syry', 'tvaroh', 'maslo', 'smetana', 'eidam', 'gouda', 'mlecne'],
  ovoc: ['ovoce', 'jablka', 'jablko', 'banany', 'banan', 'pomeranc', 'mandarinky', 'hrozny', 'jahody'],
  zelen: ['zelenina', 'rajce', 'rajcata', 'okurka', 'paprika', 'brambory', 'cibule', 'mrkev', 'salat'],
  energ: ['energy', 'monster', 'red bull', 'redbull', 'semtex', 'big shock', 'tiger'],
  benz: ['benzin', 'nafta', 'natural', 'diesel', 'palivo', 'tankovani', 'cerpaci', 'mol', 'orlen', 'omv', 'shell'],
};

//  Jak to napsat do věty („Za kávu: …“)
const DOT_NAZVY = { kav: 'kávu', kaf: 'kávu', peci: 'pečivo', alko: 'alkohol', piv: 'pivo', cigar: 'cigarety', slad: 'sladkosti', mas: 'maso', mlec: 'mléčné výrobky', ovoc: 'ovoce', zelen: 'zeleninu', energ: 'energy drinky', benz: 'palivo' };

// ── text ───────────────────────────────────────────────────────────────
function dotBez(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function dotTokeny(t) { return dotBez(t).replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean); }
//  Sedí text na některý pojem? Vrací pojem nebo ''. Krátké (do 3 písmen) celé slovo, delší od začátku slova,
//  víceslovné jako sousední slova (poslední od začátku).
function dotSedi(text, pojmy) {
  if (!text || !pojmy || !pojmy.length) return '';
  const tok = dotTokeny(text); if (!tok.length) return '';
  for (const p of pojmy) {
    const ws = dotTokeny(p); if (!ws.length) continue;
    for (let i = 0; i + ws.length <= tok.length; i++) {
      if (ws.every((w, j) => { const t = tok[i + j]; if (w.length <= 3) return t === w; if (j < ws.length - 1) return t === w;
        //  dlouhé slovo i v jiném tvaru: „potraviny“ ~ „potravin“, „restaurace“ ~ „restaurací“ (kmen bez 2 posledních písmen)
        return t.startsWith(w) || (w.length >= 7 && t.startsWith(w.slice(0, w.length - 2))); })) return p;
    }
  }
  return '';
}

// ── data ───────────────────────────────────────────────────────────────
function _dotStat(t) { return t && t.type === 'expense' && !t.splitParent && !t.isBalancing && !(typeof isTransferTx === 'function' && isTransferTx(t)); }
function _dotCZK(t, D) { return typeof txCZK === 'function' ? txCZK(t, D) : (t.amount || t.amt || 0); }
function _dotDen(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function _dotMes(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
function _dotLine(it) { return typeof lineAmt === 'function' ? lineAmt(it) : ((parseFloat(it.lineTotal) || (parseFloat(it.price) || 0) * (parseFloat(it.qty) || 1))); }
function dotRozsah(obdobi, dnes) {
  dnes = _dotDen(dnes || new Date());
  const konec = new Date(dnes); konec.setHours(23, 59, 59, 999);
  if (obdobi === 'mesic') return { od: new Date(dnes.getFullYear(), dnes.getMonth(), 1), do: konec };
  if (obdobi === '30d') { const od = new Date(dnes); od.setDate(od.getDate() - 29); return { od, do: konec }; }
  if (obdobi === 'rok') return { od: new Date(dnes.getFullYear(), 0, 1), do: konec };
  if (obdobi === 'vse') return { od: null, do: konec };
  const od = new Date(dnes.getFullYear(), dnes.getMonth() - 11, 1); return { od, do: konec };   // 12m
}
//  Nejčastější štítky a obchody (pro AI – jen názvy, ne částky).
function dotSlovnik(D) {
  const st = {}, ob = {};
  (D.transactions || []).forEach(t => {
    if (!_dotStat(t)) return;
    const o = String(t.receiptStore || '').trim(); if (o) ob[o] = (ob[o] || 0) + 1;
    (typeof parseTxTags === 'function' ? parseTxTags(t) : []).forEach(x => { st[x] = (st[x] || 0) + 1; });
    (t.receiptItems || []).forEach(it => { if (it && it.tag) st[it.tag] = (st[it.tag] || 0) + 1; });
  });
  const top = (o, n) => Object.keys(o).sort((a, b) => o[b] - o[a]).slice(0, n);
  return { stitky: top(st, 80), obchody: top(ob, 60) };
}

//  Výpočet. plan = {pojmy[], kategorie['cat|' | 'cat|sub'], stitky[], obchody[], vse, obdobi, vypnout[]}
//  → {zaznamy[{d, kc, ks, obchod, nazev, zdroj, txId, proc}], zdroje{…}, pojmyNalez{…}, rozsah}
function dotazSpocitej(D, plan, dnes) {
  plan = plan || {};
  const roz = dotRozsah(plan.obdobi || '12m', dnes);
  const pojmy = (plan.pojmy || []).map(String).filter(Boolean);
  const stitky = (plan.stitky || []).map(String).filter(Boolean);
  const hledej = pojmy.concat(stitky);
  const obchody = (plan.obchody || []).map(String).filter(Boolean);
  const kat = new Set(plan.kategorie || []);
  const vyp = new Set(plan.vypnout || []);
  const katSedi = (c, s) => kat.has(c + '|') || (s && kat.has(c + '|' + s));
  const zaznamy = [], zdroje = {}, pojmyNalez = {};
  const pridej = (z) => { if (vyp.has(z.zdroj)) return false; zaznamy.push(z); zdroje[z.zdroj] = (zdroje[z.zdroj] || 0) + 1; if (z.proc) pojmyNalez[z.proc] = (pojmyNalez[z.proc] || 0) + 1; return true; };
  (D.transactions || []).forEach(t => {
    if (!_dotStat(t)) return;
    const d = _dotDen(t.date); if (isNaN(d) || d > roz.do || (roz.od && d < roz.od)) return;
    const obchod = String(t.receiptStore || t.name || '').trim();
    const kc = _dotCZK(t, D), polozky = Array.isArray(t.receiptItems) ? t.receiptItems : [];
    const zaklad = { d, obchod, txId: t.id, nazev: t.name || obchod };
    if (plan.vse) { pridej(Object.assign({ kc, ks: 1, zdroj: 'vse' }, zaklad)); return; }
    //  1) transakce celá
    const c = t.catId || t.category;
    let zdroj = '', proc = '';
    if (kat.size && katSedi(c, t.subcat)) { zdroj = 'kategorie'; proc = _dotKatNazev(D, c, t.subcat); }
    else if (obchody.length && obchody.some(o => dotBez(obchod).includes(dotBez(o)))) { zdroj = 'obchod'; proc = obchod; }
    else if (hledej.length && t.receiptStore && (proc = dotSedi(t.receiptStore, hledej))) zdroj = 'obchod';
    else if (hledej.length && Array.isArray(t.tags) && (proc = t.tags.map(x => dotSedi(x, hledej)).find(Boolean) || '')) zdroj = 'stitek';
    else if (hledej.length && !polozky.length && (proc = dotSedi((t.name || '') + ' ' + (t.note || ''), hledej))) zdroj = 'transakce';
    if (zdroj && pridej(Object.assign({ kc, ks: 1, zdroj, proc }, zaklad))) return;
    if (zdroj) return;   // vypnutý zdroj – položky se nepřebírají (transakce sedí celá)
    //  2) jen sedící položky účtenky
    if (!polozky.length) return;
    const fx = (t.amount || 0) ? kc / t.amount : 1;
    polozky.forEach(it => {
      if (!it || !it.name) return;
      let z = '', p = '';
      if (kat.size && it.itemCatId && katSedi(it.itemCatId, it.itemSubcat)) { z = 'polozkaKat'; p = _dotKatNazev(D, it.itemCatId, it.itemSubcat); }
      else if (hledej.length && it.tag && (p = dotSedi(it.tag, hledej))) z = 'stitek';
      else if (hledej.length && (p = dotSedi(it.name + ' ' + _dotEanNazev(it), hledej))) z = 'polozka';
      if (!z) return;
      const ks = Math.abs(parseFloat(it.qty) || 1);
      pridej({ d, obchod, txId: t.id, nazev: it.name, kc: _dotLine(it) * fx, ks: /^(kg|l)$/i.test(String(it.unit || '')) ? 1 : ks, zdroj: z, proc: p });
    });
  });
  return { zaznamy, zdroje, pojmyNalez, rozsah: roz };
}
function _dotKatNazev(D, c, s) { const k = (D.categories || []).find(x => x.id === c); return (k ? k.name : c) + (s ? ' › ' + s : ''); }
function _dotEanNazev(it) {
  if (!it || !it.ean || typeof eanProduktZCache !== 'function') return '';
  const p = eanProduktZCache(it.ean); return p && p.stav === 'nalezeno' && typeof eanNazevVyrobku === 'function' ? eanNazevVyrobku(p, it.ean) : '';
}

//  Souhrny a rozpady
function dotazSouhrn(v, rozpad, dnes) {
  const z = v.zaznamy;
  const kc = z.reduce((a, x) => a + x.kc, 0), ks = z.reduce((a, x) => a + x.ks, 0);
  const nakupu = new Set(z.map(x => x.txId)).size;
  dnes = _dotDen(dnes || new Date());
  const prvni = z.length ? new Date(Math.min.apply(null, z.map(x => +x.d))) : null;
  const od = v.rozsah.od || prvni || dnes;
  const dni = Math.max(1, Math.round((Math.min(+v.rozsah.do, +dnes + 86399999) - +od) / 86400000) + 0);
  const mesicu = Math.max(1, dni / 30.44), tydnu = Math.max(1, dni / 7);
  const skup = (klic) => {
    const o = {};
    z.forEach(x => { const k = klic(x); const s = o[k] || (o[k] = { klic: k, kc: 0, ks: 0, tx: new Set() }); s.kc += x.kc; s.ks += x.ks; s.tx.add(x.txId); });
    return Object.values(o).map(s => ({ klic: s.klic, kc: s.kc, ks: s.ks, pocet: s.tx.size }));
  };
  let radky;
  if (rozpad === 'obchod') radky = skup(x => x.obchod || '—').sort((a, b) => b.kc - a.kc);
  else if (rozpad === 'polozka') radky = skup(x => x.nazev || '—').sort((a, b) => b.kc - a.kc);
  else if (rozpad === 'den') { const s = skup(x => (x.d.getDay() + 6) % 7); radky = DOT_DNY.map((n, i) => Object.assign({ klic: i, kc: 0, ks: 0, pocet: 0 }, s.find(r => r.klic === i) || {}, { popis: n })); }
  else if (rozpad === 'tyden') {
    const pon = d => { const x = new Date(d); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x; };
    const s = skup(x => +pon(x.d)); const map = {}; s.forEach(r => { map[r.klic] = r; });
    radky = [];
    if (z.length) for (let t = pon(v.rozsah.od || prvni); t <= dnes; t.setDate(t.getDate() + 7)) radky.push(Object.assign({ kc: 0, ks: 0, pocet: 0 }, map[+t] || {}, { klic: +t, popis: t.getDate() + '. ' + (t.getMonth() + 1) + '.' }));
  } else {
    const s = skup(x => _dotMes(x.d)); const map = {}; s.forEach(r => { map[r.klic] = r; });
    radky = [];
    if (z.length) for (let m = new Date((v.rozsah.od || prvni).getFullYear(), (v.rozsah.od || prvni).getMonth(), 1); m <= dnes; m.setMonth(m.getMonth() + 1)) {
      const k = _dotMes(m); radky.push(Object.assign({ kc: 0, ks: 0, pocet: 0 }, map[k] || {}, { klic: k, popis: (typeof CZ_M !== 'undefined' ? CZ_M[m.getMonth()].slice(0, 3) : m.getMonth() + 1) + ' ' + String(m.getFullYear()).slice(2) }));
    }
  }
  radky.forEach(r => { if (r.popis == null) r.popis = String(r.klic); });
  const obch = skup(x => x.obchod || '—').sort((a, b) => b.pocet - a.pocet || b.kc - a.kc);
  const dnyT = skup(x => (x.d.getDay() + 6) % 7).sort((a, b) => b.pocet - a.pocet);
  return { kc, ks, nakupu, dni, mesicu, tydnu, prvni, radky,
    naMesic: kc / mesicu, naNakup: nakupu ? kc / nakupu : 0, tydne: nakupu / tydnu,
    obchod: obch[0] || null, den: dnyT[0] ? DOT_DNY_V[dnyT[0].klic] : '' };
}

// ── plán: rozpoznání bez AI ────────────────────────────────────────────
//  Slova z původní otázky (s diakritikou) odpovídající nalezenému textu – pro větu ve výsledku.
function _dotPuvodni(otazka, co) {
  const chci = new Set(dotTokeny(co));
  const sl = String(otazka || '').split(/[^\p{L}\p{N}]+/u).filter(w => chci.has(dotBez(w)));
  return sl.length ? sl.join(' ').toLowerCase() : co;
}
function dotPlanLokalne(otazka, D) {
  const q = dotBez(otazka);
  const p = { obdobi: '12m', mira: 'utrata', rozpad: 'mesic', vystup: 'cislo', pojmy: [], kategorie: [], stitky: [], obchody: [], vse: false, zdroj: 'lokalne' };
  if (/tento mesic|tenhle mesic|v tomto mesici|tento mesic|za tento mesic|tomhle mesici/.test(q)) p.obdobi = 'mesic';
  else if (/letos|tento rok|letosni|za rok|tento rok/.test(q)) p.obdobi = 'rok';
  else if (/celou historii|cela historie|celkem|od zacatku|za celou dobu|vsechno|vubec/.test(q)) p.obdobi = 'vse';
  else if (/poslednich 30|30 dni|za posledni mesic|tento tyden|za tyden/.test(q)) p.obdobi = '30d';
  if (/jak casto|kolikrat|kolik krat|pocet nakupu|kolik nakupu|navstev/.test(q)) p.mira = 'pocet';
  else if (/kolik kusu|\bkusu\b|\bks\b/.test(q)) p.mira = 'mnozstvi';
  if (/tabulk/.test(q)) p.vystup = 'tabulka';
  else if (/graf/.test(q)) p.vystup = 'graf';
  else if (/statistik|prumer|za mesic|mesicne|tydne|za tyden/.test(q) || p.mira === 'pocet') p.vystup = 'statistika';
  if (/po tydnech|tyden po tydnu/.test(q)) p.rozpad = 'tyden';
  else if (/ktery den|den v tydnu|dny v tydnu|ve ktere dny/.test(q)) p.rozpad = 'den';
  else if (/obchod|kde /.test(q) && /nejvic|kde|ktery|kterem|po obchodech/.test(q)) p.rozpad = 'obchod';
  else if (/po polozkach|ktere polozky|co nejvic/.test(q)) p.rozpad = 'polozka';
  //  co hledat: slova po „za / na / do / kupuju …“ bez slov o období a výstupu
  const vycisti = s => s.replace(/[^a-z0-9 ]+/g, ' ').replace(/\b(tento|tenhle|tomto|tomhle|mesic|mesici|mesicne|letos|rok|roce|rocne|za|celou|historii|historie|celkem|od|zacatku|posledni|poslednich|dni|tyden|tydne|tabulka|tabulku|tabulkou|graf|grafu|grafem|statistika|statistiku|po|mesicich|tydnech|obchodech|polozkach|a|v|ve|jako|prosim|mi|me|mne|vsechno|kolik|jak|casto|kolikrat|krat|utracim|utratim|davam|platim|stoji|stal|stala|stalo|stali|kupuju|kupuji|nakupuju|nakupuji|chodim|piju|jim|kc|korun|penez|nejvic|nejmene|nejmin|kde|ktery|kterem|ktere|kterou|obchode|ukaz|zobraz|najdi|spocitej|vypis|chci|videt|udelej|mam|jsem|za|na|do|se|si|je)\b/g, ' ').replace(/\s+/g, ' ').trim();
  let co = '';
  const m = q.match(/(?:utracim|utratim|davam|utracime|platim|stoji|stal[aiy]?|kupuju|kupuji|kupujeme|nakupuju|nakupuji|piju|jim|chodim)\s+(?:za\s+|na\s+|do\s+)?(.+)/);
  co = vycisti(m ? m[1] : q);
  if (!co && m) co = vycisti(q);
  if (/^(nakupovat|nakup|nakupy|obchodu|obchod|obchodech|do obchodu)(\s|$)/.test(co) || (!co && /nakupovat|do obchodu/.test(q))) {
    //  „jak často chodím nakupovat (potraviny)“ – nákupy = transakce z účtenek / kategorie nákupů
    co = vycisti(co.replace(/^(nakupovat|nakup|nakupy|obchodu|obchod|obchodech|do obchodu)\s*/, ''));
    if (!co) p.kategorie = (D.categories || []).filter(c => (c.type === 'expense' || c.type === 'both') && /nakup|potravin|supermarket|drogeri/i.test(dotBez(c.name))).map(c => c.id + '|');
  }
  if (!co && !p.kategorie.length) { if (/obchod|kde|utracim|utrata|vydaj/.test(q)) p.vse = true; }
  if (co) {
    const slova = dotTokeny(co);
    const klic = Object.keys(DOT_SYNONYMA).find(k => slova.some(w => w.startsWith(k)));
    p.pojmy = klic ? DOT_SYNONYMA[klic].slice() : [co];
    if (!klic && slova.length > 1) p.pojmy = p.pojmy.concat(slova.filter(w => w.length >= 4));
    //  kategorie / podkategorie, jejichž název sedí
    //  Celá kategorie jen tehdy, když je o jednom tématu. „Restaurace & Kavárny“ pro kávu NE (v restauraci
    //  se platí i jídlo) – vezme se podkategorie Kavárna, z ostatních transakcí jen položky s kávou.
    (D.categories || []).forEach(c => {
      if (!(c.type === 'expense' || c.type === 'both' || !c.type)) return;
      const vic = /&|,|\+|\ba\b/.test(dotBez(c.name));
      const subSedi = (c.subs || []).filter(s => dotSedi(s, p.pojmy));
      if (dotSedi(c.name, p.pojmy) && !(vic && subSedi.length)) p.kategorie.push(c.id + '|');
      else subSedi.forEach(s => p.kategorie.push(c.id + '|' + s));
    });
    p.nazev = (klic && DOT_NAZVY[klic]) || _dotPuvodni(otazka, co);
  }
  p.nazev = p.nazev || (p.vse ? 'všechny výdaje' : p.kategorie.length ? 'nákupy' : '');
  return p;
}

// ── plán: AI ───────────────────────────────────────────────────────────
function dotPromptAI(otazka, D) {
  const kats = (D.categories || []).filter(c => c.type === 'expense' || c.type === 'both').map(c => `${c.id}|${c.name}${(c.subs || []).length ? ' [' + c.subs.join(', ') + ']' : ''}`).join('\n');
  const sl = dotSlovnik(D);
  return `Jsi převodník otázky na plán hledání v osobních financích. NEODPOVÍDEJ na otázku, vrať POUZE JSON bez dalšího textu.
Otázka uživatele: "${String(otazka).slice(0, 300).replace(/"/g, "'")}"

Kategorie výdajů (id|název [podkategorie]):
${kats}

Štítky, které uživatel používá: ${sl.stitky.join(', ') || '—'}
Obchody z účtenek: ${sl.obchody.join(', ') || '—'}

Vrať JSON:
{"nazev":"krátce co se hledá (např. káva)","pojmy":["slova k hledání v názvech položek účtenek, obchodů a štítků – česky i obměny, zkratky z účtenek, značky; bez diakritiky i s ní; max 25"],
"kategorie":["id kategorie celé nebo id|Podkategorie – jen ty, které se k otázce celé hodí, ze seznamu výše"],
"stitky":["štítky ze seznamu výše, které se hodí"],"obchody":["obchody ze seznamu, které jsou celé k tématu (kavárna), ne supermarkety"],
"vse":false,
"mira":"utrata|pocet|mnozstvi","obdobi":"mesic|30d|rok|12m|vse","rozpad":"mesic|tyden|den|obchod|polozka","vystup":"cislo|statistika|graf|tabulka",
"vysvetleni":"jedna věta česky, jak otázce rozumíš"}
Pravidla: "jak často/kolikrát" = mira pocet; "kolik kusů" = mnozstvi; jinak utrata. "tento měsíc"=mesic, "letos"=rok, "celkem/celou historii"=vse, jinak 12m. "za měsíc/měsíčně/průměr" = vystup statistika. Kategorie dávej jen celé k tématu (Restaurace pro kávu NE – v restauraci se platí i jídlo; kavárna ano). "Kde/ve kterém obchodě utrácím nejvíc" = vse true, rozpad obchod.`;
}
function dotPlanZAI(text, D) {
  const m = String(text || '').match(/\{[\s\S]*\}/); if (!m) return null;
  let j; try { j = JSON.parse(m[0]); } catch (e) { return null; }
  const ok = (v, o, d) => Object.prototype.hasOwnProperty.call(o, v) ? v : d;
  const idK = new Set((D.categories || []).map(c => c.id));
  const kat = (Array.isArray(j.kategorie) ? j.kategorie : []).map(String).map(k => k.includes('|') ? k : k + '|').filter(k => idK.has(k.split('|')[0]));
  return {
    nazev: String(j.nazev || '').slice(0, 60), pojmy: (Array.isArray(j.pojmy) ? j.pojmy : []).map(String).filter(x => x.trim().length >= 2).slice(0, 30),
    kategorie: [...new Set(kat)], stitky: (Array.isArray(j.stitky) ? j.stitky : []).map(String).slice(0, 20), obchody: (Array.isArray(j.obchody) ? j.obchody : []).map(String).slice(0, 20),
    vse: !!j.vse, mira: ok(j.mira, DOT_MIRA, 'utrata'), obdobi: ok(j.obdobi, DOT_OBDOBI, '12m'), rozpad: ok(j.rozpad, DOT_ROZPAD, 'mesic'), vystup: ok(j.vystup, DOT_VYSTUP, 'cislo'),
    vysvetleni: String(j.vysvetleni || '').slice(0, 200), zdroj: 'ai',
  };
}
async function dotPlan(otazka, D) {
  const lok = dotPlanLokalne(otazka, D);
  try {
    const token = typeof getAuthToken === 'function' ? await getAuthToken() : null;
    if (!token || typeof WORKER_URL === 'undefined') return lok;
    const res = await fetch(WORKER_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ type: 'chat', payload: { messages: [{ role: 'user', content: dotPromptAI(otazka, D) }] } }) });
    if (!res.ok) return lok;
    const data = await res.json();
    const p = dotPlanZAI(data && data.content && data.content[0] && data.content[0].text, D);
    if (!p || (!p.vse && !p.pojmy.length && !p.kategorie.length && !p.stitky.length && !p.obchody.length)) return lok;
    return p;
  } catch (e) { return lok; }
}

// ── stav a vykreslení ─────────────────────────────────────────────────
window._dotaz = window._dotaz || { otazka: '', plan: null, bezi: false, chyba: '' };
function _dotKc(v) { return typeof fmtB === 'function' ? fmtB(Math.round(v || 0)) : Math.round(v || 0) + ' Kč'; }
function _dotCis(v, des) { return new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: des || 0, minimumFractionDigits: 0 }).format(v || 0); }
function _dotE(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function _dotKrat(n, a, b, c) { n = Math.round(n); return n === 1 ? a : (n >= 2 && n <= 4 ? b : c); }

function dotazyRender() {
  const el = document.getElementById('dotazyBox'); if (!el) return;
  const ae = document.activeElement;
  if (ae && el.contains(ae) && ae.tagName === 'INPUT') return;   // píše se otázka – nepřestavovat
  const st = window._dotaz;
  el.innerHTML = `<div class="card"><div class="card-header"><span class="card-title">🔎 Zeptej se svých dat</span></div><div class="card-body">
    <div style="font-size:.78rem;color:#a8aec8;line-height:1.5;margin-bottom:10px">Zeptej se vlastními slovy. AI otázku jen pochopí, čísla spočítá appka z tvých transakcí, účtenek, štítků a obchodů. Období i podobu výsledku můžeš po odpovědi přepnout.</div>
    <div style="display:flex;gap:6px">
      <input id="dotazOtazka" class="fi" style="flex:1;min-width:0" placeholder="Kolik utrácím za kávu?" value="${_dotE(st.otazka)}" onkeydown="if(event.key==='Enter'){event.preventDefault();dotazZeptat()}">
      <button class="btn btn-primary" onclick="dotazZeptat()" ${st.bezi ? 'disabled' : ''}>${st.bezi ? '⏳' : 'Zeptat se'}</button>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${DOT_PRIKLADY.map(x => `<button class="btn btn-ghost btn-sm" style="font-size:.72rem;border:1px solid var(--border)" onclick="dotazPriklad(this)">${_dotE(x)}</button>`).join('')}</div>
    ${st.chyba ? `<div style="margin-top:10px;font-size:.78rem;color:#fbbf24">${_dotE(st.chyba)}</div>` : ''}
    <div id="dotazVysledek" style="margin-top:12px">${st.plan ? dotazVysledekHTML(getData(), st.plan) : ''}</div>
  </div></div>`;
}
function _dotChipy(nazev, mapa, aktiv, fn) {
  return `<div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-top:6px"><span style="font-size:.68rem;color:#a8aec8;min-width:58px">${nazev}</span>`
    + Object.keys(mapa).map(k => `<button onclick="${fn}('${k}')" style="font-size:.7rem;padding:4px 9px;border-radius:999px;cursor:pointer;border:1px solid ${k === aktiv ? '#60a5fa' : 'var(--border)'};background:${k === aktiv ? 'rgba(96,165,250,.18)' : 'var(--surface2)'};color:${k === aktiv ? '#e8eaf2' : '#c2c7da'}">${mapa[k]}</button>`).join('') + '</div>';
}
const DOT_ZDROJE = { kategorie: '🏷️ kategorie', obchod: '🏪 obchod', stitek: '🔖 štítek', transakce: '✍️ název transakce', polozka: '🧾 položka účtenky', polozkaKat: '🧾 kategorie položky', vse: '💳 všechny výdaje' };
function dotazVysledekHTML(D, plan, dnes) {
  const v = dotazSpocitej(D, plan, dnes), s = dotazSouhrn(v, plan.rozpad, dnes);
  const obd = DOT_OBDOBI_VETA[plan.obdobi] || '';
  const co = plan.nazev ? _dotE(plan.nazev) : '';
  let veta;
  if (!v.zaznamy.length) veta = `${co ? co.charAt(0).toUpperCase() + co.slice(1) + ': ' : ''}${obd} jsem nic nenašel.`;
  else if (plan.mira === 'pocet') veta = `${co ? co.charAt(0).toUpperCase() + co.slice(1) + ': ' : ''}${_dotCis(s.nakupu)}× ${obd} – asi ${_dotCis(s.tydne, 1)}× týdně${s.den ? ', nejčastěji ' + s.den : ''}.`;
  else if (plan.mira === 'mnozstvi') veta = `${co ? co.charAt(0).toUpperCase() + co.slice(1) + ': ' : ''}${_dotCis(s.ks)} ks ${obd} – asi ${_dotCis(s.ks / s.mesicu, 1)} ks měsíčně.`;
  else veta = `${co ? 'Za ' + co + ': ' : ''}${_dotKc(s.kc)} ${obd} – asi ${_dotKc(s.naMesic)} měsíčně, z ${_dotCis(s.nakupu)} ${s.nakupu === 1 ? 'nákupu' : 'nákupů'}.`;
  if (v.zaznamy.length && (plan.rozpad === 'obchod' || plan.rozpad === 'polozka') && s.radky[0] && (plan.vystup === 'tabulka' || plan.vystup === 'graf')) {
    const r0 = plan.mira === 'pocet' ? s.radky.slice().sort((a, b) => b.pocet - a.pocet)[0] : s.radky[0];
    const pct = plan.mira === 'pocet' ? (s.nakupu ? r0.pocet / s.nakupu * 100 : 0) : (s.kc ? r0.kc / s.kc * 100 : 0);
    veta += ` Nejvíc: <strong>${_dotE(r0.popis)}</strong> – ${plan.mira === 'pocet' ? _dotCis(r0.pocet) + '×' : _dotKc(r0.kc)} (${_dotCis(pct)} %).`;
  }
  const hlavni = plan.mira === 'pocet' ? _dotCis(s.nakupu) + '×' : plan.mira === 'mnozstvi' ? _dotCis(s.ks) + ' ks' : _dotKc(s.kc);
  const chip = (ik, h, p) => `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:8px 10px;min-width:0"><div style="font-size:.64rem;color:#a8aec8">${ik} ${p}</div><div style="font-size:.95rem;font-weight:800;color:#e8eaf2;margin-top:2px">${h}</div></div>`;
  const stat = `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:8px">
    ${chip('💰', _dotKc(s.kc), 'celkem')}${chip('📅', _dotKc(s.naMesic), 'průměr za měsíc')}
    ${chip('🛒', _dotCis(s.nakupu) + '×', 'nákupů · ' + _dotCis(s.tydne, 1) + '× týdně')}${chip('🧾', _dotKc(s.naNakup), 'průměr na nákup')}
    ${chip('📦', _dotCis(s.ks) + ' ks', 'množství')}${chip('🏪', s.obchod ? _dotE(s.obchod.klic) : '–', 'nejčastěji' + (s.obchod ? ' · ' + s.obchod.pocet + '×' : ''))}</div>`;
  const vystup = plan.vystup === 'graf' ? dotGrafHTML(s.radky, plan) : plan.vystup === 'tabulka' ? dotTabulkaHTML(s.radky, plan, true) : plan.vystup === 'statistika' ? stat : '';
  const zdrojeTxt = Object.keys(v.zdroje).length ? Object.keys(v.zdroje).map(k => `${DOT_ZDROJE[k] || k} ${v.zdroje[k]}×`).join(' · ') : '';
  const zapnute = Object.keys(DOT_ZDROJE).filter(k => k !== 'vse' && (v.zdroje[k] || (plan.vypnout || []).includes(k)));
  const pojmy = (plan.pojmy || []).concat(plan.stitky || []);
  return `<div style="border-top:1px solid var(--border);padding-top:12px">
    <div style="font-size:1.5rem;font-weight:800;color:#e8eaf2;font-family:Syne,sans-serif">${v.zaznamy.length ? hlavni : '–'}</div>
    <div style="font-size:.9rem;color:#e8eaf2;line-height:1.5;margin-top:2px">${veta}</div>
    <div style="font-size:.72rem;color:#a8aec8;line-height:1.5;margin-top:6px">${plan.zdroj === 'ai' ? '🤖 Pochopila AI' : '🔤 Rozpoznáno bez AI'}${plan.vysvetleni ? ': ' + _dotE(plan.vysvetleni) : ''}${zdrojeTxt ? '<br>Našel jsem podle: ' + zdrojeTxt : ''}</div>
    ${_dotChipy('Období', DOT_OBDOBI, plan.obdobi, 'dotazObdobi')}
    ${_dotChipy('Měřit', DOT_MIRA, plan.mira, 'dotazMira')}
    ${_dotChipy('Výstup', DOT_VYSTUP, plan.vystup, 'dotazVystup')}
    ${plan.vystup === 'graf' || plan.vystup === 'tabulka' ? _dotChipy('Rozpad', DOT_ROZPAD, plan.rozpad, 'dotazRozpad') : ''}
    <div style="margin-top:10px">${v.zaznamy.length ? vystup : `<div style="font-size:.8rem;color:#c9cede;line-height:1.55;padding:10px;border-radius:10px;background:var(--surface2);border-left:3px solid var(--debt)">Hledal jsem ${pojmy.length ? '„' + _dotE(pojmy.slice(0, 8).join(', ')) + (pojmy.length > 8 ? '…' : '') + '“ v názvech položek účtenek, obchodů a štítků' : ''}${(plan.kategorie || []).length ? (pojmy.length ? ' a ' : '') + 'v kategoriích ' + _dotE(plan.kategorie.map(k => _dotKatNazev(D, k.split('|')[0], k.split('|')[1])).join(', ')) : ''}. Zkus delší období, nebo přidej slovo níže.</div>`}</div>
    <details style="margin-top:10px"><summary style="cursor:pointer;font-size:.78rem;color:#c2c7da">🔧 Co hledám (${pojmy.length} slov, ${(plan.kategorie || []).length} kategorií)</summary>
      <div style="margin-top:6px">${pojmy.map((p, i) => `<span style="display:inline-flex;align-items:center;gap:4px;font-size:.7rem;background:var(--surface2);border:1px solid var(--border);border-radius:999px;padding:3px 4px 3px 9px;margin:0 4px 4px 0;color:#e8eaf2">${_dotE(p)}${v.pojmyNalez[p] ? ` <span style="color:#a8aec8">${v.pojmyNalez[p]}×</span>` : ''}<button onclick="dotazPojemPryc(${i})" style="background:none;border:none;color:#a8aec8;cursor:pointer;font-size:.7rem">✕</button></span>`).join('')}</div>
      ${(plan.kategorie || []).length ? `<div style="font-size:.7rem;color:#a8aec8;margin-top:4px">Kategorie: ${plan.kategorie.map((k, i) => `<span style="color:#e8eaf2">${_dotE(_dotKatNazev(D, k.split('|')[0], k.split('|')[1]))}</span> <button onclick="dotazKatPryc(${i})" style="background:none;border:none;color:#a8aec8;cursor:pointer;font-size:.7rem">✕</button>`).join(' · ')}</div>` : ''}
      <div style="display:flex;gap:6px;margin-top:6px"><input id="dotazNovyPojem" class="fi" style="flex:1;min-width:0;font-size:.78rem" placeholder="přidat slovo (např. latte)" onkeydown="if(event.key==='Enter'){event.preventDefault();dotazPojemPridej()}"><button class="btn btn-ghost btn-sm" onclick="dotazPojemPridej()">➕</button></div>
      ${zapnute.length ? `<div style="font-size:.7rem;color:#a8aec8;margin-top:8px">Zdroje: ${zapnute.map(k => { const off = (plan.vypnout || []).includes(k); return `<label style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;color:#e8eaf2"><input type="checkbox" ${off ? '' : 'checked'} onchange="dotazZdroj('${k}',this.checked)">${DOT_ZDROJE[k]}</label>`; }).join('')}</div>` : ''}
    </details>
    ${v.zaznamy.length ? `<details style="margin-top:6px"><summary style="cursor:pointer;font-size:.78rem;color:#c2c7da">📋 Co jsem započítal (${v.zaznamy.length})</summary>${dotZaznamyHTML(v.zaznamy)}</details>` : ''}
  </div>`;
}
function dotZaznamyHTML(z) {
  const r = z.slice().sort((a, b) => b.d - a.d).slice(0, 60);
  return `<div style="overflow-x:auto;margin-top:6px"><table style="width:100%;border-collapse:collapse;font-size:.7rem;color:#e8eaf2">
    <tr style="color:#a8aec8"><th style="text-align:left;padding:4px">Datum</th><th style="text-align:left;padding:4px">Co</th><th style="text-align:left;padding:4px">Podle</th><th style="text-align:right;padding:4px">Kč</th></tr>
    ${r.map(x => `<tr style="border-top:1px solid var(--border)"><td style="padding:4px;white-space:nowrap">${x.d.getDate()}. ${x.d.getMonth() + 1}. ${String(x.d.getFullYear()).slice(2)}</td><td style="padding:4px">${_dotE(x.nazev)}${x.nazev !== x.obchod && x.obchod ? `<span style="color:#a8aec8"> · ${_dotE(x.obchod)}</span>` : ''}</td><td style="padding:4px;color:#a8aec8">${_dotE((DOT_ZDROJE[x.zdroj] || x.zdroj).replace(/^\S+ /, ''))}${x.proc ? ' „' + _dotE(x.proc) + '“' : ''}</td><td style="padding:4px;text-align:right;white-space:nowrap">${_dotCis(x.kc, 2)}</td></tr>`).join('')}
    </table>${z.length > 60 ? `<div style="font-size:.68rem;color:#a8aec8;margin-top:4px">… a dalších ${z.length - 60}</div>` : ''}</div>`;
}
function _dotHodnota(r, mira) { return mira === 'pocet' ? r.pocet : mira === 'mnozstvi' ? r.ks : r.kc; }
function _dotFmt(v, mira) { return mira === 'pocet' ? _dotCis(v) + '×' : mira === 'mnozstvi' ? _dotCis(v) + ' ks' : _dotKc(v); }
function dotTabulkaHTML(radky, plan, vse) {
  const r = (plan.rozpad === 'obchod' || plan.rozpad === 'polozka') ? radky.slice(0, 30) : radky;
  const td = 'padding:5px 6px;text-align:right;white-space:nowrap';
  return `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.74rem;color:#e8eaf2">
    <tr style="color:#a8aec8"><th style="padding:5px 6px;text-align:left">${({ mesic: 'Měsíc', tyden: 'Týden od', den: 'Den', obchod: 'Obchod', polozka: 'Položka' })[plan.rozpad] || ''}</th><th style="${td}">Kč</th><th style="${td}">nákupů</th><th style="${td}">ks</th></tr>
    ${r.map(x => `<tr style="border-top:1px solid var(--border)"><td style="padding:5px 6px">${_dotE(x.popis)}</td><td style="${td};${plan.mira === 'utrata' ? 'font-weight:700' : ''}">${_dotKc(x.kc)}</td><td style="${td};${plan.mira === 'pocet' ? 'font-weight:700' : ''}">${_dotCis(x.pocet)}</td><td style="${td};${plan.mira === 'mnozstvi' ? 'font-weight:700' : ''}">${_dotCis(x.ks)}</td></tr>`).join('')}
    </table></div>`;
}
//  Sloupcový graf (osa Y s jednotkou, mřížka, popisky, klepnutím hodnota, tabulka pod grafem).
function dotGrafHTML(radky, plan) {
  const r = (plan.rozpad === 'obchod' || plan.rozpad === 'polozka') ? radky.slice(0, 10) : radky;
  if (!r.length) return '';
  const W = 360, H = 220, L = 54, Rm = 10, T = 12, B = (plan.rozpad === 'obchod' || plan.rozpad === 'polozka') ? 70 : 34;
  const pw = W - L - Rm, ph = H - T - B;
  const max = Math.max(1, ...r.map(x => _dotHodnota(x, plan.mira)));
  const hr = max / 4, mag = Math.pow(10, Math.floor(Math.log10(hr))), n = hr / mag, krok = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  const ymax = Math.ceil(max / krok) * krok;
  const Y = v => T + ph - v / ymax * ph, sw = pw / r.length, bw = Math.max(3, Math.min(34, sw - 4));
  const os = v => plan.mira === 'utrata' ? (v >= 1000 ? _dotCis(v / 1000, 1) + ' tis.' : _dotCis(v)) : _dotCis(v);
  let svg = '';
  for (let v = 0; v <= ymax + 1e-9; v += krok) svg += `<line x1="${L}" x2="${W - Rm}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#2e3347"/><text x="${L - 5}" y="${(Y(v) + 3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="#a8aec8">${os(v)}</text>`;
  const kazdy = Math.max(1, Math.ceil(r.length / 8)), sikmo = B > 40;
  r.forEach((x, i) => {
    const v = _dotHodnota(x, plan.mira), cx = L + sw * i + sw / 2, y = Y(v);
    svg += `<rect x="${(cx - bw / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, T + ph - y).toFixed(1)}" rx="3" fill="#60a5fa"/>`
      + `<rect x="${(cx - sw / 2).toFixed(1)}" y="${T}" width="${sw.toFixed(1)}" height="${ph}" fill="transparent" style="cursor:pointer" onclick="dotazTip(${i})" onmouseenter="dotazTip(${i})"/>`;
    if (i % kazdy === 0) svg += sikmo ? `<text x="${cx.toFixed(1)}" y="${T + ph + 10}" font-size="9.5" fill="#a8aec8" text-anchor="end" transform="rotate(-40 ${cx.toFixed(1)} ${T + ph + 10})">${_dotE(String(x.popis).slice(0, 16))}</text>`
      : `<text x="${cx.toFixed(1)}" y="${T + ph + 14}" font-size="10" fill="#a8aec8" text-anchor="middle">${_dotE(x.popis)}</text>`;
  });
  svg += `<line x1="${L}" x2="${W - Rm}" y1="${T + ph}" y2="${T + ph}" stroke="#a8aec8" opacity=".6"/><text x="9" y="${T + ph / 2}" font-size="10" fill="#a8aec8" text-anchor="middle" transform="rotate(-90 9 ${T + ph / 2})">${plan.mira === 'pocet' ? 'počet nákupů' : plan.mira === 'mnozstvi' ? 'kusů' : 'Kč'}</text>`;
  window._dotazRadky = r.map(x => ({ popis: x.popis, kc: x.kc, ks: x.ks, pocet: x.pocet }));
  return `<div id="dotazTip" style="font-size:.74rem;color:#c2c7da;min-height:1.4em;margin-bottom:4px">Klepni na sloupec pro hodnoty.</div>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width:100%;max-width:640px;height:auto;display:block" role="img" aria-label="Graf ${_dotE(DOT_ROZPAD[plan.rozpad] || '')}">${svg}</svg>
    <details style="margin-top:6px"><summary style="cursor:pointer;font-size:.76rem;color:#c2c7da">📋 Tabulka hodnot</summary>${dotTabulkaHTML(radky, plan)}</details>`;
}
function dotazTip(i) {
  const x = (window._dotazRadky || [])[i], el = document.getElementById('dotazTip'); if (!x || !el) return;
  el.innerHTML = `<strong style="color:#e8eaf2">${_dotE(x.popis)}</strong> · ${_dotKc(x.kc)} · ${_dotCis(x.pocet)} ${_dotKrat(x.pocet, 'nákup', 'nákupy', 'nákupů')} · ${_dotCis(x.ks)} ks`;
}

// ── akce ──────────────────────────────────────────────────────────────
async function dotazZeptat() {
  const st = window._dotaz; if (st.bezi) return;
  const inp = document.getElementById('dotazOtazka'); const q = String((inp && inp.value) || st.otazka || '').trim();
  if (!q) { st.chyba = 'Napiš otázku, třeba „Kolik utrácím za kávu?“'; dotazyRender(); return; }
  st.otazka = q; st.bezi = true; st.chyba = ''; if (inp) inp.blur(); dotazyRender();
  try { st.plan = await dotPlan(q, getData()); }
  catch (e) { st.plan = dotPlanLokalne(q, getData()); }
  st.bezi = false;
  try { localStorage.setItem('ffDotaz', JSON.stringify({ otazka: st.otazka, plan: st.plan })); } catch (e) {}
  dotazyRender();
}
function dotazPriklad(btn) { const inp = document.getElementById('dotazOtazka'); if (inp) inp.value = btn.textContent; window._dotaz.otazka = btn.textContent; dotazZeptat(); }
function _dotUprav(fn) { const p = window._dotaz.plan; if (!p) return; fn(p); try { localStorage.setItem('ffDotaz', JSON.stringify({ otazka: window._dotaz.otazka, plan: p })); } catch (e) {} const v = document.getElementById('dotazVysledek'); if (v) v.innerHTML = dotazVysledekHTML(getData(), p); }
function dotazObdobi(k) { _dotUprav(p => { p.obdobi = k; }); }
function dotazMira(k) { _dotUprav(p => { p.mira = k; }); }
function dotazVystup(k) { _dotUprav(p => { p.vystup = k; }); }
function dotazRozpad(k) { _dotUprav(p => { p.rozpad = k; }); }
function dotazZdroj(k, zap) { _dotUprav(p => { const s = new Set(p.vypnout || []); if (zap) s.delete(k); else s.add(k); p.vypnout = [...s]; }); }
function dotazPojemPryc(i) { _dotUprav(p => { const n = (p.pojmy || []).length; if (i < n) p.pojmy.splice(i, 1); else (p.stitky || []).splice(i - n, 1); }); }
function dotazKatPryc(i) { _dotUprav(p => { (p.kategorie || []).splice(i, 1); }); }
function dotazPojemPridej() {
  const inp = document.getElementById('dotazNovyPojem'); const t = String((inp && inp.value) || '').trim(); if (!t) return;
  _dotUprav(p => { p.pojmy = (p.pojmy || []).concat([t]); p.vse = false; });
}
try { const u = JSON.parse(localStorage.getItem('ffDotaz') || 'null'); if (u && u.plan && !window._dotaz.plan) { window._dotaz.otazka = u.otazka || ''; window._dotaz.plan = u.plan; } } catch (e) {}

Object.assign(window, { dotazyRender, dotazZeptat, dotazPriklad, dotazObdobi, dotazMira, dotazVystup, dotazRozpad, dotazZdroj, dotazPojemPryc, dotazKatPryc, dotazPojemPridej, dotazTip,
  dotazSpocitej, dotazSouhrn, dotPlanLokalne, dotPlanZAI, dotSedi, dotPromptAI });
