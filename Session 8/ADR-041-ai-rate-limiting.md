# ADR-041 · AI Rate Limiting – per-type kvóty (Free vs Premium)

> **Status:** ✅ SCHVÁLENO (Session 8, 2026-05-19) — připraveno k implementaci
> **Datum:** 2026-05-19
> **Kontext session:** Session 8, po dokončení TODO-023 Admin panel
> **Související:** TODO-022 (platební systém), TODO-023 (admin), `worker.js`, `premium.js`
> **Implementace:** TBD (v Session 9+)

---

## 🎯 Kontext a problém

FinanceFlow používá Anthropic Claude API přes Cloudflare Worker (`misty-limit-0523.bc-milda.workers.dev`) v **8 různých funkcích**:

| Type | Funkce | Lokace volání | max_tokens | Reálná cena Sonnet 4 ($3/$15 per M) |
|---|---|---|---:|---:|
| `receipt` | Sken účtenek (multimodal, 1 image) | `receipts.js`, `offline-sync.js` | 8 192 | ~$0.016/volání |
| `bank_statement_text` | PDF výpis z banky (15 stran) | `import.js` | 16 384 | ~$0.13/volání |
| `chat` | AI Chat v rodině | `ai.js` | 8 192 | ~$0.012/volání |
| `advisor_report` | Poradce – roční report | `advisor.js` | 1 024 | ~$0.022/volání |
| `wish_url` | Parsing URL produktu | `charts.js` | 512 | ~$0.009/volání |
| `price_alert` | Hlídač cen (email) | `nakup.js` | 512 | ~$0.009/volání |
| `contact_form` | Kontaktní formulář (jen Resend) | `premium.js` | – | ~$0 |
| `bank_statement` | Legacy PDF base64 (deprecated) | – | 16 384 | – |

### Aktuální stav (nebezpečný)

**Žádné rate limity neexistují.** Worker propustí libovolný počet volání každého přihlášeného uživatele. Důsledky:

1. 💸 **Náklady** — útočník s ukradeným Firebase tokenem může v noci utratit stovky USD
2. 🐛 **Bugy v klientu** — nekonečná smyčka (`while(true) analyzeReceipt()`) by spotřebovala kvóty během minut
3. 🚪 **Žádný business model** — uživatel nemá důvod platit Premium, když Free má neomezené AI
4. ⚖️ **Anthropic vlastní limit** — pokud překročíme náš API tier, **přestane fungovat všem uživatelům najednou**

### Cíle

1. **Bezpečnost:** Hard cap na měsíční náklady i v případě zneužití
2. **Business model:** Free = ochutnávka, Premium = reálná hodnota
3. **UX:** Uživatel ví dopředu kolik mu zbývá, ne až po pokusu
4. **Spravedlnost:** Trial dostane Premium limity (30 dní zdarma plnou silou)
5. **Auditovatelnost:** Admin vidí top spotřebitele, může resetovat při bugu

---

## 📊 Rozhodnutí: Per-type měsíční limity

### ✅ SCHVÁLENÉ limity (Milan, 2026-05-19)

| Funkce | Free / měsíc | Trial / měsíc | Premium / měsíc | Cena Free worst | Cena Premium worst |
|---|---:|---:|---:|---:|---:|
| 📸 Sken účtenek | **15** | 50 | **50** | $0.24 | $0.80 |
| 🏦 PDF výpis z banky | **2** | 5 | **5** | $0.26 | $0.65 |
| 💬 AI Chat | **20** | 80 | **80** | $0.24 | $0.96 |
| 📋 Poradce – roční report | **1** | 5 | **5** | $0.02 | $0.11 |
| 🛒 Wish URL | **5** | 15 | **15** | $0.05 | $0.14 |
| 🔔 Price alert | **5** | 15 | **15** | $0.05 | $0.14 |
| 📧 Contact form | **1** | 3 | **3** | $0 | $0 |
| **TOTAL** | | | | **$0.85 / měsíc** | **$2.78 / měsíc** |
| **V Kč (kurz 24 Kč/USD)** | | | | **~20 Kč** | **~67 Kč** |

**Premium marže (cena Premium 99 Kč):**
- Worst-case (uživatel 100 % využije): 99 − 67 = **+32 Kč/měsíc** ✅
- Realistic (uživatel 30 % využije): 99 − 20 = **+79 Kč/měsíc** ✅✅

**Free čistá ztráta:**
- Worst-case: ~20 Kč/měsíc (akceptovatelné jako CAC – cost of acquisition)
- Realistic: ~6 Kč/měsíc

### Trial politika

- **Trial = stejné limity jako Premium** (50/5/80/5/15/15/3)
- 30 dní plné vyzkoušení hodnoty
- Po expiraci Trial → automaticky přechod na Free limity

### Reset cyklus

- Counter resetuje **1. dne každého měsíce v 00:00 UTC**
- Klíč v Firebase obsahuje `YYYY-MM` → starý měsíc se nemaže (historie pro monitoring)
- **Žádné carry-over** mezi měsíci

### 🟢 Možnost "Premium Plus" (budoucí)

Pro náročné uživatele zvážit vyšší tier (např. 199 Kč/měsíc) se zvýšenými limity:
- Sken účtenek: 200
- PDF výpisy: 20
- AI Chat: 300
- atd.

Implementace **později**, až bude validovaný základní Free/Premium tier na reálných uživatelích.

---

## 🔄 Refund logika (otázka #4)

**Problém:** Pokud Claude vrátí prázdnou nebo nevalidní odpověď, uživatel nedostal hodnotu, ale počítadlo už ho strhlo.

### Kdy refund provést

Refund **JEN pro extrakční funkce** (kde Claude má vrátit strukturovaný výsledek):

| Type | Refund? | Detekce |
|---|---|---|
| `receipt` | ✅ ANO | `parsed.store` chybí I `parsed.total` chybí, NEBO `items.length === 0` |
| `bank_statement_text` | ✅ ANO | `parsed.transactions.length === 0` |
| `wish_url` | ✅ ANO | `parsed.price` chybí I `parsed.name` chybí |
| `chat` | ❌ NE | Vždy dostane odpověď (i krátkou) |
| `advisor_report` | ❌ NE | Vždy dostane doporučení |
| `price_alert` | ❌ NE | Vždy se pokusí poslat email |
| `contact_form` | ❌ NE | Submit form |

### Implementace

```javascript
// worker.js – v handleru po Claude API volání
let isValid = validateResponse(type, parsedResult);
if (!isValid) {
  await refundQuota(uid, type, monthKey);
  return jsonResponse({
    error: 'AI nedokázala extrahovat výsledek z této ' + (type === 'receipt' ? 'účtenky' : 'PDF'),
    refunded: true,
    reason: refundReason,
  }, 200);  // 200 ne 500 – refund je úspěšné selhání
}

async function refundQuota(uid, type, monthKey) {
  await admin.database()
    .ref(`users/${uid}/aiUsage/${monthKey}`)
    .transaction(curr => {
      if (!curr) return curr;
      curr[type] = Math.max(0, (curr[type] || 0) - 1);
      curr.total = Math.max(0, (curr.total || 0) - 1);
      curr.refunds = (curr.refunds || 0) + 1;
      return curr;
    });
}
```

### UX dopad

- Klient dostane `{error, refunded: true}` → toast: "📸 Účtenka nečitelná — pokus se vám vrátil do limitu"
- Refundy se logují separátně (`refunds: 3` v counteru) → admin vidí pokud má někdo bug/zneužívá
- **Maximální cap refundů:** 10 / měsíc per typ — chrání proti zneužití (uživatel by mohl spamovat prázdné fotky)

---

## 📈 Admin monitoring (otázka #8)

### Datový model rozšířen

```
users/{uid}/aiUsage/
  └── 2026-05/
      ├── receipt: 12         ← úspěšná volání
      ├── bank_statement_text: 1
      ├── chat: 8
      ├── advisor_report: 0
      ├── wish_url: 3
      ├── price_alert: 1
      ├── contact_form: 0
      ├── total: 25
      ├── refunds: 2          ← počet refundů (kvalitativní indikátor)
      ├── lastCallAt: 1747900000000
      └── updatedAt: 1747900000000
```

### Admin panel: nová karta "📈 AI Usage"

**Layout:**

```
┌─ AI Usage – Říjen 2026 ────────────────────────────────────┐
│  📊 Globální statistiky                                   │
│  Aktivní uživatelé:  142  │  Celkem volání:  3 850        │
│  Náklady tento měsíc: $128 (3 072 Kč)                     │
│  Refundů:  87 (2.3 %)                                     │
├────────────────────────────────────────────────────────────┤
│  Per-type breakdown:                                       │
│  📸 receipt:        2 100  ($33.60)  ⬛⬛⬛⬛⬛⬛⬜⬜⬜⬜  60%   │
│  🏦 bank_statement:   150  ($19.50)  ⬛⬛⬛⬜⬜⬜⬜⬜⬜⬜  30%   │
│  💬 chat:           1 200  ($14.40)  ⬛⬛⬛⬛⬛⬜⬜⬜⬜⬜  50%   │
│  ...                                                       │
├────────────────────────────────────────────────────────────┤
│  🔥 Top 20 spotřebitelů (řazeno dle total)                │
│  ┌──────────┬────────────┬──────┬──────┬─────┬───────┐    │
│  │ Avatar   │ Email      │ Tier │ Total│ Cost│ Reset │    │
│  ├──────────┼────────────┼──────┼──────┼─────┼───────┤    │
│  │ 🟢 PR    │ jan@x.cz   │ Prem │  167 │$3.20│ [⟳]  │    │
│  │ 🟡 TR    │ eva@y.cz   │ Trial│  120 │$1.80│ [⟳]  │    │
│  │ 🔴 FR    │ pavel@.cz  │ Free │   45 │$0.90│ [⟳]  │    │  ← Free na limitu!
│  │ ...      │            │      │      │     │      │    │
│  └──────────┴────────────┴──────┴──────┴─────┴───────┘    │
│                                                            │
│  💸 Top 5 nejdražších volání tento měsíc:                  │
│  - bank_statement_text 18 stránek  $0.18                  │
│  - bank_statement_text 14 stránek  $0.14                  │
│  - ...                                                     │
└────────────────────────────────────────────────────────────┘
```

### Akce admina

1. **🔍 Detail uživatele** — klik na řádek → modal s historií 6 měsíců + per-type rozpis
2. **⟳ Reset uživatele** — manuálně vynulovat aktuální měsíc (hot-fix při bugu)
3. **🚫 Block uživatele** — nastavit `users/{uid}/aiBlocked: true` → Worker vrátí 403 pro všechna AI volání (anti-zneužití)
4. **📊 Export CSV** — celý měsíc → daňová evidence

### Reálný-time monitoring (volitelně)

Nový node v Firebase: `aiUsageGlobal/{YYYY-MM-DD}/{type}` agreguje napříč uživateli → admin vidí dnešní spend bez procházení všech uživatelů.

**Implementace:** Worker při každém volání zapíše do obou míst (user counter + global counter). Cena: zanedbatelné (~$0.50/měsíc extra Firebase write).

---

## 🏗️ Architektura (technické detaily)

### Datový model (Firebase Realtime DB)

```
users/{uid}/aiUsage/
  ├── 2026-05/
  │   ├── receipt: 12
  │   ├── bank_statement_text: 1
  │   ├── chat: 8
  │   ├── advisor_report: 0
  │   ├── wish_url: 3
  │   ├── price_alert: 1
  │   ├── contact_form: 0
  │   ├── total: 25
  │   ├── refunds: 0
  │   ├── lastCallAt: 1747900000000
  │   └── updatedAt: 1747900000000
  └── 2026-06/...   (auto-created at first call in new month)

aiUsageGlobal/2026-05/
  ├── receipt: 2100
  ├── bank_statement_text: 150
  ├── ...
  └── totalCost: 128.50    ← v USD, aggregát ze všech uživatelů
```

**Proč Firebase, ne Cloudflare KV:**
- Už ho máme nastavený (zero overhead)
- Atomické increment přes Realtime DB transactions
- Levné (~$1/měsíc i pro 10 000 uživatelů)
- Stejný auth flow jako zbytek aplikace

### Kontrola na dvou úrovních

#### 1. Klient (UX-friendly pre-flight)

Před voláním Workeru zkontroluje cache + zobrazí progress:

```javascript
// ai-limits.js (nový soubor)
async function checkAIQuota(type) {
  const usage = await loadAIUsage();  // cache 5 min
  const tier = window._premiumStatus?.type || 'free';
  const limit = AI_LIMITS[tier][type];
  const used = usage[type] || 0;
  if (used >= limit) {
    showQuotaExhaustedModal(type, tier, limit);
    return false;
  }
  return { remaining: limit - used, limit, used };
}
```

#### 2. Worker (security-critical enforcement)

Worker sám čte z Firebase Admin SDK a inkrementuje **atomicky**:

```javascript
// worker.js (nový handler před Claude voláním)
async function checkAndIncrementQuota(uid, type, env) {
  const admin = initAdmin(env);
  const monthKey = new Date().toISOString().slice(0, 7);
  const path = `users/${uid}/aiUsage/${monthKey}`;
  const tier = await getPremiumTier(uid, env);
  const limit = AI_LIMITS[tier][type];

  const result = await admin.database()
    .ref(path)
    .transaction(curr => {
      curr = curr || {};
      if ((curr[type] || 0) >= limit) return; // abort → quota exceeded
      curr[type] = (curr[type] || 0) + 1;
      curr.total = (curr.total || 0) + 1;
      curr.lastCallAt = Date.now();
      curr.updatedAt = Date.now();
      return curr;
    });

  if (!result.committed) {
    return { ok: false, limit, type, tier };
  }
  return { ok: true, used: result.snapshot.val()[type], limit };
}
```

### Worker secrets (nové)

V Cloudflare Dashboard přidat:
- `FIREBASE_SERVICE_ACCOUNT` (JSON private key — pro Admin SDK)
- `FIREBASE_DB_URL` (`https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app`)

---

## 🎨 UI/UX prvky

### 1. Settings / Profil – nová karta "📊 Využití AI tento měsíc"

```
┌────────────────────────────────────────────────┐
│ 📊 Využití AI v tomto měsíci                  │
│ Resetuje se 1. listopadu (za 12 dní)          │
├────────────────────────────────────────────────┤
│ 📸 Sken účtenek           12 / 50  ████░░░░░░ │
│ 🏦 PDF výpisy              2 / 5   ████░░░░░░ │
│ 💬 AI Chat                15 / 80  ██░░░░░░░░ │
│ 📋 Poradce ročního reportu 1 / 5   ██░░░░░░░░ │
│ 🛒 Wish URL                3 / 15  ██░░░░░░░░ │
│ 🔔 Price alert             0 / 15  ░░░░░░░░░░ │
│ 📧 Contact form            0 / 3   ░░░░░░░░░░ │
├────────────────────────────────────────────────┤
│ Tvůj plán: 💎 Premium · 99 Kč/měsíc           │
│ [⬆️ Upgrade na Premium Plus] (budoucí)        │
└────────────────────────────────────────────────┘
```

Barvy:
- 🟢 Zelená: < 70 %
- 🟡 Žlutá: 70–90 %
- 🔴 Červená: > 90 %

### 2. Modal "Vyčerpáno" při překročení

**Pro Free uživatele:**
```
┌──────────────────────────────────────┐
│ ⛔ Limit vyčerpán                    │
│                                      │
│ Tento měsíc jsi vyčerpal 15 z 15     │
│ skenování účtenek na Free plánu.     │
│                                      │
│ 💎 Premium = 50 skenů (3× více!)     │
│ + neomezené funkce navíc             │
│                                      │
│ [Zjistit více o Premium]             │
│ [Resetuje se za 12 dní]              │
└──────────────────────────────────────┘
```

**Pro Premium uživatele:**
```
┌──────────────────────────────────────┐
│ ⛔ Limit vyčerpán                    │
│                                      │
│ Vyčerpal jsi 50 z 50 skenů tento     │
│ měsíc na Premium plánu.              │
│                                      │
│ [Resetuje se za 12 dní]              │
│ [Kontaktovat podporu]                │
└──────────────────────────────────────┘
```

---

## ⚖️ Alternativy zvažované

### A) Jednoduchý total counter
**Pro:** Jednodušší kód, jednodušší marketing ("20 AI volání/měsíc")
**Proti:** Uživatel může 1 PDF výpisem vyčerpat celý měsíc. Hlavně Free je frustrovaný.
**Verdikt:** ❌ Odmítnuto Milanem v Session 8

### B) Hybrid (2 fondy: lehké / těžké)
**Pro:** Jednodušší než per-type, robustnější než total
**Proti:** Stále arbitrární hranice, harder to communicate
**Verdikt:** ❌ Odmítnuto Milanem v Session 8

### C) **Per-type** (vybráno)
**Pro:** Plná kontrola, fair per funkci, dobrá UX
**Proti:** Více kódu, více objektů v Firebase, složitější progress UI
**Verdikt:** ✅ Schváleno Milanem v Session 8

### D) Cloudflare KV namespace pro counter
**Pro:** Rychlejší než Firebase (~5ms read)
**Proti:** Extra service, extra cena, separátní auth flow
**Verdikt:** ❌ Odmítnuto – Firebase máme, výhoda je nulová

---

## ✅ Důsledky

### Pozitivní
- **Hard cap na náklady** — i při masivním zneužití nepřekročí ~$3/měsíc per uživatel
- **Premium ziskovost ověřena** — marže +32 Kč až +79 Kč/měsíc per uživatel
- **Jasný value prop** — Free 3–4× nižší než Premium = motivace upgrade
- **Auditovatelnost** — admin panel + per-user historie + global metrics
- **Trial dostane Premium limity** = reálné vyzkoušení hodnoty
- **Refund mechanismus** = uživatel netrestán za vady Claude

### Negativní / rizika
- **Komplexita** — 7 typed counterů + refund logika + monitoring = víc kódu
- **Firebase Admin SDK ve Workeru** — nutno setup `FIREBASE_SERVICE_ACCOUNT` secret, learning curve
- **Race condition** — Worker transakce není 100 % bullet-proof; v extrémním edge case 2 současná volání mohou inkrementovat o 1 nad limit (tolerance)
- **Existing users** — pro existující uživatele auto-create counter `0` v aktuálním měsíci na první volání
- **Reset 1. den race** — counter cesta obsahuje `YYYY-MM`, takže auto-create v novém měsíci

---

## 📌 Schválená rozhodnutí (Milan, Session 8)

1. ✅ **Per-type limity** (ne total)
2. ✅ **Trial = Premium limity** (plné vyzkoušení)
3. ✅ **Offline fronta:** Při vyčerpané kvótě se sync zastaví → uživatel uvidí ve frontě "X účtenek čeká na nový měsíc"
4. ✅ **Žádné affiliate bonusy** (zatím)
5. ✅ **Refund:** ANO pro `receipt`, `bank_statement_text`, `wish_url` (max 10/měsíc per typ)
6. ✅ **Anonymní uživatelé:** Zachovat block (Worker vyžaduje Firebase token)
7. ✅ **Free → Premium mid-month:** Limity okamžitě, spotřebovaný počet zůstává
8. ✅ **Pricing:** Ponechat 99 Kč/měsíc, později přidat "Premium Plus" pro náročné
9. ✅ **Monitoring:** Plný admin panel (top users, per-type breakdown, global cost)

---

## 🚦 Implementační plán (ČEKÁ NA START)

1. **Worker.js**
   - Setup `FIREBASE_SERVICE_ACCOUNT` secret v Cloudflare
   - Import lightweight Firebase Admin REST wrapper (full SDK je moc velký pro Worker)
   - `checkAndIncrementQuota()` před každým Claude voláním
   - `validateResponse()` po Claude volání → refund logic
   - Vrátit `429 {error:'rate_limit', type, limit, used, resetAt}` při překročení
   - Vrátit `200 {error:'invalid', refunded:true, reason}` při refund
   - Fail-open při Firebase outage (povolit volání + log)

2. **Nový `ai-limits.js`** (klient)
   - Konstanta `AI_LIMITS` (mirror serveru)
   - `loadAIUsage()` s 5 min cache
   - `checkAIQuota(type)` pre-flight
   - `showQuotaExhaustedModal(type, tier, limit)`
   - `renderAIUsageBar()` (pro Settings)

3. **Wrap všech 8 míst** volání Workeru
   - Pre-flight check
   - Catch `429` → quota modal
   - Catch `refunded:true` → friendly toast
   - Refresh local cache po úspěšném volání

4. **Settings.js**
   - Nová karta "📊 Využití AI"
   - Progress bars per-type
   - "Reset za X dní" indikátor

5. **Admin.js**
   - Nová karta "📈 AI usage"
   - Top 20 spotřebitelů + per-type breakdown
   - Reset tlačítko + Block tlačítko
   - Export CSV

6. **Database rules**
   - `users/{uid}/aiUsage` — write **POUZE z Workeru** (Admin SDK obchází rules)
   - `read` — owner + admin
   - `aiUsageGlobal` — write Worker, read admin

7. **Migrace** — žádná. První volání AI v novém měsíci vytvoří counter automaticky.

---

## 🔗 Cross-reference

- `worker.js` — hlavní místo enforcement
- `premium.js` — `_premiumStatus.type` se používá pro tier detection
- `database_rules.json` — admin write na `users/{uid}/aiUsage`
- `todo.md` TODO-022 (platební systém — souvisí s Premium subscription)
- `todo.md` TODO-073 (Donate – Stripe Payment Link, Session 8)
- `bugs.md` — FIX-054 (max_tokens) ukázal náklad PDF
- `architecture.md` sekce 17 (PDF import + Worker token usage)

---

*ADR vytvořeno: Session 8 (2026-05-19) | Status: ✅ Schváleno Milanem | Autor: Milan Migdal + Claude*


### Aktuální stav (nebezpečný)

**Žádné rate limity neexistují.** Worker propustí libovolný počet volání každého přihlášeného uživatele. Důsledky:

1. 💸 **Náklady** — útočník s ukradeným Firebase tokenem může v noci utratit stovky USD
2. 🐛 **Bugy v klientu** — nekonečná smyčka (`while(true) analyzeReceipt()`) by spotřebovala kvóty během minut
3. 🚪 **Žádný business model** — uživatel nemá důvod platit Premium, když Free má neomezené AI
4. ⚖️ **Anthropic vlastní limit** — pokud překročíme náš API tier, **přestane fungovat všem uživatelům najednou**

### Cíle

1. **Bezpečnost:** Hard cap na měsíční náklady i v případě zneužití
2. **Business model:** Free = ochutnávka, Premium = reálná hodnota
3. **UX:** Uživatel ví dopředu kolik mu zbývá, ne až po pokusu
4. **Spravedlnost:** Trial dostane Premium limity (30 dní zdarma plnou silou)
5. **Auditovatelnost:** Admin vidí top spotřebitele, může resetovat při bugu

---

## 📊 Rozhodnutí: Per-type měsíční limity

### Navrhované limity (k odsouhlasení Milanem)

| Funkce | Free / měsíc | Trial / měsíc | Premium / měsíc | Důvod |
|---|---:|---:|---:|---|
| 📸 Sken účtenek | 15 | 300 | 300 | Hlavní funkce – Free musí dávat smysl |
| 🏦 PDF výpis z banky | 2 | 30 | 30 | Drahá funkce (16k tokens), Free dostane "ochutnávku" |
| 💬 AI Chat | 20 | 500 | 500 | Levný, ale loop hrozba |
| 📋 Poradce – roční report | 1 | 10 | 10 | Spíš ad-hoc funkce |
| 🛒 Wish URL parsing | 10 | 100 | 100 | Lehký |
| 🔔 Price alert | 3 | 50 | 50 | Email má extra cost |
| 📧 Contact form | 3 | 10 | 10 | Anti-spam pojistka |
| **🌐 Global cap (total)** | 50 | 1 000 | 1 000 | Pojistka proti chybám |

### Odhad měsíčních nákladů (worst-case 100% užití)

- **1 Free uživatel:** ~$2.30/měsíc (málokdo dosáhne)
- **1 Premium uživatel:** ~$30/měsíc

→ Při ceně Premium 99 Kč ≈ $4 by Premium kompletně vyčerpaný byl **ztrátový**. To je OK pokud:
- Většina Premium uživatelů spotřebuje 10-30 % limitů
- Pricing později zvedneme nebo přidáme tier "Premium Plus" (neomezený)

### Reset cyklus

- **Counter resetuje 1. dne každého měsíce v 00:00 UTC**
- Klíč v Firebase obsahuje `YYYY-MM` → starý měsíc se nemaže, jen ignoruje (pro analytics)
- **Nezbylo přenášet** mezi měsíci (jednoduché, motivuje k pravidelnému využívání)

---

## 🏗️ Architektura

### Datový model (Firebase Realtime DB)

```
users/{uid}/aiUsage/
  ├── 2026-05/
  │   ├── receipt: 12
  │   ├── bank_statement_text: 1
  │   ├── chat: 8
  │   ├── advisor_report: 0
  │   ├── wish_url: 3
  │   ├── price_alert: 1
  │   ├── contact_form: 0
  │   ├── total: 25
  │   └── updatedAt: 1747900000000
  └── 2026-06/
      └── (auto-created at first call)
```

**Proč Firebase, ne Cloudflare KV:**
- Už ho máme nastavený (zero overhead)
- Atomické increment přes Realtime DB transactions
- Levné (cena ~$1/měsíc i pro 10 000 uživatelů)
- Stejný auth flow jako zbytek aplikace

### Kontrola na dvou úrovních

#### 1. Klient (UX-friendly pre-flight)
Před voláním Workeru zkontroluje cache + zobrazí progress bar:

```javascript
// ai-limits.js (nový soubor)
async function checkAIQuota(type) {
  const usage = await loadAIUsage();  // cache 5 min
  const tier = window._premiumStatus?.type || 'free';
  const limit = AI_LIMITS[tier][type];
  const used = usage[type] || 0;
  if (used >= limit) {
    showQuotaExhaustedModal(type, tier, limit);
    return false;
  }
  return { remaining: limit - used, limit, used };
}
```

#### 2. Worker (security-critical enforcement)
Worker sám čte z Firebase Admin SDK a inkrementuje **atomicky**:

```javascript
// worker.js (nový handler před Claude voláním)
async function checkAndIncrementQuota(uid, type, env) {
  const adminApp = initAdmin(env);
  const monthKey = new Date().toISOString().slice(0, 7);  // "2026-05"
  const path = `users/${uid}/aiUsage/${monthKey}`;
  const tier = await getPremiumTier(uid, env);
  const limit = AI_LIMITS[tier][type];

  const result = await adminApp.database()
    .ref(path)
    .transaction(curr => {
      curr = curr || {};
      curr[type] = (curr[type] || 0) + 1;
      curr.total = (curr.total || 0) + 1;
      curr.updatedAt = Date.now();
      if (curr[type] > limit) return; // abort transaction
      return curr;
    });

  if (!result.committed) {
    return { ok: false, limit, type, tier };
  }
  return { ok: true, used: result.snapshot.val()[type], limit };
}
```

**Pokud transakce vrátí `null` → quota vyčerpaná → Worker vrátí `429 Too Many Requests`.**

### Worker secrets (nové)

V Cloudflare Dashboard přidat:
- `FIREBASE_SERVICE_ACCOUNT` (JSON private key — pro Admin SDK)
- `FIREBASE_DB_URL` (`https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app`)

### UI/UX prvky

1. **Settings / Profil – nová karta "📊 Využití AI tento měsíc"**
   - Progress bar pro každý typ (use/limit)
   - Barevné: zelená <70%, žlutá 70-90%, červená >90%
   - Tlačítko "Resetuje se 1. <měsíc>"

2. **Modal "Vyčerpáno"** při překročení
   - Free → upsell "Premium dává 20× více skenování"
   - Premium → "Resetuje se za X dní" + tlačítko Contact support

3. **Admin panel – nová karta "📈 AI usage"**
   - Top 20 spotřebitelů aktuálního měsíce
   - Total spend napříč všemi uživateli
   - Tlačítko "Reset uživatele" (pro hot-fix při bugu)

---

## ⚖️ Alternativy zvažované

### A) Jednoduchý total counter
**Pro:** Jednodušší kód, jednodušší marketing ("20 AI volání/měsíc")
**Proti:** Uživatel může 1 PDF výpisem vyčerpat celý měsíc. Hlavně Free je frustrovaný.
**Verdikt:** ❌ Odmítnuto Milanem v Session 8

### B) Hybrid (2 fondy: lehké / těžké)
**Pro:** Jednodušší než per-type, robustnější než total
**Proti:** Stále arbitrární hranice, harder to communicate
**Verdikt:** ❌ Odmítnuto Milanem v Session 8

### C) **Per-type** (vybráno)
**Pro:** Plná kontrola, fair per funkci, dobrá UX
**Proti:** Více kódu, více objektů v Firebase, složitější progress UI
**Verdikt:** ✅ Schváleno Milanem v Session 8

### D) Cloudflare KV namespace pro counter
**Pro:** Rychlejší než Firebase (~5ms read)
**Proti:** Extra service, extra cena, separátní auth flow
**Verdikt:** ❌ Odmítnuto – Firebase máme, výhoda je nulová

---

## ✅ Důsledky

### Pozitivní
- Hard cap na náklady (i při zneužití nepřekročí ~$200/měsíc pro 100 Premium užívatelů)
- Jasný value prop pro Premium (10-20× vyšší limity)
- Auditovatelnost přes admin panel
- Firebase Rules už podporují admin write na `users/{uid}/*`
- Trial dostane Premium limity = reálné vyzkoušení hodnoty

### Negativní / rizika
- **Komplexita** — 7 typed counterů + total = víc kódu na test
- **Firebase Admin SDK ve Workeru** — nutno setup `FIREBASE_SERVICE_ACCOUNT` secret, learning curve
- **Race condition** — Worker transakce není 100% bullet-proof; v extrémním edge case 2 současná volání mohou inkrementovat o 1 nad limit (tolerance)
- **Existing users** — uživatelé před zavedením musí dostat counter `0` pro aktuální měsíc (auto-create na první volání = OK)
- **Reset 1. den** — pokud uživatel volá AI 1. den ráno, race condition mezi "starý měsíc" a "nový měsíc" (řešitelné: counter cesta obsahuje `YYYY-MM`, takže auto-create v novém měsíci)

### Co se NEbude dělat (out of scope tohoto ADR)
- **Per-call cost tracking** — Worker by mohl logovat skutečnou cenu z Claude API response, ale pro start stačí counter
- **Rolling 30-day window** místo kalendářního měsíce — komplikovanější, ne nezbytné
- **Quota carry-over** mezi měsíci — kontroverzní
- **Burst handling** — pokud uživatel chce udělat 50 skenů najednou (povodeň účtenek) → Free se zasekne na 15. Řešením je upsell

---

## 🚦 Implementační plán (pro budoucí ADR Implementation)

> Tato sekce je orientační. Skutečná implementace přijde v dalším ADR po Milanově schválení limitů.

1. **Worker.js**
   - Setup `FIREBASE_SERVICE_ACCOUNT` secret v Cloudflare
   - Import `firebase-admin` (nebo lightweight REST wrapper)
   - `checkAndIncrementQuota()` před každým Claude voláním
   - Vrátit `429 {error:'rate_limit', type, limit, used, resetAt}` při překročení
   - Pokud transakce selže (Firebase down), **fail-open** (povol volání + log) — neblokovat uživatele kvůli outageMu

2. **Nový `ai-limits.js`** (klient)
   - Konstanta `AI_LIMITS` (mirror serveru)
   - `loadAIUsage()` s 5min cache
   - `checkAIQuota(type)` pre-flight
   - `showQuotaExhaustedModal(type, tier, limit)`
   - `renderAIUsageBar()` (pro Settings)

3. **Wrap všech 8 míst** volání Workeru
   - Pre-flight check
   - Catch `429` → quota modal
   - Refresh local cache po úspěšném volání

4. **Settings.js**
   - Nová karta "📊 Využití AI"
   - Progress bars
   - "Reset za X dní" indikátor

5. **Admin.js**
   - Nová karta "📈 AI usage"
   - Top spotřebitelé
   - Reset tlačítko

6. **Database rules**
   - `users/{uid}/aiUsage` — write **POUZE z Workeru** (server-side přes Admin SDK obchází rules)
   - `read` — owner + admin

7. **Migrace** — žádná. První volání AI v novém měsíci vytvoří counter automaticky.

---

## 📌 Otevřené otázky před implementací

1. **Trial = Premium limity, nebo něco mezi?** Trial je 30 dní – pokud dostane plné Premium limity, naučí se na ně a Free pak působí drsně. Ale snižování trial limitů odrazuje od konverze. **Návrh:** Trial = Premium limity (vyzkoušení plné hodnoty).

2. **Co s offline frontou?** Účtenky uložené offline se sync, když je internet. Co když uživatel mezitím vyčerpal kvótu? **Návrh:** Sync zkusí, dostane 429, položka zůstane ve frontě se stavem `quota_exceeded` (nepokouší se znovu do dalšího měsíce). Uživatel uvidí v offline správě "X účtenek čeká na nový měsíc".

3. **Affiliate bonus?** Možnost: za každého přivedeného Premium uživatele +50 receipts/měsíc po dobu 12 měsíců. **Návrh:** Nepřidávat teď, řešit jako separátní ADR.

4. **Refund při chybě?** Pokud Claude vrátí nevalidní JSON / účtenku nepřečte → strhne se counter? **Návrh:** Strhne se (uživatel viděl pokus). Alternativně by Worker mohl rozlišovat „úspěšný parse" vs „prázdná odpověď" — komplexnější.

5. **Anonymní (non-logged) uživatelé?** Mohou volat AI? **Aktuálně:** Worker vyžaduje Firebase token → nemohou. **Návrh:** Zachovat (žádné free-for-all).

6. **Co když přechod Free → Premium uprostřed měsíce?** Limity se zvednou okamžitě, již spotřebovaný počet zůstává.
   Příklad: Free užil 12/15 receipts → upgradne → má 12/300 receipts. **OK.**

7. **Cena pro start Premium?** Aktuálně dokumentace zmiňuje 99 Kč/měsíc nebo 699 Kč/rok. **Návrh:** Drž se toho, validuj na ~50 platících uživatelích, pak adjust.

---

## 🔗 Cross-reference

- `worker.js` — hlavní místo enforcement
- `premium.js` — `_premiumStatus.type` se používá pro tier detection
- `database_rules.json` — admin write na `users/{uid}/aiUsage`
- `todo.md` TODO-022 (platební systém — souvisí s Premium subscription)
- `todo.md` TODO-073 (Donate – Stripe Payment Link, Session 8)
- `bugs.md` — žádné existující bugy, ale FIX-054 (max_tokens) ukázal náklad PDF
- `architecture.md` sekce 17 (PDF import + Worker token usage)

---

*ADR vytvořeno: Session 8 (2026-05-19) | Status: navrženo | Autor: Milan Migdal + Claude*
