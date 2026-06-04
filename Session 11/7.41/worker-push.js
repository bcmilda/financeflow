// ══════════════════════════════════════════════════════
//  FinanceFlow – Web Push odesílač (Cloudflare Worker)
//  Session 11, v7.41
//
//  Samostatná implementace Web Push BEZ knihoven (Web Crypto API),
//  aby šla vložit do Workeru přes Cloudflare Dashboard.
//  Implementuje:
//   - VAPID JWT (ES256)               … RFC 8292
//   - Šifrování payloadu (aes128gcm)  … RFC 8291 / RFC 8188
//
//  ── NASTAVENÍ (Cloudflare → Worker → Settings → Variables/Secrets) ──
//   VAPID_PUBLIC_KEY   = veřejný klíč (base64url, 65 B point)  ← stejný jako v push.js
//   VAPID_PRIVATE_KEY  = privátní klíč (base64url, 32 B scalar)
//   VAPID_SUBJECT      = 'mailto:tvuj@email.cz'
//   PUSH_SECRET        = libovolný tajný řetězec (jednoduchá ochrana endpointu)
//
//  ── POUŽITÍ (z klienta / admina) ──
//   POST  https://<worker>/push
//   Header: x-push-secret: <PUSH_SECRET>
//   Body (JSON): {
//     "subscriptions": [ { "endpoint": "...", "keys": { "p256dh": "...", "auth": "..." } } ],
//     "payload": { "title": "...", "body": "...", "url": "./", "tag": "ff" }
//   }
//   → klient (admin) si subscriptions načte z Firebase users/*/push a pošle je sem.
//
//  ⚠️ Kryptografie není triviální – po nasazení OTESTUJ „test push na sebe".
// ══════════════════════════════════════════════════════

export default {
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

    let bodyIn;
    try { bodyIn = await request.json(); } catch { return json({ error: 'bad json' }, 400, cors); }
    const subs = Array.isArray(bodyIn.subscriptions) ? bodyIn.subscriptions : [];
    const payload = bodyIn.payload || { title: 'FinanceFlow', body: 'Nové oznámení' };
    if (!subs.length) return json({ error: 'no subscriptions' }, 400, cors);

    const results = [];
    for (const sub of subs) {
      try {
        const status = await sendPush(sub, payload, env);
        results.push({ endpoint: shorten(sub.endpoint), status });
      } catch (e) {
        results.push({ endpoint: shorten(sub.endpoint), error: String(e && e.message || e) });
      }
    }
    return json({ sent: results.length, results }, 200, cors);
  },
};

// ───────── odeslání jednoho push ─────────
async function sendPush(subscription, payloadObj, env) {
  const endpoint = subscription.endpoint;
  const aud = new URL(endpoint).origin;

  const jwt = await vapidJWT(aud, env.VAPID_SUBJECT || 'mailto:admin@financeflow.app',
                             env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

  const payloadBytes = new TextEncoder().encode(JSON.stringify(payloadObj));
  const body = await encryptPayload(payloadBytes, subscription.keys.p256dh, subscription.keys.auth);

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
  return res.status; // 201 = OK; 404/410 = subscription expirovala (smaž z Firebase)
}

// ───────── VAPID JWT (ES256) ─────────
async function vapidJWT(aud, sub, pubB64, privB64) {
  const header = b64url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64url(new TextEncoder().encode(JSON.stringify({
    aud, sub, exp: Math.floor(Date.now() / 1000) + 12 * 3600,
  })));
  const unsigned = `${header}.${claims}`;

  const key = await importVapidPrivate(pubB64, privB64);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${b64url(new Uint8Array(sig))}`; // Web Crypto vrací r||s (64 B) = co JWT chce
}

async function importVapidPrivate(pubB64, privB64) {
  const pub = b64urlToBytes(pubB64);       // 65 B: 0x04 || x(32) || y(32)
  const d   = privB64;                      // 32 B scalar (base64url) – přímo do JWK.d
  const x   = b64url(pub.slice(1, 33));
  const y   = b64url(pub.slice(33, 65));
  return crypto.subtle.importKey('jwk',
    { kty: 'EC', crv: 'P-256', x, y, d, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

// ───────── Šifrování payloadu (aes128gcm, RFC 8291/8188) ─────────
async function encryptPayload(plaintext, p256dhB64, authB64) {
  const uaPub = b64urlToBytes(p256dhB64);   // 65 B
  const auth  = b64urlToBytes(authB64);     // 16 B
  const salt  = crypto.getRandomValues(new Uint8Array(16));

  // efemérní ECDH klíč serveru
  const asKp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', asKp.publicKey)); // 65 B
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asKp.privateKey, 256)); // 32 B

  // IKM = HKDF(salt=auth, ikm=ecdh, info="WebPush: info\0"||uaPub||asPub, 32)
  const keyInfo = concat(new TextEncoder().encode('WebPush: info\0'), uaPub, asPubRaw);
  const ikm = await hkdf(auth, ecdh, keyInfo, 32);

  // CEK / NONCE z PRK = HKDF-Extract(salt, ikm)
  const prk = await hmac(salt, ikm);
  const cek = (await hkdfExpand(prk, new TextEncoder().encode('Content-Encoding: aes128gcm\0'), 16));
  const nonce = (await hkdfExpand(prk, new TextEncoder().encode('Content-Encoding: nonce\0'), 12));

  // plaintext || 0x02 (delimiter posledního recordu)
  const padded = concat(plaintext, new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded));

  // hlavička aes128gcm: salt(16) || rs(4 BE) || idlen(1)=65 || asPub(65) || ciphertext
  const rs = new Uint8Array([0, 0, 0x10, 0]); // 4096
  return concat(salt, rs, new Uint8Array([asPubRaw.length]), asPubRaw, ct);
}

// HKDF (Extract+Expand) – jeden blok stačí (L<=32)
async function hkdf(salt, ikm, info, len) {
  const prk = await hmac(salt, ikm);
  return hkdfExpand(prk, info, len);
}
async function hkdfExpand(prk, info, len) {
  const t = await hmac(prk, concat(info, new Uint8Array([1])));
  return t.slice(0, len);
}
async function hmac(keyBytes, dataBytes) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, dataBytes));
}

// ───────── utility ─────────
function concat(...arrs) {
  let len = 0; for (const a of arrs) len += a.length;
  const out = new Uint8Array(len); let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}
function b64url(bytes) {
  let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlToBytes(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const s = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
function shorten(ep) { return (ep || '').slice(0, 48) + '…'; }
function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...(headers || {}) } });
}
