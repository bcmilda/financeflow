//  FinanceFlow · v12.03 · duplicates.js · 2026-10-23
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
//  S26 (v11.73): pravidla v jedné funkci (dupPorovnej) – stejná pro měsíc i pro přehled
//  VŠECH měsíců. Porovnávají se jen transakce se stejnou částkou (seřazené podle částky),
//  ne každá s každou – i 10 000 transakcí se projde za pár milisekund.
//  „Není duplikát“ se pamatuje natrvalo (S.uiCfg.dupNeni) – dřív platil jen do překreslení.
// ══════════════════════════════════════════════════════
function dupNeniKlic(a, b) { a = String(a); b = String(b); return a < b ? a + '|' + b : b + '|' + a; }
function dupJeNeni(a, b) {
  const n = (typeof S !== 'undefined' && S.uiCfg && S.uiCfg.dupNeni) || {};
  return !!(n[dupNeniKlic(a, b)] || _dupIgnored[a + '_' + b]);
}
function dupCastka(t) { return (typeof txCZK === 'function') ? txCZK(t) : (t.amount || t.amt || 0); }
function dupPorovnej(a, b, amtA, amtB) {
  if (a.type !== b.type) return null;                       // příjem vs výdaj = nikdy
  if (Math.abs(amtA - amtB) > 1 || amtA === 0) return null;  // tolerance 1 Kč (kurz)
  const dayDiff = Math.abs((new Date(a.date) - new Date(b.date)) / 86400000);
  const kat = (a.catId || a.category) === (b.catId || b.category);
  if (dayDiff === 0 && kat) return { type: 'exact', score: 1.0, reason: `Stejná částka ${fmt(amtA)} Kč, datum ${a.date}, kategorie` };
  if (dayDiff > 0 && dayDiff <= DUP_CONFIG.FUZZY_DAYS && kat)
    return { type: 'delayed', score: 0.6 + (1 - dayDiff / DUP_CONFIG.FUZZY_DAYS) * 0.3, reason: `Stejná částka ${fmt(amtA)} Kč, rozdíl ${Math.round(dayDiff)} ${dayDiff === 1 ? 'den' : 'dny/dní'}` };
  if (a.name && b.name && dayDiff <= 31) {
    const sim = nameSim(a.name, b.name);
    if (sim >= DUP_CONFIG.NAME_SIM_THR) return { type: 'fuzzy_name', score: sim * 0.9, reason: `Podobný název "${a.name}" / "${b.name}" (${Math.round(sim * 100)}% shoda)` };
  }
  return null;
}
//  Všechny podezřelé páry: [{a, b, type, score, reason}] (a = dřív přidaná)
function dupPary(transactions) {
  const txs = (transactions || []).filter(t => t && !DUP_CONFIG.IGNORE_CATS.includes(t.catId) && !DUP_CONFIG.IGNORE_CATS.includes(t.category) && !_dupIgnored[t.id])
    .map(t => ({ t, amt: dupCastka(t) })).filter(x => x.amt).sort((x, y) => x.amt - y.amt);
  const out = [];
  for (let i = 0; i < txs.length; i++) {
    for (let j = i + 1; j < txs.length && txs[j].amt - txs[i].amt <= 1; j++) {
      const A = txs[i], B = txs[j];
      if (dupJeNeni(A.t.id, B.t.id)) continue;
      const r = dupPorovnej(A.t, B.t, A.amt, B.amt); if (!r) continue;
      const [a, b] = dupPridano(A.t) <= dupPridano(B.t) ? [A.t, B.t] : [B.t, A.t];
      out.push(Object.assign({ a, b }, r));
    }
  }
  //  S27 (v11.87, Milan): „naskenoval jsem účtenku z benzínky a pak přidal stejnou transakci –
  //  Podezřelé to neodhalily“. Účtenka 1 022,40 Kč (benzín 988,40 + káva 34) a ručně 988,40 Kč:
  //  částky se liší, proto to žádné pravidlo nevidělo. Nové pravidlo: POLOŽKA účtenky = jiná transakce.
  dupParyPolozka(transactions).forEach(p => out.push(p));
  return out;
}
//  Transakce bez účtenky, jejíž částka (± 0,50 Kč) se rovná položce účtenky jiné transakce téhož
//  typu ze stejného nebo vedlejšího dne. Celé účtenky řeší pravidla výš (stejná částka).
function dupParyPolozka(transactions) {
  const R = (typeof S !== 'undefined' && S.receipts) || [];
  if (!R.length || typeof dupUctenkaPro !== 'function') return [];
  const txs = (transactions || []).filter(t => t && t.type === 'expense' && !t.splitParent && !DUP_CONFIG.IGNORE_CATS.includes(t.catId || t.category));
  const sUct = [], bez = [];
  txs.forEach(t => { const u = dupUctenkaPro(t); if (u && (u.r.items || []).length > 1) sUct.push({ t, r: u.r }); else if (!u) bez.push(t); });
  const out = [];
  const kc = it => (it && it.lineTotal != null) ? (parseFloat(it.lineTotal) || 0) : (parseFloat(it && it.price) || 0) * (parseFloat(it && it.qty) || 1);
  sUct.forEach(({ t: a, r }) => {
    const celkem = dupCastka(a);
    bez.forEach(b => {
      if (b === a || dupJeNeni(a.id, b.id)) return;
      const dd = Math.abs((new Date(a.date) - new Date(b.date)) / 86400000); if (dd > 1) return;
      const amtB = dupCastka(b); if (!(amtB > 0) || Math.abs(amtB - celkem) <= 1) return;
      const it = (r.items || []).find(x => Math.abs(kc(x) - amtB) <= 0.5);
      if (!it) return;
      out.push({ a, b, type: 'polozka', score: 0.75, reason: `Položka účtenky „${it.name || it.raw || '?'}“ ${fmt(kc(it))} Kč = tato transakce (${a.date === b.date ? 'stejný den' : 'vedlejší den'})` });
    });
  });
  return out;
}
//  Kdy byla transakce přidaná: účtenka (receiptAddedAt) nebo čas zakódovaný v id (genTxId = čas × 16)
function dupPridano(t) {
  if (t && t.receiptAddedAt) return +t.receiptAddedAt;
  const n = Number(t && t.id); const ms = n > 1e13 ? Math.floor(n / 16) : 0;
  return ms > 1.5e12 && ms < 2.2e12 ? ms : 0;
}
function detectDuplicates(transactions) {
  const result = {}; // txId → [{otherId, score, reason, type}]
  dupPary(transactions).forEach(p => {
    (result[p.a.id] = result[p.a.id] || []).push({ otherId: p.b.id, score: p.score, reason: p.reason, type: p.type, otherDate: p.b.date, otherName: p.b.name });
    (result[p.b.id] = result[p.b.id] || []).push({ otherId: p.a.id, score: p.score, reason: p.reason, type: p.type, otherDate: p.a.date, otherName: p.a.name });
  });
  Object.values(result).forEach(arr => arr.sort((a, b) => b.score - a.score));
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
  if (txChranenaHlaska(del)) return;
  const amt = keep.amount || keep.amt || 0;
  const amtD = del.amount || del.amt || 0;
  const u = dupUctenkaPro(del);
  if (!confirm(`Smazat duplikát?\n\n✅ Zachovat: "${keep.name}" · ${fmtP(amt)} Kč · ${keep.date}\n🗑 Smazat:   "${del.name}" · ${fmtP(amtD)} Kč · ${del.date}`
    + (u && u.kopie ? `\n\n📷 Smaže se i kopie naskenované účtenky (${u.r.store || ''} ${u.r.date || ''}) – originál účtenky zůstane.` : ''))) return;
  if (!txSmazSUctenkou(del)) return;
  delete _dupMap[keepId]; delete _dupMap[deleteId];
  save(); renderTx(); dupVseObnov();
  showToast('✅ Duplikát smazán');
}

function dupDelete(txId) {
  if (viewingUid) return;
  const D = getData();
  const t = (D.transactions||[]).find(x => x.id == txId);
  if (!t) return;
  if (txChranenaHlaska(t)) return;
  const amt = t.amount || t.amt || 0;
  const u = dupUctenkaPro(t);
  if (!confirm(`Smazat transakci?\n"${t.name}" · ${fmtP(amt)} Kč · ${t.date}` + (u ? `\n\n📷 Smaže se i kopie naskenované účtenky (originál zůstane).` : ''))) return;
  if (!txSmazSUctenkou(t)) return;
  delete _dupMap[txId];
  save(); renderTx(); dupVseObnov();
  showToast('✅ Transakce smazána');
}

function dupIgnore(txId, otherId) {
  // Označit pár jako "není duplikát" – S26 (v11.73): natrvalo (dřív jen do překreslení)
  _dupIgnored[txId + '_' + otherId] = true;
  _dupIgnored[otherId + '_' + txId] = true;
  if (!(typeof viewingUid !== 'undefined' && viewingUid) && typeof S !== 'undefined') {
    S.uiCfg = S.uiCfg || {}; S.uiCfg.dupNeni = S.uiCfg.dupNeni || {};
    S.uiCfg.dupNeni[dupNeniKlic(txId, otherId)] = 1;
    if (typeof save === 'function') save();
  }
  if (_dupMap[txId])    _dupMap[txId]    = _dupMap[txId].filter(d => d.otherId != otherId);
  if (_dupMap[otherId]) _dupMap[otherId] = _dupMap[otherId].filter(d => d.otherId != txId);
  if (!_dupMap[txId]?.length)    delete _dupMap[txId];
  if (!_dupMap[otherId]?.length) delete _dupMap[otherId];
  renderTx(); dupVseObnov();
  showToast('👍 Označeno jako unikátní');
}

// ══════════════════════════════════════════════════════
//  S26 (v11.73, Milan: „naskenoval jsem 2 stejné účtenky… z transakcí ji smazat nemůžu,
//  z účtenky by se mi ztratila celá účtenka“). TRANSAKCE Z ÚČTENKY: kdo smaže transakci,
//  smaže i její účtenku, když je to KOPIE (stejný obchod, datum, částka a počet položek jako
//  jiná účtenka) – originál zůstane. Když kopie není, zeptá se zvlášť.
// ══════════════════════════════════════════════════════
function dupUctenkaKlic(r) { return `${typeof normalizeStoreName === 'function' ? normalizeStoreName(r.store) : (r.store || '')}|${r.date}|${Math.round((r.total || 0) * 100)}|${(r.items || []).length}`; }
function dupUctenkaPro(t) {
  const R = (typeof S !== 'undefined' && S.receipts) || [];
  if (!t) return null;
  let i = t.receiptAddedAt ? R.findIndex(r => r && r.addedAt === t.receiptAddedAt) : -1;
  if (i < 0 && typeof rcptNajdiTx === 'function' && (t.receiptStore || String(t.note || '').startsWith('📸')))   // starší transakce bez vazby
    i = R.findIndex(r => r && rcptNajdiTx(r, S) === t);
  if (i < 0) return null;
  const k = dupUctenkaKlic(R[i]);
  return { i, r: R[i], kopie: R.some((x, j) => j !== i && x && dupUctenkaKlic(x) === k) };
}
//  S26 (v11.74, Milan: „nechci, aby první naskenovaná účtenka šla smazat pouhým tlačítkem
//  v Transakcích – zůstala by účtenka bez transakce“). CHRÁNĚNÁ = transakce patří k účtence, která
//  zůstává (jediná, nebo ta, kterou si „Smazat duplikáty“ nechá). Ta se maže jen přes účtenku
//  (✎ Upravit účtenku → Historie → ✕). Smazat jde jen transakce bez účtenky (osiřelá – účtenka
//  už neexistuje) nebo transakce KOPIE účtenky (s ní zmizí i ta kopie).
function txChranenaUctenkou(t) {
  const u = dupUctenkaPro(t); if (!u) return null;
  if (u.kopie && typeof rcptDuplikatyPlan === 'function' && rcptDuplikatyPlan(S.receipts || []).smaz.includes(u.r)) return null;
  return u;
}
function txChranenaHlaska(t) {
  const u = txChranenaUctenkou(t); if (!u) return false;
  if (confirm(`🔒 Tahle transakce patří k naskenované účtence ${u.r.store || ''} ${u.r.date || ''}.\n\nSmaže se jen spolu s účtenkou: ✎ Upravit účtenku → v Historii ✕ (smaže účtenku i transakci).\n\nOtevřít účtenku v Historii?`)
      && typeof openReceiptInHistory === 'function') openReceiptInHistory(u.r.date || '', u.r.store || '');
  return true;
}
//  Smaže transakci (ne chráněnou); s transakcí KOPIE zmizí i kopie účtenky. Vrací false, když nesmí.
function txSmazSUctenkou(t) {
  if (!t || txChranenaUctenkou(t)) return false;
  const u = dupUctenkaPro(t);
  if (typeof reverseGoalDepositForTx === 'function') reverseGoalDepositForTx(t.id);
  S.transactions = S.transactions.filter(x => x !== t && x.id != t.id);
  if (u) {   // sem se dostane jen kopie (chráněná vypadla výš)
    if (u.r.photoKey && typeof rpFotky === 'function' && typeof archivSmaz === 'function') rpFotky(u.r).forEach(k => archivSmaz(k));
    S.receipts = S.receipts.filter(x => x !== u.r);
  }
  return true;
}
window.txSmazSUctenkou = txSmazSUctenkou; window.dupUctenkaPro = dupUctenkaPro; window.txChranenaUctenkou = txChranenaUctenkou; window.txChranenaHlaska = txChranenaHlaska;

// ══════════════════════════════════════════════════════
//  S26 (v11.73, Milan: „podezřelé transakce musím hledat měsíc po měsíci, chci je vidět najednou“)
//  PŘEHLED VŠECH MĚSÍCŮ · cesta: Transakce → ⚠️ lišta podezřelých → „🔎 Všechny měsíce“
// ══════════════════════════════════════════════════════
let _dupVseFiltr = 'vse', _dupVseCache = null;
function dupParyVse() {
  const tx = (typeof S !== 'undefined' && S.transactions) || [];
  const n = (S.uiCfg && S.uiCfg.dupNeni) ? Object.keys(S.uiCfg.dupNeni).length : 0;
  const podpis = tx.length + '|' + (tx.length ? tx[tx.length - 1].id : '') + '|' + tx.reduce((a, t) => a + (t.amount || t.amt || 0), 0) + '|' + n + '|' + Object.keys(_dupIgnored).length;
  if (_dupVseCache && _dupVseCache.podpis === podpis) return _dupVseCache.pary;
  const pary = dupPary(tx.filter(t => !t.splitParent)).sort((x, y) => (x.type === 'exact' ? 0 : 1) - (y.type === 'exact' ? 0 : 1) || String(y.b.date).localeCompare(String(x.b.date)));
  _dupVseCache = { podpis, pary };
  return pary;
}
function dupVseOtevri() {
  let o = document.getElementById('dupVseOkno');
  if (!o) {
    o = document.createElement('div'); o.id = 'dupVseOkno';
    o.style.cssText = 'position:fixed;inset:0;z-index:10030;background:rgba(8,10,20,.85);display:flex;justify-content:center;align-items:flex-start;overflow:auto;padding:16px 12px calc(16px + env(safe-area-inset-bottom))';
    document.body.appendChild(o);
  }
  dupVseKresli();
}
function dupVseZavri() { const o = document.getElementById('dupVseOkno'); if (o) o.remove(); }
function dupVseObnov() { if (typeof document !== 'undefined' && document.getElementById('dupVseOkno')) dupVseKresli(); }
function dupVseFiltr(f) { _dupVseFiltr = f; dupVseKresli(); }
function dupVseKresli() {
  const o = document.getElementById('dupVseOkno'); if (!o) return;
  const vse = dupParyVse(), D = getData(), ro = typeof viewingUid !== 'undefined' && !!viewingUid;
  const pocet = { vse: vse.length, exact: 0, delayed: 0, fuzzy_name: 0, polozka: 0 }; vse.forEach(p => pocet[p.type]++);
  const pary = _dupVseFiltr === 'vse' ? vse : vse.filter(p => p.type === _dupVseFiltr);
  const typ = { exact: ['🔴', 'Přesný duplikát', 'var(--expense)'], delayed: ['🟡', 'Možný duplikát', 'var(--debt)'], fuzzy_name: ['🟠', 'Podobná transakce', 'var(--debt)'], polozka: ['🧾', 'Položka účtenky', 'var(--debt)'] };
  const M = typeof CZ_M !== 'undefined' ? CZ_M : [];
  const e = typeof escHtml === 'function' ? escHtml : (x => String(x == null ? '' : x));
  const kat = t => { const c = (D.categories || []).find(x => x.id === (t.catId || t.category)); return c ? (c.icon || '') + ' ' + c.name : ''; };
  const kdy = t => { const ms = dupPridano(t); return ms ? new Date(ms).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''; };
  const radek = (t, pozdejsi) => { const u = dupUctenkaPro(t), chr = txChranenaUctenkou(t);
    return `<div style="display:flex;gap:8px;align-items:center;padding:6px 0">
      <div style="flex:1;min-width:0">
        <div style="font-size:.82rem;font-weight:600;overflow-wrap:anywhere">${e(t.name || '–')} ${u ? '<span title="Z naskenované účtenky">📷</span>' : (t.receiptAddedAt || String(t.note || '').startsWith('📸')) ? '<span title="Účtenka k této transakci už neexistuje" style="font-size:.66rem;color:var(--debt);font-weight:500">📷 účtenka chybí</span>' : ''}</div>
        <div style="font-size:.7rem;color:var(--text2)">${t.type === 'income' ? '+' : '−'}${fmtP(t.amount || t.amt || 0)} Kč · ${e(t.date)} · ${e(kat(t))}${kdy(t) ? ` · přidáno ${kdy(t)}` : ''}${pozdejsi ? ' · <b style="color:var(--debt)">přidaná později</b>' : ''}</div>
      </div>
      ${ro ? '' : chr ? `<span title="Patří k účtence – smaže se jen s ní (✎ Upravit účtenku → Historie → ✕)" style="font-size:.68rem;color:#a8aec8;flex-shrink:0;text-align:right;line-height:1.3">🔒 patří<br>k účtence</span>`
        : `<button class="btn btn-sm" style="font-size:.7rem;padding:3px 9px;background:rgba(248,113,113,.15);color:var(--expense);border:1px solid rgba(248,113,113,.3);flex-shrink:0" onclick="dupDelete('${e(String(t.id))}')">🗑 Smazat${u ? '<br><span style=\'font-size:.6rem\'>i kopii účtenky</span>' : ''}</button>`}
    </div>`; };
  let h = '', mesic = '';
  pary.slice(0, 200).forEach(p => {
    const d = new Date(p.b.date + 'T12:00:00'), mk = isNaN(d) ? '' : `${M[d.getMonth()] || ''} ${d.getFullYear()}`;
    if (mk !== mesic) { mesic = mk; h += `<div style="font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);margin:12px 0 4px">${e(mk)}</div>`; }
    const tp = typ[p.type] || typ.delayed, obeUct = dupUctenkaPro(p.a) && dupUctenkaPro(p.b);
    h += `<div style="border:1px solid rgba(251,191,36,.28);background:rgba(251,191,36,.04);border-radius:10px;padding:6px 10px;margin-bottom:8px">
      <div style="font-size:.72rem;font-weight:700;color:${tp[2]}">${tp[0]} ${tp[1]} <span style="font-weight:400;color:var(--text3)">· ${e(p.reason)}</span></div>
      ${radek(p.a, false)}<div style="border-top:1px dashed var(--border)"></div>${radek(p.b, dupPridano(p.b) > dupPridano(p.a))}
      ${obeUct ? '<div style="font-size:.68rem;color:#a8aec8;margin:2px 0 4px">📷 Obě jsou z naskenované účtenky – smazat jde jen kopie (s ní zmizí i kopie účtenky), originál je 🔒 chráněný.</div>' : ''}
      ${ro ? '' : `<button class="btn btn-ghost btn-sm" style="font-size:.7rem;padding:3px 9px;margin:2px 0 4px" onclick="dupIgnore('${e(String(p.a.id))}','${e(String(p.b.id))}')">👍 Není duplikát</button>`}
    </div>`;
  });
  const chip = (k, t) => `<button class="tx-filt-btn${_dupVseFiltr === k ? ' active' : ''}" style="font-size:.72rem" onclick="dupVseFiltr('${k}')">${t} (${pocet[k]})</button>`;
  o.innerHTML = `<div style="width:100%;max-width:560px;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:14px">
    <div style="display:flex;align-items:center;gap:8px"><div style="font-weight:800;font-size:1rem;flex:1">⚠️ Podezřelé páry – všechny měsíce</div>
      <button onclick="dupVseZavri()" style="background:none;border:none;color:#a8aec8;font-size:1.3rem;cursor:pointer">✕</button></div>
    <div style="font-size:.74rem;color:#a8aec8;margin:4px 0 8px;line-height:1.5">Stejná částka a stejný den, do 5 dní, nebo velmi podobný název do měsíce. U každého páru smaž tu navíc, nebo potvrď „Není duplikát“ – appka si to zapamatuje a pár už neukáže.</div>
    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:6px">${chip('vse', 'Vše')}${chip('exact', '🔴 Přesné')}${chip('delayed', '🟡 Možné')}${chip('fuzzy_name', '🟠 Podobné')}${pocet.polozka ? chip('polozka', '🧾 Z účtenky') : ''}</div>
    ${h || '<div style="padding:24px 0;text-align:center;color:var(--text2);font-size:.84rem">✅ Žádné podezřelé páry</div>'}
    ${pary.length > 200 ? `<div style="font-size:.72rem;color:var(--text3);text-align:center;margin-top:6px">Zobrazeno prvních 200 z ${pary.length}.</div>` : ''}
  </div>`;
}
Object.assign(typeof window !== 'undefined' ? window : {}, { dupVseOtevri, dupVseZavri, dupVseFiltr, dupParyVse, dupPary, dupPorovnej });

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
  //  S26 (v11.73): i podezřelé páry v ostatních měsících – přehled všech najednou
  let vse = 0; try { vse = dupParyVse().length; } catch (e) {}
  const vseBtn = vse ? `<button class="tx-filt-btn" onclick="dupVseOtevri()" style="white-space:nowrap">🔎 Všechny měsíce (${vse})</button>` : '';
  if (!count && vse) {
    el.style.display = 'block';
    el.innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.25);border-radius:10px;margin-bottom:12px;flex-wrap:wrap">
      <span style="flex:1;min-width:0;font-size:.78rem;color:var(--text2)">⚠️ V tomto měsíci nic podezřelého, v ostatních měsících <b style="color:var(--debt)">${vse} ${vse === 1 ? 'pár' : vse < 5 ? 'páry' : 'párů'}</b></span>${vseBtn}</div>`;
    return;
  }
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
      </button>${vseBtn}
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
    polozka:     { icon: '🧾', label: 'Položka účtenky',    color: 'var(--debt)'    },
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
      ${/* v12.03 (FIX-488, Milan: „klikl jsem na Smazat duplikát u ruční transakce, upozornění si myslí, že patří k účtence“):
            tlačítka v ŘÁDKU se týkají TOHOTO řádku – „Smazat duplikát“ smaže tenhle, „Zachovat tento“ nechá tenhle
            a smaže druhý. Dřív obráceně (kopie argumentů z okna Detail, kde tlačítka patří ke shodě). */''}
      <button class="btn btn-sm" style="font-size:.7rem;padding:3px 8px;background:rgba(248,113,113,.15);color:var(--expense);border:1px solid rgba(248,113,113,.3)"
        onclick="event.stopPropagation();dupMerge('${best.otherId}','${t.id}')" title="Smazat tuto transakci, druhá zůstane">
        🗑 Smazat duplikát
      </button>
      <button class="btn btn-sm" style="font-size:.7rem;padding:3px 8px;background:rgba(74,222,128,.1);color:var(--income);border:1px solid rgba(74,222,128,.2)"
        onclick="event.stopPropagation();dupMerge('${t.id}','${best.otherId}')" title="Nechat tuto transakci, smazat tu druhou">
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
      const typeColors = { exact:'var(--expense)', delayed:'var(--debt)', fuzzy_name:'var(--debt)', polozka:'var(--debt)' };
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

