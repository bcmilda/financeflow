// FinanceFlow · v9.09 · report.js · 2026-07-21
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

// ══ TAB: MATICE (kategorie × Měsíční / Roční / roky) – jádro dle Excelu ══
function reportMatice() {
  const D = getData();
  const txs = (D.transactions || []).filter(t => t && t.type === 'expense' && !t.splitParent && !t.isBalancing && !(typeof isTransferTx === 'function' && isTransferTx(t)));
  if (!txs.length) return reportEmpty();

  const years = [...new Set(txs.map(t => new Date(t.date).getFullYear()))].sort((a, b) => b - a); // nejnovější vlevo
  const curY = S.curYear, curM = S.curMonth;
  const cats = (D.categories || []).filter(c => c.type === 'expense' || c.type === 'both');

  // řádky: kategorie s nějakým výdajem
  const rows = cats.map(c => {
    const monthVal = _reportCatMonthExp(c.id, curY, curM, D);
    const yearVal  = _reportCatYearExp(c.id, curY, D);
    const yearVals = years.map(y => _reportCatYearExp(c.id, y, D));
    const total = yearVals.reduce((a, b) => a + b, 0);
    return { c, monthVal, yearVal, yearVals, total };
  }).filter(r => r.total > 0).sort((a, b) => b.total - a.total);
  if (!rows.length) return reportEmpty();

  const colSums = years.map((_, i) => rows.reduce((a, r) => a + r.yearVals[i], 0));
  const sumMonth = rows.reduce((a, r) => a + r.monthVal, 0);
  const sumYear  = rows.reduce((a, r) => a + r.yearVal, 0);
  const maxYear  = Math.max(...rows.flatMap(r => r.yearVals), 1);

  // barevná buňka roku – Excel-styl (sytější = větší výdaj)
  const yc = v => {
    if (!v) return `<td style="text-align:right;color:#5a6078">–</td>`;
    const int = Math.min(v / maxYear, 1);
    return `<td style="text-align:right;background:rgba(248,113,113,${(0.05 + int * 0.30).toFixed(3)});color:#e8eaf2;font-weight:${int > 0.5 ? '700' : '500'}">${fmt(Math.round(v))}</td>`;
  };

  return `
    <div class="card">
      <div class="card-header">
        <span class="card-title">🗂️ Výdaje – kategorie × období</span>
        <span style="font-size:.7rem;color:#a8aec8">Měsíční = ${CZ_M[curM]} ${curY} · Roční = ${curY} (YTD)</span>
      </div>
      <div class="card-body" style="overflow-x:auto">
        <table class="pred-tbl" style="min-width:${340 + years.length * 78}px;width:100%">
          <thead><tr>
            <th style="position:sticky;left:0;background:var(--surface2);text-align:left;z-index:2;min-width:150px">Kategorie</th>
            <th style="text-align:right;color:#4ade80" title="${CZ_M[curM]} ${curY}">Měsíční</th>
            <th style="text-align:right;color:#60a5fa;border-right:2px solid var(--border)" title="Rok ${curY} k dnešku">Roční</th>
            ${years.map(y => `<th style="text-align:right;color:${y === curY ? '#e8eaf2' : '#a8aec8'}">${y}</th>`).join('')}
            <th style="border-left:2px solid var(--border);color:var(--debt);text-align:right">Σ</th>
          </tr></thead>
          <tbody>
            ${rows.map(r => `<tr>
              <td style="position:sticky;left:0;background:var(--surface2);text-align:left;z-index:1;white-space:nowrap">${r.c.icon} ${r.c.name}</td>
              <td style="text-align:right;color:#c9cede">${r.monthVal ? fmt(Math.round(r.monthVal)) : '–'}</td>
              <td style="text-align:right;color:#c9cede;border-right:2px solid var(--border)">${r.yearVal ? fmt(Math.round(r.yearVal)) : '–'}</td>
              ${r.yearVals.map(v => yc(v)).join('')}
              <td style="border-left:2px solid var(--border);text-align:right;font-weight:800;color:#f87171">${fmt(Math.round(r.total))}</td>
            </tr>`).join('')}
            <tr style="border-top:2px solid var(--border);background:rgba(255,255,255,.03)">
              <td style="position:sticky;left:0;background:var(--surface2);text-align:left;font-weight:800;z-index:1">Σ Suma</td>
              <td style="text-align:right;font-weight:800;color:#4ade80">${sumMonth ? fmt(Math.round(sumMonth)) : '–'}</td>
              <td style="text-align:right;font-weight:800;color:#60a5fa;border-right:2px solid var(--border)">${sumYear ? fmt(Math.round(sumYear)) : '–'}</td>
              ${colSums.map(v => `<td style="text-align:right;font-weight:800;color:#fbbf24">${v ? fmt(Math.round(v)) : '–'}</td>`).join('')}
              <td style="border-left:2px solid var(--border);text-align:right;font-weight:800;color:#fbbf24">${fmt(Math.round(colSums.reduce((a, b) => a + b, 0)))}</td>
            </tr>
          </tbody>
        </table>
        <div style="font-size:.7rem;color:#a8aec8;margin-top:8px;line-height:1.5">Matice dle tvého Excelu: <strong>Měsíční</strong> = aktuální měsíc, <strong>Roční</strong> = letošní rok k dnešku, dále sumáře jednotlivých let. Sytější červená = vyšší roční výdaj. Zobrazují se roky, kde máš data. Přepínej měsíc/rok nahoře v hlavičce appky.</div>
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
