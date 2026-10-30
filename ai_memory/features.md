# FinanceFlow – Features

> Konsolidovaný dokument ze **4 sessions** (`features.md` → `features-1.md` → `features-2.md` → `FEATURES-3.md`).
> Každý záznam označen zdrojovou session: `**(Session N)**`. Nové funkce a změny stavu mezi sessions jsou vyznačeny.
> Tento dokument popisuje **aktuální stav** funkcí. Plánované úkoly s detaily jsou v `todo.md`.
> Poslední aktualizace: konsolidace 4 sessions, 2026-04-16.

---

## 📋 TL;DR – Stav funkcí

| Kategorie | Hotovo | Rozpracováno | Plánováno |
|---|---|---|---|
| Základní finance (free) | 12 | 0 | 0 |
| Premium analytics | 10 | 1 | 0 |
| Grafy | 4 záložky | Box plot přesun | 1 |
| AI funkce | 3 | 0 | 1 |
| Import / Export | 4 | 1 (PDF velké) | 2 |
| Offline | 1 (účtenky) | 1 (transakce) | 1 (SW) |
| Bezpečnost | 3 | 0 | 0 |
| Komunita | 3 | 0 | 1 |
| Admin | 7 | 0 | 0 |
| Platby / Monetizace | 0 | 0 | 1 (rozhodnutí) |
| **Celkem** | **~50 funkcí** | **4** | **10+** |

---

## ⚠️ Změny stavu napříč sessions (co se mezi sessions změnilo)

| # | Funkce | Původní stav | Aktuální stav |
|---|---|---|---|
| 1 | **PIN pad** | S3: 🚧 Rozpracováno 50 % | ✅ **Funguje** – S3 „50 %" byl způsoben očekáváním full-screen systémového PIN padu, což **webová appka nemůže technicky poskytnout**. Aplikační overlay je maximum dosažitelné. Viz `explanations.md` sekce 1. |
| 2 | **Nákupní seznam** | S3: ✅ Hotovo | ⚠️ **Nutno ověřit** – viz `todo.md` TODO-047 |
| 3 | **Analýza účtenek** | S1: BETA | ✅ Hotovo, produkčně nasazené |
| 4 | **Email notifikace** | S3: 🚧 70 % hotovo (blokuje Resend doména) | 🔴 **Stále nefunguje** – viz `bugs.md` OPEN-001, `todo.md` TODO-003 |
| 5 | **Grafy – záložky** | S2: 3 záložky (Obecné/Měsíční/Roční) | ✅ 4 záložky (+ Všechny roky) |
| 6 | **Grafy – renderování** | S3: ✅ Po refaktoru v6.36 | 🔴 **Bug přetrvává** – viz `bugs.md` OPEN-002 |
| 7 | **COICOP engine** | S1: ✅ Hotovo | ⚠️ **Plánovaný rework** – viz `todo.md` TODO-048 |
| 8 | **Offline režim** | S1: Plánováno (Service Worker) | ✅ Účtenky přes IndexedDB hotové (Session 4), Service Worker stále chybí |

---

## ✅ HOTOVÉ FUNKCE – Základní (Free tier) **(Session 3 klasifikace)**

### 💰 Transakce a přehledy
- **Dashboard** – přehled měsíce (příjmy, výdaje, saldo, zůstatek, top kategorie) **(S1+S2+S3)**
- **Přidání / editace / smazání transakce** – příjem / výdaj / převod **(S1+S2+S3)**
- **Filtrování** – kategorie, podkategorie, typ platby, peněženka, tag, fulltext **(S1+S2)**
- **Řazení** – datum, částka, název **(S2)**
- **Tagy** – autocomplete, záložka Tagy s distribucí a filtrací **(S1+S2+S3)**
- **Split transakce** – rozdělení do kategorií, zlatý rámeček, accordion, badge `✂️ SPLIT · N×` **(S1+S2)**
- **Převody mezi peněženkami** (Transfer typ) **(S2)**
- **Opakované šablony** – automatické generování transakcí (výplata, nájem) **(S1+S2+S3)**
- **Navigace mezi měsíci** (← →) **(S2)**

### 🏦 Správa financí
- **Peněženky** – více peněženek s různými měnami, bankovní účet / hotovost / spoření **(S1+S2+S3)**
- **Kategorie** – vlastní s ikonou, barvou, podkategoriemi, OECD limitem **(S1+S2+S3)**
- **Typy plateb** – hotovost, karta, převod, QR, … **(S2+S3)**
- **Bank** – přehled vývoje úspor, počáteční zůstatek **(S1+S2)**

### 🔐 Uživatelský systém
- **Google přihlášení** (Firebase Auth) **(S2+S3)**
- **Lokální režim** – bez účtu, data v localStorage **(S1+S2+S3)**
- **Profil uživatele** – jméno, foto z Google **(S2)**
- **PIN ochrana při přihlášení** ✅ **(funguje, technické omezení objasněno)**
  - **Co funguje:** Aplikační PIN overlay se zobrazuje po načtení dat (~800 ms delay po `loadSettings`)
  - **Soubory:** `settings.js`, `app.js`, `index.html`
  - **⚠️ Co NENÍ možné:** Full-screen systémový PIN pad **jako na fotce z Wallet appky** (s číselníkem vzhledu OS).
    Webová aplikace **nemůže** zobrazit systémový PIN telefonu – je to omezení prohlížeče, ne nedostatek implementace.
    To, co máme, je maximum, co webová appka na toto téma může nabídnout.
  - **Pokud PIN nevyskakuje:** Zkontroluj, zda byl nahrán aktuální `app.js` (bez něj nefunguje delay)
  - **🔗 Cross-reference:** `explanations.md` sekce 1 – proč webová appka nemůže zobrazit systémový PIN

### 📱 Mobilní a PWA
- **Responzivní design** – mobil / tablet / desktop **(S2)**
- **PWA manifest.json** – instalovatelná na mobil **(S1+S2+S3)**

---

## ✅ HOTOVÉ FUNKCE – Premium (Trial / placené)

### 📊 Grafy a analýzy
Graf systém po refaktoru v6.36 má **4 záložky** se sdíleným filtrem kategorie/podkategorie/typu:
- **Obecné** – Příjmy, Výdaje, Saldo, Půjčky, Predikce (area chart 12 měsíců) **(S2+S3)**
- **Měsíční** – denní sloupce, kumulativní křivka, medián, statistiky **(S2+S3)**
- **Roční** – tabulka s barevným kódováním, bar chart **(S1+S2+S3)**
- **Všechny roky** – heatmap tabulka, roční srovnání **(S3)**

> ⚠️ **Známý bug:** Canvas se při prvním načtení nezobrazuje správně – viz `bugs.md` OPEN-002.

### 📈 Finanční analýzy a predikce
- **Finanční zdraví / skóre 0–100** – **4 složky × 25 bodů = 100 bodů** **(S1)**:
  1. Příjmy / výdaje
  2. Zadluženost
  3. Úspory
  4. Trend
  _(Pozn.: S2 zmiňovala jen 3 složky, ale 4. složka **trend** v implementaci zůstala – rozpor vyřešen)_
- **Souhrn výdajů** – pie chart + tabulka per kategorie **(S1)**
- **Statistiky** – pokročilé měsíční statistiky, percentily **(S1+S3)**
- **Měsíční report** – predikční tabulka 12 měsíců, sezónní koeficienty, YTD **(S1+S2)**
- **Finanční radar** – spider chart 6 dimenzí finančního zdraví, predikce problémů **(S1+S2+S3)**
- **Finanční obraz** – DTI/DSTI, dluhový stres, simulace, trend za 6 měsíců **(S1+S2+S3)**
- **Net Worth** – čistý majetek (peněženky) **(S2)**
- **Simulace života** – „co kdyby" scénáře, spoření + inflace **(S2+S3)**

### 🧮 Výpočty a kalkulace (detaily v `formulas.md`, pokud existuje)
- **DSTI a DTI** – bankovní hodnocení dle ČNB limitů **(S1+S2)**
- **Predikce výdajů** – historický průměr × sezónní koeficient + narozeninový bonus **(S1+S2)**
- **Predikce v2** **(Session 3)** – `computePersonalSeason()`, `detectTrend()`, `computeYearForecast()`
  - Personal season blend 80/20 (vlastní + globální)
  - Min 4 měsíce pro trend detekci
  - Outlier removal (>3× medián)
- **Predikce tabulka** – Předpoklad YTD + Odhad roku + odchylka **(S3)**
- **Annuitní splátky, splátkový kalendář** **(S1)**
- **RPSN** – Newton-Raphson, 200 iterací, clamp proti divergenci **(S1)**

### 💳 Půjčky a dluhy
- **Správa půjček** – 5 typů (hypotéka, auto, osobní, spotřebitelský, od kamaráda) **(S1+S2+S3)**
- **Splátkový kalendář** s detailem **(S2)**
- **Progress bar** průběhu splácení **(S3)**
- **Simulace splacení** – různé strategie **(S2)**
- **Simulace dluh vs. investování** (DVI analýza) **(S2)**
- **Dluhový stres index** **(S2)**
- **Konsolidace půjček** **(S2)**
- **Kolik stojí odkládání splacení** **(S2)**

### 📅 Plánování
- **Projekty** – sledování (Dovolená, Rekonstrukce, …) s rozpočtem, přiřazování transakcí, DTI/DSTI per projekt **(S1+S2+S3)**
- **Narozeniny a přání** – dny do narozenin, dárkové upomínky, wishlist **(S1+S2+S3)**
- **Hlídač přání** – extrakce produktu z URL (Heureka, Alza, Mall) přes Claude **(S1+S2)**
- **Simulace budoucnosti** – spoření + inflace **(S2)**

### 🧠 Detektor úspor
- **6 kategorií:** předplatná, bankovní poplatky, pojištění, telefon/internet, limity, refinancování **(S1)**
- **Jaro-Winkler** algoritmus pro detekci **(S3)**
- **Detekce předplatných z reálných transakcí** (ne ze seed dat) **(S2)**
- ⚠️ **Rozpracované:** načítání komunitních dat zpět do aplikace **(S2)**

### 👨‍👩‍👧 Rodina & Sdílení
- **Sdílení dat s partnerem** – toggle per sekce (výdaje, půjčky, projekty, …) **(S1+S2+S3)**
- **Rodinný souhrn 💎** – přehled dat partnerů, agregace **(S1+S2+S3)**
- **Read-only pohled** na partnerova data **(S1)**
- **Real-time sdílení** – přepínání pohledů **(S3)**

---

## ✅ HOTOVÉ FUNKCE – AI a automatizace

### 🤖 AI Rádce
- Konverzační chat s Claude Sonnet přes Cloudflare Worker **(S1+S2+S3)**
- Personalizované rady s finančními daty uživatele **(S3)**

### 📸 Analýza účtenek
- **Skenování 1–4 fotek najednou**, fronta, manuální spuštění **(S1)**
- **Podpora více fotek** – sloučení do jednoho JSON **(S2)**
- **Claude Vision** – foto → strukturovaná data **(S3)**
- **Editace bez blikání** – `addEventListener` mimo `innerHTML` **(S1)**
- **Auto-detekce kategorie** (`guessReceiptCategory`) **(S1)**
- **Kategorie per položku** – skupiny dle `itemCat`, zlatý rámeček **(S1)**
- **Sdílený katalog položek** (Firebase `catalog/items/`) **(S1+S2)**
- **Editace starých účtenek** z Historie **(S1)**

#### Záložky v analýze účtenek
- **Zdražování** – deduplikace cen, slider časového rozmezí **(S1)**
- **Srovnání ČR** – COICOP engine přímo z účtenek **(S1)**
- **Trend** – vývoj výdajů v čase per COICOP skupina **(S1)**
- **Obchody** – statistiky per obchod **(S1)** — ⚠️ porovnání cen mezi obchody **není** implementováno **(S1 rozpracované)**

---

## ✅ HOTOVÉ FUNKCE – COICOP & Srovnání ČR

> ⚠️ **Plánovaný rework** – viz `todo.md` TODO-048. Uživatel není s aktuální implementací spokojen. Zejména vzhled progres baru u Komunitního přehledu potřebuje úpravu.

- **13 skupin CZ-COICOP 2024** s průměry ČSÚ a barevnými kuličkami **(S1)**
- **Keyword engine** – mapování názvů transakcí na COICOP skupiny (keyword → category → fallback) **(S1+S2)**
- **OECD spotřební jednotky** – dospělí + děti 0–13 + děti 14+, přepočet průměrů ČSÚ **(S1+S2)**
- **Completeness score** – 🟢≥80 % / 🟡≥50 % / 🔴<50 %, detekce chybějících kategorií **(S1)**
- **Srovnání ČR** – single bar Vy vs ČSÚ průměr per skupina **(S1+S2)**
- **Měsíční trend COICOP** – sloupcový graf 6 měsíců + mini bary per skupina **(S1)**
- **Komunitní přehled** – anonymní agregovaná data uživatelů vs ČSÚ **(S1+S3)**
  - ⚠️ Potřeba upravit vzhled progres baru (viz `todo.md` TODO-048)
- **COICOP auto-učení** – user corrections do Firebase (`coicop_corrections/{uid}/{kw}`)
  - **(S1)** Označeno jako rozpracované („aplikace zatím nepíše corrections automaticky")
  - Od té doby pravděpodobně doimplementováno

---

## ✅ HOTOVÉ FUNKCE – Import / Export

### Import dat **(S1+S2+S3)**
- **CSV import** – auto-detekce formátu Fio / Air Bank / ČSOB / KB / Raiffeisenbank / šablona
- **XLSX / XLS import** – bez externích knihoven (ZIP/XML parser)
- **PDF import** – přes Cloudflare Worker, Claude extrahuje transakce
- **JSON import** – záloha dat **(S3)**
- **Mapování kategorií Varianta C** – neznámé kategorie k namapování před importem **(S1)**
- **Detekce duplikátů** – skóre 0–100, datum + částka ±0.01 + název prvních 10 znaků **(S1+S2)**
- **Editor importu** – dvousloupcový (importovaná vs existující) **(S2)**
- **Historie importů** **(S1+S2)**
- **Stažení šablony CSV** **(S1+S2)**

### Export dat **(S2)**
- **Export CSV** transakcí
- **Export JSON** – kompletní záloha dat

### Známá omezení importu
- ⚠️ Velké PDF (>200 transakcí) selhávají na `max_tokens` – viz `bugs.md` OPEN-003
- ⚠️ `.xlsm` soubory s makry nepodporovány – viz `bugs.md` OPEN-013
- ⚠️ Velké PDF (>10 MB) selžou na Worker size limitu – viz `bugs.md` OPEN-004

---

## ✅ HOTOVÉ FUNKCE – Offline režim **(Session 4)**

> Nově implementováno v Session 4 přes IndexedDB (`offline-sync.js`).

### Co funguje offline ✅
- **Focení a ukládání účtenek**
- **Prohlížení dat z cache**
- **Dashboard a grafy**
- **Zadávání transakcí** – API `saveTxOffline()` **připraveno**, ale integrace do `transactions.js` zatím chybí (viz `todo.md` TODO-002)

### Co nefunguje offline ❌
- **AI analýza účtenek** (vyžaduje Cloudflare Worker)
- **AI Rádce** (vyžaduje Worker)
- **Sdílení s partnerem** (Firebase Realtime)

### Architektura **(S4 FEATURE-01)**
- **IndexedDB** – pojme stovky MB fotek jako Blob objekty
- **3 tabulky:** `pending_receipts`, `pending_tx`, `sync_log`
- **Stavový automat:** `pending → processing → done / error`
- **Retry:** Až 4 pokusy při selhání sync

### Komprese fotek
- Max rozlišení: 1200×1600 px
- Formát: JPEG, kvalita 82 %
- Úspora: 70–85 % (3 MB → 400–600 KB)

### Životní cyklus offline účtenky
1. Uživatel vyfotí účtenku bez internetu
2. `addReceiptPhoto()` detekuje `!navigator.onLine` → `OfflineSync.saveReceiptOffline()`
3. Komprese → IndexedDB s `status: 'pending'`
4. UI: „Uloženo offline – AI analýza proběhne po připojení"
5. Žlutý badge vpravo dole ukazuje počet čekajících položek
6. `window.addEventListener('online')` spustí `runSync()` po 1.5 s
7. `runSync()` odešle fotky na Worker
8. Badge zmizí po úspěšné sync

### Veřejné API (`window.OfflineSync`)
| Metoda | Popis |
|--------|-------|
| `init()` | Inicializace IndexedDB, auto-sync při startu |
| `saveReceiptOffline(file, ctx)` | Uloží fotku offline |
| `saveTxOffline(txData)` | Uloží transakci offline |
| `runSync()` | Manuální / auto spuštění sync |
| `isOnline()` | Wrapper pro `navigator.onLine` |
| `showOfflineQueue()` | Modal s přehledem offline fronty |

---

## ✅ HOTOVÉ FUNKCE – Premium systém

- **Free / Trial (30 dní) / Premium** stavy **(S2)**
- **Automatický 30denní trial** pro nové uživatele **(S2)**
- **Paywall** s výpisem prémiových funkcí (99 Kč/měs, 699 Kč/rok) **(S2)**
- **Premium lock overlay** na uzamčených sekcích **(S2)**

> ⚠️ **Platební brána není implementována** – otevřené rozhodnutí GoPay vs Stripe/Paddle (viz `todo.md` TODO-022).

---

## ✅ HOTOVÉ FUNKCE – Nové v Session 3 (v6.37 → v6.41)

- **Nastavení (Wallet-style)** – PIN, téma (dark/light/auto ⚠️), mazání dat, export JSON, FAQ
  - ⚠️ Auto téma vizuálně shodné s Světlým – viz `bugs.md` OPEN-020
- **Sdílení & Referral** – unikátní kód, bodový systém (+50 / +100 / +300), QR, WhatsApp sdílení
- **SMS / Notifikace import** – parser bankovních notifikací (debug textové pole)
  - Podporované banky: **Revolut, George, KB, ČSOB, Air Bank, mBank, Google Pay, Apple Pay, PayPal**
- **Detektor duplikátů** – Jaro-Winkler, 3 typy (přesný / opožděný / podobný), merge akce
- **Nákupní seznam** – autocomplete z Firebase, hlídač cen, email alert ⚠️ nutno ověřit (viz `todo.md` TODO-047)
- **Kalendář** – čtvercový Po–Ne, denní saldo, intenzita barev, klik → detail
- **Kontaktní formulář** – Firebase uložení + Resend Worker
  - Typy: bug / feature / podpora / premium
  - ⚠️ Doručení emailů nefunguje (viz `bugs.md` OPEN-001)
- **Komunita** – anonymní publikování výdajů pro srovnání

---

## ✅ HOTOVÉ FUNKCE – Admin panel

- **Záložka Uživatelé** – celkem / premium / trial / free **(S1)**
- **Záložka Keyword engine** – CRUD tabulka COICOP pravidel + Firebase overrides **(S1+S2)**
- **Záložka User corrections** – co uživatelé opravují, povýšení na globální pravidlo **(S1)**
- **Záložka Low confidence** – transakce s confidence <50 %, rychlé přidání pravidla **(S1)**
- **Záložka Statistiky mapování** – % pokrytí, distribuce 13 skupin **(S1)**
- **Záložka Leady** – tabulka, search, Excel export, copy all **(S1)**
- **Záložka Support zprávy** – jen Admin UID **(S3)**
- **Affiliate sledování** – `?ref=` parametr → Firebase **(S1+S2)**
- **Changelog verzí** v „O aplikaci" **(S2)**

> 🔴 **Známý problém:** `loadLowConf()` a `loadMappingStats()` vracejí 403 dokud nejsou nastavena Firebase Rules – viz `bugs.md` FIX-039 a `todo.md` TODO-001.

---

## ✅ HOTOVÉ FUNKCE – Aplikace / UI

- **Privacy Policy** (CZ + EN, přepínač jazyků) **(S2)**
- **Podmínky používání** (CZ + EN) **(S2)**
- **Našeptávač emailových domén** (`@gmail.com`, `@seznam.cz`, …) **(S2)**
- **Hodnocení aplikace** – odkaz na Google Play (placeholder) **(S2)**
- **Téma** – dark / light / **auto** ⚠️ **(S3)**
  - Auto téma: viz `bugs.md` OPEN-020
- **Jazyk** – CS primární, SK/EN infrastruktura **(S1+S2)** – překlady nekompletní
- **Složení domácnosti** (OECD) – live výpočet ekvivalentu **(S1)**

---

## ✅ HOTOVÉ FUNKCE – Infrastruktura a workflow

### Hosting a deploy
- **Firebase Hosting** – `https://financeflow-a249c.web.app` **(S2)**
- **GitHub CI/CD** – merge do `main` → automatický deploy **(S2)**
- **Dev větev** pro testování **(S2)**

### Verzovací systém **(Session 4 FEATURE-02)**
Memory Rules pro Claude Code zajišťují 4 povinné kroky při každé změně verze:
1. Aktualizace `<title>` v `index.html` (**řádek 6**)
2. Aktualizace verze v sekci „O aplikaci" v UI
3. Přidání changelog záznamu do `admin.js`: `[Section > Subsection] Popis`
4. Aktualizace cache-busting hashů změněných `.js` souborů (SHA256, prvních 8 znaků)

#### Příklady changelog záznamů
```
[Grafy > Obecné] Opraven prázdný canvas při prvním načtení
[Admin > Low confidence] Přepnuto na REST API místo Firebase SDK
[Účtenky > Offline] Přidána IndexedDB fronta pro offline fotky
[Nastavení > Téma] Opraveno Auto téma – nevolá se rekurzivně
```

---

## 🔄 ROZPRACOVANÉ FUNKCE

### Detektor úspor – komunitní předplatná **(S2)**
- ✅ Základní detekce funguje, ukládá do Firebase
- ❌ Načítání komunitních dat zpět do aplikace

### Grafy – propojení filtrů **(S2)**
- ✅ Filtr je sdílený mezi záložkami
- ❌ Chybí reaktivní překreslení při změně záložky

### Box plot grafy **(S3)**
- ✅ Roční záložka (ale špatné umístění)
- ❌ Všechny roky – přesunout sem
- ❌ Měsíční – 12 box plotů
- **Status:** 30 % hotovo
- **🔗 Cross-reference:** `todo.md` TODO-009

### Import z banky – automatický **(S3)**
- ✅ Parser (`sms-import.js`) – testování přes textové pole
- ❌ Android NotificationListener – samostatná Android appka
- **Status:** 20 % hotovo
- **🔗 Cross-reference:** `todo.md` TODO-024

### Import PDF – velké soubory **(S2)**
- ✅ Funguje pro ~200 transakcí
- ❌ Dělení na části pro větší výpisy
- **🔗 Cross-reference:** `bugs.md` OPEN-003, `todo.md` TODO-005

### Lokalizace EN / SK **(S1+S2)**
- ✅ Infrastruktura (`_settings.lang`)
- ❌ Překlady v UI, přeložené chybové hlášky
- **🔗 Cross-reference:** `todo.md` TODO-028

### Offline integrace transakcí **(S4)**
- ✅ API `saveTxOffline()` existuje
- ❌ `transactions.js` ho nevolá
- **🔗 Cross-reference:** `todo.md` TODO-002

---

## ⬜ PLÁNOVANÉ FUNKCE

> Detailní popis úkolů, priorit a cross-references je v `todo.md`. Zde jen krátký přehled:

### Monetizace
- **Platební brána** – GoPay vs Stripe/Paddle (otevřené rozhodnutí) → `todo.md` TODO-022

### AI & Automation
- **AI mapování kategorií** – pamatuje si volby → `todo.md` TODO-014
- **Automatická pravidla** – auto-kategorizace („Shell" → Doprava/Benzín) → `todo.md` TODO-033
- **Email týdenní report** – cron přes Cloudflare Scheduled Triggers → `todo.md` TODO-032

### Offline & Performance
- **Service Worker** – plný offline + push notifikace → `todo.md` TODO-019
- **Bundling** (Vite/esbuild) – 22 JS souborů do jednoho → `todo.md` TODO-035

### Integrace
- **Android NotificationListenerService** – zachycení bankovních notifikací → `todo.md` TODO-024
- **Fio API** / **Open Banking** – automatický import → `todo.md` TODO-025/026
- **Google Pay notifikace** → `todo.md` TODO-044

### Platform
- **Google Play** (TWA wrapper) → `todo.md` TODO-027
- **Vlastní doména** → `todo.md` TODO-040

### Export & notifikace
- **PDF / XLSX export** → `todo.md` TODO-031
- **Web Push notifikace** → `todo.md` TODO-030

### Rozšíření
- **Nové kategorie** (Auto, Předplatné, Sebevzdělání, ...) → `todo.md` TODO-012
- **Kontrola duplikátů v Transakcích** → `todo.md` TODO-013
- **Více měn** (EUR, USD, GBP) → `todo.md` TODO-029
- **Landing page** → `todo.md` TODO-010

---

## 🔗 Cross-reference mapa

| Téma | Kde hledat další info |
|---|---|
| Otevřené bugy funkcí | `bugs.md` sekce OPEN-001 až OPEN-020 |
| Konkrétní úkoly / priority | `todo.md` sekce P1–P4 |
| Architektonická rozhodnutí | `decisions.md` sekce ADR-001 až ADR-015 |
| Struktura souborů | `architecture.md` sekce 2 |
| Datový model | `architecture.md` sekce 4 |
| Firebase Rules | `architecture.md` sekce 8 |
| Cloudflare Worker | `architecture.md` sekce 7 |
| Bezpečnost + security incidents | `context.md` + `architecture.md` sekce 7 (API klíče) |

---

*Konsolidováno: 2026-04-16 | Sessions: 1 → 4 | Autor: Milan Migdal*
