/**
 * FinanceFlow · Cloudflare Worker · v11.32 · 2026-10-06  (S17.33: číslování sjednoceno s appkou – dřív vlastní řada v8.x)
 * Proxy pro Claude API – ověřuje Firebase token, rate limiting (ADR-041), volá Claude
 * Změny v6: Firebase Admin SDK (JWT/WebCrypto), per-type měsíční kvóty Free/Trial/Premium
 *
 * Environment Variables (nastavte v Cloudflare dashboardu):
 *   ANTHROPIC_API_KEY        = sk-ant-váš-klíč        (Secret)
 *   RESEND_API_KEY           = re_váš-klíč             (Secret)
 *   FIREBASE_SERVICE_ACCOUNT = {...}                   (Secret – Service Account JSON)
 *   FIREBASE_DB_URL          = https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app
 *   CF_ACCOUNT_ID            = ID účtu Cloudflare            (S25 – měsíční report jako PDF)
 *   CF_BR_TOKEN              = API token s právem „Browser Rendering – Edit“ (Secret)
 *
 * Bindings (Settings → Bindings → R2 bucket):
 *   ARCHIV                   = ff-uctenky   (R2 bucket, jurisdikce EU)
 *
 * Variables (Settings → Variables, volitelné):
 *   CSU_VYBER_URL            = odkaz na vlastní výběr v DataStatu ČSÚ (meziroční index, posledních 13+ měsíců)
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
  //  S24 (v11.16, Milan): Free = 3 naskenované účtenky měsíčně (dřív 15). Appka ukazuje „zbývá X ze 3".
  free:    { receipt: 3,  bank_statement_text: 2,  chat: 20, advisor_report: 1, wish_url: 5,  price_alert: 5,  contact_form: 1, ean_foto: 3 },   // S24 v11.24: ean_foto = fotka obalu / tabulky živin
  trial:   { receipt: 50, bank_statement_text: 5,  chat: 80, advisor_report: 5, wish_url: 15, price_alert: 15, contact_form: 3, ean_foto: 30 },
  premium: { receipt: 50, bank_statement_text: 5,  chat: 80, advisor_report: 5, wish_url: 15, price_alert: 15, contact_form: 3, ean_foto: 100 },
  admin:   { receipt: 9999, bank_statement_text: 9999, chat: 9999, advisor_report: 9999, wish_url: 9999, price_alert: 9999, contact_form: 9999, ean_foto: 9999 },
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
// ══════════════════════════════════════════════════════
//  S24 (Milan, TODO-277): ARCHIV FOTEK ÚČTENEK (Cloudflare R2)
//  Fotka dosud jen proletěla workerem k analýze a zmizela. Pro hlídání záruk
//  (spotřebiče) je potřeba ji uschovat. Zvoleno R2, ne Firebase Storage (ADR-156).
//
//  BEZPEČNOST – proč to je postavené takhle:
//   • Klíč v R2 se skládá z uid Z OVĚŘENÉHO TOKENU, nikdy z těla požadavku.
//     Kdyby uid posílal prohlížeč, stačilo by ho přepsat a číst cizí účtenky.
//   • Každý klíč se před čtením i mazáním porovnává s prefixem volajícího.
//   • Bucket zůstává PRIVÁTNÍ (žádná veřejná r2.dev doména). Fotku vydává jen
//     tento endpoint po ověření tokenu.
//   • Kvóty na uživatele drží útratu u nuly i kdyby endpoint někdo našel:
//     ARCHIV_MAX_FILE na soubor, ARCHIV_MAX_FILES na účet.
// ══════════════════════════════════════════════════════
const ARCHIV_MAX_FILE  = 2 * 1024 * 1024;   // 2 MB – appka posílá ~250 kB zmenšenou fotku
const ARCHIV_MAX_FILES = 300;               // na uživatele; 300 × 250 kB ≈ 75 MB
const ARCHIV_MIME = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp' };

//  Ověření tokenu + prefix uživatele. Vrací {uid, prefix} nebo {err}.
async function archivAuth(request) {
  const idToken = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  if (!idToken) return { err: json({ error: 'Chybí Authorization header' }, 401) };
  const vr = await fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=AIzaSyDtEdQw4WccmEzxXzMwPQlenqfnjoiVw4A',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }
  );
  if (!vr.ok) return { err: json({ error: 'Neplatný Firebase token' }, 401) };
  const vd = await vr.json();
  const uid = vd.users?.[0]?.localId;
  if (!uid) return { err: json({ error: 'Uživatel nenalezen' }, 401) };
  return { uid, prefix: `u/${uid}/` };
}

//  Klíč smí ukazovat JEN do vlastní složky. Bez téhle kontroly by „../" nebo
//  cizí uid v těle požadavku otevřely cizí archiv.
function archivKeyOk(key, prefix) {
  return typeof key === 'string' && key.startsWith(prefix) && !key.includes('..') && key.length < 200;
}

// ══════════════════════════════════════════════════════
//  S23 (TODO-295): HROMADNÁ ZPRÁVA
//  Posílá se JEN na adresy, které přijdou z adminu (ten filtruje podle
//  souhlasu). Worker navíc:
//   • pustí dál jen admina (ověřený Firebase token + ADMIN_UIDS),
//   • ke každému e-mailu PŘIPOJÍ ODKAZ NA ODHLÁŠENÍ – obchodní sdělení ho
//     musí mít vždy a nesmí záležet na tom, jestli si ho Milan dopsal,
//   • posílá po jednom s malou pauzou (Resend má limit na počet za sekundu)
//     a vrací, kolik skutečně odešlo.
// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════
//  S25 (Milan): MĚSÍČNÍ REPORT E-MAILEM JAKO PDF
//  Appka pošle hotové HTML reportu (stejné jako pro tisk), worker ho nechá
//  vytisknout skutečnému Chromu (Browser Rendering REST API → /pdf), takže
//  PDF vypadá stejně jako tisk z appky, a pošle ho přes Resend jako přílohu.
//  • adresát VÝHRADNĚ ověřený e-mail z tokenu – nikdy z těla požadavku
//  • automatické odeslání max. 1× za měsíc (uzel reportMail/{uid}/{YYYY-MM})
//  • ruční odeslání max. 5× denně
// ══════════════════════════════════════════════════════════════════════
async function handleReportMail(request, env, corsHeaders) {
  try {
    const idToken = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
    if (!idToken) return json({ error: 'Chybí Authorization header' }, 401, corsHeaders);
    if (!env.RESEND_API_KEY || !env.CF_ACCOUNT_ID || !env.CF_BR_TOKEN)
      return json({ error: 'Report e-mailem zatím není na serveru nastavený' }, 500, corsHeaders);
    const vr = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=AIzaSyDtEdQw4WccmEzxXzMwPQlenqfnjoiVw4A',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) });
    if (!vr.ok) return json({ error: 'Neplatný Firebase token' }, 401, corsHeaders);
    const u = (await vr.json()).users?.[0];
    const uid = u?.localId, email = u?.email;
    if (!uid) return json({ error: 'Firebase uživatel nenalezen' }, 401, corsHeaders);
    if (!email) return json({ error: 'Účet nemá e-mail' }, 400, corsHeaders);

    const body = await request.json().catch(() => ({}));
    const mesic = String(body.mesic || '');
    if (!/^\d{4}-\d{2}$/.test(mesic)) return json({ error: 'Chybí měsíc' }, 400, corsHeaders);
    let html = String(body.html || '');
    if (html.length < 200 || html.length > 3_000_000) return json({ error: 'Report má neplatnou velikost' }, 400, corsHeaders);
    html = html.replace(/<script[\s\S]*?<\/script>/gi, '');   // tisk nic spouštět nepotřebuje
    const nazev = String(body.nazev || mesic).slice(0, 40).replace(/[<>]/g, '');
    const auto = !!body.auto;

    const dbUrl = env.FIREBASE_DB_URL || FIREBASE_DB_URL, sec = env.FIREBASE_DB_SECRET;
    const logRes = await fetch(`${dbUrl}/reportMail/${uid}.json?auth=${sec}`);
    const log = (logRes.ok && await logRes.json()) || {};
    if (auto && log[mesic]) return json({ ok: true, dup: true, email }, 200, corsHeaders);
    const dnes = new Date().toISOString().slice(0, 10);
    const dnesN = (log._d && log._d[dnes]) || 0;
    if (!auto && dnesN >= 5) return json({ error: 'Dnes už jsi report poslal 5×, zkus to zítra' }, 429, corsHeaders);

    // HTML → PDF ve skutečném Chromu
    const pr = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/browser-rendering/pdf`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.CF_BR_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, gotoOptions: { waitUntil: 'networkidle0', timeout: 30000 },
        pdfOptions: { format: 'a4', printBackground: true, preferCSSPageSize: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } } }),
    });
    const ct = pr.headers.get('content-type') || '';
    if (!pr.ok || !ct.includes('pdf')) {
      const t = await pr.text().catch(() => '');
      console.warn('Browser Rendering /pdf:', pr.status, t.slice(0, 300));
      return json({ error: pr.status === 429 ? 'Tiskárna je teď vytížená, zkus to za minutu' : 'PDF se nepodařilo vytvořit' }, 502, corsHeaders);
    }
    const pdf = new Uint8Array(await pr.arrayBuffer());
    let bin = ''; for (let i = 0; i < pdf.length; i += 0x8000) bin += String.fromCharCode.apply(null, pdf.subarray(i, i + 0x8000));
    const b64 = btoa(bin);

    const appUrl = 'https://financeflow.cz/app';
    const mr = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'FinanceFlow <info@financeflow.cz>', to: [email],
        subject: `Tvůj měsíční report – ${nazev}`,
        text: `Ahoj,\n\nv příloze je tvůj měsíční report FinanceFlow za ${nazev}.\n\nCelý report i s dalšími měsíci najdeš v appce: ${appUrl} (Report → Měsíční report).\n\nAutomatické posílání vypneš tamtéž zrušením volby „posílat automaticky každý měsíc“.`,
        html: `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#1c2333">
          <p>Ahoj,</p><p>v příloze je tvůj měsíční report FinanceFlow za <b>${nazev}</b>.</p>
          <p><a href="${appUrl}" style="display:inline-block;background:#1F45C8;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Otevřít FinanceFlow</a></p>
          <hr style="border:none;border-top:1px solid #e3e7ee;margin:24px 0">
          <div style="font-size:12px;color:#6b7488">Automatické posílání vypneš v appce: Report → Měsíční report → „posílat automaticky každý měsíc“.</div></div>`,
        attachments: [{ filename: `FinanceFlow-report-${mesic}.pdf`, content: b64 }],
      }),
    });
    if (!mr.ok) { console.warn('Resend report:', mr.status, (await mr.text().catch(() => '')).slice(0, 300)); return json({ error: 'E-mail se nepodařilo odeslat' }, 502, corsHeaders); }

    const zapis = { [`${mesic}`]: { at: Date.now(), auto }, [`_d/${dnes}`]: dnesN + 1 };
    await fetch(`${dbUrl}/reportMail/${uid}.json?auth=${sec}`, { method: 'PATCH', body: JSON.stringify(zapis) }).catch(() => {});
    return json({ ok: true, email }, 200, corsHeaders);
  } catch (e) {
    console.error('report-mail:', e);
    return json({ error: 'Chyba serveru při odesílání reportu' }, 500, corsHeaders);
  }
}

async function handleMassMail(request, env, corsHeaders) {
  try {
    const idToken = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
    if (!idToken) return json({ error: 'Chybí Authorization header' }, 401, corsHeaders);
    const vr = await fetch(
      'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=AIzaSyDtEdQw4WccmEzxXzMwPQlenqfnjoiVw4A',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }
    );
    if (!vr.ok) return json({ error: 'Neplatný Firebase token' }, 401, corsHeaders);
    const uid = (await vr.json()).users?.[0]?.localId;
    if (!uid || !ADMIN_UIDS.includes(uid)) return json({ error: 'Jen pro admina' }, 403, corsHeaders);
    if (!env.RESEND_API_KEY) return json({ error: 'RESEND_API_KEY není nastaven' }, 500, corsHeaders);

    const body = await request.json().catch(() => ({}));
    const subject = String(body.subject || '').trim();
    const text = String(body.text || '').trim();
    const to = Array.isArray(body.to) ? body.to.filter(e => typeof e === 'string' && e.includes('@')).slice(0, 200) : [];
    if (!subject || !text) return json({ error: 'Chybí předmět nebo text' }, 400, corsHeaders);
    if (!to.length) return json({ error: 'Žádní příjemci' }, 400, corsHeaders);

    const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const odhlaseni = 'Novinky si vypneš v aplikaci: Nastavení → Novinky a nabídky e-mailem.';
    let odeslano = 0; const chyby = [];
    for (const adresa of to) {
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'FinanceFlow <info@financeflow.cz>',
            to: [adresa],
            subject,
            text: `${text}\n\n—\n${odhlaseni}`,
            html: `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#1c2333">
                     ${esc(text).replace(/\n/g, '<br>')}
                     <hr style="border:none;border-top:1px solid #e3e7ee;margin:24px 0">
                     <div style="font-size:12px;color:#6b7488">${esc(odhlaseni)}</div>
                   </div>`,
          }),
        });
        if (r.ok) odeslano++; else chyby.push(`${adresa}: HTTP ${r.status}`);
      } catch (e) { chyby.push(`${adresa}: ${e.message}`); }
      await new Promise(res => setTimeout(res, 120));   // Resend: limit na počet za sekundu
    }
    return json({ ok: true, odeslano, celkem: to.length, chyby: chyby.slice(0, 10) }, 200, corsHeaders);
  } catch (e) {
    return json({ error: 'Hromadná zpráva selhala: ' + ((e && e.message) || e) }, 500, corsHeaders);
  }
}

async function handleArchiv(request, env, corsHeaders, akce) {
  try {
    if (!env.ARCHIV) {
      return json({ error: 'R2 bucket ARCHIV není nabindovaný ve workeru' }, 500, corsHeaders);
    }
    const a = await archivAuth(request);
    if (a.err) return new Response(a.err.body, { status: a.err.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    let body = {};
    try { body = await request.json(); } catch (e) {}

    // ── NAHRÁNÍ ──
    if (akce === 'upload') {
      const mime = String(body.mime || 'image/jpeg');
      if (!ARCHIV_MIME[mime]) return json({ error: 'Povolené jsou jen JPG, PNG a WebP' }, 400, corsHeaders);

      const b64 = String(body.photo || '').replace(/^data:[^,]+,/, '');
      if (!b64) return json({ error: 'Chybí fotka' }, 400, corsHeaders);
      let bytes;
      try {
        const bin = atob(b64);
        bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
      } catch (e) { return json({ error: 'Fotku se nepodařilo dekódovat' }, 400, corsHeaders); }
      if (bytes.length > ARCHIV_MAX_FILE) {
        return json({ error: `Fotka má ${Math.round(bytes.length/1024)} kB, limit je ${ARCHIV_MAX_FILE/1024/1024} MB` }, 413, corsHeaders);
      }

      //  Kvóta – kolik už jich uživatel má. List je Class A operace, ale běží
      //  jen při ukládání, ne při každém čtení.
      const list = await env.ARCHIV.list({ prefix: a.prefix, limit: ARCHIV_MAX_FILES + 1 });
      if (list.objects.length >= ARCHIV_MAX_FILES) {
        return json({ error: `Archiv je plný (${ARCHIV_MAX_FILES} účtenek). Smaž některé starší.`, full: true }, 409, corsHeaders);
      }

      const rid = String(body.receiptId || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) || 'u';
      const key = `${a.prefix}${Date.now().toString(36)}-${rid}.${ARCHIV_MIME[mime]}`;
      await env.ARCHIV.put(key, bytes, {
        httpMetadata: { contentType: mime, cacheControl: 'private, max-age=31536000' }
      });
      return json({ ok: true, key, size: bytes.length, pocet: list.objects.length + 1, limit: ARCHIV_MAX_FILES }, 200, corsHeaders);
    }

    // ── VÝDEJ FOTKY ──
    //  Vrací binárku, ne JSON. Prohlížeč si z ní udělá blob URL – <img src> sám
    //  Authorization hlavičku poslat neumí, proto to appka tahá fetchem.
    if (akce === 'get') {
      if (!archivKeyOk(body.key, a.prefix)) return json({ error: 'Cizí nebo neplatný klíč' }, 403, corsHeaders);
      const obj = await env.ARCHIV.get(body.key);
      if (!obj) return json({ error: 'Fotka nenalezena' }, 404, corsHeaders);
      return new Response(obj.body, { status: 200, headers: {
        ...corsHeaders,
        'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg',
        'Cache-Control': 'private, max-age=3600'
      }});
    }

    // ── SEZNAM ──
    if (akce === 'list') {
      const list = await env.ARCHIV.list({ prefix: a.prefix, limit: 1000 });
      return json({
        ok: true, limit: ARCHIV_MAX_FILES, pocet: list.objects.length,
        bajtu: list.objects.reduce((s, o) => s + (o.size || 0), 0),
        soubory: list.objects.map(o => ({ key: o.key, size: o.size, uploaded: o.uploaded }))
      }, 200, corsHeaders);
    }

    // ── MAZÁNÍ ──
    //  {key} smaže jednu, {all:true} celý archiv volajícího. „all" potřebuje
    //  smazání účtu (FIX-324): nevratné smazání musí uklidit i fotky, jinak by
    //  zůstaly ležet v R2 i po odchodu uživatele.
    if (akce === 'delete') {
      if (body.all === true) {
        let smazano = 0, cursor;
        do {
          const list = await env.ARCHIV.list({ prefix: a.prefix, limit: 1000, cursor });
          if (list.objects.length) {
            await env.ARCHIV.delete(list.objects.map(o => o.key));
            smazano += list.objects.length;
          }
          cursor = list.truncated ? list.cursor : null;
        } while (cursor);
        return json({ ok: true, smazano }, 200, corsHeaders);
      }
      if (!archivKeyOk(body.key, a.prefix)) return json({ error: 'Cizí nebo neplatný klíč' }, 403, corsHeaders);
      await env.ARCHIV.delete(body.key);
      return json({ ok: true, smazano: 1 }, 200, corsHeaders);
    }

    return json({ error: 'Neznámá akce' }, 400, corsHeaders);
  } catch (e) {
    console.log('archiv error:', e.message);
    return json({ error: 'Archiv selhal: ' + e.message }, 500, corsHeaders);
  }
}

// ══════════════════════════════════════════════════════
//  S24 (TODO-306 + TODO-308): ČÁROVÝ KÓD → VÝROBEK
//  POST /ean  {ean, potvrdit?, obchod?, raw?, klic?}   (Firebase token)
//
//  1) Výrobek se hledá nejdřív v community/eanProdukty/{ean} – tam ho uložil
//     worker, když se na kód ptal kdokoli dřív. Na stejný kód se tedy celá
//     komunita ptá databází jen jednou (nalezený 90 dní, nenalezený 14 dní).
//  2) Jinak paralelně 4 databáze Open Food Facts se stejným API. Vyžadují
//     vlastní User-Agent – ten umí nastavit jen server, proto to jde přes worker.
//     Pozor: platný kód, který databáze nezná, vrací HTTP 404 (ne chybu).
//  3) potvrdit:true = uživatel přiřadil kód k položce účtenky → uloží se
//     spojení „obchod + zkratka z účtenky → EAN" (community/eanAliasy),
//     BEZ uid. Počet potvrzení roste jen jednou za uživatele: jeho vlastní
//     záznam leží v users/{uid}/eanAliasy/{klic} a čte ho jen on a server.
//  Klient do komunitních uzlů nezapisuje nikdy (pravidla: .write false).
// ══════════════════════════════════════════════════════
const EAN_DATABAZE = [
  { jm: 'Open Food Facts',     host: 'https://world.openfoodfacts.org' },
  { jm: 'Open Beauty Facts',   host: 'https://world.openbeautyfacts.org' },
  { jm: 'Open Products Facts', host: 'https://world.openproductsfacts.org' },
  { jm: 'Open Pet Food Facts', host: 'https://world.openpetfoodfacts.org' },
];
const EAN_UA = 'FinanceFlow/1.0 (info@financeflow.cz)';
const EAN_PLATNOST_OK  = 90 * 86400000;
const EAN_PLATNOST_NIC = 14 * 86400000;
const EAN_LIMIT_HODINA = 200;
const EAN_POLE = [
  'product_name','product_name_cs','product_name_en','generic_name','generic_name_cs','lang',
  'brands','quantity','product_quantity','product_quantity_unit','categories_hierarchy',
  'image_front_small_url','image_front_url','nutriscore_grade','nova_group','ecoscore_grade',
  'ingredients_text','ingredients_text_cs','allergens_tags','additives_tags','nutriments',
  'labels_tags','countries_tags',
].join(',');

function eanPlatny(kod) {
  const s = String(kod || '');
  if (!/^\d+$/.test(s) || ![8, 12, 13, 14].includes(s.length)) return false;
  const c = s.split('').map(Number), k = c.pop();
  let sum = 0; c.reverse().forEach((n, i) => { sum += n * (i % 2 === 0 ? 3 : 1); });
  return (10 - (sum % 10)) % 10 === k;
}
//  Kódy s prefixem 2 si tiskne obchod sám (vážené zboží, pečivo, často s cenou
//  nebo váhou uvnitř). Mezi obchody nic nespojují → nehledat, nepárovat.
function eanObchodni(s) { return (s.length === 13 || s.length === 8) && s[0] === '2'; }

function eanMnozstvi(p) {
  const zText = (t) => {
    const s = String(t || '').toLowerCase().replace(',', '.');
    const m = s.match(/(\d+(?:\.\d+)?)\s*(kg|g|mg|l|dl|cl|ml)\b/);
    if (!m) return null;
    let h = parseFloat(m[1]), j = m[2];
    if (j === 'kg') { h *= 1000; j = 'g'; } else if (j === 'mg') { h /= 1000; j = 'g'; }
    else if (j === 'l') { h *= 1000; j = 'ml'; } else if (j === 'dl') { h *= 100; j = 'ml'; }
    else if (j === 'cl') { h *= 10; j = 'ml'; }
    return isFinite(h) && h > 0 ? { hodnota: Math.round(h * 100) / 100, jednotka: j } : null;
  };
  //  Pořadí: vyplněné množství → číselné pole → gramáž v názvu výrobku.
  return zText(p.quantity)
    || (p.product_quantity ? zText(p.product_quantity + ' ' + (p.product_quantity_unit || 'g')) : null)
    || zText(p.product_name_cs || p.product_name);
}

function eanCoicop(tagy) {
  const s = (tagy || []).join(' ');
  if (/alcoholic|beers|wines|spirits|tobacco/i.test(s)) return 2;
  if (/beauty|hygiene|cosmetic|personal-care|toothpaste|shampoo|soap/i.test(s)) return 13;
  if (/cleaning|household|laundry|dishwash/i.test(s)) return 5;
  if (/pet-food|cat-food|dog-food/i.test(s)) return 9;
  if (/beverage|drinks|dairy|snack|cereal|meat|fish|fruit|vegetable|plant-based|groceries|bread|sugar|egg|food|sauce|spice|legume|pasta|noodle/i.test(s)) return 1;
  return null;
}
//  „en:red-lentils" → „red lentils". Kategorie jsou anglicky; český překlad
//  má databáze jen u části z nich – do mapy je přeloží admin.
const eanTag = (t) => String(t || '').replace(/^[a-z]{2}:/, '').replace(/-/g, ' ').slice(0, 60);
const eanStr = (t, max) => String(t == null ? '' : t).trim().slice(0, max);

const EAN_STITKY = {
  'en:organic': 'bio', 'en:eu-organic': 'bio', 'en:vegan': 'vegan', 'en:vegetarian': 'vegetariánské',
  'en:no-gluten': 'bez lepku', 'en:gluten-free': 'bez lepku', 'en:no-lactose': 'bez laktózy',
  'en:lactose-free': 'bez laktózy', 'en:fair-trade': 'fair trade', 'en:no-palm-oil': 'bez palmového oleje',
};

function eanNormalizuj(ean, p, zdroj) {
  const kat = (p.categories_hierarchy || []).filter(Boolean);
  const n = p.nutriments || {};
  const cislo = (k) => { const v = parseFloat(n[k]); return isFinite(v) ? Math.round(v * 10) / 10 : null; };
  const nazevCs = eanStr(p.product_name_cs, 100);
  const nazev = nazevCs || eanStr(p.product_name, 100) || eanStr(p.product_name_en, 100);
  const nutrice = {
    kcal: cislo('energy-kcal_100g'), tuky: cislo('fat_100g'), nasycene: cislo('saturated-fat_100g'),
    sacharidy: cislo('carbohydrates_100g'), cukry: cislo('sugars_100g'), vlaknina: cislo('fiber_100g'),
    bilkoviny: cislo('proteins_100g'), sul: cislo('salt_100g'),
  };
  Object.keys(nutrice).forEach(k => { if (nutrice[k] === null) delete nutrice[k]; });
  const grade = (g) => /^[a-e]$/.test(String(g || '')) ? g : null;
  const o = {
    ean, stav: 'nalezeno', zdroj, kdy: Date.now(),
    nazev, nazevCesky: !!nazevCs,
    nazvyJine: [eanStr(p.product_name, 100), eanStr(p.product_name_en, 100), eanStr(p.generic_name, 100)].filter((x, i, a) => x && x !== nazev && a.indexOf(x) === i).slice(0, 3),
    znacka: eanStr(String(p.brands || '').split(',')[0], 60),
    mnozstvi: eanMnozstvi(p),
    kategorie: kat.slice(-6).map(eanTag),
    obecny: kat.length > 1 ? eanTag(kat[kat.length - 2]) : '',
    konkretni: kat.length ? eanTag(kat[kat.length - 1]) : '',
    coicop: eanCoicop(kat),
    foto: eanStr(p.image_front_small_url, 300), fotoVelka: eanStr(p.image_front_url, 300),
    nutriscore: grade(p.nutriscore_grade), ekoskore: grade(p.ecoscore_grade),
    nova: [1, 2, 3, 4].includes(Number(p.nova_group)) ? Number(p.nova_group) : null,
    slozeni: eanStr(p.ingredients_text_cs || p.ingredients_text, 1500),
    slozeniCesky: !!p.ingredients_text_cs,
    alergeny: (p.allergens_tags || []).slice(0, 15).map(eanTag),
    aditiva: (p.additives_tags || []).slice(0, 30).map(t => eanTag(t).split(' ')[0].toUpperCase()),
    nutrice,
    stitky: [...new Set((p.labels_tags || []).map(t => EAN_STITKY[t]).filter(Boolean))],
  };
  //  Firebase nesnese null ani prázdná pole – vyhodíme je, klient počítá s chybějícím klíčem.
  Object.keys(o).forEach(k => {
    if (o[k] === null || o[k] === '' || (Array.isArray(o[k]) && !o[k].length)
      || (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k]) && !Object.keys(o[k]).length)) delete o[k];
  });
  return o;
}

async function eanZDatabazi(ean) {
  const vys = await Promise.all(EAN_DATABAZE.map(async (db) => {
    try {
      const r = await fetch(`${db.host}/api/v2/product/${ean}.json?fields=${EAN_POLE}`,
        { headers: { 'User-Agent': EAN_UA, 'Accept': 'application/json' } });
      let d = null; try { d = await r.json(); } catch (e) {}
      if (d && d.status === 1 && d.product) return { p: d.product, db };
      if (r.status === 404 || (d && d.status === 0)) return { nic: true };
      return { chyba: true };
    } catch (e) { return { chyba: true }; }
  }));
  const hit = vys.find(v => v.p);
  if (hit) return eanNormalizuj(ean, hit.p, hit.db.jm);
  //  Když všechny databáze selhaly, NEukládat „nenalezeno" – jen dočasný výpadek.
  if (vys.every(v => v.chyba)) return null;
  return { ean, stav: 'nenalezeno', kdy: Date.now() };
}

// ── S24 (v11.23, Milan: „název v němčině, Mapa ukázala Mandle místo čokolády") ──
//  Jednou za komunitu (při prvním dotazu na kód) se AI zeptá na:
//   • ČESKÝ název výrobku, když ho databáze nemá (nazevCs),
//   • OBECNÝ NÁZEV z taxonomie FinanceFlow (obecnyId) – podle něj se výrobek
//     zařadí v Mapě položek i statistikách místo hádání ze zkratky na účtence.
//  Taxonomii čte z webu appky (data/taxonomie.json), drží ji v paměti workeru.
let _eanTax = null;
const eanTaxKlic = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 60);
async function eanTaxonomie() {
  if (_eanTax) return _eanTax;
  const r = await fetch('https://financeflow.cz/data/taxonomie.json?v=ean');
  const T = await r.json();
  const radky = [], nazvy = {};
  (T.oblasti || []).forEach(o => (o.podkategorie || []).forEach(pk => {
    const n = (pk.nazvy || []).map(x => typeof x === 'string' ? x : x.n);
    n.forEach(x => { nazvy[eanTaxKlic(x)] = x; });
    radky.push(`${pk.nazev}: ${n.join(', ')}`);
  }));
  _eanTax = { seznam: radky.join('\n'), nazvy };
  return _eanTax;
}
async function eanObohat(env, prod) {
  if (!env.ANTHROPIC_API_KEY || !prod || prod.stav !== 'nalezeno') return prod;
  const tax = await eanTaxonomie();
  const popis = [`Název: ${prod.nazev || '?'}`, prod.nazvyJine && prod.nazvyJine.length ? `Další názvy: ${prod.nazvyJine.join(' | ')}` : '',
    prod.znacka ? `Značka: ${prod.znacka}` : '', prod.kategorie ? `Kategorie (Open Food Facts): ${prod.kategorie.join(', ')}` : '',
    prod.mnozstvi ? `Balení: ${prod.mnozstvi.hodnota} ${prod.mnozstvi.jednotka}` : ''].filter(Boolean).join('\n');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 300,
      system: `Pomáháš české aplikaci na osobní finance zařadit výrobek z čárového kódu.
1) "nazev_cs": krátký ČESKÝ název výrobku, jak by byl na českém obalu (přelož z jiného jazyka; bez gramáže, např. „Mléčná čokoláda s různými náplněmi“). Značka se zobrazuje zvlášť – do názvu ji dej, jen když bez ní název výrobek nevystihne.
2) "obecny": JEDEN obecný název PŘESNĚ z tohoto seznamu (řádek = podkategorie: názvy), nejbližší podle toho, CO výrobek je (ne podle přísady – mléčná čokoláda s mandlemi je čokoláda, ne mandle). Když nic nesedí, "".
${tax.seznam}
Odpověz POUZE JSON: {"nazev_cs":"...","obecny":"..."}`,
      messages: [{ role: 'user', content: popis }] }),
  });
  if (!r.ok) return prod;
  const d = await r.json();
  const text = (d.content || []).map(c => c.text || '').join('');
  let j = null; try { j = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)); } catch (e) {}
  if (!j) return prod;
  const o = Object.assign({}, prod, { aiKdy: Date.now() });
  if (!prod.nazevCesky && j.nazev_cs && !prod.nazevCs) { o.nazevCs = eanStr(j.nazev_cs, 100); o.nazevCsZdroj = 'ai'; }
  const k = eanTaxKlic(j.obecny);
  if (k && tax.nazvy[k]) { o.obecnyId = k; o.obecny = tax.nazvy[k]; }
  return o;
}

const EAN_ZACHOVAT = ['nazevCs', 'nazevCsZdroj', 'obecnyId', 'obecny', 'aiKdy', 'nutriceObal', 'slozeniObal'];

//  Návrh českého názvu od uživatele. Jeho vlastní název (users/{uid}/eanNazvy)
//  platí hned pro něj; do komunity jde jako anonymní návrh s počtem – admin ho
//  v Mapě položek schválí. Každý uživatel se započítá jednou.
//  S25 (Milan): oprava chybného přiřazení – uživatel odebere kód od zkratky.
//  Ubere JEHO potvrzení spojení „obchod + zkratka → kód“ (jen když ho opravdu dal).
async function eanAkceOdebrat(uid, ean, body, env, cors) {
  const DB = env.FIREBASE_DB_URL || FIREBASE_DB_URL, S = env.FIREBASE_DB_SECRET;
  const get = async p => { const r = await fetch(`${DB}/${p}.json?auth=${S}`); return r.ok ? r.json() : null; };
  const put = (p, v) => fetch(`${DB}/${p}.json?auth=${S}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) });
  const del = p => fetch(`${DB}/${p}.json?auth=${S}`, { method: 'DELETE' });
  const klic = String(body.klic || '');
  if (!/^[a-z0-9_,-]{3,150}$/.test(klic)) return json({ error: 'Neplatná položka' }, 400, cors);
  const moje = await get(`users/${uid}/eanAliasy/${klic}`);
  if (!moje || moje.ean !== ean) return json({ ok: true, odebrano: false }, 200, cors);
  const stary = await get(`community/eanAliasy/${ean}/${klic}`);
  if (stary && stary.pocet > 1) {
    await fetch(`${DB}/community/eanAliasy/${ean}/${klic}.json?auth=${S}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pocet: stary.pocet - 1 }) });
    await put(`community/eanPodleNazvu/${klic}/${ean}`, stary.pocet - 1);
  } else {
    await del(`community/eanAliasy/${ean}/${klic}`);
    await del(`community/eanPodleNazvu/${klic}/${ean}`);
  }
  await del(`users/${uid}/eanAliasy/${klic}`);
  return json({ ok: true, odebrano: true }, 200, cors);
}

async function eanAkceNazev(uid, ean, body, env, cors) {
  const DB = env.FIREBASE_DB_URL || FIREBASE_DB_URL, S = env.FIREBASE_DB_SECRET;
  const get = async p => { const r = await fetch(`${DB}/${p}.json?auth=${S}`); return r.ok ? r.json() : null; };
  const put = (p, v) => fetch(`${DB}/${p}.json?auth=${S}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) });
  const nazev = eanStr(body.nazev, 100).replace(/\s+/g, ' ').trim();
  const moje = await get(`users/${uid}/eanNazvy/${ean}`);
  const zrusit = async () => { if (moje && moje.klic) { const st = await get(`community/eanNavrhyNazvu/${ean}/${moje.klic}`);
    if (st) await put(`community/eanNavrhyNazvu/${ean}/${moje.klic}`, st.pocet > 1 ? { nazev: st.nazev, pocet: st.pocet - 1 } : null); } };
  if (!nazev) { await zrusit(); await put(`users/${uid}/eanNazvy/${ean}`, null); return json({ ok: true, nazev: '' }, 200, cors); }
  if (nazev.length < 2) return json({ error: 'Název je příliš krátký' }, 400, cors);
  const klic = eanTaxKlic(nazev).replace(/ /g, '_').slice(0, 60);
  if (!klic) return json({ error: 'Neplatný název' }, 400, cors);
  let pocet = 1;
  if (!moje || moje.klic !== klic) {
    await zrusit();
    const st = await get(`community/eanNavrhyNazvu/${ean}/${klic}`);
    pocet = ((st && st.pocet) || 0) + 1;
    await put(`community/eanNavrhyNazvu/${ean}/${klic}`, { nazev, pocet });
  }
  await put(`users/${uid}/eanNazvy/${ean}`, { nazev, klic, kdy: Date.now() });
  return json({ ok: true, nazev, pocet }, 200, cors);
}

//  Fotka obalu (název, značka, gramáž, zařazení) nebo tabulky živin z českého
//  obalu. Fotka se NIKDE neukládá – AI ji jen přečte, uloží se výsledná data.
//  Limit ean_foto (Free 3 měsíčně).
async function eanAkceFoto(uid, ean, body, env, cors) {
  const druh = body.druh === 'ziviny' ? 'ziviny' : 'obal';
  const obr = String(body.obrazek || '');
  if (!/^[A-Za-z0-9+/=]{100,}$/.test(obr) || obr.length > 2800000) return json({ error: 'Fotka chybí nebo je příliš velká' }, 400, cors);
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'AI není nastavená' }, 500, cors);
  const q = await checkAndIncrementQuota(uid, 'ean_foto', env);
  if (!q.ok) return json({ error: 'rate_limit', message: `Měsíční limit fotek výrobků je vyčerpán (${q.used}/${q.limit}). S Premium jich máš víc.`, used: q.used, limit: q.limit }, 429, cors);
  const DB = env.FIREBASE_DB_URL || FIREBASE_DB_URL, S = env.FIREBASE_DB_SECRET;
  let zadani;
  if (druh === 'obal') {
    const tax = await eanTaxonomie();
    zadani = `Na fotce je přední strana obalu výrobku. Vrať POUZE JSON:
{"nazev_cs":"krátký český název výrobku jak na českém obalu, bez gramáže (značku jen když bez ní název nic neřekne)","nazev_obal":"název tak, jak je na obalu","znacka":"","mnozstvi":"např. 100 g nebo 0,5 l","obecny":"JEDEN název přesně z tohoto seznamu podle toho, CO výrobek je, nebo \"\""}
Seznam (podkategorie: názvy):
${tax.seznam}`;
  } else {
    zadani = `Na fotce je tabulka výživových údajů z obalu. Přečti hodnoty NA 100 g (nebo 100 ml). Vrať POUZE JSON s čísly (desetinná tečka), chybějící hodnotu vynech:
{"kcal":0,"tuky":0,"nasycene":0,"sacharidy":0,"cukry":0,"vlaknina":0,"bilkoviny":0,"sul":0,"slozeni_cs":"složení, pokud je na fotce česky, jinak \"\""}`;
  }
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 700, messages: [{ role: 'user', content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: obr } }, { type: 'text', text: zadani }] }] }),
  });
  if (!r.ok) return json({ error: 'AI teď neodpovídá' }, 502, cors);
  const d = await r.json();
  const text = (d.content || []).map(c => c.text || '').join('');
  let j = null; try { j = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)); } catch (e) {}
  if (!j) return json({ error: 'Z fotky se nepodařilo nic přečíst – zkus ostřejší fotku.' }, 422, cors);
  const url = `${DB}/community/eanProdukty/${ean}.json?auth=${S}`;
  let p = null; try { p = await (await fetch(url)).json(); } catch (e) {}
  if (druh === 'obal') {
    const tax = await eanTaxonomie();
    const k = eanTaxKlic(j.obecny);
    const m = eanMnozstvi({ quantity: String(j.mnozstvi || '') });
    if (!p || p.stav !== 'nalezeno') {
      p = { ean, stav: 'nalezeno', zdroj: 'fotka obalu', kdy: Date.now(), nazev: eanStr(j.nazev_obal || j.nazev_cs, 100), nazevCesky: false,
            nazevCs: eanStr(j.nazev_cs, 100), nazevCsZdroj: 'foto', aiKdy: Date.now() };
      if (j.znacka) p.znacka = eanStr(j.znacka, 60);
      if (m) p.mnozstvi = m;
    } else {
      if (!p.nazevCesky && !p.nazevCs && j.nazev_cs) { p.nazevCs = eanStr(j.nazev_cs, 100); p.nazevCsZdroj = 'foto'; }
      if (!p.znacka && j.znacka) p.znacka = eanStr(j.znacka, 60);
      if (!p.mnozstvi && m) p.mnozstvi = m;
    }
    if (k && tax.nazvy[k] && !p.obecnyId) { p.obecnyId = k; p.obecny = tax.nazvy[k]; }
  } else {
    const n = {};
    ['kcal', 'tuky', 'nasycene', 'sacharidy', 'cukry', 'vlaknina', 'bilkoviny', 'sul'].forEach(x => { const v = parseFloat(j[x]); if (isFinite(v) && v >= 0 && v < 1000) n[x] = Math.round(v * 10) / 10; });
    if (!Object.keys(n).length) return json({ error: 'V tabulce jsem nenašel hodnoty – vyfoť ji zblízka a rovně.' }, 422, cors);
    p = p || { ean, stav: 'nalezeno', zdroj: 'fotka obalu', kdy: Date.now() };
    p.nutriceObal = Object.assign(n, { kdy: Date.now() });
    if (j.slozeni_cs) p.slozeniObal = eanStr(j.slozeni_cs, 1500);
  }
  await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
  return json({ ok: true, ean, produkt: p, zbyva: q.limit != null ? Math.max(0, q.limit - q.used) : null }, 200, cors);
}

async function handleEan(request, env, cors) {
  const a = await archivAuth(request);
  if (a.err) return new Response(a.err.body, { status: a.err.status, headers: { ...cors, 'Content-Type': 'application/json' } });
  const uid = a.uid;
  //  Ochrana před zneužitím: max. EAN_LIMIT_HODINA dotazů za hodinu na uživatele.
  try {
    const cache = caches.default;
    const k = new Request(`https://ff-ratelimit/ean/${uid}/${new Date().toISOString().slice(0, 13)}`);
    const c = await cache.match(k);
    const n = c ? parseInt(await c.text(), 10) || 0 : 0;
    if (n >= EAN_LIMIT_HODINA) return json({ error: 'Příliš mnoho dotazů, zkus to za hodinu.' }, 429, cors);
    await cache.put(k, new Response(String(n + 1), { headers: { 'Cache-Control': 'max-age=3600' } }));
  } catch (e) {}

  let body = {};
  try { body = await request.json(); } catch (e) {}
  const ean = String(body.ean || '').replace(/\D/g, '');
  if (!eanPlatny(ean)) return json({ error: 'Neplatný kód' }, 400, cors);
  if (eanObchodni(ean)) return json({ ok: true, ean, obchodni: true }, 200, cors);
  //  S24 (v11.24): návrh českého názvu a rozpoznání fotky obalu / tabulky živin.
  if (body.akce === 'nazev') return eanAkceNazev(uid, ean, body, env, cors);
  if (body.akce === 'foto') return eanAkceFoto(uid, ean, body, env, cors);
  if (body.akce === 'odebrat') return eanAkceOdebrat(uid, ean, body, env, cors);   // S25

  const DB = env.FIREBASE_DB_URL || FIREBASE_DB_URL;
  const S = env.FIREBASE_DB_SECRET;
  let produkt = null, _eanStary = null;
  try {
    const r = await fetch(`${DB}/community/eanProdukty/${ean}.json?auth=${S}`);
    const ulozeny = r.ok ? await r.json() : null;
    _eanStary = ulozeny;
    if (ulozeny && ulozeny.kdy) {
      const platnost = ulozeny.stav === 'nalezeno' ? EAN_PLATNOST_OK : EAN_PLATNOST_NIC;
      if (Date.now() - ulozeny.kdy < platnost) produkt = ulozeny;
    }
  } catch (e) {}
  //  Výrobek uložený před v11.23 ještě nemá český název ani zařazení → doplnit jednou.
  if (produkt && produkt.stav === 'nalezeno' && !produkt.aiKdy) {
    try {
      const doplneny = await eanObohat(env, produkt);
      if (doplneny.aiKdy) { produkt = doplneny;
        await fetch(`${DB}/community/eanProdukty/${ean}.json?auth=${S}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(produkt) }); }
    } catch (e) {}
  }
  if (!produkt) {
    produkt = await eanZDatabazi(ean);
    //  S24 (v11.24): obnova po 90 dnech nesmí smazat, co doplnil admin, AI nebo fotka obalu.
    if (produkt && _eanStary) EAN_ZACHOVAT.forEach(k => { if (_eanStary[k] != null && produkt[k] == null) produkt[k] = _eanStary[k]; });
    if (!produkt) return json({ error: 'Databáze výrobků teď neodpovídají, zkus to za chvíli.' }, 502, cors);
    try { produkt = await eanObohat(env, produkt); } catch (e) {}   // S24 (v11.23): český název + obecný název z taxonomie
    try {
      await fetch(`${DB}/community/eanProdukty/${ean}.json?auth=${S}`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(produkt) });
    } catch (e) {}
  }

  //  Přiřazení kódu k položce účtenky (TODO-308).
  let alias = null;
  const klic = String(body.klic || '');
  if (body.potvrdit && /^[a-z0-9_,-]{3,150}$/.test(klic)) {
    try {
      const mojeUrl = `${DB}/users/${uid}/eanAliasy/${klic}.json?auth=${S}`;
      const moje = await (await fetch(mojeUrl)).json();
      const aliasUrl = `${DB}/community/eanAliasy/${ean}/${klic}.json?auth=${S}`;
      const byl = await (await fetch(aliasUrl)).json();
      const novy = !moje || moje.ean !== ean;
      const pocet = ((byl && byl.pocet) || 0) + (novy ? 1 : 0);
      alias = {
        obchod: eanStr(body.obchod, 40), raw: eanStr(body.raw, 80),
        pocet: Math.max(pocet, 1), kdy: Date.now(),
      };
      await fetch(aliasUrl, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(alias) });
      await fetch(`${DB}/community/eanPodleNazvu/${klic}/${ean}.json?auth=${S}`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(alias.pocet) });
      //  Uživatel přeřadil zkratku na jiný kód → u starého kódu ubrat jeho potvrzení.
      if (moje && moje.ean && moje.ean !== ean && eanPlatny(moje.ean)) {
        const staryUrl = `${DB}/community/eanAliasy/${moje.ean}/${klic}.json?auth=${S}`;
        const stary = await (await fetch(staryUrl)).json();
        if (stary && stary.pocet > 1) {
          await fetch(staryUrl, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pocet: stary.pocet - 1 }) });
          await fetch(`${DB}/community/eanPodleNazvu/${klic}/${moje.ean}.json?auth=${S}`,
            { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(stary.pocet - 1) });
        } else if (stary) {
          await fetch(staryUrl, { method: 'DELETE' });
          await fetch(`${DB}/community/eanPodleNazvu/${klic}/${moje.ean}.json?auth=${S}`, { method: 'DELETE' });
        }
      }
      await fetch(mojeUrl, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ean, kdy: Date.now() }) });
    } catch (e) { alias = null; }
  }
  return json({ ok: true, ean, produkt, alias }, 200, cors);
}

// ══════════════════════════════════════════════════════
//  S24 (Milan, varianta B): AI ZAŘAZENÍ VLASTNÍCH KATEGORIÍ DO COICOP
//  POST /coicop  (Firebase token)
//   {akce:'navrh', nazvy:[{nazev, rodic?}]}  → [{klic, coicop, skupina, stav}]
//   {akce:'hlas',  klic, coicop}             → anonymní hlas (potvrzení / změna)
//
//  • Každý název se ptá AI jen JEDNOU za celou komunitu – odpověď leží
//    v community/coicopNavrhy/{klic} (klic = normalizovaný název).
//  • Schválení adminem (…/schvaleno) má přednost před návrhem AI.
//  • Hlasy a počty uživatelů jsou BEZ uid; každý uživatel se započítá
//    jednou – jeho záznam je v users/{uid}/coicopHlasy/{klic}.
//  • Klient do komunity nezapisuje (pravidla: jen admin a worker).
// ══════════════════════════════════════════════════════
function coicopKlic(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
}
const COICOP_ODDILY = '1 Potraviny a nealkoholické nápoje; 2 Alkoholické nápoje a tabák; 3 Odívání a obuv; 4 Bydlení, voda, energie, paliva; 5 Vybavení domácnosti a běžná údržba; 6 Zdraví; 7 Doprava; 8 Informace a komunikace (telefon, internet, pošta); 9 Rekreace, sport a kultura (vč. mazlíčků, zahrady, knih, dovolených); 10 Vzdělávání; 11 Stravování a ubytování (restaurace, kavárny, hotely); 12 Pojištění a finanční služby; 13 Osobní péče a ostatní zboží a služby; 0 = není spotřební výdaj (příjem, přesun, splátka jistiny, investice, spoření, daně)';

async function coicopAiDotaz(env, polozky) {
  const seznam = polozky.map((p, i) => `${i}. „${p.nazev}"${p.rodic ? ` (podkategorie v „${p.rodic}")` : ''}`).join('\n');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6', max_tokens: 1200,
      system: `Zařazuješ názvy rozpočtových kategorií české osobní finanční aplikace do oddílů COICOP 2018 (klasifikace spotřeby ČSÚ).
Oddíly: ${COICOP_ODDILY}.
Vrať POUZE JSON pole bez dalšího textu: [{"i":0,"coicop":11,"skupina":"11.1"}]. "skupina" je dvouúrovňový kód (např. "07.2") nebo "" když si nejsi jistý. Když název nedává smysl, dej coicop 13.`,
      messages: [{ role: 'user', content: seznam }],
    }),
  });
  if (!r.ok) throw new Error('AI ' + r.status);
  const d = await r.json();
  const text = (d.content || []).map(c => c.text || '').join('').replace(/```json|```/g, '').trim();
  const pole = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
  return pole;
}

async function handleCoicop(request, env, cors) {
  const a = await archivAuth(request);
  if (a.err) return new Response(a.err.body, { status: a.err.status, headers: { ...cors, 'Content-Type': 'application/json' } });
  const uid = a.uid;
  try {
    const cache = caches.default;
    const k = new Request(`https://ff-ratelimit/coicop/${uid}/${new Date().toISOString().slice(0, 13)}`);
    const c = await cache.match(k); const n = c ? parseInt(await c.text(), 10) || 0 : 0;
    if (n >= 60) return json({ error: 'Příliš mnoho dotazů, zkus to za hodinu.' }, 429, cors);
    await cache.put(k, new Response(String(n + 1), { headers: { 'Cache-Control': 'max-age=3600' } }));
  } catch (e) {}
  let body = {}; try { body = await request.json(); } catch (e) {}
  const DB = env.FIREBASE_DB_URL || FIREBASE_DB_URL, S = env.FIREBASE_DB_SECRET;
  const get = async p => { const r = await fetch(`${DB}/${p}.json?auth=${S}`); return r.ok ? r.json() : null; };
  const put = (p, v) => fetch(`${DB}/${p}.json?auth=${S}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) });

  if (body.akce === 'hlas') {
    const klic = coicopKlic(body.klic), cc = parseInt(body.coicop, 10);
    if (!klic || !(cc >= 0 && cc <= 13)) return json({ error: 'Neplatný hlas' }, 400, cors);
    const moje = (await get(`users/${uid}/coicopHlasy/${klic}`)) || {};
    const z = await get(`community/coicopNavrhy/${klic}`);
    if (!z) return json({ error: 'Neznámý název' }, 404, cors);
    const hlasy = z.hlasy || {};
    if (moje.hlas != null && moje.hlas !== cc && hlasy[moje.hlas] > 0) hlasy[moje.hlas]--;
    if (moje.hlas !== cc) hlasy[cc] = (hlasy[cc] || 0) + 1;
    Object.keys(hlasy).forEach(x => { if (!hlasy[x]) delete hlasy[x]; });
    await put(`community/coicopNavrhy/${klic}/hlasy`, Object.keys(hlasy).length ? hlasy : null);
    await put(`users/${uid}/coicopHlasy/${klic}`, { hlas: cc, kdy: Date.now() });
    return json({ ok: true, hlasy }, 200, cors);
  }

  const nazvy = (Array.isArray(body.nazvy) ? body.nazvy : []).slice(0, 20)
    .map(x => ({ nazev: String(x.nazev || '').trim().slice(0, 60), rodic: String(x.rodic || '').trim().slice(0, 60) }))
    .filter(x => x.nazev && coicopKlic(x.nazev));
  if (!nazvy.length) return json({ ok: true, vysledky: [] }, 200, cors);
  const vysledky = [], chybi = [];
  for (const x of nazvy) {
    const klic = coicopKlic(x.nazev);
    const z = await get(`community/coicopNavrhy/${klic}`);
    if (z && (z.schvaleno || z.ai)) vysledky.push({ klic, z });
    else if (!chybi.some(c => c.klic === klic)) chybi.push({ klic, ...x });
  }
  if (chybi.length) {
    if (!env.ANTHROPIC_API_KEY) return json({ error: 'AI není nastavená' }, 500, cors);
    let pole = [];
    try { pole = await coicopAiDotaz(env, chybi); } catch (e) { return json({ error: 'AI teď neodpovídá' }, 502, cors); }
    for (let i = 0; i < chybi.length; i++) {
      const p = pole.find(q => q && Number(q.i) === i); if (!p) continue;
      const cc = parseInt(p.coicop, 10); if (!(cc >= 0 && cc <= 13)) continue;
      const z = { nazev: chybi[i].nazev, ai: { coicop: cc, skupina: /^\d{2}\.\d$/.test(p.skupina || '') ? p.skupina : '' },
        ...(chybi[i].rodic ? { rodic: chybi[i].rodic } : {}), pocet: 0, kdy: Date.now() };
      await put(`community/coicopNavrhy/${chybi[i].klic}`, z);
      vysledky.push({ klic: chybi[i].klic, z });
    }
  }
  //  Počet uživatelů, kteří název mají (jednou za uživatele).
  for (const v of vysledky) {
    try {
      const moje = await get(`users/${uid}/coicopHlasy/${v.klic}`);
      if (!moje) {
        await put(`community/coicopNavrhy/${v.klic}/pocet`, (v.z.pocet || 0) + 1);
        await put(`users/${uid}/coicopHlasy/${v.klic}`, { kdy: Date.now() });
      }
    } catch (e) {}
  }
  return json({ ok: true, vysledky: vysledky.map(v => {
    const s = v.z.schvaleno && v.z.schvaleno.coicop != null ? v.z.schvaleno : null;
    return { klic: v.klic, coicop: s ? s.coicop : v.z.ai.coicop, skupina: s ? (s.skupina || '') : (v.z.ai.skupina || ''), stav: s ? 'schvaleno' : 'navrh' };
  }) }, 200, cors);
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

    //  S22: oficiální inflace z ČSÚ (veřejná, bez klíče).
    //  S23 FIX: volalo se handleInflace(cors) – proměnná `cors` neexistuje, jmenuje
    //  se corsHeaders. ReferenceError shodil worker dřív, než odpověděl, a Cloudflare
    //  vrátil holou 500 bez CORS → prohlížeč hlásil „chybí Access-Control-Allow-Origin".
    //  Oficiální inflace se proto od S22 nenačítala vůbec.
    if (request.method === 'GET' && new URL(request.url).pathname === '/inflace') {
      return handleInflace(corsHeaders, env);
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
    // TODO-255 (S21): zrušení předplatného při smazání účtu. Klient na to nemá
    //   klíč, umí to jen Worker. Ověřuje se Firebase tokenem – ruší se VÝHRADNĚ
    //   předplatné toho, kdo o to žádá; uid se bere z tokenu, ne z těla požadavku,
    //   aby nešlo zrušit cizí.
    if (request.method === 'POST' && new URL(request.url).pathname === '/cancel-subscription') {
      return handleCancelSubscription(request, env, corsHeaders);
    }

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

    //  S24 (TODO-277): archiv fotek účtenek v R2. Vlastní ověření tokenu uvnitř
    //  handleArchiv, proto musí být PŘED obecnou POST větví pro Claude API –
    //  ta by požadavek poslala do analýzy účtenky.
    //  S23 (TODO-295): hromadná zpráva uživatelům se souhlasem. Jen pro admina.
    //  S24 (TODO-306): čárový kód → výrobek. Vlastní ověření tokenu, proto
    //  PŘED obecnou POST větví (ta by kód poslala do Claude API).
    if (request.method === 'POST' && new URL(request.url).pathname === '/ean') {
      return handleEan(request, env, corsHeaders);
    }
    //  S24: AI zařazení vlastních kategorií do COICOP (varianta B).
    if (request.method === 'POST' && new URL(request.url).pathname === '/coicop') {
      return handleCoicop(request, env, corsHeaders);
    }

    //  S25: měsíční report → PDF (Cloudflare Browser Rendering) → e-mail (Resend).
    if (request.method === 'POST' && new URL(request.url).pathname === '/report-mail') {
      return handleReportMail(request, env, corsHeaders);
    }
    if (request.method === 'POST' && new URL(request.url).pathname === '/mass-mail') {
      return handleMassMail(request, env, corsHeaders);
    }

    {
      const _p = new URL(request.url).pathname;
      if (request.method === 'POST' && _p.startsWith('/archiv/')) {
        return handleArchiv(request, env, corsHeaders, _p.slice('/archiv/'.length));
      }
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

PRAVIDLO 3 – SLEVY. OBECNÉ PRAVIDLO: JAKÁKOLI SAMOSTATNÁ ZÁPORNÁ ČÁSTKA hned pod položkou
je sleva k TÉ položce – bez ohledu na to, jak se ten řádek jmenuje. Nerozhoduje slovo "sleva",
rozhoduje ZÁPORNÉ ZNAMÉNKO. Každý řetězec si to pojmenovává jinak:
  "SLEVA VĚRNOSTI" (Penny, Albert) · "Tvoje cena s Kaufland Card" / "Tvoje cena" (Kaufland)
  "Akční cena" · "Klubová cena" (Billa) · "Kupón" · "Sleva %" · a desítky dalších.
Když narazíš na záporný řádek, jehož význam nepoznáš, POŘÁD ho odečti od předchozí položky.
Pokud je sleva SOUČÁSTÍ ŘÁDKU (závorka nebo "SLEVA" na stejném řádku), zahrň ji do lineTotal:
- "Paprika 0,458kg × 99,99  45,75 SLEVA -13,74 (32,01)" → lineTotal:32.01, discount:13.74
Sleva na SAMOSTATNÉM ŘÁDKU hned po položce:
- "Meloun vodní 6,445kg × 29,90 = 192,71" + řádek "SLEVA VĚRNOSTI -64,45" → lineTotal:128.26, discount:64.45
- "OYAKATA Ramen 2 × 49,90 = 99,80" + řádek "Tvoje cena s -49,90" → lineTotal:49.90, discount:49.90
- Takový slevový řádek NEPŘIDÁVEJ jako samostatnou položku do items!
Vždy přidej pole "discount": číslo (kladné, i když na účtence záporné) nebo 0 pokud sleva nebyla.

PRAVIDLO 4 – ČÁSTKY. Účtenka má často DVĚ různá čísla a OBĚ jsou správně:
- "total" = KOLIK BYLO SKUTEČNĚ ZAPLACENO (řádek "CELKEM", "Zaplaceno", "Platba kartou").
  Tohle je částka, která odešla z účtu – i když je zaokrouhlená na koruny.
- "subtotal" = řádek "SOUČET"/"Mezisoučet" (součet položek PŘED zaokrouhlením), je-li natištěn.
- "rounding" = total − subtotal, když jde o zaokrouhlení na koruny (typicky do 1 Kč). Jinak 0.
Příklad: "SOUČET 122,60" + "CELKEM 123,00" → subtotal:122.60, total:123.00, rounding:0.40
Když je natištěné jen jedno číslo, dej ho do "total" a "subtotal" nech null.
NIKDY total nedopočítávej ze součtu položek – když na účtence celková částka není, vrať total:null.

PRAVIDLO 5 – ČÍSLA NIKDY NEUPRAVUJ, ABY SI ODPOVÍDALA. Opiš je tak, jak jsou natištěná.
Když ti sum(items.lineTotal) nesedí se subtotal/total, je to DŮLEŽITÁ INFORMACE pro appku
(nejspíš unikla sleva, záloha na lahve nebo celá položka) – appka si s tím poradí a zeptá se
uživatele. Kdybys čísla srovnal, rozpor zmizí a chyba se nikdy nenajde.

PRAVIDLO 7 – SOUPIS ZÁPORNÝCH ŘÁDKŮ (pojistka). Do JSON přidej navíc pole
"negativeLines": [{"label":"text řádku","amount":ČÍSLO_KLADNĚ,"itemIndex":INDEX_POLOŽKY_V_items}]
a vypiš do něj KAŽDÝ řádek se zápornou částkou, který na účtence vidíš – i ten, který jsi už
promítl do discount/lineTotal podle pravidla 3. itemIndex = pořadí (od 0) položky v items,
ke které řádek patří (ta bezprostředně nad ním). Než odpovíš, projdi účtenku ještě jednou
odshora dolů JEN kvůli záporným částkám: počet záznamů v negativeLines musí odpovídat počtu
záporných řádků na účtence. Kaufland tiskne slevu jako "Tvoje cena s Kaufland Card  -49,90"
malým písmem pod položkou – snadno se přehlédne. Když žádný záporný řádek není, vrať [].

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
            const ldMatches = /** @type {string[]} */ (html.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || []);
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
//  S22 (Milan): OFICIÁLNÍ INFLACE Z ČSÚ  →  GET /inflace
//
//  K čemu to je: metrika „Reálný růst příjmu" ve Finančním obrazu potřebuje
//  vědět, KDE JE NULA – tedy o kolik musel příjem vzrůst, aby si člověk koupil
//  totéž co loni. Přidání o 3 % při inflaci 3 % je stání na místě, při inflaci
//  8 % propad. Bez reference by metrika chválila každé přidání.
//
//  Pozor na časté nedorozumění: index spotřebitelských cen nevydává ČNB, ale
//  ČSÚ. ČNB publikuje prognózy a měnovou politiku; tohle je statistika.
//
//  Proč přes Worker a ne rovnou z prohlížeče:
//    1) ČSÚ neposílá CORS hlavičky, prohlížeč by odpověď zahodil,
//    2) soubor je celá časová řada od roku 2000 (jednotky MB) – stahovat ho
//       každému uživateli zvlášť je plýtvání; tady se stáhne jednou a cachuje.
//
//  Cache 7 dní: ČSÚ vydává nová čísla JEDNOU MĚSÍČNĚ, kolem 10.–15. dne za
//  předchozí měsíc. Denní cache by nic nepřinesla, jen zátěž navíc.
//
//  Formát CSV (dokumentace ČSÚ, sada CEN0101E):
//    sloupce idhod, hodnota, stapro_kod, ucel_tep, ucel_cis, ucel_kod,
//            casz_kod, mesic, rok, obdobiod, obdobido, ...
//    casz_kod = C  →  meziroční index (proti stejnému měsíci loni)  ← bereme
//    casz_kod = K  →  podíl klouzavých průměrů (roční „míra inflace")
//    prázdný ucel_kod = SOUHRNNÝ index za všechny oddíly
//    `hodnota` je index v procentech; inflace = hodnota − 100.
//
//  Vracíme meziroční (C), ne klouzavý průměr (K): roční průměr reaguje se
//  zpožděním a pro srovnání s letošním růstem příjmu by zaostával.
//  Oddíly (ucel_kod 1–12) posíláme taky – appka má COICOP v coicop.js, takže
//  půjde říct „tobě potraviny zdražily o 8 %, průměru o 3 %".
// ══════════════════════════════════════════════════════
const CSU_ISC_CSV = 'https://data.csu.gov.cz/opendata/sady/CEN0101E/distribuce/csv';

//  Rozdělí CSV řádek. Položky jsou v uvozovkách, oddělovač čárka – čárka uvnitř
//  uvozovek (názvy oddílů ji obsahují) se nesmí brát jako oddělovač.
function csvRadek(line) {
  const out = [];
  let cur = '', vUvoz = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { vUvoz = !vUvoz; continue; }
    if (ch === ',' && !vUvoz) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

// ══════════════════════════════════════════════════════
//  S23 (TODO-290): OFICIÁLNÍ INFLACE Z DataStatu ČSÚ  →  GET /inflace
//  ČSÚ ukončil Veřejnou databázi; indexy jsou v DataStatu (sada CEN0101E,
//  COICOP 2018 od 1/2026). Celé CSV má přes 48 MB, proto se API ptáme JEN
//  na potřebné řádky (POST /vlastni) – odpověď má pár kB.
//  Kódy ověřeny z katalogu ČSÚ (diagnostika S23, Milan):
//    ukazatel 6134 = Index spotřebitelských cen
//    TYPUDAJE4A  IR = meziroční index (stejný měsíc loni = 100)
//    CZCOICOP2   0 = úhrn, 01–13 = oddíly (shodné s coicop 1–13 v appce)
//    EKAKTIOCDS  0 = domácnosti celkem · UZ02P CZ = Česko · CasM „RRRR-MM"
//  Hodnota je index v %, inflace = hodnota − 100.
//  Vrací: inflace (úhrn, poslední měsíc), rok, mesic, oddily {kod:{mira,nazev}},
//         rada [{obd, inflace}] a radaOddily {kod:[{obd, mira}]} – 13 měsíců.
// ══════════════════════════════════════════════════════
const CSU_ODDILY = ['0','01','02','03','04','05','06','07','08','09','10','11','12','13'];

//  Rozbor CSV podle HLAVIČKY, ne podle pořadí sloupců (ČSÚ ho už jednou
//  změnil). Vrací VŠECHNY řádky s typem indexu; co z nich spočítat, rozhodne
//  csuInflaceZRadku – umí meziroční index (IR) i dopočet z bazického (IZ…).
//  Formát ověřen na předdefinovaném výběru CEN0101ET03 (S23, Milan):
//    "Ukazatel","IndicatorType","Typ indexu","TYPUDAJE4A","Území","UZ02P",
//    "Skupiny domácností","EKAKTIOCDS","Klasifikace COICOP 2018-Oddíl",
//    "CZCOICOP2.CZCOP1","…-Skupina a třída","CZCOICOP2.CZCOP23","Měsíce",
//    "CasM","Hodnota",…   hodnota s desetinnou TEČKOU („100.7").
function csuRozeber(txt) {
  const lines = txt.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { chyba: 'prazdna odpoved' };
  const H = csvRadek(lines[0]).map(x => x.trim());
  const najdi = (...vz) => H.findIndex(h => vz.some(v => v.test(h)));
  const iHod = najdi(/^hodnota$/i), iObd = najdi(/^CasM$/i), iObdT = najdi(/^Měsíce$/i);
  const iOdd = najdi(/CZCOP1$/i), iOddT = najdi(/COICOP 2018-Oddíl$/i);
  const iSkup = najdi(/CZCOP23$/i), iSkupT = najdi(/Skupina a třída$/i);
  const iTyp = najdi(/^TYPUDAJE4A$/i), iTypT = najdi(/^Typ indexu$/i);
  const iDom = najdi(/^EKAKTIOCDS$/i), iDomT = najdi(/^Skupiny domácností$/i);
  const iUz = najdi(/^UZ02P$/i), iUzT = najdi(/^Území$/i);
  if (iHod < 0 || (iObd < 0 && iObdT < 0) || (iOdd < 0 && iOddT < 0)) return { chyba: 'neznama hlavicka', hlavicka: H, ukazka: lines.slice(1, 3) };
  const c = (p, i) => i >= 0 ? String(p[i] || '').trim() : '';
  const rows = [];
  for (let k = 1; k < lines.length; k++) {
    const p = csvRadek(lines[k]);
    //  jen oddíly – řádky skupin/tříd (vyplněný CZCOP23) přeskočit
    if (c(p, iSkup) || c(p, iSkupT)) continue;
    if (iDom >= 0 ? c(p, iDom) !== '0' : (iDomT >= 0 && !/celkem/i.test(c(p, iDomT)))) continue;
    if (iUz >= 0 ? c(p, iUz) !== 'CZ' : (iUzT >= 0 && !/^česko$/i.test(c(p, iUzT)))) continue;
    const obd = /^\d{4}-\d{2}$/.test(c(p, iObd)) ? c(p, iObd) : csuMesicZTextu(c(p, iObdT));
    if (!obd) continue;
    const kod = iOdd >= 0 ? c(p, iOdd) : csuOddilZNazvu(c(p, iOddT));
    if (!CSU_ODDILY.includes(kod)) continue;
    let typ = c(p, iTyp);
    if (!typ) { const t = c(p, iTypT); typ = /^meziroční index/i.test(t) ? 'IR' : /bazický index \(2025/i.test(t) ? 'IZ2025' : /bazický index \(2015/i.test(t) ? 'IZ2015' : t; }
    const hod = parseFloat(c(p, iHod).replace(/\s/g, '').replace(',', '.'));
    if (!isFinite(hod)) continue;
    rows.push({ obd, kod, typ, hod, nazev: c(p, iOddT) });
  }
  if (!rows.length) return { chyba: 'zadne radky', hlavicka: H, ukazka: lines.slice(1, 3) };
  return { rows };
}

//  Z řádků udělá meziroční inflaci po měsících a oddílech.
//   1) Když jsou řádky meziročního indexu (IR): inflace = hodnota − 100.
//   2) Jinak z BAZICKÉHO indexu: inflace(m) = I(m) / I(m − 12) × 100 − 100.
//      Předdefinovaný výběr má jen 13 měsíců → spočítá se jen poslední měsíc.
function csuInflaceZRadku(rows) {
  const ir = rows.filter(r => r.typ === 'IR');
  if (ir.length) return { zdroj: 'IR', body: ir.map(r => ({ obd: r.obd, kod: r.kod, nazev: r.nazev, mira: Math.round((r.hod - 100) * 10) / 10 })) };
  const baz = ['IZ2025', 'IZ2015'].map(t => rows.filter(r => r.typ === t)).find(x => x.length);
  if (!baz) return { zdroj: null, body: [] };
  const mapa = {}; baz.forEach(r => { (mapa[r.kod] = mapa[r.kod] || {})[r.obd] = r; });
  const minus12 = o => { const [y, m] = o.split('-').map(Number); return `${y - 1}-${String(m).padStart(2, '0')}`; };
  const body = [];
  Object.keys(mapa).forEach(kod => Object.keys(mapa[kod]).forEach(o => {
    const a = mapa[kod][o], z = mapa[kod][minus12(o)];
    if (z && z.hod > 0) body.push({ obd: o, kod, nazev: a.nazev, mira: Math.round((a.hod / z.hod * 100 - 100) * 10) / 10 });
  }));
  return { zdroj: baz[0].typ, body };
}

const CSU_MESICE = ['leden','únor','březen','duben','květen','červen','červenec','srpen','září','říjen','listopad','prosinec'];
function csuMesicZTextu(t) {                          // „srpen 2026" → „2026-08"
  const m = String(t || '').trim().toLowerCase().match(/^([a-zá-ž]+)\s+(\d{4})$/);
  if (!m) return '';
  const i = CSU_MESICE.indexOf(m[1]); return i < 0 ? '' : `${m[2]}-${String(i + 1).padStart(2, '0')}`;
}
//  Oficiální názvy oddílů CZ-COICOP 2018 → kód (když výběr nemá kódový sloupec).
function csuOddilZNazvu(t) {
  const x = String(t || '').trim().toLowerCase().replace(/^\d{2}\s*/, '');
  if (!x) return '';
  if (/^úhrn|^celkem/.test(x)) return '0';
  /** @type {Array<[string, RegExp]>} */
  const V = [['01',/^potraviny/],['02',/^alkohol/],['03',/^od[ěí]v/],['04',/^bydlení/],['05',/^vybavení/],['06',/^zdraví/],
             ['07',/^doprava/],['08',/^informace/],['09',/^rekreace/],['10',/^vzdělávání/],['11',/^stravov/],['12',/^pojištění/],['13',/^osobní/]];
  const h = V.find(([, re]) => re.test(x)); return h ? h[0] : '';
}

//  ZDROJE (S23, ověřeno Milanem): POST /vlastni vrací z workeru vždy 500
//  „Interní chyba serveru" (9 tvarů dotazu) → nepoužívá se. Funguje GET na výběr:
//   U – VLASTNÍ VÝBĚR v DataStatu (proměnná workeru CSU_VYBER_URL): meziroční
//       index, posledních 13+ měsíců, posouvá se sám → plný graf.
//   P – předdefinovaný výběr CEN0101ET03: bazický index za 13 měsíců →
//       spočítá se jen poslední měsíc (celkem + oddíly).
function csuZdroje(env) {
  const z = /** @type {any} */ ([]);   // pole zdrojů + vlastnost diag (typová poznámka pro editor Cloudflare)
  const u = env && env.CSU_VYBER_URL ? String(env.CSU_VYBER_URL).trim() : '';
  if (u) {
    //  Uživatel vloží buď webový odkaz (…/datastat/data/UZIVATELSKY_VYBER/<id>),
    //  nebo rovnou API odkaz – obojí převedeme na API CSV s kódy.
    const id = (u.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i) || [])[0];
    //  Dokumentace u vlastních výběrů uvádí jen ?format=CSV – kodZvlast nemusí
    //  brát. Zkusíme obojí (s kódy je rozbor jistější, bez nich funguje přes názvy).
    if (id) {
      z.push({ n: 'U1: vlastni vyber (kody)', url: `https://data.csu.gov.cz/api/dotaz/v1/data/vybery/uzivatelske/${id}?format=CSV&kodZvlast=true` });
      z.push({ n: 'U2: vlastni vyber', url: `https://data.csu.gov.cz/api/dotaz/v1/data/vybery/uzivatelske/${id}?format=CSV` });
    }
  } else {
    z.diag = 'CSU_VYBER_URL neni nastavena';
  }
  z.push({ n: 'P: vyber CEN0101ET03', url: 'https://data.csu.gov.cz/api/dotaz/v1/data/vybery/CEN0101ET03?format=CSV&kodZvlast=true' });
  return z;
}

async function handleInflace(cors, env) {
  //  Cache 24 h přes Cache API; klíč obsahuje zdroj, aby se po vložení
  //  vlastního výběru hned použil a nečekalo se na vypršení staré odpovědi.
  const zdroje = csuZdroje(env);
  const CKEY = new Request('https://cache.financeflow.internal/inflace-v5/' + encodeURIComponent(zdroje[0].url));
  const cache = (typeof caches !== 'undefined' && caches.default) ? caches.default : null;
  try {
    if (cache) { const hit = await cache.match(CKEY); if (hit) { const t = await hit.text(); return new Response(t, { status: 200, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400', 'X-FF-Cache': 'HIT' } }); } }
    const pokusy = [];
    let V = null, pouzity = null;
    for (const z of zdroje) {
      let r, txt;
      try { r = await fetch(z.url, { headers: { 'Accept': 'text/csv, application/json', 'Accept-Language': 'cs' } }); txt = await r.text(); }
      catch (e) { pokusy.push({ zdroj: z.n, chyba: String(e && e.message || e) }); continue; }
      if (!r.ok) { pokusy.push({ zdroj: z.n, status: r.status, detail: txt.slice(0, 200) }); continue; }
      const X = csuRozeber(txt);
      if (X.chyba) { pokusy.push({ zdroj: z.n, status: r.status, chyba: X.chyba, hlavicka: X.hlavicka, ukazka: X.ukazka }); continue; }
      const I = csuInflaceZRadku(X.rows);
      if (!I.body.some(b => b.kod === '0')) { pokusy.push({ zdroj: z.n, chyba: 'nelze spocitat mezirocni inflaci', typy: [...new Set(X.rows.map(r => r.typ))], mesice: [...new Set(X.rows.map(r => r.obd))].sort() }); continue; }
      V = I; pouzity = z.n; break;
    }
    if (!V) return json({ error: 'CSU: zadny zdroj neprosel', pokusy }, 502, cors);

    const body = V.body;
    const obdobi = [...new Set(body.map(b => b.obd))].sort();
    const posledni = [...obdobi].reverse().find(o => body.some(b => b.obd === o && b.kod === '0'));
    const rada = obdobi.map(o => { const b = body.find(x => x.obd === o && x.kod === '0'); return b ? { obd: o, inflace: b.mira } : null; }).filter(Boolean).slice(-13);
    const oddily = {}, radaOddily = {};
    body.filter(b => b.kod !== '0').forEach(b => {
      (radaOddily[b.kod] = radaOddily[b.kod] || []).push({ obd: b.obd, mira: b.mira });
      if (b.obd === posledni) oddily[b.kod] = { mira: b.mira, nazev: b.nazev };
    });
    Object.keys(radaOddily).forEach(k => { radaOddily[k].sort((a, b) => a.obd < b.obd ? -1 : 1); radaOddily[k] = radaOddily[k].slice(-13); });
    const out = JSON.stringify({
      inflace: rada[rada.length - 1].inflace, rok: +posledni.slice(0, 4), mesic: +posledni.slice(5, 7), obdobi: posledni,
      oddily, rada, radaOddily, zdroj: pouzity, typIndexu: V.zdroj,
      //  S23: i při úspěchu vrátit, co selhalo – záloha nesmí tiše zakrýt
      //  nefunkční vlastní výběr (přesně to se stalo při prvním nastavení).
      vlastniVyber: zdroje.diag || (pokusy.some(p => /^U/.test(p.zdroj)) ? 'selhal – viz pokusy' : (/^U/.test(pouzity) ? 'ok' : '')),
      pokusy: pokusy.length ? pokusy : undefined,
      //  Předdefinovaný výběr dá jen poslední měsíc – appka podle toho pozná,
      //  že graf vývoje zatím nemá z čeho kreslit.
      radaNeuplna: rada.length < 13,
      source: 'CSU DataStat CEN0101E (COICOP 2018)',
    });
    //  Kešovat jen čistý úspěch prvního zdroje. Záložní odpověď se nekešuje,
    //  aby se opravený vlastní výběr projevil hned a ne až za 24 h.
    if (cache && !pokusy.length) { try { await cache.put(CKEY, new Response(out, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' } })); } catch (e) {} }
    return new Response(out, { status: 200, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' } });
  } catch (e) {
    return json({ error: 'CSU fetch failed', detail: String((e && e.message) || e) }, 502, cors);
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

// FIX-306 (S21): SKUTEČNĚ ATOMICKÝ inkrement počítadla zakládajících míst.
//   Původní verze dělala read → +1 → write bez jakékoli ochrany. Komentář se
//   hájil tím, že „webhook běží jen na serveru a platby chodí řídce" – jenže
//   Stripe výslovně dokumentuje, že TÝŽ event může doručit vícekrát, a dva
//   souběžné běhy workeru přečtou stejnou hodnotu a oba zapíšou tutéž +1.
//   Firebase RTDB přes REST transakce nemá, ale UMÍ compare-and-set přes ETag:
//   čtení s hlavičkou X-Firebase-ETag vrátí ETag, zápis s `if-match` projde jen
//   tehdy, když se hodnota mezitím nezměnila (jinak 412 a zkusíme znovu).
async function bumpFounderCount(env) {
  const url = `${FIREBASE_DB_URL}/stats/founderCount.json?auth=${env.FIREBASE_DB_SECRET}`;
  for (let pokus = 0; pokus < 5; pokus++) {
    const r = await fetch(url, { headers: { 'X-Firebase-ETag': 'true' } });
    if (!r.ok) throw new Error(`founderCount read → ${r.status}`);
    const etag = r.headers.get('ETag');
    const cur = (await r.json()) || 0;
    const w = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'if-match': etag },
      body: JSON.stringify(cur + 1),
    });
    if (w.ok) return cur + 1;
    if (w.status !== 412) throw new Error(`founderCount write → ${w.status}`);
    // 412 = někdo nás předběhl, přečti znovu
  }
  throw new Error('founderCount: 5× kolize při zápisu');
}

// FIX-306 (S21): ZABRÁNÍ DVOJÍMU ZPRACOVÁNÍ TÉHOŽ EVENTU.
//   Stripe doručuje at-least-once. `writePremium()` je idempotentní (PATCH stejných
//   dat nic nerozbije), ale `bumpFounderCount()` a `logPremiumEvent()` nejsou –
//   jedna platba by obsadila dvě zakládající místa a zapsala dva řádky do auditu.
//   Zamluvení je atomické: `if-match: null_etag` projde jen tehdy, když uzel
//   ještě neexistuje. Druhé doručení dostane 412 a event se přeskočí.
async function claimStripeEvent(eventId, env) {
  const url = `${FIREBASE_DB_URL}/stripeEvents/${eventId}.json?auth=${env.FIREBASE_DB_SECRET}`;
  const r = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'if-match': 'null_etag' },
    body: JSON.stringify({ at: Date.now() }),
  });
  if (r.status === 412) return false;     // už zpracováno dřív
  if (!r.ok) throw new Error(`claim → ${r.status}`);
  return true;
}

// Když zpracování selže, zámek se musí uvolnit – jinak by Stripe při opakovaném
// pokusu narazil na „už hotovo" a platba by se nikdy nedokončila.
async function releaseStripeEvent(eventId, env) {
  try {
    await fetch(`${FIREBASE_DB_URL}/stripeEvents/${eventId}.json?auth=${env.FIREBASE_DB_SECRET}`,
      { method: 'DELETE' });
  } catch (e) { console.error('release claim fail', e); }
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

  // FIX-306: zamluvit event dřív, než se cokoli zapíše. Stripe doručuje at-least-once.
  const eventId = String(event.id || '').replace(/[^A-Za-z0-9_-]/g, '');
  if (eventId) {
    let prvni;
    try { prvni = await claimStripeEvent(eventId, env); }
    catch (e) {
      // Zámek nešel založit – radši vrátit chybu a nechat Stripe zopakovat,
      // než zpracovat event bez ochrany proti duplicitě.
      console.error('claim fail', e);
      return json({ error: 'Nelze zamluvit event' }, 500, cors);
    }
    if (!prvni) return json({ received: true, note: 'duplicitní doručení, přeskočeno' }, 200, cors);
  }

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
    // FIX-306: uvolnit zámek, ať Stripe může doručení zopakovat
    if (eventId) await releaseStripeEvent(eventId, env);
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

// ══════════════════════════════════════════════════════════════════════
//  TODO-255 · ZRUŠENÍ PŘEDPLATNÉHO (S21)
//  Volá se při smazání účtu. Bez toho by Stripe účtoval dál i poté, co
//  uživatel z appky zmizel – a on by neměl kde to zrušit.
//
//  `cancel_at_period_end=true`, ne okamžité zrušení: uživatel si zaplacené
//  období dočerpá. Okamžité zrušení bez vrácení peněz by bylo horší než nic.
// ══════════════════════════════════════════════════════════════════════
async function handleCancelSubscription(request, env, cors) {
  const idToken = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  if (!idToken) return json({ error: 'Chybí Authorization header' }, 401, cors);

  // uid VÝHRADNĚ z ověřeného tokenu – nikdy z těla požadavku
  const verifyRes = await fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=AIzaSyDtEdQw4WccmEzxXzMwPQlenqfnjoiVw4A',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }
  );
  if (!verifyRes.ok) return json({ error: 'Neplatný Firebase token' }, 401, cors);
  const vd = await verifyRes.json();
  const uid = vd.users?.[0]?.localId;
  if (!uid) return json({ error: 'Firebase uživatel nenalezen' }, 401, cors);

  try {
    // Najdi customera podle uid. `stripeCustomers` je mapa customerId → uid,
    // takže se prochází – uživatelů s platbou je řádově málo.
    const mapRes = await fetch(`${FIREBASE_DB_URL}/stripeCustomers.json?auth=${env.FIREBASE_DB_SECRET}`);
    const mapa = (await mapRes.json()) || {};
    const customerId = Object.keys(mapa).find(cid => {
      const v = mapa[cid];
      return v === uid || (v && v.uid === uid);
    });
    if (!customerId) return json({ ok: true, note: 'žádné předplatné nenalezeno' }, 200, cors);

    // Aktivní subscriptions daného customera
    const subsRes = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(customerId)}&status=active&limit=10`,
      { headers: { 'Authorization': 'Bearer ' + env.STRIPE_SECRET_KEY } }
    );
    if (!subsRes.ok) return json({ error: 'Stripe: seznam předplatných selhal' }, 502, cors);
    const subs = await subsRes.json();
    if (!subs.data || !subs.data.length) return json({ ok: true, note: 'žádné aktivní předplatné' }, 200, cors);

    let zruseno = 0;
    for (const sub of subs.data) {
      const r = await fetch(`https://api.stripe.com/v1/subscriptions/${sub.id}`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + env.STRIPE_SECRET_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'cancel_at_period_end=true',
      });
      if (r.ok) zruseno++;
    }

    // Stopa v auditu – uzel premiumLog přežívá smazání účtu (je mimo users/)
    try {
      await fetch(`${FIREBASE_DB_URL}/premiumLog/${uid}/${Date.now()}.json?auth=${env.FIREBASE_DB_SECRET}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'cancelOnDelete', customerId, zruseno, at: Date.now() }),
      });
    } catch (e) { /* audit je bonus, ne podmínka */ }

    if (zruseno === 0) return json({ error: 'Stripe zrušení selhalo' }, 502, cors);
    return json({ ok: true, zruseno }, 200, cors);
  } catch (e) {
    console.error('cancel-subscription:', e);
    return json({ error: String(e) }, 500, cors);
  }
}
