// ══════════════════════════════════════════════════════
//  NÁKUPNÍ SEZNAM + HLÍDAČ CEN + PLÁNY A CÍLE – FinanceFlow v6.49
// ══════════════════════════════════════════════════════
// TODO-056 · Přání a nákupy – rozšíření o Plány a cíle (Session 7.1)

// ── State ──
let _nakupItems    = [];          // uživatelův nákupní seznam (z S.nakupList)
let _nakupCatalog  = [];          // komunity katalog (z Firebase catalog/items + catalog/prices)
let _nakupFilter   = 'all';       // 'all' | 'active' | 'alert'
let _nakupCatalogCache = {};      // key → {name, prices:[{date,price,store}]}
let _nakupTab      = 'seznam';    // 'seznam' | 'cile'
let _goalDeposits  = {};          // goalId → [{ id, amount, date, note }]

// ── Normalizace názvu produktu (stejná logika jako receipts.js) ──
function nakupNormKey(name) {
  return (name||'').toLowerCase()
    .replace(/\d+\s*(g|kg|ml|l|ks|cm|mm)\b/g, '')
    .replace(/[^a-z0-9áčďéěíňóřšťúůýž\s]/g, '')
    .replace(/\s+/g, '_')
    .trim()
    .slice(0, 40);
}

// ══════════════════════════════════════════════════════
//  NAČTENÍ DAT
// ══════════════════════════════════════════════════════
async function nakupLoadCatalog() {
  try {
    const snap = await _get(_ref(_db, 'catalog/items'));
    if (snap.exists()) {
      const raw = snap.val();
      _nakupCatalog = Object.entries(raw).map(([key, val]) => ({
        key,
        name: typeof val === 'string' ? val : (val.name || key),
        latestPrice: val.latestPrice || null,
        latestDate:  val.latestDate  || null,
        latestStore: val.latestStore || null,
        priceMin:    val.priceMin    || null,
        priceMax:    val.priceMax    || null,
        priceCount:  val.priceCount  || 0,
      })).filter(c => c.name && c.name.length >= 2)
        .sort((a,b) => a.name.localeCompare(b.name, 'cs'));
    }
  } catch(e) { console.log('nakupLoadCatalog error', e); }
}

async function nakupLoadPriceHistory(key) {
  if (_nakupCatalogCache[key]) return _nakupCatalogCache[key];
  try {
    const snap = await _get(_ref(_db, 'catalog/prices/' + key));
    const prices = snap.exists() ? Object.values(snap.val()) : [];
    prices.sort((a,b) => a.date.localeCompare(b.date));
    _nakupCatalogCache[key] = prices;
    return prices;
  } catch(e) { return []; }
}

// ── Načtení vkladů pro cíle z Firebase ──
async function goalLoadDeposits(goalId) {
  if (!window._currentUser) return [];
  if (_goalDeposits[goalId]) return _goalDeposits[goalId];
  try {
    const uid = window._currentUser.uid;
    const snap = await _get(_ref(_db, `users/${uid}/goal_deposits`));
    if (snap.exists()) {
      const all = snap.val();
      // Indexuj per goalId
      Object.values(all).forEach(dep => {
        if (!_goalDeposits[dep.goalId]) _goalDeposits[dep.goalId] = [];
        if (!_goalDeposits[dep.goalId].find(d => d.id === dep.id)) {
          _goalDeposits[dep.goalId].push(dep);
        }
      });
    }
    return _goalDeposits[goalId] || [];
  } catch(e) { console.log('goalLoadDeposits error', e); return []; }
}

async function goalLoadAllDeposits() {
  if (!window._currentUser) return;
  _goalDeposits = {};
  try {
    const uid = window._currentUser.uid;
    const snap = await _get(_ref(_db, `users/${uid}/goal_deposits`));
    if (snap.exists()) {
      Object.values(snap.val()).forEach(dep => {
        if (!_goalDeposits[dep.goalId]) _goalDeposits[dep.goalId] = [];
        _goalDeposits[dep.goalId].push(dep);
      });
    }
  } catch(e) { console.log('goalLoadAllDeposits error', e); }
}

// ══════════════════════════════════════════════════════
//  HLAVNÍ RENDER – záložky: Nákupní seznam | Plány a cíle
// ══════════════════════════════════════════════════════
async function renderNakup() {
  if(typeof gateFeature==='function' && !canUseFeature('shoppingList')){ const el=document.getElementById('page-nakup')||document.querySelector('#nakupContent'); if(el && typeof showPaywall==='function'){ showPaywall(); } if(el){ el.innerHTML='<div class="empty" style="padding:40px"><div class="ei">🔒</div><div class="et">Nákupní seznam je součástí Premium</div><div style="margin-top:12px"><button class="btn btn-accent btn-sm" onclick="showPaywall&&showPaywall()">Zobrazit tarify</button></div></div>'; } return; }
  const el = document.getElementById('nakupContent'); if (!el) return;

  el.innerHTML = `
    <!-- Záložky -->
    <div class="nakup-tabs" style="display:flex;gap:0;margin-bottom:18px;background:var(--surface2);border-radius:12px;padding:4px;border:1px solid var(--border)">
      <button id="nakupTabSeznam" class="nakup-tab ${_nakupTab==='seznam'?'active':''}"
        onclick="nakupSwitchTab('seznam')" style="flex:1;padding:9px 0;border:none;border-radius:9px;font-size:.84rem;font-weight:600;cursor:pointer;transition:all .15s;background:${_nakupTab==='seznam'?'var(--surface)':'transparent'};color:${_nakupTab==='seznam'?'var(--text)':'var(--text3)'};box-shadow:${_nakupTab==='seznam'?'0 1px 4px rgba(0,0,0,.18)':'none'}">
        🛒 Nákupní seznam
      </button>
      <button id="nakupTabCile" class="nakup-tab ${_nakupTab==='cile'?'active':''}"
        onclick="nakupSwitchTab('cile')" style="flex:1;padding:9px 0;border:none;border-radius:9px;font-size:.84rem;font-weight:600;cursor:pointer;transition:all .15s;background:${_nakupTab==='cile'?'var(--surface)':'transparent'};color:${_nakupTab==='cile'?'var(--text)':'var(--text3)'};box-shadow:${_nakupTab==='cile'?'0 1px 4px rgba(0,0,0,.18)':'none'}">
        🎯 Plány a cíle
      </button>
    </div>
    <div id="nakupTabContent">
      <div class="empty"><div class="ei">⏳</div><div class="et">Načítám...</div></div>
    </div>
  `;

  if (_nakupTab === 'seznam') {
    await renderNakupSeznam();
  } else {
    await renderNakupCile();
  }
}

function nakupSwitchTab(tab) {
  _nakupTab = tab;
  renderNakup();
}

// ══════════════════════════════════════════════════════
//  ZÁLOŽKA 1: NÁKUPNÍ SEZNAM (původní logika)
// ══════════════════════════════════════════════════════
async function renderNakupSeznam() {
  const D = getData();
  _nakupItems = D.nakupList || [];
  if (!_nakupCatalog.length) await nakupLoadCatalog();

  const el = document.getElementById('nakupTabContent'); if (!el) return;

  const total     = _nakupItems.length;
  const alerts    = _nakupItems.filter(i => i.alertPct > 0).length;
  const triggered = _nakupItems.filter(i => nakupIsTriggered(i)).length;

  const filters = [
    { id:'all',       label:'Vše',         count: total },
    { id:'alert',     label:'🔔 Hlídané',  count: alerts },
    { id:'triggered', label:'🎉 Sleva!',   count: triggered },
  ];

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
      <div style="background:var(--surface2);border-radius:12px;padding:12px;text-align:center;border:1px solid var(--border)">
        <div style="font-size:1.4rem;font-weight:800;font-family:Syne,sans-serif">${total}</div>
        <div style="font-size:.72rem;color:var(--text3)">Položek</div>
      </div>
      <div style="background:var(--surface2);border-radius:12px;padding:12px;text-align:center;border:1px solid var(--border)">
        <div style="font-size:1.4rem;font-weight:800;font-family:Syne,sans-serif;color:var(--bank)">${alerts}</div>
        <div style="font-size:.72rem;color:var(--text3)">Hlídaných</div>
      </div>
      <div style="background:var(--surface2);border-radius:12px;padding:12px;text-align:center;border:1px solid ${triggered?'rgba(74,222,128,.4)':'var(--border)'}${triggered?';box-shadow:0 0 12px rgba(74,222,128,.15)':''}">
        <div style="font-size:1.4rem;font-weight:800;font-family:Syne,sans-serif;color:${triggered?'var(--income)':'var(--text3)'}">${triggered}</div>
        <div style="font-size:.72rem;color:var(--text3)">Sleva aktivní</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <div style="display:flex;gap:6px;flex:1;flex-wrap:wrap">
        ${filters.map(f=>`
          <button class="tx-filt-btn ${_nakupFilter===f.id?'active':''}"
            onclick="nakupSetFilter('${f.id}',this)">
            ${f.label} <span style="opacity:.7">${f.count}</span>
          </button>`).join('')}
      </div>
      ${viewingUid ? '' : `<button class="btn btn-accent btn-sm" onclick="openNakupModal()">+ Přidat</button>`}
    </div>
    <div id="nakupList">${nakupBuildList()}</div>
  `;
}

function nakupIsTriggered(item) {
  if (!item.alertPct || !item.refPrice || !item.catalogKey) return false;
  const catItem = _nakupCatalog.find(c => c.key === item.catalogKey);
  if (!catItem?.latestPrice) return false;
  const drop = (item.refPrice - catItem.latestPrice) / item.refPrice * 100;
  return drop >= item.alertPct;
}

function nakupGetDrop(item) {
  if (!item.refPrice || !item.catalogKey) return null;
  const catItem = _nakupCatalog.find(c => c.key === item.catalogKey);
  if (!catItem?.latestPrice) return null;
  return Math.round((item.refPrice - catItem.latestPrice) / item.refPrice * 100);
}

function nakupBuildList() {
  let items = [..._nakupItems];
  if (_nakupFilter === 'alert')     items = items.filter(i => i.alertPct > 0);
  if (_nakupFilter === 'triggered') items = items.filter(i => nakupIsTriggered(i));

  if (!items.length) {
    return `<div class="empty" style="padding:32px">
      <div class="ei">${_nakupFilter === 'triggered' ? '🎉' : '🛒'}</div>
      <div class="et">${_nakupFilter === 'triggered' ? 'Zatím žádná sleva' : _nakupFilter === 'alert' ? 'Žádné hlídané produkty' : 'Nákupní seznam je prázdný'}</div>
      ${_nakupFilter === 'all' && !viewingUid ? '<div style="margin-top:8px"><button class="btn btn-accent btn-sm" onclick="openNakupModal()">+ Přidat první položku</button></div>' : ''}
    </div>`;
  }
  return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(158px,1fr));gap:10px;align-items:stretch">
    ${items.map(item => nakupBuildRow(item)).join('')}
  </div>`;
}

function nakupBuildRow(item) {
  const catItem = _nakupCatalog.find(c => c.key === item.catalogKey);
  const latestPrice = catItem?.latestPrice;
  const drop = nakupGetDrop(item);
  const triggered = nakupIsTriggered(item);
  const ro = viewingUid !== null;

  // Cena / stav
  let priceHtml = '';
  if (latestPrice) {
    priceHtml = `
      <div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-top:2px">
        <strong style="font-size:.95rem;color:${triggered?'var(--income)':'var(--text)'}">${fmtP(latestPrice)} Kč</strong>
        ${drop !== null ? `<span style="font-size:.7rem;font-weight:700;padding:1px 6px;border-radius:6px;background:${drop>=0?'rgba(74,222,128,.15)':'rgba(248,113,113,.15)'};color:${drop>=0?'var(--income)':'var(--expense)'}">${drop>=0?'↓':'↑'}${Math.abs(drop)}%</span>` : ''}
      </div>
      ${(catItem.latestStore||catItem.latestDate) ? `<div style="font-size:.66rem;color:var(--text3)">${catItem.latestStore||''}${catItem.latestStore&&catItem.latestDate?' · ':''}${catItem.latestDate?fmtD(catItem.latestDate):''}</div>` : ''}`;
  } else if (item.catalogKey) {
    priceHtml = `<div style="font-size:.7rem;color:var(--text3);margin-top:2px">⏳ Čekám na cenu z komunity…</div>`;
  }

  // Badge hlídání / sleva
  let badgeHtml = '';
  if (triggered) {
    badgeHtml = `<span style="font-size:.66rem;background:rgba(74,222,128,.2);color:var(--income);padding:2px 7px;border-radius:6px;font-weight:700;animation:pulse 2s infinite">🎉 SLEVA −${item.alertPct}%</span>`;
  } else if (item.alertPct > 0) {
    badgeHtml = `<span style="font-size:.66rem;padding:2px 7px;border-radius:6px;background:rgba(96,165,250,.15);color:var(--bank);border:1px solid rgba(96,165,250,.2)">🔔 Hlídám −${item.alertPct}%</span>`;
  }

  const refHtml = item.refPrice
    ? `<div style="font-size:.64rem;color:var(--text3);margin-top:auto;padding-top:4px">Ref.: ${fmtP(item.refPrice)} Kč${item.alertPct?` · alert ${fmtP(item.refPrice*(1-item.alertPct/100))} Kč`:''}</div>`
    : '';

  return `<div style="background:var(--surface2);border:1px solid ${triggered?'rgba(74,222,128,.4)':'var(--border)'};${triggered?'box-shadow:0 0 14px rgba(74,222,128,.12);':''}border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:6px;min-height:150px;position:relative">

    <!-- Ikona v jemném kolečku -->
    <div style="width:42px;height:42px;border-radius:12px;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;font-size:1.5rem">${item.icon||'🛒'}</div>

    <!-- Název -->
    <div style="font-weight:700;font-size:.86rem;line-height:1.25;color:var(--text);word-break:break-word">
      ${item.name}${item.qty>1?` <span style="font-size:.72rem;color:var(--text3);font-weight:500">×${item.qty}</span>`:''}
    </div>

    ${badgeHtml ? `<div>${badgeHtml}</div>` : ''}
    ${item.note ? `<div style="font-size:.68rem;color:var(--text3)">📝 ${item.note}</div>` : ''}
    ${priceHtml}
    ${refHtml}

    ${!ro ? `<div style="display:flex;gap:4px;justify-content:flex-end;border-top:1px solid var(--border);padding-top:8px;margin-top:6px">
      <button class="btn btn-ghost btn-icon btn-sm" onclick="openNakupPriceHistory('${item.id}')" title="Historie cen">📊</button>
      <button class="btn btn-edit btn-icon btn-sm" onclick="openNakupEdit('${item.id}')" title="Upravit">✎</button>
      <button class="btn btn-danger btn-icon btn-sm" onclick="nakupDelete('${item.id}')" title="Smazat">✕</button>
    </div>` : ''}
  </div>`;
}

function nakupSetFilter(f, btn) {
  _nakupFilter = f;
  document.querySelectorAll('#nakupTabContent .tx-filt-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const el = document.getElementById('nakupList');
  if (el) el.innerHTML = nakupBuildList();
}

// ══════════════════════════════════════════════════════
//  ZÁLOŽKA 2: PLÁNY A CÍLE
// ══════════════════════════════════════════════════════
async function renderNakupCile() {
  const el = document.getElementById('nakupTabContent'); if (!el) return;

  // Načti vklady ze Firebase
  await goalLoadAllDeposits();

  const D    = getData();
  const cile = (D.wishes || []).filter(w => w.isGoal);

  // Statistiky
  const totalTarget = cile.reduce((s,g) => s + (g.targetAmount||0), 0);
  const totalSaved  = cile.reduce((s,g) => s + goalGetSaved(g.id), 0);
  const done        = cile.filter(g => goalGetSaved(g.id) >= (g.targetAmount||1)).length;

  el.innerHTML = `
    <!-- Statistiky -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
      <div style="background:var(--surface2);border-radius:12px;padding:12px;text-align:center;border:1px solid var(--border)">
        <div style="font-size:1.4rem;font-weight:800;font-family:Syne,sans-serif">${cile.length}</div>
        <div style="font-size:.72rem;color:var(--text3)">Aktivních cílů</div>
      </div>
      <div style="background:var(--surface2);border-radius:12px;padding:12px;text-align:center;border:1px solid var(--border)">
        <div style="font-size:1.1rem;font-weight:800;font-family:Syne,sans-serif;color:var(--income)">${fmtP(totalSaved)} Kč</div>
        <div style="font-size:.72rem;color:var(--text3)">Naspořeno</div>
      </div>
      <div style="background:var(--surface2);border-radius:12px;padding:12px;text-align:center;border:1px solid ${done?'rgba(74,222,128,.4)':'var(--border)'}">
        <div style="font-size:1.4rem;font-weight:800;font-family:Syne,sans-serif;color:${done?'var(--income)':'var(--text3)'}">${done}</div>
        <div style="font-size:.72rem;color:var(--text3)">Splněno</div>
      </div>
    </div>

    <!-- Odkaz na virtuální peněženku -->
    <div onclick="showPage('penezenky')" style="display:flex;align-items:center;gap:10px;padding:11px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:12px;margin-bottom:14px;cursor:pointer;transition:background .15s" onmouseover="this.style.background='var(--surface3)'" onmouseout="this.style.background='var(--surface2)'">
      <span style="font-size:1.3rem">💰</span>
      <div style="flex:1">
        <div style="font-size:.84rem;font-weight:600">Virtuální peněženka</div>
        <div style="font-size:.75rem;color:var(--text3)">Správa vkladů a zůstatků → Peněženky</div>
      </div>
      <span style="color:var(--text3)">›</span>
    </div>

    <!-- Tlačítko přidat cíl -->
    ${!viewingUid ? `<div style="margin-bottom:14px;text-align:right">
      <button class="btn btn-accent btn-sm" onclick="openGoalModal()">🎯 + Nový cíl</button>
    </div>` : ''}

    <!-- Seznam cílů -->
    <div id="goalList">
      ${cile.length ? cile.map(g => goalBuildCard(g)).join('') : `
        <div class="empty" style="padding:36px">
          <div class="ei">🎯</div>
          <div class="et">Zatím žádné cíle</div>
          <div style="font-size:.78rem;color:var(--text3);margin-top:6px">Přidej první finanční cíl a sleduj, jak se blížíš k jeho splnění</div>
          ${!viewingUid ? '<div style="margin-top:12px"><button class="btn btn-accent btn-sm" onclick="openGoalModal()">🎯 Přidat první cíl</button></div>' : ''}
        </div>`}
    </div>
  `;
}

function goalGetSaved(goalId) {
  const deps = _goalDeposits[goalId] || [];
  return deps.reduce((s,d) => s + (d.amount||0), 0);
}

function goalGetStatus(goal) {
  const saved      = goalGetSaved(goal.id);
  const target     = goal.targetAmount || 0;
  const pct        = target > 0 ? Math.min(100, Math.round(saved / target * 100)) : 0;
  const remaining  = Math.max(0, target - saved);
  const monthly    = goal.monthlyTarget || 0;
  const monthsLeft = monthly > 0 ? Math.ceil(remaining / monthly) : null;

  // Deadline
  let deadlineInfo = null;
  if (goal.deadline) {
    const today     = new Date();
    const dead      = new Date(goal.deadline);
    const diffDays  = Math.ceil((dead - today) / 86400000);
    deadlineInfo    = { date: goal.deadline, daysLeft: diffDays };
  }

  // Motivační stav
  let mood = '🟡'; let moodText = 'Pokračuj dál';
  if (pct >= 100)       { mood = '🎉'; moodText = 'Cíl splněn!'; }
  else if (pct >= 75)   { mood = '🟢'; moodText = 'Skoro tam!'; }
  else if (pct >= 40)   { mood = '🔵'; moodText = 'Dobrý pokrok'; }
  else if (pct < 10 && saved > 0) { mood = '🟠'; moodText = 'Teprve začínáš'; }

  // Varování deadline
  if (deadlineInfo && deadlineInfo.daysLeft < 30 && pct < 100) {
    mood = '🔴'; moodText = `Deadline za ${deadlineInfo.daysLeft} dní!`;
  }

  return { saved, target, pct, remaining, monthly, monthsLeft, deadlineInfo, mood, moodText };
}

function goalBuildCard(goal) {
  const st    = goalGetStatus(goal);
  const done  = st.pct >= 100;
  const deps  = (_goalDeposits[goal.id] || []).slice().reverse().slice(0, 3);

  const progressColor = done ? 'var(--income)' :
    st.pct >= 75 ? 'var(--income)' :
    st.pct >= 40 ? 'var(--bank)' : 'var(--debt)';

  return `
  <div class="goal-card" style="background:var(--surface2);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:12px;${done?'border-color:rgba(74,222,128,.4);':''}">

    <!-- Hlavička -->
    <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px">
      <div style="font-size:1.6rem;flex-shrink:0">${goal.icon||'🎯'}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:.95rem;font-weight:700;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          ${goal.name}
          <span style="font-size:.72rem;padding:2px 8px;border-radius:6px;background:${done?'rgba(74,222,128,.2)':'var(--surface3)'};color:${done?'var(--income)':'var(--text3)'}">
            ${st.mood} ${st.moodText}
          </span>
        </div>
        ${goal.desc ? `<div style="font-size:.76rem;color:var(--text3);margin-top:2px">${goal.desc}</div>` : ''}
      </div>
      ${!viewingUid ? `<div style="display:flex;gap:4px;flex-shrink:0">
        <button class="btn btn-ghost btn-icon btn-sm" onclick="openGoalDepositModal('${goal.id}')" title="Přidat vklad">💰</button>
        <button class="btn btn-edit btn-icon btn-sm" onclick="openGoalModal('${goal.id}')">✎</button>
        <button class="btn btn-danger btn-icon btn-sm" onclick="goalDelete('${goal.id}')">✕</button>
      </div>` : ''}
    </div>

    <!-- Progress bar -->
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px">
        <span style="font-size:.8rem;color:var(--text2)">
          <strong style="color:${progressColor}">${fmtP(st.saved)} Kč</strong>
          <span style="color:var(--text3)"> / ${fmtP(st.target)} Kč</span>
        </span>
        <span style="font-size:.84rem;font-weight:700;color:${progressColor}">${st.pct}%</span>
      </div>
      <div style="height:10px;background:var(--surface3);border-radius:6px;overflow:hidden">
        <div style="height:100%;width:${st.pct}%;background:${progressColor};border-radius:6px;transition:width .4s ease;${done?'animation:pulse 2s infinite':''}"></div>
      </div>
    </div>

    <!-- Info řádky -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:${deps.length?'10px':'0'}">
      ${st.remaining > 0 ? `<div style="font-size:.75rem;padding:4px 10px;background:var(--surface3);border-radius:8px;color:var(--text2)">
        Zbývá: <strong>${fmtP(st.remaining)} Kč</strong>
      </div>` : ''}
      ${st.monthly > 0 ? `<div style="font-size:.75rem;padding:4px 10px;background:var(--surface3);border-radius:8px;color:var(--text2)">
        📅 ${fmtP(st.monthly)} Kč/měs
      </div>` : ''}
      ${st.monthsLeft ? `<div style="font-size:.75rem;padding:4px 10px;background:var(--surface3);border-radius:8px;color:var(--text2)">
        ≈ ${st.monthsLeft} měsíců
      </div>` : ''}
      ${st.deadlineInfo ? `<div style="font-size:.75rem;padding:4px 10px;background:${st.deadlineInfo.daysLeft<30?'rgba(248,113,113,.1)':'var(--surface3)'};border-radius:8px;color:${st.deadlineInfo.daysLeft<30?'var(--expense)':'var(--text2)'}">
        ⏰ ${fmtD(st.deadlineInfo.date)} ${st.deadlineInfo.daysLeft>0?`(za ${st.deadlineInfo.daysLeft} dní)`:'(dnes!)'}
      </div>` : ''}
    </div>

    <!-- Poslední vklady -->
    ${deps.length ? `
      <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
        <div style="font-size:.7rem;color:var(--text3);margin-bottom:5px;text-transform:uppercase;letter-spacing:.06em">Poslední vklady</div>
        ${deps.map(d => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:.78rem">
            <span style="color:var(--text2)">${d.note||'Vklad'}</span>
            <div style="display:flex;align-items:center;gap:8px">
              <span style="color:var(--income);font-weight:600">+${fmtP(d.amount)} Kč</span>
              <span style="color:var(--text3);font-size:.7rem">${fmtD(d.date)}</span>
              ${!viewingUid ? `<button class="btn btn-danger btn-icon" style="width:18px;height:18px;font-size:.6rem" onclick="goalDeleteDeposit('${goal.id}','${d.id}')">✕</button>` : ''}
            </div>
          </div>`).join('')}
      </div>` : ''}

    <!-- CTA pokud bez vkladů -->
    ${!deps.length && !done && !viewingUid ? `
      <div style="margin-top:10px;text-align:center">
        <button class="btn btn-accent btn-sm" onclick="openGoalDepositModal('${goal.id}')">💰 Přidat první vklad</button>
      </div>` : ''}
  </div>`;
}

// ══════════════════════════════════════════════════════
//  MODAL – NOVÝ / UPRAVIT CÍL
// ══════════════════════════════════════════════════════
function openGoalModal(editId) {
  if (viewingUid) return;
  const modal = document.getElementById('modalGoal'); if (!modal) return;

  const D    = getData();
  const goal = editId ? (D.wishes||[]).find(w=>w.id===editId) : null;

  document.getElementById('editGoalId').value          = editId || '';
  document.getElementById('goalName').value            = goal?.name || '';
  document.getElementById('goalDesc').value            = goal?.desc || '';
  document.getElementById('goalTargetAmount').value    = goal?.targetAmount || '';
  document.getElementById('goalMonthlyTarget').value   = goal?.monthlyTarget || '';
  document.getElementById('goalDeadline').value        = goal?.deadline || '';
  document.getElementById('goalIcon').value            = goal?.icon || '🎯';

  document.getElementById('goalModalTitle').textContent = editId ? 'Upravit cíl' : 'Nový finanční cíl';
  goalUpdateEstimate();
  modal.classList.add('open');
}

function goalUpdateEstimate() {
  const target  = parseFloat(document.getElementById('goalTargetAmount').value) || 0;
  const monthly = parseFloat(document.getElementById('goalMonthlyTarget').value) || 0;
  const el      = document.getElementById('goalEstimate'); if (!el) return;

  if (!target || !monthly) { el.textContent = ''; return; }
  const months  = Math.ceil(target / monthly);
  const years   = Math.floor(months / 12);
  const rem     = months % 12;
  el.textContent = `≈ ${years > 0 ? years + ' r. ' : ''}${rem > 0 ? rem + ' měs.' : ''}`;
}

function saveGoal() {
  if (viewingUid) return;
  const eid         = document.getElementById('editGoalId').value;
  const name        = document.getElementById('goalName').value.trim();
  const desc        = document.getElementById('goalDesc').value.trim();
  const targetAmount = parseFloat(document.getElementById('goalTargetAmount').value) || 0;
  const monthlyTarget = parseFloat(document.getElementById('goalMonthlyTarget').value) || 0;
  const deadline    = document.getElementById('goalDeadline').value;
  const icon        = document.getElementById('goalIcon').value.trim() || '🎯';

  if (!name)         { alert('Zadej název cíle'); return; }
  if (!targetAmount) { alert('Zadej cílovou částku'); return; }

  const D = getData();
  if (!D.wishes) D.wishes = [];

  const obj = {
    id: eid || uid(),
    name, desc, targetAmount, monthlyTarget, deadline, icon,
    isGoal: true,
    addedAt: Date.now(),
    priority: 'mid',
  };

  if (eid) {
    const idx = D.wishes.findIndex(w => w.id === eid);
    if (idx >= 0) D.wishes[idx] = { ...D.wishes[idx], ...obj };
  } else {
    D.wishes.push(obj);
  }

  // Uložení přes S objekt
  S.wishes = D.wishes;
  save();
  closeModal('modalGoal');
  renderNakupCile();
}

function goalDelete(id) {
  if (viewingUid) return;
  if (!confirm('Smazat cíl? Všechny vklady k tomuto cíli budou také smazány.')) return;
  S.wishes = (S.wishes || []).filter(w => w.id !== id);
  save();
  // Smaž i vklady z Firebase
  if (window._currentUser) {
    const uid = window._currentUser.uid;
    _get(_ref(_db, `users/${uid}/goal_deposits`)).then(snap => {
      if (!snap.exists()) return;
      const updates = {};
      Object.entries(snap.val()).forEach(([k, v]) => {
        if (v.goalId === id) updates[`users/${uid}/goal_deposits/${k}`] = null;
      });
      if (Object.keys(updates).length) _update(_ref(_db), updates);
    }).catch(()=>{});
  }
  delete _goalDeposits[id];
  renderNakupCile();
}

// ══════════════════════════════════════════════════════
//  MODAL – PŘIDAT VKLAD
// ══════════════════════════════════════════════════════
function openGoalDepositModal(goalId) {
  if (viewingUid) return;
  const modal = document.getElementById('modalGoalDeposit'); if (!modal) return;

  const D    = getData();
  const goal = (D.wishes||[]).find(w => w.id === goalId);
  if (!goal) return;

  const st = goalGetStatus(goal);

  document.getElementById('depositGoalId').value   = goalId;
  document.getElementById('depositGoalName').textContent = goal.name;
  document.getElementById('depositAmount').value   = '';
  document.getElementById('depositNote').value     = '';
  document.getElementById('depositDate').value     = new Date().toISOString().slice(0,10);

  // Zbývá info
  const el = document.getElementById('depositGoalInfo');
  if (el) {
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:8px">
        <span style="color:var(--text3)">Naspořeno:</span>
        <strong style="color:var(--income)">${fmtP(st.saved)} / ${fmtP(st.target)} Kč (${st.pct}%)</strong>
      </div>
      <div style="height:6px;background:var(--surface3);border-radius:4px;overflow:hidden;margin-bottom:10px">
        <div style="height:100%;width:${st.pct}%;background:var(--income);border-radius:4px"></div>
      </div>
      ${st.remaining > 0 ? `<div style="font-size:.76rem;color:var(--text3)">Zbývá: <strong>${fmtP(st.remaining)} Kč</strong>${st.monthly ? ` · doporučeno: ${fmtP(st.monthly)} Kč` : ''}</div>` : '<div style="font-size:.76rem;color:var(--income)">🎉 Cíl byl splněn!</div>'}
    `;
  }

  modal.classList.add('open');
}

async function saveGoalDeposit() {
  if (viewingUid || !window._currentUser) return;

  const goalId = document.getElementById('depositGoalId').value;
  const amount = parseFloat(document.getElementById('depositAmount').value);
  const note   = document.getElementById('depositNote').value.trim();
  const date   = document.getElementById('depositDate').value;

  if (!amount || amount <= 0) { alert('Zadej platnou částku'); return; }

  const dep = {
    id:     uid(),
    goalId,
    amount: parseFloat(amount.toFixed(2)),
    date:   date || new Date().toISOString().slice(0,10),
    note:   note || 'Vklad',
    createdAt: Date.now(),
  };

  try {
    const userUid = window._currentUser.uid;
    await _set(_ref(_db, `users/${userUid}/goal_deposits/${dep.id}`), dep);

    // Přidej do lokálního cache
    if (!_goalDeposits[goalId]) _goalDeposits[goalId] = [];
    _goalDeposits[goalId].push(dep);

    // Aktualizuj savedAmount na cíli pro rychlý přístup
    const D = getData();
    const goalIdx = (D.wishes||[]).findIndex(w => w.id === goalId);
    if (goalIdx >= 0) {
      D.wishes[goalIdx].savedAmount = goalGetSaved(goalId);
      S.wishes = D.wishes;
      save();
    }

    closeModal('modalGoalDeposit');
    showToast('Vklad přidán ✓');
    renderNakupCile();
  } catch(e) {
    console.error('saveGoalDeposit error', e);
    alert('Chyba při ukládání vkladu');
  }
}

async function goalDeleteDeposit(goalId, depositId) {
  if (viewingUid || !window._currentUser) return;
  if (!confirm('Smazat tento vklad?')) return;

  try {
    const userUid = window._currentUser.uid;
    await _set(_ref(_db, `users/${userUid}/goal_deposits/${depositId}`), null);

    // Odeber z cache
    if (_goalDeposits[goalId]) {
      _goalDeposits[goalId] = _goalDeposits[goalId].filter(d => d.id !== depositId);
    }

    // Aktualizuj savedAmount
    const D = getData();
    const goalIdx = (D.wishes||[]).findIndex(w => w.id === goalId);
    if (goalIdx >= 0) {
      D.wishes[goalIdx].savedAmount = goalGetSaved(goalId);
      S.wishes = D.wishes;
      save();
    }

    showToast('Vklad smazán');
    renderNakupCile();
  } catch(e) {
    console.error('goalDeleteDeposit error', e);
  }
}

// ══════════════════════════════════════════════════════
//  MODALY – NÁKUPNÍ SEZNAM (původní logika beze změny)
// ══════════════════════════════════════════════════════
function openNakupModal(editId) {
  if (viewingUid) return;
  const modal = document.getElementById('modalNakup'); if (!modal) return;

  const item = editId ? (_nakupItems.find(i => i.id === editId) || {}) : {};
  document.getElementById('editNakupId').value = editId || '';
  document.getElementById('nakupItemName').value = item.name || '';
  document.getElementById('nakupItemQty').value = item.qty || 1;
  document.getElementById('nakupItemNote').value = item.note || '';
  document.getElementById('nakupItemRefPrice').value = item.refPrice || '';
  document.getElementById('nakupItemAlertPct').value = item.alertPct || 0;
  document.getElementById('nakupAlertSlider').value = item.alertPct || 0;
  document.getElementById('nakupAlertValue').textContent = (item.alertPct || 0) + ' %';
  document.getElementById('nakupAlertEmail').value = item.alertEmail || (window._currentUser?.email || '');
  document.getElementById('nakupCatalogKey').value = item.catalogKey || '';

  nakupUpdateAlertPreview();
  nakupUpdateSliderVisual(item.alertPct || 0);

  document.getElementById('nakupModalTitle').textContent = editId ? 'Upravit položku' : 'Přidat do nákupního seznamu';
  modal.classList.add('open');

  if (!_nakupCatalog.length) nakupLoadCatalog().then(() => {});
}

function openNakupEdit(id) { openNakupModal(id); }

function nakupSliderChange(val) {
  document.getElementById('nakupItemAlertPct').value = val;
  document.getElementById('nakupAlertValue').textContent = val + ' %';
  nakupUpdateSliderVisual(parseInt(val));
  nakupUpdateAlertPreview();
}

function nakupUpdateSliderVisual(val) {
  const slider = document.getElementById('nakupAlertSlider'); if (!slider) return;
  const pct = val / 50 * 100;
  slider.style.background = `linear-gradient(to right, var(--income) 0%, var(--income) ${pct}%, var(--surface3) ${pct}%, var(--surface3) 100%)`;
}

function nakupUpdateAlertPreview() {
  const refPrice = parseFloat(document.getElementById('nakupItemRefPrice').value) || 0;
  const alertPct = parseInt(document.getElementById('nakupAlertSlider').value) || 0;
  const el = document.getElementById('nakupAlertPreview'); if (!el) return;

  if (!alertPct) { el.innerHTML = '<span style="color:var(--text3)">Hlídání vypnuto</span>'; return; }
  if (!refPrice) { el.innerHTML = '<span style="color:var(--text3)">Zadej referenční cenu pro výpočet</span>'; return; }
  const targetPrice = refPrice * (1 - alertPct / 100);
  el.innerHTML = `<span style="color:var(--income)">🔔 Upozornění při ceně ≤ <strong>${fmtP(targetPrice)} Kč</strong> (−${alertPct}% z ${fmtP(refPrice)} Kč)</span>`;
}

async function nakupShowCatalogSuggest(val) {
  const el = document.getElementById('nakupCatalogSuggest'); if (!el) return;
  const q = (val || '').toLowerCase().trim();
  if (q.length < 2) { el.style.display = 'none'; return; }
  if (!_nakupCatalog.length) await nakupLoadCatalog();

  const matches = _nakupCatalog.filter(c => c.name.toLowerCase().includes(q)).slice(0, 8);
  if (!matches.length) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  el.innerHTML = matches.map(c => `
    <div onclick="nakupSelectCatalogItem('${c.key}','${c.name.replace(/'/g,"&#39;")}')"
      style="padding:8px 12px;cursor:pointer;font-size:.82rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center"
      onmouseover="this.style.background='var(--surface3)'" onmouseout="this.style.background=''">
      <span><strong>${c.name}</strong></span>
      <span style="color:${c.latestPrice?'var(--income)':'var(--text3)'};font-size:.75rem">
        ${c.latestPrice ? fmtP(c.latestPrice)+' Kč' : 'cena neznámá'}
        ${c.priceCount > 1 ? `<span style="color:var(--text3)"> · ${c.priceCount}× sken</span>` : ''}
      </span>
    </div>`).join('');
}

function nakupHideSuggest() {
  setTimeout(() => {
    const el = document.getElementById('nakupCatalogSuggest');
    if (el) el.style.display = 'none';
  }, 200);
}

function nakupSelectCatalogItem(key, name) {
  document.getElementById('nakupItemName').value = name;
  document.getElementById('nakupCatalogKey').value = key;
  document.getElementById('nakupCatalogSuggest').style.display = 'none';
  const catItem = _nakupCatalog.find(c => c.key === key);
  if (catItem?.latestPrice && !document.getElementById('nakupItemRefPrice').value) {
    document.getElementById('nakupItemRefPrice').value = catItem.latestPrice;
    nakupUpdateAlertPreview();
  }
}

function saveNakupItem() {
  if (viewingUid) return;
  const eid        = document.getElementById('editNakupId').value;
  const name       = document.getElementById('nakupItemName').value.trim();
  const qty        = parseInt(document.getElementById('nakupItemQty').value) || 1;
  const note       = document.getElementById('nakupItemNote').value.trim();
  const refPrice   = parseFloat(document.getElementById('nakupItemRefPrice').value) || 0;
  const alertPct   = parseInt(document.getElementById('nakupAlertSlider').value) || 0;
  const alertEmail = document.getElementById('nakupAlertEmail').value.trim();
  const catalogKey = document.getElementById('nakupCatalogKey').value.trim();

  if (!name) { alert('Zadej název produktu'); return; }

  const icons = {rohlík:'🥐',mléko:'🥛',vejce:'🥚',máslo:'🧈',chléb:'🍞',káva:'☕',čaj:'🫖',pivo:'🍺',víno:'🍷',
    šampón:'🧴',zubní:'🪥',wc:'🧻',prací:'🧺',jablko:'🍎',banán:'🍌',limonáda:'🥤',džus:'🥤'};
  const icon = Object.entries(icons).find(([k]) => name.toLowerCase().includes(k))?.[1] || '🛒';

  const obj = { id: eid || uid(), name, qty, note, refPrice, alertPct, alertEmail, catalogKey, icon, addedAt: Date.now() };

  if (!S.nakupList) S.nakupList = [];
  if (eid) {
    const idx = S.nakupList.findIndex(i => i.id === eid);
    if (idx >= 0) S.nakupList[idx] = obj;
  } else {
    S.nakupList.push(obj);
  }

  save();
  closeModal('modalNakup');
  renderNakupSeznam();
}

function nakupDelete(id) {
  if (viewingUid) return;
  if (!confirm('Odebrat ze seznamu?')) return;
  S.nakupList = (S.nakupList || []).filter(i => i.id !== id);
  save();
  renderNakupSeznam();
}

// ══════════════════════════════════════════════════════
//  MODAL – HISTORIE CEN (původní logika beze změny)
// ══════════════════════════════════════════════════════
async function openNakupPriceHistory(itemId) {
  const item = _nakupItems.find(i => i.id === itemId); if (!item) return;
  const modal = document.getElementById('modalNakupHistory'); if (!modal) return;

  document.getElementById('nakupHistoryTitle').textContent = item.name;
  document.getElementById('nakupHistoryContent').innerHTML =
    '<div style="text-align:center;padding:20px;color:var(--text3)">⏳ Načítám historii...</div>';
  modal.classList.add('open');

  const key    = item.catalogKey || nakupNormKey(item.name);
  const prices = await nakupLoadPriceHistory(key);
  const el     = document.getElementById('nakupHistoryContent'); if (!el) return;

  if (!prices.length) {
    el.innerHTML = `<div class="empty"><div class="ei">📊</div><div class="et">Zatím žádná data</div>
      <div style="font-size:.78rem;color:var(--text3);margin-top:8px">Ceny se plní automaticky ze skenovaných účtenek komunity.<br>Naskenuj účtenku s tímto produktem!</div></div>`;
    return;
  }

  const minP = Math.min(...prices.map(p => p.price));
  const maxP = Math.max(...prices.map(p => p.price));
  const avgP = prices.reduce((a,p) => a+p.price, 0) / prices.length;

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">
      <div style="background:var(--surface2);border-radius:10px;padding:10px;text-align:center">
        <div style="font-size:1.1rem;font-weight:700;color:var(--income)">${fmtP(minP)} Kč</div>
        <div style="font-size:.7rem;color:var(--text3)">Minimum</div>
      </div>
      <div style="background:var(--surface2);border-radius:10px;padding:10px;text-align:center">
        <div style="font-size:1.1rem;font-weight:700">${fmtP(Math.round(avgP))} Kč</div>
        <div style="font-size:.7rem;color:var(--text3)">Průměr</div>
      </div>
      <div style="background:var(--surface2);border-radius:10px;padding:10px;text-align:center">
        <div style="font-size:1.1rem;font-weight:700;color:var(--expense)">${fmtP(maxP)} Kč</div>
        <div style="font-size:.7rem;color:var(--text3)">Maximum</div>
      </div>
    </div>
    <canvas id="nakupPriceCanvas" height="160" style="width:100%;display:block;margin-bottom:14px"></canvas>
    <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin-bottom:8px">Historie (${prices.length} záznamů)</div>
    <div style="max-height:200px;overflow-y:auto">
      ${prices.slice().reverse().map(p => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-size:.82rem;font-weight:600">${fmtP(p.price)} Kč</div>
            ${p.store ? `<div style="font-size:.7rem;color:var(--text3)">${p.store}</div>` : ''}
          </div>
          <div style="font-size:.74rem;color:var(--text3)">${fmtD(p.date)}</div>
        </div>`).join('')}
    </div>
  `;

  setTimeout(() => {
    const canvas = document.getElementById('nakupPriceCanvas'); if (!canvas) return;
    const W = canvas.parentElement.clientWidth || 400;
    canvas.width = W; canvas.height = 160;
    const ctx = canvas.getContext('2d');
    const n = prices.length;
    if (n < 2) return;
    const pad = {l:45,r:12,t:14,b:28};
    const cW = W-pad.l-pad.r, cH = 160-pad.t-pad.b;
    const range = maxP - minP || 1;
    const xf = i => pad.l + i/(n-1)*cW;
    const yf = v => pad.t + cH - (v-minP)/range*cH;

    ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.lineWidth=1; ctx.setLineDash([3,4]);
    [minP, avgP, maxP].forEach(v => {
      ctx.beginPath(); ctx.moveTo(pad.l, yf(v)); ctx.lineTo(W-pad.r, yf(v)); ctx.stroke();
    });
    ctx.setLineDash([]);

    const grad = ctx.createLinearGradient(0,pad.t,0,160-pad.b);
    grad.addColorStop(0,'rgba(74,222,128,.3)'); grad.addColorStop(1,'rgba(74,222,128,0)');
    ctx.beginPath(); ctx.moveTo(xf(0), 160-pad.b);
    prices.forEach((p,i) => ctx.lineTo(xf(i), yf(p.price)));
    ctx.lineTo(xf(n-1), 160-pad.b); ctx.closePath();
    ctx.fillStyle=grad; ctx.fill();

    ctx.strokeStyle='#4ade80'; ctx.lineWidth=2; ctx.beginPath();
    prices.forEach((p,i) => i===0 ? ctx.moveTo(xf(i),yf(p.price)) : ctx.lineTo(xf(i),yf(p.price)));
    ctx.stroke();

    prices.forEach((p,i) => {
      ctx.beginPath(); ctx.arc(xf(i),yf(p.price),3,0,Math.PI*2);
      ctx.fillStyle='#4ade80'; ctx.fill();
    });

    if (item.refPrice && item.refPrice >= minP && item.refPrice <= maxP) {
      ctx.strokeStyle='rgba(251,191,36,.7)'; ctx.lineWidth=1; ctx.setLineDash([4,3]);
      ctx.beginPath(); ctx.moveTo(pad.l,yf(item.refPrice)); ctx.lineTo(W-pad.r,yf(item.refPrice)); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle='rgba(251,191,36,.8)'; ctx.font='9px Instrument Sans';
      ctx.textAlign='left'; ctx.fillText('ref '+fmtP(item.refPrice)+' Kč', pad.l+4, yf(item.refPrice)-3);
    }

    if (item.alertPct && item.refPrice) {
      const thr = item.refPrice * (1 - item.alertPct/100);
      if (thr >= minP) {
        ctx.strokeStyle='rgba(96,165,250,.6)'; ctx.lineWidth=1; ctx.setLineDash([3,3]);
        ctx.beginPath(); ctx.moveTo(pad.l,yf(thr)); ctx.lineTo(W-pad.r,yf(thr)); ctx.stroke();
        ctx.setLineDash([]); ctx.fillStyle='rgba(96,165,250,.7)'; ctx.font='9px Instrument Sans';
        ctx.textAlign='left'; ctx.fillText('alert −'+item.alertPct+'%', pad.l+4, yf(thr)-3);
      }
    }

    ctx.fillStyle='rgba(168,173,196,.7)'; ctx.font='9px Instrument Sans'; ctx.textAlign='right'; ctx.setLineDash([]);
    [minP, Math.round(avgP), maxP].forEach(v => ctx.fillText(fmtP(v), pad.l-4, yf(v)+3));

    ctx.textAlign='center'; ctx.fillStyle='rgba(168,173,196,.7)';
    const step = Math.max(1, Math.floor(n/5));
    prices.forEach((p,i) => { if(i%step===0||i===n-1) ctx.fillText(fmtD(p.date), xf(i), 160-8); });
  }, 50);
}

// ══════════════════════════════════════════════════════
//  VIRTUÁLNÍ PENĚŽENKA – renderování v sekci Peněženky
// ══════════════════════════════════════════════════════
function renderVirtualWallet() {
  const el = document.getElementById('virtualWalletSection'); if (!el) return;

  const D    = getData();
  const cile = (D.wishes || []).filter(w => w.isGoal);

  if (!cile.length) {
    el.style.display = 'none';
    return;
  }

  el.style.display = 'block';

  // Celkový přehled virtuální peněženky
  const totalTarget = cile.reduce((s,g) => s + (g.targetAmount||0), 0);
  const totalSaved  = cile.reduce((s,g) => s + goalGetSaved(g.id), 0);
  const totalFree   = Math.max(0, totalSaved - totalTarget); // přesah (volné prostředky)

  el.innerHTML = `
    <div class="card" style="margin-top:16px">
      <div class="card-header">
        <span class="card-title">💰 Virtuální peněženka – Cíle</span>
        <button class="btn btn-accent btn-sm" onclick="nakupSwitchTab('cile');showPage('nakup')">Spravovat cíle</button>
      </div>
      <div class="card-body">

        <!-- Celkový přehled -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
          <div style="background:var(--surface2);border-radius:12px;padding:12px;text-align:center;border:1px solid var(--border)">
            <div style="font-size:1rem;font-weight:800;font-family:Syne,sans-serif;color:var(--income)">${fmtP(totalSaved)} Kč</div>
            <div style="font-size:.7rem;color:var(--text3)">Naspořeno</div>
          </div>
          <div style="background:var(--surface2);border-radius:12px;padding:12px;text-align:center;border:1px solid var(--border)">
            <div style="font-size:1rem;font-weight:800;font-family:Syne,sans-serif">${fmtP(totalTarget)} Kč</div>
            <div style="font-size:.7rem;color:var(--text3)">Celkový cíl</div>
          </div>
          <div style="background:var(--surface2);border-radius:12px;padding:12px;text-align:center;border:1px solid var(--border)">
            <div style="font-size:1rem;font-weight:800;font-family:Syne,sans-serif;color:${totalFree>0?'var(--income)':'var(--text3)'}">${fmtP(totalTarget - totalSaved > 0 ? totalTarget - totalSaved : 0)} Kč</div>
            <div style="font-size:.7rem;color:var(--text3)">Zbývá celkem</div>
          </div>
        </div>

        <!-- Celkový progress -->
        <div style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:.78rem">
            <span style="color:var(--text3)">Celkový pokrok</span>
            <strong>${totalTarget>0?Math.round(totalSaved/totalTarget*100):0}%</strong>
          </div>
          <div style="height:8px;background:var(--surface3);border-radius:5px;overflow:hidden">
            <div style="height:100%;width:${totalTarget>0?Math.min(100,Math.round(totalSaved/totalTarget*100)):0}%;background:var(--income);border-radius:5px;transition:width .4s"></div>
          </div>
        </div>

        <!-- Minikarty cílů -->
        <div style="display:flex;flex-direction:column;gap:8px">
          ${cile.map(g => {
            const saved  = goalGetSaved(g.id);
            const target = g.targetAmount || 0;
            const pct    = target > 0 ? Math.min(100, Math.round(saved/target*100)) : 0;
            const done   = pct >= 100;
            return `
              <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface3);border-radius:10px;cursor:pointer"
                onclick="nakupSwitchTab('cile');showPage('nakup')">
                <span style="font-size:1.2rem">${g.icon||'🎯'}</span>
                <div style="flex:1;min-width:0">
                  <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                    <span style="font-size:.82rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.name}</span>
                    <span style="font-size:.78rem;color:${done?'var(--income)':'var(--text2)'};flex-shrink:0;margin-left:8px;font-weight:700">${pct}%</span>
                  </div>
                  <div style="height:5px;background:var(--surface2);border-radius:3px;overflow:hidden">
                    <div style="height:100%;width:${pct}%;background:${done?'var(--income)':'var(--bank)'};border-radius:3px"></div>
                  </div>
                  <div style="font-size:.7rem;color:var(--text3);margin-top:3px">${fmtP(saved)} / ${fmtP(target)} Kč</div>
                </div>
                ${!viewingUid ? `<button class="btn btn-accent btn-icon btn-sm" onclick="event.stopPropagation();openGoalDepositModal('${g.id}')" title="Přidat vklad">+</button>` : ''}
              </div>`;
          }).join('')}
        </div>

        <!-- Tip do budoucna -->
        <div style="margin-top:14px;padding:10px 12px;background:rgba(96,165,250,.08);border:1px solid rgba(96,165,250,.2);border-radius:10px;font-size:.76rem;color:var(--text2)">
          💡 <strong>Do budoucna:</strong> Automatické posílání volných prostředků ze zůstatku do virtuální peněženky (plánováno).
        </div>
      </div>
    </div>
  `;
}

// Voláno při renderování stránky Peněženky
async function onPenezenkyRender() {
  await goalLoadAllDeposits();
  renderVirtualWallet();
}

// ══════════════════════════════════════════════════════
//  PUBLIKOVÁNÍ CEN DO FIREBASE (voláno z receipts.js)
// ══════════════════════════════════════════════════════
async function publishPricesToCatalog(items, store, date) {
  if (!items?.length || !window._currentUser) return;
  const today = date || new Date().toISOString().slice(0,10);
  try {
    const updates = {};
    items.forEach(it => {
      if (!it.name || !it.price || it.price <= 0) return;
      const key = nakupNormKey(it.name);
      if (key.length < 2) return;
      const recordKey = today.replace(/-/g,'') + '_' + (window._currentUser.uid||'anon').slice(0,8);
      updates[`catalog/prices/${key}/${recordKey}`] = {
        price: parseFloat(it.price.toFixed(2)),
        date:  today,
        store: store || 'Neznámý',
        uid:   window._currentUser.uid
      };
      updates[`catalog/items/${key}/latestPrice`] = parseFloat(it.price.toFixed(2));
      updates[`catalog/items/${key}/latestDate`]  = today;
      updates[`catalog/items/${key}/latestStore`] = store || 'Neznámý';
      updates[`catalog/items/${key}/name`] = it.name;
    });

    if (Object.keys(updates).length > 0) {
      await _update(_ref(_db), updates);
      _nakupCatalog = [];
      _nakupCatalogCache = {};
      await checkPriceAlerts();
    }
  } catch(e) { console.log('publishPricesToCatalog error', e); }
}

// ══════════════════════════════════════════════════════
//  KONTROLA ALERTŮ
// ══════════════════════════════════════════════════════
async function checkPriceAlerts() {
  if (!S.nakupList?.length) return;
  await nakupLoadCatalog();

  const triggered = S.nakupList.filter(item => {
    if (!item.alertPct || !item.refPrice || !item.catalogKey) return false;
    const catItem = _nakupCatalog.find(c => c.key === item.catalogKey);
    if (!catItem?.latestPrice) return false;
    const drop = (item.refPrice - catItem.latestPrice) / item.refPrice * 100;
    return drop >= item.alertPct;
  });

  if (!triggered.length) return;
  triggered.forEach(item => {
    const catItem = _nakupCatalog.find(c => c.key === item.catalogKey);
    const drop = Math.round((item.refPrice - catItem.latestPrice) / item.refPrice * 100);
    showNakupAlert(item, catItem.latestPrice, drop);
  });

  const alertsWithEmail = triggered.filter(i => i.alertEmail);
  if (alertsWithEmail.length && typeof callWorkerPriceAlert === 'function') {
    await callWorkerPriceAlert(alertsWithEmail);
  }
}

function showNakupAlert(item, currentPrice, dropPct) {
  const alertEl = document.getElementById('nakupAlertBanner');
  if (!alertEl) return;
  alertEl.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.3);border-radius:12px;margin-bottom:14px;cursor:pointer"
      onclick="nakupSwitchTab('seznam');showPage('nakup',null)">
      <span style="font-size:1.4rem">🎉</span>
      <div style="flex:1">
        <div style="font-size:.82rem;font-weight:700;color:var(--income)">Sleva! ${item.name}</div>
        <div style="font-size:.76rem;color:var(--text2)">Aktuální cena ${fmtP(currentPrice)} Kč · pokles o <strong>${dropPct}%</strong></div>
      </div>
      <span style="font-size:.72rem;color:var(--text3)">Otevřít →</span>
    </div>`;
  alertEl.style.display = 'block';
  setTimeout(() => { if(alertEl) alertEl.style.display = 'none'; }, 15000);
}

// ══════════════════════════════════════════════════════
//  EMAIL ALERT přes Cloudflare Worker
// ══════════════════════════════════════════════════════
async function callWorkerPriceAlert(items) {
  try {
    const token = await getAuthToken();
    if (!token) return;
    const catalogItems = items.map(item => {
      const catItem = _nakupCatalog.find(c => c.key === item.catalogKey);
      return {
        name:         item.name,
        currentPrice: catItem?.latestPrice,
        refPrice:     item.refPrice,
        alertPct:     item.alertPct,
        store:        catItem?.latestStore,
        email:        item.alertEmail,
      };
    });
    await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ type: 'price_alert', payload: { items: catalogItems, userName: window._userProfile?.displayName || 'uživatel' } })
    });
  } catch(e) { console.log('price alert worker error', e); }
}

// ── Helper: showToast (pokud neexistuje globálně) ──
function showToast(msg) {
  if (typeof window.showToast === 'function' && window.showToast !== showToast) {
    window.showToast(msg); return;
  }
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--surface2);color:var(--text);padding:10px 20px;border-radius:20px;font-size:.84rem;z-index:9999;border:1px solid var(--border);box-shadow:0 4px 20px rgba(0,0,0,.3)';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}
