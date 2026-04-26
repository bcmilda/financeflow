// ══════════════════════════════════════════════════════
//  KALENDÁŘ TRANSAKCÍ – FinanceFlow v6.41
// ══════════════════════════════════════════════════════

function renderKalendar() {
  const el = document.getElementById('kalendarContent'); if (!el) return;
  const D = getData();
  const m = S.curMonth, y = S.curYear;
  const txs = getTx(m, y, D);

  // Seskup per den
  const perDay = {};
  txs.forEach(t => {
    const d = new Date(t.date).getDate();
    if (!perDay[d]) perDay[d] = { inc: 0, exp: 0, txs: [] };
    const amt = t.amount || t.amt || 0;
    if (t.type === 'income')  perDay[d].inc += amt;
    if (t.type === 'expense') perDay[d].exp += amt;
    perDay[d].txs.push(t);
  });

  const totalInc = txs.filter(t=>t.type==='income').reduce((a,t)=>a+(t.amount||t.amt||0),0);
  const totalExp = txs.filter(t=>t.type==='expense').reduce((a,t)=>a+(t.amount||t.amt||0),0);
  const totalSaldo = totalInc - totalExp;

  const firstDay = new Date(y, m, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = new Date();
  const todayD = today.getFullYear()===y && today.getMonth()===m ? today.getDate() : -1;
  const dayNames = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

  // Max pro škálování intenzity
  const maxExp = Math.max(...Object.values(perDay).map(d => d.exp), 1);
  const maxInc = Math.max(...Object.values(perDay).map(d => d.inc), 1);

  let html = `
    <!-- Header souhrn -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
      <div style="background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.2);border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:.72rem;color:var(--text3);margin-bottom:3px">Příjmy</div>
        <div style="font-size:1.1rem;font-weight:700;color:#4ade80">+${fmt(totalInc)} Kč</div>
      </div>
      <div style="background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.2);border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:.72rem;color:var(--text3);margin-bottom:3px">Výdaje</div>
        <div style="font-size:1.1rem;font-weight:700;color:#f87171">-${fmt(totalExp)} Kč</div>
      </div>
      <div style="background:${totalSaldo>=0?'rgba(74,222,128,.08)':'rgba(248,113,113,.08)'};border:1px solid ${totalSaldo>=0?'rgba(74,222,128,.2)':'rgba(248,113,113,.2)'};border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:.72rem;color:var(--text3);margin-bottom:3px">Saldo</div>
        <div style="font-size:1.1rem;font-weight:700;color:${totalSaldo>=0?'#4ade80':'#f87171'}">${totalSaldo>=0?'+':''}${fmt(totalSaldo)} Kč</div>
      </div>
    </div>

    <!-- Záhlaví dnů -->
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:3px">
      ${dayNames.map((d,i) => `<div style="text-align:center;font-size:.72rem;font-weight:700;color:${i>=5?'rgba(248,113,113,.6)':'var(--text3)'};padding:5px 0;letter-spacing:.04em">${d}</div>`).join('')}
    </div>

    <!-- Mřížka dnů -->
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px">
  `;

  // Prázdné buňky
  for (let i = 0; i < startOffset; i++) {
    html += `<div style="min-height:72px;border-radius:8px;background:rgba(255,255,255,.02)"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const data = perDay[d];
    const isToday = d === todayD;
    const dayOfWeek = (startOffset + d - 1) % 7; // 0=Po, 5=So, 6=Ne
    const isWeekend = dayOfWeek >= 5;
    const now = new Date(y, m, d);
    const isPast = now < new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const saldo = data ? data.inc - data.exp : 0;
    const hasTx = data && data.txs.length > 0;

    // Barva pozadí dle salda
    let bgColor, borderColor, numColor;
    if (!hasTx) {
      bgColor = isPast ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.02)';
      borderColor = isToday ? 'rgba(74,222,128,.5)' : isWeekend ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.04)';
      numColor = isPast ? 'var(--text3)' : 'rgba(255,255,255,.2)';
    } else if (saldo > 0) {
      const intensity = Math.min(data.inc / maxInc, 1);
      bgColor = `rgba(74,222,128,${(0.06 + intensity * 0.18).toFixed(2)})`;
      borderColor = `rgba(74,222,128,${(0.15 + intensity * 0.25).toFixed(2)})`;
      numColor = 'var(--text2)';
    } else if (saldo < 0) {
      const intensity = Math.min(data.exp / maxExp, 1);
      bgColor = `rgba(248,113,113,${(0.06 + intensity * 0.20).toFixed(2)})`;
      borderColor = `rgba(248,113,113,${(0.15 + intensity * 0.30).toFixed(2)})`;
      numColor = 'var(--text2)';
    } else {
      bgColor = 'rgba(251,191,36,.06)';
      borderColor = 'rgba(251,191,36,.2)';
      numColor = 'var(--text2)';
    }

    if (isToday) borderColor = 'rgba(74,222,128,.7)';

    html += `
      <div onclick="${hasTx ? `showKalendarDay(${d},${m},${y})` : ''}"
        style="
          min-height:72px;border-radius:8px;
          background:${bgColor};
          border:1px solid ${borderColor};
          ${isToday ? 'box-shadow:0 0 0 1px rgba(74,222,128,.3);' : ''}
          display:flex;flex-direction:column;padding:6px 7px;
          cursor:${hasTx?'pointer':'default'};
          transition:transform .12s,box-shadow .12s;
          position:relative;
        "
        ${hasTx ? `onmouseover="this.style.transform='scale(1.03)';this.style.zIndex='10'"
                   onmouseout="this.style.transform='';this.style.zIndex=''"` : ''}
      >
        <!-- Číslo dne + počet transakcí -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
          <span style="font-size:.78rem;font-weight:${isToday?'800':'600'};color:${isToday?'#4ade80':numColor};${isWeekend&&!isToday?'color:rgba(248,113,113,.7)':''}">${d}</span>
          ${hasTx ? `<span style="font-size:.6rem;color:var(--text3);background:rgba(255,255,255,.08);border-radius:4px;padding:1px 5px">${data.txs.length}</span>` : ''}
        </div>

        <!-- Hlavní číslo - saldo -->
        ${hasTx ? `
          <div style="margin-top:auto">
            <div style="font-size:${Math.abs(saldo)>=10000?'.72rem':'.78rem'};font-weight:700;color:${saldo>=0?'#4ade80':'#f87171'};line-height:1.2;letter-spacing:-.01em">
              ${saldo>=0?'+':''}${fmtK(saldo)}
            </div>
            ${data.exp>0&&data.inc>0 ? `<div style="font-size:.58rem;color:var(--text3);margin-top:1px">▲${fmtK(data.inc)} ▼${fmtK(data.exp)}</div>` :
              data.exp>0 ? `<div style="font-size:.58rem;color:rgba(248,113,113,.6)">-${fmtK(data.exp)}</div>` :
              `<div style="font-size:.58rem;color:rgba(74,222,128,.6)">+${fmtK(data.inc)}</div>`}
          </div>
        ` : `<div style="margin-top:auto;font-size:.62rem;color:rgba(255,255,255,.12);text-align:center">${isPast&&!hasTx?'–':''}</div>`}
      </div>
    `;
  }

  // Doplň konec
  const total = startOffset + daysInMonth;
  const remainder = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let i = 0; i < remainder; i++) {
    html += `<div style="min-height:72px;border-radius:8px;background:rgba(255,255,255,.02)"></div>`;
  }

  html += `</div>

  <!-- Legenda -->
  <div style="display:flex;align-items:center;gap:16px;margin-top:10px;font-size:.72rem;color:var(--text3);flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:5px"><div style="width:14px;height:14px;border-radius:4px;background:rgba(74,222,128,.2);border:1px solid rgba(74,222,128,.3)"></div>Příjem/Zisk</div>
    <div style="display:flex;align-items:center;gap:5px"><div style="width:14px;height:14px;border-radius:4px;background:rgba(248,113,113,.2);border:1px solid rgba(248,113,113,.3)"></div>Výdaj/Ztráta</div>
    <div style="display:flex;align-items:center;gap:5px"><div style="width:14px;height:14px;border-radius:4px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1)"></div>Bez transakcí</div>
    <div style="margin-left:auto;color:var(--text3)">Klikni na den pro detail</div>
  </div>`;

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
