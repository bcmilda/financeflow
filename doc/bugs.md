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

---

## Session 20 (2026-08-28) — v10.04 → v10.05

### 🟡 FIX-272 · `smoke_detektor.js` a `smoke_review.js` zastaraly vůči kódu
Objeveno při rutinním spuštění všech `tools/smoke_*.js` po TODO-231. Obě selhání
jsou **nezávislá na této session** — potvrzeno spuštěním na nedotčených souborech
z `/mnt/project`:
- `smoke_detektor.js` — hledá v `projects.js` doslovný vzor
  `const detTxs = ...\n  const subTxs = ...`, který v aktuálním kódu nesedí
  (`match()` vrací `null`, extrakce padá dřív, než se test vůbec spustí).
- `smoke_review.js` — extrahuje `revTimePatternReady`, které ve zdroji, z něhož
  test čte, není deklarované vůbec.

### ✅ FIX-272 · `smoke_detektor.js` a `smoke_review.js` opraveny (vyřešeno v S20)
Dvě nezávislé příčiny, obě opraveny stejný den, kdy byly objeveny:

**`smoke_detektor.js`** — skutečný test drift. Regex předpokládal, že `const subTxs`
je hned na dalším řádku po `const detTxs`. Od FIX-270 (S19, „detektory se navzájem
nevylučovaly") mezi ně přibyly komentáře a `_claimed`/`_free`/`_claim` — `match()`
vracel `null` a test spadl dřív, než se vůbec spustil. Opraveno: obě deklarace
se teď hledají nezávisle na pořadí a mezerách mezi nimi.

**`smoke_review.js`** — nebyl to drift, ale test **záměrně zrušené funkce**.
`revTimePatternReady` a sběr `t.enteredAt` byly zavedeny ve v9.92 a o verzi
později zrušeny (viz `decisions.md` ADR-104, SKILL 28) — Milan sám zapisuje
transakce i druhý den, takže čas zápisu by neodpovídal času nákupu a vzorec
„večer utrácím špatně" by byl vymyšlený. Test testoval kód, který podle
rozhodnutí neexistuje. Odstraněny 2 zastaralé kontroly (denní doba) +
1 kontrola textu „Denní doba zatím chybí" (ta hláška v HTML už taky není).
Zbylých 10 kontrol (souhrn v Deníku, vzorce den/platba/velikost) beze změny.

**Poučení:** ne každé selhání testu je test drift ve smyslu „kód se pohnul,
test ne" — někdy je to test, který přežil vlastní funkci. Než se regex opravuje,
stojí za to ověřit v `decisions.md`/`ADR`, jestli testovaná věc ještě má existovat.

---

### 🟡 Nález (nevyřešeno) · `bumpFounderCount()` není odolná proti opakovanému doručení webhooku
Milanův dotaz k opětovné aktivaci Premia vedl k prověrce `worker.js`. `writePremium()`
(PATCH/merge do `users/{uid}/premium`) je idempotentní — stejná data zapsaná dvakrát
nic nerozbijí. Ale `bumpFounderCount()` dělá read-current→+1→write **bez ochrany
proti duplicitě** (Stripe explicitně dokumentuje, že týž webhook event může dorazit
vícekrát). Pokud Stripe doručí `checkout.session.completed` pro zakládající cenu
dvakrát, počítadlo obsazených zakládajících míst se zvýší **dvakrát** za jednu
platbu. Komentář v kódu („webhook běží jen na serveru a platby chodí řídce")
počítal jen s tím, že webhook běží zřídka, ne s tím, že Stripe stejný event
umí poslat víckrát. Neřešeno, čeká na Milanovo rozhodnutí o prioritě.

**Milanova konkrétní situace** (trial vypršel, znovu aktivoval) není tímhle
ohrožená — `writePremium()` prostě přepíše stav novým předplatným, žádné
zdvojení. Pro kontrolu podezřelých stavů existuje **Audit plateb** v adminu
(porovnává `users/{uid}/premium` proti `premiumLog`).

**Neřešeno ani jinde:** nic aktuálně nebrání uživateli kliknout na Payment Link
podruhé, i když už Premium má — vznikly by dvě nezávislé Stripe subscriptions
a appka by tiše přepsala stav podle poslední dokončené, aniž by o druhé věděla.
Stripe by ale účtoval obě. Stojí za zvážení skrýt/zablokovat platební tlačítka,
když `premiumUntil` je už v budoucnosti.

### 🟢 Nález (informativní) · `window._communityTagSuggestions` je mrtvý kód
Prověřeno v rámci TODO-232 (komunitní tagy položek). `receipts.js` čte
`window._communityTagSuggestions` do datalistu při psaní tagu k položce účtenky —
ale **nikde v celém kódu se tahle proměnná nenastavuje**. V praxi appka dnes
napovídá jen vlastní tagy z aktuální účtenky + 12 pevných výchozích, **žádné
komunitní tagy od jiných uživatelů se zatím nikdy nezobrazí nikomu**.

To mění vyhodnocení TODO-232: obava „jeden uživatel může znehodnotit učení
ostatním" zatím **nemá kudy se projevit** — cesta, kterou by se to stalo, nikdy
nebyla dokončená. Admin panel „Item Tagy" (S9) už navíc ukazuje počty (viditelná
většina) a admin může schválit/odmítnout — přesně to, co TODO-232 chtělo na
straně kontroly. Chybí jen poslední krok: aby se do `_communityTagSuggestions`
skutečně něco nahrálo (jen schválené tagy pro danou položku). Bez toho je
funkce jen napůl zapojená. Milan se rozhodl odložit — zapsáno pro budoucí session.

---

### 🟡 FIX-273 · Rodinné souhrny počítaly partnerovu cizí měnu bez znalosti jeho peněženek
`renderFamilySummary()` volalo `incSum(txs)` / `expSum(txs)` **bez druhého argumentu `D`**
na dvou místech (souhrnné dlaždice i sloupec jednotlivého člena). `txCZK(t, D)` bez `D`
spadne na `S.wallets` — tedy peněženky **přihlášeného uživatele**, ne toho, jehož
transakce se zrovna počítá. U partnerovy transakce v cizí měně appka nenašla
odpovídající peněženku (je jen v partnerových datech), defaultovala na CZK a použila
**nominál místo přepočtu** — cizoměnové výdaje partnera vycházely typicky výrazně
podhodnocené. Objeveno při stavbě grafu trendu (TODO-230), kdy jsem si všiml, že
totéž volání o kousek výš v téže funkci `D` nedostává. Opraveno na obou místech,
regresní test v `tools/smoke_family.js` (simuluje EUR peněženku, která existuje
jen u partnera).

### 🟢 Nález (vyjasněno) · `cat.shared` NENÍ o rodinném sdílení výdajů
TODO-230 zadání předpokládalo, že `cat.shared` by měl vstupovat do výpočtu rodinného
souhrnu. Ověřeno v kódu (stats.js, správa kategorií) i v `categories.json`: pole je
pole ID **jiných kategorií téhož uživatele**, se kterými si kategorie tematicky
překrývá pro **COICOP/ČSÚ statistiku** — např. `Pojištění → [Bydlení, Auto]`,
`Alkohol → [Jídlo & Pití]`. Nemá nic společného s tím, jestli je výdaj společný
pro domácnost nebo osobní. Zapojit ho do rodinného souhrnu by vyrobilo nesmysl
(kategorie "Pojištění" by se tvářila jako "sdílená s partnerem", i kdyby ji
platil jen jeden člen ze svého osobního účtu).

**Skutečný koncept "tohle je společný/domácí výdaj vs. moje osobní" v appce
zatím vůbec neexistuje** — žádné pole na kategorii ani transakci to nenese.
Aby TODO-230 dávalo smysl v duchu původního zadání, potřeboval by se navrhnout
**nový** příznak (např. na kategorii, nebo per-transakci) — to je věcné
rozhodnutí, ne programátorská oprava. Čeká na Milana.

### ✅ FIX-274 · Vypnutí sdílení mazalo data z cloudu (opraveno v10.11)
`users/{uid}/data` sloužil současně jako **primární úložiště uživatele** i jako
**jediné místo, odkud čtou partneři**. `shareSettings` se vynucoval **při zápisu**:
`_dwMetaVals()` vrátil pro vypnutou sekci `[]`, `_dwTxObj()` vrátil `{}` —
a diff-write pak zapsal `transactions/{id} = null` pro **každou** transakci.

Řetěz: `updateShareSetting()` → `save()` → `saveToFirebase()` → `_dwTxObj()` → `{}`
→ `updates['transactions/'+id]=null` → `_update(dataRef, updates)`.

**Týkalo se každého uživatele, ne jen těch s partnerem** — přepínače se
v `renderSdileni()` vykreslují nezávisle na seznamu partnerů. Stačilo si otevřít
Sdílení a kliknout.

**Oprava (Krok 0):** oddělené úložiště od výdejního okénka.
- `users/{uid}/data` → `_dwMetaVals`/`_dwTxObj`, **nikdy nefiltrované**, čte jen vlastník
- `users/{uid}/shared` → `_shMetaVals`/`_shTxObj`, výřez podle `shareSettings`, čtou partneři
- `_shWrite()` má vlastní diff sadu signatur (`_sh`), volá se jen když uživatel
  někoho ve sdílení má, a je obalený vlastním `try/catch` (side-write nesmí
  shodit hlavní uložení)
- `resetAppState()` nuluje `_dw` i `_sh` — jinak by si nový uživatel nesl
  signatury předchozího a jeho výřez by se zapsal neúplně

**Nasazení dvoufázové**, viz `PLAN-oprava-sdileni.md`. Fáze 1 (v10.11) povoluje
partnerům obojí, aby nikomu nezmizel partner z appky; `loadPartners`/`addPartner`
mají dočasný fallback `shared → data`. Fáze 2 odebere partnerský přístup k `data`
a fallback se odstraní.

Regresní test `tools/smoke_sdileni.js` (7 kontrol) — ověřeno, že se starým
kódem skutečně selže.

**Vedlejší oprava:** `addPartner()` nesanitizoval partnerova data (ani při
načtení, ani v listeneru) — doplněno `sanitizeUserData()`. `loadPartners()`
sanitizoval jen v listeneru, ne při prvním načtení; doplněno také.

---

### ✅ FIX-275 · Detekce duplicit při importu neuměla cizí měnu (opraveno v10.13)
`buildExistingIndex()` stavěl porovnávací částku jako `t.amount || t.amt || 0`,
tedy **bez `txCZK`**. Bankovní výpis přitom nese částku v **měně účtu** (CZK).
Transakce 100 EUR (`amtCZK` 2500) se tak porovnávala jako „100" proti 2500 Kč
z výpisu → rozdíl 2400 → **0 bodů za částku** → duplikát propadl a transakce
se naimportovala podruhé.

Přesně vzorec, který `CLAUDE.md` vede jako opakovanou chybu (SKILL 20).
`buildExistingIndex(existing, D)` nově bere data jako druhý parametr.
Test `tools/smoke_import_dup.js` (5 kontrol), ověřeno regresí.

### ✅ FIX-276 · Cíl s prošlým termínem hlásil záporné dny (opraveno v10.14)
`goalGetStatus()` spouštěl varování při `daysLeft < 30` — bez spodní hranice.
Záporné číslo je taky menší než 30, takže cíl po termínu hlásil
**„Deadline za −88 dní!"**.

Druhé místo (`goalBuildCard`) bylo horší: `daysLeft>0 ? '(za X dní)' : '(dnes!)'`
— u termínu, který uplynul před třemi měsíci, appka tvrdila **„(dnes!)"**.

Nově: „Termín uplynul před 88 dny" · „Termín je dnes" · „Zbývá 8 dní",
se správným skloňováním (`_goalDnu`). Obě data se normalizují na půlnoc —
`new Date()` nese aktuální čas, ale `new Date('2026-06-01')` je půlnoc,
takže u termínu „dnes" vycházelo 0 nebo −1 podle denní doby.

Formulace zůstává **věcná**: appka konstatuje, nehodnotí („Termín uplynul",
ne „Nestihl jsi to").

### ✅ FIX-277 · Import nikdy nenavrhl podkategorii (opraveno v10.14)
`guessCategoryFromKeyword()` procházel podkategorie takto:
```js
for(const sub of (c.subcats || c.subcategories || [])) {
```
Pole se ale v celé appce jmenuje **`subs`** — ověřeno v `categories.json`
i v `stats.js`, `ui.js`, `admin.js`, `helpers.js`, `charts.js`. Tenhle řádek byl
**jediný výskyt `subcats` v celém kódu**, takže výraz vždy spadl na `[]`
a smyčka proběhla nulakrát.

Nic nespadlo, nic se nenahlásilo — funkce se jen tiše nekonala a import
navrhoval pouze hlavní kategorii. Typická tichá chyba: projeví se **absencí**
chování, ne selháním.

Test `tools/smoke_cil_subkat.js` pokrývá FIX-276 i FIX-277 (12 kontrol,
zmrazený „dnešek", aby test nezestárl).

---

### ✅ FIX-278 · Sdílení do komunity nešlo vypnout — souhlas se kontroloval na neexistujícím prvku (opraveno v10.15)
`publishCommunityStats()` začínal takto:
```js
const optOut = document.getElementById('settingCommunity');
if (optOut && !optOut.checked) return;
```
Element `settingCommunity` se ale **v celém projektu nevyskytoval nikde jinde** —
ověřeno napříč všemi `.js` soubory i `app.html`. Nebyl v Nastavení, nebyl v HTML,
nikdy nevznikl. `getElementById` proto vždy vracelo `null`, podmínka `optOut && …`
byla vždy nepravdivá a funkce se **nikdy nezastavila**.

Důsledek: měsíční příjem, celkové výdaje, míra úspor a rozpad výdajů po COICOP
se odesílaly do `community/{měsíc}/users/{uid}` **při každém uložení, všem
uživatelům, bez souhlasu a bez možnosti to vypnout**. Kód se přitom tvářil,
že souhlas kontroluje — ovládací prvek k němu jen nikdy nevznikl.

Záznamy navíc nejsou anonymní: klíčem je `uid` a pravidlo
`community/$monthKey/users` má `.read: auth != null`, tedy každý přihlášený
uživatel je mohl číst.

**Oprava (celková):**
1. Souhlas se čte z **uloženého nastavení** `_settings.community`, ne z DOM —
   ten na jiné stránce stejně neexistuje. Chybějící hodnota = **nesouhlas**
   (SKILL 31: absence dat není souhlas).
2. Skutečný přepínač v **Nastavení → Data & Soukromí** s výpisem, co přesně
   se odesílá a co ne. Ukládá se **okamžitě**, ne přes save bar — souhlas
   se sdílením dat nesmí viset v neuloženém stavu.
3. Vypnutí **smaže už odeslané údaje** (`purgeMyCommunityData`, 36 měsíců zpětně).
   Nechat tam staré záznamy by znamenalo, že vypnutí nic neřeší.
4. Komunitní přehled má nový prázdný stav — vysvětlí, proč je prázdný,
   a nabídne zapnutí přímo z karty (FIX-214).

**Výchozí stav je VYPNUTO.** U finančních údajů klíčovaných `uid` je jediný
obhájitelný výchozí stav „dokud neřeknu ano, neodesílej".

Test `tools/smoke_komunita.js` (7 kontrol) — včetně ověření, že se neodesílá
nic nad dohodnutá čtyři pole a že purge maže **jen vlastní** záznamy.
Ověřeno regresí.

**Zbývá zvážit (není součástí opravy):** záznamy jsou klíčované `uid`, takže
nejsou anonymní vůči ostatním přihlášeným uživatelům. Anonymní klíč (náhodný
identifikátor místo uid) by to řešil, ale znamená změnu struktury i pravidel —
zatím neproveden, k rozhodnutí.

---

# ══════════════════════════════════════════════════════════════════
# SESSION 21 (2026-09-02 až 2026-09-04) · v10.28 – v10.50
# ══════════════════════════════════════════════════════════════════

## FIX-293 · Automatické zálohy vůbec nešly otevřít **(Session 21)**

**Příznak:** okno „Automatické zálohy" se ukázalo prázdné, konzole hlásila
`too much recursion` (Firefox) / `Maximum call stack size exceeded` (Chrome).

**Příčina:** tři exporty v `settings.js` byly zapsané jako
`window.renderBackupBody = () => renderBackupBody();`. Funkce deklarovaná
v klasickém skriptu UŽ vlastností `window` je, takže ten řádek ji přepsal
šipkou, jejíž tělo volá zpátky `window` — tedy samo sebe.

**Dopad:** mrtvá byla CELÁ funkce záloh — seznam, ruční záloha i obnova.

**Oprava:** exporty přiřazují referenci na funkci, ne obalovací šipku.
Prověřeno, že stejný vzor nikde jinde není. Test `tools/smoke_zalohy.js`.

---

## FIX-294 až FIX-302 · Simulace života počítala nesmysly **(Session 21)**

Aritmetika seděla, model ne. Šest nezávislých vad:

| ID | Vada |
|---|---|
| FIX-294 | Scénář B investoval % PŘÍJMU bez ohledu na to, jestli na to uživatel má. Při nulovém přebytku „investoval" 1 500 Kč měsíčně odnikud a postavil na tom 1,8 milionu. |
| FIX-295 | Scénáře A a B splácely dluh po celou dobu simulace — na dluh 5 000 Kč odešlo 3 000 × 360 měsíců = 1 080 000 Kč. |
| FIX-296 | Dluh neměl úrok, takže „splatit dřív" neušetřilo nic. C vyhrával jen tím, že jako jediný splácení ukončil. |
| FIX-297 | A se znehodnocovalo inflací, B a C ne → věta „o X Kč více" odčítala dnešní peníze od budoucích. |
| FIX-298 | Čisté jmění neodečítalo nesplacený dluh. |
| FIX-299 | „Splacení za 0.1r" místo „za 2 měsíce". |
| FIX-300 | Titulek nejlepšího scénáře se rozhodoval jen mezi B a C, číslo pod ním bylo maximum ze všech tří. |
| FIX-301 | Graf měl VLASTNÍ kopii modelu — po opravě karet by ukazoval jiná čísla než dlaždice nad ním. |
| FIX-302 | Karta B hlásila „Investuji 15 %", i když reálně investovala jinou částku. |

**Oprava:** jediné výpočetní jádro `simCompute()` pro karty i graf. Simulace
běží nominálně a na konci se přepočte jedním deflátorem → všechna čísla
v dnešních penězích. Model je symetrický: B i C odkládají stejnou korunu,
liší se jen tím, kam ji pošlou.

**Ověření správnosti (ne jen tvaru kódu):** když se úrok dluhu rovná výnosu
investic, musí oba scénáře vyjít nastejno. Nad tím vyhrává splácení, pod tím
investování. Test `tools/smoke_simulace.js` (41 kontrol).

**Poznámka k nálezu při opravě:** první symetrická verze pořád nechávala C
prohrávat i u 18% dluhu — uvolněná splátka po umoření narazila na strop
„% příjmu" a spadla do hotovosti s nulovým výnosem. Odměna za rychlé
splacení se tím vynulovala. Řešeno tím, že se po splacení investuje
i uvolněná splátka.

---

## FIX-303 · Penzijní spoření se počítalo jako likvidní rezerva **(Session 21)**

**Příčina:** v `assetCatLiq()` se vzor `spoř` testoval DŘÍV než `penzij`.
„Penzijní spoření" obsahuje obojí, takže vyhrál obecnější vzor.

**Dopad:** peníze vázané do 60 let nafukovaly Emergency Fund („kolik měsíců
přežiju bez příjmu") o částku, ke které se uživatel bez sankce nedostane.

**Oprava:** dlouhodobé vzory jdou první (jsou specifičtější). Odhad podle názvu
vytažen do sdíleného `assetLiqFromName()` a **zviditelněn** — nápověda ve
správě kategorií ukáže, co odhad vybral, aby to šlo opravit dřív, než to
zkreslí čísla.

**Poznámka:** ruční nastavení Likvidity (ADR-076b) fungovalo správně vždycky.
Vada byla ve výchozí automatické cestě, kterou používá většina uživatelů.

⚠️ **Test `smoke_virtualni.js` tuhle vadu POTVRZOVAL jako správné chování**
(`assert(assetTier(penzijko)==='reserve')` s komentářem „pre-existing").
Viz SKILL 34.

---

## FIX-304 · Den výplaty šel zadat jen do 28. **(Session 21)**

Kdo bere výplatu 30., si ji nemohl nastavit vůbec. Strop byl zbytečný —
`mkPayMonthly` kotvu už ořezával na skutečnou délku měsíce. Navíc byl
natvrdo zadaný strop 28 ve dvou dalších režimech (týdenní/14denní a 2× měsíčně),
který posouval cyklus i lidem s výplatou 29.–31.

**Oprava:** nabídka 1–31, u dnů nad 28 vysvětlivka „(v kratším měsíci poslední)".

---

## FIX-305 · Nic nebránilo druhé platbě **(Session 21)**

Kdo už Premium měl, mohl znovu kliknout na platební odkaz a založit DRUHÉ
nezávislé Stripe předplatné. Appka by o něm nevěděla (webhook jen přepíše stav
podle poslední dokončené platby), ale Stripe by účtoval obě.

**Oprava:** kontrola na dvou místech — `goPremium()` neotevře výběr tarifu
a `startPremiumSubscription()` je poslední záchranou. Obojí SYNCHRONNĚ před
`window.open` (SKILL 15).

---

## FIX-306 · Stripe webhook nebyl odolný proti opakovanému doručení **(Session 21)**

Stripe doručuje at-least-once a výslovně dokumentuje, že týž event může přijít
vícekrát. `writePremium()` to snese (PATCH stejných dat), ale
`bumpFounderCount()` dělal read → +1 → write bez ochrany: **jedna platba mohla
obsadit dvě zakládající místa ze sta.**

**Oprava:**
- Každý event se nejdřív ZAMLUVÍ v uzlu `stripeEvents` přes `if-match: null_etag`
  (atomické, projde jen poprvé). Druhé doručení se přeskočí s 200.
- Počítadlo používá compare-and-set přes Firebase ETag (max 5 pokusů při kolizi).
- Při selhání se zámek uvolní, aby Stripe mohl doručení zopakovat — jinak by
  platba zůstala nedokončená navždy.

---

## FIX-307 · Komunitní záznamy byly klíčované uid **(Session 21)**

Od v10.24 je četl jen vlastník a admin, ale klíč sám je přímý identifikátor —
a uid appka vybízí sdílet (partnerský odkaz `?partnerOf={uid}`).

**Oprava:** publikuje se pod náhodným pseudonymem z `users/{uid}/communityId`.
Ošetřeny OBĚ zapisující cesty (`publishCommunityStats` i `uploadCoicopToFirebase`).
Starý uid-klíčovaný záznam se při migraci maže, purge maže obojí. Bez pseudonymu
se nepublikuje vůbec — nikdy se nespadne zpátky na uid.

---

## FIX-308 · Párování partnerů nefungovalo ANI JEDNOU cestou **(Session 21)**

**Ruční přidání:** `addPartner()` četla partnerova data JAKO PRVNÍ — jenže
pravidla dovolí číst `users/{X}/shared` jen tomu, koho X už má v `partners`.
První člověk z dvojice tedy chtěl číst dřív, než mu kdokoli přístup dal,
a spadl ještě před zápisem. **Nemohlo to projít nikdy.**

**Párovací odkaz:** zapisoval jedním `update` i do `users/{cizí}/partners`,
kam podle pravidel psát nesmí — a protože `update` je všechno-nebo-nic, spadla
s cizí cestou i ta vlastní. Odkaz neudělal nic, ale bonus se přesto pokoušel připsat.

**Oprava:** obrácené pořadí (nejdřív udělím přístup já, pak čtu), zápis jen
vlastní strany, a hláška, která říká pravdu místo „Uživatel nenalezen"
(uživatel existoval, jen nedal přístup).

---

## FIX-309 · Skóre ukazovalo 50/310, i když se dalo získat jen 210 **(Session 21)**

Od TODO-227 se neměřitelné složky z hodnocení vyřazují a maximum se krátí —
jenže půlkruh měl jmenovatele natvrdo z plné škály. Odpověď „ano, mám půjčku"
(bez zadané půjčky) tak vypadala jako propad skóre o 100 bodů, přestože se jen
zúžila škála. Známky se přitom už dřív počítaly správně, takže si gauge
a známka navzájem odporovaly.

**Oprava:** měří se proti dosažitelnému maximu. Nezměřená složka se ukáže jako
„—" s vysvětlením, ne jako červená nula 0/100. Ze Zadluženosti vede proklik
„Zadat půjčku →" — po odpovědi „ano" v onboardingu nebylo kudy dál.

---

## FIX-310 · showPagePremium nikdy nečetla PREMIUM_PAGES **(Session 21)**

Funkce se tak jmenuje, ale seznam nečetla — volala rovnou `hasPremiumAccess()`
a zamykala všechno, co přes ni prošlo. Vyndat stránku ze seznamu (v10.34) proto
nemělo žádný účinek: diamant ze sidebaru zmizel, ale paywall vyskočil dál
a stránka byla nepoužitelná.

⚠️ **Test v10.34 kontroloval TVAR kódu, ne chování** — ověřoval, že jméno
stránky zmizelo ze seznamu, ne že se na ni dá po kliknutí dostat. Viz SKILL 35.

---

## FIX-311 · Uzel `shared` nikdy nevznikl **(Session 21)**

`_hasPartners()` se ptalo na `partnerData` — což je seznam lidí, JEJICHŽ data
umím přečíst. Jenže výdejní okénko se má psát tehdy, když někdo může číst MĚ,
a to je jiný seznam: `users/{já}/partners`.

**Dopad:** kdo přístup udělil, ale sám ještě nic číst nesměl, měl `partnerData`
prázdné, `_shWrite` se nespustil a druhá strana neměla co číst. Sdílení se
nerozjelo ani po správném přidání.

---

## FIX-312 · Jedno přidání propojilo jen jednu stranu **(Session 21)**

Uzel `users/{X}/partners` znamená „kdo smí číst X", takže „přidat partnera"
nastavilo vždy jen jednu stranu a dokud to neudělali OBA, nevidel nikdo nic.
Zapsat druhému do jeho podstromu přitom nejde, pravidla to (správně) zakazují.

**Oprava:** jednorázový token v `users/{já}/invites`. Pozvaný smí zapsat sám
sebe i do mého seznamu, když token předloží — pravidlo si ho ověří serverově.
Jedno kliknutí, obě strany propojené. Smazáním tokenu odkaz přestane platit.

---

## FIX-313 · Moje UID zmizelo z dohledu **(Session 21)**

Ve v10.36 schované pod rozbalovátkem — a protože uživatelský panel neexistoval,
nebylo ho kde jinde vzít. Ruční propojení tím přestalo být použitelné.

Při opravě zjištěno, že `navigator.clipboard` neexistuje na http ani ve starších
prohlížečích, takže tlačítko Kopírovat mohlo tiše nedělat nic. Nový `copyText()`
má zálohu přes `execCommand` a při úplném selhání prompt.

---

## FIX-314 · Výběr avatara nedělal nic **(Session 21)**

V `updateSidebarUser()` se fotka z Google účtu testovala PRVNÍ — a tu má po
přihlášení přes Google skoro každý, takže emoji avatar nemohl nikdy vyhrát.
Uživatel si ho vybral, uložil se do profilu, ale v sidebaru se nezměnilo nic.

**Pravidlo:** vědomá volba přebíjí výchozí hodnotu, ne naopak. Stejná záměna
byla i v seznamu partnerů (u sebe i u partnera).

---

## FIX-315 · Jeden neplatný klíč shodil CELÝ zápis **(Session 21)**

Podkategorie „Školka/škola" se dostala do `coicopOverrides` — a Firebase v klíči
nesnese `. # $ / [ ]` a při jediném takovém odmítne **celý `set`**, ne jen tu
hodnotu. Výřez `shared` se proto na jednom účtu nezapsal vůbec.

**Historie:** táž chyba byla v S9 a opravila se u zdroje (merge v `renderCatPage`
mutoval `S.categories`). Vrátila se jinou cestou.

**Oprava:** sanitace NA HRANICI ZÁPISU (`_fbSafeKeys`) — ať klíč zavleče
kterýkoli kód, k Firebase se nedostane. Zakázané znaky se nahradí pomlčkou,
takže se nic neztratí. Chrání OBĚ cesty, i úložiště `data`, kde by pád znamenal
ztrátu dat.

---

## FIX-316 · „Permission denied" se hlásilo jako chyba **(Session 21)**

Není to chyba appky, ale normální stav: druhá strana mě zatím nepřidala.
Vypisovalo se to jako Error a při ladění to mátlo. Nově informace; skutečné
chyby zůstávají varováním. Rodinný souhrn rozlišuje TŘI příčiny prázdna.

---

## FIX-317 · Partnerovi odcházel deník **(Session 21)**

Výřez `shared` vznikal KOPIÍ celého úložiště, ze které se vypnuté sekce vymazaly
— takže do něj propadlo všechno, na co nikdo nemyslel. **Bez přepínače a bez
zmínky v „Co partner uvidí" se sdílelo 13 uzlů:** `diary` (osobní deník),
`calNotes`, `workCal` (poznámky v kalendáři), `milestones` (Životní mapa),
`idleCfg`, `pristiCfg`, `reportSectors`, `importHistory`, `nakupList`,
`sablony`, `noSyncKeys`, `payTypes`, `shareSettings`.

**Oprava:** výřez je POVOLOVACÍ SEZNAM — co do něj někdo vědomě nedopsal, se
neposílá. Z 22 klíčů zbylo 10. Kategorie se posílají jen jako kostra bez
rozpočtů a ručního COICOP zatřídění.

⚠️ **Dva testy potvrzovaly vadu jako správné chování** („sekce bez přepínače se
sdílejí vždy", „shareSettings se propíše partnerovi"). Viz SKILL 34.

---

## FIX-318 · Fáze 2 — partneři už nečtou /data **(Session 21)**

Do v10.39 existoval záložní pád na nefiltrované `users/{uid}/data`, když výřez
neexistoval. **V tom stavu `shareSettings` nefiltrovaly NIC** — partner viděl
i vypnuté sekce a uzly bez přepínače (viz FIX-317).

Berlička odstraněna z kódu i z pravidel. Adminovo právo číst cizí data zůstává
(stojí na jeho UID, ne na partnerství).

---

## FIX-319 · Skupinová domácnost místo párování každého s každým **(Session 21)**

Pozvánka z FIX-312 propojí dva lidi, ale třetí potřeboval pozvánku zvlášť od
každého: čtyři lidi = 6 párování, a kdo na jedno zapomněl, viděl jinou „rodinu".

**Řešení:** členství drží DVA uzly a čtení vyžaduje OBA —
`households/{hid}/members/{uid}` („skupina mě zná") a `users/{uid}/householdId`
(„já ji uznávám"). Každý si píše ten svůj, takže nikoho nelze do skupiny
vtáhnout ani se do ní vecpat zvenku.

**Sloučit dvě domácnosti jedním kliknutím NEJDE** a je to odmítnuté nahlas —
propojilo by to všechny se všemi, aniž by o tom ostatní věděli.

---

## FIX-320 · Přepínání profilů zrušeno **(Session 21)**

„Přepnout pohled" nahradilo VŠECHNA data v appce partnerovými — celý program se
překreslil jeho čísly a dalo se procházet cizí finance stránku po stránce.
I když jen pro čtení, sdílení má dát domácnosti společný obraz, ne umožnit
prohlídku cizího účtu.

Adminský náhled zůstává, ověřuje se přes `isAdmin()`. `viewingUid` zůstává
v kódu jako konstantní null pro běžné uživatele — visí na něm desítky ochranných
podmínek a vytrhávat je po jedné by bylo riskantnější.

---

## FIX-321 · Adminský náhled se neměl jak vrátit **(Session 21)**

Ve v10.42 se dlaždice v seznamu členů staly neklikacími pro všechny — a tím
adminský náhled ztratil cestu zpět k vlastním datům i přepínání mezi uživateli.
Nově klikací pro admina, běžnému uživateli zůstávají jako přehled členů.

---

## FIX-322 · Připnuté měny nebyly per uživatel **(Session 21)**

Klíč `ff_pinnedFx` byl v localStorage BEZ uid. localStorage patří doméně, ne
účtu — na jednom prohlížeči sdíleli seznam všichni, kdo se kdy přihlásili.

**Upřesnění rozsahu:** samotné KURZY se nemění nikomu, berou se živě z ČNB přes
Worker a do databáze se nikdy nezapisují. Sdílel se jen seznam připnutých měn,
a to mezi účty na témže prohlížeči.

---

## FIX-323 · Další dva klíče bez uid **(Session 21)**

`ff_notif_prefs` (mezipaměť nastavení oznámení — hlavní kopie ve Firebase byla
v pořádku, ale mezipaměť se čte DŘÍV než Firebase odpoví, takže druhý účet po
přihlášení chvíli běžel na cizím nastavení) a `ff_announce_seen` (odkliknutí
u jednoho účtu schovalo oznámení VŠEM účtům na daném prohlížeči).

---

## FIX-324 · Vymazání dat nechávalo za sebou kopii **(Session 21)**

Mazal se jen `users/{uid}/data` a `referral` — ale `users/{uid}/shared`, což je
kopie dat pro partnery, zůstalo netknuté. **Členové domácnosti dál viděli
transakce, které už uživatel u sebe nemá: data „zmizela" jen jemu.** Totéž
platilo pro komunitní záznamy a pro zálohy, ze kterých šlo smazaná data dokonce
obnovit zpátky.

**Oprava:** maže se i výřez, komunitní záznamy a zálohy. Tarif (`premium`) se
schválně NEMAŽE — „vymazat data" znamená začínám od nuly, ne ruším účet.

---

## FIX-325 · Pole „Čistá výplata" plavalo výš než sousední **(Session 21)**

Popisek vedle něj se na mobilu zalomí do dvou řádků, tenhle do jednoho —
a protože se sloupce zarovnávaly nahoru, input vpravo visel výš.

**Oprava:** `align-items:end` na mřížce, ne pevná výška popisku (ta by se
rozbila při jiné velikosti písma nebo v jiném jazyce).

---

## FIX-326 · Hodinová sazba se dala zjistit až po uložení **(Session 21)**

Ukazuje se rovnou pod polem a přepočítává se při psaní. Konfigurace se bere
ŽIVĚ z polí, ne z uložené — jinak by náhled ukazoval sazbu podle starých hodnot.

**Počítá se z FONDU konkrétního měsíce, ne z paušálních 160 h.** Při 12h směnách
a 30min přestávce: únor 2026 = 230 h, prosinec = 264,5 h. Rozdíl **15 %**,
takže paušál by nesedel ani jednomu měsíci.

---

## Poznatky z výplatnic (Session 21, TODO-257 až 259)

Nejsou to chyby v kódu, ale zjištění z reálných dat, která změnila návrh:

**Dvě různé hodinové sazby na jedné pásce.** Přesčasová mzda se počítá
z tarifní sazby (`tarif ÷ fond`), ale všechny příplatky z průměrného výdělku
(PPÚ). U Milanovy pásky 158,42 vs. 219,91 Kč/h — rozdíl 39 %.

**Pojistné se zaokrouhluje NAHORU**, ne matematicky. Základ daně nahoru na celé
stovky. Bez toho vycházel čistý příjem o 2 Kč vyšší.

**Průchozí položky se ruší.** PENZ (+800) a DPS (−800) jsou příspěvek
zaměstnavatele na penzijko. Nesmí se počítat do příjmů ani do srážek — jinak
se objeví dvakrát a vyruší se až v součtu, což vypadá jako chyba v zadání.

**Chybějící řádek neznamená nulu.** Za rok a půl přibyly čtyři položky, které
v šabloně nebyly: příplatek za svátek, náborový, vánoční a roční prémie.
Kdyby byly zavedené jako stálé, detektor by v každém běžném měsíci hlásil
čtyři propady příjmu. Viz ADR-129.

**Jednorázové odměny zkreslují průměr.** První verze detektoru hlásila u obou
změn tarifu „přesun se 100% pokrytím" — do průměru prémií spadl vánoční
příspěvek 8 409 Kč a náborový 4 000 Kč. Po oddělení pravidelných prémií od
jednorázových vyšly obě změny jako **skutečné zvýšení**.

To je nejdůležitější poznatek celé funkce: **detektor málem potvrdil hypotézu,
se kterou uživatel přišel, a byl by se mýlil.** Viz SKILL 42.

---

---

# Session 22 (2026-09-12 až 2026-09-16) · v10.59 → v10.82

> Nové opravy ze Session 22 (v10.59 → v10.82). Navazuje na FIX-326.

### FIX-327 · Prázdný účet dostal hodnocení „Výborné" **(Session 22)**
- **Příčina:** Nezměřitelná složka dostávala 0 bodů. Prázdný poměr výdaje/příjmy je 0 a bodovací tabulka `0 → 100 bodů` to četla jako „neutrácí nic". Účet, kde uživatel jen potvrdil „nemám dluh" (25 % skóre), nesl celé hodnocení.
- **Oprava:** Nezměřitelná složka vypadne z čitatele i jmenovatele, váha se rozpustí mezi zbylé. Pod prahem pokrytí 50 % se známka neukáže vůbec.
- **Soubor:** `premium.js`, `helpers.js` · v10.60
- **🔗 Cross-reference:** `todo.md` TODO-228, `decisions.md` ADR-133/134

### FIX-328 · Přetékající ukazatel skóre **(Session 22)**
- **Příčina:** Gauge dostával jako maximum `availMax`. Ve v1 byl `rawTotal` součtem bodů jen za dostupné složky, ve v2 je to znormalizovaný vážený průměr ×3,1 — tedy vždy na plné škále 310. Při 55% pokrytí hlásil „285 / 171" a k tomu „Jsi v nejvyšším pásmu".
- **Oprava:** Gauge i `_scoreNextGrade()` dostávají `rawMax`.
- **Soubor:** `premium.js` · v10.60

### FIX-329 · Graf vývoje skóre kreslil propad na dno **(Session 22)**
- **Příčina:** Měsíc pod prahem pokrytí má `rawTotal` 0 — to není nula jako výsledek, je to díra v datech. Měsíc bez zápisů vypadal jako pád z 287 na nulu.
- **Oprava:** `months[].mereno`; čára se přeruší, místo kruhu je přerušovaný kroužek s pomlčkou.
- **Soubor:** `projects.js`, `advisor.js` · v10.60

### FIX-330 · AI prompt posílal rozpad skóre podle staré 4složkové verze **(Session 22)**
- **Příčina:** Pevné položky „Trend: X/25", ačkoliv skóre od S16 počítá pět složek s různými maximy.
- **Oprava:** Rozpad se generuje dynamicky ze `score.components`.
- **Soubor:** `ai.js` · v10.60

### FIX-331 · Poznámky k transakci se přepisovaly **(Session 22)**
- **Příčina:** `revNote()` ukládal jedinou poznámku do `t.priorityNote`; druhý zápis přepsal první.
- **Oprava:** `t.notes = [{id, ts, text}]` + vlastní stránka. Stará `priorityNote` se převezme jako první zápis, nemaže se.
- **Soubor:** nový `poznamky.js`, `review.js` · v10.62

### FIX-332 · Osobní poznámky by odešly partnerovi **(Session 22)**
- **Příčina:** `_shTxObj()` vracel v režimu `full` celé objekty transakcí. Vyšlo při tom najevo, že `priorityNote` se partnerovi sdílela **už dřív, nedopatřením**.
- **Oprava:** Zákazový seznam `_TX_OSOBNI` (`notes`, `priorityNote`). Zákazový, ne povolovací — transakce má desítky polí a povolovací seznam by při každém novém tiše ubral partnerovi data.
- **Soubor:** `app.js` · v10.62
- **🔗 Cross-reference:** FIX-317 (S21) — stejná třída chyby u `diary`

### FIX-333 · „Kam růst přistál" tvrdilo nepravdu od Session 10 **(Session 22)**
- **Příčina:** `Math.min(dExp, součet VŠECH šablon)` — to není měření, to je strop. Součet šablon je u běžné domácnosti 15–20 tis. Kč, takže minimum vyšlo skoro vždy rovno růstu výdajů: karta hlásila, že celý nárůst přistál v trvalých závazcích, i když se žádná pravidelná platba nezměnila. Druhá vada téhož součtu: **ignoroval frekvenci**, takže roční pojistka za 12 000 Kč se počítala jako 12 000 Kč měsíčně.
- **Oprava:** `sablonyFixedTotal()` přepočítává všech pět frekvencí na měsíc. Historie do `S.fixedLog` (záznam při změně). Než se nasbírá, karta poctivě řekne, že to zatím spočítat neumí.
- **Soubor:** `projects.js` · v10.63, v10.64
- **🔗 Cross-reference:** `todo.md` TODO-266, `CLAUDE_SKILLS.md` SKILL 45

### FIX-334 · První otevření appky uprostřed měsíce kazilo Přesnost predikce **(Session 22)**
- **Příčina:** Snímek má zmrazit predikci ze začátku měsíce, vzniká ale při prvním otevření — klidně 17. den, kdy už zná půlku skutečnosti. Model pak vypadal přesněji, než je.
- **Oprava:** Ukládá se `snap.day`; snímek pozdější než 5. den se nezapočítává do průměrné odchylky a v tabulce je označený „částečný".
- **Soubor:** `projects.js`, `transactions.js` · v10.65

### FIX-335 · Zpětné okno Obrazu ignorovalo dluhy **(Session 22)**
- **Příčina:** `computeObrazScoreBack()` plnila `debt: 0` do každého měsíce, takže trend dluhu vyšel vždy nula. Kdo splatil velkou část dluhu, dostal v aktuálním okně body, v dřívějším nulu — a appka mu to vydávala za zlepšení.
- **Oprava:** Zůstatek se rekonstruuje ze splátek stejně jako v živé řadě (v8.68). Opraveno na **obou** místech.
- **Soubor:** `projects.js` · v10.69

### FIX-336 · Účtenka ukázala špatnou částku hned po skenu **(Session 22)**
- **Příčina, dvojí:** Prompt vyjmenovával konkrétní formulace slev a neznal Kauflandovo „Tvoje cena s". A pravidlo 5 nutilo analyzér čísla srovnat, takže rozpor zmizel dřív, než ho kontrola úplnosti mohla najít. Kaufland 1 540,88 místo 1 490,99.
- **Oprava:** Obecné pravidlo — jakákoli samostatná záporná částka pod položkou je sleva. Čísla se nikdy neupravují, aby si odpovídala.
- **Soubor:** `worker.js` · v10.70 · ⚠️ vyžaduje deploy do Cloudflare
- **🔗 Cross-reference:** `decisions.md` ADR-143

### FIX-337 · `rpUpdateTotal()` tiše přepisoval natištěnou částku **(Session 22)**
- **Příčina:** Nastavoval `r.total` = součet položek. I kdyby analyzér přečetl „CELKEM" správně, první úprava položky to číslo zahodila.
- **Oprava:** Natištěná částka se drží zvlášť v `printedTotal`.
- **Soubor:** `receipts.js` · v10.70

### FIX-338 · Jedna účtenka vyrobila sedm transakcí **(Session 22)**
- **Příčina:** Od v6.88 (S9) dělila `addReceiptAsTx()` účtenku po kategoriích. Zadání TODO-014 přitom bylo o **kategorizaci** (učení obchodník→kategorie), ne o dělení — to přišlo jako vedlejší produkt. Roky to nebylo vidět, protože bez naučených přiřazení spadly položky do jedné skupiny.
- **Oprava:** Jedna účtenka = jedna transakce ve výši zaplacené částky. Kategorie žijí dál na položkách v `receiptItems`.
- **Soubor:** `receipts.js` · v10.73
- **🔗 Cross-reference:** `decisions.md` ADR-142

### FIX-339 · Tagy ukazovaly nesmyslné částky **(Session 22)**
- **Příčina:** `getAllTags()` přičítal ke každému tagu celou částku transakce. Tagy chodí z analýzy účtenky, takže nákup se sedmi tagy se započítal sedmkrát v plné výši — `#Zelenina` hlásila −995 Kč.
- **Oprava:** Tag z položek bere jen ceny svých položek; ruční tag na celé transakci bere dál celou částku. Podíl se počítá na částce transakce, čímž se ošetří i zaokrouhlení a cizí měny. Proužek nově měří peníze, ne počet transakcí; částka přes `fmtB()`.
- **Soubor:** `admin.js` · v10.75

### FIX-340 · Podpis dat sledoval neexistující pole **(Session 22)**
- **Příčina:** `_dataSig()` počítal součet z `S.goals` — pole, které v aplikaci neexistuje. Virtuální cíle žijí v `S.wishes`. `gsum` vycházelo vždy 0, takže úprava cíle nemusela překreslit stránku.
- **Oprava:** Sleduje `S.wishes` (`savedAmount`, `targetAmount`, `monthlyTarget`, `done`).
- **Soubor:** `ui.js` · v10.76 · nalezeno auditem schématu

### FIX-341 · Service Worker uvízl na v10.66 **(Session 22)**
- **Příčina:** Bump `CACHE_NAME` se prováděl textovou náhradou, jejíž kotva obsahovala **konkrétní datum**. Když přestala sedět, náhrada **tiše nic neudělala**. Verze 10.67–10.79 tedy cache shellu nevynucovaly znovu a prohlížeč mohl servírovat starý `app.html`.
- **Oprava:** Náhrada bez data v kotvě a **ověření po každém bumpu**.
- **Soubor:** `sw.js` · v10.80
- **🔗 Cross-reference:** `VERSIONING.md`, `CLAUDE_SKILLS.md` SKILL 47

### FIX-342 · Editace účtenky ničila rozpad položek **(Session 22)**
- **Příčina:** `syncReceiptToTransactions()` filtrovala podle `it.itemCatId === t.catId` — logika z doby před v10.73, kdy každá transakce nesla jen položky své kategorie. Po úpravě účtenky zůstaly na transakci jen položky hlavní kategorie; u účtenky se 40 položkami mohly zbýt dvě. Navíc zahazovala `itemCatId` a `itemSubcat`.
- **Oprava:** Přenášejí se všechny položky se všemi poli i s částkou.
- **Soubor:** `receipts.js` · v10.77 · nalezeno průchodem řetězce

### FIX-343 · Dvojí započtení u hodnocení útrat **(Session 22)**
- **Příčina:** Sčítaly se hodnocené transakce i hodnocené položky účtenek. Po v10.73 je překryv úplný, protože účtenka je jedna transakce v plné výši.
- **Oprava:** Přednost mají položky; transakce, jejíž účtenka má aspoň jednu hodnocenou položku, se do součtu nebere.
- **Soubor:** `projects.js` · v10.77

### FIX-344 · Průvodce mazáním dat fungoval jen napoprvé **(Session 22)**
- **Příčina:** `openDeleteDataModal()` vracela do výchozí polohy jen viditelnost kroků — ne počítadlo `_deleteCurrentStep` a ne `deleteNextBtn.onclick`, který krok 3 přepsal na `confirmDeleteAllData`. Napodruhé se přeskočila nabídka zálohy, napotřetí se políčko vůbec neukázalo a appka vrátila uživatele na úvodní obrazovku.
- **Oprava:** `resetDeleteWizard()` na každé cestě ven. Vstupní pole se vyprazdňuje (předvyplněné SMAZAT = jeden klik od nevratného smazání), prázdné pole už uživatele z průvodce nevyhodí.
- **Soubor:** `settings.js`, `app.html` · v10.79

### FIX-345 · Diagnostika skriptů spadla na `_ffScriptFail is not defined` **(Session 22)**
- **Příčina:** Blok byl vložen před `js/helpers.js`, ale první načítaný skript je `js/app.js`.
- **Oprava:** Blok před úplně prvním skriptem a volání obalené `window._ffScriptFail && ...` (preload scanner umí spustit `onerror` dřív, než doběhne inline kód).
- **Soubor:** `app.html` · v10.74

### FIX-346 · Karta Obrazu mlčky mizela a úvodní blok ukazoval staré skóre **(Session 22)**
- **Příčina, dvojí:** Nová karta se vykreslovala **až pod** úvodním blokem, ve kterém zůstal starý pruh 0–100. A `_obrazV1Card()` vracela při selhání prázdný řetězec.
- **Oprava:** Úvodní blok ukazuje nový Obraz s teploměrem; selhání se přizná a řekne, co zkontrolovat. Stupnice se kreslí i bez dat, jen prázdná a šrafovaná — jinak není poznat, jestli je funkce nasazená.
- **Soubor:** `projects.js` · v10.81, v10.82

---

# Session 23 (2026-09-25) · v10.82 → v11.04

> Opravy ze Session 23. Kontext a podrobnosti v `patch-session23.md`.

### FIX-347 · Stupnice Obrazu zůstala šedá (Milan) **(Session 23)**
v10.83 přidala barevnou škálu jen pro stav s hodnotou; prázdný stav byl šrafovaný bez barvy. Milan testuje na čerstvém účtu → viděl jen prázdný stav. Škála je nově vždy, prázdný stav = ztlumení + bez jezdce. Přibylo pravítko na spodním lemu (1 / 5 / 10 / 50). Krok lze změnit přes `window.OBRAZ_RYSKA_KROK`. `projects.js` `_obrazTeplomer`.

### FIX-348 · Sekce 4 Lifestyle prázdná (Milan) **(Session 23)**
`lifestyleCard = !_lsVerdict ? '' : …` – bez verdiktu zmizela celá karta včetně vnořených („Kam růst přistál", reálný růst, „Rezerva vydrží"). Nově prázdný stav s vysvětlením + to, co spočítat jde. Třetí výskyt téhož vzoru po sekcích 3 a 8.

### FIX-349 · Dvakrát „Nákup" v editoru účtenky (Milan) **(Session 23)**
Skutečná 🛍️ Nákup (cat23) vs. virtuální 📦 Nákup (`itemCatId:''`) ze S22. Nově `rpNakupCat()`; nezařazené položky dostávají id skutečné kategorie, staré se převedou při otevření účtenky. Virtuální zůstává jen jako nouzovka, když si uživatel Nákup smazal.

### FIX-350 · Majetek ignoroval útratu z účtenek (Milan) **(Session 23)**
`addReceiptAsTx` nezapisovala `wallet` → `computeWalletBalance` transakci neviděla. Ze 2 392 Kč se odečetlo jen 300 (ruční Doprava). Nově výběr peněženky v editoru (`rp_wallet`), zápis do transakce, doplnění při `syncReceiptToTransactions`. Staré transakce: `rpFixReceiptTxWallets()` (volá se z `processAutoSablony`) – **jen při jediné peněžence**.
⚠️ `processAutoSablony` dřív končila na `if(!S.sablony)return;` dřív, než by se k opravě dostala – hook je proto před touto podmínkou.

### FIX-351 · Přehlédnutá sleva Kaufland i po novém skenu (Milan) **(Session 23)**
Tři vrstvy: prompt (pravidlo 7 – soupis `negativeLines` + druhý průchod), `rpApplyNegativeLines()` (doplní slevu jen když součet dojde na natištěnou částku ±0,50), a ruční „Započítat jako slevu" ve žlutém upozornění (`rpDiscountCandidates`, `rpApplyDiffAsDiscount`). Silný kandidát = qty ≥ 2 a cena kusu = rozdíl.
Nelze ověřit bez skutečné fotky: jestli model pravidlo 7 dodrží. Vrstva 3 funguje nezávisle na něm.

### FIX-352 · Karta „Ušetřeno slevami" se při nule schovala **(Session 23)**
Dvě chyby se kryly: sleva přehlédnuta → 0 Kč → karta zmizela → nebylo vidět, že funkce existuje. Nově vždy viditelná + tabulka podle obchodů. `discount` se nově přenáší do `receiptItems`.

### FIX-353 · Sojové kostky 100 g + 300 g slité (Milan) **(Session 23)**
Klíč odřezává gramáž. Skupiny se nově dělí podle velikosti balení, tolerance 25 % (`PKG_TOL`). Záznam bez gramáže se přidá k první skupině téhož jména (beze změny).

### FIX-354 · „null% vs Srpen" (Milan) **(Session 23)**
`null <= 5` je v JS pravda → větev „stabilní". Nově samostatná větev „Zatím není s čím srovnávat".

### FIX-355 · Skóre 310 / 310 při 65% pokrytí (Milan) **(Session 23)**
v10.60 vrátila půlkruhu pevných 310 kvůli „285 / 171". Skutečná vada v10.59: zúžil se jen jmenovatel. Nově `gMax = availMax`, `gTot = round(rawTotal × gMax / rawMax)` – poměr, známka i ručička beze změny. Text: „Ve hře je zatím 202 z 310 bodů … nejsou ani přičtené, ani stržené." Tím se zároveň vrací smysl FIX-309; `smoke_s21b` opět zelený.

### FIX-356 · Přetékání na mobilu (Milan) **(Session 23)**
Obraz: mřížky `1fr 1fr` pod 560 px do jednoho sloupce (atributový selektor + `!important`, styly jsou inline) · „Měsíc po měsíci": `min-width:500px` + vodorovný posun · Příští měsíc: `.pristi-tbl` se pod 560 px skládá do řádků · taby grafu predikce `flex:1 1 130px`.
⚠️ Neověřeno na zařízení – jen rozborem CSS. Prosím o kontrolní screenshoty.

### FIX-357 · Obecné názvy položek ve sledování cen (Milan) **(Session 23)**
`rpIsGenericName()` + seznam `RP_GENERIC_NAMES`; položky se nepouštějí do `itemPrices`. Záložka Zdražování hlásí počet vynechaných. Pozn.: `inflace.js` a Detektor zatím helper NEpoužívají → TODO-276.

### FIX-358 · Přepnutí typu šablony nepřekreslilo kategorie (Milan) **(Session 23)**
`setSablonaType()` měnil `_sablonaType` a zobrazení sekcí, ale `renderSablonaCatPicker()` nevolal — seznam se opravil až kliknutím na kategorii, protože teprve ten `onclick` render volá. Nově překreslení hned + zahození vybrané kategorie nesprávného typu (`both` zůstává).

### FIX-359 · Tabulka v Transakcích useknutá a neposuvná na mobilu (Milan) **(Session 23)**
Mřížka 5 sloupců má minimum 460 px, telefon ~380 px. Hlavička, řádky a součet byly tři samostatné bloky — i s posuvem by ujížděly zvlášť. Nově jeden `overflow-x` rám kolem všech tří, `min-width:460px` na každém.

### FIX-360 · „+ Šablona" a „Filtr" odlétaly doprava (Milan) **(Session 23)**
`margin-left:auto` na tlačítku Šablona; při zalomení lišty odsunul poslední dvě tlačítka na vlastní řádek k pravému okraji. Odstraněno.

### FIX-361 · cesta: Finanční radar → 📅 Měsíc → „Výdaje po týdnech od výplaty" (Milan) **(Session 23)**
Sloupce ukazovaly Kč/den (73), tabulka vedle týdenní částku (511) – dvě různá čísla u stejného týdne. Sloupce nově = týdenní částka, tabulka si nechává přepočet na den. Nadpis zvýrazněn (`.9rem`, bílý, bez verzálek).

### FIX-362 · cesta: Finanční radar → 💸 Do výplaty → „Od výplaty k výplatě" (dříve „Tempo po týdnech cyklu") (Milan) **(Session 23)**
Kč/den dělilo odžitými dny, druhý graf dny týdne → 73 vs 128 Kč/den za stejný týden. Milan zvolil jednotně: částka ÷ počet dní v týdnu (`dnuVTydnu`). Přejmenováno podle Milana.

### FIX-363 · cesta: Finanční radar → 💸 Do výplaty — nereagovala na přepnutí měsíce (Milan) **(Session 23)**
`radarPaydayInfo(D)` bral `today = new Date()`. Nově `radarPaydayInfo(D, refDate)` s volitelným referenčním datem; bez něj beze změny (volají ho i `pristi.js` a Radar-Měsíc). Nová `radarPaydayForMonth(D)` volí cyklus: aktuální měsíc → dnešní cyklus; minulý → celý uzavřený cyklus začínající výplatou v tom měsíci (`P.closed`, `daysLeft=0`); budoucí → hláška bez výpočtu.

### FIX-364 (TODO-286) · cesta: Finanční radar → 💸 Do výplaty → Od výplaty k výplatě — přesuny v týdnech cyklu **(Session 23)**
`cycAllExp` nevylučoval `isTransferTx`; souhrn cyklu a „Výdaje po týdnech" v Měsíci ano. Sjednoceno.

### FIX-365 · cesta: Admin panel → Verze — „SyntaxError: illegal character U+2026" (Milan) **(Session 23)**
Záznam v10.62 obsahuje doslova `<img src=x onerror=…>` (popis XSS opravy). `loadVerze()` dával texty do `innerHTML` bez escapování → prohlížeč vytvořil obrázek, `src=x` selhal, spustil se `onerror="…"` a spadl na U+2026. Chyba existovala od v10.62, projevila se při každém otevření záložky Verze. Vedlejší efekt: z textů mizely „značky" `<loni>`, `<typ>`, `<option>`. Oprava: `_vzEsc()` (fallback když `escHtml` není načtený) na verzi, datum i každou změnu.

### FIX-366 · cesta: O aplikaci → Poznámky k vydání (`share.js` `renderReleaseNotes`) **(Session 23)**
Stejná díra, vidí ji všichni uživatelé. Escapováno.

### FIX-367 · Worker `GET /inflace` vracel holou 500 bez CORS — oficiální inflace z ČSÚ se od S22 nenačítala (Milan, konzole) **(Session 23)**
Routa volala `handleInflace(cors)`, ale v `fetch()` se proměnná jmenuje `corsHeaders`. `ReferenceError` shodil worker dřív, než odpověděl, a Cloudflare vrátil 500 bez `Access-Control-Allow-Origin` → prohlížeč: „Žádost Cross-Origin zablokována". Oprava: `handleInflace(corsHeaders)`. Nový test `tools/smoke_worker_inflace.mjs` volá skutečný `fetch()` handler workeru (ne jen `handleInflace`), takže by tuhle chybu chytil.
Proč to neodhalil `smoke_inflace.js`: testuje `handleInflace` samotnou a má natvrdo cestu `/tmp/ff2/worker.js`, takže mimo původní prostředí vůbec neběží (známé od S23).

### FIX-368 · Oficiální inflace nefungovala od S22 — druhá příčina **(Session 23)**
ČSÚ ukončil Veřejnou databázi (od 2026 se neaktualizuje), CEN0101E je v DataStatu s novými sloupci a přes 48 MB. Worker to poctivě hlásil jako „CSU zmenilo strukturu CSV" (502). Nový `handleInflace` + `csuRozeber` (rozbor podle hlavičky, ne pořadí sloupců; při změně formátu vrátí 502 s hlavičkou a ukázkou).

### FIX-369 · DataStat API vracelo na dotaz workeru 500 „Interní chyba serveru" (Milan) **(Session 23)**
API na neplatný dotaz nevrací důvod, takže nevíme, co mu vadí. Podezření: hlavička `Accept: text/csv` (dokumentace ČSÚ používá `application/json`), filtr `CasM` (sada má víc časových dimenzí, data mohou být klíčovaná přes `CASMKMQRM12`), filtry domácností/území.
Řešení: `csuVarianty()` — 5 tvarů dotazu od nejmenší odpovědi (A: vše + CasM · B: vše + CASMKMQRM12 · C: bez času · D: základ + CasM · E: jen základ), všechny s `Accept: application/json`. Použije se první, která projde; `csuRozeber` nově filtruje domácnosti (0) a území (CZ) i v odpovědi, takže varianty bez těchto filtrů nesmíchají Prahu ani důchodce s celkem. Když neprojde žádná → 502 s přehledem všech pokusů (`pokusy[]`).
Odpověď se kešuje 24 h přes Cache API (POST Cloudflare sám nekešuje) → ČSÚ dostane nejvýš jeden dotaz denně.
⚠️ Varianty C–E stahují celou řadu od 2015 (C ~2 000 řádků, D/E až 4×). Na bezplatném Workers plánu (10 ms CPU) může u D/E rozbor narazit na limit → pokud projde až D/E, zjistit z pole `varianta` a zúžit.

### FIX-370 · Všech 5 variant POST dotazu vrátilo 500, i ta nejmenší **(Session 23)**
Příčina tedy není ve filtru, ale v tvaru dotazu. Dokumentace ČSÚ u příkladu „bez omezení" vyjmenovává všechny dimenze sady. Nové pořadí variant: **P1/P2 – předdefinovaný výběr `CEN0101ET03` přes GET** (`…/api/dotaz/v1/data/vybery/CEN0101ET03?format=CSV[&kodZvlast=true]`), **F/G – POST se všemi 10 dimenzemi** (nefiltrované `filtr: []`), pak původní A–E. `csuRozeber` nově zvládne i čistě textový výběr: měsíc „srpen 2026" → `2026-08` (`csuMesicZTextu`), oddíl podle oficiálního názvu CZ-COICOP 2018 (`csuOddilZNazvu`), typ „Meziroční index", domácnosti „celkem", území „Česko". Cache klíč `inflace-v3`.
Test: `smoke_worker_inflace.mjs` 20 kontrol (GET výběr jako první, textový formát, 10 dimenzí v POST, přehled 9 pokusů).

### FIX-371 · Předdefinovaný výběr funguje, POST nikdy **(Session 23)**
Výsledek 3. kola (Milan): `GET …/vybery/CEN0101ET03?format=CSV&kodZvlast=true` → 200 s kódy; všech 9 tvarů `POST …/vlastni` → 500 „Interní chyba serveru". POST varianty odstraněny.
Výběr ET03 obsahuje jen **bazický index `IZ2025`** (2025 = 100) za **13 měsíců** → `csuInflaceZRadku` dopočte meziroční inflaci `I(m)/I(m−12)×100−100`, ale jen pro poslední měsíc (celkem + oddíly). Odpověď nese `radaNeuplna: true`.

### FIX-372 · Záloha tiše zakryla nefunkční vlastní výběr **(Session 23)**
Při úspěchu zálohy se neúspěšné pokusy nevracely. Nově: pole `vlastniVyber` („ok" / „selhal – viz pokusy" / „CSU_VYBER_URL neni nastavena") a `pokusy[]` i v úspěšné odpovědi. Záložní odpověď se **nekešuje** (dřív 24 h), aby se opravený vlastní výběr projevil hned. Vlastní výběr se zkouší ve dvou tvarech: `U1` s `&kodZvlast=true`, `U2` bez (dokumentace ČSÚ u vlastních výběrů uvádí jen `?format=CSV`). Cache klíč `inflace-v5`.
Kandidáti na příčinu: proměnná neuložena / worker po jejím přidání nenasazen · API vlastních výběrů nebere `kodZvlast` · výběr uložen jako meziměsíční index (`IM`) – pozná se z `pokusy[].typy`.

### FIX-373 (TODO-289) · Admin panel vkládal texty od uživatelů do stránky bez escapování **(Session 23)**
Dotčené: Uživatelé (`displayName`, `email`), Recenze (`name`, `text` — escapovalo se jen `<`), Leady (`name`, `phone`, `email`), Audit plateb (e-mail v tabulce i ve varováních), AI náklady (jméno).
Nejzávažnější: `onclick="navigator.clipboard.writeText('${l.phone}')"` — **dvojitý kontext** (HTML atribut + JS řetězec). Telefon z veřejného formuláře na `lepsi-uver.html` s jednou uvozovkou = spuštění cizího kódu v admin panelu, tedy pod Milanovým účtem.
Oprava: `_vzEsc` (HTML), nový `_jsEsc`/`_onEsc` (JS řetězec uvnitř atributu: ruší `\`, `'`, `"`, `<`, konce řádků), `encodeURIComponent` v `tel:`/`mailto:`.
Pozn.: `copyAllLeads()` skládá prostý text do schránky — tam se neescapuje záměrně.

### FIX-374 (TODO-293) · cesta: Inflace → Tvoje inflace vs. oficiální **(Session 23)**
Při záložním zdroji ČSÚ (jen poslední měsíc) se místo grafu s jedním bodem zobrazí vysvětlení. `S.cnbInflaceNeuplna` z `radaNeuplna`.

### FIX-375 · GDPR export byl jen JSON (Milan) **(Session 23)**
Nově `_gdprPrehled()` otevře čitelný přehled (kdo, proč, kategorie údajů s počty, příjemci, doba uchování, práva včetně ÚOOÚ) s tlačítkem Tisk → Uložit jako PDF; JSON se stahuje dál. Důvod: JSON je správný pro přenositelnost (čl. 20), ale odpověď podle čl. 15 musí být dle čl. 12 srozumitelná a v jasném jazyce. Když prohlížeč zablokuje vyskakovací okno, přehled se stáhne jako HTML soubor.

### FIX-376 · Ikony PWA na webu vůbec nebyly (Milan) **(Session 23)**
`manifest.json` odkazuje na `icons/icon-192.png` atd., ale složka `icons/` v repozitáři neexistuje. Nikdo si toho nevšiml, protože poslední přesměrovací pravidlo `"**" → /index.html` vracelo na každou chybějící adresu úvodní stránku — místo 404 tedy přišlo HTML a prohlížeč jen tiše nezobrazil ikonu. Projevilo se až v PWABuilderu, který kvůli tomu zablokoval sestavení balíku.
Vyrobeny nové ikony v brandu appky (tmavé pozadí `#0f1117`, zelené „F" s ramenem stoupajícím do sloupců grafu, nejvyšší sloupec modrý): `icon-192`, `icon-512`, `icon-maskable-192/512` (značka v bezpečné zóně 80 % kvůli kulatému ořezu na Androidu), `apple-touch-icon-180` (bez průhlednosti), `favicon-16/32`.

### FIX-377 · Přesměrování `" **(Session 23)**
" → /index.html` skrývalo chybějící soubory.** Odstraněno; zůstávají jen adresné rewrites (`/app`, `/legal`, `/cenik`…). Chybějící adresa nově vrací skutečnou 404 s novou stránkou `404.html` (odkaz do aplikace a na úvod).
⚠️ Vedlejší přínos: bez téhle opravy by **neprošel `/.well-known/assetlinks.json`** potřebný pro TWA.

### FIX-378 · `ignore: " **(Session 23)**
/.*"` vyřazovalo z nasazení celou složku `.well-known`.** Nahrazeno adresnými pravidly (`**/.git/**`, `**/.github/**`, `**/.firebase/**`, `**/.DS_Store`, `**/.vscode/**`, `**/.idea/**`). Přidány hlavičky: `assetlinks.json` → `Content-Type: application/json`, obrázky → cache 7 dní.

### FIX-379 · „Stažení e-mailů nefunguje" (Milan, 4 uživatelé) **(Session 23)**
`_cachedUsers` se plní asynchronně v `loadUsersList()`; kliknutí dřív, než doběhlo, skončilo hláškou „Žádné e-maily". Tlačítka si seznam nově dotáhnou sama a hláška říká, kolik uživatelů prošla (nebo že se seznam nepodařilo načíst).

### FIX-380 · Play režim smazal i tlačítko triálu (Milan) **(Session 23)**
30denní triál je zdarma, žádná platba u něj neprobíhá, takže ho pravidla Googlu nezakazují. `applyPlayMode` ho nově ponechá a jen pod něj doplní text, kde Premium koupit; výjimka i u hromadné výměny (`onclick` obsahující `startTrial`).

### FIX-381 · Na WEBU zmizelo tlačítko k nákupu a text se zobrazoval 3× (Milan) **(Session 23)**
Příčina 1: příznak Play režimu se ukládal do `localStorage`. **TWA běží uvnitř Chromu a sdílí s ním úložiště pro stejnou doménu** — co zapsala aplikace z Play, přečetl si i obyčejný panel prohlížeče. Oprava: `sessionStorage` (vázaný na jedno okno; appka z Play a panel v prohlížeči mají každý svůj, uvnitř appky vydrží i mezi stránkami). Starý příznak z `localStorage` se při každém načtení maže → web se spraví sám, bez zásahu uživatele.
Příčina 2: paywall se překresluje a text se vkládal pokaždé znovu. `applyPlayMode()` nově nejdřív odstraní stávající texty (`.ff-play-info`), na webu je uklidí úplně.
Testy: `smoke_play_rezim.js` 21 kontrol — nově „příznak NENÍ v localStorage", „starý se ignoruje a maže", „opakované vykreslení nezdvojí".

### FIX-382 · Měsíční report ukazoval 310 bodů, Dashboard 202 (Milan) **(Session 23)**
Od v10.85 Dashboard zobrazuje skóre na **dosažitelné** škále; sekce „Vývoj finančního skóre" v reportu zůstala na `rawTotal`/`rawMax` a nedostupné složky vypisovala jako `0/62` a `0/46`. Report si odporoval i sám se sebou: 93+78+0+0+31 = 202, v nadpisu 310.
Oprava: nová `scoreZobrazeni(sc)` v `premium.js` = jediné místo, kde se rozhoduje o zobrazované škále (vrací `{tot, max, zuzeno, chybi}`); volá ji Dashboard i report. Nedostupné složky se v reportu píší „nezměřeno".

### FIX-383 · Detektor EAN nespustil kameru (Milan: „permission denied", přitom kamera povolená) **(Session 23)**
Pořadí bylo špatně: nejdřív se z internetu stahovala čtečka, a když se to nepovedlo, ke kameře se vůbec nedošlo — hláška přitom mluvila o kameře. Nově: (1) nejdřív `getUserMedia` hned po kliknutí, (2) obraz se ukáže, (3) teprve pak čtečka; když čtečka selže, **kamera běží dál** a kód jde opsat ručně. Ke každé chybě konkrétní rada (`NotAllowedError`, `NotReadableError`, `SecurityError`…), záložní čtečka ze dvou CDN, u `OverconstrainedError`/`NotFoundError` druhý pokus bez požadavku na zadní kameru. Přidán diagnostický řádek (https ✓/✗, kamera API, čtečka, název chyby) — ze screenshotu je hned vidět, co chybí.


---

# Session 24 (2026-09-26 až 2026-10-03) · v11.04 → v11.26

> Opravy ze Session 24. Kontext v `Summary_s24.md`. Cesty v appce uvedeny u každé opravy.

### FIX-384 · Detektor EAN: kamera se nespustila ani po FIX-383 (Milan) **(Session 24)**
Skutečná příčina byla mimo `ean.html`: `firebase.json` posílal na **všechny** stránky hlavičku
`Permissions-Policy: camera=()`. Prohlížeč pak `getUserMedia` odmítne okamžitě s `NotAllowedError`,
**bez dotazu na oprávnění**. FIX-383 opravoval jen pořadí kroků; diagnóza v S23 byla nesprávná.
Oprava: `camera=(self)`. `ean.html` čte `document.permissionsPolicy` a při zákazu vysvětlí, proč kamera nejde.

### FIX-385 · Detektor EAN: ruční zadání hlásilo „Server odpověděl 404" (Milan, 8594040230203) **(Session 24)**
Open Food Facts vrací u **platného kódu, který nezná, HTTP 404** (`{status:0}`). Kód kontroloval `r.ok`
dřív, než přečetl tělo. Oprava: 404/`status:0` = „výrobek v databázi není". Hledá se paralelně ve 4 databázích
(Food, Beauty, Products, Pet Food). Totéž platí ve workeru `/ean` – „nenalezeno" se kešuje 14 dní.

### FIX-386 · Učení kategorií ukládalo i odhady (v11.05) **(Session 24)**
Při uložení účtenky se mapování zapsalo za každou položku, i když appka jen hádala („Nákup"). Takový záznam
přebíjel komunitní mapu. Nově jen rozhodnutí (ADR-170). Vedlejší: podkategorie se dřív nepamatovala vůbec.

### FIX-387 · Dashboard ukázal skóre 0 po prvním načtení (Milan, v11.10) **(Session 24)**
Nastavení (`_settings.hasDebts`) a stav Premium dorazí po přihlášení později a `_dataSig` se jimi nezmění,
takže se Dashboard nepřekreslil. Oprava: `forceRender()` na konci přihlášení místo `renderPage()`.

### FIX-388 · Záložky Poradce a 3/6/12 měsíců bez zámku (v11.10) **(Session 24)**
`cesta: Měsíční report → Poradce / 3M / 6M / 12M` – byly Premium, ale brána chyběla. Nově 💎 u záložek,
Free → nabídka Premium; po skončení triálu se přepne na Měsíc.

### FIX-389 · Kalendář: čísla se na mobilu zalamovala (Milan, v11.10) **(Session 24)**
`cesta: Kalendář` – `kalKratce()` od 10 000 zkrátí (29 700 → 29,7k, 1 250 000 → 1,3M), celá částka v `title`.

### FIX-390 · Admin Mapa položek: dlaždice nesouhlasily s filtrem (v11.09) **(Session 24)**
Dlaždice se nepřepočítávaly po změně a počítaly jinak než filtr. Nově se přepočítají po každé změně stejně jako filtr.

### FIX-391 · Příspěvek na cestu se nepromítl do Dashboardu (Milan, 25 000 Kč, v11.17) **(Session 24)**
`cesta: Měřidla → Vozidla → Detail → ➕ Zapsat příspěvek` – transakce neměla `wallet`, takže ji
`computeWalletBalance` nepřičetla k žádnému zůstatku (v Transakcích byla vidět). Nově výběr „Kam přišly peníze"
(výchozí peněženka z Nastavení); totéž u doplatku/přeplatku z Energie. Už uložený příspěvek je třeba otevřít a peněženku doplnit.

### FIX-392 · Příspěvek zapsaný v Transakcích se nepropsal do Vozidla (Milan, v11.17) **(Session 24)**
Vozidla znala jen příspěvky vytvořené ve vlastním formuláři. Nově se pozná i příjem s podkategorií
„Příspěvek na cestu"/spolujízda; formulář transakce u něj ukáže blok 🚗 s výběrem vozidla (`t.vozPrispevek`).

### FIX-393 · Doplatek z vyúčtování by se počítal jako záloha (v11.17) **(Session 24)**
Doplatek zapsaný do Bydlení › Energie by se v dalším období sečetl do „zaplacených záloh" = dvojí započítání.
Nově `t.energie.typ:'doplatek'` se do záloh nepočítá; přeplatek je příjem s vazbou na měřidlo.

### FIX-394 · Zálohy Bydlení › Energie / Plyn se nepropsaly do Energie a voda (Milan, v11.18) **(Session 24)**
Vazba šla jen přes název podkategorie napojené u měřidla – stačilo podkategorii přejmenovat nebo zálohy
zapsat do „Bydlení › Zálohy" a nic se nepropsalo. Nově EXPLICITNÍ vazba v transakci (blok 📟: měřidlo + typ),
starší zápisy bez vazby dál podle napojené kategorie.

### FIX-395 · AI zařazení do COICOP proběhlo jen poprvé (Milan, „kreslení" v Bydlení, v11.14) **(Session 24)**
Pauza 30 s platila na všechny dotazy – nový název přidaný krátce po předchozím se přeskočil a nic ho už
znovu nespustilo. Nově pauza jen pro STEJNOU sadu názvů, souběžný požadavek se zopakuje po doběhnutí,
AI se spouští i po uložení kategorie v editoru a výsledek ohlásí toast odkudkoli.

### FIX-396 · Limit finančního zdraví u příjmové kategorie (Milan, v11.15) **(Session 24)**
`cesta: Nastavení → Kategorie → ✎ příjmové kategorie` – blok neměl u příjmu smysl (příjem je základ limitů).
Skrytý u typu income, starý limit se při uložení smaže; u „příjem i výdaj" a přesunů zůstává.

### FIX-397 · Vymazat data nechalo Energii a vodu (Milan, v11.20) **(Session 24)**
`cesta: Můj účet → Vymazat data` – funkce ze S24 mají vlastní uzly mimo `users/{uid}/data`. Nově se maže
`meridla`, `vozidla`, `taxRozpocet`, `categoryMappings` (učení kategorií – zůstávalo už dřív!), `eanAliasy`,
`coicopHlasy` + jejich localStorage. Schválně se NEmaže `aiUsage` (měsíční limit AI). Smazání účtu maže celý `users/{uid}`.

### FIX-398 · Mapa položek ukázala „Mandle" u mléčné čokolády s mandlemi (Milan, EAN 4056489321453, v11.23) **(Session 24)**
Zařazení šlo podle zkratky na účtence („MANDLE MLÉČ. ČOKOL.") a jako celé slovo sedělo jen „mandle".
Navíc databáze měla jen německý název. Oprava: worker se jednou za komunitu zeptá AI na český název
a obecný název z taxonomie podle toho, CO výrobek je; v appce má čárový kód přednost před odhadem z názvu.

### FIX-399 · Český název „zatím chybí" u výrobků uložených před v11.23 (Milan, v11.25) **(Session 24)**
Karta výrobku četla záznam přímo z RTDB, AI doplnění se spustilo jen při novém skenu přes worker.
Nově karta výrobek bez `aiKdy` jednou pošle přes worker.

### FIX-400 · Výběr z bankomatu se počítal jako výdaj (Milan, v11.16) **(Session 24)**
Kategorie „Výběry ATM" (cat39) byla výdaj → hotovost se počítala dvakrát (při výběru a při placení).
cat39 odstraněna z výchozí sady; výběr = Přesun → Mezi peněženkami (s nápovědou). Bez migrace.

### FIX-401 · Hláška „rate_limit" při vyčerpaném limitu účtenek (v11.16) **(Session 24)**
Klient zobrazoval `err.error` místo `err.message`. Nově čitelná zpráva workeru a obnovený ukazatel kvóty.

### FIX-402 · `smoke_s23g.js` padal poslední den měsíce (v11.16) **(Session 24)**
Test počítal s dny „po dnešku" v aktuálním měsíci. Nově pevné datum 10. 9. 2025 (podtřída `Date`).
Smazány nefunkční `smoke_inflace.js` a `smoke_schema.js` (natvrdo zapsané cesty, TODO-292).

### FIX-403 · Worker: 5 „problems" v editoru Cloudflare (v11.20) **(Session 24)**
Jen kontrola typů (`never`, `string | RegExp`, `diag` na poli). Doplněny JSDoc poznámky, běh beze změny.

### FIX-404 · Oznámení: neescapovaná ikona zprávy (TODO-289, v11.20) **(Session 24)**
`announcements.js` – `m.icon` nově přes `escapeAnnounce`. `lepsi-uver.html` prověřen: vkládá jen vlastní spočítané texty.
