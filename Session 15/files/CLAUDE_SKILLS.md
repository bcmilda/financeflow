# FinanceFlow – CLAUDE SKILLS (naučené chyby, kterým se vyhnout)

> Pravidla z opakovaných chyb. Claude je dodržuje při KAŽDÉ úpravě FinanceFlow.

## SKILL 1 – Text a barvy na tmavém pozadí
- **NIKDY** nepoužívat `var(--text3)` ani `var(--text2)` pro důležitý/čtený text – jsou špatně čitelné na tmavém pozadí.
- Volit světlejší barvy (`#a8aec8` a světlejší), **větší** a barevnější text.
- Popisky grafů, vysvětlivky a legendy musí být dobře viditelné.
- Platí pro HTML i pro `ctx.fillStyle` v canvas grafech.

## SKILL 2 – Grafy (povinné u KAŽDÉHO grafu)
- Osa X **i** osa Y s popisky a jednotkami.
- Legenda (mimo plochu grafu, nepřekrývat data).
- Tooltip / interaktivita (hover, snap na hodnotu) – pokud uživatel nechce jinak.
- Data **NESMÍ** překreslovat/přesahovat osy → dost paddingu (pad/right/top/bottom).
- **SVG** s malým `viewBox` (např. 320) + `width:100%` se na desktopu roztáhne ~4× → VŽDY `max-width` + `preserveAspectRatio="xMidYMid meet"`.
- **Canvas**: skrytá záložka má `clientWidth=0` → měřit šířku přes `requestAnimationFrame` + `setTimeout` + fallback (`Math.max(clientWidth, 320)`).
- Sloupce/čáry ve stejném měřítku jako osa (nemít vlastní škálu, která opticky klame).

## SKILL 3 – Problikávání obrazovky
- Častá chyba: obrazovka problikává při změně dat/měsíce (Firebase `onValue` → `renderPage` při každém renderu).
- Vždy řešit:
  - anti-flicker guard – porovnat podpis dat (`_dataSig`) před překreslením, překreslit jen při změně,
  - necachovat/neměnit loading placeholder při každém renderu,
  - debounce `renderPage`.
- Před dokončením ověřit, že přepnutí měsíce neproblikává.

## SKILL 4 – Workflow (z dřívějška, stále platí)
- Chaining: vždy začít kopií z NEJNOVĚJŠÍCH outputs (ne /mnt/project).
- `node --check` po každém editu.
- 4-krokový version bump: title + sidebar + „O aplikaci" + VERZE_LOG + cache-busting hashe.
- Finální ověření: všech 14 `?v=` hashů konzistentních.
- Reaktivita: grafy/výpočty vázat na `S.curMonth`/`S.curYear`, ne na `today` (jinak nereagují na přepnutí měsíce).

---
*Skills · Session 10 · 2026-06-01*

---

## Session 15 (2026-07-02 → 2026-07-06, v8.57 → v8.74)

> Nová poučení ze Session 15 – pokračování číslování (SKILL 1–4 z dřívějška beze změny).

## SKILL 5 – Jedinečnost vzoru při hromadném replace (KRITICKÉ, z FIX-189)
- Před `src.index(vzor)` / `str_replace` VŽDY ověřit, že se vzor v souboru vyskytuje PRÁVĚ JEDNOU – jinak hrozí zásah do špatného místa.
- Krátké/obecné vzory (např. začátek běžného bloku kódu jako `const baseIncome = computeX(D);`) se mohou opakovat na více místech souboru – najde a upraví se PRVNÍ výskyt, ne ten zamýšlený.
- **Bezpečný postup:** buď (a) použít dostatečně dlouhou/jedinečnou kotvu (celý blok, ne jen první řádek), nebo (b) `grep -c` nejdřív ověřit počet výskytů, nebo (c) po editaci vždy zkontrolovat, že se smazalo/přidalo jen tolik řádků, kolik bylo zamýšleno.
- `node --check` NEODHALÍ smazání celé funkce, pokud zbylý kód zůstane syntakticky validní – nutná i funkční kontrola (grep na název funkce, počet řádků souboru před/po).

## SKILL 6 – Směr metriky (šipka) vs. hodnocení metriky (dobře/špatně) jsou DVĚ VĚCI (z FIX-191)
- Nikdy neposílat "obrácenou" hodnotu (`-trend`) jen proto, aby vyšlo správně binární hodnocení (`good`/`bad`) – rozbije to zobrazení SKUTEČNÉHO směru (šipka nahoru/dolů).
- Vždy držet dvě oddělené proměnné: `rawTrend` (fakt, co se stalo – pro šipku/text) a `good`/`isPositive` (interpretace, jestli je to žádoucí – pro barvu/emoji). Render čte OBĚ nezávisle.

## SKILL 7 – Sdílené výpočetní helpery pro metriky používané na více místech (z FIX-188)
- Pokud se stejná metrika (např. měsíční splátky dluhů, efektivní příjem) počítá na 3+ místech v kódu, HNED při druhém výskytu extrahovat do jedné sdílené funkce v `helpers.js`.
- Duplicitní implementace se v čase nenápadně rozejdou (jedna zohlední `installments`, druhá ne) → stejná metrika ukazuje jiná čísla na různých obrazovkách, což uživatel odhalí jako "chybu", ale je to symptom architektury.

## SKILL 8 – Sémantika agregační funkce musí sedět se směrem metriky (z FIX-187)
- `getActual()` sčítá VÝDAJE. Pokud metrika potřebuje PŘÍJMY (pasivní příjem, diverzifikace zdrojů), NIKDY nepoužívat `getActual` jen proto, že "vypadá podobně" – vytvořit zrcadlový helper (`getIncActual`).
- Tichý důsledek špatné volby: metrika nespadne s chybou, jen vždy vrátí 0 nebo zavádějící číslo (Financial Freedom Ratio bylo měsíce "rozbité", aniž by appka cokoliv hlásila).

## SKILL 9 – Normalizace více škál do jedné zobrazované škály
- Když se kombinují dílčí skóre s RŮZNÝMI maximy (0–75, 0–100, 0–50, 0–35...) do jednoho čísla 0–100, počítat `rawTotal / rawMax * 100` — NIKDY netvrdě předpokládat součet = 100.
- Vracet z výpočetní funkce jak `rawTotal`/`rawMax` (pro transparentnost a ladění), tak normalizovaný `total` (pro zobrazení).
- Render komponent (bar/prsten) by měl číst POMĚR (`c.score/c.max`), ne hardcoded konstantu – pak automaticky funguje při jakékoli změně max hodnot v budoucnu.

## SKILL 10 – Přesun HTML bloku uvnitř souboru → vždy zkontrolovat balanci `<div>`
- Po přesunu bloku (např. transferDetailsBlock pod Částku/Datum) vždy spočítat `<div` vs `</div>` v celém souboru (`src.count('<div')` vs `src.count('</div>')`) – snadno vznikne přebývající nebo chybějící uzávěr při ručním skládání stringů.

## SKILL 11 – GitHub může zaostávat za lokální prací o několik verzí
- Na začátku session VŽDY porovnat `<title>` v `/mnt/project/app.html` (GitHub snapshot) s hlavičkou posledního lokálního souboru z předchozí pracovní složky – pokud se liší, chainovat z LOKÁLNÍ poslední práce, ne z `/mnt/project/`, dokud Milan nepotvrdí, že pushnul.

## SKILL 12 – Změna zdroje bodovacích tabulek vyžaduje audit VŠECH spotřebitelů
- Když se mění výpočetní tabulka (např. z hardcoded 4-skokové na plnou 76řádkovou `_SCORING`), vždy vyhledat grep-em VŠECHNA místa, která starou tabulku používala (Dashboard, Měsíční report, Bankovní hodnocení, Dluhový stres index) – nestačí opravit jen to místo, na které se uživatel zeptal.

---

*Aktualizace Session 15: 2026-07-06 | v8.57 → v8.74 | FIX-174–191 · ADR-079–085 · TODO-144–159*
