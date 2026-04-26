/**
 * FinanceFlow – Cloudflare Worker v5 (v6.45)
 * Proxy pro Claude API – ověřuje Firebase token a volá Claude
 * Změny v5: přidán https://bcmilda.github.io do allowedOrigins, Resend key přesunut do env
 *
 * Environment Variables (nastavte v Cloudflare dashboardu):
 *   ANTHROPIC_API_KEY = sk-ant-váš-klíč  (Secret)
 *   RESEND_API_KEY    = re_váš-klíč       (Secret)
 */

export default {
  async fetch(request, env) {

    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = [
      'https://financeflow-a249c.web.app',
      'https://financeflow-a249c.firebaseapp.com',
      'https://misty-limit-0523.bc-milda.workers.dev',
      'https://bcmilda.github.io',
    ];
    const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

    const corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
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

      let claudeRequest;

      if (type === 'chat') {
        claudeRequest = {
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8192,
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
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8192,
          messages: [{
            role: 'user',
            content: [
              ...imageContent,
              {
                type: 'text',
                text: `${multiNote}
Analyzuj účtenku a vrať POUZE validní JSON bez jakéhokoli dalšího textu:
{"store":"název obchodu","date":"YYYY-MM-DD nebo null","total":číslo,"currency":"CZK","items":[{"name":"název","price":CENA_ZA_KUS,"qty":množství}],"category":"Jídlo & Nákupy nebo Drogerie nebo Elektronika nebo Restaurace nebo Benzín nebo Jiné"}

!!! KRITICKÉ PRAVIDLO PRO "price" !!!
"price" = VŽDY cena za JEDEN KUS. NIKDY celková cena za více kusů.

PŘÍKLADY:
- "Rohlík 43g  2ks  x3,50  7,00 Kč" → price:3.50, qty:2  (NE price:7)
- "Sladký rohlík 75g  3ks  x4,00  12,00 Kč" → price:4.00, qty:3  (NE price:12)
- "Mléko 1l  1ks  29,90 Kč" → price:29.90, qty:1

"total" = celková částka CELÉ účtenky. Pokud hodnota chybí, použij null.`
              }
            ]
          }]
        };

      } else if (type === 'bank_statement') {
        if (!payload.pdfData) return json({ error: 'Chybí pdfData' }, 400, corsHeaders);
        claudeRequest = {
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8192,
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
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8192,
          messages: [{
            role: 'user',
            content: `${hint}
Analyzuj tento text bankovního výpisu a extrahuj VŠECHNY transakce. Vrať POUZE validní JSON bez dalšího textu:
{"bank":"název banky nebo null","account":"číslo účtu nebo null","transactions":[{"date":"YYYY-MM-DD","amount":číslo,"name":"název protistrany/popis","note":"doplňující info","category":"odhadnutá kategorie"}]}

Pravidla:
- amount: kladné číslo pro příjmy, záporné pro výdaje
- date: vždy ve formátu YYYY-MM-DD
- name: hlavní popis transakce
- category: odhadni z názvu (Jídlo & Nákupy / Doprava / Bydlení / Zdraví / Restaurace / Jiné)
- Pokud není datum čitelné nebo řádek není transakce, vynech ho
- Vrať POUZE JSON, žádný jiný text

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
            pageText = html
              .replace(/<script[\s\S]*?<\/script>/gi, '')
              .replace(/<style[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 4000);
          }
        } catch(fetchErr) {
          pageText = '(Stránka nedostupná)';
        }
        claudeRequest = {
          model: 'claude-sonnet-4-20250514',
          max_tokens: 512,
          messages: [{
            role: 'user',
            content: `Extrahuj název a cenu produktu z obsahu stránky. Vrať POUZE JSON bez dalšího textu:
URL: ${payload.url}
OBSAH: ${pageText}
{"name":"název produktu","price":číslo nebo null,"desc":"popis max 80 znaků","currency":"CZK"}`
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
          model: 'claude-sonnet-4-20250514',
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
              from: 'FinanceFlow <onboarding@resend.dev>',
              to: ['bc.milda@gmail.com'],
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

      return json(await claudeRes.json(), 200, corsHeaders);

    } catch (e) {
      return json({ error: 'Interni chyba: ' + e.message }, 500, corsHeaders);
    }
  }
};

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
}
