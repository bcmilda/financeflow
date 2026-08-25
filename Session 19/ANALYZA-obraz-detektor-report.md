# Hloubková analýza · Finanční obraz · Detektor úspor · Měsíční report

**Stav k v10.01 (2026-08-22)** · zdroj: `projects.js` (6 343 řádků), `premium.js`, `helpers.js`

Všechny konstanty, prahy a vzorce jsou **vyčtené z kódu**, ne z paměti.
U každé karty: co počítá · odkud bere data · přesné vzorce · prahy · slabiny.

| Karta | Funkce | Řádky |
|---|---|---|
| Měsíční report | `renderReport()` | 969–1839 |
| Finanční obraz | `renderObraz()` | 3748–4653 |
| Detektor úspor | `renderDetektor()` | 4654–5280 |

---
---

# ČÁST 1 · Společný základ

Všechny tři karty stojí na stejných třech funkcích. Kdo jim nerozumí, nerozumí ani kartám.

## 1.1 · `computeBaseIncome(D)` — základ příjmu

**Nejdůležitější číslo v aplikaci.** Vstupuje do S1, DTI, DSTI, S3, S4, do všech limitů
kategorií a do většiny hlášek.

```
Pro každou příjmovou kategorii (type = income | both):
    avg = Σ příjmů za POSLEDNÍ 3 DOKONČENÉ měsíce / 3
    weight = cat.stabilityWeight  ?? (cat.stable === true ? 1.0 : 0)

baseIncome = round( Σ (avg × weight) )
```

**Váhy podle charakteru příjmu** (ADR-044, výchozí z `INCOME_CHAR_DEFAULT_WEIGHT`):

| `incomeChar` | Váha | Význam |
|---|---|---|
| `regular` | 1,0 | mzda, důchod, rodičovský příspěvek |
| `passive` | 0,7 | pronájem, dividendy |
| `irregular` | 0,4 | brigáda, zakázky |
| `onetime` | 0,0 | prodej auta, dar |

**Fallback:** pokud **žádná** kategorie nemá váhu > 0, použije se prostý průměr všech
příjmů za 3 měsíce. Bez toho by nový uživatel měl základ 0 a všechny limity by
vyšly nulové.

### Slabiny
1. **Okno jsou přesně 3 měsíce, natvrdo.** Kdo zvýší plat, čeká čtvrt roku, než se
   to promítne do limitů. Kdo přijde o práci, má tři měsíce nadhodnocené limity.
2. **Vázáno na `S.curMonth`**, ne na dnešek — při prohlížení starého měsíce se počítá
   z jeho tehdejšího okolí. Je to správně, ale nečekaně: dvě obrazovky ukážou
   jiný „základ příjmu" podle toho, který měsíc má uživatel navolený.
3. **Neoznačené kategorie mají váhu 0.** Kdo si příjmy nenastavil, dostane fallback —
   a ten ignoruje stabilitu úplně. Rozdíl mezi „nenastaveno" a „nastaveno na 0"
   se nedá rozlišit.
4. **FIX-252/A (v9.81):** až do této verze zde bylo `t.amount || t.amt` místo `txCZK`.
   Kdo měl příjem v cizí měně, měl **celé finanční skóre počítané z nominálu**.

---

## 1.2 · `computeCatHealth(cat, spent, baseIncome)` — zdraví kategorie

Vrací **0–100** nebo `null` (kategorie bez limitu se do průměru nepočítá).

**Výdajové kategorie — limit je STROP, platí PŘÍSNĚJŠÍ ze dvou:**
```
limitByPct = healthPct > 0 && baseIncome > 0 ? baseIncome × healthPct / 100 : Infinity
limitByAmt = healthAmt || Infinity
limit      = min(limitByPct, limitByAmt)

spent = 0            → 100
ratio ≤ 0,8          → 100
ratio ≤ 1,0          → 100 − (ratio−0,8)/0,2 × 30      // 100 → 70
ratio ≤ 1,5          →  70 − (ratio−1,0)/0,5 × 50      //  70 → 20
ratio > 1,5          → max(0, 20 − (ratio−1,5) × 20)   //  20 →  0
```

**Spořicí a investiční kategorie — limit je MINIMUM, platí VYŠŠÍ ze dvou:**
```
minTarget = max(baseIncome × healthPct / 100, healthAmt || 0)
score     = min(100, round(spent / minTarget × 100))
```

**`Infinity` je tu záměr, ne chyba** (FIX-177): nevyplněné procento nesmí limit
nastavit na nulu. Před opravou dávalo `limitByPct = 0` → `min(0, Kč) = 0` →
kategorie s limitem v korunách se tvářila jako „bez limitu".

### Slabiny
1. **Zlomy 0,8 / 1,0 / 1,5 jsou natvrdo v kódu**, na rozdíl od skóre S1–S5,
   které je v `scoring-config.json`. Nekonzistence.
2. **Nulová útrata = 100 bodů.** Kategorie, do které jsi celý měsíc nesáhl, táhne
   rozpočtové zdraví nahoru. U „Zdraví" nebo „Opravy" to průměr uměle vylepšuje.
3. **Skóre je nespojité v nule:** 0 Kč → 100, ale 1 Kč při limitu 100 Kč → taky 100.
   Skok nastane až nad 80 % limitu.

---

## 1.3 · `computeHealthScores(D, m, y)` — tři složky zdraví

```
overall = round( (expScore + budgetScore + savingScore) / 3 )
```

| Složka | Vzorec | Když chybí data |
|---|---|---|
| **expScore** (výdajové) | `msc_S1(totalExp / totalInc) / _SCORING.max.S1 × 100` | příjem 0 a výdaj > 0 → **0**; oboje 0 → **50** |
| **budgetScore** (rozpočtové) | průměr `computeCatHealth()` přes kategorie **s limitem** | žádný limit → **75** |
| **savingScore** (úsporové) | `msc_S4(totalSaved / baseIncome × 100) / _SCORING.max.S4 × 100` | bez spořicích kategorií → **50** |

Bodové tabulky `msc_S1` (0–75 b) a `msc_S4` (0–35 b) jsou v `scoring-config.json`
(ADR-060), ne v kódu.

**Kategorie „Virtuální přesun" se ze spoření vyřazuje** — je to technická kategorie
pro převody mezi vlastními účty, ne skutečné odkládání.

### Slabiny
1. **Výchozí hodnoty 50 a 75 nejsou neutrální.** Uživatel bez limitů dostane
   rozpočtové zdraví 75 „zadarmo". Vypadá to jako měření, ale je to konstanta.
2. **Rovnoměrná váha 1/3 : 1/3 : 1/3.** Rozpočtové zdraví postavené na dvou
   kategoriích s limitem má stejnou váhu jako výdajové zdraví z celého měsíce.
3. **`savingScore` stojí na `getActual()` nad kategoriemi typu `transfer`.**
   Proto je filtr přesunů v `getActual()` **úmyslně nepološný** (ADR-100) — plošný
   by vrátil `totalSaved = 0` a shodil skóre až o 35 bodů.

---
---

# ČÁST 2 · Měsíční report (`renderReport`, ř. 969–1839)

**Otázka:** *Jak dopadl tenhle měsíc a zlepšuju se?*

Období volitelné 1–12 měsíců (`periodToMonths(_reportPeriod)`), plus záložka
**Poradce** s AI doporučeními.

## 2.1 · Sekce 1 — Přehled období

```
totalInc  = incSum(getTx(m, y))
totalExp  = expSum(getTx(m, y))
saldo     = totalInc − totalExp
expDiff   = prevExp > 0 ? round((totalExp − prevExp) / prevExp × 100) : null
incDiff   = prevInc > 0 ? round((totalInc − prevInc) / prevInc × 100) : null
```

**`null` místo nuly, když chybí srovnání** — bez předchozího měsíce se neukáže
„0 %", ale pomlčka. Jinak by první měsíc vypadal jako stagnace.

## 2.2 · Sekce 2 — Výpočet výdajového zdraví

Nejtransparentnější místo v celé aplikaci — vypisuje **celý řetězec**:

```
5 022 ÷ 13 000 = 0,39  →  tabulka S1  75/75 b  →  skóre 100/100
```

Vzniklo na Milanovu otázku „proč 75 vs. 83?" (S16.15). Předtím banner průměroval
jen **zobrazené** dlaždice, zatímco skóre počítalo ze všech — dvě různá čísla
na jedné obrazovce bez vysvětlení.

## 2.3 · Sekce 3 — Zdraví kategorií

Dlaždice na kategorii s limitem: útrata, limit, tenký pruh, trend proti minulému
období (**vždy oranžově**, ne zeleně/červeně — trend není hodnocení).

**Popisek limitu se liší podle typu:**
```
spoření/investice:  „min 10 %"  nebo  „min 3 000 Kč"
výdaje:             „strop 3 000 Kč"      (když je Kč přísnější)
                    „15 % základu"        (když je % přísnější)
```

## 2.4 · Sekce 4 — Co se nejvíc změnilo

Pět největších pohybů proti minulému měsíci. **Změny pod 100 Kč se neukazují** —
šum by přebil signál.

## 2.5 · Sekce 5 — Stav bohatství, účtenky, milníky, výhled, hodnocení

| Podsekce | Co přidává |
|---|---|
| **Stav bohatství** | report dosud končil u toku peněz; tohle odpovídá na „jsem na tom líp?" |
| **Z účtenek** | položkový rozpad — jediná věc, kterou umí FinanceFlow a konkurence ne |
| **Milníky období** | kontext, **ne hodnocení** — narozeniny, dovolená |
| **Výhled** | report se dosud díval jen dozadu |
| **Výsledky hodnocení útrat** | TODO-198: data se sbírala, ale nikde se nezhodnotila |

## 2.6 · Sekce 6 — Souhrn výdajů

Zobrazuje se **jen při jednoměsíčním období** a **ne pod Poradcem** (S16.15 —
tam se ukazoval omylem).

### Slabiny Měsíčního reportu
1. **Sedm sekcí na jedné stránce** je hodně. Sekce 5 obsahuje pět nezávislých
   podsekcí přidávaných postupně — struktura je spíš historická než logická.
2. **`_reportPeriod` mění význam čísel**, ale ne všechny popisky. Při 6 měsících
   je „Souhrn výdajů" skrytý, „Zdraví kategorií" ale počítá jen poslední měsíc.
3. **DTI a DSTI** používají `computeEffectiveIncome(D, 12)` — **jiný základ**
   než zbytek reportu (`computeBaseIncome` = 3 měsíce). Záměr (stabilita napříč
   měsíci, TODO-160), ale uživateli to nikde nevysvětlujeme.

---
---

# ČÁST 3 · Finanční obraz (`renderObraz`, ř. 3748–4653)

**Otázka:** *Kam směřuju?*

Devět sekcí. Nejkomplexnější karta v aplikaci.

## 3.1 · Finanční skóre (0–100)

Počítá `computeFinancialScore()` v **`premium.js`**, ne v `projects.js`.

| Složka | Body | Vzorec |
|---|---|---|
| **S1 Cash flow** | 0–75 | `výdaje / příjmy` |
| **S2 Zadluženost** | 0–100 | DTI `dluh / roční příjem` (0–60) + DSTI `splátky / měsíční příjem` (0–40) |
| **S3 Rezerva** | 0–50 | `(spořicí peněženky + rezervní aktiva) / baseIncome` = počet měsíců |
| **S4 Aktivní spoření** | 0–35 | `odloženo do investic / baseIncome` |
| **S5 Rozpočet** | 0–50 | průměr `computeCatHealth()` |
| **Bonus** | 0–30 | za nepřerušenou řadu měsíců s klesajícími výdaji |

```
rawMax = 310
total  = round( (Σ složek + bonus) / 310 × 100 )
```

Hodnocení: **≥ 90 %** Výborné · **≥ 75 %** Velmi dobré · **≥ 60 %** Dobré ·
**≥ 45 %** Průměrné · níž Slabé.

## 3.2 · FFR — Financial Freedom Ratio

```
passiveInc = Σ getIncActual(kategorie s incomeChar === 'passive')
exp        = expSum(getTx(m, y))
ratio      = exp > 0 ? round(passiveInc / exp × 100) : null
```

| Ratio | Fáze |
|---|---|
| ≥ 100 % | Finanční nezávislost 🎉 |
| ≥ 75 % | Téměř svobodný |
| ≥ 25 % | Částečná svoboda |
| < 25 % | Závislost na práci |

**FIX-187 (v8.72):** dřív používalo `getActual` (jen výdaje) → pasivní příjem
vždy 0 a jediným „zdrojem příjmu" byla výdajová kategorie. Nesmysl.

**Slabina:** počítá se z **jednoho měsíce**. Dividendy vyplácené čtvrtletně
udělají skok ze 4 % na 40 % a zpět.

## 3.3 · Wealth Momentum

```
withData  = měsíce, kde inc > 0 nebo exp > 0
perMonth  = round( Σ savings / počet withData )
```

**Slabina:** prostý průměr bez váhy stáří. Jeden mimořádný měsíc (prodej auta)
posune momentum na roky dopředu.

## 3.4 · Růst životního stylu

Přejmenováno z „Inflace životního stylu" (v9.44). **Důvod je poučný:** aplikace už
má osobní inflaci z účtenek. Dvě různé „inflace" o něčem jiném = zmatek.
**Slovo inflace zůstává vyhrazené cenám.**

Karta má **stabilní název a proměnný verdikt**. Dřív měnila název podle stavu,
takže si ji uživatel nemohl zapamatovat ani o ní mluvit.

**Expense Ratio vedle toho měří něco jiného:**
```
ER = ÚROVEŇ  (kolik z příjmu spotřebuju)   — funguje od 1. měsíce
verdikt = TEMPO (jak rychle roste)          — potřebuje 6+ měsíců
```
⚠️ **Nezobrazovat vedle míry úspor** — jsou komplementární: `ER = 100 % − SR`.

## 3.5 · Kam směřuju (TODO-166)

Šestiměsíční projekce rezervy a dluhu.

```
avg      = průměrný měsíční přebytek
resNow   = dnešní rezerva
res6     = resNow + avg × 6
doNuly   = ceil( |resNow| / avg )        // FIX-257
```

**FIX-257** je tu důležitý: dřív text hlásil „do plusu se takhle nedostaneš"
pokaždé, když `res6 ≤ 0` — ale podmínka větve je `avg > 0`, tedy rezerva **roste**.
Text popíral graf vedle sebe. Nyní se dopočítá, **za kolik měsíců** se nula překročí.

## 3.6 · Historie výplatních cyklů (TODO-167)

Cyklus = od výplaty k výplatě. Týdenní sloupce ukazují **medián** napříč cykly,
od v9.95 i **whisker** (min–max) — medián sám neřekne, jestli je týden stabilní,
nebo jestli jednou utratíš 500 a podruhé 15 000.

## 3.7 · Ušlý zisk

```
idleBase = Σ zůstatků účtů, jejichž úrok < referenční sazba
```
Kolik by peníze vydělaly, kdyby ležely na lepším účtu.

### Slabiny Finančního obrazu
1. **Devět sekcí, tři různé časové základy** — S1 z aktuálního měsíce,
   `baseIncome` ze 3 měsíců, DTI/DSTI z 12 měsíců, momentum ze všech.
   Čísla na jedné obrazovce nejsou souměřitelná a nikde to není napsané.
2. **Skóre se počítá v `premium.js`, zobrazuje v `projects.js`.** Kdo hledá,
   proč vyšlo 60/100, musí hledat ve dvou souborech.
3. **`rawMax = 310` je natvrdo.** Přidání složky S6 by znamenalo změnit konstantu
   na dvou místech.
4. **FFR z jednoho měsíce** — u nepravidelných pasivních příjmů skáče.

---
---

# ČÁST 4 · Detektor úspor (`renderDetektor`, ř. 4654–5280)

**Otázka:** *Kde mi peníze tečou, aniž bych o tom věděl?*

## 4.1 · Vyčištěný zdroj (FIX-254)

```js
detTxs = txs.filter(t => !t.isBalancing && !t.splitParent && !isTransferTx(t))
subTxs = detTxs.filter(t => t.type === 'expense')
```

**Vyloučení splitů je zde PLOŠNÉ**, na rozdíl od `getActual()`, kde se vyřazuje
jen rodič s dětmi. Důvod: Detektor hledá útraty **podle názvu**. Rodič nese jméno
celého nákupu, děti jeho rozpad — započítat obojí by nález vždy zdvojilo.

Do v9.82 se rozdělený nákup počítal dvakrát a chyba šla **přímo do vět typu
„ušetříš X Kč/měs"**.

## 4.2 · Deset detektorů — přesné prahy

| # | Detektor | Práh spuštění | Odhad úspory |
|---|---|---|---|
| 1 | **Předplatná** | rozpoznané z reálných transakcí | `částka × 0,25` |
| 2 | **Bankovní poplatky** | název obsahuje „poplatek / vedení účtu / banka" | `× 0,80` |
| 3 | **Alkohol** | — | `× 0,50` |
| 4 | **Časté položky** | `n ≥ 3` a `total ≥ 200 Kč`, měsíčně `≥ 100 Kč`, top 5 | `× 0,30` |
| 5 | **Kurzy a poplatky** | `n ≥ 3` plateb/rok a `ztráta > 200 Kč` | `× 0,50` |
| 6 | **Pojištění** | `total > 300 Kč`, 9 klíčových slov | `× 0,20` |
| 7 | **Telefon a internet** | — | `× 0,25` |
| 8 | **Kategorie přes limit** | `spent > limit × 1,2` | rozdíl nad limit |
| 9 | **Drahé půjčky** | `interest > 7 %` | přepočet na `max(5 %, interest × 0,65)` |
| 10 | **Zbytečné utrácení** | částka ≤ 300 Kč, `count ≥ 4`/měs, klíč ≥ 3 znaky | `× 0,50` |
| 11 | **Výplata efekt** | `week1Pct ≥ 60 %` **a** `expWeek1 > 3 000 Kč` | `× 0,20` |
| 12 | **Jídlo venku** | `total > 500 Kč` a `count ≥ 3` | měsíční odhad `× 0,30` |
| 13 | **Zdražení položek** | `changePct ≥ 10 %`, min. 2 ceny | z Analýzy účtenek |

## 4.3 · Kurzový nález — jediný bez odhadu

Všech ostatních dvanáct násobí koeficientem („ušetříš 25 % z předplatných").
**Kurzový nález počítá skutečný rozdíl dvou uložených čísel:**

```
kurzBanky = amtCZK / amount                 (594 / 20 = 29,70)
ztráta    = amtCZK − amount × fxRef
přirážka% = (kurzBanky / fxRef − 1) × 100
```

**Rozpad podle způsobu platby** je to podstatné:
```
💳 Karta +2,1 %  ·  🏧 Bankomat +8,4 %  ·  🏦 Přepážka +11,2 %
```
To je rada, kterou lze následovat. „Nechal jsi tam 1 240 Kč" je jen konstatování.

**Věta o rozdílu se ukáže jen když** `worst.pct − best.pct > 1,5` bodu a oba koše
mají `n ≥ 2` — jinak by se srovnávaly náhody.

**Okno je 12 měsíců**, ne měsíc jako u ostatních detektorů: zahraniční platby
jsou sezónní (dovolená) a měsíční vzorek by byl u většiny lidí prázdný.

### Slabiny Detektoru
1. **Koeficienty úspor jsou odhady bez opory v datech.** „Ušetříš 25 % z předplatných"
   je pravděpodobné, ale nikde neověřené. Sečtená „nalezená úspora" je součet dvanácti
   odhadů — číslo, které vypadá přesně a přesné není.
2. **Detekce podle názvu transakce.** Kdo píše „Alza" místo „Netflix", předplatné
   se nenajde. Kdo nepíše názvy vůbec, nedostane skoro žádné nálezy.
3. **Prahy jsou natvrdo v kódu** a nedají se nastavit. „Malá platba ≤ 300 Kč"
   je jinde v Praze a jinde na vesnici.
4. **Okno je aktuální měsíc** u většiny detektorů. Na začátku měsíce nemá z čeho počítat.
5. **Kurzový nález potřebuje `fxRef`**, který se sbírá až od v9.89. Starší transakce
   se vynechají — jejich počet se naštěstí ukáže.

---
---

# ČÁST 5 · Křížové závislosti

Změna v jedné funkci se propíše do všech tří karet:

```
computeBaseIncome  ──┬─→ S1, S3, S4 (skóre)          → Finanční obraz
                     ├─→ limity kategorií            → Report + Detektor #8
                     └─→ DTI, DSTI                   → Finanční obraz + Report

computeCatHealth   ──┬─→ budgetScore                 → Report sekce 2
                     └─→ S5                          → Finanční obraz

getActual          ──┬─→ zdraví kategorií            → Report
                     ├─→ totalSaved (S4, savingScore)→ Obraz + Report
                     └─→ útrata kategorie            → Detektor #8

predictCat         ──→ getHistAvg  ──→ 7 spotřebitelů včetně Příštího měsíce
```

**Praktický dopad:** oprava `getHistAvg()` (FIX-252) změnila čísla ve všech třech
kartách současně. Proto SKILL 12 vyžaduje audit spotřebitelů — a proto ADR-100
řeší filtr přesunů podle argumentu, ne podle volajícího.

---

# ČÁST 6 · Co bych opravil, kdyby byl čas

| Priorita | Co | Proč |
|---|---|---|
| 🔴 | **Sjednotit časové základy** nebo je aspoň popsat | Na Finančním obrazu jsou vedle sebe čísla ze 4 různých oken |
| 🔴 | **Nulová útrata ≠ 100 bodů** | Kategorie, do které jsi nesáhl, uměle vylepšuje rozpočtové zdraví |
| 🟡 | **Zlomy `computeCatHealth` do `scoring-config.json`** | Skóre už tam je, tohle ne — nekonzistence |
| 🟡 | **Výchozí 50 a 75 označit jako odhad** | Vypadají jako měření, jsou to konstanty |
| 🟡 | **Koeficienty úspor v Detektoru ověřit nebo označit** | Součet dvanácti odhadů vypadá jako přesné číslo |
| 🟢 | **FFR z klouzavého průměru** | Čtvrtletní dividendy dnes dělají skoky |
| 🟢 | **Přesunout `computeFinancialScore` k ostatnímu skóre** | Počítá se v `premium.js`, zobrazuje v `projects.js` |

---

## Metodická poznámka

Tenhle dokument popisuje **stav kódu**, ne záměr. Kde se liší komentář od chování,
uvádím chování. Kde jsem si nebyl jistý, je to označené jako slabina, ne jako fakt.

Zbývající karty (Radar, Deník, Predikce, Příští měsíc, Účtenky, Inflace, Projekty,
Statistiky, Grafy, AI Rádce) se dají zpracovat stejně — odhad 3–4 karty na sezení.
