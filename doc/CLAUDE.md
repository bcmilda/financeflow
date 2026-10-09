# FinanceFlow – Claude kontext

> **Zdrojový soubor (základ):** `CLAUDE(1).md` (Session 6 verze)
> **Aplikované patche Session 6:** sekce CLAUDE.md ze souboru `patch_s6.md` (Session 6, 2026-04-23)
> **Doplnění Session 7:** nové JS soubory, počet modulů, pravidlo chainování (2026-05-15)
> **Datum poslední aktualizace:** 2026-08-24 (Session 19, druhá vlna) — viz `patch-session19-FINAL.md` a `OTEVRENE-body-s19.md`
> **Doplnění Session 23** (2026-09-25): tři nová pravidla v sekci „Pravidla pro AI asistenta" + sekce Session 23 na konci souboru.
> **Doplnění Session 25** (2026-10-09): na konci souboru nová sekce „Session 25 (2026-10-05 až 2026-10-09) · v11.30 → v11.57“ včetně dodatku v11.28–v11.30. Přehled v `doc/Summary_s25.md`.

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
- `js/` — 37 modulů **(Session 18, 2026-08-03)** (charts.js, admin.js, ai.js, budouci.js, assets.js, advisor.js, report.js, inflace.js, review.js, atd. — počet ověřen `ls *.js | wc -l`, dřívější čísla 25/33 v tomto souboru byla zastaralá)
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

- **Hlášení změn s CESTOU v appce (S23)** – u každé upravené karty uvést, kde ji uživatel najde:
  „Opravil jsem kartu: cesta: Finanční obraz → Kam směřuju". Stejně ve VERZE_LOG i v patchi.
  Důvod: v appce jsou karty se stejným názvem na různých místech. Viz SKILL 54.

- **Bump jen SKUTEČNĚ změněných souborů (S23)** – přepsaná hlavička změní hash a vynutí zbytečné
  nahrání souboru, ve kterém se nic nestalo. Po bumpu ověřit VŠECHNY ?v= hashe v app.html,
  ne jen ty měněné. Nasazení pouze worker.js (Cloudflare) NEZVYŠUJE verzi appky – hlavička
  workeru se srovná s nejbližším vydáním appky. Viz VERSIONING.md.

- **Před nasazením vždy `node tools/check_tdz.js <změněné soubory>`** – v S23 dvakrát odhalil
  chybu, která by shodila celou stránku (volání neexistující funkce, kód vložený do špatné funkce).

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

### Aktuální stav projektu (konec Session 17 / start Session 18)
- **Verze:** v9.42 | **Doména:** financeflow.cz (LIVE) | **Datum:** 2026-08-01
- **JS modulů:** 37 (+ `report.js`, `inflace.js`, `review.js` ze Session 17)
- **💳 PLATBY SPUŠTĚNY** — Stripe webhook, Payment Links, zakládající cena 99 Kč/990 Kč pro prvních 100, Customer Portal, Audit plateb v admin panelu
- **Ceník:** Free 0 · Premium 149 Kč/měs (1490/rok) · Pro 299 Kč (zatím „Brzy") · zakládající 99/990
- **Trial:** 30 dní, **bez karty**, nepřeklápí se automaticky (ADR-064). Trial ve Stripe se NEPOUŽÍVÁ.
- **Nasazují se ZVLÁŠŤ:** `worker.js` (Cloudflare) · `database_rules.json` (Firebase Console) · `.nojekyll` (kořen repa, řeší pád GitHub Pages buildu)

### ⚠️ Kritická pravidla ze Session 18 (detaily v CLAUDE_SKILLS.md SKILL 23–25)
- **`node --check` nezachytí "použito před deklarací" (TDZ)** (SKILL 23) — čtyři pády appky na produkci ve stejné session, vždy stejná chyba. Spouštět `node tools/check_tdz.js` PŘED každou dodávkou (vyžaduje `npm install --save-dev acorn acorn-walk` v repu, jednorázově).
- **Ověřovat názvy funkcí a CSS tříd v kódu, ne odhadovat** (SKILL 24) — `toast()` vs. skutečné `showToast()`, `modal-content` vs. skutečné `overlay`/`modal-head`. Grep před psaním, ne po chybě.
- **Postavit jen to, co řeší existující problém** (SKILL 25) — okno diff-read 12M postaveno a v téže session odstraněno, protože ho nikdo nepotřeboval. Zeptat se „máš tenhle problém?" dřív než na řešení.
- **Aktualizovat všechny dotčené `.md` soubory, ne jen 5–6 z 18** — Milan upozornil na S18, že GLOSSARY/SECURITY/architecture/context/explanations/VERSIONING/formulas/Resume zůstávaly týdny pozadu. Postup: viz `UPDATE_RULES.md`.

### ⚠️ Kritická pravidla ze Session 17 (detaily v CLAUDE_SKILLS.md SKILL 13–22)
- **Firebase `.write` KASKÁDUJE, `.validate` NE** (SKILL 13) — způsobilo díru, kterou si mohl kdokoli zapsat Premium zdarma. Data, která uživatel nesmí měnit, patří **mimo** `users/{uid}`.
- **Co není v pravidlech povoleno, je zakázáno** — nový uzel v kódu bez pravidel = tichý PERMISSION_DENIED (FIX-220 shodil celý trial).
- **`node --check` nestačí u refaktorů** (SKILL 14) — `ReferenceError` shodil celou aplikaci. Nutný runtime smoke test.
- **`window.open` musí být synchronní s klikem** (SKILL 15) — po `await` ho prohlížeč blokuje jako popup.
- **Nepsat znovu, co už existuje** (SKILL 17) — Inflace duplikovala výpočty ze Zdražování a znovu vyrobila už opravené chyby.
- **`txCZK` + vyloučení `splitParent`/`isBalancing`/`isTransferTx`** (SKILL 20) — třikrát v jedné session stejná chyba.
- **`lineTotal` je zdroj pravdy** (SKILL 19, ADR-059) — `price × qty` ignoruje slevy.

### Stav projektu (konec Session 15 / start Session 16) — historické
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

---

## Kritická pravidla ze Session 19 (2026-08-21)

> Verze **v9.79 → v9.98** (20 verzí), **38 modulů** (nový `pristi.js`).
> Detail v `patch-session19-FINAL.md`, nové ADR-099 až ADR-108, SKILL 26–30.

### Nejdůležitější poučení

**Opravuješ-li VZOR, prohledej všechny jeho výskyty** (SKILL 27). FIX-073, FIX-119
i S16.13 opravily místo, kde se chyba ohlásila, ne vzor — proto tatáž chyba přežila
v `getHistAvg()` až do S19 a týkala se **celého predikčního enginu včetně finančního skóre**.

**Před opravou sdíleného výpočtu prověř všechny spotřebitele** (SKILL 12).
ADR-100 je případ, kdy by plošná oprava vrátila `totalSaved = 0` a poctivě spořícímu
uživateli by spadlo Finanční skóre až o 35 bodů.

**Nesbírej data, ze kterých nikdy nevznikne spolehlivá odpověď** (SKILL 28).
`t.enteredAt` zaveden ve v9.92 a o verzi později zrušen.

### Nové v datovém modelu
`t.currency` · `t.fxRef` · `t.fxRefDate` (pár s `amtCZK`, ADR-101) ·
`S.pristiCfg` · uzly `users/{uid}/activity` a `users/{uid}/backups`.
**Firebase pravidla se nemění** — vše kaskáduje z `users/$uid`.

### Nasazuje se zvlášť
`worker.js` (Cloudflare) — od v9.97 přijímá `/cnb?date=DD.MM.RRRR`.
Dokud se nenahraje, klient používá dnešní kurzy a nic se nerozbije.

### Před každou dodávkou
```bash
node tools/check_tdz.js js/*.js          # potřebuje vidět VŠECHNY moduly + app.html
for t in tools/smoke_*.js; do node $t; done
```
`tools/**` je v `firebase.json` v `ignore` → nikdy se nenasadí.
⚠️ Doplnit do `KNOWN` v `check_tdz.js`: `getComputedStyle`, `File`, `Response`,
`Request`, `self` — jinak hlásí ~55 falešných chyb (TODO-222).

### Milanova rozhodnutí z S19
- Popisek částky u transakce = **měna peněženky**, ne základní měna
- Měsíční review zůstává **zdarma** pro všechny tarify
- Osa života se **neořezává** — mění se hustota, ne rozsah
- Denní doba u vzorců se **nesleduje** (ADR-104)
- Portfolio ceny (TODO-201) odloženo


---

## Doplněno po hloubkové analýze (v10.03, 2026-08-24)

**Verze v10.03**, 38 modulů, **17 nástrojů** v `tools/`.
Nové SKILL 31–33, ADR-109 až ADR-115, FIX-262 až FIX-271.

### Tři poučení, která stojí za zapamatování

**Absence dat není informace (SKILL 31).** `debts.length === 0` neznamená „nemá dluh",
`!snap.exists()` neznamená „smazáno" ani „nový uživatel". Tři různé chyby S19
(skóre, FIX-264, FIX-265) měly tentýž kořen.

**Odhady se nesčítají (SKILL 32).** Detektor sčítal dvanáct koeficientů, které se
navzájem překrývaly, a vyšlo mu 110 % z útraty, kterou uživatel má.

**Falešná shoda je horší než žádná (SKILL 33).** Rozdělíš-li, co patří k sobě,
přijdeš o data. Sloučíš-li, co k sobě nepatří, vyrobíš dezinformaci.

### Před nasazením
```bash
node tools/check_tdz.js js/*.js
for t in tools/smoke_*.js; do node $t; done
```
⚠️ **`worker.js` se nasazuje zvlášť do Cloudflare** — od v9.97 přijímá `/cnb?date=`.

### Bezpečnostní připomínka
Ani v „špatném příkladu" v dokumentaci nepiš klíč, který vypadá jako pravý.
GitHub Secret Scanning kvůli tomu v S19 zablokoval push.

---

## Stav po Session 21 (v10.50)

**41 JS modulů** (nové `js/ucet.js` a `js/vyplatnice.js`), **29 nástrojů** v `tools/`.

Poslední verze session: **v10.59**.

### Nasazení – tři vrstvy
1. `database_rules.json` → **Firebase Console** (VŽDY první)
2. `worker.js` → **Cloudflare Dashboard**
3. zbytek → GitHub

V S21 se pravidla měnila **čtyřikrát**: v10.36 (pozvánkové tokeny),
v10.40 (fáze 2 – partneři už nečtou `/data`), v10.41 (uzel `households`),
v10.51 (uzel `deletedAccounts`). Worker se měnil dvakrát: v10.30 (idempotence
Stripe webhooku) a v10.51 (endpoint `/cancel-subscription`).

⚠️ `database_rules.json` je **JSONC**. Komentáře smí být jen řádkové (`//`).
Klíč `"//": "text"` Firebase chápe jako název uzlu a spadne na
`Syntax error … Expected '{'`.

### Před nasazením
```bash
node tools/check_tdz.js js/*.js      # 4 pre-existující nálezy (firebase.js = ESM)
for t in tools/smoke_*.js; do node $t; done
```

`check_tdz.js` v S21 zachytil `logout NENI NIKDE DEKLAROVANE` (správně `signOut`)
uvnitř funkce mazání účtu — `node --check` by to pustil a projevilo by se to až
po nevratném smazání dat.

### Co se v S21 opakovaně ukázalo

- **Testy potvrzovaly vady jako správné chování** – třikrát. Viz SKILL 34.
- **Testy kontrolovaly tvar kódu místo chování** – FIX-310 šel do produkce
  s „zeleným" testem. Viz SKILL 35.
- **Refaktor rozdělující funkce shodí extrakci v testech** – čtyřikrát,
  pokaždé až runtime. Viz SKILL 36.
- **Když je test červený, první otázka je „nemýlím se v testu?"** – u rodinných
  souhrnů byl kód v pořádku a špatně jsem četl testovací data.

### Výplatnice – co si pamatovat

Model je ověřený na 19 skutečných páskách. Tři věci, které nejsou zřejmé:
- páska pracuje se **dvěma hodinovými sazbami** – tarifní (`tarif ÷ fond`) pro
  základ a přesčas, průměrný výdělek (PPÚ) pro **všechny příplatky**
- **pojistné se zaokrouhluje nahoru**, základ daně nahoru na celé stovky
- **PENZ a DPS jsou průchozí** a ruší se; do součtů nepatří ani jednou

Chybějící řádek na pásce **neznamená nulu** (ADR-129). Do porovnání prémií
smí jen **pravidelné** – jednorázové odměny posunou průměr o tisíce a detektor
pak potvrdí přesun, který se nestal (SKILL 42).

### Sdílení – co si pamatovat

`users/{X}/partners` znamená **„kdo smí číst X"**, ne „koho X čte". Ty dvě
interpretace se shodnou jen v symetrickém případě, což je důvod, proč sdílení
chvíli fungovalo a chvíli ne (FIX-308, FIX-311).

Nevratná akce musí uklidit i `shared`, `backups` a komunitní záznamy — jinak
data zmizí jen vlastníkovi (FIX-324, SKILL 41).

### Bezpečnostní připomínka
Ani v „špatném příkladu" v dokumentaci nepiš klíč, který vypadá jako pravý.
GitHub Secret Scanning kvůli tomu v S19 zablokoval push.

---

# Session 22 (2026-09-12 až 2026-09-16) · v10.59 → v10.82

## Co se změnilo v jádře
- **42 modulů** (přibyl `poznamky.js` – deníkové poznámky k výdajům)
- **Skóre i Obraz mají konfiguraci v datech** – `_SCORING_V2` a `_OBRAZ_V1`
  v `helpers.js`. Váhy a kotvy se ladí v admin simulátoru, ne v kódu.
- ⚠️ **`_SCORING` (stará) zůstává** – čte ji Dluhový stres index a části
  Obrazu. Nemazat (`decisions.md` ADR-149).
- **Jedna účtenka = jedna transakce** (dřív se dělila po kategoriích).
  Kategorie žijí na položkách v `receiptItems`.

## Nová pravidla pro práci
- **Bump verze se musí OVĚŘIT**, ne jen provést. `CACHE_NAME` v `sw.js` uvízl
  na v10.66 po třinácti verzích, protože náhrada měla v kotvě datum a tiše
  přestala fungovat. Viz `VERSIONING.md`.
- **Testy jsou nástroj session, ne Milanův postup.** Milan je nespouští.
  Mají cenu uvnitř session; posílat je k nasazení jako „pojistku" nemá smysl
  (`CLAUDE_SKILLS.md` SKILL 48).
- **MD-Diff se už nepoužívá** – living docs aktualizuje Claude přímo,
  připojením sekce na konec souboru. Nikdy nepřepisovat.

## Stav k nasazení
24 verzí ověřených jen v testovacím prostředí. Kompletní průchod načisto je
TODO-263 s prioritou P1.

Pořadí nasazení: `database_rules.json` → Firebase · `worker.js` → Cloudflare ·
zbytek → GitHub. ⚠️ Nový soubor `poznamky.js`.

---

# Session 23 (2026-09-25) · v10.82 → v11.04

## Co se změnilo v jádře
- **Jednotná normalizace názvů položek** – `normName()` / `normQty()` / `normKey()` v `helpers.js`
  (přepojeno 9 míst, starý klíč se kvůli zpětné kompatibilitě dál čte).
- **Jedna zobrazovaná škála skóre** – `scoreZobrazeni(sc)` v `premium.js` (Dashboard i report).
  Výpočet `computeFinancialScore` beze změny (`decisions.md` ADR-153).
- **Peníze se zapisují jedinou cestou – transakcí** (ADR-158); vlastní položky Příštího měsíce
  už nevznikají.
- **Archiv dokladů v Cloudflare R2** (bucket `ff-uctenky`, EU), v RTDB jen `photoKey` (ADR-156, 157).
- **Play režim** – `isPlayApp()`, příznak v `sessionStorage`, ne `localStorage` (SKILL 61).
- **Hosting bez catch-all rewrite** – chybějící soubor vrací skutečnou 404 (`404.html`, SKILL 60).

## Nová pravidla pro práci
Viz sekce „Pravidla pro AI asistenta" výše (cesta v appce, bump jen změněných souborů,
`check_tdz.js` před nasazením) a `CLAUDE_SKILLS.md` SKILL 50–62.

## Nasazuje se zvlášť
- `worker.js` → Cloudflare (proměnné `ARCHIV` = R2 binding, `CSU_VYBER_URL` volitelná, `RESEND_API_KEY`).
  Samotné nasazení workeru nezvyšuje verzi appky (`VERSIONING.md`, Session 23).
- `firebase.json` (rewrites, ignore, hlavičky) a nové soubory `icons/`, `.well-known/assetlinks.json`,
  `404.html`, `ean.html` – podrobně `architecture.md`, Session 23.

## Otevřené P1
TODO-301 (druhý otisk do `assetlinks.json` po nahrání do Play) · TODO-312 (Mapa položek – osobní vrstva F3).

---

# Session 24 (2026-09-26 až 2026-10-03) · v11.04 → v11.26

## Co se změnilo v jádře
- **47 modulů** – nové `ean-sken.js`, `taxonomie.js`, `vozidla.js`, `meridla.js`, `coicop-ai.js` (+ `data/taxonomie.json`).
- **Menu Měřidla** (Vozidla a tankování, Energie a voda).
- **Vlastní uzly mimo `users/{uid}/data`** – při přidání dalšího vždy doplnit mazání a zálohu (SKILL 65).

## Nová pravidla pro práci
- **Výstupy v `/mnt/user-data/outputs/` během session NEMAZAT** – Milan nasazuje i několik verzí najednou (SKILL 69).
  Soubory posílat jednotlivě, ne v zipu.
- **MD soubory se aktualizují jen jednou, na konci session** (připojit sekci, nikdy nepřepisovat).
- CRLF soubory (`settings.js` aj.) brát z Projektu a zachovat konce řádků (SKILL 63).

## Nasazuje se zvlášť
- `database.rules.json` → Firebase (nové `community/eanProdukty` admin zápis, `eanNavrhyNazvu`, `coicopNavrhy`).
- `worker.js` → Cloudflare (v11.24: `/ean` s AI a fotkami, `/coicop`, limity Free).

## Otevřené P1/P2
TODO-301 (otisk Play) · TODO-316 (MD na GitHub) · TODO-317 (report PDF F2) · TODO-322 (vyzkoušet v11.15–v11.26).

---

# Session 25 (2026-10-05 až 2026-10-09) · v11.30 → v11.57

## Co se změnilo v jádře
- **Synchronizace (v11.52)** je teď vrstva v `app.js` (blok „S25 (v11.52) – AUDIT“, ADR-195 až ADR-198):
  - ozvěna vlastního zápisu = nic
  - čistá změna se sloučí na místě
  - změna, která ještě neodešla, se sloučí tří-cestně (základ / tady / jinde)
  - offline se zapisují jen transakce
  - účtenky mají stálé id
- **Před každou změnou, která sahá na `S.*` mimo `save()`**, platí:
  - objekt hledat podle id, ne podle pozice
  - nedržet si odkaz na objekt přes `await` (synchronizace ho mohla nahradit)
  - nové pole dat registrovat v `_DW_META` a na všech místech v `app.js`
- **Rozpracovaná práce:** nová obrazovka s formulářem nebo editorem označit `data-rozprac` nebo nastavit `_ffRozprac.formular`. Překreslení ze synchronizace volat přes `ffRenderBezpecne`.
- **Dlouhá akce** (AI, upload) běží přes čekací okno `ffCekaniStart / Krok / Konec`. Zámek proti dvojímu spuštění musí být synchronní.
- **Nové moduly:** `statistika-polozek.js`, `ceny-kraje.js`. Data: `coicop2018.json`.

## Nová pravidla pro práci (S25)
- **Opakuje-li se stejný druh chyby, nehledat další projev, ale společnou příčinu** (SKILL 71). Milan: „Toto se musí odhalit a napravit.“
- **U kritických změn negativní kontrola + nezávislá revize** (SKILL 72, 73). Nový test musí na starém kódu selhat. Revizi dělá agent, který kód nepsal.
- **Na kartě nikdy nepřebírat hodnotu mezi významově různými poli** (zkratka z účtenky ≠ název z obalu, SKILL 76).
- **Každou upravenou kartu ověřit v Chromiu na šířce telefonu** a uvést přesnou cestu v appce (SKILL 77).
- **Staré TODO vysvětlovat z `todo.md`, ne z paměti** (SKILL 78).
- **Jeden bump na odpověď.** Výstupy nemazat, soubory posílat jednotlivě s původními názvy.
- **Ceny od ostatních lidí** jen jako souhrny, zobrazené od 3 lidí, nikdy lékárna a zdraví (ADR-189).

## Nasazuje se zvlášť
- `database.rules.json` → Firebase (v11.39: `community/ceny`).
- `worker.js` → Cloudflare (v11.57). Nové jsou `/ceny` a `/report-ai`, `/ean` má navíc `ziviny`, `odebrat` a fotku `popisek`. Proměnné `CF_ACCOUNT_ID`, `CF_BR_TOKEN` (od v11.28).

## Otevřené P1/P2
TODO-332 (vyzkoušet v11.31–v11.57) · TODO-323 (ikony) · TODO-328 (zkrácení MD) · TODO-330 (`FIREBASE_SERVICE_ACCOUNT`) ·
TODO-331 (Google Play) · TODO-316 (MD na GitHub).
