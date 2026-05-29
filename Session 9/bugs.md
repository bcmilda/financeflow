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
- **Příčina:** Velké PDF (>10 MB) selžou na Cloudflare Worker size limitu bez uživatelsky přívětivé chyby
- **Poznámka:** Jiný problém než OPEN-003 – tam je problém s token limitem, tady s velikostí requestu

### OPEN-020 · Auto téma vizuálně nerozeznatelné od Světlého **(Session 4, reopen)**
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
- **Soubor:** `charts.js`
- **Aktuálně:** Box plot je v záložce „Roční" (dává smysl až při více letech dat)
- **Správně:** přesunout do záložky „Všechny roky"
- **Akce:** Záložka „Měsíční" = přidat 12 box plotů (jeden per měsíc přes všechny roky)
- **(Session 5):** Canvas ID pro box plot opraven (FIX-045) — box plot se nyní **renderuje**, ale stále je ve **špatné záložce**. Přesun dosud neproběhl.

### OPEN-006 · Predikce – modré hodnoty pro minulé měsíce **(Session 3)**
- **Status:** Opraveno v `transactions.js` v6.41, ale nutno ověřit po nahrání
- **Bylo:** Minulé měsíce ukazovaly jen `actual` bez predikce
- **Má být:** `actual` + modrá predikce (opacity 55%) + odchylka

### OPEN-007 · Přihlášení – popup blokován **(Session 2)**
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
- Klíčová slova jsou case-sensitive v lowercase normalizaci
- „Lidl" vs „LIDL" funguje, ale diakritika může selhat

### OPEN-019 · Nákupní seznam **(Session 2)**
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


*Konsolidováno: 2026-04-23 | Doplněno z bugs_consolidated_s5: 2026-05-15 | Session 7.0+7.1 patch: 2026-05-15 | Sessions: 1 → 9 | Poslední update: Session 9, 2026-05-28 | Autor: Milan Migdal*
*Poznámka ke konsolidaci: `bugs_s6.md` jako základ S6 → doplněno z `bugs_consolidated_s5` (Merge S1-5) → aplikován `patch-session7-COMBINED(1).md` (Sessions 7.0 + 7.1). Dočasná ID z patche přečíslována: FIX-S70-01=FIX-051, FIX-S70-02=FIX-052, FIX-S71-01=FIX-053, OPEN-S70-01=OPEN-026, OPEN-S71-01–04=OPEN-027–030.*