# FinanceFlow – Context pro AI asistenta (Session 1+3+7)

> Tento dokument je aktualizací hlavního `context.md` v Projectu. Datum vytvoření: 2026-05-14
> Merge dokumentů ´context.md session 1+2+3´ a context_combinate z combinated patche 7 + 7.1
Dokument je ze zálohy doc_s4, kde Claude konsolidoval všechny sessions, k tomu bylo přidáno Merge z session 1-3 a -> doplněny informace v souboru CONTEXT_CONSOLIDATED_2026-05-14.md (Claude)
Tento CONTEXT_CONSOLIDATED_2026-05-14.md byl mergeován s PATCH-session7-COMBINED (s7+7.1) (Claude)

## Název projektu
**FinanceFlow** – Rodinné finance pod kontrolou

## Cíl aplikace
Webová progresivní aplikace (PWA) pro sledování osobních a rodinných financí.
Umožňuje správu příjmů/výdajů, import z banky, AI analýzu účtenek, grafy,
predikce, správu půjček, rozpočtů a srovnání výdajů s průměry ČSÚ.
Cílí na český trh, plánuje se vydání na Google Play.

**(Session 3 update):** Rozšířeno o import bankovních transakcí přes Android notifikace,
AI finanční poradce. Cílovka: česká domácnost, primárně mobilní web.

## Použité technologie

### Aktuální stack (Session 3)
| Vrstva | Technologie |
|--------|------------|
| Frontend | HTML5, CSS3, Vanilla JavaScript (bez frameworku) |
| Databáze | Google Firebase Realtime Database (europe-west1) |
| Auth | Firebase Authentication (Google Sign-In / Google OAuth) |
| AI proxy | Cloudflare Worker (Node.js runtime) |
| AI model | Claude Sonnet (`claude-sonnet-4-20250514`) přes Anthropic API |
| Email | **(Session 3)** Resend.com API (přes Worker) – viz omezení níže |
| Hosting | **(Session 1)** GitHub Pages &nbsp;·&nbsp; **(Session 2 + 3)** Firebase Hosting (primary) &nbsp;·&nbsp; **(Session 6)** + GitHub Pages secondary (větev `dev`) |
| Offline | Lokální režim přes `localStorage` (bez Google účtu) |
| Verzování | GitHub (větve: `main` = produkce, `dev` = vývoj) |
| CI/CD | **(Session 2)** GitHub Actions (automatický deploy při merge do `main`) |
| Testy | **(Session 3)** Playwright – nainstalován, testy nenapsány |
| **PDF processing** | **pdf.js 3.11.174** (UMD build z cdnjs) – extrakce textu z PDF pro import **(Session 7.0)** |

### Poznámka k pdf.js
- ⚠️ Verze 4.x je pouze ESM, nefunguje v klasickém `<script>`

### Evoluce stacku napříč sessions
| Vrstva | Session 1 | Session 2 | Session 3 | Session 7 |
|--------|-----------|-----------|-----------|-----------|
| Frontend | Vanilla JS + HTML/CSS, **single HTML soubor** (~10 000 řádků) | HTML5, CSS3, Vanilla JS – **multi-file** | Vanilla JS, HTML, CSS – bez frameworku, **19 modulů** | **22+ modulů**, nové sekce (Session 7.1) |
| AI proxy | Cloudflare Worker v2 | Cloudflare Worker (Node.js) | **Cloudflare Worker v4** → Claude Sonnet API | **Worker v5** (Session 7.1) |
| Hosting | GitHub Pages | Firebase Hosting | Firebase Hosting | Firebase Hosting |
| Email | — | — | **Resend.com API** přes Worker | Resend.com API |
| Verzování | — | GitHub (`main`/`dev`) | GitHub, větev `dev` | GitHub (`main`/`dev`) |
| CI/CD | — | GitHub Actions | — | — |
| Testes | — | — | **Playwright** (nenapsány) | Playwright (git chaos) |
| Offline | `localStorage` | — | — | — |

## Aktuální stav
- **Verze:** **(Session 1)** v6.27 &nbsp;·&nbsp; **(Session 2)** v6.36 &nbsp;·&nbsp; **(Session 3)** v6.41 &nbsp;·&nbsp; **(Session 6)** v6.48 &nbsp;·&nbsp; **(Session 7.1)** v6.50 &nbsp;·&nbsp; **(Session 8)** v6.65 &nbsp;·&nbsp; **(Session 9)** v7.02 &nbsp;·&nbsp; **(Session 10)** v7.31
- **URL (produkce):**
  - **(Session 1)** https://bcmilda.github.io/financeflow
  - **(Session 2 + 3)** https://financeflow-a249c.web.app (primary)
  - **(Session 6)** https://bcmilda.github.io/financeflow (secondary, větev `dev`)
- **GitHub:** https://github.com/bcmilda/financeflow
- **Cloudflare Worker:** https://misty-limit-0523.bc-milda.workers.dev
- **Firebase projekt:** financeflow-a249c
- **Stav:** Funkční, v aktivním vývoji
- **(Session 3)** **Přihlášení:** Google Sign-In – perzistentní session (uživatel se znovu nepřihlašuje)
- **(Session 3)** **Grafy:** CSS timing bug opraven – vyžaduje nahrání `helpers.js` v6.41
- **(Session 3)** **Email notifikace:** Nefungují plně – Resend free tier omezení (viz níže)
- **(Session 3)** **PIN:** Nastaven v settings, ale full-screen PIN pad chybí
- **(Session 6)** **Email:** ✅ Resend funguje – Worker v5, `RESEND_API_KEY` v Cloudflare Secrets, emaily dorazí na bc.milda@gmail.com
- **(Session 6)** **Sentry:** ✅ Nasazen – async loader před `</body>`, error tracking aktivní (DSN nastaven)
- **(Session 6)** **Firebase Rules:** ✅ Admin read přístup nasazen, 403 se nevrací

**(Session 7.0 update):** Verze v6.49–v6.50. PDF import přepsán na text extraction přes pdf.js.
Bubble chart základ implementován (4 varianty). Firebase Rules opraveny (referrals + referral_clicks).
Session workflow změna: od S7 se vytváří pouze patch-sessionN.md, ne celé soubory.
Playwright nainstalován ale způsobil git chaos (node_modules staged) – přidat do .gitignore.

**(Session 7.1 update):** Implementovány nové sekce – Plány a cíle (nakup.js rozšíření),
Budoucí platby (budouci.js), Finanční aktiva (assets.js), Report poradce (advisor.js).
Cloudflare Worker v5 nasazen s typem advisor_report. Session 7.1 TODO range: TODO-056–072+.

**(Session 9 update):** Verze v6.66–v7.02. COICOP systém (13 kruhů, adopce kategorií), AI pamatuje
mapování kategorií (categoryMappings Firebase), in-app notifikace budoucích plateb, velký refaktor
analýzy účtenek (item-level kategorizace, itemStats, cena/kg, shrinkflation), validace AI JSON,
globální error handler (TODO-006). TODO range: TODO-078–092.

**(Session 10 update):** Verze v7.06–v7.31 (26 verzí). Hlavní oblasti:
- **Finanční radar** – velká přestavba: včasné varování + predikce (konec měsíce, 3 měsíce, kvartál),
  denní graf (kumul/příjem/ideální tempo/predikce/denní sloupce), volné peníze, 4 sloupce „Kam směřuju",
  nadcházející platby po měsících (30/60/90), trend výdajů po týdnech od výplaty.
- **Predikce** – 3 kumulativní křivky (YTD/Předpoklad/Odhad), záložka Sezonalita (reál vs model),
  Spending Pace (aktuální vs historický průměr ke dni), skrytí prázdných podkategorií.
- **Komunita/COICOP** – 13 oddílů CZ-COICOP 2024, tříúrovňový strom, přepínač osoba/domácnost + OECD,
  rodinný souhrn (sčítání partnerů).
- **Finanční obraz** – FFR, inflace životního stylu, diverzifikace (HHI), Wealth Momentum, Asset Allocation.
- **Sdílení & Partneři** – read-only model (ADR-051).
- **Skóre** – sjednoceno na `computeHealthScores().overall`.
- **Účtenky** – split dle kategorií, varování budoucího data, itemStats.
- Nové ADR-049 až 054. Audit: 18 bodů přeznačeno ✅. Stripe blokován (IČO/OSVČ).

### Premium / Monetizace **(Session 3)**
- 30denní trial (manuální aktivace)
- Platební systém **není** implementován
- Plánovaná cena: **99 Kč/měsíc** nebo **699 Kč/rok**

### Implementované funkce
- ✅ AI analýza účtenek (Claude přes Cloudflare Worker)
- ✅ COICOP engine (13 skupin, keyword matching)
- ✅ Split transakce
- ✅ Import CSV / XLSX / PDF
- ✅ Admin panel (keyword engine, corrections, low confidence, stats)
- ✅ PDF import – text extraction přes pdf.js 3.11.174 + chunking **(Session 7.0)**
  - Worker typ: bank_statement_text (vedle stávajícího bank_statement)
  - Dávkování: 15 stránek/volání, výsledky se slučují
  - 🔗 Souvisí s: bugs.md OPEN-003 (vyřešeno), architecture.md Worker typy
- ✅ Bubble chart vizualizace výdajů – 4 záložky v dashboardu **(Session 7.0)**
  - A) Cluster, B) Drill-down (3 úrovně), C) Gradient+osa, D) Treemap
  - Sdílené subkategorie: gradient okraj + 🔗 + drill-down na všechny rodiče
  - 🔗 Souvisí s: TODO-053, TODO-060
- ✅ Firebase Rules – referrals + referral_clicks uzly přidány **(Session 7.0)**
- ✅ Plány a cíle – záložka v Nákupním seznamu, progress bar, deadline **(Session 7.1)**
  - Firebase: goal_deposits/{id}
  - 🔗 Souvisí s: TODO-056, BUG-S71-02
- ✅ Virtuální peněženka – přehled cílů v sekci Peněženky **(Session 7.1)**
- ✅ Budoucí platby – timeline ze šablon + narozenin + cílů + dluhů **(Session 7.1)**
  - 🔗 Souvisí s: TODO-058
- ✅ Finanční aktiva – nová sekce assets.js **(Session 7.1)**
  - 5 typů: nemovitosti, investice, vozidla, spoření, ostatní
  - computeAssetsNetWorth(D) – NIKDY nepřejmenovávať (kolize s premium.js)
- ✅ Net Worth výpočet – aktiva + peněženky − dluhy **(Session 7.1)**
  - 🔗 Souvisí s: DECISION-S71-02
- ✅ Report pro finančního poradce – záložka 📋 v měsíčním reportu **(Session 7.1)**
  - advisor.js, píše do #advisorContainer (NE do #reportContent)
  - 🔗 Souvisí s: TODO-059
- ✅ Cloudflare Worker typ advisor_report **(Session 7.1)**
- ✅ Sentry.io monitoring – async loader, error tracking, `setUser` po přihlášení **(Session 6)**
- ✅ Scoring v2 – 4 nezávislé složky: Cash Flow, Zadluženost, Rezerva, Spoření **(Session 8)**
  - 🔗 Viz `decisions.md` ADR-043, `formulas.md` sekce Scoring v2
- ✅ Import Editor – modal s 4 barevnými úrovněmi duplikátů **(Session 8)**
- ✅ isBalancing flag – KB EUR vyrovnávací transakce vyloučeny ze součtů **(Session 8)**
- ✅ Admin panel – správa členství (⏳ čeká na test s reálným uživatelem) **(Session 8)**
- ✅ Detektor úspor v2 – datum v labelu, 1 nález/transakce **(Session 8)**
  - 🔗 Viz `decisions.md` ADR-025, `architecture.md` sekce 14

### Známá omezení
- ⚠️ Monetizace (GoPay) není implementována
- ⚠️ PWA offline podpora pouze částečná (localStorage)

## Firebase konfigurace
```
apiKey:            AIzaSyDtEdQw4WccmEzxXzMwPQlenqfnjoiVw4A
authDomain:        financeflow-a249c.firebaseapp.com
databaseURL:       https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app
projectId:         financeflow-a249c
storageBucket:     financeflow-a249c.firebasestorage.app
messagingSenderId: 399807761148
appId:             1:399807761148:web:a20b1d9ae78aec23e7a579
Admin UID:         LNEC8VNB2QPwIv6WWQ9lqgR4O5v1
```

## Cloudflare Worker
```
URL:    https://misty-limit-0523.bc-milda.workers.dev
Secret: ANTHROPIC_API_KEY
CORS:   (Session 1) pouze https://bcmilda.github.io
        (Session 2) neuvedeno
```

**(Session 3)** Worker je nyní **v4** a routuje navíc requesty na **Resend.com API** (email).

**(Session 6 update):** Worker **v5** nasazen – CORS rozšířen o `bcmilda.github.io`, `RESEND_API_KEY` přesunut do Cloudflare Secrets, lepší Resend error logging.

## Resend (email) **(Session 3)**
```
Provider:     Resend.com (přes Cloudflare Worker)
Admin email:  bc.milda@gmail.com
API klíč:     re_UZf6...  [REDACTED – viz security incident, klíč byl uniknut na GitHubu]
```

> ✅ **(Session 6 update):** Resend klíč rotován a přesunut do Cloudflare Secrets jako `RESEND_API_KEY`. Emaily fungují. Prefix původního uniknutého klíče: `re_UZf6...` (deaktivován).

### Resend free tier omezení
- `from` = pouze `onboarding@resend.dev`
- `to` = pouze email registrovaný na Resend účtu (bez verified domény)
- **(Session 6 update):** Resend funguje přes `onboarding@resend.dev` → `bc.milda@gmail.com`. Doménová verifikace není potřeba díky opravě `premium.js` (auth header + payload struktura). EmailJS není potřeba.

## Důležité poznámky pro AI

### Workflow a verzování
1. **Verze se inkrementuje o 0.01** – vždy zkontroluj řádek 6 v `index.html` (`<title>FinanceFlow vX.XX</title>`)
2. **Commit vždy do větve `dev`**, nikdy do `main`
3. **Commit zpráva:** `vX.XX - stručný popis změn`
4. **Po commitu vždy push** a pak `firebase deploy --only hosting`
5. **Verzovací schéma:** bug fix → +0.01, nová feature → +0.01 (od v6.11), milestone → +1.00

### Architektura a struktura souborů
Více souborů – `index.html` + samostatné JS moduly (Session 3 specifikuje **19 modulů**), kritické pořadí načítání.

6. Pořadí JS souborů je kritické – viz `architecture.md`, `firebase.js` musí být **POSLEDNÍ**
7. `firebase.js` používá `type="module"` – nelze přesunout výše v pořadí skriptů
8. Největší past: prázdný `<script>` tag z původního HTML se opakovaně vracel do `index.html` – vždy zkontroluj konec souboru

#### Script pořadí v `index.html` (Session 3: 19 souborů, nesmí být změněno)
```
app.js → helpers.js → charts.js → stats.js → transactions.js → projects.js
→ premium.js → ui.js → debts.js → ai.js → receipts.js → duplicates.js
→ settings.js → share.js → sms-import.js → kalendar.js → nakup.js
→ admin.js → import.js → firebase.js
```

**(Session 7.1 update):** Nové soubory přidány ZA nakup.js, PŘED admin.js:

```
app.js → helpers.js → charts.js → stats.js → transactions.js → projects.js
→ premium.js → ui.js → debts.js → ai.js → receipts.js → duplicates.js
→ settings.js → share.js → sms-import.js → kalendar.js → nakup.js
→ budouci.js → assets.js → advisor.js
→ admin.js → import.js → firebase.js
```

Celkem: 22+ JS souborů. firebase.js musí být vždy POSLEDNÍ s type="module".

#### Konvence názvu souboru
Filename je vždy `index.html` (commit do `dev`).

### Code quality – co NIKDY nedělat
9. **Nikdy** nedefinovat funkce uvnitř jiných funkcí (nested function declarations)
10. **Nikdy** volat `renderXxx()` z `oninput` handleru – blikání a ztráta focusu
11. **Vždy** používat `addEventListener()` pro komplexní formuláře

### COICOP engine – globální scope
- `COICOP_GROUPS_DEF`, `COICOP_KEYWORDS`, `COICOP_CATEGORY_MAP`, `mapToCOICOP()` musí být **globální** (ne uvnitř jiné funkce)
- `buildCompareTab()` potřebuje `householdSize` jako **explicitní parametr** (není v closure)
- `guessReceiptCategory()` musí být **globální** (ne uvnitř `buildReceiptPreviewHTML`)

### UI specialitky
- Overlay klik **nezavírá** `modalSplit` – výjimka v event handleru
- Split children se nezobrazují samostatně – filtr: `!t.splitId || t.splitParent`

### Data a importy
- **KB CSV** je v kódování `windows-1250`, header je na řádku 16 (přeskočí metadata)
- **(Session 3)** `t.amt` vs `t.amount` – `saveTx` ukládá obojí: `{amount: amt, amt}`. Vždy čti `t.amount || t.amt || 0`.

### Historické bugy – VŽDY zkontrolovat před úpravou **(Session 3)**
- **`premium.js` balance -1** – starý fragment `sendContactForm` zůstává v souboru. Vždy začínej od `uploads/premium.js` jako základu, ne od `outputs/`.
- **`settings.js` NESMÍ přepisovat `applySettings()`** – `_origApplySettings = applySettings`, pak přepsaná funkce volá sebe → nekonečná rekurze. `renderSettingsPage()` volá `ui.js` přímo.
- **`computePersonalSeason` / `detectTrend` / `computeYearForecast`** – definovány v `helpers.js` na konci souboru. Pokud chybí (špatný upload) → predikce se rozpadnou.
- **Grafy root cause** – `.page{display:none}` v CSS. `showPage()` volá `renderGrafy()` synchronně před CSS reflow → `canvas.parentElement.clientWidth = 0` → prázdné plátno. **Fix:** `requestAnimationFrame(() => setTimeout(() => renderPage(), 50))` v `showPage` pro grafy.
- **Cache busting** – po každé změně JS aktualizuj `?v=sha256hash` v `index.html`.

### Validace
- **Při opravě souboru** – vždy zkontroluj syntax: `node --check soubor.js`
- **Po editaci `index.html`** – ověř, že verze v řádku 6 sedí a soubor není ořezaný
- **(Session 3)** Kontroluj brace balance `{` vs `}` po každé změně
- **(Session 3)** Aktualizuj `?v=hash` v `index.html` po každé změně JS souboru

### Pravidla ze Session 7.0
- **Patch-only workflow:** AI vytváří pouze `patch-sessionN.md` se změnami, nikdy celé .md soubory **(Session 7.0)**
- **Číslování TODO:** Vždy ověřit poslední číslo grep-em v `todo.md` před přidáním nového **(Session 7.0)**
- **Chaining souborů:** V rámci session vždy chain editací z předchozích outputs, NIKDY znovu kopírovat z `/mnt/project/` **(Session 7.0)**
- **Session 7.0 TODO range:** TODO-049 až TODO-055
- **Session 7.1 TODO range:** TODO-056 až TODO-072+

### Kritická pravidla ze Session 8 **(Session 8)**
- **max_tokens je OUTPUT limit**, ne context window. Claude Sonnet 4 context = 200k tokenů.
- **isBalancing flag** – KB EUR transakce: `incSum()`/`expSum()` musí filtrovat `!t.isBalancing`
- **AI Rate Limiting (TODO-075)** – bez implementace je Worker otevřený pro zneužití. Viz ADR-041.
- **Bubble chart (TODO-076)** – vizuálně nepoužitelné, nutno přepsat pozicování
- **Stripe Payment Links (TODO-073)** – `REPLACE_ME` konstanty v `donate.js` musí být vyplněny

### Kritická pravidla ze Session 7.1
- **NIKDY nekopírovat z /mnt/project/** pokud jsi soubor v téže session už upravoval **(Session 7.1)**
- **computeNetWorth() konflikt** – premium.js: computeNetWorth(D)→{rows,total,totalDebt} / assets.js: computeAssetsNetWorth(D)→{totalAssets,totalWallets,netWorth}. Nikdy nepřejmenovávát! **(Session 7.1)**
- **renderAdvisor() je async** – volat vždy přes setTimeout(..., 30) po el.innerHTML **(Session 7.1)**
- **advisorContainer** – advisor.js píše do #advisorContainer (uvnitř reportContent) **(Session 7.1)**
- **_reportPeriod** – stav záložky reportu ('7D'|'1M'|'3M'|'6M'|'12M'|'advisor'), funkce reportSetPeriod(p) **(Session 7.1)**
- **bubbleChartWrap** – id elementu pro bubble chart (nahradil donutCanvas+donutLegend) **(Session 7.1)**
- **SHARED_NAMES** – Set jmen podkategorií vyskytujících se ve 2+ kategoriích **(Session 7.1)**
- **bPos(n,cx,cy,r)** – helper pro rovnoměrné rozmístění bublin do kruhu **(Session 7.1)**

## .gitignore doporučení **(Session 7.0)**

**(Session 7.0 – přidat do .gitignore):**
```
node_modules/
.firebase/
.claude/
.specstory/
ai_memory/
skills/
```

## Nasazení workflow **(Session 3)**
```bash
# 1. GitHub: nahrát js/*.js + index.html do dev větve
# 2. firebase deploy --only hosting
# 3. Prohlížeč: Ctrl+Shift+R (hard refresh)
# 4. Cloudflare Worker: Dashboard → Workers → Edit → Deploy
# 5. Firebase Rules: Console → Realtime DB → Rules → Publish
```

## Jak má AI pomáhat
- Opravovat konkrétní soubory (ne celý projekt najednou)
- Vždy ověřit syntax před předáním souboru
- Inkrementovat verzi správně
- Ptát se na kontext, pokud není jasný
- Nemazat existující funkce při přidávání nových
- Při editaci velkého souboru – editovat jen relevantní část, ne celý soubor
- Preferovat Python skripty pro editaci souborů (přesnější než `str_replace` na velkých souborech)
- Vždy pracovat s nejnovějším `index.html`
- **(Session 3)** Opravovat bugy vždy na základě `uploads/` souborů (aktuální Firebase verze), nikdy z `outputs/`
- **(Session 3)** Před úpravou přečíst aktuální verzi souboru – nikdy nepředpokládat obsah
- **(Session 3)** Upozornit, pokud změna ovlivňuje script pořadí nebo závislosti mezi moduly

## Provozovatel
**Milan Migdal** – bc.milda@gmail.com – Ostrava, CZ

---

> ✅ **Vyřešeno (Session 6):** S1 používala single HTML + GitHub Pages. S2+ přešly na multi-file + Firebase Hosting. Session 6 přidala GitHub Pages jako secondary z větve `dev`. Aktuální produkční verze: v6.50 (Firebase Hosting primary).

> ⚠️ **Přesun** – Session 7.1: přesun z 19 modulů na 22+ modulů

*Konsolidováno: 2026-05-24 | Sessions: 1 → 8 | Autor: Milan Migdal + Claude*