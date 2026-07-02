# FinanceFlow – Features

> **Zdrojový soubor (základ):** `features_consolidated_2026-05-15_s6.md` (konsolidace Sessions 1–6)
> **Aplikované patche Session 7:** sekce features ze souboru `patch-session7-COMBINED(1).md` – Session 7.0 (2026-04-25) + Session 7.1 (2026-04-30)
> **Procedura:** Aplikace S7 combined patche. Nová data označena `**(Session 7.0)**` / `**(Session 7.1)**`.
> **Datum poslední aktualizace:** 2026-05-15
>
> Konsolidovaný dokument ze **7 sessions (vč. 7.1)**. Každý záznam označen zdrojovou session: `**(Session N)**`.
> Doplnění z Milanova merge jsou označena `**(Merge Session 1-4)**`.
> Tento dokument popisuje **aktuální stav** funkcí. Plánované úkoly s detaily jsou v `todo.md`.
> Poslední aktualizace: 2026-05-15 (Session 7.0 + 7.1 patch).

---

## 📋 TL;DR – Stav funkcí

| Kategorie | Hotovo | Rozpracováno | Plánováno |
|---|---|---|---|
| Základní finance (free) | 12 | 0 | 0 |
| Premium analytics | 10 | 1 | 0 |
| Grafy | 4 záložky | Box plot přesun | 1 |
| AI funkce | 3 | 0 | 1 |
| Import / Export | 4 | 1 (PDF velké) | 2 |
| Offline | 2 (účtenky + transakce⚠️) | 0 | 1 (SW) |
| Bezpečnost | 3 | 0 | 0 |
| Komunita | 3 | 0 | 1 |
| Admin | 8 | 0 | 0 |
| Vizualizace | 1 (Bubble chart) | 1 (Gradient⚠️) | 1 (Chord) |
| Nové sekce S7.1 | 4 (Plány, Budoucí, Aktiva, Poradce) | 1 (Měsíční report periody) | 0 |
| Platby / Monetizace | 0 | 0 | 1 (rozhodnutí) |
| **Celkem** | **~50 funkcí** | **4** | **10+** |

---

## ⚠️ Změny stavu napříč sessions (co se mezi sessions změnilo)

| # | Funkce | Původní stav | Aktuální stav |
|---|---|---|---|
| 1 | **PIN pad** | S3: 🚧 Rozpracováno 50 % | ✅ **Funguje** – S3 „50 %" byl způsoben očekáváním full-screen systémového PIN padu, což **webová appka nemůže technicky poskytnout**. Aplikační overlay je maximum dosažitelné. Viz `explanations.md` sekce 1. |
| 2 | **Nákupní seznam** | S3: ✅ Hotovo | ⚠️ **Nutno ověřit** – viz `todo.md` TODO-047 |
| 3 | **Analýza účtenek** | S1: BETA | ✅ Hotovo, produkčně nasazené |
| 4 | **Email notifikace** | S3: 🚧 70 % hotovo (blokuje Resend doména) | ✅ **Funguje (Session 6)** – Worker v5, Resend, emaily dorazí na bc.milda@gmail.com. Viz `bugs.md` FIX-046, `decisions.md` ADR-026 |
| 5 | **Grafy – záložky** | S2: 3 záložky (Obecné/Měsíční/Roční) | ✅ 4 záložky (+ Všechny roky) |
| 6 | **Grafy – renderování** | S3: ✅ Po refaktoru v6.36 | ✅ **Opraveno (Session 6)** – FIX-042–045, potvrzeno Milanem. Viz `bugs.md` |
| 7 | **COICOP engine** | S1: ✅ Hotovo | ⚠️ **Plánovaný rework** – viz `todo.md` TODO-048 |
| 8 | **Offline režim** | S1: Plánováno (Service Worker) | ✅ Účtenky přes IndexedDB hotové (Session 4), Service Worker stále chybí |
| 9 | **Predikce tabulka** | S5: nefunkční (`computeYearForecast` chyběla) | ✅ **Opraveno (Session 6)** – funkce přidána do `helpers.js` |
| 10 | **Sentry monitoring** | S6: neexistoval | ✅ **Nasazeno (Session 6)** – async loader, error tracking. Viz `decisions.md` ADR-025 |
| 11 | **Offline transakce** | S4: IndexedDB engine existuje, ale `save()` ho nevolal | ✅ **Implementováno (Session 6)** – offline větev v `save()` v `app.js`. ⚠️ Čeká na ověření uživatelem |
| 12 | **GitHub Pages** | S5: nefungovalo | ✅ **Funkční (Session 6)** – `bcmilda.github.io/financeflow` z větve `dev`. Viz `decisions.md` ADR-011 |
| 13 | **PDF import** | S6: ✅ text extraction | ✅ **Stabilizováno (Session 7.0)** – chunking 15 stránek/dávka, JSON parsing fix |
| 14 | **Donut chart / Dashboard** | S1–S6: koláčový donut | ✅ **Nahrazen Bubble chartem (Session 7.0/7.1)** – 4 varianty A/B/C/D. ⚠️ OPEN-026, OPEN-027 |
| 15 | **Přání a cíle (nakup.js)** | S7.0: plánováno | ✅ **Implementováno (Session 7.1)** – progress bar, deadline, goal_deposits. ✅ záložka funguje po nahrání správného `nakup.js` (deployment fix, 2026-05-19) |
| 16 | **Měsíční report – záložky period** | S7.0: plánováno | 🚧 **Částečně (Session 7.1)** – záložky existují, přepočet dat nefunguje (OPEN-028) |
| 17 | **Budoucí platby** | S7.0: plánováno | ✅ **Implementováno (Session 7.1)** – `budouci.js`, horizont 30–365 dní |
| 18 | **Report pro finančního poradce** | S7.0: plánováno | ✅ **Implementováno (Session 7.1)** – `advisor.js`, AI doporučení, print CSS |
| 19 | **Finanční aktiva** | S7.1: nové | ✅ **Implementováno (Session 7.1)** – `assets.js`, Net Worth = aktiva + peněženky − dluhy |

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
- ~~⚠️ Velké PDF (>200 transakcí) selhávají na `max_tokens`~~ ✅ **Vyřešeno (Session 6)** – pdf.js text extraction + chunking. Viz `bugs.md` FIX-046
- ⚠️ `.xlsm` soubory s makry nepodporovány – viz `bugs.md` OPEN-013
- ⚠️ Velké PDF (>10 MB) selžou na Worker size limitu – viz `bugs.md` OPEN-004
- ⚠️ Skenovaná PDF bez textu nejsou podporována (OCR není implementováno)

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
- **Sentry monitoring** – async error tracking, `setUser` po přihlášení **(Session 6)**
- **Verze v O aplikaci** – banner opraven na aktuální verzi **(Session 6)**

> ~~🔴 **Známý problém:** `loadLowConf()` a `loadMappingStats()` vracejí 403~~
> ✅ **Vyřešeno (Session 6)** – Firebase Rules admin read přístup nasazen. Viz `decisions.md` ADR-027, `bugs.md` FIX-047.

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

## ✅ HOTOVÉ FUNKCE – Nové v Session 7.0 (v6.49)

- **PDF import – text extraction** – pdf.js 3.11.174, chunking 15 stránek/dávka, merge výsledků **(Session 7.0)**
  - Worker typ: `bank_statement_text` (vedle stávajícího `bank_statement`)
  - JSON parsing fix: `indexOf('{')` + `lastIndexOf('}')` místo lazy regex
  - ⚠️ Skenovaná PDF bez textu nepodporována (OCR chybí)
  - 🔗 Viz: `architecture.md` sekce 17, FIX-046, ADR-032
- **Bubble chart vizualizace výdajů** – nahrazuje donut chart v dashboardu **(Session 7.0/7.1)**
  - A) Cluster – velké kategorie + satelity
  - B) Drill-down – L1 kategorie → L2 podkategorie → L3 sdílené tagy
  - C) Gradient – linearGradient z barev rodičů pro sdílené subkategorie
  - D) Treemap – HTML grid layout
  - `SHARED_NAMES` Set pro sdílené podkategorie (gradient okraj + 🔗 + drill)
  - ⚠️ OPEN-026: bubliny pod lištu | ⚠️ OPEN-027: Gradient bez sdílených dat
  - 🔗 Viz: `architecture.md` sekce 16, ADR-030, ADR-037
- **Firebase Rules – referrals + referral_clicks** – opravena chyba `initReferral Permission denied` **(Session 7.0)**
  - 🔗 Viz: FIX-047

---

## ✅ HOTOVÉ FUNKCE – Nové v Session 7.1 (v6.49–v6.50)

### 🎯 Plány a cíle **(Session 7.1)**
- Záložka v Nákupním seznamu: 🛒 Nákupní seznam | 🎯 Plány a cíle
- Progress bar, deadline, motivační stav (🎉/🟢/🔵/🟡/🔴)
- Firebase: `goal_deposits/{id}` – vklady do cílů
- Virtuální peněženka (`renderVirtualWallet`) v sekci Peněženky
- ⚠️ Záložka se aktuálně nezobrazuje – viz OPEN-029, TODO-072
- 🔗 Viz: TODO-056, ADR-034

### 🗓️ Budoucí platby **(Session 7.1)**
- Nová sekce `budouci.js`, nav item 🗓️
- Agreguje: šablony + narozeniny + přání/cíle (`isGoal`) + dluhy
- Konfigurovatelný horizont: 30 / 60 / 90 / 180 / 365 dní
- Urgency styly: Today / Tomorrow / <7 days
- 🔗 Viz: TODO-058

### 💎 Finanční aktiva **(Session 7.1)**
- Nová sekce `assets.js`, 5 typů: nemovitosti / investice / vozidla / spoření / ostatní
- `computeAssetsNetWorth(D)` → `{totalAssets, totalWallets, netWorth, byType}`
- Net Worth = aktiva + peněženky − dluhy
- ⚠️ **NIKDY nepřejmenovávat** `computeAssetsNetWorth()` – kolize s `computeNetWorth()` z `premium.js`
- 🔗 Viz: TODO-059, ADR-035, ADR-036

### 📋 Report pro finančního poradce **(Session 7.1)**
- Záložka 📋 Poradce v měsíčním reportu (`advisor.js`)
- Karty: Finanční zdraví / Cashflow / Zadlužení (DSTI+DTI) / Rezerva / Net Worth
- Cashflow graf 12M (canvas), Struktura výdajů (horizontal bar canvas)
- AI doporučení: Worker typ `advisor_report`, max 4 prioritizovaná
- Print CSS: `window.print()` tlačítko
- ⚠️ `renderAdvisor()` je async – volat přes `setTimeout(..., 30)` po `el.innerHTML`
- 🔗 Viz: TODO-059, ADR-038

### 🚧 Měsíční report – záložky period **(Session 7.1)**
- Záložky 7D / 1M / 3M / 6M / 12M + 📋 Poradce přidány do `renderReport()`
- `helpers.js`: `getTxByRange()`, `getMonthsInRange()`
- ⚠️ Přepočet dat dle periody nefunguje – viz OPEN-028, TODO-067
- 🔗 Viz: TODO-057

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

### Offline integrace transakcí **(S4 → S6)**
- ✅ API `saveTxOffline()` existuje **(S4)**
- ✅ **(Session 6 update):** Offline větev přidána do `save()` v `app.js`
- ⚠️ Čeká na ověření uživatelem v reálném provozu
- **🔗 Cross-reference:** `todo.md` TODO-002, `decisions.md` ADR-028

### Bubble chart – Gradient varianta **(Session 7.1)**
- ✅ Záložka C implementována
- ⚠️ V reálných datech nejsou sdílené podkategorie → `SHARED_NAMES` prázdná
- ❌ Chybí fallback UI nebo demo mode
- **🔗 Cross-reference:** OPEN-027, TODO-069

### Měsíční report – záložky period **(Session 7.1)**
- ✅ UI záložek přidáno (7D/1M/3M/6M/12M/Poradce)
- ❌ `computeHealthScores()` ignoruje `rMonth/rYear`, bere `S.curMonth/S.curYear` hardcoded
- **Status:** UI hotové, datová logika chybí
- **🔗 Cross-reference:** OPEN-028, TODO-067, TODO-065

### Plány a cíle – záložka se nezobrazuje **(Session 7.1)**
- ✅ `nakup.js` má správný kód pro záložky
- ❌ Záložka `🎯 Plány a cíle` se v UI nezobrazuje
- **Debug checklist:** `id="nakupTabs"` v HTML? `modalGoal` + `modalGoalDeposit` přítomny? `nakup.js?v=todo056` v script tazích?
- **🔗 Cross-reference:** OPEN-029, TODO-072

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
- **Bundling** (Vite/esbuild) – 25 JS souborů do jednoho → `todo.md` TODO-035

### Vizualizace **(Session 7.0/7.1)**
- **Chord diagram** – propojení kategorií (Statistiky nebo Report poradce) → TODO-054, ADR-031
- **Treemap v 12M záložce reportu** – základ `bTreemap()` hotový v `ui.js` → `todo.md` TODO-062
- **Tooltip při hover na bublinu** – prototyp v `ff-grafy-final.html` → `todo.md` TODO-070
- ~~**Progres schema fin. zdraví v reportu**~~ ✅ VYŘEŠENO S7.1 – `renderHealthProgressSchema()` + `drawHealthRing()` v `advisor.js`. → `todo.md` TODO-071

### Opravy S7.1 **(Session 7.1 – otevřené)**
- **Měsíční report – přepočet dat dle periody** → TODO-067, OPEN-028
- **Bubble chart – bubliny pod lištu** → TODO-068, OPEN-026
- **Sdílené tagy v Gradient variantě** → TODO-069, OPEN-027
- **Plány a cíle – záložka se nezobrazuje** → TODO-072, OPEN-029
- **Bank sekce – NaN/0 při prázdném měsíci** → TODO-064, OPEN-030

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

## 🔧 Verzování a systém **(Merge Session 1-4)**

- **Verzovací systém** – Claude Code Memory Rules pro konzistentní changelog **(Session 4)**
- **Cache-busting** – SHA256 hashe prvních 8 znaků pro všechny změněné `.js` soubory **(Session 4)**

---

## 📊 Statistiky funkčnosti **(Merge Session 1-4)**

| Oblast | Hotovo | V práci | Plánováno |
|--------|--------|---------|-----------|
| Základní finance | 13 | 0 | 0 |
| Grafy | 4 záložky | 1 | 1 |
| AI funkce | 4 (+ advisor) | 0 | 1 |
| Sdílení | 3 | 0 | 0 |
| Import | 5 | 0 | 2 |
| Bezpečnost | 3 | 0 | 0 |
| Email | 1 | 0 | 0 |
| Platby | 0 | 0 | 1 |
| Offline | 2 | 0 | 1 (SW) |
| Admin | 8 | 0 | 0 |
| Komunita | 3 | 0 | 1 |
| Monitoring | 1 | 0 | 0 |
| Vizualizace | 3 (Cluster/Drill/Treemap) | 1 (Gradient⚠️) | 2 (Chord/Tooltip) |
| Nové S7.1 | 3 (Budoucí/Aktiva/Poradce) | 2 (Plány⚠️/Report periody) | 0 |
| **Celkem** | **~53** | **4** | **8** |

**(Session 7.0 update):** PDF import stabilizován ✅, Bubble chart 4 varianty ✅, Firebase Rules referrals ✅.
**(Session 7.1 update):** Nové sekce Plány a cíle ⚠️, Budoucí platby ✅, Finanční aktiva ✅, Report poradce ✅. Měsíční report záložky 🚧.

---

## 🔗 Cross-reference mapa

| Téma | Kde hledat další info |
|---|---|
| Otevřené bugy funkcí | `bugs.md` sekce OPEN-001 až OPEN-030 |
| Konkrétní úkoly / priority | `todo.md` sekce P1–P4, TODO-056 až TODO-072 |
| Architektonická rozhodnutí | `decisions.md` sekce ADR-001 až ADR-040 |
| Struktura souborů | `architecture.md` sekce 2 |
| Datový model | `architecture.md` sekce 4 |
| Firebase Rules | `architecture.md` sekce 8 |
| Cloudflare Worker | `architecture.md` sekce 7 |
| Bezpečnost + security incidents | `context.md` + `architecture.md` sekce 7 (API klíče) |
| Sentry integrace | `architecture.md` sekce 14, `decisions.md` ADR-025 |
| PDF import systém | `architecture.md` sekce 17 |
| Bubble chart systém | `architecture.md` sekce 16, `decisions.md` ADR-030, ADR-037 |
| Nové soubory S7.1 | `architecture.md` sekce 3 (budouci.js, assets.js, advisor.js) |

---

## Funkce Session 8–10 (v6.65 → v7.31)

### Finanční radar **(Session 10)**
- Včasné varování: růst výdajů, kritické zatížení splátkami, předplatné ke kontrole, nízké odkládání.
- Predikce: zůstatek konce měsíce, výhled 3 měsíce, kvartální projekce.
- Denní graf „Měsíc den po dni": kumulativní výdaje, čára příjmu (reálný měsíční), ideální tempo, predikce zbytku, denní sloupce; interaktivní hover; i pro minulé měsíce.
- Volné peníze: „Můžeš ještě utratit do konce měsíce" (po rezervě na budoucí platby).
- „Kam směřuju": 4 sloupce (Příjem / Plánovaný výdej / Budoucí platby / Cashflow).
- Nadcházející platby: 3 sloupce = 3 měsíce (suma per měsíc), opakující se platby viditelné.
- Trend výdajů po týdnech od výplaty (Kč/den) + tabulka.

### Predikce **(Session 10)**
- 3 kumulativní křivky: YTD (skutečnost) / Předpoklad (skutečnost + predikce) / Odhad roku.
- Záložka Sezonalita: reálná sezonalita (z dat) vs pevný model aplikace.
- Záložka Spending Pace: aktuální tempo vs historický průměr ke stejnému dni; verdikt.
- Tlačítko „Skrýt prázdné podkategorie".

### Komunita / COICOP **(Session 10)**
- 13 oddílů CZ-COICOP 2024, tříúrovňový rozklikávací strom.
- Přepínač osoba / domácnost + OECD přepočet.
- Rodinný souhrn (sčítání výdajů partnerů v režimu Domácnost).

### Finanční obraz **(Session 10)**
- FFR (Financial Freedom Ratio), inflace životního stylu, Income Diversification (HHI), Wealth Momentum, Asset Allocation donut.

### Sdílení & Partneři **(Session 10)**
- Read-only model: partneři se vidí navzájem, každý zapisuje vlastní data.

### Analýza účtenek **(Session 9–10)**
- Item-level kategorizace, split na více transakcí dle kategorií.
- itemStats (Firebase): cena/kg, shrinkflation, historie cen.
- Banner „Datum v budoucnosti – zkontroluj".

### Skóre finančního zdraví **(Session 10)**
- Deterministický výpočet, sjednoceno na `computeHealthScores().overall` (4 komponenty + bonus konzistence).

### Monetizace **(Session 10, připraveno/blokováno)**
- Premium systém + donate UI připraveny; Stripe Payment Links + webhook navrženy (ADR-053), blokováno (IČO/OSVČ). Zámky zatím vypnuté.

---

*Konsolidováno: 2026-04-16 | Doplněno z Milan merge S1-4: 2026-05-15 | Session 6 patch: 2026-05-15 | Session 7.0+7.1 patch: 2026-05-15 | Session 8–10 doplnění: 2026-06-01 | Sessions: 1 → 10 | Autor: Milan Migdal*
*Poznámka ke konsolidaci: Claude consolidated merge S1-4 jako základ + Merge Session 1-4 + patch_s6.md (Session 6) + patch-session7-COMBINED(1).md (Sessions 7.0 + 7.1) + Session 8–10 doplnění (Summary_s9, Summary_s10).*


---

## Session 11 – nové funkce (v7.50 → v7.69)

### Landing page v4 **(Session 11, v7.51)**
- Outcome-framing místo feature-listu. Sekce: hero s receipt-breakdown WOW mockup (bankovní výpis → detailní položky), nepřítel „finanční slepota" (10–20 % příjmů mizí), user journey Den 1→3→10→30, banka-vs-FinanceFlow srovnání, founder story (trust), FOMO pricing (zakládající 49 Kč, 347/500 míst), viral score card (82/100, lepší než 71 % lidí v ČR), testimonials (Petr/Ostrava, Jana/Brno, Martin/Praha – placeholder).
- **Fonty:** Syne + Plus Jakarta Sans. **Barvy:** #080c12 (pozadí), #7dd34f (accent).
- **Soubor:** `index.html` (landing), `app.html` (původní index.html přejmenován)

### Affiliate + Partner pairing sjednoceno **(Session 11, v7.62/v7.68)**
- Jeden `?ref=KÓD` odkaz v sekci Sdílení → affiliate tracking + partnerské párování.
- `pairPartners(ownerUid, myUid)`: bidirektivní přidání do `users/{uid}/partners/`, +50 bodů (dedup v `partner_bonus/{owner}_{me}`).
- ADR-058. `share.js`.

### Receipt datový model lineTotal + discount **(Session 11, v7.62)**
- Pole `lineTotal` (skutečně zaplacená cena řádku) a `discount` přidána do AI promptu a datového modelu.
- Helper `lineAmt(it)` – zpětně kompatibilní zdroj ceny položky.
- ADR-059. `worker.js` + `receipts.js`.

### Receipt items v transakcích (Split styl) **(Session 11, v7.64)**
- Transakce ze skenované účtenky zobrazí badge **📷 N pol. ▾** – klik rozbalí položky (grid Položka|Kč|Mn.) stejně jako Split.
- Tlačítko **📷** v listu transakcí otevře konkrétní účtenku v Historii (`openReceiptInHistory(date, store)`).
- `buildTxRow()` v `ui.js`. `openReceiptInHistory()` v `receipts.js`.

### Sync receipt edits → transakce **(Session 11, v7.68)**
- Editace účtenky v Historii (rpSave) nyní synchronizuje tagy + receiptItems do propojených transakcí.
- Funkce `syncReceiptToTransactions(r)` – matchuje transakce podle `receiptDate` + `receiptStore`.
- `receipts.js`.

### Grafy: sdílené filtry Roční↔Vsechny + kompaktní UI **(Session 11, v7.60)**
- `grafFilterWrap` (kategorie, podkategorie, typ) sdílen pro záložky Měsíční, Roční i Všechny roky.
- Přepnutí mezi Roční a Všechny roky zachová výběr filtru.
- Duplikátní nav `grafMonthNav`/`grafYearNav` odstraněn – karty mají vlastní navigaci.
- Legenda měsíčního grafu přesunuta do HTML `#mesicniLegend` (0.82rem, čitelné).
- `charts.js` + `app.html`.

### Virtuální peněženka v převodech **(Session 11, v7.68)**
- „Převod mezi peněženkami" → optgroup **🎯 Virtuální peněženka – cíle** v dropdown „Do peněženky".
- Převod do cíle = výdaj z peněženky (v `S.transactions`) + vklad do `goal_deposits/{id}`.
- `premium.js`: `renderTransferDropdowns()` + `doTransfer()`.

### GA4 analytika **(Session 11, v7.63)**
- Tag `G-F2Z8DK4RR0` na landing page (`index.html`) a appce (`app.html`).
- App: `send_page_view:false` + manuální `page_view` event v `showPage()` (helpers.js) pro každý přechod.
- ADR-057.

### Grafy: Obchody tab přepracován **(Session 11, v7.64)**
- Odstraněna ✎/✕ tlačítka (editace patří do Historie).
- Items grid Položka | Kč (lineAmt) | Mn. (qty+unit). Sleva badge u zvýhodněných položek.
- `receipts.js`.

---

*Aktualizace Session 11: 2026-06-09*

---

# SESSION 12.1 (v7.70 -> v7.94)

### Runway „Do výplaty" **(v7.71, v7.75, v7.76)**
Radar přepínač Měsíc/Do výplaty; cyklus výplata→výplata, denní limit, stacked týdenní graf, minReserve 🛡️, projekce konce cyklu, srovnání s minulým cyklem, víkend/všední tempo.

### Produktová databáze ČSÚ **(v7.72)**
product-groups.json (402 COICOP skupin, 427 reprezentantů, 1066 keywords); productGroupLookup → {code, tag, group}; prefill hook v náhledu účtenky.

### COICOP správa **(v7.73, v7.74)**
Admin „Podkategorie bez COICOP" + assignSubCoicop; volba „0 – mimo COICOP"; AI auto-kategorizace vrací coicop chip.

### Onboarding průvodce **(v7.76)**
renderOnboardingCard – 5 kroků, ff_onboardHide.

### Email + heslo přihlášení **(v7.79, v7.80)**
Google OAuth + Email/heslo (přepínač Přihlásit/Registrovat), 22 českých chybových hlášek, reset hesla, zobrazit/skrýt heslo. „Pokračovat bez účtu" odstraněno z UI.

### Nákupní DNA – obchody **(v7.78, v7.81, v7.82)**
Tabulka „Obchody v měsíci" + spojnicový graf „Trend útrat dle obchodů" (storeBrandColor 20 CZ řetězců, badge s iniciálou na průsečíku, dotyk). Dedup obchodů (NFD). Řazení dle sumy, min 1 návštěva.

### Transfery = pohyb majetku **(v7.83, v7.84, v7.87)**
isTransferTx; přesuny vyloučeny ze statistik, započítány do zůstatků peněženek. Šablona typu ↔️ Přesun (opakovaná platba na spoření) – pár transakcí s transferId. V budoucích platbách neutrální barva.

### Mobilní transakce – karty **(v7.84, v7.90)**
Tap na řádek → editace; akční tlačítka 🗑/✂️ v modalu. Mobilní karta (≤820px): kompletní částka, podkategorie, zůstatek, tagy, bez tlačítek. Účtenkové řádky rozbalují položky, split rozbaluje děti.

### Průběžný zůstatek peněženky **(v7.85)**
„(644 035 Kč)" pod částkou transakce (Wallet styl), chronologicky per peněženka.

### Klikací projekt v transakci **(v7.85)**
📁 badge → openProjectDetail.

### Zobrazení slev **(v7.85)**
receiptSavings z it.discount (detekce z S10): „💸 ušetřeno" na účtence + karta „Ušetřeno slevami" (měsíc/rok/celkem + 6M průběh).

### Finanční aktiva dle likvidity + track record **(v7.86)**
Viz ADR-063. Graf vývoje hodnoty (osy, čára vloženo, tooltip), zisk/ztráta ▲/▼ v % i Kč.

### Uvítací hláška **(v7.89)**
/welcomeMessage – modal jednou při prvním spuštění; admin editor v Oznámení + náhled; verze hlášky umožní zobrazit znovu.

### Tier systém + zámky **(v7.91, v7.92)**
Free/Premium/Pro (viz ADR-062). Zámky: AI Rádce, Analýza účtenek, Nákupní seznam, Sdílení/rodina, PDF import = Premium; CSV/Excel zdarma; Import z banky (SMS) = admin.

### Zabezpečení **(v7.79)**
firebase.json: 5 bezpečnostních HTTP hlaviček + ignore rozšířen (database_rules.json, *.yml, dev HTML). Playwright starter kit.

### Predikce + Dashboard vylepšení **(v7.93, v7.94)**
Treemap tooltipy + 3 vrstvy; Tempo verdikt pod grafem; predikční tabulka nowrap + legenda barev; sezonalita osa Y po 10%; Radar „Kam směřuju" přepracovaná logika (žádný překryv sloupců) + čára skutečného stavu.

---

---

*Aktualizace Session 12.1: 2026-06-14 | v7.70 → v7.94 | FIX-129-146, TODO-122-136, ADR-060-064*


---

## Session 13 (v8.10 -> v8.24)

### Velky refaktor cilu - reverz a mena (v8.10->v8.11)
Vklad do cile pamatuje puvod -> smazani cile/vkladu/splneni smaze parovy vydaj -> penize zpet (zadne dvoji odecteni). Menovy prepocet (toCZK), prevod z cile zpet, hlidani cilove castky, splneni (goalMarkDone), zalozky Aktivni/Splneno. Virtualni penezenka v Cistem majetku.

### Sjednoceny modal Prani/Cil (v8.12)
Oba typy maji vsechna pole, lisi se popisky. Klikaci sada 20 ikon (WISH_ICONS). Worker URL import cte cenu z JSON-LD a meta tagu.

### Slouceny komunitni bar Ja vs komunita (v8.17/19)
Dva bary slouceny do jednoho: modra=prumer, zelena=ty (pod prumerem), cervena=prebytek. COICOP divize s oficialnimi nazvy.

### Bezove (sepia) tema (v8.18)
Teply ton setrny k ocim. 4. moznost v Nastaveni (2x2: Tmave/Bezove/Svetle/Auto).

### Skore aktivity uzivatele (v8.18)
Admin detail: bar Neaktivni-Prumerny-Aktivni z poctu transakci + cerstvosti. Bez nove telemetrie.

### Tabulka transakci - sloupce Typ platby + Penezenka (v8.18)
Jen web/desktop (grid 7->9). Na mobilu jen filtry.

### Systemova kategorie Virtualni presun (v8.16)
Pro ne-admina gold ohraniceni + skryta tlacitka. Admin ma plnou kontrolu.

### Uvitaci hlaska - emoji palety (v8.16)
Klikaci sada 28 emotikonu pro ikonu i text.

### Export transakci do CSV (v8.20)
Nastaveni -> Data -> Export transakci (CSV). Modal s vyberem obdobi a typu. JSON zaloha zvlast.

### Vyhledavani napric mesici (v8.20)
Prepinac Hledat ve vsech mesicich.

### Mesicni checklist na dashboardu (v8.20)
Opakuje se kazdy mesic: pridej vyplatu + 20 transakci. Resetuje se zmenou mesice.

### Stranka napovedy (v8.20)
napoveda.html pro financeflow.cz.

### API tracking - tokeny + naklady (v8.21)
Worker uklada tokeny + odhad nakladu v Kc per user/typ. Admin detail: Spotreba AI. Admin Statistiky: Komunitni aktivita.

### Oznaceni sdilenych podkategorii (v8.23)
Podkategorie sdilena se samostatnou kategorii ma zlaty ramecek + sipku + tooltip.

### Verzovaci hlavicka souboru (v8.24)
Kazdy zmeneny soubor ma na zacatku // FinanceFlow vX.XX soubor datum.

---

*Aktualizace Session 13: 2026-06-20 | v8.10 -> v8.24*


---

## Presuny, frekvence vyplaty, dashboard (v8.25-v8.27)

### Typ kategorie Presun (v8.25)
Novy typ transfer vedle Prijem/Vydaj/Oboji. Transakce se nepocitaji jako vydaj (nesnizi majetek), penezenka se upravi. Vychozi: Investice, Trading, Financni rezerva, Sporeni, Fondy, Penzijko.

### Frekvence vyplaty (v8.26)
Mesicne / 14denne / tydne / 2x mesicne / nepravidelne. Runway do vyplaty respektuje frekvenci. Nepravidelny rezim pocita cyklus z prumerneho odstupu realnych prijmu.

### Dashboard karta Moje uspory a investice (v8.27)
Kolik penez smeruje do Investic a Rezervy/Sporeni (kumulativne + tento mesic) + rozpad podle kategorie. Pocitano z transfer-transakci.

---

*Doplnek: v8.25-v8.27*


---

## Session 14 (v8.28 → v8.57)

### Propojení Transakce → Finanční aktiva podle podkategorie **(v8.49, ADR-076)**
Přesun do přesunové kategorie (typ `transfer`) se propisuje do aktiva pojmenovaného podle PODKATEGORIE (ETF, Akcie, DIP, Podílové fondy…). Klíč `catId::subcat`. Vklady v cizí měně (EUR/GBP) → CZK dle ČNB. Baseline model: `value = baseline + (invested − investedAtBaseline)`. Adopce ručních aktiv stejného jména. Ochrana smazaných (`noSyncKeys`). Tlačítko „🔄 Přepojit" + diagnostický alert.
- **🔗 Cross-reference:** ADR-076, FIX-160, TODO-143

### Finanční aktiva — 4 sekce + Net Worth 5 karet **(v8.54, ADR-077)**
Sekce: 👛 Peněženky (ze správy peněženek) · 🛟 Finanční rezerva (likvidní — spoření, spořicí účet) · 📈 Střednědobá a investiční · 🏠 Fyzická a dlouhodobá. Net Worth = 5 responzivních karet (Peněženky, Fin. rezerva, Střednědobá, Fyzická, Závazky).
- **🔗 Cross-reference:** ADR-077, assets.js `assetBuildLiquiditySections`, `assetLiqTotals`

### Likvidita u přesunových kategorií **(v8.54)**
Každá přesunová kategorie má volitelný stupeň likvidity (`liq`), nastavitelný v editaci kategorie. Řídí zařazení do sekce Finančních aktiv. Bez nastavení = automatika z názvu.
- **🔗 Cross-reference:** ADR-077

### Historie hodnoty aktiva — vklady z transakcí + graf **(v8.57, ADR-078)**
Historie zobrazuje vklady z transakcí (📥 read-only, bez X) i ruční ocenění (📊, mazatelné). Graf vývoje hodnoty se ukáže, pokud `ocenění + vklady ≥ 2`. Helper `assetDepositEvents(asset)`.
- **🔗 Cross-reference:** ADR-078

### Kurzy měn — záložka + živé ČNB **(v8.35–v8.36)**
Modul `kurzy.js` + Worker endpoint `/cnb` (parser denního kurzovního lístku ČNB). 30 měn, hvězdička připne nahoru (localStorage). Živé kurzy napájejí `_FX_RATES` (přepočty aktiv, peněženek, cílů). Převodník u zadávání transakce. Cache: klient `no-store`, Worker edge 30 min + `no-cache`.

### COICOP detailní DNA — fáze 1–4 **(v8.37–v8.40)**
Modul `coicop.js`. Rozpad výdajů dle COICOP (13 divizí, podtřídy, třídy) z `product-groups.json` (402 tříd) přes `productGroupLookup`. Karty s porovnáním ČR. Tag filtr v „Nejčastěji nakupované položky".
- **🔗 Cross-reference:** ADR-005, FIX-170, TODO-131 ✅

### Excel filtr Období v Transakcích **(v8.41)**
Tlačítko „📅 Období" + ikona 🔽 u sloupce DATUM. Panel: výběr roku (vč. „Všechny roky") + zaškrtávací měsíce → filtr přes více měsíců i „leden napříč roky". Navigace měsíce filtr zruší.

### Swipe-to-edit na mobilních zařízeních **(v8.48–v8.51, ADR-075)**
Účtenkové transakce: swipe doleva → „Upravit" → otevře naskenovanou účtenku. Normální: tap edituje. Na webu (myš) viditelná tlačítka ✂✎✕📷. Detekce `pointer: coarse`.
- **🔗 Cross-reference:** ADR-075, FIX-163, FIX-165

### Funkční GDPR cookies **(v8.44)**
GA4 consent mode (výchozí `denied`), grant jen při souhlasu. Přepínač v Oznámení→Soukromí. Cookie banner na landing page.
- **🔗 Cross-reference:** FIX-172, TODO-137 ✅

### Admin záložka Růst **(v8.43)**
6 souhrnných karet, SVG sloupcový graf registrací (12 měs.), tabulka posledních 30 dní, expirované předplatné.

### Sticky hlavička tabulky transakcí **(v8.53)**
Hlavička sloupců (Datum/Kategorie/…) zůstává při scrollování. Oprava: `#txCard{overflow:visible}`.
- **🔗 Cross-reference:** FIX-164

### Peněženky — cizí měna ve vlastním sloupci **(v8.55)**
Cizí měna a CZK hodnota mají pevné sloupce s `flex-shrink:0` → čísla zarovnaná pod sebou. Písmo `tabular-nums`.

---

*Aktualizace Session 14: 2026-06-29 | v8.28 → v8.57*
