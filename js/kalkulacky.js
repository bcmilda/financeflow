// FinanceFlow · v11.90 · kalkulacky.js · 2026-10-19
// ══════════════════════════════════════════════════════════════════════
//  🧮 KALKULAČKY (TODO-356 + TODO-355, Session 27)
//  cesta: menu → Nástroje → 🧮 Kalkulačky
//
//  Jedna stránka, která se bude rozvíjet. Každá kalkulačka je rozklikávací karta
//  (Milan, S27: styl dlaždic s ikonou, názvem, popiskem a tlačítkem „Otevřít →"):
//    · sbalená ukazuje hlavní výsledek z tvých dat (dá se přečíst bez klepnutí),
//    · otevřená ukáže vstupy předvyplněné z dat, vějíř Monte Carlo, tabulku a postup.
//  Otevřená je vždy jen jedna karta (rozbaluje se v kartě, ne v okně – vzor ADR-223).
//
//  Výsledek není jedno číslo, ale pásmo: appka si 2 000× „přehraje" budoucnost
//  s tím, jak se tvoje výdaje skutečně měnily (Monte Carlo). Pevný seed → při každém
//  překreslení stejná čísla, v testech přesně ověřitelná.
//
//  Výpočty jsou čisté funkce (kalkRezerva, kalkInvestice, kalkDoVyplaty, kalk*Data),
//  vykreslení zvlášť (render*). Ruční hodnoty jsou jen pohodlí jednoho prohlížeče
//  (localStorage `ffKalkStav`) – null = „z tvých dat".
//  Kalkulačky počítají k DNEŠKU, ne ke zvolenému měsíci (šipky měsíce jsou skryté).
// ══════════════════════════════════════════════════════════════════════

const KALK_N = 2000;                  // počet simulací
const KALK_SEED = 2026;               // pevný seed – stejné vstupy = stejný výsledek
const KALK_LIKVIDNI = ['cash', 'account', 'savings', 'other'];   // bez investic a kreditních karet
const KALK_ZLOZVYK_VZOR = /(pivo|alkohol|hospod|\bbar\b|cigaret|tabák|tabak|vape|sázk|sazk|loter|kasino|energy|energet)/i;
const MC_PCT = [5, 25, 50, 75, 95];

// ══════════════════════════════════════════════════════════════════════
//  MONTE CARLO – jádro
// ══════════════════════════════════════════════════════════════════════
//  mulberry32 – malý rychlý generátor s pevným seedem (Math.random seed nemá)
function mcRng(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
//  normální rozdělení N(0,1) – Box-Muller
function mcNormal(rng) {
  let u = 0; while (u <= 1e-12) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}
//  percentil z SEŘAZENÉHO pole, lineární interpolace (P50 ze [1,2,3,4] = 2,5)
function mcPercentil(serazene, p) {
  if (!serazene || !serazene.length) return null;
  const i = (serazene.length - 1) * p / 100, lo = Math.floor(i), hi = Math.ceil(i);
  return serazene[lo] + (serazene[hi] - serazene[lo]) * (i - lo);
}
function _mcPcts(hodnoty) {
  const s = hodnoty.slice().sort((a, b) => a - b), o = {};
  MC_PCT.forEach(p => { o['p' + p] = mcPercentil(s, p); });
  return o;
}
//  mcSimuluj(n, krok, opt) → { n, hodnoty (seřazené), p5…p95, kroky: [{p5…p95}] }
//    krok(rng, i) vrací číslo (jen konečný výsledek), pole (cesta, výsledek = poslední
//    hodnota) nebo { cesta, hodnota } (cesta pro graf, hodnota pro percentily).
function mcSimuluj(n, krok, opt) {
  opt = opt || {};
  const rng = mcRng(opt.seed != null ? opt.seed : KALK_SEED);
  const konce = [], cesty = [];
  for (let i = 0; i < n; i++) {
    const r = krok(rng, i);
    if (Array.isArray(r)) { cesty.push(r); konce.push(r[r.length - 1]); }
    else if (r && typeof r === 'object') { if (r.cesta) cesty.push(r.cesta); konce.push(r.hodnota); }
    else konce.push(r);
  }
  const out = Object.assign({ n, hodnoty: konce.slice().sort((a, b) => a - b) }, _mcPcts(konce));
  if (cesty.length) {
    const L = Math.max.apply(null, cesty.map(c => c.length));
    out.kroky = [];
    for (let k = 0; k < L; k++) out.kroky.push(_mcPcts(cesty.map(c => c[Math.min(k, c.length - 1)])));
  }
  return out;
}
//  podíl simulací, které splní podmínku (0–1)
function mcPodil(hodnoty, podminka) {
  if (!hodnoty || !hodnoty.length) return 0;
  let k = 0; hodnoty.forEach(v => { if (podminka(v)) k++; });
  return k / hodnoty.length;
}

// ══════════════════════════════════════════════════════════════════════
//  DATA Z APPKY (stejná pravidla jako zbytek appky: txCZK, bez přesunů,
//  rozpadů a vyrovnání – SKILL 20)
// ══════════════════════════════════════════════════════════════════════
function _kalkStat(t) {
  return t && !t.splitParent && !t.isBalancing && !(typeof isTransferTx === 'function' && isTransferTx(t));
}
function _kalkCZK(t, D) { return typeof txCZK === 'function' ? txCZK(t, D) : (t.amount || t.amt || 0); }
function _kalkDen(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function _kalkDenKlic(d) { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); }

//  Měsíční výdaje za UZAVŘENÉ měsíce (bez rozběhnutého aktuálního), nejvýš `max` zpět.
//  Měsíce bez jediného výdaje se vynechají – nezapsaný měsíc není měsíc za 0 Kč (SKILL 82).
function kalkMesicniVydaje(D, dnes, max) {
  max = max || 12; dnes = dnes ? new Date(dnes) : new Date();
  const sumy = {};
  (D.transactions || []).forEach(t => {
    if (t.type !== 'expense' || !_kalkStat(t)) return;
    const d = new Date(t.date); if (isNaN(d)) return;
    const k = d.getFullYear() * 12 + d.getMonth();
    sumy[k] = (sumy[k] || 0) + _kalkCZK(t, D);
  });
  const ted = dnes.getFullYear() * 12 + dnes.getMonth(), out = [];
  for (let i = 1; i <= max; i++) {
    const k = ted - i;
    if (sumy[k] > 0) out.push({ y: Math.floor(k / 12), m: k % 12, v: Math.round(sumy[k]) });
  }
  return out.reverse();
}

//  Úspory k dispozici = zůstatky nearchivovaných peněženek typu hotovost / běžný / spořicí / jiné.
//  Zůstatek přes walletBalanceCZK (zná zůstatek ke dni i cizí měny) – stejné číslo jako v Peněženkách.
function kalkUspory(D) {
  const pen = (D.wallets || []).filter(w => !w.archived && KALK_LIKVIDNI.includes(w.type || 'other')).map(w => ({
    nazev: w.name || 'Peněženka',
    kc: Math.round(typeof walletBalanceCZK === 'function' ? walletBalanceCZK(w.id, D) : (w.balance || 0)),
  }));
  return { celkem: pen.reduce((a, p) => a + p.kc, 0), penezenky: pen };
}

//  Čistá hodinovka z výplatnic (posledních nejvýš 6): čistá mzda ÷ (odpracováno + dovolená),
//  stejně jako řada „Čistého na placenou hodinu" v megagrafu. Bez pásek odhad z příjmu ÷ 160 h.
function kalkHodinovka(D) {
  const pasky = ((D && D.payslips) || (typeof S !== 'undefined' && S.payslips) || []).slice()
    .sort((a, b) => String(a.m).localeCompare(String(b.m))).slice(-6);
  let cisty = 0, hod = 0;
  if (typeof vyplDopocet === 'function' && typeof vyplHodinyZPasky === 'function') {
    pasky.forEach(z => {
      const h = vyplHodinyZPasky(z), c = vyplDopocet(z).cisty, hh = (h.odprac || 0) + (h.dovolenaH || 0);
      if (hh > 0 && c > 0) { cisty += c; hod += hh; }
    });
  }
  if (hod > 0) return { kc: Math.round(cisty / hod), zdroj: 'vyplatnice', pasek: pasky.length };
  const prijem = typeof computeBaseIncome === 'function' ? (computeBaseIncome(D) || 0) : 0;
  if (prijem > 0) return { kc: Math.round(prijem / 160), zdroj: 'odhad' };
  return { kc: 0, zdroj: 'nic' };
}

//  Výdajové kategorie a podkategorie, za které se za poslední rok utrácelo (pro výběr zlozvyku).
function kalkZlozvykMoznosti(D, dnes) {
  dnes = dnes ? _kalkDen(dnes) : _kalkDen(new Date());
  const od = new Date(dnes); od.setDate(od.getDate() - 365);
  const sum = {};
  (D.transactions || []).forEach(t => {
    if (t.type !== 'expense' || !_kalkStat(t)) return;
    const d = new Date(t.date); if (d < od || d > dnes) return;
    const c = t.catId || t.category; if (!c) return;
    const a = _kalkCZK(t, D);
    sum[c + '|'] = (sum[c + '|'] || 0) + a;
    if (t.subcat) sum[c + '|' + t.subcat] = (sum[c + '|' + t.subcat] || 0) + a;
  });
  return Object.keys(sum).map(k => {
    const [cat, sub] = k.split('|');
    const c = (D.categories || []).find(x => x.id === cat);
    const nazev = (c ? ((c.icon ? c.icon + ' ' : '') + c.name) : cat) + (sub ? ' › ' + sub : '');
    return { klic: k, cat, sub: sub || '', nazev, kc: Math.round(sum[k]), vzor: KALK_ZLOZVYK_VZOR.test((c ? c.name : '') + ' ' + (sub || '')) };
  }).sort((a, b) => b.kc - a.kc);
}
//  Výchozí výběr: kategorie / podkategorie, jejichž název připomíná alkohol, tabák, sázky…
//  Když se trefí celá kategorie, její podkategorie se už nepřidávají (počítaly by se dvakrát).
function kalkZlozvykVychozi(moznosti) {
  const kat = moznosti.filter(x => x.vzor && !x.sub).map(x => x.klic);
  const sub = moznosti.filter(x => x.vzor && x.sub && !kat.includes(x.cat + '|')).map(x => x.klic);
  return kat.concat(sub);
}
//  Útrata za vybrané klíče „cat|sub" („cat|" = celá kategorie). Transakce se počítá jen jednou.
function kalkZlozvykData(D, vyber, dnes) {
  dnes = dnes ? _kalkDen(dnes) : _kalkDen(new Date());
  const rokOd = new Date(dnes); rokOd.setDate(rokOd.getDate() - 365);
  const sedi = t => (vyber || []).some(k => { const [c, s] = k.split('|'); return (t.catId || t.category) === c && (!s || t.subcat === s); });
  let rok = 0, celkem = 0, pocet = 0, prvni = null, prvniVse = null;
  (D.transactions || []).forEach(t => {
    const d = new Date(t.date); if (isNaN(d) || d > dnes) return;
    if (!prvniVse || d < prvniVse) prvniVse = d;
    if (t.type !== 'expense' || !_kalkStat(t) || !sedi(t)) return;
    const a = _kalkCZK(t, D);
    celkem += a; pocet++;
    if (d > rokOd) rok += a;
    if (!prvni || d < prvni) prvni = d;
  });
  //  měsíční průměr z posledního roku – když data začínají později, dělí se skutečným počtem měsíců
  const mesicuDat = prvniVse ? Math.max(1, Math.min(12, Math.round((dnes - prvniVse) / (30.44 * 86400000)))) : 12;
  return { rok: Math.round(rok), celkem: Math.round(celkem), pocet, prvni, mesicuDat, mesicne: Math.round(rok / mesicuDat) };
}

//  Do výplaty – stejný základ jako Finanční radar → 💸 Do výplaty (renderRadarPayday):
//  volné = příjmy od výplaty − výdaje od výplaty − známé budoucí platby do další výplaty.
//  Denní útrata pro simulaci = nefixní výdaje (bez kategorií s charakterem „fixní", ty kryjí
//  budoucí platby) za posledních 90 dní, den po dni včetně dní bez útraty.
function kalkDoVyplatyData(D, dnes) {
  dnes = dnes ? _kalkDen(dnes) : _kalkDen(new Date());
  if (typeof radarPaydayInfo !== 'function') return null;
  const P = radarPaydayInfo(D, dnes);
  const vCyklu = (typeof getTxByRange === 'function' ? getTxByRange(P.lastPayday, P.today, D) : []);
  const prijem = typeof incSum === 'function' ? incSum(vCyklu, D) : 0;
  const vydaje = typeof expSum === 'function' ? expSum(vCyklu, D) : 0;
  const bud = (typeof budouciGetAll === 'function' ? budouciGetAll(D, P.daysLeft + 1) : [])
    .filter(b => { const bd = _kalkDen(b.date); return bd < P.nextPayday; });
  const budouci = Math.round(bud.reduce((a, b) => a + (b.amount || 0), 0));
  const minRez = (typeof _settings !== 'undefined' && _settings) ? Math.max(0, parseInt(_settings.minReserve) || 0) : 0;
  const charBy = {}; (D.categories || []).forEach(c => { charBy[c.id] = c.expenseChar || ''; });
  const od = new Date(dnes); od.setDate(od.getDate() - 90);
  let prvni = null; const sumy = {};
  (D.transactions || []).forEach(t => {
    const d = _kalkDen(t.date); if (isNaN(d)) return;
    if (!prvni || d < prvni) prvni = d;
    if (t.type !== 'expense' || !_kalkStat(t) || d < od || d >= dnes) return;
    if (charBy[t.catId || t.category] === 'regular') return;
    const k = _kalkDenKlic(d); sumy[k] = (sumy[k] || 0) + _kalkCZK(t, D);
  });
  const denni = [];
  const start = prvni && prvni > od ? prvni : od;
  for (let d = new Date(start); d < dnes; d.setDate(d.getDate() + 1)) denni.push(Math.round(sumy[_kalkDenKlic(d)] || 0));
  return { P, prijem: Math.round(prijem), vydaje: Math.round(vydaje), budouci, volne: Math.round(prijem - vydaje - budouci), minRez, denni };
}

// ══════════════════════════════════════════════════════════════════════
//  VÝPOČTY KALKULAČEK (čisté funkce)
// ══════════════════════════════════════════════════════════════════════
//  🛟 Rezerva: každý měsíc náhodně jeden ze skutečných měsíců výdajů (× měřítko,
//  − omezení v krizi) mínus příjem během výpadku. Výsledek = kolik měsíců úspory vydrží.
function kalkRezerva(v) {
  const vyd = (v.vydaje || []).filter(x => x > 0);
  if (!vyd.length) return null;
  const H = v.horizont || 60, mer = v.meritko || 1, omez = Math.min(0.9, Math.max(0, v.omezeni || 0)), prij = v.prijem || 0;
  const sim = mcSimuluj(v.n || KALK_N, rng => {
    let b = v.uspory || 0, vydrzi = null; const cesta = [b];
    if (b <= 0) vydrzi = 0;
    for (let k = 1; k <= H; k++) {
      const e = vyd[Math.floor(rng() * vyd.length)] * mer * (1 - omez) - prij;
      const pred = b; b -= e; cesta.push(Math.round(b));
      if (vydrzi === null && b < 0) vydrzi = (k - 1) + (e > 0 ? Math.max(0, pred) / e : 0);
    }
    return { cesta, hodnota: vydrzi === null ? H : vydrzi };
  }, { seed: v.seed });
  return {
    sim, horizont: H,
    median: sim.p50, p10: mcPercentil(sim.hodnoty, 10),
    pst3: mcPodil(sim.hodnoty, x => x >= 3), pst6: mcPodil(sim.hodnoty, x => x >= 6),
    prumer: vyd.reduce((a, x) => a + x, 0) / vyd.length * mer * (1 - omez),
  };
}

//  📈 „Kdyby se investovalo": měsíčně vklad, roční výnos s rozptylem (normální rozdělení
//  měsíčních výnosů). Cesta po letech (rok 0 = 0 Kč).
function kalkInvestice(v) {
  const let_ = Math.max(1, Math.min(40, Math.round(v.let || 10))), mes = v.mesicne || 0;
  const mu = (v.vynos || 0) / 100 / 12, sd = (v.volatilita || 0) / 100 / Math.sqrt(12);
  const sim = mcSimuluj(v.n || KALK_N, rng => {
    let b = 0; const cesta = [0];
    for (let m = 1; m <= let_ * 12; m++) {
      const r = Math.max(-0.95, mu + sd * mcNormal(rng));
      b = b * (1 + r) + mes;
      if (m % 12 === 0) cesta.push(Math.round(b));
    }
    return cesta;
  }, { seed: v.seed });
  const vlozeno = []; for (let r = 0; r <= let_; r++) vlozeno.push(Math.round(mes * 12 * r));
  return { sim, let: let_, vlozeno };
}

//  📅 Do výplaty: z volných peněz se každý zbývající den odečte náhodný skutečný den útraty.
function kalkDoVyplaty(v) {
  const den = (v.denni || []);
  if (!den.length) return null;
  const dni = Math.max(0, Math.round(v.dni || 0)), mer = v.meritko || 1;
  const sim = mcSimuluj(v.n || KALK_N, rng => {
    let b = v.volne || 0; const cesta = [Math.round(b)];
    for (let d = 1; d <= dni; d++) { b -= den[Math.floor(rng() * den.length)] * mer; cesta.push(Math.round(b)); }
    return cesta;
  }, { seed: v.seed });
  return {
    sim, dni,
    pstVyjdes: mcPodil(sim.hodnoty, x => x >= 0),
    pstRezerva: mcPodil(sim.hodnoty, x => x >= (v.minRez || 0)),
    p10: mcPercentil(sim.hodnoty, 10), median: sim.p50,
    denniPrumer: den.reduce((a, x) => a + x, 0) / den.length * mer,
  };
}

// ══════════════════════════════════════════════════════════════════════
//  STAV (ruční hodnoty) – jen pohodlí v tomto prohlížeči
// ══════════════════════════════════════════════════════════════════════
function _kalkStavVychozi() {
  return {
    otevrena: null,
    rezerva: { uspory: null, vydaje: null, omezeni: 0, prijem: 0 },
    zlozvyk: { vyber: null, hodinovka: null, let: 10, vynos: 6, volatilita: 15 },
    vyplata: { volne: null, dni: null, denni: null },
  };
}
function _kalkStavNacti() {
  const v = _kalkStavVychozi();
  try {
    const s = JSON.parse(localStorage.getItem('ffKalkStav') || 'null');
    if (s && typeof s === 'object') {
      v.otevrena = s.otevrena || null;
      ['rezerva', 'zlozvyk', 'vyplata'].forEach(k => { if (s[k] && typeof s[k] === 'object') Object.assign(v[k], s[k]); });
    }
  } catch (e) {}
  return v;
}
function _kalkStavUloz() { try { localStorage.setItem('ffKalkStav', JSON.stringify(window._kalk)); } catch (e) {} }
window._kalk = window._kalk || _kalkStavNacti();

// ══════════════════════════════════════════════════════════════════════
//  FORMÁTOVÁNÍ
// ══════════════════════════════════════════════════════════════════════
function _kalkKc(v) { return typeof fmtB === 'function' ? fmtB(Math.round(v || 0)) : (Math.round(v || 0) + ' Kč'); }
function _kalkDes(v, des) { return new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: des, maximumFractionDigits: des }).format(v || 0); }
function _kalkPct(p) { return Math.round((p || 0) * 100) + ' %'; }
function _kalkMesicu(x) {
  const r = Math.round(x * 10) / 10;
  const t = Number.isInteger(r) ? String(r) : _kalkDes(r, 1);
  if (Number.isInteger(r) && r === 1) return '1 měsíc';
  if (Number.isInteger(r) && r >= 2 && r <= 4) return t + ' měsíce';
  return t + (Number.isInteger(r) ? ' měsíců' : ' měsíce');
}
function _kalkOsaKc(v) {
  const a = Math.abs(v);
  if (a >= 1e6) return (v < 0 ? '−' : '') + _kalkDes(a / 1e6, a >= 1e7 ? 0 : 1) + ' mil.';
  if (a >= 1000) return (v < 0 ? '−' : '') + _kalkDes(a / 1000, a >= 1e4 ? 0 : 1) + ' tis.';
  return (v < 0 ? '−' : '') + Math.round(a);
}
function _kalkEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// ══════════════════════════════════════════════════════════════════════
//  GRAF – VĚJÍŘ (pravidla grafů: osy s jednotkou, mřížka, legenda, výpis klepnutím,
//  tabulka pod grafem; pevný viewBox + max-width + preserveAspectRatio)
//  Barvy: jeden odstín (modrá appky), pásma průhledností – ověřeno validátorem
//  dataviz na tmavém pozadí #1a1d27.
// ══════════════════════════════════════════════════════════════════════
const KALK_BARVY = { vnejsi: 'rgba(96,165,250,.18)', vnitrni: 'rgba(96,165,250,.55)', median: '#bfdbfe', cara: '#e879f9', nula: '#f87171', mrizka: '#2e3347', text: '#a8aec8' };
window._kalkGrafy = window._kalkGrafy || {};

function _kalkKrokOsy(rozsah) {
  const hrub = rozsah / 4, mag = Math.pow(10, Math.floor(Math.log10(Math.max(hrub, 1e-9))));
  const n = hrub / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
}
//  o = { id, kroky:[{p5…p95}], xPopisek(i), xNazev, yNazev, svisle:[{x,popisek}], cara:{body:[], popisek},
//        tabulkaKazdy (n), tabulkaHlavicka }
function kalkVejir(o) {
  const K = o.kroky || []; if (K.length < 2) return '';
  const W = 360, H = 230, L = 62, Rm = 18, T = 12, B = 44, pw = W - L - Rm, ph = H - T - B;
  const vse = []; K.forEach(k => { vse.push(k.p5, k.p95); }); if (o.cara) vse.push.apply(vse, o.cara.body);
  let ymin = Math.min(0, Math.min.apply(null, vse)), ymax = Math.max(0, Math.max.apply(null, vse));
  if (ymax === ymin) ymax = ymin + 1;
  const krok = _kalkKrokOsy(ymax - ymin);
  ymin = Math.floor(ymin / krok) * krok; ymax = Math.ceil(ymax / krok) * krok;
  const X = i => L + i / (K.length - 1) * pw, Y = v => T + (1 - (v - ymin) / (ymax - ymin)) * ph;
  const pas = (a, b) => K.map((k, i) => `${X(i).toFixed(1)},${Y(k[a]).toFixed(1)}`).join(' ') + ' '
    + K.map((k, i) => [i, k]).reverse().map(([i, k]) => `${X(i).toFixed(1)},${Y(k[b]).toFixed(1)}`).join(' ');
  let svg = '';
  for (let v = ymin; v <= ymax + 1e-9; v += krok) {
    svg += `<line x1="${L}" x2="${W - Rm}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="${KALK_BARVY.mrizka}" stroke-width="1"/>`
      + `<text x="${L - 6}" y="${(Y(v) + 3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="${KALK_BARVY.text}">${_kalkOsaKc(v)}</text>`;
  }
  if (ymin < 0) svg += `<line x1="${L}" x2="${W - Rm}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}" stroke="${KALK_BARVY.nula}" stroke-width="1.2" stroke-dasharray="4 3"/>`
    + `<text x="${W - Rm}" y="${(Y(0) - 4).toFixed(1)}" text-anchor="end" font-size="9.5" fill="${KALK_BARVY.nula}">0 Kč – došly peníze</text>`;
  (o.svisle || []).forEach(s => {
    if (s.x <= 0 || s.x >= K.length - 1) return;
    svg += `<line x1="${X(s.x).toFixed(1)}" x2="${X(s.x).toFixed(1)}" y1="${T}" y2="${T + ph}" stroke="${KALK_BARVY.text}" stroke-width="1" stroke-dasharray="2 3" opacity=".7"/>`
      + `<text x="${(X(s.x) + 3).toFixed(1)}" y="${T + 10}" font-size="9.5" fill="${KALK_BARVY.text}">${_kalkEsc(s.popisek)}</text>`;
  });
  svg += `<polygon points="${pas('p95', 'p5')}" fill="${KALK_BARVY.vnejsi}"/>`
    + `<polygon points="${pas('p75', 'p25')}" fill="${KALK_BARVY.vnitrni}"/>`
    + `<polyline points="${K.map((k, i) => `${X(i).toFixed(1)},${Y(k.p50).toFixed(1)}`).join(' ')}" fill="none" stroke="${KALK_BARVY.median}" stroke-width="2" stroke-linejoin="round"/>`;
  if (o.cara) svg += `<polyline points="${o.cara.body.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="${KALK_BARVY.cara}" stroke-width="1.5" stroke-dasharray="5 4"/>`;
  //  osa X: nejvýš ~6 popisků
  const kazdy = Math.max(1, Math.ceil((K.length - 1) / 6));
  for (let i = 0; i < K.length; i += kazdy) svg += `<text x="${X(i).toFixed(1)}" y="${T + ph + 15}" text-anchor="${i > 0 && i >= K.length - 1 - kazdy / 2 ? 'end' : 'middle'}" font-size="10" fill="${KALK_BARVY.text}">${_kalkEsc(o.xPopisek(i))}</text>`;
  svg += `<line x1="${L}" x2="${W - Rm}" y1="${T + ph}" y2="${T + ph}" stroke="${KALK_BARVY.text}" stroke-width="1" opacity=".6"/>`
    + `<line x1="${L}" x2="${L}" y1="${T}" y2="${T + ph}" stroke="${KALK_BARVY.text}" stroke-width="1" opacity=".6"/>`
    + `<text x="${L + pw / 2}" y="${H - 6}" text-anchor="middle" font-size="10.5" fill="${KALK_BARVY.text}">${_kalkEsc(o.xNazev)}</text>`
    + `<text x="9" y="${T + ph / 2}" text-anchor="middle" font-size="10.5" fill="${KALK_BARVY.text}" transform="rotate(-90 9 ${T + ph / 2})">${_kalkEsc(o.yNazev)}</text>`;
  //  klepací plochy (větší než značka) – výpis hodnot pro daný bod
  const sir = pw / (K.length - 1);
  K.forEach((k, i) => { svg += `<rect x="${(X(i) - sir / 2).toFixed(1)}" y="${T}" width="${sir.toFixed(1)}" height="${ph}" fill="transparent" style="cursor:pointer" onclick="kalkTip('${o.id}',${i})" onmouseenter="kalkTip('${o.id}',${i})"/>`; });
  svg += `<line id="kalkKurzor_${o.id}" x1="0" x2="0" y1="${T}" y2="${T + ph}" stroke="#e8eaf2" stroke-width="1" opacity="0"/>`;
  window._kalkGrafy[o.id] = { K, X, cara: o.cara, xPopisek: o.xPopisek };

  const leg = (bar, txt, styl) => `<span style="display:inline-flex;align-items:center;gap:6px;margin:0 12px 4px 0"><span style="display:inline-block;width:18px;height:${styl ? 0 : 10}px;${styl || 'background:' + bar};border-radius:3px"></span>${txt}</span>`;
  const legenda = `<div style="font-size:.72rem;color:#c2c7da;margin-top:6px;line-height:1.5">`
    + leg(KALK_BARVY.vnejsi, '9 z 10 případů') + leg(KALK_BARVY.vnitrni, 'polovina případů')
    + leg('', 'medián (prostřední případ)', `border-top:2px solid ${KALK_BARVY.median}`)
    + (o.cara ? leg('', _kalkEsc(o.cara.popisek), `border-top:2px dashed ${KALK_BARVY.cara}`) : '') + `</div>`;

  //  tabulka pod grafem
  const kt = o.tabulkaKazdy || kazdy, radky = [];
  for (let i = 0; i < K.length; i += kt) radky.push(i);
  if (radky[radky.length - 1] !== K.length - 1) radky.push(K.length - 1);
  const td = 'padding:5px 6px;text-align:right;white-space:nowrap';
  const tab = `<details style="margin-top:8px"><summary style="cursor:pointer;font-size:.78rem;color:#c2c7da">📋 Tabulka hodnot</summary>
    <div style="overflow-x:auto;margin-top:6px"><table style="width:100%;border-collapse:collapse;font-size:.72rem;color:#e8eaf2">
    <tr style="color:#a8aec8"><th style="padding:5px 6px;text-align:left">${_kalkEsc(o.tabulkaHlavicka || '')}</th><th style="${td}">horších 5 %</th><th style="${td}">25 %</th><th style="${td}">medián</th><th style="${td}">75 %</th><th style="${td}">lepších 5 %</th>${o.cara ? `<th style="${td}">${_kalkEsc(o.cara.popisek)}</th>` : ''}</tr>
    ${radky.map(i => { const k = K[i]; return `<tr style="border-top:1px solid var(--border)"><td style="padding:5px 6px;white-space:nowrap">${_kalkEsc(o.xPopisek(i))}</td><td style="${td}">${_kalkKc(k.p5)}</td><td style="${td}">${_kalkKc(k.p25)}</td><td style="${td};font-weight:700">${_kalkKc(k.p50)}</td><td style="${td}">${_kalkKc(k.p75)}</td><td style="${td}">${_kalkKc(k.p95)}</td>${o.cara ? `<td style="${td}">${_kalkKc(o.cara.body[i])}</td>` : ''}</tr>`; }).join('')}
    </table></div></details>`;

  return `<div style="position:relative">
    <div id="kalkTip_${o.id}" style="min-height:2.6em;font-size:.74rem;color:#c2c7da;line-height:1.45;margin-bottom:4px">Klepni do grafu pro hodnoty v daném bodě.</div>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width:100%;max-width:640px;height:auto;display:block" role="img" aria-label="${_kalkEsc(o.yNazev)} – vějíř možných výsledků">${svg}</svg>
    ${legenda}${tab}</div>`;
}
function kalkTip(id, i) {
  const g = window._kalkGrafy[id]; if (!g) return;
  const k = g.K[i], el = document.getElementById('kalkTip_' + id), kur = document.getElementById('kalkKurzor_' + id);
  if (el) el.innerHTML = `<strong style="color:#e8eaf2">${_kalkEsc(g.xPopisek(i))}</strong> · medián <strong style="color:#e8eaf2">${_kalkKc(k.p50)}</strong>`
    + ` · polovina ${_kalkKc(k.p25)} až ${_kalkKc(k.p75)} · 9 z 10 ${_kalkKc(k.p5)} až ${_kalkKc(k.p95)}`
    + (g.cara ? ` · ${_kalkEsc(g.cara.popisek)} ${_kalkKc(g.cara.body[i])}` : '');
  if (kur) { kur.setAttribute('x1', g.X(i)); kur.setAttribute('x2', g.X(i)); kur.setAttribute('opacity', '.5'); }
}
window.kalkTip = kalkTip;

// ══════════════════════════════════════════════════════════════════════
//  VYKRESLENÍ
// ══════════════════════════════════════════════════════════════════════
const KALK_KARTY = [
  { id: 'rezerva', ikona: '🛟', nazev: 'Rezerva', popis: 'Na kolik měsíců vystačí úspory, kdyby přestal chodit příjem.' },
  { id: 'zlozvyk', ikona: '🚬', nazev: 'Cena zlozvyku', popis: 'Kolik stojí alkohol, cigarety, sázky nebo cokoli si vybereš – v korunách, hodinách práce a kdyby se peníze investovaly.' },
  { id: 'vyplata', ikona: '📅', nazev: 'Do výplaty s pravděpodobností', popis: 'S jakou pravděpodobností peníze vystačí do další výplaty a kolik by v horším případě chybělo.' },
];

//  Vstupní políčko: prázdné = hodnota z dat (placeholder), ručně zadané má ↺ zpět na data.
function _kalkPole(karta, klic, popisek, hodnota, zDat, jed, pozn, vychozi) {
  const rucne = hodnota != null && hodnota !== '';
  const zDatTxt = typeof zDat === 'number' ? new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 1 }).format(zDat) : zDat;
  return `<div class="fg" style="margin-bottom:10px"><label>${popisek}</label>
    <div style="display:flex;gap:6px;align-items:center">
      <input class="fi" type="number" inputmode="decimal" style="flex:1;min-width:0" value="${rucne ? _kalkEsc(hodnota) : ''}" placeholder="${_kalkEsc(zDatTxt)}" oninput="kalkVstup('${karta}','${klic}',this)">
      <span style="font-size:.78rem;color:#a8aec8;white-space:nowrap">${jed}</span>
      ${rucne ? `<button class="btn btn-ghost btn-sm" title="Zpět na hodnotu z dat" onclick="kalkVstupZpet('${karta}','${klic}')">↺</button>` : ''}
    </div>
    <div style="font-size:.7rem;color:#a8aec8;margin-top:3px">${rucne ? '✍️ ručně zadáno · ' + (vychozi ? 'výchozí ' : 'z dat ') + _kalkEsc(zDatTxt) + ' ' + jed : (vychozi ? '⚙️ výchozí hodnota' : '📊 z tvých dat')}${pozn ? ' · ' + pozn : ''}</div></div>`;
}
function _kalkVolba(karta, klic, popisek, hodnota, moznosti) {
  return `<div class="fg" style="margin-bottom:10px"><label>${popisek}</label>
    <select class="fi" onchange="kalkVstup('${karta}','${klic}',this)">${moznosti.map(([v, t]) => `<option value="${v}"${String(v) === String(hodnota) ? ' selected' : ''}>${t}</option>`).join('')}</select></div>`;
}
function _kalkCislo(v) { return v == null || v === '' ? null : (isFinite(+v) ? +v : null); }
function _kalkChip(ikona, hodnota, popis, barva) {
  return `<div style="flex:1;min-width:96px;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:10px">
    <div style="font-size:.68rem;color:#a8aec8;text-transform:uppercase;letter-spacing:.04em">${ikona} ${popis}</div>
    <div style="font-size:1.05rem;font-weight:800;color:${barva || '#e8eaf2'};margin-top:3px">${hodnota}</div></div>`;
}
function _kalkPrazdne(co, proc) {
  return `<div style="padding:12px;border-radius:10px;background:var(--surface2);border-left:3px solid var(--debt);font-size:.8rem;color:#c9cede;line-height:1.55">${co}<br><span style="color:#a8aec8">${proc}</span></div>`;
}

// ── 🛟 Rezerva ─────────────────────────────────────────────────────────
function _kalkRezervaVypocet(D) {
  const s = window._kalk.rezerva, us = kalkUspory(D), mv = kalkMesicniVydaje(D, new Date(), 12);
  const histPrumer = mv.length ? mv.reduce((a, x) => a + x.v, 0) / mv.length : 0;
  const uspory = _kalkCislo(s.uspory) != null ? +s.uspory : us.celkem;
  const prumer = _kalkCislo(s.vydaje) != null ? +s.vydaje : histPrumer;
  const r = mv.length ? kalkRezerva({ uspory, vydaje: mv.map(x => x.v), meritko: histPrumer > 0 ? prumer / histPrumer : 1,
    omezeni: (+s.omezeni || 0) / 100, prijem: +s.prijem || 0 }) : null;
  return { s, us, mv, histPrumer, uspory, prumer, r };
}
function _kalkRezervaTeaser(V) {
  if (!V.r) return { hlavni: '–', pod: 'Chybí aspoň jeden uzavřený měsíc výdajů' };
  const plus = V.r.median >= V.r.horizont;
  return { hlavni: plus ? `${V.r.horizont}+ měsíců` : `≈ ${_kalkMesicu(V.r.median)}`, pod: `6 měsíců vydržíš s ${_kalkPct(V.r.pst6)} · 3 měsíce s ${_kalkPct(V.r.pst3)}` };
}
function _kalkRezervaVysledek(V) {
  if (!V.r) return _kalkPrazdne('Zatím nemám z čeho počítat.', `Hledal jsem uzavřené měsíce s výdaji za poslední rok a žádný jsem nenašel. Počítání začne po prvním celém měsíci zápisů – nebo zadej průměrné výdaje ručně.`);
  const r = V.r, H = r.horizont;
  const vetaMed = r.median >= H ? `úspory v polovině případů vydrží déle než ${H} měsíců` : `úspory v polovině případů vydrží ${_kalkMesicu(r.median)}`;
  const vetaP10 = r.p10 >= H ? '' : `, i v horších 10 % aspoň ${_kalkMesicu(r.p10)}`;
  const graf = Math.max(6, Math.min(36, Math.ceil(mcPercentil(r.sim.hodnoty, 95)) + 2));
  return `<div style="font-size:.9rem;color:#e8eaf2;line-height:1.55;margin-bottom:10px">Bez příjmu ${vetaMed}${vetaP10}. Šest měsíců (doporučená rezerva) to vychází s <strong>${_kalkPct(r.pst6)}</strong>.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      ${_kalkChip('⏳', r.median >= H ? H + '+ m.' : _kalkMesicu(r.median), 'medián')}
      ${_kalkChip('3️⃣', _kalkPct(r.pst3), '3 měsíce', r.pst3 >= 0.8 ? 'var(--income)' : r.pst3 >= 0.5 ? 'var(--debt)' : 'var(--expense)')}
      ${_kalkChip('6️⃣', _kalkPct(r.pst6), '6 měsíců', r.pst6 >= 0.8 ? 'var(--income)' : r.pst6 >= 0.5 ? 'var(--debt)' : 'var(--expense)')}
    </div>
    ${kalkVejir({ id: 'rezerva', kroky: r.sim.kroky.slice(0, graf + 1), xPopisek: i => i === 0 ? 'dnes' : i + '. m.', xNazev: 'měsíce bez příjmu', yNazev: 'zbývající úspory (Kč)',
      svisle: [{ x: 3, popisek: '3 m.' }, { x: 6, popisek: '6 m.' }], tabulkaHlavicka: 'Po měsících', tabulkaKazdy: graf > 12 ? 3 : 1 })}`;
}
function _kalkRezervaTelo(V) {
  const s = V.s;
  return `<div class="frow">
      ${_kalkPole('rezerva', 'uspory', 'Úspory k dispozici', s.uspory, Math.round(V.us.celkem), 'Kč', V.us.penezenky.length ? `${V.us.penezenky.length} ${V.us.penezenky.length === 1 ? 'peněženka' : V.us.penezenky.length < 5 ? 'peněženky' : 'peněženek'} bez investic` : 'žádná peněženka')}
      ${_kalkPole('rezerva', 'vydaje', 'Průměrné měsíční výdaje', s.vydaje, Math.round(V.histPrumer), 'Kč', V.mv.length ? `${V.mv.length} uzavřených měsíců` : 'zatím žádný uzavřený měsíc')}
    </div><div class="frow">
      ${_kalkVolba('rezerva', 'omezeni', 'V krizi omezím výdaje o', s.omezeni || 0, [[0, 'nic – utrácím jako dosud'], [10, '10 %'], [20, '20 %'], [30, '30 %'], [40, '40 %'], [50, '50 %']])}
      ${_kalkPole('rezerva', 'prijem', 'Příjem během výpadku', s.prijem || null, 0, 'Kč/měs', 'např. podpora v nezaměstnanosti', true)}
    </div>
    <div id="kalkVysl_rezerva">${_kalkRezervaVysledek(V)}</div>
    <details style="margin-top:10px"><summary style="cursor:pointer;font-size:.78rem;color:#c2c7da">ℹ️ Jak to počítám</summary>
      <div style="font-size:.76rem;color:#a8aec8;line-height:1.6;margin-top:6px">
      Úspory = zůstatky peněženek typu hotovost, běžný účet, spořicí a jiné (stejně jako v Peněženkách; investice a kreditní karty ne)${V.us.penezenky.length ? ': ' + V.us.penezenky.map(p => _kalkEsc(p.nazev) + ' ' + _kalkKc(p.kc)).join(', ') : ''}.<br>
      Každý simulovaný měsíc vezme náhodně jeden z tvých skutečných měsíců výdajů${V.mv.length ? ' (' + V.mv.map(x => (typeof CZ_M !== 'undefined' ? CZ_M[x.m].slice(0, 3) : x.m + 1) + ' ' + _kalkOsaKc(x.v)).join(', ') + ')' : ''} – drahé i levné měsíce se střídají tak, jak se u tebe opravdu střídaly. Přesuny mezi peněženkami se nepočítají.<br>
      2 000 takových budoucností dá vějíř: modrá čára je prostřední případ, tmavší pás polovina případů, světlejší 9 z 10.</div></details>`;
}

// ── 🚬 Cena zlozvyku ───────────────────────────────────────────────────
function _kalkZlozvykVypocet(D) {
  const s = window._kalk.zlozvyk, moz = kalkZlozvykMoznosti(D, new Date());
  const vyber = Array.isArray(s.vyber) ? s.vyber : kalkZlozvykVychozi(moz);
  const z = kalkZlozvykData(D, vyber, new Date()), hod = kalkHodinovka(D);
  const hodKc = _kalkCislo(s.hodinovka) != null ? +s.hodinovka : hod.kc;
  const inv = z.mesicne > 0 ? kalkInvestice({ mesicne: z.mesicne, let: +s.let || 10, vynos: _kalkCislo(s.vynos) != null ? +s.vynos : 6, volatilita: _kalkCislo(s.volatilita) != null ? +s.volatilita : 15 }) : null;
  return { s, moz, vyber, auto: !Array.isArray(s.vyber), z, hod, hodKc, inv };
}
function _kalkZlozvykTeaser(V) {
  if (!V.vyber.length) return { hlavni: '–', pod: 'Vyber, co chceš sledovat' };
  if (!V.z.rok) return { hlavni: '0 Kč', pod: 'Za poslední rok žádná útrata za vybrané' };
  return { hlavni: `${_kalkKc(V.z.rok)} za rok`, pod: V.hodKc > 0 ? `= ${_kalkDes(V.z.rok / V.hodKc, 0)} hodin práce` : `${_kalkKc(V.z.mesicne)} měsíčně` };
}
function _kalkZlozvykVysledek(V) {
  if (!V.vyber.length) return _kalkPrazdne('Není vybraná žádná kategorie.', 'Hledal jsem kategorie a podkategorie s názvem jako pivo, alkohol, cigarety, tabák, sázky, energy drinky – žádná taková nemá za poslední rok výdaje. Vyber nahoře, co chceš sledovat.');
  const z = V.z;
  if (!z.pocet) return _kalkPrazdne('Za vybrané kategorie zatím nejsou žádné výdaje.', 'Počítám jen výdaje (bez přesunů a rozpadů) do dneška.');
  const hodiny = V.hodKc > 0 ? z.rok / V.hodKc : null;
  const inv = V.inv, roky = inv ? inv.let : 0, k = inv ? inv.sim.kroky[inv.sim.kroky.length - 1] : null;
  return `<div style="font-size:.9rem;color:#e8eaf2;line-height:1.55;margin-bottom:10px">Za poslední rok ${_kalkKc(z.rok)}${hodiny != null ? `, to je <strong>${_kalkDes(hodiny, 0)} hodin práce</strong>` : ''}.`
    + (inv ? ` Kdyby se ${_kalkKc(z.mesicne)} měsíčně ${roky} let investovalo, v polovině případů by to bylo <strong>${_kalkKc(k.p50)}</strong> (vloženo ${_kalkKc(inv.vlozeno[roky])}).` : '') + `</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      ${_kalkChip('📅', _kalkKc(z.mesicne), 'měsíčně')}
      ${_kalkChip('⏱️', hodiny != null ? _kalkDes(hodiny, 0) + ' h' : '–', 'hodin práce za rok')}
      ${_kalkChip('🗂️', _kalkKc(z.celkem), z.prvni ? 'od ' + z.prvni.toLocaleDateString('cs-CZ', { month: 'numeric', year: 'numeric' }) : 'celkem')}
    </div>
    ${inv ? kalkVejir({ id: 'zlozvyk', kroky: inv.sim.kroky, xPopisek: i => i === 0 ? 'dnes' : i + '. rok', xNazev: 'roky investování', yNazev: 'hodnota investice (Kč)',
      cara: { body: inv.vlozeno, popisek: 'vloženo' }, tabulkaHlavicka: 'Po letech', tabulkaKazdy: roky > 12 ? 5 : roky > 6 ? 2 : 1 }) : ''}`;
}
function _kalkZlozvykTelo(V) {
  const s = V.s, vybrane = V.vyber.map(k => V.moz.find(x => x.klic === k) || { klic: k, nazev: k.replace('|', ' › '), kc: 0 });
  const volne = V.moz.filter(x => !V.vyber.includes(x.klic) && !(x.sub && V.vyber.includes(x.cat + '|')));
  return `<div class="fg" style="margin-bottom:10px"><label>Co sleduji${V.auto ? ' · vybráno automaticky podle názvu' : ''}</label>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px">${vybrane.length ? vybrane.map(x => `<span style="display:inline-flex;align-items:center;gap:6px;background:var(--surface2);border:1px solid var(--border2);border-radius:999px;padding:4px 6px 4px 10px;font-size:.78rem;color:#e8eaf2">${_kalkEsc(x.nazev)} <span style="color:#a8aec8">${_kalkKc(x.kc)}/rok</span><button class="btn btn-ghost btn-sm" style="padding:0 6px" title="Odebrat" onclick="kalkZlozvykOdeber('${_kalkEsc(x.klic)}')">✕</button></span>`).join('') : '<span style="font-size:.78rem;color:#a8aec8">nic</span>'}</div>
      <select class="fi" onchange="kalkZlozvykPridej(this.value)"><option value="">➕ Přidat kategorii nebo podkategorii…</option>${volne.map(x => `<option value="${_kalkEsc(x.klic)}">${_kalkEsc(x.nazev)} · ${_kalkKc(x.kc)}/rok</option>`).join('')}</select>
      ${V.auto ? '' : `<button class="btn btn-ghost btn-sm" style="margin-top:6px" onclick="kalkZlozvykAuto()">↺ Vybrat automaticky podle názvu</button>`}
    </div>
    <div class="frow">
      ${_kalkPole('zlozvyk', 'hodinovka', 'Čistá hodinovka', s.hodinovka, V.hod.kc || '', 'Kč/h', V.hod.zdroj === 'vyplatnice' ? 'z výplatnic' : V.hod.zdroj === 'odhad' ? 'odhad: příjem ÷ 160 h' : 'zadej ručně')}
      ${_kalkVolba('zlozvyk', 'let', 'Investovat po dobu', s.let || 10, [[5, '5 let'], [10, '10 let'], [20, '20 let'], [30, '30 let']])}
    </div><div class="frow">
      ${_kalkPole('zlozvyk', 'vynos', 'Průměrný roční výnos', s.vynos === 6 ? null : s.vynos, 6, '%', 'akciový fond dlouhodobě', true)}
      ${_kalkPole('zlozvyk', 'volatilita', 'Kolísání (volatilita)', s.volatilita === 15 ? null : s.volatilita, 15, '% ročně', 'čím víc, tím širší vějíř', true)}
    </div>
    <div id="kalkVysl_zlozvyk">${_kalkZlozvykVysledek(V)}</div>
    <details style="margin-top:10px"><summary style="cursor:pointer;font-size:.78rem;color:#c2c7da">ℹ️ Jak to počítám</summary>
      <div style="font-size:.76rem;color:#a8aec8;line-height:1.6;margin-top:6px">
      Útrata = výdaje ve vybraných kategoriích a podkategoriích (bez přesunů a rozpadů, cizí měny přepočtené). Měsíčně = poslední rok ÷ ${V.z.mesicuDat} ${V.z.mesicuDat === 1 ? 'měsíc' : V.z.mesicuDat < 5 ? 'měsíce' : 'měsíců'} s daty.<br>
      Hodiny práce = útrata ÷ čistá hodinovka${V.hod.zdroj === 'vyplatnice' ? ' (čistá mzda ÷ odpracované hodiny a dovolená z posledních výplatnic)' : ''}.<br>
      Investice: každý měsíc vklad a náhodný výnos kolem zadaného průměru s daným kolísáním; 2 000 průběhů dá vějíř. Není to doporučení investovat – jen „co by kdyby“. Nepočítá daně, poplatky ani inflaci.</div></details>`;
}

// ── 📅 Do výplaty ──────────────────────────────────────────────────────
function _kalkVyplataVypocet(D) {
  const s = window._kalk.vyplata, d = kalkDoVyplatyData(D, new Date());
  if (!d) return { s, d: null, r: null };
  const histDen = d.denni.length ? d.denni.reduce((a, x) => a + x, 0) / d.denni.length : 0;
  const volne = _kalkCislo(s.volne) != null ? +s.volne : d.volne;
  const dni = _kalkCislo(s.dni) != null ? +s.dni : d.P.daysLeft;
  const den = _kalkCislo(s.denni) != null ? +s.denni : histDen;
  const r = d.denni.length ? kalkDoVyplaty({ volne, dni, denni: d.denni, meritko: histDen > 0 ? den / histDen : 1, minRez: d.minRez }) : null;
  return { s, d, histDen, volne, dni, den, r };
}
function _kalkVyplataTeaser(V) {
  if (!V.r) return { hlavni: '–', pod: 'Chybí výdaje za poslední dny' };
  if (V.r.dni === 0) return { hlavni: 'Výplata je dnes', pod: 'Další cyklus začíná' };
  return { hlavni: `S ${_kalkPct(V.r.pstVyjdes)} vyjdeš`, pod: `do výplaty ${V.r.dni} ${V.r.dni === 1 ? 'den' : V.r.dni < 5 ? 'dny' : 'dní'} · ${V.r.p10 < 0 ? 'v horších 10 % chybí ' + _kalkKc(-V.r.p10) : 'i v horších 10 % zbude ' + _kalkKc(V.r.p10)}` };
}
function _kalkVyplataVysledek(V) {
  if (!V.d) return _kalkPrazdne('Do výplaty teď nejde spočítat.', 'Chybí výpočet cyklu výplaty (Finanční radar).');
  if (!V.r) return _kalkPrazdne('Zatím nemám z čeho počítat.', 'Hledal jsem výdaje za posledních 90 dní (bez fixních plateb a přesunů) a žádné jsem nenašel.');
  const r = V.r, d = V.d;
  if (r.dni === 0) return _kalkPrazdne('Výplata je dnes.', 'Nový cyklus začne s novou výplatou – zítra už se počítá z ní.');
  const veta = r.p10 < 0 ? `v nejhorších 10 % by chybělo aspoň ${_kalkKc(-r.p10)}` : `i v nejhorších 10 % zbude aspoň ${_kalkKc(r.p10)}`;
  return `<div style="font-size:.9rem;color:#e8eaf2;line-height:1.55;margin-bottom:10px">S <strong>${_kalkPct(r.pstVyjdes)}</strong> vyjdeš do výplaty (${d.P.nextPayday.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}), ${veta}. V prostředním případě zbude ${_kalkKc(r.median)}.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      ${_kalkChip('✅', _kalkPct(r.pstVyjdes), 'vyjdeš', r.pstVyjdes >= 0.85 ? 'var(--income)' : r.pstVyjdes >= 0.6 ? 'var(--debt)' : 'var(--expense)')}
      ${d.minRez > 0 ? _kalkChip('🛡️', _kalkPct(r.pstRezerva), 'rezerva zůstane') : _kalkChip('📆', r.dni + ' ' + (r.dni === 1 ? 'den' : r.dni < 5 ? 'dny' : 'dní'), 'do výplaty')}
      ${_kalkChip('🧾', _kalkKc(r.denniPrumer), 'průměr na den')}
    </div>
    ${kalkVejir({ id: 'vyplata', kroky: r.sim.kroky, xPopisek: i => { if (i === 0) return 'dnes'; const x = new Date(); x.setDate(x.getDate() + i); return x.getDate() + '. ' + (x.getMonth() + 1) + '.'; },
      xNazev: 'dny do výplaty', yNazev: 'zbývá peněz (Kč)', tabulkaHlavicka: 'Den', tabulkaKazdy: r.dni > 14 ? 3 : r.dni > 7 ? 2 : 1 })}`;
}
function _kalkVyplataTelo(V) {
  const s = V.s, d = V.d;
  if (!d) return `<div id="kalkVysl_vyplata">${_kalkVyplataVysledek(V)}</div>`;
  return `<div class="frow">
      ${_kalkPole('vyplata', 'volne', 'Volné peníze do výplaty', s.volne, d.volne, 'Kč', 'jako ve Finančním radaru')}
      ${_kalkPole('vyplata', 'dni', 'Dní do výplaty', s.dni, d.P.daysLeft, 'dní', 'výplata ' + d.P.nextPayday.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }))}
    </div>
    ${_kalkPole('vyplata', 'denni', 'Průměrná denní útrata', s.denni, Math.round(V.histDen), 'Kč/den', `nefixní výdaje za ${d.denni.length} dní`)}
    <div id="kalkVysl_vyplata">${_kalkVyplataVysledek(V)}</div>
    <details style="margin-top:10px"><summary style="cursor:pointer;font-size:.78rem;color:#c2c7da">ℹ️ Jak to počítám</summary>
      <div style="font-size:.76rem;color:#a8aec8;line-height:1.6;margin-top:6px">
      Volné peníze = příjmy od výplaty ${_kalkKc(d.prijem)} − výdaje od výplaty ${_kalkKc(d.vydaje)} − známé platby do další výplaty ${_kalkKc(d.budouci)} (stejně jako Finanční radar → 💸 Do výplaty).<br>
      Každý zbývající den vezme náhodně jeden z tvých skutečných dnů za posledních ${d.denni.length} dní – i dny bez útraty. Fixní výdaje (kategorie s charakterem „fixní“) se nepočítají, ty už jsou ve známých platbách.${d.minRez > 0 ? `<br>Nedotknutelná rezerva z Nastavení: ${_kalkKc(d.minRez)}.` : ''}</div></details>`;
}

// ── karty a stránka ────────────────────────────────────────────────────
const KALK_VYPOCET = { rezerva: _kalkRezervaVypocet, zlozvyk: _kalkZlozvykVypocet, vyplata: _kalkVyplataVypocet };
const KALK_TEASER = { rezerva: _kalkRezervaTeaser, zlozvyk: _kalkZlozvykTeaser, vyplata: _kalkVyplataTeaser };
const KALK_TELO = { rezerva: _kalkRezervaTelo, zlozvyk: _kalkZlozvykTelo, vyplata: _kalkVyplataTelo };
const KALK_VYSLEDEK = { rezerva: _kalkRezervaVysledek, zlozvyk: _kalkZlozvykVysledek, vyplata: _kalkVyplataVysledek };

function _kalkTeaserHTML(t) {
  return `<div style="font-size:1.35rem;font-weight:800;color:#e8eaf2;font-family:Syne,sans-serif;line-height:1.2">${t.hlavni}</div>
    <div style="font-size:.8rem;color:#c2c7da;margin-top:3px">${t.pod}</div>`;
}
function _kalkKartaHTML(k, D) {
  const otevrena = window._kalk.otevrena === k.id;
  let V = null, t;
  try { V = KALK_VYPOCET[k.id](D); t = KALK_TEASER[k.id](V); }
  catch (e) { console.error('[kalkulacky]', k.id, e); t = { hlavni: '–', pod: 'Výpočet selhal' }; }
  return `<div class="card" id="kalkK_${k.id}" style="margin-bottom:14px;border-radius:20px;${otevrena ? 'border-color:var(--border2)' : ''}">
    <div style="padding:16px">
      <div style="display:flex;gap:14px;align-items:flex-start">
        <div style="width:52px;height:52px;border-radius:14px;background:var(--surface2);border:1px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:1.55rem;flex-shrink:0">${k.ikona}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:800;font-size:1.05rem;color:#e8eaf2">${k.nazev}</div>
          <div style="font-size:.8rem;color:#a8aec8;line-height:1.5;margin-top:2px">${k.popis}</div>
        </div>
      </div>
      <div id="kalkTeaser_${k.id}" style="margin-top:14px;padding:12px 14px;border-radius:12px;background:var(--surface2)">${_kalkTeaserHTML(t)}</div>
      <button class="btn btn-ghost" style="width:100%;justify-content:center;margin-top:12px;padding:11px;border:1px solid var(--border2);border-radius:12px;font-weight:700;color:#e8eaf2" onclick="kalkOtevri('${k.id}')">${otevrena ? 'Sbalit ↑' : 'Otevřít kalkulačku →'}</button>
      ${otevrena ? `<div id="kalkTelo_${k.id}" style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">${V ? KALK_TELO[k.id](V) : ''}</div>` : ''}
    </div></div>`;
}

function renderKalkulacky() {
  const el = document.getElementById('kalkulackyContent'); if (!el) return;
  //  počítá se k dnešku – šipky měsíce tu nic nemění, tak je schovat (SKILL 95)
  const mn = document.querySelector('.month-nav'); if (mn) mn.style.display = 'none';
  const D = getData();
  //  Píše-li se právě do políčka kalkulačky, nepřestavovat stránku (zmizel by kurzor a klávesnice),
  //  jen přepočítat výsledek otevřené karty s novými daty.
  const ae = document.activeElement;
  if (ae && el.contains(ae) && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName)) { if (window._kalk.otevrena) kalkPrepocti(window._kalk.otevrena); return; }
  el.innerHTML = (typeof tabIntro === 'function' ? tabIntro('kalkulacky', '🧮', 'Kalkulačky',
      'Každá kalkulačka se předvyplní z tvých dat a hodnoty jde ručně změnit. Výsledek není jedno číslo, ale pásmo: appka si 2 000× „přehraje“ budoucnost tak, jak se tvoje výdaje skutečně měnily (metoda Monte Carlo). Počítá se k dnešku. Další kalkulačky budou přibývat.') : '')
    + KALK_KARTY.map(k => _kalkKartaHTML(k, D)).join('')
    + `<div style="font-size:.74rem;color:#a8aec8;text-align:center;margin:4px 0 18px">Chystá se: 🏖️ finanční nezávislost · 🏠 hypotéka vs. nájem · 🚗 auto vlastní vs. leasing · 👵 penzijko a DIP · 📉 inflace úspor</div>`;
}

//  Přepočítá jen výsledek a souhrn karty – políčka zůstanou (kurzor, klávesnice).
function kalkPrepocti(id) {
  if (!KALK_VYPOCET[id]) return;
  try {
    const V = KALK_VYPOCET[id](getData());
    const t = document.getElementById('kalkTeaser_' + id); if (t) t.innerHTML = _kalkTeaserHTML(KALK_TEASER[id](V));
    const v = document.getElementById('kalkVysl_' + id); if (v) v.innerHTML = KALK_VYSLEDEK[id](V);
  } catch (e) { console.error('[kalkulacky]', id, e); }
}
function _kalkKartaZnovu(id) {
  const k = KALK_KARTY.find(x => x.id === id), el = document.getElementById('kalkK_' + id);
  if (!k || !el) { renderKalkulacky(); return; }
  const tmp = document.createElement('div'); tmp.innerHTML = _kalkKartaHTML(k, getData());
  el.replaceWith(tmp.firstElementChild);
}
function kalkOtevri(id) {
  const predtim = window._kalk.otevrena;
  window._kalk.otevrena = predtim === id ? null : id;
  _kalkStavUloz();
  if (predtim && predtim !== id) _kalkKartaZnovu(predtim);
  _kalkKartaZnovu(id);
  if (window._kalk.otevrena) { const el = document.getElementById('kalkK_' + id); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
}
function kalkVstup(karta, klic, el) {
  const st = window._kalk[karta]; if (!st) return;
  const raw = String(el.value || '').replace(',', '.').trim();
  st[klic] = raw === '' ? null : (isFinite(+raw) ? +raw : st[klic]);
  _kalkStavUloz();
  //  výběr (select) a ↺ mění i popisky políček → celá karta; psaní čísla jen výsledek
  if (el.tagName === 'SELECT') _kalkKartaZnovu(karta); else kalkPrepocti(karta);
}
function kalkVstupZpet(karta, klic) {
  const st = window._kalk[karta]; if (!st) return;
  st[klic] = _kalkStavVychozi()[karta][klic];
  _kalkStavUloz(); _kalkKartaZnovu(karta);
}
function kalkZlozvykPridej(klic) {
  if (!klic) return;
  const V = _kalkZlozvykVypocet(getData());
  let vyber = V.vyber.slice();
  //  celá kategorie nahradí své podkategorie (jinak by se počítaly dvakrát)
  if (klic.endsWith('|')) vyber = vyber.filter(k => !k.startsWith(klic));
  if (!vyber.includes(klic)) vyber.push(klic);
  window._kalk.zlozvyk.vyber = vyber; _kalkStavUloz(); _kalkKartaZnovu('zlozvyk');
}
function kalkZlozvykOdeber(klic) {
  const V = _kalkZlozvykVypocet(getData());
  window._kalk.zlozvyk.vyber = V.vyber.filter(k => k !== klic); _kalkStavUloz(); _kalkKartaZnovu('zlozvyk');
}
function kalkZlozvykAuto() { window._kalk.zlozvyk.vyber = null; _kalkStavUloz(); _kalkKartaZnovu('zlozvyk'); }

window.renderKalkulacky = renderKalkulacky;
window.kalkOtevri = kalkOtevri; window.kalkVstup = kalkVstup; window.kalkVstupZpet = kalkVstupZpet; window.kalkPrepocti = kalkPrepocti;
window.kalkZlozvykPridej = kalkZlozvykPridej; window.kalkZlozvykOdeber = kalkZlozvykOdeber; window.kalkZlozvykAuto = kalkZlozvykAuto;
window.mcSimuluj = mcSimuluj; window.mcPercentil = mcPercentil;
//  název stránky v hlavičce (PAGE_TITLES je v app.js – doplnit odsud, ať se app.js nemusí měnit)
try { if (typeof PAGE_TITLES !== 'undefined' && !PAGE_TITLES.kalkulacky) PAGE_TITLES.kalkulacky = '🧮 Kalkulačky'; } catch (e) {}
