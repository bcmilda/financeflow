# Plán · Session 29 (web FinanceFlow)

> Připraveno na konci Session 28 (2026-11-06). Výchozí stav: **v12.38** (GitHub `dev` = lokální). Worker v12.38, pravidla DB v12.26, testy 217 sad + `smoke.js`.
> Pracovní jazyk čeština. Číslo další verze: **v12.39**.

## 0 · Na začátku
1. Přečíst `doc/CLAUDE.md` (sekce Session 28), `doc/Summary_s28.md`, tento plán, `doc/todo.md` od TODO-374.
2. Zkontrolovat Projekt a paměť (SKILL 97); audit v Projektu `claude/AUDIT-vypocty-S28.md`.
3. Ověřit GitHub `dev` (`git fetch`, `git diff`) – Milan nahrává sám. **Nepushovat.**

## 1 · Editor účtenky – varianta B (TODO-374)
- Milan prohlédne návrh B4 v Design artefaktu „Editor účtenky – návrh“ (sleva u zlevněné položky, kam se účtenka zapíše, modré tagy a téma celé účtenky).
- Po schválení stavět po částech, každá část s testem a kontrolou na 390 px. **Žádná funkce dnešního editoru se nesmí ztratit** (projít seznam funkcí dnešního editoru před stavbou).
- Souvisí: TODO-375 (zkratka vs. vlastní název, vybledlá účtenka) – zeptat se, zda stavět spolu.

## 2 · Pokračování auditu (TODO-377)
Stejný postup jako S28: vzorec → oficiální metodika (rešerše) → ověření v Chromiu na zkušebních datech → zpráva s cestou a dopadem → opravy až po souhlasu.
1. **Inflace z účtenek** – `_inflCollect`, `_inflCompute`: čtení balení z názvu (150 g, 1 l), medián, zlevněné položky, váhy podle útraty, minimum položek, oddíly COICOP.
2. **Vozidla** mimo spotřebu (náklady na km, tankování z účtenky, servis).
3. **AI texty** – podklady (čísla jen z appky), ověřování čísel ve workeru, AI rádce, report AI.
4. **Komunita** mimo bod 16 (medián příjmu / výdajů na jednotku?).

## 3 · Zeptat se Milana
| # | Otázka |
|---|---|
| 1 | Míry spoření (TODO-378) – vysvětlit na jeho datech, pak pojmenovat? |
| 2 | Repo (TODO-379): smazat `.github/workflows/database.rules.json`, co s `ai_memory/`? |
| 3 | TODO-376: obousměrné datum účtenka ↔ transakce, úprava poloviny převodu, rodiče ručního splitu – stavět? |
| 4 | NutriDatabáze (TODO-380): 4 otázky z plánu, odpověď ÚZEI? |

## 4 · Postup každé verze (připomínka)
- Hlavička jen ve změněných souborech, VERZE_LOG v `js/admin.js`, `sw.js` (hlavička + `CACHE_NAME`), `app.html` (title, small, „Verze“), `?v=` sha256[:16] změněných JS.
- Celá sada testů v ploché složce + negativní kontrola nového testu, Chromium 390 px, cesta v appce u každé změny.
- Výstupy do `/mnt/user-data/outputs/vX.YY/` (jen změněné), posílat jednotlivě, nemazat, žádný zip.
- MD jen doplňovat na konci session. Neměnit, co nebylo zadáno. Žádné jméno uživatele v UI. Worker a pravidla nasazuje Milan ručně. `signing.keystore` nikdy do repa.

---

## 5 · Doplněk po dokumentaci (7.–8. 11. 2026) · v12.39 → v12.41 **(Session 28)**

### Hotovo po v12.38 (lokálně commitnuté, Milan nahrává sám)
- **v12.39** – swipe v Transakcích se zámkem směru; transakce ze skryté kopie účtenky jde upravit (jinak formulář transakce); filtr ceny v Transakcích; Podezřelé → „Položka účtenky“ musí sedět i názvem (nebo bez názvu, stejná kategorie, ≥ 100 Kč – Milan potvrdil ponechat); Není duplikát na mobilu; Revolut „X Vám posílá 20 €“ a ✎ Zapsat ručně do formuláře.
- **v12.40** – Doručené i zpětně zadané platby v cizí měně kurzem ČNB ke dni platby (pevné 25 Kč/€ pryč); datum transakce = datum účtenky vždy, rozpojená transakce se znovu napojí (stejný obchod + částka ± 7 dní, jediná kandidátka); Historie účtenek – filtr ceny a žlutý oddělovač měsíců.
- **v12.41** – rozdělenou platbu jde upravit: lišta ✎ Upravit platbu / ✂️ Upravit rozdělení / ↩ Zrušit rozdělení, části jdou s platbou (datum, typ, způsob platby, projekt, název; částka poměrem).
- Ověřeno: rozdělené platby se ve statistikách, rozpočtech a predikci počítají **po částech** ve svých kategoriích (rodič s částmi se vyřazuje – `getActual`, `getHistAvg`, `expSum`), zůstatek peněženky jen přes rodiče (části nemají `wallet`).

### Na příští session (Milan, 8. 11.)
| # | Co | Poznámka |
|---|---|---|
| 1 | **Přesun do investic** (`setTransferMode('assets')`) – „peníze mi nezmizí, ale z účtu (peněženky) ano, takže se bude rozcházet zůstatek ke dni“ | Nejdřív probrat s Milanem na jeho příkladu (kam peníze reálně jdou, jestli investice má být peněženka), pak navrhnout. Neopravovat bez rozhovoru. |
| 2 | **Cashback – „Propojit s transakcí“** se objeví až po uložení transakce | Má být k dispozici už při zápisu. |
| 3 | **Opakovaná platba** jen u Dluh/Splátka | Chybí u běžné transakce. |
| 4 | **Eurová peněženka** – platby před datem „Zůstatek · ke dni“ se neodečítají (návrh: upozornění při uložení peněženky + šedý průběžný zůstatek „už v zůstatku ke dni“) | Nabídnuto, Milan zatím neodpověděl. |
| 5 | **Editor účtenky (TODO-374)** – varianta B, 3. návrh na plátně (C1–C4) | Viz níže. |

### Editor účtenky – co od Milana máme (stavět podle toho)
- Varianta B (vývoj dnešního editoru), ne A. Sleva z B4: jen u zlevněné položky – vpravo zaplaceno, pod tím přeškrtnutá původní cena, zelený pruh „Sleva −X Kč“ (data `it.discount` už z AI analýzy existují). Souhrn „ušetřeno“ nahoře.
- U položky zůstávají **tři názvy**: z účtenky (zkratka), upravený (AI / uživatel), z karty výrobku (EAN).
- **Modré tagy a poznámka k vybraným položkám** (výběr víc položek najednou) + obecná poznámka a tagy celého nákupu. Per-položkové modré tagy v datech zatím nejsou – nové pole položky (a Tagy musí počítat částku položky, ne celé účtenky).
- Zelený štítek přejmenovat – návrh **„Druh“** (druh zboží) s nápovědou; Milan zatím nepotvrdil.
- Otevřené: potvrdit název „Druh“; kde se mají modré tagy položek projevit (Transakce → Tagy, filtr); jestli poznámka položky patří i do hledání v Transakcích.


---

## 6 · Doplněk 8. 11. večer · v12.42 **(Session 28)**
- **Editor účtenky hotový (v12.42, TODO-374)** – Milan potvrdil: 1) „Druh“ ano, 2) tag položky jen částkou položky, 3) poznámka jde najít. Vyzkoušet na skutečných účtenkách a doladit podle Milana (TODO-388).
- **Přesun do investic (TODO-384):** Milan ve 21:44 – „když dám Přesun → Investice, neodečte se mi částka z peněženky“. Průběžný zůstatek na jeho screenu ale klesá (−6 466,60 → −6 666,60 → −6 866,60), ve výdajích měsíce přesun není (záměr). Příště zjistit, kde přesně vidí neodečtenou částku, a pak navrhnout (SKILL 119).
- Na GitHubu pravděpodobně ještě není v12.39 (screen 21:43 ukazuje „2 podezřelých párů“ – stará gramatika) – připomenout nahrání v12.39–v12.42.
