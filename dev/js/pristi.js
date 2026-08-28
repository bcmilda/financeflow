// FinanceFlow · v9.94 · pristi.js · 2026-08-19
// ══════════════════════════════════════════════════════
//  PŘÍŠTÍ MĚSÍC (TODO-211) – predikce příjmů + kalendář jednoho měsíce dopředu.
//  Tarif: FREE. Horizont: JEN příští měsíc (delší výhled řeší „Kam směřuju").
//
//  Struktura dle Milanova zadání (PLAN-prijmy-pristi-mesic.md):
//    1) tabulka PŘÍJMY s daty     2) tabulka VÝDAJE s daty
//    3) průběžný zůstatek den po dni ("vyjdu do 15., než přijde výplata?")
//
//  Tři úrovně jistoty:
//    🟢 jisté        – šablona / splátka s konkrétním datem
//    🟡 pravděpodobné – pravidelný příjem podle historie (stabilityWeight ≥ 0,7)
//    ⚪ nejisté      – nepravidelný příjem; do hlavního součtu se NEZAPOČÍTÁVÁ
//
//  ⚠️ ROLLBACK (zrušení celé funkce) – viz patch-session19.md, sekce Rollback.
//     Rychlá cesta: PRISTI_ENABLED = false níže → položka v menu zmizí,
//     stránka se nevykreslí, nic dalšího se nemusí mazat.
// ══════════════════════════════════════════════════════

const PRISTI_ENABLED = true;   // ← ROLLBACK přepínač (false = funkce vypnutá)

const PRISTI_HIST_MONTHS  = 6;     // okno historie pro odhad příjmů
const PRISTI_STABLE_MIN   = 0.5;   // stabilityWeight ≥ 0,5 → „pravděpodobné" (S19.2, Milan: 0,7 bylo moc přísné)
const PRISTI_MIN_ROW      = 300;   // Kč – menší dopočet nad rámec šablony neukazuj

let _pristiMode = 'cal';           // 'cal' = kalendářní měsíc · 'pay' = od výplaty k výplatě
try { const _pm = localStorage.getItem('ff_pristi_mode'); if (_pm === 'pay' || _pm === 'cal') _pristiMode = _pm; } catch (e) {}

let _pristiLast = null;            // poslední spočítaná data (pro editaci řádků)

// ══════════════════════════════════════════════════════
//  POMOCNÉ
// ══════════════════════════════════════════════════════
const _pIso  = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const _pYm   = (m, y) => `${y}-${String(m + 1).padStart(2, '0')}`;
const _pDay  = d => `${d.getDate()}. ${d.getMonth() + 1}.`;
const _pMid  = arr => { if (!arr.length) return null; const a = arr.slice().sort((x, y) => x - y); return a[Math.floor((a.length - 1) / 2)]; };

// Cílový měsíc = měsíc NÁSLEDUJÍCÍ po zvoleném (reaguje na přepínač měsíce, SKILL 4)
function pristiTargetMonth() {
  let m = S.curMonth + 1, y = S.curYear;
  if (m > 11) { m = 0; y++; }
  return { m, y };
}

// Okno, za které se počítá.
//  Kalendářní = 1. → poslední den měsíce.
//  Od výplaty = FIX-253 (S19.2, nahlásil Milan): cyklus musí začínat dnem, kdy reálně
//  DORAZÍ HLAVNÍ PŘÍJEM. Dřív se bral obecný anchor z radarPaydayInfo() (medián dne
//  největšího příjmu / nastavení firstDay) – jenže když ten den nesedl na skutečnou
//  výplatu, výplata vypadla z okna a posunula se o celý měsíc dopředu (5. 9. → 5. 10.).
//  Nyní se kotva odvozuje z příjmů, které karta sama spočítala, takže hlavní příjem je
//  VŽDY prvním řádkem cyklu. radarPaydayInfo() zůstává jako záložní zdroj (SKILL 17).
function pristiCalWindow() {
  const t = pristiTargetMonth();
  const from = new Date(t.y, t.m, 1); from.setHours(0, 0, 0, 0);
  const to = new Date(t.y, t.m + 1, 0); to.setHours(0, 0, 0, 0);
  return { from, to, m: t.m, y: t.y, anchor: null, anchorName: '' };
}

// Kotva výplatního cyklu = největší JISTÝ nebo PRAVDĚPODOBNÝ příjem v kalendářním měsíci.
function pristiPaydayAnchor(incRows, D) {
  let best = null;
  (incRows || []).forEach(r => {
    if (r.off || r.level > 2) return;
    if (!best || r.amount > best.amount) best = r;
  });
  if (best) return { day: best.date.getDate(), name: best.name };
  let fb = 1;
  if (typeof radarPaydayInfo === 'function') {
    try { const P = radarPaydayInfo(D); fb = Math.max(1, Math.min(28, parseInt(P && P.anchor) || 1)); } catch (e) { fb = 1; }
  }
  return { day: fb, name: '' };
}

function pristiPayWindow(anchor) {
  const t = pristiTargetMonth();
  const dim = new Date(t.y, t.m + 1, 0).getDate();
  const from = new Date(t.y, t.m, Math.min(anchor.day, dim)); from.setHours(0, 0, 0, 0);
  const to = new Date(t.y, t.m + 1, Math.min(anchor.day, new Date(t.y, t.m + 2, 0).getDate()));
  to.setDate(to.getDate() - 1); to.setHours(0, 0, 0, 0);
  return { from, to, m: t.m, y: t.y, anchor: anchor.day, anchorName: anchor.name || '' };
}

// Den v měsíci → konkrétní datum uvnitř okna (u výplatního cyklu spadne do správného měsíce).
function pristiDayInWindow(day, W) {
  const mk = (y, m) => { const d = new Date(y, m, Math.min(day, new Date(y, m + 1, 0).getDate())); d.setHours(0, 0, 0, 0); return d; };
  let d = mk(W.from.getFullYear(), W.from.getMonth());
  if (d < W.from) d = mk(W.from.getFullYear(), W.from.getMonth() + 1);
  if (d > W.to) d = new Date(W.to);
  return d;
}

// Výskyty opakované šablony uvnitř libovolného okna [from, to].
// (budouciGetOccurrences umí jen „od dneška dopředu", proto vlastní varianta nad oknem.)
function pristiOccurrences(freq, den, from, to) {
  const out = [], DAY = 86400000;
  if (freq === 'weekly' || freq === 'biweekly') {
    const step = freq === 'weekly' ? 7 : 14;
    let cur = new Date(); cur.setHours(0, 0, 0, 0);
    let guard = 0;
    while (cur <= to && guard++ < 400) { if (cur >= from) out.push(new Date(cur)); cur = new Date(cur.getTime() + step * DAY); }
    return out;
  }
  if (freq === 'quarterly' || freq === 'yearly') {
    const stepM = freq === 'quarterly' ? 3 : 12;
    let cur = new Date(); cur.setHours(0, 0, 0, 0);
    let guard = 0;
    while (cur <= to && guard++ < 200) { if (cur >= from) out.push(new Date(cur)); cur = new Date(cur.getFullYear(), cur.getMonth() + stepM, cur.getDate()); }
    return out;
  }
  // monthly (výchozí)
  let y = from.getFullYear(), m = from.getMonth(), guard = 0;
  while (guard++ < 4) {
    const dim = new Date(y, m + 1, 0).getDate();
    const d = new Date(y, m, Math.min(den || 1, dim)); d.setHours(0, 0, 0, 0);
    if (d > to) break;
    if (d >= from) out.push(d);
    if (++m > 11) { m = 0; y++; }
  }
  return out;
}

// Dokončené měsíce před cílovým (nikdy probíhající ani budoucí – jinak by průměr sedl na půl měsíce)
function pristiHistMonths(m, y, n) {
  const now = new Date(), cm = now.getMonth(), cy = now.getFullYear();
  const out = []; let mm = m, yy = y;
  for (let i = 0; i < 30 && out.length < n; i++) {
    if (--mm < 0) { mm = 11; yy--; }
    if (yy > cy || (yy === cy && mm >= cm)) continue;
    out.push({ m: mm, y: yy });
  }
  return out;
}

// Váha stability příjmové kategorie (ADR-044). Neoznačené = 0.
function pristiWeight(cat) {
  if (!cat) return 0;
  if (cat.stabilityWeight !== undefined && cat.stabilityWeight !== null) return cat.stabilityWeight;
  return cat.stable === true ? 1 : 0;
}

// ══════════════════════════════════════════════════════
//  RUČNÍ ÚPRAVY (S.pristiCfg) – ukládá se do Firebase pod users/{uid}/data/pristiCfg
//  Tvar: { 'YYYY-MM': { start: number|null, rows: { key: { amt?:number, off?:true } } } }
// ══════════════════════════════════════════════════════
function pristiCfgRead(ym, D) {
  const all = (D || getData()).pristiCfg || {};
  const c = all[ym] || {};
  return { start: (typeof c.start === 'number') ? c.start : null, rows: c.rows || {}, custom: Array.isArray(c.custom) ? c.custom : [] };
}
function pristiCfgWrite(ym, mut) {
  if (typeof viewingUid !== 'undefined' && viewingUid) return false;
  if (!S.pristiCfg) S.pristiCfg = {};
  if (!S.pristiCfg[ym]) S.pristiCfg[ym] = { start: null, rows: {} };
  if (!S.pristiCfg[ym].rows) S.pristiCfg[ym].rows = {};
  if (!Array.isArray(S.pristiCfg[ym].custom)) S.pristiCfg[ym].custom = [];
  mut(S.pristiCfg[ym]);
  if (typeof save === 'function') save();
  if (typeof forceRender === 'function') forceRender(); else if (typeof renderPage === 'function') renderPage();
  return true;
}

// ══════════════════════════════════════════════════════
//  VÝPOČET (odděleno od renderu – vzor advisorBuildData/advisorRenderHTML)
// ══════════════════════════════════════════════════════
// Příjmové řádky pro libovolné okno. Vytaženo zvlášť, protože se volá DVAKRÁT:
// nejdřív nad kalendářním měsícem (aby se poznalo, kdy chodí hlavní výplata),
// a v režimu „od výplaty" znovu nad výplatním cyklem.
function pristiIncomeRows(D, W, cfg) {
  const inc = [], tplByCat = {};

  // ── ze šablon (🟢 jisté) ──
  (D.sablony || []).forEach(s => {
    if (!s || s.type !== 'income') return;
    if (s.endDate && new Date(s.endDate) < W.from) return;
    pristiOccurrences(s.freq || 'monthly', s.den || 1, W.from, W.to).forEach(d => {
      inc.push({
        key: 's:' + s.id + ':' + _pIso(d), level: 1, icon: '🔄',
        name: s.name || 'Příjem', amount: s.amount || 0, date: d,
        note: `${(typeof FREQ_LABELS !== 'undefined' && FREQ_LABELS[s.freq || 'monthly']) || 'měsíčně'} · pevná částka ze šablony`,
        src: 'šablona',
      });
      const cid = s.catId || '';
      tplByCat[cid] = (tplByCat[cid] || 0) + (s.amount || 0);
    });
  });

  // ── z historie (🟡 pravděpodobné / ⚪ nejisté) ──
  const hist = pristiHistMonths(W.m, W.y, PRISTI_HIST_MONTHS);
  const byCat = {};
  hist.forEach(h => {
    getTx(h.m, h.y, D).forEach(t => {
      if (!t || t.type !== 'income' || t.splitParent || t.isBalancing) return;
      if (typeof isTransferTx === 'function' && isTransferTx(t)) return;
      const cid = t.catId || t.category || '';
      if (!byCat[cid]) byCat[cid] = { sum: 0, days: [], months: {}, n: 0 };
      byCat[cid].sum += txCZK(t, D);
      byCat[cid].days.push(new Date(t.date).getDate());
      byCat[cid].months[`${h.y}-${h.m}`] = 1;   // v kolika měsících příjem opravdu přišel
      byCat[cid].n++;
    });
  });
  const nHist = hist.length;
  Object.keys(byCat).forEach(cid => {
    if (!nHist) return;
    const cat = (D.categories || []).find(c => c.id === cid) || null;
    const avg = byCat[cid].sum / nHist;
    const rest = avg - (tplByCat[cid] || 0);
    if (rest < PRISTI_MIN_ROW) return;                       // šablona už to pokrývá
    const w = pristiWeight(cat);
    inc.push({
      key: 'h:' + (cid || '_none'), level: w >= PRISTI_STABLE_MIN ? 2 : 3,
      icon: cat ? (cat.icon || '💵') : '❔',
      name: cat ? cat.name : 'Nezařazený příjem', amount: rest,
      date: pristiDayInWindow(_pMid(byCat[cid].days) || 15, W),
      note: (() => {                     // S19 (Milan): ukázat VZOREC, ne jen „Ø 6 měs."
        const b = byCat[cid];
        const mesicu = Object.keys(b.months).length;
        const den = _pMid(b.days) || 15;
        let t = `${fmtB(b.sum)} ÷ ${nHist} měs. = ${fmtB(avg)}`;
        if (tplByCat[cid]) t += ` − šablona ${fmtB(tplByCat[cid])}`;
        t += ` · ${b.n}× ve ${mesicu} z ${nHist} měsíců · obvykle ${den}. dne`;
        return t;
      })(),
      src: 'historie', est: true, weight: w,
    });
  });

  // ── vlastní ručně zapsané příjmy (🟢 – uživatel to ví jistě) ──
  ((cfg && cfg.custom) || []).forEach(c => {
    if (!c || c.type !== 'income') return;
    inc.push({
      key: 'c:' + c.id, level: 1, icon: '✍️', name: c.name || 'Vlastní příjem',
      amount: c.amount || 0, date: pristiDayInWindow(c.day || 1, W),
      note: 'vlastní zápis', src: 'ručně', custom: true,
    });
  });

  return { inc, nHist };
}

function pristiBuildData(D) {
  D = D || getData();
  const C = pristiCalWindow();
  const ym = _pYm(C.m, C.y);
  const cfg = pristiCfgRead(ym, D);
  const today = new Date(); today.setHours(0, 0, 0, 0);

  // ── 1+2) PŘÍJMY · v režimu „od výplaty" určí hlavní příjem kotvu cyklu (FIX-253) ──
  let W = C;
  let built = pristiIncomeRows(D, C, cfg);
  if (_pristiMode === 'pay') {
    W = pristiPayWindow(pristiPaydayAnchor(built.inc, D));
    built = pristiIncomeRows(D, W, cfg);
  }
  const inc = built.inc, nHist = built.nHist;
  const exp = [];   // výdajové řádky (skutečné výdaje)
  const sav = [];   // spoření a přesuny (nepočítá se do výdajů)
  const isPastWindow = W.to < today;

  // ── 3) VÝDAJE s datem – ze stávajícího budouciGetAll (SKILL 17) ─
  let planLoaded = false;
  if (!isPastWindow && typeof budouciGetAll === 'function') {
    try {
      const days = Math.ceil((W.to - today) / 86400000) + 2;
      budouciGetAll(D, Math.max(1, days)).forEach(it => {
        const d = new Date(it.date); d.setHours(0, 0, 0, 0);
        if (d < W.from || d > W.to) return;
        const row = {
          key: 'b:' + it.id, level: 1, icon: it.icon || '💸',
          name: it.name || 'Platba', amount: Math.abs(it.amount || 0), date: d,
          note: it.note || '', src: (typeof budouciSourceLabel === 'function' ? budouciSourceLabel(it.source) : it.source),
        };
        if (it.source === 'goal' || it.isTransfer) sav.push(row); else exp.push(row);
      });
      planLoaded = true;
    } catch (e) { planLoaded = false; }
  }

  // ── vlastní ručně zapsané výdaje ──
  ((cfg.custom) || []).forEach(c => {
    if (!c || c.type !== 'expense') return;
    exp.push({
      key: 'c:' + c.id, level: 1, icon: '✍️', name: c.name || 'Vlastní výdaj',
      amount: c.amount || 0, date: pristiDayInWindow(c.day || 1, W),
      note: 'vlastní zápis', src: 'ručně', custom: true,
    });
  });

  // ── 4) ODHAD BĚŽNÝCH VÝDAJŮ ───────────────────────────────────
  //  predictCat() zahrnuje i platby, které už máme výše s konkrétním datem
  //  (nájem, splátky) → musíme je odečíst, jinak by se počítaly DVAKRÁT.
  let predTotal = 0, predHit = 0;
  if (typeof predictCat === 'function') {
    (D.categories || []).filter(c => c.type === 'expense' || c.type === 'both').forEach(c => {
      const v = predictCat(c.id, null, W.m, W.y, D);
      if (typeof v === 'number' && isFinite(v) && v > 0) { predTotal += v; predHit++; }
    });
  }
  const knownExp = exp.reduce((a, r) => a + r.amount, 0);
  const estRaw = Math.max(0, predTotal - knownExp);

  // ── 5) Aplikace ručních úprav ─────────────────────────────────
  const applyCfg = r => {
    const o = cfg.rows[r.key];
    if (!o) return r;
    if (o.off) { r.off = true; }
    if (typeof o.amt === 'number' && isFinite(o.amt)) { r.autoAmount = r.amount; r.amount = o.amt; r.edited = true; }
    return r;
  };
  inc.forEach(applyCfg); exp.forEach(applyCfg); sav.forEach(applyCfg);

  const estRow = applyCfg({
    key: 'est', level: 4, icon: '📉', name: 'Odhad běžných výdajů',
    amount: estRaw, date: null, note: 'rozpuštěno přes celé období', src: 'predikce', est: true,
  });

  inc.sort((a, b) => a.date - b.date);
  exp.sort((a, b) => a.date - b.date);
  sav.sort((a, b) => a.date - b.date);

  // ── 6) Součty (vypnuté řádky se nepočítají) ───────────────────
  const live = r => !r.off;
  const sum = (arr, f) => arr.filter(r => live(r) && (!f || f(r))).reduce((a, r) => a + r.amount, 0);

  const incSure  = sum(inc, r => r.level === 1);
  const incLikely = sum(inc, r => r.level === 2);
  const incRisky = sum(inc, r => r.level === 3);
  const expKnown = sum(exp);
  const expEst   = estRow.off ? 0 : estRow.amount;
  const savTotal = sum(sav);

  const incPlanned = incSure + incLikely;             // s čím se dá počítat
  const rest = incPlanned - expKnown - expEst;

  // ── 7) Skutečnost (kalibrace – když už měsíc (částečně) proběhl) ─
  let real = null;
  if (W.from <= today) {
    let ri = 0, re = 0, n = 0;
    (D.transactions || []).forEach(t => {
      if (!t || !t.date || t.splitParent || t.isBalancing) return;
      if (typeof isTransferTx === 'function' && isTransferTx(t)) return;
      const d = new Date(t.date); d.setHours(0, 0, 0, 0);
      if (d < W.from || d > W.to) return;
      const a = txCZK(t, D);
      if (t.type === 'income') { ri += a; n++; } else if (t.type === 'expense') { re += a; n++; }
    });
    if (n) real = { inc: ri, exp: re, n, complete: isPastWindow };
  }

  // ── 8) Průběžný zůstatek den po dni ───────────────────────────
  const dayCount = Math.max(1, Math.round((W.to - W.from) / 86400000) + 1);
  const drip = expEst / dayCount;
  const timeline = [];
  let bal = (cfg.start != null) ? cfg.start : 0;
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(W.from.getTime() + i * 86400000); d.setHours(0, 0, 0, 0);
    const dIso = _pIso(d);
    const events = [];
    inc.forEach(r => { if (live(r) && r.level <= 2 && _pIso(r.date) === dIso) { bal += r.amount; events.push({ dir: 1, r }); } });
    exp.forEach(r => { if (live(r) && _pIso(r.date) === dIso) { bal -= r.amount; events.push({ dir: -1, r }); } });
    bal -= drip;
    if (events.length || i === 0 || i === dayCount - 1) timeline.push({ date: d, events, bal });
  }
  const minBal = timeline.length ? Math.min.apply(null, timeline.map(x => x.bal)) : 0;
  const minDay = timeline.length ? timeline[timeline.map(x => x.bal).indexOf(minBal)].date : null;

  return {
    W, ym, cfg, inc, exp, sav, estRow, timeline, dayCount, drip,
    incSure, incLikely, incRisky, incPlanned, expKnown, expEst, savTotal, rest,
    predTotal, predHit, knownExp, planLoaded, isPastWindow, real, minBal, minDay,
    nHist, hasAnything: !!(inc.length || exp.length || sav.length || expEst > 0),
  };
}

// ══════════════════════════════════════════════════════
//  AKCE
// ══════════════════════════════════════════════════════
function pristiSetMode(mode) {
  _pristiMode = (mode === 'pay') ? 'pay' : 'cal';
  try { localStorage.setItem('ff_pristi_mode', _pristiMode); } catch (e) {}
  if (typeof forceRender === 'function') forceRender(); else renderPristi();
}

function _pristiFindRow(key) {
  if (!_pristiLast) return null;
  return _pristiLast.inc.concat(_pristiLast.exp, _pristiLast.sav, [_pristiLast.estRow]).find(r => r.key === key) || null;
}

function pristiEditRow(keyEnc) {
  if (typeof viewingUid !== 'undefined' && viewingUid) return;
  const key = decodeURIComponent(keyEnc);
  const row = _pristiFindRow(key); if (!row || !_pristiLast) return;
  const cur = Math.round(row.amount || 0);
  const v = prompt(`${row.name}\n\nKolik to reálně bude? (${curSym()})\nPrázdné pole = zpět na automatický odhad.`, String(cur));
  if (v === null) return;
  const t = String(v).replace(/\s/g, '').replace(',', '.').trim();
  const ym = _pristiLast.ym;
  if (t === '') {
    pristiCfgWrite(ym, c => { if (c.rows[key]) { delete c.rows[key].amt; if (!c.rows[key].off) delete c.rows[key]; } });
    return;
  }
  const n = parseFloat(t);
  if (!isFinite(n) || n < 0) { if (typeof showToast === 'function') showToast('Zadej kladné číslo'); return; }
  pristiCfgWrite(ym, c => { c.rows[key] = Object.assign({}, c.rows[key], { amt: n }); });
}

function pristiToggleRow(keyEnc) {
  if (typeof viewingUid !== 'undefined' && viewingUid) return;
  const key = decodeURIComponent(keyEnc);
  if (!_pristiLast) return;
  const ym = _pristiLast.ym;
  pristiCfgWrite(ym, c => {
    const cur = c.rows[key] || {};
    if (cur.off) { delete cur.off; if (cur.amt === undefined) delete c.rows[key]; else c.rows[key] = cur; }
    else c.rows[key] = Object.assign({}, cur, { off: true });
  });
}

function pristiSetStart() {
  if (typeof viewingUid !== 'undefined' && viewingUid) return;
  if (!_pristiLast) return;
  const cur = _pristiLast.cfg.start;
  const bankNow = (typeof computeBank === 'function') ? Math.round(computeBank(getData())) : null;
  const v = prompt(
    `Kolik ti bude na začátku období na účtu? (${curSym()})\n` +
    (bankNow !== null ? `Aktuální stav podle appky: ${fmt(czkToBase(bankNow))}\n` : '') +
    'Prázdné pole = počítat od nuly (jen tok za období).',
    cur != null ? String(Math.round(czkToBase(cur))) : (bankNow !== null ? String(Math.round(czkToBase(bankNow))) : '')
  );
  if (v === null) return;
  const t = String(v).replace(/\s/g, '').replace(',', '.').trim();
  const ym = _pristiLast.ym;
  if (t === '') { pristiCfgWrite(ym, c => { c.start = null; }); return; }
  const n = parseFloat(t);
  if (!isFinite(n)) { if (typeof showToast === 'function') showToast('Zadej číslo'); return; }
  // uživatel zadává v základní měně → ukládáme v CZK (vnitřní jednotka appky)
  const rateBack = (typeof czkToBase === 'function' && czkToBase(100) !== 0) ? (100 / czkToBase(100)) : 1;
  pristiCfgWrite(ym, c => { c.start = Math.round(n * rateBack); });
}

// S19.2 (Milan): VLASTNÍ ZÁPIS PŘÍJMU / VÝDAJE. Historie ani šablony nepokryjí všechno –
//  vratka daní, jednorázová zakázka, plánovaný zubař. Uživatel to ví, appka ne.
//  Zapsané řádky jsou 🟢 jisté (uživatel je zadal vědomě) a platí jen pro daný měsíc.
function pristiAddCustom(type) {
  if (typeof viewingUid !== 'undefined' && viewingUid) return;
  if (!_pristiLast) return;
  const jeP = type === 'income';
  const name = prompt(jeP ? 'Název příjmu (např. Vratka daní, Zakázka)' : 'Název výdaje (např. Zubař, Servis auta)', '');
  if (name === null) return;
  if (!String(name).trim()) { if (typeof showToast === 'function') showToast('Zadej název'); return; }
  const av = prompt(`Částka (${curSym()})`, '');
  if (av === null) return;
  const amount = parseFloat(String(av).replace(/\s/g, '').replace(',', '.'));
  if (!isFinite(amount) || amount <= 0) { if (typeof showToast === 'function') showToast('Zadej kladnou částku'); return; }
  const dv = prompt('Který den v měsíci? (1–31)', '15');
  if (dv === null) return;
  const day = Math.max(1, Math.min(31, parseInt(dv) || 15));
  // uživatel zadává v základní měně → ukládáme v CZK (vnitřní jednotka appky)
  const rateBack = (typeof czkToBase === 'function' && czkToBase(100) !== 0) ? (100 / czkToBase(100)) : 1;
  pristiCfgWrite(_pristiLast.ym, c => {
    c.custom.push({ id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                    type: jeP ? 'income' : 'expense', name: String(name).trim().slice(0, 60),
                    amount: Math.round(amount * rateBack), day });
  });
}

function pristiDelCustom(idEnc) {
  if (typeof viewingUid !== 'undefined' && viewingUid) return;
  if (!_pristiLast) return;
  const id = decodeURIComponent(idEnc).replace(/^c:/, '');
  pristiCfgWrite(_pristiLast.ym, c => { c.custom = (c.custom || []).filter(x => x && x.id !== id); });
}

function pristiResetMonth() {
  if (typeof viewingUid !== 'undefined' && viewingUid) return;
  if (!_pristiLast) return;
  if (!confirm('Zahodit všechny ruční úpravy pro tento měsíc a vrátit se k automatickému odhadu?')) return;
  const ym = _pristiLast.ym;
  pristiCfgWrite(ym, c => { c.start = null; c.rows = {}; c.custom = []; });
  if (typeof showToast === 'function') showToast('↺ Ruční úpravy zrušeny');
}

// ══════════════════════════════════════════════════════
//  RENDER
// ══════════════════════════════════════════════════════
const _PRISTI_LVL = {
  1: { dot: '🟢', label: 'jisté',        col: '#4ade80' },
  2: { dot: '🟡', label: 'pravděpodobné', col: '#fbbf24' },
  3: { dot: '⚪', label: 'nejisté',      col: '#a8aec8' },
  4: { dot: '⚪', label: 'odhad',        col: '#a8aec8' },
};

function pristiRow(r, sign) {
  const L = _PRISTI_LVL[r.level] || _PRISTI_LVL[3];
  const ro = (typeof viewingUid !== 'undefined' && viewingUid);
  const k = encodeURIComponent(r.key);
  const dim = r.off ? 'opacity:.42;' : '';
  return `<tr style="${dim}border-bottom:1px solid var(--border)">
    <td style="padding:9px 6px 9px 0;white-space:nowrap;color:#c9cede;font-size:.76rem">${r.date ? _pDay(r.date) : '<span style="color:#a8aec8">průběžně</span>'}</td>
    <td style="padding:9px 6px">
      <div style="display:flex;align-items:center;gap:7px">
        <span style="font-size:1rem">${r.icon}</span>
        <span style="font-size:.85rem;font-weight:600;color:#e8eaf2">${escHtml(r.name)}${r.off ? ' <span style="font-size:.72rem;color:#a8aec8">(vypnuto)</span>' : ''}</span>
      </div>
      <div style="font-size:.73rem;color:#a8aec8;margin-top:2px">${L.dot} ${L.label}${r.note ? ' · ' + escHtml(r.note) : ''}${r.edited ? ` · <span style="color:#60a5fa">ručně upraveno${r.autoAmount != null ? ` (odhad byl ${fmtB(r.autoAmount)})` : ''}</span>` : ''}</div>
    </td>
    <td style="padding:9px 0 9px 6px;text-align:right;white-space:nowrap;font-weight:700;font-size:.88rem;color:${sign > 0 ? 'var(--income)' : 'var(--expense)'}">${sign > 0 ? '+' : '−'}${fmtB(r.amount)}</td>
    ${ro ? '' : `<td style="padding:9px 0 9px 8px;text-align:right;white-space:nowrap">
      <button type="button" title="Upravit částku" onclick="pristiEditRow('${k}')" style="background:none;border:1px solid var(--border2);border-radius:6px;color:#a8aec8;font-size:.72rem;padding:2px 7px;cursor:pointer">✎</button>
      <button type="button" title="${r.custom ? 'Smazat vlastní řádek' : (r.off ? 'Zapnout zpět' : 'Nepočítat tento řádek')}" onclick="${r.custom ? `pristiDelCustom('${k}')` : `pristiToggleRow('${k}')`}" style="background:none;border:1px solid var(--border2);border-radius:6px;color:#a8aec8;font-size:.72rem;padding:2px 7px;cursor:pointer;margin-left:3px">${r.custom ? '🗑' : (r.off ? '↺' : '✕')}</button>
    </td>`}
  </tr>`;
}

function pristiTable(title, rows, sign, emptyMsg, totalLabel, totalVal) {
  const ro = (typeof viewingUid !== 'undefined' && viewingUid);
  if (!rows.length) return `<div style="padding:14px 2px;font-size:.8rem;color:#a8aec8;line-height:1.6">${emptyMsg}</div>`;
  return `<table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:1px solid var(--border2)">
        <th style="text-align:left;padding:0 6px 6px 0;font-size:.72rem;color:#a8aec8;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Datum</th>
        <th style="text-align:left;padding:0 6px 6px;font-size:.72rem;color:#a8aec8;font-weight:600;text-transform:uppercase;letter-spacing:.05em">${title}</th>
        <th style="text-align:right;padding:0 0 6px 6px;font-size:.72rem;color:#a8aec8;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Částka</th>
        ${ro ? '' : '<th style="width:1px"></th>'}
      </tr></thead>
      <tbody>${rows.map(r => pristiRow(r, sign)).join('')}</tbody>
      <tfoot><tr>
        <td colspan="2" style="padding:10px 6px 0 0;font-size:.8rem;font-weight:700;color:#e8eaf2">${totalLabel}</td>
        <td style="padding:10px 0 0 6px;text-align:right;font-family:Syne,sans-serif;font-weight:800;font-size:1rem;color:${sign > 0 ? 'var(--income)' : 'var(--expense)'}">${sign > 0 ? '+' : '−'}${fmtB(totalVal)}</td>
        ${ro ? '' : '<td></td>'}
      </tr></tfoot>
    </table>`;
}

function pristiAddBtn(type) {
  if (typeof viewingUid !== 'undefined' && viewingUid) return '';
  const jeP = type === 'income';
  return `<div style="margin-bottom:10px">
    <button type="button" onclick="pristiAddCustom('${type}')" style="background:var(--surface3);border:1px dashed var(--border2);border-radius:9px;color:#c9cede;font-size:.76rem;padding:7px 12px;cursor:pointer">
      ✍️ Přidat vlastní ${jeP ? 'příjem' : 'výdaj'}</button>
    <span style="font-size:.73rem;color:#a8aec8;margin-left:9px">${jeP ? 'vratka daní, zakázka, dar — co historie neví' : 'zubař, servis, jednorázová platba'}</span>
  </div>`;
}

function pristiRenderHTML(P) {
  const W = P.W;
  const monthLabel = `${CZ_M[W.m]} ${W.y}`;
  const rangeLabel = _pristiMode === 'pay'
    ? `${_pDay(W.from)} – ${_pDay(W.to)} · cyklus začíná ${W.anchorName ? 'dnem, kdy chodí ' + escHtml(W.anchorName) : 'dnem výplaty'}`
    : `1. ${W.m + 1}. – ${_pDay(W.to)}`;

  // ── přepínač režimu ──
  const modeBtn = (id, lbl) => `<button type="button" onclick="pristiSetMode('${id}')" style="flex:1;padding:8px 0;border:none;border-radius:9px;font-size:.76rem;font-weight:${_pristiMode === id ? '700' : '500'};cursor:pointer;
      background:${_pristiMode === id ? 'var(--surface)' : 'transparent'};color:${_pristiMode === id ? '#e8eaf2' : '#a8aec8'};
      box-shadow:${_pristiMode === id ? '0 1px 4px rgba(0,0,0,.18)' : 'none'}">${lbl}</button>`;
  const modeSwitch = `<div style="display:flex;gap:4px;margin-bottom:14px;background:var(--surface2);border-radius:12px;padding:4px;border:1px solid var(--border)">
      ${modeBtn('cal', '📅 Kalendářní měsíc')}${modeBtn('pay', '💸 Od výplaty k výplatě')}</div>`;

  // ── hlavička ──
  const head = `<div class="card" style="margin-bottom:12px">
    <div class="card-body" style="padding:14px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-family:Syne,sans-serif;font-weight:800;font-size:1.15rem;color:#e8eaf2">📅 ${monthLabel}</div>
          <div style="font-size:.74rem;color:#a8aec8;margin-top:2px">${rangeLabel} · ${P.dayCount} dní</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:.73rem;color:#a8aec8">Zbude odhadem</div>
          <div style="font-family:Syne,sans-serif;font-weight:800;font-size:1.35rem;color:${P.rest >= 0 ? 'var(--income)' : 'var(--debt)'}">${P.rest >= 0 ? '' : '−'}${fmtB(Math.abs(P.rest))}</div>
        </div>
      </div>
      <div style="font-size:.74rem;color:#a8aec8;line-height:1.6;margin-top:10px">
        Všechna čísla jsou <strong style="color:#c9cede">odhad</strong>, ne slib. Čím výš je řádek v seznamu jistoty, tím spolehlivější.
        Cokoli tady můžeš přepsat ručně — ty víš víc než historie.
      </div>
    </div></div>`;

  // ── souhrnné karty ──
  const cards = statGrid([
    { value: fmtB(P.incSure),  label: '🟢 Jisté příjmy',  color: 'var(--income)', sub: 'šablony s datem' },
    { value: fmtB(P.incLikely), label: '🟡 Pravděpodobné', color: '#fbbf24', sub: 'podle historie' },
    { value: fmtB(P.incRisky), label: '⚪ Nejisté',       color: '#a8aec8', sub: 'nepočítá se' },
    { value: fmtB(P.expKnown), label: '🧾 Známé platby',  color: 'var(--expense)', sub: 's konkrétním datem' },
    { value: fmtB(P.expEst),   label: '📉 Odhad výdajů',  color: 'var(--expense)', sub: 'zbytek běžného života' },
    { value: fmtB(P.savTotal), label: '🎯 Spoření',       color: 'var(--bank)', sub: 'mimo výdaje' },
  ], 3);

  // ── tabulky ──
  const incRows = P.inc.filter(r => r.level <= 2);
  const riskyRows = P.inc.filter(r => r.level === 3);

  const incCard = sectionCard('💰 Příjmy', `
    ${pristiAddBtn('income')}
    ${pristiTable('Zdroj', incRows, 1,
      `Zatím neumím říct, kolik ti přijde. Appka bere příjmy ze dvou míst:
       <strong style="color:#c9cede">opakovaných šablon</strong> (přesné datum i částka) a z <strong style="color:#c9cede">historie příjmových kategorií</strong>
       označených jako stabilní. Nastav si výplatu jako šablonu v <a href="#" onclick="showPage('sablony');return false" style="color:#60a5fa;text-decoration:none">Opakovaných šablonách</a>
       a v <a href="#" onclick="showPage('kategorie');return false" style="color:#60a5fa;text-decoration:none">Kategoriích</a> nastav u příjmů charakter a stabilitu.`,
      'Příjmy, se kterými počítám', P.incPlanned)}
    ${riskyRows.length ? `
      <div style="margin-top:16px;padding-top:12px;border-top:1px dashed var(--border2)">
        <div style="font-size:.8rem;font-weight:700;color:#e8eaf2;margin-bottom:4px">⚪ Nejisté příjmy — mimo součet</div>
        <div style="font-size:.73rem;color:#a8aec8;line-height:1.6;margin-bottom:8px">
          Brigády, prodeje, jednorázovky. Do plánu je nezapočítávám schválně: kdo si podle nich naplánuje výdaj a peníze nepřijdou, dostane se do potíží.
          Kdyby dorazily všechny, měl bys navíc <strong style="color:#c9cede">${fmtB(P.incRisky)}</strong>.
        </div>
        ${pristiTable('Zdroj', riskyRows, 1, '', 'Kdyby všechno vyšlo', P.incRisky)}
      </div>` : ''}
  `);

  const expCard = sectionCard('🧾 Výdaje', `
    ${pristiAddBtn('expense')}
    ${pristiTable('Platba', P.exp.concat([P.estRow]), -1,
      'Žádné plánované platby ani odhad. Přidej opakované šablony, splátky nebo naimportuj historii — z ní se odhad počítá.',
      'Výdaje celkem', P.expKnown + P.expEst)}
    <div style="font-size:.73rem;color:#a8aec8;line-height:1.65;margin-top:12px;padding-top:10px;border-top:1px solid var(--border)">
      <strong style="color:#c9cede">Jak vzniká „Odhad běžných výdajů":</strong>
      predikce všech výdajových kategorií na ${CZ_M[W.m].toLowerCase()} = <strong style="color:#c9cede">${fmtB(P.predTotal)}</strong>
      (z ${P.predHit} kategorií, včetně sezónnosti). Od toho odečítám <strong style="color:#c9cede">${fmtB(P.knownExp)}</strong>
      plateb, které už mají v seznamu výše svoje datum — jinak by se nájem a splátky počítaly dvakrát.
      ${P.expEst > 0
        ? `Zbytek <strong style="color:#c9cede">${fmtB(P.expEst)}</strong> je běžný život: jídlo, doprava, drobnosti.`
        : `Známé platby s datem tentokrát <strong style="color:#c9cede">převyšují celou predikci</strong>, takže na běžný život už odhad nic nepřidává (nula, ne chyba). Stává se to, když jsou velké splátky vedené v kategoriích, ze kterých se predikce počítá. Pokud víš, že kromě nich ještě něco utratíš, přidej si to tlačítkem <strong style="color:#c9cede">Přidat vlastní výdaj</strong>.`}
    </div>`);

  const savCard = P.sav.length ? sectionCard('🎯 Spoření a přesuny', `
    ${pristiTable('Kam', P.sav, -1, '', 'Odloženo stranou', P.savTotal)}
    <div style="font-size:.73rem;color:#a8aec8;line-height:1.65;margin-top:10px">
      Tyhle částky <strong style="color:#c9cede">nejsou výdaj</strong> — peníze ti zůstávají, jen se přesouvají jinam.
      Proto se nepočítají do „Zbude odhadem" ani do zůstatku níže.
    </div>`) : '';

  // ── průběžný zůstatek ──
  const startLabel = P.cfg.start != null ? fmtB(P.cfg.start) : 'od nuly';
  const tl = P.timeline.map(x => {
    const names = x.events.map(e => `${e.dir > 0 ? '+' : '−'}${fmtB(e.r.amount)} ${escHtml(e.r.name)}`).join(' · ');
    return `<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:7px 6px 7px 0;white-space:nowrap;font-size:.76rem;color:#c9cede">${_pDay(x.date)}</td>
      <td style="padding:7px 6px;font-size:.76rem;color:#a8aec8">${names || '<span style="color:#7e84a0">běžné výdaje</span>'}</td>
      <td style="padding:7px 0 7px 6px;text-align:right;white-space:nowrap;font-weight:700;font-size:.84rem;color:${x.bal >= 0 ? '#c9cede' : 'var(--debt)'}">${x.bal >= 0 ? '' : '−'}${fmtB(Math.abs(x.bal))}</td>
    </tr>`;
  }).join('');

  const balCard = sectionCard('📈 Průběžný zůstatek', `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px">
      <div style="font-size:.78rem;color:#c9cede">Počítám <strong>${startLabel}</strong> ${P.cfg.start != null ? 'na začátku období' : '(jen tok peněz za období)'}</div>
      ${(typeof viewingUid !== 'undefined' && viewingUid) ? '' : `<button type="button" onclick="pristiSetStart()" style="background:var(--surface3);border:1px solid var(--border2);border-radius:8px;color:#c9cede;font-size:.74rem;padding:5px 10px;cursor:pointer">Nastavit počáteční zůstatek</button>`}
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:1px solid var(--border2)">
        <th style="text-align:left;padding:0 6px 6px 0;font-size:.72rem;color:#a8aec8;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Den</th>
        <th style="text-align:left;padding:0 6px 6px;font-size:.72rem;color:#a8aec8;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Co se stane</th>
        <th style="text-align:right;padding:0 0 6px 6px;font-size:.72rem;color:#a8aec8;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Zůstatek</th>
      </tr></thead>
      <tbody>${tl}</tbody>
    </table>
    <div style="font-size:.73rem;color:#a8aec8;line-height:1.65;margin-top:11px;padding-top:10px;border-top:1px solid var(--border)">
      Zůstatek klesá i ve dnech bez konkrétní platby — odhad běžných výdajů
      (<strong style="color:#c9cede">${fmtB(P.drip)}</strong> na den) je rozpuštěný rovnoměrně přes celé období.
      Nejníž se dostaneš <strong style="color:#c9cede">${P.minDay ? _pDay(P.minDay) : '–'}</strong> na
      <strong style="color:${P.minBal >= 0 ? '#c9cede' : 'var(--debt)'}">${P.minBal >= 0 ? '' : '−'}${fmtB(Math.abs(P.minBal))}</strong>.
      ${P.minBal < 0 && P.cfg.start == null ? 'Záporné číslo tady neznamená problém — počítá se od nuly, ne od tvého skutečného stavu na účtu. Nastav si počáteční zůstatek a bude to odpovídat realitě.' : ''}
    </div>`);

  // ── kalibrace ──
  let realCard = '';
  if (P.real) {
    const dInc = P.real.inc - P.incPlanned;
    const dExp = P.real.exp - (P.expKnown + P.expEst);
    const pct = (d, base) => base > 0 ? `${d >= 0 ? '+' : ''}${Math.round(d / base * 100)} %` : '–';
    realCard = sectionCard(`🔎 Jak odhad dopadl${P.real.complete ? '' : ' (zatím)'}`, `
      <table style="width:100%;border-collapse:collapse;font-size:.8rem">
        <tr style="border-bottom:1px solid var(--border)">
          <td style="padding:8px 0;color:#c9cede">Příjmy</td>
          <td style="padding:8px 6px;text-align:right;color:#a8aec8">odhad ${fmtB(P.incPlanned)}</td>
          <td style="padding:8px 6px;text-align:right;color:#e8eaf2;font-weight:700">skutečnost ${fmtB(P.real.inc)}</td>
          <td style="padding:8px 0 8px 6px;text-align:right;font-weight:700;color:${dInc >= 0 ? 'var(--income)' : 'var(--debt)'}">${pct(dInc, P.incPlanned)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#c9cede">Výdaje</td>
          <td style="padding:8px 6px;text-align:right;color:#a8aec8">odhad ${fmtB(P.expKnown + P.expEst)}</td>
          <td style="padding:8px 6px;text-align:right;color:#e8eaf2;font-weight:700">skutečnost ${fmtB(P.real.exp)}</td>
          <td style="padding:8px 0 8px 6px;text-align:right;font-weight:700;color:${dExp <= 0 ? 'var(--income)' : 'var(--debt)'}">${pct(dExp, P.expKnown + P.expEst)}</td>
        </tr>
      </table>
      <div style="font-size:.73rem;color:#a8aec8;line-height:1.65;margin-top:10px">
        ${P.real.complete
          ? 'Období už proběhlo — tady vidíš, jak přesný odhad byl. Čím víc měsíců projde, tím líp poznáš, jestli se na predikci dá spolehnout.'
          : 'Období právě běží, zapsáno ' + P.real.n + ' transakcí. Konečné srovnání dává smysl až po jeho skončení.'}
      </div>`);
  }

  // ── patička s ovládáním a odkazy ──
  const hasEdits = Object.keys(P.cfg.rows || {}).length > 0 || P.cfg.start != null;
  const foot = `<div class="card"><div class="card-body" style="padding:13px 14px">
      <div style="font-size:.74rem;color:#a8aec8;line-height:1.7">
        <strong style="color:#c9cede">Jak to číst:</strong>
        🟢 jisté = máš na to šablonu nebo splátku s datem · 🟡 pravděpodobné = odvozeno z historie stabilní kategorie ·
        ⚪ nejisté = nepravidelný příjem, do plánu se nepočítá.
        Tlačítkem <strong style="color:#c9cede">✎</strong> kterýkoli řádek přepíšeš, <strong style="color:#c9cede">✕</strong> ho z výpočtu vyřadíš.
        Úpravy platí jen pro tenhle měsíc a synchronizují se mezi zařízeními.
      </div>
      <div style="font-size:.74rem;color:#a8aec8;line-height:1.7;margin-top:8px">
        Tahle stránka řeší <strong style="color:#c9cede">jeden konkrétní měsíc po dnech</strong>.
        Dlouhodobý směr (6 měsíců dopředu) najdeš ve
        <a href="#" onclick="showPage('obraz');return false" style="color:#60a5fa;text-decoration:none">Finančním obrazu → Kam směřuju</a>,
        seznam všech budoucích plateb v
        <a href="#" onclick="showPage('budouci');return false" style="color:#60a5fa;text-decoration:none">Budoucích platbách</a>.
      </div>
      ${hasEdits && !(typeof viewingUid !== 'undefined' && viewingUid)
        ? `<button type="button" onclick="pristiResetMonth()" style="margin-top:11px;background:var(--surface3);border:1px solid var(--border2);border-radius:8px;color:#c9cede;font-size:.74rem;padding:6px 11px;cursor:pointer">↺ Zrušit ruční úpravy pro ${CZ_M[W.m].toLowerCase()}</button>`
        : ''}
    </div></div>`;

  return modeSwitch + head
    + `<div style="margin-bottom:14px">${cards}</div>`
    + incCard + `<div style="height:12px"></div>`
    + expCard + `<div style="height:12px"></div>`
    + (savCard ? savCard + `<div style="height:12px"></div>` : '')
    + balCard + `<div style="height:12px"></div>`
    + (realCard ? realCard + `<div style="height:12px"></div>` : '')
    + foot;
}

function renderPristi() {
  const el = document.getElementById('pristiContent');
  if (!el) return;
  if (!PRISTI_ENABLED) { el.innerHTML = ''; return; }
  const D = getData();
  const P = pristiBuildData(D);
  _pristiLast = P;
  if (!P.hasAnything) {
    el.innerHTML = `<div class="card"><div class="card-body" style="padding:20px">
      ${emptyState('📅', `Pro ${CZ_M[P.W.m].toLowerCase()} zatím nemám z čeho počítat`, '')}
      <div style="font-size:.8rem;color:#a8aec8;line-height:1.75;margin-top:6px">
        Prověřil jsem opakované šablony, splátky půjček, finanční cíle, narozeniny i historii posledních ${PRISTI_HIST_MONTHS} měsíců — nic z toho zatím není vyplněné.<br><br>
        <strong style="color:#c9cede">Nejrychlejší cesta k výsledku:</strong><br>
        1. Založ si výplatu jako <a href="#" onclick="showPage('sablony');return false" style="color:#60a5fa;text-decoration:none">opakovanou šablonu</a> (typ Příjem, den v měsíci, částka).<br>
        2. Stejně zapiš nájem, splátky a předplatné — dostanou konkrétní datum.<br>
        3. V <a href="#" onclick="showPage('kategorie');return false" style="color:#60a5fa;text-decoration:none">Kategoriích</a> nastav u příjmů charakter (pravidelný / nepravidelný) — podle toho poznám, čemu se dá věřit.<br><br>
        Odhad běžných výdajů se rozjede sám, jakmile budeš mít pár měsíců transakcí.
      </div>
    </div></div>`;
    return;
  }
  el.innerHTML = pristiRenderHTML(P);
}

// Vstupní bod z renderPage + skrytí položky v menu, když je funkce vypnutá (rollback).
function renderPristiPage() {
  if (!PRISTI_ENABLED) {
    const nav = document.getElementById('navPristi');
    if (nav) nav.style.display = 'none';
    return;
  }
  renderPristi();
}

// ROLLBACK: když je funkce vypnutá, schovej i položku v menu (ať neodkazuje na prázdnou stránku).
if (!PRISTI_ENABLED) {
  try {
    document.addEventListener('DOMContentLoaded', () => {
      const n = document.getElementById('navPristi'); if (n) n.style.display = 'none';
    });
  } catch (e) {}
}
