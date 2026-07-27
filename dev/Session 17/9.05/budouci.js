// FinanceFlow · v9.05 · budouci.js · 2026-07-20
// ══════════════════════════════════════════════════════
//  BUDOUCÍ PLATBY – FinanceFlow v6.50
//  TODO-058 · Zdroje: šablony + narozeniny + cíle + dluhy
// ══════════════════════════════════════════════════════

const BUDOUCI_HORIZON_DAYS = 90; // výchozí horizont zobrazení

let _budouciHorizon = 90; // 30 | 60 | 90 | 180 | 365

// ── Generuj budoucí platby ze všech zdrojů ──
function budouciGetAll(D, horizonDays) {
  D = D || getData();
  const today   = new Date(); today.setHours(0,0,0,0);
  const horizon = new Date(today.getTime() + horizonDays * 86400000);
  const items   = [];

  // ── 1. OPAKOVANÉ ŠABLONY ──
  (D.sablony || []).forEach(s => {
    if (s.type === 'income') return; // jen výdaje + převody
    if (s.endDate && new Date(s.endDate) < today) return;

    const freq = s.freq || 'monthly';
    const den  = s.den  || 1;
    const occurrences = budouciGetOccurrences(freq, den, today, horizon);

    const isTransfer = s.type === 'transfer';
    // S12.1l: u přesunu doplň cílovou peněženku do popisku „→ Spoření"
    let walletToName = '';
    if(isTransfer && s.walletTo){
      const w = (D.wallets||[]).find(x=>x.id===s.walletTo);
      walletToName = w ? (w.icon? w.icon+' ':'')+w.name : '';
    }
    occurrences.forEach(date => {
      items.push({
        id:       `sablona-${s.id}-${date.toISOString().slice(0,10)}`,
        source:   'sablona',
        icon:     isTransfer ? '↔️' : '🔄',
        name:     s.name,
        amount:   s.amount || 0,
        date:     date,
        dateStr:  date.toISOString().slice(0,10),
        note:     isTransfer
                    ? (walletToName ? '→ '+walletToName : 'přesun') + ' · ' + (FREQ_LABELS[freq]||freq)
                    : (FREQ_LABELS[freq] || freq),
        color:    isTransfer ? 'var(--bank)' : 'var(--expense)',
        isTransfer: isTransfer,
        catId:    s.catId,
        auto:     s.auto,
      });
    });
  });

  // ── 2. NAROZENINY (letošní + příští rok pokud v horizontu) ──
  (D.birthdays || []).forEach(b => {
    if (!b.month || !b.day) return;
    [today.getFullYear(), today.getFullYear() + 1].forEach(year => {
      const date = new Date(year, b.month - 1, b.day);
      date.setHours(0,0,0,0);
      if (date >= today && date <= horizon) {
        const daysTo = Math.round((date - today) / 86400000);
        items.push({
          id:      `bday-${b.id}-${year}`,
          source:  'bday',
          icon:    '🎂',
          name:    `Narozeniny – ${b.name}`,
          amount:  b.gift || 0,
          date,
          dateStr: date.toISOString().slice(0,10),
          note:    daysTo === 0 ? '🎉 Dnes!' : `za ${daysTo} dní`,
          color:   'var(--bank)',
          bdayId:  b.id,
        });
      }
    });
  });

  // ── 3. FINANČNÍ CÍLE – měsíční vklady ──
  (D.wishes || []).filter(w => w.isGoal && w.monthlyTarget > 0).forEach(goal => {
    // Generuj budoucí měsíční vklady do deadlinu nebo horizontu
    const deadlineDate = goal.deadline ? new Date(goal.deadline) : null;
    const goalEnd = deadlineDate && deadlineDate < horizon ? deadlineDate : horizon;

    let cur = new Date(today.getFullYear(), today.getMonth() + 1, 1); // začni od příštího 1.
    while (cur <= goalEnd) {
      items.push({
        id:      `goal-${goal.id}-${cur.toISOString().slice(0,10)}`,
        source:  'goal',
        icon:    goal.icon || '🎯',
        name:    `Spoření – ${goal.name}`,
        amount:  goal.monthlyTarget,
        date:    new Date(cur),
        dateStr: cur.toISOString().slice(0,10),
        note:    deadlineDate ? `deadline ${fmtD(goal.deadline)}` : 'měsíční vklad',
        color:   'var(--income)',
        goalId:  goal.id,
      });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  });

  // ── 4. SPLÁTKY DLUHŮ ──
  (D.debts || []).forEach(debt => {
    if (!debt.remaining || debt.remaining <= 0) return;
    const payment = debt.payment || 0;
    if (!payment) return;

    // Projdi schedule nebo generuj měsíčně
    if (debt.schedule && debt.schedule.length) {
      debt.schedule.forEach(sch => {
        if (sch.paid) return;
        const date = new Date(sch.date); date.setHours(0,0,0,0);
        if (date >= today && date <= horizon) {
          items.push({
            id:     `debt-${debt.id}-${sch.date}`,
            source: 'debt',
            icon:   '🏦',
            name:   `Splátka – ${debt.name}`,
            amount: sch.payment || payment,
            date,
            dateStr: date.toISOString().slice(0,10),
            note:   debt.creditor || '',
            color:  'var(--expense)',
            debtId: debt.id,
          });
        }
      });
    } else {
      // Fallback: generuj měsíčně od příštího měsíce
      const freq = debt.freq || 'monthly';
      const den  = 1;
      budouciGetOccurrences(freq, den, today, horizon).forEach(date => {
        items.push({
          id:     `debt-${debt.id}-${date.toISOString().slice(0,10)}`,
          source: 'debt',
          icon:   '🏦',
          name:   `Splátka – ${debt.name}`,
          amount: payment,
          date,
          dateStr: date.toISOString().slice(0,10),
          note:   debt.creditor || '',
          color:  'var(--expense)',
          debtId: debt.id,
        });
      });
    }
  });

  // Seřadit dle data
  items.sort((a, b) => a.date - b.date);
  return items;
}

// Generuje data výskytu pravidelné platby v horizontu
function budouciGetOccurrences(freq, den, from, to) {
  const dates = [];
  const today = new Date(from); today.setHours(0,0,0,0);

  if (freq === 'weekly') {
    let cur = new Date(today.getTime() + 7 * 86400000);
    while (cur <= to) { dates.push(new Date(cur)); cur = new Date(cur.getTime() + 7 * 86400000); }
  } else if (freq === 'biweekly') {
    let cur = new Date(today.getTime() + 14 * 86400000);
    while (cur <= to) { dates.push(new Date(cur)); cur = new Date(cur.getTime() + 14 * 86400000); }
  } else if (freq === 'monthly') {
    let m = today.getMonth() + 1, y = today.getFullYear();
    // Pokud je den v tomto měsíci ještě před námi nebo dnes = zahrň
    const thisMonthDate = new Date(y, m - 1, den); thisMonthDate.setHours(0,0,0,0);
    if (thisMonthDate > today) { m = today.getMonth(); y = today.getFullYear(); }
    for (let i = 0; i < 24; i++) {
      if (++m > 11) { m = 0; y++; }
      const d = new Date(y, m, den); d.setHours(0,0,0,0);
      if (d > to) break;
      if (d > today) dates.push(d);
    }
  } else if (freq === 'quarterly') {
    let cur = new Date(today.getFullYear(), today.getMonth() + 3, den);
    while (cur <= to) {
      if (cur > today) dates.push(new Date(cur));
      cur = new Date(cur.getFullYear(), cur.getMonth() + 3, den);
    }
  } else if (freq === 'yearly') {
    let cur = new Date(today.getFullYear(), today.getMonth(), den);
    cur.setFullYear(cur.getFullYear() + 1);
    while (cur <= to) {
      if (cur > today) dates.push(new Date(cur));
      cur = new Date(cur.getFullYear() + 1, cur.getMonth(), cur.getDate());
    }
  }
  return dates;
}

// ══════════════════════════════════════════════════════
//  RENDER
// ══════════════════════════════════════════════════════
function renderBudouci() {
  const el = document.getElementById('budouciContent'); if (!el) return;
  const D    = getData();
  const items = budouciGetAll(D, _budouciHorizon);

  // Součty dle zdroje
  const totalExp   = items.filter(i => i.source !== 'goal').reduce((s, i) => s + i.amount, 0);
  const totalGoals = items.filter(i => i.source === 'goal').reduce((s, i) => s + i.amount, 0);
  const totalAll   = totalExp + totalGoals;

  // Skupiny dle týdnů/měsíců
  const groups = budouciGroupByMonth(items);

  const horizonBtns = [
    { days: 30,  label: '30 dní' },
    { days: 60,  label: '60 dní' },
    { days: 90,  label: '3 měs.' },
    { days: 180, label: '6 měs.' },
    { days: 365, label: '1 rok'  },
  ];

  el.innerHTML = `
    <!-- Přepínač horizontu -->
    <div style="display:flex;gap:4px;margin-bottom:16px;background:var(--surface2);border-radius:12px;padding:4px;border:1px solid var(--border)">
      ${horizonBtns.map(b => `
        <button onclick="budouciSetHorizon(${b.days})"
          style="flex:1;padding:8px 0;border:none;border-radius:9px;font-size:.76rem;font-weight:${_budouciHorizon===b.days?'700':'500'};cursor:pointer;transition:all .15s;
            background:${_budouciHorizon===b.days?'var(--surface)':'transparent'};
            color:${_budouciHorizon===b.days?'var(--text)':'var(--text3)'};
            box-shadow:${_budouciHorizon===b.days?'0 1px 4px rgba(0,0,0,.18)':'none'}">
          ${b.label}
        </button>`).join('')}
    </div>

    <!-- Souhrnné karty -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
      <div style="background:var(--surface2);border-radius:12px;padding:12px;text-align:center;border:1px solid var(--border)">
        <div style="font-size:1.1rem;font-weight:800;font-family:Syne,sans-serif;color:var(--expense)">${fmtB(totalExp)}</div>
        <div style="font-size:.7rem;color:var(--text3)">Výdaje & splátky</div>
      </div>
      <div style="background:var(--surface2);border-radius:12px;padding:12px;text-align:center;border:1px solid var(--border)">
        <div style="font-size:1.1rem;font-weight:800;font-family:Syne,sans-serif;color:var(--income)">${fmtB(totalGoals)}</div>
        <div style="font-size:.7rem;color:var(--text3)">Plánované spoření</div>
      </div>
      <div style="background:var(--surface2);border-radius:12px;padding:12px;text-align:center;border:1px solid var(--border)">
        <div style="font-size:1.1rem;font-weight:800;font-family:Syne,sans-serif">${items.length}</div>
        <div style="font-size:.7rem;color:var(--text3)">Událostí celkem</div>
      </div>
    </div>

    <!-- Legenda zdrojů -->
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;font-size:.74rem">
      <span>🔄 Šablony</span>
      <span>🎂 Narozeniny</span>
      <span>🎯 Cíle</span>
      <span>🏦 Splátky</span>
    </div>

    <!-- Timeline skupiny dle měsíce -->
    ${!items.length
      ? `<div class="empty" style="padding:36px">
          <div class="ei">📭</div>
          <div class="et">Žádné plánované platby</div>
          <div style="font-size:.78rem;color:var(--text3);margin-top:6px">Přidej opakované šablony, narozeniny nebo finanční cíle</div>
         </div>`
      : groups.map(g => budouciRenderGroup(g)).join('')}
  `;
}

function budouciSetHorizon(days) {
  _budouciHorizon = days;
  renderBudouci();
}

// Seskupení položek po měsících
function budouciGroupByMonth(items) {
  const map = {};
  items.forEach(item => {
    const key = item.dateStr.slice(0, 7); // YYYY-MM
    if (!map[key]) map[key] = { key, label: budouciMonthLabel(item.date), items: [], total: 0 };
    map[key].items.push(item);
    map[key].total += item.amount;
  });
  return Object.values(map);
}

function budouciMonthLabel(date) {
  const now = new Date(); now.setHours(0,0,0,0);
  const thisM = now.getMonth(), thisY = now.getFullYear();
  const m = date.getMonth(), y = date.getFullYear();
  if (y === thisY && m === thisM) return `${CZ_M[m]} ${y} · tento měsíc`;
  if (y === thisY && m === thisM + 1) return `${CZ_M[m]} ${y} · příští měsíc`;
  return `${CZ_M[m]} ${y}`;
}

function budouciRenderGroup(group) {
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today.getTime() + 86400000);
  const week = new Date(today.getTime() + 7 * 86400000);

  const rows = group.items.map(item => {
    const daysTo = Math.round((item.date - today) / 86400000);
    const isToday = daysTo === 0;
    const isSoon  = daysTo <= 7;

    let urgencyStyle = '';
    if (isToday)     urgencyStyle = 'border-left:3px solid var(--income);background:rgba(74,222,128,.04);';
    else if (isSoon) urgencyStyle = 'border-left:3px solid var(--debt);';

    const daysLabel = isToday ? '<span style="color:var(--income);font-weight:700">Dnes</span>'
      : daysTo === 1 ? '<span style="color:var(--debt);font-weight:600">Zítra</span>'
      : daysTo <= 7  ? `<span style="color:var(--debt);font-size:.72rem">za ${daysTo} dní</span>`
      : `<span style="font-size:.72rem;color:var(--text3)">${new Date(item.date).toLocaleDateString('cs-CZ',{day:'numeric',month:'short'})}</span>`;

    const sourceLink = item.source === 'sablona' ? `onclick="showPage('sablony')"` :
                       item.source === 'bday'    ? `onclick="showPage('narozeniny')"` :
                       item.source === 'goal'    ? `onclick="showPage('narozeniny')"` :
                       item.source === 'debt'    ? `onclick="showPage('dluhy')"` : '';

    return `
      <div class="tx-table-row" style="${urgencyStyle}padding:11px 14px;margin-bottom:6px;border-radius:10px;cursor:${sourceLink?'pointer':''}" ${sourceLink}>
        <div style="font-size:1.3rem;flex-shrink:0;margin-right:2px">${item.icon}</div>
        <div style="flex:1;min-width:0;margin-left:10px">
          <div style="font-weight:600;font-size:.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.name}</div>
          <div style="font-size:.74rem;color:var(--text3);margin-top:2px;display:flex;align-items:center;gap:8px">
            ${daysLabel}
            ${item.note ? `<span>· ${item.note}</span>` : ''}
            ${item.auto === false ? `<span style="color:var(--text3)">· manuální</span>` : ''}
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:10px">
          ${item.amount > 0
            ? `<div style="font-weight:700;font-size:.92rem;color:${item.color}">${item.isTransfer ? '↔ ' : (item.source === 'goal' ? '+' : '−')}${fmtB(item.amount)}</div>`
            : `<div style="font-size:.8rem;color:var(--text3)">bez odhadu</div>`}
          <div style="font-size:.68rem;color:var(--text3);text-transform:uppercase;letter-spacing:.04em">${budouciSourceLabel(item.source)}</div>
        </div>
        ${(item.amount > 0 && item.source !== 'goal' && item.source !== 'bday') ? `
        <button type="button" onclick="event.stopPropagation();budouciMarkPaid('${encodeURIComponent(item.name)}',${item.amount},${item.isTransfer?1:0},'${item.date.toISOString().slice(0,10)}')"
          title="Zapsat jako transakci – otevře formulář s předvyplněnými údaji"
          style="flex-shrink:0;margin-left:8px;padding:6px 11px;border-radius:8px;border:1px solid rgba(74,222,128,.4);background:rgba(74,222,128,.08);color:var(--income);font-size:.74rem;font-weight:700;cursor:pointer;white-space:nowrap">✓ Zaplaceno</button>` : ''}
      </div>`;
  }).join('');

  const monthTotal = group.items.filter(i => i.source !== 'goal').reduce((s,i)=>s+i.amount,0);
  const monthGoals = group.items.filter(i => i.source === 'goal').reduce((s,i)=>s+i.amount,0);

  return `
    <div style="margin-bottom:20px">
      <!-- Hlavička měsíce -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding:0 2px">
        <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3)">${group.label}</div>
        <div style="font-size:.76rem;color:var(--text2);display:flex;gap:10px">
          ${monthTotal > 0 ? `<span style="color:var(--expense)">−${fmtB(monthTotal)}</span>` : ''}
          ${monthGoals > 0 ? `<span style="color:var(--income)">+${fmtB(monthGoals)}</span>` : ''}
        </div>
      </div>
      ${rows}
    </div>`;
}

// S17.6 (Milan): budoucí platby jsou dnes jen PROJEKCE (nic se nezapisuje po dosažení data).
// „✓ Zaplaceno" = poloautomat: otevře standardní modal transakce s předvyplněnou částkou,
// názvem, datem a typem (výdaj/přesun) – uživatel jen potvrdí. Žádný tichý zápis na pozadí.
// Plná automatizace (auto-materializace v den splatnosti) je zapsaná jako TODO-190.
function budouciMarkPaid(nameEnc, amount, isTransfer, dateStr) {
  if (typeof viewingUid !== 'undefined' && viewingUid) return;
  const name = decodeURIComponent(nameEnc);
  if (typeof openAddTx !== 'function') { if(typeof showToast==='function') showToast('Nelze otevřít formulář'); return; }
  openAddTx();
  setTimeout(() => {
    try {
      if (isTransfer && typeof setTxType === 'function') setTxType('transfer');
      else if (typeof setTxType === 'function') setTxType('expense');
      const nm = document.getElementById('txName'); if (nm) nm.value = name;
      const am = document.getElementById('txAmt'); if (am) am.value = amount;
      const dt = document.getElementById('txDate'); if (dt && dateStr) dt.value = dateStr;
      if (typeof updateTxCzkField === 'function') updateTxCzkField();
      if (typeof updateTxConverter === 'function') updateTxConverter();
    } catch(e) {}
  }, 120);
  if (typeof showToast === 'function') showToast('📝 Zkontroluj a ulož transakci');
}

function budouciSourceLabel(source) {
  return source === 'sablona' ? 'šablona' :
         source === 'bday'    ? 'narozeniny' :
         source === 'goal'    ? 'spoření' :
         source === 'debt'    ? 'splátka' : source;
}
