/**
 * FinanceFlow · Cloudflare Worker · v10.24 · 2026-08-28  (S17.33: číslování sjednoceno s appkou – dřív vlastní řada v8.x)
 * Proxy pro Claude API – ověřuje Firebase token, rate limiting (ADR-041), volá Claude
 * Změny v6: Firebase Admin SDK (JWT/WebCrypto), per-type měsíční kvóty Free/Trial/Premium
 *
 * Environment Variables (nastavte v Cloudflare dashboardu):
 *   ANTHROPIC_API_KEY        = sk-ant-váš-klíč        (Secret)
 *   RESEND_API_KEY           = re_váš-klíč             (Secret)
 *   FIREBASE_SERVICE_ACCOUNT = {...}                   (Secret – Service Account JSON)
 *   FIREBASE_DB_URL          = https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app
 */

// === FIREBASE ADMIN – Rate Limiting (ADR-041) ===
// CF Workers nepodporuji firebase-admin npm -> pouzijeme WebCrypto + REST API

let _adminTokenCache = null;
let _adminTokenExpiry = 0;

function pemToArrayBuffer(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const bin = atob(b64);
  return Uint8Array.from(bin, c => c.charCodeAt(0)).buffer;
}

function b64url(str) {
  return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getFirebaseAdminToken(env) {
  if (_adminTokenCache && Date.now() < _adminTokenExpiry - 300_000) {
    return _adminTokenCache;
  }
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const now = Math.floor(Date.now() / 1000);

  const header  = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss: sa.client_email,
    sub: sa.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email'
  }));

  const key = await crypto.subtle.importKey(
    'pkcs8', pemToArrayBuffer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );
  const sigBytes = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', key,
    new TextEncoder().encode(`${header}.${payload}`)
  );
  const sig = b64url(String.fromCharCode(...new Uint8Array(sigBytes)));
  const jwt = `${header}.${payload}.${sig}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  const data = await res.json();
  _adminTokenCache = data.access_token;
  _adminTokenExpiry = Date.now() + 3600_000;
  return _adminTokenCache;
}

// Limity dle ADR-041 (Free / Trial / Premium)
const AI_LIMITS = {
  free:    { receipt: 15, bank_statement_text: 2,  chat: 20, advisor_report: 1, wish_url: 5,  price_alert: 5,  contact_form: 1 },
  trial:   { receipt: 50, bank_statement_text: 5,  chat: 80, advisor_report: 5, wish_url: 15, price_alert: 15, contact_form: 3 },
  premium: { receipt: 50, bank_statement_text: 5,  chat: 80, advisor_report: 5, wish_url: 15, price_alert: 15, contact_form: 3 },
  admin:   { receipt: 9999, bank_statement_text: 9999, chat: 9999, advisor_report: 9999, wish_url: 9999, price_alert: 9999, contact_form: 9999 },
};

const ADMIN_UIDS = ['LNEC8VNB2QPwIv6WWQ9lqgR4O5v1'];
async function getPremiumTier(uid, token, env) {
  // Admin má vždy nejvyšší tier (bez free limitů)
  if (ADMIN_UIDS.includes(uid)) return 'admin';
  try {
    const url = `${env.FIREBASE_DB_URL}/users/${uid}/premium.json`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!data) return 'free';
    const now = Date.now();
    if (data.type === 'premium' && data.validUntil > now) return 'premium';
    if (data.type === 'trial'   && data.trialEnd   > now) return 'trial';
    return 'free';
  } catch (e) { return 'free'; }
}

async function checkAndIncrementQuota(uid, type, env) {
  // Pokud secret neni nastaven -> fail-open (nezablokuj uzivatele)
  if (!env.FIREBASE_SERVICE_ACCOUNT || !env.FIREBASE_DB_URL) return { ok: true, skipped: true };
  try {
    const token = await getFirebaseAdminToken(env);
    const tier  = await getPremiumTier(uid, token, env);
    const limit = AI_LIMITS[tier]?.[type] ?? AI_LIMITS.free[type] ?? 999;
    const monthKey = new Date().toISOString().slice(0, 7);
    const url = `${env.FIREBASE_DB_URL}/users/${uid}/aiUsage/${monthKey}.json`;

    const getRes = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'X-Firebase-ETag': 'true' }
    });
    const etag = getRes.headers.get('ETag');
    const curr = (await getRes.json()) || {};
    const used = curr[type] || 0;

    if (used >= limit) {
      return { ok: false, used, limit, tier, type };
    }

    const updated = {
      ...curr,
      [type]: used + 1,
      total: (curr.total || 0) + 1,
      lastCallAt: Date.now(),
      updatedAt: Date.now()
    };
    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'if-match': etag
      },
      body: JSON.stringify(updated)
    });
    if (putRes.status === 412) return { ok: true, skipped: true };
    return { ok: true, used: used + 1, limit, tier };
  } catch (e) {
    console.log('checkAndIncrementQuota error:', e.message);
    return { ok: true, skipped: true };
  }
}

// Cena Claude Sonnet (USD za 1M tokenů) + kurz USD/CZK pro odhad nakladu
const SONNET_PRICE_IN_USD  = 3.0;   // $3 / 1M input tokenu
const SONNET_PRICE_OUT_USD = 15.0;  // $15 / 1M output tokenu
const USD_CZK = 23.5;

// Zaznamena spotrebu tokenu + odhad nakladu (vola se PO odpovedi Claude, s usage z odpovedi)
async function recordTokens(uid, type, usage, env) {
  if (!env.FIREBASE_SERVICE_ACCOUNT || !env.FIREBASE_DB_URL) return;
  if (!usage) return;
  try {
    const tIn  = usage.input_tokens  || 0;
    const tOut = usage.output_tokens || 0;
    const costUsd = (tIn/1e6)*SONNET_PRICE_IN_USD + (tOut/1e6)*SONNET_PRICE_OUT_USD;
    const costCzk = costUsd * USD_CZK;

    const token = await getFirebaseAdminToken(env);
    const monthKey = new Date().toISOString().slice(0, 7);
    const url = `${env.FIREBASE_DB_URL}/users/${uid}/aiUsage/${monthKey}.json`;
    const getRes = await fetch(url, { headers: { Authorization: `Bearer ${token}`, 'X-Firebase-ETag': 'true' } });
    const etag = getRes.headers.get('ETag');
    const curr = (await getRes.json()) || {};

    // Per-typ rozpad tokenu/nakladu (klice tokens_<typ>, cost_<typ>)
    const updated = {
      ...curr,
      tokensIn:  (curr.tokensIn  || 0) + tIn,
      tokensOut: (curr.tokensOut || 0) + tOut,
      tokensTotal: (curr.tokensTotal || 0) + tIn + tOut,
      costCzk: Math.round(((curr.costCzk || 0) + costCzk) * 100) / 100,
      [`tokens_${type}`]: (curr[`tokens_${type}`] || 0) + tIn + tOut,
      [`cost_${type}`]: Math.round(((curr[`cost_${type}`] || 0) + costCzk) * 100) / 100,
      updatedAt: Date.now()
    };
    await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'if-match': etag },
      body: JSON.stringify(updated)
    });
  } catch (e) { console.log('recordTokens error:', e.message); }
}

async function refundQuota(uid, type, env) {
  if (!env.FIREBASE_SERVICE_ACCOUNT || !env.FIREBASE_DB_URL) return;
  try {
    const token = await getFirebaseAdminToken(env);
    const monthKey = new Date().toISOString().slice(0, 7);
    const url = `${env.FIREBASE_DB_URL}/users/${uid}/aiUsage/${monthKey}.json`;
    const getRes = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'X-Firebase-ETag': 'true' }
    });
    const etag = getRes.headers.get('ETag');
    const curr = (await getRes.json()) || {};
    const updated = {
      ...curr,
      [type]: Math.max(0, (curr[type] || 0) - 1),
      total:  Math.max(0, (curr.total  || 0) - 1),
      refunds: (curr.refunds || 0) + 1,
      updatedAt: Date.now()
    };
    await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'if-match': etag },
      body: JSON.stringify(updated)
    });
  } catch (e) { console.log('refundQuota error:', e.message); }
}
// ===================================================
export default {
  async fetch(request, env) {

    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = [
      'https://financeflow.cz',
      'https://www.financeflow.cz',
      'https://financeflow-a249c.web.app',
      'https://financeflow-a249c.firebaseapp.com',
      'https://misty-limit-0523.bc-milda.workers.dev',
      'https://bcmilda.github.io',
    ];
    const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

    const corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // S14: ČNB denní kurzovní lístek (veřejný, bez klíče) – proxy s denní cache + CORS
    if (request.method === 'GET' && new URL(request.url).pathname === '/cnb') {
      // S19 (TODO-215): volitelný ?date=DD.MM.RRRR → historický lístek pro daný den.
      //   Bez parametru se chová přesně jako dřív (dnešní kurzy).
      return handleCnb(corsHeaders, new URL(request.url).searchParams.get('date'));
    }

    // S17.26 (TODO-153, Milan): Stripe webhook – aktivace/prodloužení/zrušení Premium.
    // Vlastní autentizace (Stripe-Signature), NE Firebase token → musí být PŘED obecnou
    // POST větví níže, která vyžaduje Authorization header s Firebase idToken.
    if (request.method === 'POST' && new URL(request.url).pathname === '/stripe-webhook') {
      return handleStripeWebhook(request, env, corsHeaders);
    }

    // S20 (TODO-235): SERVEROVÁ AGREGACE KOMUNITNÍCH DAT.
    //   Dřív četl klient přímo community/{měsíc}/users a průměry si počítal sám –
    //   jenže ten uzel byl klíčovaný uid a čitelný pro KAŽDÉHO přihlášeného.
    //   uid přitom appka sama vybízí sdílet (partnerský odkaz ?partnerOf={uid}),
    //   takže kdokoli, komu jsi poslal pozvánku, si mohl najít tvůj příjem.
    //   Nyní počítá průměry worker přes Database Secret a klient čte už jen
    //   hotový agregát bez uid. Syrové záznamy nevidí nikdo kromě serveru.
    if (request.method === 'POST' && new URL(request.url).pathname === '/community-agg') {
      return handleCommunityAgg(request, env, corsHeaders);
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    try {
      if (!env.ANTHROPIC_API_KEY) {
        return json({ error: 'ANTHROPIC_API_KEY není nastaven v Cloudflare Variables' }, 500, corsHeaders);
      }

      const authHeader = request.headers.get('Authorization') || '';
      const idToken = authHeader.replace('Bearer ', '').trim();
      if (!idToken) {
        return json({ error: 'Chybí Authorization header' }, 401, corsHeaders);
      }

      const verifyRes = await fetch(
        'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=AIzaSyDtEdQw4WccmEzxXzMwPQlenqfnjoiVw4A',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }
      );

      if (!verifyRes.ok) {
        return json({ error: 'Neplatný Firebase token' }, 401, corsHeaders);
      }
      const verifyData = await verifyRes.json();
      if (!verifyData.users?.[0]) {
        return json({ error: 'Firebase uživatel nenalezen' }, 401, corsHeaders);
      }
      // Základní rate limiting (Cloudflare Cache API)
      const uid = verifyData.users[0].localId;
      const rateCacheKey = new Request(`https://ff-ratelimit/${uid}/${new Date().toISOString().slice(0,13)}`);
      let callCount = 0;
      try {
        const cache = caches.default;
        const cached = await cache.match(rateCacheKey);
        if (cached) callCount = parseInt(await cached.text()) || 0;
        if (callCount >= 60) { // max 60 AI volání za hodinu
          return json({ error: 'Příliš mnoho požadavků. Zkuste za chvíli.' }, 429, corsHeaders);
        }
        const newCount = new Response(String(callCount + 1), { headers: { 'Cache-Control': 'max-age=3600' } });
        await cache.put(rateCacheKey, newCount);
      } catch(e) { /* rate limit selhání - nezablokuj uživatele */ }

      let body;
      try { body = await request.json(); }
      catch(e) { return json({ error: 'Neplatný JSON' }, 400, corsHeaders); }

      const { type, payload } = body;
      if (!type || !payload) return json({ error: 'Chybí type nebo payload' }, 400, corsHeaders);

      // === QUOTA CHECK (ADR-041) ===
      // contact_form nepoužívá Claude API – kontrolujeme jen AI typy
      if (type !== 'contact_form') {
        const quota = await checkAndIncrementQuota(uid, type, env);
        if (!quota.ok) {
          return json({
            error: 'rate_limit',
            message: `Měsíční limit pro ${type} byl vyčerpán (${quota.used}/${quota.limit}). Resetuje se 1. dalšího měsíce.`,
            type, used: quota.used, limit: quota.limit, tier: quota.tier,
            resetAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
          }, 429, corsHeaders);
        }
      }
      // ===============================
      let claudeRequest;

      if (type === 'chat') {
        claudeRequest = {
          model: 'claude-sonnet-4-6',
          // FIX-060 (Session 8): Snížení 8192 → 2048 – chat odpověď je krátká (max ~300 slov),
          // 8192 byla zbytečná rezerva která spotřebovává příliš tokenů per call.
          // 2048 tokenů ≈ 1500 slov = víc než dost pro chat (system prompt vyžaduje max 300 slov).
          max_tokens: 2048,
          system: `Jsi osobní finanční poradce v aplikaci FinanceFlow.
Vždy odpovídej česky, přátelsky ale profesionálně.
Používej konkrétní čísla z dat uživatele – ne obecné rady.
Formátuj: **tučné** pro důležité hodnoty, odrážky pro tipy.
Buď stručný (max 300 slov pokud není požadováno jinak).`,
          messages: payload.messages || []
        };

      } else if (type === 'receipt') {
        const images = payload.images || (payload.imageData ? [{imageData: payload.imageData, mediaType: payload.mediaType}] : []);
        if (!images.length) return json({ error: 'Chybí imageData' }, 400, corsHeaders);

        const imageContent = images.map(img => ({
          type: 'image',
          source: { type: 'base64', media_type: img.mediaType || 'image/jpeg', data: img.imageData }
        }));

        const multiNote = images.length > 1
          ? `Tato účtenka je rozdělena do ${images.length} fotek (části téže účtenky). Analyzuj všechny části dohromady a vrať JEDEN sloučený JSON. DŮLEŽITÉ: pokud se stejná položka objeví na více fotkách, přidej ji pouze JEDNOU (fotky se mohou překrývat). Součet položek musí odpovídat celkové částce na účtence.`
          : '';

        claudeRequest = {
          model: 'claude-sonnet-4-6',
          max_tokens: 8192,
          messages: [{
            role: 'user',
            content: [
              ...imageContent,
              {
                type: 'text',
                text: `${multiNote}
Analyzuj účtenku a vrať POUZE validní JSON bez jakéhokoli dalšího textu:
{"store":"název obchodu","date":"YYYY-MM-DD nebo null","total":číslo,"currency":"CZK","items":[{"name":"název","price":CENA,"qty":množství,"unit":"ks nebo kg nebo g nebo l","lineTotal":CELKOVA_CENA_RADKU}],"category":"Jídlo & Nákupy nebo Drogerie nebo Elektronika nebo Restaurace nebo Benzín nebo Jiné"}

!!! KRITICKÁ PRAVIDLA !!!

PRAVIDLO 1 – KUSOVÉ položky: price = cena za 1 ks, qty = počet kusů, lineTotal = cena × qty:
- "Rohlík 43g  6ks × 2,90 Kč/ks  17,40 Kč" → price:2.90, qty:6, unit:"ks", lineTotal:17.40
- "Mléko 1l  1ks  29,90 Kč" → price:29.90, qty:1, unit:"ks", lineTotal:29.90

PRAVIDLO 2 – VÁHOVÉ položky (kg, g): price = cena/kg, qty = hmotnost, lineTotal = zaplaceno (pravý sloupec):
- "Klobása Lucifer  0,180 kg  269,90 Kč/kg  48,58 Kč" → price:269.90, qty:0.180, unit:"kg", lineTotal:48.58
- "Meloun vodní  6,445 kg × 29,90 Kč/kg  192,71 Kč" → price:29.90, qty:6.445, unit:"kg", lineTotal:192.71
KLÍČOVÉ: lineTotal = pravý sloupec na řádku POLOŽKY (ne sleva), price = cena/kg.

PRAVIDLO 3 – SLEVY: Pokud je sleva SOUČÁSTÍ ŘÁDKU (závorka nebo "SLEVA" na stejném řádku), zahrň ji do lineTotal:
- "Paprika 0,458kg × 99,99  45,75 SLEVA -13,74 (32,01)" → lineTotal:32.01, discount:13.74
Pokud je sleva na SAMOSTATNÉM ŘÁDKU hned po položce (typicky Penny, Albert věrnostní slevy):
- "Meloun vodní 6,445kg × 29,90 = 192,71" + další řádek "SLEVA VĚRNOSTI  -64,45" + "128,26" → lineTotal:128.26, discount:64.45
- Takový slevový řádek NEPŘIDÁVEJ jako samostatnou položku do items!
Vždy přidej pole "discount": číslo (kladné, i když na účtence záporné) nebo 0 pokud sleva nebyla.

PRAVIDLO 4 – "total" = CELKOVÁ ZAPLACENÁ ČÁSTKA (řádek "Celkem"/"Součet"/"TOTAL"). Pokud chybí, spočítej sum(lineTotal).

PRAVIDLO 5 – OVĚŘENÍ: sum(items.lineTotal) musí ≈ total (tolerance ±2 Kč). Pokud nesedí, oprav lineTotal.

PRAVIDLO 6 – Nezahrnuj do items: záhlaví, daňové řádky (DPH, 21%), platební způsoby, věrnostní body.`
              }
            ]
          }]
        };

      } else if (type === 'bank_statement') {
        if (!payload.pdfData) return json({ error: 'Chybí pdfData' }, 400, corsHeaders);
        claudeRequest = {
          model: 'claude-sonnet-4-6',
          max_tokens: 16384,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: payload.pdfData }
              },
              {
                type: 'text',
                text: `Analyzuj tento bankovní výpis a extrahuj VŠECHNY transakce. Vrať POUZE validní JSON bez dalšího textu:
{"bank":"název banky","account":"číslo účtu nebo null","transactions":[{"date":"YYYY-MM-DD","amount":číslo,"name":"název protistrany/popis","note":"doplňující info","category":"odhadnutá kategorie"}]}

Pravidla:
- amount: kladné číslo pro příjmy, záporné pro výdaje
- date: vždy ve formátu YYYY-MM-DD
- name: hlavní popis transakce (protiúčet nebo popis platby)
- category: odhadni z názvu (Jídlo & Nákupy / Doprava / Bydlení / Zdraví / Restaurace / Jiné)
- Pokud není datum čitelné, vynech transakci`
              }
            ]
          }]
        };

      } else if (type === 'bank_statement_text') {
        // Textová varianta – klient extrahoval text z PDF přes pdf.js a posílá ho po dávkách
        if (!payload.text) return json({ error: 'Chybí text' }, 400, corsHeaders);
        const isFirst = payload.batchIndex === 0;
        const hint = isFirst
          ? 'Toto je první část výpisu. Extrahuj název banky a číslo účtu pokud jsou přítomny.'
          : `Toto je část ${payload.batchIndex + 1} z ${payload.totalBatches}. Extrahuj pouze transakce, bank/account nastav na null.`;
        claudeRequest = {
          model: 'claude-sonnet-4-6',
          max_tokens: 16384,
          messages: [{
            role: 'user',
            content: `${hint}
Analyzuj tento text bankovního výpisu a extrahuj VŠECHNY transakce. Vrať POUZE validní JSON bez dalšího textu:
{"bank":"název banky nebo null","account":"číslo účtu nebo null","transactions":[{"date":"YYYY-MM-DD","executionDate":"YYYY-MM-DD","amount":číslo,"name":"název protistrany/popis","note":"doplňující info","category":"odhadnutá kategorie","isBalancing":false}]}

Pravidla:
- amount: kladné číslo pro příjmy, záporné pro výdaje
- date: DATUM ZAÚČTOVÁNÍ (větší datum vlevo v záhlaví transakce) ve formátu YYYY-MM-DD
- executionDate: DATUM PROVEDENÍ (menší datum pod "Datum provedení" v detailu transakce) ve formátu YYYY-MM-DD. Pokud není uveden, použij stejné jako date.
- name: hlavní popis transakce (název obchodníka nebo protistrany)
- note: typ transakce nebo zpráva pro příjemce
- category: odhadni z názvu (Jídlo & Nákupy / Doprava / Bydlení / Zdraví / Restaurace & Kavárny / Jiné)
- isBalancing: true POUZE pro "Vyrovnávací úhrada" záznamy (technické záznamy pro EUR/cizí měnu přepočet). Pro všechny ostatní transakce: false.
- Vrať POUZE JSON, žádný jiný text

KRITICKÁ PRAVIDLA pro speciální typy transakcí:
1. KAŽDÝ ŘÁDEK S ČÁSTKOU JE SAMOSTATNÁ TRANSAKCE - extrahuj je všechny bez výjimky
2. EUR transakce (platby v cizí měně): Komerční banka tvoří 3 záznamy pro 1 EUR platbu:
   a) Původní EUR výdaj (např. "CLAUDE.AI SUBSCRIPTION -21,78 EUR") → isBalancing: false, amount záporný
   b) Vyrovnávací příjem EUR (např. "MILAN MIGDAL +20,78 EUR Vyrovnávací úhrada") → isBalancing: TRUE
   c) Vyrovnávací výdaj CZK (např. "MILAN MIGDAL -525,63 Kč Vyrovnávací úhrada") → isBalancing: TRUE
   Záznamy b) a c) se do statistik příjmů/výdajů nepočítají, ale jsou evidovány.
3. Poplatky banky (poplatek za tarif, poplatek za extra službu) jsou také transakce - extrahuj je.
4. Pokud vidíš "Celkový počet transakcí N" na konci výpisu, extrahuj přesně N transakcí.

TEXT VÝPISU:
${payload.text}`
          }]
        };

      } else if (type === 'wish_url') {
        if (!payload.url) return json({ error: 'Chybí URL' }, 400, corsHeaders);
        let pageText = '';
        try {
          const pageRes = await fetch(payload.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FinanceFlow/1.0)' },
            redirect: 'follow',
            cf: { cacheTtl: 300, cacheEverything: true }
          });
          if (pageRes.ok) {
            const html = await pageRes.text();
            // Vytáhni strukturovaná data (cena bývá v meta/JSON-LD, ne ve viditelném textu)
            let structured = '';
            const ldMatches = html.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || [];
            ldMatches.forEach(m => { structured += ' ' + m.replace(/<[^>]+>/g,' '); });
            const metaMatches = html.match(/<meta[^>]*(price|product|description|og:title)[^>]*>/gi) || [];
            metaMatches.forEach(m => { structured += ' ' + m; });
            const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
            const visible = html
              .replace(/<script[\s\S]*?<\/script>/gi, '')
              .replace(/<style[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            pageText = ('TITLE: ' + (titleMatch?titleMatch[1]:'') + ' | META/JSON: ' + structured + ' | TEXT: ' + visible).slice(0, 6000);
          }
        } catch(fetchErr) {
          pageText = '(Stránka nedostupná)';
        }
        claudeRequest = {
          model: 'claude-sonnet-4-6',
          max_tokens: 512,
          messages: [{
            role: 'user',
            content: `Z obsahu produktové stránky e-shopu extrahuj údaje o produktu. Cenu hledej hlavně v JSON-LD (offers.price, lowPrice), meta tazích (og:price:amount, product:price:amount) nebo v textu (čísla u "Kč", "od", "cena"). Pokud je více cen, vrať nejnižší dostupnou. Popis vytvoř krátce z názvu a parametrů.
Vrať POUZE validní JSON bez markdown, bez komentáře:
URL: ${payload.url}
OBSAH: ${pageText}

Formát: {"name":"název produktu","price":číslo_v_CZK_nebo_null,"desc":"stručný popis max 80 znaků","currency":"CZK"}`
          }]
        };

      } else if (type === 'advisor_report') {
        if (!payload.context) return json({ error: 'Chybí context' }, 400, corsHeaders);

        claudeRequest = {
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: `Jsi zkušený finanční poradce v ČR. Analyzuješ finanční data klienta a dáváš konkrétní, akční doporučení.
Odpovídej POUZE validním JSON bez markdown bloků, bez preamble:
{"recommendations":[{"title":"krátký název","detail":"1-2 věty co udělat","saving":"odhad úspory nebo přínos (volitelné)"}]}
Maximálně 4 doporučení, seřazená dle priority (nejkritičtější první).
Pravidla: buď konkrétní (čísla, %), nepoužívej obecné rady, zohledni limity ČNB (DSTI max 45%, DTI max 9×), doporučená rezerva 6 měsíců.`,
          messages: [{
            role: 'user',
            content: payload.context
          }]
        };

      } else if (type === 'price_alert') {
        if (!payload.items?.length) return json({ error: 'Chybí items' }, 400, corsHeaders);
        const userName = payload.userName || 'uživatel';
        const itemList = payload.items.map(it => {
          const drop = it.refPrice > 0 ? Math.round((it.refPrice - it.currentPrice) / it.refPrice * 100) : 0;
          return `• ${it.name}: ${it.currentPrice} Kč (pokles −${drop}%, ref: ${it.refPrice} Kč)${it.store ? ` · ${it.store}` : ''}`;
        }).join('\n');

        claudeRequest = {
          model: 'claude-sonnet-4-6',
          max_tokens: 512,
          messages: [{
            role: 'user',
            content: `Napiš krátký přátelský email (česky) uživateli ${userName} o slevě na produkty v nákupním seznamu FinanceFlow.
Produkty se slevou:
${itemList}
Struktura: nadpis "🎉 Sleva na váš nákupní seznam!", 2–3 věty o tom co je ve slevě, výzva k akci.
Formát: jen text emailu bez hlavičky/podpisu.`
          }]
        };

        const claudeRes2 = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify(claudeRequest)
        });
        const emailText = claudeRes2.ok ? ((await claudeRes2.json()).content?.[0]?.text || '') : '';

        return json({ ok: true, emailText, items: payload.items }, 200, corsHeaders);

      } else if (type === 'contact_form') {
        const { from_name, from_email, msg_type, message } = payload;
        const typeLabel = msg_type==='bug'?'🐛 Chyba':msg_type==='feature'?'💡 Návrh funkce':msg_type==='support'?'❓ Podpora':'📧 Zpráva';

        if (!env.RESEND_API_KEY) {
          return json({ error: 'RESEND_API_KEY není nastaven v Cloudflare Variables' }, 500, corsHeaders);
        }

        let emailSent = false;
        try {
          const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.RESEND_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'FinanceFlow <info@financeflow.cz>',
              to: ['bc.milda@gmail.com'],
              reply_to: from_email || 'info@financeflow.cz',
              subject: `[FinanceFlow] ${typeLabel} od ${from_name||from_email||'Uživatel'}`,
              html: `<h2>${typeLabel}</h2>
                     <p><strong>Od:</strong> ${from_name||'–'} &lt;${from_email}&gt;</p>
                     <p><strong>Typ:</strong> ${msg_type}</p>
                     <hr>
                     <p>${(message||'').replace(/\n/g,'<br>')}</p>
                     <hr>
                     <small>Odesláno z FinanceFlow aplikace</small>`
            })
          });
          if (resendRes.ok) emailSent = true;
          else {
            const err = await resendRes.json().catch(() => ({}));
            console.log('Resend error:', JSON.stringify(err));
          }
        } catch(e) { console.log('Resend fetch error:', e.message); }

        return json({ ok: true, received: true, emailSent }, 200, corsHeaders);

      } else {
        return json({ error: `Neznamy typ: ${type}` }, 400, corsHeaders);
      }

      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(claudeRequest)
      });

      if (!claudeRes.ok) {
        const err = await claudeRes.json().catch(() => ({}));
        return json({ error: `Claude API chyba (${claudeRes.status}): ${err?.error?.message || 'Neznámá chyba'}` }, 502, corsHeaders);
      }

      const claudeData = await claudeRes.json();
      // Zaznamenej spotrebu tokenu + naklady (per user, per typ). Neblokuje odpoved.
      if (type !== 'contact_form' && claudeData.usage) {
        try { await recordTokens(uid, type, claudeData.usage, env); } catch(_) {}
      }
      return json(claudeData, 200, corsHeaders);

    } catch (e) {
      return json({ error: 'Interni chyba: ' + e.message }, 500, corsHeaders);
    }
  }
};

// S14: stáhne a naparsuje denní kurzovní lístek ČNB → {date, rates:{EUR:25.3,...}}
// Formát ČNB: 1. řádek "DD.MM.RRRR #N", 2. řádek hlavička, dál "země|měna|množství|kód|kurz".
async function handleCnb(cors, forDate) {
  try {
    // S19 (TODO-215): ČNB vrací pro libovolné datum lístek platný v ten den
    //   (o víkendu a svátcích poslední pracovní den) – proto se datum z odpovědi
    //   vrací zpět a NEDOPOČÍTÁVÁ se na klientovi.
    let url = 'https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt';
    let ttl = 1800;
    if (forDate && /^\d{2}\.\d{2}\.\d{4}$/.test(forDate)) {
      url += '?date=' + encodeURIComponent(forDate);
      ttl = 604800;   // historický lístek se už nezmění → drž ho týden
    }
    const r = await fetch(url, { cf: { cacheTtl: ttl, cacheEverything: true } });
    if (!r.ok) return json({ error: 'CNB nedostupne', status: r.status }, 502, cors);
    const txt = await r.text();
    const lines = txt.trim().split('\n');
    const dateStr = (lines[0] || '').trim().split(' ')[0]; // 25.06.2026
    const rates = {};
    for (let i = 2; i < lines.length; i++) {
      const p = lines[i].split('|');
      if (p.length < 5) continue;
      const amount = parseInt(p[2], 10) || 1;
      const code = (p[3] || '').trim();
      const rate = parseFloat((p[4] || '').replace(',', '.'));
      if (code && !isNaN(rate)) rates[code] = Math.round((rate / amount) * 10000) / 10000; // Kč za 1 jednotku
    }
    return json({ date: dateStr, rates, source: 'CNB' }, 200, { ...cors, 'Cache-Control': 'no-cache, max-age=0' });
  } catch (e) {
    return json({ error: 'CNB fetch failed', detail: String((e && e.message) || e) }, 502, cors);
  }
}

// ══════════════════════════════════════════════════════
//  S17.26 (TODO-153, Milan): STRIPE WEBHOOK → Premium v Firebase
//  Ověří podpis (Stripe-Signature), zjistí uid (client_reference_id), spočítá
//  premiumUntil a zapíše users/{uid}/premium přes Firebase DB Secret (ADR-053, jednodušší
//  varianta z návodu – bez service account/OAuth).
// ══════════════════════════════════════════════════════
const FIREBASE_DB_URL = 'https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app';

async function verifyStripeSignature(payload, sigHeader, secret) {
  if (!sigHeader) return false;
  const parts = Object.fromEntries(sigHeader.split(',').map(p => p.split('=')));
  const t = parts.t, v1 = parts.v1;
  if (!t || !v1) return false;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${payload}`));
  const hex = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
  // Timing-safe porovnání (délka je fixní – SHA-256 hex má vždy 64 znaků)
  if (hex.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

async function stripeApi(path, env) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  if (!res.ok) throw new Error(`Stripe API ${path} → ${res.status}`);
  return res.json();
}

// Určí typ tieru z price ID (Milan doplní své price_... po vytvoření produktů ve Stripe)
// S17.32 (Milan): explicitní mapování price ID → tier. Milan založil i PREMIUM price ID,
// takže je využijeme jako POJISTKU: kdyby v budoucnu přibyl další produkt (např. doplněk),
// nespadne omylem do Premia jen proto, že je to předplatné. Neznámé předplatné = premium
// (zpětná kompatibilita – radši dát přístup navíc než zákazníkovi upřít, co zaplatil).
function planFromPriceId(priceId, env) {
  if (priceId === env.STRIPE_PRICE_PRO_MONTHLY || priceId === env.STRIPE_PRICE_PRO_YEARLY) return 'pro';
  if (priceId === env.STRIPE_PRICE_PREMIUM_MONTHLY || priceId === env.STRIPE_PRICE_PREMIUM_YEARLY) return 'premium';
  if (priceId === env.STRIPE_PRICE_FOUNDER || priceId === env.STRIPE_PRICE_FOUNDER_YEARLY) return 'premium';
  return 'premium';
}

// S17.28 (Milan): NEMĚNNÝ AUDIT LOG plateb. Zapisuje POUZE webhook (přes Database Secret),
// klient do něj nemá zápis ani čtení. Slouží jako serverový zdroj pravdy pro kontrolu,
// jestli Premium v users/{uid}/premium skutečně vzniklo zaplacením.
async function logPremiumEvent(uid, entry, env) {
  try {
    await fetch(`${FIREBASE_DB_URL}/premiumLog/${uid}.json?auth=${env.FIREBASE_DB_SECRET}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...entry, at: Date.now() }),
    });
  } catch (e) { console.error('audit log fail', e); }
}

async function writePremium(uid, data, env) {
  const res = await fetch(`${FIREBASE_DB_URL}/users/${uid}/premium.json?auth=${env.FIREBASE_DB_SECRET}`, {
    method: 'PATCH', // PATCH = merge, nesmaže trialUsed/createdAt
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Firebase write → ${res.status} ${await res.text()}`);
}

// Stripe subscription nemá vlastní metadata.uid (Payment Links to nenastaví), proto se
// při prvním checkoutu uloží mapování customerId→uid, aby ho renewal/cancel eventy (které
// mají jen `customer`, ne `client_reference_id`) mohly dohledat.
async function saveCustomerUidMap(customerId, uid, env) {
  await fetch(`${FIREBASE_DB_URL}/stripeCustomers/${customerId}.json?auth=${env.FIREBASE_DB_SECRET}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(uid),
  });
}
async function lookupUidByCustomer(customerId, env) {
  const res = await fetch(`${FIREBASE_DB_URL}/stripeCustomers/${customerId}.json?auth=${env.FIREBASE_DB_SECRET}`);
  if (!res.ok) return null;
  return res.json(); // string uid, nebo null
}

// S17.27: atomický-ish inkrement počítadla zakládajících míst. Firebase RTDB nemá přes REST
// transakce, ale webhook běží jen na serveru a platby chodí řídce – read-modify-write stačí.
async function bumpFounderCount(env) {
  const url = `${FIREBASE_DB_URL}/stats/founderCount.json?auth=${env.FIREBASE_DB_SECRET}`;
  const cur = await (await fetch(url)).json() || 0;
  await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cur + 1) });
}

async function handleStripeWebhook(request, env, cors) {
  if (!env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY || !env.FIREBASE_DB_SECRET) {
    return json({ error: 'Stripe secrets nejsou nastaveny v Cloudflare Worker Variables' }, 500, cors);
  }
  const payload = await request.text();
  const sig = request.headers.get('Stripe-Signature');
  const valid = await verifyStripeSignature(payload, sig, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) return json({ error: 'Neplatný podpis' }, 400, cors);

  let event;
  try { event = JSON.parse(payload); } catch { return json({ error: 'Špatný JSON' }, 400, cors); }

  try {
    const obj = event.data && event.data.object;

    if (event.type === 'checkout.session.completed') {
      const uid = obj.client_reference_id;
      if (!uid) return json({ received: true, note: 'chybí client_reference_id' }, 200, cors);

      if (obj.mode === 'subscription' && obj.subscription) {
        const sub = await stripeApi(`subscriptions/${obj.subscription}`, env);
        const priceId = sub.items?.data?.[0]?.price?.id || '';
        await writePremium(uid, {
          type: planFromPriceId(priceId, env),
          premiumUntil: sub.current_period_end * 1000,
          stripeCustomerId: obj.customer,
          stripeSubscriptionId: obj.subscription,
          updatedAt: Date.now(),
        }, env);
        if (obj.customer) await saveCustomerUidMap(obj.customer, uid, env);
        await logPremiumEvent(uid, { event: 'checkout', priceId, amount: obj.amount_total,
          currency: obj.currency, customer: obj.customer, subscription: obj.subscription }, env);
        // S17.27 (Milan): zakládající cena – navýšit počítadlo obsazených míst.
        // Rozpozná se podle price ID (Milan vloží STRIPE_PRICE_FOUNDER do Worker Secrets).
        // S17.30: zakládající místo obsadí měsíční (99) i roční (990) varianta
        if (priceId && (priceId === env.STRIPE_PRICE_FOUNDER || priceId === env.STRIPE_PRICE_FOUNDER_YEARLY)) {
          await bumpFounderCount(env);
        }
      } else {
        // one-time platba (donate) – nesahá na premium
      }
    }

    if (event.type === 'invoice.paid' && obj.subscription) {
      const uid = await lookupUidByCustomer(obj.customer, env);
      if (uid) {
        const sub = await stripeApi(`subscriptions/${obj.subscription}`, env);
        const priceId = sub.items?.data?.[0]?.price?.id || '';
        await writePremium(uid, {
          type: planFromPriceId(priceId, env),
          premiumUntil: sub.current_period_end * 1000,
          updatedAt: Date.now(),
        }, env);
        await logPremiumEvent(uid, { event: 'renewal', priceId, amount: obj.amount_paid,
          currency: obj.currency, customer: obj.customer, invoice: obj.id }, env);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const uid = await lookupUidByCustomer(obj.customer, env);
      if (uid) {
        await writePremium(uid, { type: 'free', premiumUntil: 0, canceledAt: Date.now() }, env);
        await logPremiumEvent(uid, { event: 'canceled', customer: obj.customer }, env);
      }
    }

    return json({ received: true }, 200, cors);
  } catch (e) {
    console.error('Stripe webhook error:', e);
    return json({ error: String(e) }, 500, cors);
  }
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
}

// ════════════════════════════════════════════════════
//  KOMUNITNÍ AGREGACE (S20, TODO-235)
// ════════════════════════════════════════════════════
// Přečte community/{month}/users (jen server, přes DB Secret), spočítá statistiky
// a zapíše je do community/{month}/aggregate. Žádné uid se do agregátu nedostane.
//
// MEDIÁN místo průměru u částek: jeden člověk s extrémním měsícem by průměr
// posunul tak, že by se s ním ostatní neměli jak srovnávat. Průměr pošleme taky,
// ať si klient může vybrat.
//
// K počtu přispěvatelů (k): Milan v TODO-225 výslovně rozhodl „1 uživatel nebo
// 1000, je to ok" – respektujeme, proto 1. Agregát vždy nese `k`, takže klient
// může říct, z kolika lidí to je.
//
// TRADE-OFF, který stojí za vědomí: při k=1 je „průměr komunity" přímo hodnota
// toho jednoho člověka; při k=2 si druhý může svoje číslo odečíst a dopočítat
// to první. Anonymita tedy začíná fungovat až od několika lidí. Až uživatelů
// přibude, stačí zvednout tuhle konstantu – zbytek kódu už s tím počítá.
const COMMUNITY_MIN_N = 1;

function _median(arr) {
  if (!arr.length) return 0;
  const a = arr.slice().sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2);
}

async function handleCommunityAgg(request, env, corsHeaders) {
  try {
    if (!env.FIREBASE_DB_SECRET) {
      return json({ error: 'FIREBASE_DB_SECRET není nastaven' }, 500, corsHeaders);
    }
    // Ověření voláno stejně jako u AI endpointů – endpoint smí spustit jen
    // přihlášený uživatel, ne kdokoli z internetu.
    const idToken = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
    if (!idToken) return json({ error: 'Chybí Authorization header' }, 401, corsHeaders);
    const vr = await fetch(
      'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=AIzaSyDtEdQw4WccmEzxXzMwPQlenqfnjoiVw4A',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }
    );
    if (!vr.ok) return json({ error: 'Neplatný Firebase token' }, 401, corsHeaders);
    const vd = await vr.json();
    if (!vd.users?.[0]) return json({ error: 'Uživatel nenalezen' }, 401, corsHeaders);

    let month = '';
    try { month = (await request.json()).month || ''; } catch (e) {}
    if (!/^\d{4}-\d{2}$/.test(month)) {
      const d = new Date();
      month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    }

    // Throttle: přepočítáváme nejvýš 1× za 10 minut. Bez toho by každé uložení
    // každého uživatele spustilo čtení celého uzlu.
    const cacheKey = new Request(`https://ff-comm-agg/${month}`);
    try {
      const cached = await caches.default.match(cacheKey);
      if (cached) return json({ ok: true, skipped: 'throttled', month }, 200, corsHeaders);
    } catch (e) {}

    const url = `${FIREBASE_DB_URL}/community/${month}/users.json?auth=${env.FIREBASE_DB_SECRET}`;
    const res = await fetch(url);
    if (!res.ok) return json({ error: 'Nelze načíst komunitní data' }, 502, corsHeaders);
    const users = (await res.json()) || {};

    const incomes = [], expenses = [], rates = [];
    const catSums = {}, catCounts = {};
    let k = 0;
    for (const uid of Object.keys(users)) {
      const u = users[uid] || {};
      if (typeof u.income !== 'number' || u.income <= 0) continue;
      k++;
      incomes.push(u.income);
      if (typeof u.totalExp === 'number') expenses.push(u.totalExp);
      if (typeof u.savingRate === 'number') rates.push(u.savingRate);
      const cats = u.cats || {};
      for (const c of Object.keys(cats)) {
        const v = cats[c];
        if (typeof v !== 'number' || !isFinite(v)) continue;
        catSums[c] = (catSums[c] || 0) + v;
        catCounts[c] = (catCounts[c] || 0) + 1;
      }
    }

    if (k < COMMUNITY_MIN_N) {
      // Nezveřejňovat. Ať nezůstane viset starší agregát z doby, kdy lidí bylo dost.
      await fetch(`${FIREBASE_DB_URL}/community/${month}/aggregate.json?auth=${env.FIREBASE_DB_SECRET}`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ k, enough: false, minN: COMMUNITY_MIN_N, updatedAt: Date.now() }) });
      return json({ ok: true, k, enough: false, month }, 200, corsHeaders);
    }

    const cats = {};
    for (const c of Object.keys(catSums)) {
      cats[c] = { avg: Math.round(catSums[c] / catCounts[c]), n: catCounts[c] };
    }

    const aggregate = {
      k,                                   // počet přispěvatelů – bez uid
      enough: true,
      minN: COMMUNITY_MIN_N,
      incomeMedian:  _median(incomes),
      incomeAvg:     Math.round(incomes.reduce((a, b) => a + b, 0) / incomes.length),
      expenseMedian: _median(expenses),
      expenseAvg:    expenses.length ? Math.round(expenses.reduce((a, b) => a + b, 0) / expenses.length) : 0,
      savingRateMedian: _median(rates),
      cats,
      updatedAt: Date.now()
    };

    const put = await fetch(`${FIREBASE_DB_URL}/community/${month}/aggregate.json?auth=${env.FIREBASE_DB_SECRET}`,
      { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(aggregate) });
    if (!put.ok) return json({ error: 'Zápis agregátu selhal' }, 502, corsHeaders);

    try {
      await caches.default.put(cacheKey,
        new Response('1', { headers: { 'Cache-Control': 'max-age=600' } }));
    } catch (e) {}

    return json({ ok: true, k, month, updatedAt: aggregate.updatedAt }, 200, corsHeaders);
  } catch (e) {
    return json({ error: 'Agregace selhala: ' + e.message }, 500, corsHeaders);
  }
}
