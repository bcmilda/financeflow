# Hloubková analýza · Finanční radar · Příští měsíc · Inflace

**Stav k v10.01 (2026-08-24)** · zdroj: `projects.js` ř. 1840–3748, `pristi.js`, `inflace.js`

Třetí díl. Navazuje na `ANALYZA-obraz-detektor-report.md`
a `ANALYZA-komunita-uctenky.md`.

| Karta | Funkce | Rozsah |
|---|---|---|
| Finanční radar | `renderRadar()` + `renderRadarDailyChart()` + `renderRadarPayday()` | ~1 900 ř. |
| Příští měsíc | `pristi.js` (38. modul) | ~700 ř. |
| Inflace | `inflace.js` | ~370 ř. |

---
---

# ČÁST 1 · Finanční radar

**Otázka:** *Jak mi utíká měsíc a co mě čeká?*

Největší jednotlivá karta v aplikaci. Devět sekcí ve dvou režimech
(**Měsíc** / **Do výplaty**).

## 1.1 · Projekce konce měsíce (ř. 1861–1890)

Tři větve podle stavu měsíce:

```
minulý měsíc NEBO daysLeft === 0
    → projectedExp = totalExp          „Skutečné saldo · měsíc uzavřen"

daysElapsed >= 3 A totalExp > 0
    → dailyRate   = totalExp / daysElapsed
      projectedExp = totalExp + dailyRate × daysLeft
                                       „Projekce konce měsíce · tempo X/den"

jinak (méně než 3 dny)
    → projectedExp = totalExp          „Saldo (zatím) · N dní do konce"
```

**Práh 3 dny je dobré rozhodnutí.** Lineární extrapolace z jednoho dne by
u nájmu zaplaceného prvního dne předpověděla třicetinásobek.

**Slabina:** extrapolace je i tak čistě lineární. Kdo platí nájem 1. dne,
má v prvním týdnu tempo výrazně nadhodnocené, kdo 25., podhodnocené.
Radar sice odděluje `regular` a `variable` (viz 1.4), ale **ne tady** —
projekce míchá obojí.

## 1.2 · Predikce budoucnosti (ř. 2008–2085)

```
histMonths  = 3 předchozí měsíce (ne aktuální)
avgInc      = Σ incSum / 3
avgExp      = Σ expSum / 3

expectedIncMonth = isCurrentMonth ? max(totalInc, avgInc) : totalInc
eomLeft          = expectedIncMonth − totalExp − budToEOM
freeToSpend      = incForFree − totalExp − budRestMonth
```

**`max(totalInc, avgInc)` je záměr:** uprostřed měsíce před výplatou je
`totalInc` skoro nula. Bez toho by Radar hlásil katastrofu každý měsíc
do dne výplaty.

**Projekce na 3 měsíce dopředu:**
```
predExp        = max(avgExp, mBud)      // známé platby mohou průměr převýšit
monthSaldo     = avgInc − predExp
runningBalance += monthSaldo            // kumulativní, startuje z eomLeft
```

`max(avgExp, mBud)` řeší měsíc s velkou známou platbou (pojistka, STK) —
bez toho by predikce takový měsíc podhodnotila.

**Slabina:** `avgInc` a `avgExp` jsou **prostý průměr tří měsíců**, bez váhy
stáří a bez odstranění odlehlých hodnot. Jeden měsíc s dovolenou zvedne
`avgExp` na čtvrt roku dopředu.

## 1.3 · Výplatní cyklus — `radarPaydayInfo(D)`

Nejsložitější část Radaru. Čtyři režimy podle `freq`:

| Režim | Jak se určí cyklus |
|---|---|
| `irregular` | poslední reálný příjem → průměrná mezera z **posledních 6** výplat, min. 3 dny |
| `weekly` / `biweekly` | krok 7 nebo 14 dní od poslední reálné výplaty |
| `semimonthly` | dva pevné dny v měsíci |
| `monthly` (výchozí) | den `anchor`, posunutý přes víkend (`radarAdjustWeekend`) |

**`radarAdjustWeekend`** je detail, který dělá velký rozdíl: výplata 15. padne-li
na sobotu, reálně dorazí v pátek. Bez posunu by cyklus začínal o dva dny později
a všechny týdenní součty by se posunuly.

**Nepravidelný režim potřebuje 2+ příjmy**, aby spočítal mezeru. S jediným
příjmem použije výchozí `avgGap`.

## 1.4 · Rozpad podle charakteru výdaje (ř. 2810–2870)

Cyklus se dělí podle `expenseChar` kategorie na **regular / variable / other**.
Tohle je jádro sekce „Co žene variabilní výdaje" — nájem a splátky nejsou to,
co se dá tento měsíc ovlivnit, takže se počítají zvlášť.

```
prevStart  = poslední cyklus do stejného dne     // FÉROVÉ srovnání tempa
víkend vs. všední den = tempo podle getDay()
projekce konce cyklu = flexibilní tempo × zbývající dny
```

**„Minulý cyklus do stejného dne" (S12.1b) je správná úvaha** — srovnávat
15. den probíhajícího cyklu s celým minulým cyklem by vždy vypadalo skvěle.

## 1.5 · 🔴 Nalezená chyba — 10 míst se surovými částkami

Stejná třída chyby jako FIX-252 a jako FIX-266 v Komunitním přehledu.
**V Radaru přežila na deseti místech:**

| Řádek | Kontext | Dopad |
|---|---|---|
| 1957 | detekce předplatných | cizí měna v nominálu |
| **2454** | **denní graf — výdaje** | celý graf „den po dni" |
| **2456** | **denní graf — příjmy, hledání výplaty** | špatně určená výplata |
| 2675 | největší příjem = výplata | 1 200 EUR prohraje s 3 000 Kč |
| 2701 | nepravidelný cyklus | tamtéž |
| 2777 | kotva cyklu | tamtéž |
| **2827** | **týdenní rozpad podle charakteru** | tempo po týdnech cyklu |
| **2837** | **top variabilní kategorie** | pořadí kategorií |
| 2856 | start minulého cyklu | posunuté srovnání |
| 3416 | další hledání výplaty | tamtéž |

**Nejzávažnější jsou 2454 a 2456** — na nich stojí hlavní graf Radaru.
Kdo má výdaje v cizí měně, vidí graf počítaný z nominálu (100 € = 100 Kč).

**Řádky 2675, 2777, 2856, 3416 hledají „největší příjem"** porovnáním surových
částek — přesně chyba, kterou jsme opravili ve v9.82 v Detektoru (FIX-254).
Tady zůstala. Výplata 1 200 EUR prohraje s bonusem 3 000 Kč a **cyklus se
zakotví na špatný den**.

Doporučuju jako **FIX-267**, spolu s FIX-266 v jednom průchodu.

## 1.6 · Slabiny Radaru

1. **Devět sekcí, dva režimy** — nejpřeplněnější obrazovka v aplikaci.
2. **Projekce nerozlišuje regular/variable**, přestože rozpad existuje o sekci níž.
3. **Prostý průměr tří měsíců** bez odstranění odlehlých hodnot.
4. **`radarScore`** (safe/warn/danger) se odvozuje jen z **počtu** alertů, ne z jejich
   závažnosti. Jeden drobný warn a jeden velký warn dají stejný výsledek.

---
---

# ČÁST 2 · Příští měsíc

**Otázka:** *Vyjdu do 15., než přijde výplata?*

Nejmladší karta (v9.79). Na rozdíl od Radaru řeší **jeden konkrétní měsíc**
a **jmenovitě**, ne v průměrech.

## 2.1 · Tři úrovně jistoty

| | Zdroj | Do součtu |
|---|---|---|
| 🟢 jisté | šablona nebo splátka s konkrétním datem | ✅ |
| 🟡 pravděpodobné | historie 6 měsíců, `stabilityWeight ≥ 0,5` | ✅ |
| ⚪ nejisté | nepravidelný příjem | ❌ zvlášť |

**Nejisté se nezapočítávají schválně.** Kdo si podle brigády naplánuje výdaj
a peníze nepřijdou, dostane se do potíží. Karta místo toho ukáže
*„kdyby dorazily všechny, měl bys navíc X"*.

## 2.2 · Ošetření dvojího počítání — jádro karty

**Příjmy:**
```
avg    = Σ txCZK(příjmy kategorie za N měsíců) / N       // N = 6 dokončených
rest   = avg − Σ(šablony téže kategorie)
if (rest < PRISTI_MIN_ROW /* 300 Kč */) řádek se NEUKÁŽE
```

**Výdaje:**
```
odhad = max(0, Σ predictCat(všechny kategorie) − Σ známé platby s datem)
```

Bez odečtu by nájem a splátky vešly do součtu **dvakrát** — `predictCat` je
počítá z historie. **Obě čísla jsou uživateli vypsaná pod tabulkou**, ne schovaná.

Když odhad vyjde 0, karta vysvětlí proč (známé platby převýšily celou predikci),
místo holé nuly, která vypadá jako chyba.

## 2.3 · Kotva výplatního cyklu (FIX-253)

```
kotva = den NEJVĚTŠÍHO 🟢/🟡 příjmu v kalendářním měsíci
fallback → radarPaydayInfo(D).anchor
```

Původně se brala výhradně z `radarPaydayInfo()`. Když ten den nesedl na skutečnou
výplatu (vrátil 9., výplata chodí 5.), okno vyšlo 9. 9. – 8. 10. a **výplata do něj
nespadla** → posunula se na 5. 10. Cyklus, který má výplatou začínat, ji neobsahoval.

⚠️ **`radarPaydayInfo` je stále fallback** — a ten trpí chybou z bodu 1.5
(hledá největší příjem přes surové částky). U cizoměnových příjmů se tedy
Příští měsíc může zakotvit špatně, i když sám počítá správně.

## 2.4 · Průběžný zůstatek

```
drip = odhad běžných výdajů / početDní        // rovnoměrné rozpuštění
bal  = start (ručně zadaný, výchozí 0)
       + jisté a pravděpodobné příjmy v ten den
       − známé platby v ten den
       − drip
```

**Rovnoměrné rozpuštění je zjednodušení**, ale poctivé: alternativou by bylo
modelovat denní vzorec útraty, což by přidalo nepřesnost bez užitku.

**Startovní zůstatek je ručně zadaný** (s předvyplněním z `computeBank()`),
protože dopočítat ho projekcí zbytku aktuálního měsíce by znamenalo
stavět odhad na odhadu.

## 2.5 · Co je udělané dobře

- **Žádné surové částky** — 0 výskytů, jediná velká karta bez FIX-252 dluhu
- **Poznámky ukazují celý výpočet:** `170 298 Kč ÷ 6 měs. = 28 383 Kč · 6× v 6 z 6 měsíců · obvykle 5. dne`
- **Ruční úprava kteréhokoli řádku** i vlastní zápis
- **Kalibrace** — u proběhlého měsíce odhad vedle skutečnosti
- **Rollback** přes `PRISTI_ENABLED`

## 2.6 · Slabiny

1. **Závislost na `predictCat`** — dědí všechny jeho slabiny (sezónnost natvrdo,
   okno historie).
2. **Fallback kotvy na rozbitou funkci** (viz 2.3).
3. **Spoření a přesuny mimo součet** — správně věcně, ale z běžného účtu
   odtečou. Vědomé rozhodnutí, uživateli vysvětlené.
4. **Práh 300 Kč pro dopočet** je natvrdo. U příjmu 60 000 je 300 Kč šum,
   u 15 000 už ne.

---
---

# ČÁST 3 · Inflace

**Otázka:** *O kolik zdražilo to, co opravdu kupuju?*

Osobní inflace z **položek účtenek**, ne z koše ČSÚ.

## 3.1 · Sběr pozorování — `_inflCollect()`

```
zdroj = S.receipts
deduplikace: sig = store|date|total|početPoložek     // stejná účtenka dvakrát

klíč položky = název bez čísel a jednotek, max 25 znaků
               'mléko 1,5% 1l' → 'mléko %'
if (key.length < 3) přeskoč
if (price <= 0)     přeskoč

weighed   = unit === 'kg' || unit === 'l'
unit      = weighed ? it.unit : 'ks'
unitPrice = price     // u váženého Kč/kg, u baleného Kč/balení
```

⚠️ **`unitPrice` má dvě sémantiky.** Proto **klíč musí obsahovat jednotku** —
jinak se porovná cena za kus s cenou za kilo a vyjde zdražení o tisíce procent.

## 3.2 · Dvě metriky

```
firstLast:  pctFL  = (lastP − firstP) / firstP × 100
YoY:        medNew = medián cen za posledních 12 měsíců
            medOld = medián cen za předchozích 12 měsíců
            pctYoY = (medNew − medOld) / medOld × 100
```

**Proč obojí:**
- **YoY** pracuje s **mediány**, je odolná vůči jednomu výkyvu, ale potřebuje 2 roky dat
- **první → poslední** funguje hned, ale stačí jedna akční cena na kraji a číslo skáče

## 3.3 · Vážený index

```
wIdx(sel):
  valid = řádky, kde !single && sel(r) != null && isFinite
  W     = Σ spend(valid)
  index = Σ (sel(r) × spend(r)) / W
```

**Váha = podíl položky na výdajích.** Zdražení chleba o 10 % váží víc než
zdražení kaviáru o 50 %, protože chleba kupuješ pravidelně. **Stejný princip
jako spotřební koš ČSÚ**, jen s tvými vahami.

**Položky s jedinou cenou** (`single`) se zobrazí označené, ale **do indexu
nevstupují** — nemají s čím porovnávat. Dřív se zahazovaly úplně a po výběru
ve filtru se ukázalo „Žádné položky" bez vysvětlení (S17.20).

## 3.4 · Shrinkflace

```
perKgFirst / perKgLast     // doplňkově, jen u váženého i baleného
```

Když **balení zdraží jinak než cena za kilo**, znamená to, že se zmenšilo.
Rozdíl mezi „první → poslední" a YoY se zobrazuje jako samostatná dlaždice.

## 3.5 · Slabiny

1. **Klíč položky je název zkrácený na 25 znaků bez čísel.**
   `'mléko polotučné 1,5% 1l'` a `'mléko plnotučné 3,5% 1l'` → oba `'mléko %'`.
   **Dvě různé položky splynou v jednu** a jejich cenový rozdíl se tváří
   jako inflace. Nejzávažnější slabina modulu.
2. **Bere `it.price`, ne `lineAmt()`.** Zbytek aplikace používá
   `lineTotal ?? price × qty`, protože `price` ignoruje slevy.
   Tady se `price` bere přímo — u zlevněné položky tedy jinou cenu než jinde.
3. **Žádná ochrana proti odlehlým hodnotám** u `firstLast`. Jedna překlepnutá
   cena z AI (98 místo 9,80) posune index položky o stovky procent.
4. **YoY potřebuje 2 roky dat.** U uživatele, který skenuje půl roku, je vždy `null` —
   a karta ukáže dvě dlaždice, z nichž jedna je trvale prázdná.
5. **Duplicitní logika s `receipts.js`** — `buildPricesTab` počítá per-unit
   a shrinkflaci taky. Historicky se tu už jednou zavedly zpět opravené chyby.

---
---

# ČÁST 4 · Souhrn nálezů

| # | Nález | Karta | Závažnost |
|---|---|---|---|
| **FIX-267** | 10 míst se surovými částkami | Radar | 🔴 hlavní graf + kotva cyklu |
| — | Klíč položky slučuje různé produkty | Inflace | 🔴 zkresluje index |
| — | `it.price` místo `lineAmt()` | Inflace | 🟡 nekonzistence se zbytkem |
| — | Kotva Příštího měsíce dědí chybu Radaru | Příští měsíc | 🟡 |
| — | Projekce nerozlišuje regular/variable | Radar | 🟡 |
| — | `radarScore` počítá alerty, ne závažnost | Radar | 🟢 |
| — | Bez ochrany proti odlehlým cenám | Inflace | 🟢 |

**Doporučení:** FIX-266 (Komunitní přehled) a FIX-267 (Radar) v jednom průchodu —
je to stejná oprava na stejný vzor. Pak už by měl `tools/smoke_mena.js` rozšířený
o kontrolu surových částek hlídat, aby se nevrátila.

---
---

# ČÁST 5 · K tvé otázce na model

Poctivá odpověď: **nemůžu se s Sonnetem porovnat**, protože nevidím, co by
odpověděl. Můžu ale popsat, co tahle práce vyžaduje, a ty si porovnáš sám.

## Co na téhle analýze bylo těžké

**Nešlo o čtení kódu, ale o všímání si toho, co tam není.**

Nález FIX-267 nevznikl tím, že bych našel řádek s chybou. Vznikl tak, že jsem si
při čtení Radaru vzpomněl na FIX-252 z jiného modulu, na FIX-254 v Detektoru
a na FIX-266, který jsem našel o kartu dřív — a **napadlo mě ten vzor prohledat
znovu jinde**. Nikdo o to nežádal.

Podobně u Inflace: slabina s klíčem položky není v kódu označená, není v žádném
komentáři. Vyplynula z toho, že jsem si k `key.slice(0, 25)` domyslel konkrétní
příklad (`mléko polotučné` vs. `plnotučné`) a došlo mi, že splynou.

**To je práce, kde silnější model pomůže** — držet v hlavě souvislosti napříč
šesti moduly a třemi předchozími sezeními a spojovat je.

## Kde je to zbytečné

Většina toho, co v sezeních děláme, je mechanická:

- přepočet SHA-256 a bumpnutí verzí
- nahrazení `fmt(` za `fmtB(` na 109 místech
- zápis do VERZE_LOG
- spuštění testů

Tam by slabší model stačil úplně a byl by levnější i rychlejší.

## Co bych dělal na tvém místě

Rozdělil bych to podle typu úkolu, ne podle sezení:

| Úkol | Model |
|---|---|
| Hloubková analýza, audit vzorů, návrh architektury | silnější |
| Hledání příčiny chyby z popisu chování | silnější |
| Implementace podle zadání, refaktor, opravy | střední stačí |
| Verzování, hashe, changelog, mechanické náhrady | slabší |

**Praktický test:** vezmi jednu kartu, nech ji analyzovat slabším modelem
a porovnej s těmito třemi dokumenty. Konkrétně se dívej, jestli najde
**nálezy, o které jsi nežádal** — to je ten rozdíl, ne kvalita formulací.
