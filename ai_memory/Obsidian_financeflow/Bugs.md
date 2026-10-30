# FinanceFlow – Bugs & Fixes

> Konsolidovaný dokument ze **4 sessions** (`bugs.md` → `bugs-1.md` → `bugs-2.md` → `BUGS-3.md`). Bugy jsou přečíslovány pod unikátní ID `BUG-001+` (původní ID ze sessions jsou v závorkách). Každý záznam je označen zdrojovou session: `**(Session N)**`. Poslední aktualizace: konsolidace 4 sessions, 2026-04-16.

---

## 📋 TL;DR – Stav otevřených bugů

|Priorita|Počet|Příklady|
|---|---|---|
|🔴 Kritické|3|Email notifikace, **Grafy prázdné** (2× oprava neúspěšná), PDF import token limit|
|🟡 Střední|7|Auto téma (reopen), Box plot záložka, Predikce ověření, popup blokován, kategorie race, DTI fallback, PDF size|
|🟢 Nízké|8|Loading, testy, měsíční graf, .xlsm, Safari appearance, offline login, COICOP trend, diakritika|

**Celkem aktuálně otevřených:** ~18 bugů **Uzavřeno uživatelem v této session:** PIN pad (funguje)

---

## 🔴 OTEVŘENÉ CHYBY – Kritické

### OPEN-001 · Email notifikace nefungují **(Session 3)**

- **Soubor:** `premium.js`, `financeflow-worker-v4.js`
- **Reprodukce:** Vyplnit kontaktní formulář → odeslat → email nepřijde

#### Technická příčina

Resend free tier neumožňuje posílat na libovolnou adresu bez verified domény. Z adresy `onboarding@resend.dev` lze posílat **pouze na email registrovaný na Resend účtu**. Jakýkoli jiný adresát je tiše zahozen.

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

Viz FIX-041 – Resend klíč byl rotován (původní leaknutý přes GitGuardian), nový hardcoded v kódu taktéž deaktivován. **Rotace klíče + přesun do `env.RESEND_API_KEY` je prerekvizita jakéhokoli z řešení A/B/C.**

#### 🔗 Cross-reference

- `explanations.md` sekce 2 – detailnější vysvětlení Resend free tier omezení
- `todo.md` TODO-003 – akční úkol
- `architecture.md` sekce 7 – Resend konfigurace

### OPEN-002 · Grafy prázdné – fix nefunguje **(Session 3 + 4, stále aktuální)**

- **Soubory:** `charts.js`, `helpers.js`
- **Závažnost:** Vysoká – celá sekce Grafy nefunkční
- **Historie oprav:**
    - **S3 (FIX-026):** `requestAnimationFrame(() => setTimeout(fn, 50))` + `getBoundingClientRect()` → **nestačilo**
    - **S4 (FIX-040):** Rozšíření na 4 vrstvy – dvojitý `rAF`, retry 5× s narůstajícím zpožděním (80–400 ms), `drawSaldoBars` přes `getBoundingClientRect` → **dle uživatele stále nefunguje**
- **Root cause (teoretický):** Canvas element má šířku 0 při volání `getBoundingClientRect()` protože browser nestihl dokončit layout po přechodu `display:none → block`
- **Reprodukce:**
    1. Přihlásit se do aplikace
    2. Kliknout na „Grafy" v sidebaru
    3. Canvasy jsou tmavé obdélníky / prázdné
- **🔴 Další kroky navrhované:**
    - Ověřit, zda byla nahrána verze s FIX-040 (může být jen cache problém → hard refresh Ctrl+Shift+R)
    - Přidat console.log do retry mechanismu a ověřit, kolik retry proběhne a jakou šířku canvas má
    - Zvážit alternativní přístup: `ResizeObserver` + `IntersectionObserver` místo časového retry
    - Možná příčina: problém není v timing, ale v tom, že parent elementu chybí explicitní šířka (CSS)

### OPEN-003 · PDF import – token limit **(Session 2)**

- **Příčina:** Velké PDF výpisy (>200 transakcí) selhávají na `stop_reason: max_tokens`
- **Reprodukce:** Nahrát PDF výpis za celý rok
- **Řešení:** Rozdělit PDF na části a volat API postupně
- **Souvisí s OPEN-004** ze Session 1 (jiný limit – Worker size)

---

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

---

## 🟢 OTEVŘENÉ CHYBY – Nízká priorita

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

|#|Téma|Sessions|Stav|
|---|---|---|---|
|A|**Grafy prázdné**|S3 FIX-004 (vyřešeno `rAF + setTimeout`) → S4 FIX-022 (rozšíření na 4 vrstvy s retry)|Dvoufázová oprava – S3 oprava nestačila, S4 ji vylepšila|
|B|**Resend klíč / email**|S3 OPEN-001 → S4 FIX-024 (aktualizace klíče) → **teď deaktivováno kvůli GitGuardian**|Cyklus: problém → fix → security incident → znovu problém|
|C|**Admin panel Permission denied**|S4 FIX-021|Workaround přes REST API, ale vyžaduje Firebase Rules úpravu – viz `architecture.md` sekce 8|
|D|**Nákupní seznam**|S2 OPEN-019 → S3 existuje `nakup.js`|Pravděpodobně vyřešeno mezi S2 a S3, ověř|
|E|**DTI/DSTI**|S2 FIX-018 (v6.36) → S3 FIX-009 (v6.35-41) → S2 OPEN-009|Řetězec 3 souvisejících bugů|

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
- **Souvisí s:** ADR v `decisions.md` („Min. 4 měsíce pro trend detekci" + „Outlier removal")

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
- **Souvisí s:** ADR „Ukládat obojí amount + amt" v `decisions.md`

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
    
- **🔗 Cross-reference:** Tento bug je přímo spojen s otevřeným auditem Firebase Rules v `architecture.md` sekce 8 (otevřený problém).

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

#### FIX-041 · Neplatný Resend API klíč (zastaralé) **(S4 BUG-05)**

- **Soubor:** `financeflow-worker-v4.js` (řádek 238)
- **Závažnost:** Vysoká – emaily z aplikace nefungují
- **Oprava (v Session 4):** Aktualizován klíč z `re_UZf6C8UZ_*` na `re_9jY2risE_*`
- **⚠️ AKTUÁLNÍ STAV:** **Tento fix již neplatí.** Po Session 4 byl i nový klíč `re_9jY2risE_*` invalidován kvůli security incidentu (hardcoded v kódu + uniklý přes GitGuardian). Rotace klíče do Cloudflare Secrets je aktuálně otevřený úkol – viz OPEN-001 a `architecture.md` sekce 7.

#### NOTE-01 · receipts.js ztracený **(Session 4)**

- Soubor byl dostupný celou dobu v `/mnt/project/receipts.js` – byl hledán na špatné cestě `/mnt/project/js/receipts.js`. Opraveno v této session.
- **Není bug aplikace, jen poznámka k workflow.**

---

## 🔁 Kroky reprodukce – kritické bugy

### Grafy prázdné **(verze před FIX-040)**

```
1. Přihlásit se do aplikace
2. Kliknout na "Grafy" v sidebaru
3. Výsledek: canvasy jsou tmavé obdélníky (žádná data)
4. Příčina: showPage() volá renderGrafy() synchronně → canvas má šířku 0
```

### „too much recursion" (settings – FIX-035)

```
1. Nahrát settings.js kde je _origApplySettings = applySettings
2. Přejít na stránku Nastavení
3. Výsledek: Uncaught InternalError: too much recursion v konzoli
4. Příčina: applySettings ukazuje na sebe přes _origApplySettings
```

### Predikce – `computePersonalSeason` not defined (FIX-036)

```
1. Nahrát transactions.js kde predikční buňka přímo volá computePersonalSeason()
2. Přejít na stránku Predikce
3. Výsledek: ReferenceError: computePersonalSeason is not defined
4. Příčina: funkce je v helpers.js ale buňka ji volá přímo
   Správně: volat přes predictCat()
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

_Konsolidováno: 2026-04-16 | Sessions: 1 → 4 | Autor: Milan Migdal_