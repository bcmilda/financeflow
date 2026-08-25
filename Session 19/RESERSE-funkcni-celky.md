# Rešerše funkčních celků FinanceFlow

**Stav k v10.00 (2026-08-22)** · 38 JS modulů · 43 500 řádků · 37 stránek

Popis hlavních karet: **co dělají, odkud berou data, podle jakých vzorců počítají**
a kde jsou hranice, za kterými se nezobrazí nic.

> Vygenerováno čtením kódu, ne z paměti. Čísla a prahy odpovídají skutečnému stavu.
> Přesné vzorce jsou v `formulas.md`, rozhodnutí v `decisions.md`.

---

## Mapa: stránka → funkce → modul

| Skupina | Stránka | Vstupní funkce | Modul |
|---|---|---|---|
| **Přehled** | Dashboard | `renderDashboard` + `renderNetWorth` | `ui.js` + `premium.js` |
| | Transakce | `renderTxPage` | `ui.js` |
| | Kalendář · Budoucí platby | `renderKalendar` · `renderBudouci` | `kalendar.js` · `budouci.js` |
| **Majetek** | Finanční aktiva · Půjčky | `renderAssets` · `renderDebts` | `assets.js` · `transactions.js` |
| **Plánování** | **Příští měsíc** | `renderPristiPage` | `pristi.js` |
| | Predikce · Radar · **Finanční obraz** | `renderPredikce` · `renderRadar` · `renderObraz` | `transactions.js` · `projects.js` |
| | **Detektor úspor** · Projekty | `renderDetektor` · `renderProjectGrid` | `projects.js` |
| **AI** | AI Rádce · **Analýza účtenek** | `renderAiPage` · `renderUctenky` | `ai.js` · `receipts.js` |
| **Analýzy** | **Měsíční report** · Report | `renderReport` · `renderReport2Page` | `projects.js` · `report.js` |
| | Inflace · Grafy · Statistiky · **Deník** | `renderInflace` · `renderGrafy` · `renderStats` · `renderDenik` | … |

---

## 1 · Dashboard

**Otázka:** *Jak na tom jsem právě teď?*

Karty příjmů, výdajů, salda a čisté hodnoty za zvolený měsíc, pod nimi rozpad
podle kategorií a nejbližší budoucí platby.

**Zdroj:** `getTx(měsíc, rok)` → `expSum()` / `incSum()`.
Čistá hodnota = `computeNetWorth()`: peněženky + aktiva − dluhy.

**Na co pozor:** součty vylučují `splitParent`, `isBalancing` a přesuny.
Rozpad po kategoriích jede přes `getActual()`, který od v9.81 **taky vylučuje přesuny**
(ADR-100) — do té verze si tyhle dvě čísla neodpovídala.

---

## 2 · Transakce

**Otázka:** *Co jsem kdy utratil?*

Seznam s filtry (kategorie, podkategorie, projekt, peněženka, typ platby, **měna**,
tagy, fulltext), řazením a hromadnými akcemi. Na mobilu se edituje **swipe gesty**,
ne tlačítky (ADR-075).

**Cizí měna:** transakce nese `amount` (původní částka), `currency` a `amtCZK`
(skutečně stržená částka, **zafixovaná**). Řádek ukazuje původní částku,
pod ní přepočet a od v9.90 i **kurzovou ztrátu** (`fxLossOf`).

**Vnitřní jednotka je vždy CZK.** Základní měna je jen brýle — proto každá agregace
musí přes `txCZK(t, D)` (SKILL 20).

---

## 3 · Příští měsíc 📅

**Otázka:** *Vyjdu do 15., než přijde výplata?*

Jediná karta, která odpovídá na konkrétní měsíc dopředu. Horizont je **záměrně jen
jeden měsíc** — delší výhled řeší Finanční obraz.

**Tři úrovně jistoty:**

| | Zdroj | Do součtu |
|---|---|---|
| 🟢 jisté | šablona nebo splátka s datem | ✅ |
| 🟡 pravděpodobné | historie 6 měsíců, `stabilityWeight ≥ 0,5` | ✅ |
| ⚪ nejisté | nepravidelný příjem | ❌ zvlášť |

**Nejisté se nezapočítávají schválně.** Kdo si podle brigády naplánuje výdaj
a peníze nepřijdou, dostane se do potíží.

**Jádro výpočtu — ošetření dvojího počítání:**
```
odhad běžných výdajů = max(0, Σ predictCat(všechny kategorie) − známé platby s datem)
```
Bez odečtu by nájem a splátky vešly do součtu dvakrát — `predictCat` je počítá z historie.
Obě čísla jsou uživateli vypsaná pod tabulkou, ne schovaná.

**Průběžný zůstatek** rozpouští odhad rovnoměrně (`odhad / početDní` na den).
**Kotva výplatního cyklu** = den největšího 🟢/🟡 příjmu (FIX-253).

---

## 4 · Predikce 🔮

**Otázka:** *Kolik utratím do konce roku?*

Matice kategorie × měsíc: skutečnost (YTD), předpoklad zbytku roku a čistá predikce
všech 12 měsíců.

**Jádro — `predictCat(catId, sub, m, y, D)`** v `helpers.js`:
```
avg      = getHistAvg()                 // průměr měsíčních součtů, jen dokončené měsíce
sezónní  = avg × SEASON[měsíc].mult     // prosinec ×1,35, leden ×0,85
+ bdayBoost                             // narozeniny v daném měsíci → kategorie Dárky
```
Fallback pro kategorie bez historie: aktuální měsíc přes `getActual()`.

**⚠️ Historicky nejrizikovější funkce v aplikaci.** `getHistAvg()` až do v9.80 sčítala
přes `t.amt` a nefiltrovala splity → cizí měny v nominálu, rozdělené transakce dvakrát
(FIX-252). Filtr je nyní **shodný s `getActual()`**, protože se obě zobrazují vedle sebe
jako „odhad vs. skutečnost".

---

## 5 · Finanční radar 🎯

**Otázka:** *Jak mi utíká měsíc?*

Denní tempo útraty, týdenní rozpad, čtyři sloupce výhledu (Příjem / Plánovaný výdej /
Budoucí platby / Cashflow) a sekce **Od výplaty k výplatě**.

**Výplatní cyklus** (`radarPaydayInfo`) hledá pravidelný den příjmu a rozdělí historii
na cykly. Týdenní sloupce ukazují **medián** napříč cykly, od v9.95 i **whisker**
(minimum a maximum) — medián sám neřekne, jestli je týden stabilní.

**Výhled:** průměr příjmů a výdajů za 3 měsíce + známé budoucí platby.
Není to záruka, je to trend — a karta to říká nahlas.

---

## 6 · Finanční obraz 📈

**Otázka:** *Kam směřuju?*

Nejkomplexnější karta. Finanční skóre, zdravotní metriky, šestiměsíční projekce rezervy
a dluhu.

### Finanční skóre (0–100)

| Složka | Body | Co měří |
|---|---|---|
| **S1 Cash flow** | 0–75 | `výdaje / příjmy` |
| **S2 Zadluženost** | 0–100 | **DTI** = `dluh / roční příjem` (0–60 b) + **DSTI** = `splátky / měsíční příjem` (0–40 b) |
| **S3 Rezerva** | 0–50 | `spořicí peněženky + rezervní aktiva / základ příjmu` = počet měsíců |
| **S4 Aktivní spoření** | 0–35 | `odloženo do investic / základ příjmu` |
| **S5 Rozpočet** | 0–50 | průměr zdraví kategorií vůči limitům |
| **Bonus** | až +30 | za nepřerušenou řadu měsíců, kdy výdaje klesly |

```
rawMax = 310
total  = round((Σ složek + bonus) / 310 × 100)
```
Hodnocení: ≥90 % Výborné · ≥75 % Velmi dobré · ≥60 % Dobré · ≥45 % Průměrné.

Bodové tabulky jsou v `scoring-config.json` (ADR-060), ne natvrdo v kódu.

**⚠️ `computeBaseIncome()` vstupuje do S1, DTI, DSTI, S3 i S4.** Chyba v něm zasáhne
celé skóre — přesně to byl FIX-252/A.

**⚠️ S4 stojí na `getActual()` nad kategoriemi typu `transfer`.** Proto **není** filtr
přesunů plošný (ADR-100) — plošně by `totalSaved` spadlo na nulu a skóre o 35 bodů.

---

## 7 · Detektor úspor 🔍

**Otázka:** *Kde mi peníze tečou, aniž bych o tom věděl?*

Deset detektorů: předplatná, bankovní poplatky, pojištění, telefon a internet,
kategorie přes limit, časté drobné nákupy, jídlo venku, drahé půjčky (úrok > 7 %),
„výplata efekt" a od v9.90 **kurzy a poplatky**.

**Zdroj:** jeden vyčištěný seznam `detTxs` — bez vyrovnání, bez rodičů splitu,
bez přesunů (FIX-254). Do v9.82 se rozdělený nákup počítal **dvakrát** a chyba šla
přímo do vět typu „ušetříš X Kč/měs".

**Kurzový nález** je jediný, který nevychází z odhadu procent, ale ze skutečného
rozdílu dvou uložených čísel:
```
kurz banky = amtCZK / amount        (594 / 20 = 29,70)
ztráta     = amtCZK − amount × fxRef
```
S rozpadem podle způsobu platby — *karta +2,1 % · bankomat +8,4 % · přepážka +11,2 %*.
To je rada, kterou lze následovat; samotné „nechal jsi tam 1 240 Kč" je konstatování.

**Prahy:** nález se ukáže při 3+ platbách za rok a ztrátě nad 200 Kč.

---

## 8 · Měsíční report 💚

**Otázka:** *Jak dopadl tenhle měsíc a zlepšuju se?*

Období 1–12 měsíců. Příjmy, výdaje, saldo, základ příjmu, výpočet výdajového zdraví,
zdraví kategorií vůči limitům, pět největších změn proti minulému měsíci, vývoj skóre.
Záložka **Poradce** přidává AI doporučení.

**Zdraví kategorie:** `computeHealthScores(D, m, y)` porovná útratu s limitem
a vrátí 0–100. Tohle číslo pak vstupuje do **S5** finančního skóre.

**Tón:** report mluví o budoucnosti. Nikdy „utratil jsi zbytečně", vždy
„kdybys polovinu přesměroval, máš za rok X".

---

## 9 · Report (matice) 🗂️

**Otázka:** *Jak se vyvíjely výdaje po sektorech napříč roky?*

Matice kategorie × (Měsíční / Roční YTD / srovnání s loňskem / jednotlivé roky / Σ),
seskupená do **sektorů podle COICOP oddílů ČSÚ** + samostatný sektor Splátky.

**Vlastní sektory** si uživatel může nadefinovat (`S.reportSectors`).

**Zobrazení:** holá čísla přepočtená do základní měny, symbol **jednou** v hlavičce
a v popisku — Milanovo pravidlo z v9.99.

**Sticky první sloupec** má pevných 170 px v hlavičce i těle; název sektoru je
ve vnořeném `<span>`, ne ve sticky buňce (FIX-262).

---

## 10 · Analýza účtenek 📸

**Otázka:** *Co přesně jsem koupil a zdražilo to?*

Nahraješ fotku nebo PDF, Claude API z ní vytáhne položky, ceny a obchod.
Vznikne transakce s rozpadem na položky.

**Zdroj pravdy pro cenu položky:**
```
lineAmt(it) = it.lineTotal ?? (it.price × it.qty)
```
`price` má **dvě sémantiky** — za kus nebo za kilo — a `price × qty` ignoruje slevy.

**Hlavní metrika je cena za balení**, ne za kilo. „Rohlík 43 g = 81 Kč/kg" je
matematicky správně a uživateli k ničemu. Přepočet na kg/l se dělá **jen u zboží
skutečně prodávaného na váhu** (`unit === 'kg' | 'l'`).

**Klíč položky musí obsahovat jednotku** — jinak srovnání vyrobí nesmysly (+2707 %).

Napojeno na `product-groups.json`: **402 skupin CZ-COICOP podle ČSÚ, 1 060+ klíčových
slov** včetně účtenkových zkratek (`JOG.`, `ROHL.`). Tohle je parser **českých** účtenek —
při případném překladu se nepřekládá.

---

## 11 · Inflace 🧮

**Otázka:** *O kolik zdražilo to, co opravdu kupuju?*

Osobní inflace z účtenek — ne z koše ČSÚ, ale z tvých položek.

**Dvě metriky:**
- **YoY** — porovnává mediány, odolné vůči jednorázovým výkyvům
- **první → poslední** — krajní ceny, citlivější, u krátké historie kolísá

Obě **vážené podílem položky na výdajích**. Rozpad podle obchodu a shrinkflace
(stejná cena, menší balení).

**⚠️ Sdílí výpočty s `receipts.js`** (`buildPricesTab`, `perUnitData`, `shrinkflation`).
Před psaním nové analýzy z účtenek se musí ověřit, jestli už neexistuje — jinak se
znovu zavedou opravené chyby.

---

## 12 · Deník 📖

**Otázka:** *Jak vypadal můj finanční život?*

Měsíční zápisky, milníky a od v9.89 **Osa života**: vodorovná osa událostí a etap
nad finančními křivkami.

**Tři křivky:** příjmy, výdaje, **kumulovaný tok**.

**Ne čisté jmění** — historicky ho spočítat nelze, aplikace nezná stav aktiv a dluhů
zpětně po měsících (ADR-106). Kumulovaný tok se z transakcí odvodit dá.

**Hustota se přizpůsobuje**, historie se neořezává: do 4 let po měsících,
do 12 let po čtvrtletích, dále po letech. U slučovaných košů **průměr na měsíc**,
jinak by přechod udělal umělý dvanáctinásobný skok.

Od v9.92 taky **souhrn hodnocení** (⭐ Stálo to za to?) a **vzorce** — den v týdnu,
způsob platby, druh nákupu, velikost útraty. Vzorec se ukáže při 5+ útratách
a rozdílu 0,6+ bodu, jinak jde o šum.

---

## 13 · Projekty 📁

**Otázka:** *Kolik stála dovolená a vejdu se do rozpočtu?*

Od v9.97 karta ukazuje **čas vedle peněz**: pruh rozpočtu se značkou „dnes"
a věta o tempu.
```
tempo    = utracenoPct / casPct × 100     // < 100 = utrácíš pomaleji než ubíhá čas
predikce = utraceno / casPct × 100        // lineární, jen při casPct > 5
```
Pruh je zároveň rozpadem podle kategorií. **Příjmy a Bilance se ukazují jen když
projekt příjem opravdu má** — dotace na rekonstrukci ano, dovolená ne.

**Graf** kumulativní útraty od 4 transakcí, **srovnávač** od 2 ukončených projektů
téhož typu. Dokud data nestačí, karta se nezobrazí vůbec (ADR-107).

---

## 14 · AI Rádce 🤖

**Otázka:** *Co bych měl dělat?*

Chat nad tvými daty. `buildFinanceContext()` sestaví shrnutí (příjmy, výdaje, kategorie,
dluhy, cíle, projekty) a pošle ho s dotazem přes **Cloudflare Worker** do Claude API.

**Worker ověřuje Firebase token a hlídá kvóty** podle tarifu (ADR-041) — klíč k API
se do prohlížeče nikdy nedostane.

**Kontext je záměrně v korunách**, i když má uživatel jinou základní měnu — vnitřní
jednotka je CZK a míchat v jednom promptu dvě měny by model mátlo.

---

## Průřezová pravidla

**Peníze:** ukládají se v CZK · sčítají přes `txCZK(t, D)` · zobrazují přes `fmtB()`
nebo `_cNum()` + `curSym()` u vlastních jednotek. Nikdy nemíchat s kg/l/ks (SKILL 26).

**Vyloučení z agregací:** vždy `splitParent`, `isBalancing`, `isTransferTx` —
s výjimkou dotazu přímo na přesunovou kategorii (ADR-100).

**Prahy:** dokud data nestačí, karta se nezobrazí a řekne proč. Falešný vzorec je
horší než chybějící funkce — uživatel mu uvěří.

**Tón:** aplikace nikdy neoznačí útratu za zbytečnou. Mluví o budoucnosti,
ne o minulosti. Appka, která vyčítá, se maže.

---

## Co tahle rešerše nepokrývá

Správa (kategorie, peněženky, typy plateb, šablony), import dat, sdílení a rodina,
admin panel, Nákupní seznam, Narozeniny, Simulace života, Kurzy měn, Komunitní přehled.
Jsou to funkce spíš obslužné — dá se doplnit, pokud budeš chtít.
