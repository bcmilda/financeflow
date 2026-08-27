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
