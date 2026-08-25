# Hloubková analýza · Komunitní přehled · Analýza účtenek

**Stav k v10.01 (2026-08-24)** · zdroj: `admin.js`, `receipts.js`, `coicop.js`, `worker.js`

Navazuje na `ANALYZA-obraz-detektor-report.md`. Stejná metoda —
konstanty a vzorce vyčtené z kódu, ne z paměti.

| Karta | Funkce | Modul |
|---|---|---|
| Komunitní přehled | `renderKomunita()` ř. 5909 | `admin.js` |
| ↳ zápis dat | `publishCommunityStats()` ř. 5838 | `admin.js` |
| Analýza účtenek | `renderUctenky()` ř. 119 | `receipts.js` |
| ↳ 8 podkaret | `build*Tab()` | `receipts.js` |

---
---

# ČÁST 1 · Komunitní přehled

**Otázka:** *Jsem v utrácení normální?*

Jediná karta v aplikaci, která pracuje s **cizími daty**. Tím se liší od všeho
ostatního a nese to zvláštní nároky na soukromí i na výklad čísel.

## 1.1 · Jak se data sbírají — `publishCommunityStats(D)`

Volá se **automaticky po každém uložení** (`app.js` ř. 1236 a 1252).

```
Podmínky, bez kterých se NEODEŠLE nic:
  1. settingCommunity zaškrtnuto      (opt-out, výchozí zapnuto)
  2. uživatel není anonymní
  3. baseIncome > 0
  4. txs.length >= 3                  (min. 3 transakce v měsíci)
```

**Co se odesílá** do `community/{YYYY-MM}/users/{uid}`:

```js
{
  cats:       { '1': 4180, '4': 12000, … },   // COICOP oddíl → Kč
  income:     baseIncome,                      // zaokrouhleno
  totalExp:   expSum(txs),
  savingRate: round((baseIncome − totalExp) / baseIncome × 100),
  updatedAt:  Date.now()
}
```

**Zápis přepisuje předchozí** (`_set`, ne push) — jeden uživatel = jeden záznam
za měsíc, žádná duplikace.

### Soukromí
Neodesílají se transakce, názvy, obchody ani kategorie uživatele — jen
**13 součtů podle oficiálních COICOP oddílů** plus tři agregáty.
Zpětně z toho nejde rekonstruovat, co člověk koupil.

**Ale `uid` je v cestě.** Admin (a kdokoli s právem číst `community/`) vidí,
který účet kolik utrácí. Pro anonymizovaný benchmark to není nutné — stačilo by
náhodné ID. Zápis přes `uid` je zvolený proto, aby šel přepsat, ne přidat další.
**Kompromis, který stojí za zmínku v zásadách ochrany údajů.**

### FIX-213 (S17.14) — poučný případ
Dřív se posílaly **názvy kategorií** („Jídlo & Pití"), zatímco čtecí strana
očekávala **COICOP ID 1–13**. V přehledu se pak objevovalo „COICOP Jídlo & Pití".
Zároveň se sčítalo bez `txCZK` a bez vyloučení přesunů — cizí měny i přesuny
komunitu nadhodnocovaly.

## 1.2 · Jak se data čtou — `renderKomunita()`

```js
allUsers = Object.values(snap.val())          // community/{monthKey}/users
avgExp    = Σ totalExp   / allUsers.length
avgIncome = Σ income     / allUsers.length
avgSaving = Σ savingRate / allUsers.length
catTotals[cat] += amt ; catCounts[cat]++       // průměr počítá jen ty, kdo v kategorii utráceli
```

`catCounts` je důležitý detail: průměr za kategorii se dělí **počtem lidí, kteří
v ní utráceli**, ne počtem všech. Jinak by kategorie „Vzdělávání" vyšla směšně
nízko jen proto, že do ní většina lidí nedává nic.

## 1.3 · 🔴 Nalezená chyba — vlastní výdaje se počítají jinak než komunitní

**`admin.js` ř. 5952:**
```js
const myExp = myExpTxs.reduce((a,t) => a + Math.abs(t.amount || t.amt || 0), 0);
```

Tohle je **přesně ta třída chyby, kterou řešily FIX-212, FIX-213 a FIX-252** —
a v této funkci přežila.

| | `publishCommunityStats` (odesílá) | `renderKomunita` (zobrazuje moje) |
|---|---|---|
| částka | `txCZK(t, D)` ✅ | `t.amount \|\| t.amt` ❌ |
| přesuny | vyloučeny ✅ | **započítány** ❌ |
| rozdělené (`splitParent`) | vyloučeny ✅ | **započítány** ❌ |

**Důsledek:** *„Tvoje výdaje 32 000 · průměr komunity 24 000"* — kde těch 32 000
obsahuje přesuny na spořicí účet a rozdělené nákupy dvakrát, zatímco komunitní
průměr je čistý. **Uživatel se srovnává s ostatními, ale každý je změřený jinak.**

Stejná chyba je i v rodinném součtu (ř. 5967–5968).

**Oprava** je stejná jako u FIX-252: `txCZK(t, D)` a doplnit `!t.splitParent`
a `!isTransferTx(t)`.

## 1.4 · Tabulka ČSÚ — shrnutí z `PLAN-coicop-srovnavace.md`

Tři samostatné problémy, rozebrané v samostatném plánu:

1. **Zelený sloupec má dva významy** — u oddílů odhad ČSÚ (`avg_osoba × OECD`),
   u podskupin skutečná útrata z účtenek. Neporovnatelné.
2. **Referenční data jen pro 13 oddílů** — hlubší úrovně nemají s čím srovnávat.
3. **28 z 84 tříd nelze naplnit** — nemají klíčové slovo v `product-groups.json`.

## 1.5 · Slabiny Komunitního přehledu

1. **Žádný minimální počet uživatelů.** Při dvou přispěvatelích se zobrazí
   „průměr komunity" ze dvou lidí. Benchmark z malého vzorku je horší než žádný —
   měl by být práh (např. 20) a pod ním hláška místo čísla.
2. **Průměr, ne medián.** Jeden uživatel s hypotékou 40 000 posune „průměrné
   bydlení" pro všechny. U příjmů a výdajů je medián prakticky vždy vhodnější.
3. **Žádná segmentace.** Student v Brně se srovnává s rodinou 2+2 v Praze.
   Data pro segmentaci existují (`householdSize`, OECD koeficient), ale nepoužívají se.
4. **Opt-out, ne opt-in.** Sdílení je výchozí zapnuté. Právně obhajitelné
   (anonymní agregát), ale u finanční aplikace bych volil opt-in.
5. **Data jsou vázaná na `S.curMonth`** — při prohlížení starého měsíce se čte
   `community/{tehdejší měsíc}`, což je správně, ale u měsíců před spuštěním
   funkce vrátí prázdno bez vysvětlení.

---
---

# ČÁST 2 · Analýza účtenek

**Otázka:** *Co konkrétně jsem koupil a zdražilo to?*

Nejsilnější odlišující funkce aplikace. Osm podkaret nad jedním datovým zdrojem.

## 2.1 · Skenování — cesta od fotky k datům

```
1. Uživatel vybere fotku / PDF
2. gateFeature('receiptAnalyze')       → kontrola tarifu
3. getAuthToken()                      → Firebase token
4. compressReceiptImage()              → MAX_PX 1600, JPEG kvalita 0,85
5. POST na Cloudflare Worker           → 60s timeout (AbortController, FIX-061)
6. Worker: ověří token, kvótu, zavolá Claude
7. Odpověď JSON → položky → transakce
```

**Parametry modelu** (`worker.js` ř. 335):
```
model      claude-sonnet-4-6
max_tokens 8192
```

**Kvóty za měsíc** (ADR-041):

| Tarif | Účtenky | Bankovní výpis | Chat | Report |
|---|---|---|---|---|
| Free | 15 | 2 | 20 | 1 |
| Trial / Premium | 50 | 5 | 80 | 5 |
| Admin | 9 999 | 9 999 | 9 999 | 9 999 |

**Klíč k API se do prohlížeče nikdy nedostane** — Worker ověřuje Firebase token
a počítá kvótu server-side.

### Vícedílné účtenky
Dlouhou účtenku lze vyfotit na několik snímků. Worker je pošle **v jednom
požadavku** s instrukcí, že jde o části téhož dokladu, a vrátí **jeden sloučený JSON**.
Počítá se jako **jedno** volání kvóty.

### Offline režim
Bez připojení se účtenka uloží přes `OfflineSync.saveReceiptOffline()` a odešle
později. **FIX-058:** dřív se obrázek komprimoval dvakrát (base64 → Blob →
znovu komprese) a kvalita klesala; nyní se drží Blob z fronty.

## 2.2 · Zdroj pravdy pro cenu položky

```js
lineAmt(it) = it.lineTotal ?? (it.price × it.qty)
```

**`price` má dvě sémantiky** — za kus nebo za kilo — a `price × qty` **ignoruje
slevy**. Proto má `lineTotal` přednost. Toto je nejčastější zdroj chyb v celém
modulu a platí napříč všemi podkartami.

**Hlavní metrika je cena za balení**, ne za kilo. „Rohlík 43 g = 81 Kč/kg" je
matematicky správně a uživateli k ničemu. Přepočet na kg/l se dělá **jen
u zboží skutečně prodávaného na váhu** (`unit === 'kg' | 'l'`).

⚠️ **Klíč položky musí obsahovat jednotku.** Bez toho se porovná cena za kus
s cenou za kilo a vyjde zdražení o +2707 %.

## 2.3 · Osm podkaret

### 📸 Skenovat (`buildScanTab`)
Vstupní bod. Nahrání, náhled, stav zpracování, počet zbývajících z kvóty.

### 🧠 Učení (`buildLearnTab`)
Uživatel opravuje špatně zařazené položky. Opravy se ukládají do
`community/itemTags/{key}/{tagKey}` — **sdílené napříč uživateli**.

**Nejzajímavější mechanismus v aplikaci:** čím víc lidí opraví „ROHL." na
pekárenské výrobky, tím spolehlivěji to appka pozná příště všem. Je to jediné
místo, kde komunita zlepšuje produkt sama.

⚠️ **Nemá ochranu proti znehodnocení.** Jeden uživatel může tag nastavit špatně
a projeví se to ostatním. Chybí váhování podle počtu shodných hlasů.

### 📊 Statistiky (`buildStatsTab`)
Celková útrata, průměrná účtenka, počet položek, rozpad podle kategorií.

### 🇨🇿 Srovnání ČR (`buildCompareTab`)
**Pozor — počítá z transakcí, ne z položek účtenek.** Používá `mapToCOICOP(tx)`,
zatímco tabulka v Komunitním přehledu používá `productGroupLookup(položka)`.
Dvě různá mapování na totéž, viz `PLAN-coicop-srovnavace.md`.

`mapToCOICOP` má čtyřstupňovou kaskádu spolehlivosti:

| Zdroj | Confidence |
|---|---|
| admin keyword override | 95 |
| klíčové slovo v názvu transakce | 70 |
| název kategorie | 50 |
| podkategorie | 30 |
| nic → oddíl 12 „Ostatní" | 0 |

### 📈 Trend (`buildTrendTab`)
Vývoj COICOP oddílů za posledních 6 měsíců.

### 💹 Zdražování (`buildPricesTab`)
Srovnání cen téže položky v čase. **Zdroj pravdy pro `inflace.js`** —
`perUnitData`, `shrinkflation`, `pkgWeight` jsou definované zde.

⚠️ **`inflace.js` tyhle výpočty jednou duplikoval** a znovu zavedl už opravené
chyby. Před psaním nové analýzy z účtenek se musí ověřit, jestli už neexistuje.

### 🏪 Obchody (`buildStoresTab`)
Kde nakupuješ, kolik a jak často. `normalizeStoreName()` sloučí „PENNY",
„PENNY MARKET s.r.o." a „Penny Market" — včetně odstranění právní formy
a diakritiky pro porovnání (zobrazuje se originál).

### 📋 Historie (`buildHistoryTab`)
Seznam účtenek s možností otevřít a opravit.

## 2.4 · Detekce duplicit

```
klíč = obchod + datum + suma + počet položek
```

Duplicity se **nezobrazují**, ale nemažou automaticky — uživatel dostane
tlačítko „Smazat duplikáty". Vzniká to při dvojím naskenování nebo při
opakovaném odeslání z offline fronty.

## 2.5 · Slabiny Analýzy účtenek

1. **Kvalita závisí na fotce.** Zmuchlaná nebo tmavá účtenka dá horší výsledek
   a uživatel se to dozví až po spotřebování jednoho volání z kvóty.
   Chybí kontrola kvality **před** odesláním.
2. **Free tarif má 15 účtenek měsíčně.** Kdo nakupuje obden, vyčerpá je za týden
   — přitom právě položková data jsou to, co dělá appku užitečnou. Nastavení
   kvóty je produktové rozhodnutí, ale stojí za ověření na reálném chování.
3. **Učení nemá ochranu proti chybným tagům** (viz výše).
4. **Dvě různá COICOP mapování** — položky vs. transakce.
5. **Cena za kg u balených výrobků** je past, kterou kód řeší, ale která se
   při každé nové analýze vrací.
6. **Neexistuje kontrola úplnosti.** Když AI přehlédne položku, součet položek
   nesedí se sumou účtenky — a nikde se to nekontroluje. Přitom obojí je
   k dispozici a rozdíl by šel zobrazit.

---
---

# ČÁST 3 · Křížové závislosti

```
receipts.js  buildPricesTab ──→ perUnitData, shrinkflation ──→ inflace.js
             productGroupLookup ──→ coicop.js rollup ──→ Komunitní přehled tabulka
             mapToCOICOP ──┬─→ buildCompareTab (Srovnání ČR)
                           └─→ publishCommunityStats ──→ community/ ──→ Komunitní přehled

community/itemTags ──→ učení ──→ zpětně zlepšuje productGroupLookup všem
```

**Praktický dopad:** změna v `mapToCOICOP` se projeví ve **třech** srovnávačích
současně a navíc v datech odeslaných do komunity. Změna v `buildPricesTab`
se projeví v Inflaci.

---

# ČÁST 4 · Co bych opravil

| Priorita | Co | Proč |
|---|---|---|
| 🔴 | **`myExp` na `txCZK` + vyloučení** (`admin.js` 5952, 5967) | uživatel se srovnává s komunitou, ale každá strana je měřená jinak |
| 🔴 | **Minimální počet uživatelů pro benchmark** | průměr ze dvou lidí není benchmark |
| 🟡 | **Medián místo průměru** | jedna hypotéka posune „průměrné bydlení" všem |
| 🟡 | **Kontrola úplnosti účtenky** | součet položek vs. suma dokladu — data existují, kontrola ne |
| 🟡 | **Váhování komunitních tagů** | jeden uživatel může znehodnotit učení ostatním |
| 🟢 | **Segmentace benchmarku** | data (`householdSize`, OECD) existují, nepoužívají se |
| 🟢 | **Anonymní ID místo `uid`** v `community/` | pro benchmark není potřeba vědět kdo |
| 🟢 | **Kontrola kvality fotky před odesláním** | šetří kvótu i frustraci |

---

## Metodická poznámka

Nález v části 1.3 je **skutečná chyba v produkci**, ne teoretická slabina.
Doporučuju ji vzít jako **FIX-266** dřív než cokoli z plánu COICOP —
je to pět řádků a odstraní nesrovnalost, kterou uživatel vidí jako první.

Zbývá osm karet: Radar, Deník, Predikce, Příští měsíc, Inflace, Projekty,
Statistiky + Grafy, AI Rádce.
