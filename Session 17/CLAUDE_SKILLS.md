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

## SKILL 13 – Firebase pravidla: `.write` KASKÁDUJE, `.validate` NE
Nejdražší chyba Session 17 (dvakrát, obě kritické).
- Jednou povolený `.write` na rodičovském uzlu **nejde v hlubším uzlu odebrat**. `users/$uid` s `".write": "auth.uid === $uid"` odemyká **i** `users/{uid}/premium` → uživatel si mohl sám zapsat Premium a obejít AI kvóty.
- Omezení hlubších uzlů se dělá přes **`.validate`**, která nekaskáduje.
- **Data, která uživatel nesmí měnit, patří MIMO jeho podstrom** – ban je v `banned/{uid}`, ne v `users/{uid}/banned`, jinak by si ho smazal.
- **Co není v pravidlech výslovně povoleno, je zakázáno.** Nový uzel v kódu (`trialsUsed`) bez pravidel = tichý PERMISSION_DENIED, který shodil celý trial (FIX-220).
- Postranní zápisy (dedup, statistiky) vždy obalit vlastním `try/catch` – jsou to bonusy, ne podmínky hlavní funkce.

## SKILL 14 – `node --check` nestačí u refaktorů
`ReferenceError: rows is not defined` (v9.17) shodil celou aplikaci. Při přesunu kódu do nové funkce zůstal řádek odkazující na proměnné té staré – **syntakticky validní, runtime pád**.
- Po každém refaktoru, který přesouvá kód mezi funkcemi, spustit **runtime smoke test**: `node -e` se stubem globálů (`window`, `S`, `fmt`, `getData`…) a zavolat obě větve (prázdná data i s daty).
- Pozor na falešně negativní testy u českých tvarů: `'dny'` je podřetězec `'týdny'`, takže `includes()` nikdy nerozliší režim.

## SKILL 15 – `window.open` musí být synchronní s klikem
Firefox blokoval platební bránu (FIX-223), protože se `window.open` volal až po `await`. Prohlížeč to pak nepovažuje za reakci na uživatelský vstup.
- Data potřebná před otevřením okna **načíst dopředu do cache**, ne v obslužné funkci kliku.
- Vždy přidat fallback: když `window.open` vrátí `null`, nabídnout otevření v aktuální záložce.

## SKILL 16 – Early return přeskočí úklid na konci funkce
Souhrn výdajů se zobrazoval pod Poradcem (FIX-217), přestože guard existoval – větev Poradce končila `return` **před** úklidovým kódem.
- U `return` uprostřed funkce zkontrolovat, co všechno se přeskočí.
- `el.innerHTML = ''` nepokrývá **sourozenecké** kontejnery. `#reportSouhrn` je sourozenec `#reportContent`, ne potomek.

## SKILL 17 – Nepsat znovu to, co už existuje
Karta Inflace implementovala výpočet Kč/kg a shrinkflace od nuly, přestože totéž už bylo ve Zdražování (`perUnitData`, `shrinkflation`, `pkgWeight`). Tím se **znovu vyrobily chyby, které tam byly dávno opravené** (FIX-215, FIX-216).
- Před psaním nové analýzy nad účtenkami zkontrolovat, jestli stejný výpočet už neexistuje.
- Raději extrahovat sdílený helper než duplikovat.

## SKILL 18 – Jednotková normalizace jen tam, kde odpovídá způsobu prodeje
„Rohlík 43g = 81 Kč/kg" je matematicky správně a pro uživatele nesmysl.
- **Hlavní metrika = cena za balení / za kus** (co člověk reálně zaplatí).
- Přepočet na Kč/kg jen u zboží skutečně prodávaného na váhu (`unit === 'kg'|'l'`).
- U baleného zboží je Kč/kg **doplněk pro detekci shrinkflace**, ne hlavní číslo.
- Klíč položky musí obsahovat jednotku, jinak se porovná Kč/ks proti Kč/kg (+2707 %).

## SKILL 19 – `lineTotal` je zdroj pravdy (ADR-059)
`price` má dvě sémantiky: u kusového zboží cena za kus, u váženého cena za kilo. `price × qty` proto vyjde správně jen náhodou a **ignoruje slevy**.
- Vždy `lineAmt(it) = it.lineTotal ?? (it.price × it.qty)`.
- Platí i pro nové moduly – COICOP počítal `price × qty` a nesouhlasil se zbytkem appky (FIX-211).

## SKILL 20 – Agregace transakcí: `txCZK` + vyloučení
Třikrát v jedné session stejná chyba (FIX-194, FIX-212, FIX-213).
- Vždy `txCZK(t, D)`, nikdy `t.amount || t.amt` – jinak se cizí měny sčítají v nominálu.
- Vždy vyloučit `splitParent`, `isBalancing` a `isTransferTx(t)` – jinak se přesuny mezi peněženkami tváří jako výdaj.
- Platí i pro data odesílaná ven (komunita), ne jen pro zobrazení.

## SKILL 21 – Prázdný stav musí vysvětlovat, ne mlčet
„Žádné úspory nebyly detekovány" nechává uživatele v nejistotě, jestli appka funguje.
- Prázdný stav říká, **co se prověřilo a proč to prošlo** („Prověřeno 7 půjček, nejdražší 5,4 % je pod hranicí 7 %").
- Upozornit na chybějící vstupy, které brání analýze (nenastavené limity, žádné účtenky).
- Nikdy neskrýt ovládací prvky spolu s obsahem – COICOP karta zmizela i s přepínačem a nešlo se vrátit (FIX-214).

## SKILL 22 – Texty nesmí odrazovat ani vyčítat
- Nováčkovi netvrdit „Trial vypršel", když ho nikdy neměl (FIX-221) – rozlišovat podle `trialUsed`.
- U hodnocení útrat mluvit o **budoucnosti** („kdybys polovinu přesměroval, je to X Kč za rok"), ne o minulosti („vyhodil jsi X").
- Aplikace **nikdy sama neoznačí útratu za zbytečnou** – prioritu určuje výhradně uživatel.
- Popis tlačítka musí odpovídat tomu, co prohlížeč zobrazí (`confirm` má „Zrušit", ne „Storno").
