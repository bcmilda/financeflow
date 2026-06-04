// ══════════════════════════════════════════════════════
//  FINANČNÍ AKTIVA – FinanceFlow v6.50
//  Správa majetku: nemovitosti, investice, vozidla, vlastní
// ══════════════════════════════════════════════════════

const ASSET_TYPES = {
  property:   { label: 'Nemovitosti', icon: '🏠', color: '#f59e0b', examples: 'Byt, dům, chata, pozemek' },
  investment: { label: 'Investice',   icon: '📈', color: '#10b981', examples: 'ETF, akcie, dluhopisy, krypto' },
  vehicle:    { label: 'Vozidla',     icon: '🚗', color: '#6366f1', examples: 'Auto, motorka, přívěs' },
  savings:    { label: 'Spoření',     icon: '🏦', color: '#06b6d4', examples: 'Stavební spoření, penzijní fond' },
  custom:     { label: 'Ostatní',     icon: '💎', color: '#ec4899', examples: 'Umění, šperky, jiný majetek' },
};

const ASSET_TABS = ['property','investment','vehicle','savings','custom'];

let _assetsTab = 'property'; // aktivní záložka

// ══════════════════════════════════════════════════════
//  HLAVNÍ RENDER
// ══════════════════════════════════════════════════════
function renderAssets() {
  const el = document.getElementById('assetsContent'); if (!el) return;
  const D  = getData();
  if (!D.assets) D.assets = [];

  const totalAssets  = D.assets.reduce((s, a) => s + (a.value || 0), 0);
  const totalDebts   = (D.debts || []).reduce((s, d) => s + (d.remaining || 0), 0);
  const totalWallets = (D.wallets || []).reduce((s, w) => s + (w.balance || 0), 0);
  const netWorth     = totalAssets + totalWallets - totalDebts;

  el.innerHTML = `
    <!-- Net Worth souhrn -->
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:14px;padding:14px 16px;margin-bottom:16px">
      <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:8px">💎 Čisté jmění (Net Worth)</div>
      <div style="font-size:1.6rem;font-weight:800;font-family:Syne,sans-serif;color:${netWorth>=0?'var(--income)':'var(--expense)'};margin-bottom:10px">
        ${fmtP(netWorth)} Kč
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        <div style="text-align:center;padding:8px;background:var(--surface3);border-radius:10px">
          <div style="font-size:.92rem;font-weight:700;color:var(--income)">${fmtP(totalAssets)} Kč</div>
          <div style="font-size:.68rem;color:var(--text3)">Aktiva</div>
        </div>
        <div style="text-align:center;padding:8px;background:var(--surface3);border-radius:10px">
          <div style="font-size:.92rem;font-weight:700;color:var(--bank)">${fmtP(totalWallets)} Kč</div>
          <div style="font-size:.68rem;color:var(--text3)">Peněženky</div>
        </div>
        <div style="text-align:center;padding:8px;background:var(--surface3);border-radius:10px">
          <div style="font-size:.92rem;font-weight:700;color:${totalDebts>0?'var(--expense)':'var(--text3)'}">−${fmtP(totalDebts)} Kč</div>
          <div style="font-size:.68rem;color:var(--text3)">Závazky</div>
        </div>
      </div>
    </div>

    <!-- Session 10 TODO-090: Asset Allocation – rozložení majetku -->
    <div id="assetAllocationCard"></div>

    <!-- Záložky typů aktiv -->
    <div style="display:flex;gap:3px;margin-bottom:14px;overflow-x:auto;padding-bottom:2px">
      ${ASSET_TABS.map(t => {
        const type = ASSET_TYPES[t];
        const count = D.assets.filter(a => a.type === t).length;
        return `<button onclick="assetsSetTab('${t}')"
          style="flex-shrink:0;padding:7px 10px;border:none;border-radius:9px;font-size:.74rem;font-weight:${_assetsTab===t?700:500};cursor:pointer;transition:all .15s;white-space:nowrap;
            background:${_assetsTab===t?type.color+'22':'var(--surface2)'};
            color:${_assetsTab===t?type.color:'var(--text3)'};
            border:1px solid ${_assetsTab===t?type.color+'44':'var(--border)'}">
          ${type.icon} ${type.label}${count?` <span style="opacity:.7">(${count})</span>`:''}
        </button>`;
      }).join('')}
    </div>

    <!-- Obsah záložky -->
    <div id="assetsTabContent"></div>
  `;

  renderAssetsTab(D);
  // Session 10 TODO-090: vykresli alokační donut
  renderAssetAllocation(D);
}

// ══════════════════════════════════════════════════════
//  TODO-090 (Session 10): ASSET ALLOCATION – donut + legenda
//  Rozložení majetku dle typu (nemovitosti/investice/vozidla/spoření/ostatní)
//  + peněženky. Donut chart jako SVG (bez canvas závislosti).
// ══════════════════════════════════════════════════════
function renderAssetAllocation(D) {
  const cont = document.getElementById('assetAllocationCard');
  if (!cont) return;
  D = D || getData();
  const nw = computeAssetsNetWorth(D);

  // Sestav segmenty: typy aktiv + peněženky
  const segs = [];
  ASSET_TABS.forEach(t => {
    const v = nw.byType[t] || 0;
    if (v > 0) segs.push({ name: ASSET_TYPES[t].label, color: ASSET_TYPES[t].color, icon: ASSET_TYPES[t].icon, value: v });
  });
  if ((nw.totalWallets||0) > 0) segs.push({ name: 'Peněženky', color: '#94a3b8', icon: '👛', value: nw.totalWallets });

  const total = segs.reduce((s,x)=>s+x.value,0);
  if (!segs.length || total <= 0) {
    cont.innerHTML = `<div class="card" style="margin-bottom:16px"><div class="card-body" style="text-align:center;padding:18px;color:var(--text3);font-size:.8rem">
      📊 Přidej aktiva pro zobrazení rozložení majetku</div></div>`;
    return;
  }

  segs.sort((a,b)=>b.value-a.value);

  // SVG donut – conic přes stroke-dasharray na kružnici
  const R = 52, CX = 60, CY = 60, C = 2 * Math.PI * R;
  let offset = 0;
  const arcs = segs.map(s => {
    const frac = s.value / total;
    const dash = C * frac;
    const arc = `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${s.color}" stroke-width="14"
      stroke-dasharray="${dash} ${C-dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${CX} ${CY})"
      style="transition:stroke-dashoffset .5s"/>`;
    offset += dash;
    return arc;
  }).join('');

  const legend = segs.map(s => {
    const pct = Math.round(s.value/total*100);
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;font-size:.76rem">
      <span style="display:flex;align-items:center;gap:6px"><span style="width:9px;height:9px;border-radius:2px;background:${s.color};display:inline-block"></span>${s.icon} ${s.name}</span>
      <span style="color:var(--text3)"><strong style="color:var(--text)">${fmtP(s.value)} Kč</strong> · ${pct}%</span>
    </div>`;
  }).join('');

  cont.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><span class="card-title">📊 Rozložení majetku</span></div>
      <div class="card-body" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
        <svg viewBox="0 0 120 120" style="width:120px;height:120px;flex-shrink:0">
          ${arcs}
          <text x="60" y="56" text-anchor="middle" font-size="9" fill="var(--text3)">Celkem</text>
          <text x="60" y="70" text-anchor="middle" font-size="11" font-weight="700" fill="var(--text)">${(total/1000).toFixed(0)}k</text>
        </svg>
        <div style="flex:1;min-width:160px">${legend}</div>
      </div>
    </div>`;
}

function assetsSetTab(tab) {
  _assetsTab = tab;
  const D = getData();
  renderAssetsTab(D);
  // Aktualizuj styly tlačítek
  renderAssets();
}

function renderAssetsTab(D) {
  const el = document.getElementById('assetsTabContent'); if (!el) return;
  const type    = ASSET_TYPES[_assetsTab];
  const assets  = (D.assets || []).filter(a => a.type === _assetsTab);
  const tabTotal = assets.reduce((s, a) => s + (a.value || 0), 0);

  el.innerHTML = `
    <!-- Záhlaví záložky -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div>
        <div style="font-size:.86rem;font-weight:700">${type.icon} ${type.label}</div>
        ${tabTotal > 0 ? `<div style="font-size:.74rem;color:var(--text3)">Celkem: <strong style="color:${type.color}">${fmtP(tabTotal)} Kč</strong></div>` : ''}
      </div>
      ${!viewingUid ? `<button class="btn btn-accent btn-sm" onclick="openAssetModal()">+ Přidat</button>` : ''}
    </div>

    <!-- Seznam aktiv -->
    ${assets.length ? assets.map(a => assetBuildCard(a, type)).join('') : `
      <div class="empty" style="padding:32px">
        <div class="ei">${type.icon}</div>
        <div class="et">Žádná ${type.label.toLowerCase()}</div>
        <div style="font-size:.76rem;color:var(--text3);margin-top:6px">${type.examples}</div>
        ${!viewingUid ? `<div style="margin-top:12px"><button class="btn btn-accent btn-sm" onclick="openAssetModal()">+ Přidat první</button></div>` : ''}
      </div>`}
  `;
}

function assetBuildCard(asset, type) {
  const ro = viewingUid !== null;
  return `
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:10px;display:flex;align-items:flex-start;gap:12px">
      <!-- Ikona -->
      <div style="width:40px;height:40px;border-radius:10px;background:${type.color}22;display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0">
        ${asset.icon || type.icon}
      </div>
      <!-- Info -->
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:.9rem;margin-bottom:2px">${asset.name}</div>
        ${asset.note ? `<div style="font-size:.74rem;color:var(--text3);margin-bottom:4px">${asset.note}</div>` : ''}
        <div style="font-size:1.1rem;font-weight:800;font-family:Syne,sans-serif;color:${type.color}">${fmtP(asset.value || 0)} Kč</div>
        ${asset.updatedAt ? `<div style="font-size:.68rem;color:var(--text3);margin-top:3px">Aktualizováno: ${fmtD(new Date(asset.updatedAt).toISOString().slice(0,10))}</div>` : ''}
      </div>
      <!-- Akce -->
      ${!ro ? `<div style="display:flex;gap:4px;flex-shrink:0">
        <button class="btn btn-edit btn-icon btn-sm" onclick="openAssetModal('${asset.id}')">✎</button>
        <button class="btn btn-danger btn-icon btn-sm" onclick="assetDelete('${asset.id}')">✕</button>
      </div>` : ''}
    </div>`;
}

// ══════════════════════════════════════════════════════
//  MODAL – přidat / upravit aktivum
// ══════════════════════════════════════════════════════
function openAssetModal(editId) {
  if (viewingUid) return;
  const modal = document.getElementById('modalAsset'); if (!modal) return;
  const D     = getData();
  const asset = editId ? (D.assets || []).find(a => a.id === editId) : null;

  document.getElementById('editAssetId').value    = editId || '';
  document.getElementById('assetName').value      = asset?.name || '';
  document.getElementById('assetValue').value     = asset?.value || '';
  document.getElementById('assetNote').value      = asset?.note || '';
  document.getElementById('assetIcon').value      = asset?.icon || ASSET_TYPES[_assetsTab].icon;
  document.getElementById('assetType').value      = asset?.type || _assetsTab;
  document.getElementById('assetModalTitle').textContent = editId ? 'Upravit aktivum' : 'Nové aktivum';

  // Nastav příklady dle vybraného typu
  assetUpdateTypeHint();
  modal.classList.add('open');
}

function assetUpdateTypeHint() {
  const type = document.getElementById('assetType')?.value;
  const el   = document.getElementById('assetTypeHint'); if (!el) return;
  const info = ASSET_TYPES[type] || ASSET_TYPES.custom;
  el.textContent = info.examples;
  el.style.color = info.color;
  // Session 11: při změně typu nastav výchozí ikonu typu (pokud uživatel nemá vlastní)
  const inp = document.getElementById('assetIcon');
  if (inp) {
    const defaults = Object.values(ASSET_TYPES).map(t => t.icon);
    if (!inp.value || defaults.includes(inp.value)) inp.value = info.icon;
  }
  assetRenderIconPicker();
}

// Výběr ikon (Session 11) – nabídka dle typu, klik nastaví ikonu
const ASSET_ICONS = {
  property:   ['🏠','🏢','🏡','🏘️','🏖️','🌳','🏚️','🅿️'],
  investment: ['📈','💹','🪙','💰','📊','🏦','💵','₿'],
  vehicle:    ['🚗','🏍️','🚙','🚐','🚲','⛵','✈️','🚛'],
  savings:    ['🏦','🐷','💰','💵','🪙','💳','📅','🧧'],
  custom:     ['💎','🎨','⌚','💍','🖼️','🎸','📦','🏺'],
};
function assetRenderIconPicker() {
  const el = document.getElementById('assetIconPicker'); if (!el) return;
  const type = document.getElementById('assetType')?.value || 'custom';
  const cur  = (document.getElementById('assetIcon')?.value || '').trim();
  const icons = ASSET_ICONS[type] || ASSET_ICONS.custom;
  el.innerHTML = icons.map(ic => {
    const sel = ic === cur;
    return `<button type="button" onclick="assetPickIcon('${ic}')" title="${ic}"
      style="font-size:1.25rem;width:38px;height:38px;border-radius:9px;cursor:pointer;
      border:1.5px solid ${sel ? 'var(--accent,#4ade80)' : 'var(--border)'};
      background:${sel ? 'rgba(74,222,128,.14)' : 'var(--surface2)'}">${ic}</button>`;
  }).join('');
}
function assetPickIcon(ic) {
  const inp = document.getElementById('assetIcon');
  if (inp) inp.value = ic;
  assetRenderIconPicker();
}

function saveAsset() {
  if (viewingUid) return;
  const eid  = document.getElementById('editAssetId').value;
  const name = document.getElementById('assetName').value.trim();
  const val  = parseFloat(document.getElementById('assetValue').value) || 0;
  const note = document.getElementById('assetNote').value.trim();
  const icon = document.getElementById('assetIcon').value.trim();
  const type = document.getElementById('assetType').value;

  if (!name)  { alert('Zadej název aktiva'); return; }
  if (!val)   { alert('Zadej hodnotu aktiva'); return; }

  const D = getData();
  if (!D.assets) D.assets = [];

  const obj = {
    id:        eid || uid(),
    name, value: val, note, icon, type,
    updatedAt: Date.now(),
  };

  if (eid) {
    const idx = D.assets.findIndex(a => a.id === eid);
    if (idx >= 0) D.assets[idx] = obj; else D.assets.push(obj);
  } else {
    D.assets.push(obj);
  }

  S.assets = D.assets;
  _assetsTab = type; // přepni na záložku uloženého aktiva
  save();
  closeModal('modalAsset');
  renderAssets();
}

function assetDelete(id) {
  if (viewingUid) return;
  if (!confirm('Smazat toto aktivum?')) return;
  S.assets = (S.assets || []).filter(a => a.id !== id);
  save();
  renderAssets();
}

// ══════════════════════════════════════════════════════
//  HELPER – Net Worth pro report poradce (advisor.js)
// ══════════════════════════════════════════════════════
function computeAssetsNetWorth(D) {
  D = D || getData();
  const assets  = D.assets || [];
  const wallets = D.wallets || [];
  const debts   = D.debts || [];

  const totalAssets  = assets.reduce((s, a) => s + (a.value || 0), 0);
  const totalWallets = wallets.reduce((s, w) => s + (w.balance || 0), 0);
  const totalDebts   = debts.reduce((s, d) => s + (d.remaining || 0), 0);

  // Struktura aktiv dle typu
  const byType = {};
  ASSET_TABS.forEach(t => {
    byType[t] = assets.filter(a => a.type === t).reduce((s, a) => s + (a.value || 0), 0);
  });
  byType.wallets = totalWallets;

  return {
    totalAssets,
    totalWallets,
    totalDebts,
    netWorth:   totalAssets + totalWallets - totalDebts,
    byType,
    assets,
    wallets,
    debts,
  };
}
