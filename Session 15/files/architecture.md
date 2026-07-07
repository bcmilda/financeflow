# FinanceFlow – Architektura

> **Zdrojový soubor (základ):** `architecture_consolidated_2026-05-14.md` (konsolidace Sessions 1–4, Claude merge)
> **Aplikované patche Session 6:** PATCH 2a, 2b, 2c, 2d, 2e, 2f ze souboru `patch_s6.md` (Session 6, 2026-04-23)
> **Porovnávací soubor (Milanova verze):** `architecture_s6(1).md` (Milan merge Sessions 1–6, 2026-04-23)
> **Aplikované patche Session 7:** `patch-session7-COMBINED(1).md` – Session 7.0 (2026-04-25) + Session 7.1 (2026-04-30)
> **Procedura S7:** Aplikace combined patche na výstup z předchozího kroku. Dočasná ID (S70-xx, S71-xx) přečíslována sekvenčně navazující na S6. Nová data označena `**(Session 7.0)**` / `**(Session 7.1)**`.
> **Datum poslední aktualizace:** 2026-05-15
>
> Konsolidovaný dokument ze **7 sessions (vč. 7.1)**. Nové informace z každé session jsou označeny
> `**(Session N)**`. Doplnění z Milanova merge jsou označena `**(Merge Session 1-6)**`.
> Konflikty mezi sessions jsou explicitně vyznačeny.
> Poslední aktualizace: 2026-05-28 (Session 9 patch).

---

## 1. Stack

| Vrstva | Technologie |
|--------|-------------|
| Frontend | Vanilla JS (ES6+), HTML5, CSS3 – bez frameworku |
| Databáze | Firebase Realtime Database (europe-west1) |
| Auth | Firebase Authentication – Google Sign-In |
| AI | Anthropic Claude Sonnet (přes Cloudflare Worker) |
| Email | **(Session 3 + 4)** Resend.com API (přes Cloudflare Worker) |
| Offline | **(Session 4)** IndexedDB – sync queue pro účtenky; **(Session 6)** rozšířeno o transakce |
| PWA | manifest.json, icon-192.png |
| Hosting | ✅ Firebase Hosting (primary) + GitHub Pages (secondary, větev `dev`) — viz níže |
| Worker | Cloudflare Worker – **(Session 1)** v2 &nbsp;·&nbsp; **(Session 4)** v4 &nbsp;·&nbsp; **(Session 6)** v5 ✅ nasazeno |
| Monitoring | **(Session 6)** Sentry.io – async error tracking |

### ⚠️ Hosting – vyřešeno v Session 6
> - **(Session 1)** Neuvedeno
> - **(Session 2)** Firebase Hosting implikováno (root = `financeflow-a249c/`)
> - **(Session 3)** Firebase Hosting (konzistentní se Session 2)
> - **(Session 4)** GitHub Pages (`bcmilda.github.io/financeflow`, dev branch)
> - **(Session 6)** ✅ **Vyřešeno** – Firebase Hosting jako primary, GitHub Pages (`bcmilda.github.io/financeflow`) jako secondary z větve `dev`
>
> **Stav:** Firebase Hosting = produkce (`https://financeflow-a249c.web.app`), GitHub Pages = secondary z `dev` větve.

---

## 2. Struktura projektu

### ⚠️ Konflikt: Single HTML vs Multi-file
> - **(Session 1)** Single HTML soubor `FinanceFlow_v6.xx.html` (celá aplikace v jednom)
> - **(Session 2 + 3 + 4)** Multi-file – `index.html` + `js/*.js` moduly
>
> Session 1 je zjevně historický stav před refactorem. Aktuální architektura je multi-file.

### Aktuální struktura (Session 2 + 3 + 4 + 6)
```
financeflow-a249c/                ← deploy root
├── index.html                    ← shell, script tagy s cache-busting hashy, Sentry loader před </body>
├── manifest.json                 ← PWA manifest
├── icon-192.png                  ← PWA ikona
├── lepsi-uver.html               ← (Session 1) standalone stránka pro srovnání úvěrů
├── financeflow-worker-v2.js      ← (Session 1) legacy Worker soubor
├── css/
│   └── styles.css                ← ~467 řádků (Session 2) / ~1200 řádků (Session 3)
├── js/
│   ├── app.js                    ← bootstrap, routing, Firebase init, stav S, offline větev v save() (S6)
│   ├── helpers.js                ← utility, showPage(), predikce, formátování
│   ├── ui.js                     ← (Session 3+) render router, dashboard, souhrn
│   ├── transactions.js           ← CRUD transakcí, editor, predikce tabulka
│   ├── charts.js                 ← canvas 2D grafy (area, bars, predikce)
│   ├── stats.js                  ← statistiky, roční přehledy
│   ├── debts.js                  ← půjčky + saveTx() (kritická ukládací fce)
│   ├── ai.js                     ← AI Rádce, chat s Claude
│   ├── premium.js                ← premium logika, kontaktní formulář opravený (S6), Net Worth
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
│   ├── budouci.js                ← (Session 7.1) Budoucí platby – timeline agregace
│   ├── assets.js                 ← (Session 7.1) Finanční aktiva, computeAssetsNetWorth()
│   ├── advisor.js                ← (Session 7.1) Report poradce, #advisorContainer
│   └── firebase.js               ← Firebase SDK, onAuthStateChanged (type=module) — VŽDY POSLEDNÍ
├── cloudflare-worker/            ← (Session 4) Worker v repu
│   └── worker.js                 ← (Session 6) Worker v5 – nasazeno ✅
├── doc/                          ← (Session 6) dokumentace projektu
│   ├── architecture.md
│   ├── bugs.md
│   ├── context.md
│   ├── decisions.md
│   ├── explanations.md
│   ├── features.md
│   ├── GLOSSARY.md
│   ├── SECURITY.md
│   ├── todo.md
│   └── VERSIONING.md             ← NOVÝ (Session 6) – pravidla verzování
├── docs/                         ← (Session 6) pracovní složka (volný přístup Claude)
│   ├── VERSIONING.md             ← připraveno ke schválení a přesunu do doc/
│   ├── patch_*.md                ← patche dokumentace
│   └── financeflow_v*.html       ← verzované zálohy index.html
└── data/
    └── categories.json           ← (Session 2) výchozí kategorie
```

### Počet JS souborů: **25** (potvrzený stav po Session 7.1)
Progresivní růst napříč sessions:
- **(Session 2)** 14 souborů – základ
- **(Session 3)** +6 souborů (`settings`, `share`, `sms-import`, `kalendar`, `nakup`, `duplicates`) = 20
- **(Session 3)** +`ui.js` jako samostatný = 21
- **(Session 4)** +`offline-sync.js` = 22
- **(Session 7.1)** +`budouci.js`, `assets.js`, `advisor.js` = **25 souborů (aktuální)**

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
<!-- Session 3+ přidává: -->
<script src="js/duplicates.js"></script>
<script src="js/settings.js"></script>
<script src="js/share.js"></script>
<script src="js/sms-import.js"></script>
<script src="js/kalendar.js"></script>
<script src="js/nakup.js"></script>
<!-- Session 4 přidává: -->
<script src="js/offline-sync.js"></script>
<!-- Session 7.1 přidává – ZA nakup.js, PŘED admin.js: -->
<script src="js/budouci.js"></script>
<script src="js/assets.js"></script>
<script src="js/advisor.js"></script>
<script src="js/admin.js"></script>
<script src="js/import.js"></script>
<script type="module" src="js/firebase.js"></script>  <!-- VŽDY POSLEDNÍ -->
<!-- Session 6: Sentry async loader – PŘED </body>, NIKDY v <head> -->
```

**Proč `firebase.js` poslední:** Firebase používá `type="module"` (asynchronní ES6 modul).
Ostatní soubory mají stub funkce (`signInGoogle`, `_db` atd.), které jsou přepsány až po
načtení Firebase. **ChatGPT doporučoval firebase první — v našem případě to NEFUNGUJE.**

---

## 3. Soubory a jejich odpovědnost

### Session 2 baseline + Session 3 rozšíření + Session 6 aktualizace

| Soubor | Odpovědnost | Zdroj |
|--------|-------------|-------|
| `index.html` | Shell aplikace, script tagy s cache-busting hashy, verze v title (ř. 6), Sentry loader | S2, S6 |
| `app.js` | Konstanty, stav `S`, Firebase wrappery, seed data, bootstrap, routing, offline větev v `save()`, `Sentry.setUser()` | S2, S6 |
| `helpers.js` | `showPage()`, `renderPage()`, predikce, bank výpočty, formátování | S2 |
| `ui.js` | `renderPage()`, `renderDashboard()`, navigace | S3 |
| `transactions.js` | Transakce render, bank, predikce stránky, editor | S2 |
| `charts.js` | Všechny grafy (canvas 2D API) – Obecné/Měsíční/Roční, box plot | S2 |
| `stats.js` | Statistiky, kategorie, rodina, sdílení | S2 |
| `debts.js` | Půjčky, simulace, widgety (~1513 ř.), **`saveTx()`** | S2 |
| `ai.js` | AI Rádce, chat s Claudem | S2 |
| `premium.js` | Premium logika, kontaktní formulář (**opraveno S6** – Auth header + payload struktura), peněženky, Net Worth | S2, S6 |
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
| `financeflow-worker-v4.js` | Cloudflare Worker – proxy pro Claude API + Resend (legacy, nahrazen v5) | S4 |
| `cloudflare-worker/worker.js` | **(Session 6)** Worker v5 – nasazeno ✅ | S6 |
| `budouci.js` | **(Session 7.1)** Budoucí platby – agreguje šablony, narozeniny, cíle, dluhy do timeline | S7.1 |
| `assets.js` | **(Session 7.1)** Finanční aktiva – CRUD nemovitostí/investic/vozidel/spoření. `computeAssetsNetWorth()` | S7.1 |
| `advisor.js` | **(Session 7.1)** Report pro finančního poradce – karty, grafy, AI. Píše do `#advisorContainer` | S7.1 |

### Legacy soubory **(Session 1)**

| Soubor | Popis |
|--------|-------|
| `FinanceFlow_v6.27.html` | Celá aplikace – HTML + CSS + JS v jednom souboru (před refactorem) |
| `financeflow-worker-v2.js` | Cloudflare Worker – proxy pro Anthropic API (legacy) |
| `manifest.json` | PWA konfigurace |

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

**(Session 6 update):** `save()` rozšířena o offline větev:
```javascript
if (!navigator.onLine && window.OfflineSync) {
  const lastTx = S.transactions?.[S.transactions.length - 1];
  if (lastTx) {
    window.OfflineSync.saveTxOffline(lastTx).then(() => {
      showToast('⏳ Offline – transakce bude uložena po připojení k internetu');
    });
  }
  return;
}
```

#### `helpers.js` – Utility + Predikce **(Session 3)**
- `getTx(m, y, D)` – transakce pro daný měsíc/rok
- `incSum(txs)` / `expSum(txs)` – suma příjmů/výdajů (**vždy** `t.amount || t.amt || 0`)
- `fmt(n)` – formátování čísla (1234567 → "1 234 567")
- `showPage(name)` – navigace + `renderPage()` s `rAF` delay pro grafy
- `predictCat(catId, sub, m, y, D)` – predikce výdajů (viz `formulas.md`)
- `computePersonalSeason(catId, sub, D)` – personalizované sezónní koeficienty
- `detectTrend(catId, sub, D)` – trend (min 4 měsíce, outlier removal)
- `computeYearForecast(catId, sub, year, D)` – „Předpoklad YTD" *(Session 6: opraveno – funkce chyběla)*

#### `debts.js` – `saveTx()` (kritická funkce) **(Session 3)**
```javascript
// Ukládá transakci s OBĚMA poli pro zpětnou kompatibilitu:
const txObj = { amount: amt, amt, type, name, catId, /* ... */ };
```

#### `offline-sync.js` – Offline podpora **(Session 4)**
- IndexedDB wrapper (`STORE_RECEIPTS`)
- `saveReceiptOffline()` – ukládání účtenek offline
- `saveTxOffline()` – **(Session 6)** ukládání transakcí offline, voláno z `save()` v `app.js`
- `runSync()` – synchronizace po návratu online
- `showOfflineBadge()` – UI indikátor (☁️ badge s počtem čekajících)
- Komprese fotek (JPEG 82%, max 1200×1600px)

#### `firebase.js` – Autentizace **(Session 3)**
- `onAuthStateChanged` → `window.onUserSignedIn(user)`
- Načítá data z `/users/{uid}/data`
- Real-time listener (`onValue`) pro sync

#### `budouci.js` – Budoucí platby **(Session 7.1)**
- Agreguje zdroje: šablony, narozeniny, přání/cíle (`isGoal`), dluhy
- Horizont: 30 / 60 / 90 / 180 / 365 dní (konfigurovatelný)
- Urgency styly: Today / Tomorrow / <7 days
- Nová stránka `page-budouci`, nav item 🗓️

#### `assets.js` – Finanční aktiva **(Session 7.1)**
- CRUD aktiv – 5 typů: `property` | `investment` | `vehicle` | `savings` | `custom`
- `computeAssetsNetWorth(D)` → `{totalAssets, totalWallets, netWorth, byType}`
- ⚠️ **NIKDY nepřejmenovávat** – kolize s `computeNetWorth()` z `premium.js` crashovala aplikaci
- Firebase: `S.assets[]`, uloženo v `users/{uid}/data/assets`

#### `advisor.js` – Report poradce **(Session 7.1)**
- Záložka 📋 Poradce v měsíčním reportu
- Karty: Finanční zdraví / Cashflow / Zadlužení (DSTI+DTI) / Rezerva / Net Worth
- Cashflow graf 12M (canvas), Struktura výdajů (horizontal bar canvas)
- AI doporučení: Worker typ `advisor_report`, max 4 prioritizovaná
- Print CSS: `window.print()` tlačítko
- ⚠️ `renderAdvisor()` je **async** – volat vždy přes `setTimeout(..., 30)` po `el.innerHTML`
- Píše do `#advisorContainer` (uvnitř `reportContent`) – **NE do `#reportContent` přímo**

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
    stableMonthly,           // ⚠️ DEPRECATED od Session 2 → nahrazeno polem `stable` **(Merge Session 1-6)**
    oecdLimit,               // ⚠️ DEPRECATED od Session 2 → nahrazeno `healthPct`/`healthAmt` **(Merge Session 1-6)**
    stable,                  // **(Session 2)** fixní měsíční výdaj – nahrazuje stableMonthly
    healthPct, healthAmt,    // **(Session 2)** zdravotní limity kategorie
    isSaving,                // **(Session 2)** označuje spořicí kategorii
  }],
  wallets: [{
    id, name, type, balance, currency,
    color,                   // barva peněženky (Session 2)
  }],
  debts: [{
    id, name, type,          // 'loan' | 'credit' | 'mortgage'
    creditor,                // věřitel (Session 2)
    total, remaining,
    interest, payment, freq, // freq: 'monthly' | 'weekly' | 'biweekly'
    startDate,
    priority,                // priorita splácení (Session 2)
    installments: [{ from, amt }],  // splátkový kalendář (Session 2)
    schedule: [],            // (Session 3) generováno
  }],
  birthdays: [{
    id, name, date, month, day, gift,
    note,                    // poznámka k narozeninám (Session 2)
  }],
  wishes: [{
    id, name, price, url, done, bdayId,
    desc, priority,          // popis a priorita přání (Session 2)
  }],
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

/users/{uid}/
  categoryMappings/{key}  ← (Session 9) AI mapování kategorií (ADR-045)
    catId: string
    subcat: string
    timestamp: number
  itemStats/{key}        ← (Session 9) Statistiky naskenovaných položek (ADR-046)
    count: number
    avgPrice: number
    totalSpent: number
    history: [{date, price, pricePerUnit, weight}]  // max 24 záznamů

/admin_coicop_overrides/{catName}/  ← (Session 9) Admin přiřazení COICOP skupin
  coicop: number
  updatedAt: timestamp

/sharing/{uid}/              ← (Session 2) partnerská data

/users/{uid}/
  goal_deposits/{id}         ← (Session 7.1) vklady do cílů (Plány a cíle)
    goalId: string
    amount: number
    note: string
    date: string             ← 'YYYY-MM-DD'
```

### 4.4 `S` objekt – nová pole **(Session 7.1)**
```javascript
S.assets = [{
  id, name, type,            // type: 'property'|'investment'|'vehicle'|'savings'|'custom'
  value,                     // aktuální hodnota (Kč)
  note, icon, updatedAt
}]

---

## 5. Tok dat

### Základní workflow (ukládání transakce) **(Session 3 + Session 6)**
```
Uživatel → UI event (onclick)
    ↓
saveTx() / save() v debts.js / app.js
    ↓
S.transactions.push(txObj)            ← lokální stav
    ↓
save() → detekuje navigator.onLine?
    ├── OFFLINE → OfflineSync.saveTxOffline() → IndexedDB  ← (Session 6)
    │             showToast('⏳ Offline...')
    └── ONLINE  → setTimeout(1200ms) → saveToFirebase()
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
  → Sentry.setUser({ id, email })  ← (Session 6, setTimeout 3000ms)
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

### Původní tok (Session 1)
```
Uživatel → Google Auth → Firebase UID
   ↓
getData() → S (z Firebase nebo localStorage)
   ↓
renderPage() → renderXxx() → buildXxx() → el.innerHTML
   ↓
Uložení: save() → Firebase users/{uid}/data nebo localStorage
   ↓
AI požadavky: fetch(WORKER_URL) → Cloudflare Worker → Anthropic API
```

---

## 6. Offline architektura **(Session 4 + Session 6)**

```
Uživatel (offline)
       │
       ▼
addReceiptPhoto() / analyzeMultiReceipt() / save() [transakce S6]
       │
  navigator.onLine ?
       │
   NO  ├─────────────────────────────────────────────────┐
       │                                                 │
       ▼                                                 │
OfflineSync.saveReceiptOffline(file)                     │
     nebo                                                │
OfflineSync.saveTxOffline(tx)  ← (Session 6)            │
       │                                                 │
compressPhoto() → JPEG 82%, max 1200×1600px              │
       │                                                 │
dbPut(STORE_RECEIPTS / STORE_TX, { ..., status: 'pending' })
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
dbGetAll(STORE_*, 'status', 'pending')                   │
       │                                                 │
syncOneReceipt() / syncOneTx()  ← Cloudflare Worker / Firebase
       │                                                 │
onReceiptAnalyzed(result) → UI                           │
       │                                                 │
dbDelete(id) → badge zmizí                              │
```

**IndexedDB store:** `STORE_RECEIPTS` + `STORE_TX` (S6) se statusy `pending` / `syncing` / `done`.
Sync se spouští na event `online` s 1500 ms debounce.

> ⚠️ **(Session 6):** Offline transakce implementovány, **čeká na ověření uživatelem**.

---

## 7. Cloudflare Worker

### Verze Workeru a URL — vývoj napříč sessions
> - **(Session 1)** `financeflow-worker-v2.js`, URL neuvedena explicitně
> - **(Session 2)** `misty-limit-0523`, URL `https://misty-limit-0523.bc-milda.workers.dev`
> - **(Session 3)** `misty-limit-0523` (konzistentní)
> - **(Session 4)** `misty-limit-0523` jako název, URL `https://financeflow.bcmilda.workers.dev` (custom route?)
> - **(Session 6)** ✅ Worker v5 nasazen – CORS rozšířen o `bcmilda.github.io`, `RESEND_API_KEY` přesunut do Cloudflare Secrets, lepší Resend error logging

### Konfigurace **(Session 6 – aktuální)**
- **Název:** `misty-limit-0523`
- **Soubor:** `cloudflare-worker/worker.js` (v5, nasazeno ✅)
- **Observability:** Workers Logs = Enabled, Workers Traces = Disabled
- **Bindings:** 0 (komunikuje přímo přes HTTP s Firebase a Anthropic)
- **Auth:** Firebase ID token v `Authorization` headeru
- **Allowed origins (Session 6):** github.io + workers.dev + web.app + `bcmilda.github.io`
- **max_tokens:** 8192 (maximum pro Claude API)

### ~~🔴 Security issue: Hardcoded Resend API klíč~~ ✅ VYŘEŠENO **(Session 4 → Session 6)** **(Merge Session 1-6)**

**Session 4** klíč byl hardcoded v kódu a unikl na GitHub (GitGuardian alert).
**Session 6** klíč rotován a přesunut do Cloudflare Secrets jako `RESEND_API_KEY`.

```
API klíč:  uložen v Cloudflare Secrets jako RESEND_API_KEY (Session 6) ✅
Status:    funkční – emaily dorazí na bc.milda@gmail.com (Monthly: 2/3000)
```

**(Session 6 update):** Resend funguje přes `onboarding@resend.dev` → `bc.milda@gmail.com`.
Doménová verifikace není potřeba díky opravě `premium.js` (auth header + payload struktura).
EmailJS jako alternativa se neimplementuje — Resend stačí.

#### ✅ Správné zacházení s API klíči (pravidla pro budoucnost)

**NIKDY:**
- ❌ Hardcodovat klíč přímo do JS/Worker kódu
- ❌ Commitovat klíč do GitHubu (ani do private repa)
- ❌ Ukládat klíč do `.md` dokumentace
- ❌ Posílat klíč v chatu, e-mailu, screenshotu

**VŽDY:**
- ✅ Ukládat do **Cloudflare Worker Secrets** (Dashboard → Worker → Settings → Variables → Type: Secret)
- ✅ V kódu Workeru číst přes `env.RESEND_API_KEY` (nikdy ne literál)
- ✅ Lokálně držet v `.env` souboru, který je v `.gitignore`
- ✅ Při jakémkoli podezření na únik – **okamžitá rotace**

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
| `wish_url` | Extrakce produktu z URL (pro hlídač přání) | 500 → 8192 **(Merge Session 1-6)** | S1 → S2 |
| `price_alert` | **(Session 3)** Email alert pro hlídač cen | 512 **(Merge Session 1-6)** | S3 |
| `contact_form` | **(Session 3)** Email notifikace přes Resend API | 512 **(Merge Session 1-6)** | S3 |
| `bank_statement_text` | **(Session 7.0)** Text extraction z PDF výpisů. `payload: {text, batchIndex, totalBatches}`, dávky 15 stránek | **16 384** **(S8 FIX-054)** | S7.0 |
| `advisor_report` | **(Session 7.1)** AI finanční poradce ČR. Výstup: `JSON {recommendations:[{title,detail,saving}]}`, max 4 | 1 024 **(S8)** | S7.1 |
| `chat` | AI Rádce – konverzační chat | 2 048 **(S8 FIX-060)** | S1 |

> ⚠️ **Konflikt S3 max_tokens:** `price_alert` a `contact_form` — žádná session neuvádí explicitní hodnotu. Nutno ověřit přímo v kódu Workeru (`cloudflare-worker/worker.js`). Tyto endpointy posílají jen email notifikace → pravděpodobně 512 nebo méně postačuje.

### Worker payload struktura **(Session 6)**
Worker čeká konzistentní strukturu `{type, payload:{...}}` pro všechny endpointy.
Chyba v `premium.js` (`sendContactForm`) způsobovala 401 kvůli chybějícímu `Authorization: Bearer <token>` headeru — opraveno v S6.

---

## 8. Firebase Security Rules

> 🟡 **ČÁSTEČNĚ VYŘEŠENO (Session 6):** Admin read přístup nasazen.
> Zbývající problémy (`leads`, `affiliate`, `community`) stále otevřené.
>
> **(Session 7.0 update):** Přidány uzly `referrals` a `referral_clicks` – opravena chyba `initReferral Permission denied`. Viz FIX-047.
>
> **Co zbývá dořešit:**
> 1. Vyřešit GDPR-citlivé uzly (`leads` = potenciální zájemci o úvěr → osobní údaje)
> 2. Přepracovat `affiliate`, `community`, `catalog` (volné write práva = riziko spamu)
> 3. Sjednotit pojmenování uzlů (`referrals` vs `affiliate`, `support` vs `leads`)

### 8.1 Verze Session 1 (nejvolnější, historická)
```json
{
  "rules": {
    "users": {
      ".read": "auth != null",
      "$uid": { ".write": "auth.uid === $uid" }
    },
    "leads":     { ".read": "auth != null", ".write": true },
    "affiliate": { ".read": "auth != null", ".write": true },
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
**Známá rizika S1:** `leads` a `affiliate` mají `.write: true` (úplně bez autentizace).

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
**(Session 4)** **Známá chyba:** `loadLowConf()` a `loadMappingStats()` vracely 403.

### 8.4 Aktuální produkční verze (zjištěná z Firebase Console)
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
| `leads` | `.read + .write: auth != null` → kdokoli přihlášený čte cizí emaily (GDPR!) | 🔴 Vysoká |
| `affiliate` | Volné read/write – kdokoli vidí všechna affiliate data | 🔴 Vysoká |
| `community` | Volné write – riziko spamu / DoS | 🟡 Střední |
| `catalog` | Kdokoli může mazat / přepisovat cokoli (bez `createdBy` ochrany) | 🟡 Střední |
| `support` | Validace neověřuje formát/délku polí (DoS přes velké zprávy) | 🟢 Nízká |
| Root | Chybí explicitní default deny | 🟢 Nízká (Firebase má default deny) |

### 8.6 Co je dobře v aktuální produkci ✅
- `users/$uid/*` – vzorová izolace per-uživatel
- `users/$uid/data` partner sharing – elegantní řešení
- `coicop_corrections` – povolen jen jednorázový zápis (`!data.exists()`)
- `admins` – read-only, write blokován
- `keyword_overrides` – jen admin zapisuje

### 8.7 Doporučený další postup
1. **Krátkodobě:** Zavřít `leads` jen pro admina (write přesměrovat přes Worker s rate-limitingem)
2. **Krátkodobě:** Přidat root-level default deny jako dokumentaci
3. **Střednědobě:** `catalog` + `community` přidat ownership ochranu (`createdBy: auth.uid`)
4. **Střednědobě:** Validace délky polí v `support`
5. **Dlouhodobě:** Architektonicky přesunout `leads` na server-side flow

### 8.8 Aktuálně nasazené Rules – Session 6 ✅
**(Session 6 update):** Admin read přístup nasazen 2026-04-23. Admin panel funkční, chyba 403 se nevrací.
```json
{
  "rules": {
    "users": {
      ".read": "auth.uid === 'LNEC8VNB2QPwIv6WWQ9lqgR4O5v1'",
      "$uid": {
        ".read": "auth.uid === $uid",
        ".write": "auth.uid === $uid"
      }
    }
  }
}
```
> **Poznámka:** Toto je **doplněk** k pravidlům ze sekce 8.4 (produkční verze), ne náhrada. Celá sada Rules zůstává dle 8.4. **(Merge Session 1-6)**
> **🔗 Cross-reference:** `decisions.md` ADR-018, `bugs.md` FIX-039 **(Merge Session 1-6)**

---

## 9. Cache-busting hashe **(Session 6, stav v6.48)**

| Soubor | Hash S4 (v6.44) | Hash S6 (v6.48) | Hash S8 (v6.65) |
|--------|-----------------|-----------------|
| `app.js` | `109e73d4` | `ed1bcf97` ← Session 6 | `dca4fc41` ← Session 8 |
| `helpers.js` | `faccb6fa` | `e50f43f4` ← Session 6 | `d326aa4f` ← Session 8 |
| `ui.js` | `3134d203` | `3134d203` | `28ff576f` ← Session 8 |
| `transactions.js` | `8ee648e0` | `8ee648e0` |
| `charts.js` | `95220b96` | `95220b96` |
| `stats.js` | `9456a04e` | `9456a04e` |
| `debts.js` | `ee42b536` | `ee42b536` |
| `ai.js` | `7acd1c9c` | `7acd1c9c` |
| `premium.js` | `bb2ce262` | *(přepočítat)* | `00f68740` ← Session 8 |
| `projects.js` | `db47b1db` | `db47b1db` | `15c40231` ← Session 8 |
| `receipts.js` | `79a61e43` | `79a61e43` |
| `offline-sync.js` | `d98422f4` | `d98422f4` |
| `settings.js` | `a67afe51` | `b876091d` ← Session 6 |
| `share.js` | `new638` | `new638` |
| `sms-import.js` | `new638` | `new638` |
| `duplicates.js` | `new637` | `new637` |
| `nakup.js` | `new637` | `new637` |
| `kalendar.js` | `b77a74f8` | `b77a74f8` |
| `admin.js` | `87433101` | `0cf87ca6` ← Session 6 | `7520811f` ← Session 8 |
| `import.js` | `763624ee` | `763624ee` | `10afdcb1` ← Session 8 |
| `firebase.js` | `889e8119` | `889e8119` | `220ea7e9` ← Session 8 |

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
   - „O aplikaci" sekce v aplikaci *(hardcoded verze – VŽDY aktualizovat!)*
   - Changelog v `admin.js`
   - Cache-busting hashe pro změněné JS soubory
4. Commit **vždy do `dev`** větve, nikdy do `main`
5. Formát commit zprávy: `vX.XX - [popis změny]`

---

## 12. Admin přístupy

- **Admin UID:** `LNEC8VNB2QPwIv6WWQ9lqgR4O5v1`
- **Firebase DB URL:** `https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app`
- **Produkční URL:** `https://financeflow-a249c.web.app` (Firebase Hosting primary)
- **Secondary URL:** `https://bcmilda.github.io/financeflow` (GitHub Pages, větev `dev`) ← Session 6

---

## 13. Nové soubory a dokumenty **(Session 6)**

| Soubor | Typ | Popis |
|---|---|---|
| `docs/VERSIONING.md` | Nový doc | Pravidla verzování aplikace a dokumentace — viz `decisions.md` ADR-020 **(Merge Session 1-6)** |
| `docs/patch_*.md` | Pracovní | Patche dokumentace ke schválení |
| `docs/financeflow_v*.html` | Archiv | Verzovaná kopie index.html |
| `cloudflare-worker/worker.js` | Aktualizace | Worker v5 – Secrets, CORS pro GH Pages, error logging — viz `decisions.md` ADR-017 **(Merge Session 1-6)** |
| `doc/VERSIONING.md` | Plánováno | Po schválení přesun z `docs/` → `doc/` **(Merge Session 1-6)** |

---

## 14. Sentry integrace **(Session 6)**

```javascript
// Umístění: před </body> v index.html – NIKDY v <head>!
// Důvod: Loader v <head> způsobil pád mobilní appky a zpomalení webu (první pokus S6)

// Loader URL: https://js-de.sentry-cdn.com/3ce6efc6333af4293ac9b67d7b710f4b.min.js
// DSN: https://3ce6efc6333af4293ac9b67d7b710f4b@o4511266124988416.ingest.de.sentry.io/4511266132787280
// Loader key (veřejný): 3ce6efc6333af4293ac9b67d7b710f4b

// Nastavení:
// tracesSampleRate: 0.1  (10% vzorkování, ne 100%)
// integrations: []        – jen error tracking
// Session Replay: 0%     – vypnuto

// setUser: voláno v app.js po přihlášení (setTimeout 3000ms)
// Trojitý try/catch: pokud CDN selže, aplikace pokračuje normálně
```

> **Poznámka:** Warning „Sentry CDN unavailable" v omezených prostředích (Claude okno,
> firemní sítě s firewallem) je **normální chování** – aplikace funguje.
> **Status:** ✅ Nasazeno v6.48 | **🔗 Cross-reference:** `decisions.md` ADR-016 **(Merge Session 1-6)**

---

## 15. Plánovaná architektura (TODO)

### Konsolidováno ze všech sessions
- [ ] **(S1)** Service Worker pro plnou offline podporu *(Session 4+6 částečně vyřešeno přes IndexedDB)*
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
- [ ] **(S6)** Dělení PDF na části – OPEN-003 (Cloudflare Worker size limit)
- [ ] **(S6)** Globální error handler / crash screen (Sentry pokrývá logging, vlastní UI chybí)
- [ ] **(S6)** Validace JSON odpovědí z AI – TODO-008
- [ ] **(S7.0)** Chord diagram – propojení kategorií (Statistiky nebo Report poradce) – TODO-054 · 🔗 ADR-022
- [ ] **(S7.0)** Treemap v záložce 12M reportu – TODO-055 · základ `bTreemap()` hotový v ui.js
- [ ] **(S7.1)** Měsíční report – přepočet dat dle periody nefunguje – TODO-067 · 🔗 OPEN-028
- [ ] **(S7.1)** Bubble chart – bubliny pod lištu – TODO-068 · 🔗 OPEN-026
- [ ] **(S7.1)** Sdílené tagy v Gradient variantě – TODO-069 · 🔗 OPEN-027
- [ ] **(S7.1)** Tooltip při hover na bublinu – TODO-070 · prototyp v `ff-grafy-final.html`
- [ ] **(S7.1)** Progres schema fin. zdraví v reportu – TODO-071
- [ ] **(S7.1)** Plány a cíle – záložka se nezobrazuje – TODO-072 · 🔗 OPEN-029

---

## 16. Bubble chart systém **(Session 7.0 / 7.1)**

Nahrazuje `donutCanvas` + `donutLegend` → element `#bubbleChartWrap` v dashboardu.

### Stavy
| Proměnná | Popis |
|---|---|
| `_bv` | Aktivní záložka: `A` / `B` / `C` / `D` |
| `_bl1` | Drill-down L2: `catId` |
| `_bl2` | Drill-down L3: `subName` |
| `_bl2prev` | Předchozí L2 pro navigaci zpět |

### Funkce v `ui.js`
| Funkce | Popis |
|---|---|
| `renderBubbleChart(D)` | Main render – sestaví tabs + body |
| `bubbleTab(v)` | Přepnutí záložky, reset drill stavu |
| `bubbleDrillL2(id)` | Drill do kategorie (L2) |
| `bubbleDrillL3(sub, prev)` | Drill do sdílené podkategorie (L3) |
| `bubbleBack(l)` | Navigace zpět na L1/L2 |
| `bCluster()` | Záložka A – velké kategorie + satelity |
| `bDrillCats()` | Záložka B L1 – přehled kategorií |
| `bDrillSub()` | Záložka B L2 – podkategorie kolem rodiče |
| `bDrillTag()` | Záložka B L3 – sdílený tag |
| `bGradient()` | Záložka C – gradient bubliny + osa pro sdílené |
| `bTreemap()` | Záložka D – treemap layout (HTML grid) |
| `bRgba(hex, a)` | Helper rgba konverze |
| `bEsc(s)` | Helper escape apostrofů pro onclick |
| `bTip(el, html)` | Globální SVG tooltip div |
| `bPos(n, cx, cy, r)` | Helper rozmístění bublin do kruhu **(Session 7.1)** |

### Klíčové konstanty
- **`SHARED_NAMES`** – `Set` jmen podkategorií vyskytujících se ve 2+ kategoriích (základ pro gradient okraj + drill L3)
- **Sdílené subkategorie:** gradient okraj + 🔗 ikona + drill-down na všechny rodiče

### Otevřené bugy
- ⚠️ **OPEN-026** – bubliny zasahují pod přepínací lištu (`bCluster` – POS array y hodnoty, viewBox H) → viz TODO-068
- ⚠️ **OPEN-027** – Gradient varianta bez sdílených bublin při reálných datech (`SHARED_NAMES` prázdná) → viz TODO-069

🔗 Souvisí s: TODO-053, TODO-060, TODO-068, TODO-069, TODO-070

---

## 17. PDF import systém **(Session 7.0)**

### Přehled
Nahrazuje původní base64 přenos celého PDF → lokální text extraction přes `pdf.js 3.11.174`.

**Důvod změny:** Base64 PDF → `stop_reason: max_tokens` při >200 transakcích. Text je řádově menší.

⚠️ **Verze pdf.js:** Musí být `3.11.174` (UMD build z cdnjs). Verze 4.x je pouze ESM – nefunguje v klasickém `<script>` tagu.

### Funkce v `import.js`
| Funkce | Popis |
|---|---|
| `loadPdfJs()` | Lazy load pdf.js 3.11.174 přes `<script>` tag |
| `extractPdfPages(buf)` | Extrahuje text z každé stránky ArrayBuffer |
| `chunkArray(arr, size)` | Rozdělí pole stránek na dávky (15 stránek/dávka) |
| `updatePdfStatus(msg)` | Aktualizuje status element v UI |
| `handlePdfFile(file)` | Orchestrátor: extract → chunk → fetch Worker → merge výsledků |

### Worker typ `bank_statement_text`
```
payload: { text, batchIndex, totalBatches }
Vrací:   { bank, account, transactions[] }

První dávka (batchIndex=0): extrahuje bank + account + transakce
Další dávky:                 jen transakce (výsledky se slučují)
```

### JSON parsing
Regex na backtick fence byl lazy → nahrazen `indexOf('{')` + `lastIndexOf('}')`.

### Omezení
- ⚠️ Skenovaná PDF bez textové vrstvy nejsou podporována (OCR není implementováno)
- ⚠️ **OPEN-025** – Import preview crash při 0 transakcích (všechny jsou duplicity po filtraci)

🔗 Souvisí s: FIX-046 (byl OPEN-003), ADR-021

---

---

## 18. PDF Import – KB Multiměnový účet **(Session 8)**

Komerční banka vytváří **3 záznamy** pro každou EUR platbu:

| # | Typ | Příklad | `isBalancing` |
|---|---|---|---|
| 1 | Původní EUR výdaj | `CLAUDE.AI SUBSCRIPTION -21,78 EUR` | `false` – počítá se |
| 2 | Vyrovnávací příjem EUR | `MILAN MIGDAL +20,78 EUR` | `true` – vyloučen |
| 3 | Vyrovnávací výdaj CZK | `MILAN MIGDAL -525,63 Kč` | `true` – vyloučen |

`isBalancing: true` transakce jsou uloženy do DB ale vyloučeny z `incSum()`/`expSum()` v `helpers.js` (FIX-073).
`executionDate` (datum provedení) použit jako primární datum, ne datum zaúčtování (FIX-069).

**🔗 Cross-reference:** FIX-069, FIX-073, `formulas.md` sekce isBalancing

---

## 19. Import Editor – architektura **(Session 8)**

- `modalImportEditor` div musí existovat v `index.html` (přidán v v6.60, FIX-068).
- **Volání pořadí:** `modal.open()` → `await requestAnimationFrame` → `renderImportEditor()` (FIX-068b)
- **4 barevné úrovně duplikátů:**

| Skóre | Barva | Označení |
|---|---|---|
| < 40 | 🟢 Zelená | Nová transakce |
| 40–59 | 🟡 Žlutá | Možný duplikát |
| 60–79 | 🟠 Oranžová | Pravděpodobný duplikát |
| ≥ 80 | 🔴 Červená | Téměř jistý duplikát |

- `calcDupScore()` přepsán dle Milan spec (FIX-070, FIX-074).
- **🔗 Cross-reference:** FIX-068, FIX-070, FIX-074, `bugs.md` OPEN-003 (uzavřeno)


## Session 10 – nové funkce a architektura (v7.06–v7.31)

### projects.js (Finanční radar + obraz)
- `renderRadar()` – hlavní render radaru; vázáno na `S.curMonth`/`S.curYear` (ne `today`) → reaguje na přepnutí měsíce.
- Predikční blok: `eomLeft` (zůstatek konce měsíce), `freeToSpend` (volné peníze), `expectedIncMonth`, 3měsíční predikce (`futureMonths`), kvartální projekce.
- `renderRadarDailyChart()` / `drawRadarDaily()` – denní graf: kumulativní výdaje (bílá), příjem (zelená, reálný měsíční příjem), ideální tempo (žlutá `idealPace`), predikce zbytku (oranžová, jen aktuální měsíc), denní sloupce (modré, ve stejném měřítku jako osa). Robustní šířka přes requestAnimationFrame + fallback. Interaktivní hover tooltip se snap na den.
- `renderPaydayWeeksTable()` – trend výdajů po týdnech od výplaty (Kč/den) + tabulka.
- Nadcházející platby: 3 sloupce = 3 konkrétní měsíce (od `S.curMonth`), suma per měsíc, bez skrytých plateb. Horizont `bud90` počítán dynamicky k pokrytí 3 měsíců.
- Finanční obraz: `computeFFR()` (Financial Freedom Ratio), `computeLifestyleInflation()`, Income Diversification (inverzní HHI), Wealth Momentum.
- `getActualRange(catId, sub, period, D)` – agregace výdajů přes celé období dle periody (7D/1M..12M), ne jen aktuální měsíc (report).

### transactions.js (Predikce)
- `renderPredTable()` / `renderPredLineChartSimple()` – tabulka YTD vs předpoklad + 3 kumulativní křivky.
- `switchPredGraph(tab)` – záložky Kumulativní / Sezonalita / Tempo (pace).
- `renderSeasChart()` / `drawSeasLines()` – sezonalita reál (modrá) vs model (červená).
- `renderPaceChart()` / `drawPaceChart()` – Spending Pace: aktuální kumul vs historický průměr (6 měs) ke stejnému dni, verdikt rychleji/pomaleji.
- `togglePredEmptySubs()` – skrytí podkategorií bez transakce v roce.

### helpers.js
- `COICOP_GROUPS_DEF` (13 oddílů CZ-COICOP 2024 + groups[], guard `if undefined`) – kopie i v receipts.js, aktualizovat společně.
- `calcOECD(dospělí, děti0-13, děti14+)` – OECD ekvivalent velikosti domácnosti.
- `predictCat()`, `getHistAvg()` – predikce kategorie (klouzavý průměr × `SEASON`).

### admin.js
- `renderKomunita()` – přepínač osoba/domácnost, tříúrovňový strom (oddíl→skupina→třída), OECD přepočet, rodinný souhrn (sčítání partnerů).
- `adminSetPremium()` / `adminExtendTrial()` / `adminRevokePremium()` – manuální správa členství (zápis do Firebase).
- `goToHouseholdSettings()`, `goToSharing()` – navigace.

### assets.js
- Asset Allocation donut – rozložení majetku (SVG).

### receipts.js
- `updateItemStats(items, date)` – Firebase agregát per položka (count/totalSpent/avgPrice/history).
- `rpCheckFutureDate()` – banner „Datum v budoucnosti" při špatně přečteném datu.
- `addReceiptAsTx()` – rozdělení účtenky na více transakcí dle kategorií (split).

### app.js
- `globalErrorBanner` handler (error + unhandledrejection, filtrace neškodných).
- Debounce `renderPage`, anti-flicker guard (`_dataSig`).
- `loadPartners()`, categoryMappings systém (`saveCategoryMapping`/`lookupCategoryMapping`).

### Datový tok – klíčové pravidlo
Grafy a výpočty radaru/predikce jsou vázány na **vybraný měsíc** (`S.curMonth`/`S.curYear`), ne na reálné `today`. Denní graf používá `today` jen pro určení „dnes" čáry a predikce zbytku.

**🔗 Cross-reference:** ADR-049 (OECD), ADR-050 (COICOP), ADR-051 (sdílení), ADR-052 (predikce), `formulas.md`, `Summary_s10.md`


*Konsolidováno: 2026-05-14 | Doplněno z Milan merge S1-6: 2026-05-15 | Sessions: 1 → 10 | Poslední update: Session 10, 2026-06-01 | Autor: Milan Migdal*
*Poznámka ke konsolidaci: Dokument vznikl sloučením Claude consolidated merge (Sessions 1–4 + PATCH 2a–2f Session 6) s Milanovým ručním merge `architecture_s6(1).md` (Sessions 1–6) a aplikací `patch-session7-COMBINED(1).md` (Sessions 7.0 + 7.1). Doplnění z Milanova merge jsou označena `(Merge Session 1-6)`. Dočasná ID z patche (S70-xx, S71-xx) přečíslována sekvenčně (FIX-046, FIX-047, OPEN-025, OPEN-026, OPEN-027, ADR-021 až ADR-030).*


---

## Session 11 – architekturální aktualizace (v7.50 → v7.69)

### Struktura webu (S11, ADR-055)
```
financeflow.cz/          → index.html (landing page v4)
financeflow.cz/app       → app.html (původní index.html)
financeflow.cz/legal     → legal.html (privacy)
financeflow.cz/app/**    → app.html (SPA routing)
```
firebase.json rewrites: `/app`→app.html, `/app/**`→app.html, `/legal`→legal.html, `**`→index.html.
`<base href="/">` v app.html. Manifest `start_url=/app`, `scope=https://financeflow.cz/`.

### Email infrastruktura (S11, ADR-056)
- **Odesílání:** Resend, doména financeflow.cz, EU region (Ireland), DNS: DKIM `resend._domainkey`, SPF/MX `send`, DMARC `_dmarc`. Sender: `info@financeflow.cz`.
- **Příjem:** ImprovMX, alias `info@`→`bc.milda@gmail.com`. MX: mx1/mx2.improvmx.com.
- **Nasazení:** Worker v5 s `RESEND_API_KEY` env secret.

### Analytics (S11, ADR-057)
- GA4 tag G-F2Z8DK4RR0. Landing: standardní. App: `send_page_view:false` + manuální event v `showPage()`.

### Receipt datový model (S11, ADR-059)
Položka účtenky:
```js
{
  name: string,
  price: number,      // cena/ks nebo cena/kg
  qty: number,        // počet ks nebo hmotnost v kg
  unit: "ks"|"kg"|"g"|"l",
  lineTotal: number,  // skutečně zaplacená cena řádku (zdroj pravdy)
  discount: number,   // sleva (0 pokud žádná)
  itemCatId: string,  // kategorie položky
  itemSubcat: string,
  tag: string         // zelený tag z editoru
}
```
Helper: `lineAmt(it) = it.lineTotal ?? (it.price × it.qty)`.

### Render architektura (S11)

#### Anti-flicker _dataSig
`renderPage()` přeskočí re-render pokud `_dataSig()` signature nezměněna (ochrana před Firebase onValue blikáním). Signature zahrnuje: počty + sumy transakcí/aktiv/dluhů/walletů/cílů + délku tagů/subcat.

**Kritické:** `save()` vždy nastaví `_renderForce = true` → user akce vždy re-renderují. Firebase auto-sync respektuje signature.

#### Inline editor guard
Inline editory v seznamech (receipt editor v historii) jsou chráněny flagem `window._receiptEditorOpen`. Pokud true, `renderUctenky()` přeskočí re-render a neničí editor slot.

### Affiliate + Partner system (S11, ADR-058)
```
Uživatel sdílí: financeflow.cz/app?ref=LNECDTW8
          ↓
checkIncomingRef():
  1. Loguje klik do referrals/{ref}/clicks
  2. Resolves referrals/{ref}/uid → ownerUid
  3. pairPartners(ownerUid, myUid):
     - users/{ownerUid}/partners/{myUid} = { via:'refLink' }
     - users/{myUid}/partners/{ownerUid} = { via:'refLink' }
     - users/{ownerUid}/referral/earned += 50
     - partner_bonus/{ownerUid}_{myUid} = dedup záznam
```

### Cloudflare Worker – receipt prompt (S11)
Pravidla v `worker.js` pro účtenky:
- PRAVIDLO 1: Kusové – price=cena/ks, qty=počet, lineTotal=price×qty
- PRAVIDLO 2: Váhové – price=cena/kg, qty=hmotnost, lineTotal=zaplaceno (≠price×qty!)
- PRAVIDLO 3: Slevy – lineTotal=po slevě, discount=sleva
- PRAVIDLO 4: total=sum(lineTotal)
- PRAVIDLO 5: ověření sum(lineTotal)≈total (tolerance ±2 Kč)
- PRAVIDLO 6: vynechat DPH, platební způsoby, věrnostní body

### Verze a nasazení
- **Aktuální:** v7.69 (2026-06-09)
- **14 tracked souborů** pro `?v=` hashe: viz CLAUDE.md
- **Version bump:** 4 atomické kroky – viz VERSIONING.md (opravený sed pattern pro banner)

---

*Aktualizace Session 11: 2026-06-09 | v7.69*


---

## Session 13 (v8.24)

### Verzovaci hlavicka
Kazdy zdrojovy soubor (JS, worker.js, sw.js, database_rules.json) nese na prvnim radku // FinanceFlow vX.XX soubor datum. Slouzi k okamzite identifikaci aktualnosti pri porovnani produkce vs pracovni kopie.

### resetAppState (v8.15)
app.js: odpoji _dbListener (vlastni uzel) + partner listenery, vynuluje S/partnerData/viewingUid/saveTimeout. Volano pri odhlaseni (firebase.js, pred _currentUser=null) a na zacatku onUserSignedIn. Kriticke pro izolaci dat.

### API usage tracking (v8.21)
Worker -> users/{uid}/aiUsage/{YYYY-MM}: pocty per typ, total, lastCallAt (checkAndIncrementQuota) + tokensIn/Out/Total, costCzk, tokens_<typ>, cost_<typ> (recordTokens, po odpovedi Claude). Cena: SONNET_PRICE_IN_USD=3, OUT=15, USD_CZK=23.5. Admin: openUserDetail sekce Spotreba AI + loadCommunityActivity.

### Detekce sdilenych podkategorii (v8.23)
V renderu podkategorii: cats.find(x => x.name === s && (x.shared||[]).includes(c.id)) -> podkategorie ktera je zaroven samostatnou kategorii hlasici se pres shared. Vizualni oznaceni.

---

*Aktualizace Session 13: 2026-06-20*


---

## Session 14 (v8.28 → v8.57)

### Nové moduly (S14)

| Soubor | Odpovědnost | Verze |
|---|---|---|
| `kurzy.js` | Záložka Kurzy měn, `fetchFxRates` (always `no-store`), napájí `_FX_RATES` globálně | v8.36 |
| `coicop.js` | COICOP rozpad: `coicopSubclassTotals`, `coicopBreakdownCard`, tag filtr. Compute/render oddělené. | v8.37 |
| `worker.js` /cnb | Endpoint pro parser ČNB denního kurzu. Edge cache 30 min + `Cache-Control:no-cache`. **Nasazení ZVLÁŠŤ přes Cloudflare** (ne firebase deploy). | v8.50 |

### assets.js — klíčové funkce S14

| Funkce | Popis |
|---|---|
| `syncInvestmentAssets()` | ADR-076: klíč `catId::subcat`, adopce, baseline model, EUR→CZK |
| `assetCatLiq(catId)` | Stupeň likvidity kategorie (liq field nebo odvození z názvu) |
| `assetTier(a)` | Sekce aktiva: wallets/reserve/mid/fixed |
| `assetDepositEvents(asset)` | Vklady z transakcí pro historii hodnoty a graf (ADR-078) |
| `resyncAssetsFromTransfers()` | Ruční přepojení + diagnostický alert (try/catch) |
| `assetBuildLiquiditySections(D)` | 4 sekce: Peněženky / Rezerva / Střednědobá / Fyzická |

### Pořadí načítání JS — aktualizace S14
Přidané soubory (za `receipts.js`, před `firebase.js`):
```
...receipts.js → product-db.js → coicop.js → kurzy.js → push.js → firebase.js
```

### S.noSyncKeys — nové pole v datovém modelu
`S.noSyncKeys: string[]` — seznam `linkedKey` (`catId::subcat`) smazaných napojených aktiv. Persistováno explicitně v `saveToFirebase` (musí být ve schématu, jinak Firebase sync maže).

### Klíčová ponaučení S14

| # | Ponaučení | Soubor/Kontext |
|---|---|---|
| 1 | **`S` je `let` (app.js:401) — NENÍ na `window`.** Nikdy `window.S`. | FIX-160, assets.js |
| 2 | `position:sticky` selže pokud má jakýkoli předek `overflow:hidden/auto/scroll` | FIX-164, styles.css |
| 3 | Nová pole v `S` musí být **explicitně v `saveToFirebase`** — jinak je Firebase sync smaže | FIX-169, S.noSyncKeys, S.pinnedFx |
| 4 | Detekce dotyk/myš: `matchMedia('(pointer: coarse)')` | ADR-075, FIX-163 |
| 5 | Worker `/cnb` se nasazuje **zvlášť přes Cloudflare**, ne přes `firebase deploy` | kurzy.js, worker.js |
| 6 | CRLF soubory (Python `open(newline='')`): assets.js, push.js, debts.js, premium.js, settings.js, budouci.js, share.js | workflow |

### Verze ke konci S14
- App: **v8.57**
- Worker: v8.50 (Cloudflare)
- CACHE_NAME: `ff-shell-v8.57`
- Počet JS modulů: **27** (přidány kurzy.js, coicop.js)

---

*Aktualizace Session 14: 2026-06-29 | v8.28 → v8.57 | ADR-075–078*

---

## Session 15 (2026-07-02 → 2026-07-06, v8.57 → v8.74)

> Architektonické změny ze Session 15.

### Nová/rozšířená pole v datovém modelu
```
t.amtCZK: number|null          // zafixovaná CZK hodnota transakce (ADR-079)
c.isSaving: bool               // 🛟 kategorie finanční rezervy (ADR-083)
c.isInvest: bool                // 📈 kategorie aktivního spoření (ADR-083, nové)
S.nakupList[i].inCart: bool    // zaškrtnutí v košíku (ADR-081)
_settings.currency: string      // základní měna (ADR-080)
_settings.convCur: string       // preferovaná převodní měna (v8.72)
d.installments[]               // proměnlivé splátky dluhu (čteno přes computeMonthlyDebtPayments)
```

### Score engine – vrstvy (Session 15 finální stav)
```
helpers.js: _SCORING + msc_*()          // 1) zdroj pravdy – Milanovy tabulky (ADR-085)
premium.js: computeFinancialScore(D)    // 2) Dashboard – plné škály + normalizace 310→100 (TODO-159)
projects.js: computeHealthScores(D,m,y) // 3) Měsíční report – S1/S4 tabulky, Rozpočet původní (TODO-157)
debts.js: renderDebtStressWidget(D)     // 4) Dluhový stres index – DSTI/DTI z tabulek invertované na 0–25
projects.js: bankovní DTI/DSTI karty    // 5) Bankovní hodnocení – body z tabulek zobrazeny přímo
```
Všechny 4 spotřebitelé (2–5) čtou stejné `_SCORING` + sdílené helpery `computeMonthlyDebtPayments`/`computeEffectiveIncome` – žádná duplicitní logika.

### Avalanche/Snowball simulační engine (`_payoffSim`, debts.js, v8.71+v8.74)
```
_payoffSim(strategy, extra, capMonths) → {
  months, totalInterest, curve[], intCurve[],
  aliveCurve[],      // v8.74: počet živých půjček po měsících
  perDebt[],         // v8.74: zůstatek KAŽDÉ půjčky po měsících
  focusCurve[],      // v8.74: na kterou půjčku šly extra peníze daný měsíc
  firstPaidMonth, firstPaidName,
  paidMonths[]       // v8.74: {name, m} kdy je která půjčka splacená
}
```

### TWA ikony (v8.69)
```
icons/play-store-icon-512.png       // ostré rohy, Play zaoblí sám
icons/icon-192.png, icon-512.png    // zaoblené, manifest.json
icons/icon-maskable-192/512.png     // bezpečná zóna 72 %
icons/apple-touch-icon-180.png
icons/feature-graphic-1024x500.png  // Google Play listing
```

---

*Aktualizace Session 15: 2026-07-06 | v8.57 → v8.74 | FIX-174–191 · ADR-079–085 · TODO-144–159*
