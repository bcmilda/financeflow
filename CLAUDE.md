# FinanceFlow – Claude kontext

> **DŮLEŽITÉ:** Tento soubor obsahuje pouze základní přehled. Pro plný kontext si přečti relevantní `.md` soubory ve složce `doc/` podle potřeby a aktuálního úkolu.

## Projekt

**FinanceFlow** je webová aplikace pro správu rodinných financí (příjmy, výdaje, půjčky, projekty, AI analýzy). Postavená jako SPA (Single Page Application) — čistý HTML/CSS/JS bez frameworku, backend je Firebase.

## Architektura

- `index.html` — hlavní a jediný HTML soubor (SPA)
- `css/styles.css` — veškeré styly
- `js/` — moduly (charts.js, admin.js, ai.js, atd.)
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

### Pravidla pro složku `docs/` (pracovní, Claude Code)
- Volný přístup — lze vkládat, přepisovat i mazat dle libosti
- Slouží pro poznámky, rychlé náhledy a pracovní podklady před implementací do `doc/`

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
