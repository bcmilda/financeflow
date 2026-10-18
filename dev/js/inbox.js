// FinanceFlow · v11.89 · inbox.js · 2026-10-17
// ══════════════════════════════════════════════════════
//  S27 (Milan): 📲 FINANCEFLOW INBOX – NOTIFIKACE Z BANKY Z TELEFONU
//  cesta: Import z banky (BETA) → 📲 Telefon
//
//  Nativní Android appka „FinanceFlow Inbox“ (samostatný projekt financeflow-native) čte notifikace
//  VYBRANÝCH bankovních aplikací a jejich TEXT posílá do users/{uid}/inbox. Rozpoznání (částka,
//  obchodník, banka) dělá tady web stávajícím parserem parseBankNotification (sms-import.js) – oprava
//  parseru tak nepotřebuje novou verzi appky.
//
//  Nic se nezapisuje samo: položka čeká v 📥 Doručené, dokud ji nepotvrdíš (transakce), nespojíš
//  s naskenovanou účtenkou, nebo nezahodíš. „Sken převezme“ (Milan): účtenka je podrobnější – když
//  k platbě existuje účtenka se stejnou částkou (± 1 Kč) a datem (± 2 dny), nabídne se spojení a
//  nová transakce nevznikne; když účtenka přibude až po transakci z notifikace, účtenka ji převezme.
//
//  Uzly: users/{uid}/inbox/{id} = {dev, app, pkg, title, text, postedAt, stav?, txId?}
//        users/{uid}/inboxZarizeni/{devUid} = {name, kdy} · inboxLinks/{devUid} = {uid, code, kdy}
//        inboxPairing/{code} = {devUid, name, created} (zakládá telefon). Pravidla DB v11.89.
// ══════════════════════════════════════════════════════
const _INBOX_DB = 'https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app';
let _inbox = null, _inboxZar = null, _inboxNacitam = false;
const INBOX_UCTENKA_KC = 1, INBOX_UCTENKA_DNI = 2;

async function _inboxFetch(cesta, opt) {
  const me = window._currentUser; const t = await me?.getIdToken?.();
  if (!me || !t) throw new Error('nepřihlášen');
  const r = await fetch(`${_INBOX_DB}/${cesta}.json?auth=${t}`, opt || {});
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.status === 204 ? null : r.json();
}
async function inboxNacti() {
  const uid = window._currentUser?.uid; if (!uid) { _inbox = {}; _inboxZar = {}; return; }
  try {
    const [a, b] = await Promise.all([_inboxFetch(`users/${uid}/inbox`), _inboxFetch(`users/${uid}/inboxZarizeni`)]);
    _inbox = a || {}; _inboxZar = b || {};
  } catch (e) { _inbox = _inbox || {}; _inboxZar = _inboxZar || {}; }
  inboxUklid();
}
//  Zpracované položky (přijato / spojeno / zahozeno) starší než 60 dní se smažou.
function inboxUklid() {
  const uid = window._currentUser?.uid; if (!uid || !_inbox) return;
  const hranice = Date.now() - 60 * 864e5;
  Object.entries(_inbox).forEach(([id, x]) => { if (x && x.stav && (x.zpracovano || x.postedAt || 0) < hranice) {
    delete _inbox[id]; _inboxFetch(`users/${uid}/inbox/${id}`, { method: 'DELETE' }).catch(() => {}); } });
}

// ── čisté funkce (testuje tools/smoke_inbox.js) ──
const _inboxDatum = ms => { const d = new Date(ms || Date.now()); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
//  Text pro parser: „George: Platba kartou 450 Kč SHELL“ – název appky + titulek + text.
function inboxText(x) { return [x.app ? x.app + ':' : '', x.title || '', x.text || ''].join(' ').replace(/\s+/g, ' ').trim(); }
function inboxRozpoznej(x) {
  const p = typeof parseBankNotification === 'function' ? parseBankNotification(inboxText(x)) : null;
  if (!p) return null;
  return Object.assign({}, p, { date: _inboxDatum(x.postedAt) });   // datum z času notifikace, ne „dnes“
}
//  Naskenovaná účtenka ke stejné platbě: transakce z účtenky, výdaj, částka ± 1 Kč, datum ± 2 dny.
function inboxUctenkaK(p, D) {
  if (!p || p.type !== 'expense' || typeof dupUctenkaPro !== 'function') return null;
  const dny = (a, b) => Math.abs((Date.parse(a + 'T12:00:00') - Date.parse(b + 'T12:00:00')) / 864e5);
  return ((D || getData()).transactions || []).filter(t => t && t.type === 'expense' && !t.splitParent && !t.zNotifikace
      && Math.abs((parseFloat(t.amount || t.amt) || 0) - p.amount) <= INBOX_UCTENKA_KC && dny(t.date || '', p.date) <= INBOX_UCTENKA_DNI && dupUctenkaPro(t))
    .sort((a, b) => dny(a.date, p.date) - dny(b.date, p.date))[0] || null;
}
//  Už zapsaná transakce (ručně) se stejnou částkou a dnem – jen upozornění.
function inboxMoznaZapsano(p, D) {
  if (!p) return null;
  return ((D || getData()).transactions || []).find(t => t && t.type === p.type && !t.splitParent && !t.zNotifikace && t.date === p.date
    && Math.abs((parseFloat(t.amount || t.amt) || 0) - p.amount) <= 1 && !(typeof dupUctenkaPro === 'function' && dupUctenkaPro(t))) || null;
}
//  Účtenka přibyla až PO transakci z notifikace → účtenka ji převezme (transakce z notifikace se smaže,
//  peněženka a typ platby se přenesou na transakci účtenky, pokud je nemá).
function inboxPrevzetiUctenkou(D) {
  D = D || getData();
  const z = (D.transactions || []).filter(t => t && t.zNotifikace && !(typeof dupUctenkaPro === 'function' && dupUctenkaPro(t)));
  const out = [];
  z.forEach(n => { const u = inboxUctenkaK({ type: 'expense', amount: parseFloat(n.amount || n.amt) || 0, date: n.date }, D); if (u && u !== n) out.push({ n, u }); });
  return out;
}
function _inboxPrevezmi(n, u) {
  if (!u.wallet && n.wallet) u.wallet = n.wallet;
  if (!u.payType && n.payType) u.payType = n.payType;
  u.zNotifikace = Object.assign({}, n.zNotifikace, { prevzato: true });
  S.transactions = (S.transactions || []).filter(t => t !== n && t.id != n.id);
}

// ── akce ──
async function _inboxStav(id, zmena) {
  const uid = window._currentUser?.uid; if (!uid) return;
  const x = (_inbox || {})[id]; if (!x) return;
  Object.assign(x, zmena, { zpracovano: Date.now() });
  try { await _inboxFetch(`users/${uid}/inbox/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({}, zmena, { zpracovano: { '.sv': 'timestamp' } })) }); }
  catch (e) { if (typeof showToast === 'function') showToast('⚠️ Stav položky se neuložil – zkus znovu'); }
}
async function inboxPrijmout(id) {
  if (typeof viewingUid !== 'undefined' && viewingUid) return;
  const x = (_inbox || {})[id]; const p = x && inboxRozpoznej(x); if (!p) return;
  const catId = document.getElementById('ib_cat_' + id)?.value || p.catId || '';
  const name = (document.getElementById('ib_name_' + id)?.value || '').trim() || p.merchant || 'Platba';
  const wallet = document.getElementById('ib_wal_' + id)?.value || '';
  let amt = p.amount;
  if (p.currency === 'EUR') amt = Math.round(amt * 25); else if (p.currency === 'USD') amt = Math.round(amt * 23); else if (p.currency === 'GBP') amt = Math.round(amt * 29);
  const tx = { id: (typeof genTxId === 'function') ? genTxId() : String(Date.now() * 16), type: p.type, name, amount: amt, amt, catId, category: catId, date: p.date,
    note: `📲 z notifikace ${p.bank}${p.currency !== 'CZK' ? ` (${p.amount} ${p.currency})` : ''}`, zNotifikace: { id, bank: p.bank, postedAt: x.postedAt || 0 } };
  if (wallet) tx.wallet = wallet;
  S.transactions = S.transactions || []; S.transactions.push(tx);
  if (typeof save === 'function') save();
  await _inboxStav(id, { stav: 'prijato', txId: tx.id });
  if (typeof showToast === 'function') showToast(`✅ ${name} · ${amt} Kč přidáno do Transakcí`);
  inboxRender();
}
//  Platba z notifikace = naskenovaná účtenka → žádná nová transakce, účtenka ji „převezme“.
async function inboxSpojitSUctenkou(id, txId) {
  const t = (S.transactions || []).find(y => y.id == txId); const x = (_inbox || {})[id]; if (!t || !x) return;
  const p = inboxRozpoznej(x);
  const wallet = document.getElementById('ib_wal_' + id)?.value || '';
  if (!t.wallet && wallet) t.wallet = wallet;
  t.zNotifikace = { id, bank: p ? p.bank : '', postedAt: x.postedAt || 0 };
  if (typeof save === 'function') save();
  await _inboxStav(id, { stav: 'sparovano', txId: t.id });
  if (typeof showToast === 'function') showToast('🧾 Spojeno s naskenovanou účtenkou – nová transakce nevznikla');
  inboxRender();
}
async function inboxZahodit(id) { await _inboxStav(id, { stav: 'zahozeno' }); inboxRender(); }
function inboxPrevzit(nId) {
  const par = inboxPrevzetiUctenkou().find(p => p.n.id == nId); if (!par) return;
  _inboxPrevezmi(par.n, par.u);
  if (typeof save === 'function') save();
  if (typeof showToast === 'function') showToast('🧾 Účtenka převzala platbu z notifikace');
  inboxRender(); if (typeof renderPage === 'function') renderPage();
}

// ── párování telefonu ──
async function inboxParuj() {
  const uid = window._currentUser?.uid; if (!uid) { alert('Přihlas se.'); return; }
  const kod = (document.getElementById('ib_kod')?.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (kod.length < 8) { if (typeof showToast === 'function') showToast('Kód má 8 znaků – opiš ho z telefonu'); return; }
  try {
    const p = await _inboxFetch(`inboxPairing/${kod}`);
    if (!p || !p.devUid) throw new Error('kód nenalezen');
    if (p.created && Date.now() - p.created > 15 * 60000) throw new Error('kód vypršel – v telefonu vytvoř nový');
    await _inboxFetch(`inboxLinks/${p.devUid}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid, code: kod, kdy: { '.sv': 'timestamp' } }) });
    await _inboxFetch(`users/${uid}/inboxZarizeni/${p.devUid}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: String(p.name || 'Telefon').slice(0, 60), kdy: { '.sv': 'timestamp' } }) });
    if (typeof showToast === 'function') showToast('📲 Telefon propojen – notifikace z banky budou chodit sem');
    await inboxNacti(); inboxRender();
  } catch (e) { alert('Propojení se nepovedlo: ' + (e && e.message || e)); }
}
async function inboxOdpoj(dev) {
  const uid = window._currentUser?.uid; if (!uid || !confirm('Odpojit telefon? Notifikace z něj přestanou chodit.')) return;
  try { await _inboxFetch(`inboxLinks/${dev}`, { method: 'DELETE' }); } catch (e) {}
  try { await _inboxFetch(`users/${uid}/inboxZarizeni/${dev}`, { method: 'DELETE' }); } catch (e) {}
  delete (_inboxZar || {})[dev]; inboxRender();
}
//  Smazání účtu (ucet.js): odpojit telefony, jinak by inboxLinks zůstaly viset.
async function inboxOdpojVse() {
  const uid = window._currentUser?.uid; if (!uid) return;
  let z = {}; try { z = await _inboxFetch(`users/${uid}/inboxZarizeni`) || {}; } catch (e) {}
  for (const dev of Object.keys(z)) { try { await _inboxFetch(`inboxLinks/${dev}`, { method: 'DELETE' }); } catch (e) {} }
}

// ── UI ──
function inboxRender() {
  const el = document.getElementById('inboxBox'); if (!el) return;
  if (_inbox === null) { el.innerHTML = '<div class="card" style="margin-bottom:12px"><div style="font-size:.8rem;color:#a8aec8">📲 Načítám notifikace z telefonu…</div></div>'; if (!_inboxNacitam) { _inboxNacitam = true; inboxNacti().then(() => { _inboxNacitam = false; inboxRender(); }); } return; }
  const D = getData();
  const esc = s => (typeof escHtml === 'function') ? escHtml(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const kc = v => (typeof fmtP === 'function' ? fmtP(v) : v) + ' Kč';
  const zar = Object.entries(_inboxZar || {});
  const cekaji = Object.entries(_inbox || {}).filter(([, x]) => x && !x.stav).sort((a, b) => (b[1].postedAt || 0) - (a[1].postedAt || 0));
  const prevzeti = inboxPrevzetiUctenkou(D);
  const walOpt = (typeof getWallets === 'function' ? getWallets() : (D.wallets || [])).filter(w => !w.archived).map(w => `<option value="${esc(w.id)}">${esc((w.icon || '👛') + ' ' + w.name)}</option>`).join('');
  const karta = ([id, x]) => {
    const p = inboxRozpoznej(x);
    const kdy = new Date(x.postedAt || 0).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
    if (!p) return `<div class="card" style="margin-bottom:8px;border-left:3px solid #8b93ad">
        <div style="font-size:.72rem;color:#a8aec8">${esc(x.app || 'Notifikace')} · ${esc(kdy)} · nerozpoznáno</div>
        <div style="font-size:.8rem;color:var(--text);margin:4px 0 8px;font-family:monospace;white-space:pre-wrap">${esc(inboxText(x))}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-sm" onclick="inboxRucne('${esc(id)}')">✎ Zapsat ručně</button><button class="btn btn-ghost btn-sm" onclick="inboxZahodit('${esc(id)}')">✕ Zahodit</button></div></div>`;
    const u = inboxUctenkaK(p, D), m = !u && inboxMoznaZapsano(p, D);
    const cats = (D.categories || []).filter(c => c.type === p.type || c.type === 'both');
    return `<div class="card" style="margin-bottom:8px;border-left:3px solid ${p.type === 'income' ? 'var(--income)' : 'var(--expense)'}">
      <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:.72rem;color:#a8aec8"><span>${esc(p.bankIcon || '🏦')} ${esc(p.bank)} · ${esc(x.app || '')}</span><span>${esc(kdy)}</span></div>
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;margin:4px 0">
        <span style="font-weight:700;color:var(--text)">${esc(p.merchant)}</span>
        <span style="font-weight:800;color:${p.type === 'income' ? 'var(--income)' : 'var(--expense)'}">${p.type === 'income' ? '+' : '−'}${esc(String(p.amount))} ${esc(p.currency === 'CZK' ? 'Kč' : p.currency)}</span></div>
      ${u ? `<div style="font-size:.76rem;color:#93c5fd;background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.3);border-radius:8px;padding:6px 8px;margin:6px 0">🧾 K téhle platbě máš naskenovanou účtenku <b>${esc(u.name || '')}</b> ${esc(kc(u.amount || u.amt))} (${esc(u.date)}) – je podrobnější, spoj je a nová transakce nevznikne.</div>` : ''}
      ${m ? `<div style="font-size:.74rem;color:#fbbf24;margin:6px 0">⚠️ Možná už zapsáno: ${esc(m.name || '')} ${esc(kc(m.amount || m.amt))} (${esc(m.date)})</div>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px">
        <select class="fi" id="ib_cat_${esc(id)}" style="font-size:.78rem"><option value="">📂 Kategorie…</option>${cats.map(c => `<option value="${esc(c.id)}"${c.id === p.catId ? ' selected' : ''}>${esc((c.icon || '') + ' ' + c.name)}</option>`).join('')}</select>
        <select class="fi" id="ib_wal_${esc(id)}" style="font-size:.78rem"><option value="">👛 Peněženka…</option>${walOpt}</select>
        <input class="fi" id="ib_name_${esc(id)}" value="${esc(p.merchant)}" style="font-size:.78rem;grid-column:1 / -1" placeholder="Název">
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
        ${u ? `<button class="btn btn-sm btn-primary" onclick="inboxSpojitSUctenkou('${esc(id)}','${esc(u.id)}')">🧾 Spojit s účtenkou</button><button class="btn btn-sm" onclick="inboxPrijmout('${esc(id)}')">➕ Přesto nová transakce</button>`
          : `<button class="btn btn-sm btn-primary" onclick="inboxPrijmout('${esc(id)}')">✅ Přidat do Transakcí</button>`}
        <button class="btn btn-ghost btn-sm" onclick="inboxZahodit('${esc(id)}')">✕ Zahodit</button></div>
    </div>`;
  };
  el.innerHTML = `<div class="card" style="margin-bottom:12px">
      <div style="font-weight:700;font-size:.9rem;color:var(--text);margin-bottom:4px">📲 Notifikace z telefonu <span style="font-size:.6rem;background:rgba(251,191,36,.2);color:var(--debt);padding:1px 6px;border-radius:4px;font-weight:700">BETA</span></div>
      <div style="font-size:.74rem;color:#a8aec8;line-height:1.5">Android appka <b>FinanceFlow Inbox</b> čte notifikace jen z bankovních aplikací, které si v ní vybereš, a posílá je sem. Nic se nezapíše samo – každou platbu potvrdíš, spojíš s naskenovanou účtenkou, nebo zahodíš.</div>
      ${zar.length ? `<div style="margin-top:8px">${zar.map(([dev, z]) => `<div style="display:flex;justify-content:space-between;align-items:center;font-size:.78rem;padding:4px 0;border-top:1px solid var(--border)">
          <span>📱 ${esc(z && z.name || 'Telefon')} <span style="color:#8b93ad">· propojeno ${z && z.kdy ? new Date(z.kdy).toLocaleDateString('cs-CZ') : ''}</span></span>
          <button class="btn btn-ghost btn-sm" style="font-size:.7rem" onclick="inboxOdpoj('${esc(dev)}')">Odpojit</button></div>`).join('')}</div>` : ''}
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center">
        <input class="fi" id="ib_kod" maxlength="9" placeholder="Kód z telefonu" style="flex:1 1 160px;font-size:.82rem;text-transform:uppercase;letter-spacing:.12em">
        <button class="btn btn-sm" onclick="inboxParuj()">🔗 ${zar.length ? 'Propojit další telefon' : 'Propojit telefon'}</button>
        <button class="btn btn-ghost btn-sm" onclick="_inbox=null;inboxRender()">🔄 Načíst</button></div>
    </div>
    ${prevzeti.length ? `<div class="card" style="margin-bottom:12px;border:1px solid rgba(96,165,250,.4)">
      <div style="font-weight:700;font-size:.84rem;color:var(--text);margin-bottom:6px">🧾 Účtenka převezme platbu z notifikace (${prevzeti.length})</div>
      ${prevzeti.map(({ n, u }) => `<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;font-size:.78rem;padding:5px 0;border-top:1px solid var(--border)">
        <span>📲 ${esc(n.name || '')} ${esc(kc(n.amount || n.amt))} (${esc(n.date)}) ↔ 🧾 ${esc(u.name || '')} ${esc(kc(u.amount || u.amt))}</span>
        <button class="btn btn-sm btn-primary" onclick="inboxPrevzit('${esc(n.id)}')">Převzít účtenkou</button></div>`).join('')}
      <div style="font-size:.68rem;color:#8b93ad;margin-top:4px">Transakce z notifikace se smaže, peněženka se přenese na transakci účtenky (účtenka má položky a kategorie).</div></div>` : ''}
    <div style="font-size:.76rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#a8aec8;margin:4px 0 8px">📥 Doručené (${cekaji.length})</div>
    ${cekaji.length ? cekaji.map(karta).join('') : `<div style="font-size:.78rem;color:#8b93ad;margin-bottom:12px">${zar.length ? 'Zatím nic nového z telefonu.' : 'Propoj telefon – v appce FinanceFlow Inbox klepni na „Propojit s FinanceFlow“ a kód opiš sem.'}</div>`}`;
}
//  Nerozpoznaný text → do ručního pole importu (stávající ruční parser) a zahodit z Doručených.
function inboxRucne(id) {
  const x = (_inbox || {})[id]; if (!x) return;
  const t = document.getElementById('smsInput'); if (t) { t.value = inboxText(x); t.scrollIntoView && t.scrollIntoView({ block: 'center' }); }
  inboxZahodit(id);
}
Object.assign(window, { inboxNacti, inboxRender, inboxParuj, inboxOdpoj, inboxOdpojVse, inboxPrijmout, inboxSpojitSUctenkou, inboxZahodit, inboxPrevzit, inboxRucne,
  inboxRozpoznej, inboxUctenkaK, inboxMoznaZapsano, inboxPrevzetiUctenkou, inboxText });
