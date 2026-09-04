// FinanceFlow · v10.47 · announcements.js · 2026-09-04
// ══════════════════════════════════════════════════════
//  OZNÁMENÍ / NOTIFIKACE – FinanceFlow (Session 11)
// ══════════════════════════════════════════════════════
// Firebase struktura:
//   /announcements/{id} → {title, text, type, createdAt, active}
// Práva (database.rules.json):
//   .read  = auth != null           (čtou všichni přihlášení)
//   .write = admin UID (LNEC8...)   (zapisuje pouze admin)
//
// Uživatelé: pouze ČTENÍ (karta v O aplikaci)
// Admin:     správa přes Admin panel → záložka 📢 Oznámení

const ANNOUNCEMENT_TYPES = {
  novinka:  { icon: '✨', label: 'Novinka',     color: 'var(--income)',  bg: 'rgba(74,222,128,.06)',  border: 'rgba(74,222,128,.25)' },
  tip:      { icon: '💡', label: 'Tip',         color: 'var(--premium)', bg: 'rgba(168,85,247,.06)',  border: 'rgba(168,85,247,.25)' },
  funkce:   { icon: '🚀', label: 'Nová funkce', color: 'var(--bank)',    bg: 'rgba(96,165,250,.06)',  border: 'rgba(96,165,250,.25)' },
  info:     { icon: 'ℹ️', label: 'Informace',   color: '#a8aec8',        bg: 'var(--surface2)',       border: 'var(--border)' },
  dulezite: { icon: '⚠️', label: 'Důležité',    color: 'var(--expense)', bg: 'rgba(248,113,113,.06)', border: 'rgba(248,113,113,.28)' },
  anketa:   { icon: '📊', label: 'Anketa',      color: 'var(--bank)',    bg: 'rgba(96,165,250,.06)',  border: 'rgba(96,165,250,.25)' },
};

let _announcements = [];          // cache načtených oznámení
let _announcementsLoaded = false; // anti-flicker / opakované načítání

// ══════════════════════════════════════════════════════
//  NAČTENÍ (read – pro všechny)
// ══════════════════════════════════════════════════════
async function loadAnnouncements() {
  if (_isLocalMode || !window._db) { _announcements = []; return _announcements; }
  try {
    const snap = await _get(_ref(_db, 'announcements'));
    if (snap.exists()) {
      const obj = snap.val() || {};
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 dní
      _announcements = Object.entries(obj)
        .map(([id, a]) => ({ id, ...a }))
        .filter(a => a.active !== false)
        .filter(a => (a.createdAt || 0) >= cutoff) // starší 30 dní se nezobrazují
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else {
      _announcements = [];
    }
  } catch (e) {
    console.log('loadAnnouncements error:', e);
    _announcements = [];
  }
  _announcementsLoaded = true;
  return _announcements;
}

// Datum „před chvílí / dnes / DD.MM.YYYY"
function announceDateLabel(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = Date.now();
  const diffH = (now - ts) / 36e5;
  if (diffH < 1)  return 'právě teď';
  if (diffH < 24) return `před ${Math.floor(diffH)} h`;
  if (diffH < 48) return 'včera';
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' });
}

// ══════════════════════════════════════════════════════
//  RENDER – uživatelská karta (vkládá se do O aplikaci)
// ══════════════════════════════════════════════════════
async function renderAnnouncements() {
  const el = document.getElementById('announcementsBody');
  if (!el) return;

  if (_isLocalMode || !window._currentUser) {
    // I v lokálním módu chceme vidět osobní oznámení (např. offline sync)
    const localOnly = getLocalNotifications();
    el.innerHTML = (localOnly.length ? renderLocalNotifsHTML(localOnly) : '')
      + '<div style="font-size:.8rem;color:#a8aec8;text-align:center;padding:8px">Přihlas se pro zobrazení oznámení od FinanceFlow.</div>';
    markAnnouncementsSeen();
    return;
  }

  await loadAnnouncements();
  const local = getLocalNotifications();

  if (!_announcements.length && !local.length) {
    el.innerHTML = `<div class="empty" style="padding:24px">
      <div class="ei">📭</div>
      <div class="et">Zatím žádná oznámení</div>
      <div style="font-size:.78rem;color:#a8aec8;margin-top:4px">Novinky, tipy a výsledky analýz se objeví tady.</div>
    </div>`;
    markAnnouncementsSeen();
    return;
  }

  // 1) Osobní (lokální) oznámení – např. dokončená analýza účtenky
  let html = local.length ? renderLocalNotifsHTML(local) : '';

  // 2) Oznámení od FinanceFlow (admin broadcast)
  if (_announcements.length) {
    const dismissed = _getDismissedBC();
    const visible = _announcements.filter(a => !dismissed.includes(a.id));
    html += `<div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#a8aec8;margin:${local.length ? '14px' : '2px'} 0 8px">📢 Od FinanceFlow</div>`;
    html += visible.map(a => {
      const t = ANNOUNCEMENT_TYPES[a.type] || ANNOUNCEMENT_TYPES.info;
      return `
        <div style="display:flex;gap:12px;padding:12px;border:1px solid ${t.border};background:${t.bg};border-radius:12px;margin-bottom:10px">
          <div style="font-size:1.4rem;line-height:1.2;flex-shrink:0">${t.icon}</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px">
              <span style="font-size:.9rem;font-weight:700;color:var(--text)">${escapeAnnounce(a.title || t.label)}</span>
              <span style="font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:${t.color}">${t.label}</span>
              <button class="btn btn-ghost btn-icon btn-sm" title="Smazat" style="margin-left:auto;color:var(--text3);font-size:.8rem" onclick="dismissBroadcast('${escapeAnnounce(a.id)}')">🗑️</button>
            </div>
            <div style="font-size:.82rem;color:#c2c7da;line-height:1.5;white-space:pre-wrap">${escapeAnnounce(a.text || '')}</div>
            <div style="font-size:.68rem;color:#a8aec8;margin-top:6px">${announceDateLabel(a.createdAt)}</div>
          </div>
        </div>`;
    }).join('');
  }

  el.innerHTML = html;
  markAnnouncementsSeen();
}

// HTML pro sekci osobních (lokálních) oznámení
function renderLocalNotifsHTML(local) {
  let html = `<div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#a8aec8;margin:2px 0 8px">📬 Osobní</div>`;
  html += local.map(n => {
    const color = n.color || 'var(--bank)';
    return `
      <div style="display:flex;gap:12px;padding:12px;border:1px solid var(--border);background:var(--surface2);border-radius:12px;margin-bottom:10px">
        <div style="font-size:1.4rem;line-height:1.2;flex-shrink:0">${n.icon || '🔔'}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:2px">
            <div style="font-size:.9rem;font-weight:700;color:var(--text);flex:1">${escapeAnnounce(n.title || 'Oznámení')}</div>
            <button class="btn btn-ghost btn-icon btn-sm" title="Smazat" style="flex-shrink:0;color:var(--text3);font-size:.8rem" onclick="dismissLocalNotification('${escapeAnnounce(n.id)}')">🗑️</button>
          </div>
          <div style="font-size:.82rem;color:#c2c7da;line-height:1.5">${escapeAnnounce(n.text || '')}</div>
          ${n.link ? `<button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="openNotifLink('${escapeAnnounce(n.link.kind)}')">${escapeAnnounce(n.link.label || 'Zobrazit')} ›</button>` : ''}
          <div style="font-size:.68rem;color:#a8aec8;margin-top:6px">${announceDateLabel(n.createdAt)}</div>
        </div>
      </div>`;
  }).join('');
  return html;
}

// Jednoduchý escape proti vložení HTML do oznámení
function escapeAnnounce(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;');
}

// ══════════════════════════════════════════════════════
//  OSOBNÍ (LOKÁLNÍ) OZNÁMENÍ – per-zařízení, localStorage
//  Generuje sama aplikace (např. dokončená offline analýza účtenky).
//  Úložiště: Firebase users/{uid}/notifications (sync mezi zařízeními),
//  localStorage jako cache/offline fallback. (Session 11 – prototyp)
// ══════════════════════════════════════════════════════
const LS_LOCAL_NOTIFS = 'ff_local_notifs';
let _personalNotifs = [];   // canonical cache pro render (Firebase ∪ localStorage)

function _readLocalNotifsLS() {
  try {
    const arr = JSON.parse(localStorage.getItem(LS_LOCAL_NOTIFS) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}
function _writeLocalNotifsLS(list) {
  try { localStorage.setItem(LS_LOCAL_NOTIFS, JSON.stringify(list.slice(0, 30))); } catch (e) {}
}

// Synchronní getter pro render/badge – vrací aktuální cache (seřazeno)
function getLocalNotifications() {
  const src = _personalNotifs.length ? _personalNotifs : _readLocalNotifsLS();
  return [...src].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

// Načte osobní oznámení z Firebase (users/{uid}/notifications) + sync do cache/LS
async function loadPersonalNotifs() {
  if (_isLocalMode || !window._currentUser || !window._db) {
    _personalNotifs = _readLocalNotifsLS();
    return _personalNotifs;
  }
  try {
    const uid = window._currentUser.uid;
    const snap = await _get(_ref(_db, `users/${uid}/notifications`));
    const obj = snap.exists() ? (snap.val() || {}) : {};
    _personalNotifs = Object.entries(obj).map(([id, n]) => ({ ...n, id }));
    _writeLocalNotifsLS(_personalNotifs); // mirror pro offline
  } catch (e) {
    console.log('loadPersonalNotifs error:', e);
    _personalNotifs = _readLocalNotifsLS();
  }
  return _personalNotifs;
}

// Přidá osobní oznámení. opts: {icon, title, text, link:{kind,label}, color}
function addLocalNotification(opts = {}) {
  const notif = {
    id: 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
    icon: opts.icon || '🔔',
    title: opts.title || 'Oznámení',
    text: opts.text || '',
    link: opts.link || null,
    color: opts.color || null,
    createdAt: Date.now(),
    read: false,
  };
  _personalNotifs.unshift(notif);
  _writeLocalNotifsLS(_personalNotifs);
  // Zápis do Firebase (sync mezi zařízeními)
  if (!_isLocalMode && window._currentUser && window._db) {
    try { _set(_ref(_db, `users/${window._currentUser.uid}/notifications/${notif.id}`), notif); }
    catch (e) { console.log('addLocalNotification FB error:', e); }
  }
  updateAnnounceBadge();
  // Pokud je modal otevřený, překresli
  if (document.getElementById('ffNotifModal')) renderNotifModalBody();
}

function dismissNotification(id) {
  _personalNotifs = _personalNotifs.filter(n => n.id !== id);
  _writeLocalNotifsLS(_personalNotifs);
  if (!_isLocalMode && window._currentUser && window._db) {
    try { _set(_ref(_db, `users/${window._currentUser.uid}/notifications/${id}`), null); } catch (e) {}
  }
  if (document.getElementById('ffNotifModal')) renderNotifModalBody();
  updateAnnounceBadge();
}
// zpětná kompatibilita se starým názvem
function dismissLocalNotification(id) { dismissNotification(id); }

// Skryje admin broadcast zprávu lokálně (přidá do dismissed listu v LS)
const LS_DISMISSED_BC = 'ff_dismissed_broadcasts';
function _getDismissedBC() { try { return JSON.parse(localStorage.getItem(LS_DISMISSED_BC)||'[]'); } catch(e){ return []; } }
function dismissBroadcast(id) {
  const list = _getDismissedBC();
  if (!list.includes(id)) { list.push(id); try { localStorage.setItem(LS_DISMISSED_BC, JSON.stringify(list.slice(-100))); } catch(e){} }
  renderAnnouncements();
  if (document.getElementById('ffNotifModalBody')) renderNotifModalBody();
}
window.dismissBroadcast = dismissBroadcast;

// Routing odkazů z osobních oznámení (bez eval – mapa akcí)
function openNotifLink(kind) {
  closeNotificationsModal();
  if (kind === 'receiptHistory') {
    if (typeof showPage === 'function') showPage('uctenky');
    setTimeout(() => {
      const btn = document.getElementById('utab-history');
      if (btn && typeof switchUctenkyTab === 'function') switchUctenkyTab('history', btn);
    }, 120);
  }
}
window.addLocalNotification = addLocalNotification; // dostupné i pro offline-sync.js

// ══════════════════════════════════════════════════════
//  BADGE – počet nepřečtených (admin + osobní). Aktualizuje
//  značku na řádku (#announceBadge) i v navigaci (#navAnnounceBadge).
// ══════════════════════════════════════════════════════
// FIX-323 (S21): klíč bez uid znamenal, že odkliknuté oznámení zmizelo VŠEM
//   účtům na daném prohlížeči – druhý uživatel by ho nikdy neuviděl.
function _announceSeenKey(){
  const uid = window._currentUser?.uid;
  return uid ? `ff_announce_seen_${uid}` : 'ff_announce_seen_local';
}

function getLastSeenAnnounce() {
  try { return parseInt(localStorage.getItem(_announceSeenKey()) || '0', 10) || 0; }
  catch (e) { return 0; }
}
function markAnnouncementsSeen() {
  try {
    const newestAdmin = _announcements[0]?.createdAt || 0;
    const newestLocal = getLocalNotifications()[0]?.createdAt || 0;
    const newest = Math.max(newestAdmin, newestLocal);
    if (newest) localStorage.setItem(_announceSeenKey(), String(newest));
  } catch (e) {}
  updateAnnounceBadge(0);
}
function unreadAnnouncementsCount() {
  const seen = getLastSeenAnnounce();
  const admin = _announcements.filter(a => (a.createdAt || 0) > seen).length;
  const local = getLocalNotifications().filter(n => (n.createdAt || 0) > seen).length;
  return admin + local;
}
function updateAnnounceBadge(count) {
  const n = (typeof count === 'number') ? count : unreadAnnouncementsCount();
  ['announceBadge', 'navAnnounceBadge'].forEach(id => {
    const b = document.getElementById(id);
    if (!b) return;
    if (n > 0) { b.textContent = n; b.style.display = 'inline-flex'; }
    else { b.style.display = 'none'; }
  });
}

// ══════════════════════════════════════════════════════
//  ADMIN – správa oznámení (jen admin UID)
// ══════════════════════════════════════════════════════
async function loadAdminAnnouncements() {
  const el = document.getElementById('adminAnnounceList');
  if (!el) return;
  if (typeof isAdmin === 'function' && !isAdmin()) {
    el.innerHTML = '<div class="empty"><div class="et">🔐 Přístup odepřen</div></div>';
    return;
  }
  el.innerHTML = '<div class="empty"><div class="et">⏳ Načítám...</div></div>';
  try {
    const snap = await _get(_ref(_db, 'announcements'));
    const obj = snap.exists() ? (snap.val() || {}) : {};
    const list = Object.entries(obj)
      .map(([id, a]) => ({ id, ...a }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    if (!list.length) {
      el.innerHTML = '<div class="empty"><div class="ei">📭</div><div class="et">Žádná oznámení. Vytvoř první nahoře.</div></div>';
      return;
    }

    el.innerHTML = list.map(a => {
      const t = ANNOUNCEMENT_TYPES[a.type] || ANNOUNCEMENT_TYPES.info;
      const active = a.active !== false;
      return `
        <div style="display:flex;gap:10px;align-items:flex-start;padding:11px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px;background:var(--surface2);${active?'':'opacity:.5'}">
          <div style="font-size:1.2rem">${t.icon}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:.86rem;font-weight:700;color:var(--text)">${escapeAnnounce(a.title || t.label)} <span style="font-size:.64rem;color:${t.color};text-transform:uppercase">${t.label}</span></div>
            <div style="font-size:.78rem;color:#c2c7da;margin-top:2px;white-space:pre-wrap">${escapeAnnounce(a.text || '')}</div>
            <div style="font-size:.66rem;color:#a8aec8;margin-top:4px">${announceDateLabel(a.createdAt)}${active?'':' · skryto'}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px">
            <button class="btn btn-ghost btn-icon btn-sm" title="Upravit" onclick="editAnnouncement('${a.id}')">✎</button>
            <button class="btn btn-ghost btn-icon btn-sm" title="${active?'Skrýt':'Zobrazit'}" onclick="toggleAnnouncement('${a.id}',${active})">${active?'👁️':'🚫'}</button>
            <button class="btn btn-danger btn-icon btn-sm" title="Smazat" onclick="deleteAnnouncement('${a.id}')">✕</button>
          </div>
        </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = '<div class="empty"><div class="et">⚠️ Chyba načítání: ' + escapeAnnounce(e.message) + '</div></div>';
  }
}

let _editingAnnId = null; // null = nové oznámení; jinak id editovaného

async function addAnnouncement() {
  if (typeof isAdmin === 'function' && !isAdmin()) { alert('🔐 Pouze admin'); return; }
  const type  = document.getElementById('annNewType')?.value || 'info';
  const title = (document.getElementById('annNewTitle')?.value || '').trim();
  const text  = (document.getElementById('annNewText')?.value || '').trim();

  if (!title) { alert(type === 'anketa' ? 'Zadej otázku ankety (do pole Nadpis).' : 'Zadej nadpis oznámení.'); return; }

  // Anketa: text je nepovinný, ale options povinné (min. 2)
  let options = null;
  if (type === 'anketa') {
    options = (document.getElementById('annNewOptions')?.value || '')
      .split('\n').map(s => s.trim()).filter(Boolean);
    if (options.length < 2) { alert('Zadej alespoň 2 možnosti ankety (každou na svůj řádek).'); return; }
  } else if (!text) {
    alert('Zadej text oznámení.'); return;
  }

  try {
    if (_editingAnnId) {
      // UPRAVA stávajícího – zachová createdAt i active (merge přes update)
      await _update(_ref(_db, `announcements/${_editingAnnId}`), {
        title, text, type,
        options: type === 'anketa' ? options : null,
        editedAt: Date.now(),
      });
      if (typeof showToast === 'function') showToast('💾 Oznámení upraveno');
      cancelEditAnnouncement();
    } else {
      // NOVÉ oznámení
      const id = 'a_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const payload = {
        title, text, type,
        createdAt: Date.now(),
        active: true,
        author: window._currentUser?.uid || 'admin',
      };
      if (options) payload.options = options;
      await _set(_ref(_db, `announcements/${id}`), payload);
      const ti = document.getElementById('annNewTitle'); if (ti) ti.value = '';
      const tx = document.getElementById('annNewText');  if (tx) tx.value = '';
      const op = document.getElementById('annNewOptions'); if (op) op.value = '';
      if (typeof showToast === 'function') showToast(type === 'anketa' ? '✅ Anketa zveřejněna' : '✅ Oznámení zveřejněno');
      // Volitelně i push všem odběratelům
      const pushChk = document.getElementById('annPushToo');
      if (pushChk && pushChk.checked) { sendBroadcastPush(title, type === 'anketa' ? title : (text || title)); pushChk.checked = false; }
    }
    loadAdminAnnouncements();
  } catch (e) {
    alert('⚠️ Nepodařilo se uložit: ' + e.message);
  }
}

// Načte oznámení do formuláře a přepne na režim úpravy
async function editAnnouncement(id) {
  if (typeof isAdmin === 'function' && !isAdmin()) { alert('🔐 Pouze admin'); return; }
  try {
    const snap = await _get(_ref(_db, `announcements/${id}`));
    if (!snap.exists()) { alert('Oznámení nenalezeno'); return; }
    const a = snap.val();
    const tySel = document.getElementById('annNewType');
    if (tySel) tySel.value = a.type || 'info';
    const ti = document.getElementById('annNewTitle'); if (ti) ti.value = a.title || '';
    const tx = document.getElementById('annNewText');  if (tx) tx.value = a.text || '';
    const op = document.getElementById('annNewOptions'); if (op) op.value = (a.options || []).join('\n');
    // zobraz/skryj pole možností ankety
    const row = document.getElementById('annOptionsRow');
    if (row) row.style.display = (a.type === 'anketa') ? 'block' : 'none';

    _editingAnnId = id;
    const btn = document.getElementById('annPublishBtn');
    if (btn) btn.innerHTML = '💾 Uložit změny <span style="font-weight:400">· <a onclick="cancelEditAnnouncement();event.stopPropagation()" style="text-decoration:underline;cursor:pointer">zrušit</a></span>';
    if (ti) ti.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (e) { alert('⚠️ Chyba: ' + e.message); }
}

function cancelEditAnnouncement() {
  _editingAnnId = null;
  const ti = document.getElementById('annNewTitle'); if (ti) ti.value = '';
  const tx = document.getElementById('annNewText');  if (tx) tx.value = '';
  const op = document.getElementById('annNewOptions'); if (op) op.value = '';
  const row = document.getElementById('annOptionsRow'); if (row) row.style.display = 'none';
  const btn = document.getElementById('annPublishBtn'); if (btn) btn.textContent = '📢 Zveřejnit oznámení';
}
window.editAnnouncement = editAnnouncement;
window.cancelEditAnnouncement = cancelEditAnnouncement;

async function deleteAnnouncement(id) {
  if (typeof isAdmin === 'function' && !isAdmin()) { alert('🔐 Pouze admin'); return; }
  if (!confirm('Opravdu smazat toto oznámení?')) return;
  try {
    await _set(_ref(_db, `announcements/${id}`), null); // RTDB: set(null) = smazání
    if (typeof showToast === 'function') showToast('🗑️ Smazáno');
    loadAdminAnnouncements();
  } catch (e) {
    alert('⚠️ Nepodařilo se smazat: ' + e.message);
  }
}

async function toggleAnnouncement(id, currentlyActive) {
  if (typeof isAdmin === 'function' && !isAdmin()) { alert('🔐 Pouze admin'); return; }
  try {
    await _update(_ref(_db, `announcements/${id}`), { active: !currentlyActive });
    loadAdminAnnouncements();
  } catch (e) {
    alert('⚠️ Chyba: ' + e.message);
  }
}

// ══════════════════════════════════════════════════════
//  Řádek „📢 Oznámení" v O aplikaci → otevře vyskakovací okno
//  (dříve rozbaloval inline panel; Session 11 – nyní modal)
// ══════════════════════════════════════════════════════
function toggleAnnouncementsPanel() {
  openNotificationsModal();
}

// Načte oznámení (admin + osobní) a aktualizuje badge na řádku i v navigaci.
// Volá se při otevření stránky O aplikaci a po startu.
async function initAnnouncementsBadge() {
  try {
    if (_isLocalMode || !window._currentUser) { _announcements = []; }
    else { await loadAnnouncements(); }
    await loadPersonalNotifs();
    await ensureWelcomeNotification();
  } catch (e) {}
  updateAnnounceBadge();
}

// ══════════════════════════════════════════════════════
//  VYSKAKOVACÍ OKNO OZNÁMENÍ (Session 11 – prototyp)
//  Zprávy ve formě obálek: ✉️ nepřečtené / 📭 přečtené,
//  klik rozbalí/sbalí, osobní lze smazat. Slučuje admin
//  broadcast (/announcements) + osobní (users/{uid}/notifications).
// ══════════════════════════════════════════════════════
let _notifExpanded = new Set();   // id rozbalených zpráv
let _notifSeenSnapshot = 0;       // ff_announce_seen v okamžiku otevření

function _notifInjectStyle() {
  if (document.getElementById('ffNotifStyle')) return;
  const st = document.createElement('style');
  st.id = 'ffNotifStyle';
  st.textContent = `
    #ffNotifModal{position:fixed;inset:0;background:var(--bg,#0e1117);z-index:10001;display:flex;flex-direction:column}
    #ffNotifSheet{flex:1;display:flex;flex-direction:column;width:100%;max-width:640px;margin:0 auto}
    .ffnotif-msg{border:1px solid var(--border);border-radius:12px;margin-bottom:10px;overflow:hidden;background:var(--surface2)}
    .ffnotif-head{display:flex;align-items:center;gap:11px;padding:12px;cursor:pointer}
    .ffnotif-head:hover{background:rgba(255,255,255,.03)}
    .ffnotif-body{padding:0 12px 12px 46px;font-size:.84rem;color:#c2c7da;line-height:1.55;white-space:pre-wrap}
    .ffnotif-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--bank);margin-left:6px;vertical-align:middle}
  `;
  document.head.appendChild(st);
}

function openNotificationsModal() {
  _notifInjectStyle();
  if (document.getElementById('ffNotifModal')) return;
  _notifSeenSnapshot = getLastSeenAnnounce();

  const modal = document.createElement('div');
  modal.id = 'ffNotifModal';
  modal.innerHTML = `
    <div id="ffNotifSheet">
      <div style="background:var(--surface);border-bottom:1px solid var(--border);padding:14px 16px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:1">
        <button onclick="closeNotificationsModal()" style="background:none;border:none;color:var(--text2);font-size:1.4rem;line-height:1;cursor:pointer;padding:4px 8px 4px 2px">←</button>
        <span style="font-size:1.1rem;font-weight:700;color:var(--text)">📭 Zprávy</span>
      </div>
      <div id="ffNotifModalBody" style="padding:14px;overflow-y:auto;flex:1"></div>
    </div>`;
  document.body.appendChild(modal);

  // Načti aktuální data (admin + osobní) a vykresli
  Promise.all([
    (_isLocalMode || !window._currentUser) ? Promise.resolve() : loadAnnouncements(),
    loadPersonalNotifs(),
    loadPollVotes(),
  ]).then(() => {
    renderNotifModalBody();
    // Označ jako přečtené (badge zmizí), dots zůstanou dle snapshotu
    markAnnouncementsSeen();
  });
  renderNotifModalBody(); // okamžitý render z cache (než dorazí Firebase)
}

function closeNotificationsModal() {
  const m = document.getElementById('ffNotifModal');
  if (m) m.remove();
}

// Sloučí admin + osobní do jednoho seznamu zpráv (newest first)
function _notifMergedList() {
  const admin = (_announcements || []).map(a => {
    const t = ANNOUNCEMENT_TYPES[a.type] || ANNOUNCEMENT_TYPES.info;
    return { kind: 'admin', id: 'adm_' + (a.id || a.createdAt), realId: a.id, type: a.type,
             options: a.options || null, icon: t.icon, title: a.title || t.label,
             text: a.text || '', typeLabel: t.label, color: t.color, createdAt: a.createdAt || 0 };
  });
  const personal = getLocalNotifications().map(n => ({
    kind: 'personal', id: n.id, icon: n.icon || '🔔', title: n.title || 'Oznámení',
    text: n.text || '', link: n.link || null, color: n.color || null, createdAt: n.createdAt || 0,
  }));
  return [...admin, ...personal].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

function renderNotifModalBody() {
  const el = document.getElementById('ffNotifModalBody');
  if (!el) return;
  const list = _notifMergedList();

  if (!list.length) {
    el.innerHTML = `<div class="empty" style="padding:32px">
      <div class="ei">📭</div>
      <div class="et">Žádná oznámení</div>
      <div style="font-size:.78rem;color:#a8aec8;margin-top:4px">Novinky, tipy a výsledky analýz se objeví tady.</div>
    </div>`;
    return;
  }

  el.innerHTML = list.map(m => {
    const unread = (m.createdAt || 0) > _notifSeenSnapshot;
    const open = _notifExpanded.has(m.id);
    const envelope = unread ? '✉️' : '📭';
    return `
      <div class="ffnotif-msg">
        <div class="ffnotif-head" onclick="toggleNotifMsg('${escapeAnnounce(m.id)}')">
          <span style="font-size:1.3rem;line-height:1">${envelope}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:.9rem;font-weight:${unread ? '700' : '600'};color:var(--text)">
              ${m.icon ? m.icon + ' ' : ''}${escapeAnnounce(m.title)}${unread ? '<span class="ffnotif-dot"></span>' : ''}
            </div>
            <div style="font-size:.68rem;color:#a8aec8;margin-top:2px">${announceDateLabel(m.createdAt)}${m.kind === 'admin' ? ' · od FinanceFlow' : ''}</div>
          </div>
          <button onclick="event.stopPropagation();${m.kind==='admin' ? `dismissBroadcast('${escapeAnnounce(m.realId||m.id)}')` : `dismissNotification('${escapeAnnounce(m.id)}')`}" style="background:none;border:none;color:var(--text3);cursor:pointer;padding:6px;font-size:.95rem;flex-shrink:0;line-height:1" title="Smazat">🗑️</button>
          <span style="color:#a8aec8;transition:transform .2s;transform:rotate(${open ? '90' : '0'}deg)">›</span>
        </div>
        <div class="ffnotif-body" style="display:${open ? 'block' : 'none'}">
          ${escapeAnnounce(m.text)}
          ${(m.type === 'anketa' && m.options) ? _renderPollHTML(m) : ''}
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
            ${m.link ? `<button class="btn btn-ghost btn-sm" onclick="openNotifLink('${escapeAnnounce(m.link.kind)}')">${escapeAnnounce(m.link.label || 'Zobrazit')} ›</button>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

function toggleNotifMsg(id) {
  if (_notifExpanded.has(id)) _notifExpanded.delete(id);
  else _notifExpanded.add(id);
  renderNotifModalBody();
}
window.openNotificationsModal = openNotificationsModal;

// ══════════════════════════════════════════════════════
//  ANKETA (poll) – hlasy v /poll_votes/{pollId}/{uid} = index volby
// ══════════════════════════════════════════════════════
let _pollVotes = {};   // { pollId: { uid: optionIdx } }

async function loadPollVotes() {
  if (_isLocalMode || !window._currentUser || !window._db) { _pollVotes = {}; return; }
  try {
    const snap = await _get(_ref(_db, 'poll_votes'));
    _pollVotes = snap.exists() ? (snap.val() || {}) : {};
  } catch (e) { _pollVotes = {}; }
}

function votePoll(pollId, idx) {
  if (!window._currentUser || !window._db) {
    if (typeof showToast === 'function') showToast('Pro hlasování se přihlas');
    return;
  }
  const uid = window._currentUser.uid;
  try {
    _set(_ref(_db, `poll_votes/${pollId}/${uid}`), idx);
    if (!_pollVotes[pollId]) _pollVotes[pollId] = {};
    _pollVotes[pollId][uid] = idx;
    renderNotifModalBody();
  } catch (e) { console.log('votePoll error:', e); }
}

function _renderPollHTML(m) {
  const myUid  = window._currentUser?.uid;
  const votes  = _pollVotes[m.realId] || {};
  const myVote = myUid ? votes[myUid] : undefined;
  const voted  = myVote !== undefined && myVote !== null;
  const counts = (m.options || []).map((_, i) => Object.values(votes).filter(v => v === i).length);
  const total  = counts.reduce((a, b) => a + b, 0);

  const rows = (m.options || []).map((opt, i) => {
    if (voted) {
      const pct  = total ? Math.round(counts[i] / total * 100) : 0;
      const mine = myVote === i;
      return `<div style="margin-bottom:7px">
        <div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:3px">
          <span>${mine ? '✅ ' : ''}${escapeAnnounce(opt)}</span>
          <span style="color:#a8aec8">${pct}% · ${counts[i]}</span>
        </div>
        <div style="height:8px;background:var(--surface);border-radius:5px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${mine ? 'var(--income)' : 'var(--bank)'};border-radius:5px"></div>
        </div></div>`;
    }
    return `<button class="btn btn-ghost btn-sm" style="display:block;width:100%;text-align:left;margin-bottom:6px"
      onclick="votePoll('${escapeAnnounce(m.realId)}',${i})">${escapeAnnounce(opt)}</button>`;
  }).join('');

  return `<div style="margin-top:10px">${rows}
    <div style="font-size:.68rem;color:#a8aec8;margin-top:4px">${voted ? `Celkem hlasů: ${total} · klikni na jinou možnost pro změnu` : 'Vyber jednu možnost'}</div>
  </div>`;
}
window.votePoll = votePoll;

// ══════════════════════════════════════════════════════
//  UVÍTACÍ ZPRÁVA pro nové uživatele (jednou, flag v users/{uid}/meta/welcomed)
// ══════════════════════════════════════════════════════
async function ensureWelcomeNotification() {
  if (_isLocalMode || !window._currentUser || !window._db) return;
  try {
    const uid = window._currentUser.uid;
    const snap = await _get(_ref(_db, `users/${uid}/meta/welcomed`));
    if (snap.exists() && snap.val()) return; // už uvítán
    addLocalNotification({
      icon: '👋',
      title: 'Vítej ve FinanceFlow!',
      text: 'Jsem rád, že tu jsi. Naskenuj první účtenku nebo přidej transakci a aplikace ti začne počítat tvůj finanční obraz – přehledy, predikce i srovnání s ČR. Hodně štěstí na cestě k lepším financím! 💚',
      color: 'var(--income)',
    });
    _set(_ref(_db, `users/${uid}/meta/welcomed`), true);
  } catch (e) { console.log('welcome error:', e); }
}


// Auto-refresh badge po startu (až je auth pravděpodobně k dispozici)
function _announceAutoInit() {
  setTimeout(() => { try { initAnnouncementsBadge(); } catch (e) {} }, 3500);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _announceAutoInit);
else _announceAutoInit();

// ══════════════════════════════════════════════════════
//  ADMIN broadcast push (Session 11, v7.42)
//  Načte odběratele z push_subs (čte jen admin) a zavolá Worker /push.
//  Worker URL + PUSH_SECRET drží admin lokálně (localStorage, ne ve sdíleném kódu).
// ══════════════════════════════════════════════════════
async function sendBroadcastPush(title, body) {
  let url = localStorage.getItem('ff_push_worker_url');
  let secret = localStorage.getItem('ff_push_secret');
  if (!url) { url = prompt('URL push Workeru (např. https://misty-limit-0523.bc-milda.workers.dev/push):'); if (url) localStorage.setItem('ff_push_worker_url', url.trim()); else return; }
  if (!secret) { secret = prompt('PUSH_SECRET (stejný jako v Cloudflare Worker secrets):'); if (secret) localStorage.setItem('ff_push_secret', secret.trim()); else return; }
  try {
    const snap = await _get(_ref(_db, 'push_subs'));
    const obj = snap.exists() ? (snap.val() || {}) : {};
    const subscriptions = Object.values(obj)
      .filter(s => s && s.endpoint && s.keys)
      .map(s => ({ endpoint: s.endpoint, keys: s.keys }));
    if (!subscriptions.length) { if (typeof showToast === 'function') showToast('Zatím žádní odběratelé push'); return; }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-push-secret': secret },
      body: JSON.stringify({ subscriptions, payload: { title: title || 'FinanceFlow', body: body || 'Nové oznámení', url: './', tag: 'ff-broadcast' } }),
    });
    const data = await res.json().catch(() => ({}));
    if (typeof showToast === 'function') showToast('📲 Push odesláno: ' + (data.sent || 0) + ' odběratelům');
  } catch (e) { alert('Push broadcast selhal: ' + e.message); }
}
window.sendBroadcastPush = sendBroadcastPush;

// ── Admin: úklid starých oznámení (Session 11, v7.48) ──
// Uživatelům se starší 30 dní nezobrazují (filtr v loadAnnouncements),
// tato funkce je navíc fyzicky smaže z Firebase, ať se nevrství.
async function cleanupOldAnnouncements() {
  if (typeof isAdmin === 'function' && !isAdmin()) { alert('🔐 Pouze admin'); return; }
  if (!confirm('Smazat všechna oznámení starší 30 dní z databáze? Tato akce je nevratná.')) return;
  try {
    const snap = await _get(_ref(_db, 'announcements'));
    if (!snap.exists()) { if (typeof showToast === 'function') showToast('Žádná oznámení'); return; }
    const obj = snap.val() || {};
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let removed = 0;
    for (const [id, a] of Object.entries(obj)) {
      if ((a.createdAt || 0) < cutoff) {
        await _set(_ref(_db, `announcements/${id}`), null);
        await _set(_ref(_db, `poll_votes/${id}`), null); // i hlasy ankety, pokud byly
        removed++;
      }
    }
    if (typeof showToast === 'function') showToast(`🗑️ Smazáno ${removed} starých oznámení`);
    loadAdminAnnouncements();
  } catch (e) { alert('Chyba úklidu: ' + e.message); }
}
window.cleanupOldAnnouncements = cleanupOldAnnouncements;

// ══════════════════════════════════════════════════════
//  S12.1n: UVÍTACÍ HLÁŠKA pro nové uživatele
//  /welcomeMessage → {title, body, version, active, updatedAt}
//  Zobrazí se JEDNOU při prvním spuštění (modal přes obrazovku).
//  „Verze" hlášky: změní-li admin verzi, zobrazí se znovu i
//  stávajícím uživatelům (LS klíč ff_welcome_seen = poslední viděná verze).
//  Editovatelné v Admin → Oznámení. Připraveno na budoucí návod.
// ══════════════════════════════════════════════════════
const LS_WELCOME_SEEN = 'ff_welcome_seen';

async function loadWelcomeMessage() {
  if (_isLocalMode || !window._db) return null;
  try {
    const snap = await _get(_ref(_db, 'welcomeMessage'));
    return snap.exists() ? snap.val() : null;
  } catch (e) { console.log('loadWelcomeMessage error:', e); return null; }
}

// Zobraz uvítací modal, pokud je aktivní a uživatel tuto verzi ještě neviděl
async function maybeShowWelcome() {
  if (viewingUid) return; // ne v admin náhledu cizího účtu
  const w = await loadWelcomeMessage();
  if (!w || w.active === false || !w.title) return;
  let seen = '';
  try { seen = localStorage.getItem(LS_WELCOME_SEEN) || ''; } catch(e){}
  const ver = String(w.version || '1');
  if (seen === ver) return; // tuto verzi už viděl
  showWelcomeModal(w, ver);
}

function showWelcomeModal(w, ver) {
  const existing = document.getElementById('welcomeOverlay');
  if (existing) existing.remove();
  const ov = document.createElement('div');
  ov.id = 'welcomeOverlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(8,10,18,.86);display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(3px)';
  const bodyHtml = escapeAnnounce(w.body || '').replace(/\n/g, '<br>');
  ov.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:18px;max-width:440px;width:100%;max-height:86vh;overflow-y:auto;box-shadow:0 24px 70px rgba(0,0,0,.5)">
      <div style="padding:22px 22px 0;text-align:center">
        <div style="font-size:2.2rem;margin-bottom:6px">${escapeAnnounce(w.icon || '👋')}</div>
        <div style="font-family:Syne,sans-serif;font-size:1.25rem;font-weight:800;color:var(--text)">${escapeAnnounce(w.title)}</div>
      </div>
      <div style="padding:14px 22px 4px;font-size:.9rem;line-height:1.6;color:#c2c7da">${bodyHtml}</div>
      <div style="padding:16px 22px 22px">
        <button onclick="dismissWelcome('${escapeAnnounce(ver)}')" style="width:100%;padding:13px;border:none;border-radius:12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:.92rem;font-weight:700;cursor:pointer">Rozumím, jdeme na to! 🚀</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
}

function dismissWelcome(ver) {
  try { localStorage.setItem(LS_WELCOME_SEEN, String(ver || '1')); } catch(e){}
  const ov = document.getElementById('welcomeOverlay');
  if (ov) ov.remove();
}

// ── ADMIN: editace uvítací hlášky ──
async function loadAdminWelcome() {
  const el = document.getElementById('adminWelcomeEditor'); if (!el) return;
  const w = await loadWelcomeMessage() || {};
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
  set('welcomeIcon', w.icon || '👋');
  set('welcomeTitle', w.title || '');
  set('welcomeBody', w.body || '');
  set('welcomeVersion', w.version || '1');
  const chk = document.getElementById('welcomeActive'); if (chk) chk.checked = w.active !== false;
  const prev = document.getElementById('welcomePreviewWrap'); if (prev) prev.style.display = w.title ? 'block' : 'none';
  renderWelcomeEmojiPickers();
}

// Sada emotikonů pro uvítací hlášku (ikona + vkládání do textu)
const WELCOME_EMOJIS = ['👋','🎉','💰','📊','🚀','✨','🎯','💎','🔥','👍','😊','🙌','💪','📈','🏆','⭐','❤️','🤝','📱','🎁','✅','🌟','💡','🔔','🎈','🏠','🍀','☀️'];
function renderWelcomeEmojiPickers() {
  const iconWrap = document.getElementById('welcomeIconPicker');
  if (iconWrap) {
    iconWrap.innerHTML = WELCOME_EMOJIS.map(e =>
      `<button type="button" onclick="welcomeSetIcon('${e}')" style="width:34px;height:34px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center">${e}</button>`
    ).join('');
  }
  const emojiWrap = document.getElementById('welcomeEmojiPicker');
  if (emojiWrap) {
    emojiWrap.innerHTML = WELCOME_EMOJIS.map(e =>
      `<button type="button" onclick="welcomeInsertEmoji('${e}')" style="width:34px;height:34px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center">${e}</button>`
    ).join('');
  }
}
function welcomeSetIcon(e) {
  const inp = document.getElementById('welcomeIcon'); if (inp) inp.value = e;
}
function welcomeInsertEmoji(e) {
  const ta = document.getElementById('welcomeBody'); if (!ta) return;
  const start = ta.selectionStart ?? ta.value.length;
  const end = ta.selectionEnd ?? ta.value.length;
  ta.value = ta.value.slice(0, start) + e + ta.value.slice(end);
  ta.focus();
  const pos = start + e.length;
  ta.setSelectionRange(pos, pos);
}

async function saveAdminWelcome() {
  if (!window._db) { alert('Není připojení k databázi'); return; }
  const w = {
    icon: document.getElementById('welcomeIcon').value.trim() || '👋',
    title: document.getElementById('welcomeTitle').value.trim(),
    body: document.getElementById('welcomeBody').value.trim(),
    version: document.getElementById('welcomeVersion').value.trim() || '1',
    active: document.getElementById('welcomeActive').checked,
    updatedAt: Date.now(),
  };
  if (!w.title) { alert('Zadej nadpis uvítací hlášky'); return; }
  try {
    await _set(_ref(_db, 'welcomeMessage'), w);
    alert('✅ Uvítací hláška uložena.\n\nZobrazí se novým uživatelům. Pokud jsi zvýšil „verzi", uvidí ji znovu i stávající uživatelé.');
  } catch (e) { alert('Chyba uložení: ' + e.message); }
}

// Náhled „jak to uvidí uživatel" (admin)
function previewAdminWelcome() {
  const w = {
    icon: document.getElementById('welcomeIcon').value.trim() || '👋',
    title: document.getElementById('welcomeTitle').value.trim() || '(nadpis)',
    body: document.getElementById('welcomeBody').value,
    version: '_preview',
  };
  showWelcomeModal(w, '_preview');
}
