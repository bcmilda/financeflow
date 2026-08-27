# FinanceFlow – Bugs & Fixes

> **Zdrojový soubor (základ):** `bugs_consolidated_2026-05-15_s6.md` (konsolidace Sessions 1–6)
> **Aplikované patche Session 8:** `patch-session8.md` (2026-05-24), verze v6.51–v6.65
> **Předchozí patche Session 7:** sekce bugs ze souboru `patch-session7-COMBINED(1).md` – Session 7.0 (2026-04-25) + Session 7.1 (2026-04-30)
> **Procedura:** Aplikace S7 combined patche na S6 základ. Dočasná ID z patche přečíslována sekvenčně navazující na FIX-050 a OPEN-025 → FIX-051–052, OPEN-026–030. Nová data označena `**(Session 7.0)**` / `**(Session 7.1)**`.
> **Datum poslední aktualizace:** 2026-05-15
>
> Konsolidovaný dokument ze **7 sessions (vč. 7.1)**. Bugy jsou přečíslovány pod unikátní ID `OPEN-001+` / `FIX-001+`.
> Každý záznam je označen zdrojovou session: `**(Session N)**`.
> Doplnění ze `s5` jsou označena `**(Merge S1-5)**`.
> Poslední aktualizace: 2026-05-28 (Session 9 patch).

---

## 📋 TL;DR – Stav otevřených bugů

| Priorita | Počet | Příklady |
|---|---|---|
| 🔴 Kritické | 1 | **AI Rate Limiting chybí** – Worker otevřený pro zneužití (TODO-075) |
| 🟡 Střední | 11 | Auto téma (reopen), Box plot záložka, Predikce modré hodnoty (ověřit), popup blokován, kategorie race, DTI fallback, PDF size, **Import preview crash** (S7.0), **Bubliny pod lištu** (S7.1), **Gradient bez sdílených** (S7.1), **Report přepočet periody** (S7.1) |
| 🟢 Nízké | 8 | Loading, testy, měsíční graf, .xlsm, Safari appearance, offline login, COICOP trend, diakritika |

**Celkem aktuálně otevřených:** ~20 bugů
**Vyřešeno Session 8 (v6.60–v6.65):** OPEN-003 ✅, OPEN-026 ✅
**Nové Session 8:** OPEN-031, OPEN-032, OPEN-033, OPEN-034
**Nové FIX Session 14:** FIX-160–173 (vše vyřešeno v S14)
**Uzavřeno v S14:** OPEN-034 (ověřeno v provozu)
**Vyřešeno Session 9:** žádné OPEN uzavřeny
**Nové FIX Session 9:** FIX-079–089 (přečíslováno ze S9 patche)
**Vyřešeno v Session 5 (v6.45):** 4 opravy grafů (FIX-042–045)
**Vyřešeno v Session 6 (v6.47–v6.48):** OPEN-001 Email ✅, OPEN-002 Grafy ✅, OPEN-022 Predikce ✅, OPEN-023 GitHub Pages ✅, OPEN-024 lepsi-uver.html ✅, OPEN-025 CORS Worker ✅ — plus FIX-046 až FIX-050
**Vyřešeno v Session 7.0 (v6.49):** FIX-051 (referrals Firebase Rules), FIX-052 (PDF JSON parsing)
**Vyřešeno v Session 7.1 (v6.49–v6.50):** FIX-053 (computeAssetsNetWorth kolize)
**Nové otevřené S7.0:** OPEN-026 (import preview crash)
**Nové otevřené S7.1:** OPEN-027 (bubliny pod lištu), OPEN-028 (Gradient bez sdílených), OPEN-029 (report přepočet periody), OPEN-030 (Plány záložka nefunkční)

---

## 🔴 OTEVŘENÉ CHYBY – Kritické

### ~~OPEN-001~~ · ~~Email notifikace nefungují~~ ✅ VYŘEŠENO S6 **(Session 3)**
- **Soubor:** `premium.js`, `financeflow-worker-v4.js` → `cloudflare-worker/worker.js` (v5)
- **Reprodukce:** ~~Vyplnit kontaktní formulář → odeslat → email nepřijde~~

#### Technická příčina
Resend free tier neumožňuje posílat na libovolnou adresu bez verified domény.
Z adresy `onboarding@resend.dev` lze posílat **pouze na email registrovaný na Resend účtu**.
Jakýkoli jiný adresát je tiše zahozen.

#### Řešení A – Ověřit Resend účet
1. Přihlásit se na `resend.com`
2. Zkontrolovat, zda je `bc.milda@gmail.com` registrovaný email na účtu
3. Pokud **ano** → emaily začnou přicházet okamžitě bez dalších zásahů
4. Pokud **ne** → buď přidat ten email na účet, nebo zvolit řešení B

#### Řešení B – Přejít na EmailJS
- **Výhoda:** Nevyžaduje doménu ani registraci příjemce
- **Cena:** Zdarma 200 emailů / měsíc (free tier)
- **Setup:** ~10 minut
- **Co potřebuji:** Service ID + Template ID + Public Key z `emailjs.com`
- **Kde se to přidá:** `premium.js` (nahradí aktuální Worker fallback)

#### Řešení C – Ověřit vlastní doménu na Resend
- **Výhoda:** Emailová šablona z vlastní domény (působí profesionálněji)
- **Nevýhoda:** Vyžaduje vlastní doménu (viz `todo.md` TODO-040)

#### ⚠️ Security kontext
Viz FIX-041 – Resend klíč byl rotován (původní leaknutý přes GitGuardian), nový hardcoded
v kódu taktéž deaktivován.

**(Session 5 update):** Worker v5 je připraven v repozitáři (`cloudflare-worker/worker.js`) —
klíč **už není hardcoded** v kódu, čte se z `env.RESEND_API_KEY`. Ale:
- ❌ **Deploy do Cloudflare zatím neproběhl** (uživatel ho nespustil)
- ❌ **`RESEND_API_KEY` env proměnná v Cloudflare dashboardu** není nastavena
- **Akce:** 1) Nastavit `RESEND_API_KEY` v Cloudflare Worker → Settings → Variables → Secret. 2) Deploy Worker v5.

**(Session 6 update):** ✅ **VYŘEŠENO** – Použito **Řešení A** (ověření Resend účtu). Řešení nebylo zcela přímočaré, ale podařilo se. Worker v5 nasazen do Cloudflare, `RESEND_API_KEY` env proměnná nastavena v Cloudflare Secrets. Emaily přicházejí na `bc.milda@gmail.com`. 🔗 Viz FIX-041 (deploy Worker v5), ADR-017 (`decisions.md`).

#### 🔗 Cross-reference
- `explanations.md` sekce 2 – detailnější vysvětlení Resend free tier omezení
- `todo.md` TODO-003 – akční úkol (✅ DOKONČENO S6)
- `architecture.md` sekce 7 – Resend konfigurace
- `bugs.md` FIX-046, FIX-047

### ~~OPEN-002~~ · ~~Grafy prázdné~~ ✅ VYŘEŠENO S6 **(Session 3 + 4 + 5 + 6)**
- **Soubory:** `charts.js`, `helpers.js`
- **Historie oprav:**
  - **S3 (FIX-026):** `requestAnimationFrame(() => setTimeout(fn, 50))` → **nestačilo**
  - **S4 (FIX-040):** Rozšíření na 4 vrstvy – dvojitý `rAF`, retry 5× → **stále nefungovalo**
  - **S5 (FIX-042 až FIX-045, v6.45):** 4 konkrétní opravy:
    1. `initGrafFilters()` – infinite loop kvůli hoisting problému ✅
    2. Chybějící `renderKumulChart()` – kumulativní graf se nevykresloval ✅
    3. HTML layout – `gtab-vsechny-content` vnořen do `gtab-rocni-content` ✅
    4. Box plot – canvas ID neexistoval ✅
  - **S6 (v6.47):** ✅ **Potvrzeno Milanem** – záložky Obecné/Měsíční/Roční/Všechny roky fungují. Predikce opravena (FIX-049).
- **Stav:** ✅ Záložky grafů fungují, Predikce tabulka funguje, potvrzeno Milanem.

### ~~OPEN-022~~ · ~~Predikce – tabulka se nezobrazuje~~ ✅ VYŘEŠENO S6 **(Session 5 → 6)**
- **Sekce:** Grafy → Predikce
- **Popis:** Po opravě grafů v S5 (FIX-042 až FIX-045) přestala fungovat sekce Predikce.
- **Příčina:** Chybějící funkce `computeYearForecast()` v `helpers.js` – vedlejší efekt oprav S5.
- **(Session 6 update):** ✅ **VYŘEŠENO** – `computeYearForecast()` přidána do `helpers.js` (FIX-049, v6.47). Potvrzeno Milanem.
- **🔗 Cross-reference:** FIX-049, `todo.md` TODO-049 (✅ DOKONČENO S6)

### ~~OPEN-003~~ · ~~PDF import – token limit~~ ✅ VYŘEŠENO S8 **(v6.60–v6.61)**
- **Původní příčina:** Velké PDF výpisy (>200 transakcí) selhávají na `stop_reason: max_tokens`

**(Session 7.0 update):** ⚠️ ČÁSTEČNĚ VYŘEŠENO – pdf.js 3.11.174 text extraction + chunking 15 stránek/dávka nasazeno. PDF se načte a přečte správný počet stránek. Viz FIX-052, ADR-032.

**(Session 7.1 reopen – screenshot 2026-05-19):** 🔴 DVA NOVÉ BUGY objeveny při testování:
- **Bug A – chybějící transakce:** Import vrátil 70 transakcí místo 72 (ztráta 2 transakcí při chunkovém zpracování). Root cause: pravděpodobně boundary error při dělení stránek nebo merge výsledků.
- **Bug B – crash při editaci:** Po kliknutí "Přidat a editovat" aplikace přestala reagovat – dlouhé načítání, vysoká spotřeba výkonu, záseknutí prohlížeče, žádná odpověď. Root cause: neznámý, pravděpodobně infinite loop nebo paměťový leak při zpracování velkého JSON výsledku.

- **(Session 8 update):** ✅ VYŘEŠENO – FIX-067 (KB EUR + Vyrovnávací úhrada prompt), FIX-068 (chybějící modal), FIX-068b (pořadí open/render). Výsledek: 72/72 transakcí, Import Editor otevírá správně.
- **🔗 Cross-reference:** FIX-067, FIX-068, FIX-068b, `architecture.md` sekce 18

> ⚠️ **Konflikt S1 vs S2 (Merge S1-5):** S1 uvádí PDF limit >10 MB (Worker size), S2 uvádí >200 transakcí (token limit). Obě příčiny jsou relevantní a nezávislé — jde o dva různé selhávací módy.

---

### OPEN-031 · Bubble chart – přetékání bublin ze SVG **(Session 8)**
- **Soubor:** `ui.js` → `bCluster()`
- **Popis:** Satelitní bubliny přetékají mimo SVG viewBox na pravém a dolním okraji. FIX-072 (padding 60px) nezabral.
- **Root cause:** Absolutní px souřadnice nekontrolují hranice viewBox.
- **Akce:** Přepsat na force-directed layout nebo relativní % souřadnice s clip-path.
- **Priorita:** 🟡 Střední — vizuálně nepoužitelné
- **🔗 Cross-reference:** TODO-076, FIX-072, nahrazuje OPEN-027

### OPEN-032 · Sentry JAVASCRIPT-2 – Ongoing navzdory kódové opravě **(Session 8)**
- **Soubor:** `import.js`, `index.html`
- **Popis:** Sentry stále hlásí `renderImportEditor → importEditorStats is null`. Modal přidán (FIX-068), pořadí volání opraveno (FIX-068b), ale Sentry issue zůstává Ongoing.
- **Teorie:** Cache starého eventu v Sentry, nebo Milan testoval na staré verzi.
- **Priorita:** 🟡 Střední
- **Stav:** Sledovat — po deployi v6.60+ by mělo zmizet samo.

### OPEN-033 · Stripe / Donate – chybí Payment Link hodnoty **(Session 8)**
- **Soubor:** `donate.js`
- **Popis:** Konstanty `DONATE_PAYMENT_LINK_TEST/LIVE` a `PREMIUM_MONTHLY/YEARLY_LINK` jsou `REPLACE_ME`. Stripe Payment Links nevytvořeny.
- **Akce:** Milan musí vytvořit Stripe produkty v Stripe Dashboard a vyplnit konstanty.
- **Priorita:** 🟡 Střední
- **🔗 Cross-reference:** TODO-073, FIX-065

### OPEN-034 · FIX-058 komprese fotek – netestováno **(Session 8)**
- **Soubor:** `receipts.js`, `offline-sync.js`
- **Popis:** Dvojí komprese účtenek opravena (FIX-058), ale nebyla fyzicky otestována focením.
- **Priorita:** 🟢 Nízká
- **Akce:** Otestovat: ofotit účtenku → ověřit že se nekomprimuje 2×


## 🟡 OTEVŘENÉ CHYBY – Střední priorita

### OPEN-004 · PDF import – Cloudflare Worker size limit **(Session 1)**
- **(Session 10):** ČÁSTEČNĚ 🟡 – UI hláška max 10 MB je, ale chybí runtime kontrola velikosti. Zůstává otevřené.
- **Příčina:** Velké PDF (>10 MB) selžou na Cloudflare Worker size limitu bez uživatelsky přívětivé chyby
- **Poznámka:** Jiný problém než OPEN-003 – tam je problém s token limitem, tady s velikostí requestu

### OPEN-020 · Auto téma vizuálně nerozeznatelné od Světlého **(Session 4, reopen)**
- **(Session 10):** VYŘEŠENO ✅ (není bug) – applyTheme('auto') větví dle prefers-color-scheme + listener na změnu systému (settings.js ř.43,96). Když systém=light, auto=light je by-design.
- **Soubor:** `settings.js` → `applyTheme()`
- **Stav dle S4 (FIX-038):** označeno jako vyřešené
- **Stav dle uživatele:** Bug stále existuje – **Auto téma vypadá úplně stejně jako Světlé téma**, žádný vizuální rozdíl.
- **Otázka k ověření:** Má Auto téma vůbec reálně jiný výstup než Světlé?
  - **Auto** by mělo přepínat mezi dark/light podle **systémového nastavení** (`prefers-color-scheme`)
  - Pokud tvůj systém hlásí „light mode", Auto = Světlé (stejný výstup = OK, to není bug, je to by design)
  - Pokud tvůj systém hlásí „dark mode", Auto = Tmavé (pokud vidíš světlé → to je bug)
- **Další kroky:**
  1. Ověř, co hlásí tvůj OS (Windows: Settings → Personalization → Colors → „Choose your mode")
  2. V DevTools konzoli zadej: `window.matchMedia('(prefers-color-scheme: dark)').matches` – vrací `true` nebo `false`?
  3. Ověř v kódu, že `matchMedia` listener je správně registrovaný a že CSS proměnné reagují

### OPEN-005 · Box plot ve špatné záložce **(Session 3)**
- **(Session 10):** VYŘEŠENO ✅ – box plot je ve Všechny roky (vsechnyBoxCanvas). Rozhodnutí Milana: splňuje záměr, uzavřeno.
- **Soubor:** `charts.js`
- **Aktuálně:** Box plot je v záložce „Roční" (dává smysl až při více letech dat)
- **Správně:** přesunout do záložky „Všechny roky"
- **Akce:** Záložka „Měsíční" = přidat 12 box plotů (jeden per měsíc přes všechny roky)
- **(Session 5):** Canvas ID pro box plot opraven (FIX-045) — box plot se nyní **renderuje**, ale stále je ve **špatné záložce**. Přesun dosud neproběhl.

### OPEN-006 · Predikce – modré hodnoty pro minulé měsíce **(Session 3)**
- **(Session 10):** VYŘEŠENO ✅ – 3 kumulativní křivky (YTD/Předpoklad/Odhad) v7.24, ověřeno v kódu.
- **Status:** Opraveno v `transactions.js` v6.41, ale nutno ověřit po nahrání
- **Bylo:** Minulé měsíce ukazovaly jen `actual` bez predikce
- **Má být:** `actual` + modrá predikce (opacity 55%) + odchylka

### OPEN-007 · Přihlášení – popup blokován **(Session 2)**
- **(Session 10):** VYŘEŠENO ✅ – fallback na signInWithRedirect (firebase.js ř.43). Uzavřeno.
- **Reprodukce:** Firefox s přísným nastavením soukromí
- **Stav:** Částečně opraveno (fallback na redirect), ale může selhat

### OPEN-008 · Načítání kategorií – race condition **(Session 2)**
- **Reprodukce:** Přihlásit se, rychle kliknout do kategorií
- **Příčina:** Race condition – `renderPage()` před dokončením Firebase sync

### OPEN-009 · DTI/DSTI fallback **(Session 2)**
- **Stav:** Vyřešeno pro `installments[]` (viz FIX-018), ale `d.payment` fallback nemusí fungovat
- **Reprodukce:** Přidat půjčku bez `installments` pole

### ~~OPEN-026~~ · ~~Import preview crash při 0 transakcích~~ ✅ VYŘEŠENO S8
- **Sekce:** Import dat
- **Soubor:** `import.js`
- **Popis:** Po importu PDF kde jsou všechny transakce vyfilterovány jako duplicity (0 výsledných transakcí) aplikace crashuje při zobrazení import preview.
- **(Session 8 update):** ✅ VYŘEŠENO – součást FIX-068. 🔗 FIX-068

### OPEN-027 · Bubble chart – SVG přetékání **(Session 7.1 → Session 8, přejmenováno na OPEN-031)**
- **(Session 8 update):** Přejmenováno/rozšířeno na OPEN-031. FIX-072 (padding 60px) nezabral. Viz OPEN-031.
- **Sekce:** Dashboard → Bubble chart záložka A (Cluster)
- **Soubor:** `ui.js` → `bCluster()`
- **Popis:** Bubliny v záložce A (Cluster) zasahují do prostoru přepínací lišty záložek — vizuální překryv, špatná UX
- **Root cause:** `POS` array obsahuje y hodnoty které nekontrolují horní limit; `viewBox` H hodnota nedostatečná
- **Reprodukce:** Dashboard → přepnout na záložku A (Cluster) → bubliny překrývají lištu
- **Priorita:** Střední
- **🔗 Cross-reference:** TODO-068, `architecture.md` sekce 16 (Bubble chart systém), ADR-037

### OPEN-028 · Bubble chart – Gradient varianta bez sdílených dat **(Session 7.1)**
- **(Session 10):** VYŘEŠENO ✅ – fallback UI pro prázdná sdílená data + zobrazí jen kategorie (ui.js ř.621-633). Uzavřeno.
- **Sekce:** Dashboard → Bubble chart záložka C (Gradient)
- **Soubor:** `ui.js` → `bGradient()`
- **Popis:** Záložka C zobrazuje gradient bubliny pro sdílené podkategorie. Při reálných datech je `SHARED_NAMES` Set prázdný → žádné sdílené podkategorie → záložka C nevykresluje nic smysluplného
- **Root cause:** `SHARED_NAMES` se počítá z transakcí aktuálního měsíce — pokud uživatel nemá subkategorie sdílené mezi kategoriemi, Set je prázdný
- **Stav:** Záložka C existuje, ale bez fallback UI pro případ prázdných sdílených dat
- **Priorita:** Střední
- **🔗 Cross-reference:** TODO-069, `architecture.md` sekce 16, ADR-037

### OPEN-029 · Měsíční report – přepočet dat dle periody nefunguje **(Session 7.1, potvrzeno 2026-05-19)**
- **(2026-05-19 update):** `projects.js` opraven – `computeHealthScores(D, m, y)` nyní přijímá volitelné m, y. `rMonth/rYear` se počítá před voláním. `getActual()` používá m, y místo `S.curMonth/S.curYear`. Ale report stále zobrazuje jen 1 hodnotu – chyba zřejmě jinde.
- **Sekce:** Měsíční report → záložky 7D / 1M / 3M / 6M / 12M
- **Soubor:** `charts.js` (nebo `ui.js`)
- **Popis:** UI záložek přidáno (7D/1M/3M/6M/12M/Poradce), ale `computeHealthScores()` ignoruje `rMonth/rYear` a stále bere `S.curMonth/S.curYear` hardcoded. Přepínání záložek nemá efekt na data.
- **Root cause:** Datová logika záložek není implementována — jen UI shell
- **Priorita:** Střední
- **🔗 Cross-reference:** TODO-067, TODO-065

### OPEN-030 · ~~Plány a cíle – záložka se nezobrazuje~~ ✅ VYŘEŠENO **(Session 7.1, 2026-05-19)**
- **(2026-05-19 update):** ✅ VYŘEŠENO – problém nebyl v kódu ale v **nasazení**. Na server byl nahraný starý `nakup.js` bez záložky. Po nahrání správného `nakup.js` se záložka zobrazí. 🔗 Viz `todo.md` TODO-072
- **Sekce:** Nákupní seznam → záložka 🎯 Plány a cíle
- **Soubor:** `nakup.js`, `index.html`
- **Popis:** Záložka `🎯 Plány a cíle` se v UI nezobrazuje i když `nakup.js` obsahuje správný kód pro záložky
- **Debug checklist:**
  - `id="nakupTabs"` v `index.html`?
  - `modalGoal` + `modalGoalDeposit` přítomny v HTML?
  - `nakup.js?v=todo056` v script tazích (správná cache-bust verze)?
- **Priorita:** Střední
- **🔗 Cross-reference:** TODO-072, ADR-034

### ~~OPEN-023~~ · ~~GitHub Pages – financeflow nefunguje~~ ✅ VYŘEŠENO S6 **(Session 5)**
- **URL:** `https://bcmilda.github.io/financeflow/`
- **(Session 6 update):** ✅ **VYŘEŠENO** – GitHub Pages funguje z větve `dev`. Firebase Auth domain `bcmilda.github.io` přidána. Worker v5 s CORS pro GH Pages nasazen.

### ~~OPEN-024~~ · ~~GitHub Pages – lepsi-uver.html nefunguje~~ ✅ VYŘEŠENO S6 **(Session 5)**
- **URL:** `https://bcmilda.github.io/financeflow/lepsi-uver.html`
- **(Session 6 update):** ✅ **VYŘEŠENO** – Stejná příčina jako OPEN-023, vyřešeno stejným deployem.

### ~~OPEN-025~~ · ~~Cloudflare Worker – CORS chyba pro `bcmilda.github.io`~~ ✅ VYŘEŠENO S6 **(Session 5)**
- **Sekce:** AI funkce / Cloudflare Worker
- **Popis:** `https://bcmilda.github.io` chyběl v `allowedOrigins` → CORS chyba při volání AI z GitHub Pages.
- **(Session 6 update):** ✅ **VYŘEŠENO** – Worker v5 nasazen s `bcmilda.github.io` v `allowedOrigins`. CORS chyba se nevrací.
- **🔗 Cross-reference:** `SECURITY.md` sekce 6, `architecture.md` sekce 7

---

## 🟢 OTEVŘENÉ CHYBY – Nízká priorita

### Ze Session 2 – původem v multi-file refaktoru **(Merge S1-5)**

### OPEN-010 · Pomalé načítání aplikace **(Session 2)**
- **Příčina:** 22 JS souborů bez bundleru, načítání ~3–5 s
- **Reprodukce:** Otevřít https://financeflow-a249c.web.app
- **Řešení:** Implementovat Vite/esbuild bundling (= TODO z `architecture.md`)

### OPEN-011 · Playwright testy nenapsány **(Session 3)**
- **Stav:** Playwright nainstalován, konfigurace hotová
- **Kritické flows:** přihlášení, přidání transakce, dashboard, grafy

### OPEN-012 · Měsíční graf – nulové hodnoty v dubnu **(Session 3)**
- **Příčina:** Duben 2026 byl prázdný → grafy ukazovaly nuly
- **Poznámka:** Smart month detection přidán do `app.js` (= OPEN-012 částečně vyřešen), ale grafy závisí na `curMonth`
- **Možné řešení:** Záložka „Obecné" vždy zobrazit posledních 12 měsíců s daty

### Ze Session 1 – systémové chyby **(Merge S1-5)**

### OPEN-013 · Import CSV – .xlsm nepodporováno **(Session 1)**
- Excel soubory s makry (.xlsm) nejsou podporovány; parser selže bez jasné chybové hlášky

### OPEN-014 · Split transakce – delete edge case **(Session 1)**
- Po smazání všech children se parent nevrátí do normálního stavu správně
- **Reprodukce:** `deleteSplitChild` kdy zbývá 1 child

### OPEN-015 · Mobilní Safari – appearance **(Session 1)**
- `input[type=number]` někdy ignoruje `appearance:none`; posuvníky mohou být viditelné

### OPEN-016 · Offline přihlášení **(Session 1)**
- Přihlašování přes Google vyžaduje internet; lokální režim není vždy zřejmý uživateli
- **Poznámka:** Souvisí s ADR-004 (Lokální režim jako fallback) z `decisions.md`

### OPEN-017 · COICOP trend záložka – prázdný graf **(Session 1)**
- Pokud má uživatel data jen za 1 měsíc, graf je prázdný bez vysvětlení

### OPEN-018 · Keyword engine – diakritika **(Session 1)**
- **(Session 10):** VYŘEŠENO ✅ – NFD normalizace (receipts.js ř.86). Uzavřeno.
- Klíčová slova jsou case-sensitive v lowercase normalizaci
- „Lidl" vs „LIDL" funguje, ale diakritika může selhat

### OPEN-019 · Nákupní seznam **(Session 2)**
- **(Session 10):** VYŘEŠENO ✅ – nakup.js plně funkční (44 funkcí). Uzavřeno.
- **Stav:** Funkce nebyla implementována v Session 2
- **Poznámka:** V Session 3+ už existuje `nakup.js` (= OPEN-019 pravděpodobně vyřešeno, jen ověřit)

---

## ⚠️ Pravděpodobné duplicity a nejasnosti napříč sessions

Následující bugy se objevují v několika sessions s mírně odlišným popisem – **potřeba ověřit aktuální stav**:

| # | Téma | Sessions | Stav |
|---|---|---|---|
| A | **Grafy prázdné** | S3 FIX-026 → S4 FIX-040 → S5 FIX-042–045 → **S6 potvrzeno** | ✅ Vyřešeno – záložky fungují, Predikce opravena (FIX-049), potvrzeno Milanem |
| B | **Resend klíč / email** | S3 OPEN-001 → S4 FIX-041 → S5 Worker v5 → **S6 nasazeno** | ✅ Vyřešeno – Worker v5 nasazen, klíč v Secrets, premium.js opraven (FIX-046+047), emaily fungují |
| C | **Admin panel Permission denied** | S4 FIX-039 → **S6 Firebase Rules nasazeny** | ✅ Vyřešeno – Firebase Rules s admin read přístupem nasazeny, 403 se nevrací |
| D | **Nákupní seznam** | S2 OPEN-019 → S3 existuje `nakup.js` | Pravděpodobně vyřešeno mezi S2 a S3, ověř |
| E | **DTI/DSTI** | S2 FIX-022 (v6.36) → S3 FIX-027 (v6.35-41) → S2 OPEN-009 | Řetězec 3 souvisejících bugů |
| F | **GitHub Pages** | S5 OPEN-023, OPEN-024, OPEN-025 → **S6 vyřešeno** | ✅ Vyřešeno – Worker v5 s CORS nasazen, Firebase Auth domain přidána |
| G | **Predikce** | S3 OPEN-006 (modré hodnoty) + S5 OPEN-022 (tabulka) → **S6 OPEN-022 vyřešeno** | OPEN-022 ✅ vyřešeno (FIX-049). OPEN-006 stále otevřený – ověřit vizuál |
| H | **settings.js rekurze** | S3 FIX-035 → **S6 FIX-048 (reopen)** | ⚠️ Bug se vrátil v nové verzi souboru – opraveno znovu v S6 |
| I | **PDF JSON parsing** | S7.0 FIX-052 | ✅ Vyřešeno – `indexOf('{')` + `lastIndexOf('}')` nahrazuje lazy regex |
| J | **computeAssetsNetWorth vs computeNetWorth** | S7.1 FIX-053 | ✅ Vyřešeno – kolize názvů funkcí crashovala aplikaci; `assets.js` přejmenován |

---

## ✅ VYŘEŠENÉ CHYBY

### Verze v5.x – starší opravy **(Session 1)**

#### FIX-001 · RPSN kalkulačka diverguje při vysokých úrocích
- **Verze:** v5.75 → v5.77 **(S1 BUG-009)**
- **Příčina:** Newton-Raphson bez ochrany před divergencí, málo iterací
- **Oprava:** 200 iterací, clamp `r > 10 → r = 0.5`, clamp `r ≤ 0 → r = 0.00001`

#### FIX-002 · Pull-to-refresh ruší analýzu účtenek
- **Verze:** v5.89 → v5.90 **(S1 BUG-006)**
- **Příčina:** Chyběl `overscroll-behavior: none` na stránce účtenek
- **Oprava:** CSS `overscroll-behavior: none` přidán globálně

#### FIX-003 · Aktivní záložka v účtenkách se neresetuje
- **Verze:** v5.90 **(S1 BUG-010)**
- **Příčina:** `switchUctenkyTab()` se nevolal po `renderUctenky()`
- **Oprava:** Globální `_activeUctenkyTab` uchovává aktivní záložku

---

### Verze v6.3–v6.25 – COICOP a split fáze **(Session 1)**

#### FIX-004 · KB CSV nefungoval **(Session 2)**
- **Verze:** v6.3
- **Příčina:** Kódování windows-1250, header na řádku 16, špatné názvy sloupců
- **Oprava:** Autodetekce kódování, skip metadata řádků, správné mapování sloupců
- **Souvisí s:** ADR-014 v `decisions.md`

#### FIX-005 · COICOP_GROUPS_DEF uvnitř renderUctenky
- **Verze:** v6.15 → v6.16 **(S1 BUG-007)**
- **Příčina:** Konstanty a funkce definovány uvnitř `renderUctenky()` → nested declarations
- **Oprava:** Přesunuty jako globální konstanty a funkce před `renderUctenky()`

#### FIX-006 · householdSize is not defined
- **Verze:** v6.16 → v6.18 **(S1 BUG-002)**
- **Příčina:** `householdSize` byl lokální v `renderUctenky()`, ale `buildCompareTab()` ho používal bez parametru
- **Oprava:** Přidán jako 6. parametr funkce

#### FIX-007 · Černá obrazovka v Analýze účtenek
- **Verze:** v6.13 → v6.19 **(S1 BUG-001)**
- **Příčina:** `guessReceiptCategory()` byla nested function uvnitř `buildReceiptPreviewHTML()` → tiché selhání v strict mode
- **Oprava:** Přesunuta jako globální funkce
- **Reprodukce:** Klikni na „Analýza účtenek" → prázdná stránka, v konzoli žádná chyba

#### FIX-008 · compIcon is not defined
- **Verze:** v6.18 → v6.19 **(S1 BUG-003)**
- **Příčina:** `compPct`, `compIcon`, `compColor`, `missing` byly počítány v `renderUctenky()` ale spotřebovány v `buildCompareTab()`
- **Oprava:** Výpočet přesunut přímo do `buildCompareTab()`

#### FIX-009 · Split children zobrazeny samostatně
- **Verze:** v6.22 **(S1 BUG-008)**
- **Příčina:** Chyběl filtr při renderování řádků transakcí
- **Oprava:** `txs.filter(t => !t.splitId || t.splitParent).forEach(...)`

#### FIX-010 · Blokování psaní v split modalu
- **Verze:** v6.22 → v6.23 **(S1 BUG-004)**
- **Příčina:** `oninput` volal `renderSplitItems()` → překreslení DOM → ztráta focusu po každém stisku klávesy
- **Oprava:** Odstraněno překreslování; použity `addEventListener` mimo `innerHTML`; první řádek readonly

#### FIX-011 · Zavření split modalu kliknutím mimo
- **Verze:** v6.24 → v6.25 **(S1 BUG-005)**
- **Příčina:** Globální overlay click handler zavíral všechny modaly včetně `modalSplit`
- **Oprava:** `if(e.target===o && o.id!=='modalSplit') o.classList.remove('open')`

---

### Verze v6.32–v6.36 – modularizace a sync **(Session 2)**

#### FIX-012 · `</script>` tag v app.js / import.js
- **Verze:** v6.32
- **Příčina:** Při extrakci JS modulů se dostal HTML tag do souboru
- **Oprava:** `node --check` před každým deployem

#### FIX-013 · JS kód zobrazen na stránce
- **Verze:** v6.32
- **Příčina:** Import Editor JS byl vložen za `</script>` místo před něj
- **Oprava:** Přesunutí kódu dovnitř script tagu

#### FIX-014 · Prázdný `<script>` tag v index.html (opakující se)
- **Verze:** v6.33 → v6.36
- **Příčina:** Původní HTML obsahoval `<!-- Firebase loaded... --><script>` který se vracel při sestavování
- **Oprava:** Explicitní odstranění při každém sestavení `index.html`
- **Poznámka:** Viz kódovací pravidla v `decisions.md` – „VŽDY zkontroluj konec `index.html`"

#### FIX-015 · `window.onUserSignedIn is not a function`
- **Verze:** v6.34
- **Příčina:** `firebase.js` se načetl dřív než `app.js` dokončil inicializaci
- **Oprava:** Retry smyčka max 3s v `onAuthStateChanged`
- **Souvisí s:** ADR-010 (`firebase.js` jako poslední skript)

#### FIX-016 · `PAGE_TITLES is not defined` + `CZ_M is not defined` + `_db = db` ReferenceError
- **Verze:** v6.34
- **Příčina:** `app.js` se nenačetl kvůli syntax erroru (prázdný script tag) + chybějící `window.` prefix v `firebase.js`
- **Oprava:** Odstranění prázdného script tagu + `window._db = db`

#### FIX-017 · `signInGoogle is not defined`
- **Verze:** v6.35
- **Příčina:** `onclick` v HTML se volal před načtením Firebase
- **Oprava:** Inline guard `if(window._signInGoogle)window._signInGoogle()`

#### FIX-018 · Kontaktní formulář otvíral `mailto:`
- **Verze:** v6.35
- **Příčina:** Windows nemá nastaveného emailového klienta
- **Oprava:** Ukládání do Firebase místo `mailto`

#### FIX-019 · Premium tlačítko nereagovalo
- **Verze:** v6.35
- **Příčina:** Funkce se jmenuje `showPaywall()`, volalo se `openPaywall()`
- **Oprava:** Oprava názvu funkce v `index.html`

#### FIX-020 · `auth/popup-closed-by-user` alert
- **Verze:** v6.36
- **Příčina:** Zavření popup okna zobrazilo error alert
- **Oprava:** Tiché ignorování `popup-closed` a `cancelled-popup` kódů

#### FIX-021 · Netflix/Spotify v detektoru bez dat
- **Verze:** v6.36
- **Příčina:** Seed data obsahovala `Netflix+Spotify` transakci
- **Oprava:** Nahrazeno `YouTube Premium`, detektor hledá jen reálné transakce
- **Souvisí s:** ADR-015 v `decisions.md`

#### FIX-022 · DTI/DSTI špatný výpočet splátek
- **Verze:** v6.36
- **Příčina:** Kód četl `d.payment` místo `d.installments[].amt`
- **Oprava:** Iterace přes `installments`, hledání aktuální splátky dle `inst.from`
- **Poznámka:** Viz chain v „Pravděpodobné duplicity" bod E

---

### Verze v6.35–v6.41 – predikce a grafy **(Session 3)**

#### FIX-023 · Orphaned `await` v premium.js:777
- **Příčina:** Duplikovaný fragment staré `sendContactForm`
- **Oprava:** Odstraněn fragment
- **Soubor:** `premium.js`

#### FIX-024 · Script MIME type error
- **Příčina:** Nové soubory nebyly v `/js/` složce
- **Oprava:** Cache busting + nahrání
- **Soubor:** `index.html`

#### FIX-025 · `renderFinancialScore` undefined
- **Příčina:** Špatné pořadí scriptů (`premium.js` za `ui.js`)
- **Oprava:** Opraveno pořadí
- **Soubor:** `index.html`

#### FIX-026 · Grafy prázdné – první oprava ⚠️ (viz FIX-042)
- **Příčina:** `.page{display:none}` → `clientWidth=0` před CSS reflow
- **Oprava:** `requestAnimationFrame(() => setTimeout(fn, 50))` + `getBoundingClientRect()`
- **Soubor:** `helpers.js`, `charts.js`
- **Poznámka:** Oprava **nestačila** – v Session 4 dodělána do 4 vrstev (viz FIX-042)

#### FIX-027 · DTI/DSTI = 0% při chybějící stable kategorii
- **Příčina:** `computeBaseIncome` vrací 0 bez `stable=true` kategorie
- **Oprava:** Fallback: průměr příjmů z 3 měsíců
- **Soubor:** `projects.js`

#### FIX-028 · Detektor duplikátů: `google` + `google one`
- **Příčina:** Keywords neseřazeny, per-tx dedup chybí
- **Oprava:** Sort longest-first, `usedTxIds` Set
- **Soubor:** `projects.js`

#### FIX-029 · Nastavení: „Načítám..."
- **Příčina:** `settings.js` před `premium.js` → `_settings` undefined
- **Oprava:** Fallback z `localStorage`
- **Soubor:** `settings.js`

#### FIX-030 · Predikce Trend +852%
- **Příčina:** Outlier (servis auta 19 342 Kč), méně než 4 měsíce dat
- **Oprava:** Min 4 měsíce, outlier removal (>3× medián)
- **Soubor:** `helpers.js`
- **Souvisí s:** ADR-021 + ADR-022 v `decisions.md` („Min. 4 měsíce pro trend detekci" + „Outlier removal") **(Merge S1-5)**

#### FIX-031 · Worker SyntaxError line 249
- **Příčina:** `contact_form` vložen za `return`, rozbil `try/catch`
- **Oprava:** Vložen správně do `else-if` chainu
- **Soubor:** `worker.js`

#### FIX-032 · Dashboard prázdný (duben)
- **Příčina:** `curMonth=3` (duben), data jen v březnu
- **Oprava:** Smart month – auto-přechod na poslední měsíc s daty
- **Soubor:** `app.js`

#### FIX-033 · `t.amt` vs `t.amount`
- **Příčina:** `incSum`/`expSum` používaly jen `t.amt`
- **Oprava:** `t.amount || t.amt || 0` všude
- **Soubor:** `helpers.js`
- **Souvisí s:** ADR-024 „Ukládat obojí amount + amt" v `decisions.md` **(Merge S1-5)**

#### FIX-034 · premium.js balance -1
- **Příčina:** Historický fragment staré `sendContactForm`
- **Oprava:** Odstraněn ze dvou míst
- **Soubor:** `premium.js`

#### FIX-035 · `too much recursion` v settings **(viz poznámka)**
- **Příčina:** `settings.js`: `_origApplySettings = applySettings` → rekurze
- **Oprava:** Odstraněna rekurzivní override
- **Soubor:** `settings.js`
- **⚠️ Pozor:** NEPLÉST s FIX-040 (Auto téma rekurze v `applyTheme`) – jsou to dva různé bugy ve stejném souboru

#### FIX-036 · `computePersonalSeason` not defined
- **Příčina:** Funkce v `outputs/helpers.js` chyběly (přepsány starou verzí)
- **Oprava:** Přidány znovu do `helpers.js`
- **Soubor:** `helpers.js`

---

### Session 4 – pozdní opravy **(Session 4)**

#### FIX-037 · Zelené tlačítko „Uložit nastavení" nezmizí **(S4 BUG-01)**
- **Soubor:** `premium.js` → `saveSettingsBtn()`
- **Závažnost:** Střední – vizuální, uživatel nemůže interagovat normálně
- **Root cause:** Chybělo `bar.style.display = 'none'` po úspěšném uložení. Save bar zůstal viditelný a scrolloval se se stránkou.
- **Oprava:** Přidáno skrytí save baru + `showToast()` notifikace místo neviditelného badge elementu.

#### FIX-038 · ~~Auto téma funguje stejně jako Světlé~~ ⚠️ STÁLE NEFUNGUJE **(S4 BUG-02, reopen)**
- **Soubor:** `settings.js` → `applyTheme()`
- **Závažnost:** Střední – funkce Auto tématu nefunguje
- **Root cause dle S4:** Větev `auto` volala rekurzivně `applyTheme('light', false)`, což přepsalo `_themeMode` z `'auto'` na `'light'`.
- **Oprava dle S4:** Auto větev aplikuje CSS proměnné přímo bez rekurze. `_themeMode` zůstane `'auto'`, tlačítko se správně zvýrazní a `matchMedia` listener funguje.
- **⚠️ Uživatel potvrzuje, že bug stále existuje** – přesunuto do OPEN-020.
- **⚠️ Pozor:** Není totéž co FIX-035 – FIX-035 byla rekurze v `applySettings()`, tohle je rekurze v `applyTheme()`. **Neplést si to!**

#### FIX-039 · Permission denied v Admin panelu **(S4 BUG-03)**
- **Soubory:** `admin.js` → `loadLowConf()`, `loadMappingStats()`
- **Závažnost:** Vysoká – funkce Admin panelu zcela nefunkční
- **Root cause:** Firebase SDK `_get(_ref(_db, 'users'))` nemá přístup k `/users` root – Security Rules to blokují (každý uživatel vidí jen svá data pod `/users/{uid}`).
- **Oprava:** Přepsáno na REST API s `?auth=idToken` (stejný vzor jako `loadLeads()`). Při HTTP 401/403 se zobrazí srozumitelný návod na nastavení Firebase Rule pro admin UID.
- **Prerekvizita:** Firebase Rules musí obsahovat:
  ```json
  "users": { ".read": "auth.uid === 'LNEC8VNB2QPwIv6WWQ9lqgR4O5v1'" }
  ```
- **(Session 6 update):** ✅ **Definitivně vyřešeno** – Firebase Rules s admin read přístupem nasazeny do Firebase Console (viz `architecture.md` sekce 8.8). Chyba 403 se nevrací.
- **🔗 Cross-reference:** `architecture.md` sekce 8.8, `decisions.md` ADR-018

#### FIX-040 · Prázdné grafy – finální oprava ve 4 vrstvách **(S4 BUG-04)**
- **Soubory:** `charts.js`, `helpers.js`
- **Závažnost:** Vysoká – celá sekce Grafy nefunkční
- **Root cause:** Canvas element měl šířku 0 při volání `getBoundingClientRect()` protože browser nestihl dokončit layout po přechodu `display:none → block`. Funkce dělala tichý `return` bez retry.
- **Oprava (4 vrstvy):**
  1. `showPage()` v `helpers.js` – **dvojitý** `requestAnimationFrame` místo jednoho
  2. `renderGrafy()` v `charts.js` – dvojitý `requestAnimationFrame` + `setTimeout(50ms)`
  3. `drawSimpleAreaChart()` – **retry mechanismus až 5×** s narůstajícím zpožděním (80–400 ms) místo tichého return
  4. `drawSaldoBars()` – přechod na `getBoundingClientRect()` místo `clientWidth`
- **Poznámka:** Nahrazuje starší FIX-026 – ten fix (jednoduchý `rAF + setTimeout`) se v praxi ukázal jako nedostatečný.

#### FIX-041 · Neplatný Resend API klíč **(S4 BUG-05)**
- **Soubor:** `financeflow-worker-v4.js` (řádek 238)
- **Závažnost:** Vysoká – emaily z aplikace nefungují
- **Oprava (v Session 4):** Aktualizován klíč z `re_UZf6C8UZ_*` na `re_9jY2risE_*`
- **⚠️ AKTUÁLNÍ STAV:** **Tento fix nahrazen FIX-046+047 v Session 6.** Klíč `re_9jY2risE_*` byl invalidován kvůli security incidentu. Worker v5 klíč z `env.RESEND_API_KEY`.
- **(Session 6 update):** ✅ **Definitivně vyřešeno** – Worker v5 nasazen do Cloudflare, `RESEND_API_KEY` env proměnná nastavena. Ověřen Resend účet (Řešení A) → emaily přicházejí. Viz FIX-046, FIX-047.

#### NOTE-01 · receipts.js ztracený **(Session 4)**
- Soubor byl dostupný celou dobu v `/mnt/project/receipts.js` – byl hledán na špatné cestě `/mnt/project/js/receipts.js`. Opraveno v této session.
- **Není bug aplikace, jen poznámka k workflow.**

---

### Verze v6.45 – opravy grafů **(Session 5)**

> **Kontext:** Session 5 neměla plný kontext projektu („vaří z vody"), ale přesto identifikovala
> a opravila 4 konkrétní problémy v sekci Grafy. Opravy **fungují** pro záložky Obecné/Měsíční/Roční/
> Všechny roky, ale měly **vedlejší efekt** na sekci Predikce (viz OPEN-022).

#### FIX-042 · Infinite loop v `initGrafFilters()` **(S5)**
- **Verze:** v6.45
- **Příčina:** Hoisting problém v `initGrafFilters()` způsoboval nekonečnou smyčku
- **Oprava:** Opraven hoisting — funkce se nyní inicializuje správně
- **Soubor:** `charts.js`

#### FIX-043 · Chybějící `renderKumulChart()` **(S5)**
- **Verze:** v6.45
- **Příčina:** Funkce `renderKumulChart()` chyběla → kumulativní graf v záložce Měsíční se nevykresloval
- **Oprava:** Funkce doplněna
- **Soubor:** `charts.js`

#### FIX-044 · Špatný HTML layout záložky „Všechny roky" **(S5)**
- **Verze:** v6.45
- **Příčina:** `gtab-vsechny-content` byl vnořen do `gtab-rocni-content` → záložka „Všechny roky" se nezobrazovala správně
- **Oprava:** HTML struktura opravena, záložky jsou nyní na stejné úrovni
- **Soubor:** `index.html` (nebo `charts.js` template)

#### FIX-045 · Box plot – canvas ID neexistoval **(S5)**
- **Verze:** v6.45
- **Příčina:** Karta Box plot odkazovala na canvas element s neexistujícím ID
- **Oprava:** Canvas ID opraveno
- **Soubor:** `charts.js`
- **🔗 Cross-reference:** OPEN-005 (box plot ve špatné záložce — tento fix řeší **renderování**, ne **umístění**)

---

### Session 6 – opravy emailu, predikce, Sentry **(Session 6, v6.47 → v6.48)**

#### FIX-046 · `sendContactForm()` – chybějící Authorization header **(S6)**
- **Soubor:** `premium.js`
- **Příčina:** Worker vyžaduje `Authorization: Bearer <token>`, ale `sendContactForm()` header neposílal → Worker vracel 401 ještě před voláním Resend API
- **Oprava:** Přidáno `await window._currentUser.getIdToken()` + `headers['Authorization'] = 'Bearer ' + idToken`
- **Verze:** v6.47

#### FIX-047 · `sendContactForm()` – špatná struktura payloadu **(S6)**
- **Soubor:** `premium.js`
- **Příčina:** Worker čeká `{type, payload:{from_name, from_email, msg_type, message}}`, ale formulář posílal `{type, from_name, from_email, ...}` přímo bez `payload` wrapperu
- **Oprava:** Správné zabalení: `body: JSON.stringify({type:'contact_form', payload:{from_name, from_email, msg_type, message}})`
- **Verze:** v6.47
- **🔗 Cross-reference:** OPEN-001 (email nefungoval) – FIX-046 + FIX-047 dohromady vyřešily problém

#### FIX-048 · `too much recursion` v `applySettings()` – reopen **(S6)**
- **Soubor:** `settings.js`
- **Příčina:** Rekurzivní override `applySettings()` se vrátil v novější verzi souboru. Blok `const _origApplySettings = typeof applySettings === 'function' ? applySettings : null` způsoboval nekonečnou rekurzi.
- **Oprava:** Odstraněn rekurzivní blok
- **Verze:** v6.47
- **⚠️ Pozor:** Stejný typ bugu jako FIX-035 (Session 3) – při příští úpravě `settings.js` zkontrolovat, že neobsahuje `_origApplySettings` blok! **Neplést s FIX-035.**
- **🔗 Cross-reference:** FIX-035 (původní oprava, Session 3)

#### FIX-049 · Predikce – `computeYearForecast is not defined` **(S6)**
- **Soubor:** `helpers.js`, `transactions.js`
- **Příčina:** `transactions.js` volal `computeYearForecast(catId, sub, year, data)` která neexistovala v `helpers.js`. Vedlejší efekt oprav grafů v S5 (FIX-042–045) odhalil chybějící funkci.
- **Oprava:** Funkce `computeYearForecast()` přidána do `helpers.js` – sčítá skutečnost (minulé měsíce) + predikce (budoucí měsíce na základě sezónního průměru)
- **Verze:** v6.47
- **🔗 Cross-reference:** OPEN-022 (Predikce nefunkční – tímto vyřešeno)

#### FIX-050 · Sentry loader – pád mobilní appky při umístění v `<head>` **(S6)**
- **Soubor:** `index.html`
- **Příčina:** Sentry CDN loader umístěn v `<head>` bez `async`/`defer` → blokoval render stránky → pád mobilní appky, zamrznutí webu
- **Oprava:** Přesunut před `</body>` jako dynamicky injektovaný script (`async=true`, `defer=true`), trojitý `try/catch`, `tracesSampleRate: 0`, `integrations: []`
- **Verze:** v6.48
- **Aktuální DSN:** `https://3ce6efc6333af4293ac9b67d7b710f4b@o4511266124988416.ingest.de.sentry.io/4511266132787280`
- **⚠️ Poznámka:** Warning „Sentry CDN unavailable" v omezených prostředích (Claude window, firemní sítě) je normální – aplikace funguje
- **🔗 Cross-reference:** ADR-016 (`decisions.md`), `architecture.md` sekce 15

---

### Session 7.0 – PDF a Firebase opravy **(Session 7.0, v6.49)**

#### FIX-051 · Firebase Rules – referrals + referral_clicks `Permission denied` **(S7.0)**
- **Soubor:** Firebase Console → Realtime Database → Rules
- **Závažnost:** Střední – `initReferral()` vracela 403 při každém přihlášení
- **Root cause:** Firebase Rules neobsahovaly uzly `referrals` a `referral_clicks` → přístup odepřen
- **Oprava:** Přidány pravidla pro `/referrals/` a `/referral_clicks/` uzly do Firebase Rules
- **Verze:** v6.49
- **🔗 Cross-reference:** `architecture.md` sekce 8

#### FIX-052 · PDF import – JSON parsing lazy regex selhal **(S7.0)**
- **Soubor:** `import.js`
- **Závažnost:** Střední – PDF import vracel chybu parsování i při správné AI odpovědi
- **Root cause:** Regex na backtick fence byl lazy (`.*?`) → při vícenásobných JSON blocích v odpovědi selhal
- **Oprava:** Nahrazeno `indexOf('{')` + `lastIndexOf('}')` – robustnější extrakce JSON z odpovědi
- **Verze:** v6.49
- **🔗 Cross-reference:** `architecture.md` sekce 17 (PDF import systém), ADR-032

---

### Session 7.1 – aktiva a bubble chart **(Session 7.1, v6.49–v6.50)**

#### FIX-053 · `computeAssetsNetWorth` vs `computeNetWorth` – kolize názvů **(S7.1)**
- **Soubor:** `assets.js`, `premium.js`
- **Závažnost:** Vysoká – aplikace crashovala po přidání `assets.js` s chybou `"can't access property 'length', nw.rows is undefined"`
- **Root cause:** `assets.js` původně definoval funkci `computeNetWorth()` → přepsala stejnojmennou funkci z `premium.js` → `premium.js` pak volal svou verzi ale dostával výstup z `assets.js`
- **Oprava:** Funkce v `assets.js` přejmenována na `computeAssetsNetWorth(D)` → `{totalAssets, totalWallets, netWorth, byType}`
- **Verze:** v6.50
- **⚠️ NIKDY nepřejmenovávat zpět** – kolize by crashovala aplikaci
- **🔗 Cross-reference:** ADR-036 (`decisions.md`), `architecture.md` sekce 3 (assets.js detail)
```
STAV PO v6.47 (Session 6):
→ Záložky Obecné/Měsíční/Roční/Všechny roky FUNGUJÍ ✅
→ Predikce tabulka FUNGUJE ✅ (computeYearForecast přidána – FIX-049)
→ Potvrzeno Milanem
```

### „too much recursion" (settings – FIX-035)
```
⚠️ Bug se vrátil v Session 6 (FIX-048). Opraveno v v6.47.
Příčina: rekurzivní override applySettings() se znovu objevil při úpravě settings.js.
Při příští úpravě settings.js: zkontrolovat, že neobsahuje _origApplySettings blok!
```

### Predikce – `computePersonalSeason` not defined (FIX-036)
```
1. Nahrát transactions.js kde predikční buňka přímo volá computePersonalSeason()
2. Přejít na stránku Predikce
3. Výsledek: ReferenceError: computePersonalSeason is not defined
4. Příčina: funkce je v helpers.js ale buňka ji volá přímo
   Správně: volat přes predictCat()
```

### Predikce – tabulka se nezobrazuje (OPEN-022 – VYŘEŠENO S6)
```
1. Přihlásit se do aplikace (v6.46, po opravě grafů v6.45)
2. Přejít na Grafy → Predikce
3. Výsledek: Tabulka predikce výdajů je prázdná / neexistuje
4. Graf "Predikce vs Skutečnost" se zobrazí POUZE po:
   Dashboard → zpět na Grafy → Predikce (jinak prázdný)
5. Příčina: Pravděpodobně vedlejší efekt FIX-042 (initGrafFilters)
   nebo FIX-043 (renderKumulChart) – nutné prošetřit
```

---

## 📝 Šablony a postupy

### Postup při novém bugu **(Session 2)**
1. Otevřít F12 → Console → zkopírovat chybu
2. Zkontrolovat: `node --check js/soubor.js`
3. Zkontrolovat konec `index.html` (prázdný `<script>` tag?)
4. Zkontrolovat pořadí script tagů
5. Zkontrolovat verzi v title tagu (**řádek 6**)

### Šablona pro hlášení bugu **(Session 1)**
```
Bug: [název]
Verze: vX.XX
Kroky:
  1. ...
  2. ...
Očekáváno: ...
Skutečnost: ...
Konzole: [chybová hláška]
```

---

---

### Session 8 – opravy v6.51–v6.65 **(Session 8)**

| FIX | Soubor | Popis |
|---|---|---|
| FIX-054 | `worker.js` | max_tokens pro `bank_statement_text` navýšen na 16 384 |
| FIX-055 | `import.js` | JSON repair + async editor |
| FIX-056 | `helpers.js` | `genTxId()` kolize hashů |
| FIX-057 | `offline-sync.js` | Worker URL + auth opraveny |
| FIX-058 | `receipts.js`, `offline-sync.js` | Dvojí komprese fotek odstraněna ⏳ netestováno |
| FIX-059 | `projects.js` | Detektor úspor (3× iterace v S8) |
| FIX-060 | `ui.js`, `worker.js` | Bar chart Jan-Dec + chat tokens |
| FIX-061 | `receipts.js`, `import.js` | Timeout + PDF debug log |
| FIX-062 | `import.js` | Anti-double-click guard |
| FIX-063 | `app.js`, `firebase.js` | beforeunload/sendBeacon |
| FIX-064 | `admin.js` | adminViewUserAs → switchToPartner |
| FIX-065 | `donate.js` | Premium subscription links (⚠️ konstanty nevyplněny) |
| FIX-066 | `projects.js` | Detektor úspor layout |
| FIX-067 | `worker.js` | KB EUR Vyrovnávací úhrada prompt |
| FIX-068 | `index.html` | Chybějící `modalImportEditor` div |
| FIX-068b | `import.js` | Pořadí open/render + null check |
| FIX-069 | `worker.js`, `import.js` | executionDate + isBalancing flag |
| FIX-070 | `import.js` | calcDupScore přepis (Milan spec) |
| FIX-071 | `ui.js` | renderBarChart NaN guard |
| FIX-072 | `ui.js` | bCluster SVG padding 60px (⚠️ nezabral) |
| FIX-073 | `helpers.js` | getActual() amount\|\|amt + isBalancing |
| FIX-074 | `import.js` | calcDupScore final + orange level |
| FIX-075 | `index.html`, `firebase.js` | Sentry dynamic release + user |
| FIX-076 | `ui.js` | renderSouhrn() totalCur/totalPrev all txs |
| FIX-077 | `projects.js` | renderObraz() baseline first month with data |
| FIX-078 | `premium.js` | computeFinancialScore v2 – 4 složky |


---

### Session 9 – COICOP, kategorie, účtenky, modal **(Session 9, v6.74–v7.05)**

> ⚠️ **Poznámka k číslování:** Patch Session 9 používal dočasná čísla FIX-056–066 (kolize se S8). Přečíslováno sekvenčně navazující na FIX-078 → FIX-079–089.

#### FIX-079 · stats.js – COICOP runtime merge mutoval S.categories → Firebase crash
- **Původní dočasné ID:** FIX-056 (S9 patch)
- **Soubor:** `stats.js`
- **Závažnost:** 🔴 Kritická – `coicopOverrides` s "/" v klíčích způsoboval Firebase "invalid key" crash
- **Root cause:** `renderCatPage()` přidával `coicopOverrides` přímo na objekty v `S.categories` (reference). Při `save()` se pokusilo uložit klíče jako "Školka/škola" → Firebase odmítl.
- **Fix:** Shallow copy `{...c}` pro každou kategorii – pouze pro render, `S.categories` zůstává čisté.
- **🔗 Cross-reference:** ADR-044

#### FIX-080 · receipts.js – rpRender() blikání při editaci na mobilu
- **Původní dočasné ID:** FIX-057 (S9 patch)
- **Root cause:** `rpRender()` překresloval celý DOM při `onchange` kategorie i když byl fokusovaný input.
- **Fix:** Guard `if(focused && focused.closest('#rp_items')) return;`

#### FIX-081 · admin.js – HTTP 400 při orderBy="premium/type"
- **Původní dočasné ID:** FIX-058 (S9 patch)
- **Root cause:** Firebase Realtime DB bez indexu vrací 400 pro `orderBy` na vnořenou cestu.
- **Fix:** Odstraněn `orderBy` parametr, filtrace v kódu.

#### FIX-082 · receipts.js – duplicitní účtenky v Obchodech a Historii
- **Původní dočasné ID:** FIX-059 (S9 patch)
- **Root cause:** `buildStoresTab()` a `buildHistoryTab()` používaly globální `S.receipts` místo deduplifikovaného `uniqueReceipts`.
- **Fix:** Oba build funkce přijímají `uniqueReceipts` jako parametr. Přidán deduplicator (klíč: obchod|datum|suma|počet položek).
- **🔗 Cross-reference:** ADR-047

#### FIX-083 · worker.js – váhové položky: price = cena/kg místo skutečné ceny
- **Původní dočasné ID:** FIX-060 (S9 patch)
- **Root cause:** Prompt neměl instrukci pro „0.246 kg × 249.90 Kč/kg = 61.40" formát.
- **Fix:** PRAVIDLO 2 (váhové položky) + PRAVIDLO 3 (slevy/závorková cena) přidány do receipt promptu.
- **🔗 Cross-reference:** TODO-084

#### FIX-084 · admin.js – assignCoicop() nepropsalo do Firebase uživatelů
- **Původní dočasné ID:** FIX-061 (S9 patch)
- **Root cause:** Funkce ukládala jen do `admin_coicop_overrides`, ale nečetla se zpětně.
- **Fix:** Přidán PATCH loop přes všechny uživatele s danou kategorií.
- **🔗 Cross-reference:** TODO-081, ADR-044

#### FIX-085 · debts.js – editace transakce nepopulovala wallet/payType selecty
- **Původní dočasné ID:** FIX-062 (S9 patch)
- **Root cause:** `populateTxWalletSelect()` a `populateTxPayTypeSelect()` nebyly volány z `openAddTx()`.
- **Fix:** Přidáno do `openAddTx()`.

#### FIX-086 · admin.js – COMMUNITY_MONTH_KEY vždy dnešní datum **(S9 dodatek)**
- **Původní dočasné ID:** FIX-063 (S9 patch)
- **Fix:** `COMMUNITY_MONTH_KEY(month, year)` přijímá parametry, respektuje `S.curMonth`/`S.curYear`. (v7.04)

#### FIX-087 · admin.js – renderKomunita blikání při přepnutí měsíce **(S9 dodatek)**
- **Původní dočasné ID:** FIX-064 (S9 patch)
- **Fix:** Throttle 120ms přes `clearTimeout`/`setTimeout`. (v7.04)

#### FIX-088 · index.html – zastaralé Poznámky k vydání (v6.35) **(S9 dodatek)**
- **Původní dočasné ID:** FIX-065 (S9 patch)
- **Fix:** Nahrazeny dynamickým `renderReleaseNotes()` z `VERZE_LOG`. (v7.04)

#### FIX-089 · O aplikaci – Sdílet FinanceFlow link neviditelný na mobilu **(S9 dodatek)**
- **Původní dočasné ID:** FIX-066 (S9 patch)
- **Fix:** Přidán vždy viditelný `shareLinkBar` s tlačítky Kopírovat + Sdílet. (v7.04)


## Session 10 – opravené chyby (FIX-090 až FIX-111)

### Kritické
- **FIX-090** (v7.07, premium.js) – `computeFinancialScore` mutoval scoreState → skóre nedeterministické. Deterministický výpočet z 6 měsíců.
- **FIX-091** (v7.07, projects.js) – detektor úspor zamrzal prohlížeč (7200 období). Strop 50 let.
- **FIX-107** (v7.24, projects.js) – ReferenceError `eomLeft` before initialization (TDZ). Predikční blok přesunut před alerty.
- **FIX-108** (v7.26, projects.js) – SVG grafy radaru roztažené ~4× (viewBox 320 + width:100%). `max-width` + `preserveAspectRatio`.
- **FIX-109** (v7.27, projects.js) – grafy radaru braly `today` místo `S.curMonth` → neměnily se při přepnutí měsíce.
- **FIX-111** (v7.30, projects.js) – zelená čára „příjem" brala vyšší z {reálný, průměr} → ukazovala 68k místo 28k. Nyní reálný příjem měsíce.

### Střední
- **FIX-097** (v7.12, index.html) – kalkulačka: JS template v HTML se zobrazil jako text. Statická tlačítka.
- **FIX-098** (v7.12, projects.js+advisor.js) – skóre nesedělo napříč stránkami. Sjednoceno na `computeHealthScores().overall`.
- **FIX-100** (v7.13, styles.css) – `.tx-filt-btn` selektor slitý → taby nečitelné.
- **FIX-102** (v7.15, admin.js) – „Já vs ČSÚ" ignorovala OECD (avg_domacnost natvrdo). Přepínač + calcOECD.
- **FIX-103** (v7.16, admin.js) – komunita blikala při přepínání. Cache `_komunitaLoaded`.
- **FIX-105** (v7.19, admin.js) – odkaz Sdílení vedl do „O aplikaci" místo stránky sdileni.
- **FIX-106** (v7.20, admin.js) – karty ČR nezarovnané.
- **FIX-110** (v7.29, projects.js) – duplicitní banner volných peněz (2× stejné číslo). Odstraněn.

### Audit OPEN-001 až 028 (Session 10/11)
Viz `AUDIT_todo_bugs_s10.md` sekce E. Nově ověřeno hotovo: OPEN-005, 006, 007, 018, 019, 020, 028. Stále otevřené: OPEN-004 (částečně), OPEN-010 (bundler), OPEN-011 (testy), OPEN-013 (xlsm). Nové S10: OPEN-032 (Sentry ongoing), OPEN-033 (Stripe, čeká IČO), OPEN-034 (komprese fotek netestováno).


*Konsolidováno: 2026-04-23 | Doplněno z bugs_consolidated_s5: 2026-05-15 | Session 7.0+7.1 patch: 2026-05-15 | Session 10 doplnění: 2026-06-01 | Sessions: 1 → 10 | Poslední update: Session 10, 2026-06-01 | Autor: Milan Migdal*
*Poznámka ke konsolidaci: `bugs_s6.md` jako základ S6 → doplněno z `bugs_consolidated_s5` (Merge S1-5) → aplikován `patch-session7-COMBINED(1).md` (Sessions 7.0 + 7.1). Dočasná ID z patche přečíslována: FIX-S70-01=FIX-051, FIX-S70-02=FIX-052, FIX-S71-01=FIX-053, OPEN-S70-01=OPEN-026, OPEN-S71-01–04=OPEN-027–030.*

---

## Session 11 – opravy (FIX-118 až FIX-128, v7.50 → v7.69)

> Session 11 datum: 2026-06-08/09 | verze v7.50 → v7.69

### TL;DR Session 11
| FIX | Soubor(y) | Popis |
|---|---|---|
| FIX-118 | app.js | saveToFirebase() mazal assets + importHistory |
| FIX-119 | worker.js, receipts.js | Receipt cena – lineTotal model, váhové položky |
| FIX-120 | helpers.js, ui.js, transactions.js, stats.js | Split double counting – 5 míst |
| FIX-121 | receipts.js | Edit účtenky selhával po navigaci (setTimeout race) |
| FIX-122 | receipts.js | Focus guard blokoval výběr kategorie (subkat se neobjevila) |
| FIX-123 | ui.js | Zelené tagy z účtenky neviditelné (Array.isArray chyba) |
| FIX-124 | app.js, ui.js | Render-bug: změny jen po překliknutí (_dataSig + save force) |
| FIX-125 | app.html | Verze banner zaseknutá na 7.55 (špatný sed pattern) |
| FIX-126 | charts.js, app.html | Grafy duplikátní nav + nečitelná legenda |
| FIX-127 | receipts.js | Edit účtenky prázdný – ROOT CAUSE (_renderForce wipe slot) |
| FIX-128 | receipts.js | Mobilní vizuál: částka přes text v Historii |

---

### FIX-118 · saveToFirebase() mazal assets + importHistory **(Session 11, v7.51)**
- **Soubor:** `app.js`
- **Příčina:** `saveToFirebase()` neobsahoval klíče `assets` a `importHistory` v ukládaném objektu → Firebase `_set()` přepsal celý uzel a obě datové struktury tiše smazal při každém uložení.
- **Oprava:** Doplněny chybějící klíče `assets` a `importHistory` do objektu předávaného `saveToFirebase()`.
- **🔗 Cross-reference:** `explanations.md` – Data-loss pattern (Firebase _set přepisuje celý uzel).

### FIX-119 · Receipt cena – chybný výpočet u váhových položek **(Session 11, v7.62)**
- **Soubor:** `worker.js` (AI prompt – deploy Cloudflare), `receipts.js` (lineAmt helper)
- **Příčina:** AI prompt říkal `price = cena za kus` ale výpočet total dělal `price × qty`. U váhových položek (příklad: meloun 6,445 kg × 29,90 Kč/kg = 192,71 Kč, po slevě 128,26 Kč) Claude počítal 6,445 × 128,26 = 826 Kč.
- **Oprava:** Nové pole `lineTotal` (vždy skutečně zaplacená cena řádku) + `discount`. Worker prompt PRAVIDLO 2 (váhové): `price=cena/kg`, `qty=hmotnost`, `lineTotal=zaplaceno`. PRAVIDLO 3 (sleva na samostatném řádku): `lineTotal=po slevě, discount=záporná sleva`. PRAVIDLO 5: ověření `sum(lineTotal)≈total`. Helper `lineAmt(it) = it.lineTotal ?? (it.price × it.qty)` (zpětně kompatibilní).
- **🔗 Cross-reference:** ADR-059, `explanations.md` – lineTotal model.

### FIX-120 · Split DOUBLE COUNTING napříč aplikací **(Session 11, v7.65/v7.67)**
- **Soubory:** `helpers.js`, `ui.js`, `transactions.js`, `stats.js`
- **Příčina:** Split parent (celá částka, vlastní catId) + children (rozpad do dalších kategorií, vlastní catId) se počítaly DVAKRÁT v sumách. Příklad: PENNY 99,90 Kč (Jídlo) + Doprava 49,95 Kč + Dítě 49,95 Kč = 199,80 Kč celkem ve statistikách místo správných 99,90 Kč.
- **Oprava:** Filtr `!t.splitParent` přidán na 5 míst:
  1. `helpers.js` – `getActual()` (dynamický check splitIds s children), `incSum()`, `expSum()`
  2. `ui.js` – `allExpTxs` (měsíční souhrn totalCur/totalPrev)
  3. `transactions.js` – měsíční výdaj index (finanční skóre, medián)
  4. `stats.js` – `prevYearTotal`, `allTotal`, `allIncome`
- **Pravidlo:** Split parent se NIKDE nezapočítává – children pokrývají celou sumu ve svých kategoriích.
- **🔗 Cross-reference:** `explanations.md` – Split double counting pattern.

### FIX-121 · Editace účtenky v Historii selhávala po navigaci **(Session 11, v7.64/v7.65)**
- **Soubor:** `receipts.js`
- **Příčina:** `setTimeout(initReceiptEditor, 50)` – Firebase `onValue` callback mohl dorazit za těch 50 ms, zavolat `renderUctenky()` a zničit slot dřív než editor naběhl. Navíc globální `window._editReceipt` nebyl resetován → konflikt stavu po překliknutí do admin sekce a zpět.
- **Oprava:**
  1. Synchronní `initReceiptEditor()` (bez setTimeout) – Firebase callback nemůže přerušit synchronní kód.
  2. Reset `window._editReceipt = null` na začátku každého `editReceiptFromHistory()`.
  3. Zavření všech ostatních otevřených editorů před otevřením nového.
  4. Guard v `initReceiptEditor()` – abort pokud `#receiptEditForm` neexistuje a `_editReceipt` je null.

### FIX-122 · rpRender focus guard blokoval výběr kategorie **(Session 11, v7.66)**
- **Soubor:** `receipts.js`
- **Příčina:** Guard `if(focused && focused.closest('#rp_items')) return` blokoval re-render pro JAKÝKOLI focusovaný prvek uvnitř items – včetně `<select>` pro kategorii. Po změně kategorie se subkategorie nevykreslila až do dalšího uložení.
- **Oprava:**
  1. Guard blokuje jen TEXT inputy (`INPUT` typu != number) – `<select>` a `<button>` jsou povoleny.
  2. `catEl.blur()` voláno před `rpRender()` jako pojistka.
  3. Subkategorie select zobrazen VŽDY vedle kategorie (opacity 0.4 pokud kategorie není vybrána) – ne podmíněně.
- **🔗 Cross-reference:** `explanations.md` – Focus guard past.

### FIX-123 · Zelené tagy z účtenky se nezobrazovaly v transakcích **(Session 11, v7.67)**
- **Soubor:** `ui.js`
- **Příčina:** `addReceiptAsTx()` ukládá tagy z položek jako STRING (`join(' ')`). `buildTxRow()` kontroloval `(t.tags||[]).length` – u stringu vrátil délku textu (truthy) → volalo `.map()` na stringu → TypeError → tagy neviditelné. Podmínka `!t.tags` pro prázdný placeholder `–` také selhávala pro neprázdný string.
- **Oprava:** `Array.isArray(t.tags)` check místo `(t.tags||[]).length`. Array tagy = modré (manuální editace), string tagy = zelené (z účtenky).
- **🔗 Cross-reference:** `explanations.md` – String vs Array tagy past.

### FIX-124 · Render-bug: změny se projevily až po překliknutí **(Session 11, v7.68)**
- **Soubory:** `app.js`, `ui.js`
- **Příčina:** Anti-flicker guard v `renderPage()` přeskakoval re-render když `_dataSig()` signature nezměněna. Signature sledovala jen počty + sumy transakcí/aktiv/dluhů – NEsledovala wallet balances, virtuální cíle (goals), tagy, podkategorie. Přidání 1 000 Kč do cíle → signature stejná → render přeskočen.
- **Oprava:**
  1. `save()` vždy nastaví `_renderForce = true` → každá uživatelská akce vynutí render.
  2. `_dataSig()` rozšířen o `wsum` (wallet balances), `gsum` (goals saved+target), `tsum` (délka tagů+subcat).
- **🔗 Cross-reference:** `explanations.md` – Anti-flicker _dataSig past.

### FIX-125 · Verze v O aplikaci banneru zaseknutá na 7.55 **(Session 11, v7.68)**
- **Soubor:** `app.html`
- **Příčina:** Banner měl formát `>Verze 7.55</div>` ale sed pattern ve version bump procesu hledal `Verze 7.XX` (bez `>`). Pattern nikdy neodpovídal → banner zůstal na 7.55 přes mnoho verzí (v7.56–v7.67).
- **Oprava:** Sed pattern opraven na `>Verze X.YY<`. Banner = v7.69.
- **Poznámka:** 4. krok version bump (banner) byl fakticky nefunkční celou Session 11.
- **🔗 Cross-reference:** `VERSIONING.md` – opravený proces.

### FIX-126 · Grafy: duplikátní navigace + nečitelná legenda **(Session 11, v7.60)**
- **Soubory:** `charts.js`, `app.html`
- **Příčina:** Přidány `grafMonthNav`/`grafYearNav` které duplikovaly existující navigaci uvnitř karet Měsíční/Roční. Legenda v canvas 9px v rohu – nečitelná.
- **Oprava:** Duplikátní nav odstraněn. Legenda přesunuta do HTML `#mesicniLegend` pod grafem (0.82rem, barevné indikátory). Kompaktní filtry (height 28px, width auto). Filtry sdíleny pro záložky Roční↔Vsechny roky (stejný DOM, zachovává výběr při přepnutí).

### FIX-127 · Edit účtenky prázdný po otevření – ROOT CAUSE **(Session 11, v7.69)**
- **Soubor:** `receipts.js`
- **Příčina:** Oprava FIX-124 (`save()→_renderForce=true`) měla vedlejší efekt: Firebase `onValue` sync teď spustil plný `renderPage()→renderUctenky()` který přepsal otevřený inline editor slot dřív než `rpRender()` vykreslil položky. Editor obsahoval jen prázdný slot + tlačítko Uložit.
- **Oprava:** Flag `window._receiptEditorOpen`:
  - Nastaven na `true` při otevření editoru (`editReceiptFromHistory`).
  - `renderUctenky()` přeskočí re-render dokud je flag true (zkontroluje zda je slot skutečně otevřen).
  - Flag vyčištěn při zavření (toggle) nebo uložení (`rpSave`).
  - Záložní `requestAnimationFrame(() => rpRender())` pro případ pozdní inicializace.
- **🔗 Cross-reference:** Vedlejší efekt FIX-124, `explanations.md` – Inline editor v seznamu past.

### FIX-128 · Mobilní vizuál: částka přes text v Historii účtenek **(Session 11, v7.69)**
- **Soubor:** `receipts.js`
- **Příčina:** History řádek měl datum + store + kategorie tagy + částka + akce vše v jednom flex řádku. Na mobilní šířce kategorie tagy roztáhly flexbox a částka se překrývala s názvem obchodu.
- **Oprava:** 2-řádkový layout:
  - Horní řádek: datum | obchod (truncate) | částka | ✎ | ✕
  - Dolní řádek: kategorie tagy přes celou šířku (flex-wrap)

---

*Aktualizace Session 11: 2026-06-09 | v7.50 → v7.69 | FIX-118–128*

---

# SESSION 12.1 (v7.70 -> v7.94)

### FIX-129 · Runway: výplata = největší příjem, ne první příjem **(v7.71)**
radarPaydayInfo() bral první příjem v měsíci jako výplatu; nyní medián největšího příjmu za 6 měsíců (auto-detekce kotvy) s přichycením ±6 dní, víkend→pátek.

### FIX-130 · firstDay se neukládal **(v7.71)**
Ruční nastavení dne výplaty (_settings.firstDay) se nepropisovalo do Firebase.

### FIX-131 · COICOP merge override **(v7.73)**
coicopOverrides nyní {...definice, ...userOverrides} — uživatelská přiřazení nepřepisovala defaultní.

### FIX-132 · Poplatky bez COICOP **(v7.74)**
cat42 Poplatky dostala coicop:13 + override {'Bankovní poplatek':12}.

### FIX-133 · Predikce: skrývání prázdných podkategorií **(v7.73)**
localStorage ff_predHideEmptySubs — stav přepínače se neukládal.

### FIX-134 · Mobilní tooltipy grafů **(v7.73)**
attachChartTouch — dotykové tooltipy na grafech nefungovaly.

### FIX-135 · statCard čitelnost na tmavém pozadí **(v7.75)**
P�echod na třídy .stat-value-h/.stat-label-h (var(--text3) byl nečitelný).

### FIX-136 · database_rules validate blokoval COICOP 0 **(v7.79)**
admin_coicop_overrides validate vyžadoval coicop>=1; volba „0 – mimo COICOP" selhala. Opraveno >=0 + pravidlo pro /subs.

### FIX-137 · Prázdný modal u Přesunu a Dluhu **(v7.83)**
setTxType skrýval kategorie přes catPicker.parentElement.parentElement — po přestavbě modalu řetěz vylezl na .modal-body a schoval celý formulář. Nyní explicitní #catSection.

### FIX-138 · Přesuny započítané jako příjem/výdaj **(v7.83)**
incSum/expSum nevylučovaly transfery → převod na spoření se počítal jako výdaj i příjem. Nový isTransferTx(t); vyloučeno i z detekce výplaty a Runway. computeWalletBalance je dál započítává (pohyb majetku).

### FIX-139 · Mizející editor účtenky **(v7.88)**
Po překliknutí stránek zůstal _receiptEditorOpen=true s osiřelým _editReceipt → blokoval render i nové otevření. Tvrdý reset při openu, guard čistí osiřelý stav, switchUctenkyTab zavírá editor.

### FIX-140 · Email kontakt smyčka info→info **(v7.88)**
Worker posílal z info@ na info@ (závislé na ImprovMX forwardingu → Bounced). Nyní přímo na bc.milda@gmail.com + reply_to na odesílatele.

### FIX-141 · Tabulka obchodů ořezávala levý sloupec **(v7.82, revert)**
min-width:380px byl správný (posuvník); zbytečná oprava vrácena.

### FIX-142 · Import dat omylem skryt místo Import z banky **(v7.92)**
v7.91 skryl špatnou položku. Import dat (CSV/Excel/PDF) dostupný všem; Import z banky (SMS/push) skryt pro neadminy; PDF výpis = Premium, CSV/Excel zdarma.

### FIX-143 · Emoji vstup u typu platby **(v7.92)**
maxlength=2 blokoval složené emoji. Zvýšeno na 8 + emoji picker (12 ikon).

### FIX-144 · Tempo graf: verdikt překrýval legendu **(v7.93)**
„Utrácíš o X% pomaleji" na top-12 přes legendu → přesunuto pod graf.

### FIX-145 · Predikce tabulka: zalomené číslice **(v7.93)**
white-space:nowrap na buňky, sloupec Kategorie min 130px, širší měsíční sloupce.

### FIX-146 · Radar „Kam směřuju" – překrývající se sloupce a matoucí cashflow **(v7.94)**
Plánovaný výdej = slepý 3měsíční průměr (avgExp), sloupce se překrývaly, cashflow počítán přes matoucí max(). Přepracováno: plánovaný výdej = skutečná útrata + projekce zbytku z denního tempa; budoucí platby samostatně; cashflow = prosté odečtení. Přidána tečkovaná čára skutečného stavu + rozepsaný výpočet.

---

---

*Aktualizace Session 12.1: 2026-06-14 | v7.70 → v7.94 | FIX-129-146, TODO-122-136, ADR-060-064*


---

## Session 13 (2026-06-18 az 06-20, v8.10 -> v8.24)

### FIX-147 - Otaznik u kategorie virtualnich presunu (v8.13->v8.14)
Transakce vkladu/vyberu do cile smerovaly na neexistujici catId 'virtual_transfer' -> render zobrazil ?. Ciste reseni: kod najde realnou kategorii podle jmena pres findCatIdByName('Virtualni presun') a pouzije skutecne ID + podkategorie. Odebrana migrace, vymyslena kategorie i fallback v getCat.

### FIX-148 - Transakce v cizi mene zobrazene v Kc (v8.13)
Eurova/librova penezenka zobrazovala castku natvrdo v Kc. Opraveno na spravnou menu (EUR/GBP). Prepocet do cile (toCZK) byl spravne, slo o zobrazeni.

### FIX-149 - Filtr Typ platby jen Vse/Presun (v8.13/16/18)
Filtr pouzival D.payTypes (jen custom). Opraveno na getPayTypes(D) - vsechny typy vcetne Edenred.

### FIX-150 - KRITICKY - unik dat mezi uzivateli (v8.15)
Pri odhlaseni se nevycistil S, neodpojil _dbListener, onUserSignedIn neresetoval S -> data predchoziho uzivatele se zapsala do uzlu noveho. Fix: resetAppState() odpoji listenery + vynuluje S/partnerData/viewingUid, volano pri odhlaseni a na zacatku onUserSignedIn.

### FIX-151 - Seed data u noveho uzivatele (v8.15)
seedData() plnil fiktivni demo data. Novy uzivatel = cista aplikace, jen sdilene kategorie + typy plateb z kodu.

### FIX-152 - Mazani dat nefungovalo na 100 % (v8.15)
confirmDeleteAllData mazal spatne klice a nemazal IndexedDB snapshot -> data se vracela. Opraveno: odpoji listener, smaze IndexedDB + spravne klice, pak reset.

### FIX-153 - Worker volal vyrazeny model (404) (v8.13->v8.15)
claude-sonnet-4-20250514 -> 404, nefungoval URL import/sken/Radce. Aktualizovano na claude-sonnet-4-6 (7 mist).

### FIX-154 - welcomeMessage PERMISSION_DENIED (v8.15)
database_rules.json nemel pravidlo pro welcomeMessage -> deny. Pridano (cteni prihlaseni, zapis admin).

### FIX-155 - Zobrazit jako uzivatel nepreplo na cizi data (v8.16)
adminViewUserAs nastavil viewingUid, ale nenacetl partnerData -> getData spadlo na S. Opraveno: data uzivatele se nactou PRED switchToPartner.

### FIX-156 - Mobilni prepnuti na partnera padalo (v8.18)
switchToPartner volal getElementById().classList bez null-checku. Null-safe + zavre sidebar + toast.

### FIX-157 - COICOP v komunite zobrazeny jako cisla (v8.19)
Komunita nahravala COICOP klice (1-13), zobrazeni je bralo jako nazvy -> 1,4,6. Mapovani na nazvy divizi pres COICOP_GROUPS_DEF; obe strany pres computeCoicopAggregates.

### FIX-158 - Budouci platby - pad na zastaraly nakupSwitchTab (v8.22)
Kliknuti na cil: ReferenceError (funkce odstranena pri presunu cilu). Opraveno na showPage('narozeniny') + klicove funkce nakup.js na window.

### FIX-159 - exportCSV chyby v datech (v8.20)
Cetl t.category misto t.catId||t.category, t.amount bez fallbacku, nefiltroval split. Opraveno + rozsirene sloupce + BOM.

---

*Aktualizace Session 13: 2026-06-20 | v8.10 -> v8.24 | FIX-147-159, TODO-137-142, ADR-065-072*


---

## Session 14 — Nové bugy a opravy (v8.28 → v8.57)

**Nové FIX Session 14:** FIX-160–173
**Vyřešeno v S14:** FIX-160–173 (vše vyřešeno ve stejné session)
**Nové OPEN Session 14:** žádné kritické (TODO-145/146 jako slabiny duplicit/sumářů, viz todo.md)
**Uzavřeno:** OPEN-034 (FIX-058 komprese fotek ověřena v provozu)

### FIX-160 · KRITICKÝ — Přesun→Investice se nepropisoval do Finančních aktiv **(v8.49→v8.56)**
- **Soubor:** `assets.js`
- **Příčina:** `syncInvestmentAssets` i `resyncAssetsFromTransfers` používaly `window.S`, jenže `S` je deklarované jako `let S` (app.js:401) — není vlastností `window` → `window.S === undefined` → guard `if(!window.S) return;` funkci okamžitě ukončil. Žádná aktiva nebyla nikdy vytvořena ani aktualizována.
- **Fix:** Záměna `window.S` → `S` na 3 místech (assets.js). Diagnostické tlačítko „🔄 Přepojit" obaleno do try/catch — vždy ukáže alert s výpisem nebo chybou.
- **🔗 Cross-reference:** ADR-076, TODO-143, TODO-141

### FIX-161 · Avatary v Upravit profil nešly vybrat **(v8.56)**
- **Soubor:** `app.js`
- **Příčina:** `renderAvatarPicker()` resetoval `_selectedAvatar` na uloženou hodnotu při KAŽDÉM zavolání. `selectAvatar(e)` po kliknutí volá `renderAvatarPicker()` pro aktualizaci zvýraznění → výběr se okamžitě přepsal zpět.
- **Fix:** Řádek `_selectedAvatar = (window._userProfile...)` přesunut z `renderAvatarPicker` do `openProfileModal` (inicializace jen při otevření modalu).

### FIX-162 · Tagy u transakcí — dědění a nemazatelnost **(v8.55)**
- **Soubor:** `debts.js`
- **Příčina A:** `openAddTx` čistil `txName/txAmt/txNote`, ale ne `txTags` → nová transakce dědila tagy z předchozí.
- **Příčina B:** Uložení obsahovalo `if(tags.length) txObj.tags = tags` → smazání všech tagů nepropsalo prázdné pole.
- **Fix:** (A) `openAddTx` pole `txTags` vyčistí + volá `updateTagsPreview`. (B) `txObj.tags = tags` vždy (bez podmínky).

### FIX-163 · Web ztratil akční tlačítka ✂✎✕📷 po mobilní úpravě **(v8.51→v8.53)**
- **Soubor:** `ui.js`
- **Příčina:** Skrytí tlačítek v landscape/mobilu (ADR-075) omylem skrylo tlačítka i na webu (myš), kde swipe nefunguje.
- **Fix:** `matchMedia('(pointer: coarse)')` → dotyk = swipe + skrytá tlačítka; myš/web = tlačítka viditelná.
- **🔗 Cross-reference:** ADR-075

### FIX-164 · Sticky hlavička tabulky transakcí nefungovala **(v8.50→v8.53)**
- **Soubor:** `styles.css`, `app.html`
- **Příčina:** `position:sticky` na `.tx-table-head` selže, má-li kterýkoli předek `overflow:hidden`. `.card` má `overflow:hidden` (řádek 105).
- **Fix:** `#txCard{overflow:visible}` + `top:54px` (pod topbar). ID `txCard` přidáno v `app.html`.
- **⚠️ Ponaučení:** Sticky selže při `overflow:hidden/auto/scroll` na jakémkoli předku — opravit cíleně přes ID.

### FIX-165 · Swipe „Upravit" u účtenkové transakce otevíral špatnou akci **(v8.48→v8.50)**
- **Soubor:** `ui.js`
- **Příčina:** Swipe volal `editTx(id)` (obecná editace) → dvojí chování (jednou rozbalení položek, jednou editační okno).
- **Fix:** Swipe volá `openReceiptInHistory(receiptDate, receiptStore)` — otevře konkrétní naskenovanou účtenku v Historii.

### FIX-166 · Kurzy měn zamrzlé 3 dny **(v8.50)**
- **Soubory:** `kurzy.js`, `worker.js`
- **Příčina:** Klient cachoval odpověď Workeru (`cache:'default'`); Worker neposílal `Cache-Control`.
- **Fix:** Klient `cache:'no-store'`; Worker: `Cache-Control:no-cache`, edge cache 30 min (bylo 60).
- **Pozn.:** O víkendu a v pracovní den před ~14:30 ČNB drží páteční kurz — korektní, ne chyba.

### FIX-167 · Zelené tagy v landscape ořezány na emoji + 1 písmeno **(v8.52)**
- **Soubor:** `ui.js`
- **Příčina:** Tagy v tabulce (landscape) byly v buňce „Název" (`~40 px`, `overflow:hidden`, `white-space:nowrap`).
- **Fix:** V tabulkovém zobrazení se tagy vykreslují jako pruh přes celou šířku POD řádkem (mimo buňku). Portrait beze změny.

### FIX-168 · Zdražování — chybná cena/kg u vážených položek **(v8.46)**
- **Soubor:** `receipts.js`
- **Příčina:** `unitPrice/(unitInfo.value*qty)` — u vážených položek (kg/l) násobilo qty navíc.
- **Fix:** Vážené (`unit==='kg'/'l'`) = `price` přímo; kusové = `unitPrice/unitInfo.value`. Rohlík 43 g 2,90 Kč → 67,4 Kč/kg.
- **🔗 Cross-reference:** TODO-084

### FIX-169 · Připnuté měny v Kurzech mizely po sync **(v8.46)**
- **Soubory:** `kurzy.js`, `app.js`
- **Příčina:** Piny uloženy v `S.pinnedFx` — pole není ve schématu `saveToFirebase` → Firebase sync mazal.
- **Fix:** Piny přesunuty do `localStorage` (`ff_pinnedFx`). Tlačítko „Obnovit" odebráno.
- **⚠️ Ponaučení:** Nová pole v `S` musí být explicitně v `saveToFirebase` (schéma) — jinak je sync smaže.

### FIX-170 · COICOP 3. úroveň ve špatném formátu **(v8.46)**
- **Soubor:** `coicop.js`
- **Příčina:** `_coicopClass` produkoval `"01.11"` místo `"01.1.1"` → neshoda s klíči tabulky.
- **Fix:** Výstup přepsán na formát `"01.1.1"`.
- **🔗 Cross-reference:** TODO-131, ADR-005

### FIX-171 · Šipky přesunu kategorie v „Příjem i výdaj" **(v8.45)**
- **Soubor:** `stats.js`
- **Příčina:** `moveCatUp/Down` prohazovaly sousedy v surovém poli; po přeskupení dle typu byla prohození neviditelná (sousedé různých typů).
- **Fix:** Prohazovat v rámci STEJNÉ sekce (dle `_catSection(c)`); `isFirst/isLast` dle indexu ve skupině; scroll-kompenzace (`_keepCatBtn`) udrží tlačítko pod kurzorem.

### FIX-172 · GA4 sbíral analytická data bez souhlasu **(v8.44)**
- **Soubor:** `app.html`
- **Příčina:** Chyběl `gtag('consent','default',{analytics_storage:'denied'})` → GA4 sbíralo data ihned po načtení.
- **Fix:** Consent mode default `denied`, grant dle `localStorage ff_cookie_analytics`; přepínač v Oznámení→Soukromí.
- **🔗 Cross-reference:** TODO-137, ADR-071

### FIX-173 · Ořez názvu položky v „Nejčastěji nakupované" **(v8.44)**
- **Soubor:** `receipts.js`
- **Příčina:** Grid `1fr` + `white-space:nowrap` + `text-overflow:ellipsis` ořezával dlouhé názvy produktů.
- **Fix:** `minmax(0,1fr)` + `word-break:break-word`.

---

*Aktualizace Session 14: 2026-06-29 | v8.28 → v8.57 | FIX-160–173*

---

## Session 15 (2026-07-02 → 2026-07-06, v8.57 → v8.74)

> Nové bugy a opravy ze Session 15 (18 FIXů, v8.58 → v8.74).

### FIX-174 · Editace transakce nevyplňovala peněženku ani typ platby **(v8.58)**
- **Příčina:** `editTx()` v `ui.js` nevolal `populateTxWalletSelect()`/`populateTxPayTypeSelect()`.
- **Oprava:** `editTx()` naplní oba selecty a nastaví `t.wallet`/`t.payType`.
- **Soubor:** `ui.js`

### FIX-175 · Duplicitní detekce ignorovala měnu **(v8.58)**
- **Příčina:** `detectDuplicates()` porovnávalo surové `t.amount` → 900 Kč a 900 GBP vyhodnoceny jako duplikát.
- **Oprava:** Porovnání v CZK přes `txCZK()`, tolerance 1 Kč.
- **Soubor:** `duplicates.js` · 🔗 ADR-079

### FIX-176 · Přesun mezi peněženkami s různou měnou nepřeváděl částku **(v8.59)**
- **Příčina:** Transfer větev pushovala obě nohy se stejnou surovou částkou (100 EUR → 100 Kč místo ~2 530 Kč).
- **Oprava:** Pole „Připsat do cílové peněženky" s křížovým kurzem ČNB, editovatelné. Obě nohy nesou `amtCZK`.
- **Soubory:** `debts.js`, `app.html` · 🔗 ADR-079

### FIX-177 · Kč-only limit kategorie nefungoval **(v8.63)**
- **Příčina:** Chybějící `healthPct` dávalo `limitByPct=0` → engine vyhodnotil „bez limitu" i když byl vyplněn Kč strop.
- **Oprava:** `limitByPct = Infinity` když `healthPct` není vyplněno (ne 0).
- **Soubor:** `projects.js`

### FIX-178 · Přesuny zahrnuty v denních sumářích transakcí **(v8.65)**
- **Příčina:** Denní hlavičky/badge v Transakcích nefiltrovaly `isTransferTx`.
- **Oprava:** Denní sumy filtrovány přes `_statTx(t)`.
- **Soubor:** `ui.js`

### FIX-179 · Zaškrtnutí položky v Nákupním seznamu shodilo appku **(v8.67, KRITICKÝ)**
- **Příčina:** Lišta „V košíku X z Y" odkazovala na `total` z jiné funkce mimo scope → `total is not defined`, crash.
- **Oprava:** Nahrazeno `_nakupItems.length`.
- **Soubor:** `nakup.js`

### FIX-180 · Převodník měn se zasekl při editaci transakce **(v8.68)**
- **Příčina:** `editTx()` nespouštěl `updateTxCurrency()` → převodník ukazoval starou/nulovou hodnotu.
- **Oprava:** `editTx()` volá `updateTxCurrency()` po nastavení selectů.
- **Soubor:** `ui.js`

### FIX-181 · Šipky řazení kategorií přeskakují v sekci Příjmy **(v8.68, 1. pokus)**
- **Příčina:** U horního okraje stránky se scroll nemá kam posunout (clamp) → kurzor skončí nad jinou kartou.
- **Oprava (částečná):** Detekce clampu + zvýraznění přesunuté karty.
- **Soubor:** `stats.js` · ⚠️ Nedostatečné, viz FIX-182 a FIX-183

### FIX-182 · Šipky kategorií – anti-bounce guard **(v8.70, 2. pokus)**
- **Příčina:** FIX-181 jen zvýraznil kartu, ale klik na jinou kategorii těsně po clampu ji stále přesunul.
- **Oprava (částečná):** 500ms guard ignoruje klik na jinou kategorii po neúspěšné kompenzaci.
- **Soubor:** `stats.js` · ⚠️ Milan hlásil "zadrhávání nahoru, dolů OK" → viz FIX-183

### FIX-183 · Šipky kategorií – finální oprava (redirect) **(v8.71, 3. pokus, VYŘEŠENO)**
- **Příčina:** Ignorování klik (FIX-182) nechalo uživatele "trčet" – klik nic neudělal.
- **Oprava:** Klik po clampu se PŘESMĚRUJE na původně přesouvanou kartu (stejný směr, okno 900 ms) → plynulé opakované klikání i u okraje stránky.
- **Soubor:** `stats.js`

### FIX-184 · Napojená aktiva po smazání se už neobnoví **(v8.71)**
- **Příčina:** Blocklist `S.noSyncKeys` – jednou smazané napojené aktivum (ze Přesunu) se navždy zablokovalo, i po nové transakci.
- **Oprava:** Blocklist zrušen + jednorázový úklid starých blokací. Tlačítko ✕ u napojených aktiv skryto (nelze smazat ručně, jen přes transakce).
- **Soubor:** `assets.js` · 🔗 ADR-076/077/078

### FIX-185 · Progress bar půjčky ukazoval 0 % i při částečném splacení **(v8.71)**
- **Příčina:** Progress počítal jen splátky zadané v appce (transakce), ne rozdíl (půjčeno − zbývá) z historie před appkou.
- **Oprava:** `_prePaid = total − remaining − paidPrincipal` – Milanův příklad (60k/40,5k) ukazuje 32,5 % místo 0 %.
- **Soubor:** `transactions.js`

### FIX-186 · Denní cena dluhu nesouhlasila s bannerem (125 vs 215 Kč/den) **(v8.71)**
- **Příčina:** Kalkulačka dělila součtem délek VŠECH úvěrů (jako by běžely za sebou), banner délkou NEJDELŠÍHO úvěru.
- **Oprava:** Sjednoceno na dobu nejdelšího úvěru.
- **Soubor:** `debts.js`

### FIX-187 · Financial Freedom Ratio a Diverzifikace příjmů nefungovaly **(v8.72, ZÁSADNÍ)**
- **Příčina:** Obě metriky používaly `getActual` (jen VÝDAJE) → pasivní příjem vždy 0, jediným "zdrojem příjmu" byla kategorie s výdajovou transakcí (Finanční úřad – daň).
- **Oprava:** Nový helper `getIncActual` (příjmy, bez přesunů/splitů/vyrovnání) v `helpers.js`.
- **Soubory:** `helpers.js`, `projects.js`

### FIX-188 · DSTI nesouhlasilo mezi widgety (732 % vs 753 %) **(v8.72)**
- **Příčina:** Dluhový stres index ignoroval `d.installments` (proměnlivé splátky), počítal jen z `d.payment`.
- **Oprava:** Sdílené helpery `computeMonthlyDebtPayments()` + `computeEffectiveIncome()` v `helpers.js` – jeden zdroj pravdy pro Stres index, Bankovní hodnocení i Dashboard.
- **Soubory:** `helpers.js`, `debts.js`, `projects.js`, `premium.js`

### FIX-189 · KRITICKÁ chyba – Půjčky nešly otevřít **(v8.73, způsobeno vlastní chybou v8.72)**
- **Příčina:** Při sjednocování DSTI (FIX-188) hromadný `replace` s nejedinečným vzorem trefil PRVNÍ výskyt (Kalkulačka dluhové reality místo Dluhového stres widgetu) a smazal 108 řádků včetně `function renderDebtStressWidget`. Syntax zůstala validní → `node --check` chybu nezachytil.
- **Oprava:** Obnoveno z v8.71 + oprava aplikována na správné místo.
- **Soubor:** `debts.js`
- **📌 Poučení zapsáno do `CLAUDE_SKILLS.md` SKILL 5.**

### FIX-190 · Převodní měna z Nastavení se nepropsala u nové transakce **(v8.73)**
- **Příčina:** `openAddTx()` nespouštěl `updateTxCurrency()` (jen editace to dělala).
- **Oprava:** `openAddTx()` volá `updateTxCurrency()` přes `setTimeout(...,0)`.
- **Soubor:** `debts.js`

### FIX-191 · Finanční obraz – šipka trendu vs. hodnocení rozhozené **(v8.74)**
- **Příčina:** U metrik Výdaje/Dluhy se posílalo `trend:-hodnota` aby "sedělo" hodnocení good/bad → šipka i fajfka byly obě obrácené (výdaje +37 % ukazovaly ↓ se zelenou ✅).
- **Oprava:** Rozděleno na `rawTrend` (skutečný směr, pro šipku) a `good` (hodnocení, pro ✅/⚠️) – nezávisle na sobě.
- **Soubor:** `projects.js`

---

*Aktualizace Session 15: 2026-07-06 | v8.57 → v8.74 | FIX-174–191 · ADR-079–085 · TODO-144–159*


---

# 📦 SESSION 16 (v8.74 → v8.90) — aktualizace 2026-07-12

> Detail: `patch-session16.md` + `AUDIT_s16.md` (bezpečnostní audit s důkazy soubor:řádek).

## ✅ Opraveno
- **FIX-192** (v8.75) DTI/DSTI divoce skákaly mezi měsíci (červen 1506 % → červenec 4597 %). Příčina: příjmová základna = 3M průměr ukotvený k zobrazenému měsíci. Fix: 12M klouzavý průměr pro oba ukazatele, sjednoceno přes `computeEffectiveIncome(D,12)` u všech 3 konzumentů (projects/premium/debts). **(Session 16)**
- **FIX-193** (v8.81) Checklisty šly zavřít ✕ bez cesty zpět (úprava slíbená dříve nebyla nikdy implementována). Fix: tlačítko „Skrýt" + nové localStorage klíče (`ff_onboardHide2`, `ff_mChkHide_`) = jednorázová obnova dříve skrytých. **(Session 16)**
- **FIX-194 🔴 KRITICKÝ** (v8.85, AUDIT P1-1) Grafy: `getGrafTxs` nefiltroval `splitParent`/`isBalancing` → **splity počítány dvojitě**; přesuny počítány jako výdaje; 7 součtů sčítalo `t.amount` **bez `txCZK`** → EUR/GBP špatně (medián 6M tím zkreslen). Fix: povinné filtry + txCZK všude; přesuny jen jako volitelný typ; Tempo výdajů vždy čisté výdaje. **(Session 16)**
- **FIX-195** (v8.86, AUDIT P2-1) `fmtP(t.amt)` v ui.js:491 porušovalo pravidlo `t.amount||t.amt||0` → staré transakce ukazovaly 0. **(Session 16)**
- **FIX-196** (v8.88) onValue handler neměl sanitizaci z v8.86 (patchovala se jiná varianta `Object.assign`) → real-time sync obcházel XSS ochranu. Fix při zavádění diff-write. **(Session 16)**
- **FIX-197** (v8.86, AUDIT P1-3) Service Worker: každá navigace se cachovala pod klíč `./index.html` → návštěva `/app` **přepsala cache landingu obsahem appky** (a naopak); offline fallback mířil na landing. Fix: `app.html` v SHELL, cache pod vlastní URL, fallback dle cesty. **(Session 16)**
- **FIX-198 🔴 SECURITY** (v8.86, AUDIT P0-1) **Cross-user stored XSS**: ~50 míst renderovalo uživatelská jména RAW do innerHTML a partner má rules-právo číst celý `data` uzel → partner mohl názvem transakce (`<img onerror=…>`) spustit kód v cizí session. Fix: `sanitizeUserData()` — sanitizace NA VSTUPU dat (5 load míst vč. partnerData), pokrývá všechna místa renderu najednou; + rules v2 validace délek (v8.88). **(Session 16)**
- **P0-2** (v8.86) Landing spouštěl GA4 bez consentu (GDPR) → Consent Mode v2 default denied + cookie lišta, sdílený klíč s appkou. **(Session 16)**
- **P0-3** (v8.86) Admin „Uživatelé" stahoval CELÉ users.json → shallow UID + per-uid malé uzly + počet tx přes shallow (pool 8). **(Session 16)**
- **P2-2** (v8.87) Dvě definice „rezervy": Emergency Fund sjednocen = hotovost + likvidní rezerva (BEZ penzijka/DIP/investic — `assetTier`). **(Session 16)**

## ⚠️ Známá omezení (bez čísla — očíslovat při příští konsolidaci)
- **OPEN (S16):** Admin „poslední aktivita" = dočasně `premium.createdAt` (přesná aktivita až z `stats` agregátů, TODO-177/ADR-061). **(Session 16)**
- **OPEN (S16):** Hloubková validace meta sekcí v rules odložena — per-transakční validace hotová (v8.88), meta doplnit v S18. **(Session 16)**

---

## Session 17 (v9.00–v9.42, 2026-07-19 → 2026-08-01)

> Detail: `patch-session17.md` · Přehled: `Summary_s17.md`

### 🔴 Kritické — bezpečnost a monetizace

- **BEZPEČNOSTNÍ DÍRA: self-upgrade na Premium** (v9.27) `users/$uid` mělo `".write": "auth.uid === $uid"` a v Firebase **právo zápisu kaskáduje dolů** → `users/{uid}/premium` byl volně zapisovatelný z klienta. Kdokoli si mohl nastavit `{type:"premium", premiumUntil:9999999999999}` a mít Premium zdarma navždy. Stejnou cestou šlo resetovat `aiUsage` a obejít AI kvóty (přímý náklad na Claude API). Fix: `.validate` (nekaskáduje) — z klienta smí `type` jen `trial`/`free`, `premiumUntil` jen do minulosti, `trialUntil` max +32 dní, `trialUsed` nejde vrátit na `false`, `aiUsage` smí jen růst. Objeveno při kontrole před spuštěním plateb. **(Session 17)**
- **FIX-220 🔴** (v9.36) Trial nešel spustit NIKOMU — „Nepodařilo se aktivovat trial". `startTrial` zapisuje dedup uzel `trialsUsed/{emailKey}`, který **neměl v pravidlech nic**; ve Firebase platí, že co není povoleno, je zakázáno → PERMISSION_DENIED shodil celou aktivaci, přestože zápis do `users/{uid}/premium` proběhl. Fix: pravidla (zápis jen jednou, jen s vlastním uid) + zpevnění `startTrial` (dedup je bonus, ne podmínka). **(Session 17)**
- **FIX-223 🔴** (v9.41) Firefox blokoval platební bránu. `window.open` se volal až **po `await`** (zjišťování zakládajících míst) → prohlížeč to nevyhodnotil jako reakci na klik. Fix: počet míst se načítá dopředu do cache, checkout se otevírá synchronně; fallback do aktuální záložky. **(Session 17)**
- **ReferenceError: rows is not defined 🔴** (v9.17) Celá aplikace nešla načíst. Při refaktoru `coicop.js` do `_coicopCardShell` zůstal v těle obalu původní řádek `+ rows + unm + …` odkazující na proměnné staré funkce. `node --check` neodhalil (syntakticky validní), projevilo se až runtime. **(Session 17)**
- **Admin nemohl odebrat Premium ani banovat** (v9.29) `users/$uid` nemělo admin výjimku ve `.write` → admin mohl účty jen číst. `adminSetPremium`/`adminExtendTrial`/`adminRevokePremium` tiše padaly na PERMISSION_DENIED. Fix: admin write **výhradně na uzel `premium`** (ne na finanční data uživatelů) + nový uzel `banned/{uid}` **mimo** `users/{uid}` (uvnitř by si ho uživatel smazal). **(Session 17)**

### 🟠 Datové chyby

- **FIX-212 🔴** (v9.13) Srovnání ČR sčítalo `tx.amount` **bez `txCZK`** a bez vyloučení přesunů/splitů/vyrovnání → cizí měny v nominálu, přesuny jako výdaj. Srovnání s ČSÚ nadhodnocené. **(Session 17)**
- **FIX-213 🔴** (v9.14) Komunitní přehled publikoval do `community/{měsíc}/users` **názvy kategorií**, zatímco čtecí strana očekává **COICOP ID 1–13** → mapování selhávalo („COICOP Jídlo & Pití"). Navíc bez `txCZK` a bez vyloučení. **Třetí výskyt téže třídy chyby** (po FIX-194 a FIX-212). **(Session 17)**
- **FIX-211** (v9.13) COICOP tabulka ignorovala zvolený měsíc (dostávala vždy `allItems`) + počítala `price × qty` místo `lineTotal` → ignorovala slevy, rozpor s ADR-059. **(Session 17)**
- **FIX-215** (v9.17) Inflace: klíč položky neobsahoval jednotku → táž položka se porovnala jako Kč/ks (3 Kč) proti Kč/kg (81 Kč) = +2707 %. **(Session 17)**
- **FIX-216** (v9.18) Inflace přepočítávala na Kč/kg **všechny** položky s hmotností v názvu („Rohlík 43g = 81 Kč"). Rohlík se prodává na kusy. Fix: hlavní metrika = cena za balení, Kč/kg jen u `unit=kg/l` + jako doplněk pro detekci shrinkflace. **(Session 17)**
- **FIX-210** (v9.06 → v9.09, 4 iterace) Auto-šablony vznikaly jen když uživatel otevřel appku **přesně v den splatnosti** (`today.getDate()===den`). Finální pravidlo: doplní se výskyt tohoto měsíce, jen pokud den splatnosti **ještě nenastal** (proaktivně, nikdy zpětně). **(Session 17)**

### 🟡 UX a zobrazení

- **FIX-207** (v9.03) Klik na tag vedl na prázdné transakce — Tagy agregují napříč měsíci, ale filtr bral jen zvolený měsíc. **(Session 17)**
- **FIX-208** (v9.03) Skryté karty Dashboardu nešlo obnovit — chybělo tlačítko. Nově Nastavení → Data & Soukromí. **(Session 17)**
- **FIX-209** (v9.04) Přesčas nešel nastavit: desetinná čárka na mobilu → NaN → tichý fallback na hodiny/směnu. **(Session 17)**
- **FIX-214** (v9.15) COICOP karta zmizela **i s přepínačem období**, když v měsíci nebyly účtenky → nešlo se přepnout zpět. **(Session 17)**
- **FIX-217** (v9.21) Souhrn výdajů se zobrazoval pod Poradcem. Guard existoval, ale větev Poradce končí **early `return` před úklidem**; `#reportSouhrn` je navíc **sourozenec** `#reportContent`, takže `innerHTML` ho nesmazalo. **(Session 17)**
- **FIX-218 🔴** (v9.30) `isLiveEnv()` testoval jen Firebase domény, ale ostrý web běží na **financeflow.cz** → na produkci by se nabízely nevyplněné testovací Payment Links. **(Session 17)**
- **FIX-219** (v9.35) Odkaz „Analýza účtenek → Zdražování" otevíral prázdnou stránku: špatné ID záložky (`zdrazeni` vs. `prices`) + `showPage()` vykresluje obsah až v `renderPage`. **(Session 17)**
- **FIX-221** (v9.37) Banner hlásil „Trial vypršel" **všem** Free uživatelům včetně nováčků, kteří trial nikdy neměli — odrazovalo od vyzkoušení. **(Session 17)**
- **FIX-222** (v9.39) Paywall vždy spouštěl trial; kdo chtěl zaplatit rovnou, neměl jak, a po aktivaci trialu nešlo předplatit vůbec. **(Session 17)**
- **Přetékání textu na mobilu** (v9.10, systémově v9.11) 5 míst (Kalkulačka dluhové reality, Virtuální peněženka, Simulace, Detektor úspor, buňky kalendáře). Nejdřív inline, pak systémově ve `styles.css` (clamp, overflow-wrap, breakpoint 480→680px). **(Session 17)**

---

## Session 18 — nové FIX (v9.42–v9.78) **(2026-08-03)**

Session měla neobvykle vysoký počet oprav (32, FIX-220 až FIX-251) — hlavně proto, že se přestavovaly dvě rozsáhlé obrazovky (Finanční obraz, Měsíční report) souběžně s testy na produkci. Plný kontext u každé opravy: `patch-session18.md`.

### 🔴 Kritické — appka se neotevřela / hlavní obrazovka nefungovala
- **FIX-226** (v9.53) Finanční obraz se neotevřel — `ReferenceError: _ffrD`. Proměnná deklarována až za místem použití v téže funkci.
- **FIX-230** (v9.58) Měsíční report se neotevřel — `_s1pts` skončil při vkládání kódu v úplně jiné funkci (`renderSimulace` místo `renderReport`), protože kotva pro vyhledávání nebyla jedinečná.
- **FIX-237** (v9.63) Měsíční report se neotevřel — `ReferenceError: months`. Použita proměnná `months`, existující v souboru, ale deklarovaná o 280 řádků níž v jiném bloku. Vedlo k přepsání kontrolního skriptu na 3+ znaky místo jen `_podtržítko`.
- **FIX-241** (v9.67) Měsíční report se neotevřel — `ReferenceError: fs`. `const fs` deklarováno uvnitř `try{}` v jiném bloku; regexový kontrolní skript neznal blokový scope JS a bral to jako platné pro celou funkci. **Vedlo k přepsání skriptu na skutečný parser (acorn)** — viz `CLAUDE_SKILLS.md` SKILL 23.
- **FIX-245** (v9.72) Tabulka „Měsíc po měsíci" rozhozená u sumářů — **doslovný Python zápis `''' + G + '''` se dostal přímo do vygenerovaného CSS** místo skutečné hodnoty proměnné; prohlížeč `grid-template-columns` zahodil jako nevalidní.

### 🟠 Datová nekonzistence — dvě sekce ukazovaly různá čísla ze stejných dat
- **FIX-247/248** (v9.74, v9.76) Finanční radar „Kam směřuju" hlásil 0 u budoucích měsíců, zatímco karta „Nadcházející platby" na téže obrazovce ukazovala reálnou částku. Dvoufázová příčina: nejdřív `isCurrentMonth ? budItems : []` (vynulování u jakéhokoli jiného měsíce), po opravě ještě horizont natvrdo 30 dní v `budouciGetAll(D, 30)` — u měsíců vzdálenějších než 30 dní pořád nic nedorazilo.
- **FIX-250** (v9.77) Radar „Plánovaný výdej" u budoucích měsíců = 0. Počítáno jako *skutečnost + odhad zbytku měsíce z denního tempa*; u budoucího měsíce jsou obě složky nulové. Oprava použije průměrnou měsíční útratu.
- **FIX-224** (v9.48) Filtr „Příjmy" v Grafech vracel prázdnou tabulku — render měl natvrdo `_txKind(t) !== 'income'` navíc k filtru, který typ už řešil sám.
- **FIX-227** (v9.56) Sloupec „Roční" v Reportu ukazoval konstantní číslo — bral se celý rok místo kumulace do zvoleného měsíce.
- **FIX-228** (v9.58) Graf „Vývoj finančního skóre" v Reportu ukazoval jiné číslo než Dashboard (91 vs. 140) — `computeFinancialScore()` uměla počítat jen aktuální měsíc, graf tak sahal po jiné (0–100) škále.

### 🟡 Funkčnost, která vůbec nešla použít
- **FIX-234** (v9.61) „Stálo to za to?" — skupiny vzniklé z položek účtenek (Pečivo, Maso a uzeniny…) nešlo ohodnotit vůbec; zápis šel jen na transakce, žádná transakka s takovým jménem ale neexistuje.
- **FIX-238** (v9.65) Výdaj 20 000 Kč se nepropsal do „co se nepovedlo" — `if(!cur&&!prev||!prev)return;` vyřadilo každou kategorii bez výdaje v minulém měsíci, tedy i tu s největším nárůstem.
- **FIX-246** (v9.73) Bublinové grafy (Drill L1–L3, Gradient) přetékaly mimo plochu — jen režim Cluster hlídal bounding box, ostatní měly viewBox natvrdo. Nový sdílený helper `bViewBox()`.
- **FIX-249** (v9.76) Modal hodnocení aplikace se zobrazoval mimo obrazovku — použity třídy `modal`/`modal-content`, aplikace ale používá `overlay`/`modal`/`modal-head`.
- **FIX-251** (v9.77) Hodnocení šlo odeslat, ale nebyla žádná odezva — volána neexistující funkce `toast()`, správně `showToast()`. Stejná chyba byla i v Životní mapě.
- **FIX-240** (v9.66) Admin „Statistiky mapování" hlásily `txs.forEach is not a function` — transakce jsou od diff-write uložené jako objekt `{id: tx}`, ne pole.
- **FIX-229** (v9.58) Admin panel — karta „Růst uživatelů" visela pod všemi záložkami, chybělo `'rust'` v seznamu skrývaných.
- **FIX-244** (v9.71) Tabulka „Od výplaty k výplatě" bez součtů — `colspan=3` sléval tři sloupce do jednoho, žádný neměl souhrn.

### ⚪ Vizuál a čitelnost
- **FIX-231/232/233** (v9.60) Dashboardový řádek u 3 složek zdraví měl natvrdo škálu /25, která už neexistuje; graf skóre měl natvrdo osu 0–100 místo 0–310; barvy kruhů podle staré škály obarvily rizikové skóre zeleně.
- **FIX-242** (v9.68) V Souhrnu výdajů svítilo „+null%" u nových kategorií (vedlejší efekt FIX-238) — nahrazeno textem „nové".
- Audit nečitelného písma ve Finančním obrazu a Měsíčním reportu (v9.72) — 42+22 míst s `var(--text3)` a písmem pod `.66rem`, navazuje na `AUDIT_typografie_s16.md`.

### 🔧 Poučení, ne bug — vznik kontrolního skriptu
Čtyři z výše uvedených pádů (FIX-226, 230, 237, 241) jsou stejná třída chyby: proměnná použitá dřív, než je platná. `node --check` ji nezachytí, protože kód je syntakticky v pořádku. Vedlo k `tools/check_tdz.js` — nejdřív dvě regexové verze (obě samy propustily další chybu stejného typu), pak přepis na skutečný JS parser (`acorn`). Podrobnosti a instrukce ke spuštění: `CLAUDE_SKILLS.md` SKILL 23.

---

## Session 19 — nové FIX (v9.79–v9.98) **(2026-08-21)**

> 20 verzí, nový modul `pristi.js`. Detail v `patch-session19-FINAL.md`.

### 🔴 FIX-252 · `getHistAvg()` — chyba v celém predikčním enginu
Historický průměr sčítal přes **`t.amt`** místo `txCZK(t,D)` a nefiltroval rozdělené
ani vyrovnávací transakce. Důsledky: (1) výdaje v cizí měně se sčítaly v **nominálu**
(100 € = 100 Kč), predikce u takových kategorií vycházela mnohonásobně nízko;
(2) rozdělená transakce se počítala **dvakrát** (rodič i děti).
Filtr srovnán **přesně s `getActual()`** — obě funkce se v UI zobrazují vedle sebe jako
„odhad vs. skutečnost", rozdílný filtr znamenal, že sloupec odchylky porovnával jiná čísla.
Split se vyřazuje stejně: jen **rodič, který má děti** (FIX-119) — plošné `!t.splitParent`
by zahodilo i rodiče bez dětí, což je normální výdaj.
**Dopad:** 7 spotřebitelů `predictCat` — Predikce, Souhrn, Obraz, Radar, Deník, Report, Příští měsíc.
Audit v `AUDIT-FIX252-faze2.md`. Testy `tools/smoke_fix252.js`.

### 🔴 FIX-252/A · surové částky na 15 místech (6 modulů)
Nejzávažnější **`computeBaseIncome()`** (`projects.js`) — základ příjmu vstupuje do
**S1, DTI, DSTI, S3 i S4**, tedy do celého skóre. Kdo měl příjem v cizí měně, měl skóre
z nominálu. Dále `computeDebtPaid()` (splátka v cizí měně → špatná jistina i úrok),
`getActualRange()`, Detektor (7 míst), roční souhrny, bucket „Ostatní", kontext pro AI, Projekty.

### 🟡 FIX-253 · výplatní cyklus posouval výplatu o měsíc
Kotva cyklu se brala z `radarPaydayInfo()`. Když ten den nesedl na skutečnou výplatu
(vrátil 9., výplata chodí 5.), okno vyšlo 9. 9. – 8. 10. a výplata do něj nespadla →
posunula se na 5. 10. Cyklus, který má výplatou začínat, ji neobsahoval.
Kotva se nyní odvozuje z příjmů, které karta sama spočítala. **Nahlásil Milan.**

### 🔴 FIX-254 · Detektor úspor počítal transakce, které nejsou výdaj
Filtr byl jen `type==='expense'`. Do nálezů padaly rozdělené transakce (rodič i děti →
nákup **dvakrát**), vyrovnávací korekce a přesuny na spořicí účet. Chyba nešla jen do
zobrazení, ale přímo do vět typu „ušetříš X Kč/měs". Řešeno **jedním vyčištěným zdrojem**
(`detTxs`), ne sedmi záplatami. Navíc „výplata efekt" určoval výplatu porovnáním surových
částek — 1 200 EUR prohrálo s bonusem 3 000 Kč.

### 🟢 FIX-255 · převodník u přesunů
`_txEntryCur()` vrací u přesunu natvrdo `'CZK'` (záměrně — skrývá pole „Skutečně v Kč").
Převodník to bral doslova: přesun 100 € počítal jako 100 Kč a hlásil „≈ 3,95 €".
**Uložená data byla vždy správně** — `saveTx` bere měnu z peněženek přímo.

### 🟡 FIX-256 · modal záloh se neotevíral
Postaven na třídách `class="modal"` + `.modal-content` + `.modal-header`, které v `styles.css`
neexistují. Správně je `.overlay > .modal > .modal-head + .modal-body`. Obsah se vykreslil
jako bezprizorní rámeček dole na stránce Nastavení. **Nahlásil Milan.**

### 🔴 FIX-257 · Finanční obraz si protiřečil s vlastním grafem
Hláška „Zlepšuješ se, ale pořád v mínusu" končila větou „do plusu se takhle nedostaneš"
pokaždé, když rezerva po 6 měsících nebyla kladná. Podmínka větve je ale `avg>0` — rezerva
**roste**. Text tvrdil opak toho, co ukazoval graf vedle (u Milana růst z −108 956 na −18 075 Kč).
Nyní se dopočítá, za kolik měsíců rezerva překročí nulu. **Nahlásil Milan.**

### 🟡 FIX-258 · dva koše se stejným popiskem
Rozpad kurzových ztrát hlásil „Neuvedeno +22,1 % · Neuvedeno −0,0 %" a větu „rozdíl mezi
Neuvedeno a Neuvedeno". U smazaného typu platby se jako klíč použilo jeho ID, ale popisek
byl „Neuvedeno". Vše nezařaditelné padá do jednoho koše. **Ze screenshotu od Milana.**

### 🔴 FIX-259 + FIX-261 · `amtCZK` a `fxRef` se mohly rozejít
Dvě cesty, obě nahlásil Milan: (a) v editaci změním 20 € na 25 €, ale zapomenu přepsat
„Skutečně v Kč" → 25 € má pořád cenu 594 Kč, appka spočítá kurz 23,76 místo 29,70 a hlásí
**vymyšlenou výhodnou směnu**; (b) kliknu na „Přepočítat" po dvou týdnech → částka se spočte
dnešním kurzem, ale porovná se s referenčním kurzem z doby zápisu.
**Pravidlo:** oba údaje tvoří **pár** a musí popisovat týž stav. Beze změny zmrazené,
při změně částky nebo měny se přerazí **oboje**. Testy `tools/smoke_fxpair.js` (11).

### 🟢 FIX-260 · tagy se v Projektu nezobrazovaly
V běžném seznamu Transakcí ano, v detailu Projektu ne. **Nahlásil Milan.**

### 🟡 Vedlejší nález · zastaralý hash `announcements.js`
V `app.html` byl `3cfc9cd5…`, skutečný `5ebbdf74…`. Uživatelům s naplněnou cache se
servírovala **stará verze modulu oznámení**. Není známo, od které verze to trvalo.

### ✅ Uzavřeno ze starších OPEN
- **TODO-212** (přesuny v `getActual`) — vyřešeno chytrým filtrem, viz `decisions.md` ADR-100
- **TODO-137** (cookie lišta GDPR) — ověřeno jako **hotové od v8.44**, v poznámkách viselo omylem

---

## Session 19 — druhá vlna FIX (v9.99–v10.03) **(2026-08-24)**

> Nálezy z hloubkové analýzy karet. Většinu odhalilo čtení kódu, ne hlášení uživatele.

### 🟡 FIX-262 · matice Reportu se při vodorovném posunu rozjížděla
Dvě nezávislé příčiny. (1) Řádek se jménem sektoru byl `<td colspan>` s `position:sticky`
— zůstával přilepený vlevo, zatímco tabulka odjela, a text se ořízl:
`SPLÁTKY ÚVĚRŮ A HYPOTÉK` → viditelné jen `A HYPOTÉK`. (2) První sloupec měl v hlavičce
`min-width:158px`, v těle jen `nowrap` bez omezení → `KATEGORIE` překrývala sloupec
`Měsíční`. Nyní pevných 170 px v obou a název sektoru ve vnořeném `<span>`.
**Nahlásil Milan ze screenshotů.**

### 🟢 FIX-263 · tabulka „Inflace podle obchodu" se na mobilu rozpadala
Hlavičky se lámaly po jednom písmenu (`Ú T R AT A`), čísla na dva řádky (`3 6 76`).
Dlouhé názvy obchodů s `nowrap` roztáhly první sloupec přes celou šířku.
Opraveno `nowrap` na hlavičkách i číslech a `min-width:520px`.
⚠️ Výpustka u názvu obchodu byla nejdřív přidána a **zase zrušena** — Milan upřesnil,
že tabulku posouvá posuvníkem a ořezání by mu vzalo to, co si chce přečíst.

### 🔴 FIX-264 · nový uživatel neměl kategorie ani peněženku
`seedData()` se volalo **jen když v databázi chyběl celý uzel `users/{uid}/data`**.
Ten ale vznikne i jinak — částečným zápisem, migrací, importem, obnovou zálohy.
Od té chvíle `!snap.exists()` neplatí a seed se **už nikdy nespustí**.
V modalu Přidat transakci nebylo co vybrat, Predikce hlásila „Nejprve přidej kategorie".
Milan: *„pro nové uživatele je toto důvod k ukončení používání aplikace."*
Nová `ensureBaseData()` se ptá „má uživatel to, bez čeho aplikace nefunguje?" —
idempotentní, opraví i už postižené účty.

### 🔴 FIX-265 · aplikace uživateli mazala data
V rozděleném čtení (ADR-062):
```js
S[k] = snap.exists() ? snap.val() : (Array.isArray(S[k]) ? [] : S[k]);
```
Když klíč v databázi **neexistoval, lokální pole se přepsalo na prázdné**.
Proto kategorie zmizely i poté, co si je Milan ručně obnovil a znovu přihlásil.
Řešení: `_splitSeen` — dokud jsme klíč v tomto sezení neviděli, je chybějící uzel
nepřítomnost dat, ne jejich smazání. Jakmile jednou existoval a zmizel → skutečné smazání.

### 🔴 FIX-266 · Komunitní přehled měřil tebe a ostatní jinak
`publishCommunityStats()` odesílá součet přes `txCZK()` a bez přesunů a splitů,
ale zobrazovací strana sčítala `t.amount || t.amt` a přesuny i splity **započítávala**.
Věta „Tvoje výdaje 32 000 · průměr komunity 24 000" srovnávala **nafouknuté tvoje číslo
s čistým průměrem ostatních**. Opraveno i v rodinném souhrnu.

### 🔴 FIX-267 · Radar měl tutéž chybu na 11 místech
Nejzávažnější byl **hlavní graf „den po dni"** (výdaje i příjmy) — kdo má výdaje
v cizí měně, viděl graf z nominálu. Čtyři místa hledala „největší příjem = výplatu"
porovnáním **surových částek**: výplata 1 200 EUR prohrála s bonusem 3 000 Kč
a **cyklus se zakotvil na špatný den**. Dále týdenní rozpad, top variabilní kategorie,
víkendové tempo, detekce předplatných, start minulého cyklu.
Plus v Detektoru se práh „malá platba do 300 Kč" testoval proti nominálu — nákup
za 20 € (506 Kč) padal do Zbytečného utrácení.

### 🔴 FIX-268 · Inflace slučovala různé produkty
Klíč položky byl název **bez čísel a jednotek**, oříznutý na 25 znaků:
```
'mléko polotučné 1,5% 1l' → 'mléko %'
'mléko plnotučné 3,5% 1l' → 'mléko %'   ← STEJNÝ KLÍČ
```
Dvě různá zboží splynula a rozdíl jejich cen se tvářil jako inflace.
**Úvaha při opravě:** nerozpoznaná shoda je nesrovnatelně menší škoda než falešná —
rozdělená položka z indexu vypadne, sloučená si zdražení **vymyslí**.

### 🔴 FIX-269 · Inflace ignorovala slevy
Brala `it.price` (cena před slevou), zatímco zbytek aplikace používá `lineTotal`.
U zlevněné položky počítala jinou cenu než Analýza účtenek a akce se v indexu
neprojevila vůbec.

### 🔴 FIX-270 · detektory se navzájem nevylučovaly
Devětkrát se procházel tentýž seznam a nikde nebyla evidence, co už bylo započítané:
```
McDonald 900 Kč/měs → Jídlo venku 270 + Zbytečné utrácení 450 + Častý nákup 270
                    = 990 Kč, tedy 110 % z útraty, kterou vůbec máš
```
Nyní si každý nález transakci „zabere" (`_claimed`) a další ji nevidí.

### 🟡 FIX-271 · „nalezené úspory" vypadaly jako výpočet
`1 876 Kč/měs · Ročně 22 512 Kč` byl součet dvanácti odhadů s různou spolehlivostí.
Nyní rozsah a oddělení **doložitelného** (poplatky, refinancování, kurzy — počítá se
ze skutečných čísel) od **odhadu**.

### ⚠️ Bezpečnost · GitHub zablokoval push
`SECURITY.md` obsahovala realisticky vypadající **Resend API klíč** jako „špatný příklad".
Secret Scanning nerozlišuje ukázku od úniku. Klíč nahrazen zástupným tvarem
a do dokumentu doplněno varování.
**⚠️ Milan musí klíč revokovat, pokud byl skutečný — je v historii commitů.**

### 🟡 TODO-229 · slevy visely bez omezení (v10.04)
Sleva v Nákupním seznamu se držela, dokud ji nepřepsala novější cena — mohla viset
týdny. Katalog přitom `latestDate` **už nesl**, jen se nikde nekontrolovalo.
Nyní tři stavy podle stáří a opatrnější formulace („naposledy viděno", ne „je za"),
protože ceny se liší i regionálně a katalog zná obchod, ne kraj. **Nahlásil Milan.**
