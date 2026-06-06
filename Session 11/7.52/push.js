// ══════════════════════════════════════════════════════
//  FinanceFlow – Web Push klient (Session 11, v7.41)
//  Povolení notifikací + subscription přes PushManager +
//  uložení subscription do Firebase users/{uid}/push/{deviceId}.
//  Vlastní odesílání řeší Cloudflare Worker (worker-push.js).
// ══════════════════════════════════════════════════════

// ⚠️ VLOŽ SEM svůj VAPID VEŘEJNÝ klíč (base64url). Pár vygeneruješ podle návodu.
//    Bez něj zůstává push vypnutý (UI to oznámí).
const VAPID_PUBLIC_KEY = 'BFf9mUG1YkNOuVySW_TQvEGhtAAg--7btvTyV5ii5le5_ESFraBy1ynKVu7rgZ4gv_PnfhEmNq41bvWn5unL2RI';

function pushSupported() {
  return ('serviceWorker' in navigator) && ('PushManager' in window) && ('Notification' in window);
}

function _urlB64ToUint8(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// Stabilní krátké id zařízení z endpointu (pro Firebase klíč – bez speciálních znaků)
function _deviceId(endpoint) {
  let h = 0;
  for (let i = 0; i < endpoint.length; i++) h = (h * 31 + endpoint.charCodeAt(i)) | 0;
  return 'd' + Math.abs(h).toString(36);
}

async function _reg() {
  if (!('serviceWorker' in navigator)) return null;
  return await navigator.serviceWorker.ready;
}

async function _savePushSub(sub) {
  if (!window._currentUser || !window._db) return;
  const j = sub.toJSON();
  const uid = window._currentUser.uid;
  const id = _deviceId(sub.endpoint);
  const entry = { endpoint: j.endpoint, keys: j.keys, ua: (navigator.userAgent || '').slice(0, 120), updatedAt: Date.now() };
  await _set(_ref(_db, `users/${uid}/push/${id}`), entry);
  // Plochý index pro snadný admin broadcast (čte jen admin)
  await _set(_ref(_db, `push_subs/${uid}_${id}`), { uid, endpoint: j.endpoint, keys: j.keys, updatedAt: Date.now() });
}
async function _removePushSub(sub) {
  if (!window._currentUser || !window._db) return;
  const uid = window._currentUser.uid;
  const id = _deviceId(sub.endpoint);
  await _set(_ref(_db, `users/${uid}/push/${id}`), null);
  await _set(_ref(_db, `push_subs/${uid}_${id}`), null);
}

// Lokální test push (bez serveru) – ověří povolení + zobrazení v SW
async function pushTest() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    alert('Nejdřív zapni push notifikace.'); return;
  }
  try {
    const reg = await _reg();
    if (reg) await reg.showNotification('FinanceFlow 🧪', {
      body: 'Testovací notifikace funguje! 🎉', icon: './icon-192.png', badge: './icon-192.png', tag: 'ff-test',
      data: { url: './' },
    });
  } catch (e) { alert('Test selhal: ' + e.message); }
}
window.pushTest = pushTest;

async function enablePush() {
  if (!pushSupported()) { alert('Tento prohlížeč push notifikace nepodporuje.'); return false; }
  if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY.startsWith('PASTE')) {
    alert('Push zatím není nakonfigurovaný (chybí VAPID klíč na serveru).'); return false;
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    if (typeof showToast === 'function') showToast('🔕 Oznámení zamítnuta');
    pushUpdateUI(); return false;
  }
  try {
    const reg = await _reg();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: _urlB64ToUint8(VAPID_PUBLIC_KEY),
      });
    }
    await _savePushSub(sub);
    if (typeof showToast === 'function') showToast('🔔 Push notifikace zapnuty');
    pushUpdateUI();
    return true;
  } catch (e) {
    console.log('enablePush error:', e);
    alert('Nepodařilo se zapnout push: ' + e.message);
    return false;
  }
}

async function disablePush() {
  try {
    const reg = await _reg();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) { await _removePushSub(sub); await sub.unsubscribe(); }
    if (typeof showToast === 'function') showToast('🔕 Push notifikace vypnuty');
  } catch (e) { console.log('disablePush error:', e); }
  pushUpdateUI();
}

async function pushToggleClick() {
  if (!pushSupported()) { alert('Tento prohlížeč push notifikace nepodporuje.'); return; }
  // Blokováno v prohlížeči → JS nemůže znovu vyžádat, ukaž návod
  if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
    pushHowToUnblock(); return;
  }
  const reg = await _reg();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub && Notification.permission === 'granted') await disablePush();
  else await enablePush();
}

// Návod na odblokování (po „zamítnout" už JS permission znovu vyžádat nemůže)
function pushHowToUnblock() {
  alert(
    '🔕 Notifikace jsou zablokované v prohlížeči.\n\n' +
    'Prohlížeč po zamítnutí nedovolí znovu zeptat z aplikace – musíš to povolit ručně:\n\n' +
    '📱 Chrome (Android): ťukni na 🔒 / ⓘ vlevo od adresy → Oprávnění (Permissions) → Oznámení (Notifications) → Povolit. Pak obnov stránku.\n\n' +
    '💻 PC: klikni na 🔒 vlevo od adresy → Oznámení → Povolit → obnov stránku (Ctrl+Shift+R).\n\n' +
    'Pak se vrať sem a přepínač zapni.'
  );
}
window.pushHowToUnblock = pushHowToUnblock;

// Vykreslí stav přepínače (skutečný switch: on / off / blocked)
async function pushUpdateUI() {
  const stateEl = document.getElementById('pushToggleState');
  const sw   = document.getElementById('pushSwitch');
  const knob = document.getElementById('pushSwitchKnob');
  if (!stateEl) return;

  const setSwitch = (on, blocked) => {
    if (!sw || !knob) return;
    if (blocked)   { sw.style.background = '#7a2e2e'; knob.style.left = '3px';  knob.textContent = '🚫'; }
    else if (on)   { sw.style.background = '#22c55e'; knob.style.left = '23px'; knob.textContent = ''; }
    else           { sw.style.background = '#3a3f55'; knob.style.left = '3px';  knob.textContent = ''; }
  };

  if (!pushSupported()) { stateEl.textContent = 'Nepodporováno v tomto prohlížeči'; setSwitch(false, true); return; }
  if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
    stateEl.innerHTML = 'Blokováno · <a onclick="event.stopPropagation();pushHowToUnblock()" style="text-decoration:underline;cursor:pointer">jak odblokovat</a>';
    setSwitch(false, true); return;
  }
  let on = false;
  try { const reg = await _reg(); const sub = reg ? await reg.pushManager.getSubscription() : null; on = !!sub && Notification.permission === 'granted'; } catch (e) {}
  stateEl.innerHTML = on
    ? 'Zapnuto · <a onclick="event.stopPropagation();pushTest()" style="text-decoration:underline;cursor:pointer">poslat test</a>'
    : 'Vypnuto – ťukni pro zapnutí';
  setSwitch(on, false);
}

window.pushToggleClick = pushToggleClick;
window.pushUpdateUI = pushUpdateUI;

// Po startu zaktualizuj stav přepínače
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(() => { try { pushUpdateUI(); } catch (e) {} }, 2500));
} else {
  setTimeout(() => { try { pushUpdateUI(); } catch (e) {} }, 2500);
}

// ══════════════════════════════════════════════════════
//  NASTAVENÍ OZNÁMENÍ (Session 11, v7.49) – styl Wallet
//  Master push přepínač + per-typ přepínače. Uloženo v
//  users/{uid}/notifPrefs + localStorage cache. Cron je respektuje.
// ══════════════════════════════════════════════════════
const NOTIF_PREF_DEFAULTS = { priceAlerts: true, debtAlerts: true, news: true, system: true };
let _notifPrefs = null;

async function loadNotifPrefs() {
  if (!_notifPrefs) {
    try { const c = localStorage.getItem('ff_notif_prefs'); if (c) _notifPrefs = JSON.parse(c); } catch (e) {}
    if (!_notifPrefs) _notifPrefs = { ...NOTIF_PREF_DEFAULTS };
  }
  if (window._currentUser && window._db) {
    try {
      const s = await _get(_ref(_db, `users/${window._currentUser.uid}/notifPrefs`));
      if (s.exists()) { _notifPrefs = { ...NOTIF_PREF_DEFAULTS, ...s.val() }; localStorage.setItem('ff_notif_prefs', JSON.stringify(_notifPrefs)); }
    } catch (e) {}
  }
  return _notifPrefs;
}

async function setNotifPref(key, val) {
  if (!_notifPrefs) _notifPrefs = { ...NOTIF_PREF_DEFAULTS };
  _notifPrefs[key] = val;
  try { localStorage.setItem('ff_notif_prefs', JSON.stringify(_notifPrefs)); } catch (e) {}
  if (window._currentUser && window._db) {
    try { await _set(_ref(_db, `users/${window._currentUser.uid}/notifPrefs/${key}`), val); } catch (e) {}
  }
}

function _notifSwitch(on, blocked) {
  const bg = blocked ? '#7a2e2e' : on ? '#22c55e' : '#3a3f55';
  const left = on ? '23px' : '3px';
  return `<div style="width:46px;height:26px;border-radius:13px;background:${bg};position:relative;flex-shrink:0;transition:background .2s">
    <div style="position:absolute;top:3px;left:${left};width:20px;height:20px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:11px">${blocked ? '🚫' : ''}</div>
  </div>`;
}

async function openNotifSettings() {
  await loadNotifPrefs();
  const old = document.getElementById('notifSettingsModal'); if (old) old.remove();

  const pushBlocked = (typeof Notification !== 'undefined' && Notification.permission === 'denied');
  let pushOn = false;
  try { const reg = await _reg(); const s = reg ? await reg.pushManager.getSubscription() : null; pushOn = !!s && Notification.permission === 'granted'; } catch (e) {}
  const p = _notifPrefs || NOTIF_PREF_DEFAULTS;
  const dim = (!pushOn || pushBlocked) ? 'opacity:.45;pointer-events:none' : '';

  const typeRow = (icon, label, desc, key) => `
    <div onclick="toggleNotifPref('${key}')" style="display:flex;align-items:center;gap:12px;padding:14px 2px;cursor:pointer;border-bottom:1px solid var(--border);${dim}">
      <span style="font-size:1.3rem">${icon}</span>
      <div style="flex:1"><div style="font-size:.9rem;font-weight:600;color:var(--text)">${label}</div><div style="font-size:.74rem;color:#a8aec8">${desc}</div></div>
      ${_notifSwitch(p[key] !== false, false)}
    </div>`;

  const m = document.createElement('div');
  m.id = 'notifSettingsModal';
  m.style.cssText = 'position:fixed;inset:0;z-index:10000;background:var(--bg);overflow-y:auto;display:flex;flex-direction:column';
  m.innerHTML = `
    <div style="background:var(--surface);border-bottom:1px solid var(--border);padding:14px 16px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:1">
      <button onclick="document.getElementById('notifSettingsModal').remove()" style="background:none;border:none;color:var(--text2);font-size:1.4rem;line-height:1;cursor:pointer;padding:4px 8px 4px 2px">←</button>
      <span style="font-size:1.1rem;font-weight:700;color:var(--text)">🔔 Oznámení</span>
    </div>
    <div style="padding:16px;max-width:640px;width:100%;margin:0 auto">
      <div onclick="notifSettingsTogglePush()" style="display:flex;align-items:center;gap:12px;padding:16px;cursor:pointer;background:var(--surface2);border-radius:14px;margin-bottom:8px;border:1px solid var(--border)">
        <span style="font-size:1.3rem">🔔</span>
        <div style="flex:1"><div style="font-size:.92rem;font-weight:700;color:var(--text)">Push notifikace</div><div style="font-size:.74rem;color:#a8aec8">${pushBlocked ? 'Blokováno – ťukni pro návod' : pushOn ? 'Zapnuto na tomto zařízení' : 'Vypnuto – ťukni pro zapnutí'}</div></div>
        ${_notifSwitch(pushOn && !pushBlocked, pushBlocked)}
      </div>
      <div style="font-size:.72rem;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin:18px 0 4px;padding:0 2px">Co chceš dostávat</div>
      ${typeRow('💰', 'Cenové alerty', 'Pokles ceny u hlídaných položek', 'priceAlerts')}
      ${typeRow('💳', 'Splátky dluhů', 'Připomínka před splatností', 'debtAlerts')}
      ${typeRow('📢', 'Novinky a tipy', 'Oznámení od FinanceFlow', 'news')}
      ${typeRow('🧾', 'Systémové', 'Účtenky, uvítání, důležité', 'system')}
      <div style="font-size:.72rem;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin:18px 0 4px;padding:0 2px">Soukromí</div>
      <div onclick="toggleNotifPref('communityData')" style="display:flex;align-items:center;gap:12px;padding:14px 2px;cursor:pointer;border-bottom:1px solid var(--border)">
        <span style="font-size:1.3rem">🏘️</span>
        <div style="flex:1"><div style="font-size:.9rem;font-weight:600;color:var(--text)">Anonymní data – Komunitní srovnání</div><div style="font-size:.74rem;color:#a8aec8">Přispívat anonymními výdaji do srovnání s ČR</div></div>
        ${_notifSwitch(p.communityData !== false, false)}
      </div>
      <div style="font-size:.7rem;color:var(--text3);margin-top:16px;text-align:center;line-height:1.6">Vypnuté typy ti nebudou chodit jako push.<br>Zprávy najdeš vždy v 📭 Zprávy.</div>
    </div>`;
  document.body.appendChild(m);
}

async function notifSettingsTogglePush() {
  await pushToggleClick();
  setTimeout(() => { if (document.getElementById('notifSettingsModal')) openNotifSettings(); }, 500);
}

async function toggleNotifPref(key) {
  await loadNotifPrefs();
  await setNotifPref(key, _notifPrefs[key] === false ? true : false);
  openNotifSettings(); // překreslit
}

window.openNotifSettings = openNotifSettings;
window.toggleNotifPref = toggleNotifPref;
window.notifSettingsTogglePush = notifSettingsTogglePush;
