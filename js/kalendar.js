// FinanceFlow · v11.80 · kalendar.js · 2026-10-15
// ══════════════════════════════════════════════════════
//  KALENDÁŘ – FinanceFlow
//  Režimy (window._calMode): 'finance' (transakce) | 'work' (pracovní kalendář).
//  S16 (TODO-161): Poznámky ke dnům (modrý puntík) + týdenní/víkendové statistiky
//                  + přepínač na pracovní kalendář (směny/dovolená/přesčasy).
//  Data: S.calNotes[YYYY-MM-DD] = {text, notify}; S.workCal = {hpd, workdays, vacQuota, days}.
//  (obě pole jsou v saveToFirebase i saveSnapshot schématu – app.js)
// ══════════════════════════════════════════════════════

// Klíč dne YYYY-MM-DD (zero-padded)
//  S24 (v11.10, Milan: „čísla v kalendáři jsou na mobilu smrsknutá, jsou tam 3 tečky"):
//  buňka dne je na telefonu ~50 px široká. Od 10 000 se částka zkracuje
//  (29 700 → 29,7k, 1 250 000 → 1,3M), celá částka je v bublině a v detailu dne.
function kalKratce(v) {
  const n = Number(v) || 0, a = Math.abs(n);
  if (a < 10000) return fmt(n);
  const [d, z] = a >= 999500 ? [1e6, 'M'] : [1e3, 'k'];
  const x = n / d;
  const t = (Math.abs(x) >= 100 ? Math.round(x).toString() : (Math.round(x * 10) / 10).toString()).replace('.', ',');
  return t + z;
}
window.kalKratce = kalKratce;

function _ck(y, m, d) { return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
function _calNote(y, m, d) { return (S.calNotes || {})[_ck(y, m, d)] || null; }
function _workDay(y, m, d) {
  //  S26 (v11.80): při výpočtu simulace se k dnům přidají simulované přesčasy (nic se neukládá).
  const k = _ck(y, m, d), W = (typeof window !== 'undefined') ? window : {};
  if (W._workSimAktivni && W._workSim && W._workSim.days && W._workSim.days[k]) return W._workSim.days[k];
  return ((S.workCal || {}).days || {})[k] || null;
}

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
      ${tabBtn('vyplatnice', '🧾', 'Výplatnice')}
    </div>`;

  // TODO-257 (S21): evidence výplatních pásek. Vlastní modul vyplatnice.js.
  if (mode === 'vyplatnice') {
    el.innerHTML = toggle + (typeof _renderKalVyplatnice === 'function'
      ? _renderKalVyplatnice(D, m, y)
      : '<div class="empty"><div class="et">Modul výplatnic se nenačetl.</div></div>');
    return;
  }

  if (mode === 'work') {
    el.innerHTML = toggle + _renderKalWork(D, m, y);
    // FIX-326: náhled sazby se musí dopočítat po vložení HTML – prvky do té
    //   chvíle neexistují. Side-render ve vlastním try/catch.
    try { if (typeof workPreviewSazba === 'function') workPreviewSazba(); } catch (e) {}
    return;
  }
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
          ${hasTx ? `<span style="font-size:.66rem;color:#a8aec8;background:rgba(255,255,255,.08);border-radius:4px;padding:1px 5px">${data.txs.length}</span>` : ''}
        </div>

        ${hasTx ? `
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;overflow:hidden">
            <div title="${saldo >= 0 ? '+' : ''}${fmt(saldo)}" style="font-size:${Math.abs(saldo) >= 10000 ? '.76rem' : '.82rem'};font-weight:700;color:${saldo >= 0 ? '#4ade80' : '#f87171'};line-height:1.15;letter-spacing:-.02em;text-align:center;white-space:nowrap;max-width:100%;overflow:hidden">
              ${saldo >= 0 ? '+' : ''}${kalKratce(saldo)}
            </div>
            ${data.exp > 0 && data.inc > 0
        ? `<div style="font-size:.62rem;color:#a8aec8;text-align:center;line-height:1.25;width:100%;overflow:hidden;white-space:nowrap">▲${kalKratce(data.inc)}<br>▼${kalKratce(data.exp)}</div>`
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
        ${note && note.notify ? `<div style="position:absolute;bottom:4px;right:15px;font-size:.66rem">🔔</div>` : ''}
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
  prescas:  { label: 'Přesčas',  icon: '⏱️', bg: 'rgba(251,191,36,.14)',  border: 'rgba(251,191,36,.45)',  color: '#fbbf24' },  // S17.7: práce navíc mimo směny (osobní volno)
  dovolena: { label: 'Dovolená', icon: '🏖️', bg: 'rgba(59,130,246,.14)', border: 'rgba(59,130,246,.4)',   color: '#60a5fa' },
  nemoc:    { label: 'Nemoc',    icon: '🤒', bg: 'rgba(251,191,36,.12)',  border: 'rgba(251,191,36,.35)',  color: '#fbbf24' },
  //  S26 (v11.78, Milan: „kdy jsem měl dovolenou či paragraf“).
  //  v11.79 (Milan: „paragraf snižuje mzdu, peníze přijdou od státu“): zaměstnavatel ho neplatí, dávku vyplácí ČSSZ.
  paragraf: { label: 'Paragraf', icon: '🩺', bg: 'rgba(244,114,182,.12)', border: 'rgba(244,114,182,.38)', color: '#f472b6' },
  volno:    { label: 'Volno',    icon: '⛱️', bg: 'rgba(255,255,255,.05)', border: 'rgba(255,255,255,.12)', color: 'var(--text3)' },
};

// ══════════════════════════════════════════════════════════════════════
//  FIX-326 (S21, Milan): HODINOVÁ SAZBA Z ČISTÉ VÝPLATY
//  Počítá se z FONDU pracovní doby daného měsíce, ne z paušálních 160 h –
//  září 2026 má 22 pracovních dní, únor jich má 20. Rozdíl je přes 9 %,
//  takže paušál by dával sazbu, která nesedí ani jeden měsíc.
//  Placené hodiny = pracovní dny × (hodin na směnu − neplacená přestávka).
// ══════════════════════════════════════════════════════════════════════
function workFondHodin(rok, mesic, cfg) {
  const dnu = new Date(rok, mesic + 1, 0).getDate();
  const prac = (cfg.workdays || [1, 2, 3, 4, 5]);
  let dni = 0;
  for (let d = 1; d <= dnu; d++) {
    if (prac.includes(new Date(rok, mesic, d).getDay())) dni++;
  }
  const hodinDen = Math.max(0, (cfg.hpd || 8) - (cfg.breakMin || 0) / 60);
  return { dni, hodinDen, hodin: dni * hodinDen };
}

function workPreviewSazba() {
  const el = document.getElementById('workSazbaNahled'); if (!el) return;
  const vyplata = parseFloat((document.getElementById('workSalary')?.value || '').replace(/\s/g, '').replace(',', '.')) || _workSalary(_workCfg(), S.curYear, S.curMonth).castka || 0;
  if (!vyplata) {
    el.innerHTML = 'Zadej čistou výplatu a spočítám z ní hodinovou sazbu.';
    return;
  }
  // Konfigurace se bere ŽIVĚ z polí, ne z uložené – jinak by náhled ukazoval
  // sazbu podle starých hodnot, dokud uživatel neklikne na Uložit.
  const cfg = Object.assign({}, _workCfg(), {
    hpd: parseFloat(document.getElementById('workHpd')?.value) || _workCfg().hpd,
    breakMin: parseFloat(document.getElementById('workBreakMin')?.value) || 0,
  });
  const f = workFondHodin(S.curYear, S.curMonth, cfg);
  //  S26 (v11.75): když jsou v měsíci zadané směny, počítá se ze SKUTEČNÝCH hodin (směny bez přestávek
  //  + dovolená), ne z pracovních dní Po–Pá – u směnového provozu by fond nesedl.
  const hm = typeof _workHodiny === 'function' ? _workHodiny(cfg, S.curYear, S.curMonth) : null;
  const zeSmen = hm && (hm.payH + hm.vacH) > 0;
  const hod = zeSmen ? hm.payH + hm.vacH : f.hodin;
  if (!hod) { el.innerHTML = 'Nastav hodiny na směnu a pracovní dny.'; return; }
  const sazba = vyplata / hod;
  const h1 = v => String(Math.round(v * 10) / 10).replace('.', ',');
  el.innerHTML = `Hodinová sazba <strong style="color:#7dd34f">${fmt(Math.round(sazba))} Kč/h</strong>`
    + (zeSmen ? ` <span style="color:#a8aec8">· ${CZ_M[S.curMonth]}: ${h1(hm.payH)} h ve směnách${hm.vacH ? ` + ${h1(hm.vacH)} h dovolené` : ''} = ${h1(hod)} h</span>`
      : ` <span style="color:#a8aec8">· ${CZ_M[S.curMonth]} má ${f.dni} pracovních dní × ${h1(f.hodinDen)} h = ${Math.round(f.hodin)} h</span>`)
    + `<br><span style="color:#a8aec8">Přesčasová hodina s příplatkem ${cfg.bonusOT} %: `
    + `<strong style="color:#c9cede">${fmt(Math.round(sazba * (1 + cfg.bonusOT / 100)))} Kč</strong></span>`;
}
window.workPreviewSazba = workPreviewSazba;
window.workFondHodin = workFondHodin;

function _workCfg() {
  const w = S.workCal || {};
  // S17.5 (Milan): + mzdová konfigurace – přestávka, čistá výplata, příplatky (%)
  return {
    hpd: w.hpd || 8, vacQuota: (w.vacQuota != null ? w.vacQuota : 20), workdays: w.workdays || [1, 2, 3, 4, 5], days: w.days || {},
    breakMin: (w.breakMin != null ? w.breakMin : 30),        // neplacená přestávka min/den
    salary: w.salary || 0,                                    // čistá výplata Kč/měs (výchozí)
    salaryM: w.salaryM || {},                                 // S25: čistá výplata zadaná pro konkrétní měsíc {'YYYY-MM': Kč}
    //  S25 (Milan): dovolená v HODINÁCH (zákoník práce od 2021). Starší nastavení ve dnech se přepočte × hodin/směna.
    vacQuotaH: (w.vacQuotaH != null ? w.vacQuotaH : ((w.vacQuota != null ? w.vacQuota : 20) * (w.hpd || 8))),
    bonusOT: (w.bonusOT != null ? w.bonusOT : 25),            // příplatek přesčas %
    bonusWe: (w.bonusWe != null ? w.bonusWe : 10),            // příplatek víkend %
    bonusHol: (w.bonusHol != null ? w.bonusHol : 100),        // příplatek svátek %
    bonusNight: (w.bonusNight != null ? w.bonusNight : 10),   // příplatek noční %
  };
}
//  S25: čistá výplata pro měsíc – zadaná pro ten měsíc, jinak poslední zadaná dřív, jinak výchozí.
function _workSalary(cfg, y, m) {
  const k = `${y}-${String(m + 1).padStart(2, '0')}`, M = cfg.salaryM || {};
  if (M[k] != null) return { castka: M[k], zadana: true };
  const drivejsi = Object.keys(M).filter(x => x < k).sort().pop();
  return { castka: drivejsi ? M[drivejsi] : (cfg.salary || 0), zadana: false, odkud: drivejsi || '' };
}
window._workSalary = _workSalary;
//  S25: hodiny dovolené dne – zadané u dne, jinak délka směny.
//  S26 (v11.75, Milan: „12h směna + 1 h přestávky = odpracováno 11 h, den dovolené = 11 h“): přestávka se
//  do pracovní doby nepočítá (§ 88 ZP), proto den dovolené = hodin/směna − neplacená přestávka. Sedí i
//  na výplatnici (nepřítomnost 11 h za den dovolené).
function _workVacH(wd, cfg) { return (wd && wd.hours > 0) ? wd.hours : Math.max(0, (cfg.hpd || 8) - (cfg.breakMin || 0) / 60); }
//  S26 (v11.75): hodiny měsíce – jedno místo pro Sumář, Hodinovou mzdu i odhad výplaty
function _workHodiny(cfg, y, m) {
  const hol = _czHolidays(y), dnu = new Date(y, m + 1, 0).getDate();
  //  S26 (v11.78): + planH (plánované směny bez přesčasu, čistě), otNetH (přesčas bez přestávek), parH, nemocH –
  //  pro odhad výplaty z pásky (fond = plánované směny + nepřítomnost v plánu, sedí na výplatnici).
  const r = { grossH: 0, payH: 0, otH: 0, weH: 0, holH: 0, nightH: 0, smen: 0, prescasDni: 0, vacH: 0, nemoc: 0,
              planH: 0, otNetH: 0, parH: 0, nemocH: 0, paragraf: 0 };
  for (let d = 1; d <= dnu; d++) {
    const wd = _workDay(y, m, d); if (!wd) continue;
    if (wd.type === 'dovolena') { r.vacH += _workVacH(wd, cfg); continue; }
    if (wd.type === 'paragraf') { r.paragraf++; r.parH += _workVacH(wd, cfg); continue; }
    if (wd.type === 'nemoc') { r.nemoc++; r.nemocH += _workVacH(wd, cfg); continue; }
    if (wd.type !== 'smena' && wd.type !== 'prescas') continue;
    if (wd.type === 'smena') r.smen++; else r.prescasDni++;
    const h = wd.hours || 0, p = Math.max(0, h - (cfg.breakMin || 0) / 60);
    r.grossH += h; r.payH += p;
    r.otH += (wd.type === 'prescas') ? h : Math.max(0, h - cfg.hpd);   // S17.7: celý přesčasový den je přesčas
    const navic = wd.type === 'prescas' ? p : Math.max(0, h - cfg.hpd);
    r.otNetH += navic; if (wd.type === 'smena') r.planH += p - navic;
    const dow = new Date(y, m, d).getDay();
    if (hol.has(`${m + 1}-${d}`)) r.holH += p;
    else if (dow === 0 || dow === 6) r.weH += p;                        // svátek má přednost, nepočítat 2×
    if (wd.shift === 'nocni') r.nightH += p;
  }
  //  S26 (v11.79, Milan: „proč máme u přesčasu 12 h?“): přesčas BEZ neplacené přestávky, stejně jako Odpracováno
  //  (směna 14+1 = 154 + 11 = 165 h) a jako na výplatnici (přesčas po 11 h). Hrubé hodiny zůstávají v otGrossH.
  r.otGrossH = r.otH; r.otH = r.otNetH;
  //  Vážené hodiny: příplatková hodina váží (1 + %). Dovolená se platí průměrným výdělkem → váží 1.
  r.weightedH = r.payH + r.vacH + r.weH * cfg.bonusWe / 100 + r.holH * cfg.bonusHol / 100 + r.nightH * cfg.bonusNight / 100 + Math.min(r.otH, r.payH) * cfg.bonusOT / 100;
  return r;
}
//  S26 (v11.75, Milan: „můžeme přidat odhad výplaty pro daný měsíc?“): základní sazba z posledních
//  (až 3) měsíců se ZADANOU výplatou × vážené hodiny tohoto měsíce. Čistá výplata s hodinami neroste
//  úplně lineárně (daň, prémie, srážky), proto je to odhad ± pár procent.
function workOdhadVyplaty(cfg, y, m) {
  const ted = _workHodiny(cfg, y, m); if (!ted.weightedH) return null;
  const k = (yy, mm) => `${yy}-${String(mm + 1).padStart(2, '0')}`, M = cfg.salaryM || {}, zdroj = [];
  for (let i = 1; i <= 12 && zdroj.length < 3; i++) {
    let mm = m - i, yy = y; while (mm < 0) { mm += 12; yy--; }
    const castka = M[k(yy, mm)]; if (!castka) continue;
    const h = _workHodiny(cfg, yy, mm); if (h.weightedH > 0) zdroj.push({ y: yy, m: mm, castka, sazba: castka / h.weightedH });
  }
  if (!zdroj.length) return null;
  const sazba = zdroj.reduce((a, z) => a + z.sazba, 0) / zdroj.length;
  return { castka: Math.round(sazba * ted.weightedH / 100) * 100, sazba, weightedH: ted.weightedH, zdroj };
}
window.workOdhadVyplaty = workOdhadVyplaty; window._workHodiny = _workHodiny;
// S17.5: jednotný zapisovač S.workCal – zachovává VŠECHNA pole konfigurace (nové mzdové
// položky by jinak starší zapisovače tiše smazaly – stejná třída chyby jako Firebase schema).
function _workSave(patch) {
  S.workCal = Object.assign({}, _workCfg(), patch);
  save();
}
// S17.5: české státní svátky (pevné + Velký pátek a Velikonoční pondělí z computu)
function _czHolidays(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d2 = Math.floor(b / 4), e = b % 4,
    f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d2 - g + 15) % 30,
    i2 = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i2 - h - k) % 7,
    m2 = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m2 + 114) / 31), da = ((h + l - 7 * m2 + 114) % 31) + 1;
  const easterSun = new Date(y, mo - 1, da);
  const key = dt => `${dt.getMonth() + 1}-${dt.getDate()}`;
  const gf = new Date(easterSun); gf.setDate(gf.getDate() - 2);   // Velký pátek
  const em = new Date(easterSun); em.setDate(em.getDate() + 1);   // Velikonoční pondělí
  return new Set(['1-1', '5-1', '5-8', '7-5', '7-6', '9-28', '10-28', '11-17', '12-24', '12-25', '12-26', key(gf), key(em)]);
}

function _renderKalWork(D, m, y) {
  const cfg = _workCfg();
  const firstDay = new Date(y, m, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = new Date();
  const todayD = today.getFullYear() === y && today.getMonth() === m ? today.getDate() : -1;
  const dayNames = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

  // Sumář za měsíc – S26 (v11.75): odpracováno BEZ přestávek (jako na výplatnici)
  const _hm = _workHodiny(cfg, y, m);
  const shifts = _hm.smen, hours = _hm.payH, vac = _hm.vacH, sick = _hm.nemoc, overtime = _hm.otH;
  // Zůstatek dovolené za CELÝ ROK – v hodinách
  //  S26 (v11.80): za měsíce, kde je VÝPLATNICE, se bere dovolená z pásky (pravda od mzdové účtárny);
  //  za ostatní měsíce z kalendáře. Dřív jen kalendář → bez zapsaných starších měsíců byl zůstatek moc vysoký.
  const _mesPasky = new Set((typeof vyplZaznamy === 'function' ? vyplZaznamy() : []).filter(z => String(z.m).startsWith(y + '-')).map(z => z.m));
  let vacYear = 0, vacKal = 0;
  Object.keys(cfg.days).forEach(k => { if (k.startsWith(`${y}-`) && cfg.days[k].type === 'dovolena' && !_mesPasky.has(k.slice(0, 7))) { const h = _workVacH(cfg.days[k], cfg); vacYear += h; vacKal += h; } });
  if (_mesPasky.size && typeof vyplHodinyZPasky === 'function')
    vyplZaznamy().filter(z => _mesPasky.has(z.m)).forEach(z => { vacYear += vyplHodinyZPasky(z).dovolenaH; });
  const vacLeft = cfg.vacQuotaH - vacYear;
  //  S26 (v11.80, Milan: „sledujeme i vyčerpanou dovolenou?“): kontrola proti výplatnicím – hodiny dovolené z pásek letos.
  const vacPasky = (() => { try {
    if (typeof vyplZaznamy !== 'function' || typeof vyplHodinyZPasky !== 'function') return null;
    const p = vyplZaznamy().filter(z => String(z.m).startsWith(y + '-')).sort((a, b) => a.m.localeCompare(b.m));
    if (!p.length) return null;
    const posl = p[p.length - 1].m;
    return { h: p.reduce((a, z) => a + vyplHodinyZPasky(z).dovolenaH, 0), do: ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'][(+posl.slice(5) || 1) - 1] };
  } catch (e) { return null; } })();
  const fmtH = v => String(Math.round(v * 10) / 10).replace('.', ',');
  const sal = _workSalary(cfg, y, m);

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
            <div style="font-size:.72rem;color:var(--text3);margin-bottom:4px">Hodin dovolené / rok</div>
            <input type="text" inputmode="decimal" id="workVacQuota" value="${fmtH(cfg.vacQuotaH)}" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px;color:var(--text)">
          </div>
        </div>
        <div style="font-size:.72rem;color:var(--text3);margin-bottom:6px">Pracovní dny (informativní)</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px">
          ${dayNames.map((n, i) => dayToggle(i, n)).join('')}
        </div>
        <!-- S17.5 (Milan): mzdová konfigurace pro výpočet hodinovky -->
        <!-- FIX-325 (S21, Milan): pole „Čistá výplata" plavalo. Popisek vedle něj
             se na mobilu zalomí do DVOU řádků, tenhle do jednoho – a protože se
             oba sloupce zarovnávaly nahoru, input vpravo visel výš.
             align-items:end srovná pole podle spodní hrany bez ohledu na to,
             kolik řádků popisek zabere. Pevná výška popisku by se rozbila při
             jiné velikosti písma nebo v jiném jazyce. -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;align-items:end">
          <div>
            <div style="font-size:.72rem;color:#a8aec8;margin-bottom:4px;line-height:1.35">Neplacená přestávka (min/den)</div>
            <input type="text" inputmode="numeric" id="workBreakMin" value="${cfg.breakMin}" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px;color:var(--text)">
          </div>
          <div>
            <div style="font-size:.72rem;color:#a8aec8;margin-bottom:4px;line-height:1.35">Čistá výplata za ${CZ_M[m].toLowerCase()} ${y} (Kč)</div>
            <input type="text" inputmode="numeric" id="workSalary" value="${sal.zadana ? sal.castka : ''}" placeholder="${sal.castka ? 'jako ' + (sal.odkud ? 'minule' : 'obvykle') + ': ' + sal.castka : 'např. 32000'}"
                   oninput="workPreviewSazba()"
                   style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px;color:var(--text)">
          </div>
        </div>
        <!-- FIX-326: hodinová sazba se dosud dala zjistit až po uložení a jen ve
             statistice měsíce. Ukazuje se rovnou pod polem a přepočítává se při psaní. -->
        <div id="workSazbaNahled" style="font-size:.72rem;color:#a8aec8;margin:-6px 0 12px;line-height:1.55"></div>
        <div style="font-size:.72rem;color:var(--text3);margin-bottom:6px">Příplatky (% navíc k základní sazbě)</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">
          <div><div style="font-size:.66rem;color:#a8aec8;margin-bottom:3px">⏱ Přesčas</div>
            <input type="text" inputmode="decimal" id="workBonusOT" value="${cfg.bonusOT}" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:7px;color:var(--text);text-align:center"></div>
          <div><div style="font-size:.66rem;color:#a8aec8;margin-bottom:3px">🌤 Víkend</div>
            <input type="text" inputmode="decimal" id="workBonusWe" value="${cfg.bonusWe}" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:7px;color:var(--text);text-align:center"></div>
          <div><div style="font-size:.66rem;color:#a8aec8;margin-bottom:3px">🎄 Svátek</div>
            <input type="text" inputmode="decimal" id="workBonusHol" value="${cfg.bonusHol}" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:7px;color:var(--text);text-align:center"></div>
          <div><div style="font-size:.66rem;color:#a8aec8;margin-bottom:3px">🌙 Noční</div>
            <input type="text" inputmode="decimal" id="workBonusNight" value="${cfg.bonusNight}" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:7px;color:var(--text);text-align:center"></div>
        </div>
        <button onclick="saveWorkSettings()" style="width:100%;padding:9px;border-radius:9px;border:none;background:#8b7cf6;color:#fff;font-weight:700;font-size:.84rem;cursor:pointer">Uložit nastavení</button>
      </div>
    </div>`;

  // Sumář
  const sc = (label, val, unit, color, pod) => `
    <div style="background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:10px;padding:11px;text-align:center">
      <div style="font-size:.7rem;color:var(--text3);margin-bottom:3px">${label}</div>
      <div style="font-size:1.15rem;font-weight:800;color:${color}">${val}<span style="font-size:.7rem;font-weight:600;color:var(--text3)"> ${unit}</span></div>
      ${pod ? `<div style="font-size:.62rem;color:#a8aec8;margin-top:2px;line-height:1.35">${pod}</div>` : ''}
    </div>`;
  const _pd = n => n === 1 ? 'přesčasová směna' : n < 5 ? 'přesčasové směny' : 'přesčasových směn';
  const summary = `
    <div class="card" style="margin-top:16px">
      <div class="card-header"><span class="card-title">📋 Sumář – ${CZ_M[m]} ${y}</span></div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
          ${sc('Směny', shifts, shifts === 1 ? 'směna' : shifts < 5 && shifts > 0 ? 'směny' : 'směn', '#4ade80', _hm.prescasDni ? `+ ${_hm.prescasDni} ${_pd(_hm.prescasDni)}` : '')}
          ${sc('Odpracováno', fmtH(hours), 'h', '#4ade80', overtime ? `z toho přesčas ${fmtH(overtime)} h` : '')}
          ${sc('Přesčasy', fmtH(overtime), 'h', overtime > 0 ? '#fbbf24' : 'var(--text3)', _hm.otGrossH > overtime ? `${fmtH(_hm.otGrossH)} h ve směně − přestávka` : '')}
          ${sc('Dovolená', fmtH(vac), 'h', '#60a5fa')}
          ${sc('Nemoc', sick, 'dní', sick > 0 ? '#fbbf24' : 'var(--text3)', sick ? 'náhrada od 4. dne, pak ČSSZ' : '')}
          ${sc('Paragraf', _hm.paragraf, 'dní', _hm.paragraf ? '#f472b6' : 'var(--text3)', _hm.paragraf ? `${fmtH(_hm.parH)} h · snižuje mzdu, dávku vyplácí ČSSZ` : 'snižuje mzdu · dávka od ČSSZ')}
          ${sc('Zůstatek dov.', fmtH(vacLeft), 'h', vacLeft < 0 ? '#f87171' : vacLeft <= 3 * (cfg.hpd || 8) ? '#fbbf24' : '#4ade80', `vyčerpáno ${fmtH(vacYear)} z ${fmtH(cfg.vacQuotaH)} h${vacPasky ? `<br>z pásek ${fmtH(vacPasky.h)} h (do ${vacPasky.do}) + kalendář ${fmtH(vacKal)} h` : ''}`)}
        </div>
        <div style="font-size:.72rem;color:#a8aec8;margin-top:10px;line-height:1.5">Odpracováno = hodiny směn bez neplacené přestávky (${fmtH(_hm.grossH)} h včetně přestávek). Zůstatek dovolené = ${fmtH(cfg.vacQuotaH)} h/rok − ${fmtH(vacYear)} h vyčerpaných v roce ${y}${_mesPasky.size ? ' (za měsíce s výplatnicí podle pásky, za ostatní podle kalendáře)' : ''} (den dovolené = ${fmtH(_workVacH(null, cfg))} h = směna ${fmtH(cfg.hpd)} h − přestávka, pokud u dne nezadáš jinak).</div>
      </div>
    </div>`;

  // ── S16 (TODO-165): Kopírování úseku směn ──
  const CP = window._workCopy || (window._workCopy = { on: false, start: null, end: null, opak: '' });
  const _dnum = (yy, mm, dd) => Math.round(new Date(yy, mm, dd).getTime() / 86400000);
  const selA = CP.start ? _dnum(CP.start.y, CP.start.m, CP.start.d) : null;
  const selB = CP.end ? _dnum(CP.end.y, CP.end.m, CP.end.d) : null;
  const copyBar = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">
      <button onclick="workCopyToggle()" style="padding:8px 12px;border-radius:9px;cursor:pointer;font-size:.78rem;font-weight:700;border:1px solid ${CP.on ? 'rgba(139,124,246,.5)' : 'var(--border)'};background:${CP.on ? 'rgba(139,124,246,.14)' : 'transparent'};color:${CP.on ? '#b9aefc' : 'var(--text3)'}">📋 Kopírovat úsek</button>
      ${CP.on ? `<span style="font-size:.74rem;color:#a8aec8;flex:1;min-width:160px">${!CP.start ? '1️⃣ Klikni na PRVNÍ den úseku' : !CP.end ? '2️⃣ Klikni na POSLEDNÍ den úseku' : `✅ Úsek ${CP.start.d}.${CP.start.m + 1}.–${CP.end.d}.${CP.end.m + 1}. (${selB - selA + 1} dní) → 3️⃣ klikni na den, od kterého se má úsek vložit (první prázdný)`}</span>` : ''}
      ${CP.on && CP.end ? `<label style="display:flex;align-items:center;gap:5px;font-size:.74rem;color:#a8aec8">🔁 <select onchange="window._workCopy.opak=this.value" style="background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:4px 6px;color:var(--text);font-size:.74rem">
        <option value="" ${!CP.opak ? 'selected' : ''}>vložit jednou</option><option value="mesic" ${CP.opak === 'mesic' ? 'selected' : ''}>opakovat do konce měsíce</option><option value="rok" ${CP.opak === 'rok' ? 'selected' : ''}>opakovat do konce roku</option></select></label>` : ''}
      ${!CP.on && window._workUndo ? `<button onclick="workCopyUndo()" style="padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:transparent;color:#fbbf24;font-size:.74rem;cursor:pointer">↩ Vrátit poslední vložení</button>` : ''}
      ${CP.on ? `<button onclick="workCopyCancel()" style="padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:transparent;color:#f87171;font-size:.74rem;cursor:pointer">✖ Zrušit</button>` : ''}
    </div>`;

  // S26 (v11.80): SIMULACE PŘESČASŮ (Milan: „kdybych v kalendáři nasimuloval 2 přesčasy a viděl, o kolik si polepším“)
  const SIM = window._workSim || (window._workSim = { on: false, days: {} });
  const simBar = _workSimBar(cfg, y, m);

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
    const simD = SIM.on ? (SIM.days || {})[_ck(y, m, d)] : null;
    grid += `
      <div onclick="${CP.on ? `workCopyClick(${d},${m},${y})` : SIM.on ? `workSimKlik(${d},${m},${y})` : `showWorkDay(${d},${m},${y})`}" style="min-height:64px;border-radius:8px;background:${inSel ? 'rgba(139,124,246,.10)' : simD ? 'rgba(225,29,72,.10)' : bg};border:1px ${simD ? 'dashed rgba(225,29,72,.75)' : 'solid ' + border};${selShadow}display:flex;flex-direction:column;padding:6px 7px;cursor:pointer;transition:transform .12s;position:relative"
        onmouseover="this.style.transform='scale(1.03)';this.style.zIndex='10'" onmouseout="this.style.transform='';this.style.zIndex=''">
        <span style="font-size:.78rem;font-weight:${isToday ? '800' : '600'};color:${isToday ? '#4ade80' : isWeekend ? 'rgba(248,113,113,.7)' : 'var(--text3)'}">${d}</span>
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px">
          ${simD ? `<div style="font-size:1rem;line-height:1">🧪</div><div style="font-size:.66rem;font-weight:700;color:#fb7185;white-space:nowrap">⏱${_SHIFTS[simD.shift] ? _SHIFTS[simD.shift].short + ' ' : ''}${simD.hours}h</div>` : ty ? ((wd.type === 'smena' || wd.type === 'prescas')
            ? `<div style="font-size:1rem;line-height:1">${(wd.shift && _SHIFTS[wd.shift]) ? _SHIFTS[wd.shift].icon : ty.icon}</div>
               <div style="font-size:.66rem;font-weight:700;color:${ty.color};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${wd.type==='prescas'?'⏱':''}${(wd.shift && _SHIFTS[wd.shift]) ? _SHIFTS[wd.shift].short + ' ' : ''}${wd.hours || cfg.hpd}h</div>`
            : `<div style="font-size:1rem;line-height:1">${ty.icon}</div><div style="font-size:.66rem;color:${ty.color}">${ty.label}</div>`) : ''}
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

  return settings + copyBar + simBar + grid + summary + _workWageCard(cfg, y, m, daysInMonth);
}

// ══════════════════════════════════════════════════════
//  S17.5 (Milan): HODINOVÁ MZDA – odpracováno − přestávky, zadaná čistá výplata,
//  příplatky víkend/svátek/noční/přesčas. Efektivní hodinovka = výplata ÷ placené hodiny.
//  Základní sazba = výplata ÷ vážené hodiny (hodiny s příplatky „váží" víc) – tj. sazba
//  za normální hodinu, když příplatky vysvětlují část výplaty.
// ══════════════════════════════════════════════════════
function _workWageCard(cfg, y, m, daysInMonth) {
  const hm = _workHodiny(cfg, y, m);
  const { grossH, payH, otH, weH, holH, nightH, vacH, weightedH } = hm, shiftDays = hm.smen + hm.prescasDni;
  const odhad = workOdhadVyplaty(cfg, y, m);
  //  S26 (v11.78): když jsou výplatnice, odhad se skládá z PÁSKY (tarif, PPÚ, příplatky) a hodin tohoto
  //  měsíce – ne ze sazby minulé výplaty, která v sobě nesla přesčasy (Milan: „33 500 mít rozhodně nebudu“).
  const odhadP = (typeof vyplOdhadMesice === 'function') ? vyplOdhadMesice(y, m) : null;
  //  S26 (v11.80, Milan: „myslel jsem, že řešíme výplatu V listopadu“): co přijde na účet V TOMTO měsíci = výplata
  //  za předchozí měsíc – z výplatnice, když už je, jinak odhad z kalendáře předchozího měsíce.
  const prijde = (() => { try {
    const pm = m === 0 ? 11 : m - 1, py = m === 0 ? y - 1 : y, pk = `${py}-${String(pm + 1).padStart(2, '0')}`;
    const pz = (typeof vyplZaznamy === 'function') ? vyplZaznamy().find(z => z.m === pk) : null;
    if (pz) return { castka: vyplDopocet(pz).dobirka, pasky: true, m: pm };
    const o = (typeof vyplOdhadMesice === 'function') ? vyplOdhadMesice(py, pm) : null;
    return o ? { castka: o.dobirka, pasky: false, m: pm } : null;
  } catch (e) { return null; } })();
  if (!shiftDays && !vacH) return '';
  const breakH = grossH - payH;
  const salInfo = _workSalary(cfg, y, m);
  //  S26 (v11.75): sazby jen z výplaty ZADANÉ pro tento měsíc (dřív se tiše brala minulá → sazba nesměla)
  const sal = (salInfo.zadana || !Object.keys(cfg.salaryM || {}).length) ? (salInfo.castka || 0) : 0;
  const effRate = (payH + vacH) > 0 ? sal / (payH + vacH) : 0;
  const baseRate = weightedH > 0 ? sal / weightedH : 0;
  const fmt1 = v => (Math.round(v * 10) / 10).toLocaleString('cs-CZ');
  const chip = (ico, lbl, hrs, pct) => hrs > 0 ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:8px;background:var(--surface3);font-size:.72rem;color:#c9cede">${ico} ${lbl}: <strong style="color:#e8eaf2">${fmt1(hrs)} h</strong> <span style="color:#fbbf24">+${pct} %</span></span>` : '';
  return `
    <div class="card" style="margin-top:14px">
      <div class="card-header">
        <span class="card-title">💰 Hodinová mzda – ${CZ_M[m]} ${y}</span>
        <span style="font-size:.7rem;color:#a8aec8">${hm.smen} směn${hm.prescasDni ? ` + ${hm.prescasDni} přesčas` : ''}${vacH ? ` · dovolená ${fmt1(vacH)} h` : ''}</span>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:12px">
          <div style="background:var(--surface2);border-radius:10px;padding:10px 12px">
            <div style="font-size:.68rem;color:#a8aec8">Odpracováno</div>
            <div style="font-family:Syne;font-size:1.1rem;font-weight:800;color:#e8eaf2">${fmt1(payH)} h</div>
            <div style="font-size:.66rem;color:#a8aec8">ve směnách ${fmt1(grossH)} h − přestávky ${fmt1(breakH)} h${vacH ? ` · + dovolená ${fmt1(vacH)} h = <strong style="color:#c9cede">${fmt1(payH + vacH)} h placených</strong>` : ''}</div>
          </div>
          <div style="background:var(--surface2);border-radius:10px;padding:10px 12px">
            <div style="font-size:.68rem;color:#a8aec8">Efektivní hodinovka</div>
            <div style="font-family:Syne;font-size:1.1rem;font-weight:800;color:${sal?'var(--income)':'var(--text3)'}">${sal ? fmt(Math.round(effRate)) + ' Kč/h' : '–'}</div>
            <div style="font-size:.66rem;color:#a8aec8">${sal ? 'výplata ÷ placené hodiny' + (vacH ? ' (vč. dovolené)' : '') : 'až zadáš výplatu za ' + CZ_M[m].toLowerCase()}</div>
          </div>
          <div style="background:var(--surface2);border-radius:10px;padding:10px 12px">
            <div style="font-size:.68rem;color:#a8aec8">Základní sazba (bez příplatků)</div>
            <div style="font-family:Syne;font-size:1.1rem;font-weight:800;color:${sal?'#60a5fa':'var(--text3)'}">${sal ? fmt(Math.round(baseRate)) + ' Kč/h' : '–'}</div>
            <div style="font-size:.66rem;color:#a8aec8">výplata ÷ vážené hodiny (${fmt1(weightedH)} h = ${fmt1(payH + vacH)} h${weH ? ` + víkend ${fmt1(weH)} × ${cfg.bonusWe} %` : ''}${holH ? ` + svátek ${fmt1(holH)} × ${cfg.bonusHol} %` : ''}${nightH ? ` + noční ${fmt1(nightH)} × ${cfg.bonusNight} %` : ''}${otH ? ` + přesčas ${fmt1(Math.min(otH, payH))} × ${cfg.bonusOT} %` : ''})</div>
          </div>
        </div>
        ${prijde ? `<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;padding:9px 12px;border-radius:10px;background:var(--surface2);margin-bottom:10px">
            <span style="font-size:.72rem;color:#a8aec8">📥 ${CZ_M[m]}: na účet přijde výplata za ${CZ_M[prijde.m].toLowerCase()}</span>
            <span style="font-family:Syne;font-size:1.05rem;font-weight:800;color:#e8eaf2">${prijde.pasky ? '' : '≈ '}${fmt(Math.round(prijde.castka))} Kč</span>
            <span style="font-size:.66rem;color:#a8aec8">${prijde.pasky ? 'podle výplatnice' : 'odhad z kalendáře'}</span></div>` : ''}
        ${odhadP ? _workOdhadZPaskyHTML(odhadP, m, y, fmt1) : odhad ? `<div style="background:rgba(74,222,128,.07);border:1px solid rgba(74,222,128,.28);border-radius:10px;padding:10px 12px;margin-bottom:12px">
          <div style="font-size:.7rem;color:#a8aec8">📈 Odhad čisté výplaty za ${CZ_M[m].toLowerCase()}</div>
          <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">
            <span style="font-family:Syne;font-size:1.25rem;font-weight:800;color:var(--income)">≈ ${fmt(odhad.castka)} Kč</span>
            ${sal ? `<span style="font-size:.74rem;color:#c9cede">skutečnost ${fmt(sal)} Kč <b style="color:${sal >= odhad.castka ? 'var(--income)' : 'var(--expense)'}">${sal >= odhad.castka ? '+' : '−'}${fmt(Math.abs(sal - odhad.castka))} Kč</b></span>` : ''}
          </div>
          <div style="font-size:.66rem;color:#a8aec8;line-height:1.5;margin-top:3px">základní sazba ${fmt(Math.round(odhad.sazba))} Kč/h (průměr z ${odhad.zdroj.map(z => CZ_M[z.m].toLowerCase()).join(', ')}) × ${fmt1(odhad.weightedH)} vážených h tohoto měsíce. Prémie, daň a srážky se mění, ber ± pár procent.</div>
        </div>` : (!sal ? `<div style="font-size:.7rem;color:#a8aec8;margin-bottom:10px">📈 Odhad výplaty se ukáže, až bude zadaná výplata aspoň za jeden z předchozích měsíců.</div>` : '')}
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${chip('⏱','Přesčas',otH,cfg.bonusOT)}
          ${chip('🌤','Víkend',weH,cfg.bonusWe)}
          ${chip('🎄','Svátek',holH,cfg.bonusHol)}
          ${chip('🌙','Noční',nightH,cfg.bonusNight)}
        </div>
        <div style="font-size:.7rem;color:#a8aec8;margin-top:10px;line-height:1.5">Svátky (vč. Velikonoc) se detekují automaticky – sváteční hodiny se nepočítají zároveň jako víkendové. Noční = směny označené 🌙. Příplatky uprav v Nastavení úvazku podle své smlouvy.</div>
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════
//  S26 (v11.80) · SIMULACE PŘESČASŮ V KALENDÁŘI
//  Milan: „kdybych v pracovním kalendáři mohl nasimulovat např. 2 přesčasy a viděl, o kolik si finančně polepším“.
//  Klepnutí na VOLNÝ den v režimu simulace: 1× denní přesčas, 2× noční, 3× zrušit. Simulované dny žijí jen
//  v paměti (window._workSim), do kalendáře ani do Firebase se nezapíšou. Výsledek = odhad výplaty se
//  simulací − bez ní (z pásky, když jsou výplatnice; jinak starší odhad z vážených hodin).
// ══════════════════════════════════════════════════════
function workSimToggle() {
  const S_ = window._workSim || (window._workSim = { on: false, days: {} });
  S_.on = !S_.on; if (!S_.on) S_.days = {};
  renderKalendar();
}
function workSimKlik(d, m, y) {
  const SIM = window._workSim; if (!SIM || !SIM.on) return;
  const k = _ck(y, m, d), cfg = _workCfg();
  const real = ((S.workCal || {}).days || {})[k];
  if (real && real.type !== 'volno') { if (typeof showToast === 'function') showToast('🧪 Simulovat jde jen na volný den'); return; }
  const cur = SIM.days[k];
  if (!cur) SIM.days[k] = { type: 'prescas', hours: cfg.hpd, shift: 'ranni', _sim: true };
  else if (cur.shift !== 'nocni') SIM.days[k] = Object.assign({}, cur, { shift: 'nocni' });
  else delete SIM.days[k];
  renderKalendar();
}
function workSimZrusit() { if (window._workSim) window._workSim.days = {}; renderKalendar(); }
window.workSimToggle = workSimToggle; window.workSimKlik = workSimKlik; window.workSimZrusit = workSimZrusit;

//  Odhad bez simulace a se simulací pro měsíc (y, m).
function workSimVysledek(y, m) {
  const SIM = window._workSim || {}, pref = `${y}-${String(m + 1).padStart(2, '0')}-`;
  const dny = Object.keys(SIM.days || {}).filter(k => k.startsWith(pref));
  if (!dny.length) return null;
  const cfg = _workCfg();
  const odhad = () => {
    if (typeof vyplOdhadMesice === 'function') { const o = vyplOdhadMesice(y, m); if (o) return { dobirka: o.v.dobirka, hruba: o.v.hruba, odvody: o.v.odvody, zdroj: 'paska' }; }
    const o = workOdhadVyplaty(cfg, y, m); return o ? { dobirka: o.castka, hruba: null, odvody: null, zdroj: 'sazba' } : null;
  };
  window._workSimAktivni = false; const bez = odhad(); const hB = _workHodiny(cfg, y, m);
  window._workSimAktivni = true;  let se = null, hS = null;
  try { se = odhad(); hS = _workHodiny(cfg, y, m); } finally { window._workSimAktivni = false; }
  if (!bez || !se) return { dny: dny.length, h: hS ? hS.otNetH - hB.otNetH : 0, bezOdhadu: true };
  const h = hS.otNetH - hB.otNetH;
  return { dny: dny.length, h, nocni: hS.nightH - hB.nightH, vikend: hS.weH - hB.weH, svatek: hS.holH - hB.holH,
           bez, se, navic: se.dobirka - bez.dobirka, hrubaNavic: se.hruba != null ? se.hruba - bez.hruba : null,
           odvodyNavic: se.odvody != null ? se.odvody - bez.odvody : null, zdroj: se.zdroj };
}
window.workSimVysledek = workSimVysledek;

function _workSimBar(cfg, y, m) {
  const SIM = window._workSim || { on: false, days: {} };
  const fmt1 = v => (Math.round(v * 10) / 10).toLocaleString('cs-CZ');
  const btn = `<button onclick="workSimToggle()" style="padding:8px 12px;border-radius:9px;cursor:pointer;font-size:.78rem;font-weight:700;border:1px solid ${SIM.on ? 'rgba(225,29,72,.6)' : 'var(--border)'};background:${SIM.on ? 'rgba(225,29,72,.12)' : 'transparent'};color:${SIM.on ? '#fb7185' : 'var(--text3)'}">🧪 ${SIM.on ? 'Ukončit simulaci' : 'Simulovat přesčasy'}</button>`;
  if (!SIM.on) return `<div style="margin-bottom:10px">${btn}</div>`;
  const r = workSimVysledek(y, m);
  let vys = `<span style="font-size:.74rem;color:#a8aec8;flex:1;min-width:180px">Klepni na volný den: 1× denní přesčas (${cfg.hpd} h), 2× noční, 3× zrušit. Nic se neukládá.</span>`;
  if (r && !r.bezOdhadu) vys = `<div style="flex:1 1 100%;padding:9px 11px;border-radius:9px;background:rgba(225,29,72,.08);border:1px solid rgba(225,29,72,.35);font-size:.76rem;color:#c9cede;line-height:1.55">
      🧪 <b style="color:#e8eaf2">+${r.dny} ${r.dny === 1 ? 'přesčasová směna' : r.dny < 5 ? 'přesčasové směny' : 'přesčasových směn'}</b> (${fmt1(r.h)} h${r.nocni ? `, z toho noční ${fmt1(r.nocni)} h` : ''}${r.vikend ? `, o víkendu ${fmt1(r.vikend)} h` : ''}${r.svatek ? `, ve svátek ${fmt1(r.svatek)} h` : ''})
      → na účet <b style="color:var(--income);font-size:.9rem">+${fmt(Math.round(r.navic))} Kč</b>
      ${r.hrubaNavic != null ? `<br><span style="color:#a8aec8">hrubého +${fmt(Math.round(r.hrubaNavic))} Kč, odvody z toho ${fmt(Math.round(r.odvodyNavic))} Kč · čistého ≈ ${fmt(Math.round(r.navic / (r.h || 1)))} Kč za hodinu · výplata ≈ ${fmt(Math.round(r.se.dobirka / 100) * 100)} Kč místo ${fmt(Math.round(r.bez.dobirka / 100) * 100)} Kč</span>` : ''}
    </div>`;
  else if (r && r.bezOdhadu) vys = `<span style="font-size:.74rem;color:#a8aec8;flex:1">🧪 ${r.dny}× přesčas (${fmt1(r.h)} h) – k výpočtu peněz chybí výplatnice nebo zadaná výplata z minulých měsíců.</span>`;
  return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">${btn}
    ${r ? `<button onclick="workSimZrusit()" style="padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:transparent;color:#f87171;font-size:.74rem;cursor:pointer">✖ Vyčistit</button>` : ''}${vys}</div>`;
}

//  S26 (v11.78): odhad výplaty z poslední výplatnice + hodin z kalendáře, s rozpisem po položkách.
function _workOdhadZPaskyHTML(o, m, y, fmt1) {
  const sk = o.skutecnost, mes = CZ_M[m].toLowerCase();
  const rozdil = sk ? sk.dobirka - o.v.dobirka : 0;
  const zdroj = o.zdroj ? CZ_M[(+o.zdroj.slice(5) || 1) - 1].toLowerCase() + ' ' + o.zdroj.slice(0, 4) : '';
  const radky = o.pol.map(p => `<tr><td style="white-space:normal">${p.label}</td><td>${p.hodin ? fmt1(p.hodin) : ''}</td><td>${p.sazba ? (Math.round(p.sazba * 100) / 100).toLocaleString('cs-CZ') : ''}</td><td><b>${fmt(p.kc)}</b></td></tr>`).join('');
  //  Styl tabulky je ve výplatnicovém CSS – v režimu Práce se jinak nenačte.
  return (typeof VYPL_CSS !== 'undefined' ? VYPL_CSS : '') + `<div style="background:rgba(74,222,128,.07);border:1px solid rgba(74,222,128,.28);border-radius:10px;padding:10px 12px;margin-bottom:12px">
    <div style="font-size:.7rem;color:#a8aec8">📈 Odhad výplaty ZA ${mes} (práce v tomto měsíci) – přijde ${o.vyplaceno}</div>
    <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">
      <span style="font-family:Syne;font-size:1.25rem;font-weight:800;color:var(--income)">≈ ${fmt(o.dobirka)} Kč</span>
      <span style="font-size:.74rem;color:#c9cede">na účet · čistá ≈ ${fmt(o.cisty)} · hrubá ≈ ${fmt(o.hruba)} Kč</span>
      ${sk ? `<span style="font-size:.74rem;color:#c9cede">výplatnice ${fmt(sk.dobirka)} Kč <b style="color:${rozdil >= 0 ? 'var(--income)' : 'var(--expense)'}">${rozdil >= 0 ? '+' : '−'}${fmt(Math.abs(Math.round(rozdil)))} Kč</b></span>` : ''}
    </div>
    <div style="font-size:.66rem;color:#a8aec8;line-height:1.5;margin-top:3px">Z výplatnice za ${zdroj} (tarif ${fmt(o.tarif)} Kč, PPÚ ${(Math.round(o.ppu * 100) / 100).toLocaleString('cs-CZ')} Kč/h, slevy na dani) a z hodin v tomto kalendáři:
      fond ${fmt1(o.fond)} h, odpracováno ${fmt1(o.odpr)} h${o.hm.otNetH ? `, z toho přesčas ${fmt1(o.hm.otNetH)} h` : ', bez přesčasu'}. Prémie a mobilita podle Kč na odpracovanou hodinu z posledních pásek – ber ± pár set korun.
      ${o.nemocH ? `<br>🤒 Nemoc ${fmt1(o.nemocH)} h: náhrada mzdy se neodhaduje (od 4. dne, z redukovaného průměru) – skutečnost bude o ni vyšší.` : ''}
      ${o.parH ? `<br>🩺 Paragraf ${fmt1(o.parH)} h: zaměstnavatel ho neplatí – mzda je nižší asi o ${fmt(o.parZtrata)} Kč hrubého. Dávku (např. ošetřovné) vyplácí ČSSZ zvlášť, na výplatnici ani v tomto odhadu není.` : ''}</div>
    <details style="margin-top:6px"><summary style="font-size:.7rem;color:#c9cede;cursor:pointer">Rozpis odhadu</summary>
      <div class="vg-tab" style="margin-top:6px"><table><thead><tr><th>Položka</th><th>h</th><th>Kč/h</th><th>Kč</th></tr></thead><tbody>${radky}
        <tr class="vg-souhrn"><td>Hrubá mzda</td><td></td><td></td><td>${fmt(o.v.hruba)}</td></tr>
        <tr><td style="white-space:normal">− zdravotní, sociální, daň</td><td></td><td></td><td>−${fmt(o.v.odvody)}</td></tr>
        <tr><td>− srážky (průměr)</td><td></td><td></td><td>−${fmt(o.v.srazky)}</td></tr>
        <tr class="vg-souhrn"><td>Na účet</td><td></td><td></td><td>${fmt(o.v.dobirka)}</td></tr></tbody></table></div></details>
  </div>`;
}

// ── S16 (TODO-165): Kopírování úseku směn ──
function workCopyToggle() {
  const CP = window._workCopy || (window._workCopy = {});
  if (CP.on) { workCopyCancel(); return; }
  window._workCopy = { on: true, start: null, end: null, opak: '' };
  renderKalendar();
}

function workCopyCancel() {
  window._workCopy = { on: false, start: null, end: null, opak: '' };
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
  //  S25 (Milan): opakovat do konce měsíce NEBO do konce roku (dřív jen měsíc)
  const konec = CP.opak === 'rok' ? new Date(y, 11, 31) : new Date(S.curYear, S.curMonth + 1, 0);
  const reps = CP.opak ? Math.max(1, Math.ceil((dnum(konec.getFullYear(), konec.getMonth(), konec.getDate()) - dnum(y, m, d) + 1) / len)) : 1;
  window._workUndo = { days: Object.assign({}, cfg.days) };   // ↩ Vrátit poslední vložení
  let written = 0;
  for (let r = 0; r < reps; r++) {
    for (let i = 0; i < len; i++) {
      const dt = new Date(tgt); dt.setDate(tgt.getDate() + r * len + i);
      if (CP.opak && dt > konec) break;
      const key = _ck(dt.getFullYear(), dt.getMonth(), dt.getDate());
      if (pattern[i]) { days[key] = Object.assign({}, pattern[i]); written++; }
      else delete days[key];
    }
  }
  _workSave({ days });  // S17.5: zachovává mzdovou konfiguraci
  window._workCopy = { on: false, start: null, end: null, opak: '' };
  renderKalendar();
  if (typeof showToast === 'function') showToast(`📋 Vzor vložen (${written} ${written === 1 ? 'den' : written < 5 ? 'dny' : 'dní'}) · nepovedlo se? ↩ Vrátit`);
}
//  S25: vrácení posledního vložení vzoru (celé, i opakované do konce roku)
function workCopyUndo() {
  const u = window._workUndo; if (!u) return;
  _workSave({ days: u.days });
  window._workUndo = null;
  renderKalendar();
  if (typeof showToast === 'function') showToast('↩ Vložení vráceno');
}
window.workCopyUndo = workCopyUndo;

function _toggleWorkday(i) {
  const cfg = _workCfg();
  const set = new Set(cfg.workdays);
  if (set.has(i)) set.delete(i); else set.add(i);
  _workSave({ workdays: [...set].sort((a, b) => a - b) });  // S17.5
  renderKalendar();
}

function saveWorkSettings() {
  const num=(id,dflt)=>{ const el=document.getElementById(id); if(!el) return dflt;
    const v=parseFloat(String(el.value).replace(',','.')); return isNaN(v)?dflt:v; };
  const hpd = num('workHpd',8) || 8;
  const vacQuotaH = Math.max(0, num('workVacQuota', _workCfg().vacQuotaH));
  //  S25: výplata se ukládá k zobrazenému MĚSÍCI; prázdné pole = beze změny (platí poslední zadaná)
  const cfg0 = _workCfg(); const salaryM = Object.assign({}, cfg0.salaryM);
  const kM = `${S.curYear}-${String(S.curMonth + 1).padStart(2, '0')}`;
  const salEl = document.getElementById('workSalary'); const salTxt = salEl ? String(salEl.value).trim() : '';
  if (salTxt) salaryM[kM] = Math.max(0, Math.round(num('workSalary', 0)));
  // S17.5 (Milan): mzdová konfigurace (přestávka, čistá výplata, příplatky %)
  _workSave({
    hpd, vacQuotaH, salaryM,
    breakMin: Math.max(0, Math.round(num('workBreakMin',30))),
    salary: salTxt ? Math.max(0, Math.round(num('workSalary',0))) : cfg0.salary,
    bonusOT: Math.max(0, num('workBonusOT',25)),
    bonusWe: Math.max(0, num('workBonusWe',10)),
    bonusHol: Math.max(0, num('workBonusHol',100)),
    bonusNight: Math.max(0, num('workBonusNight',10)),
  });
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
    <div id="workShiftRow" style="${(curType === 'smena' || curType === 'prescas') ? '' : 'display:none;'}margin-bottom:14px">
      <div style="font-size:.78rem;color:var(--text3);margin-bottom:4px">Typ směny</div>
      <div style="display:flex;gap:6px">
        ${Object.keys(_SHIFTS).map(shiftBtn).join('')}
      </div>
    </div>
    <div id="workHoursRow" style="${(curType === 'smena' || curType === 'prescas') ? '' : 'display:none;'}margin-bottom:14px">
      <div style="font-size:.78rem;color:var(--text3);margin-bottom:4px">${curType==='prescas' ? 'Odpracované hodiny <span style="color:#fbbf24">(celé jako přesčas – práce mimo směnu)</span>' : `Odpracované hodiny <span style="color:#a8aec8">(směna ${cfg.hpd} h + přesčas = celkem)</span>`}</div>
      <input type="text" inputmode="decimal" id="workDayHours" value="${curHours}"
        oninput="(function(el){var v=parseFloat(String(el.value).replace(',','.'));var h=document.getElementById('workOtHint');if(!h)return;var ot=isNaN(v)?0:Math.max(0,v-${cfg.hpd});h.textContent=ot>0?('⏱ z toho přesčas: '+(ot%1?ot.toFixed(1):ot)+' h'):'';h.style.display=ot>0?'block':'none';})(this)"
        style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px;color:var(--text);font-size:.9rem">
      <div id="workOtHint" style="display:${curHours>cfg.hpd?'block':'none'};font-size:.72rem;color:#fbbf24;margin-top:4px">⏱ z toho přesčas: ${(curHours-cfg.hpd)%1?(curHours-cfg.hpd).toFixed(1):(curHours-cfg.hpd)} h</div>
      <!-- S17.6 (Milan): přesčas nebyl vidět – rychlá tlačítka místo hledání, jak ho zadat -->
      ${curType==='prescas' ? '' : `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
        <span style="font-size:.72rem;color:#a8aec8;align-self:center">Rychle:</span>
        <button type="button" onclick="_setWorkHours(${cfg.hpd})" style="padding:5px 10px;border-radius:8px;border:1px solid var(--border);background:transparent;color:#c9cede;font-size:.74rem;cursor:pointer">Bez přesčasu (${cfg.hpd} h)</button>
        <button type="button" onclick="_setWorkHours(${cfg.hpd}+1)" style="padding:5px 10px;border-radius:8px;border:1px solid rgba(251,191,36,.4);background:rgba(251,191,36,.08);color:#fbbf24;font-size:.74rem;cursor:pointer">+1 h přesčas</button>
        <button type="button" onclick="_setWorkHours(${cfg.hpd}+2)" style="padding:5px 10px;border-radius:8px;border:1px solid rgba(251,191,36,.4);background:rgba(251,191,36,.08);color:#fbbf24;font-size:.74rem;cursor:pointer">+2 h</button>
        <button type="button" onclick="_setWorkHours(${cfg.hpd}+4)" style="padding:5px 10px;border-radius:8px;border:1px solid rgba(251,191,36,.4);background:rgba(251,191,36,.08);color:#fbbf24;font-size:.74rem;cursor:pointer">+4 h</button>
      </div>`}
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
  const hasHours = isShift || id === 'prescas';  // S17.7: přesčas má taky hodiny
  document.getElementById('workHoursRow').style.display = hasHours ? '' : 'none';
  const sr = document.getElementById('workShiftRow'); if (sr) sr.style.display = hasHours ? '' : 'none';  // S17.10: i přesčas má směnu (ranní vs noční = jiné příplatky)
  document.querySelectorAll('[data-wtype]').forEach(b => {
    const t = _WORK_TYPES[b.getAttribute('data-wtype')];
    const on = b.getAttribute('data-wtype') === id;
    b.style.border = `1px solid ${on ? t.border : 'var(--border)'}`;
    b.style.background = on ? t.bg : 'transparent';
    b.style.color = on ? t.color : 'var(--text3)';
  });
}

// S17.6 (Milan): rychlé nastavení hodin z tlačítek přesčasu + aktualizace hintu
function _setWorkHours(h) {
  const el = document.getElementById('workDayHours'); if (!el) return;
  el.value = (h % 1) ? h.toFixed(1) : h;
  el.dispatchEvent(new Event('input'));
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
  if (type === 'smena' || type === 'prescas') {
    // S17.5 (FIX-209): desetinná ČÁRKA (mobil) dala NaN → tichý fallback na hpd → přesčas se „nedal nastavit"
    const hv = parseFloat(String(document.getElementById('workDayHours').value).replace(',', '.'));
    entry.hours = (!isNaN(hv) && hv > 0) ? hv : cfg.hpd;
    const sh = document.getElementById('workSelShift').value;
    if (sh) entry.shift = sh;
  }
  days[_ck(y, m, d)] = entry;
  _workSave({ days });  // S17.5: zachovává mzdovou konfiguraci
  if (typeof closeModal === 'function') closeModal('modalKalendarDay');
  renderKalendar();
  if (typeof showToast === 'function') showToast('💼 Uloženo');
}

function clearWorkDay(y, m, d) {
  const cfg = _workCfg();
  const days = cfg.days || {};
  delete days[_ck(y, m, d)];
  _workSave({ days });  // S17.5: zachovává mzdovou konfiguraci
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
