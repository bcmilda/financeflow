# FinanceFlow – Formulas & Business Logic

> Konsolidovaný dokument ze **3 sessions** (`formulas.md` → `formulas-1.md` → `formulas-2.md`).
> Každý vzorec označen zdrojovou session: `**(Session N)**`.
> Konflikty mezi sessions jsou explicitně vyznačeny.
> Poslední aktualizace: konsolidace 3 sessions, 2026-04-16.

---

## 🔴 Otevřené konflikty (TL;DR)

| # | Téma | Sessions | Status |
|---|---|---|---|
| 1 | **Finanční skóre – metodika** | S1+S3 (4×25b) vs S2 (3×gradient průměr) | 🔴 **Otevřené** – nutno ověřit v kódu, která metodika je aktuální. Možné, že obě existují (různé účely) |
| 2 | **ČNB limity (DSTI/DTI)** | S1 (DSTI <40%, DTI <800%) vs S2/S3 (DSTI <35%, DTI <700%) | ⚠️ S2/S3 jsou novější – S1 pravděpodobně zastaralá, ale ověř |
| 3 | **Sezónní koeficienty – důvody** | Čísla stejná, vysvětlení se liší | 🟢 Jen kosmetické, ponecháno jako historie |

---

## 1. FINANČNÍ SKÓRE (Finanční zdraví)

> 🔴 **Konflikt:** Existují dvě různé metodiky finančního skóre napříč sessions.
> **Akce:** Ověř v `premium.js` (funkce `computeFinancialScore(D)`), která je aktuální.

### 1.A Metodika A – 4 složky × 25 bodů = 100 **(Session 1 + Session 3)**
Skóre se počítá ze 4 složek, každá max 25 bodů.
Funkce: `computeFinancialScore(D)` v `premium.js` **(Session 3)**.

#### Složka 1 – Příjmy vs. Výdaje (max 25 b)
```
expRatio = totalExp / totalInc

expRatio ≤ 0.50  →  25 b  🟢 Výdaje pod kontrolou
expRatio ≤ 0.70  →  20 b  🟡
expRatio ≤ 0.85  →  14 b  🟡
expRatio ≤ 1.00  →   7 b  🟠
expRatio >  1.00  →   0 b  🔴 Výdaje překračují příjmy
Bez dat           →  12 b  (neutrální)
```

#### Složka 2 – Zadluženost (max 25 b)
```
DSTI = měsíční_splátky / čistý_příjem × 100       (S1)
DSTI = měsíční_splátky / baseIncome × 100         (S3, přesnější)
DTI  = celkový_dluh    / roční_příjem  × 100

Bez dluhů                    →  25 b
DSTI ≤ 20 % AND DTI ≤ 300 %  →  25 b  🟢
DSTI ≤ 35 % AND DTI ≤ 600 %  →  18 b  🟡
DSTI ≤ 50 % AND DTI ≤ 900 %  →  10 b  🟠
Jinak                         →   3 b  🔴
```

#### Složka 3 – Úspory & rezerva (max 25 b)
```
savingRate     = (totalInc - totalExp) / totalInc × 100
monthsReserve  = zůstatek_spořicích_peněženek / měsíční_příjem   (S1)
monthsReserve  = savBalance / baseIncome                          (S3)

savingRate ≥ 20 % AND monthsReserve ≥ 3      →  25 b  🟢
savingRate ≥ 10 % AND monthsReserve ≥ 1      →  18 b  🟡
savingRate ≥  5 % OR  monthsReserve ≥ 0.5    →  10 b  🟠
Bez příjmů                                     →  12 b  (neutrální)
Jinak                                          →   3 b  🔴
```

#### Složka 4 – Trend 3 měsíce (max 25 b)
```
Porovnání aktuálního měsíce s předchozím:
  incImprove  = totalInc ≥ prevInc    (příjmy rostou)
  expImprove  = totalExp ≤ prevExp    (výdaje klesají)
  salImprove  = (totalInc-totalExp) ≥ (prevInc-prevExp)  (saldo roste)

Počet pozitivních podmínek:
  3 z 3  →  25 b  🟢 Pozitivní trend
  2 z 3  →  20 b
  1 z 3  →  12 b  🟡 Stabilní
  0 z 3  →   5 b  🔴 Zhoršující se trend
  Nedostatek dat → 17 b (neutrální)
```

#### Celkové hodnocení
```
total = složka1 + složka2 + složka3 + složka4  (max 100)

≥ 90  →  🏆 Výborné     (#4ade80 zelená)
≥ 75  →  ⭐ Velmi dobré (#60a5fa modrá)
≥ 60  →  👍 Dobré       (#a78bfa fialová)
≥ 45  →  📊 Průměrné    (#fbbf24 žlutá)
≥ 30  →  ⚠️ Rizikové    (#fb923c oranžová)
<  30  →  🚨 Kritické    (#f87171 červená)
```

---

### 1.B Metodika B – 3 složky × 0–100, průměr **(Session 2)**

> ⚠️ Tato metodika je **odlišná** od 1.A. Nejedná se jen o jiné číselné hodnoty, ale o
> jiný matematický model. Je možné, že se používá jinde v aplikaci (např. pro komponenty)
> nebo byla v určité fázi vývoje aktivní a později nahrazena. **Nutno ověřit.**

#### 1.B.1 Výdajové zdraví (`expScore`)
```
ratio = výdaje_měsíce / příjmy_měsíce

ratio ≤ 0.70 → expScore = 100                                    (výdaje < 70 %)
ratio ≤ 0.90 → expScore = 100 - (ratio-0.70)/0.20 × 30           (100 → 70)
ratio ≤ 1.00 → expScore =  70 - (ratio-0.90)/0.10 × 30           ( 70 → 40)
ratio > 1.00  → expScore = max(0, 40 - (ratio-1.00) × 40)        ( 40 →  0)

Bez příjmů: výdaje > 0 → 0; výdaje = 0 → 50
```

#### 1.B.2 Zdraví kategorie (`computeCatHealth`)
```
limit = min(baseIncome × healthPct/100, healthAmt)
ratio = utraceno / limit

Pro VÝDAJOVÉ kategorie (maximum):
  ratio ≤ 0.80 → catScore = 100
  ratio ≤ 1.00 → catScore = 100 - (ratio-0.80)/0.20 × 30   (100 → 70)
  ratio ≤ 1.50 → catScore =  70 - (ratio-1.00)/0.50 × 50   ( 70 → 20)
  ratio > 1.50  → catScore = max(0, 20 - (ratio-1.50) × 20) ( 20 →  0)

Pro SPOŘICÍ kategorie (minimum – chceme utratit ASPOŇ tolik):
  minPct = baseIncome × healthPct/100
  ratio = utraceno / minPct
  catScore = min(100, round(ratio × 100))

Bez limitu (healthPct=null A healthAmt=null): funkce vrátí null → přeskočit
```

#### 1.B.3 Rozpočtové zdraví (`budgetScore`)
```
catScores = [computeCatHealth(cat) pro každou kategorii s limitem]
budgetScore = round(průměr(catScores))
Výchozí (žádná kategorie s limitem): 75
```

#### 1.B.4 Úsporové zdraví (`savingScore`)
```
savingCats = kategorie s isSaving=true
totalSaved = součet výdajů v savingCats za aktuální měsíc
minSaving = baseIncome × 0.10   (doporučeno min 10 % příjmu)

savingScore = min(100, round(totalSaved / minSaving × 100))
Výchozí (bez spořicích kategorií): 50
```

#### 1.B.5 Celkové skóre
```
overall = round((expScore + budgetScore + savingScore) / 3)

Interpretace:
  71–100 → Zelená  ✅ (dobré)
  41–70  → Žlutá   ⚠️ (průměrné)
   0–40  → Červená 🚨 (špatné)
```

---

## 2. DTI a DSTI (ČNB limity)

> ⚠️ **Konflikt limitů mezi sessions** – viz tabulka níže.

Funkce: `renderDTISection(D, baseIncome)` v `projects.js` **(Session 3)**.

### Vzorce
```
DTI  = celkový_dluh / roční_příjem × 100         (Debt-To-Income ratio)
DSTI = měsíční_splátky / měsíční_příjem × 100    (Debt-Service-To-Income ratio)

baseIncome = computeBaseIncome(D)   ← viz sekce 10

měsíční_splátky = suma d.payment pro všechny dluhy s frekvencí:
  monthly   → payment
  weekly    → payment × 4.33   (365/12/7)
  biweekly  → payment × 2.17   (365/12/14)
```

### Limity – historický vývoj mezi sessions

| Sesion | DSTI bezpečné | DSTI rizikové | DSTI kritické | DTI bezpečné | DTI rizikové | DTI kritické |
|---|---|---|---|---|---|---|
| **S1** | < 40 % | 40–50 % | > 50 % | < 800 % | 800–1000 % | > 1000 % |
| **S2** | < 35 % | 35–45 % | > 45 % | < 700 % | 700–900 % | > 900 % |
| **S3** | < 35 % | 35–50 % | > 50 % | < 700 % | 700–900 % | > 900 % |

**Poznámka S3:** DSTI ČNB limit je MAX 50 % (od 2023, dříve 45 %). Nejspíš to vysvětluje
rozdíl mezi S2 a S3 u DSTI horní hranice.

**Aktuální stav:** Pravděpodobně verze S3 (nejnovější), ale **ověř v kódu**.

---

## 3. VÝPOČET SPLÁTKOVÉHO KALENDÁŘE **(Session 1)**

### Annuitní splátka
```
payment = principal × [r(1+r)^n] / [(1+r)^n - 1]

kde:
  r = roční_úrok / 100 / periodsPerYear
  n = počet splátek (zadáno nebo defaultně 24)

periodsPerYear:
  monthly:   12
  biweekly:  26
  weekly:    52
```

### Průběh splácení (`generateSchedule`)
```
Pro každé období t:
  interest      = zbývající_jistina × ratePerPeriod
  principalPart = payment − interest
  remaining     = remaining − principalPart

Limit: max 600 let (= periodsPerYear × 600)
Zastavení: remaining ≤ 0.5 Kč nebo principalPart ≤ 0 (úrok ≥ splátce)
```

### Amortizace dluhu **(Session 3)**
```
Pro každou splátku v amortizačním plánu (schedule):
  interest   = zbývající_dluh × (roční_úrok / 12 / 100)
  principal  = splátka − interest
  balance    = zbývající_dluh − principal
```

### RPSN – Newton-Raphson **(Session 1)**
```
Hledáme r tak, aby:
  Σ(payment_t / (1+r)^t) = principal

Počáteční odhad:
  r₀ = max(0.0001, (totalInterest / principal) / (n/2) / periodsPerYear)

Iterace (max 200×):
  NPV  = -principal + Σ(payment_t / (1+r)^t)
  dNPV = -Σ(t × payment_t / (1+r)^(t+1))
  r    = r - NPV/dNPV

Clamp:
  r ≤ 0 → r = 0.00001
  r > 10 → r = 0.5  (zamez divergenci)

Výsledek:
  RPSN = ((1 + r)^periodsPerYear − 1) × 100

Optimalizace výkonu: počítá se max z prvních 360 splátek
```

> **Pozn.:** Session 3 uvádí RPSN jako **placeholder pro budoucí rozšíření** (viz sekce „Placeholders"),
> ale podle S1 je už implementovaný (vyřešeno v FIX-001, verze v5.75–5.77, viz `bugs.md`).
> Tj. aktuálně hotovo.

---

## 4. PREDIKČNÍ SYSTÉM

### 4.1 Základní průměr kategorie – `getHistAvg(catId, sub, forM, forY, D)` **(Session 1 + 3)**
```
1. Vezmi všechny transakce kategorie catId s typem 'expense' PŘED (forM, forY)
2. Seskup po měsících: key = "YYYY-M" → suma výdajů
3. průměr = suma / počet_měsíců

Vrátí: null pokud žádná historická data
```

### 4.2 Personalizované sezónní koeficienty – `computePersonalSeason(catId, sub, D)` **(Session 3)**
```
Podmínka: min. 2 různé roky dat

1. Seskup transakce po rok-měsíc: byYearMonth["2024-3"] = suma
2. Pro každý měsíc m (0–11): monthAvg[m] = suma přes roky / počet roků
3. overallAvg = průměr všech monthAvg (jen nenulové)
4. koeficient[m] = monthAvg[m] / overallAvg
   pokud chybí data: koeficient[m] = SEASON[m].mult (globální fallback)

Vrátí: pole 12 koeficientů nebo null (< 2 roky dat)

Příklad (Doprava s opravou auta v Březnu):
  [0.85, 0.90, 8.50, 0.80, 0.75, ...]  ← Březen = 8.5× průměr
```

### 4.3 Globální sezónní koeficienty (`SEASON`) **(všechny sessions)**
```javascript
SEASON = {
  0:  { mult: 0.85 },  // Leden
  1:  { mult: 1.05 },  // Únor
  2:  { mult: 1.00 },  // Březen
  3:  { mult: 1.02 },  // Duben
  4:  { mult: 1.15 },  // Květen
  5:  { mult: 1.10 },  // Červen
  6:  { mult: 1.10 },  // Červenec
  7:  { mult: 1.08 },  // Srpen
  8:  { mult: 1.05 },  // Září
  9:  { mult: 1.00 },  // Říjen
  10: { mult: 1.12 },  // Listopad
  11: { mult: 1.35 },  // Prosinec
}
```

#### Důvody pro měsíce (konsolidace napříč sessions)
```
Leden    (0.85)  Úsporný po Vánocích               (S1, S3)
Únor     (1.05)  Valentýn                          (S2)
Březen   (1.00)  Normál                            (S2)
Duben    (1.02)  Velikonoce                        (S2)
Květen   (1.15)  Dovolená, MDŽ, jarní výlety      (S1 "léto se blíží" / S2 / S3)
Červen   (1.10)  Léto začíná                       (S2)
Červenec (1.10)  Hlavní letní sezóna               (S2)
Srpen    (1.08)  Léto končí                        (S2)
Září     (1.05)  Škola začíná                      (S2)
Říjen    (1.00)  Normál                            (S2)
Listopad (1.12)  Předvánoční nákupy                (S1, S3)
Prosinec (1.35)  Vánoce (nejvyšší)                 (všechny)
```

### 4.4 Detekce trendu – `detectTrend(catId, sub, D)` **(Session 3)**
```
Podmínka: min. 4 měsíce s daty (po outlier removal)

1. Posledních 12 měsíců s nenulovou hodnotou → monthData[]
2. Outlier removal: odstraň hodnoty > 3 × medián
   (ochrana před jednorázovými výdaji – servis auta, dovolená)
3. Rozděl na:
   older = první polovina monthData
   newer = druhá polovina (novější)
4. avgOlder = průměr older
   avgNewer = průměr newer
5. pct = (avgNewer − avgOlder) / avgOlder × 100

Výstup:
  pct > +15 % → trend: 'up'    (výdaje rostou)
  pct < −15 % → trend: 'down'  (výdaje klesají)
  jinak        → trend: 'stable'

Proč 15 %? Menší změny jsou statistický šum, ne skutečný trend.
```

**Související ADR:** „Min. 4 měsíce pro trend detekci" a „Outlier removal" v `decisions.md`.
Historický bug viz `bugs.md` FIX-030 (Trend +852 % z opravy auta).

### 4.5 Hlavní predikce – `predictCat(catId, sub, m, y, data)` **(Session 3)**
```
výsledek = baseAvg × seasMult × trendMult + bdayBoost

baseAvg = getHistAvg() nebo aktuální měsíc jako základ

seasMult:
  má personal season (≥ 2 roky dat)?
    ANO: personalSeason[m] × 0.8 + SEASON[m].mult × 0.2     ← blend 80/20
    NE:  SEASON[m].mult                                      ← globální konstanta

trendMult:
  trend 'up':   1 + min(pct/100 × 0.5, +0.15)    ← max +15 %
  trend 'down': 1 + max(pct/100 × 0.5, −0.15)    ← max −15 %
  stable:       1.0

bdayBoost:
  kategorie.name.includes('dárek') → přidej hodnoty narozeninových dárků ve měsíci m
```

**Jednodušší verze (Session 1):**
```
predikce = round(histAvg × SEASON[m].mult) + bdayBoost
```
S3 tuto formuli rozšířila o personal season blend a trend modifier.

### 4.6 Roční předpoklad – `computeYearForecast(catId, sub, year, D)` **(Session 3)**
```
Sloupec "Předpoklad YTD":
  Pro každý měsíc m (0–11):
    m ≤ curMonth → getActual(catId, sub, m, year, D)   ← reálná data
    m > curMonth → predictCat(catId, sub, m, year, D)  ← predikce
  výsledek = suma všech 12 měsíců

Sloupec "Odhad roku":
  = suma predictCat() pro všech 12 měsíců (VŽDY predikce, nikdy actual)
  → čistě prediktivní hodnota nezávislá na aktuálních datech
```

---

## 5. COICOP MAPOVACÍ ENGINE **(Session 1 + 2)**

### Priorita mapování
```
1. Keyword match (confidence 70)
   → název transakce.toLowerCase().includes(keyword)
   → Příklady: "lidl"→1, "netflix"→9, "shell"→7, "mcdonald"→11

2. Admin override z Firebase keyword_overrides/
   → Přepisuje výchozí pravidla z kódu

3. Category match (confidence 50)
   → User kategorie transakce → COICOP skupina

4. Subcategory match (confidence 30)

5. Fallback → skupina 12 (Ostatní), confidence 0
```

### COICOP skupiny a průměry ČSÚ 2024
```
ID  Název                         Kč/os/měs  Barva
 1  Potraviny a nealk. nápoje      3 300     #4ade80 🟢
 2  Alkohol a tabák                  310     #f59e0b 🟡
 3  Oblečení a obuv                  400     #f472b6 🩷
 4  Bydlení a energie              4 000     #60a5fa 🔵
 5  Vybavení domácnosti              500     #a78bfa 🟣
 6  Zdraví                           500     #f87171 🔴
 7  Doprava                        1 800     #fb923c 🟠
 8  Komunikace                       350     #34d399 💚
 9  Rekreace a kultura             1 100     #e879f9 🩻
10  Vzdělávání                       150     #2dd4bf 🩵
11  Restaurace a ubytování           600     #facc15 🟡
12  Ostatní zboží a služby           400     #94a3b8 ⚫
13  Transfery a ostatní              200     #cbd5e1 ⚪
```

> ⚠️ **Plánovaný rework:** COICOP engine potřebuje revizi – viz `todo.md` TODO-048.

---

## 6. OECD SPOTŘEBNÍ JEDNOTKY **(všechny sessions)**

Funkce: `calcOECD(adults, ch013, ch14)` v `admin.js` **(Session 3)**.
Standard: OECD-modified scale.

```
ekvivalent = 1.0
           + 0.5 × (adults − 1)    [další dospělí]
           + 0.5 × ch14             [děti 14+]
           + 0.3 × ch013            [děti 0–13]

Váhy:
  1. dospělý    → 1.0  (referenční)
  každý další   → 0.5  (sdílí domácnost)
  dítě 14+      → 0.5  (teenager, podobné potřeby)
  dítě 0–13     → 0.3  (nižší spotřeba)

Průměr ČR (ČSÚ): 2.15 spotřebních jednotek   (S1)

Příklady:
  Single                   → 1.0
  Pár                      → 1.5
  Pár + 1 dítě 0–13        → 1.8
  Pár + 2 děti 0–13        → 2.1
  Rodina 2+2 (14+)         → 2.5

Přepočet průměrů ČSÚ:
  avg_domácnost = avg_osoba × ekvivalent
  housingEquiv  = výdaj / ekvivalent
```

---

## 7. COMPLETENESS SCORE **(Session 1)**
Přesnost srovnání ČR:
```
completeness% = počet COICOP skupin s výdaji > 0 / 13 × 100

≥ 80 %  →  🟢 Přesné
≥ 50 %  →  🟡 Orientační
<  50 %  →  🔴 Nepřesné

Detekce anomálií (flagy):
  IF has_income && coicop[4] == 0  →  "chybí Bydlení a energie"
  IF has_income && coicop[1] == 0  →  "chybí Potraviny"
  IF totalMonthly < 3 000 Kč       →  "data jsou velmi neúplná"
```

---

## 8. SPLIT TRANSAKCE **(Session 1 + 2)**

### Datová struktura
```
Parent: { ...tx, splitId: "split_1234", splitParent: true }
Child:  { ...tx, splitId: "split_1234", splitParent: false }
```

### Anti double-counting
```
Zobrazit:  !t.splitId || t.splitParent
Součty:    pouze parent nebo transakce bez splitId
Validace:  sum(children.amounts) ≈ parent.amount (tolerance ±0.01)
```

### UI logika **(Session 1)**
- Tlačítko ✂️ pouze na transakcích bez `splitId` a bez `splitParent`
- První řádek modal = hlavní kategorie (**readonly**, dopočítává se)
- Autofill: `first.value = total - sum(ostatní řádky)`
- Overlay klik nezavírá modal (výjimka v event handleru)

**Související ADR:** „Split transakce: parent zachovává původní částku" v `decisions.md` (ADR-008).

---

## 9. IMPORT DAT

### 9.1 Detekce formátu CSV **(Session 1 + 2)**
```
Auto-detekce banky dle záhlaví CSV:
  contains "protiúčet"           → Fio banka
  contains "popis transakce"     → Air Bank
  contains "datum zaúčtování"    → ČSOB
  contains "datum splatnosti"    → KB
  contains "název protistrany"   → Raiffeisenbank
  jinak                          → Naše šablona
```

### 9.2 Specifika bank **(Session 2)**
```
Banka    Oddělovač  Kódování     Header řádek  Datum sloupec
────────────────────────────────────────────────────────────
Fio      ;          UTF-8         0             'datum'
AirBank  ;          UTF-8         0             'datum provedení'
ČSOB     ;          UTF-8         0             'datum zaúčtování'
KB       ;          windows-1250  16            'datum provedeni'
RB       ;          UTF-8         0             'datum'
Šablona  ;          UTF-8         0             'datum'
```

### 9.3 Detekce kódování
```
1. TextDecoder('utf-8', {fatal:true}) → pokud selže
2. TextDecoder('windows-1250')
```

### 9.4 Hledání hlavičky (autodetekce)
```
Prochází řádky 0–29
Najde první řádek obsahující 'datum' AND ('castka'|'částka'|'objem'|'amount')
```

### 9.5 Parsování datumu **(Session 1)**
```
DD.MM.YYYY  →  YYYY-MM-DD
YYYY-MM-DD  →  YYYY-MM-DD (beze změny)
MM/DD/YYYY  →  YYYY-MM-DD
```

### 9.6 Parsování částky **(Session 2)**
```
amtStr = rawAmt.replace(/\s/g,'').replace(',','.').replace(/[^0-9.\-]/g,'')
amt    = parseFloat(amtStr)
type   = amt < 0 ? 'expense' : 'income'
amount = Math.abs(amt)
```

---

## 10. DETEKCE DUPLIKÁTŮ

### 10.1 Jednoduchá detekce (import CSV) **(Session 1)**
```
IS DUPLICATE IF:
  t.date === r.date
  && |t.amount - r.amount| < 0.01
  && t.name.slice(0,10) === r.name.slice(0,10)
```

### 10.2 Skóre duplicity – `calcDupScore` **(Session 2)**
Skóre 0–100 pro každý pár (importovaná × existující transakce):

| Kritérium | Body |
|---|---|
| Datum ±1 den | +30 |
| Datum ±3 dny | +10 |
| Částka ±0.01 Kč | +30 |
| Částka ±5 Kč | +20 |
| Částka ±50 Kč | +5 |
| Stejný typ | +10 |
| Stejný název (přesný) | +30 |
| Název A ⊂ B nebo B ⊂ A | +20 |
| Sdílená slova >2 znaky | +5/slovo (max 15) |

```
Celkové skóre:
  ≥ 75 → 🔴 Pravděpodobný duplikát (výchozí: NEzaškrtnuto)
  25–74 → 🟡 Možný duplikát        (výchozí: zaškrtnuto)
   < 25 → 🟢 Nová transakce        (výchozí: zaškrtnuto)

Limity: max 500 transakcí/import, zobrazení po 50 (stránkování)
```

### 10.3 Jaro-Winkler detekce – `duplicates.js` **(Session 3)**

#### Jaro Similarity
```
matchDist = ⌊max(|s1|, |s2|) / 2⌋ − 1   (okno pro shodu)
m         = počet shodných znaků v okně
t         = počet transpozic / 2

jaro = (m/|s1| + m/|s2| + (m−t)/m) / 3

Speciální případ: jaro = 0 pokud m = 0
```

#### Jaro-Winkler
```
prefix = délka společného prefixu (max 4 znaky)
p      = 0.1 (scaling factor)

jaroWinkler = jaro + prefix × p × (1 − jaro)
```

#### Prahy pro detekci
```
jw ≥ 0.92  → "přesný duplikát"     (červeně)
jw ≥ 0.80  → "podobný název"       (žlutě)
jinak      → není duplikát

Časové okno:
  ±5 dní → "opožděné zaúčtování"   (modře)

Skóre snížení (penalizace):
  různá podkategorie → ×0.85
  různý typ          → ×0.0 (automaticky vyloučeno)
  různá cena > 20 %  → snížení váhy
```

---

## 11. BANK BALANCE (Zůstatek banky) **(Session 2 + 3)**

Funkce: `computeBank(D)` v `helpers.js`.

```
startBalance = S.bank.startBalance (nastavitelné v Nastavení)
balance      = startBalance

Pro každý měsíc s transakcemi (chronologicky do aktuálního):
  balance += součet_příjmů(měsíc) - součet_výdajů(měsíc)

return balance
```

**Session 3 zpřesnění:**
```
bank_transakce = transakce přiřazené k peněžence typu 'bank'
Implementace:   iteruje přes všechny unikátní rok-měsíc páry, sumuje incSum − expSum
```

---

## 12. NET WORTH (Čistý majetek) **(Session 3)**

Funkce: `computeNetWorth(D)` v `premium.js`.

```
netWorth = suma(zůstatky všech peněženek) − suma(zbývající dluhy)

computeWalletBalance(walletId, D):
  startBalance + příjmy na peněženku − výdaje z peněženky

Pokud žádné peněženky → použije computeBank(D)
```

---

## 13. FINANČNÍ OBRAZ – Skóre zlepšení **(Session 2)**

Porovnání první vs. poslední měsíc z posledních 6 měsíců:
```
trendX = (last.X - first.X) / |first.X| × 100  [%]

Výchozí skóre: 50

Příjmy rostou (>5%):     +15 | klesají (<-5%):   -15
Výdaje klesají (<-5%):   +15 | rostou (>10%):    -15
Úspory rostou (>10%):    +15 | klesají (<-10%):  -15
Dluh klesá (<-5%):       +15 | roste (>5%):      -15

score = max(0, min(100, score))

Interpretace:
  ≥ 65 → Zlepšuji se 📈
  40–64 → Stagnuji ↔️
   < 40 → Zhoršuji se 📉
```

---

## 14. COMPUTEBASEINCOME **(Session 3)**

Funkce: `computeBaseIncome(D)` v `projects.js`.

```
1. Najdi kategorie označené stable=true (stabilní příjem, např. výplata)
2. Pokud žádná stable kategorie → return 0
   FALLBACK (v6.40): průměr všech příjmů za poslední 3 měsíce
3. Pro každý z posledních 3 měsíců:
     monthInc = suma příjmů ve stable kategoriích
4. baseIncome = (měsíc1 + měsíc2 + měsíc3) / 3

Poznámka: měsíc s 0 příjmem se počítá jako 0 (nezahazuje se)
  → konzervativní odhad příjmu
```

**Související bugfix:** viz `bugs.md` FIX-027 (DTI/DSTI = 0% při chybějící stable kategorii).

---

## 15. NAROZENINOVÝ BONUS **(Session 1 + 3)**

```
IF kategorie.name.includes('dárek'):
  bdayBoost = Σ(birthday.gift pro narozeniny v daném měsíci)
```

Přičítá se k predikci: `predikce = baseAvg × seasMult × trendMult + bdayBoost`.

---

## 16. BOX PLOT (Krabicový graf) **(Session 2)**

Pro roční tabulku – statistiky měsíčních výdajů:

```
validMonths = nenulové měsíce seřazené vzestupně
n = validMonths.length

Q1       = validMonths[floor(n/4)]       (1. kvartil)
Q3       = validMonths[floor(3n/4)]      (3. kvartil)
Medián   = validMonths[floor(n/2)]
IQR      = Q3 - Q1                        (mezikvartilové rozpětí)
Min      = validMonths[0]
Max      = validMonths[n-1]
Avg      = sum/n                          (průměr, zobrazen jako ×)
Std. odchylka = sqrt(Σ(xi - avg)² / n)
```

> ⚠️ **Plánovaný přesun** – viz `todo.md` TODO-009 (Box plot ve špatné záložce).

---

## 17. DETEKTOR ÚSPOR – Logika **(Session 2)**

```
1. Předplatná:
   Projdi transakce aktuálního měsíce (type='expense')
   Pro každou hledej klíčové slovo (netflix, spotify, patreon, google, youtube...)
   Pokud nalezeno → přidej doporučení s úsporou 40 % aktuální částky
   Ulož do Firebase: community/subscriptions/{kw}/count++

2. Bankovní poplatky:
   Transakce obsahující 'poplatek'|'vedení účtu'|'banka'
   Pokud součet > 100 Kč/měs → doporuč přejít na bezpoplatkový účet
   Potenciální úspora: 80 % poplatků

3. Pojištění:
   Transakce v kategorii 'Pojištění'
   Pokud > 1 000 Kč/měs → doporuč srovnání na srovnavaci.cz
   Potenciální úspora: 15–25 %

4. Limit kategorií:
   Kategorie kde utraceno > limit (healthAmt nebo healthPct)
   Zobraz jako doporučení ke snížení výdajů

5. Drahé půjčky:
   Půjčky s úrokem > 10 % → doporuč refinancování
```

**Související ADR:** „Detektor úspor z reálných transakcí" v `decisions.md` (ADR-015).

---

## 18. PREMIUM SYSTÉM **(Session 2)**

```
TRIAL_DAYS = 30

Nový uživatel:
  trialUntil = now + 30 × 24 × 60 × 60 × 1000  [ms]
  type = 'trial'

hasPremiumAccess():
  return (type === 'trial' && daysLeft > 0)
      || (type === 'premium' && premiumUntil > now)

Ceny:
  Měsíční:  99 Kč/měs
  Roční:   699 Kč/rok (ušetří 489 Kč)
```

> ⚠️ **Otevřené rozhodnutí:** Platební provider – GoPay vs Stripe/Paddle – viz `todo.md` TODO-022.

---

## 19. REFERRAL BODOVÝ SYSTÉM **(Session 3)**

```
Akce                            Body
───────────────────────────────────────
Registrace přes tvůj odkaz       +50
Aktivní měsíc (přihlašování)    +100
Upgrade na Premium               +300

Generování referral kódu:
  kód      = UID.slice(0,4).toUpperCase() + 4 náhodné znaky
  abeceda  = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  (bez O, 0, I, l)
  délka    = 8 znaků
  kolize   → přegeneruj poslední znak
```

---

## 20. SMART MONTH DETECTION **(Session 3, v6.40)**

```
Po načtení dat z Firebase:
  curTxs = transakce v (curMonth, curYear)

  IF curTxs.length = 0 AND transactions.length > 0:
    lastDate  = nejnovější datum z transactions[]
    lastM     = lastDate.getMonth()
    lastY     = lastDate.getFullYear()
    monthDiff = (curYear − lastY) × 12 + (curMonth − lastM)

    IF 0 < monthDiff ≤ 3:
      S.curMonth = lastM
      S.curYear  = lastY
      → auto-přechod na poslední aktivní měsíc

Proč max 3 měsíce? Větší skok by byl matoucí (uživatel by nevěděl, kde je)
```

**Související bugfix:** viz `bugs.md` FIX-032 (Dashboard prázdný v dubnu).

---

## 21. GETACTUAL – Skutečné výdaje **(Session 3)**

```javascript
getActual(catId, sub, m, y, D):
  = suma výdajů (type='expense', catId=catId, subcat=sub)
    v měsíci m roku y
    filtruje t.amount || t.amt || 0
```

**Související ADR:** „Ukládat obojí `amount` + `amt`" v `decisions.md` (kvůli kompatibilitě).

---

## 22. KLÍČOVÉ UTILITY FUNKCE **(Session 1)**

```javascript
getData()             // S nebo partnerData[viewingUid].data
save()                // saveToFirebase() nebo saveLocal()
fmt(n)                // celé číslo s mezerami: 1 234
fmtP(n)               // desetinné číslo: 12,50
getCat(id, cats)      // kategorie nebo fallback {name:"?",icon:"❓"}
getTx(m, y, D)        // transakce pro daný měsíc a rok
incSum(txs)           // součet příjmů
expSum(txs)           // součet výdajů
mapToCOICOP(tx)       // {coicopId: number, confidence: 0|30|50|70}
calcOECD(a,c013,c14)  // OECD spotřební jednotky (číslo)
calcAnnuity(p,r,ppy,n) // měsíční splátka
isAdmin()             // true pokud uid === 'LNEC8VNB2QPwIv6WWQ9lqgR4O5v1'
```

---

## 📝 Placeholders pro budoucí vzorce **(Session 3)**

### RPSN (Roční procentní sazba nákladů)
> ⚠️ **Pozor na rozpor:** Session 3 to uvádí jako placeholder, ale podle Session 1 už je
> implementováno (viz sekce 3 výše) a `bugs.md` uvádí FIX-001 (oprava RPSN z v5.75). Takže
> RPSN je hotové, S3 placeholder je zastaralý.

```
RPSN = [(1 + r)^n − 1] × 100
kde r = měsíční úroková sazba, n = počet měsíců
```

### Inflační korekce predikce
```
reálná_predikce = nominální_predikce / (1 + inflace)^roky
```
**Účel:** Zohlednit inflaci při předpovědi budoucích výdajů.

### Savings rate benchmark
```
savingRate_user = (příjmy − výdaje) / příjmy × 100
srovnání s průměrem ČR per household equivalence group
```

### COICOP rozšíření
- Soubor `data/coicop.json` (existuje, využití plánováno)
- Napojení kategorií na mezinárodní standard

---

*Konsolidováno: 2026-04-16 | Sessions: 1 → 3 | Autor: Milan Migdal*
