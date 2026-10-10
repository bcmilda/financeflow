# FinanceFlow – CLAUDE SKILLS (naučené chyby, kterým se vyhnout)

> Pravidla z opakovaných chyb. Claude je dodržuje při KAŽDÉ úpravě FinanceFlow.
> **Doplnění Session 25** (2026-10-09): na konci souboru nová sekce „Session 25 (2026-10-05 až 2026-10-10) · v11.30 → v11.61“ včetně dodatku v11.28–v11.30. Přehled v `doc/Summary_s25.md`.

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

## SKILL 23 – `node --check` nezachytí "použito před deklarací" (TDZ) **(Session 18)**
Čtyři pády appky na produkci ve **stejné session** (`_ffrD`, `_s1pts`, `months`, `fs`) — pokaždé proměnná `const`/`let` použitá dřív, než ji kód platně deklaruje. Kód je syntakticky správný, `node --check` projde, appka spadne až za běhu.
- Dvě regexové verze kontrolního skriptu **samy propustily další stejnou chybu** — regex nezná blokový scope JS (`const x` uvnitř `try{}` bere jako platné pro celou funkci).
- Řešení: `tools/check_tdz.js` postavený na skutečném parseru (`acorn` + `acorn-walk`), který sestavuje reálný strom scope. Spustit **před každou dodávkou**: `node tools/check_tdz.js js/*.js`.
- Vyžaduje jednorázově `npm install --save-dev acorn acorn-walk` v repu; `node_modules/` a `tools/` jsou v `firebase.json` `ignore` (nikdy se nenasazují).

## SKILL 24 – Ověřovat názvy funkcí a CSS tříd v kódu, ne odhadovat
Psaní kódu, který volá funkci nebo třídu podle toho, jak by se „logicky" měla jmenovat, místo ověření v projektu:
- `toast()` (neexistuje) vs. skutečné `showToast()` — hodnocení šlo odeslat, ale bez jakékoli odezvy (FIX-251).
- `class="modal modal-content"` (neexistuje) vs. skutečné `overlay`/`modal`/`modal-head` — modal recenzí se zobrazil mimo obrazovku (FIX-249).
- `computePersonalInflation()`, `APP_VERSION`, `renderSettings()`, `computeFuturePlanned()` — volání funkcí, které v projektu vůbec nejsou.
- **Postup:** `grep -n "function nazev\|class=\"nazev" *.js *.html` PŘED napsáním volání, ne až po chybové hlášce.

## SKILL 25 – Postavit jen to, co řeší existující problém
Diff-read okno 12M (s trojí bezpečnostní pojistkou) postaveno ve v9.55 a odstraněno ve v9.57, protože ho Milan nikdy nezapne a problém, který mělo řešit (pomalý start s roky historie), appka s nízkým počtem uživatelů a krátkou historií nemá.
- Přínos byl čistě výkonový, riziko datové (možnost ztráty transakcí při špatné migraci).
- **Postup:** u datově citlivé nebo bezpečnostní funkce se napřed zeptat, jestli problém, který řeší, reálně existuje — ne rovnou navrhnout řešení a čekat na zpětnou vazbu až po postavení.

## SKILL 26 – Peníze a měny (Session 19)

SKILL 20 řeší **sčítání**. Tenhle řeší **zobrazení** a **zadávání** — tam vznikly chyby S19.

### Tři vrstvy, tři pravidla
| Vrstva | Pravidlo |
|---|---|
| **Uložení** | Vnitřní jednotka je **vždy CZK**. Cizí měna do `t.amtCZK`, zafixovaná, už se nepřepočítává |
| **Sčítání** | **Vždy** `txCZK(t, D)`, nikdy `t.amount \|\| t.amt` (SKILL 20) |
| **Zobrazení** | **Vždy** `fmtB(v)`, nikdy `fmt(v) + ' Kč'` |

### ⚠️ NIKDY neprovádět plošnou náhradu `fmt(` → `fmtB(`
Tři pasti, na které jsem v S19 narazil:
1. **Dvojí převod** — `fmt(Math.round(czkToBase(v)))` už převedeno má. → doplnit jen symbol `curSym()`.
2. **Nepeněžní hodnoty** — `fmt()` se používá i na počty kusů, procenta, dny.
3. **Kontext, který není obrazovka** — `ai.js` staví prompt pro model. Vnitřní jednotka je CZK,
   takže „Kč" je tam **správně**. Míchat v jednom promptu koruny a základní měnu by model mátlo.

### Zadávání
- Popisek pole ukazuje **měnu vybrané peněženky** (`_txEntryCur()`), ne základní měnu.
  Platíš-li z korunového účtu, zadáváš koruny. Rozhodnutí Milana (S19).
- U přesunů vrací `_txEntryCur()` `'CZK'` **schválně** (skrývá pole „Skutečně v Kč") —
  nesmí se na to spoléhat nikde jinde (FIX-255).
- **`amtCZK` a `fxRef` tvoří pár** — viz ADR-101.

### 🚩 Popisky vstupních polí
Změnit `<label>Rozpočet (Kč)</label>` na základní měnu **bez převodu na vstupu je horší
než špatný popisek** — tichá ztráta dat. Oprava je vždy dvoudílná: popisek **plus**
`moneyInFill()` a `moneyInRead()`. Chybí-li plnění, hodnota se při každé editaci
vynásobí kurzem znovu. **Round-trip test je podmínkou** (`tools/smoke_moneyin.js`).

### Kontrolní seznam
- [ ] Agregace přes `txCZK(t, D)`, s vyloučením `splitParent`, `isBalancing`, `isTransferTx`
- [ ] `D` je v dosahu na každém místě, kde volám `txCZK(t, D)`
- [ ] Žádné `fmt(x) + ' Kč'` u částky na obrazovce
- [ ] Žádné `fmtB()` nad hodnotou po `czkToBase()`
- [ ] Popisek měněn jen společně s převodem na obou stranách
- [ ] **Porovnávání částek** také přes `txCZK` — jinak 1 200 EUR prohraje s 3 000 Kč (FIX-254)

---

## SKILL 27 – Opravuješ-li VZOR, prohledej všechny jeho výskyty (Session 19)

Doplnění SKILL 12. FIX-073, FIX-119 i S16.13 opravily **místo, kde se chyba ohlásila**,
ne **vzor**. Proto tatáž chyba přežila v `getHistAvg()` až do S19 — a týkala se
celého predikčního enginu včetně finančního skóre.

**Postup:**
1. Napiš, jaký vzor je špatně (např. „sčítání přes `t.amt`").
2. Grepni **všechny** jeho výskyty napříč moduly, ne jen ten nahlášený.
3. U každého rozhodni „správně / chyba" a rozhodnutí zapiš.
4. Před opravou sdíleného výpočtu prověř **všechny spotřebitele** (SKILL 12) —
   ADR-100 ukazuje případ, kdy by plošná oprava rozbila skóre.
5. Napiš test, který vzor hlídá **staticky do budoucna** (`tools/smoke_mena.js`).

---

## SKILL 28 – Nesbírej data, ze kterých nikdy nevznikne spolehlivá odpověď (Session 19)

Ve v9.92 jsem zavedl `t.enteredAt`, abych z něj odvodil „denní dobu nákupu".
O verzi později zrušeno: Milan doplňuje transakce i druhý den, takže čas zápisu
s časem nákupu nesouvisí. Vzorec by byl vymyšlený.

**Pravidlo:** než přidáš pole do datového modelu, odpověz si:
- Dá se z něj odvodit to, co slibuju, **spolehlivě**?
- Nebo jen **občas**, a zbytek času vyrobí falešný vzorec?

Falešný vzorec je horší než chybějící funkce — uživatel mu uvěří.
Totéž platí pro `fxRef`: ukládá se **jen živý kurz ČNB**, nikdy orientační průměr.

---

## SKILL 29 – Jednořádkové funkce a komentáře (Session 19)

`charts.js` má některé funkce na **jediném řádku** (`saveBday`, `editBday`).
Přidání `// komentář` za nahrazený příkaz **zakomentuje zbytek řádku** včetně
zavíracích závorek → `SyntaxError: Unexpected end of input`.

`node --check` to odhalí okamžitě, ale při plošných náhradách je to tichý zabiják.
**Před přidáním komentáře zkontroluj, jestli za ním na řádku ještě něco není.**

---

## SKILL 30 – Dodržuj vzory, které v kódu už jsou (Session 19)

FIX-256: postavil jsem modal záloh na třídách `class="modal"` + `.modal-content` +
`.modal-header`, které v `styles.css` **neexistují**. Správná struktura
(`.overlay > .modal > .modal-head + .modal-body`) byla o pár řádků níž
v `openExportCsvModal()`. Modal se neotevřel a vykreslil se jako rámeček
uprostřed stránky.

**Než postavíš nový prvek, najdi v kódu nejbližší existující a udělej to stejně.**
Platí pro modaly, karty, tabulky, prázdné stavy i tvary dat.

## SKILL 31 – Rozlišuj „nemá" od „nezadal" (Session 19)

Nejdražší chyba druhé vlny S19. Tři různé projevy téhož omylu:

| Kde | Kód | Co appka předpokládala | Realita |
|---|---|---|---|
| Skóre S2 | `debts.length === 0` → plný počet | „nemá dluh" | možná ho jen nezadal |
| `seedData` | `!snap.exists()` → seedovat | „nový uživatel" | uzel vznikl i jinak (FIX-264) |
| Rozdělené čtení | `!snap.exists()` → `[]` | „smazáno" | možná nikdy nezapsáno (FIX-265) |

**Pravidlo:** absence dat není informace. Než z ní něco odvodíš, zeptej se:
- **Můžu to zjistit?** → zeptej se uživatele (onboarding), pak to *víš*
- **Nemůžu?** → nehodnoť to (`avail=false`), nedosazuj neutrální hodnotu
- **Rozlišuje se to v čase?** → sleduj, jestli hodnota už někdy existovala (`_splitSeen`)

**Nikdy nedosazuj „neutrální" výchozí hodnotu.** Neutrální hodnota vypadá jako měření,
ale je to konstanta — a uživatel podle ní jedná.

---

## SKILL 32 – Odhady se nesmí sčítat do jednoho čísla (Session 19)

Detektor sčítal dvanáct nálezů do „ušetříš 1 876 Kč/měs". Tři vady najednou:

1. **Koeficienty jsou dohady** (`×0,25` u předplatných) bez opory v datech
2. **Nemají stejnou spolehlivost** — bankovní poplatky ×0,80 je téměř jistota,
   „zbytečné utrácení" ×0,50 je spekulace o tom, co má pro uživatele hodnotu
3. **Překrývaly se** — jedna útrata padla do tří nálezů, součet dal 110 % z útraty

**Pravidlo:**
- odvozené odhady **zabírej** (`_claimed`), ať se totéž nepočítá dvakrát
- **odděl doložitelné od odhadu** — co se počítá ze skutečných čísel, od toho,
  co závisí na rozhodnutí uživatele
- prezentuj **rozsah**, ne jedno číslo; jedno číslo tvrdí přesnost, kterou nemáš

Když uživatel podle „přesného" čísla začne jednat a ušetří pětinu, přestane
aplikaci věřit — spravedlivě.

---

## SKILL 33 – Falešná shoda je horší než žádná (Session 19)

Klíč položky v Inflaci sléval `mléko polotučné 1,5%` a `mléko plnotučné 3,5%`
do `mléko %`. Index si pak z jejich cenového rozdílu **vymyslel zdražení**.

**Asymetrie škod u párování:**
- **rozdělíš, co patří k sobě** → položka má jedinou cenu, z výpočtu vypadne,
  index se opře o míň dat. Ztráta informace.
- **sloučíš, co k sobě nepatří** → výpočet vyrobí číslo, které neodpovídá ničemu.
  Výroba dezinformace.

**Vždy volíme přísnější klíč.** Platí pro párování položek, obchodů, kategorií
i pro deduplikaci účtenek.

---

## SKILL 34 – Nález zapsaný do testu přestane být nálezem (Session 21)

**Stalo se TŘIKRÁT v jedné session.**

`smoke_virtualni.js` obsahoval:
```js
// POZOR: „Penzijní spoření" obsahuje „spoř", a vzor pro reserve se testuje
// DŘÍV než vzor pro long → vyjde 'reserve'. Je to PRE-EXISTING chování,
// ověřené i na nedotčeném originále, ne regrese. Zapsáno v bugs.md.
assert(sb.assetTier({linkedCatId:'cPen'})==='reserve');
```

Test tedy **potvrzoval chybu jako správné chování** a hlídal, aby se neopravila.
Totéž u `smoke_sdileni.js` („sekce bez přepínače se sdílejí vždy",
„shareSettings se propíše partnerovi") a u `smoke_family.js` („filtr nesmí
zúžit souhrnná čísla").

**Pravidlo:** když se při psaní testu chce napsat komentář typu „pre-existing",
„zatím to tak je" nebo „POZOR, chová se to divně, ale…", **není to test — je to
nález.** Patří do `bugs.md` jako otevřený bod, ne do assertu jako očekávání.

Když opravdu potřebuješ zamrazit současné chování, napiš to jako
`// TODO: tohle je vada, test hlídá jen že se nezhorší` a zároveň založ TODO.

---

## SKILL 35 – Testuj chování, ne tvar kódu (Session 21)

Ve v10.34 jsem vyndal `rodina` a `sdileni` z `PREMIUM_PAGES` a test ověřil:

```js
ok('rodina a sdileni už nejsou v PREMIUM_PAGES', !/…'rodina'…/.test(pr));  // ✅
```

Prošlo. Jenže `showPagePremium()` ten seznam **vůbec nečetla** — volala rovnou
`hasPremiumAccess()`. Stránka zůstala zamčená a chyba šla do produkce.

Správný test pustí uživatele do funkce a kouká, kam se dostane:

```js
c._premiumStatus={type:'free'};
ok('Free se DOSTANE na Sdílení', zkus('sdileni')==='OK');
ok('placené stránky Free nepustí', zkus('uctenky')==='ZAMCENO');
```

**Pravidlo:** u každé opravy si polož otázku „co má uživatel VIDĚT / KAM se má
dostat" a testuj to. Regex nad zdrojákem je doplněk (hlídá, že se vzor nevrátí),
ne důkaz, že to funguje.

---

## SKILL 36 – Rozděl funkci a testy o ní nevědí (Session 21)

Refaktor `assetCatLiq` → `assetCatLiq` + `assetLiqFromName` shodil dva testy na
`ReferenceError`. Stejně tak `FAMILY_MAX_MEMBERS` mimo funkci, `txShareMode`
a `_shCatSkeleton`. Pokaždé to chytil až runtime, `node --check` nikdy.

Testy si ze zdroje vytahují **konkrétní funkce jménem**. Když se kód rozdělí,
přesune mimo tělo nebo přejmenuje, extrakce zůstane neúplná.

**Postup po každém refaktoru, který mění hranice funkcí:** spusť celou sadu
a u každého `is not defined` doplň extrakci — neopravuj kód, dokud nevíš,
že chyba není v testu.

---

## SKILL 37 – Obalovací šipka kolem vlastního jména je nekonečná rekurze (Session 21)

```js
function renderBackupBody(){ … }
window.renderBackupBody = () => renderBackupBody();   // ❌ zacyklí se
window.renderBackupBody = renderBackupBody;           // ✅
```

V klasickém skriptu je deklarace funkce na nejvyšší úrovni **už vlastností
`window`**. Ten řádek ji tedy přepíše šipkou, jejíž tělo sáhne přes globální
scope zpátky na `window` — tedy na sebe.

Firefox: `too much recursion`. Chrome: `Maximum call stack size exceeded`.
`node --check` to nechytí, protože syntakticky je to v pořádku.

**Vždycky přiřazuj REFERENCI na funkci, ne obalovací šipku.**

---

## SKILL 38 – Firebase odmítne CELÝ zápis kvůli jednomu klíči (Session 21)

Firebase v klíči nesnese `.` `#` `$` `/` `[` `]`. Při JEDINÉM takovém klíči
odmítne celý `set` — ne jen tu hodnotu.

Podkategorie „Školka/škola" v `coicopOverrides` tak shodila zápis celého
výřezu `shared`. Táž chyba už byla v S9 a opravila se u zdroje; vrátila se
jinou cestou.

**Pravidlo:** oprava u zdroje nestačí, protože zdrojů může být víc. Sanituj
**na hranici zápisu** (`_fbSafeKeys`) — ať klíč zavleče kterýkoli kód,
k Firebase se nedostane. Zakázané znaky nahraď, nezahazuj: zahozený klíč
znamená tichou ztrátu dat.

---

## SKILL 39 – Dvě proměnné, dvě různé otázky (Session 21)

`_hasPartners()` se ptalo na `partnerData` (koho MŮŽU ČÍST), zatímco odpověď
potřebovala z `users/{já}/partners` (kdo MŮŽE ČÍST MĚ). Vypadá to jako totéž
a je to opak.

Podobně `users/{X}/partners` znamená v pravidlech „kdo smí číst X", ale kód ho
používal jako „koho X čte". Ty dvě interpretace se shodnou jen v symetrickém
případě — a právě proto to chvíli fungovalo a chvíli ne.

**Pravidlo:** u každého seznamu vztahů napiš do komentáře, KTERÝM SMĚREM
ukazuje. Když se to nedá napsat jednou větou, je to špatně pojmenované.

---

## SKILL 40 – Vědomá volba přebíjí výchozí hodnotu (Session 21)

```js
if (photo) { … } else if (profile.avatar) { … }   // ❌ fotka vyhraje vždycky
if (profile.avatar) { … } else if (photo) { … }   // ✅
```

Uživatel si vybral emoji avatar, uložil se do profilu — a v sidebaru se
nezměnilo nic, protože fotka z Google účtu se testovala první.

**Pravidlo:** v řetězci fallbacků jde vždycky první to, co uživatel vědomě
nastavil. Automaticky získaná hodnota je záloha, ne priorita. Platí i pro
pořadí regulárních výrazů: specifičtější vzor před obecnějším (FIX-303).

---

## SKILL 41 – Nevratná akce musí uklidit i to, co po ní zbývá jinde (Session 21)

„Vymazat všechna data" mazalo `users/{uid}/data`, ale ne `shared` (kopie pro
partnery), ne komunitní záznamy a ne zálohy. Data zmizela **jen vlastníkovi** —
partneři je viděli dál a ze záloh je šlo obnovit zpátky.

**Postup:** než napíšeš mazání, vypiš si VŠECHNA místa, kde data té entity
existují. U FinanceFlow jsou to nejméně: `data`, `shared`, `backups`,
`community/*`, `households/*/members`, localStorage a IndexedDB snapshot.

Pořadí není náhodné: nejdřív odejít z míst, kde po sobě zůstávají stopy,
teprve pak mazat vlastní podstrom — po jeho smazání už tam nemusíš mít přístup.

---

---

## SKILL 42 – Ověření nesmí potvrzovat hypotézu, se kterou přišel uživatel (Session 21)

Milan přišel s teorií: *„zvednou základ a zároveň sníží prémie = stejný výsledek."*
Postavil jsem detektor a ten u **obou** změn tarifu vyhlásil „přesun se 100%
pokrytím". Přesně to, co Milan čekal.

Bylo to špatně. Do průměru prémií spadl vánoční příspěvek 8 409 Kč a náborový
4 000 Kč — jednorázové odměny, které chodí jednou za rok. Po jejich oddělení
vyšly obě změny jako **skutečné zvýšení**, tedy pravý opak.

**Pravidlo:** když výsledek analýzy sedí na očekávání, které jsi dostal zadáním,
je to důvod k větší podezřívavosti, ne k menší. Zeptej se, co jiného by mohlo
ten výsledek vysvětlit, a vylučuj to, dokud nezbude jen jedno.

U finanční appky to platí dvojnásob: uživatel na základě odpovědi jedná.
Potvrzená domněnka, která neplatí, je horší než žádná odpověď.

---

## SKILL 43 – Cizí dokument si sám zkontroluje, jestli jsi ho četl správně (Session 21)

Při přepisování 19 výplatnic z obrázků jsem každou hned přepočítal proti jejím
vlastním součtům — hrubá mzda, čistý příjem, dobírka. Když nesedí, přepsal jsem
něco špatně a poznám to okamžitě, ne až za měsíc u divného grafu.

Totéž se promítlo do importu v appce: **měsíc, který nesedí, se nenaimportuje**
a uživatel se dozví proč.

**Pravidlo:** u každého vstupu zvenčí (páska, účtenka, bankovní výpis) hledej
kontrolní součet, který v něm už je. Když ho dokument má, je hloupost mu
nevěřit — a hloupost ho nepoužít.

---

## SKILL 44 – Pruhy z divů místo canvasu (Session 21)

Sloupcový graf o dvaceti sloupcích nepotřebuje canvas. Divy s procentní výškou
se samy přizpůsobí šířce, nepotřebují DPR škálování ani `requestAnimationFrame`
kvůli nedokončenému layoutu (SKILL 2) a na mobilu vypadají stejně jako na
desktopu.

Canvas si nech na křivky a velké množství bodů. U jednoduchého grafu je to
zbytečná složitost, která s sebou nese celou třídu chyb.

---

---

# Session 22 (2026-09-12 až 2026-09-16) · v10.59 → v10.82

> Nová poučení ze Session 22. Navazuje na SKILL 44.

## SKILL 45 – Navrhuj podle chování, ne podle názvu (Session 22)

Návrh bodování Finančního obrazu vznikl z popisků v HTML. Metrice „Kam růst
přistál" jsem přiřadil význam „kolik z přírůstku skončilo v úsporách" — věta,
která se v kódu ani v UI nikde nevyskytuje. Kód přitom počítal
`min(růst výdajů, součet všech šablon)`, což neměřilo nic.

**Když navrhuješ nad existující metrikou, popis musí být citace z výpočtu.**
Do návrhu patří u každé položky řádek „počítá se jako …". Kdyby tam muselo
stát `min(dExp, součet šablon)`, nesrovnalost vyskočí okamžitě.

Varianta SKILL 35 v jiné roli: tam ověřovat chování místo tvaru, tady
navrhovat podle chování místo podle názvu.

---

## SKILL 46 – Změna, která se nedotáhne, je horší než žádná (Session 22)

Přechod na jednu transakci za účtenku (v10.73) měl tři důsledky, které jsem
neprošel:

- `syncReceiptToTransactions()` filtrovala položky podle kategorie transakce —
  editace účtenky by zahodila většinu rozpadu (FIX-342)
- hodnocení útrat sčítalo transakce i položky; překryv byl dřív částečný, teď
  úplný (FIX-343)
- tagy přičítaly celou částku transakce ke každému tagu (FIX-339)

**Po změně datového modelu projdi všechny konzumenty**, ne jen místo, kde se
model tvoří. `grep` na název pole je minimum.

Všechny tři našel až systematický průchod řetězcem — projeví se totiž až při
editaci nebo v jiné kartě.

---

## SKILL 47 – Tiché selhání je horší než pád (Session 22)

Čtyři různé chyby jedné session měly stejný tvar: **něco se nepovedlo a nikdo
se to nedozvěděl.**

- prompt nutil analyzér srovnat čísla → rozpor zmizel dřív, než ho kontrola našla
- bump `CACHE_NAME` měl v kotvě datum → přestal sedět a tiše nic nedělal
- `_obrazV1Card()` vracela při selhání prázdný řetězec → karta zmizela
- `_dataSig()` sledoval neexistující pole → součet vždy 0

**Když něco nejde spočítat, řekni to.** Prázdná karta vypadá jako „nic se
nezměnilo". Textová náhrada, která nic nenahradila, vypadá jako úspěch.

U bumpů a náhrad: **po každém kroku ověř, že se změna zapsala.**

---

## SKILL 48 – Testy jsou nástroj session, ne Milanův postup (Session 22)

V S22 vzniklo 18 testovacích souborů. Milan je nespouští — a ani nebude, není
programátor a nemá k tomu prostředí.

**Důsledky:**

- Test má cenu **uvnitř session**, kde ho po napsání rovnou spustím. Jako
  záruka do budoucna nefunguje, protože ho nikdo nespustí.
- Nemá smysl posílat testy k nasazení jako „pojistku". Patří do repozitáře
  jako dokumentace záměru.
- **Zato má smysl ověřit, že test chytá.** U `smoke_schema.js` jsem do kódu
  zavedl dvě chyby a zkontroloval, že je nahlásí. Test, u kterého se to
  neověří, je dekorace.
- Pokud má sada přežít session, potřebuje jednoduchý spouštěč a musí projít
  **celá** — 21 padajících testů znamená sadu, které nikdo nevěří (TODO-270).

---

## SKILL 49 – Ukládej jen to, co se nedá dopočítat (Session 22)

Transakce nesou datum, takže součty za libovolný měsíc jdou spočítat kdykoli
znovu — i ze zpětně dopsaných záznamů. Ukládat je znamená vyrábět data, která
můžou zastarat.

**Snímkovat se musí jen to, co historii nemá:** objem šablon, přesčasy, čisté
jmění. Vše ostatní se počítá z transakcí.

Protipříklad ze stejné session: snímek predikce se naopak měnit **nesmí** —
zmrazuje, co model tvrdil, aby se to dalo srovnat se skutečností. Rozdíl je
v tom, jestli ukládáš **výsledek** (dopočítatelný) nebo **tvrzení v čase**
(nedopočítatelné).

---

# Session 23 (2026-09-25) · v10.82 → v11.04

## SKILL 50 – Opravu ověř ve stavu, ve kterém ji uživatel uvidí (Session 23)

Barevnou škálu jsem ověřil s hodnotou 141; Milan má čerstvý účet a vidí prázdný stav. Test navíc šeď v prázdném stavu VYŽADOVAL (SKILL 34). Před „hotovo" projít: prázdný účet · jeden měsíc dat · plná historie.

---

## SKILL 51 – Když opravuješ vzor, prohledej všechny jeho výskyty (Session 23)

`? '' :` u karet Obrazu jsem ve v10.83 opravil na dvou místech a třetí nechal. `grep "? '' : \`"` v renderu stránky zabere minutu.

🔗 Totéž poučení jako SKILL 27 (Session 19) — v S23 se porušilo znovu.

---

## SKILL 52 – Schovaná nula maskuje chybu o patro výš (Session 23)

Karta slev se při 0 Kč skryla, takže přehlédnutá sleva nebyla vidět nikde. Prázdný stav má říct „0 a proč", ne zmizet.

🔗 Navazuje na SKILL 21 (Prázdný stav musí vysvětlovat, ne mlčet).

---

## SKILL 53 – Co jsem přidal navíc, musí být v dokumentaci — jinak to nikdo neobhájí (Session 23)

Vlastní položky v Příštím měsíci nebyly v Milanově zadání; přidal jsem je v S19 sám a nikde nezdůvodnil. O čtyři sessions později se ptal „proč to tam je" a nešlo odpovědět jinak než čtením kódu. Každá funkce nad rámec zadání patří do `decisions.md` s důvodem, jinak je to nedohledatelný dluh.

---

## SKILL 54 – Hlas změnu i s cestou, ne jen jménem karty (Session 23)

Plán S18 mluvil o „Kam směřuju" v Radaru; v10.87 upravila „Kam směřuju" ve Finančním obrazu a hlášení to neřeklo. Milan hledal změnu v Radaru a nenašel ji. Jméno karty v appce není jednoznačné — cesta (stránka → záložka → karta) ano. Kontrola před odesláním: u každé změny je uvedená cesta? Existuje v appce jiná karta se stejným nebo podobným jménem? Pokud ano, řekni výslovně, kterou jsi upravil.

---

## SKILL 55 – Text, který popisuje kód, je pořád text (Session 23)

Changelog, poznámky a nápovědy se vkládají do `innerHTML`; jakmile popis opravy obsahuje ukázku HTML (`<img onerror=…>`), prohlížeč ji spustí. Každý text z datové struktury (VERZE_LOG, oznámení, názvy od uživatele) escapovat přes `escHtml`, i když ho píšu já. Kontrola: `grep` na `innerHTML` + `${` bez `escHtml` v renderech textových seznamů.

---

## SKILL 56 – Testuj routu, ne jen handler (Session 23)

`handleInflace` fungovala; rozbité bylo jen volání v routě o 500 řádků výš. Test, který volá funkci napřímo, přehlédne chybu v místě, kde se funkce volá. U workeru vždy aspoň jeden test přes `default.fetch(new Request(...))`.

---

## SKILL 57 – Externí zdroj dat se změní — počítej s tím (Session 23)

`/inflace` se napsal v S22 proti formátu, který ČSÚ o pár měsíců později zrušil. Obrana: (a) parser podle názvů sloupců, (b) při neznámém formátu chyba S UKÁZKOU dat (jeden screenshot místo diagnostické dávky), (c) test přes skutečný `fetch()` workeru, (d) záloha v appce, aby výpadek zdroje nic nerozbil.

---

## SKILL 58 – Dvojitý kontext je zrádnější než HTML (Session 23)

Text uvnitř `onclick="fn('TADY')"` prochází dvěma parsery. `escHtml` sám nestačí (nechá apostrof projít jako `&#39;`, který prohlížeč v atributu dekóduje zpět), stejně jako samotný JS escape (nechá projít `"`). Pořadí: nejdřív JS, pak HTML. Ještě lépe: data do `data-*` atributů a handler přes `addEventListener`.

---

## SKILL 59 – Testy nesmí viset na číslech řádků (Session 23)

`smoke_escape_admin.js` filtroval výjimku podle „řádek 708x"; přidání záznamu do VERZE_LOG ho posunulo a test spadl na místě, které je v pořádku. Filtrovat podle okolního kódu.

---

## SKILL 60 – Catch-all rewrite umlčí 404 (Session 23)

Pravidlo „všechno → index.html" je pohodlné pro SPA, ale chybějící obrázek, skript nebo datový soubor pak vrátí HTML se stavem 200. Chyba se neprojeví v konzoli ani v monitoringu a odhalí ji až cizí nástroj. Rewrites psát adresně.

---

## SKILL 61 – TWA sdílí úložiště s prohlížečem (Session 23)

Aplikace z Google Play postavená jako TWA běží v Chromu na stejné doméně → `localStorage`, cookies i IndexedDB jsou **společné** s obyčejnými panely. Cokoli, co má platit jen v jednom z nich (režim appky, příznak instalace), patří do `sessionStorage` nebo se musí odvozovat pokaždé znovu.

---

## SKILL 62 – Když se změní způsob zobrazení čísla, najdi všechna místa, kde se to číslo ukazuje (Session 23)

v10.85 opravila Dashboard, ale stejné skóre se vypisuje i v Měsíčním reportu — a ten zůstal na staré škále. Po takové změně: `grep` na název metriky i na proměnné (`rawTotal`, `rawMax`), a výpočet přesunout do jedné funkce, aby další obrazovka nemohla vzniknout s vlastní verzí.

---

# Session 24 (2026-09-26 až 2026-10-03)

## SKILL 63 – Kopie z GitHubu má jiné konce řádků než Milanovy soubory (Session 24)
Repo jde naklonovat (`git clone --depth 1 -b dev https://github.com/bcmilda/financeflow.git`), ale CRLF soubory
(`settings.js`, `assets.js`, `budouci.js`, `share.js`, `charts.js`, `ai.js`, `import.js`…) jsou v gitu s LF → sha256
nesedí s `?v=` v `app.html`. Takový soubor brát z Projektu a editovat v binárním režimu se zachováním `\r\n`
(v S24 `settings.js`). Smoke testy čtou soubory z jedné ploché složky.

## SKILL 64 – Když FIX nezabral, hledej mimo soubor, který opravuješ (Session 24)
FIX-383 přeskládal `ean.html`, kamera dál nešla; příčina byla hlavička `Permissions-Policy` ve `firebase.json`.
Ověřit prostředí: HTTP hlavičky, pravidla DB, CSP, service worker cache.

## SKILL 65 – Data mimo `users/{uid}/data` potřebují vlastní úklid i zálohu (Session 24)
Každý nový uzel `users/{uid}/xxx` přidat do „Vymazat data" (`confirmDeleteAllData`), do zálohy a do GDPR přehledu.
FIX-397: měřidla a učení kategorií přežila vymazání dat.

## SKILL 66 – Peníze z jiného formuláře musí mít peněženku (Session 24)
Každá transakce založená mimo hlavní formulář (příspěvek, doplatek, účtenka) musí nastavit `wallet`, jinak ji
`computeWalletBalance` nepřičte a Dashboard nesouhlasí s Transakcemi (FIX-391, dřív FIX-350).

## SKILL 67 – Pauzu (throttle) vázat na vstup, ne globálně (Session 24)
Globální „max. jednou za 30 s" spolkne nový požadavek, který přišel hned po předchozím (FIX-395). Klíčem pauzy má být
podpis vstupu (sada názvů); souběžný požadavek zapsat a spustit po doběhnutí.

## SKILL 68 – Vazbu dat dělat explicitně, ne přes název (Session 24)
Párování záloh přes název podkategorie se rozbilo přejmenováním (FIX-394). U vazeb mezi moduly ukládat id
(`t.energie.meridloId`); název jen předvyplňuje.

## SKILL 69 – Výstupy v session nemazat (Session 24)
Milan nasazuje často až několik verzí najednou. `rm -rf /mnt/user-data/outputs/*` mu vzalo soubory, které si ještě
nestáhl (i náhled reportu). Výstupy jen přidávat/přepisovat, zálohu držet v `/home/claude/archiv/vX.YY`.
Soubory posílat jednotlivě, ne v zipu (náhledy).

## SKILL 70 – Text vedle čísla ověřit proti datům (Session 24)
Náhled reportu tvrdil „+71 Kč" a „víc než všechno pečivo", tabulka ukazovala +58 Kč. AI/šablonové věty skládat z
proměnných, ne psát čísla ručně; po vykreslení zkontrolovat, že tvrzení v nadpisu sedí s grafem (Graf 2.3 „celý měsíc
pod křivkou" neplatilo).

---

# Session 25 (2026-10-05 až 2026-10-09)

## SKILL 71 – Opakuje-li se stejný druh chyby, hledej společnou příčinu (Session 25)
Ve v11.43–v11.48 jsem opravoval ztracené fotky účtenek a EAN kódy po jedné (FIX-426, FIX-427). Milan: „Opravoval jsem je
po jedné, ale příčina pořád zůstává jinde v aplikaci – toto se musí odhalit a napravit.“ Audit ve v11.52 našel šest
mechanismů. Hlavní byl, že ozvěna vlastního uložení nahrazovala objekty (FIX-432).

Když přijde třetí podobná chyba, místo další záplaty:
1. Sepsat všechny cesty, kudy data tečou (zápis, příjem, offline, překreslení).
2. U každé se zeptat, co se stane s objektem, který právě někdo drží.
3. Opravit mechanismus, ne projev.

## SKILL 72 – Negativní kontrola: test musí na starém kódu selhat (Session 25)
Nový test synchronizace jsem pustil i proti kódu před opravou a selhal v 15–16 bodech. Teprve to dokazuje, že test chybu
opravdu chytá. Test, který projde na starém i novém kódu, nic neověřuje.

## SKILL 73 – U kritické vrstvy nezávislá revize ve více kolech (Session 25)
Sync vrstvu v11.52 kontroloval ve třech kolech agent, který ji nepsal. Našel 16 skutečných chyb (v kole 1 devět, v kole 2
pět, v kole 3 dvě, viz FIX-438), například offline smazání, které se vrátilo, nebo slučování přerušené odpojením. U dat
uživatele (sync, mazání, platby) revizi dělat vždy. Kolo končí, až nová kontrola nic nenajde.

## SKILL 74 – Stav hlásit tam, kde se uživatel dívá (Session 25)
Toast leží **pod** modálním oknem. Hláška „⏳ čtu živiny…“ ze skeneru se tak neukázala a Milan hlásil, že fotka „nic
neudělala“ (FIX-409). Uvnitř okna se stav (⏳ / ✅ / ⚠️) píše přímo do okna. Toast je jen pro stránku bez okna.

## SKILL 75 – Den nikdy přes UTC (Session 25)
`new Date(r, m, d).toISOString().slice(0, 10)` v letním čase vrátí předchozí den. Splátky dluhů vycházely o den dřív
(FIX-420). Pro „den“ skládat místní `getFullYear / getMonth / getDate`. Testy pouštět s `TZ=Europe/Prague`.

## SKILL 76 – Nepřebírat hodnotu mezi významově různými poli (Session 25)
Navrhl jsem „použít z účtenky“ do názvu výrobku. Milan: „Jsou to různé názvy.“ Zkratka z pokladny („Smet.jogurt bílý 1kg KK“)
není název z obalu. Podobné pole může mít jiný význam. Převzít se smí jen to, co znamená totéž (balení), a ostatní
ukázat jako nápovědu (ADR-200).

## SKILL 77 – Každou kartu ověřit v Chromiu na šířce telefonu (Session 25)
Před přestavbou karty výrobku (v11.56) se:
- textová pole přelévala
- číslování se tlačilo
- název aliasu byl na kartě vícekrát

Na kódu to vidět nebylo, na screenshotu ano. Po každé úpravě karty:
1. Pustit Playwright s lokálním serverem a appkou přes `signInLocal()`.
2. Vyfotit kartu na šířce telefonu.
3. Zkontrolovat `scrollWidth > clientWidth` u všech prvků.
4. Screenshot poslat Milanovi.

## SKILL 78 – Staré úkoly vysvětlovat z dokumentace, ne z paměti (Session 25)
TODO-144 jsem popsal jako otevřenou cizí měnu. Ve skutečnosti je hotový od S15 a jen v tabulce S14 zůstalo „⏳ Otevřeno“.
Před vysvětlením ID vždy `grep -n "TODO-144" doc/todo.md` a číst **všechny** výskyty, hlavně ten nejnovější.

## SKILL 79 – Placená akce potřebuje synchronní zámek (Session 25)
Dvojí ťuknutí na Analyzovat poslalo dva dotazy a spotřebovalo dvě analýzy (FIX-439). Příznak typu „běží“ nastavit hned
na začátku handleru, před prvním `await`, a uvolnit ve `finally`. Zakázané tlačítko nestačí, protože se překreslí.

## SKILL 80 – Test na text upravit zároveň se změnou UX (Session 25)
Záměrné změny textů (např. „Česky: zatím chybí“ → „🇨🇿 Český název výrobku“) rozbily několik starších testů (ve v11.52–v11.57 bylo upraveno 14 testů). Při změně textu
v UI:
1. Hned `grep` testy na starý text.
2. Upravit je ve stejném bumpu.
3. V odpovědi napsat, které testy se měnily a proč.

Test se nesmí „opravit“ tak, že přestane kontrolovat chování.

## Dodatek v11.58–v11.60 (2026-10-09 večer) **(Session 25)**

## SKILL 81 – Sloupec s čísly musí existovat i v řádku, kde nic není (Session 25)
Měsíční report měl řádky `hodnota | doplněk`. Doplňkový `<span>` se vykreslil jen tam, kde nějaký doplněk byl, takže číslo v řádku bez doplňku uskočilo k pravému okraji („cik cak“, FIX-445). Stejně tak „nezměřeno“ bez sloupce odznaku.
- **Pravidlo:** pevná šířka sloupce a prázdný `<span>` i bez obsahu.
- **Kontrola:** v Chromiu změřit `getBoundingClientRect().right` hodnot ve všech řádcích, musí být shodné.

## SKILL 82 – „Nezměřeno“ není nula (Session 25)
Skóre `null` se zobrazilo jako „0 z 310“. Z nuly se pak odvodilo „+0 bodů“ a „🏆 Nejvyšší pásmo dosaženo“ (FIX-443). U každé hodnoty, která může být `null`:
- ukázat „–“ a důvod,
- všechny odvozené texty (změna, do známky, pásmo) potlačit.

Odečítat jde jen čísla na stejné škále.

## SKILL 83 – Karta musí vypadat stejně bez ohledu na zdroj dat (Session 25)
Políčka karty výrobku se zobrazovala jen tam, kde je dodala databáze podle kódu. Bez kódu karta „zmizela“ a nešla doplnit (FIX-446).
- **Pevný seznam políček:** prázdné = „----“ + tlačítko doplnit.
- **Když komunitní úložiště nejde použít,** je potřeba osobní úložiště (`S.uiCfg.karty`). Bez něj uživatel nemá kam data napsat.

## Dodatek v11.61 (2026-10-10) **(Session 25)**

### SKILL 84 · Obnova z externího zdroje = sloučení, ne přestavba **(Session 25, v11.61)**
Když se data periodicky obnovují z cizí databáze, nestavět záznam znovu a nezachraňovat seznam „chráněných“ polí. Seznam se zapomene rozšířit a nové pole se tiše smaže.
- Základem je uložený záznam.
- Cizí zdroj má výslovně vyjmenované, co smí aktualizovat a co jen doplnit.
- Lidská úprava se zamyká.

### SKILL 85 · Pole, které se čte, ale nikdy nežádá **(Session 25, v11.61)**
Když normalizace čte pole z API (`p.brand_owner`), zkontrolovat, že ho dotaz opravdu žádá (`fields=`). Jinak je výsledek vždy prázdný a vypadá to, že „databáze to nemá“. Test: projít klíče čtené v normalizaci proti seznamu v dotazu.
