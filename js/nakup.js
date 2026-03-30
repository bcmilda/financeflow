// ══════════════════════════════════════════════════════
//  NÁKUPNÍ SEZNAM + HLÍDAČ CEN  – FinanceFlow v6.37
// ══════════════════════════════════════════════════════

// ── State ──
let _nakupItems = [];          // uživatelův nákupní seznam (z S.nakupList)
let _nakupCatalog = [];        // komunity katalog (z Firebase catalog/items + catalog/prices)
let _nakupFilter = 'all';      // 'all' | 'active' | 'alert'
let _nakupCatalogCache = {};   // key → {name, prices:[{date,price,store}]}

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

// ══════════════════════════════════════════════════════
//  RENDEROVÁNÍ HLAVNÍ STRÁNKY
// ══════════════════════════════════════════════════════
async function renderNakup() {
  const D = getData();
  _nakupItems = D.nakupList || [];

  // Lazy load katalogu
  if (!_nakupCatalog.length) await nakupLoadCatalog();

  const el = document.getElementById('nakupContent'); if (!el) return;

  // Statistiky
  const total    = _nakupItems.length;
  const alerts   = _nakupItems.filter(i => i.alertPct > 0).length;
  const triggered = _nakupItems.filter(i => nakupIsTriggered(i)).length;

  // Filtry
  const filters = [
    { id:'all',    label:'Vše',         count: total },
    { id:'alert',  label:'🔔 Hlídané',  count: alerts },
    { id:'triggered', label:'🎉 Sleva!', count: triggered },
  ];

  el.innerHTML = `
    <!-- Hlavička se statistikami -->
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

    <!-- Filtry + tlačítko přidat -->
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

    <!-- Seznam -->
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

  return items.map(item => nakupBuildRow(item)).join('');
}

function nakupBuildRow(item) {
  const catItem = _nakupCatalog.find(c => c.key === item.catalogKey);
  const latestPrice = catItem?.latestPrice;
  const drop = nakupGetDrop(item);
  const triggered = nakupIsTriggered(item);
  const ro = viewingUid !== null;

  // Cena info
  let priceHtml = '';
  if (latestPrice) {
    priceHtml = `<div style="font-size:.78rem;margin-top:5px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <span style="color:var(--text3)">Poslední cena:</span>
      <strong style="color:${triggered?'var(--income)':'var(--text)'}">${fmtP(latestPrice)} Kč</strong>
      ${catItem.latestStore ? `<span style="color:var(--text3);font-size:.7rem">${catItem.latestStore}</span>` : ''}
      ${catItem.latestDate  ? `<span style="color:var(--text3);font-size:.7rem">${fmtD(catItem.latestDate)}</span>` : ''}
      ${drop !== null ? `<span style="font-size:.75rem;font-weight:700;padding:2px 7px;border-radius:6px;background:${drop>=0?'rgba(74,222,128,.15)':'rgba(248,113,113,.15)'};color:${drop>=0?'var(--income)':'var(--expense)'}">${drop>=0?'↓':'↑'} ${Math.abs(drop)}%</span>` : ''}
    </div>`;
  } else if (item.catalogKey) {
    priceHtml = `<div style="font-size:.74rem;color:var(--text3);margin-top:4px">⏳ Čekám na cenu z komunity...</div>`;
  }

  // Alert badge
  let alertHtml = '';
  if (item.alertPct > 0) {
    alertHtml = `<span style="font-size:.7rem;padding:2px 8px;border-radius:6px;background:${triggered?'rgba(74,222,128,.2)':'rgba(96,165,250,.15)'};color:${triggered?'var(--income)':'var(--bank)'};border:1px solid ${triggered?'rgba(74,222,128,.3)':'rgba(96,165,250,.2)'};display:inline-flex;align-items:center;gap:4px">
      ${triggered ? '🎉' : '🔔'} Hlídám −${item.alertPct}%
    </span>`;
  }

  return `<div class="tx-table-row" style="${triggered?'background:rgba(74,222,128,.04);border-left:3px solid var(--income);':''}padding:12px 14px;margin-bottom:6px;border-radius:10px">
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="font-size:1rem">${item.icon||'🛒'}</span>
        <span style="font-weight:600;font-size:.92rem">${item.name}</span>
        ${item.qty > 1 ? `<span style="font-size:.74rem;color:var(--text3)">× ${item.qty}</span>` : ''}
        ${alertHtml}
        ${triggered ? `<span style="font-size:.72rem;background:rgba(74,222,128,.2);color:var(--income);padding:2px 8px;border-radius:6px;font-weight:700;animation:pulse 2s infinite">🎉 SLEVA!</span>` : ''}
      </div>
      ${item.note ? `<div style="font-size:.74rem;color:var(--text3);margin-top:3px">📝 ${item.note}</div>` : ''}
      ${priceHtml}
      ${item.refPrice ? `<div style="font-size:.72rem;color:var(--text3);margin-top:2px">Referenční cena: ${fmtP(item.refPrice)} Kč${item.alertPct ? ` · alert při −${item.alertPct}% = ${fmtP(item.refPrice*(1-item.alertPct/100))} Kč` : ''}</div>` : ''}
    </div>
    ${!ro ? `<div style="display:flex;gap:4px;align-items:center;flex-shrink:0;margin-left:10px">
      <button class="btn btn-ghost btn-icon btn-sm" onclick="openNakupPriceHistory('${item.id}')" title="Historie cen">📊</button>
      <button class="btn btn-edit btn-icon btn-sm" onclick="openNakupEdit('${item.id}')">✎</button>
      <button class="btn btn-danger btn-icon btn-sm" onclick="nakupDelete('${item.id}')">✕</button>
    </div>` : ''}
  </div>`;
}

function nakupSetFilter(f, btn) {
  _nakupFilter = f;
  document.querySelectorAll('#nakupContent .tx-filt-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const el = document.getElementById('nakupList');
  if (el) el.innerHTML = nakupBuildList();
}

// ══════════════════════════════════════════════════════
//  MODAL – PŘIDAT / UPRAVIT
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

  // Lazy load katalogu pro autocomplete
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
  const pct = val / 50 * 100; // max 50%
  slider.style.background = `linear-gradient(to right, var(--income) 0%, var(--income) ${pct}%, var(--surface3) ${pct}%, var(--surface3) 100%)`;
}

function nakupUpdateAlertPreview() {
  const refPrice = parseFloat(document.getElementById('nakupItemRefPrice').value) || 0;
  const alertPct = parseInt(document.getElementById('nakupAlertSlider').value) || 0;
  const el = document.getElementById('nakupAlertPreview'); if (!el) return;

  if (!alertPct) {
    el.innerHTML = '<span style="color:var(--text3)">Hlídání vypnuto</span>';
    return;
  }
  if (!refPrice) {
    el.innerHTML = '<span style="color:var(--text3)">Zadej referenční cenu pro výpočet</span>';
    return;
  }
  const targetPrice = refPrice * (1 - alertPct / 100);
  el.innerHTML = `<span style="color:var(--income)">🔔 Upozornění při ceně ≤ <strong>${fmtP(targetPrice)} Kč</strong> (−${alertPct}% z ${fmtP(refPrice)} Kč)</span>`;
}

async function nakupShowCatalogSuggest(val) {
  const el = document.getElementById('nakupCatalogSuggest'); if (!el) return;
  const q = (val || '').toLowerCase().trim();
  if (q.length < 2) { el.style.display = 'none'; return; }
  if (!_nakupCatalog.length) await nakupLoadCatalog();

  const matches = _nakupCatalog
    .filter(c => c.name.toLowerCase().includes(q))
    .slice(0, 8);

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

  // Předvyplň referenční cenu z katalogu
  const catItem = _nakupCatalog.find(c => c.key === key);
  if (catItem?.latestPrice && !document.getElementById('nakupItemRefPrice').value) {
    document.getElementById('nakupItemRefPrice').value = catItem.latestPrice;
    nakupUpdateAlertPreview();
  }
}

function saveNakupItem() {
  if (viewingUid) return;
  const eid      = document.getElementById('editNakupId').value;
  const name     = document.getElementById('nakupItemName').value.trim();
  const qty      = parseInt(document.getElementById('nakupItemQty').value) || 1;
  const note     = document.getElementById('nakupItemNote').value.trim();
  const refPrice = parseFloat(document.getElementById('nakupItemRefPrice').value) || 0;
  const alertPct = parseInt(document.getElementById('nakupAlertSlider').value) || 0;
  const alertEmail = document.getElementById('nakupAlertEmail').value.trim();
  const catalogKey = document.getElementById('nakupCatalogKey').value.trim();

  if (!name) { alert('Zadej název produktu'); return; }

  // Ikona podle kategorie
  const icons = {rohlík:'🥐',mléko:'🥛',vejce:'🥚',máslo:'🧈',chléb:'🍞',káva:'☕',čaj:'🫖',pivo:'🍺',víno:'🍷',
    šampón:'🧴',zubní:'🪥',wc:'🧻',prací:'🧺',jablko:'🍎',banán:'🍌',limonáda:'🥤',džus:'🥤',
  };
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
  renderNakup();
}

function nakupDelete(id) {
  if (viewingUid) return;
  if (!confirm('Odebrat ze seznamu?')) return;
  S.nakupList = (S.nakupList || []).filter(i => i.id !== id);
  save();
  renderNakup();
}

// ══════════════════════════════════════════════════════
//  MODAL – HISTORIE CEN
// ══════════════════════════════════════════════════════
async function openNakupPriceHistory(itemId) {
  const item = _nakupItems.find(i => i.id === itemId); if (!item) return;
  const modal = document.getElementById('modalNakupHistory'); if (!modal) return;

  document.getElementById('nakupHistoryTitle').textContent = item.name;
  document.getElementById('nakupHistoryContent').innerHTML =
    '<div style="text-align:center;padding:20px;color:var(--text3)">⏳ Načítám historii...</div>';
  modal.classList.add('open');

  const key = item.catalogKey || nakupNormKey(item.name);
  const prices = await nakupLoadPriceHistory(key);

  const el = document.getElementById('nakupHistoryContent'); if (!el) return;

  if (!prices.length) {
    el.innerHTML = `<div class="empty"><div class="ei">📊</div><div class="et">Zatím žádná data</div>
      <div style="font-size:.78rem;color:var(--text3);margin-top:8px">Ceny se plní automaticky ze skenovaných účtenek komunity.<br>Naskenuj účtenku s tímto produktem!</div></div>`;
    return;
  }

  // Graf + tabulka
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

  // Mini line chart
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

    // Grid
    ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.lineWidth=1; ctx.setLineDash([3,4]);
    [minP, avgP, maxP].forEach(v => {
      ctx.beginPath(); ctx.moveTo(pad.l, yf(v)); ctx.lineTo(W-pad.r, yf(v)); ctx.stroke();
    });
    ctx.setLineDash([]);

    // Gradient area
    const grad = ctx.createLinearGradient(0,pad.t,0,160-pad.b);
    grad.addColorStop(0,'rgba(74,222,128,.3)'); grad.addColorStop(1,'rgba(74,222,128,0)');
    ctx.beginPath(); ctx.moveTo(xf(0), 160-pad.b);
    prices.forEach((p,i) => ctx.lineTo(xf(i), yf(p.price)));
    ctx.lineTo(xf(n-1), 160-pad.b); ctx.closePath();
    ctx.fillStyle=grad; ctx.fill();

    // Line
    ctx.strokeStyle='#4ade80'; ctx.lineWidth=2; ctx.beginPath();
    prices.forEach((p,i) => i===0 ? ctx.moveTo(xf(i),yf(p.price)) : ctx.lineTo(xf(i),yf(p.price)));
    ctx.stroke();

    // Dots
    prices.forEach((p,i) => {
      ctx.beginPath(); ctx.arc(xf(i),yf(p.price),3,0,Math.PI*2);
      ctx.fillStyle='#4ade80'; ctx.fill();
    });

    // Ref price line
    if (item.refPrice && item.refPrice >= minP && item.refPrice <= maxP) {
      ctx.strokeStyle='rgba(251,191,36,.7)'; ctx.lineWidth=1; ctx.setLineDash([4,3]);
      ctx.beginPath(); ctx.moveTo(pad.l,yf(item.refPrice)); ctx.lineTo(W-pad.r,yf(item.refPrice)); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle='rgba(251,191,36,.8)'; ctx.font='9px Instrument Sans';
      ctx.textAlign='left'; ctx.fillText('ref '+fmtP(item.refPrice)+' Kč', pad.l+4, yf(item.refPrice)-3);
    }

    // Alert threshold line
    if (item.alertPct && item.refPrice) {
      const thr = item.refPrice * (1 - item.alertPct/100);
      if (thr >= minP) {
        ctx.strokeStyle='rgba(96,165,250,.6)'; ctx.lineWidth=1; ctx.setLineDash([3,3]);
        ctx.beginPath(); ctx.moveTo(pad.l,yf(thr)); ctx.lineTo(W-pad.r,yf(thr)); ctx.stroke();
        ctx.setLineDash([]); ctx.fillStyle='rgba(96,165,250,.7)'; ctx.font='9px Instrument Sans';
        ctx.textAlign='left'; ctx.fillText('alert −'+item.alertPct+'%', pad.l+4, yf(thr)-3);
      }
    }

    // Y labels
    ctx.fillStyle='rgba(168,173,196,.7)'; ctx.font='9px Instrument Sans'; ctx.textAlign='right'; ctx.setLineDash([]);
    [minP, Math.round(avgP), maxP].forEach(v => ctx.fillText(fmtP(v), pad.l-4, yf(v)+3));

    // X labels
    ctx.textAlign='center'; ctx.fillStyle='rgba(168,173,196,.7)';
    const step = Math.max(1, Math.floor(n/5));
    prices.forEach((p,i) => { if(i%step===0||i===n-1) ctx.fillText(fmtD(p.date), xf(i), 160-8); });
  }, 50);
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

      // Unikátní klíč záznamu: datum + uid (aby neduplikoval)
      const recordKey = today.replace(/-/g,'') + '_' + (window._currentUser.uid||'anon').slice(0,8);
      updates[`catalog/prices/${key}/${recordKey}`] = {
        price: parseFloat(it.price.toFixed(2)),
        date:  today,
        store: store || 'Neznámý',
        uid:   window._currentUser.uid
      };

      // Agregace: aktualizuj latestPrice, priceMin, priceMax na items záznamu
      // (číst aktuální hodnoty a přepsat nestačí, použijeme transaction-like update s known state)
      updates[`catalog/items/${key}/latestPrice`] = parseFloat(it.price.toFixed(2));
      updates[`catalog/items/${key}/latestDate`]  = today;
      updates[`catalog/items/${key}/latestStore`] = store || 'Neznámý';
      updates[`catalog/items/${key}/name`] = it.name;
      // priceCount: inkrementujeme přes Firebase server value nelze, použijeme timestamp count z prices
      // Bude spočítán při načtení z délky catalog/prices/{key}
    });

    if (Object.keys(updates).length > 0) {
      await _update(_ref(_db), updates);
      // Invalidate cache
      _nakupCatalog = [];
      _nakupCatalogCache = {};
      // Zkontroluj alerty
      await checkPriceAlerts();
    }
  } catch(e) { console.log('publishPricesToCatalog error', e); }
}

// ══════════════════════════════════════════════════════
//  KONTROLA ALERTŮ PO AKTUALIZACI CEN
// ══════════════════════════════════════════════════════
async function checkPriceAlerts() {
  if (!S.nakupList?.length) return;
  await nakupLoadCatalog(); // refresh

  const triggered = S.nakupList.filter(item => {
    if (!item.alertPct || !item.refPrice || !item.catalogKey) return false;
    const catItem = _nakupCatalog.find(c => c.key === item.catalogKey);
    if (!catItem?.latestPrice) return false;
    const drop = (item.refPrice - catItem.latestPrice) / item.refPrice * 100;
    return drop >= item.alertPct;
  });

  if (!triggered.length) return;

  // Zobraz in-app notifikaci
  triggered.forEach(item => {
    const catItem = _nakupCatalog.find(c => c.key === item.catalogKey);
    const drop = Math.round((item.refPrice - catItem.latestPrice) / item.refPrice * 100);
    showNakupAlert(item, catItem.latestPrice, drop);
  });

  // Email alert přes Worker (pokud má uživatel zadaný email)
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
      onclick="showPage('nakup',null)">
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
    const D = getData();
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

