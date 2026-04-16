// ══════════════════════════════════════════════════════
//  DETEKCE DUPLIKÁTŮ – FinanceFlow v6.37
// ══════════════════════════════════════════════════════

// ── Konfigurace ──
const DUP_CONFIG = {
  EXACT_DAYS:    0,    // stejný datum + částka = přesný duplikát
  FUZZY_DAYS:    5,    // ±5 dní = opožděné zaúčtování
  NAME_SIM_THR:  0.72, // práh podobnosti názvu (Jaro-Winkler)
  IGNORE_CATS:   ['transfer'], // přesuny mezi peněženkami ignoruj
};

// ── Stav ──
let _dupMap = {};        // txId → [{ otherId, score, reason }]
let _dupIgnored = {};    // txId → true (uživatel označil "není duplikát")
let _dupFilterOn = false;

// ══════════════════════════════════════════════════════
//  JARO-WINKLER PODOBNOST NÁZVŮ
// ══════════════════════════════════════════════════════
function jaroSimilarity(s1, s2) {
  if (s1 === s2) return 1;
  const len1 = s1.length, len2 = s2.length;
  if (!len1 || !len2) return 0;
  const matchDist = Math.floor(Math.max(len1, len2) / 2) - 1;
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);
  let matches = 0, transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDist);
    const end   = Math.min(i + matchDist + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = s2Matches[j] = true;
      matches++; break;
    }
  }
  if (!matches) return 0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k++]) transpositions++;
  }
  return (matches/len1 + matches/len2 + (matches - transpositions/2)/matches) / 3;
}

function jaroWinkler(s1, s2) {
  const jaro = jaroSimilarity(s1, s2);
  let prefix = 0;
  for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) prefix++; else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

function nameSim(a, b) {
  const n = s => (s||'').toLowerCase()
    .replace(/[,.\-–]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return jaroWinkler(n(a), n(b));
}

// ══════════════════════════════════════════════════════
//  HLAVNÍ DETEKČNÍ ENGINE
// ══════════════════════════════════════════════════════
function detectDuplicates(transactions) {
  const result = {}; // txId → [{otherId, score, reason, type}]

  // Filtruj přesuny a ignorované transakce
  const txs = (transactions || []).filter(t =>
    !DUP_CONFIG.IGNORE_CATS.includes(t.catId) &&
    !DUP_CONFIG.IGNORE_CATS.includes(t.category) &&
    !_dupIgnored[t.id]
  );

  for (let i = 0; i < txs.length; i++) {
    for (let j = i + 1; j < txs.length; j++) {
      const a = txs[i], b = txs[j];
      const amtA = a.amount || a.amt || 0;
      const amtB = b.amount || b.amt || 0;

      // Různý typ (příjem vs výdaj) = nikdy duplikát
      if (a.type !== b.type) continue;
      // Různá částka = přeskočit (tolerance ±0.01 pro float)
      if (Math.abs(amtA - amtB) > 0.01) continue;
      if (amtA === 0) continue;

      const dA = new Date(a.date), dB = new Date(b.date);
      const dayDiff = Math.abs((dA - dB) / 86400000);

      let type = null, score = 0, reason = '';

      // ── Pravidlo 1: Přesný duplikát ──
      // Stejná částka + stejný datum + stejná kategorie
      if (dayDiff === 0 && (a.catId||a.category) === (b.catId||b.category)) {
        type = 'exact';
        score = 1.0;
        reason = `Stejná částka ${fmt(amtA)} Kč, datum ${a.date}, kategorie`;
      }

      // ── Pravidlo 2: Opožděné zaúčtování ──
      // Stejná částka ±5 dní + stejná kategorie
      else if (dayDiff > 0 && dayDiff <= DUP_CONFIG.FUZZY_DAYS &&
               (a.catId||a.category) === (b.catId||b.category)) {
        type = 'delayed';
        score = 0.6 + (1 - dayDiff / DUP_CONFIG.FUZZY_DAYS) * 0.3;
        reason = `Stejná částka ${fmt(amtA)} Kč, rozdíl ${Math.round(dayDiff)} ${dayDiff === 1 ? 'den' : 'dny/dní'}`;
      }

      // ── Pravidlo 3: Podobný název + stejná částka ──
      // Fuzzy match názvu ≥ práh (Jaro-Winkler)
      else if (a.name && b.name) {
        const sim = nameSim(a.name, b.name);
        if (sim >= DUP_CONFIG.NAME_SIM_THR && dayDiff <= 31) {
          type = 'fuzzy_name';
          score = sim * 0.9;
          reason = `Podobný název "${a.name}" / "${b.name}" (${Math.round(sim*100)}% shoda)`;
        }
      }

      if (!type) continue;

      // Přidej do mapy obou transakcí
      if (!result[a.id]) result[a.id] = [];
      if (!result[b.id]) result[b.id] = [];
      result[a.id].push({ otherId: b.id, score, reason, type, otherDate: b.date, otherName: b.name });
      result[b.id].push({ otherId: a.id, score, reason, type, otherDate: a.date, otherName: a.name });
    }
  }

  // Seřaď každou skupinu dle skóre
  Object.values(result).forEach(arr => arr.sort((a,b) => b.score - a.score));
  return result;
}

// ══════════════════════════════════════════════════════
//  SLOUČENÍ / SMAZÁNÍ
// ══════════════════════════════════════════════════════
function dupMerge(keepId, deleteId) {
  if (viewingUid) return;
  const D = getData();
  const keep   = (D.transactions||[]).find(t => t.id == keepId);
  const del    = (D.transactions||[]).find(t => t.id == deleteId);
  if (!keep || !del) return;

  const amt = keep.amount || keep.amt || 0;
  const amtD = del.amount || del.amt || 0;
  if (!confirm(`Smazat duplikát?\n\n✅ Zachovat: "${keep.name}" · ${fmtP(amt)} Kč · ${keep.date}\n🗑 Smazat:   "${del.name}" · ${fmtP(amtD)} Kč · ${del.date}`)) return;

  S.transactions = S.transactions.filter(t => t.id != deleteId);
  // Odeber z _dupIgnored i _dupMap
  delete _dupMap[keepId];
  delete _dupMap[deleteId];
  save();
  renderTx();
  showToast('✅ Duplikát smazán');
}

function dupDelete(txId) {
  if (viewingUid) return;
  const D = getData();
  const t = (D.transactions||[]).find(x => x.id == txId);
  if (!t) return;
  const amt = t.amount || t.amt || 0;
  if (!confirm(`Smazat transakci?\n"${t.name}" · ${fmtP(amt)} Kč · ${t.date}`)) return;

  S.transactions = S.transactions.filter(x => x.id != txId);
  delete _dupMap[txId];
  save();
  renderTx();
  showToast('✅ Transakce smazána');
}

function dupIgnore(txId, otherId) {
  // Označit pár jako "není duplikát"
  _dupIgnored[txId + '_' + otherId] = true;
  _dupIgnored[otherId + '_' + txId] = true;
  // Odeber z _dupMap
  if (_dupMap[txId])    _dupMap[txId]    = _dupMap[txId].filter(d => d.otherId != otherId);
  if (_dupMap[otherId]) _dupMap[otherId] = _dupMap[otherId].filter(d => d.otherId != txId);
  if (!_dupMap[txId]?.length)    delete _dupMap[txId];
  if (!_dupMap[otherId]?.length) delete _dupMap[otherId];
  renderTx();
  showToast('👍 Označeno jako unikátní');
}

// ══════════════════════════════════════════════════════
//  FILTR "Podezřelé"
// ══════════════════════════════════════════════════════
function toggleDupFilter(btn) {
  _dupFilterOn = !_dupFilterOn;
  if (btn) {
    btn.classList.toggle('active', _dupFilterOn);
    btn.style.background = _dupFilterOn ? 'rgba(251,191,36,.2)' : '';
    btn.style.color = _dupFilterOn ? 'var(--debt)' : '';
  }
  renderTx();
}

function getDupFilterActive() { return _dupFilterOn; }

// ══════════════════════════════════════════════════════
//  BANNER – souhrn pro header stránky Transakce
// ══════════════════════════════════════════════════════
function renderDupBanner(dupMap) {
  const el = document.getElementById('dupBanner'); if (!el) return;
  const count = Object.keys(dupMap).length;
  if (!count) { el.style.display = 'none'; return; }

  // Počet unikátních párů (každý pár je 2× v mapě)
  const pairCount = Math.ceil(count / 2);
  const exactCount = Object.values(dupMap).flat().filter(d => d.type === 'exact').length / 2;

  el.style.display = 'block';
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;
      background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.3);
      border-radius:10px;margin-bottom:12px;flex-wrap:wrap">
      <span style="font-size:1.1rem">⚠️</span>
      <div style="flex:1;min-width:0">
        <span style="font-size:.84rem;font-weight:600;color:var(--debt)">
          ${pairCount} podezřelých ${pairCount===1?'pár':'párů'}
        </span>
        <span style="font-size:.78rem;color:var(--text3);margin-left:8px">
          ${exactCount > 0 ? `${Math.round(exactCount)} přesných duplikátů · ` : ''}
          Zkontrolujte transakce označené ⚠️
        </span>
      </div>
      <button class="tx-filt-btn ${_dupFilterOn ? 'active' : ''}" id="dupFilterBtn"
        style="${_dupFilterOn ? 'background:rgba(251,191,36,.2);color:var(--debt)' : ''}"
        onclick="toggleDupFilter(this)">
        ⚠️ Zobrazit jen podezřelé
      </button>
    </div>`;
}

// ══════════════════════════════════════════════════════
//  INLINE BADGE + AKČNÍ TLAČÍTKA (volá buildTxRow)
// ══════════════════════════════════════════════════════
function buildDupBadge(t, dupMap) {
  const dups = dupMap[t.id];
  if (!dups?.length) return '';

  const best = dups[0]; // nejvyšší skóre
  const typeLabels = {
    exact:       { icon: '🔴', label: 'Přesný duplikát',    color: 'var(--expense)' },
    delayed:     { icon: '🟡', label: 'Možný duplikát',     color: 'var(--debt)'    },
    fuzzy_name:  { icon: '🟠', label: 'Podobná transakce',  color: 'var(--debt)'    },
  };
  const lbl = typeLabels[best.type] || typeLabels.delayed;

  return `<span class="dup-badge" style="
    display:inline-flex;align-items:center;gap:4px;font-size:.68rem;font-weight:700;
    padding:2px 8px;border-radius:6px;cursor:pointer;
    background:rgba(251,191,36,.15);color:${lbl.color};
    border:1px solid rgba(251,191,36,.3)"
    title="${best.reason}"
    onclick="event.stopPropagation();openDupDetail('${t.id}')">
    ${lbl.icon} ${lbl.label}
  </span>`;
}

function buildDupActions(t, dupMap, ro) {
  const dups = dupMap[t.id];
  if (!dups?.length || ro) return '';

  const best = dups[0];
  return `
    <div class="dup-actions" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:5px">
      <button class="btn btn-sm" style="font-size:.7rem;padding:3px 8px;background:rgba(248,113,113,.15);color:var(--expense);border:1px solid rgba(248,113,113,.3)"
        onclick="event.stopPropagation();dupMerge('${t.id}','${best.otherId}')">
        🗑 Smazat duplikát
      </button>
      <button class="btn btn-sm" style="font-size:.7rem;padding:3px 8px;background:rgba(74,222,128,.1);color:var(--income);border:1px solid rgba(74,222,128,.2)"
        onclick="event.stopPropagation();dupMerge('${best.otherId}','${t.id}')">
        ✅ Zachovat tento
      </button>
      <button class="btn btn-ghost btn-sm" style="font-size:.7rem;padding:3px 8px"
        onclick="event.stopPropagation();dupIgnore('${t.id}','${best.otherId}')">
        👍 Není duplikát
      </button>
    </div>`;
}

// ══════════════════════════════════════════════════════
//  DETAIL MODAL – všechny podezřelé páry pro danou tx
// ══════════════════════════════════════════════════════
function openDupDetail(txId) {
  const modal = document.getElementById('modalDupDetail'); if (!modal) return;
  const D = getData();
  const t = (D.transactions||[]).find(x => x.id == txId); if (!t) return;
  const dups = _dupMap[txId] || [];

  const amt = t.amount || t.amt || 0;
  document.getElementById('dupDetailContent').innerHTML = `
    <div style="margin-bottom:14px;padding:10px 12px;background:var(--surface2);border-radius:10px;border:1px solid var(--border)">
      <div style="font-size:.72rem;color:var(--text3);margin-bottom:4px">Vybraná transakce</div>
      <div style="font-weight:700">${t.name||'–'}</div>
      <div style="font-size:.8rem;color:var(--text2)">${fmtP(amt)} Kč · ${t.date}</div>
    </div>
    <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin-bottom:8px">
      Podezřelé shody (${dups.length})
    </div>
    ${dups.map(dup => {
      const other = (D.transactions||[]).find(x => x.id == dup.otherId);
      if (!other) return '';
      const oAmt = other.amount || other.amt || 0;
      const typeColors = { exact:'var(--expense)', delayed:'var(--debt)', fuzzy_name:'var(--debt)' };
      return `<div style="padding:10px 12px;border:1px solid rgba(251,191,36,.25);border-radius:10px;margin-bottom:8px;background:rgba(251,191,36,.04)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div>
            <div style="font-weight:600;font-size:.86rem">${other.name||'–'}</div>
            <div style="font-size:.76rem;color:var(--text2)">${fmtP(oAmt)} Kč · ${other.date}</div>
            <div style="font-size:.72rem;color:${typeColors[dup.type]||'var(--debt)'};margin-top:3px">ℹ️ ${dup.reason}</div>
          </div>
          <div style="font-size:.72rem;font-weight:700;color:${typeColors[dup.type]||'var(--debt)'}">
            ${Math.round(dup.score*100)}%
          </div>
        </div>
        ${!viewingUid ? `<div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-sm" style="font-size:.72rem;padding:3px 10px;background:rgba(248,113,113,.15);color:var(--expense);border:1px solid rgba(248,113,113,.3)"
            onclick="closeModal('modalDupDetail');dupMerge('${txId}','${dup.otherId}')">
            🗑 Smazat tuto shodu
          </button>
          <button class="btn btn-sm" style="font-size:.72rem;padding:3px 10px;background:rgba(74,222,128,.1);color:var(--income);border:1px solid rgba(74,222,128,.2)"
            onclick="closeModal('modalDupDetail');dupMerge('${dup.otherId}','${txId}')">
            ✅ Zachovat tuto shodu
          </button>
          <button class="btn btn-ghost btn-sm" style="font-size:.72rem;padding:3px 10px"
            onclick="dupIgnore('${txId}','${dup.otherId}');if(!(_dupMap['${txId}']||[]).length)closeModal('modalDupDetail')">
            👍 Není duplikát
          </button>
        </div>` : ''}
      </div>`;
    }).join('')}
  `;
  modal.classList.add('open');
}

// ══════════════════════════════════════════════════════
//  TOAST HELPER (pokud není definován jinde)
// ══════════════════════════════════════════════════════
function showToast(msg) {
  let el = document.getElementById('ffToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'ffToast';
    el.style.cssText = `
      position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(20px);
      background:var(--surface2);border:1px solid var(--border);border-radius:10px;
      padding:10px 18px;font-size:.82rem;font-weight:600;color:var(--text);
      z-index:9999;opacity:0;transition:opacity .25s,transform .25s;pointer-events:none;
      box-shadow:0 4px 20px rgba(0,0,0,.3);white-space:nowrap`;
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  el.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2500);
}

