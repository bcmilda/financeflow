# FinanceFlow – Decisions & Rules

> Konsolidovaný dokument ze **3 sessions** (decisions.md → decisions-1.md → decisions-2.md).
> Nové informace z každé session jsou označeny `**(Session N)**`. Konflikty a superseded
> rozhodnutí jsou explicitně vyznačeny.
> Poslední aktualizace: konsolidace 3 sessions, 2026-04-16.

---

## 📋 Konflikty a rozhodnutí napříč sessions (TL;DR)

| # | Téma | Session | Status |
|---|---|---|---|
| 1 | **Single HTML vs Modulární JS** | S1 ADR-001 vs S2 ADR-001b | 📜 **Historické** – monolit refactorován na moduly, ADR-001 je `SUPERSEDED` |
| 2 | **Hosting: GitHub Pages vs Firebase Hosting** | S1 vs S2 | ⚠️ **Otevřené** – S2 přešel na Firebase Hosting, nyní se řeší návrat ke GitHub Pages (viz `context.md`, `architecture.md`) |
| 3 | **Filename konvence** | S3 → `index_v6.XX.html` | ✅ **Vyřešeno** – produkční commit `index.html` + paralelní lokální záloha `index_v6.XX.html` |

---

## 1. Architektonická rozhodnutí (ADR)

### ADR-001 – Single HTML soubor ⚠️ `SUPERSEDED`
- **Datum:** březen 2026 **(Session 1)**
- **Rozhodnutí:** Celá aplikace je jeden `.html` soubor (HTML + CSS + JS)
- **Důvod:** Snadné nasazení na GitHub Pages, žádný build proces, jednoduché sdílení a verzování
- **Trade-off:** Soubor je velký (~10 000 řádků), složitější orientace; přijatelné pro aktuální rozsah
- **Status:** 🔴 **SUPERSEDED by ADR-001b** (duben 2026) – monolit refaktorován do modulární JS struktury

### ADR-001b – Modulární JS struktura (nahrazuje ADR-001) **(Session 2)**
- **Datum:** 2026-04
- **Rozhodnutí:** Rozdělit monolitický `index.html` (11 000+ řádků) do **13 JS modulů**
  _(pozn.: aktuálně 22 modulů – viz `architecture.md`)_
- **Důvod:** Tokeny se vyčerpávaly extrémně rychle – Claude musel číst celý soubor i pro malou opravu
- **Výsledek:** Při opravě importu stačí načíst jen `import.js` (872 ř.) místo 9655 ř.
- **Trade-off:** Pomalejší načítání (13+ HTTP požadavků sekvenčně bez bundleru)
- **Související:** Viz ADR-010 (firebase.js jako poslední)

### ADR-002 – Firebase Realtime Database (ne Firestore)
- **Datum:** březen 2026 **(Session 1)**, potvrzeno **(Session 3)**
- **Rozhodnutí:** Realtime Database místo Firestore
- **Důvod (S1):** Jednodušší datový model pro naše use case, nižší latence pro real-time sync, jednodušší pravidla
- **Důvod (S3):** Real-time sync, jednodušší rules, nižší cena pro 1 uživatele
- **Trade-off:** Horší dotazovací schopnosti, ale nepotřebujeme složité queries
- **Status:** ✅ Konsistentně potvrzeno napříč sessions

### ADR-003 – Cloudflare Worker jako AI proxy
- **Datum:** březen 2026 **(Session 1)**, potvrzeno **(Session 2 + 3)**
- **Rozhodnutí:** Všechny AI požadavky jdou přes Cloudflare Worker
- **Důvod (S1):** API klíč Anthropic nikdy neopustí server; uživatelé ho nevidí
- **Rozšíření (S2):** + ověření Firebase tokenu
- **Rozšíření (S3):** + rate limiting, centrální proxy
- **Worker:** `misty-limit-0523.bc-milda.workers.dev` **(Session 2)**
- **Trade-off:** Jeden endpoint pro vše → jednoduchá správa; cold start latence ~200ms

### ADR-004 – Lokální režim (localStorage fallback)
- **Datum:** březen 2026 **(Session 1)**
- **Rozhodnutí:** Aplikace funguje bez Google účtu v lokálním režimu
- **Důvod:** Snižuje bariéru vstupu; uživatel může vyzkoušet bez přihlášení
- **Trade-off:** Data nejsou synchronizována, žádný backup

### ADR-005 – COICOP jako globální klasifikace
- **Datum:** duben 2026 **(Session 1)**
- **Rozhodnutí:** Interní kategorie uživatele se mapují na 13 skupin CZ-COICOP 2024
- **Důvod:** Srovnání s průměry ČSÚ, standardizovaná klasifikace výdajů pro všechny uživatele
- **Trade-off:** Mapping není vždy 100% přesný, potřebuje keyword engine + auto-učení

### ADR-006 – OECD spotřební jednotky pro přepočet průměrů
- **Datum:** duben 2026 **(Session 1)**
- **Rozhodnutí:** ČSÚ průměry se přepočítávají pomocí OECD ekvivalentu, ne prostým počtem osob
- **Důvod:** Dítě má jinou spotřebu než dospělý; OECD škála je mezinárodní standard
- **Vzorec:** `1. dospělý = 1.0, 2.+ dospělý = 0.5, dítě 14+ = 0.5, dítě 0–13 = 0.3`

### ADR-007 – Verzování po 0.01
- **Datum:** od v6.11 **(Session 1)**
- **Rozhodnutí:** Každá změna (bug fix i feature) = +0.01; major milestone = +1.00
- **Důvod:** Granulární přehled o historii změn; snadné porovnání verzí

### ADR-008 – Split transakce: parent zachovává původní částku
- **Datum:** duben 2026 **(Session 1)**
- **Rozhodnutí:** Parent transakce zůstává beze změny; children jsou nové záznamy se `splitId`
- **Důvod:** Zachování původních dat z bankovního výpisu; anti double-counting filtrem
- **Pravidlo:** Do součtů se počítají jen `splitParent: true` nebo transakce bez `splitId`

### ADR-009 – Import kategorií: Varianta C (namapuj před importem)
- **Datum:** duben 2026 **(Session 1)**
- **Rozhodnutí:** Neznámé kategorie z CSV se zobrazí k namapování PŘED importem
- **Důvod:** Uživatel má kontrolu; neimportujeme data do špatných kategorií
- **Alternativy odmítnuty:**
  - A – automatické přiřazení bez dotazu
  - B – import bez kategorií

### ADR-010 – `firebase.js` jako POSLEDNÍ skript **(Session 2)**
- **Datum:** 2026-04
- **Rozhodnutí:** `firebase.js` vždy na konci jako `type="module"`
- **Důvod:** Firebase se načítá asynchronně. Ostatní soubory mají stub funkce
  (`signInGoogle`, `_db`), které čekají na Firebase. Dát `firebase.js` nahoru způsobí
  `window.onUserSignedIn is not a function`.
- **Poznámka:** ChatGPT doporučoval opak – **v našem případě špatně**

### ADR-011 – Firebase Hosting místo Netlify / GitHub Pages **(Session 2)**
- **Datum:** 2026-04
- **Rozhodnutí:** Přejít z GitHub Pages / Netlify na Firebase Hosting
- **Důvod:** Netlify má omezené kredity, Firebase Hosting je zadarmo a neomezený
- **Výsledek:** Automatický deploy přes GitHub Actions při merge do `main`
- **Status:** 🟡 Aktuálně v diskusi návrat ke GitHub Pages – viz `context.md`

### ADR-012 – CSV parsing bez AI **(Session 2)**
- **Datum:** 2026-03
- **Rozhodnutí:** CSV importovat lokálně v prohlížeči bez volání API
- **Důvod:** Rychlost, žádný limit tokenů, funguje offline
- **Výsledek:** CSV za celý rok (500 transakcí) se zpracuje okamžitě

### ADR-013 – `max_tokens: 8192` **(Session 2)**
- **Datum:** 2026-04
- **Rozhodnutí:** Zvýšit `max_tokens` z 4000 na 8192 (maximum)
- **Důvod:** PDF výpisy selhávaly s `stop_reason: "max_tokens"` pro větší soubory
- **Omezení:** 8192 je absolutní maximum Claude API – nelze zvýšit

### ADR-014 – windows-1250 autodetekce pro KB **(Session 2)**
- **Datum:** 2026-04
- **Rozhodnutí:** CSV parser zkouší nejdřív UTF-8, pak fallback na windows-1250
- **Důvod:** KB (Komerční banka) exportuje CSV v windows-1250, header na řádku 16
- **Implementace:** `new TextDecoder('utf-8', {fatal:true})` → `catch` → `windows-1250`

### ADR-015 – Detektor úspor z reálných transakcí **(Session 2)**
- **Datum:** 2026-04
- **Rozhodnutí:** Detektor zobrazuje jen předplatná, která skutečně jsou v transakcích
- **Důvod:** Původně zobrazoval Netflix/Spotify i bez dat (ze seed dat)
- **Komunitní učení:** Detekovaná předplatná se ukládají do Firebase `community/subscriptions/`

---

## 2. Architektonická rozhodnutí – rozšíření ze Session 3

Session 3 přidává další tabulku architektonických rozhodnutí (některá doplňují ADR výše,
jiná jsou nová):

| Datum | Rozhodnutí | Důvod | Vztah k ADR |
|-------|-----------|-------|-------------|
| 2026-03 | Vanilla JS místo React/Vue | Jednoduchost, žádný build toolchain, rychlý deploy | souvisí s ADR-001 |
| 2026-03 | Firebase Realtime DB místo Firestore | Real-time sync, jednodušší rules, nižší cena pro 1 uživatele | = ADR-002 |
| 2026-03 | Cloudflare Worker pro AI místo přímého volání | Skrytí API klíče, rate limiting, centrální proxy | = ADR-003 |
| 2026-03 | SPA (Single Page App) místo multi-page | Lepší UX na mobilu, žádné page reload | nové |
| 2026-03 | CSS class `active` pro stránky místo router | Jednoduchost, žádná závislost na URL hash | nové |
| 2026-04 | Resend.com pro emaily | Free tier, snadná integrace s Workerem | nové |
| 2026-04 | Textové pole pro SMS import místo automatického | Web nemůže přistupovat k Android notifikacím; debug field pro testování | nové |
| 2026-04 | Jaro-Winkler pro detekci duplikátů | Lepší než Levenshtein pro jména (prefix weighting) | nové |
| 2026-04 | Personal season blend 80/20 | 80% vlastní historie + 20% globální = stabilita při málo datech | nové |
| 2026-04 | Min. 4 měsíce pro trend detekci | Méně dat = šum, ne trend. Chrání před falešnými alarmy. | nové |
| 2026-04 | Outlier removal >3× medián | Servis auta za 19 342 Kč způsoboval +852 % trend falešně | nové |
| 2026-04 | `requestAnimationFrame` + 50ms delay pro grafy | CSS `display:none→block` je asynchronní; `canvas.clientWidth = 0` jinak | nové |
| 2026-04 | Ukládat obojí `amount` + `amt` | Starší transakce mají jen `amt`, nové mají `amount`; obojí zajišťuje kompatibilitu | nové |

---

## 3. UX rozhodnutí **(Session 3)**

| Datum | Rozhodnutí | Důvod |
|-------|-----------|-------|
| 2026-03 | Dark mode jako výchozí | Cílová skupina preferuje tmavé téma na mobilu |
| 2026-03 | Čeština jako primární jazyk | Česká cílová skupina; angličtina jako sekundární |
| 2026-04 | Saldo → Zůstatek v dashboardu | „Zůstatek" je přirozenější české slovo pro uživatele |
| 2026-04 | Prosinec → Předpoklad YTD | Původní název byl matoucí; sloupec ukazuje roční odhad, ne prosincová data |
| 2026-04 | `emptyMonthBanner` pro prázdný měsíc | Uživatel byl zmaten, proč dashboard ukazuje nuly (byl duben, data v březnu) |
| 2026-04 | Smart month auto-přechod (max 3 měsíce zpět) | Automaticky přejde na poslední měsíc s daty při přihlášení |
| 2026-04 | Kalendář jako samostatná sekce | Inspirace Trading Journal; denní přehled P&L |

---

## 4. Bezpečnostní rozhodnutí **(Session 3)**

| Datum | Rozhodnutí | Důvod |
|-------|-----------|-------|
| 2026-03 | Firebase Auth pro autentizaci | Google Sign-In = žádná správa hesel |
| 2026-03 | PIN v `localStorage` (ne Firebase) | Rychlé lokální ověření, méně Firebase čtení |
| 2026-04 | Firebase rules: `auth.uid === $uid` (ne `auth != null`) | Původní rules umožňovaly číst data ostatních přihlášených uživatelů |
| 2026-04 | Rate limiting 60 req/hod v Workeru (Cloudflare Cache API) | Ochrana před zneužitím Claude API |
| 2026-04 | Anonymní příspěvek do komunity (bez UID) | GDPR – komunitní statistiky nesmí být identifikovatelné |

> 🟡 **Pozn.:** Aktuální audit Firebase Rules (viz `architecture.md`, sekce 8) identifikoval
> další problémy, které jdou nad rámec tohoto rozhodnutí – zejména u uzlů `leads`,
> `affiliate`, `community`. Řeší se samostatně.

---

## 5. Pravidla projektu (kódovací a operativní)

### 5.1 Kódovací pravidla – konsolidace z S1, S2, S3

#### ❌ NIKDY **(Session 1)**
- **Nested function declarations** – způsobuje tiché runtime chyby v strict mode. Zvlášť kritické pro: `guessReceiptCategory`, `mapToCOICOP`, `buildCompareTab`
- **Volat `renderXxx()` z `oninput` handleru** – překreslí DOM → ztráta focusu → nelze psát na mobilu

#### ✅ VŽDY
- **(S1)** `addEventListener()` pro formuláře se zpětnou vazbou
- **(S1)** Předávat `householdSize` jako parametr do `buildCompareTab()`
- **(S1)** Kontrolovat syntax: `node --check /tmp/test.js`
- **(S1)** Uložit jako novou verzi (+0.01) po každé změně
- **(S2)** Po každé změně JS: `node --check soubor.js`
- **(S2)** Při editaci velkého souboru: Python skript, ne `str_replace`
- **(S2)** Vždy zkontroluj konec `index.html` (past: prázdný `<script>` tag)
- **(S3)** Vždy začínej úpravy od `uploads/` verze souboru (= aktuální Firebase verze)
- **(S3)** Po každé změně JS souboru aktualizuj `?v=sha256hash` v `index.html`
- **(S3)** Vždy kontroluj brace balance: `content.count('{') === content.count('}')`
- **(S3)** Nikdy nepiš `t.amt` – vždy `t.amount || t.amt || 0`
- **(S3)** `settings.js` nesmí přepisovat `applySettings()` z `premium.js`
- **(S3)** `computePersonalSeason`, `detectTrend`, `computeYearForecast` patří do `helpers.js`
- **(S3)** Predikční funkce se volají uvnitř `predictCat()`, ne přímo z buněk tabulky

#### Soubory a struktura **(Session 2)**
- `index.html` NESMÍ obsahovat `<script>` bez `src` nebo obsahu
- JS soubory nesmí obsahovat HTML tagy (`</script>`, `</body>`)
- `firebase.js` = vždy poslední, vždy `type="module"` (viz ADR-010)
- **(S2)** Nikdy nemazat existující funkce bez potvrzení

### 5.2 Verzování

- **(S1)** Verze se inkrementuje o 0.01 po každé změně
- **(S2)** Verze je vždy v **řádku 6** `index.html` (aktuální umístění): `<title>FinanceFlow vX.XX</title>`
- **(S2)** Nikdy nepřeskakuj verze
- **Commit zpráva formát:** `vX.XX - [popis změny]` **(Session 3)**
- **Konvence souborů pro interní zálohy / archivaci:**
  - Produkční commit do repa: **vždy `index.html`**
  - Paralelně generovat i **pojmenovanou kopii `index_v6.XX.html`** (pokud to tokenově nezatíží) – slouží jako lokální záloha verzované historie mimo Git, užitečné při rychlém srovnání verzí bez `git checkout`
  - Tj. při každé nové verzi vznikají **dva soubory se stejným obsahem**: `index.html` (do commitu) + `index_v6.XX.html` (do lokální zálohy)

### 5.3 Git workflow

- **(S2 + S3)** Vždy commit do větve `dev` (nikdy přímo do `main`)
- **(S2)** Merge do `main` = Pull Request (automatický deploy)
- **(S3)** Po commitu vždy push do `dev`

### 5.4 Deploy **(Session 2)**

```bash
cd C:\Users\Milan\Desktop\FinanceFlow\financeflow\financeflow
firebase deploy --only hosting
```
- **(S3)** Firebase deploy pouze z root adresáře projektu

### 5.5 Konvence pojmenování **(Session 3)**

- Stránky: `showPage('prehled')` → element `id="page-prehled"`
- Modaly: `openModal('modalAdd')` → element `id="modalAdd"`, `class="overlay"`
- Firebase paths: `/users/{uid}/data/` (vždy přes `getData()`)

### 5.6 Pravidla pro AI asistenta (prompt pravidla) **(Session 1)**

- Receipt `price` = **VŽDY** cena za **JEDEN kus** (nikdy celková)
- Bank statement: `amount` záporné = výdaj, kladné = příjem
- Datum vždy ve formátu `YYYY-MM-DD`

---

## 6. Zamítnutá rozhodnutí **(Session 3)**

| Rozhodnutí | Důvod zamítnutí |
|-----------|-----------------|
| React Native pro mobilní appku | Příliš složité pro MVP; PWA stačí |
| Firestore místo Realtime DB | Realtime DB je jednodušší pro naši strukturu (= potvrzuje ADR-002) |
| Service Worker (offline PWA) | `manifest.json` připraven, ale implementace odložena _(pozn.: částečně řešeno v Session 4 přes IndexedDB)_ |
| Stripe platební systém | Odloženo na po stabilizaci základních funkcí |
| EmailJS jako primární email | Resend integrován přes Worker; EmailJS jako záloha |

---

*Konsolidováno: 2026-04-16 | Sessions: 1 → 3 | Autor: Milan Migdal*
