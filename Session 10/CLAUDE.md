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
