# FinanceFlow – Architektura

> Konsolidovaný dokument ze **4 sessions**. Nové informace z každé session jsou označeny
> `**(Session N)**`. Konflikty mezi sessions jsou explicitně vyznačeny.
> Poslední aktualizace: konsolidace 4 sessions, 2026-04-14.

---

## 1. Stack

| Vrstva | Technologie |
|--------|-------------|
| Frontend | Vanilla JS (ES6+), HTML5, CSS3 – bez frameworku |
| Databáze | Firebase Realtime Database (europe-west1) |
| Auth | Firebase Authentication – Google Sign-In |
| AI | Anthropic Claude Sonnet (přes Cloudflare Worker) |
| Email | **(Session 3 + 4)** Resend.com API (přes Cloudflare Worker) |
| Offline | **(Session 4)** IndexedDB – sync queue pro účtenky |
| PWA | manifest.json, icon-192.png |
| Hosting | ⚠️ **Konflikt mezi sessions** — viz níže |
| Worker | Cloudflare Worker – **(Session 1)** v2 &nbsp;·&nbsp; **(Session 4)** v4 |

### ⚠️ Hosting – aktuální nejasnost
> - **(Session 1)** Neuvedeno
> - **(Session 2)** Firebase Hosting implikováno (root = `financeflow-a249c/`)
> - **(Session 3)** Firebase Hosting (konzistentní se Session 2)
> - **(Session 4)** GitHub Pages (`bcmilda.github.io/financeflow`, dev branch)
>
> **Stav:** GitHub Pages se „mezi sessions vytratil", ale autor ho **plánuje vrátit**.
> Aktuální produkční URL: `https://financeflow-a249c.web.app` (Firebase Hosting),
> plán: GitHub Pages obnovit.

---

## 2. Struktura projektu

### ⚠️ Konflikt: Single HTML vs Multi-file
> - **(Session 1)** Single HTML soubor `FinanceFlow_v6.xx.html` (celá aplikace v jednom)
> - **(Session 2 + 3 + 4)** Multi-file – `index.html` + `js/*.js` moduly
>
> Session 1 je zjevně historický stav před refactorem. Aktuální architektura je multi-file.

### Aktuální struktura (Session 2 + 3 + 4)
```
financeflow-a249c/                ← deploy root
├── index.html                    ← shell, script tagy s cache-busting hashy
├── manifest.json                 ← PWA manifest
├── icon-192.png                  ← PWA ikona
├── lepsi-uver.html               ← (Session 1) standalone stránka pro srovnání úvěrů
├── css/
│   └── styles.css                ← ~467 řádků
├── js/
│   ├── app.js                    ← bootstrap, routing, Firebase init, stav S
│   ├── helpers.js                ← utility, showPage(), predikce, formátování
│   ├── ui.js                     ← (Session 3+) render router, dashboard, souhrn
│   ├── transactions.js           ← CRUD transakcí, editor, predikce tabulka
│   ├── charts.js                 ← canvas 2D grafy (area, bars, predikce)
│   ├── stats.js                  ← statistiky, roční přehledy
│   ├── debts.js                  ← půjčky + saveTx() (kritická ukládací fce)
│   ├── ai.js                     ← AI Rádce, chat s Claude
│   ├── premium.js                ← premium logika, kontaktní formulář, Net Worth
│   ├── projects.js               ← projekty, DTI/DSTI, detektor úspor
│   ├── receipts.js               ← analýza účtenek (Claude Vision), COICOP
│   ├── settings.js               ← (Session 3+) nastavení, PIN, téma, export
│   ├── share.js                  ← (Session 3+) referral systém, sdílení
│   ├── sms-import.js             ← (Session 3+) parser bank notifikací
│   ├── kalendar.js               ← (Session 3+) čtvercový kalendář transakcí
│   ├── nakup.js                  ← (Session 3+) nákupní seznam, hlídač cen
│   ├── duplicates.js             ← (Session 3+) Jaro-Winkler detektor duplikátů
│   ├── admin.js                  ← admin panel (jen pro Admin UID)
│   ├── import.js                 ← import CSV/PDF, editor duplikátů
│   ├── offline-sync.js           ← (Session 4) IndexedDB engine, sync queue
│   └── firebase.js               ← Firebase SDK, onAuthStateChanged (type=module) — VŽDY POSLEDNÍ
└── data/
    └── categories.json           ← (Session 2) výchozí kategorie
```

### Počet JS souborů: **22** (potvrzený stav)
Progresivní růst napříč sessions:
- **(Session 2)** 14 souborů – základ
- **(Session 3)** +6 souborů (`settings`, `share`, `sms-import`, `kalendar`, `nakup`, `duplicates`) = 20
- **(Session 3)** +`ui.js` jako samostatný = 21
- **(Session 4)** +`offline-sync.js` = **22 souborů (aktuální)**

### Pořadí načítání JS (KRITICKÉ – nelze měnit!) **(Session 2)**
```html
<script src="js/app.js"></script>
<script src="js/helpers.js"></script>
<script src="js/ui.js"></script>
<script src="js/transactions.js"></script>
<script src="js/charts.js"></script>
<script src="js/stats.js"></script>
<script src="js/debts.js"></script>
<script src="js/ai.js"></script>
<script src="js/premium.js"></script>
<script src="js/projects.js"></script>
<script src="js/receipts.js"></script>
<script src="js/admin.js"></script>
<script src="js/import.js"></script>
<!-- Session 3+ přidává: settings, share, sms-import, kalendar, nakup, duplicates -->
<!-- Session 4 přidává: offline-sync (před firebase.js) -->
<script type="module" src="js/firebase.js"></script>  <!-- VŽDY POSLEDNÍ -->
```

**Proč `firebase.js` poslední:** Firebase používá `type="module"` (asynchronní ES6 modul).
Ostatní soubory mají stub funkce (`signInGoogle`, `_db` atd.), které jsou přepsány až po
načtení Firebase. **ChatGPT doporučoval firebase první — v našem případě to NEFUNGUJE.**

---

## 3. Soubory a jejich odpovědnost

### Session 2 baseline + Session 3 rozšíření

| Soubor | Odpovědnost | Zdroj |
|--------|-------------|-------|
| `index.html` | Shell aplikace, script tagy s cache-busting hashy, verze v title (ř. 6) | S2 |
| `app.js` | Konstanty, stav `S`, Firebase wrappery, seed data, bootstrap, routing | S2 |
| `helpers.js` | `showPage()`, `renderPage()`, predikce, bank výpočty, formátování | S2 |
| `ui.js` | `renderPage()`, `renderDashboard()`, navigace | S3 |
| `transactions.js` | Transakce render, bank, predikce stránky, editor | S2 |
| `charts.js` | Všechny grafy (canvas 2D API) – Obecné/Měsíční/Roční, box plot | S2 |
| `stats.js` | Statistiky, kategorie, rodina, sdílení | S2 |
| `debts.js` | Půjčky, simulace, widgety (~1513 ř.), **`saveTx()`** | S2 |
| `ai.js` | AI Rádce, chat s Claudem | S2 |
| `premium.js` | Premium logika, kontaktní formulář, peněženky, typy plateb, Net Worth | S2 |
| `projects.js` | Projekty, zdraví, report, radar, detektor úspor, DTI/DSTI | S2 |
| `receipts.js` | Účtenky, COICOP engine, Claude Vision | S2 |
| `admin.js` | Admin panel, komunita, tagy, split | S2 |
| `import.js` | Import CSV/PDF, editor duplikátů | S2 |
| `settings.js` | **(Session 3)** Témata (dark/light/auto), PIN, export | S3 |
| `share.js` | **(Session 3)** Sdílení dat s partnerem, referral | S3 |
| `sms-import.js` | **(Session 3)** Parser bankovních notifikací (debug) | S3 |
| `kalendar.js` | **(Session 3)** Finanční kalendář (čtvercový) | S3 |
| `nakup.js` | **(Session 3)** Nákupní seznam, hlídač cen | S3 |
| `duplicates.js` | **(Session 3)** Jaro-Winkler detektor duplicit | S3 |
| `offline-sync.js` | **(Session 4)** IndexedDB engine, sync queue, offline UI | S4 |
| `firebase.js` | Firebase SDK init, `onAuthStateChanged` → `window.onUserSignedIn` (type=module) | S2 |
| `financeflow-worker-v4.js` | Cloudflare Worker – proxy pro Claude API + Resend | S4 |

### Klíčové interní details

#### `app.js` – Globální stav **(Session 3)**
```javascript
let S = {
  transactions: [], debts: [], categories: [], bank: { startBalance: 0 },
  birthdays: [], wishes: [], wallets: [], payTypes: [], sablony: [],
  projects: [], receipts: [], shareSettings: {}
};
let curPage = 'prehled';    // aktuální stránka
let viewingUid = null;       // null = vlastní data, uid = partner
const SEASON = { 0:{mult:.85}, /* ... */ 11:{mult:1.35} };  // globální sezónnost
```

#### `helpers.js` – Utility + Predikce **(Session 3)**
- `getTx(m, y, D)` – transakce pro daný měsíc/rok
- `incSum(txs)` / `expSum(txs)` – suma příjmů/výdajů (**vždy** `t.amount || t.amt || 0`)
- `fmt(n)` – formátování čísla (1234567 → "1 234 567")
- `showPage(name)` – navigace + `renderPage()` s `rAF` delay pro grafy
- `predictCat(catId, sub, m, y, D)` – predikce výdajů (viz `formulas.md`)
- `computePersonalSeason(catId, sub, D)` – personalizované sezónní koeficienty
- `detectTrend(catId, sub, D)` – trend (min 4 měsíce, outlier removal)
- `computeYearForecast(catId, sub, year, D)` – „Předpoklad YTD"

#### `debts.js` – `saveTx()` (kritická funkce) **(Session 3)**
```javascript
// Ukládá transakci s OBĚMA poli pro zpětnou kompatibilitu:
const txObj = { amount: amt, amt, type, name, catId, /* ... */ };
```

#### `firebase.js` – Autentizace **(Session 3)**
- `onAuthStateChanged` → `window.onUserSignedIn(user)`
- Načítá data z `/users/{uid}/data`
- Real-time listener (`onValue`) pro sync

---

## 4. Datový model

### 4.1 Globální in-memory stav `S` **(Session 1)**
```javascript
S = {
  curMonth: number,          // 0–11
  curYear:  number,
  transactions: [{
    id, name, amount, amt,   // amt = alias pro amount (historická kompatibilita)
    type,                    // 'income' | 'expense' | 'transfer'
    date,                    // 'YYYY-MM-DD'
    catId, category,         // ID kategorie
    subcat,                  // podkategorie (string)
    note, tags[],
    walletId, payTypeId,
    projectId,
    splitId,                 // přítomno u split transakcí
    splitParent,             // true = parent, false = child
    transferId, debtId,      // (Session 3) přidáno
  }],
  categories: [{
    id, name, icon, color,
    type,                    // 'expense' | 'income' | 'both'
    subs[],                  // podkategorie (string[])
    stableMonthly,           // fixní měsíční výdaj (pro detekci úspor)
    oecdLimit,               // OECD limit (Kč/měs)
    healthPct, healthAmt,    // (Session 3) přidáno
    isSaving,                // (Session 3) přidáno
  }],
  wallets:  [{ id, name, type, balance, currency, color }],
  debts: [{
    id, name, type,          // 'loan' | 'credit' | 'mortgage'
    total, remaining,
    interest, payment, freq, // freq: 'monthly' | 'weekly' | 'biweekly'
    startDate,
    creditor, priority,      // (Session 3) přidáno
    installments: [{ from, amt }],
    schedule: [],            // (Session 3) generováno
  }],
  birthdays: [{ id, name, date, month, day, gift, note }],
  wishes:    [{ id, name, desc, price, priority, done, url, bdayId }],
  projects:  [{ id, name, type, start, end, budget, desc, color, closed }],
  receipts: [{               // max 5 000 záznamů (Session 1)
    id, store, date, total, merchant,
    category, items: [{ name, price, qty, itemCat }],
    raw,                     // (Session 3)
  }],
  bank:           { startBalance },
  shareSettings:  {},        // bool per sekce – co se sdílí s partnerem
  importHistory:  [{ filename, date, count, duplicates, bank }],
  payTypes:       [{ id, name, icon }],
  sablony: [{ id, name, amount, type, catId, freq, den, auto, note }],
};
```

### 4.2 `_settings` objekt **(Session 1)**
```javascript
_settings = {
  lang,                      // 'cs' | 'sk' | 'en'
  currency,                  // 'CZK' | 'EUR' | ...
  dateFmt,                   // 'cs' | 'iso' | 'us'
  household_adults,          // počet dospělých
  household_ch013,           // děti 0–13 let
  household_ch14,            // děti 14+ let
  household,                 // = calcOECD() výsledek (spotřební jednotky)
  theme, pin,                // (Session 3) přidáno, pin je hashed
};
```

### 4.3 Firebase Realtime Database struktura
**(Session 1 + 2 + 3 konsolidováno)**
```
/users/{uid}/
  data/                      ← celý S objekt uživatele
    transactions[], debts[], categories[], bank/, birthdays[],
    wishes[], wallets[], payTypes[], sablony[], projects[], receipts[],
    shareSettings/, importHistory[]
  settings/
    lang, currency, dateFmt, household, theme, pin (hashed)
  premium/
    type,                    // 'trial' | 'premium' | 'free'
    trialUntil,              // timestamp
    premiumUntil             // timestamp
  profile/
    displayName, photoURL
  referral/                  ← (Session 3)
    code, clicks, conversions, points
  partners/                  ← (Session 3)
    {partnerUid}: true

/community/                  ← (Session 1 + 2)
  {month}/users/{uid}/       ← (Session 1) anonymní data (OECD skupiny)
  subscriptions/{kw}/        ← (Session 2) komunitní předplatná z detektoru
    count, lastSeen
  stats/                     ← (Session 2) anonymní statistiky

/catalog/
  items/{id}: { name, price, unit, category }

/keyword_overrides/{keyword}/
  coicopId,                  // number 1–13
  updatedAt,                 // timestamp
  updatedBy                  // string

/coicop_corrections/{uid}/{kw}/   ← user corrections

/affiliate/{timestamp}/      ← affiliate/referral data
/leads/{timestamp}/          ← leady z externího webu
/referrals/{code}/
  uid, createdAt, clicks, conversions

/support/{key}/
  name, email, type, message, uid, date, version, status

/admins/
  {uid}: true

/sharing/{uid}/              ← (Session 2) partnerská data
```

---

## 5. Tok dat

### Základní workflow (ukládání transakce) **(Session 3)**
```
Uživatel → UI event (onclick)
    ↓
saveTx() / save() v debts.js
    ↓
S.transactions.push(txObj)            ← lokální stav
    ↓
save() → setTimeout(1200ms) → saveToFirebase()
    ↓
Firebase Realtime DB → onValue listener
    ↓
S = fresh data
    ↓
renderPage() → renderDashboard() / renderGrafy() / ...
```

### Autentizace **(Session 2)**
```
Firebase Auth state change
  → onAuthStateChanged()           (firebase.js)
  → window.onUserSignedIn(user)    (app.js)
  → loadUserProfile() + loadPartners()
  → renderPage()
```

### AI Rádce **(Session 2 + 3)**
```
Uživatel prompt + finanční data
    ↓
ai.js → getAuthToken() → Cloudflare Worker (POST /v1/messages, type='chat')
    ↓
Worker → Anthropic API (Claude Sonnet)
    ↓
Odpověď → renderMarkdown() → chat UI
```

### Import CSV **(Session 2)**
```
parseCSV() → detekuje encoding + header
    ↓
mapImportRows() dle formátu banky
    ↓
showImportPreview() → openImportEditor()
    ↓
calcDupScore() pro každou transakci
    ↓
Editor → uživatel schválí/zamítne
    ↓
confirmImport() → save()
```

### Import PDF (bankovní výpis) **(Session 2)**
```
handlePdfFile() → base64 encoding
    ↓
Cloudflare Worker (auth token, type='bank_statement')
    ↓
Claude API → JSON parsing
    ↓
showImportPreview()
```

### Analýza účtenky **(Session 2)**
```
foto → base64 → Worker (type='receipt')
    ↓
Claude Vision → JSON → editace položek → přidání transakcí
```

### Grafy – opravený flow **(Session 3)**
```
showPage('grafy')
    ↓
page-grafy.classList.add('active')   ← CSS: display:none → block
    ↓
requestAnimationFrame(() =>
  setTimeout(() => renderPage(), 50) ← čeká na CSS reflow!
)
    ↓
renderGrafy() → drawSimpleAreaChart()
    ↓
canvas.parentElement.getBoundingClientRect().width  ← správná šířka
```

**Root cause bugu:** `.page { display: none }` v CSS. `showPage()` volal `renderGrafy()`
synchronně před CSS reflow → `canvas.parentElement.clientWidth = 0` → prázdné plátno.
Fix přes `rAF + setTimeout 50ms` nechá prohlížeč dokončit layout.

---

## 6. Offline architektura **(Session 4)**

```
Uživatel (offline)
       │
       ▼
addReceiptPhoto() / analyzeMultiReceipt()
       │
  navigator.onLine ?
       │
   NO  ├─────────────────────────────────────────────────┐
       │                                                 │
       ▼                                                 │
OfflineSync.saveReceiptOffline(file)                     │
       │                                                 │
compressPhoto() → JPEG 82%, max 1200×1600px              │
       │                                                 │
dbPut(STORE_RECEIPTS, { blob, status: 'pending', ... }) │
       │                                                 │
IndexedDB ← uloženo                                      │
       │                                                 │
showOfflineBadge() → žlutý badge "☁️ 1 čeká na sync"    │
                                                         │
  YES ─┘ (online)                                        │
       │                                                 │
       ▼                                                 │
window.addEventListener('online')                        │
       │                                                 │
setTimeout(runSync, 1500)                                │
       │                                                 │
dbGetAll(STORE_RECEIPTS, 'status', 'pending')            │
       │                                                 │
syncOneReceipt() → Cloudflare Worker → Claude Vision     │
       │                                                 │
onReceiptAnalyzed(result) → UI                           │
       │                                                 │
dbDelete(id) → badge zmizí                              │
```

**IndexedDB store:** `STORE_RECEIPTS` se statusy `pending` / `syncing` / `done`.
Sync se spouští na event `online` s 1500 ms debounce.

---

## 7. Cloudflare Worker

### ⚠️ Konflikt: Verze Workeru a URL
> - **(Session 1)** `financeflow-worker-v2.js`, URL neuvedena explicitně
> - **(Session 2)** `misty-limit-0523`, URL `https://misty-limit-0523.bc-milda.workers.dev`
> - **(Session 3)** `misty-limit-0523` (konzistentní)
> - **(Session 4)** `misty-limit-0523` jako název, ale URL `https://financeflow.bcmilda.workers.dev` (custom route?)
>
> **Pravděpodobné vysvětlení:** Session 4 mohl přidat custom route na vlastní doménu
> `financeflow.bcmilda.workers.dev`, zatímco výchozí URL `misty-limit-0523.bc-milda.workers.dev`
> stále funguje. Ověř v Cloudflare dashboardu.

### Konfigurace **(Session 4)**
- **Název:** `misty-limit-0523`
- **Soubor:** `financeflow-worker-v4.js`
- **Observability:** Workers Logs = Enabled, Workers Traces = Disabled
- **Bindings:** 0 (komunikuje přímo přes HTTP s Firebase a Anthropic)
- **Auth:** Firebase ID token v `Authorization` headeru
- **Allowed origins (Session 2):** github.io + workers.dev + web.app
- **max_tokens:** 8192 (maximum pro Claude API)

### 🔴 Security issue: Hardcoded Resend API klíč **(Session 4)**
> **Session 4 v plain textu uvádí:**
> `Resend API klíč: re_9jY2risE_PHnkUvHmqPfgSH9vQp1j9zLC`
>
> ⚠️ **Tento klíč je již deaktivovaný** (rotován po security incidentu, GitGuardian alert).
> Zachován v dokumentu pouze pro historickou referenci a sledovatelnost.

#### ✅ Správné zacházení s API klíči (pravidla pro budoucnost)

**NIKDY:**
- ❌ Hardcodovat klíč přímo do JS/Worker kódu
- ❌ Commitovat klíč do GitHubu (ani do private repa)
- ❌ Ukládat klíč do `.md` dokumentace (ani jako "deaktivovaný" – stejně se to opakuje)
- ❌ Posílat klíč v chatu, e-mailu, screenshotu

**VŽDY:**
- ✅ Ukládat do **Cloudflare Worker Secrets** (Dashboard → Worker → Settings → Variables → Type: Secret)
- ✅ V kódu Workeru číst přes `env.RESEND_API_KEY` (nikdy ne literál)
- ✅ Lokálně držet v `.env` souboru, který je v `.gitignore`
- ✅ Při jakémkoli podezření na únik – **okamžitá rotace** (Resend dashboard → Delete + Generate new)
- ✅ Mít `.env.example` v repu jako šablonu (bez skutečných hodnot)

**Příklad správného Worker kódu:**
```javascript
// ✅ Správně:
'Authorization': `Bearer ${env.RESEND_API_KEY}`,

// ❌ Špatně (jak bylo v Session 4):
'Authorization': 'Bearer re_9jY2risE_PHnkUvHmqPfgSH9vQp1j9zLC',
```

**Doporučená struktura `.gitignore`:**
```
.env
.env.local
.env.*.local
*.key
secrets/
```

### Typy requestů (`type` parametr)

| `type` | Popis | max_tokens | Zdroj |
|---|---|---|---|
| `chat` | AI Rádce – konverzační chat | 1 200 → 8192 | S1 → S2 |
| `receipt` | Analýza účtenek (1–4 fotek, Claude Vision) | 4 000 → 8192 | S1 → S2 |
| `bank_statement` | PDF bankovní výpis – extrakce transakcí | 4 000 → 8192 | S1 → S2 |
| `wish_url` | Extrakce produktu z URL (pro hlídač přání) | 500 | S1 |
| `price_alert` | **(Session 3)** Email alert pro hlídač cen | 512 | S3 |
| `contact_form` | **(Session 3)** Email notifikace přes Resend API | 512 | S3 |

**Pozn.:** Session 1 uváděla nižší `max_tokens` (1200/4000/500). **Hodnoty byly navýšeny
na maximum 8192** kvůli importu PDF bankovních výpisů, kde menší limit nestačil pro delší
výpisy. Aktuální hodnota napříč endpointy je **8192** (Worker v4).

---

## 8. Firebase Security Rules

> 🔴 **OTEVŘENÝ PROBLÉM:** Rules se vyvíjely nekonzistentně napříč sessions a žádná
> z verzí níže přesně neodpovídá aktuálnímu produkčnímu stavu. Tato sekce je úmyslně
> ponechána otevřená — **vyžaduje konsolidaci a security audit** před dalšími úpravami.
>
> **Co je potřeba dořešit:**
> 1. Identifikovat, která verze je skutečně nasazená v produkci (Firebase Console)
> 2. Sjednotit pojmenování uzlů (`referrals` vs `affiliate`, `support` vs `leads`, atd.)
> 3. Ověřit, že admin přístupy fungují pro `loadLowConf()`, `loadMappingStats()`
> 4. Vyřešit GDPR-citlivé uzly (`leads` = potenciální zájemci o úvěr → osobní údaje)
> 5. Přepracovat `affiliate`, `community`, `catalog` (volné write práva = riziko spamu)

### 8.1 Verze Session 1 (nejvolnější, historická)
```json
{
  "rules": {
    "users": {
      ".read": "auth != null",
      "$uid": { ".write": "auth.uid === $uid" }
    },
    "leads":     { ".read": "auth != null", ".write": true },   // ⚠️ kdokoli zapíše bez auth
    "affiliate": { ".read": "auth != null", ".write": true },   // ⚠️ kdokoli zapíše bez auth
    "community": { ".read": "auth != null", ".write": "auth != null" },
    "catalog": {
      ".read": "auth != null",
      ".write": "auth != null",
      "$item": {
        ".validate": "newData.hasChildren(['name']) && newData.child('name').isString() && newData.child('name').val().length >= 2 && newData.child('name').val().length <= 60"
      }
    },
    "keyword_overrides": {
      ".read": "auth != null",
      ".write": "auth.uid === 'LNEC8VNB2QPwIv6WWQ9lqgR4O5v1'"
    },
    "coicop_corrections": {
      ".read": "auth.uid === 'LNEC8VNB2QPwIv6WWQ9lqgR4O5v1'",
      ".write": "auth != null"
    },
    "admins": { ".read": "auth != null", ".write": false }
  }
}
```
**Známá rizika S1:** `leads` a `affiliate` mají `.write: true` (úplně bez autentizace) –
jakýkoli bot mohl zaplnit databázi.

### 8.2 Verze Session 3 (v6.40)
```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth.uid === $uid",
        ".write": "auth.uid === $uid",
        "data": {
          ".read": "auth.uid === $uid || root.child('users/' + auth.uid + '/partners/' + $uid).exists()"
        }
      }
    },
    "referrals": { ".read": true, ".write": "auth != null" },
    "support": {
      ".read": "auth.uid === 'LNEC8VNB2QPwIv6WWQ9lqgR4O5v1'",
      ".write": "auth != null"
    },
    "catalog": { ".read": true, ".write": "auth.uid === 'LNEC8VNB2QPwIv6WWQ9lqgR4O5v1'" }
  }
}
```
**Změny oproti S1:**
- ✅ `users` zpřísněno – jen vlastník čte/zapisuje
- ✅ Přidán `partners` mechanismus pro sdílení dat
- ✅ `catalog` write omezen jen na admina
- ⚠️ Vypadl `leads`, `affiliate`, `community`, `keyword_overrides`, `coicop_corrections`, `admins`
  → buď byly smazány, nebo jen nezdokumentovány
- ⚠️ `referrals` má `.read: true` (úplně veřejné) – záměr?

### 8.3 Verze Session 4 (nekompletní, se známou chybou)
```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth.uid === $uid",
        ".write": "auth.uid === $uid"
      }
    },
    "keyword_overrides": {
      ".read": true,
      ".write": "auth != null"
    }
  }
}
```
**(Session 4)** **Známá chyba:** `loadLowConf()` a `loadMappingStats()` nefungují, potřebují:
```json
"users": { ".read": "auth.uid === 'LNEC8VNB2QPwIv6WWQ9lqgR4O5v1'" }
```

> **Pozor:** S4 měla pouze Projekt + soubory bez kontextu (podle vyjádření autora),
> takže může jít o nekompletní výpis – ne nutně o stav, který byl reálně nasazen.

### 8.4 Aktuální produkční verze (zjištěná z Firebase Console)
> Kompletní výpis aktuálních produkčních rules. Toto je **referenční stav**, vůči kterému
> by se měly verze 8.1–8.3 porovnávat při auditu.
```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth.uid === $uid",
        ".write": "auth.uid === $uid",
        "data": {
          ".read": "auth.uid === $uid || root.child('users').child($uid).child('partners').child(auth.uid).exists()"
        },
        "profile":  { ".read": "auth != null" },
        "premium":  { ".read": "auth.uid === $uid" },
        "settings": { ".read": "auth.uid === $uid" },
        "partners": { ".read": "auth.uid === $uid" }
      }
    },
    "leads":     { ".read": "auth != null", ".write": "auth != null" },
    "affiliate": { ".read": "auth != null", ".write": "auth != null" },
    "community": { ".read": "auth != null", ".write": "auth != null" },
    "catalog": {
      ".read": "auth != null",
      ".write": "auth != null",
      "$item": {
        ".validate": "newData.hasChildren(['name']) && newData.child('name').isString() && newData.child('name').val().length >= 2 && newData.child('name').val().length <= 60"
      },
      "prices": {
        ".read": "auth != null",
        ".write": "auth != null",
        "$product": {
          "$record": {
            ".validate": "newData.hasChildren(['price','date','store']) && newData.child('price').isNumber() && newData.child('price').val() > 0"
          }
        }
      }
    },
    "keyword_overrides": {
      ".read": "auth != null",
      ".write": "auth.uid === 'LNEC8VNB2QPwIv6WWQ9lqgR4O5v1'"
    },
    "coicop_corrections": {
      ".read": "auth.uid === 'LNEC8VNB2QPwIv6WWQ9lqgR4O5v1'",
      ".write": "auth.uid === 'LNEC8VNB2QPwIv6WWQ9lqgR4O5v1'",
      "$correction": {
        ".write": "auth != null && !data.exists()"
      }
    },
    "admins": { ".read": "auth != null", ".write": false },
    "support": {
      ".read": "auth.uid === 'LNEC8VNB2QPwIv6WWQ9lqgR4O5v1'",
      ".write": "auth != null",
      "$entry": {
        ".validate": "newData.hasChildren(['email','message','date'])"
      }
    }
  }
}
```

### 8.5 Identifikované problémy v aktuální produkci

| Uzel | Problém | Priorita |
|---|---|---|
| `leads` | `.read + .write: auth != null` → kdokoli přihlášený čte cizí emaily potenciálních zájemců o úvěr (GDPR!) | 🔴 Vysoká |
| `affiliate` | Volné read/write – kdokoli vidí všechna affiliate data | 🔴 Vysoká |
| `community` | Volné write – riziko spamu / DoS | 🟡 Střední |
| `catalog` | Kdokoli může mazat / přepisovat cokoli (bez `createdBy` ochrany) | 🟡 Střední |
| `support` | Validace neověřuje formát/délku polí (DoS přes velké zprávy) | 🟢 Nízká |
| Root | Chybí explicitní default deny (`".read": false, ".write": false`) | 🟢 Nízká (Firebase má default deny) |

### 8.6 Co je dobře v aktuální produkci ✅
- `users/$uid/*` – vzorová izolace per-uživatel
- `users/$uid/data` partner sharing – elegantní řešení
- `coicop_corrections` – povolen jen jednorázový zápis (`!data.exists()`)
- `admins` – read-only, write blokován
- `keyword_overrides` – jen admin zapisuje

### 8.7 Doporučený další postup
1. **Krátkodobě:** Zavřít `leads` jen pro admina (write přesměrovat přes Worker s rate-limitingem + captcha)
2. **Krátkodobě:** Přidat root-level default deny jako dokumentaci
3. **Střednědobě:** `catalog` + `community` přidat ownership ochranu (`createdBy: auth.uid`)
4. **Střednědobě:** Validace délky polí v `support`
5. **Dlouhodobě:** Architektonicky přesunout `leads` na server-side flow (Worker → Firebase Admin SDK)

---

## 9. Cache-busting hashe **(Session 4, stav v6.44)**

| Soubor | Hash |
|--------|------|
| `app.js` | `109e73d4` |
| `helpers.js` | `faccb6fa` |
| `ui.js` | `3134d203` |
| `transactions.js` | `8ee648e0` |
| `charts.js` | `95220b96` |
| `stats.js` | `9456a04e` |
| `debts.js` | `ee42b536` |
| `ai.js` | `7acd1c9c` |
| `premium.js` | `bb2ce262` |
| `projects.js` | `db47b1db` |
| `receipts.js` | `79a61e43` |
| `offline-sync.js` | `d98422f4` |
| `settings.js` | `a67afe51` |
| `share.js` | `new638` |
| `sms-import.js` | `new638` |
| `duplicates.js` | `new637` |
| `nakup.js` | `new637` |
| `kalendar.js` | `b77a74f8` |
| `admin.js` | `87433101` |
| `import.js` | `763624ee` |
| `firebase.js` | `889e8119` |

> Hashe se v `index.html` referencují jako `?v=XXXXXXXX` za každým `<script src>`.
> Po jakékoli změně JS se musí přepočítat SHA256 prvních 8 znaků a aktualizovat.

---

## 10. Navigační router (`renderPage`) **(Session 1)**
```
curPage === 'prehled'      → renderDashboard()
curPage === 'transakce'    → renderTxPage()
curPage === 'souhrn'       → renderSouhrn()
curPage === 'predikce'     → renderPredikce()
curPage === 'dluhy'        → renderDebts()
curPage === 'uctenky'      → renderUctenky()
curPage === 'import'       → renderImport()
curPage === 'admin'        → renderAdmin()
... atd.
```

---

## 11. Versioning workflow **(Session 4)**

1. Každá změna → nová verze `+0.01`
2. Číslo se čte z řádku 6 `index.html` (`<title>FinanceFlow vX.XX</title>`)
3. Aktualizovat na **4 místech**:
   - `<title>` v `index.html` (ř. 6)
   - „O aplikaci" sekce v aplikaci
   - Changelog v `admin.js`
   - Cache-busting hashe pro změněné JS soubory
4. Commit **vždy do `dev`** větve, nikdy do `main`
5. Formát commit zprávy: `vX.XX - [popis změny]`

---

## 12. Admin přístupy

- **Admin UID:** `LNEC8VNB2QPwIv6WWQ9lqgR4O5v1`
- **Firebase DB URL:** `https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app`
- **Produkční URL:** ⚠️ viz konflikt Hosting v sekci 1

---

## 13. Plánovaná architektura (TODO)

### Konsolidováno ze všech 4 sessions
- [ ] **(S1)** Service Worker pro plnou offline podporu *(Session 4 částečně vyřešeno přes IndexedDB)*
- [ ] **(S1)** Fio API napojení (automatický import transakcí)
- [ ] **(S1)** Separátní COICOP sekce ve Statistikách (přesun z Účtenek)
- [ ] **(S1)** GoPay platební brána (webhook → Firebase `premium/`)
- [ ] **(S1)** Vícejazyčnost CS/EN/SK (infrastruktura existuje, překlady chybí)
- [ ] **(S2)** Bundling (Vite/esbuild) pro rychlejší načítání místo 22 samostatných souborů
- [ ] **(S2)** Service Worker pro Web Push notifikace
- [ ] **(S2)** Open Banking API integrace (vyžaduje PSD2 licenci)
- [ ] **(S2)** TWA wrapper pro Google Play
- [ ] **(S3)** **Android Notification Listener** (příští velký sprint):
  ```
  Android App (React Native / Kotlin)
      ↓
  NotificationListenerService (systémové oprávnění)
      ↓
  Notifikace od banky (Revolut, George, KB, …)
      ↓
  Parser (portovaný z sms-import.js)
      ↓
  Firebase REST API → /users/{uid}/data/transactions
      ↓
  Webová appka (real-time sync přes onValue)
  ```
- [ ] **(S3)** React/Vue frontend (pokud bude potřeba složitější state management)
- [ ] **(S3)** Firebase Functions pro server-side logiku (ceny, notifikace)
- [ ] **(S3)** Stripe/Paddle pro platební systém *(alternativa k GoPay z S1)*

---

*Konsolidováno: 2026-04-14 | Sessions: 1 → 4 | Autor: Milan Migdal*
