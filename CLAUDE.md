# FinanceFlow – Claude kontext

> **DŮLEŽITÉ:** Tento soubor obsahuje pouze základní přehled. Pro plný kontext si přečti relevantní `.md` soubory ve složce `doc/` podle potřeby a aktuálního úkolu.

## Session start — povinné čtení

Na začátku každého sezení si přečti následující soubory, než začneš cokoliv dělat:

1. Tento soubor (`CLAUDE.md`)
2. **Firebase Security Rules** — [`database.rules.json`](https://github.com/bcmilda/financeflow/blob/dev/.github/workflows/database.rules.json) — pravidla přístupu k Realtime Database
3. **Cloudflare Worker** — [`worker.js`](https://github.com/bcmilda/financeflow/blob/dev/cloudflare-worker/worker.js) — proxy vrstva mezi aplikací a externími API

---

## Projekt

**FinanceFlow** je webová aplikace pro správu rodinných financí (příjmy, výdaje, půjčky, projekty, AI analýzy). Postavená jako SPA (Single Page Application) — čistý HTML/CSS/JS bez frameworku, backend je Firebase.

---

## Struktura složek na disku

> **KRITICKÉ:** Existují DVĚ složky – neplést!

- `C:\Users\Milan\Desktop\FinanceFlow\DEV\` — pracovní složka (zde Claude edituje soubory přes MCP)
- `C:\Users\Milan\Desktop\FinanceFlow\financeflow\financeflow\` — git repozitář (odsud Milan provádí `git push` + `firebase deploy --only hosting`)

**Workflow při opravě:**
1. Claude upraví soubory v `DEV/`
2. Milan zkopíruje změněné soubory z `DEV/` do `financeflow/financeflow/`
3. Milan udělá commit + push z `financeflow/financeflow/` (přes GitHub Desktop nebo cmd)
4. Milan spustí `firebase deploy --only hosting` z `financeflow/financeflow/`

---

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

---

## Firebase

- **Projekt ID:** `financeflow-a249c`
- **Hosting:** Firebase Hosting
- **DB:** Realtime Database (`financeflow-a249c-default-rtdb.europe-west1`)
- **Auth:** Google Sign-In + anonymous

---

## Git workflow

```
dev  →  main
(test)   (produkce)
```

- `dev` → automatický preview deploy (GitHub Actions) při každém push
- `main` → live deploy (GitHub Actions) při každém push
- Merge `dev` → `main` provádí vlastník (bcmilda) po otestování

---

## Konvence

- Verze v titulku `index.html`: `<title>FinanceFlow vX.XX</title>`
- Changelog verzí: pole `VERZE_LOG` v `js/admin.js` (záložka Verze v admin panelu)
- Při každé změně zvýšit verzi a přidat záznam do `VERZE_LOG`
- `.env` obsahuje `RESEND_API_KEY` — nikdy necommitovat (je v `.gitignore`)
- Admin panel přístupný pouze pro UID: `LNEC8VNB2QPwIv6WWQ9lqgR4O5v1`

### ⚠️ Pravidlo: Aktualizace index.html při změně JS souboru

> **VŽDY** kdykoliv Claude upraví jakýkoliv soubor v `js/`, musí také:
>
> 1. Aktualizovat **verzi** v `<title>FinanceFlow vX.XX</title>` (řádek 6, increment +0.01)
> 2. Aktualizovat **verzi** v sidebar logu: `<small>vX.XX · Premium</small>`
> 3. Aktualizovat **cache-busting hash** změněného JS souboru na řádku `<script src="js/XYZ.js?v=HASH">` — hash = prvních 8 znaků MD5 nového souboru
> 4. Přidat záznam do `VERZE_LOG` v `js/admin.js` s datem a popisem změn
>
> **Proč:** Bez nového hashe browser cachuje staré JS soubory a opravy se neprojeví.
>
> **Jak spočítat hash:** `md5sum js/helpers.js | cut -c1-8`

---

## Push na GitHub

Přímý `git push` z `DEV/` nefunguje — repozitář je v `financeflow/financeflow/`.
Milan provádí push ručně přes GitHub Desktop nebo CMD z `financeflow/financeflow/`.
