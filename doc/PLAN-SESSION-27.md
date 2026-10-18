# Plán · Session 27 (web FinanceFlow)

> Připraveno na konci Session 26 (2026-10-18). Výchozí stav: **v11.89** nasazená, na GitHubu `dev`. Pravidla DB v11.89, worker v11.61, testy 167 / 0.
> Pracovní jazyk čeština. Číslo další verze: **v11.90**.

## 0 · Na začátku
1. Přečíst `doc/CLAUDE.md`, `doc/Summary_s26.md` (hlavně „Pokračování“), tento plán, `doc/todo.md` od TODO-342.
2. **Zkontrolovat Projekt** (SKILL 97): `claude/PLAN-SESSION-N2.md` a rozhodnutí N-xxx paralelní nativní session. Nic, co se překrývá s nativní appkou, nestavět bez souhlasu.
3. `git fetch` – Milan nahrává sám, začít od `origin/dev`.

## 1 · Rozhodnutí od Milana (zeptat se hned na začátku)
| # | Otázka | Doporučení |
|---|---|---|
| 1 | ~~TODO-357~~ ✅ rozhodnuto 18. 10.: **b)** Inbox pokračuje (ADR-232). Zkontrolovat stav APK v `bcmilda/financeflow-inbox` (TODO-354) | – |
| 2 | Smazat `vyplatnice-import.json` (skutečné výplatnice) z veřejného repa? | Ano, i z historie |
| 3 | Push: PAT není potřeba (GitHub připojení session), před pushem se zeptat | – |

## 2 · Milan vyzkouší (v11.84–v11.89)
- **Měřidla:** odečet elektřiny s VT/NT, úprava a smazání odečtu, hromadný import z innogy, plyn a voda, zálohy jako opakovaná platba, doplatek po vyúčtování.
- **Transakce:** štítky aktivních filtrů, přepnutí měsíce vypne „všechny měsíce“.
- **Účtenky:** prohozené datum (1/10 vs. 10. 1.), Podezřelé u ruční transakce = položka účtenky.
- **Vozidla:** tankování z účtenky benzínky bez ruční transakce, úprava transakce nemaže tankování, graf ceny za litr.
- **Výplatnice:** megagraf jako samostatná stránka, osy, od ledna, otázky „kolik dovolené zbývá“ a „seřaď hrubou mzdu“.

## 3 · Stavět (pořadí)
### 3.1 · 🧮 Kalkulačky – TODO-356 + TODO-355 (v11.90–v11.9x)
- Nová stránka v menu, modul `js/kalkulacky.js`, 🔮 Finanční simulace odkáže sem.
- Monte Carlo jako čistá funkce `mcSimuluj(n, krok)` → percentily (P5, P25, P50, P75, P95), v testech pevný seed.
- Graf vějíře v SVG podle pravidel grafů (osa, mřížka, tabulka pod grafem), šířka telefonu 390 px.
- **První tři karty, předvyplněné z dat, s ruční změnou hodnot:**
  1. 🛟 **Rezerva** – na kolik měsíců vystačí úspory, pravděpodobnost 3 / 6 měsíců.
  2. 🚬 **Cena zlozvyku** – výdaje za vybrané kategorie / položky, přepočet na hodiny práce, „kdyby se investovalo“.
  3. 📅 **Do výplaty s pravděpodobností** – „s 85 % vyjdeš, v nejhorších 10 % chybí X Kč“.
- Backlog karet: FIRE, hypotéka vs. nájem, auto vlastní vs. leasing, penzijko + DIP, inflace úspor.
- **Hotovo, když:** tři karty na skutečných datech, smoke test (`smoke_kalkulacky.js`), kontrola na šířce telefonu.

### 3.2 · 📲 Inbox (TODO-354, ADR-232)
- Podle Milanova testu na telefonu opravit appku (`financeflow-inbox`) nebo web (`js/inbox.js`, parser). Odkaz na stažení APK do sekce 📲.

### 3.3 · Výplata – TODO-345, TODO-346
- Predikce výplaty v Příštím měsíci a Do výplaty (navazuje na kartu 3).
- Kontrola výplatnice proti kalendáři.

### 3.4 · Pokud zbude čas
TODO-350 / 352 Měřidla ↔ opakované platby ↔ transakce · TODO-351 panely místo oken jinde · TODO-347 kalibrace odhadu (až přijde páska za listopad).

## 4 · Postup každé verze (připomínka)
- Hlavička `// FinanceFlow · vX.YY · soubor.js · datum` ve změněných souborech, VERZE_LOG v `js/admin.js`, `sw.js` (`CACHE_NAME`), `app.html` (title, small, Verze), `?v=` hash změněných souborů.
- `node tools/check_tdz.js js/*.js` (32 známých je normální), celá sada testů v ploché složce.
- Milanovi posílat **jen změněné soubory** (`outputs/verze/vX.YY/`).
- MD soubory jen doplňovat, nikdy nemazat obsah. Žádné jméno uživatele v textu appky. Worker neměnit bez důvodu.
