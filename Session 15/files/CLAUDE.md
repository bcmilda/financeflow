# FinanceFlow – Claude kontext

> **Zdrojový soubor (základ):** `CLAUDE(1).md` (Session 6 verze)
> **Aplikované patche Session 6:** sekce CLAUDE.md ze souboru `patch_s6.md` (Session 6, 2026-04-23)
> **Doplnění Session 7:** nové JS soubory, počet modulů, pravidlo chainování (2026-05-15)
> **Datum poslední aktualizace:** 2026-05-15 (Session 7.1)

> **DŮLEŽITÉ:** Tento soubor obsahuje pouze základní přehled. Pro plný kontext si přečti relevantní `.md` soubory ve složce `doc/` podle potřeby a aktuálního úkolu.

## Session start — povinné čtení

Na začátku každého sezení si přečti následující soubory, než začneš cokoliv dělat:

1. Tento soubor (`CLAUDE.md`)
2. **Firebase Security Rules** — [`database.rules.json`](https://github.com/bcmilda/financeflow/blob/dev/.github/workflows/database.rules.json) — pravidla přístupu k Realtime Database
3. **Cloudflare Worker** — [`worker.js`](https://github.com/bcmilda/financeflow/blob/dev/cloudflare-worker/worker.js) — proxy vrstva mezi aplikací a externími API

---

## Projekt

**FinanceFlow** je webová aplikace pro správu rodinných financí (příjmy, výdaje, půjčky, projekty, AI analýzy). Postavená jako SPA (Single Page Application) — čistý HTML/CSS/JS bez frameworku, backend je Firebase.

## Architektura

- `index.html` — hlavní a jediný HTML soubor (SPA)
- `css/styles.css` — veškeré styly
- `js/` — 25 modulů **(Session 7.1)** (charts.js, admin.js, ai.js, budouci.js, assets.js, advisor.js, atd.)
- `firebase.json` — Firebase Hosting konfigurace
- `doc/` — plný kontext projektu, přečti si relevantní `.md` soubory podle potřeby a aktuálního úkolu
- `docs/` — pracovní složka Claude Code pro poznámky a dočasné soubory

### Pravidla pro složku `doc/` (originální, chráněná)
- **Nikdy nepřepisuj ani nemaž existující obsah**
- Lze pouze dopisovat nové informace, konsolidovat nebo aktualizovat
- Před jakýmkoliv importem nebo aktualizací se vždy zeptat vlastníka a počkat na potvrzení
- Pokud najdeš konflikty nebo rozpory, sepiš je a nejdříve provedeme diskusi a úpravy — teprve potom import

### Soubory v `doc/`
- `GLOSSARY.md` — slovník pojmů a zkratek používaných v projektu
- `SECURITY.md` — bezpečnostní pravidla, správa API klíčů, Firebase Security Rules
- `architecture.md` — technická architektura aplikace, struktura souborů a modulů
- `bugs.md` — seznam známých chyb, jejich stav a poznámky k opravám
- `context.md` — obecný kontext projektu, cílová skupina, záměr a směřování
- `decisions.md` — architektonická a produktová rozhodnutí s odůvodněním
- `explanations.md` — technické vysvětlivky a poznámky k implementaci
- `features.md` — přehled funkcí aplikace, jejich stav a popis
- `todo.md` — seznam úkolů, priorit a otevřených bodů
- `VERSIONING.md` — pravidla verzování aplikace a dokumentace, change preview workflow **(Session 6)**
- `UPDATE_RULES.md` — pravidla pro aktualizaci .md souborů, konsolidační postupy **(Session 7)**

### Pravidla pro složku `docs/` (pracovní, Claude Code)
- Volný přístup — lze vkládat, přepisovat i mazat dle libosti
- Slouží pro poznámky, rychlé náhledy a pracovní podklady před implementací do `doc/`

## Pravidla pro AI asistenta **(Session 6)**

- **O aplikaci banner** – sekce `page-oAplikaci` v `index.html` obsahuje hardcoded verzi.
  Při každé změně verze **VŽDY** aktualizovat také tento banner (hledej `Verze 6.XX`).
- **Patch-only workflow** – AI vytváří pouze `patch-sessionN.md` se změnami, nikdy celé `.md` soubory.
  Celé soubory zbytečně spotřebovávají tokeny a zvyšují riziko přepsání historických dat.
- **Chainování souborů (KRITICKÉ)** – VŽDY pracovat s vlastním posledním výstupem. NIKDY znovu kopírovat z `/mnt/project/` pokud byl soubor v téže session upraven. Viz `UPDATE_RULES.md` sekce 6.
- **Kolize funkcí** – před přidáním nové funkce ověřit grep-em. Kritické: `computeNetWorth()` (premium.js) vs `computeAssetsNetWorth()` (assets.js) — NIKDY přejmenovávat. Viz `decisions.md` ADR-036.
- **Nové JS soubory pořadí** – za `nakup.js`, před `admin.js`: `budouci.js` → `assets.js` → `advisor.js`

## Firebase

- **Projekt ID:** `financeflow-a249c`
- **Hosting:** Firebase Hosting
- **DB:** Realtime Database (`financeflow-a249c-default-rtdb.europe-west1`)
- **Auth:** Google Sign-In + anonymous

## Git workflow

```
claude/session-branch  →  dev  →  main
       (moje změny)     (test)   (produkce)
```

- `dev` → automatický preview deploy (GitHub Actions) při každém push
- `main` → live deploy (GitHub Actions) při každém push
- Merge `dev` → `main` provádí vlastník (bcmilda) po otestování

## Konvence

- Verze v titulku `index.html`: `<title>FinanceFlow vX.XX</title>`
- Changelog verzí: pole `VERZE_LOG` v `js/admin.js` (záložka Verze v admin panelu)
- Při každé změně zvýšit verzi a přidat záznam do `VERZE_LOG`
- `.env` obsahuje `RESEND_API_KEY` — nikdy necommitovat (je v `.gitignore`)
- Admin panel přístupný pouze pro UID: `LNEC8VNB2QPwIv6WWQ9lqgR4O5v1`

## Push na GitHub

Přímý `git push` přes proxy nefunguje (403). Použít GitHub API přes Python + PAT:
```bash
python3 -c "... urllib.request PUT na api.github.com/repos/bcmilda/financeflow/contents/..."
```
PAT uložen uživatelem, vždy vyžádat před push operací.

## Aktuální stav (Session 10)

- **Verze:** v7.31 (26 verzí v7.06–v7.31 v Session 10)
- **Moduly:** 25 JS souborů (žádný nový v S10 – jen úpravy stávajících, hlavně projects.js, transactions.js, charts.js, admin.js, receipts.js, assets.js)
- **Hlavní oblasti S10:** Finanční radar (predikce, denní graf, Kam směřuju, 30/60/90 platby, Spending Pace), Komunita 13 oddílů CZ-COICOP + OECD, sdílení partnerů, Finanční obraz (FFR/inflace/diverzifikace/momentum/Asset Allocation).

## Naučené skilly (CLAUDE_SKILLS.md – dodržovat při KAŽDÉ úpravě)

1. **Text/barvy:** na tmavém pozadí NIKDY `var(--text2)`/`var(--text3)` pro důležitý text – volit světlejší (#a8aec8+), větší, barevnější.
2. **Grafy:** osa X i Y s popisky, legenda, tooltip/interaktivita, data nepřekreslují osy. SVG malý viewBox + width:100% → max-width + preserveAspectRatio. Canvas → měřit šířku přes requestAnimationFrame+fallback.
3. **Problikávání:** anti-flicker guard (_dataSig), debounce renderPage, ověřit při přepnutí měsíce.
4. **Reaktivita:** grafy/výpočty vázat na `S.curMonth`/`S.curYear`, ne na `today`.


---

## Session 11 – aktualizace onboarding poznámek

### Aktuální stav projektu (Session 12 start)
- **Verze:** v7.69 | **Doména:** financeflow.cz (LIVE) | **Datum:** 2026-06-09
- **GitHub:** `bcmilda/financeflow` (private, branch `dev`)
- **Firebase projekt:** `financeflow-a249c` (RTDB europe-west1)
- **Admin UID:** `LNEC8VNB2QPwIv6WWQ9lqgR4O5v1`
- **Cloudflare Workers:** AI proxy (`misty-limit-0523.bc-milda.workers.dev`), Push (`financeflow-worker-push.bc-milda.workers.dev`)

### Kritická pravidla (aktualizovaná S11)

#### Version bump – VŠECHNY 4 kroky (OPRAVENO S11)
```bash
# 1. title tag
sed -i 's|v7.68</title>|v7.69</title>|' app.html
# 2. sidebar logo  
sed -i 's|v7.68 · Premium|v7.69 · Premium|' app.html
# 3. O aplikaci banner (POZOR: pattern musí mít >< závorky!)
sed -i 's|>Verze 7.68<|>Verze 7.69<|' app.html
# 4. VERZE_LOG + cache hashe + sw.js CACHE_NAME
```
Ověření: `grep -o 'Verze 7.69' app.html` musí najít shodu.

#### File chaining (nezměněno)
- Vždy edituj z `/mnt/user-data/outputs/`, nikdy z `/mnt/project/` (read-only originals)
- Po každém `str_replace` re-view souboru před další editací
- Windows `\r\n` line endings → použij Python skript místo str_replace

#### Render architektura – nová pravidla (S11)
- `save()` vždy nastaví `_renderForce = true` → user akce = vždy re-render
- `_dataSig()` musí pokrývat VŠECHNY sledované hodnoty (tx, wallets, goals, tagy)
- Inline editory v seznamech: chraň flagem (`_receiptEditorOpen`) před Firebase re-renderem
- Anti-flicker guard blokuje jen TEXT inputy, ne SELECT/button

#### Split double counting (S11)
- VŽDY filtruj `!t.splitParent` ve VŠECH agregacích (getActual, incSum, expSum, allExpTxs, stats...)
- Oprava v jednom místě nestačí – audituj CELÝ codebase

#### Array vs String tagy (S11)
- Nikdy `(x||[]).length` – truthy pro string. Vždy `Array.isArray(x)`
- Array tagy = manuální (modré), String tagy = z účtenky (zelené)

### Soubory nasazení
**Firebase hosting (`firebase deploy --only hosting`):**
14 tracked files: `styles.css`, `app.html`, `sw.js`, `js/app.js`, `js/helpers.js`, `js/ui.js`, `js/transactions.js`, `js/charts.js`, `js/stats.js`, `js/premium.js`, `js/projects.js`, `js/receipts.js`, `js/settings.js`, `js/assets.js`, `js/advisor.js`, `js/admin.js`, `index.html`

**Cloudflare (manuálně přes Dashboard):**
`worker.js` (AI proxy + receipt prompt), `worker-push.js` (push notifikace)

### Otevřené priority pro Session 12
1. 🔴 **Push notifikace na mobil** (TODO-119) – ověřit push_subs/ mobile endpoint + VAPID
2. 🟡 **Slevy z účtenek → Nákupní seznam** (TODO-117) – discount pole hotovo, propojení čeká
3. 🟡 **Google Play TWA wrapper** (TODO-113) – bubblewrap + assetlinks.json
4. 🟡 **Stripe** (TODO-073) – čeká na živnost

---

*Aktualizace Session 11: 2026-06-09 | v7.69*

---

## Session 15 (2026-07-02 → 2026-07-06, v8.57 → v8.74)

> Aktualizace pravidel a stavu projektu pro příští session.

### Aktuální stav projektu (konec Session 15 / start Session 16)
- **Verze:** v8.74 | **Doména:** financeflow.cz (LIVE) | **Datum:** 2026-07-06
- **GitHub:** `bcmilda/financeflow` (private, branch `dev`) – ⚠️ ověřit, zda Milan pushnul v8.58–v8.74 (18 verzí)
- **Firebase projekt:** `financeflow-a249c` (RTDB europe-west1)
- **Admin UID:** `LNEC8VNB2QPwIv6WWQ9lqgR4O5v1`
- **Cloudflare Worker:** `misty-limit-0523.bc-milda.workers.dev` (AI proxy, model `claude-sonnet-4-6`)
- **JS modulů:** 33 (oproti 25 v dřívějším CLAUDE.md – přibyly: kurzy.js, coicop.js, duplicates.js, offline-sync.js, push.js, worker-push.js, product-db.js, sms-import.js, donate.js, announcements.js, share.js, ai.js, import.js)

### Nová kritická pravidla ze Session 15 (viz CLAUDE_SKILLS.md SKILL 5–12 pro detaily)
- Jedinečnost vzoru před hromadným replace (SKILL 5) – způsobilo kritický produkční výpadek (FIX-189).
- Směr metriky (šipka) vs. hodnocení (dobře/špatně) – vždy dvě oddělené proměnné (SKILL 6).
- Sdílené helpery pro metriky na více místech: `computeMonthlyDebtPayments`, `computeEffectiveIncome`, `getIncActual` (SKILL 7–8).
- Normalizace vícero škál: vracet raw i normalizovanou hodnotu (SKILL 9).
- Balance `<div>` po přesunu HTML bloků (SKILL 10).
- GitHub vs lokální stav – ověřit na začátku session (SKILL 11).
- Audit všech spotřebitelů při změně zdroje výpočtu (SKILL 12).

### Kritická technická pravidla (kumulativně, beze změny ze Session 14 + nová)
- `S` deklarováno jako `let` v app.js — **nikdy `window.S`**.
- Nová pole v `S` musí být explicitně v `saveToFirebase` schématu.
- `position:sticky` selže při `overflow:hidden` na ancestor.
- Canvas grafy vyžadují hex barvy (ne CSS `var()`) + DPR škálování.
- Transakce vždy čteny jako `t.amount || t.amt || 0`.
- Split transakce: vždy filtrovat `!t.splitParent`.
- `isTransferTx(t)` vylučuje přesuny ze statistik, ne ze zůstatků peněženek.
- Version bump = title + sidebar + banner + CACHE_NAME + sha256 hashe + VERZE_LOG + hlavičky VŠECH změněných souborů.
- CRLF soubory (Python `io.open(newline='')`): assets.js, push.js, debts.js, premium.js, settings.js, budouci.js, share.js, worker.js, duplicates.js.

### Klíčové helpery ze Session 15 (helpers.js)
```javascript
txCZK(t, D)                    // částka transakce v CZK (amtCZK → fallback toCZK)
getIncActual(catId,sub,m,y,D)  // příjmová obdoba getActual (FIX-187)
computeMonthlyDebtPayments(D)  // sdílené splátky dluhů (FIX-188)
computeEffectiveIncome(D)      // sdílený efektivní příjem (FIX-188)
_SCORING                       // Milanovy plné bodovací tabulky (ADR-085)
msc_S1/msc_DTI/msc_DSTI/msc_S3/msc_S4/msc_BONUS  // lookup funkce nad _SCORING
baseCur()/czkToBase()/fmtB()/fmtBP()  // základní měna (ADR-080)
```

### Otevřené priority pro Session 16
1. **TODO-153** (🟡 P2): Stripe webhook implementace – čeká na Milanovo dodání Payment Link URL + `sk_test_/whsec_` klíčů do Cloudflare Secrets.
2. **TWA Google Play** – ikony hotové (v8.69), zbývá finalizace přes PWABuilder + Play Console upload.
3. Zvážit rozšíření Dluhového stres indexu o plné Milanovy tabulky i pro faktory "počet půjček" a "rizikové typy" (aktuálně vlastní 4-skoková logika, záměrně ponechána kvůli odlišné škále 0–100 kde víc = hůř).
4. **TODO-154** (🟢 P3): MacroDroid parser – odloženo, čeká na TWA nativní řešení.

---

*Aktualizace Session 15: 2026-07-06 | v8.57 → v8.74 | FIX-174–191 · ADR-079–085 · TODO-144–159*
