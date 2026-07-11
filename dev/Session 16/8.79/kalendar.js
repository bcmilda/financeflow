// FinanceFlow · v8.79 · kalendar.js · 2026-07-07
// ══════════════════════════════════════════════════════
//  KALENDÁŘ – FinanceFlow
//  Režimy (window._calMode): 'finance' (transakce) | 'work' (pracovní kalendář).
//  S16 (TODO-161): Poznámky ke dnům (modrý puntík) + týdenní/víkendové statistiky
//                  + přepínač na pracovní kalendář (směny/dovolená/přesčasy).
//  Data: S.calNotes[YYYY-MM-DD] = {text, notify}; S.workCal = {hpd, workdays, vacQuota, days}.
//  (obě pole jsou v saveToFirebase i saveSnapshot schématu – app.js)
// ══════════════════════════════════════════════════════

// Klíč dne YYYY-MM-DD (zero-padded)
function _ck(y, m, d) { return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
function _calNote(y, m, d) { return (S.calNotes || {})[_ck(y, m, d)] || null; }
function _workDay(y, m, d) { return ((S.workCal || {}).days || {})[_ck(y, m, d)] || null; }

// Přepnutí režimu kalendáře (view-only, mimo S → sync ho nemaže)
function setCalMode(mode) {
  window._calMode = mode;
  renderKalendar();
}

function renderKalendar() {
  const el = document.getElementById('kalendarContent'); if (!el) return;
  window._calMode = window._calMode || 'finance';
  const D = getData();
  const m = S.curMonth, y = S.curYear;

  // ── Přepínač režimu ──
  const mode = window._calMode;
  const tabBtn = (id, icon, label) => `
    <button onclick="setCalMode('${id}')" style="
      flex:1;padding:9px 8px;border-radius:9px;cursor:pointer;font-size:.82rem;font-weight:700;
      border:1px solid ${mode === id ? 'rgba(139,124,246,.5)' : 'var(--border)'};
      background:${mode === id ? 'rgba(139,124,246,.14)' : 'transparent'};
      color:${mode === id ? '#b9aefc' : 'var(--text3)'};transition:all .12s">${icon} ${label}</button>`;
  const toggle = `
    <div style="display:flex;gap:8px;margin-bottom:14px">
      ${tabBtn('finance', '💰', 'Finanční')}
      ${tabBtn('work', '🗓️', 'Pracovní')}
    </div>`;

  if (mode === 'work') { el.innerHTML = toggle + _renderKalWork(D, m, y); return; }
  el.innerHTML = toggle + _renderKalFinance(D, m, y);
}

// ══════════════════════════════════════════════════════
//  FINANČNÍ KALENDÁŘ (transakce)
// ══════════════════════════════════════════════════════
function _renderKalFinance(D, m, y) {
  const txs = getTx(m, y, D);

  const perDay = {};
  txs.forEach(t => {
    const d = new Date(t.date).getDate();
    if (!perDay[d]) perDay[d] = { inc: 0, exp: 0, txs: [] };
    const amt = txCZK(t, D);
    if (t.type === 'income') perDay[d].inc += amt;
    if (t.type === 'expense') perDay[d].exp += amt;
    perDay[d].txs.push(t);
  });

  const totalInc = txs.filter(t => t.type === 'income').reduce((a, t) => a + txCZK(t, D), 0);
  const totalExp = txs.filter(t => t.type === 'expense').reduce((a, t) => a + txCZK(t, D), 0);
  const totalSaldo = totalInc - totalExp;

  const firstDay = new Date(y, m, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = new Date();
  const todayD = today.getFullYear() === y && today.getMonth() === m ? today.getDate() : -1;
  const dayNames = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

  const maxExp = Math.max(...Object.values(perDay).map(d => d.exp), 1);
  const maxInc = Math.max(...Object.values(perDay).map(d => d.inc), 1);
  const spendDays = Object.values(perDay).filter(x => x.exp > 0).length;
  const avgDailyExp = spendDays > 0 ? totalExp / spendDays : 0;

  let html = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
      <div style="background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.2);border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:.72rem;color:var(--text3);margin-bottom:3px">Příjmy</div>
        <div style="font-size:1.1rem;font-weight:700;color:#4ade80">+${fmtB(totalInc)}</div>
      </div>
      <div style="background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.2);border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:.72rem;color:var(--text3);margin-bottom:3px">Výdaje</div>
        <div style="font-size:1.1rem;font-weight:700;color:#f87171">-${fmtB(totalExp)}</div>
      </div>
      <div style="background:${totalSaldo >= 0 ? 'rgba(74,222,128,.08)' : 'rgba(248,113,113,.08)'};border:1px solid ${totalSaldo >= 0 ? 'rgba(74,222,128,.2)' : 'rgba(248,113,113,.2)'};border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:.72rem;color:var(--text3);margin-bottom:3px">Saldo</div>
        <div style="font-size:1.1rem;font-weight:700;color:${totalSaldo >= 0 ? '#4ade80' : '#f87171'}">${totalSaldo >= 0 ? '+' : ''}${fmtB(totalSaldo)}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:3px">
      ${dayNames.map((d, i) => `<div style="text-align:center;font-size:.72rem;font-weight:700;color:${i >= 5 ? 'rgba(248,113,113,.6)' : 'var(--text3)'};padding:5px 0;letter-spacing:.04em">${d}</div>`).join('')}
    </div>

    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px">
  `;

  for (let i = 0; i < startOffset; i++) {
    html += `<div style="min-height:72px;border-radius:8px;background:rgba(255,255,255,.02)"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const data = perDay[d];
    const isToday = d === todayD;
    const dayOfWeek = (startOffset + d - 1) % 7;
    const isWeekend = dayOfWeek >= 5;
    const now = new Date(y, m, d);
    const isPast = now < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const note = _calNote(y, m, d);

    const saldo = data ? data.inc - data.exp : 0;
    const hasTx = data && data.txs.length > 0;

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
      <div onclick="showKalendarDay(${d},${m},${y})"
        style="
          min-height:72px;border-radius:8px;
          background:${bgColor};
          border:1px solid ${borderColor};
          ${isToday ? 'box-shadow:0 0 0 1px rgba(74,222,128,.3);' : ''}
          display:flex;flex-direction:column;padding:6px 7px;
          cursor:pointer;transition:transform .12s,box-shadow .12s;position:relative;
        "
        onmouseover="this.style.transform='scale(1.03)';this.style.zIndex='10'"
        onmouseout="this.style.transform='';this.style.zIndex=''"
      >
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
          <span style="font-size:.78rem;font-weight:${isToday ? '800' : '600'};color:${isToday ? '#4ade80' : numColor};${isWeekend && !isToday ? 'color:rgba(248,113,113,.7)' : ''}">${d}</span>
          ${hasTx ? `<span style="font-size:.6rem;color:var(--text3);background:rgba(255,255,255,.08);border-radius:4px;padding:1px 5px">${data.txs.length}</span>` : ''}
        </div>

        ${hasTx ? `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px">
            <div style="font-size:${Math.abs(saldo) >= 100000 ? '.62rem' : Math.abs(saldo) >= 10000 ? '.7rem' : '.82rem'};font-weight:700;color:${saldo >= 0 ? '#4ade80' : '#f87171'};line-height:1.15;letter-spacing:-.02em;text-align:center;white-space:nowrap">
              ${saldo >= 0 ? '+' : ''}${fmt(saldo)}
            </div>
            ${data.exp > 0 && data.inc > 0
        ? `<div style="font-size:.56rem;color:var(--text3);text-align:center;white-space:nowrap">▲${fmt(data.inc)} ▼${fmt(data.exp)}</div>`
        : ''}
          </div>
          ${(() => {
          if (!(data.exp > 0) || avgDailyExp <= 0) return '';
          const ratio = data.exp / avgDailyExp;
          const w = Math.min(100, Math.round(ratio / 2 * 100));
          const col = ratio >= 1.3 ? '#f87171' : ratio >= 0.7 ? '#fbbf24' : '#4ade80';
          const lbl = ratio >= 1.3 ? 'rychlé tempo utrácení' : ratio >= 0.7 ? 'průměrné tempo' : 'klidné tempo';
          return `<div title="${lbl} (${Math.round(ratio * 100)} % průměru)" style="height:3px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden;margin-top:3px">
              <div style="height:100%;width:${w}%;background:${col};border-radius:3px"></div>
            </div>`;
        })()}
        ` : `<div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:.62rem;color:rgba(255,255,255,.12)">${isPast && !hasTx ? '–' : ''}</div>`}

        ${note ? `<div title="Poznámka: ${(note.text || '').replace(/"/g, '&quot;').slice(0, 60)}" style="position:absolute;bottom:5px;right:6px;width:7px;height:7px;border-radius:50%;background:#3b82f6;box-shadow:0 0 0 2px ${bgColor}"></div>` : ''}
        ${note && note.notify ? `<div style="position:absolute;bottom:4px;right:15px;font-size:.55rem">🔔</div>` : ''}
      </div>
    `;
  }

  const total = startOffset + daysInMonth;
  const remainder = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let i = 0; i < remainder; i++) {
    html += `<div style="min-height:72px;border-radius:8px;background:rgba(255,255,255,.02)"></div>`;
  }
  html += `</div>

  <div style="display:flex;align-items:center;gap:16px;margin-top:10px;font-size:.72rem;color:var(--text3);flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:5px"><div style="width:14px;height:14px;border-radius:4px;background:rgba(74,222,128,.2);border:1px solid rgba(74,222,128,.3)"></div>Příjem/Zisk</div>
    <div style="display:flex;align-items:center;gap:5px"><div style="width:14px;height:14px;border-radius:4px;background:rgba(248,113,113,.2);border:1px solid rgba(248,113,113,.3)"></div>Výdaj/Ztráta</div>
    <div style="display:flex;align-items:center;gap:5px"><div style="width:14px;height:14px;border-radius:4px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1)"></div>Bez transakcí</div>
    <div style="display:flex;align-items:center;gap:5px"><div style="width:8px;height:8px;border-radius:50%;background:#3b82f6"></div>Poznámka</div>
    <div style="display:flex;align-items:center;gap:5px;width:100%;margin-top:2px"><div style="width:24px;height:3px;border-radius:3px;background:linear-gradient(90deg,#4ade80,#fbbf24,#f87171)"></div>Tempo utrácení dne (vs. průměrný den)</div>
    <div style="margin-left:auto;color:var(--text3)">Klikni na den – detail i poznámka</div>
  </div>`;

  // ── Týdenní a víkendové statistiky ──
  html += _weeklyStatsHTML(perDay, startOffset, daysInMonth, txs.length, totalInc, totalExp);

  return html;
}

// Týdenní / víkendové statistiky pod kalendářem
function _weeklyStatsHTML(perDay, startOffset, daysInMonth, txCount, totalInc, totalExp) {
  const weeks = [];      // {inc,exp,cnt}
  const wd = { inc: 0, exp: 0, cnt: 0 };  // všední (Po–Pá)
  const we = { inc: 0, exp: 0, cnt: 0 };  // víkend (So–Ne)
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = (startOffset + d - 1) % 7;
    const wk = Math.floor((startOffset + d - 1) / 7);
    weeks[wk] = weeks[wk] || { inc: 0, exp: 0, cnt: 0 };
    const data = perDay[d]; if (!data) continue;
    weeks[wk].inc += data.inc; weeks[wk].exp += data.exp; weeks[wk].cnt += data.txs.length;
    const bucket = dow >= 5 ? we : wd;
    bucket.inc += data.inc; bucket.exp += data.exp; bucket.cnt += data.txs.length;
  }

  const cell = (label, o) => {
    const s = o.inc - o.exp;
    return `<div style="background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:10px;padding:10px 12px">
      <div style="font-size:.72rem;color:var(--text3);margin-bottom:5px">${label} · <span style="color:#a8aec8">${o.cnt} tr.</span></div>
      <div style="display:flex;justify-content:space-between;font-size:.72rem;color:#a8aec8">
        <span style="color:#4ade80">+${fmtB(o.inc)}</span><span style="color:#f87171">-${fmtB(o.exp)}</span>
      </div>
      <div style="font-size:1rem;font-weight:700;color:${s >= 0 ? '#4ade80' : '#f87171'};margin-top:4px">${s >= 0 ? '+' : ''}${fmtB(s)}</div>
    </div>`;
  };

  const weekRows = weeks.map((w, i) => {
    if (!w || w.cnt === 0) return '';
    const s = w.inc - w.exp;
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:.78rem">
      <span style="color:#a8aec8;font-weight:600">Týden ${i + 1}</span>
      <span style="color:var(--text3);font-size:.72rem">${w.cnt} tr.</span>
      <span style="color:${s >= 0 ? '#4ade80' : '#f87171'};font-weight:700;min-width:90px;text-align:right">${s >= 0 ? '+' : ''}${fmtB(s)}</span>
    </div>`;
  }).join('');

  const monthS = totalInc - totalExp;

  return `
    <div class="card" style="margin-top:16px">
      <div class="card-header"><span class="card-title">📊 Týdenní a víkendový přehled</span></div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          ${cell('Všední dny (Po–Pá)', wd)}
          ${cell('Víkend (So–Ne)', we)}
        </div>
        <div style="font-size:.72rem;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Po týdnech</div>
        ${weekRows || '<div style="color:var(--text3);font-size:.78rem;padding:8px 0">Žádné transakce v tomto měsíci.</div>'}
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding-top:10px;border-top:2px solid var(--border)">
          <span style="font-weight:700;color:#a8aec8">Celkem měsíc</span>
          <span style="color:var(--text3);font-size:.74rem">${txCount} transakcí</span>
          <span style="font-weight:800;font-size:1.05rem;color:${monthS >= 0 ? '#4ade80' : '#f87171'};min-width:100px;text-align:right">${monthS >= 0 ? '+' : ''}${fmtB(monthS)}</span>
        </div>
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════
//  DETAIL DNE – transakce + editor poznámky (finanční režim)
// ══════════════════════════════════════════════════════
function showKalendarDay(d, m, y) {
  const D = getData();
  const txs = (D.transactions || []).filter(t => {
    const dt = new Date(t.date);
    return dt.getDate() === d && dt.getMonth() === m && dt.getFullYear() === y;
  });

  const modal = document.getElementById('modalKalendarDay'); if (!modal) return;
  const dayName = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'][new Date(y, m, d).getDay()];
  document.getElementById('kalendarDayTitle').textContent = `${dayName} ${d}. ${CZ_M[m]} ${y}`;

  const inc = txs.filter(t => t.type === 'income').reduce((a, t) => a + txCZK(t), 0);
  const exp = txs.filter(t => t.type === 'expense').reduce((a, t) => a + txCZK(t), 0);
  const note = _calNote(y, m, d);
  const noteText = note ? (note.text || '') : '';
  const notifyOn = note && note.notify;

  const txHtml = txs.length ? `
    <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap">
      ${inc ? `<span style="background:var(--income-bg);color:var(--income);padding:4px 10px;border-radius:8px;font-size:.8rem;font-weight:600">+${fmtB(inc)} příjem</span>` : ''}
      ${exp ? `<span style="background:var(--expense-bg);color:var(--expense);padding:4px 10px;border-radius:8px;font-size:.8rem;font-weight:600">-${fmtB(exp)} výdaj</span>` : ''}
    </div>
    ${txs.sort((a, b) => (b.amount || b.amt || 0) - (a.amount || a.amt || 0)).map(t => {
      const cat = getCat(t.catId, D.categories);
      const amt = txCZK(t);
      return `<div class="tx-row" style="padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="font-size:1rem">${cat.icon}</div>
        <div class="tx-info">
          <div class="tx-name">${t.name}</div>
          <div class="tx-meta">${cat.name}${t.note ? ' · ' + t.note : ''}</div>
        </div>
        <div class="tx-amt ${t.type === 'income' ? 'inc' : 'exp'}">${t.type === 'income' ? '+' : '-'}${fmtB(amt)}</div>
      </div>`;
    }).join('')}
  ` : `<div style="color:var(--text3);font-size:.82rem;padding:6px 0 14px">Žádné transakce v tento den.</div>`;

  // Editor poznámky
  const noteHtml = `
    <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border)">
      <div style="font-size:.78rem;font-weight:700;color:#a8aec8;margin-bottom:8px">📝 Poznámka ke dni</div>
      <textarea id="kalNoteInput" placeholder="Např. splátka nájmu, narozeniny, kontrola u lékaře…" style="width:100%;min-height:70px;resize:vertical;background:var(--surface2);border:1px solid var(--border);border-radius:9px;padding:10px;color:var(--text);font-size:.86rem;font-family:inherit">${noteText.replace(/</g, '&lt;')}</textarea>
      <label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:.82rem;color:#a8aec8;cursor:pointer">
        <input type="checkbox" id="kalNoteNotify" ${notifyOn ? 'checked' : ''} style="width:16px;height:16px;accent-color:#8b7cf6">
        🔔 Připomenout (notifikace) <span style="color:var(--text3);font-size:.72rem">– brzy (po vydání mobilní aplikace)</span>
      </label>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button onclick="saveKalNote(${y},${m},${d})" style="flex:1;padding:9px;border-radius:9px;border:none;background:#8b7cf6;color:#fff;font-weight:700;font-size:.84rem;cursor:pointer">Uložit poznámku</button>
        ${note ? `<button onclick="deleteKalNote(${y},${m},${d})" style="padding:9px 14px;border-radius:9px;border:1px solid var(--border);background:transparent;color:#f87171;font-weight:600;font-size:.84rem;cursor:pointer">Smazat</button>` : ''}
      </div>
    </div>`;

  document.getElementById('kalendarDayContent').innerHTML = txHtml + noteHtml;
  modal.classList.add('open');
}

function saveKalNote(y, m, d) {
  const txt = (document.getElementById('kalNoteInput').value || '').trim();
  const notify = document.getElementById('kalNoteNotify').checked;
  if (!S.calNotes) S.calNotes = {};
  const key = _ck(y, m, d);
  if (!txt) { delete S.calNotes[key]; }
  else { S.calNotes[key] = { text: txt, notify: !!notify }; }
  save();
  if (typeof closeModal === 'function') closeModal('modalKalendarDay');
  renderKalendar();
  if (typeof showToast === 'function') showToast(txt ? '📝 Poznámka uložena' : '🗑️ Poznámka smazána');
}

function deleteKalNote(y, m, d) {
  if (S.calNotes) delete S.calNotes[_ck(y, m, d)];
  save();
  if (typeof closeModal === 'function') closeModal('modalKalendarDay');
  renderKalendar();
  if (typeof showToast === 'function') showToast('🗑️ Poznámka smazána');
}

// ══════════════════════════════════════════════════════
//  PRACOVNÍ KALENDÁŘ (směny, dovolená, přesčasy)
// ══════════════════════════════════════════════════════
// S16 (TODO-164): podtypy směny (ranní/odpolední/noční)
const _SHIFTS = {
  ranni:     { label: 'Ranní',     icon: '🌅', short: 'R' },
  odpoledni: { label: 'Odpolední', icon: '🌇', short: 'O' },
  nocni:     { label: 'Noční',     icon: '🌙', short: 'N' },
};
const _WORK_TYPES = {
  smena:    { label: 'Směna',    icon: '💼', bg: 'rgba(74,222,128,.12)',  border: 'rgba(74,222,128,.35)',  color: '#4ade80' },
  dovolena: { label: 'Dovolená', icon: '🏖️', bg: 'rgba(59,130,246,.14)', border: 'rgba(59,130,246,.4)',   color: '#60a5fa' },
  nemoc:    { label: 'Nemoc',    icon: '🤒', bg: 'rgba(251,191,36,.12)',  border: 'rgba(251,191,36,.35)',  color: '#fbbf24' },
  volno:    { label: 'Volno',    icon: '⛱️', bg: 'rgba(255,255,255,.05)', border: 'rgba(255,255,255,.12)', color: 'var(--text3)' },
};

function _workCfg() {
  const w = S.workCal || {};
  return { hpd: w.hpd || 8, vacQuota: (w.vacQuota != null ? w.vacQuota : 20), workdays: w.workdays || [1, 2, 3, 4, 5], days: w.days || {} };
}

function _renderKalWork(D, m, y) {
  const cfg = _workCfg();
  const firstDay = new Date(y, m, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = new Date();
  const todayD = today.getFullYear() === y && today.getMonth() === m ? today.getDate() : -1;
  const dayNames = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

  // Sumář za měsíc
  let shifts = 0, hours = 0, vac = 0, sick = 0, overtime = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const wd = _workDay(y, m, d); if (!wd) continue;
    if (wd.type === 'smena') { shifts++; hours += (wd.hours || 0); overtime += Math.max(0, (wd.hours || 0) - cfg.hpd); }
    else if (wd.type === 'dovolena') vac++;
    else if (wd.type === 'nemoc') sick++;
  }
  // Zůstatek dovolené za CELÝ ROK
  let vacYear = 0;
  Object.keys(cfg.days).forEach(k => { if (k.startsWith(`${y}-`) && cfg.days[k].type === 'dovolena') vacYear++; });
  const vacLeft = cfg.vacQuota - vacYear;

  // Nastavení úvazku
  const dayToggle = (i, lbl) => {
    const on = cfg.workdays.includes(i);
    return `<button onclick="_toggleWorkday(${i})" style="padding:5px 9px;border-radius:7px;font-size:.72rem;font-weight:700;cursor:pointer;border:1px solid ${on ? 'rgba(139,124,246,.5)' : 'var(--border)'};background:${on ? 'rgba(139,124,246,.14)' : 'transparent'};color:${on ? '#b9aefc' : 'var(--text3)'}">${lbl}</button>`;
  };
  const settings = `
    <div class="card" style="margin-bottom:14px">
      <div class="card-header"><span class="card-title">⚙️ Nastavení úvazku</span></div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <div style="font-size:.72rem;color:var(--text3);margin-bottom:4px">Hodin / směna</div>
            <input type="number" id="workHpd" value="${cfg.hpd}" min="1" max="24" step="0.5" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px;color:var(--text)">
          </div>
          <div>
            <div style="font-size:.72rem;color:var(--text3);margin-bottom:4px">Dní dovolené / rok</div>
            <input type="number" id="workVacQuota" value="${cfg.vacQuota}" min="0" max="60" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px;color:var(--text)">
          </div>
        </div>
        <div style="font-size:.72rem;color:var(--text3);margin-bottom:6px">Pracovní dny (informativní)</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px">
          ${dayNames.map((n, i) => dayToggle(i, n)).join('')}
        </div>
        <button onclick="saveWorkSettings()" style="width:100%;padding:9px;border-radius:9px;border:none;background:#8b7cf6;color:#fff;font-weight:700;font-size:.84rem;cursor:pointer">Uložit nastavení</button>
      </div>
    </div>`;

  // Sumář
  const sc = (label, val, unit, color) => `
    <div style="background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:10px;padding:11px;text-align:center">
      <div style="font-size:.7rem;color:var(--text3);margin-bottom:3px">${label}</div>
      <div style="font-size:1.15rem;font-weight:800;color:${color}">${val}<span style="font-size:.7rem;font-weight:600;color:var(--text3)"> ${unit}</span></div>
    </div>`;
  const summary = `
    <div class="card" style="margin-top:16px">
      <div class="card-header"><span class="card-title">📋 Sumář – ${CZ_M[m]} ${y}</span></div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
          ${sc('Směny', shifts, 'směn', '#4ade80')}
          ${sc('Odpracováno', hours.toFixed(hours % 1 ? 1 : 0), 'h', '#4ade80')}
          ${sc('Přesčasy', overtime.toFixed(overtime % 1 ? 1 : 0), 'h', overtime > 0 ? '#fbbf24' : 'var(--text3)')}
          ${sc('Dovolená', vac, 'dní', '#60a5fa')}
          ${sc('Nemoc', sick, 'dní', sick > 0 ? '#fbbf24' : 'var(--text3)')}
          ${sc('Zůstatek dov.', vacLeft, 'dní', vacLeft < 0 ? '#f87171' : vacLeft <= 3 ? '#fbbf24' : '#4ade80')}
        </div>
        <div style="font-size:.72rem;color:var(--text3);margin-top:10px">Zůstatek dovolené = ${cfg.vacQuota} dní/rok − ${vacYear} vyčerpaných v roce ${y}.</div>
      </div>
    </div>`;

  // ── S16 (TODO-165): Kopírování úseku směn ──
  const CP = window._workCopy || (window._workCopy = { on: false, start: null, end: null, repeat: false });
  const _dnum = (yy, mm, dd) => Math.round(new Date(yy, mm, dd).getTime() / 86400000);
  const selA = CP.start ? _dnum(CP.start.y, CP.start.m, CP.start.d) : null;
  const selB = CP.end ? _dnum(CP.end.y, CP.end.m, CP.end.d) : null;
  const copyBar = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">
      <button onclick="workCopyToggle()" style="padding:8px 12px;border-radius:9px;cursor:pointer;font-size:.78rem;font-weight:700;border:1px solid ${CP.on ? 'rgba(139,124,246,.5)' : 'var(--border)'};background:${CP.on ? 'rgba(139,124,246,.14)' : 'transparent'};color:${CP.on ? '#b9aefc' : 'var(--text3)'}">📋 Kopírovat úsek</button>
      ${CP.on ? `<span style="font-size:.74rem;color:#a8aec8;flex:1;min-width:160px">${!CP.start ? '1️⃣ Klikni na PRVNÍ den úseku' : !CP.end ? '2️⃣ Klikni na POSLEDNÍ den úseku' : `✅ Úsek ${CP.start.d}.${CP.start.m + 1}.–${CP.end.d}.${CP.end.m + 1}. (${selB - selA + 1} dní) → 3️⃣ klikni na CÍLOVÝ den`}</span>` : ''}
      ${CP.on && CP.end ? `<label style="display:flex;align-items:center;gap:5px;font-size:.74rem;color:#a8aec8;cursor:pointer"><input type="checkbox" ${CP.repeat ? 'checked' : ''} onchange="window._workCopy.repeat=this.checked" style="accent-color:#8b7cf6">🔁 opakovat do konce měsíce</label>` : ''}
      ${CP.on ? `<button onclick="workCopyCancel()" style="padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:transparent;color:#f87171;font-size:.74rem;cursor:pointer">✖ Zrušit</button>` : ''}
    </div>`;

  // Mřížka
  let grid = `
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:3px">
      ${dayNames.map((d, i) => `<div style="text-align:center;font-size:.72rem;font-weight:700;color:${i >= 5 ? 'rgba(248,113,113,.6)' : 'var(--text3)'};padding:5px 0;letter-spacing:.04em">${d}</div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px">`;
  for (let i = 0; i < startOffset; i++) grid += `<div style="min-height:64px;border-radius:8px;background:rgba(255,255,255,.02)"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === todayD;
    const dow = (startOffset + d - 1) % 7;
    const isWeekend = dow >= 5;
    const wd = _workDay(y, m, d);
    const ty = wd ? _WORK_TYPES[wd.type] : null;
    const bg = ty ? ty.bg : 'rgba(255,255,255,.02)';
    let border = ty ? ty.border : (isToday ? 'rgba(74,222,128,.6)' : 'rgba(255,255,255,.04)');
    if (isToday) border = 'rgba(74,222,128,.7)';
    // zvýraznění vybraného úseku při kopírování
    const dn = _dnum(y, m, d);
    const inSel = CP.on && selA !== null && (selB !== null ? (dn >= selA && dn <= selB) : dn === selA);
    if (inSel) border = 'rgba(139,124,246,.8)';
    const selShadow = inSel ? 'box-shadow:0 0 0 1px rgba(139,124,246,.5);' : (isToday ? 'box-shadow:0 0 0 1px rgba(74,222,128,.3);' : '');
    grid += `
      <div onclick="${CP.on ? `workCopyClick(${d},${m},${y})` : `showWorkDay(${d},${m},${y})`}" style="min-height:64px;border-radius:8px;background:${inSel ? 'rgba(139,124,246,.10)' : bg};border:1px solid ${border};${selShadow}display:flex;flex-direction:column;padding:6px 7px;cursor:pointer;transition:transform .12s;position:relative"
        onmouseover="this.style.transform='scale(1.03)';this.style.zIndex='10'" onmouseout="this.style.transform='';this.style.zIndex=''">
        <span style="font-size:.78rem;font-weight:${isToday ? '800' : '600'};color:${isToday ? '#4ade80' : isWeekend ? 'rgba(248,113,113,.7)' : 'var(--text3)'}">${d}</span>
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px">
          ${ty ? (wd.type === 'smena'
            ? `<div style="font-size:1rem;line-height:1">${(wd.shift && _SHIFTS[wd.shift]) ? _SHIFTS[wd.shift].icon : ty.icon}</div>
               <div style="font-size:.66rem;font-weight:700;color:${ty.color}">${(wd.shift && _SHIFTS[wd.shift]) ? _SHIFTS[wd.shift].short + ' ' : ''}${wd.hours || cfg.hpd}h</div>`
            : `<div style="font-size:1rem;line-height:1">${ty.icon}</div><div style="font-size:.6rem;color:${ty.color}">${ty.label}</div>`) : ''}
        </div>
      </div>`;
  }
  const total = startOffset + daysInMonth;
  const rem = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let i = 0; i < rem; i++) grid += `<div style="min-height:64px;border-radius:8px;background:rgba(255,255,255,.02)"></div>`;
  grid += `</div>
    <div style="display:flex;align-items:center;gap:14px;margin-top:10px;font-size:.72rem;color:var(--text3);flex-wrap:wrap">
      ${Object.values(_WORK_TYPES).map(t => `<div style="display:flex;align-items:center;gap:5px">${t.icon} ${t.label}</div>`).join('')}
      <div style="margin-left:auto">Klikni na den – zadej směnu/dovolenou</div>
    </div>`;

  return settings + copyBar + grid + summary;
}

// ── S16 (TODO-165): Kopírování úseku směn ──
function workCopyToggle() {
  const CP = window._workCopy || (window._workCopy = {});
  if (CP.on) { workCopyCancel(); return; }
  window._workCopy = { on: true, start: null, end: null, repeat: false };
  renderKalendar();
}

function workCopyCancel() {
  window._workCopy = { on: false, start: null, end: null, repeat: false };
  renderKalendar();
}

function workCopyClick(d, m, y) {
  const CP = window._workCopy;
  const dnum = (yy, mm, dd) => Math.round(new Date(yy, mm, dd).getTime() / 86400000);
  if (!CP.start) { CP.start = { y, m, d }; renderKalendar(); return; }
  if (!CP.end) {
    let a = CP.start, b = { y, m, d };
    if (dnum(b.y, b.m, b.d) < dnum(a.y, a.m, a.d)) { const t = a; a = b; b = t; }  // prohození při obráceném výběru
    CP.start = a; CP.end = b; renderKalendar(); return;
  }
  // 3. klik = cíl → vložit vzor
  const cfg = _workCfg();
  const days = Object.assign({}, cfg.days);
  const s = new Date(CP.start.y, CP.start.m, CP.start.d);
  const len = dnum(CP.end.y, CP.end.m, CP.end.d) - dnum(CP.start.y, CP.start.m, CP.start.d) + 1;
  const pattern = [];
  for (let i = 0; i < len; i++) {
    const dt = new Date(s); dt.setDate(s.getDate() + i);
    const e = days[_ck(dt.getFullYear(), dt.getMonth(), dt.getDate())];
    pattern.push(e ? Object.assign({}, e) : null);   // null = volný den ve vzoru → cíl se vyčistí
  }
  const tgt = new Date(y, m, d);
  const monthEnd = new Date(S.curYear, S.curMonth + 1, 0);
  const reps = CP.repeat ? Math.max(1, Math.ceil((dnum(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate()) - dnum(y, m, d) + 1) / len)) : 1;
  let written = 0;
  for (let r = 0; r < reps; r++) {
    for (let i = 0; i < len; i++) {
      const dt = new Date(tgt); dt.setDate(tgt.getDate() + r * len + i);
      if (CP.repeat && dt > monthEnd) break;
      const key = _ck(dt.getFullYear(), dt.getMonth(), dt.getDate());
      if (pattern[i]) { days[key] = Object.assign({}, pattern[i]); written++; }
      else delete days[key];
    }
  }
  S.workCal = { hpd: cfg.hpd, vacQuota: cfg.vacQuota, workdays: cfg.workdays, days };
  save();
  window._workCopy = { on: false, start: null, end: null, repeat: false };
  renderKalendar();
  if (typeof showToast === 'function') showToast(`📋 Vzor vložen (${written} ${written === 1 ? 'den' : written < 5 ? 'dny' : 'dní'})`);
}

function _toggleWorkday(i) {
  const cfg = _workCfg();
  const set = new Set(cfg.workdays);
  if (set.has(i)) set.delete(i); else set.add(i);
  S.workCal = { hpd: cfg.hpd, vacQuota: cfg.vacQuota, workdays: [...set].sort((a, b) => a - b), days: cfg.days };
  save();
  renderKalendar();
}

function saveWorkSettings() {
  const hpd = parseFloat(document.getElementById('workHpd').value) || 8;
  const vacQuota = parseInt(document.getElementById('workVacQuota').value);
  const cfg = _workCfg();
  S.workCal = { hpd, vacQuota: isNaN(vacQuota) ? 20 : vacQuota, workdays: cfg.workdays, days: cfg.days };
  save();
  renderKalendar();
  if (typeof showToast === 'function') showToast('⚙️ Nastavení úvazku uloženo');
}

function showWorkDay(d, m, y) {
  const modal = document.getElementById('modalKalendarDay'); if (!modal) return;
  const cfg = _workCfg();
  const wd = _workDay(y, m, d);
  const dayName = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'][new Date(y, m, d).getDay()];
  document.getElementById('kalendarDayTitle').textContent = `${dayName} ${d}. ${CZ_M[m]} ${y}`;
  const curType = wd ? wd.type : '';
  const curHours = wd && wd.hours != null ? wd.hours : cfg.hpd;
  const curShift = wd && wd.shift ? wd.shift : '';

  const typeBtn = (id) => {
    const t = _WORK_TYPES[id];
    const on = curType === id;
    return `<button onclick="_selWorkType('${id}')" data-wtype="${id}" style="flex:1;min-width:70px;padding:10px 6px;border-radius:9px;cursor:pointer;font-size:.78rem;font-weight:700;border:1px solid ${on ? t.border : 'var(--border)'};background:${on ? t.bg : 'transparent'};color:${on ? t.color : 'var(--text3)'}">${t.icon} ${t.label}</button>`;
  };

  const shiftBtn = (id) => {
    const sh = _SHIFTS[id]; const on = curShift === id;
    return `<button onclick="_selShift('${id}')" data-shift="${id}" style="flex:1;min-width:64px;padding:8px 6px;border-radius:9px;cursor:pointer;font-size:.76rem;font-weight:700;border:1px solid ${on ? 'rgba(139,124,246,.5)' : 'var(--border)'};background:${on ? 'rgba(139,124,246,.14)' : 'transparent'};color:${on ? '#b9aefc' : 'var(--text3)'}">${sh.icon} ${sh.label}</button>`;
  };

  document.getElementById('kalendarDayContent').innerHTML = `
    <input type="hidden" id="workSelType" value="${curType}">
    <input type="hidden" id="workSelShift" value="${curShift}">
    <div style="font-size:.78rem;color:var(--text3);margin-bottom:8px">Typ dne</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
      ${Object.keys(_WORK_TYPES).map(typeBtn).join('')}
    </div>
    <div id="workShiftRow" style="${curType === 'smena' ? '' : 'display:none;'}margin-bottom:14px">
      <div style="font-size:.78rem;color:var(--text3);margin-bottom:4px">Typ směny</div>
      <div style="display:flex;gap:6px">
        ${Object.keys(_SHIFTS).map(shiftBtn).join('')}
      </div>
    </div>
    <div id="workHoursRow" style="${curType === 'smena' ? '' : 'display:none;'}margin-bottom:14px">
      <div style="font-size:.78rem;color:var(--text3);margin-bottom:4px">Odpracované hodiny (přesčas = nad ${cfg.hpd}h)</div>
      <input type="number" id="workDayHours" value="${curHours}" min="0" max="24" step="0.5" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px;color:var(--text);font-size:.9rem">
    </div>
    <div style="display:flex;gap:8px">
      <button onclick="saveWorkDay(${y},${m},${d})" style="flex:1;padding:10px;border-radius:9px;border:none;background:#8b7cf6;color:#fff;font-weight:700;font-size:.86rem;cursor:pointer">Uložit</button>
      ${wd ? `<button onclick="clearWorkDay(${y},${m},${d})" style="padding:10px 16px;border-radius:9px;border:1px solid var(--border);background:transparent;color:#f87171;font-weight:600;font-size:.86rem;cursor:pointer">Vymazat</button>` : ''}
    </div>`;
  modal.classList.add('open');
}

function _selWorkType(id) {
  document.getElementById('workSelType').value = id;
  const isShift = id === 'smena';
  document.getElementById('workHoursRow').style.display = isShift ? '' : 'none';
  const sr = document.getElementById('workShiftRow'); if (sr) sr.style.display = isShift ? '' : 'none';
  document.querySelectorAll('[data-wtype]').forEach(b => {
    const t = _WORK_TYPES[b.getAttribute('data-wtype')];
    const on = b.getAttribute('data-wtype') === id;
    b.style.border = `1px solid ${on ? t.border : 'var(--border)'}`;
    b.style.background = on ? t.bg : 'transparent';
    b.style.color = on ? t.color : 'var(--text3)';
  });
}

function _selShift(id) {
  document.getElementById('workSelShift').value = id;
  document.querySelectorAll('[data-shift]').forEach(b => {
    const on = b.getAttribute('data-shift') === id;
    b.style.border = `1px solid ${on ? 'rgba(139,124,246,.5)' : 'var(--border)'}`;
    b.style.background = on ? 'rgba(139,124,246,.14)' : 'transparent';
    b.style.color = on ? '#b9aefc' : 'var(--text3)';
  });
}

function saveWorkDay(y, m, d) {
  const type = document.getElementById('workSelType').value;
  if (!type) { if (typeof showToast === 'function') showToast('Vyber typ dne'); return; }
  const cfg = _workCfg();
  const days = cfg.days || {};
  const entry = { type };
  if (type === 'smena') {
    entry.hours = parseFloat(document.getElementById('workDayHours').value) || cfg.hpd;
    const sh = document.getElementById('workSelShift').value;
    if (sh) entry.shift = sh;
  }
  days[_ck(y, m, d)] = entry;
  S.workCal = { hpd: cfg.hpd, vacQuota: cfg.vacQuota, workdays: cfg.workdays, days };
  save();
  if (typeof closeModal === 'function') closeModal('modalKalendarDay');
  renderKalendar();
  if (typeof showToast === 'function') showToast('💼 Uloženo');
}

function clearWorkDay(y, m, d) {
  const cfg = _workCfg();
  const days = cfg.days || {};
  delete days[_ck(y, m, d)];
  S.workCal = { hpd: cfg.hpd, vacQuota: cfg.vacQuota, workdays: cfg.workdays, days };
  save();
  if (typeof closeModal === 'function') closeModal('modalKalendarDay');
  renderKalendar();
  if (typeof showToast === 'function') showToast('🗑️ Vymazáno');
}

// Formátuj číslo kompaktně (1234 → 1,2k)
function fmtK(n) {
  const neg = n < 0 ? '-' : '';
  const a = Math.abs(n);
  if (a >= 10000) return neg + Math.round(a / 1000) + 'k';
  if (a >= 1000) return neg + (a / 1000).toFixed(1).replace('.0', '') + 'k';
  return neg + Math.round(a).toString();
}
