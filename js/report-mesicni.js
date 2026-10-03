// FinanceFlow · v11.27 · report-mesicni.js · 2026-10-03
// ══════════════════════════════════════════════════════
//  S24 (v11.27, TODO-317 F2, Milan): MĚSÍČNÍ REPORT NA SKUTEČNÝCH DATECH
//  cesta: Report (🗂️) → „📄 Měsíční report"   (matice kategorií = druhá záložka)
//  Design ze schváleného návrhu report-nahled-v4 (ADR-182): bílý papír A4,
//  IBCS notace, nadpis grafu = sdělení. Free: 2 strany, Premium: 4 strany.
//  ⚠️ Postřehy a doporučení jsou zatím SPOČÍTANÉ PRAVIDLY (ne AI) – AI vrstva
//  (komentář, hodnocení, predikce) přijde přes worker v dalším kroku F3.
//  Všechna čísla z jednoho objektu `rd` (mesReportData) – sedí na sebe.
// ══════════════════════════════════════════════════════

const RP_KARTY_BARVY = { bydleni:'#0072B2', jidlo:'#E69F00', doprava:'#56B4E9', nakupy:'#CC79A7', zabava:'#009E73', predplatne:'#8C6BB1', ostatni:'#A0A7B4' };
const RP_MES = ['leden','únor','březen','duben','květen','červen','červenec','srpen','září','říjen','listopad','prosinec'];
const RP_MES2 = ['led','úno','bře','dub','kvě','čvn','čvc','srp','zář','říj','lis','pro'];
const RP_MES6 = ['lednu','únoru','březnu','dubnu','květnu','červnu','červenci','srpnu','září','říjnu','listopadu','prosinci'];
const _rpE = s => (typeof escHtml === 'function') ? escHtml(s) : String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
const _rpKc = v => Math.round(v).toLocaleString('cs-CZ') + ' Kč';
const _rpKcz = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(Math.round(v)).toLocaleString('cs-CZ') + ' Kč';
const _rpPct = (a, b) => b ? (a - b) / b * 100 : 0;
const _rpP0 = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(Math.round(v)) + ' %';
const _rpP1 = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1).replace('.', ',') + ' %';
const _rpT = v => (Math.round(v / 100) / 10).toLocaleString('cs-CZ') + ' tis.';
const _rpMinus = (m, y, k) => { let mm = m - k, yy = y; while (mm < 0) { mm += 12; yy--; } return [mm, yy]; };

// ── DATA ────────────────────────────────────────────────────────────
function mesReportData(D, m, y) {
  D = D || getData();
  const tx = getTx(m, y, D);
  const inc = incSum(tx, D), vyd = expSum(tx, D), bil = inc - vyd;
  const mesic = (k) => { const [mm, yy] = _rpMinus(m, y, k); const t = getTx(mm, yy, D); return { m: mm, y: yy, tx: t, p: incSum(t, D), v: expSum(t, D) }; };
  const pm = mesic(1), a3 = [1, 2, 3].map(mesic);
  const avg = { p: a3.reduce((a, x) => a + x.p, 0) / 3, v: a3.reduce((a, x) => a + x.v, 0) / 3 };
  const ly = (() => { const t = getTx(m, y - 1, D); return { p: incSum(t, D), v: expSum(t, D) }; })();
  const rok = []; for (let k = 11; k >= 0; k--) { const x = mesic(k); rok.push({ l: RP_MES2[x.m], p: x.p, v: x.v }); }
  // skupiny (karty Reportu, účtenky po položkách)
  const sk0 = (typeof reportKartySoucty === 'function') ? reportKartySoucty(tx, D) : {};
  const skMM = (typeof reportKartySoucty === 'function') ? reportKartySoucty(pm.tx, D) : {};
  const skA = a3.map(x => (typeof reportKartySoucty === 'function') ? reportKartySoucty(x.tx, D) : {});
  const karty = (typeof REPORT_KARTY !== 'undefined' ? REPORT_KARTY : []).map(k => ({
    id: k.id, n: k.n, c: RP_KARTY_BARVY[k.id] || '#A0A7B4',
    v: (sk0[k.id] || {}).celkem || 0, mm: (skMM[k.id] || {}).celkem || 0,
    avg: skA.reduce((a, s) => a + ((s[k.id] || {}).celkem || 0), 0) / 3,
    top: Object.entries((sk0[k.id] || {}).kat || {}).sort((a, b) => b[1] - a[1]).slice(0, 2),
  })).filter(k => k.v > 0 || k.mm > 0 || k.avg > 0);
  // příjmy podle kategorie
  const pk = {}; tx.filter(t => t.type === 'income' && !t.isBalancing && !t.splitParent && !isTransferTx(t)).forEach(t => {
    const c = (D.categories || []).find(x => x.id === (t.catId || t.category)); const n = c ? c.name : 'Ostatní';
    pk[n] = (pk[n] || 0) + txCZK(t, D); });
  const prijmy = Object.entries(pk).sort((a, b) => b[1] - a[1]);
  // den po dni
  const dni = new Date(y, m + 1, 0).getDate(), dV = Array(dni).fill(0), dP = Array(dni).fill(0);
  tx.forEach(t => { if (t.isBalancing || t.splitParent || isTransferTx(t)) return; const d = new Date(t.date).getDate() - 1; if (d < 0 || d >= dni) return;
    if (t.type === 'expense') dV[d] += txCZK(t, D); else if (t.type === 'income') dP[d] += txCZK(t, D); });
  const kumNet = []; dV.reduce((a, v, i) => (kumNet[i] = a + dP[i] - v), 0);
  // rozpočty (limit finančního zdraví)
  const rozp = (D.categories || []).filter(c => (c.type === 'expense' || c.type === 'both') && (c.healthAmt > 0 || c.healthPct > 0)).map(c => {
    const lim = c.healthAmt > 0 ? (c.healthPct > 0 ? Math.min(c.healthAmt, c.healthPct / 100 * avg.p) : c.healthAmt) : c.healthPct / 100 * avg.p;
    const v = tx.filter(t => t.type === 'expense' && (t.catId || t.category) === c.id && !t.isBalancing && !t.splitParent && !isTransferTx(t)).reduce((a, t) => a + txCZK(t, D), 0);
    return { n: c.name, ikona: c.icon || '', c: c.color || '#1E293B', lim, v };
  }).filter(r => r.lim > 0).sort((a, b) => (b.v / b.lim) - (a.v / a.lim)).slice(0, 6);
  // největší výdaje
  const nejvetsi = tx.filter(t => t.type === 'expense' && !t.isBalancing && !t.splitParent && !isTransferTx(t))
    .map(t => { const c = (D.categories || []).find(x => x.id === (t.catId || t.category)); return { d: t.date, n: t.name || (c && c.name) || 'Výdaj', k: c ? c.name : '', v: txCZK(t, D) }; })
    .sort((a, b) => b.v - a.v).slice(0, 5);
  // pravidelné platby (šablony) + příští měsíc
  const sab = (D.sablony || []).filter(s => s && !s.paused && (!s.endDate || new Date(s.endDate) >= new Date(y, m, 1)));
  const fN = { weekly: 52 / 12, biweekly: 26 / 12, monthly: 1, quarterly: 1 / 3, halfyearly: 1 / 6, yearly: 1 / 12, once: 0 };
  const pravidelne = sab.filter(s => s.type !== 'income').map(s => ({ n: s.name || 'Platba', v: s.amount || 0, mes: (s.amount || 0) * (fN[s.freq || 'monthly'] ?? 1), den: s.den || 1, freq: s.freq || 'monthly' }))
    .sort((a, b) => b.mes - a.mes);
  const [nm, ny] = [m === 11 ? 0 : m + 1, m === 11 ? y + 1 : y];
  const pristi = sab.filter(s => (s.freq || 'monthly') === 'monthly').map(s => ({ d: Math.min(s.den || 1, new Date(ny, nm + 1, 0).getDate()), n: s.name || '', v: (s.type === 'income' ? 1 : -1) * (s.amount || 0) }))
    .sort((a, b) => a.d - b.d);
  // skóre
  let skore = null, skoreMM = null;
  try { const sc = computeFinancialScore(D, m, y); const z = scoreZobrazeni(sc); skore = { tot: z.tot, max: z.max, comps: sc.components, grade: sc.grade };
        const sp = computeFinancialScore(D, pm.m, pm.y); skoreMM = scoreZobrazeni(sp).tot; } catch (e) {}
  // peněženky dnes, dluhy, cíle
  const penezenky = (typeof getWallets === 'function' ? getWallets(D) : []).map(w => { let b = 0; try { b = computeWalletBalance(w.id, D); } catch (e) {} return { n: w.name, b }; });
  const dluhy = (D.debts || []).filter(d => (d.remaining || 0) > 0).map(d => ({ n: d.name || d.creditor || 'Půjčka', zb: d.remaining || 0, puv: d.total || d.remaining || 0, spl: d.payment || 0, urok: d.interest || 0 }));
  const cile = (D.wishes || []).filter(w => w && !w.done && (w.price || w.target)).map(w => ({ n: w.name || 'Cíl', ma: w.savedAmount || 0, cil: w.price || w.target })).slice(0, 3);
  // účtenky
  const pref = `${y}-${String(m + 1).padStart(2, '0')}`;
  const ucty = (D.receipts || []).filter(r => (r.date || '').startsWith(pref));
  const polozky = ucty.flatMap(r => (r.items || []).map(it => Object.assign({}, it, { date: r.date, store: r.store })));
  const vsePol = (D.receipts || []).flatMap(r => (r.items || []).map(it => Object.assign({}, it, { date: r.date, store: r.store })));
  let ucet = null;
  if (polozky.length) {
    const ut = typeof taxUtrataPodkategorie === 'function' ? taxUtrataPodkategorie(polozky, D) : null;
    let infl = null, inflPod = [];
    try { const col = _inflCollect(); const c = _inflCompute(col.obs); infl = c.yoy != null ? { v: c.yoy, typ: 'meziročně' } : (c.firstLast != null ? { v: c.firstLast, typ: 'od první ceny' } : null); inflPod = _inflPodlePodkategorii(col.obs).slice(0, 6); } catch (e) {}
    const ceny = typeof taxCenyVyvoj === 'function' ? taxCenyVyvoj(vsePol, D).polozky.filter(p => p.zmena != null).slice(0, 6) : [];
    const shr = typeof taxShrinkflace === 'function' ? taxShrinkflace(vsePol, D) : [];
    const ob = {}; ucty.forEach(r => { ob[r.store || 'Ostatní'] = (ob[r.store || 'Ostatní'] || 0) + (parseFloat(r.total) || 0); });
    const obS = Object.values(ob).reduce((a, b) => a + b, 0) || 1;
    ucet = { n: ucty.length, celkem: ut ? ut.celkem : 0, ut, infl, inflPod, ceny, shr,
      obchody: Object.entries(ob).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, v]) => [n, Math.round(v / obS * 100)]) };
  }
  // výhled příštího měsíce (pravidla): příjmy ze šablon / průměr, výdaje průměr 3M, pásmo = výkyv 6 měsíců
  const v6 = rok.slice(-6).map(x => x.v), mean6 = v6.reduce((a, b) => a + b, 0) / 6;
  const sd = Math.sqrt(v6.reduce((a, b) => a + (b - mean6) ** 2, 0) / 6);
  const sabPrij = pristi.filter(x => x.v > 0).reduce((a, x) => a + x.v, 0);
  const fcP = sabPrij > 0 ? sabPrij : avg.p, fcV = (vyd + avg.v * 2) / 3;
  return { m, y, nm, ny, inc, vyd, bil, mira: inc ? bil / inc * 100 : 0, pm, avg, ly, rok, karty, prijmy, dni, dV, dP, kumNet,
    rozp, nejvetsi, pravidelne, pristi, skore, skoreMM, penezenky, dluhy, cile, ucet,
    fc: { p: fcP, v: fcV, b: fcP - fcV, pasmo: Math.max(sd, fcV * 0.05) }, txN: tx.length };
}
window.mesReportData = mesReportData;

// ── SVG helpery ─────────────────────────────────────────────────────
function _rpSpark(arr, w, h, col) {
  if (!arr || arr.length < 2) return '';
  const mn = Math.min(...arr), mx = Math.max(...arr), r = (mx - mn) || 1;
  const p = arr.map((v, i) => [(i * w / (arr.length - 1)).toFixed(1), (h - 2 - (v - mn) / r * (h - 4)).toFixed(1)]);
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline fill="none" stroke="${col || '#94A3B8'}" stroke-width="1.2" points="${p.map(x => x.join(',')).join(' ')}"/><circle cx="${p.at(-1)[0]}" cy="${p.at(-1)[1]}" r="1.8" fill="#1E293B"/></svg>`;
}
function _rpTrend(rok) {
  const t = rok.slice(-6), W = 470, H = 170, P = [34, 8, 22, 24], mx = Math.max(1, ...t.map(x => Math.max(x.p, x.v))) * 1.08, bw = (W - P[0] - P[1]) / t.length;
  const Y = v => P[2] + (1 - v / mx) * (H - P[2] - P[3]);
  let s = [0, mx / 2.16, mx / 1.08].map(v => `<line x1="${P[0]}" x2="${W - P[1]}" y1="${Y(v)}" y2="${Y(v)}" stroke="#EEF1F5"/><text x="${P[0] - 4}" y="${Y(v) + 3}" font-size="8" text-anchor="end" fill="#8A94A6">${_rpT(v)}</text>`).join('');
  t.forEach((x, i) => { const last = i === t.length - 1, x0 = P[0] + i * bw + bw * .18, w = bw * .3, b = x.p - x.v;
    s += `<rect x="${x0}" y="${Y(x.p)}" width="${w}" height="${Y(0) - Y(x.p)}" fill="${last ? '#1E293B' : '#CBD5E1'}"/>`
      + `<rect x="${x0 + w + 2}" y="${Y(x.v)}" width="${w}" height="${Y(0) - Y(x.v)}" fill="${last ? '#1E293B' : '#CBD5E1'}" opacity=".55"/>`
      + `<text x="${x0 + w + 1}" y="${H - 10}" font-size="8" text-anchor="middle" fill="${last ? '#0F172A' : '#8A94A6'}" font-weight="${last ? 600 : 400}">${x.l}</text>`
      + (x.p || x.v ? `<text x="${x0 + w + 1}" y="${Y(Math.max(x.p, x.v)) - 5}" font-size="7.5" text-anchor="middle" fill="${b >= 0 ? '#0F8C6E' : '#C8501E'}">${_rpKcz(b).replace(' Kč', '')}</text>` : ''); });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%">${s}</svg>`;
}
function _rpKum(rd) {
  const W = 330, H = 150, P = [34, 8, 10, 20], a = rd.kumNet, n = a.length, mn = Math.min(0, ...a), mx = Math.max(1, ...a) * 1.08;
  const X = i => P[0] + i / (n - 1) * (W - P[0] - P[1]), Y = v => P[2] + (mx - v) / (mx - mn) * (H - P[2] - P[3]);
  const iMin = a.indexOf(Math.min(...a));
  let s = `<line x1="${P[0]}" x2="${W - P[1]}" y1="${Y(0)}" y2="${Y(0)}" stroke="#94A3B8"/>`;
  s += `<polyline fill="none" stroke="#1F45C8" stroke-width="1.8" points="${a.map((v, i) => X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')}"/>`;
  s += `<circle cx="${X(iMin)}" cy="${Y(a[iMin])}" r="2.6" fill="#B7791F"/><text x="${X(iMin) + 4}" y="${Y(a[iMin]) - 5}" font-size="7.5" fill="#B7791F">${iMin + 1}. den ${_rpKcz(a[iMin])}</text>`;
  s += `<text x="${X(n - 1)}" y="${Y(a[n - 1]) - 6}" font-size="8" text-anchor="end" font-weight="600">${_rpKcz(a[n - 1])}</text>`;
  [1, 10, 20, n].forEach(d => s += `<text x="${X(d - 1)}" y="${H - 6}" font-size="7.6" text-anchor="middle" fill="#8A94A6">${d}.</text>`);
  return `<svg viewBox="0 0 ${W} ${H}" width="100%">${s}</svg>`;
}
function _rpWaterfall(rd) {
  const W = 700, H = 190, P = [44, 10, 12, 34], s0 = rd.karty.filter(k => k.v > 0).slice().sort((a, b) => b.v - a.v), n = s0.length + 2, bw = (W - P[0] - P[1]) / n;
  const top = Math.max(rd.inc, rd.vyd) * 1.05 || 1, Y = v => P[2] + (1 - v / top) * (H - P[2] - P[3]);
  let s = '', run = rd.inc;
  s += `<rect x="${P[0] + bw * .15}" y="${Y(rd.inc)}" width="${bw * .7}" height="${Y(0) - Y(rd.inc)}" fill="#1E293B"/><text x="${P[0] + bw * .5}" y="${Y(rd.inc) - 4}" font-size="8" text-anchor="middle" font-weight="600">${_rpT(rd.inc)}</text><text x="${P[0] + bw * .5}" y="${H - 20}" font-size="7.8" text-anchor="middle" fill="#475569">Příjmy</text>`;
  s0.forEach((x, i) => { const x0 = P[0] + (i + 1) * bw, y1 = Y(run), y2 = Y(run - x.v);
    s += `<line x1="${x0 - bw * .15}" x2="${x0 + bw * .15}" y1="${y1}" y2="${y1}" stroke="#94A3B8"/><rect x="${x0 + bw * .15}" y="${Math.min(y1, y2)}" width="${bw * .7}" height="${Math.abs(y2 - y1)}" fill="${x.c}"/>`
      + `<text x="${x0 + bw * .5}" y="${Math.max(y1, y2) + 10}" font-size="7.6" text-anchor="middle" fill="#334155">−${(x.v / 1000).toFixed(1).replace('.', ',')}</text>`
      + `<text x="${x0 + bw * .5}" y="${H - 20}" font-size="7.6" text-anchor="middle" fill="#475569">${_rpE(x.n)}</text><text x="${x0 + bw * .5}" y="${H - 10}" font-size="7" text-anchor="middle" fill="#8A94A6">${rd.inc ? Math.round(x.v / rd.inc * 100) + ' % příjmů' : ''}</text>`; run -= x.v; });
  const xe = P[0] + (n - 1) * bw, col = rd.bil >= 0 ? '#0F8C6E' : '#C8501E';
  s += `<rect x="${xe + bw * .15}" y="${Math.min(Y(rd.bil), Y(0))}" width="${bw * .7}" height="${Math.abs(Y(0) - Y(rd.bil))}" fill="${col}"/><text x="${xe + bw * .5}" y="${Y(Math.max(rd.bil, 0)) - 4}" font-size="8" text-anchor="middle" font-weight="600" fill="${col}">${_rpT(rd.bil)}</text><text x="${xe + bw * .5}" y="${H - 20}" font-size="7.8" text-anchor="middle" fill="${col}" font-weight="600">${rd.bil >= 0 ? 'Ušetřeno' : 'Schodek'}</text>`;
  s += `<line x1="${P[0]}" x2="${W - P[1]}" y1="${Y(0)}" y2="${Y(0)}" stroke="#1E293B"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%">${s}</svg>`;
}
function _rpDev(karty) {
  const s = karty.map(x => ({ ...x, d: x.v - x.avg })).sort((a, b) => a.d - b.d), W = 330, H = Math.max(80, 20 * s.length + 10), L = 70, R = 44;
  const mx = Math.max(1, ...s.map(x => Math.abs(x.d))) * 1.1, rh = (H - 10) / Math.max(1, s.length), X = v => L + (W - L - R) / 2 + v / mx * (W - L - R) / 2;
  let g = `<line x1="${X(0)}" x2="${X(0)}" y1="2" y2="${H - 4}" stroke="#1E293B"/>`;
  s.forEach((x, i) => { const y = 6 + i * rh, ok = Math.abs(_rpPct(x.v, x.avg)) < 5 || Math.abs(x.d) < 300;
    g += `<text x="0" y="${y + rh / 2 + 3}" font-size="8" fill="#0F172A">${_rpE(x.n)}</text><rect x="${Math.min(X(0), X(x.d))}" y="${y + rh * .22}" width="${Math.max(1, Math.abs(X(x.d) - X(0)))}" height="${rh * .56}" fill="${ok ? '#CBD5E1' : x.d > 0 ? '#C8501E' : '#0F8C6E'}"/>`
      + `<text x="${x.d > 0 ? X(x.d) + 3 : X(x.d) - 3}" y="${y + rh / 2 + 3}" font-size="7.6" text-anchor="${x.d > 0 ? 'start' : 'end'}" fill="${ok ? '#8A94A6' : x.d > 0 ? '#C8501E' : '#0F8C6E'}">${ok ? '≈' : _rpKcz(x.d).replace(' Kč', '')}</text>`; });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%">${g}</svg>`;
}
function _rpFc(rd) {
  const r = rd.rok.slice(-6).map(x => ({ l: x.l, b: x.p - x.v })), f = rd.fc, W = 700, H = 160, P = [44, 10, 14, 22];
  const all = [...r.map(x => x.b), f.b + f.pasmo, f.b - f.pasmo, 0], mn = Math.min(...all), mx = Math.max(...all), sp = (mx - mn) || 1;
  const n = r.length + 1, bw = (W - P[0] - P[1]) / n, Y = v => P[2] + (mx - v) / sp * (H - P[2] - P[3]);
  let s = `<defs><pattern id="rpH" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#fff"/><line x1="0" y1="0" x2="0" y2="5" stroke="#1E293B" stroke-width="1.4"/></pattern></defs>`;
  s += `<line x1="${P[0]}" x2="${W - P[1]}" y1="${Y(0)}" y2="${Y(0)}" stroke="#94A3B8"/>`;
  r.forEach((x, i) => { const x0 = P[0] + i * bw + bw * .25, last = i === r.length - 1;
    s += `<rect x="${x0}" y="${Math.min(Y(0), Y(x.b))}" width="${bw * .5}" height="${Math.abs(Y(0) - Y(x.b))}" fill="${last ? '#1E293B' : '#CBD5E1'}"/><text x="${x0 + bw * .25}" y="${H - 8}" font-size="8" text-anchor="middle" fill="#8A94A6">${x.l}</text>`
      + `<text x="${x0 + bw * .25}" y="${Y(Math.max(0, x.b)) - 4}" font-size="7.4" text-anchor="middle" fill="${x.b >= 0 ? '#0F8C6E' : '#C8501E'}">${_rpKcz(x.b).replace(' Kč', '')}</text>`; });
  const x0 = P[0] + r.length * bw + bw * .25;
  s += `<rect x="${x0}" y="${Math.min(Y(0), Y(f.b))}" width="${bw * .5}" height="${Math.abs(Y(0) - Y(f.b))}" fill="url(#rpH)" stroke="#1E293B" stroke-width="1"/>`
    + `<line x1="${x0 + bw * .25}" x2="${x0 + bw * .25}" y1="${Y(f.b + f.pasmo)}" y2="${Y(f.b - f.pasmo)}" stroke="#1E293B" stroke-width="1.4"/>`
    + `<line x1="${x0 + bw * .12}" x2="${x0 + bw * .38}" y1="${Y(f.b + f.pasmo)}" y2="${Y(f.b + f.pasmo)}" stroke="#1E293B"/><line x1="${x0 + bw * .12}" x2="${x0 + bw * .38}" y1="${Y(f.b - f.pasmo)}" y2="${Y(f.b - f.pasmo)}" stroke="#1E293B"/>`
    + `<text x="${x0 + bw * .25}" y="${H - 8}" font-size="8" text-anchor="middle" font-weight="600">${RP_MES2[rd.nm]} (odhad)</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%">${s}</svg>`;
}

// ── STRANY ──────────────────────────────────────────────────────────
function _rpTop(rd, pod, pro) {
  const jm = (window._currentUser && window._currentUser.displayName) || '';
  return `<div class="c12 top"><div class="brand"><i></i>FinanceFlow</div><div class="meta">${pod}${jm ? ' · ' + _rpE(jm) : ''}<br><span class="tier${pro ? ' pro' : ''}">${pro ? 'Premium' : 'Free'}</span></div></div>`;
}
function _rpKpi(l, v, d, cls, extra) { return `<div><div class="l">${l}</div><div class="v">${v}</div><div class="d ${cls || ''}">${d}</div>${extra || ''}</div>`; }
function _rpLead(rd) {
  const M = RP_MES[rd.m], Mv = M.charAt(0).toUpperCase() + M.slice(1);
  if (!rd.txN) return `${Mv} zatím nemá žádné transakce.`;
  const nej = Math.max(...rd.rok.slice(0, 11).map(x => x.p - x.v));
  return rd.bil >= 0 ? `${Mv} skončil v plusu ${_rpKc(rd.bil)}, ušetřil jsi ${Math.round(rd.mira)} % příjmů${rd.bil > nej && rd.rok.slice(0, 11).some(x => x.p) ? ' – nejvíc za poslední rok' : ''}.`
    : `${Mv} skončil ve schodku ${_rpKc(-rd.bil)} – výdaje převýšily příjmy.`;
}
function _rpFree1(rd) {
  const mm = rd.pm, b0 = mm.p - mm.v, kat = rd.karty.slice().sort((a, b) => b.v - a.v), mxK = Math.max(1, ...kat.map(x => x.v));
  const r = [...kat.filter(k => k.v > 0).map(k => ({ n: k.n, c: k.c, v: k.v })), ...(rd.bil > 0 ? [{ n: 'Zůstalo', c: '#0F8C6E', v: rd.bil }] : [])];
  const tot = r.reduce((a, x) => a + x.v, 0) || 1;
  const nejSk = kat.map(k => ({ ...k, d: k.v - k.mm })).sort((a, b) => a.d - b.d);
  const penSum = rd.penezenky.reduce((a, w) => a + w.b, 0);
  return `<section class="page" aria-label="Strana 1">${_rpTop(rd, `Měsíční report · ${RP_MES[rd.m]} ${rd.y}`, false)}
  <div class="c12 title"><div><h1>${RP_MES[rd.m].charAt(0).toUpperCase() + RP_MES[rd.m].slice(1)} ${rd.y}</h1><p class="lead">${_rpLead(rd)}</p></div>
    <div class="verdict-box" style="border-color:${rd.bil >= 0 ? '#0F8C6E' : '#C8501E'}"><b>${_rpKcz(rd.bil)} na konci měsíce</b>${b0 || mm.p ? `${rd.bil >= b0 ? 'o ' + _rpKc(rd.bil - b0) + ' víc' : 'o ' + _rpKc(b0 - rd.bil) + ' méně'} než v ${RP_MES6[mm.m]}` : 'první měsíc s daty'}</div></div>
  <div class="c12 kpis" style="grid-template-columns:repeat(4,1fr)">
    ${_rpKpi('Příjmy', _rpKc(rd.inc), `${rd.inc >= mm.p ? '▲' : '▼'} ${_rpP1(_rpPct(rd.inc, mm.p))} <span>proti ${RP_MES6[mm.m]}</span>`, rd.inc >= mm.p ? 'up' : 'down')}
    ${_rpKpi('Výdaje', _rpKc(rd.vyd), `${rd.vyd > mm.v ? '▲' : '▼'} ${_rpP1(_rpPct(rd.vyd, mm.v))} <span>proti ${RP_MES6[mm.m]}</span>`, rd.vyd <= mm.v ? 'up' : 'down')}
    ${_rpKpi('Bilance', _rpKcz(rd.bil), `${_rpKcz(rd.bil - b0)} <span>proti ${RP_MES6[mm.m]}</span>`, rd.bil >= b0 ? 'up' : 'down')}
    ${_rpKpi('Míra úspor', Math.round(rd.mira) + ' %', `<span>v ${RP_MES6[mm.m]} ${mm.p ? Math.round(b0 / mm.p * 100) : 0} %</span>`, '')}</div>
  ${r.length ? `<div class="c12 sec river"><h2>${rd.bil > 0 ? `Z každých 100 Kč příjmu ti zůstalo ${Math.round(rd.bil / rd.inc * 100)} Kč` : 'Kam šly peníze'}</h2><div class="sub">Výdaje podle skupin${rd.bil > 0 ? ' a co zůstalo' : ''}</div>
    <div class="band">${r.map(x => `<div style="flex:${x.v};background:${x.c}">${x.v / tot >= .06 ? Math.round(x.v / (rd.inc || tot) * 100) + ' Kč' : ''}</div>`).join('')}</div>
    <div class="leg" style="grid-template-columns:repeat(${Math.min(8, r.length)},1fr)">${r.slice(0, 8).map(x => `<div style="border-color:${x.c}"><b>${_rpE(x.n)}</b>${_rpKc(x.v)}</div>`).join('')}</div></div>` : ''}
  <div class="c8 sec"><h2>${rd.vyd <= rd.avg.v ? 'Výdaje pod průměrem posledních 3 měsíců' : 'Výdaje nad průměrem posledních 3 měsíců'}</h2><div class="sub">Příjmy (tmavší) a výdaje (světlejší) za 6 měsíců, nad sloupci bilance</div>${_rpTrend(rd.rok)}</div>
  <div class="c4 sec"><h2>Peněženky</h2><div class="sub">Stav dnes</div><div style="font-size:19pt;font-weight:600;line-height:1.1">${_rpKc(penSum)}</div>
    <ul class="list" style="margin-top:2mm">${rd.penezenky.slice(0, 4).map(w => `<li><span>${_rpE(w.n)}</span><b>${_rpKc(w.b)}</b></li>`).join('')}</ul></div>
  <div class="c12 sec"><h2>${nejSk.length && nejSk[0].d < -300 ? `Nejvíc ušetřilo: ${_rpE(nejSk[0].n.toLowerCase())}` : 'Výdaje podle skupin'}${nejSk.length && nejSk.at(-1).d > 300 ? `, nejvíc přibylo: ${_rpE(nejSk.at(-1).n.toLowerCase())}` : ''}</h2><div class="sub">Změna proti ${RP_MES6[mm.m]}</div>
    <table><tr><th class="t">Skupina</th><th class="t" style="width:44%"></th><th>${RP_MES2[rd.m]}</th><th>Podíl</th><th>${RP_MES2[mm.m]}</th><th>Změna</th></tr>
    ${kat.map(x => { const d = x.v - x.mm, ok = Math.abs(d) < 300; return `<tr><td class="t"><span class="dot" style="background:${x.c}"></span>${_rpE(x.n)}</td><td class="t"><div class="bar" style="height:3mm"><i style="width:${x.v / mxK * 100}%;background:${x.c}"></i></div></td>
      <td><b>${_rpKc(x.v)}</b></td><td class="faint">${rd.vyd ? Math.round(x.v / rd.vyd * 100) : 0} %</td><td class="faint">${_rpKc(x.mm)}</td><td class="${ok ? 'faint' : d > 0 ? 'down' : 'up'}">${ok ? '≈ beze změny' : (d > 0 ? '▲ ' : '▼ ') + _rpKcz(d)}</td></tr>`; }).join('')}
    <tr class="sum"><td class="t">Celkem</td><td></td><td>${_rpKc(rd.vyd)}</td><td>100 %</td><td>${_rpKc(mm.v)}</td><td class="${rd.vyd <= mm.v ? 'up' : 'down'}">${_rpKcz(rd.vyd - mm.v)}</td></tr></table></div>
  <div class="foot"><span>Vygenerováno z tvých transakcí ${new Date().toLocaleDateString('cs-CZ')}</span><span>1 / ${rd._stran}</span></div></section>`;
}
function _rpFree2(rd, pro) {
  const predSum = rd.pravidelne.reduce((a, x) => a + x.mes, 0);
  const over = rd.rozp.filter(r => r.v > r.lim);
  const mxD = Math.max(1, ...rd.dV);
  const dny = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'];
  return `<section class="page" aria-label="Strana 2">${_rpTop(rd, `${RP_MES[rd.m]} ${rd.y} · rozpočty a platby`, pro)}
  <div class="c7 sec"><h2>${rd.rozp.length ? `${over.length} z ${rd.rozp.length} rozpočtů překročeno` : 'Rozpočty'}</h2><div class="sub">Plán obrysem, skutečnost plně · barva jen u překročení</div>
    ${rd.rozp.length ? rd.rozp.map(x => { const mx = Math.max(x.v, x.lim) * 1.12, p = x.v / x.lim * 100, ov = x.v > x.lim, near = !ov && p >= 85;
      return `<div style="display:grid;grid-template-columns:30mm 1fr 30mm;gap:3mm;align-items:center;padding:1.8mm 0;border-bottom:1px solid #F0F3F7"><span>${_rpE(x.ikona + ' ' + x.n)}</span>
       <svg viewBox="0 0 200 18" width="100%" height="18"><rect x=".5" y="2.5" width="${x.lim / mx * 200}" height="13" fill="none" stroke="#1E293B"/><rect x="0" y="5.5" width="${Math.min(x.v, x.lim) / mx * 200}" height="7" fill="#1E293B"/>${ov ? `<rect x="${x.lim / mx * 200}" y="5.5" width="${(x.v - x.lim) / mx * 200}" height="7" fill="#C8501E"/>` : ''}</svg>
       <span class="num"><b>${Math.round(p)} %</b> <span class="${ov ? 'down' : near ? 'warn' : 'faint'}" style="font-size:7.4pt">${ov ? 'přes o ' + _rpKc(x.v - x.lim) : 'zbývá ' + _rpKc(x.lim - x.v)}</span></span></div>`; }).join('')
      : '<div class="faint" style="font-size:8pt">Zatím žádný rozpočet. Nastavíš ho v Kategoriích (limit finančního zdraví).</div>'}</div>
  <div class="c5 sec"><h2>Pět největších výdajů</h2><div class="sub">Jednotlivé platby</div><table><tr><th class="t">Den</th><th class="t">Za co</th><th>Částka</th></tr>
    ${rd.nejvetsi.map(r => `<tr><td class="faint">${new Date(r.d).getDate()}. ${rd.m + 1}.</td><td class="t">${_rpE(r.n)}<div class="faint" style="font-size:7pt">${_rpE(r.k)}</div></td><td><b>${_rpKc(r.v)}</b></td></tr>`).join('') || '<tr><td colspan="3" class="faint">Žádné výdaje</td></tr>'}</table></div>
  <div class="c6 sec"><h2>${rd.pravidelne.length ? `Pravidelné platby: ${_rpKc(predSum)} měsíčně` : 'Pravidelné platby'}</h2><div class="sub">Z opakovaných šablon · přepočet na měsíc a rok</div>
    ${rd.pravidelne.length ? `<table><tr><th class="t">Platba</th><th>Měsíčně</th><th>Ročně</th></tr>${rd.pravidelne.slice(0, 8).map(r => `<tr><td class="t">${_rpE(r.n)}</td><td>${_rpKc(r.mes)}</td><td class="faint">${_rpKc(r.mes * 12)}</td></tr>`).join('')}
      <tr class="sum"><td class="t">Celkem ${rd.pravidelne.length}</td><td>${_rpKc(predSum)}</td><td>${_rpKc(predSum * 12)}</td></tr></table>` : '<div class="faint" style="font-size:8pt">Žádné šablony. Opakované platby si založíš v Opakovaných šablonách.</div>'}</div>
  <div class="c6 sec"><h2>Co tě čeká v ${RP_MES6[rd.nm]}</h2><div class="sub">Měsíční šablony – příjmy a pevné výdaje</div>
    ${rd.pristi.length ? `<table><tr><th class="t">Kdy</th><th class="t">Co</th><th>Částka</th></tr>${rd.pristi.slice(0, 8).map(r => `<tr><td class="faint">${r.d}. ${rd.nm + 1}.</td><td class="t">${_rpE(r.n)}</td><td class="${r.v > 0 ? 'up' : ''}">${_rpKcz(r.v)}</td></tr>`).join('')}
      <tr class="sum"><td></td><td class="t">Pevné výdaje celkem</td><td>${_rpKcz(rd.pristi.filter(r => r.v < 0).reduce((a, r) => a + r.v, 0))}</td></tr></table>` : '<div class="faint" style="font-size:8pt">Bez šablon nevím, co přijde.</div>'}</div>
  <div class="c12 sec"><h2>Útrata den po dni</h2><div class="sub">Čím tmavší, tím víc · nejvyšší den a denní průměr</div>
    <div class="cal">${rd.dV.map((v, i) => { const a = Math.min(1, v / mxD); return `<div style="background:rgba(31,69,200,${(0.06 + a * 0.8).toFixed(2)});color:${a > .55 ? '#fff' : '#334155'}"><b>${i + 1}.</b> ${dny[new Date(rd.y, rd.m, i + 1).getDay()]}<br>${v >= 1000 ? (v / 1000).toFixed(1).replace('.', ',') + 'k' : Math.round(v)}</div>`; }).join('')}</div></div>
  ${pro ? '' : `<div class="c12 teaser"><div class="blur"><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4mm"><div class="ai"><h3>Rozbor výdajů</h3><p>Vodopád od příjmu k úspoře…</p></div><div class="ai"><h3>Účtenky</h3><p>Tvoje inflace košíku…</p></div><div class="ai"><h3>Výhled</h3><p>Odhad příštího měsíce…</p></div></div></div>
    <div class="over"><b>V Premium reportu je rozbor na 4 strany</b><span>Vodopád od příjmu k úspoře, odchylky od průměru, finanční skóre, výhled příštího měsíce a doporučení.${rd.ucet ? ` Z tvých ${rd.ucet.n} účtenek uvidíš, co ti zdražilo, a svou osobní inflaci.` : ''}</span></div></div>`}
  <div class="foot"><span>Report nenahrazuje finanční poradenství.</span><span>2 / ${rd._stran}</span></div></section>`;
}
function _rpPostrehy(rd) {
  const out = [];
  const k = rd.karty.map(x => ({ ...x, d: x.v - x.avg })).filter(x => x.avg > 0);
  const dol = k.slice().sort((a, b) => a.d - b.d)[0], nah = k.slice().sort((a, b) => b.d - a.d)[0];
  if (dol && dol.d < -300) out.push([`${dol.n} ${_rpKcz(dol.d)} pod průměrem`, `Utratil jsi ${_rpKc(dol.v)} proti obvyklým ${_rpKc(dol.avg)} (${_rpP0(_rpPct(dol.v, dol.avg))}).${dol.top[0] ? ' Největší položka: ' + _rpE(dol.top[0][0]) + '.' : ''}`, 'Viz graf 2.2']);
  if (nah && nah.d > 300) out.push([`${nah.n} ${_rpKcz(nah.d)} nad průměrem`, `${_rpKc(nah.v)} proti obvyklým ${_rpKc(nah.avg)} (${_rpP0(_rpPct(nah.v, nah.avg))}).${nah.top[0] ? ' Nejvíc: ' + _rpE(nah.top[0][0]) + ' ' + _rpKc(nah.top[0][1]) + '.' : ''}`, 'Viz graf 2.2']);
  const a3m = rd.avg.p ? (rd.avg.p - rd.avg.v) / rd.avg.p * 100 : 0;
  out.push([`Míra úspor ${Math.round(rd.mira)} %`, `V průměru posledních 3 měsíců ${Math.round(a3m)} %. ${rd.mira >= a3m ? 'Měsíc byl lepší než obvykle.' : 'Měsíc byl slabší než obvykle.'}`, 'Viz graf 2.1']);
  if (rd.ucet && rd.ucet.infl) out.push([`Tvůj košík ${_rpP1(rd.ucet.infl.v)}`, `Osobní inflace z účtenek (${rd.ucet.infl.typ}).${rd.ucet.inflPod[0] ? ' Nejvíc táhne: ' + _rpE(rd.ucet.inflPod[0].pod.nazev) + ' ' + _rpP1(rd.ucet.inflPod[0].zmena) + '.' : ''}`, 'Viz strana 3']);
  return out.slice(0, 3);
}
function _rpPro1(rd) {
  const mm = rd.pm, ly = rd.ly, a = rd.avg, b0 = mm.p - mm.v, bA = a.p - a.v, bL = ly.p - ly.v;
  const tri = (x, y, z, inv) => { const cl = v => Math.abs(v) < 1 ? 'faint' : ((v > 0) !== !!inv ? 'up' : 'down');
    return `<div class="d" style="font-size:6.9pt;line-height:1.45"><span class="${cl(x)}">${_rpP0(x)}</span> <span>MM</span> · <span class="${cl(y)}">${_rpP0(y)}</span> <span>Ø3M</span> · <span class="${cl(z)}">${_rpP0(z)}</span> <span>loni</span></div>`; };
  const dluhSum = rd.dluhy.reduce((s, d) => s + d.zb, 0);
  const k = [['Příjmy', _rpKc(rd.inc), tri(_rpPct(rd.inc, mm.p), _rpPct(rd.inc, a.p), _rpPct(rd.inc, ly.p)), rd.rok.map(x => x.p)],
    ['Výdaje', _rpKc(rd.vyd), tri(_rpPct(rd.vyd, mm.v), _rpPct(rd.vyd, a.v), _rpPct(rd.vyd, ly.v), true), rd.rok.map(x => x.v)],
    ['Bilance', _rpKcz(rd.bil), `<div class="d" style="font-size:6.9pt"><span>MM</span> ${_rpKcz(b0)} · <span>Ø3M</span> ${_rpKcz(bA)}</div>`, rd.rok.map(x => x.p - x.v)],
    ['Míra úspor', Math.round(rd.mira) + ' %', `<div class="d" style="font-size:6.9pt"><span>Ø3M</span> ${a.p ? Math.round(bA / a.p * 100) : 0} % · <span>loni</span> ${ly.p ? Math.round(bL / ly.p * 100) : 0} %</div>`, rd.rok.map(x => x.p ? (x.p - x.v) / x.p : 0)],
    ['Skóre', rd.skore ? `${rd.skore.tot} / ${rd.skore.max}` : '—', `<div class="d" style="font-size:6.9pt">${rd.skore && rd.skoreMM != null ? `<span class="${rd.skore.tot >= rd.skoreMM ? 'up' : 'down'}">${rd.skore.tot >= rd.skoreMM ? '▲' : '▼'} ${Math.abs(rd.skore.tot - rd.skoreMM)}</span> <span>proti ${RP_MES6[mm.m]}</span>` : ''}</div>`, null],
    ['Dluhy', dluhSum ? _rpKc(dluhSum) : 'žádné', `<div class="d" style="font-size:6.9pt"><span>${rd.dluhy.length} ${rd.dluhy.length === 1 ? 'půjčka' : 'půjček'}</span></div>`, null]];
  const sc = rd.skore;
  return `<section class="page" aria-label="Premium strana 1">${_rpTop(rd, `Měsíční report · ${RP_MES[rd.m]} ${rd.y}`, true)}
  <div class="c12 title"><div><h1>${RP_MES[rd.m].charAt(0).toUpperCase() + RP_MES[rd.m].slice(1)} ${rd.y}</h1><p class="lead">${_rpLead(rd)}</p></div>
    <div class="verdict-box" style="border-color:${rd.bil >= 0 ? '#0F8C6E' : '#C8501E'}"><b>Míra úspor ${Math.round(rd.mira)} %</b>proti ${a.p ? Math.round(bA / a.p * 100) : 0} % v průměru 3 měsíců</div></div>
  <div class="c12 kpis" style="grid-template-columns:repeat(6,1fr)">${k.map(x => `<div><div class="l">${x[0]}</div><div class="v" style="font-size:12pt">${x[1]}</div>${x[2]}${x[3] ? _rpSpark(x[3], 70, 16) : ''}</div>`).join('')}</div>
  <div class="c5 sec"><h2>Finanční skóre</h2><div class="sub">Stejné jako na Dashboardu</div>
    ${sc ? `<div style="display:flex;align-items:baseline;gap:2.4mm"><span style="font-size:26pt;font-weight:600;line-height:1">${sc.tot}</span><span class="faint">z ${sc.max}</span><span style="margin-left:auto" class="chip">${_rpE(sc.grade && sc.grade.label || '')}</span></div>
      ${(sc.comps || []).map(c => `<div style="display:grid;grid-template-columns:24mm 1fr 12mm;gap:2mm;align-items:center;font-size:8pt;margin:1.3mm 0"><span>${_rpE(c.label.replace(/^\S+\s/, ''))}</span>
        <div class="bar"><i style="width:${c.max ? c.score / c.max * 100 : 0}%;background:${c.avail === false ? '#E2E8F0' : '#1E293B'}"></i></div><span class="num">${c.avail === false ? '–' : c.score + '/' + c.max}</span></div>`).join('')}` : '<div class="faint">Skóre se nepodařilo spočítat.</div>'}</div>
  <div class="c7 sec"><h2>Co stojí za pozornost</h2><div class="sub">Spočítané z tvých čísel · AI komentář přibude v další verzi</div>
    <div style="display:grid;gap:2.4mm">${_rpPostrehy(rd).map(p => `<div class="ai" style="background:#EEF3FF;border-left-color:#1F45C8"><h3>${p[0]}</h3><p style="color:#334155">${p[1]}</p><div class="ft" style="color:#1F45C8"><span>${p[2]}</span></div></div>`).join('')}</div></div>
  <div class="c12 sec"><h2>${rd.kumNet.at(-1) >= 0 ? 'Měsíc skončil v plusu' : 'Měsíc skončil v mínusu'}, nejníž ${rd.kumNet.indexOf(Math.min(...rd.kumNet)) + 1}. den</h2><div class="sub">Pohyb peněz v měsíci: příjmy − výdaje den po dni (kumulovaně)</div>${_rpKum(rd).replace('viewBox="0 0 330 150"', 'viewBox="0 0 330 110"')}</div>
  <div class="foot"><span>Čísla spočítala appka z tvých transakcí. Nejde o investiční doporučení.</span><span>1 / ${rd._stran}</span></div></section>`;
}
function _rpPro2(rd) {
  const s = rd.karty.slice().sort((a, b) => b.v - a.v);
  return `<section class="page" aria-label="Premium strana 2">${_rpTop(rd, `${RP_MES[rd.m]} ${rd.y} · rozbor výdajů`, true)}
  <div class="c12 sec"><h2>Z ${_rpKc(rd.inc)} příjmů ${rd.bil >= 0 ? 'zůstalo ' + _rpKc(rd.bil) : 'chybělo ' + _rpKc(-rd.bil)}${s[0] ? ', nejvíc ubralo ' + _rpE(s[0].n.toLowerCase()) : ''}</h2><div class="sub">Graf 2.1 · Od příjmu k úspoře</div>${_rpWaterfall(rd)}</div>
  <div class="c6 sec"><h2>Odchylky od průměru</h2><div class="sub">Graf 2.2 · Proti průměru 3 měsíců v Kč</div>${_rpDev(rd.karty)}</div>
  <div class="c6 sec"><h2>Pohyb peněz den po dni</h2><div class="sub">Graf 2.3 · Příjmy − výdaje kumulovaně</div>${_rpKum(rd)}</div>
  <div class="c12 sec"><h2>Skupiny výdajů</h2><div class="sub">Tabulka 2.4 · proti minulému měsíci a průměru 3 měsíců, 2 největší položky</div>
    <table><tr><th class="t">Skupina</th><th>${RP_MES2[rd.m]}</th><th>vs ${RP_MES2[rd.pm.m]}</th><th>vs Ø3M</th><th class="t">Největší položky</th></tr>
    ${s.map(x => { const d1 = _rpPct(x.v, x.mm), d3 = _rpPct(x.v, x.avg), c = d => Math.abs(d) < 5 ? 'faint' : d > 0 ? 'down' : 'up';
      return `<tr><td class="t"><span class="dot" style="background:${x.c}"></span>${_rpE(x.n)}</td><td><b>${_rpKc(x.v)}</b></td><td class="${c(d1)}">${x.mm ? _rpP0(d1) : '–'}</td><td class="${c(d3)}">${x.avg ? _rpP0(d3) : '–'}</td>
        <td class="t faint" style="font-size:7.4pt">${x.top.map(([n, v]) => _rpE(n) + ' ' + _rpKc(v)).join(' · ')}</td></tr>`; }).join('')}
    <tr class="sum"><td class="t">Celkem</td><td>${_rpKc(rd.vyd)}</td><td>${_rpP0(_rpPct(rd.vyd, rd.pm.v))}</td><td>${_rpP0(_rpPct(rd.vyd, rd.avg.v))}</td><td></td></tr></table></div>
  <div class="foot"><span>Plně = tento měsíc, šedě = minulost, šrafa = odhad.</span><span>2 / ${rd._stran}</span></div></section>`;
}
function _rpPro3(rd) {
  const u = rd.ucet;
  if (!u) return `<section class="page" aria-label="Premium strana 3">${_rpTop(rd, `${RP_MES[rd.m]} ${rd.y} · účtenky`, true)}
    <div class="c12"><h1 style="font-size:20pt">Účtenky</h1><p class="lead">Tento měsíc nemáš žádnou naskenovanou účtenku. Naskenuj je v Analýze účtenek – uvidíš tu, co přesně kupuješ, co zdražilo a svou osobní inflaci.</p></div>
    <div class="foot"><span></span><span>3 / ${rd._stran}</span></div></section>`;
  const pods = (u.ut && u.ut.pods || []).slice(0, 8), mx = Math.max(1, ...pods.map(p => p.castka));
  return `<section class="page dense" aria-label="Premium strana 3">${_rpTop(rd, `${RP_MES[rd.m]} ${rd.y} · co kupuješ a za kolik`, true)}
  <div class="c12" style="display:flex;align-items:baseline;gap:5mm"><h1 style="font-size:20pt;white-space:nowrap">Účtenky</h1><p class="lead" style="font-size:10.5pt">Z ${u.n} účtenek vidíme, co přesně kupuješ${u.infl ? `. Tvůj košík: ${_rpP1(u.infl.v)} (${u.infl.typ}).` : '.'}</p></div>
  <div class="c12 kpis" style="grid-template-columns:repeat(4,1fr)">
    ${_rpKpi('Útrata z účtenek', _rpKc(u.celkem), `<span>${rd.vyd ? Math.round(u.celkem / rd.vyd * 100) : 0} % výdajů</span>`)}
    ${_rpKpi('Účtenek', u.n, `<span>průměrný nákup ${_rpKc(u.celkem / u.n)}</span>`)}
    ${_rpKpi('Tvoje inflace košíku', u.infl ? _rpP1(u.infl.v) : '—', `<span>${u.infl ? u.infl.typ + ', stejné výrobky' : 'málo dat'}</span>`)}
    ${_rpKpi('Taxonomie pokrývá', u.ut && u.ut.celkem ? Math.round((1 - u.ut.mimo / u.ut.celkem) * 100) + ' %' : '—', '<span>útraty z účtenek</span>')}</div>
  <div class="c6 sec"><h2>${pods[0] ? 'Nejvíc utrácíš za ' + _rpE(pods[0].nazev.toLowerCase()) : 'Za co utrácíš'}</h2><div class="sub">Graf 3.1 · Útrata podle podkategorií</div>
    ${pods.map(p => `<div style="display:grid;grid-template-columns:32mm 1fr 18mm;gap:2mm;align-items:center;font-size:8pt;margin:1.5mm 0"><span>${_rpE(p.ikona + ' ' + p.nazev)}</span><div class="bar" style="height:3mm"><i style="width:${p.castka / mx * 100}%;background:#E69F00"></i></div><span class="num">${_rpKc(p.castka)}</span></div>`).join('') || '<div class="faint">Položky zatím nejsou v taxonomii.</div>'}</div>
  <div class="c6 sec"><h2>Co tě zdražuje nejvíc</h2><div class="sub">Graf 3.2 · Osobní inflace po podkategoriích, podle dopadu</div>
    ${u.inflPod.length ? u.inflPod.map(x => `<div style="display:flex;justify-content:space-between;font-size:8pt;padding:1.4mm 0;border-bottom:1px solid #F0F3F7"><span>${_rpE(x.pod.ikona + ' ' + x.pod.nazev)}</span><b class="${x.zmena > 0 ? 'down' : 'up'}">${_rpP1(x.zmena)}</b></div>`).join('') : '<div class="faint" style="font-size:8pt">Potřeba stejné výrobky alespoň ve dvou nákupech.</div>'}</div>
  <div class="c12 sec"><h2>Vývoj cen výrobků</h2><div class="sub">Tabulka 3.3 · Cena za kg / l / ks, první proti poslednímu měsíci</div>
    ${u.ceny.length ? `<table><tr><th class="t">Výrobek</th><th>Dříve</th><th>Nyní</th><th>Změna</th><th>Nákupů</th><th class="t">Nejlevněji</th></tr>${u.ceny.map(p => `<tr><td class="t">${_rpE(p.nazev)}</td><td class="faint">${p.prvni.toFixed(1).replace('.', ',')} Kč/${p.j}</td><td><b>${p.posledni.toFixed(1).replace('.', ',')} Kč/${p.j}</b></td><td class="${p.zmena > 0 ? 'down' : p.zmena < 0 ? 'up' : 'faint'}">${_rpP0(p.zmena)}</td><td class="faint">${p.pocet}</td><td class="t faint">${p.obchody[0] ? _rpE(p.obchody[0].obchod) : ''}</td></tr>`).join('')}</table>` : '<div class="faint" style="font-size:8pt">Zatím málo opakovaných nákupů.</div>'}</div>
  <div class="c6 sec"><h2>Skryté zdražení</h2><div class="sub">Menší balení za stejnou cenu</div>
    ${u.shr.length ? u.shr.map(x => `<div style="display:flex;justify-content:space-between;padding:1.6mm 0;border-bottom:1px solid #F0F3F7;font-size:8pt"><span><b>${_rpE(x.nazev)}</b> <span class="faint">${x.pred.baleni} → ${x.po.baleni} ${x.po.bj}</span></span><b class="down">${x.skryteZdrazeni != null ? '+' + x.skryteZdrazeni + ' %' : ''}</b></div>`).join('') : '<div class="faint" style="font-size:8pt">Nic jsme nenašli.</div>'}</div>
  <div class="c6 sec"><h2>Obchody</h2><div class="sub">Podíl útraty z účtenek</div>
    ${u.obchody.map(([n, p]) => `<div style="display:grid;grid-template-columns:26mm 1fr 10mm;gap:2mm;align-items:center;font-size:8pt;margin:1.4mm 0"><span>${_rpE(n)}</span><div class="bar"><i style="width:${p}%;background:#1E293B"></i></div><span class="num">${p} %</span></div>`).join('')}</div>
  <div class="foot"><span>Osobní inflace: stejné výrobky, cena za jednotku, váhy podle tvé útraty.</span><span>3 / ${rd._stran}</span></div></section>`;
}
function _rpPro4(rd) {
  const f = rd.fc, rec = [];
  const over = rd.rozp.filter(r => r.v > r.lim).sort((a, b) => (b.v - b.lim) - (a.v - a.lim))[0];
  if (rd.bil > 1000) rec.push([`Pošli část přebytku do rezervy`, `+${_rpKc(Math.round(rd.bil * 0.5 / 100) * 100 * 12)} ročně při stejném tempu`, `Měsíc skončil v plusu ${_rpKc(rd.bil)}. Trvalý příkaz na ${_rpKc(Math.round(rd.bil * 0.5 / 100) * 100)} hned po výplatě zajistí, že peníze neodtečou.`]);
  if (over) rec.push([`Hlídej rozpočet: ${over.n}`, `překročeno o ${_rpKc(over.v - over.lim)}`, `Výdaje ${_rpKc(over.v)} při limitu ${_rpKc(over.lim)}. Zvaž, jestli je limit reálný, nebo kde ubrat.`]);
  //  Jen drobné pravidelné platby (předplatné, služby) – nájem ani splátky se „nerušící".
  const drobne = rd.pravidelne.filter(x => x.mes > 0 && x.mes < 1500), ps = drobne.reduce((a, x) => a + x.mes, 0);
  if (drobne.length >= 2) rec.push([`Projdi předplatné a drobné pravidelné platby`, `${_rpKc(ps * 12)} ročně`, `${drobne.length} plateb (${drobne.slice(0, 3).map(x => _rpE(x.n)).join(', ')}${drobne.length > 3 ? '…' : ''}) za ${_rpKc(ps)} měsíčně. Co nevyužíváš, zruš – každá stovka měsíčně je 1 200 Kč ročně.`]);
  return `<section class="page dense" aria-label="Premium strana 4">${_rpTop(rd, `${RP_MES[rd.m]} ${rd.y} · výhled a doporučení`, true)}
  <div class="c12 sec"><h2>${RP_MES[rd.nm].charAt(0).toUpperCase() + RP_MES[rd.nm].slice(1)}: odhad bilance ${_rpKcz(f.b)} (${_rpKcz(f.b - f.pasmo)} až ${_rpKcz(f.b + f.pasmo)})</h2><div class="sub">Graf 4.1 · Bilance posledních 6 měsíců a odhad příštího s pásmem nejistoty</div>${_rpFc(rd)}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-top:1.6mm;font-size:7.8pt"><div><b>Z čeho odhad vychází</b><ul class="list">
      <li><span>Příjmy ${rd.pristi.some(x => x.v > 0) ? '(šablony)' : '(průměr 3 měsíců)'}</span><span class="up">${_rpKcz(f.p)}</span></li><li><span>Výdaje (vážený průměr)</span><span>${_rpKcz(-f.v)}</span></li><li><span>Pásmo podle výkyvů 6 měsíců</span><span>±${_rpKc(f.pasmo)}</span></li></ul></div>
      <div><b>Pevné platby v ${RP_MES6[rd.nm]}</b><ul class="list">${rd.pristi.filter(x => x.v < 0).slice(0, 4).map(x => `<li><span>${x.d}. ${_rpE(x.n)}</span><span>${_rpKcz(x.v)}</span></li>`).join('') || '<li><span class="faint">žádné šablony</span><span></span></li>'}</ul></div></div></div>
  <div class="c6 sec"><h2>Cíle</h2><div class="sub">Průběh spoření na cíle</div>
    ${rd.cile.length ? rd.cile.map(c => `<div style="padding:1.8mm 0;border-bottom:1px solid #F0F3F7"><div style="display:flex;justify-content:space-between"><b>${_rpE(c.n)}</b><span>${_rpKc(c.ma)} / ${_rpKc(c.cil)}</span></div><div class="bar" style="margin-top:1.2mm"><i style="width:${Math.min(100, c.ma / c.cil * 100)}%;background:#1F45C8"></i></div></div>`).join('') : '<div class="faint" style="font-size:8pt">Žádné cíle. Založíš je v Nákupním seznamu / cílech.</div>'}</div>
  <div class="c6 sec"><h2>Dluhy</h2><div class="sub">Zbývá splatit</div>
    ${rd.dluhy.length ? `<table><tr><th class="t">Půjčka</th><th>Zbývá</th><th>Splátka</th><th>Úrok</th></tr>${rd.dluhy.map(d => `<tr><td class="t">${_rpE(d.n)}</td><td><b>${_rpKc(d.zb)}</b></td><td>${d.spl ? _rpKc(d.spl) : '–'}</td><td class="faint">${d.urok ? String(d.urok).replace('.', ',') + ' %' : '–'}</td></tr>`).join('')}</table>` : '<div class="faint" style="font-size:8pt">Žádné půjčky. 👍</div>'}</div>
  <div class="c12 ai" style="background:#EEF3FF;border-left-color:#1F45C8"><div class="tag" style="color:#1F45C8">Doporučení na ${RP_MES[rd.nm]} <span style="color:#64748B">spočítané z tvých čísel</span></div>
    ${rec.length ? rec.slice(0, 3).map(r => `<div class="rec" style="border-top-color:#D6E0FF"><b>${r[0]}</b><span class="k" style="color:#1F45C8">${r[1]}</span><p style="color:#334155">${r[2]}</p></div>`).join('') : '<p>Tento měsíc nic, co by stálo za změnu. 🎉</p>'}</div>
  <div class="c12" style="font-size:7pt;color:#8A94A6;line-height:1.5;border-top:1px solid #E2E8F0;padding-top:2mm"><b style="color:#475569">Metodika.</b> Bilance = příjmy − výdaje bez převodů mezi vlastními účty. Skupiny = karty útraty (účtenky rozdělené po položkách podle taxonomie). Skóre stejné jako na Dashboardu. Odhad: příjmy ze šablon nebo průměr, výdaje vážený průměr (tento měsíc + 2× průměr 3 měsíců), pásmo podle výkyvů posledních 6 měsíců. Report je informativní, nejde o investiční doporučení.</div>
  <div class="foot"><span>FinanceFlow · ${RP_MES[rd.m]} ${rd.y}</span><span>4 / ${rd._stran}</span></div></section>`;
}

// ── CSS (scoped .rp4, ze schváleného návrhu v4) ──
function _rpCss() {
  return `.rp4{--ink:#0F172A;--rule:#E2E8F0;font:9pt/1.42 'IBM Plex Sans','Segoe UI',Roboto,system-ui,sans-serif;color:#0F172A;font-variant-numeric:lining-nums tabular-nums}
.rp4 *{box-sizing:border-box;margin:0;padding:0}
.rp4 .page{width:210mm;height:297mm;margin:0 auto 6mm;background:#fff;padding:12mm 14mm 0;position:relative;overflow:hidden;display:grid;grid-template-columns:repeat(12,1fr);column-gap:4mm;row-gap:5mm;align-content:start;box-shadow:0 8px 30px rgba(15,23,42,.18);color:#0F172A}
.rp4 .dense{row-gap:3.8mm}
.rp4 .c12{grid-column:span 12}.rp4 .c8{grid-column:span 8}.rp4 .c7{grid-column:span 7}.rp4 .c6{grid-column:span 6}.rp4 .c5{grid-column:span 5}.rp4 .c4{grid-column:span 4}
.rp4 h1{font-family:'Source Serif 4',Georgia,serif;font-size:30pt;font-weight:700;line-height:1;color:#0F172A}
.rp4 .sec{border-top:1.4pt solid #0F172A;padding-top:2.4mm}
.rp4 .sec h2{font:600 10.5pt/1.25 'IBM Plex Sans','Segoe UI',sans-serif;margin-bottom:.6mm;color:#0F172A}
.rp4 .sub{font-size:7.8pt;color:#8A94A6;margin-bottom:2.4mm}
.rp4 .faint{color:#8A94A6}.rp4 .up{color:#0F8C6E}.rp4 .down{color:#C8501E}.rp4 .warn{color:#B7791F}.rp4 .num{text-align:right;white-space:nowrap}
.rp4 .top{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #E2E8F0;padding-bottom:3mm}
.rp4 .brand{display:flex;align-items:center;gap:2.4mm;font:600 9.5pt 'IBM Plex Sans','Segoe UI',sans-serif}
.rp4 .brand i{width:6mm;height:6mm;border-radius:1.6mm;background:#1F45C8;display:inline-block;position:relative}
.rp4 .brand i:after{content:'';position:absolute;left:1.5mm;top:1.4mm;width:3mm;height:3.2mm;border-left:1.1mm solid #fff;border-top:1.1mm solid #fff}
.rp4 .tier{font:600 7.4pt 'IBM Plex Sans',sans-serif;padding:.7mm 2.2mm;border-radius:10mm;border:1px solid #E2E8F0;color:#475569}
.rp4 .tier.pro{border-color:#6D4AFF;color:#6D4AFF;background:#F3F0FF}
.rp4 .meta{font-size:7.8pt;color:#8A94A6;text-align:right}
.rp4 .title{display:grid;grid-template-columns:1fr 66mm;gap:6mm;align-items:end}
.rp4 .lead{font-family:'Source Serif 4',Georgia,serif;font-size:12.5pt;line-height:1.38;margin-top:2.4mm;max-width:118mm}
.rp4 .verdict-box{border-left:2pt solid #0F8C6E;padding:1mm 0 1mm 3mm;font-size:8.2pt;color:#475569}
.rp4 .verdict-box b{display:block;color:#0F172A;font-size:10pt;margin-bottom:.4mm}
.rp4 .kpis{display:grid;border-top:1px solid #E2E8F0;border-bottom:1px solid #E2E8F0}
.rp4 .kpis>div{padding:2.8mm 3mm 2.6mm;border-left:1px solid #E2E8F0}.rp4 .kpis>div:first-child{border-left:none;padding-left:0}
.rp4 .kpis .l{font-size:7.8pt;color:#475569}.rp4 .kpis .v{font-size:17pt;font-weight:600;line-height:1.15;margin:.6mm 0 .4mm;white-space:nowrap}
.rp4 .kpis .d{font-size:7.5pt}.rp4 .kpis .d span{color:#8A94A6}.rp4 .kpis svg{display:block;margin-top:1mm}
.rp4 table{width:100%;border-collapse:collapse;font-size:8.1pt}
.rp4 th{font-weight:500;color:#8A94A6;text-align:right;padding:1.1mm 1mm;border-bottom:1px solid #E2E8F0;font-size:7.3pt;white-space:nowrap}
.rp4 td{padding:1.25mm 1mm;text-align:right;border-bottom:1px solid #F0F3F7;white-space:nowrap;color:#0F172A}
.rp4 th:first-child,.rp4 td:first-child{text-align:left;padding-left:0}.rp4 td.t,.rp4 th.t{text-align:left;white-space:normal}
.rp4 tr.sum td{font-weight:600;border-top:1px solid #0F172A;border-bottom:none}
.rp4 .dot{display:inline-block;width:2.2mm;height:2.2mm;border-radius:50%;margin-right:1.6mm;vertical-align:-.2mm}
.rp4 .ai{background:#F3F0FF;border-left:1.2mm solid #6D4AFF;padding:2.6mm 3mm;border-radius:0 2mm 2mm 0}
.rp4 .ai .tag{font:600 7pt 'IBM Plex Sans',sans-serif;margin-bottom:1mm;display:flex;justify-content:space-between}
.rp4 .ai h3{font:600 9.4pt/1.3 'IBM Plex Sans',sans-serif;margin-bottom:1mm;color:#0F172A}.rp4 .ai p{font-size:8pt;line-height:1.45}
.rp4 .ai .ft{display:flex;gap:3mm;margin-top:1.4mm;font-size:7.2pt}
.rp4 .bar{height:2.2mm;background:#F5F7FA;border-radius:1mm;overflow:hidden}.rp4 .bar i{display:block;height:100%}
.rp4 .list li{list-style:none;display:flex;justify-content:space-between;gap:3mm;padding:1.2mm 0;border-bottom:1px solid #F0F3F7;font-size:8.1pt}
.rp4 .list li>:last-child{white-space:nowrap}
.rp4 .chip{font-size:7pt;padding:.2mm 1.6mm;border-radius:1mm;background:#F5F7FA;color:#475569}
.rp4 .river .band{display:flex;height:11mm;border-radius:1.5mm;overflow:hidden}
.rp4 .river .band div{display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:8pt;white-space:nowrap;overflow:hidden}
.rp4 .river .leg{display:grid;gap:2mm;margin-top:2mm}.rp4 .river .leg div{font-size:7.4pt;line-height:1.3;border-top:2.2pt solid;padding-top:1mm;color:#475569}.rp4 .river .leg b{display:block;color:#0F172A;font-size:8pt}
.rp4 .cal{display:grid;grid-template-columns:repeat(16,1fr);gap:1mm}.rp4 .cal div{height:9mm;border-radius:1mm;font-size:6.6pt;padding:.6mm 1mm}
.rp4 .foot{position:absolute;left:14mm;right:14mm;bottom:6mm;display:flex;justify-content:space-between;font-size:6.9pt;color:#8A94A6;border-top:1px solid #E2E8F0;padding-top:1.8mm}
.rp4 .teaser{position:relative;border:1px dashed #C9C2F2;border-radius:2mm;padding:3mm;overflow:hidden}.rp4 .teaser .blur{filter:blur(2.4px);opacity:.55}
.rp4 .teaser .over{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:4mm;background:rgba(255,255,255,.6)}
.rp4 .teaser .over b{font-size:9.4pt;margin-bottom:1mm}.rp4 .teaser .over span{font-size:7.8pt;color:#475569;max-width:130mm}
.rp4 .rec{display:grid;grid-template-columns:1fr auto;gap:1mm 3mm;border-top:1px solid;padding:2.2mm 0}.rp4 .rec:first-of-type{border-top:none}
.rp4 .rec b{font-size:9pt}.rp4 .rec .k{font-size:7.4pt;text-align:right}.rp4 .rec p{grid-column:1/-1;font-size:7.9pt}`;
}

function mesReportHTML(rd, pro) {
  rd._stran = pro ? 4 : 2;
  return pro ? _rpPro1(rd) + _rpPro2(rd) + _rpPro3(rd) + _rpPro4(rd) : _rpFree1(rd) + _rpFree2(rd, false);
}
window.mesReportHTML = mesReportHTML;

// ── Stránka Report → záložka „Měsíční report" ──
function renderMesicniReport(el) {
  const D = getData();
  const pro = typeof hasPremiumAccess !== 'function' || hasPremiumAccess();
  if (!document.getElementById('rp4css')) { const st = document.createElement('style'); st.id = 'rp4css'; st.textContent = _rpCss(); document.head.appendChild(st); }
  if (!document.getElementById('rp4font')) { const l = document.createElement('link'); l.id = 'rp4font'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&display=swap'; document.head.appendChild(l); }
  let rd;
  try { rd = mesReportData(D, S.curMonth, S.curYear); } catch (e) { el.innerHTML = `<div class="card"><div class="card-body" style="color:var(--expense)">Report se nepodařilo spočítat: ${_rpE(e.message)}</div></div>`; return; }
  el.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
      <button class="btn btn-primary" onclick="mesReportTisk()">📄 Uložit jako PDF / tisk</button>
      <span style="font-size:.74rem;color:#a8aec8">${pro ? 'Premium report · 4 strany' : 'Základní report · 2 strany · <a href="#" onclick="if(typeof showPaywall===\'function\')showPaywall();return false" style="color:#a78bfa">💎 Premium má 4 strany s rozborem</a>'} · měsíc přepneš nahoře</span></div>
    <div id="rp4wrap" style="overflow:hidden"><div id="rp4scale" class="rp4" style="transform-origin:top left">${mesReportHTML(rd, pro)}</div></div>`;
  const fit = () => { const w = document.getElementById('rp4wrap'), s = document.getElementById('rp4scale'); if (!w || !s) return;
    const k = Math.min(1, w.clientWidth / 800); s.style.transform = `scale(${k})`; s.style.width = (100 / k) + '%'; w.style.height = (s.scrollHeight * k) + 'px'; };
  fit(); setTimeout(fit, 300);
  if (!window._rp4resize) { window._rp4resize = true; window.addEventListener('resize', () => { if (document.getElementById('rp4wrap')) fit(); }); }
}
window.renderMesicniReport = renderMesicniReport;

//  Tisk / PDF: report v samostatném okně (bez menu appky), jinak stažení HTML.
function mesReportTisk() {
  const s = document.getElementById('rp4scale'); if (!s) return;
  const html = `<!DOCTYPE html><html lang="cs"><head><meta charset="utf-8"><title>FinanceFlow – měsíční report ${RP_MES[S.curMonth]} ${S.curYear}</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&display=swap">
    <style>${_rpCss()} body{margin:0;background:#E6EAF0}.rp4 .page{margin:8mm auto} @media print{body{background:none}.rp4 .page{margin:0;box-shadow:none;page-break-after:always}@page{size:A4;margin:0}}
    *{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body><div class="rp4">${s.innerHTML}</div>
    <script>setTimeout(function(){window.print()},700)<\/script></body></html>`;
  const w = window.open('', '_blank');
  if (w) { w.document.open(); w.document.write(html); w.document.close(); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  a.download = `FinanceFlow-report-${S.curYear}-${String(S.curMonth + 1).padStart(2, '0')}.html`; document.body.appendChild(a); a.click(); a.remove();
}
window.mesReportTisk = mesReportTisk;
