# FinanceFlow – Decisions & Rules

> **Zdrojový soubor (základ):** `decisions_consolidated_2026-05-15_s6.md` (konsolidace Sessions 1–6)
> **Aplikované patche Session 7:** sekce decisions ze souboru `patch-session7-COMBINED(1).md` – Session 7.0 (2026-04-25) + Session 7.1 (2026-04-30)
> **Procedura:** Aplikace S7 combined patche. Dočasná ID přečíslována sekvenčně navazující na ADR-029 → ADR-030–040 (ADR-S70-01–05 = ADR-030–034, DECISION-S71-01–06 = ADR-035–040).
> **Datum poslední aktualizace:** 2026-05-15
>
> Konsolidovaný dokument ze **7 sessions (vč. 7.1)**. Nové informace z každé session jsou označeny
> `**(Session N)**`. Doplnění z Milanova merge jsou označena `**(Merge Session 1-3)**`.
> Konflikty a superseded rozhodnutí jsou explicitně vyznačeny.
> Poslední aktualizace: 2026-05-28 (Session 9 patch).

---

## 📋 Konflikty a rozhodnutí napříč sessions (TL;DR)

| # | Téma | Session | Status |
|---|---|---|---|
| 1 | **Single HTML vs Modulární JS** | S1 ADR-001 vs S2 ADR-001b | 📜 **Historické** – monolit refactorován na moduly, ADR-001 je `SUPERSEDED` |
| 2 | **Hosting: GitHub Pages vs Firebase Hosting** | S1–S6 | ✅ **Vyřešeno (Session 6)** – Firebase Hosting primary, GitHub Pages (`bcmilda.github.io/financeflow`) jako secondary z větve `dev` |
| 3 | **Filename konvence** | S3 → `index_v6.XX.html` | ✅ **Vyřešeno** – produkční commit `index.html` + paralelní lokální záloha `index_v6.XX.html` |
| 4 | **Vizualizace výdajů: koláč vs bubliny** | S7.0 | ✅ **Vyřešeno** – Bubble chart (4 varianty) nahrazuje koláčový graf → ADR-030 |
| 5 | **PDF import: base64 vs text extraction** | S7.0 | ✅ **Vyřešeno** – pdf.js text extraction nahrazuje base64 přenos → ADR-032 |
| 6 | **Plány a cíle: nová sekce vs evoluce nakup.js** | S7.0/7.1 | ✅ **Vyřešeno** – implementováno jako rozšíření nakup.js → ADR-033 |

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
  _(pozn.: aktuálně 25 modulů – viz `architecture.md`)_
- **Důvod:** Tokeny se vyčerpávaly extrémně rychle – Claude musel číst celý soubor i pro malou opravu
- **Výsledek:** Při opravě importu stačí načíst jen `import.js` (872 ř.) místo 9655 ř.
- **Trade-off:** Pomalejší načítání (13+ HTTP požadavků sekvenčně bez bundleru)
- **🔗 Souvisí s:** ADR-010 (firebase.js jako poslední)

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
- **Status:** ✅ **Vyřešeno (Session 6)** – Firebase Hosting = primary (`https://financeflow-a249c.web.app`), GitHub Pages = secondary z větve `dev` (`bcmilda.github.io/financeflow`)

### ADR-012 – CSV parsing bez AI **(Session 2)**
- **Datum:** 2026-03
- **Rozhodnutí:** CSV importovat lokálně v prohlížeči bez volání API
- **Důvod:** Rychlost, žádný limit tokenů, funguje offline
- **Výsledek:** CSV za celý rok (500 transakcí) se zpracuje okamžitě

### ADR-013 – `max_tokens` – výstupní limit (ne context window) **(Session 2 → Session 8)**
- **Datum:** 2026-04
- **Rozhodnutí:** Zvýšit `max_tokens` z 4000 na 8192 (maximum)
- **Důvod:** PDF výpisy selhávaly s `stop_reason: "max_tokens"` pro větší soubory
- **Omezení:** 8192 bylo původní maximum. Claude Sonnet 4 podporuje vyšší limity.
- **(Session 8 update):** `bank_statement_text` navýšen na **16 384** tokenů (FIX-054). `max_tokens` je OUTPUT limit, ne context window (context window = 200k tokenů). 🔗 viz `architecture.md` sekce 7 Worker typy

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

### ADR-016 – SPA (Single Page App) místo multi-page **(Merge Session 1-3)**
- **Datum:** 2026-03
- **Rozhodnutí:** SPA s CSS class `active` pro stránky místo URL routeru
- **Důvod:** Lepší UX na mobilu, žádné page reload, jednoduchost bez závislosti na URL hash
- **Konvence:** `showPage('prehled')` → element `id="page-prehled"`

### ADR-017 – Resend.com pro emaily **(Merge Session 1-3)**
- **Datum:** 2026-04
- **Rozhodnutí:** Resend.com místo EmailJS jako primární email provider
- **Důvod:** Free tier, snadná integrace s Cloudflare Workerem
- **Status:** EmailJS ponecháno jako záloha

### ADR-018 – Textové pole pro SMS import místo automatického **(Merge Session 1-3)**
- **Datum:** 2026-04
- **Rozhodnutí:** Debug field pro SMS import místo přímého přístupu k notifikacím
- **Důvod:** Web nemůže přistupovat k Android notifikacím; textové pole slouží pro testování parseru

### ADR-019 – Jaro-Winkler pro detekci duplikátů **(Merge Session 1-3)**
- **Datum:** 2026-04
- **Rozhodnutí:** Jaro-Winkler algoritmus místo Levenshtein distance
- **Důvod:** Lepší pro obchodní jména (prefix weighting) – „McDonald's" vs „McDonalds"

### ADR-020 – Personal season blend 80/20 **(Merge Session 1-3)**
- **Datum:** 2026-04
- **Rozhodnutí:** 80% vlastní historie + 20% globální průměr pro sezónní predikce
- **Důvod:** Stabilita při málo datech, postupná personalizace při dostatku historii

### ADR-021 – Min. 4 měsíce pro trend detekci **(Merge Session 1-3)**
- **Datum:** 2026-04
- **Rozhodnutí:** Minimum 4 měsíce dat pro zobrazení trendů výdajů
- **Důvod:** Méně dat = šum, ne trend. Chrání před falešnými alarmy.

### ADR-022 – Outlier removal >3× medián **(Merge Session 1-3)**
- **Datum:** 2026-04
- **Rozhodnutí:** Odstraňovat extrémní hodnoty nad 3× medián při výpočtu trendů
- **Důvod:** Servis auta za 19 342 Kč způsoboval +852 % trend falešně

### ADR-023 – requestAnimationFrame + 50ms delay pro grafy **(Merge Session 1-3)**
- **Datum:** 2026-04
- **Rozhodnutí:** Asynchronní vykreslování grafů s `rAF` + `setTimeout 50ms`
- **Důvod:** CSS `display:none → block` je asynchronní; `canvas.clientWidth = 0` jinak → prázdné plátno
- **🔗 Viz:** `architecture.md` sekce 5 (Grafy – opravený flow)

### ADR-024 – Ukládat obojí `amount` + `amt` **(Merge Session 1-3)**
- **Datum:** 2026-04
- **Rozhodnutí:** Dvojí zápis hodnot transakce pro zpětnou kompatibilitu
- **Důvod:** Starší transakce mají jen `amt`, nové mají `amount`; obojí zajišťuje bezpečné čtení
- **Pravidlo:** Vždy číst jako `t.amount || t.amt || 0`

### ADR-025 – Sentry.io monitoring chyb **(Session 6)**
- **Datum:** 2026-04-23
- **Rozhodnutí:** Integrovat Sentry.io (free tier) pro monitoring JS chyb v produkci
- **Implementace:** Async CDN loader dynamicky injektovaný **před `</body>`** (NIKDY v `<head>`)
- **DSN:** `3ce6efc6333af4293ac9b67d7b710f4b@o4511266124988416.ingest.de.sentry.io/4511266132787280`
- **Nastavení:** `tracesSampleRate: 0`, `integrations: []` – jen error tracking, bez performance traces
- **Poučení:** Loader v `<head>` způsobil pád mobilní appky → async loader před `</body>` je **povinný**
- **Status:** ✅ Nasazeno v6.48
- **🔗 Viz:** `architecture.md` sekce 14

### ADR-026 – RESEND_API_KEY z Cloudflare Secrets **(Session 6)**
- **Datum:** 2026-04-23
- **Rozhodnutí:** Resend API klíč přesunout z hardcoded kódu do Cloudflare Worker Secrets
- **Důvod:** Klíč unikl na GitHub (GitGuardian alert) → okamžitá rotace + přesun do env
- **Implementace:** `env.RESEND_API_KEY` v kódu Workeru; klíč nastaven v Cloudflare Dashboard
- **Status:** ✅ Nasazeno, Worker v5, emaily fungují (Monthly: 2/3000)
- **🔗 Viz:** `architecture.md` sekce 7 (Security issue – VYŘEŠENO)

### ADR-027 – Firebase Rules: admin read přístup **(Session 6)**
- **Datum:** 2026-04-23
- **Rozhodnutí:** Přidat admin read přístup k `/users` rootu:
  `"users": { ".read": "auth.uid === 'LNEC8VNB2QPwIv6WWQ9lqgR4O5v1'" }`
- **Důvod:** `loadLowConf()` a `loadMappingStats()` vracely 403 – Admin panel nefungoval
- **Status:** ✅ Nasazeno 2026-04-23. Admin panel funkční, chyba 403 se nevrací.
- **Poznámka:** Jde o **doplněk** k pravidlům ze sekce 8.4 v `architecture.md`, ne náhradu
- **🔗 Viz:** `architecture.md` sekce 8.8, `bugs.md` FIX-047

### ADR-028 – Offline větev v `save()` v `app.js` **(Session 6)**
- **Datum:** 2026-04-23
- **Rozhodnutí:** Offline detekce centrálně v `save()`, ne v každém modulu zvlášť
- **Implementace:**
  ```javascript
  if (!navigator.onLine && window.OfflineSync) {
    window.OfflineSync.saveTxOffline(lastTx).then(() => {
      showToast('⏳ Offline – transakce bude uložena po připojení');
    });
    return;
  }
  ```
- **Status:** ⚠️ Implementováno v v6.48, čeká na ověření uživatelem
- **🔗 Viz:** `architecture.md` sekce 6 (Offline architektura)

### ADR-029 – VERSIONING.md jako nový doc soubor **(Session 6)**
- **Datum:** 2026-04-23
- **Rozhodnutí:** Vytvořit `doc/VERSIONING.md` s pravidly verzování a workflow
- **Důvod:** Pravidla verzování byla rozptýlena v různých souborech; centralizace snižuje chyby
- **Workflow:** Soubor vzniká v `docs/` → schválení Milanem → přesun do `doc/`
- **Status:** ✅ Připraveno v `docs/VERSIONING.md`
- **🔗 Viz:** `architecture.md` sekce 13

### ADR-030 – Vizualizace výdajů: Bubble chart nahrazuje koláčový graf **(Session 7.0)**
- **Datum:** 2026-04-25
- **Rozhodnutí:** Koláčový graf v dashboardu nahrazen systémem 4 přepínatelných vizualizací
- **Implementace:** 4 záložky (A/B/C/D) v `ui.js` → `renderBubbleChart()`; element `#bubbleChartWrap` nahrazuje `donutCanvas` + `donutLegend`
- **Varianty:** A) Cluster, B) Drill-down L1→L2→L3, C) Gradient+osa, D) Treemap
- **Důvod:** Koláč nečitelný při 8+ kategoriích; bubliny lépe zobrazují hierarchii a sdílenost subkategorií
- **Status:** ✅ Implementováno v6.50
- **🔗 Viz:** `architecture.md` sekce 16, TODO-053, TODO-060

### ADR-031 – Chord diagram pro pokročilé propojení **(Session 7.0)**
- **Datum:** 2026-04-25
- **Rozhodnutí:** Chord diagram do sekce Statistiky nebo Report poradce (ne dashboard)
- **Důvod:** Síťové grafy se špatně škálují při 10+ propojeních; vhodné jen pro analytický pohled
- **Status:** ⬜ Plánováno – TODO-061 *(přečíslováno z TODO-054 v S7.0)*

### ADR-032 – PDF import: text extraction místo base64 **(Session 7.0)**
- **Datum:** 2026-04-25
- **Rozhodnutí:** PDF se nezasílá jako base64; text se extrahuje lokálně přes `pdf.js 3.11.174`
- **Důvod:** Base64 PDF → `stop_reason: max_tokens` při >200 transakcích; extrahovaný text je řádově menší
- **Implementace:** Worker typ `bank_statement_text` (nový, vedle stávajícího `bank_statement`); dávky 15 stránek/volání
- **⚠️ Verze:** `pdf.js 3.11.174` (UMD build z cdnjs) – verze 4.x je pouze ESM, nefunguje v klasickém `<script>`
- **Status:** ✅ Implementováno v6.49
- **🔗 Viz:** `architecture.md` sekce 17, FIX-046 (`bugs.md`)

### ADR-033 – Patch-only workflow pro .md soubory **(Session 7.0)**
- **Datum:** 2026-04-25
- **Rozhodnutí:** AI vytváří pouze `patch-sessionN.md` se změnami, ne celé soubory
- **Důvod:** Celé soubory zbytečně spotřebovávají tokeny a zvyšují riziko přepsání historických dat
- **Status:** ✅ Platné od Session 7.0
- **🔗 Viz:** `UPDATE_RULES.md` sekce 5

### ADR-034 – Plány a cíle = evoluce nakup.js, ne nová sekce **(Session 7.0)**
- **Datum:** 2026-04-25
- **Rozhodnutí:** Funkce implementována jako rozšíření `nakup.js`, ne jako samostatná sekce
- **Důvod:** Přání = co chci koupit = cíl → stejná entita, jen rozšířená o deadline, targetAmount, savedAmount
- **Status:** ~~⬜ Plánováno~~ → ✅ Implementováno **(Session 7.1)** – TODO-056
- **🔗 Viz:** TODO-049, TODO-056

### ADR-035 – Finanční aktiva jako samostatná sekce **(Session 7.1)**
- **Datum:** 2026-04-29
- **Rozhodnutí:** Nová sekce `assets.js`; Firebase: `S.assets[]`; typy: `property` / `investment` / `vehicle` / `savings` / `custom`
- **Důvod:** Projekt = výdajová aktivita. Aktivum = majetek. Propojení by bylo umělé; lepší čistá separace
- **Poznámka:** Měsíční vklady do investic nastaví uživatel v Šablonách – bez automatiky
- **Status:** ✅ Implementováno v6.50

### ADR-036 – computeAssetsNetWorth vs computeNetWorth – zákaz přejmenování **(Session 7.1)**
- **Datum:** 2026-04-29
- **Rozhodnutí:** `assets.js` používá `computeAssetsNetWorth()` – **NIKDY nepřejmenovávat**
- **Důvod:** `premium.js` má `computeNetWorth(D)→{rows,total,totalDebt}`. Kolize přejmenováním crashovala celou aplikaci s chybou `"can't access property 'length', nw.rows is undefined"`
- **Pravidlo:**
  - `premium.js`: `computeNetWorth(D)` → `{rows, total, totalDebt}` — NEMĚNIT
  - `assets.js`: `computeAssetsNetWorth(D)` → `{totalAssets, totalWallets, netWorth, byType}` — NEMĚNIT
- **Status:** ✅ Vyřešeno přejmenováním v assets.js
- **🔗 Viz:** FIX-048 (`bugs.md`)

### ADR-037 – Bubble chart 4 varianty – finální design **(Session 7.1)**
- **Datum:** 2026-04-28
- **Rozhodnutí:** A) Cluster (velké kategorie + satelity), B) Drill-down L1→L2→L3, C) Gradient (linearGradient z barev rodičů pro sdílené subkat.), D) Treemap (HTML grid)
- **Sdílené subkategorie:** `SHARED_NAMES` Set – gradient okraj + 🔗 ikona + drill na všechny rodiče
- **Status:** ✅ Implementováno (Gradient varianta závislá na datech – viz OPEN-027)
- **🔗 Viz:** ADR-030, `architecture.md` sekce 16

### ADR-038 – Report poradce jako záložka v měsíčním reportu **(Session 7.1)**
- **Datum:** 2026-04-29
- **Rozhodnutí:** Záložka „📋 Poradce" v tab baru reportu; `renderAdvisor()` voláno `setTimeout(30ms)` po `el.innerHTML`
- **Důvod:** Záložka v existujícím reportu = žádný nový nav item; `setTimeout` nutný pro async funkci v DOM
- **Implementace:** `advisor.js` píše do `#advisorContainer` (uvnitř `reportContent`) – **NE do `#reportContent` přímo**
- **Status:** ✅ Implementováno v6.50
- **🔗 Viz:** TODO-059, `architecture.md` sekce 3 (advisor.js detail)

### ADR-039 – Git reset --hard místo revert při konfliktech **(Session 7.1)**
- **Datum:** 2026-04-30
- **Rozhodnutí:** Při `unmerged files` konfliktech: `git reset --hard <hash>` (lokálně, bez push)
- **Důvod:** Postupné revertování způsobovalo nové unmerged files konflikty v `index.html`
- **Postup:**
  ```bash
  git log --oneline | head -20   # zjistit hash
  git reset --hard <hash>         # reset lokálně
  # NIKDY git push origin bez ověření funkčnosti
  ```
- **🔗 Viz:** `UPDATE_RULES.md` sekce 6

### ADR-040 – Chainování souborů v session – povinné pravidlo **(Session 7.1)**
- **Datum:** 2026-04-30
- **Rozhodnutí:** AI MUSÍ vždy pracovat s vlastním posledním výstupem (`/home/claude/` nebo `/mnt/user-data/outputs/`) – **nikdy znovu z `/mnt/project/`** pokud byl soubor v téže session upraven
- **Důvod:** Opakované kopírování z `/mnt/project/` přepisuje provedené změny → ztráta práce celé session
- **Status:** ✅ Platné od Session 7.1
- **🔗 Viz:** `UPDATE_RULES.md` sekce 6

---

## 2. Architektonická rozhodnutí – přehledová tabulka Session 3

Session 3 přidává přehledovou tabulku architektonických rozhodnutí se vztahem k ADR:

| Datum | Rozhodnutí | Důvod | Vztah k ADR |
|-------|-----------|-------|-------------|
| 2026-03 | Vanilla JS místo React/Vue | Jednoduchost, žádný build toolchain, rychlý deploy | souvisí s ADR-001 |
| 2026-03 | Firebase Realtime DB místo Firestore | Real-time sync, jednodušší rules, nižší cena pro 1 uživatele | = ADR-002 |
| 2026-03 | Cloudflare Worker pro AI místo přímého volání | Skrytí API klíče, rate limiting, centrální proxy | = ADR-003 |
| 2026-03 | SPA (Single Page App) místo multi-page | Lepší UX na mobilu, žádné page reload | = ADR-016 |
| 2026-03 | CSS class `active` pro stránky místo router | Jednoduchost, žádná závislost na URL hash | = ADR-016 |
| 2026-04 | Resend.com pro emaily | Free tier, snadná integrace s Workerem | = ADR-017 |
| 2026-04 | Textové pole pro SMS import místo automatického | Web nemůže přistupovat k Android notifikacím | = ADR-018 |
| 2026-04 | Jaro-Winkler pro detekci duplikátů | Lepší než Levenshtein pro jména (prefix weighting) | = ADR-019 |
| 2026-04 | Personal season blend 80/20 | 80% vlastní historie + 20% globální = stabilita při málo datech | = ADR-020 |
| 2026-04 | Min. 4 měsíce pro trend detekci | Méně dat = šum, ne trend. Chrání před falešnými alarmy. | = ADR-021 |
| 2026-04 | Outlier removal >3× medián | Servis auta za 19 342 Kč způsoboval +852 % trend falešně | = ADR-022 |
| 2026-04 | `requestAnimationFrame` + 50ms delay pro grafy | CSS `display:none→block` je asynchronní; `canvas.clientWidth = 0` jinak | = ADR-023 |
| 2026-04 | Ukládat obojí `amount` + `amt` | Starší transakce mají jen `amt`, nové mají `amount` | = ADR-024 |
| 2026-04 | Sentry async loader před `</body>` | Loader v `<head>` blokuje render → pád mobilní appky | = ADR-025 **(Session 6)** |
| 2026-04 | `Authorization: Bearer token` pro Worker | Worker musí ověřit Firebase uživatele před voláním Resend | = ADR-026 **(Session 6)** |
| 2026-04 | `{type, payload:{...}}` struktura Worker payloadu | Konzistentní API kontrakt pro všechny Worker endpointy | **(Session 6)** |

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
- **(S2)** Verze je vždy v **řádku 6** `index.html`: `<title>FinanceFlow vX.XX</title>`
- **(S2)** Nikdy nepřeskakuj verze
- **Commit zpráva formát:** `vX.XX - [popis změny]` **(Session 3)**
- **Konvence souborů:**
  - Produkční commit do repa: **vždy `index.html`**
  - Paralelně generovat i **pojmenovanou kopii `index_v6.XX.html`** – lokální záloha verzované historie mimo Git
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

### ADR-041 – AI Rate Limiting – per-type kvóty **(Session 8)** ✅ SCHVÁLENO

| Typ | Free/měs | Trial/měs | Premium/měs |
|---|---:|---:|---:|
| `receipt` | 15 | 50 | 50 |
| `bank_statement_text` | 2 | 5 | 5 |
| `chat` | 20 | 80 | 80 |
| `advisor_report` | 1 | 5 | 5 |
| `wish_url` | 5 | 15 | 15 |
| `price_alert` | 5 | 15 | 15 |
| `contact_form` | 1 | 3 | 3 |
| **Global cap** | 50 | 1 000 | 1 000 |

- **Architektura:** Firebase Realtime DB pro counter, Dual enforcement (klient + Worker)
- **Refund:** pro `receipt`/`bank_statement`/`wish_url` při prázdném výsledku
- **Fail-open:** při Firebase outage (neblokovat uživatele)
- **Status:** ✅ Schváleno – implementace čeká (TODO-075)
- **🔗 Cross-reference:** TODO-075, `todo.md`

### ADR-042 – Architektura 3 hodnotících systémů **(Session 8)**

| Systém | Soubor | Funkce | Zobrazení |
|---|---|---|---|
| S1 | `premium.js` | `computeFinancialScore()` | Dashboard „Finanční skóre" 0-100 |
| S2A | `projects.js` | `computeHealthScores()` | Souhrn výdajů „Finanční zdraví" |
| S2B | `projects.js` | `renderObraz()` | Záložka „Finanční obraz" trend |

- **Rozhodnutí:** Zachovat 3 oddělené systémy. Každý měří jiný aspekt. Sjednocení by bylo příliš složité.
- **Status:** ✅ Dokumentováno

### ADR-043 – Scoring v2 – 4 nezávislé složky **(Session 8)** ✅ IMPLEMENTOVÁNO v6.64

Přepracování `computeFinancialScore()` v `premium.js`:

| Složka | Vzorec | Max bodů |
|---|---|---|
| S1 Cash Flow | expRatio lookup tabulka (26 řádků, 0.50→>1.60) | 25 |
| S2 Zadluženost | DTI (0-13) + DSTI (0-12) NEZÁVISLE | 25 |
| S3 Rezerva | POUZE monthsReserve (eliminuje dvojitý postih se S1) | 25 |
| S4 Spoření | activeSavingRate = isSaving kategorií / baseIncome | 25 |
| Konzistenční bonus | +2/+5/+9/+13/+15 za 2-6 měsíců zlepšení | cap 100 |

- **FIX:** Odstraněn dvojitý postih za záporné saldo (starý S1 + S3 trestaly oboje).
- **Status:** ✅ Nasazeno v6.64 (FIX-078)
- **🔗 Cross-reference:** FIX-078, `formulas.md` sekce Scoring v2, ADR-042


### ADR-044 · COICOP systém – runtime merge místo Firebase uložení **(Session 9)**
- **Rozhodnutí:** Pole `coicop`, `shared`, `coicopOverrides` se NEUKLÁDAJÍ do Firebase kategorií uživatelů. Doplňují se pouze za runtime při renderování (shallow copy `{...c}`).
- **Důvod:** Klíče s "/" v `coicopOverrides` jsou v Firebase nevalidní. Runtime merge je bezpečnější a nevyžaduje migraci dat.
- **Dopad:** `renderCatPage()` vždy vytváří kopii kategorií, nikdy nemutuje `S.categories`.
- **Status:** ✅ Implementováno (FIX-079)

### ADR-045 · categoryMappings – oddělené uložení od S.data **(Session 9)**
- **Rozhodnutí:** AI mapování kategorií ukládána do `users/{uid}/categoryMappings/{key}` – samostatně od hlavního datového objektu.
- **Klíč:** `normalizeMappingKey()` – lowercase, bez diakritiky, max 40 znaků.
- **Důvod:** Oddělení zajišťuje že crash v mappings neovlivní transakce a naopak.
- **Status:** ✅ Implementováno (TODO-014, v6.84)

### ADR-046 · itemStats – Firebase agregát per položka **(Session 9)**
- **Rozhodnutí:** `users/{uid}/itemStats/{key}` ukládá `count`, `avgPrice`, `totalSpent`, `history` (24 záznamů) pro každou naskenovanou položku.
- **Důvod:** Umožňuje dlouhodobé sledování cen/kg, shrinkflation a trendů napříč skenováními.
- **Status:** ✅ Implementováno (v6.89)
- **🔗 Cross-reference:** `formulas.md` sekce Cena/kg a Shrinkflation

### ADR-047 · buildHistoryTab = master seznam, buildStoresTab = porovnání **(Session 9)**
- **Rozhodnutí:** Historie = chronologický master seznam naskenovaných účtenek s inline editací. Obchody = seskupení pro porovnání cen a průměrů. Obě záložky čerpají z téhož `uniqueReceipts` pole.
- **Důvod:** Původně obě záložky duplikovaly stejnou expand logiku (90% overlap). Separace rolí.
- **Status:** ✅ Implementováno (FIX-082)

### ADR-048 · Globální error handler – filtrace neškodných chyb **(Session 9)**
- **Rozhodnutí:** `window.error` + `unhandledrejection` handlery **IGNORUJÍ:** ResizeObserver loop, third-party CDN chyby (jiný hostname), Firebase permission-denied, network errors při offline.
- **Důvod:** Tyto chyby jsou normální a jejich zobrazení by zmátlo uživatele.
- **Status:** ✅ Implementováno (TODO-006, v6.99)

### ADR-049 · Komunitní srovnání – báze na osobu + OECD ekvivalent **(Session 10)**
- **Rozhodnutí:** ČSÚ data se ukládají jako průměr **na osobu** (`avg_osoba`). Pro režim „domácnost" se přepočítává přes OECD ekvivalent: `avg_osoba × calcOECD(dospělí, děti0-13, děti14+)`. Přepínač osoba/domácnost v UI.
- **Důvod:** Dvě různé otázky („kolik utrácí typický člověk" vs „kolik moje domácnost") nejsou v rozporu. Dřív se používalo `avg_domacnost` natvrdo → ignorovalo složení domácnosti.
- **Status:** ✅ Implementováno (v7.15, FIX-102)
- **🔗 Cross-reference:** `formulas.md` calcOECD, `explanations.md`

### ADR-050 · CZ-COICOP 2024 = 13 oddílů **(Session 10)**
- **Rozhodnutí:** Komunitní klasifikace používá oficiálních 13 oddílů CZ-COICOP 2024 (ne starších 12). Tříúrovňový strom oddíl→skupina→třída. `COICOP_GROUPS_DEF` v helpers.js (guard) + hardcoded kopie v receipts.js – obě aktualizovat společně.
- **Důvod:** Soulad s aktuální metodikou ČSÚ.
- **Status:** ✅ Implementováno (v7.13–v7.17)

### ADR-051 · Sdílení = read-only model, rovnocenní členové **(Session 10)**
- **Rozhodnutí:** Partneři se vidí navzájem (read-only). Každý zapisuje jen vlastní data; neexistuje jeden „vlastník". Firebase rules povolují čtení partnerům z `partners` uzlu. Rodinný souhrn = součet výdajů přes `partnerData`.
- **Důvod:** Jednoduchý, bezpečný model bez konfliktů zápisu.
- **Status:** ✅ Implementováno (v7.19)
- **🔗 Cross-reference:** `SECURITY.md`

### ADR-052 · Predikce – lineární trend + IQR outliery **(Session 10, návrh)**
- **Rozhodnutí:** Stávající predikce = klouzavý průměr × pevný sezónní koeficient (`SEASON` v app.js). Schváleno jako další vylepšení: lineární trendová extrapolace, později IQR-based detekce odlehlých hodnot.
- **Důvod:** Zachytí trend růstu/poklesu, který průměr ignoruje. Není to ML – jednoduchá statistika.
- **Status:** 📋 Návrh, k implementaci (TODO-098)

### ADR-053 · Platby a Premium – Stripe Payment Links + webhook **(Session 10, blokováno)**
- **Rozhodnutí:** Model = Stripe Payment Links (hosted, bez API klíče v klientu). Ověření platby webhookem v Cloudflare Worker (ověřit Stripe-Signature → zápis `users/{uid}/premium`). Tajné klíče jen ve Worker secrets. Aktivace zámků (`hasPremiumAccess`) až jako poslední krok.
- **Důvod:** Bezpečnost (žádný klíč v klientu), jednoduchost.
- **Status:** 🔴 Blokováno – Milan nemá IČO/OSVČ (Stripe v ČR vyžaduje business identitu). Alternativa pro donate: Ko-fi/QR. Viz samostatný `ADR-053-stripe-payments.md` + `STRIPE_SETUP_navod.md` (TODO-097).

### ADR-054 · Hlídání slev – AI monitoring letáků (fázovaný návrh) **(Session 10, návrh)**
- **Rozhodnutí:** 3 fáze. Fáze 1 = hlídání přes vlastní data (nejnižší cena za 6 měs z účtenek). Fáze 2 = porovnání napříč obchody + web push. Fáze 3 = AI + externí letáky + Worker cron 2×/týden.
- **Důvod:** Vlastní cenová data jsou cennější/unikátnější než veřejné letáky. Externí letáky mají bloker (žádné API, scraping rizikový) a nízkou prioritu.
- **Status:** 📋 Návrh, neimplementováno (TODO-083). Viz samostatný `ADR-054-flyer-discounts.md`.


*Konsolidováno: 2026-04-16 | Doplněno z Milan merge S1-3: 2026-05-15 | Session 6 patch: 2026-05-15 | Session 7.0+7.1 patch: 2026-05-15 | Sessions: 1 → 10 | Poslední update: Session 10, 2026-06-01 | Autor: Milan Migdal*
*Poznámka ke konsolidaci: Claude consolidated merge S1-3 jako základ + doplnění ADR-016–024 (Merge Session 1-3) + patch_s6.md (ADR-025–029) + patch-session7-COMBINED (ADR-030–040, přečíslováno z dočasných ADR-S70-01–05 a DECISION-S71-01–06).*


---

## Session 11 – rozhodnutí (ADR-055 až ADR-059, v7.50 → v7.69)

### ADR-055 – Doména financeflow.cz go-live **(Session 11, v7.51)**
- **Datum:** 2026-06-08
- **Kontext:** Aplikace běžela na `financeflow-a249c.web.app` (Firebase default). Zakoupena doména financeflow.cz přes WEDOS.
- **Rozhodnutí:** Web rozdělen na dvě části:
  - `financeflow.cz/` = landing page (`index.html`) – marketingová stránka
  - `financeflow.cz/app` = aplikace (`app.html`) – původní `index.html`
  - `financeflow.cz/legal` = privacy page (`legal.html`)
  - Firebase Hosting rewrites v `firebase.json`: `/app`→app.html, `/app/**`→app.html, `/legal`→legal.html, `**`→index.html
  - `<base href="/">` v app.html (relativní linky fungují z `/app`)
- **Důvod:** Oddělit marketing od aplikace. Lepší konverze, SEO, profesionální dojem.
- **Alternativy:** Subdoména `app.financeflow.cz` (odmítnuta – složitější Firebase config).
- **DNS:** WEDOS A záznam 199.36.158.100, TXT hosting-site=financeflow-a249c. Firebase Auth domain přidána. SSL auto-generován.
- **Status:** ✅ Nasazeno a ověřeno.

### ADR-056 – Email infrastruktura: Resend (odesílání) + ImprovMX (příjem) **(Session 11, v7.51)**
- **Datum:** 2026-06-08
- **Kontext:** Potřeba odesílat transakční emaily (`info@financeflow.cz`) a přijímat emaily od uživatelů.
- **Rozhodnutí:**
  - **Odesílání:** Resend (resend.com), doména `financeflow.cz`, EU region (Ireland), DKIM/SPF/DMARC DNS záznamy v WEDOS. Worker sender = `info@financeflow.cz`. Free tier (1 doména – stačí).
  - **Příjem:** ImprovMX (free tier), alias `info@financeflow.cz` → `bc.milda@gmail.com`. Forward-only, Premium not needed.
- **Důvod:** Resend má lepší deliverability a EU region (GDPR). ImprovMX free tier postačuje pro příjem.
- **Alternativy:** Brevo (free, 300/day), Amazon SES, WEDOS Mailhosting (~30 Kč/měsíc).
- **DNS poznámka:** WEDOS MX formát = "priorita mezera doména" v DATA poli (ne v Name poli).
- **Status:** ✅ Verified. DKIM/SPF/DMARC nakonfigurováno a ověřeno.

### ADR-057 – Google Analytics 4 implementace **(Session 11, v7.63)**
- **Datum:** 2026-06-08
- **Kontext:** Potřeba sledovat návštěvnost landing page a appky.
- **Rozhodnutí:** GA4 tag `G-F2Z8DK4RR0` na obou stranách:
  - `index.html`: standard gtag s `anonymize_ip: true`
  - `app.html`: `send_page_view: false` + manuální `page_view` event v `showPage()` (helpers.js) pro každý přechod stránky
- **Důvod:** `send_page_view: false` zabrání duplicitním page views u SPA. Manuální tracking dává přesnější data o navigaci v appce.
- **Omezení / TODO:** Pro EU uživatele (ČR) je doporučen Cookie Consent Mode (GDPR). Zatím neimplementováno – do budoucna přidat cookie banner + consent mode.
- **Status:** ✅ Nasazeno v7.63.

### ADR-058 – Sjednocení affiliate + partner odkazu **(Session 11, v7.68)**
- **Datum:** 2026-06-09
- **Kontext:** Existovaly dva sdílecí linky:
  - `?ref=KÓD` = affiliate (nová registrace → body pro majitele)
  - `?partnerOf=UID` = partner pairing (spárování dvou stávajících uživatelů → body + sdílení dat)
  Dva linky mátly uživatele.
- **Rozhodnutí:** Sjednotit na JEDEN odkaz `?ref=KÓD`:
  - `checkIncomingRef()` nyní dělá affiliate tracking + resolve `referrals/{ref}/uid` → owner UID → `pairPartners()` (bidirektivní přidání partnerů + 50 bodů, dedup v `partner_bonus/`).
  - Partner bar odstraněn z UI Sdílení.
  - Staré `?partnerOf=UID` linky zachovány pro zpětnou kompatibilitu (kód zůstává, UI nepropaguje).
- **Důvod:** Jeden odkaz = jednodušší sdílení. Affiliate a partner pairing jsou komplementární akce.
- **Status:** ✅ Nasazeno v7.68. `share.js`: `checkIncomingRef()` async, `pairPartners()` nová funkce.

### ADR-059 – Receipt datový model: lineTotal + discount **(Session 11, v7.62)**
- **Datum:** 2026-06-09
- **Kontext:** Problém s váhovými položkami (meloun 6,445 kg × 29,90 Kč/kg) – `price × qty` dával špatný výsledek.
- **Rozhodnutí:** Rozšíření datového modelu položky účtenky:
  ```json
  {
    "name": "Meloun vodní",
    "price": 29.90,     // cena/kg (NEBO cena/ks pro kusové)
    "qty": 6.445,       // hmotnost v kg (NEBO počet kusů)
    "unit": "kg",       // "kg" | "ks" | "g" | "l"
    "lineTotal": 128.26, // skutečně zaplacená cena řádku (zdroj pravdy)
    "discount": 64.45    // sleva (vždy kladné číslo, 0 pokud žádná)
  }
  ```
  - Helper `lineAmt(it) = it.lineTotal ?? (it.price * (it.qty || 1))` – zpětně kompatibilní (staré záznamy bez lineTotal použijí fallback).
  - AI prompt (worker.js) PRAVIDLO 2/3/5 opraveny pro správné chování.
  - Všechny statistiky (catStats, monthlyData, rpUpdateTotal) přes `lineAmt()`.
- **Důvod:** `price` má dvě sémantiky (cena/ks i celková) → nejednoznačnost. `lineTotal` je explicitní zdroj pravdy.
- **Zpětná kompatibilita:** Staré záznamy bez `lineTotal` fungují přes fallback. ✅
- **Status:** ✅ Nasazeno. worker.js (Cloudflare) + receipts.js (hosting).

---

*Aktualizace Session 11: 2026-06-09 | ADR-055–059*

---

# SESSION 12.1 (v7.70 -> v7.94)

### ADR-060 · Score-engine (konfigurace) **(v7.77)**
scoring-config.json z dashboard XLSX: S1 76ř, DTI 60, DSTI 41, S3 50, S4 31, bonus 13; max 290. Oprava S1 (0.100-0.125 → 1.00-1.25).

### ADR-061 · Admin škálování **(v7.77)**
adminFetchUserCategories shallow fetch + per-uid pool 8 paralelně.

### ADR-062 · Tier systém free/premium/pro **(v7.91)**
Trial = premium (sloučeno). Ceny: Premium 149 Kč/měs, Pro 299 Kč/měs. Admin = vždy pro. Free = 0 AI volání kromě CSV importu (bez AI). Centrální brána: getUserTier/hasTier/canUseFeature/gateFeature. FEATURE_TIERS mapuje funkce na minimální tier. Zámky na vstupu funkcí (ne jen UI). Ekonomika: Sonnet 4 ~$3/$15 za M tokenů; běžný premium ~63 Kč/měs API → při 149 Kč neprodělá; heavy user bez limitů = ztráta → rate limiting (ADR-041) je pojistka.

### ADR-063 · Finanční aktiva dle likvidity **(v7.86)**
3 skupiny: 💧 likvidní (peněženky se živými zůstatky), 📈 investiční (akcie/ETF/krypto/spoření/termínované), 🏠 nelikvidní (nemovitosti/auta/kovy/umění). Net Worth nahoře. Track record: a.valuations[{d,v}], a.invested; editace MERGUJE (zachová valuations).

### ADR-064 · Email architektura **(v7.79, v7.88)**
Odesílání: Resend z info@financeflow.cz (Amazon SES DNS). Příjem: ImprovMX (MX mx1/mx2.improvmx.com prio 10/20 + SPF, DNS only/šedý mrak). Notifikace z kontaktu jdou přímo na admin Gmail + reply_to (ne info→info smyčka).

---

---

*Aktualizace Session 12.1: 2026-06-14 | v7.70 → v7.94 | FIX-129-146, TODO-122-136, ADR-060-064*


---

## Session 13 (v8.10 -> v8.24)

### ADR-065 - Kategorie virtualnich presunu = realna data uzivatele (v8.14)
Zadne vymyslene ID ani skryte kategorie v kodu. Kod hleda kategorii podle jmena (findCatIdByName) a pouziva skutecne ID + podkategorie z dat uzivatele. Duvod: vse musi byt v datech - kategorizovatelne, statistikovatelne, ovladatelne. Auto-dorovnani chybejicich kategorii zavrzeno (prepsalo by umyslne upravy - prejmenovani/smazani).

### ADR-066 - Reverz penez mazanim transakce, ne upravou balance (v8.10)
Zustatek penezenky = startBal + suma transakci (computeWalletBalance). Vraceni penez z cile = smazani paroveho vydaje, ne uprava balance - jinak dvoji odecteni. Vklad pamatuje puvod (transferId, walletId, walletAmount, walletCurrency, txOutId).

### ADR-067 - Novy uzivatel = cista aplikace (v8.15)
Zadna seed/demo data. Sdilene prvky (kategorie, typy plateb, COICOP) se distribuuji pres kod (DEFAULT_CATEGORIES, DEFAULT_PAY_TYPES), ne pres sdileny Firebase uzel. Osobni data ciste per-user.

### ADR-068 - Stav S a listenery se musi vycistit pri odhlaseni (v8.15)
resetAppState() pri odhlaseni odpoji _dbListener + partner listenery a vynuluje S/partnerData/viewingUid PRED zrusenim _currentUser. Zabranuje uniku dat mezi uzivateli.

### ADR-069 - Admin tier ve workeru (v8.14)
Admin UID ma vlastni tier 'admin' s limity 9999 - zadny free rate_limit. getPremiumTier vraci 'admin' pro ADMIN_UIDS.

### ADR-070 - Sdilene kategorie != COICOP (v8.23)
Dva nezavisle mechanismy: (1) coicopOverrides = podkategorie se pocita do jine COICOP divize nez kategorie (Alkohol->2 v Jidle/11, Zdravotni pojisteni->6 v Pojisteni/12). (2) shared = kategorie se zaroven objevuje jako podkategorie jinde (Pojisteni je i v Bydleni a Autu). Bydleni je sdilene protoze Pojisteni ma shared:['cat3','cat11'], ne kvuli COICOP. Zamerne.

### ADR-071 - API naklady = provozni data, ne analytika (v8.21)
Per-user API tracking (volani, tokeny, Kc) a komunitni agregace jsou interni admin/provozni data - legitimni bez souhlasu (provozni/ucetni nutnost). Souhlas (GDPR) se tyka analytiky chovani (GA4), ne provozniho mereni nakladu.

### ADR-072 - Verzovaci hlavicka v souborech (v8.24)
Kazdy zmeneny soubor nese na zacatku // FinanceFlow vX.XX soubor datum. database_rules.json pouziva // komentar (Firebase RTDB pravidla je prijima). Umoznuje okamzite poznat aktualnost souboru.

---

*Aktualizace Session 13: 2026-06-20 | ADR-065-072*
