// ══════════════════════════════════════════════════════
//  KALENDÁŘ TRANSAKCÍ – FinanceFlow v6.41
// ══════════════════════════════════════════════════════

function renderKalendar() {
  const el = document.getElementById('kalendarContent'); if (!el) return;
  const D = getData();
  const m = S.curMonth, y = S.curYear;
  const txs = getTx(m, y, D);

  // Seskup transakce per den
  const perDay = {};
  txs.forEach(t => {
    const d = new Date(t.date).getDate();
    if (!perDay[d]) perDay[d] = { inc: 0, exp: 0, txs: [] };
    const amt = t.amount || t.amt || 0;
    if (t.type === 'income')   perDay[d].inc += amt;
    if (t.type === 'expense')  perDay[d].exp += amt;
    perDay[d].txs.push(t);
  });

  // Celkové měsíční hodnoty pro kontext
  const totalInc = txs.filter(t=>t.type==='income').reduce((a,t)=>a+(t.amount||t.amt||0),0);
  const totalExp = txs.filter(t=>t.type==='expense').reduce((a,t)=>a+(t.amount||t.amt||0),0);

  // První den měsíce (0=Ne, 1=Po... → převeď na Po=0)
  const firstDay = new Date(y, m, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Pondělí jako první
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = new Date();
  const todayD = today.getFullYear() === y && today.getMonth() === m ? today.getDate() : -1;

  const dayNames = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

  // Najdi max výdaj pro škálování barev
  const maxExp = Math.max(...Object.values(perDay).map(d => d.exp), 1);

  let html = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <div style="display:flex;gap:14px">
        <span class="sm muted">📈 Příjmy: <strong style="color:var(--income)">${fmt(totalInc)} Kč</strong></span>
        <span class="sm muted">📉 Výdaje: <strong style="color:var(--expense)">${fmt(totalExp)} Kč</strong></span>
        <span class="sm muted">⚖️ Saldo: <strong style="color:${totalInc-totalExp>=0?'var(--income)':'var(--expense)'}">${fmt(totalInc-totalExp)} Kč</strong></span>
      </div>
      <div style="display:flex;gap:10px;font-size:.72rem;color:var(--text3)">
        <span>🟢 příjem</span><span>🔴 výdaj</span><span>⬜ bez transakcí</span>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:4px">
      ${dayNames.map(d => `<div style="text-align:center;font-size:.72rem;font-weight:700;color:var(--text3);padding:4px 0">${d}</div>`).join('')}
    </div>

    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">
  `;

  // Prázdné buňky před prvním dnem
  for (let i = 0; i < startOffset; i++) {
    html += `<div style="aspect-ratio:1;border-radius:8px;background:var(--surface2);opacity:.3"></div>`;
  }

  // Dny v měsíci
  for (let d = 1; d <= daysInMonth; d++) {
    const data = perDay[d];
    const isToday = d === todayD;
    const isPast = y < today.getFullYear() || (y === today.getFullYear() && m < today.getMonth()) ||
                   (y === today.getFullYear() && m === today.getMonth() && d < todayD);
    const isFuture = !isToday && !isPast;

    let bg = 'var(--surface2)';
    let borderStyle = isToday ? '2px solid var(--income)' : '1px solid var(--border)';

    if (data && data.exp > 0) {
      // Intenzita červené podle výše výdaje
      const intensity = Math.min(data.exp / maxExp, 1);
      const alpha = 0.08 + intensity * 0.25;
      bg = `rgba(248,113,113,${alpha.toFixed(2)})`;
    }
    if (data && data.inc > 0 && data.exp === 0) {
      bg = 'rgba(74,222,128,.12)';
    }
    if (data && data.inc > 0 && data.exp > 0) {
      // Smíšený den - barva podle salda
      const saldo = data.inc - data.exp;
      bg = saldo >= 0 ? 'rgba(74,222,128,.1)' : 'rgba(248,113,113,.15)';
    }
    if (isFuture && !data) bg = 'var(--surface)';

    const saldo = data ? data.inc - data.exp : 0;
    const hasTx = data && data.txs.length > 0;

    html += `
      <div onclick="${hasTx ? `showKalendarDay(${d},${m},${y})` : ''}"
        style="
          aspect-ratio:1;border-radius:8px;background:${bg};border:${borderStyle};
          display:flex;flex-direction:column;padding:5px;
          cursor:${hasTx ? 'pointer' : 'default'};
          transition:transform .1s,box-shadow .1s;
          position:relative;overflow:hidden;
          ${hasTx ? 'cursor:pointer' : ''}
        "
        ${hasTx ? `onmouseover="this.style.transform='scale(1.04)';this.style.boxShadow='0 4px 12px rgba(0,0,0,.3)'"
                   onmouseout="this.style.transform='';this.style.boxShadow=''"` : ''}
      >
        <div style="font-size:.72rem;font-weight:${isToday?'800':'600'};color:${isToday?'var(--income)':isFuture?'var(--text3)':'var(--text)'}">
          ${d}${isToday ? ' •' : ''}
        </div>
        ${data && data.exp > 0 ? `<div style="font-size:.60rem;color:var(--expense);margin-top:auto;font-weight:600;line-height:1.2">-${fmtK(data.exp)}</div>` : ''}
        ${data && data.inc > 0 ? `<div style="font-size:.60rem;color:var(--income);line-height:1.2;font-weight:600">+${fmtK(data.inc)}</div>` : ''}
        ${data && hasTx ? `<div style="position:absolute;top:3px;right:4px;font-size:.58rem;color:var(--text3)">${data.txs.length}</div>` : ''}
      </div>
    `;
  }

  // Doplň prázdné buňky na konci
  const total = startOffset + daysInMonth;
  const remainder = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let i = 0; i < remainder; i++) {
    html += `<div style="aspect-ratio:1;border-radius:8px;background:var(--surface2);opacity:.2"></div>`;
  }

  html += `</div>`;

  // Legenda intenzity výdajů
  html += `
    <div style="margin-top:10px;display:flex;align-items:center;gap:6px;font-size:.72rem;color:var(--text3)">
      <span>Výdaje:</span>
      ${[0.1, 0.2, 0.35, 0.5, 1].map(i => `
        <div style="width:18px;height:18px;border-radius:4px;background:rgba(248,113,113,${(0.08+i*0.25).toFixed(2)})"></div>
      `).join('')}
      <span>↑ vyšší</span>
    </div>
  `;

  el.innerHTML = html;
}

// Formátuj číslo kompaktně (1234 → 1,2k)
function fmtK(n) {
  if (n >= 10000) return Math.round(n/1000) + 'k';
  if (n >= 1000)  return (n/1000).toFixed(1).replace('.0','') + 'k';
  return Math.round(n).toString();
}

// Detail dne - zobrazí transakce
function showKalendarDay(d, m, y) {
  const D = getData();
  const txs = (D.transactions || []).filter(t => {
    const dt = new Date(t.date);
    return dt.getDate() === d && dt.getMonth() === m && dt.getFullYear() === y;
  });

  const modal = document.getElementById('modalKalendarDay'); if (!modal) return;

  const dayName = ['Neděle','Pondělí','Úterý','Středa','Čtvrtek','Pátek','Sobota'][new Date(y,m,d).getDay()];
  document.getElementById('kalendarDayTitle').textContent = `${dayName} ${d}. ${CZ_M[m]} ${y}`;

  const inc = txs.filter(t=>t.type==='income').reduce((a,t)=>a+(t.amount||t.amt||0),0);
  const exp = txs.filter(t=>t.type==='expense').reduce((a,t)=>a+(t.amount||t.amt||0),0);

  document.getElementById('kalendarDayContent').innerHTML = `
    <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap">
      ${inc ? `<span style="background:var(--income-bg);color:var(--income);padding:4px 10px;border-radius:8px;font-size:.8rem;font-weight:600">+${fmt(inc)} Kč příjem</span>` : ''}
      ${exp ? `<span style="background:var(--expense-bg);color:var(--expense);padding:4px 10px;border-radius:8px;font-size:.8rem;font-weight:600">-${fmt(exp)} Kč výdaj</span>` : ''}
    </div>
    ${txs.sort((a,b) => (b.amount||b.amt||0) - (a.amount||a.amt||0)).map(t => {
      const cat = getCat(t.catId, D.categories);
      const amt = t.amount || t.amt || 0;
      return `<div class="tx-row" style="padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="font-size:1rem">${cat.icon}</div>
        <div class="tx-info">
          <div class="tx-name">${t.name}</div>
          <div class="tx-meta">${cat.name}${t.note ? ' · ' + t.note : ''}</div>
        </div>
        <div class="tx-amt ${t.type==='income'?'inc':'exp'}">${t.type==='income'?'+':'-'}${fmt(amt)} Kč</div>
      </div>`;
    }).join('')}
  `;
  modal.classList.add('open');
}
