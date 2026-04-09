// ══════════════════════════════════════════════════════════════════════
//  FINANCEFLOW – OFFLINE SYNC ENGINE  v1.0
//  IndexedDB + Sync Queue + Komprese fotek + Background Sync
// ══════════════════════════════════════════════════════════════════════

const FFDB_NAME    = 'financeflow-offline';
const FFDB_VERSION = 1;

// Tabulky v IndexedDB
const STORE_RECEIPTS   = 'pending_receipts';   // Fotky účtenek čekající na analýzu
const STORE_TX_QUEUE   = 'pending_tx';         // Transakce zadané offline
const STORE_SYNC_LOG   = 'sync_log';           // Log synchronizace

// Max rozlišení fotky před uložením do IndexedDB (šetří místo)
const MAX_PHOTO_WIDTH  = 1200;
const MAX_PHOTO_HEIGHT = 1600;
const PHOTO_QUALITY    = 0.82; // JPEG kvalita (0–1)

let _ffdb = null; // Singleton instance DB

// ──────────────────────────────────────────────────────────────────────
//  INIT – otevři nebo vytvoř IndexedDB
// ──────────────────────────────────────────────────────────────────────
function openOfflineDB() {
  if (_ffdb) return Promise.resolve(_ffdb);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(FFDB_NAME, FFDB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      // Účtenky čekající na AI analýzu
      if (!db.objectStoreNames.contains(STORE_RECEIPTS)) {
        const s = db.createObjectStore(STORE_RECEIPTS, { keyPath: 'id', autoIncrement: true });
        s.createIndex('status', 'status', { unique: false });
        s.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Transakce zadané offline
      if (!db.objectStoreNames.contains(STORE_TX_QUEUE)) {
        const s = db.createObjectStore(STORE_TX_QUEUE, { keyPath: 'id', autoIncrement: true });
        s.createIndex('status', 'status', { unique: false });
        s.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Sync log
      if (!db.objectStoreNames.contains(STORE_SYNC_LOG)) {
        db.createObjectStore(STORE_SYNC_LOG, { keyPath: 'id', autoIncrement: true });
      }
    };

    req.onsuccess = (e) => { _ffdb = e.target.result; resolve(_ffdb); };
    req.onerror   = (e) => reject(e.target.error);
  });
}

// ──────────────────────────────────────────────────────────────────────
//  HELPER – put / getAll / delete přes promise
// ──────────────────────────────────────────────────────────────────────
function dbPut(storeName, record) {
  return openOfflineDB().then(db => new Promise((res, rej) => {
    const tx  = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put(record);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  }));
}

function dbGetAll(storeName, indexName, value) {
  return openOfflineDB().then(db => new Promise((res, rej) => {
    const tx    = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req   = indexName
      ? store.index(indexName).getAll(value)
      : store.getAll();
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  }));
}

function dbDelete(storeName, id) {
  return openOfflineDB().then(db => new Promise((res, rej) => {
    const tx  = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(id);
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  }));
}

function dbUpdate(storeName, id, patch) {
  return openOfflineDB().then(db => new Promise((res, rej) => {
    const tx    = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const getR  = store.get(id);
    getR.onsuccess = () => {
      const updated = { ...getR.result, ...patch };
      const putR = store.put(updated);
      putR.onsuccess = () => res();
      putR.onerror   = () => rej(putR.error);
    };
    getR.onerror = () => rej(getR.error);
  }));
}

// ──────────────────────────────────────────────────────────────────────
//  KOMPRESE FOTKY – canvas resize → Blob → uloží místo v IndexedDB
// ──────────────────────────────────────────────────────────────────────
function compressPhoto(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // Zmenšíme pokud je větší než max
      const ratio = Math.min(MAX_PHOTO_WIDTH / width, MAX_PHOTO_HEIGHT / height, 1);
      width  = Math.round(width  * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('Komprese selhala')); return; }
        const originalKB  = Math.round(file.size / 1024);
        const compressedKB = Math.round(blob.size / 1024);
        console.log(`📸 Komprese: ${originalKB} KB → ${compressedKB} KB (${width}×${height}px)`);
        resolve({ blob, width, height, originalKB, compressedKB });
      }, 'image/jpeg', PHOTO_QUALITY);
    };
    img.onerror = () => reject(new Error('Nepodařilo se načíst obrázek'));
    img.src = url;
  });
}

// ──────────────────────────────────────────────────────────────────────
//  ULOŽENÍ ÚČTENKY OFFLINE
//  Volej místo přímého volání Cloudflare Worker když jsi offline
// ──────────────────────────────────────────────────────────────────────
async function saveReceiptOffline(file, txContext = {}) {
  let photoData;
  try {
    photoData = await compressPhoto(file);
  } catch (e) {
    // Pokud komprese selže, ulož originál
    photoData = { blob: file, originalKB: Math.round(file.size / 1024), compressedKB: Math.round(file.size / 1024) };
  }

  const record = {
    status:       'pending',       // pending | processing | done | error
    createdAt:    Date.now(),
    blob:         photoData.blob,  // Blob (JPEG) – uložen v IndexedDB
    originalSize: photoData.originalKB,
    savedSize:    photoData.compressedKB,
    txContext,                     // { month, year, category, note } – volitelný kontext
    retries:      0,
    lastError:    null,
  };

  const id = await dbPut(STORE_RECEIPTS, record);
  console.log(`✅ Účtenka uložena offline (ID: ${id})`);
  showOfflineBadge();
  return id;
}

// ──────────────────────────────────────────────────────────────────────
//  ULOŽENÍ TRANSAKCE OFFLINE
//  Volej místo Firebase save() když jsi offline
// ──────────────────────────────────────────────────────────────────────
async function saveTxOffline(txData) {
  const record = {
    status:    'pending',
    createdAt: Date.now(),
    tx:        txData,
    retries:   0,
    lastError: null,
  };
  const id = await dbPut(STORE_TX_QUEUE, record);
  console.log(`✅ Transakce uložena offline (ID: ${id})`);
  showOfflineBadge();
  return id;
}

// ──────────────────────────────────────────────────────────────────────
//  SYNCHRONIZACE – spustí se při obnovení připojení
// ──────────────────────────────────────────────────────────────────────
async function runSync() {
  if (!navigator.onLine) return;

  const pending = await dbGetAll(STORE_RECEIPTS, 'status', 'pending');
  const pendingTx = await dbGetAll(STORE_TX_QUEUE, 'status', 'pending');

  if (pending.length === 0 && pendingTx.length === 0) return;

  console.log(`🔄 Sync: ${pending.length} účtenek, ${pendingTx.length} transakcí`);
  showSyncToast(pending.length + pendingTx.length);

  // Synchronizuj transakce
  for (const item of pendingTx) {
    try {
      await dbUpdate(STORE_TX_QUEUE, item.id, { status: 'processing' });
      await syncOneTx(item);
      await dbDelete(STORE_TX_QUEUE, item.id);
      await dbPut(STORE_SYNC_LOG, { type: 'tx', at: Date.now(), ok: true });
    } catch (e) {
      await dbUpdate(STORE_TX_QUEUE, item.id, {
        status:    item.retries >= 4 ? 'error' : 'pending',
        retries:   item.retries + 1,
        lastError: e.message,
      });
    }
  }

  // Synchronizuj účtenky
  for (const item of pending) {
    try {
      await dbUpdate(STORE_RECEIPTS, item.id, { status: 'processing' });
      await syncOneReceipt(item);
      await dbDelete(STORE_RECEIPTS, item.id);
      await dbPut(STORE_SYNC_LOG, { type: 'receipt', at: Date.now(), ok: true });
    } catch (e) {
      await dbUpdate(STORE_RECEIPTS, item.id, {
        status:    item.retries >= 4 ? 'error' : 'pending',
        retries:   item.retries + 1,
        lastError: e.message,
      });
    }
  }

  updateOfflineBadge();
  showToast('✅ Synchronizace dokončena');
}

// ──────────────────────────────────────────────────────────────────────
//  SYNC JEDNÉ TRANSAKCE → Firebase
// ──────────────────────────────────────────────────────────────────────
async function syncOneTx(item) {
  // Zavolej existující save funkci z app.js
  // Předpokládáme že saveTx() nebo addTransaction() vrací promise
  if (typeof saveTxToFirebase === 'function') {
    await saveTxToFirebase(item.tx);
  } else {
    // Fallback – přímý Firebase REST zápis
    const idToken = await window._currentUser?.getIdToken?.();
    if (!idToken) throw new Error('Nejste přihlášeni');
    const uid = window._currentUser.uid;
    const res = await fetch(
      `https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/users/${uid}/data/transactions_queue.json?auth=${idToken}`,
      { method: 'POST', body: JSON.stringify({ ...item.tx, _offlineSync: true }) }
    );
    if (!res.ok) throw new Error('Firebase HTTP ' + res.status);
  }
}

// ──────────────────────────────────────────────────────────────────────
//  SYNC JEDNÉ ÚČTENKY → Cloudflare Worker (AI analýza)
// ──────────────────────────────────────────────────────────────────────
async function syncOneReceipt(item) {
  const idToken = await window._currentUser?.getIdToken?.();
  if (!idToken) throw new Error('Nejste přihlášeni');

  // Převedeme Blob na base64 pro Cloudflare Worker
  const base64 = await blobToBase64(item.blob);

  const res = await fetch('https://financeflow.bcmilda.workers.dev/analyze-receipt', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
    body:    JSON.stringify({
      image:     base64,
      mimeType:  'image/jpeg',
      txContext: item.txContext,
      offlineId: item.id,
    }),
  });

  if (!res.ok) throw new Error('Worker HTTP ' + res.status);

  const result = await res.json();

  // Výsledek analýzy zobraz v UI pokud je stránka otevřena
  if (typeof onReceiptAnalyzed === 'function') {
    onReceiptAnalyzed(result);
  }
}

function blobToBase64(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result.split(',')[1]);
    r.onerror = () => rej(new Error('FileReader selhal'));
    r.readAsDataURL(blob);
  });
}

// ──────────────────────────────────────────────────────────────────────
//  UI – OFFLINE INDIKÁTOR
// ──────────────────────────────────────────────────────────────────────
function showOfflineBadge() {
  updateOfflineBadge();
  let badge = document.getElementById('ff-offline-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'ff-offline-badge';
    badge.style.cssText = `
      position:fixed;bottom:80px;right:16px;
      background:var(--debt, #f59e0b);color:#000;
      font-size:.72rem;font-weight:700;
      padding:6px 12px;border-radius:20px;
      box-shadow:0 2px 12px rgba(0,0,0,.3);
      z-index:9999;cursor:pointer;
      display:flex;align-items:center;gap:6px;
    `;
    badge.onclick = showOfflineQueue;
    document.body.appendChild(badge);
  }
  badge.style.display = 'flex';
}

async function updateOfflineBadge() {
  const badge = document.getElementById('ff-offline-badge');
  const receipts = await dbGetAll(STORE_RECEIPTS, 'status', 'pending').catch(() => []);
  const txs      = await dbGetAll(STORE_TX_QUEUE,  'status', 'pending').catch(() => []);
  const errors   = (await dbGetAll(STORE_RECEIPTS, 'status', 'error').catch(() => [])).length
                 + (await dbGetAll(STORE_TX_QUEUE,  'status', 'error').catch(() => [])).length;
  const total = receipts.length + txs.length;
  if (!badge) return;
  if (total === 0 && errors === 0) { badge.style.display = 'none'; return; }
  if (errors > 0) {
    badge.style.background = 'var(--expense, #f87171)';
    badge.innerHTML = `⚠️ ${errors} položek selhalo`;
  } else {
    badge.style.background = 'var(--debt, #f59e0b)';
    badge.innerHTML = `☁️ ${total} čeká na sync`;
  }
  badge.style.display = 'flex';
}

// ──────────────────────────────────────────────────────────────────────
//  UI – MODAL – OFFLINE FRONTA
// ──────────────────────────────────────────────────────────────────────
async function showOfflineQueue() {
  const receipts    = await dbGetAll(STORE_RECEIPTS, 'status', 'pending');
  const txs         = await dbGetAll(STORE_TX_QUEUE,  'status', 'pending');
  const errReceipts = await dbGetAll(STORE_RECEIPTS, 'status', 'error');
  const errTxs      = await dbGetAll(STORE_TX_QUEUE,  'status', 'error');

  const allReceipts = [...receipts, ...errReceipts];
  const allTxs      = [...txs, ...errTxs];

  const modal = document.createElement('div');
  modal.id    = 'ff-offline-modal';
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:10000;
    display:flex;align-items:flex-end;justify-content:center;
  `;
  modal.innerHTML = `
    <div style="
      background:var(--surface1, #1a1d2e);border-radius:20px 20px 0 0;
      padding:20px;width:100%;max-width:520px;max-height:75vh;overflow-y:auto;
    ">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <span style="font-family:'Syne',sans-serif;font-weight:700;font-size:1.05rem">Offline fronta</span>
        <button onclick="document.getElementById('ff-offline-modal').remove()"
          style="background:none;border:none;color:var(--text2);font-size:1.3rem;cursor:pointer">✕</button>
      </div>

      ${allTxs.length > 0 ? `
        <div style="font-size:.8rem;font-weight:700;color:var(--text2);margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">
          Transakce (${allTxs.length})
        </div>
        ${allTxs.map(item => `
          <div style="
            background:var(--surface2, #22263a);border-radius:10px;
            padding:10px 14px;margin-bottom:8px;
            border-left:3px solid ${item.status==='error'?'var(--expense)':'var(--debt)'};
          ">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <div style="font-weight:600;font-size:.88rem">${item.tx?.name || 'Transakce'}</div>
                <div style="font-size:.73rem;color:var(--text2)">${new Date(item.createdAt).toLocaleString('cs')}</div>
                ${item.lastError ? `<div style="font-size:.7rem;color:var(--expense);margin-top:2px">⚠️ ${item.lastError}</div>` : ''}
              </div>
              <div style="text-align:right">
                <div style="font-weight:700">${item.tx?.amount ? (item.tx.amount).toLocaleString('cs')+' Kč' : '–'}</div>
                <span style="font-size:.68rem;padding:2px 6px;border-radius:10px;background:${item.status==='error'?'rgba(248,113,113,.2)':'rgba(245,158,11,.2)'};color:${item.status==='error'?'var(--expense)':'var(--debt)'}">
                  ${item.status==='error'?'Chyba':'Čeká'}
                </span>
              </div>
            </div>
          </div>
        `).join('')}
      ` : ''}

      ${allReceipts.length > 0 ? `
        <div style="font-size:.8rem;font-weight:700;color:var(--text2);margin:12px 0 8px;text-transform:uppercase;letter-spacing:.05em">
          Účtenky čekající na analýzu (${allReceipts.length})
        </div>
        ${allReceipts.map(item => `
          <div style="
            background:var(--surface2, #22263a);border-radius:10px;
            padding:10px 14px;margin-bottom:8px;
            border-left:3px solid ${item.status==='error'?'var(--expense)':'#60a5fa'};
            display:flex;align-items:center;gap:12px;
          ">
            <div style="width:48px;height:48px;border-radius:8px;overflow:hidden;flex-shrink:0;background:var(--surface3)">
              <img src="${URL.createObjectURL(item.blob)}" style="width:100%;height:100%;object-fit:cover">
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:.85rem">Účtenka</div>
              <div style="font-size:.72rem;color:var(--text2)">${new Date(item.createdAt).toLocaleString('cs')}</div>
              <div style="font-size:.7rem;color:var(--text3)">Uloženo: ${item.savedSize} KB</div>
              ${item.lastError ? `<div style="font-size:.7rem;color:var(--expense);margin-top:2px">⚠️ ${item.lastError}</div>` : ''}
            </div>
            <span style="font-size:.68rem;padding:2px 6px;border-radius:10px;background:${item.status==='error'?'rgba(248,113,113,.2)':'rgba(96,165,250,.2)'};color:${item.status==='error'?'var(--expense)':'#60a5fa'}">
              ${item.status==='error'?'Chyba':'Čeká na AI'}
            </span>
          </div>
        `).join('')}
      ` : ''}

      ${allTxs.length === 0 && allReceipts.length === 0 ? `
        <div style="text-align:center;padding:24px;color:var(--text2);font-size:.88rem">
          ✅ Vše synchronizováno
        </div>
      ` : ''}

      <div style="display:flex;gap:8px;margin-top:16px">
        ${navigator.onLine ? `
          <button onclick="runSync().then(()=>document.getElementById('ff-offline-modal')?.remove())"
            class="btn btn-primary" style="flex:1">
            🔄 Synchronizovat nyní
          </button>
        ` : `
          <div style="flex:1;text-align:center;padding:10px;background:rgba(248,113,113,.1);border-radius:10px;font-size:.82rem;color:var(--expense)">
            📵 Nejste online – synchronizace proběhne automaticky po připojení
          </div>
        `}
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function showSyncToast(count) {
  if (typeof showToast === 'function') {
    showToast(`🔄 Synchronizuji ${count} položek...`);
  }
}

// ──────────────────────────────────────────────────────────────────────
//  DETEKCE ONLINE/OFFLINE + AUTO SYNC
// ──────────────────────────────────────────────────────────────────────
window.addEventListener('online', () => {
  console.log('🌐 Online – spouštím sync');
  showToast && showToast('📶 Připojení obnoveno – synchronizuji...');
  setTimeout(runSync, 1500); // Malé zpoždění, ať se síť stabilizuje
});

window.addEventListener('offline', () => {
  console.log('📵 Offline');
  showToast && showToast('📵 Offline režim – data se uloží lokálně');
});

// ──────────────────────────────────────────────────────────────────────
//  HELPER – je aplikace online?
// ──────────────────────────────────────────────────────────────────────
function isOnline() {
  return navigator.onLine;
}

// ──────────────────────────────────────────────────────────────────────
//  INICIALIZACE – zavolej při startu app
// ──────────────────────────────────────────────────────────────────────
async function initOfflineSync() {
  try {
    await openOfflineDB();
    await updateOfflineBadge(); // Zobraz badge pokud jsou pending položky z minulé session
    console.log('📦 Offline sync engine inicializován');

    // Pokud jsme online a máme pending položky, sync hned
    if (navigator.onLine) {
      const pending = await dbGetAll(STORE_RECEIPTS, 'status', 'pending');
      const pendingTx = await dbGetAll(STORE_TX_QUEUE, 'status', 'pending');
      if (pending.length + pendingTx.length > 0) {
        setTimeout(runSync, 3000);
      }
    }
  } catch (e) {
    console.warn('Offline sync se nepodařilo inicializovat:', e);
  }
}

// ──────────────────────────────────────────────────────────────────────
//  VEŘEJNÉ API – pro použití z receipts.js a transactions.js
// ──────────────────────────────────────────────────────────────────────
window.OfflineSync = {
  init:                initOfflineSync,
  saveReceiptOffline,
  saveTxOffline,
  runSync,
  isOnline,
  showOfflineQueue,
  updateOfflineBadge,
  compressPhoto,
};

// Auto-init po načtení DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOfflineSync);
} else {
  initOfflineSync();
}
