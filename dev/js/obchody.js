// FinanceFlow · v12.11 · obchody.js · 2026-10-25
// ══════════════════════════════════════════════════════
//  S27 (v12.07, Milan 23. 10.): 🏪 TREND NÁKUPŮ PO OBCHODECH – jeden zdroj pro celou appku
//  „U trendu útrat se bude hodit i trend za 12 měsíců, za kalendářní rok. Barva v tabulce = barva osy
//  grafu… v Reportu… a ještě někde, kde bych měl trend nákupů za rok a mohl si překlikávat roky
//  (2020–2027) nebo porovnat roky ve sloupcovém grafu s filtrem obchodu.“
//  Rozhodnutí: zdroj = naskenované účtenky I obchody z notifikací (transakce z 📲 Doručených, které
//  nejsou spojené s účtenkou – ty se počítají přes účtenku). Výchozí míra = útrata.
//
//  Kde se používá:
//   • Analýza účtenek → 🏪 Obchody v měsíci + 📈 Trend útrat dle obchodů (6 / 12 měsíců / rok)
//   • Report → Měsíční report, strana 3: obchody měsíce + trend od ledna (max 12 měsíců)
//   • Grafy → 🏪 Obchody: rok po měsících, porovnání let ve sloupcích, filtr obchodů, tabulka
//  Barva obchodu se přidělí jednou a zapamatuje (S.uiCfg.barvyObchodu) – stejná ve všech kartách.
// ══════════════════════════════════════════════════════
const OBCH_PALETA = ['#60a5fa', '#fbbf24', '#a78bfa', '#34d399', '#fb923c', '#f472b6', '#22d3ee', '#4ade80', '#e879f9', '#facc15', '#38bdf8', '#94a3b8'];
const OBCH_MIRY = { kc: { n: 'Útrata', f: v => _obchKc(v) }, n: { n: 'Návštěvy', f: v => Math.round(v) + '×' }, avg: { n: 'Ø nákup', f: v => _obchKc(v) } };
const OBCH_MES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
function _obchKc(v) { return Math.round(v || 0).toLocaleString('cs-CZ') + ' Kč'; }
function _obchE(s) { return (typeof escHtml === 'function') ? escHtml(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function _obchNazev(s) { return (typeof normalizeStoreName === 'function') ? normalizeStoreName(s || '?') : String(s || '?').trim(); }
function _obchKlic(s) { return _obchNazev(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }

//  ── nákupy: účtenky + notifikace ──
function obchodNakupy(D) {
  D = D || getData();
  const out = [], seen = new Set();
  (D.receipts || []).forEach(r => {
    if (!r || !r.date) return;
    const ob = _obchNazev(r.store);
    const sig = `${ob}|${r.date}|${Math.round((parseFloat(r.total) || 0) * 100)}|${(r.items || []).length}`;
    if (seen.has(sig)) return;                       // kopie téže účtenky
    seen.add(sig);
    out.push({ obchod: ob, datum: String(r.date).slice(0, 10), kc: parseFloat(r.total) || 0, zdroj: 'uctenka' });
  });
  (D.transactions || []).forEach(t => {
    if (!t || !t.zNotifikace || t.type !== 'expense' || t.splitParent || t.isBalancing || !t.date) return;
    if (typeof isTransferTx === 'function' && isTransferTx(t)) return;
    if (t.catId && typeof window !== 'undefined' && window._transferCatIds && window._transferCatIds.has(t.catId)) return;   // investice, spoření
    if (typeof dupUctenkaPro === 'function' && dupUctenkaPro(t)) return;                                                      // spojená s účtenkou → přes účtenku
    if (/^p[rř]evod\b/i.test(String(t.name || ''))) return;                                                                   // převod na účet není obchod
    out.push({ obchod: _obchNazev(t.name), datum: String(t.date).slice(0, 10), kc: (typeof txCZK === 'function') ? txCZK(t, D) : (parseFloat(t.amount || t.amt) || 0), zdroj: 'notifikace' });
  });
  return out;
}

//  ── barvy: jednou přidělit, pamatovat ──
//  Podobné barvy = podobný odstín (modrá Lidlu a světle modrá) nebo skoro stejné RGB
function _obchHsl(x) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16) / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}
function _obchBlizko(a, b) {
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return a === b;
  const [h1, s1, l1] = _obchHsl(a), [h2, s2, l2] = _obchHsl(b);
  if (s1 < .2 || s2 < .2) return Math.abs(l1 - l2) < .15 && Math.abs(s1 - s2) < .2;   // šedé
  const dh = Math.min(Math.abs(h1 - h2), 360 - Math.abs(h1 - h2));
  return dh < 28;
}
let _obchBarvyCas = null;
function _obchMapa() {
  if (typeof S === 'undefined' || !S) return {};
  S.uiCfg = S.uiCfg || {};
  return S.uiCfg.barvyObchodu || (S.uiCfg.barvyObchodu = {});
}
function obchodBarva(store) {
  const k = _obchKlic(store), m = _obchMapa();
  if (m[k]) return m[k];
  const pouzite = Object.values(m);
  let c = (typeof storeBrandColor === 'function') ? storeBrandColor(_obchNazev(store)) : '';
  if (!/^#[0-9a-f]{6}$/i.test(c) || pouzite.some(u => _obchBlizko(u, c)))
    c = OBCH_PALETA.find(x => !pouzite.some(u => _obchBlizko(u, x))) || OBCH_PALETA[pouzite.length % OBCH_PALETA.length];
  m[k] = c;
  //  uložit jednou za chvíli (ne při každém vykreslení); při prohlížení partnera nic
  if (!(typeof viewingUid !== 'undefined' && viewingUid) && typeof save === 'function' && !_obchBarvyCas)
    _obchBarvyCas = setTimeout(() => { _obchBarvyCas = null; try { save(); } catch (e) {} }, 3000);
  return c;
}
//  Barvy přidělit nejdřív obchodům s největší útratou – ty dostanou nejodlišnější barvy.
function obchodBarvyPriprav(nakupy) {
  const sum = {};
  (nakupy || []).forEach(x => { sum[x.obchod] = (sum[x.obchod] || 0) + x.kc; });
  Object.entries(sum).sort((a, b) => b[1] - a[1]).slice(0, OBCH_PALETA.length).forEach(([o]) => obchodBarva(o));
}

//  ── období ──
function obchodyMesice(obd, rok, dnes) {
  dnes = dnes || new Date();
  const out = [];
  if (obd === 'rok') {
    const y = rok || dnes.getFullYear(), konec = y === dnes.getFullYear() ? dnes.getMonth() : 11;
    for (let m = 0; m <= konec; m++) out.push({ m, y, label: OBCH_MES[m] });
    return out;
  }
  const n = obd === '12' ? 12 : 6;
  for (let i = n - 1; i >= 0; i--) { let m = dnes.getMonth() - i, y = dnes.getFullYear(); while (m < 0) { m += 12; y--; } out.push({ m, y, label: (m + 1) + '/' + String(y).slice(2) }); }
  return out;
}

//  ── agregace ──
function obchodyTrendData(nakupy, mesice, opt) {
  opt = opt || {};
  const mira = opt.mira || 'kc', top = opt.top || 4;
  const klice = new Set(mesice.map(x => x.y + '-' + x.m));
  const agg = {};
  (nakupy || []).forEach(x => {
    const d = new Date(x.datum + 'T12:00:00'); if (isNaN(d)) return;
    const mk = d.getFullYear() + '-' + d.getMonth(); if (!klice.has(mk)) return;
    const a = agg[x.obchod] || (agg[x.obchod] = { obchod: x.obchod, celkem: 0, navstev: 0, kc: {}, n: {} });
    a.celkem += x.kc; a.navstev++; a.kc[mk] = (a.kc[mk] || 0) + x.kc; a.n[mk] = (a.n[mk] || 0) + 1;
  });
  let vyb = Object.values(agg).sort((a, b) => b.celkem - a.celkem);
  if (opt.vyber && opt.vyber.length) vyb = vyb.filter(a => opt.vyber.includes(a.obchod)); else vyb = vyb.slice(0, top);
  const hod = (a, mk) => mira === 'n' ? (a.n[mk] || 0) : mira === 'avg' ? (a.n[mk] ? a.kc[mk] / a.n[mk] : 0) : (a.kc[mk] || 0);
  return {
    months: mesice, mira,
    series: vyb.map(a => ({ obchod: a.obchod, store: a.obchod, color: obchodBarva(a.obchod), celkem: a.celkem, navstev: a.navstev,
      values: mesice.map(x => Math.round(hod(a, x.y + '-' + x.m) * 100) / 100) })),
    vsechny: Object.values(agg).sort((a, b) => b.celkem - a.celkem).map(a => ({ obchod: a.obchod, celkem: a.celkem, navstev: a.navstev })),
  };
}
//  Roky × obchody (porovnání let)
function obchodyRoky(nakupy, opt) {
  opt = opt || {};
  const mira = opt.mira || 'kc', roky = {}, agg = {};
  (nakupy || []).forEach(x => {
    const y = parseInt(String(x.datum).slice(0, 4), 10); if (!(y > 1990)) return;
    roky[y] = 1;
    const a = agg[x.obchod] || (agg[x.obchod] = { obchod: x.obchod, celkem: 0, kc: {}, n: {} });
    a.celkem += x.kc; a.kc[y] = (a.kc[y] || 0) + x.kc; a.n[y] = (a.n[y] || 0) + 1;
  });
  const rokyL = Object.keys(roky).map(Number).sort((a, b) => a - b);
  let vyb = Object.values(agg).sort((a, b) => b.celkem - a.celkem);
  vyb = (opt.vyber && opt.vyber.length) ? vyb.filter(a => opt.vyber.includes(a.obchod)) : vyb.slice(0, opt.top || 5);
  const hod = (a, y) => mira === 'n' ? (a.n[y] || 0) : mira === 'avg' ? (a.n[y] ? a.kc[y] / a.n[y] : 0) : (a.kc[y] || 0);
  return { roky: rokyL, mira, series: vyb.map(a => ({ obchod: a.obchod, color: obchodBarva(a.obchod), values: rokyL.map(y => Math.round(hod(a, y) * 100) / 100) })),
    vsechny: Object.values(agg).sort((a, b) => b.celkem - a.celkem).map(a => a.obchod) };
}

//  ── SVG grafy (tmavý vzhled appky) ──
function _obchOsa(mx) { const k = Math.pow(10, Math.floor(Math.log10(Math.max(mx, 1)))); const s = [1, 2, 2.5, 5, 10].map(x => x * k).find(x => mx / x <= 4) || 10 * k; return { krok: s, max: Math.ceil(mx / s) * s || s }; }
function _obchCis(v) { return v >= 10000 ? Math.round(v / 1000) + ' tis.' : Math.round(v).toLocaleString('cs-CZ'); }
function obchSvgLinie(labels, series, opt) {
  opt = opt || {};
  const W = 420, H = opt.h || 240, P = { l: 46, r: 10, t: 12, b: 26 }, n = labels.length;   // úzký viewBox = čitelné písmo i na telefonu
  const fmt = (OBCH_MIRY[opt.mira || 'kc'] || OBCH_MIRY.kc).f;
  const { krok, max } = _obchOsa(Math.max(1, ...series.flatMap(s => s.values)));
  const x = i => P.l + (n <= 1 ? (W - P.l - P.r) / 2 : (W - P.l - P.r) * i / (n - 1)), y = v => P.t + (H - P.t - P.b) * (1 - v / max);
  let g = '';
  for (let v = 0; v <= max + 1e-9; v += krok) g += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="rgba(168,174,200,.16)"/><text x="${P.l - 6}" y="${(y(v) + 3.5).toFixed(1)}" font-size="11" text-anchor="end" fill="#a8aec8">${_obchCis(v)}</text>`;
  labels.forEach((l, i) => { g += `<text x="${x(i).toFixed(1)}" y="${H - 8}" font-size="11" text-anchor="middle" fill="#a8aec8">${_obchE(l)}</text>`; });
  series.forEach(s => {
    g += `<polyline fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linejoin="round" points="${s.values.map((v, i) => x(i).toFixed(1) + ',' + y(v).toFixed(1)).join(' ')}"/>`;
    s.values.forEach((v, i) => { if (v > 0) g += `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="5" fill="${s.color}" stroke="#0f111c" stroke-width="1.5"><title>${_obchE(s.obchod)} · ${_obchE(labels[i])}: ${fmt(v)}</title></circle>`; });
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${_obchE(opt.popis || 'Trend útrat dle obchodů')}">${g}</svg>`;
}
function obchSvgSloupce(skupiny, series, opt) {
  opt = opt || {};
  const W = 420, H = opt.h || 240, P = { l: 46, r: 10, t: 16, b: 26 }, n = skupiny.length, k = Math.max(1, series.length);
  const fmt = (OBCH_MIRY[opt.mira || 'kc'] || OBCH_MIRY.kc).f;
  const { krok, max } = _obchOsa(Math.max(1, ...series.flatMap(s => s.values)));
  const y = v => P.t + (H - P.t - P.b) * (1 - v / max), sir = (W - P.l - P.r) / Math.max(1, n), bw = Math.max(3, Math.min(40, sir * 0.8 / k));
  let g = '';
  for (let v = 0; v <= max + 1e-9; v += krok) g += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="rgba(168,174,200,.16)"/><text x="${P.l - 6}" y="${(y(v) + 3.5).toFixed(1)}" font-size="11" text-anchor="end" fill="#a8aec8">${_obchCis(v)}</text>`;
  skupiny.forEach((l, i) => {
    const x0 = P.l + sir * i + (sir - bw * k) / 2;
    series.forEach((s, j) => { const v = s.values[i] || 0; if (v > 0) g += `<rect x="${(x0 + j * bw).toFixed(1)}" y="${y(v).toFixed(1)}" width="${(bw - 1.5).toFixed(1)}" height="${(y(0) - y(v)).toFixed(1)}" rx="2" fill="${s.color}"><title>${_obchE(s.obchod)} · ${_obchE(String(l))}: ${fmt(v)}</title></rect>`; });
    g += `<text x="${(P.l + sir * i + sir / 2).toFixed(1)}" y="${H - 8}" font-size="11" text-anchor="middle" fill="#a8aec8">${_obchE(String(l))}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${_obchE(opt.popis || 'Porovnání let')}">${g}</svg>`;
}
function _obchLegenda(series) {
  return `<div style="display:flex;flex-wrap:wrap;gap:6px 12px;justify-content:center;margin-top:6px">${series.map(s => `<span style="display:flex;align-items:center;gap:5px;font-size:.74rem;color:#c2c7da"><span style="width:12px;height:12px;border-radius:50%;background:${s.color};display:inline-block"></span>${_obchE(s.obchod)}</span>`).join('')}</div>`;
}

//  ── 1) Analýza účtenek: karta Trend útrat dle obchodů ──
function _obchStav() {
  if (!window._obchTrend) { let v = null; try { v = JSON.parse(localStorage.getItem('ff_obchTrend') || 'null'); } catch (e) {}
    window._obchTrend = Object.assign({ obd: '6', rok: new Date().getFullYear() }, v || {}); }
  return window._obchTrend;
}
function obchTrendNastav(k, v) {
  const s = _obchStav();
  if (k === 'obd') s.obd = v; else if (k === 'rok') { s.obd = 'rok'; s.rok = (s.rok || new Date().getFullYear()) + v; }
  try { localStorage.setItem('ff_obchTrend', JSON.stringify(s)); } catch (e) {}
  const el = document.getElementById('obchTrendKarta'); if (el) el.outerHTML = obchTrendKartaHTML();
  setTimeout(_obchTrendKresli, 30);
}
//  v12.11 (Milan: „přepínač roku se zasekl na 2026, tlačítky nejde přepnout“ · „zkontroluj, zda všechny
//  stránky počítají ze zvoleného měsíce a ne od dneška“): 6 / 12 měsíců končí VYBRANÝM měsícem nahoře,
//  Rok = rok vybraného měsíce, dokud ho šipkami ‹ › nezměníš (do roku vybraného měsíce se vrátí při jeho změně).
//  Šipky roku se zakázaly, když data byla jen z jednoho roku – bez vysvětlení to vypadalo jako zaseknutí.
function _obchKotva() { return (typeof S !== 'undefined' && S.curYear != null) ? new Date(S.curYear, S.curMonth, 15) : new Date(); }
function obchTrendKartaHTML(D) {
  const s = _obchStav(), nak = obchodNakupy(D), kotva = _obchKotva();
  if (s._kotvaRok !== kotva.getFullYear()) { s.rok = kotva.getFullYear(); s._kotvaRok = kotva.getFullYear(); }
  obchodBarvyPriprav(nak);
  const data = obchodyTrendData(nak, obchodyMesice(s.obd, s.rok, kotva), { top: 4 });
  window._obchTrendData = data;
  const roky = [...new Set(nak.map(x => parseInt(x.datum.slice(0, 4), 10)).filter(y => y > 1990))].sort((a, b) => a - b);
  const odR = Math.min(roky[0] || kotva.getFullYear(), kotva.getFullYear()), doR = Math.max(roky[roky.length - 1] || kotva.getFullYear(), kotva.getFullYear());
  const btn = (k, l) => `<button class="tx-filt-btn${s.obd === k ? ' active' : ''}" style="font-size:.72rem;padding:3px 9px" onclick="obchTrendNastav('obd','${k}')">${l}</button>`;
  const rokNav = s.obd === 'rok' ? `<span style="display:inline-flex;align-items:center;gap:4px;margin-left:4px">
      <button class="btn btn-ghost btn-sm" style="padding:2px 8px" ${s.rok <= odR ? 'disabled' : ''} onclick="obchTrendNastav('rok',-1)">‹</button>
      <b style="font-size:.8rem">${s.rok}</b>
      <button class="btn btn-ghost btn-sm" style="padding:2px 8px" ${s.rok >= doR ? 'disabled' : ''} onclick="obchTrendNastav('rok',1)">›</button></span>` : '';
  const M = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'], kMes = (kotva.getMonth() + 1) + '/' + String(kotva.getFullYear()).slice(2);
  const popis = s.obd === 'rok' ? 'kalendářní rok ' + s.rok + (s.rok === kotva.getFullYear() && kotva.getMonth() < 11 ? ' do ' + M[kotva.getMonth()] : '') + (odR === doR ? ' · nákupy máš zatím jen z roku ' + odR : '')
    : (s.obd === '12' ? 12 : 6) + ' měsíců do ' + kMes;
  return `<div class="card" id="obchTrendKarta" style="margin-bottom:14px"><div class="card-header" style="flex-wrap:wrap;gap:6px"><span class="card-title">📈 Trend útrat dle obchodů</span>
      <span style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">${btn('6', '6 měsíců')}${btn('12', '12 měsíců')}${btn('rok', 'Rok')}${rokNav}</span></div>
    <div class="card-body">
      ${data.series.length ? `<canvas id="storeTrendChart" style="width:100%;max-width:100%;height:190px"></canvas>
      <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:8px">${data.series.map(x => '<span style="display:flex;align-items:center;gap:5px;font-size:.72rem;color:#c2c7da">' + (typeof storeBadgeHTML === 'function' ? storeBadgeHTML(x.obchod, x.color) : '') + _obchE(x.obchod) + ' · ' + _obchKc(x.celkem) + '</span>').join('')}</div>
      <div style="font-size:.68rem;color:#8b93ad;text-align:center;margin-top:4px">${popis} · 4 obchody s největší útratou · z účtenek a notifikací z banky</div>`
      : `<div style="font-size:.78rem;color:#a8aec8">Za ${popis} tu zatím nejsou nákupy.</div>`}
    </div></div>`;
}
function _obchTrendKresli() { if (window._obchTrendData && window._obchTrendData.series.length && typeof drawStoreTrendChart === 'function') drawStoreTrendChart('storeTrendChart', window._obchTrendData); }
//  Obchody ve vybraném měsíci (tabulka nad trendem) – stejný zdroj
function obchodyMesic(D, m, y) {
  const agg = {};
  obchodNakupy(D).forEach(x => { const d = new Date(x.datum + 'T12:00:00'); if (d.getMonth() !== m || d.getFullYear() !== y) return;
    const a = agg[x.obchod] || (agg[x.obchod] = { visits: 0, total: 0, days: {}, notif: 0 });
    a.visits++; a.total += x.kc; a.days[d.getDay()] = (a.days[d.getDay()] || 0) + 1; if (x.zdroj === 'notifikace') a.notif++; });
  return agg;
}

//  ── 2) Měsíční report: obchody měsíce + trend od ledna (max 12 měsíců) ──
function obchodyReportData(D, m, y) {
  const nak = obchodNakupy(D);
  obchodBarvyPriprav(nak);
  const mes = []; for (let i = 0; i <= m; i++) mes.push({ m: i, y, label: ['led', 'úno', 'bře', 'dub', 'kvě', 'čvn', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro'][i] });
  const trend = obchodyTrendData(nak, mes, { top: 4 });
  const mesic = obchodyMesic(D, m, y);
  const top = Object.entries(mesic).sort((a, b) => b[1].total - a[1].total).slice(0, 5).map(([o, v]) => ({ obchod: o, barva: obchodBarva(o), navstev: v.visits, kc: v.total, prumer: v.visits ? v.total / v.visits : 0 }));
  return { trend, top };
}
function obchodyReportSvg(trend) {
  const t = trend, W = 470, H = 112, P = [46, 8, 10, 20];   // nízký – strana 3 reportu je plná
  const { krok, max } = _obchOsa(Math.max(1, ...t.series.flatMap(s => s.values)));
  const n = t.months.length, x = i => P[0] + (n <= 1 ? (W - P[0] - P[1]) / 2 : (W - P[0] - P[1]) * i / (n - 1)), Y = v => P[2] + (1 - v / max) * (H - P[2] - P[3]);
  let s = '';
  for (let v = 0; v <= max + 1e-9; v += krok) s += `<line x1="${P[0]}" x2="${W - P[1]}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#EEF1F5"/><text x="${P[0] - 4}" y="${(Y(v) + 3).toFixed(1)}" font-size="9" text-anchor="end" fill="#5F6B7A">${_obchCis(v)}</text>`;
  t.months.forEach((mm, i) => { s += `<text x="${x(i).toFixed(1)}" y="${H - 7}" font-size="9" text-anchor="middle" fill="#5F6B7A">${_obchE(mm.label)}</text>`; });
  t.series.forEach(se => { s += `<polyline fill="none" stroke="${se.color}" stroke-width="1.8" points="${se.values.map((v, i) => x(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')}"/>`
    + se.values.map((v, i) => v > 0 ? `<circle cx="${x(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="2.4" fill="${se.color}"/>` : '').join(''); });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%">${s}</svg>`;
}

//  ── 3) Grafy → 🏪 Obchody ──
function _obchGStav() {
  if (!window._obchG) { let v = null; try { v = JSON.parse(localStorage.getItem('ff_obchG') || 'null'); } catch (e) {}
    window._obchG = Object.assign({ rok: new Date().getFullYear(), mira: 'kc', vyber: [] }, v || {}); }
  return window._obchG;
}
function obchGNastav(k, v) {
  const s = _obchGStav();
  if (k === 'rok') s.rok += v;
  else if (k === 'mira') s.mira = v;
  else if (k === 'obchod') { s.vyber = s.vyber.includes(v) ? s.vyber.filter(x => x !== v) : s.vyber.concat([v]); }
  else if (k === 'vse') s.vyber = [];
  try { localStorage.setItem('ff_obchG', JSON.stringify(s)); } catch (e) {}
  renderObchodyGraf();
}
function renderObchodyGraf() {
  const el = document.getElementById('gtab-obchody-content'); if (!el) return;
  const D = getData(), s = _obchGStav(), nak = obchodNakupy(D);
  if (!nak.length) { el.innerHTML = '<div class="card"><div class="empty"><div class="ei">🏪</div><div class="et">Zatím žádné nákupy – naskenuj účtenky nebo přijmi platby z notifikací.</div></div></div>'; return; }
  obchodBarvyPriprav(nak);
  const roky = [...new Set(nak.map(x => parseInt(x.datum.slice(0, 4), 10)).filter(y => y > 1990))].sort((a, b) => a - b);
  if (!roky.includes(s.rok)) s.rok = roky[roky.length - 1];
  const vsechny = obchodyRoky(nak, { top: 999 }).vsechny;
  const vyber = s.vyber.filter(o => vsechny.includes(o));
  const rok = obchodyTrendData(nak, obchodyMesice('rok', s.rok), { mira: s.mira, top: 5, vyber });
  const por = obchodyRoky(nak, { mira: s.mira, top: 5, vyber });
  const fmt = OBCH_MIRY[s.mira].f;
  const chip = (o, on) => `<button data-o="${_obchE(o)}" onclick="obchGNastav('obchod',this.dataset.o)" style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:14px;font-size:.72rem;cursor:pointer;border:1px solid ${on ? obchodBarva(o) : 'var(--border)'};background:${on ? obchodBarva(o) + '22' : 'transparent'};color:var(--text)"><span style="width:9px;height:9px;border-radius:50%;background:${obchodBarva(o)}"></span>${_obchE(o)}</button>`;
  const miry = Object.entries(OBCH_MIRY).map(([k, m]) => `<button class="tx-filt-btn${s.mira === k ? ' active' : ''}" style="font-size:.72rem;padding:3px 9px" onclick="obchGNastav('mira','${k}')">${m.n}</button>`).join('');
  const tab = `<div style="overflow-x:auto;margin-top:10px"><table style="width:100%;border-collapse:collapse;font-size:.76rem;min-width:${160 + por.roky.length * 80}px">
      <tr style="color:#a8aec8"><th style="text-align:left;padding:5px 6px">Obchod</th>${por.roky.map(y => `<th style="text-align:right;padding:5px 6px;white-space:nowrap">${y}</th>`).join('')}</tr>
      ${por.series.map(x => `<tr style="border-top:1px solid var(--border)"><td style="padding:6px;white-space:nowrap"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${x.color};margin-right:6px"></span>${_obchE(x.obchod)}</td>${x.values.map(v => `<td style="text-align:right;padding:6px;white-space:nowrap">${v ? fmt(v) : '—'}</td>`).join('')}</tr>`).join('')}</table></div>`;
  el.innerHTML = `<div class="card" style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
        <div class="card-title" style="margin:0">🏪 Nákupy po obchodech · ${s.rok}</div>
        <div style="display:flex;gap:6px;align-items:center">
          <button class="btn btn-ghost btn-sm" ${s.rok <= roky[0] ? 'disabled' : ''} onclick="obchGNastav('rok',-1)">‹</button><b>${s.rok}</b>
          <button class="btn btn-ghost btn-sm" ${s.rok >= roky[roky.length - 1] ? 'disabled' : ''} onclick="obchGNastav('rok',1)">›</button></div></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0">${miry}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">${vsechny.slice(0, 12).map(o => chip(o, vyber.length ? vyber.includes(o) : rok.series.some(x => x.obchod === o))).join('')}
        ${vyber.length ? `<button class="btn btn-ghost btn-sm" style="font-size:.7rem" onclick="obchGNastav('vse')">✕ Zrušit výběr</button>` : ''}</div>
      <div style="font-size:.7rem;color:#8b93ad;margin-bottom:4px">${vyber.length ? 'Vybrané obchody' : '5 obchodů s největší útratou'} · ${OBCH_MIRY[s.mira].n.toLowerCase()} po měsících · klepnutím na bod uvidíš hodnotu · z účtenek a notifikací z banky</div>
      ${rok.series.length ? obchSvgLinie(rok.months.map(x => x.label), rok.series, { mira: s.mira, popis: 'Nákupy po obchodech ' + s.rok }) + _obchLegenda(rok.series) : '<div style="font-size:.78rem;color:#a8aec8">V roce ' + s.rok + ' tu nejsou nákupy vybraných obchodů.</div>'}
    </div>
    <div class="card">
      <div class="card-title" style="margin:0 0 4px">📊 Porovnání let · ${OBCH_MIRY[s.mira].n}</div>
      <div style="font-size:.7rem;color:#8b93ad;margin-bottom:4px">Sloupec = rok, barva = obchod (stejná jako výše a v Analýze účtenek)</div>
      ${obchSvgSloupce(por.roky, por.series, { mira: s.mira })}${_obchLegenda(por.series)}${tab}
    </div>`;
}

Object.assign(typeof window !== 'undefined' ? window : {}, { obchodNakupy, obchodBarva, obchodBarvyPriprav, obchodyMesice, obchodyTrendData, obchodyRoky, obchodyMesic,
  obchTrendKartaHTML, obchTrendNastav, _obchTrendKresli, obchodyReportData, obchodyReportSvg, renderObchodyGraf, obchGNastav, obchSvgLinie, obchSvgSloupce });
