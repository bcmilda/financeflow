// ══════════════════════════════════════════════════════
//  FinanceFlow – Web Push Worker (samostatný)  Session 11, v7.51
//  Dvě role:
//   1) fetch():     POST /push  – odešle push (VAPID + aes128gcm)
//   2) scheduled(): CRON        – cenové alerty z hlídaného nákupního seznamu
//
//  ── Cloudflare Variables / Secrets ──
//   VAPID_PUBLIC_KEY   (base64url, 65 B)   – stejný jako v push.js
//   VAPID_PRIVATE_KEY  (base64url, 32 B)
//   VAPID_SUBJECT      = 'mailto:tvuj@email.cz'
//   PUSH_SECRET        = tajný řetězec pro /push
//   FIREBASE_DB_URL    = 'https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app'
//   FIREBASE_DB_SECRET = legacy DB secret (Project Settings → Service Accounts → Database secrets)
//
//  ── CRON trigger (Cloudflare → Worker → Triggers → Cron) ──
//   např. "0 */6 * * *"  = každých 6 hodin
// ══════════════════════════════════════════════════════

export default {
  // ─────────── HTTP: odeslání push ───────────
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-push-secret',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405, cors);
    if (env.PUSH_SECRET && request.headers.get('x-push-secret') !== env.PUSH_SECRET) {
      return json({ error: 'unauthorized' }, 401, cors);
    }
    let inp;
    try { inp = await request.json(); } catch { return json({ error: 'bad json' }, 400, cors); }
    const subs = Array.isArray(inp.subscriptions) ? inp.subscriptions : [];
    const payload = inp.payload || { title: 'FinanceFlow', body: 'Nové oznámení' };
    if (!subs.length) return json({ error: 'no subscriptions' }, 400, cors);

    const results = [];
    for (const sub of subs) {
      try { results.push({ ep: shorten(sub.endpoint), status: await sendPush(sub, payload, env) }); }
      catch (e) { results.push({ ep: shorten(sub.endpoint), error: String(e && e.message || e) }); }
    }
    return json({ sent: results.length, results }, 200, cors);
  },

  // ─────────── CRON: cenové alerty + splátky dluhů ───────────
  async scheduled(event, env, ctx) {
    ctx.waitUntil(Promise.all([
      checkPriceAlerts(env).catch(e => console.log('price alerts err:', e)),
      checkDebtAlerts(env).catch(e => console.log('debt alerts err:', e)),
    ]));
  },
};

// ══════════════════════════════════════════════════════
//  CENOVÉ ALERTY (cron)
//  Projde hlídané položky všech uživatelů, porovná s aktuální
//  komunitní cenou (catalog/items) a při poklesu pošle push.
//  Dedup: price_alerts/{uid}_{itemId} = cena, na kterou se už alertovalo.
// ══════════════════════════════════════════════════════
async function checkPriceAlerts(env) {
  const base = (env.FIREBASE_DB_URL || '').replace(/\/$/, '');
  const auth = env.FIREBASE_DB_SECRET;
  if (!base || !auth) { console.log('CRON: chybí FIREBASE_DB_URL / FIREBASE_DB_SECRET'); return; }

  const fb = (path) => `${base}/${path}.json?auth=${auth}`;

  const [catalog, users, pushSubs, alerted] = await Promise.all([
    fetch(fb('catalog/items')).then(r => r.json()).catch(() => ({})),
    fetch(fb('users')).then(r => r.json()).catch(() => ({})),
    fetch(fb('push_subs')).then(r => r.json()).catch(() => ({})),
    fetch(fb('price_alerts')).then(r => r.json()).catch(() => ({})),
  ]);
  if (!users || !catalog) return;

  // subs seskupené dle uid
  const subsByUid = {};
  for (const k in (pushSubs || {})) {
    const s = pushSubs[k];
    if (s && s.uid && s.endpoint && s.keys) (subsByUid[s.uid] = subsByUid[s.uid] || []).push({ endpoint: s.endpoint, keys: s.keys });
  }

  let sent = 0;
  for (const uid in users) {
    const list = users[uid] && users[uid].data && users[uid].data.nakupList;
    if (!Array.isArray(list)) continue;
    if (users[uid].notifPrefs && users[uid].notifPrefs.priceAlerts === false) continue; // uživatel vypnul
    const subs = subsByUid[uid];
    if (!subs || !subs.length) continue;

    for (const item of list) {
      if (!item || !item.alertPct || !item.refPrice || !item.catalogKey) continue;
      const cat = catalog[item.catalogKey];
      const latest = cat && cat.latestPrice;
      if (!latest) continue;

      const drop = (item.refPrice - latest) / item.refPrice * 100;
      const triggered = drop >= item.alertPct;
      const aKey = `${uid}_${item.id || item.catalogKey}`;
      const already = (alerted || {})[aKey];

      if (triggered && already !== latest) {
        const payload = {
          title: `💰 ${item.name || 'Sleva!'}`,
          body: `Cena klesla na ${latest} Kč (−${Math.round(drop)} %). Tvůj alert: −${item.alertPct} %.`,
          url: './', tag: 'ff-price-' + aKey,
        };
        for (const sub of subs) { try { await sendPush(sub, payload, env); sent++; } catch (e) {} }
        // zapiš dedup marker
        await fetch(fb(`price_alerts/${aKey}`), { method: 'PUT', body: JSON.stringify(latest) }).catch(() => {});
      } else if (!triggered && already !== undefined) {
        // cena už není pod alertem → vymaž marker (příští pokles znovu alertne)
        await fetch(fb(`price_alerts/${aKey}`), { method: 'DELETE' }).catch(() => {});
      }
    }
  }
  console.log(`CRON cenové alerty: odesláno ${sent} push`);
}

// ══════════════════════════════════════════════════════
//  SPLÁTKY DLUHŮ (cron)
//  Pro každý dluh s remaining > 0 najde nejbližší splátku (schedule
//  nebo dueDate) a pokud je do alertDays dní, pošle připomínku.
//  Dedup: debt_alerts/{uid}_{debtId}_{datum} – každá splátka alertne jednou.
// ══════════════════════════════════════════════════════
async function checkDebtAlerts(env) {
  const base = (env.FIREBASE_DB_URL || '').replace(/\/$/, '');
  const auth = env.FIREBASE_DB_SECRET;
  if (!base || !auth) return;
  const fb = (path) => `${base}/${path}.json?auth=${auth}`;

  const [users, pushSubs, alerted] = await Promise.all([
    fetch(fb('users')).then(r => r.json()).catch(() => ({})),
    fetch(fb('push_subs')).then(r => r.json()).catch(() => ({})),
    fetch(fb('debt_alerts')).then(r => r.json()).catch(() => ({})),
  ]);
  if (!users) return;

  const subsByUid = {};
  for (const k in (pushSubs || {})) {
    const s = pushSubs[k];
    if (s && s.uid && s.endpoint && s.keys) (subsByUid[s.uid] = subsByUid[s.uid] || []).push({ endpoint: s.endpoint, keys: s.keys });
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayMs = Date.parse(today);
  let sent = 0;

  for (const uid in users) {
    const debts = users[uid] && users[uid].data && users[uid].data.debts;
    if (!Array.isArray(debts)) continue;
    if (users[uid].notifPrefs && users[uid].notifPrefs.debtAlerts === false) continue; // uživatel vypnul
    const subs = subsByUid[uid];
    if (!subs || !subs.length) continue;

    for (const d of debts) {
      if (!d || !(d.remaining > 0)) continue;
      const alertDays = d.alertDays || 7;

      // Nejbližší splátka: ze schedule (date >= dnes), jinak dueDate
      let nextDate = null, nextPayment = d.payment || 0;
      if (Array.isArray(d.schedule)) {
        const next = d.schedule.find(s => s && s.date && s.date >= today);
        if (next) { nextDate = next.date; nextPayment = next.payment || d.payment || 0; }
      }
      if (!nextDate && d.dueDate && d.dueDate >= today) nextDate = d.dueDate;
      if (!nextDate) continue;

      const daysUntil = Math.round((Date.parse(nextDate) - todayMs) / 86400000);
      if (daysUntil < 0 || daysUntil > alertDays) continue;

      const aKey = `${uid}_${d.id}_${nextDate}`;
      if ((alerted || {})[aKey]) continue; // tato splátka už alertována

      const kdy = daysUntil === 0 ? 'dnes' : daysUntil === 1 ? 'zítra' : `za ${daysUntil} dní`;
      const castka = nextPayment ? `${nextPayment} Kč ` : '';
      const payload = {
        title: `💳 Splátka: ${d.name || 'Dluh'}`,
        body: `Splátka ${castka}${kdy} (${nextDate}). Zbývá ${Math.round(d.remaining)} Kč.`,
        url: './', tag: 'ff-debt-' + aKey,
      };
      for (const sub of subs) { try { await sendPush(sub, payload, env); sent++; } catch (e) {} }
      await fetch(fb(`debt_alerts/${aKey}`), { method: 'PUT', body: JSON.stringify(today) }).catch(() => {});
    }
  }
  console.log(`CRON splátky dluhů: odesláno ${sent} push`);
}

// ─────────── odeslání jednoho push (VAPID + aes128gcm) ───────────
async function sendPush(subscription, payloadObj, env) {
  const endpoint = subscription.endpoint;
  const aud = new URL(endpoint).origin;
  const jwt = await vapidJWT(aud, env.VAPID_SUBJECT || 'mailto:admin@financeflow.app', env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  const body = await encryptPayload(new TextEncoder().encode(JSON.stringify(payloadObj)), subscription.keys.p256dh, subscription.keys.auth);
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'TTL': '86400',
    },
    body,
  });
  return res.status;
}

async function vapidJWT(aud, sub, pubB64, privB64) {
  const header = b64url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64url(new TextEncoder().encode(JSON.stringify({ aud, sub, exp: Math.floor(Date.now() / 1000) + 12 * 3600 })));
  const unsigned = `${header}.${claims}`;
  const pub = b64urlToBytes(pubB64);
  const key = await crypto.subtle.importKey('jwk',
    { kty: 'EC', crv: 'P-256', x: b64url(pub.slice(1, 33)), y: b64url(pub.slice(33, 65)), d: privB64, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${b64url(new Uint8Array(sig))}`;
}

async function encryptPayload(plaintext, p256dhB64, authB64) {
  const uaPub = b64urlToBytes(p256dhB64);
  const auth = b64urlToBytes(authB64);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const asKp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', asKp.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asKp.privateKey, 256));
  const keyInfo = concat(new TextEncoder().encode('WebPush: info\0'), uaPub, asPub);
  const ikm = await hkdf(auth, ecdh, keyInfo, 32);
  const prk = await hmac(salt, ikm);
  const cek = await hkdfExpand(prk, new TextEncoder().encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdfExpand(prk, new TextEncoder().encode('Content-Encoding: nonce\0'), 12);
  const padded = concat(plaintext, new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded));
  return concat(salt, new Uint8Array([0, 0, 0x10, 0]), new Uint8Array([asPub.length]), asPub, ct);
}

async function hkdf(salt, ikm, info, len) { return hkdfExpand(await hmac(salt, ikm), info, len); }
async function hkdfExpand(prk, info, len) { return (await hmac(prk, concat(info, new Uint8Array([1])))).slice(0, len); }
async function hmac(keyBytes, dataBytes) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, dataBytes));
}
function concat(...arrs) { let n = 0; for (const a of arrs) n += a.length; const o = new Uint8Array(n); let i = 0; for (const a of arrs) { o.set(a, i); i += a.length; } return o; }
function b64url(b) { let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function b64urlToBytes(b64) { const pad = '='.repeat((4 - (b64.length % 4)) % 4); const s = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/')); const o = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i); return o; }
function shorten(ep) { return (ep || '').slice(0, 44) + '…'; }
function json(obj, status, headers) { return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...(headers || {}) } }); }
