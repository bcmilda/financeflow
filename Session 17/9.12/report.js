// FinanceFlow · v9.12 · report.js · 2026-07-23
// ══════════════════════════════════════════════════════
//  REPORT PŘEHLED (S17.9, Milan) – matice roků dle Excelu.
//  Samostatná karta v sekci Analýzy. Premium/Pro funkce.
//  Taby: Přehled (matice kategorie × Měsíční/Roční/roky) · Tento měsíc · Kumulace roku · Roky.
//  KOSTRA – postupně se dolaďuje. Data čte z transakcí (txCZK, vyloučené splitParent/isBalancing/transfer).
// ══════════════════════════════════════════════════════

let _reportTab = 'matice';

function renderReport2() {
  const el = document.getElementById('report2Content');
  if (!el) return;
  const tabs = [
    { id: 'matice',  icon: '🗂️', label: 'Přehled (matice)' },
    { id: 'mesic',   icon: '📅', label: 'Tento měsíc' },
    { id: 'kumul',   icon: '📈', label: 'Kumulace roku' },
    { id: 'roky',    icon: '📊', label: 'Roky' },
  ];
  const tabBar = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
    ${tabs.map(t => `<button onclick="reportSwitchTab('${t.id}')" id="rtab-${t.id}"
      style="flex:1;min-width:120px;padding:9px 8px;border-radius:9px;cursor:pointer;font-size:.78rem;font-weight:700;border:1px solid ${_reportTab===t.id?'rgba(139,124,246,.5)':'var(--border)'};background:${_reportTab===t.id?'rgba(139,124,246,.14)':'transparent'};color:${_reportTab===t.id?'#b9aefc':'var(--text3)'}">${t.icon} ${t.label}</button>`).join('')}
  </div>`;

  let body = '';
  if (_reportTab === 'matice')      body = reportMatice();
  else if (_reportTab === 'mesic')  body = reportMesicPlaceholder();
  else if (_reportTab === 'kumul')  body = reportKumulPlaceholder();
  else if (_reportTab === 'roky')   body = reportRoky();

  el.innerHTML = tabBar + body;
}

function reportSwitchTab(id) {
  _reportTab = id;
  renderReport2();
}

// ── Sdílené: součet výdajů kategorie za rok (vyloučené transfery/split/balancing) ──
function _reportCatYearExp(catId, year, D) {
  return (D.transactions || []).reduce((a, t) => {
    if (!t || t.type !== 'expense' || t.splitParent || t.isBalancing) return a;
    if (typeof isTransferTx === 'function' && isTransferTx(t)) return a;
    if (t.catId !== catId) return a;
    const d = new Date(t.date);
    if (d.getFullYear() !== year) return a;
    return a + txCZK(t, D);
  }, 0);
}
function _reportCatMonthExp(catId, year, month, D) {
  return (D.transactions || []).reduce((a, t) => {
    if (!t || t.type !== 'expense' || t.splitParent || t.isBalancing) return a;
    if (typeof isTransferTx === 'function' && isTransferTx(t)) return a;
    if (t.catId !== catId) return a;
    const d = new Date(t.date);
    if (d.getFullYear() !== year || d.getMonth() !== month) return a;
    return a + txCZK(t, D);
  }, 0);
}

// ══ TAB: MATICE – Excel-styl přehled po SEKTORECH (S17.12, Milan) ══
//  Vzhled dle Milanova Excelu: barevná hlavička sektoru → řádky kategorií → zelený
//  mezisoučet sektoru → na konci celkový součet. Sektory = COICOP oddíly (mají ikonu
//  i barvu) + samostatný sektor 💳 Splátky (transakce navázané na dluh).
function reportMatice() {
  const D = getData();
  const txs = (D.transactions || []).filter(t => t && t.type === 'expense' && !t.splitParent && !t.isBalancing && !(typeof isTransferTx === 'function' && isTransferTx(t)));
  if (!txs.length) return reportEmpty();

  const years = [...new Set(txs.map(t => new Date(t.date).getFullYear()))].sort((a, b) => b - a);
  const curY = S.curYear, curM = S.curMonth;
  const cats = (D.categories || []).filter(c => c.type === 'expense' || c.type === 'both');
  const GRP = (typeof COICOP_GROUPS_DEF !== 'undefined') ? COICOP_GROUPS_DEF : [];

  // ── řádky per kategorie ──
  const mkRow = c => {
    const yearVals = years.map(y => _reportCatYearExp(c.id, y, D));
    return {
      id: c.id, icon: c.icon, name: c.name,
      monthVal: _reportCatMonthExp(c.id, curY, curM, D),
      yearVal: _reportCatYearExp(c.id, curY, D),
      yearVals, total: yearVals.reduce((a, b) => a + b, 0),
    };
  };
  const allRows = cats.map(mkRow).filter(r => r.total > 0);

  // ── sektor 💳 Splátky: výdaje navázané na dluh (t.debtId) ──
  const debtTx = txs.filter(t => t.debtId);
  const debtRows = [];
  if (debtTx.length) {
    const byDebt = {};
    debtTx.forEach(t => { (byDebt[t.debtId] = byDebt[t.debtId] || []).push(t); });
    Object.keys(byDebt).forEach(did => {
      const dd = (D.debts || []).find(x => x.id === did);
      const list = byDebt[did];
      const yv = years.map(y => list.filter(t => new Date(t.date).getFullYear() === y).reduce((a, t) => a + txCZK(t, D), 0));
      debtRows.push({
        id: 'debt_' + did, icon: '🏦', name: dd ? dd.name : 'Splátka',
        monthVal: list.filter(t => { const d = new Date(t.date); return d.getFullYear() === curY && d.getMonth() === curM; }).reduce((a, t) => a + txCZK(t, D), 0),
        yearVal: list.filter(t => new Date(t.date).getFullYear() === curY).reduce((a, t) => a + txCZK(t, D), 0),
        yearVals: yv, total: yv.reduce((a, b) => a + b, 0),
      });
    });
  }
  const debtCatIds = new Set(debtTx.map(t => t.catId));

  // ── seskupení do sektorů ──
  const sectors = [];
  GRP.forEach(g => {
    const rows = allRows.filter(r => (cats.find(c => c.id === r.id) || {}).coicop === g.id);
    if (rows.length) sectors.push({ id: 'g' + g.id, name: g.name, icon: g.icon, color: g.color, rows: rows.sort((a, b) => b.total - a.total) });
  });
  const usedIds = new Set(sectors.flatMap(s => s.rows.map(r => r.id)));
  const rest = allRows.filter(r => !usedIds.has(r.id));
  if (rest.length) sectors.push({ id: 'other', name: 'Ostatní', icon: '📦', color: '#94a3b8', rows: rest.sort((a, b) => b.total - a.total) });
  if (debtRows.length) sectors.unshift({ id: 'splatky', name: 'Splátky úvěrů a hypoték', icon: '💳', color: '#3b82f6', rows: debtRows.sort((a, b) => b.total - a.total) });
  if (!sectors.length) return reportEmpty();

  // sektory dle celkového objemu (Splátky nechat nahoře jako v Excelu)
  const head = sectors.filter(s => s.id === 'splatky');
  const tail = sectors.filter(s => s.id !== 'splatky').sort((a, b) => b.rows.reduce((x, r) => x + r.total, 0) - a.rows.reduce((x, r) => x + r.total, 0));
  const ordered = [...head, ...tail];

  const maxYear = Math.max(...allRows.flatMap(r => r.yearVals), ...debtRows.flatMap(r => r.yearVals), 1);
  const cell = v => {
    if (!v) return `<td style="text-align:right;color:#4a5068">–</td>`;
    const int = Math.min(v / maxYear, 1);
    return `<td style="text-align:right;background:rgba(248,113,113,${(0.04 + int * 0.28).toFixed(3)});color:#e8eaf2;font-weight:${int > 0.45 ? '700' : '500'}">${fmt(Math.round(v))}</td>`;
  };
  const nCols = 3 + years.length + 1;

  let body = '';
  ordered.forEach(sec => {
    const sMonth = sec.rows.reduce((a, r) => a + r.monthVal, 0);
    const sYear = sec.rows.reduce((a, r) => a + r.yearVal, 0);
    const sYears = years.map((_, i) => sec.rows.reduce((a, r) => a + r.yearVals[i], 0));
    const sTotal = sec.rows.reduce((a, r) => a + r.total, 0);
    // hlavička sektoru – barevný pruh přes celou šířku (jako v Excelu)
    body += `<tr><td colspan="${nCols}" style="background:linear-gradient(90deg,${sec.color}33,${sec.color}0d);border-left:4px solid ${sec.color};padding:7px 10px;font-weight:800;font-size:.76rem;color:#e8eaf2;letter-spacing:.02em;position:sticky;left:0">${sec.icon} ${sec.name.toUpperCase()}</td></tr>`;
    sec.rows.forEach(r => {
      body += `<tr>
        <td style="position:sticky;left:0;background:var(--surface2);text-align:left;z-index:1;white-space:nowrap;padding-left:16px;border-left:4px solid ${sec.color}55">${r.icon || ''} ${r.name}</td>
        <td style="text-align:right;color:#c9cede">${r.monthVal ? fmt(Math.round(r.monthVal)) : '–'}</td>
        <td style="text-align:right;color:#c9cede;border-right:2px solid var(--border)">${r.yearVal ? fmt(Math.round(r.yearVal)) : '–'}</td>
        ${r.yearVals.map(cell).join('')}
        <td style="border-left:2px solid var(--border);text-align:right;font-weight:700;color:#f87171">${fmt(Math.round(r.total))}</td>
      </tr>`;
    });
    // mezisoučet sektoru – zelený řádek jako v Excelu
    body += `<tr style="background:rgba(74,222,128,.10)">
      <td style="position:sticky;left:0;background:rgba(30,50,38,.98);text-align:left;font-weight:800;color:#4ade80;z-index:1;border-left:4px solid ${sec.color};white-space:nowrap">Σ ${sec.name.length > 22 ? sec.icon : sec.name}</td>
      <td style="text-align:right;font-weight:800;color:#4ade80">${sMonth ? fmt(Math.round(sMonth)) : '–'}</td>
      <td style="text-align:right;font-weight:800;color:#4ade80;border-right:2px solid var(--border)">${sYear ? fmt(Math.round(sYear)) : '–'}</td>
      ${sYears.map(v => `<td style="text-align:right;font-weight:700;color:#4ade80">${v ? fmt(Math.round(v)) : '–'}</td>`).join('')}
      <td style="border-left:2px solid var(--border);text-align:right;font-weight:800;color:#4ade80">${fmt(Math.round(sTotal))}</td>
    </tr>`;
  });

  // celkový součet
  const gMonth = ordered.reduce((a, s) => a + s.rows.reduce((x, r) => x + r.monthVal, 0), 0);
  const gYear = ordered.reduce((a, s) => a + s.rows.reduce((x, r) => x + r.yearVal, 0), 0);
  const gYears = years.map((_, i) => ordered.reduce((a, s) => a + s.rows.reduce((x, r) => x + r.yearVals[i], 0), 0));
  const gTotal = gYears.reduce((a, b) => a + b, 0);
  body += `<tr style="background:rgba(251,191,36,.14);border-top:2px solid var(--debt)">
    <td style="position:sticky;left:0;background:rgba(58,48,20,.98);text-align:left;font-weight:800;color:#fbbf24;z-index:1;white-space:nowrap">💰 CELKEM VÝDAJE</td>
    <td style="text-align:right;font-weight:800;color:#fbbf24">${gMonth ? fmt(Math.round(gMonth)) : '–'}</td>
    <td style="text-align:right;font-weight:800;color:#fbbf24;border-right:2px solid var(--border)">${gYear ? fmt(Math.round(gYear)) : '–'}</td>
    ${gYears.map(v => `<td style="text-align:right;font-weight:800;color:#fbbf24">${v ? fmt(Math.round(v)) : '–'}</td>`).join('')}
    <td style="border-left:2px solid var(--border);text-align:right;font-weight:800;color:#fbbf24">${fmt(Math.round(gTotal))}</td>
  </tr>`;

  // ── mini legenda sektorů nahoře (rychlý přehled podílů) ──
  const legend = ordered.map(s => {
    const t = s.rows.reduce((a, r) => a + r.yearVal, 0);
    if (!t) return '';
    const pctv = gYear > 0 ? Math.round(t / gYear * 100) : 0;
    return `<div style="display:flex;align-items:center;gap:7px;padding:6px 9px;border-radius:8px;background:${s.color}14;border:1px solid ${s.color}40;min-width:0">
      <span style="font-size:.95rem">${s.icon}</span>
      <div style="min-width:0;flex:1">
        <div style="font-size:.7rem;color:#c9cede;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
        <div style="font-size:.78rem;font-weight:800;color:${s.color}">${fmt(Math.round(t))} <span style="font-weight:500;color:#a8aec8">· ${pctv} %</span></div>
      </div>
    </div>`;
  }).join('');

  return `
    <div class="card" style="margin-bottom:12px">
      <div class="card-header">
        <span class="card-title">🧭 Sektory – rok ${curY}</span>
        <span style="font-size:.7rem;color:#a8aec8">podíl na výdajích</span>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(165px,1fr));gap:8px">${legend}</div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">🗂️ Výdaje po sektorech</span>
        <span style="font-size:.7rem;color:#a8aec8">Měsíční = ${CZ_M[curM]} ${curY} · Roční = ${curY} (YTD)</span>
      </div>
      <div class="card-body" style="overflow-x:auto;padding-top:6px">
        <table class="report-matrix" style="min-width:${360 + years.length * 76}px;width:100%;border-collapse:collapse;font-size:.74rem">
          <thead><tr>
            <th style="position:sticky;left:0;background:var(--surface3);text-align:left;z-index:3;min-width:158px;padding:8px 10px">Kategorie</th>
            <th style="text-align:right;color:#4ade80;padding:8px 8px" title="${CZ_M[curM]} ${curY}">Měsíční</th>
            <th style="text-align:right;color:#60a5fa;border-right:2px solid var(--border);padding:8px 8px" title="Rok ${curY} k dnešku">Roční</th>
            ${years.map(y => `<th style="text-align:right;padding:8px 8px;color:${y === curY ? '#e8eaf2' : '#a8aec8'};${y === curY ? 'background:rgba(255,255,255,.04)' : ''}">${y}</th>`).join('')}
            <th style="border-left:2px solid var(--border);color:var(--debt);text-align:right;padding:8px 8px">Σ</th>
          </tr></thead>
          <tbody>${body}</tbody>
        </table>
        <div style="font-size:.7rem;color:#a8aec8;margin-top:10px;line-height:1.5">Rozděleno do sektorů (COICOP oddíly ČSÚ) + samostatný sektor <strong>Splátky</strong> pro transakce navázané na dluh. Každý sektor má zelený mezisoučet, dole je celkový součet. <strong>Měsíční</strong> = zvolený měsíc, <strong>Roční</strong> = letošek k dnešku, dále sumáře let. Sytější červená = vyšší roční výdaj.</div>
      </div>
    </div>`;
}

// ══ TAB: ROKY (rok × měsíce – přehled sezónnosti výdajů) ══
function reportRoky() {
  const D = getData();
  const txs = (D.transactions || []).filter(t => t && t.type === 'expense' && !t.splitParent && !t.isBalancing && !(typeof isTransferTx === 'function' && isTransferTx(t)));
  if (!txs.length) return reportEmpty();
  const years = [...new Set(txs.map(t => new Date(t.date).getFullYear()))].sort();
  const months = CZ_M.map(m => m.slice(0, 3));
  const data = {};
  years.forEach(y => { data[y] = Array.from({ length: 12 }, (_, m) => txs.filter(t => { const d = new Date(t.date); return d.getFullYear() === y && d.getMonth() === m; }).reduce((a, t) => a + txCZK(t, D), 0)); });
  const monthAvg = Array.from({ length: 12 }, (_, m) => { const v = years.map(y => data[y][m]).filter(x => x > 0); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; });

  return `
    <div class="card">
      <div class="card-header"><span class="card-title">📊 Roky × měsíce</span><span style="font-size:.7rem;color:#a8aec8">celkové výdaje</span></div>
      <div class="card-body" style="overflow-x:auto">
        <table class="pred-tbl" style="min-width:640px;width:100%">
          <thead><tr>
            <th style="position:sticky;left:0;background:var(--surface2);text-align:left;z-index:2">Rok</th>
            ${months.map(m => `<th style="text-align:right">${m}</th>`).join('')}
            <th style="border-left:2px solid var(--border);color:var(--debt);text-align:right">Celkem</th>
          </tr></thead>
          <tbody>
            ${years.map(y => {
              const row = data[y]; const tot = row.reduce((a, b) => a + b, 0);
              return `<tr>
                <td style="position:sticky;left:0;background:var(--surface2);font-weight:700;text-align:left;z-index:1">${y}</td>
                ${row.map((v, m) => {
                  if (!v) return '<td style="text-align:right;color:#5a6078">–</td>';
                  const r = monthAvg[m] > 0 ? v / monthAvg[m] : 1;
                  const int = Math.min(Math.max((r - 0.5) / 1.5, 0), 1);
                  return `<td style="text-align:right;background:rgba(248,113,113,${(0.04 + int * 0.30).toFixed(3)});color:#e8eaf2">${fmt(Math.round(v))}</td>`;
                }).join('')}
                <td style="border-left:2px solid var(--border);text-align:right;font-weight:800;color:#f87171">${fmt(Math.round(tot))}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        <div style="font-size:.7rem;color:#a8aec8;margin-top:8px;line-height:1.5">Barva = odchylka od průměru daného měsíce napříč roky (sytější = dražší měsíc).</div>
      </div>
    </div>`;
}

// ══ Zástupné taby (postavíme v dalších krocích) ══
function reportMesicPlaceholder() {
  return `<div class="card"><div class="card-body"><div class="empty" style="padding:22px">
    <div class="ei">📅</div><div class="et">Tento měsíc – připravujeme</div>
    <div style="font-size:.76rem;color:#a8aec8;margin-top:8px;line-height:1.5">Sem přijde detailní pohled na aktuální měsíc (příjmy, výdaje, úspory, srovnání). Zatím využij kartu <strong>Měsíční report</strong>.</div>
  </div></div></div>`;
}
function reportKumulPlaceholder() {
  return `<div class="card"><div class="card-body"><div class="empty" style="padding:22px">
    <div class="ei">📈</div><div class="et">Kumulace roku – připravujeme</div>
    <div style="font-size:.76rem;color:#a8aec8;margin-top:8px;line-height:1.5">Sem přijde kumulativní křivka výdajů/úspor od ledna + tabulka měsíc po měsíci s meziročním srovnáním.</div>
  </div></div></div>`;
}
function reportEmpty() {
  return `<div class="card"><div class="card-body"><div class="empty" style="padding:22px">
    <div class="ei">🗂️</div><div class="et">Zatím žádná data</div>
    <div style="font-size:.76rem;color:#a8aec8;margin-top:8px;line-height:1.5">Přidej transakce (nebo naimportuj historii), a matice roků se naplní.</div>
  </div></div></div>`;
}

// vstupní bod z renderPage
function renderReport2Page() { renderReport2(); }
