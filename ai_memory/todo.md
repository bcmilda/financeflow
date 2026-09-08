# FinanceFlow – TODO & Roadmap

> Konsolidovaný dokument ze **4 sessions** (`todo.md` → `todo-1.md` → `todo-2.md` → `TODO-3.md`).
> Úkoly přečíslovány pod unikátní ID `TODO-001+`. Každý záznam označen zdrojovou session: `**(Session N)**`.
> Poslední aktualizace: konsolidace 4 sessions, 2026-04-16.

---

## 📋 TL;DR – Stav TODO

| Priorita | Otevřené | Příklady |
|---|---|---|
| 🔴 Kritické (P1) | 5 | Firebase Rules admin, Offline integrace v transactions.js, Email (EmailJS), Dělení PDF, Grafy fix |
| 🟡 Střední (P2) | ~17 | Error handler, Sentry, JSON validace, Box plot, Landing page, Playwright, Nové kategorie, AI mapování, **Nákupní seznam průzkum**, **COICOP rework** |
| 🟢 Nízké (P3) | ~20 | Service Worker, Komprese fotek, Platební systém, Android Notifikace, Google Play, Bundling, Měny, EN/SK |
| 🔵 Nice-to-have (P4) | ~7 | Exporty, Push notif, Vlastní doména, Motivy, Sdílení read-only |
| 💡 Nápady | ~20 | Gamifikace, AI report, Google Sheets, Hlas, Portfolio, Multi-user |

**Celkem otevřených úkolů:** ~70 (mnoho se napříč sessions překrývá – viz sekce „Překryvy a konflikty")

---

## ⚠️ Překryvy a konflikty napříč sessions

| # | Téma | Sessions | Stav / rozhodnutí |
|---|---|---|---|
| A | **Platební provider** | S1: **GoPay** 99/699 Kč vs S3: **Stripe/Paddle** | 🔴 **Otevřené rozhodnutí** – nutno vybrat jeden |
| B | **PWA / Service Worker / offline** | S1 P2, S2 Nízká, S3 P3, S4 Nízká (TODO-07) | ⚠️ Částečně hotové – S4 přes IndexedDB (`offline-sync.js`), zbývá Service Worker pro plný offline |
| C | **Push notifikace** | S1 P4, S2 Vysoká, S3 P3 | ⚠️ Různá priorita – sjednoceno na P3 (viz níže) |
| D | **Export PDF/XLSX** | S1 P4, S2 Střední, S3 P3 | ⚠️ Sjednoceno na P3 |
| E | **Měny (EUR/USD/GBP)** | S1 P4, S2 Nízká, S3 P3 | ⚠️ Sjednoceno na P3 |
| F | **Lokalizace EN/SK** | S1 P3, S2 Nízká | Sjednoceno na P3 |
| G | **Google Play** | S2 Nízká, S3 Q4 milestone | P3 |
| H | **Playwright testy** | S3 P2 vs S4 Nízká (TODO-08) | S3 je novější, ale S4 je nejnovější → P3 (detail TODO-08) |
| I | **Bundling (Vite/esbuild)** | S2 Nízká – jen zde | P3 |
| J | **Komunita – průměry domácností** | S2 Nápady, S3 P3 | P3 |
| K | **Nákupní seznam** | S2 Vysoká | ⚠️ **Pravděpodobně dokončeno, ale nutno ověřit** – existuje `nakup.js` v S3+, uživatel si nepamatuje, co feature dělá a jak funguje → otevřít jako TODO-047 (průzkum) |
| L | **COICOP auto-učení** | S1 P2 | ✅ Pravděpodobně dokončeno (v S2+ existuje `coicop_corrections` v Firebase) |
| M | **PIN pad** | S3 P1 | ✅ **Dokončeno** (potvrzeno uživatelem – viz `bugs.md`) |
| N | **Grafy fix (ověřit po v6.41)** | S3 P1 | 🔴 **Reopen** – po S4 (4-vrstvá oprava) stále nefunguje, viz `bugs.md` OPEN-002 |
| O | **Firebase Rules admin** | S4 TODO-01 | 🔗 Přímo spojeno s otevřeným auditem v `architecture.md` sekce 8 |

---

## 🔴 P1 – KRITICKÉ ÚKOLY (blokují funkčnost nebo hlavní roadmap)

### TODO-001 · Firebase Rules pro Admin panel **(Session 4 TODO-01)**
- **Soubor:** Firebase Console → Realtime Database → Rules
- **Problém:** `loadLowConf()` a `loadMappingStats()` vrací 403, dokud nejsou nastavena pravidla.
- **Akce:** Přidat do Firebase Rules:
  ```json
  "users": {
    ".read": "auth.uid === 'LNEC8VNB2QPwIv6WWQ9lqgR4O5v1'",
    "$uid": { ".read": "auth.uid === $uid", ".write": "auth.uid === $uid" }
  }
  ```
- **🔗 Cross-reference:** Přímo souvisí s `architecture.md` sekce 8 (otevřený audit Rules) a `bugs.md` FIX-039.

### TODO-002 · Integrace offline transakcí do `transactions.js` **(Session 4 TODO-02)**
- **Soubor:** `transactions.js`
- **Problém:** `OfflineSync.saveTxOffline()` existuje, ale `transactions.js` ho nevolá – transakce offline stále selžou.
- **Akce:** Přidat offline větev:
  ```javascript
  if (!navigator.onLine && window.OfflineSync) {
    await window.OfflineSync.saveTxOffline(txData);
    return;
  }
  ```

### TODO-003 · Email notifikace – EmailJS integrace **(Session 3 P1)**
- **Stav:** Resend free tier omezení + security incident s klíčem (viz `bugs.md` OPEN-001)
- **Akce:**
  1. Jít na `emailjs.com` → vytvořit účet
  2. Vytvořit Gmail Service
  3. Vytvořit Email Template (proměnné: `from_name`, `from_email`, `msg_type`, `message`)
  4. Zkopírovat: Service ID, Template ID, Public Key → předat Claudovi
  5. Přidat do `premium.js` (nahradí Worker fallback)
- **Časový odhad:** 30 minut
- **Alternativa:** Zůstat u Resend + verifikovat doménu (viz `bugs.md` OPEN-001 Řešení B)

### TODO-004 · Grafy – znovu opravit (reopen) **(Session 3 P1, reopen)**
- **Soubory:** `charts.js`, `helpers.js`
- **Stav:** Po 2 pokusech (S3 FIX-026 + S4 FIX-040) **stále nefunguje**
- **🔗 Cross-reference:** `bugs.md` OPEN-002
- **Další kroky:** Hard refresh (Ctrl+Shift+R), console.log v retry mechanismu, zvážit `ResizeObserver` místo časového retry, ověřit CSS parent šířku

### TODO-005 · Dělení PDF na části **(Session 2 Vysoká)**
- **Problém:** Velké PDF výpisy (>200 transakcí) selhávají s `stop_reason: max_tokens` (8192 už je maximum)
- **Akce:** Rozdělit PDF na chunky po 50 transakcích, volat API postupně, mergovat výsledky
- **🔗 Cross-reference:** `bugs.md` OPEN-003

---

## 🟡 P2 – STŘEDNÍ PRIORITA

### TODO-006 · Globální error handler **(Session 4 TODO-03)**
- **Problém:** Neočekávané JS výjimky mimo `try/catch` způsobí bílou obrazovku bez informace pro uživatele.
- **Akce:** Přidat do `app.js` nebo `helpers.js`:
  ```javascript
  window.addEventListener('error', (e) => showCrashScreen(e.message));
  window.addEventListener('unhandledrejection', (e) => showCrashScreen(e.reason));
  ```
- Implementovat „Něco se pokazilo – Zkusit znovu" obrazovku.

### TODO-007 · Monitoring chyb – Sentry **(Session 4 TODO-04)**
- **Problém:** Nevíme, kdy a kde aplikace padá u uživatelů, na jakých zařízeních.
- **Akce:** Integrovat Sentry.io (free tier):
  ```html
  <script src="https://browser.sentry-cdn.com/..."></script>
  ```
  ```javascript
  Sentry.init({ dsn: 'https://...@sentry.io/...' });
  ```

### TODO-008 · Validace JSON odpovědí z AI **(Session 4 TODO-05)**
- **Problém:** Když Claude vrátí jiný formát než se čeká, aplikace buď spadne nebo zobrazí prázdná data. `JSON.parse` bez schématu je křehký.
- **Akce:** Přidat ruční validaci schématu v `receipts.js` a `ai.js`:
  ```javascript
  if (!receipt.store || typeof receipt.total !== 'number') {
    throw new Error('Neplatný formát odpovědi – chybí store nebo total');
  }
  ```

### TODO-009 · Box plot přesun **(Session 3 P2)**
- **Soubor:** `charts.js`
- **Aktuálně:** Box plot je v záložce „Roční" (dává smysl až při více letech dat)
- **Akce:**
  - Záložka „Roční" – odebrat box plot
  - Záložka „Všechny roky" – přidat box plot per rok (srovnání roků)
  - Záložka „Měsíční" – přidat 12 box plotů (jeden per měsíc přes všechny roky)
- **🔗 Cross-reference:** `bugs.md` OPEN-005

### TODO-010 · Webová landing page **(Session 3 P2)**
- **Problém:** Žádná vstupní stránka pro nové uživatele (referral odkaz → rovnou login)
- **Obsah:** features, screenshots, FAQ, CTA „Vyzkoušet zdarma 30 dní"
- **Umístění:** `/landing.html` nebo samostatná doména
- **Potřeba pro:** referral systém

### TODO-011 · Predikce – ověřit modré hodnoty pro minulé měsíce **(Session 3 P2)**
- **Soubor:** `transactions.js` v6.41
- **Má být:** `actual` + modrá predikce (opacity 55%) + odchylka pro minulé měsíce
- **🔗 Cross-reference:** `bugs.md` OPEN-006

### TODO-012 · Nové kategorie z xlsx souboru **(Session 2 Vysoká)**
Sada kategorií k importu:
- **Auto:** Palivo, Pojištění, Opravy, STK, Havarijní pojištění, Parkovné
- **Předplatné:** YouTube Premium, Google One, Patreon, Noviny, Alza+, Aplikace
- **Sebevzdělání:** Kurzy, Školení, Cizí jazyk
- **Domácí mazlíček:** Jídlo, Pelíšek, Doktor
- **Trading:** Bybit, XTB
- **Pošta:** Zásilka, Clo, Dopis, Poštovné, Ověření podpisu
- **Cigarety:** Krabičky, Tabák, Příslušenství
- **Výběry ATM**
- **Rekonstrukce:** Zedník, Instalatér, Materiál, Kotel, Okna…
- **Zdraví rozšíření:** Oční, Zubní, Holič
- **Kultura a zábava:** Bruslení, Posilovna, Vstupenky, Kino, Zoo…

### TODO-013 · Kontrola duplikátů v záložce Transakce **(Session 2 Vysoká)**
- Tlačítko „🔍 Zkontrolovat duplikáty" v záložce Transakce
- Spustí stejný editor jako při importu
- Uživatel může duplicitní transakce smazat

### TODO-014 · AI pamatuje mapování kategorií **(Session 2 Střední)**
- Při importu si AI zapamatuje: „LIDL → Jídlo & Nákupy"
- Uložit do Firebase: `users/{uid}/categoryMappings/{keyword}`
- Při dalším importu auto-přiřadit

### TODO-015 · Notifikace opakovaných plateb **(Session 2 Střední)**
- Upozornit X dní před splatností šablony
- Propojit s Web Push (TODO-030)

### TODO-016 · Vylepšení mobilního zobrazení **(Session 2 Střední)**
- Editor importu na mobilu je těžko použitelný
- Dvousloupcový layout → jednosloupcový na mobilu

### TODO-017 · Příspěvky zaměstnavatele – kategorie **(Session 2 Střední)**
- Penzijko, Edenred benefit
- Typ: `income`, `stable: false`

### TODO-018 · Hlídání cen produktů **(Session 2 Vysoká – přeřazeno)**
- Historické ceny produktů z účtenek
- Notifikace při poklesu ceny pod nastavený práh
- Nastavení v sekci Nastavení → Notifikace
- **Pozn.:** Částečně řešeno ve Workeru (`type: 'price_alert'`), viz `architecture.md` sekce 7

### TODO-047 · Nákupní seznam – průzkum a dokumentace funkce **(konsolidace 2026-04-16)**
- **Soubor:** `nakup.js`
- **Problém:** Feature existuje od Session 3 (viz `architecture.md`), ale uživatel si nepamatuje, co přesně dělá, jak funguje a zda je plně implementovaná
- **Původní záměr (Session 2 Vysoká):**
  - Přidat stránku Nákupní seznam do menu
  - Našeptávač produktů z Firebase (`community/products/`)
  - Data se sbírají z analýzy účtenek (receipts)
  - Komunitní – čím více uživatelů, tím lepší databáze
- **Akce:**
  1. Otevřít `nakup.js` a projít kód – co reálně funkce umí?
  2. Projít UI v aplikaci – najít Nákupní seznam v menu a otestovat workflow
  3. Porovnat s původním záměrem (viz výše)
  4. Dokumentovat aktuální stav do `architecture.md`
  5. Rozhodnout, zda je feature kompletní, nebo potřebuje dokončit

### TODO-048 · COICOP – úprava a vylepšení **(konsolidace 2026-04-16)**
- **Problém:** Předchozí opravy COICOP enginu se uživateli nelíbí – potřeba přepracovat
- **Dotčené části:**
  - COICOP mapping engine (`receipts.js`)
  - Komunitní přehled – **upravit vzhled progres baru**
  - Keyword engine a auto-učení
- **Akce:**
  1. Projít aktuální COICOP implementaci a identifikovat konkrétní problémy
  2. Upravit vzhled progres baru u Komunitního přehledu (samostatný UX úkol)
  3. Zvážit rework mapping logiky, pokud aktuální přístup nevyhovuje
- **🔗 Cross-reference:** ADR-005 v `decisions.md` (COICOP jako globální klasifikace), `bugs.md` OPEN-017 (COICOP trend záložka prázdná), OPEN-018 (keyword engine diakritika)
- **Priorita:** Střední – ovlivňuje UX hlavní funkce aplikace

---

## 🟢 P3 – NIŽŠÍ PRIORITA (příští sprinty)

### TODO-019 · Service Worker pro plný offline **(Session 4 TODO-07)**
- **Problém:** Aplikace se bez internetu vůbec nenačte (žádný SW)
- **Akce:** Service Worker s cache-first strategií pro statické assety
- **Odhad:** 2–3 dny
- **Poznámka:** S4 částečně vyřešen přes IndexedDB (`offline-sync.js`), ale to řeší jen offline data, ne offline načtení aplikace

### TODO-020 · Automatizované testy – Playwright **(Session 3 P2 → Session 4 TODO-08)**
- **Stav:** Playwright nainstalován, žádné testy
- **Kritické flows:**
  - Přihlášení / odhlášení (Google)
  - Přidání výdajové transakce
  - Zobrazení dashboardu s daty
  - Grafy se renderují (canvas šířka > 0)
  - Analýza účtenky (mock Worker)
  - Offline uložení a sync
  - Predikce tabulka (bez JS chyb)

### TODO-021 · Komprese fotek v `analyzeMultiReceipt` offline větvi **(Session 4 TODO-09)**
- **Problém:** V offline větvi se konvertuje base64 → Blob ručně (atob loop). Fotky jsou již zkomprimované z `compressReceiptImage()`, ale konverze je neefektivní.
- **Akce:** Refaktorovat – ukládat Blob přímo při `addReceiptPhoto()` místo base64

### TODO-022 · Platební systém 💰 **(Konflikt mezi sessions)**
> ⚠️ **OTEVŘENÉ ROZHODNUTÍ:**
> - **(Session 1 P1)** GoPay (český provider)
> - **(Session 3 P3)** Stripe nebo Paddle (mezinárodní)
>
> Vyberte jeden – Stripe je jednodušší setup, GoPay je lepší pro CZ trh (české účty, QR platby).
- **Premium ceník:** 99 Kč/měsíc nebo 699 Kč/rok
- **Webhooky** pro aktivaci/deaktivaci Premium
- **Cíl Firebase:** `users/{uid}/premium/` – `type`, `trialUntil`, `premiumUntil`

### TODO-023 · Admin panel – správa členství **(Session 1 P1)**
- Datum registrace, typ plánu, délka předplatného
- Manuální přidělení/odebrání prémiového přístupu
- Referral propojení s affiliate systémem

### TODO-024 · Android NotificationListenerService **(Session 3 P3)**
- **Technologie:** React Native nebo Kotlin wrapper
- **Funkce:** Zachytává notifikace bank → parser → Firebase
- **Odhad:** 2–3 týdny MVP
- **🔗 Cross-reference:** `architecture.md` sekce 13 (plánovaná architektura)

### TODO-025 · Fio API napojení **(Session 1 P2)**
- Automatické stahování transakcí z Fio banky
- API token uložen v Firebase (šifrovaně)
- **Alternativa:** Open Banking (TODO-026) – univerzálnější, ale komplexnější

### TODO-026 · Open Banking API **(Session 2 Nízká)**
- PSD2 licence a certifikáty
- Automatický import transakcí ze všech bank (nejen Fio)
- Notifikace nových plateb v reálném čase
- **Poznámka:** Velmi komplexní, vyžaduje měsíce vývoje a regulatorní schválení

### TODO-027 · Google Play vydání **(Session 2 Nízká / Session 3 Q4)**
- TWA (Trusted Web Activity) wrapper
- Vývojářský účet Google Play (25 USD)
- Ikony ve všech rozlišeních
- Odkaz „Ohodnotit aplikaci" v O aplikaci

### TODO-028 · Lokalizace CS/EN/SK **(Session 1 P3 / Session 2 Nízká)**
- Infrastruktura existuje (`_settings.lang`, `PAGE_TITLES` pro vícejazyčnost)
- Chybí: přeložené texty v UI, přeložené chybové hlášky

### TODO-029 · Podpora více měn **(S1 P4 / S2 Nízká / S3 P3)**
- EUR, USD, GBP při importu
- Kurzy z ČNB API nebo ECB
- Nastavitelné směnné kurzy
- Konverze v reportech

### TODO-030 · Web Push notifikace **(S1 P4 / S2 Vysoká / S3 P3)**
Sjednoceno na P3. Typy notifikací:
- Hlídání cen (TODO-018)
- Opakované platby (TODO-015)
- Narozeniny
- Překročení měsíčního limitu kategorie
- „Dnes tě dluh stál X Kč"
- Připomínka blížící se splátky

### TODO-031 · Export CSV / PDF / XLSX report **(S1 P4 / S2 Střední / S3 P3)**
Sjednoceno na P3:
- Měsíční nebo roční přehled ke stažení
- PDF s grafem + tabulkou kategorií
- Excel (SheetJS)

### TODO-032 · Email týdenní report **(Session 3 P3)**
- Automatický souhrn příjmů/výdajů
- Cron přes Cloudflare Workers Scheduled Triggers

### TODO-033 · Automatická pravidla (auto-kategorizace) **(Session 3 P3)**
- „Shell" → Doprava/Benzín, „Albert" → Jídlo/Supermarket
- UI pro správu pravidel v nastavení

### TODO-034 · Komunita – průměry výdajů **(S2 Nápady / S3 P3)**
- Anonymní srovnání s průměrem podobných domácností
- Firebase `/community/` struktura připravena

### TODO-035 · Bundling (Vite / esbuild) **(Session 2 Nízká)**
- Sloučit 22 JS souborů do jednoho minifikovaného
- Rychlejší načítání
- **🔗 Cross-reference:** `bugs.md` OPEN-010

### TODO-036 · Přesunout COICOP / Srovnání ČR do vlastní sekce **(Session 1 P3)**
- Aktuálně v záložkách Analýzy účtenek
- Zaslouží si vlastní stránku: `page-coicop`

### TODO-037 · Podkategorie v grafech **(Session 1 P3)**
- Souhrn výdajů a Měsíční report zobrazují jen kategorie, ne podkategorie
- Drill-down kliknutím na kategorii

### TODO-038 · Porovnání cen mezi obchody **(Session 1 P3)**
- Záložka „Obchody" v analýze účtenek
- Kde je který produkt nejlevnější

### TODO-039 · Split transakce – automatický z účtenky **(Session 1 P2)**
- Po skenování účtenky → každá položka = vlastní podtransakce
- Parent = celková částka účtenky

---

## 🔵 P4 – NICE TO HAVE

### TODO-040 · Vlastní doména **(Session 2 Střední – posunuto na P4)**
- Místo `financeflow-a249c.web.app`
- Potřeba pro Google Play a Privacy Policy URL

### TODO-041 · Světlý/tmavý motiv **(Session 1 P4)**
- **Stav:** ✅ Částečně hotovo (existuje `applyTheme()`), ale viz `bugs.md` OPEN-020 (Auto téma)

### TODO-042 · Více měn v jedné peněžence + auto kurz **(Session 1 P4)**
- Různé peněženky v různých měnách
- Automatický kurz z ECB API
- **Souvisí s TODO-029** (globální podpora měn)

### TODO-043 · Sdílení přehledu – read-only link bez přihlášení **(Session 1 P4)**

### TODO-044 · Google Pay notifikace **(Session 2 Nízká)**
- Automatický import plateb z Google Pay
- Propojení přes Intent / API

### TODO-045 · ~~Verze v „O aplikaci" sekci~~ ✅ HOTOVO **(Session 4 TODO-06)**
- **Problém:** Verze v „O aplikaci" dashboardu ukazovala v6.35 zatímco Admin panel měl v6.45 – nesoulad
- **Stav:** ✅ Vyřešeno Memory Rules pro Claude Code (potvrzeno uživatelem)

### TODO-046 · Offline mode – explicitní indikátor **(S1 P2 / S2 Nízká)**
Indikátor stavu připojení v UI. Částečně hotové (offline badge pro pending účtenky).

---

## 💡 NÁPADY (nezavázané, bez prioritizace)

### Gamifikace a engagement
- Gamifikace: „Tento měsíc jsi ušetřil X Kč oproti průměru 🎉" **(S1)**
- Odznaky za dosažení cílů spoření **(S2)**
- Odznaky za finanční cíle **(S3)**

### AI / Automation
- AI měsíční report: Claude automaticky shrne měsíc a navrhne úspory **(S1)**
- Chatbot pro rychlé přidání transakce hlasem **(S2)**
- Hlasové zadávání transakcí – Web Speech API **(S3)**
- OCR pro papírové výpisy (foto → transakce) **(S3)**

### Integrace
- Google Sheets export **(S1)**
- Google Calendar – narozeniny, výdaje **(S3)**
- Heureka/Alza – sledování cen přání **(S2)**
- Investiční portfolio tracker (propojení s brokerem) **(S3)**

### UX
- Kategorie s „limitem" – barevné upozornění při překročení **(S1)**
- Darkpattern detektor – upozornění na automaticky obnovující se předplatná **(S1)**
- Rodinný rozpočet s cílovými částkami per kategorie **(S2)**
- QR kód pro sdílení přístupu s partnerem **(S2)**
- Sdílení účtenky přes QR kód **(S3)**

### Mobile / Platform
- Widget pro Android (dnešní výdaje) **(S2 / S3)**
- Multi-user household (více než 2 lidé) **(S3)**
- Podpora pro Slovensko (EUR, IBAN) **(S3)** — **souvisí s TODO-028** (lokalizace SK)

### Advanced financial
- Daňové přiznání – přehled příjmů z podnikání **(S3)**
- Srovnání s průměrem podobné domácnosti (anonymní) **(S2)** — **souvisí s TODO-034**

---

## ✅ DOKONČENO (historicky napříč sessions)

### V Session 3 (v6.35 → v6.41)
- [x] Nastavení (téma, PIN logika, export)
- [x] Sdílení dat s partnerem
- [x] SMS import (debug textové pole)
- [x] Duplikáty (Jaro-Winkler)
- [⚠️] Nákupní seznam (`nakup.js`) — **nutno ověřit funkčnost** (viz TODO-047)
- [x] Kalendář (`kalendar.js`)
- [x] Predikce v2
- [x] Resend email integrace (Worker)

### V Session 4 (v6.41 → v6.44)
- [x] BUG-01 Save bar nezmizí (`premium.js`)
- [x] BUG-02 Auto téma – ⚠️ reopened (viz `bugs.md` OPEN-020)
- [x] BUG-03 Permission denied v Admin (`admin.js` → REST API)
- [x] BUG-04 Prázdné grafy – ⚠️ reopened (viz `bugs.md` OPEN-002)
- [x] BUG-05 Resend API klíč rotace – ⚠️ opět problém (viz `bugs.md` OPEN-001)
- [x] FEATURE: Offline účtenky s IndexedDB (`offline-sync.js` + `receipts.js`)
- [x] Verzovací Memory Rules pro Claude Code
- [x] Cache-busting hashe aktualizovány pro všechny změněné soubory
- [x] `index.html` přejmenován na FinanceFlow v6.44

### Mimo sessions (pravděpodobně dokončeno)
- [x] COICOP auto-učení → Firebase (`coicop_corrections/{uid}/{kw}`)
- [x] PIN obrazovka – funguje (potvrzeno uživatelem v `bugs.md`)
- [x] Privacy Policy + Podmínky **(Session 2)**
- [x] Editor duplikátů při importu **(Session 2)**
- [x] Modulární JS architektura **(Session 2 – viz `decisions.md` ADR-001b)**
- [x] Firebase Hosting **(Session 2 – viz `decisions.md` ADR-011)**

---

## 📅 ROADMAP – konsolidace verzí a kvartálů

### Verze-level (Session 3 zdroj + aktualizace)

| Verze | Stav | Obsah |
|---|---|---|
| v6.35 | ✅ Hotovo | Nastavení, Sdílení, SMS import, Duplikáty, Nákupní seznam |
| v6.38–6.40 | ✅ Hotovo | Opravy bugů (grafy pokus #1, DTI, predikce, kontaktní formulář) |
| v6.41 | ✅ Hotovo | Kalendář, Predikce v2, Resend email, PIN logika |
| v6.42 | 🔄 Plánované | EmailJS (TODO-003), Box plot přesun (TODO-009), Landing page (TODO-010) |
| v6.43–6.44 | ✅ Hotovo | Offline IndexedDB, Session 4 opravy |
| v6.45+ | 🔄 Plánované | Firebase Rules audit (TODO-001), Grafy reopen (TODO-004), Error handler (TODO-006), Sentry (TODO-007) |
| v6.5x | ⬜ Budoucnost | Playwright testy (TODO-020), Android NotificationListener MVP (TODO-024) |
| v6.6x | ⬜ Budoucnost | Platební systém (TODO-022) |
| v6.7x | ⬜ Budoucnost | PWA Service Worker (TODO-019), plný offline režim |
| v7.0 | ⬜ Q4 2026 | Velký redesign nebo nativní mobilní appka, veřejné spuštění |

### Kvartál-level (konsolidace S1 + S2 + S3)

```
Q2 2026 (Duben–Červen):
  ✅ Import CSV/PDF
  ✅ Editor duplikátů
  ✅ Modulární JS
  ✅ Firebase Hosting
  ✅ Privacy Policy + Podmínky
  ✅ Nákupní seznam
  ✅ IndexedDB offline (účtenky)
  🔄 Nové kategorie (TODO-012)
  🔄 Hlídání cen (TODO-018)
  🔄 EmailJS (TODO-003)
  🔄 Grafy fix (TODO-004)

Q3 2026 (Červenec–Září):
  ⬜ Playwright testy (TODO-020)
  ⬜ Android NotificationListener MVP (TODO-024)
  ⬜ Platební systém (TODO-022)
  ⬜ Google Play vydání (TODO-027)
  ⬜ Vlastní doména (TODO-040)
  ⬜ AI mapování kategorií (TODO-014)
  ⬜ Sentry monitoring (TODO-007)
  ⬜ Service Worker (TODO-019)

Q4 2026 (Říjen–Prosinec):
  ⬜ Lokalizace EN/SK (TODO-028)
  ⬜ Podpora více měn (TODO-029)
  ⬜ Web Push notifikace (TODO-030)
  ⬜ PDF/XLSX export (TODO-031)
  ⬜ Open Banking (pokud reálné, TODO-026)
  ⬜ Bundling Vite/esbuild (TODO-035)
  ⬜ v7.0 velký milestone / veřejné spuštění
```

---

## 📏 Versioning pravidla (převzato z `decisions.md`)

```
Bug fix / malý tweak  → +0.01
Nová feature          → +0.01 (od v6.11)
Velký milestone       → +1.00  (např. v7.0 = publikace aplikace)
```

Viz `decisions.md` sekce 5.2 pro kompletní pravidla versioningu a commit workflow.

---

*Konsolidováno: 2026-04-16 | Sessions: 1 → 4 | Autor: Milan Migdal*
