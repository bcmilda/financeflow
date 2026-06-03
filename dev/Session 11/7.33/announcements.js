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
      _announcements = Object.entries(obj)
        .map(([id, a]) => ({ id, ...a }))
        .filter(a => a.active !== false)
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
    el.innerHTML = '<div style="font-size:.8rem;color:#a8aec8;text-align:center;padding:8px">Přihlas se pro zobrazení oznámení.</div>';
    return;
  }

  await loadAnnouncements();

  if (!_announcements.length) {
    el.innerHTML = `<div class="empty" style="padding:24px">
      <div class="ei">📭</div>
      <div class="et">Zatím žádná oznámení</div>
      <div style="font-size:.78rem;color:#a8aec8;margin-top:4px">Novinky, tipy a nové funkce se objeví tady.</div>
    </div>`;
    return;
  }

  el.innerHTML = _announcements.map(a => {
    const t = ANNOUNCEMENT_TYPES[a.type] || ANNOUNCEMENT_TYPES.info;
    return `
      <div style="display:flex;gap:12px;padding:12px;border:1px solid ${t.border};background:${t.bg};border-radius:12px;margin-bottom:10px">
        <div style="font-size:1.4rem;line-height:1.2;flex-shrink:0">${t.icon}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px">
            <span style="font-size:.9rem;font-weight:700;color:var(--text)">${escapeAnnounce(a.title || t.label)}</span>
            <span style="font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:${t.color}">${t.label}</span>
          </div>
          <div style="font-size:.82rem;color:#c2c7da;line-height:1.5;white-space:pre-wrap">${escapeAnnounce(a.text || '')}</div>
          <div style="font-size:.68rem;color:#a8aec8;margin-top:6px">${announceDateLabel(a.createdAt)}</div>
        </div>
      </div>`;
  }).join('');

  // Po zobrazení označ jako přečtené (badge)
  markAnnouncementsSeen();
}

// Jednoduchý escape proti vložení HTML do oznámení
function escapeAnnounce(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ══════════════════════════════════════════════════════
//  BADGE – počet nepřečtených (lehká logika přes localStorage)
// ══════════════════════════════════════════════════════
function getLastSeenAnnounce() {
  try { return parseInt(localStorage.getItem('ff_announce_seen') || '0', 10) || 0; }
  catch (e) { return 0; }
}
function markAnnouncementsSeen() {
  try {
    const newest = _announcements[0]?.createdAt || 0;
    if (newest) localStorage.setItem('ff_announce_seen', String(newest));
  } catch (e) {}
  updateAnnounceBadge(0);
}
function unreadAnnouncementsCount() {
  const seen = getLastSeenAnnounce();
  return _announcements.filter(a => (a.createdAt || 0) > seen).length;
}
function updateAnnounceBadge(count) {
  const b = document.getElementById('announceBadge');
  if (!b) return;
  const n = (typeof count === 'number') ? count : unreadAnnouncementsCount();
  if (n > 0) { b.textContent = n; b.style.display = 'inline-flex'; }
  else { b.style.display = 'none'; }
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
            <button class="btn btn-ghost btn-icon btn-sm" title="${active?'Skrýt':'Zobrazit'}" onclick="toggleAnnouncement('${a.id}',${active})">${active?'👁️':'🚫'}</button>
            <button class="btn btn-danger btn-icon btn-sm" title="Smazat" onclick="deleteAnnouncement('${a.id}')">✕</button>
          </div>
        </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = '<div class="empty"><div class="et">⚠️ Chyba načítání: ' + escapeAnnounce(e.message) + '</div></div>';
  }
}

async function addAnnouncement() {
  if (typeof isAdmin === 'function' && !isAdmin()) { alert('🔐 Pouze admin'); return; }
  const type  = document.getElementById('annNewType')?.value || 'info';
  const title = (document.getElementById('annNewTitle')?.value || '').trim();
  const text  = (document.getElementById('annNewText')?.value || '').trim();

  if (!title) { alert('Zadej nadpis oznámení.'); return; }
  if (!text)  { alert('Zadej text oznámení.'); return; }

  try {
    const id = 'a_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    await _set(_ref(_db, `announcements/${id}`), {
      title, text, type,
      createdAt: Date.now(),
      active: true,
      author: window._currentUser?.uid || 'admin',
    });
    // Vyčisti formulář
    const ti = document.getElementById('annNewTitle'); if (ti) ti.value = '';
    const tx = document.getElementById('annNewText');  if (tx) tx.value = '';
    if (typeof showToast === 'function') showToast('✅ Oznámení zveřejněno');
    loadAdminAnnouncements();
  } catch (e) {
    alert('⚠️ Nepodařilo se uložit: ' + e.message);
  }
}

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
//  ROZBALOVACÍ KARTA v seznamu O aplikaci (Session 11)
//  Řádek „📢 Oznámení" v Akce-listu → klik rozbalí panel
//  s oznámeními (lazy render až při otevření).
// ══════════════════════════════════════════════════════
function toggleAnnouncementsPanel() {
  const panel = document.getElementById('announcementsPanel');
  const chev  = document.getElementById('announceChevron');
  if (!panel) return;
  const opening = (panel.style.display === 'none' || !panel.style.display);
  panel.style.display = opening ? 'block' : 'none';
  if (chev) chev.style.transform = opening ? 'rotate(90deg)' : '';
  if (opening && typeof renderAnnouncements === 'function') renderAnnouncements();
}

// Načte oznámení a aktualizuje badge nepřečtených (bez vykreslení panelu).
// Volá se při otevření stránky O aplikaci.
async function initAnnouncementsBadge() {
  if (_isLocalMode || !window._currentUser) { updateAnnounceBadge(0); return; }
  try {
    await loadAnnouncements();
    updateAnnounceBadge(); // spočítá z _announcements vs ff_announce_seen
  } catch (e) { updateAnnounceBadge(0); }
}
