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


---

## v8.25-v8.27

### ADR-073 - Hodnoty presunu pocitany, ne mutovany (v8.27)
computeTransferTotals spocita hodnoty investic/rezervy z transakci za behu (vydaj=vklad, prijem=vyber, net). NEmutuje S.assets - zadny double-count, smazani transakce hodnotu prepocita.

### ADR-074 - Frekvence vyplaty zobecnuje Runway (v8.26)
radarPaydayInfo rozsireno na obecny cyklus podle _settings.payFreq. Prepinac misto nove zalozky.

---

*Doplnek: ADR-073-074*


---

## Session 14 (v8.28 → v8.57)

### ADR-075 · Swipe gesta na dotyku, tlačítka myší na webu **(v8.48, v8.51, v8.53)**
Na mobilním/tabletovém rozhraní (dotyk) se akce u transakcí (edit/smazat/rozdělit) řeší SWIPE gestem, ne viditelnými tlačítky (překliky). Na webu s myší (`pointer: coarse` = false) zůstávají viditelná tlačítka ✂✎✕📷, protože swipe není dostupný. Účtenkové transakce (dotyk): swipe doleva → „Upravit" → `openReceiptInHistory`. Normální transakce (dotyk): tap edituje. Platí pro portrait i landscape.
- **Detekce:** `window.matchMedia('(pointer: coarse)')` — true = dotyk, false = myš.
- **🔗 Cross-reference:** FIX-163, FIX-165, ui.js `_txSwipeInit`

### ADR-076 · Transakce→Aktiva: napojení podle podkategorie, EUR→CZK, baseline model **(v8.49)**
Přesunové transakce (kategorie `type:'transfer'`) se propísují do Finančních aktiv. Klíč napojení = `catId::subcat` (`linkedKey` na aktivu). Jméno aktiva = podkategorie (ETF, Fondy…). Vklady v cizí měně se převádějí na CZK dle `_FX_RATES` (měna peněženky `t.wallet`). Ruční tržní hodnota se zachovává: `value = valueBaseline + (invested − investedAtBaseline)`. Existující ruční aktivum stejného jména se adoptuje (napojí, hodnota zůstane jako baseline). Smazané napojené aktivum se neobnoví (`S.noSyncKeys`, uloženo do Firebase). Převod používá aktuální kurz ČNB (ne historický).
- **Kritické ponaučení:** `S` je `let` (app.js:401) — NENÍ na `window`. Nikdy `window.S`.
- **🔗 Cross-reference:** FIX-160, ADR-077, ADR-078, assets.js `syncInvestmentAssets`

### ADR-077 · Likvidita přesunové kategorie určuje sekci Finančních aktiv **(v8.54)**
Přesunová kategorie nese pole `liq`: `'reserve'` (finanční rezerva – likvidní), `'mid'` (střednědobé/investiční), `'long'` (dlouhodobé/fyzické). Funkce `assetTier(a)` řadí aktivum: napojené → `linkedCatId → assetCatLiq()`, jinak `a.liqTier`, jinak typ (investment→mid, savings→reserve, ostatní→fixed). Bez ručního nastavení se `liq` odvozuje z názvu kategorie (rezerva/spoření→reserve, investice/fondy→mid, penzijko→long). Čtyři sekce: 👛 Peněženky · 🛟 Finanční rezerva · 📈 Střednědobá · 🏠 Fyzická.
- **Nastavení:** Upravit kategorii → Typ = Přesun → Likvidita aktiva (výběr + nápověda).
- **🔗 Cross-reference:** ADR-076, assets.js `assetCatLiq`, `assetTier`, `LIQ_GROUPS`

### ADR-078 · Hodnota investičních aktiv výhradně přes historii hodnoty **(v8.57)**
U střednědobých a investičních aktiv (`(ASSET_TYPES[type]).liq === 'invest'`) se pole „Aktuální hodnota" SKRÝVÁ v editaci aktiva. Hodnota se mění výhradně přes tlačítko 📈 „Historie hodnoty" (ruční ocenění) nebo automaticky z vkladů přesunů (ADR-076). Zabraňuje kolizi dvou vstupních bodů. U fyzických aktiv (nemovitosti, auta) pole v editaci zůstává.
- **🔗 Cross-reference:** ADR-076, assets.js `assetUpdateTypeHint`, `saveAsset`, `assetDepositEvents`

---

*Aktualizace Session 14: 2026-06-29 | v8.28 → v8.57 | ADR-075–078*

---

## Session 15 (2026-07-02 → 2026-07-06, v8.57 → v8.74)

> Nová architektonická rozhodnutí ze Session 15 (ADR-079 až ADR-085).

### ADR-079 · Zafixovaný kurz transakce v cizí měně (`amtCZK`) **(v8.58)**
- **Rozhodnutí:** Transakce v cizoměnové peněžence se při vložení zafixují na kurz z okamžiku vložení (pole `amtCZK`, kurz banky – ne živý ČNB). Jednou uložená hodnota se NIKDY nepřepočítává.
- **Důvod:** Živý přepočet měnil historické součty s každou změnou kurzu; kurz banky ≠ kurz ČNB.
- **Priorita čtení (`txCZK(t,D)`):** 1) `t.amtCZK` → 2) CZK peněženka → `amount` → 3) fallback živý kurz `toCZK`.
- **Status:** ✅ Nasazeno, jádro celé multi-currency architektury session.

### ADR-080 · Základní měna uživatele – zobrazovací vrstva **(v8.60–61)**
- **Rozhodnutí:** Nastavení → Lokalizace → základní měna (CZK/EUR/USD/GBP/PLN). Interní data zůstávají v CZK; zobrazení se přepočítává živým kurzem ČNB (`baseCur()`, `czkToBase()`, `fmtB()`, `fmtBP()`).
- **Rozsah:** Celá appka – dashboard, transakce, grafy, aktiva, projekty, dluhy, AI, radar, canvas grafy.
- **Status:** ✅ Nasazeno napříč všemi moduly do konce session.

### ADR-081 · Zaškrtávací nákupní seznam (`inCart`) **(v8.62)**
- **Rozhodnutí:** Nákupní seznam rozšířen o `inCart: bool` – zaškrtnutí ztlumí kartu, přeškrtne název, zařadí dolů. Lišta "V košíku X z Y" + Vysypat košík.
- **Status:** ✅ Nasazeno.

### ADR-082 · Hlavičky JS souborů při version bumpu **(v8.59)**
- **Rozhodnutí:** Při KAŽDÉM version bumpu se aktualizují hlavičky VŠECH změněných souborů (`// FinanceFlow · vX.XX · soubor.js · YYYY-MM-DD`).
- **Status:** ✅ Pravidlo dodržováno od v8.59 do konce session.

### ADR-083 · Rezerva vs. Aktivní spoření – oddělené vlajky kategorie **(v8.70, NOVÉ)**
- **Rozhodnutí:** Kategorie typu Přesun mají DVA vzájemně výlučné přepínače: 🛟 `isSaving` (finanční rezerva/spoření) a 📈 `isInvest` (investice/aktivní spoření). Modal "Do investic & spoření" seskupuje KAM podle těchto vlajek. Virtuální přesun (informativní, v8.71) nelze označit ani jedním – je mimo skórování i výběr KAM.
- **Důvod:** Milan potřeboval jasně rozlišit body za Rezervu (S3) a Aktivní spoření (S4) v dashboardu – dřív obě jely na jeden checkbox `isSaving`.
- **Status:** ✅ Nasazeno, propojeno do score enginu v8.72.

### ADR-084 · Sdílené výpočetní helpery pro dluhové metriky **(v8.72, NOVÉ)**
- **Rozhodnutí:** `computeMonthlyDebtPayments(D)` a `computeEffectiveIncome(D)` v `helpers.js` jsou JEDINÝ zdroj pravdy pro měsíční splátky dluhů a efektivní příjem. Používají je: Dluhový stres index, Bankovní hodnocení (DTI/DSTI), Dashboard Finanční skóre (S2 Zadluženost).
- **Důvod:** FIX-188 (DSTI 732 % vs 753 %) – tři místa počítala stejnou věc jinak.
- **Status:** ✅ Nasazeno.

### ADR-085 · Milanovy plné bodovací tabulky jako `_SCORING` **(v8.73, NOVÉ)**
- **Rozhodnutí:** `dashboard_body.xlsx` (S1 76 řádků, DTI 60, DSTI 41, S3 50, S4 31, bonus 13) načten 1:1 do `helpers.js` jako `const _SCORING` + lookup funkce `msc_S1/msc_DTI/msc_DSTI/msc_S3/msc_S4/msc_BONUS`. Nahrazuje dřívější zjednodušené 4-skokové tabulky v `premium.js`.
- **Důvod:** Milan poukázal na hrubé skoky (5 půjček = 25 stres bodů stejně jako 100 půjček) – jemné odstupňování řeší férovost hraničních případů.
- **Status:** ✅ Nasazeno do Dashboardu, Měsíčního reportu, Bankovního hodnocení i Dluhového stres indexu (v8.74).

---

*Aktualizace Session 15: 2026-07-06 | v8.57 → v8.74 | FIX-174–191 · ADR-079–085 · TODO-144–159*


---

# 📦 SESSION 16 (v8.74 → v8.90) — aktualizace 2026-07-12

> Číslování navazuje na ADR-085. Velká rozhodnutí mají i samostatné soubory (řada souborů: …ADR-061, **ADR-062-diff-write.md** — pozor, souborová řada je řidší než tato).

- **ADR-086 — Diff-write architektura (SCHVÁLENO, implementace S17 hotová v8.88).** Konec zápisu celé DB při každé změně: transakce → `data/transactions/{id}` objekt, zápis = jen změněné klíče (~1 KB místo ~1,5 MB, ~1500× méně). Implementováno jako **automatický shadow-diff v saveToFirebase** (bezpečnější než instrumentace mutací z původního plánu — nemůže minout žádné mutační místo). Lazy migrace při prvním uložení + jednorázová záloha `dataBackupV1`; `S.transactions` zůstává v paměti polem (33 modulů beze změny). Detail: soubor `ADR-062-diff-write.md`. **(Session 16)**
- **ADR-087 — S18 (fáze 2 diff-write) UDĚLAT BRZY, worker migrace ŠKRTNUTA.** Milanův princip „předcházet, ne hasit" + fakt 0 uživatelů a čerstvá data = nejbezpečnější okno pro přestavbu čtení (query 12M, child listenery, stats agregáty). Jednorázová přestavba, ne pravidelná údržba. **(Session 16)**
- **ADR-088 — Finanční skóre zobrazuje RAW body 0–310** (ne normalizaci 0–100). Pásma v bodech: Výborné ≥279 · Velmi dobré ≥233 · Dobré ≥186 · Průměrné ≥140 · Rizikové ≥93 · Kritické <93 (stejné poměry). Interní 0–100 zachováno pro kruh a AI. **(Session 16)**
- **ADR-089 — Trend metrik = Ø posledních 3 měsíců vs. Ø předchozích 3 (šipka + %).** Lineární regrese (v8.82) ZAMÍTNUTA jako nečitelná; Milanův návrh „součet meziměsíčních rozdílů" prokazatelně teleskopický (= poslední−první). Základna <1000 Kč → absolutní Kč. Konzistentní s Inflací životního stylu. **(Session 16)**
- **ADR-090 — Karta Úspory nahrazena Momentem** (Ø saldo 6 měs.) + podtitulek „tento měsíc ±X" (bodová hodnota zachována). Sloupec v Měsíc po měsíci přejmenován. **(Session 16)**
- **ADR-091 — Emergency Fund = hotovost + likvidní rezerva** (spořicí účet, termínovaný vklad); VYLOUČENO penzijko/DIP (`assetTier` fixed) i investice (mid). Jmenovatel = celkové měsíční výdaje. = „kolik měsíců přežiju bez příjmu". **(Session 16)**
- **ADR-092 — XSS obrana: sanitizace NA VSTUPU dat** (`sanitizeUserData` v load path, 5 míst vč. partnerových dat), ne výstupní escapování (50+ šablon). Doplněno rules validací délek per-transakce (v8.88). **(Session 16)**
- **ADR-093 — Typografický standard:** informační text ≥.68rem; barva `--text3` jen ≥.72rem; datové hodnoty ≥.7rem; bold uppercase mikro-badge ≥.62rem; canvas osy/popisky 10px Instrument Sans #a8aec8; SVG popisky ≥9; tooltipy povinné u všech grafů. (T1/T2/T4 hotové v8.89; T3 = TODO-178.) → zanést do CLAUDE.md. **(Session 16)**
- **ADR-094 — „Kam směřuju": Radar ≠ Obraz je ZÁMĚR, názvy zatím neměnit** (TODO-176). Radar = hybrid skutečnost+run-rate do konce měsíce (budoucí platby SE odečítají); Obraz = čistá 6M predikce z `predictCat` (budoucí platby jen informativní — jsou už v predikci). **(Session 16)**
- **ADR-095 — Nativní přepis do Kotlinu ZAMÍTNUT.** PWA a nativ nesdílejí kód → „postupný přepis" neexistuje; znamenalo by to 2 kódové základny navždy. Cesta: TWA (v plánu) → Capacitor při limitech TWA (nativní API, 1 základna) → plný nativ jen při výkonnostním stropu. **(Session 16)**
- **ADR-096 — Proces: smoke-testy skóre** (`tests/smoke.js`) běží před každým odevzdáním scoring změn; při záměrné změně vzorců se aktualizuje baseline + zapíše do patch notes. Správa: Claude; Milan vidí „✅". **(Session 16)**
- **ADR-097 — Deliverables: jen změněné soubory** (+ vždy app.html/admin.js/sw.js kvůli bump mašinérii); při práci z mobilu průběžně i kumulativní sada. **(Session 16)**

---

## Session 17 (v9.00–v9.42)

### ADR-063 · Zakládající cena přes samostatnou cenu, ne kupón
**Kontext:** 99 Kč/měs a 990 Kč/rok pro prvních 100 uživatelů, se slibem „cenu si zamkneš napořád".
**Rozhodnutí:** Ve Stripe vytvořit **samostatný produkt/cenu + vlastní Payment Link**, nikoli kupón nad běžnou cenou.
**Důvod:** Kupón má omezenou dobu platnosti (`duration`) — po jejím vypršení by cena skočila na 149 Kč a slib „napořád" by padl. Samostatná cena platí, dokud předplatné běží.
**Důsledky:** Po vyčerpání 100 míst se odkaz jen přestane nabízet; kdo ho má, platí dál. Počítadlo `stats/founderCount` inkrementuje webhook podle price ID (`STRIPE_PRICE_FOUNDER`, `STRIPE_PRICE_FOUNDER_YEARLY`); klient jen čte.
**Pozor:** Promo kódy povolené na checkoutu by šly uplatnit i na zakládající cenu → při vytváření kupónů je omezit na konkrétní produkty.

### ADR-064 · Trial bez karty, platba až po jeho skončení
**Rozhodnutí:** 30denní trial se aktivuje tlačítkem v aplikaci, **nevyžaduje kartu** a nepřeklápí se automaticky na placené předplatné. Trial ve Stripe se **nepoužívá**.
**Důvod:** Nižší bariéra vstupu u nové aplikace bez referencí. Milan explicitně nechce nikoho tlačit k platbě dřív, než si appku vyzkouší.
**Důsledky:** Nižší konverze než u trialu s kartou — kompenzováno **připomenutím konce trialu** na Dashboardu (posledních 7 dní, rostoucí naléhavost). Dva paralelní trialy (appka + Stripe) by umožnily dva měsíce zdarma → Stripe trial nesmí existovat.
**Dedup:** `trialsUsed/{emailKey}` brání vzít trial dvakrát na různé účty. Zápis je **bonus, ne podmínka** — jeho selhání nesmí shodit aktivaci.

### ADR-065 · Data, která uživatel nesmí měnit, patří mimo jeho podstrom
**Kontext:** Právo zápisu ve Firebase kaskáduje shora dolů a v hlubším uzlu už nejde odebrat.
**Rozhodnutí:**
- Omezení uvnitř `users/{uid}` řešit přes **`.validate`** (nekaskáduje), ne přes `.write`.
- Data plně mimo dosah uživatele ukládat do **top-level uzlů**: `banned/{uid}`, `premiumLog/{uid}`, `stripeCustomers/{id}`, `stats/founderCount`.
**Důvod:** Ban uvnitř `users/{uid}` by si uživatel smazal. Audit log uvnitř by šel přepsat.
**Admin:** Dostal `.write` **výhradně na `users/{uid}/premium`** — záměrně ne na finanční data uživatelů.

### ADR-066 · Aplikace nehodnotí útraty za uživatele
**Kontext:** Měsíční review (TODO-198) sbírá hodnocení útrat 1–5.
**Rozhodnutí:** Aplikace **nikdy sama neoznačí útratu za zbytečnou**. Heuristika smí nanejvýš zobrazit průměr uživatelových vlastních dřívějších hodnocení (min. 3 záznamy) jako orientační „Ø".
**Důvod:** Appka, která vyčítá, se maže. Rozdíl mezi 2 000 Kč za večeři s rodinou a 2 000 Kč za impulzivní nákup nejde z dat odvodit — leží výhradně v hlavě uživatele.
**Formulace:** Souhrny mluví o **budoucnosti** („kdybys polovinu přesměroval, je to X Kč za rok"), ne o minulosti („vyhodil jsi X Kč").

### ADR-067 · Hlavní cenová metrika = cena za balení
**Kontext:** Inflace a Zdražování porovnávají ceny v čase.
**Rozhodnutí:** Hlavní metrikou je **cena za balení / za kus** — to, co uživatel reálně zaplatí. Přepočet na Kč/kg jen u zboží skutečně prodávaného na váhu (`unit === 'kg' | 'l'`). U baleného zboží je Kč/kg **doplněk pro detekci shrinkflace**.
**Důvod:** „Rohlík 43 g = 81 Kč/kg" je matematicky správně a pro uživatele nesmysl.
**Technicky:** Klíč položky musí obsahovat jednotku, jinak se porovná Kč/ks proti Kč/kg.

### ADR-068 · Verzování souborů nasazovaných zvlášť
**Rozhodnutí:** `worker.js` a `database_rules.json` mají v hlavičce číslo verze, **kdy se naposledy skutečně změnily** — ne aktuální verzi aplikace. Při dodávce se výslovně uvádí, jestli je potřeba je nasadit.
**Důvod:** Nasazují se ručně mimo hash chain. Držet u nich stejné číslo jako u aplikace by znamenalo nasazovat je při každém bumpu bez funkční změny.

---

## Session 18 (v9.42–v9.78) **(2026-08-03)**

### ADR-098 · Portfolio ceny — fáze 1 bez API klíče uživatele
**Kontext:** TODO-201, karta pro sledování investičního portfolia.
**Rozhodnutí:** Fáze 1 = ruční pozice (ticker + počet kusů) + **automatické ceny** z veřejných zdrojů (Stooq pro akcie, CoinGecko pro krypto) přes worker endpoint `/quotes`, vzorem podle existujícího `/cnb`. Žádné napojení na burzovní účet uživatele.
**Důvod:** Napojení na skutečný brokerský účet je jiná bezpečnostní kategorie (OAuth, API klíče uživatele) a jiný časový horizont. Fáze 1 dá hodnotu bez tohoto rizika.
**Otevřeno:** tarif Pro vs. Premium — nerozhodnuto, čeká na Milana.
🔗 Plán: `PLAN-portfolio-ceny.md`.

### ADR-099 · Diff-read okno 12M — postaveno a odstraněno v téže session
**Kontext:** TODO-177 fáze 2b — omezení úvodního načtení transakcí na posledních 12 měsíců, aby se nestahovala celá historie při startu appky.
**Rozhodnutí:** Implementováno ve v9.55 s trojí pojistkou (guard proti smazání dat při neúplné historii, fallback, vypínač), **odstraněno ve v9.57**.
**Důvod (Milanova slova):** „já to stejně zapínat nikdy nebudu ani žádný uživatel aplikace." Přínos byl čistě výkonový (rychlejší start s roky historie), riziko datové. U appky s nulovým až nízkým počtem uživatelů a krátkou historií není problém, který by to řešilo.
**Poučení zapsáno explicitně:** než se staví bezpečnostně citlivá funkce, ověřit, jestli problém, který řeší, vůbec existuje — ne až po postavení.
**Co zůstalo:** diff-read fáze 2 (transakce po záznamech, v9.46) — ta řeší reálný problém (průběžný sync) a zůstává.

### ADR-100 · Recenze v aplikaci — texty vidí jen admin
**Kontext:** TODO-210, hodnocení aplikace před spuštěním na Google Play.
**Rozhodnutí:** Uzel `reviews/{uid}` je zapisovatelný jen vlastníkem, čitelný pro přihlášené uživatele (kvůli výpočtu souhrnu na klientovi), ale **veřejně se zobrazuje jen agregát** (průměr + počet). Text recenze čte jen admin panel.
**Důvod:** Nečekat na Google Play se zpětnou vazbou od prvních uživatelů, ale nezveřejňovat cizí komentáře bez moderace.
**Firebase:** uzel je mimo `users/{uid}`, takže kaskáda `.write` neplatí — pravidla musí být explicitní (viz ADR-063/065 princip).

### ADR-101 · Finanční obraz — 9 očíslovaných sekcí, pevné pořadí
**Kontext:** Finanční obraz v2 rozrostl na množství karet bez zjevné struktury.
**Rozhodnutí:** Pevné číslované pořadí 1–9: Cesta finančního zdraví → Hlavní metriky → Kam směřuju → Pokročilé metriky (Lifestyle) → Nezávislost a stabilita → Majetek → Měsíc po měsíci → Od výplaty k výplatě → Ušlý zisk. Nové karty se řadí do existujícího čísla, nepřidávají nové bez domluvy.
**Důvod:** Umožňuje odkazovat na konkrétní sekci číslem („bod 5") a udržuje konzistenci mezi verzemi při postupném doplňování.

### ADR-102 · Report (`report.js`) — sektor odvozen z dat, ne z ručního přiřazení
**Kontext:** v9.52 zavedla ruční přiřazení kategorie → sektor; Milan upozornil, že to nedává smysl, protože kategorie u něj **už je** nejvyšší úroveň a podkategorie jsou pod ní.
**Rozhodnutí:** Sektor = kategorie, řádek matice = podkategorie. Hierarchie se čte přímo z dat (`t.subcat`), žádné ruční přiřazování.
**Zrušeno:** editor sektorů z v9.52 (celý blok), taby „Tento měsíc" a „Kumulace roku" (obsah pokrývají Grafy→Roční a Grafy→Všechny roky od v9.47–9.48).
**Poučení:** navrhované řešení bylo nasazeno bez zpětné vazby od uživatele o skutečné datové struktuře — příště ověřit dřív.

### ADR-103 · Kontrolní skript nad statickou pozorností
**Kontext:** Čtyři pády appky ve stejné session na chybu „proměnná použita před deklarací", kterou `node --check` nezachytí.
**Rozhodnutí:** `tools/check_tdz.js` jako povinný krok před dodávkou, ne jen `node --check`. Po dvou neúspěšných regexových pokusech (nezvládly blokový scope JS) přepsán na skutečný parser (`acorn` + `acorn-walk`).
**Důvod:** Spoléhat na to, že si autor kódu chybu sám všimne, selhalo čtyřikrát za sebou. Nástroj, který chybu najde mechanicky, je spolehlivější než pozornost.
**Závislost:** vyžaduje `npm install --save-dev acorn acorn-walk` v repu (jednorázově), `node_modules/` a `tools/` jsou vyloučené z nasazení (`firebase.json`).

---

## Session 19 — nová ADR (v9.79–v9.98) **(2026-08-21)**

### ADR-099 · Referenční kurz ČNB se ukládá k transakci, ne dopočítává
**Rozhodnutí:** u cizoměnové transakce se ukládá `fxRef` (kurz ČNB) a `fxRefDate`
(datum lístku). Kurz banky se **neukládá** — dopočítá se jako `amtCZK / amount`.

**Proč ne databáze kurzů:** denní snímky celého kurzovního lístku by zabraly
mnohonásobně víc místa a nic navíc by neřekly. Historický kurz je odvoditelný
z už uložených dat, stačí k nim připsat jedno číslo.

**Ukládá se JEN živý kurz z ČNB.** Když Worker neodpoví, `kurzy.js` nechá orientační
průměry z `_FX_RATES` — zapsat je jako „referenční ČNB" by byla lež a marže by se
počítala proti vymyšlenému číslu. Radši žádný údaj než špatný.

**v9.97:** kurz se bere k **datu transakce**, ne k datu zápisu. Worker `/cnb` přijímá
volitelný `?date=DD.MM.RRRR`. Dohledání běží po uložení a bez `await`.

### ADR-100 · Filtr přesunů v `getActual()` není plošný
**Rozhodnutí:** `isTransferTx` se v `getActual()` a `getHistAvg()` uplatní jen tehdy,
když dotazovaná kategorie **sama není přesunová**.

**Proč:** kategorie spoření a investic (Investice, Trading, Finanční rezerva, Spoření,
Fondy, Penzijko) jsou typu `transfer`, takže `isTransferTx()` je u nich vždy `true`.
`premium.js:1520` (S4 Aktivní spoření) a `projects.js:512` (savingScore) na `getActual()`
nad těmito kategoriemi **přímo stojí**. Plošný filtr by jim vrátil **nulu** a poctivě
spořícímu uživateli by spadlo Finanční skóre až o **35 bodů**.

**Pravidlo:** ptá-li se volající přímo na přesunovou kategorii, chce vidět, co do ní
přiteklo. Ptá-li se na výdajovou kategorii, přesun tam nepatří. Rozhoduje se podle
**argumentu**, ne podle volajícího → žádné ze 37 volání se nemuselo měnit.

Důkaz ve `tools/audit_transfer.js`, audit v `AUDIT-FIX252-faze2.md`.

### ADR-101 · `amtCZK` a `fxRef` tvoří nedělitelný pár
**Rozhodnutí:** oba údaje musí vždy popisovat **týž stav transakce**.
Dokud se nemění částka ani měna, zůstávají **zmrazené** — historická útrata se
nepřepisuje dnešním kurzem. Jakmile se jedno z toho změní, jde o **nové měření**
a přerazí se **oboje**. Když uživatel změní částku a do pole „Skutečně v Kč" nesáhne,
částka se přepočte místo tichého ponechání staré hodnoty.

**Proč:** nahlásil Milan dvě cesty, jak se údaje rozejdou — viz FIX-259/261 v `bugs.md`.
Bez tohoto pravidla by appka počítala kurz ze dvou čísel popisujících jiný stav.

### ADR-102 · Zálohy jako jeden JSON řetězec, mimo `users/{uid}/data`
**Rozhodnutí:** snímek do `users/{uid}/backups/{YYYY-MM-DD}` jako **jeden JSON řetězec**,
ne jako strom. Rotace na 5, strop 6 MB.

**Proč mimo `data`:** uzel `data` má rozšířené `.read` pro partnera, se kterým uživatel
sdílí finance. Zálohy vidí jen vlastník a admin. Zápis kaskáduje z `users/$uid` →
**Firebase pravidla se nemění**.

**Proč řetězec:** zápis i obnova jsou atomické (nehrozí půl obnovené zálohy), RTDB
neúčtuje režii za každý klíč a diff-write si zálohu nesplete s živými daty.

**⚠️ Obnova vynutí `_dw.ready = false`.** Nestačí vynulovat podpisy diff-write —
transakce, které v záloze nejsou, by v databázi zůstaly (mazání se odvozuje z předchozích
podpisů) a při dalším načtení by se **vrátily**. Obnova by fungovala jako sloučení.

### ADR-103 · Evidence aktivity bez osobních údajů navíc
**Rozhodnutí:** `users/{uid}/activity` — čas posledního použití, počet spuštění, značka
aktivního dne, verze aplikace, PWA vs. prohlížeč, čas první transakce. **Žádná IP, poloha
ani otisk zařízení** — to by vyžadovalo souhlas dle GDPR. Evidence vlastního účtu je
provoz služby.

**Ne v `profile`:** ten má `.read: "auth != null"`, takže by na aktivitu viděl každý
přihlášený uživatel (kvůli sdílení jmen a fotek partnerům).

**Skóre:** objem = **aktivní dny za 30 dní** (20+ = plných 60 b), čerstvost = dny od
skutečného použití (0–40 b). U účtů bez evidence se skóre **neukazuje vůbec** —
falešná nula je horší než žádné číslo.

### ADR-104 · Denní doba u vzorců se nesleduje
**Rozhodnutí:** vzorce v měsíčním review pracují jen s dnem v týdnu, způsobem platby,
druhem nákupu a velikostí útraty. **Denní doba ne.**

**Proč:** transakce nesou pouze datum `YYYY-MM-DD`. Čas neukládá ruční zápis, import
z banky ani parser účtenek. Ve v9.92 se zavedl sběr času **zápisu** jako náhrada,
o verzi později (v9.93) **zrušen** — Milan doplňuje transakce i druhý den, takže by
čas zápisu s časem nákupu nesouvisel a vzorec „večer utrácím špatně" by byl vymyšlený.

**Ukládat data, která nikdy nedají spolehlivou odpověď, nemá smysl.**

### ADR-105 · Kurzová ztráta není samostatný výdaj
**Rozhodnutí:** žádná automatická kategorie „Kurzové ztráty". Ztráta se zobrazuje
**u transakce**, které se týká — v řádku seznamu, v souhrnu období, v Detektoru
a u Projektů.

**Proč:** kategorie by rozbila součty. Ty peníze jsou už započítané v `amtCZK` původní
transakce, počítaly by se **dvakrát**. Navíc automaticky zapisované transakce nemá
uživatel jak opravit ani smazat — a appka nevytváří záznamy, které uživatel nezadal.

### ADR-106 · Osa života nemá křivku čistého jmění
**Rozhodnutí:** tři křivky — příjmy, výdaje, **kumulovaný tok** (nasčítané příjmy − výdaje).

**Proč:** čisté jmění historicky spočítat **nelze** — aplikace nezná stav aktiv a dluhů
zpětně po měsících, jen dnešní. Musela by se dokreslit. Kumulovaný tok se z transakcí
odvodit dá. Rozdíl je uživateli vysvětlený přímo pod grafem.

**Historie se neořezává** (rozhodnutí Milana po první verzi). Přizpůsobuje se hustota:
do 4 let po měsících, do 12 let po čtvrtletích, dále po letech. U slučovaných košů
ukazují křivky **průměr na měsíc**, ne součet — jinak by přechod udělal umělý skok.

### ADR-107 · Prahy pro zobrazení odvozených údajů
**Rozhodnutí:** dokud data nestačí, karta se **nezobrazí vůbec** místo toho, aby ukazovala
nesmysl.

| Co | Práh |
|---|---|
| Graf vývoje útraty projektu | 4+ transakce (ze dvou bodů je úsečka) |
| Srovnání projektů | 2+ **ukončené** projekty téhož typu |
| Vzorec v měsíčním review | 5+ útrat v koši **a** rozdíl 0,6+ bodu |
| Osa života | 3+ měsíce dat |
| Nález kurzových ztrát | 3+ platby za rok a ztráta nad 200 Kč |
| Souhrn hodnocení | pod 15 % pokrytí se přidá varování |

### ADR-108 · Vstupní pole: popisek a převod vždy společně
**Rozhodnutí:** změnit popisek peněžního pole na základní měnu je povoleno **jen současně**
s převodem na **obou** stranách — `moneyInRead()` při ukládání, `moneyInFill()` při načtení
do editace.

**Proč:** hodnoty se ukládají syrově jako CZK. Samotná změna popisku by způsobila tichou
ztrátu dat — uživatel napíše 1000 s myšlenkou 1 000 €, uloží se 1 000 Kč. Chybí-li plnění,
hodnota se při každé editaci vynásobí kurzem znovu: 25 000 → 632 500 → 16 milionů.

**Round-trip test je podmínkou, ne doplňkem** (`tools/smoke_moneyin.js`).

---

## Session 19 — druhá vlna ADR (v9.99–v10.03) **(2026-08-24)**

### ADR-109 · Zobrazení částek v tabulkách
**Rozhodnutí (Milan):** *„Nemusíš do každé tabulky připisovat příznak Kč, stačí někde
do popisku, podstatné je aby se přepočítala částka. Důležité tam nemíchat jiné jednotky."*

| Kde | Jak |
|---|---|
| Matice a tabulky | holá čísla, symbol **jednou** v hlavičce nebo popisku |
| Samostatné hodnoty | `fmtB()` — symbol si nese sám |
| Popisky s vlastní jednotkou (`Kč/kg`, `Kč/měs`) | `_cNum()` + `curSym()` |
| Počty kusů | **nepřevádět** — nejsou to peníze |

**Výjimka:** Predikce ponechána s „Kč" v každé buňce — rozhodnutí Milana
*„kupodivu to nevypadá špatně (ponechej)"*.

### ADR-110 · Základní data se doplňují, ne seedují jednorázově
**Rozhodnutí:** místo „existuje uzel `/data`?" se aplikace ptá **„má uživatel to,
bez čeho nefunguje?"** a chybějící doplní (`ensureBaseData`).

Idempotentní — co uživatel má (včetně vlastních a záměrně smazaných výchozích),
se nesahá. Běží při každém přihlášení, takže opraví i účty, které už jsou poškozené.
Nová peněženka je **jedna neutrální**, ne sada, kterou by uživatel musel mazat.

### ADR-111 · Chybějící uzel ≠ smazaná data
**Rozhodnutí:** posluchač rozděleného čtení nesmí vyprázdnit lokální pole jen proto,
že klíč v databázi neexistuje.

Nelze rozlišit „nikdy nezapsáno" od „smazáno", ale **dá se rozlišit, jestli klíč
v tomto sezení už existoval** (`_splitSeen`). Dokud jsme ho neviděli → nepřítomnost dat,
lokální hodnota zůstává. Jakmile existoval a zmizel → skutečné smazání.

### ADR-112 · Klíč položky v Inflaci: raději rozdělit než sloučit
**Rozhodnutí:** klíč zachovává **čísla a procenta** a neořezává se.
Normalizuje se jen diakritika, velikost písmen a interpunkce; slova delší než 5 znaků
se zkracují, aby se `POLOTUC.` spárovalo s `polotučné`.

**Důvod — asymetrie škod:**
- rozdělí-li se položka na dvě, každá má jedinou cenu a z indexu **vypadne**
- sloučí-li se dvě různé, index si **vymyslí zdražení**

### ADR-113 · Skóre má dynamický jmenovatel
**Rozhodnutí (TODO-227):** co nelze změřit, se **nehodnotí** — složka vypadne
z čitatele i **jmenovatele**. Skóre = dosažené / **dosažitelné**.

Nový uživatel dostával **217/310 = 70/100 „Dobré"** ještě než zadal první transakci,
z toho 181 bodů (58 %) zadarmo za to, že nic nemá. Všechny neutrální výchozí hodnoty
(36, 25, 18, 38) zrušeny.

**Prahy hodnocení se počítají z dosažitelného maxima**, ne z pevných 310 — kdo má
měřitelnou jen jednu složku, dostane hodnocení podle toho, jak si v ní vede.
Bez jediné měřitelné složky vrací skóre `null`.

**„Nemám dluh" vs. „nezadal jsem" vypadá v datech stejně** — plný počet za S2 se
přizná jen po potvrzení (`_settings.hasDebts === false`). Nemít dluh je opravdu dobře,
ale aplikace to musí **vědět**, ne předpokládat. Navazuje na onboarding.

### ADR-114 · Detektor: každá útrata se počítá jen jednou
**Rozhodnutí:** detektory si transakce „zabírají" (`_claimed`), v pořadí
od nejjistějších po nejspekulativnější.

Bez toho padla jedna útrata do tří nálezů a součet dosáhl **110 % z útraty,
kterou uživatel vůbec má**.

**Souhrn se zobrazuje jako rozsah**, ne jedno číslo, a odděluje **doložitelné**
(poplatky, refinancování, kurzy — ze skutečných čísel) od **odhadu**.
Koeficienty (`×0,25` u předplatných apod.) jsou dohady bez opory v datech —
sečíst je do jednoho čísla znamená tvrdit, že jsou stejně spolehlivé.

### ADR-115 · Kontrola úplnosti účtenky
**Rozhodnutí:** součet položek se porovnává se sumou natištěnou na dokladu,
tolerance **1 Kč** (zaokrouhlení hotovosti).

Rozdíl se hlásí **neutrálně** („chybí / přebývá"), ne jako chyba AI — bývá to
i vratná záloha, poukázka nebo sleva na celý doklad.
