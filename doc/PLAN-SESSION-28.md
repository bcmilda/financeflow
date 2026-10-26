# Plán · Session 28 (web FinanceFlow)

> Připraveno na konci Session 27 (2026-10-23). Výchozí stav: **v12.10** (lokálně, Milan nahrává přes GitHub Desktop). Pravidla DB v11.89, worker v11.61, testy 186 sad + `smoke.js`.
> Pracovní jazyk čeština. Číslo další verze: **v12.11**.

## 0 · Na začátku
1. Přečíst `doc/CLAUDE.md` (sekce Session 27), `doc/Summary_s27.md`, tento plán, `doc/todo.md` od TODO-358.
2. Zkontrolovat Projekt a paměť (SKILL 97) – rozhodnutí nativní session N2 (`claude/PLAN-SESSION-N2.md`).
3. Ověřit, co je na GitHubu (`dev`) – Milan nahrává sám; začít od toho, co tam je. **Nepushovat** bez Milanova výslovného pokynu.

## 1 · Zeptat se Milana hned na začátku
| # | Otázka | Doporučení |
|---|---|---|
| 1 | Co z v11.90–v12.10 nefunguje na skutečných datech (TODO-365)? | Nejdřív opravy |
| 2 | Postavit 🔗 Spojit s… (TODO-358)? | Ano, malé a jasné |
| 3 | Poslal `categories.json` pro revizi kategorií (TODO-361)? Káva: výběrová kategorie, nebo Sledovaná témata? | Sledovaná témata jako vrstva |
| 4 | `legal.html` – jméno / IČO / sídlo (TODO-364) | Před produkcí na Play |
| 5 | Smazat `vyplatnice-import.json` z repa (TODO-343)? | Ano |

## 2 · Milan vyzkouší (v11.90–v12.10)
- **Kalkulačky** na skutečných datech, Cena zlozvyku z účtenek.
- **Účtenky:** ruční účtenka, víc druhů u zkratky, tag v editoru.
- **Měsíc jako měsíc:** Čistý majetek a skóre při přepnutí měsíce, Změny půjčky, Splátkový kalendář, splátka ze šablony.
- **Ceny a obchody:** Zdražování → Podle výrobků (Penny, EVO 95), Trend obchodů, Report strana 3, Grafy → 🏪 Obchody, jednotky v seznamu položek.
- **Mapa položek:** ✎ Opravit název, 📅 otevřít účtenku, 🔄 Opravit kategorii u starých účtenek, pasti (makový hřeben, Smet.krem, drůbeží hamburger, nektarinky).
- **Nákupní seznam:** našeptávač, hlídání ceny.
- **Google Play:** otevře se appka z interního testování bez adresního řádku (po nasazení `assetlinks.json`)?

## 3 · Stavět (pořadí)
### 3.1 · Opravy z testu (TODO-365)
### 3.2 · 🔗 Spojit s… (TODO-358, ADR-244)
- Karta → vybrat jinou svou kartu (našeptávač karet), hlavní název, zkratky jako aliasy; zapamatovat zkratku → kartu (osobní, `S.uiCfg`), `mapaUzivData` skupiny podle aliasu. Zrušit spojení ✕ u aliasu. Text účtenky beze změny.
- **Hotovo, když:** brambory ze tří obchodů = jedna karta „Brambory konzumní“ se 3 aliasy, další účtenka se zkratkou padne do karty, test, kontrola na šířce telefonu.
### 3.3 · Revize kategorií (TODO-361) – až přijde `categories.json`
### 3.4 · Google Play (TODO-363) – příští AAB minSdk 24, versionCode 2, stejný keystore; Data safety podle `google-play.md`
### 3.5 · Pokud zbude čas
TODO-359 AI fronta Mimo taxonomii (worker endpoint – předem říct) · TODO-362 Inbox · TODO-345 / 346 výplata · TODO-360 karta bez kódu (až Milan rozhodne).

## 4 · Postup každé verze (připomínka)
- Hlavička `// FinanceFlow · vX.YY · soubor.js · datum` jen ve změněných souborech, VERZE_LOG v `js/admin.js`, `sw.js` (hlavička + `CACHE_NAME`), `app.html` (title, small, „Verze“), `?v=` hash změněných souborů. Data: `TAX_URL` / `product-groups.json?v=`.
- Celá sada testů v ploché složce, Chromium na šířce telefonu, cesta v appce u každé změny.
- Výstupy do `/mnt/user-data/outputs/vX.YY/` (jen změněné), posílat jednotlivě, nemazat.
- MD jen doplňovat na konci session. Neměnit, co nebylo zadáno. Žádné jméno uživatele v UI. Worker neměnit bez důvodu. `signing.keystore` nikdy do repa.

---

## Aktualizace 2026-10-26 (po v12.12) – platí přednostně před body výše

> Výchozí stav: **v12.12** (lokálně, 28 commitů, Milan nahrává přes GitHub Desktop). Pravidla DB v11.89, worker v11.61, testy 189 sad + `smoke.js`. Číslo další verze: **v12.13**.

### Změny proti plánu výše
- **3.2 🔗 Spojit s… je hotové** (v12.12, ADR-249) – otázka 2 odpadá. Milan jen vyzkouší.
- Navíc postaveno v12.11–v12.12: Analýza účtenek od vybraného měsíce (ADR-248), report strana Obchody (ADR-250), převodník měn, narozeniny s druhem a věkem (ADR-251), FIX-493.

### Zeptat se Milana (doplněk k tabulce v bodě 1)
| # | Otázka | Doporučení |
|---|---|---|
| 1 | Co z **v11.90–v12.12** nefunguje na skutečných datech (TODO-365)? | Nejdřív opravy |
| 6 | Postavit rozklik „🧭 Za co utrácíš“ s grafem po měsících (TODO-372)? | Ano, jedna verze |
| 7 | Karta bez kódu – „Vážené / Bez kódu“ (TODO-360): rozhodl? | Až po rozhodnutí |
| 8 | Grafy → 🏪 Obchody také podle vybraného měsíce (TODO-373)? | Jen když chce |

### Milan vyzkouší navíc (v12.11–v12.12)
- **Analýza účtenek:** přepnout měsíc nahoře → Statistiky (📅 / ∞ Vše), Nejčastější položky 1M–12M, Trend, Slevy, Srovnání ČR (popisek roku), Učení → Nákupní DNA a Trend obchodů (bublina na telefonu, rok), bez probliknutí.
- **Mapa položek → 🔗 Spojit s…:** brambory ze tří obchodů do jedné karty, další účtenka padne do karty, ✕ Odpojit.
- **Report:** strana 4 Obchody (3 největší / nejmenší nákupy, srovnání s minulým měsícem), celkem 5 stran.
- **Kurzy měn → 💱 Převodník**, **Narozeniny → druh a rok** (Dashboard, Budoucí platby).

### Pořadí stavby (nahrazuje bod 3)
1. Opravy z testu (TODO-365).
2. TODO-372 rozklik Za co utrácíš (pokud ano).
3. Revize kategorií (TODO-361) – až přijde `categories.json`.
4. Google Play (TODO-363).
5. Pokud zbude čas: TODO-359 AI fronta (worker – předem říct), TODO-362 Inbox, TODO-345 / 346 výplata, TODO-360 (po rozhodnutí), TODO-373.
