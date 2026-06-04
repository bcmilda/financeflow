// ══════════════════════════════════════════════════════
//  FinanceFlow – Web Push klient (Session 11, v7.41)
//  Povolení notifikací + subscription přes PushManager +
//  uložení subscription do Firebase users/{uid}/push/{deviceId}.
//  Vlastní odesílání řeší Cloudflare Worker (worker-push.js).
// ══════════════════════════════════════════════════════

// ⚠️ VLOŽ SEM svůj VAPID VEŘEJNÝ klíč (base64url). Pár vygeneruješ podle návodu.
//    Bez něj zůstává push vypnutý (UI to oznámí).
const VAPID_PUBLIC_KEY = 'PASTE_VAPID_PUBLIC_KEY';

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
  await _set(_ref(_db, `users/${window._currentUser.uid}/push/${_deviceId(sub.endpoint)}`), {
    endpoint: j.endpoint,
    keys: j.keys,                       // { p256dh, auth }
    ua: (navigator.userAgent || '').slice(0, 120),
    updatedAt: Date.now(),
  });
}
async function _removePushSub(sub) {
  if (!window._currentUser || !window._db) return;
  await _set(_ref(_db, `users/${window._currentUser.uid}/push/${_deviceId(sub.endpoint)}`), null);
}

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
  const reg = await _reg();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub && Notification.permission === 'granted') await disablePush();
  else await enablePush();
}

// Aktualizuje vzhled přepínače v Nastavení dle stavu
async function pushUpdateUI() {
  const stateEl = document.getElementById('pushToggleState');
  const swEl    = document.getElementById('pushToggleSwitch');
  if (!stateEl) return;
  if (!pushSupported()) { stateEl.textContent = 'Nepodporováno v tomto prohlížeči'; if (swEl) swEl.textContent = ''; return; }
  if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
    stateEl.textContent = 'Blokováno v nastavení prohlížeče'; if (swEl) swEl.textContent = '🚫'; return;
  }
  let on = false;
  try { const reg = await _reg(); const sub = reg ? await reg.pushManager.getSubscription() : null; on = !!sub && Notification.permission === 'granted'; } catch (e) {}
  stateEl.textContent = on ? 'Zapnuto – ťukni pro vypnutí' : 'Vypnuto – ťukni pro zapnutí';
  if (swEl) swEl.textContent = on ? '🔔' : '🔕';
}

window.pushToggleClick = pushToggleClick;
window.pushUpdateUI = pushUpdateUI;

// Po startu zaktualizuj stav přepínače
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(() => { try { pushUpdateUI(); } catch (e) {} }, 2500));
} else {
  setTimeout(() => { try { pushUpdateUI(); } catch (e) {} }, 2500);
}
