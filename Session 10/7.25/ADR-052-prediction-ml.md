# ADR-052 · Vylepšení predikce výdajů – lineární trend + outliery

**Session 10 · stav: NÁVRH (lineární trend k implementaci, outliery odloženo)**

## Kontext

Současná predikce (`predictCat` v helpers.js) počítá pro každou kategorii a měsíc:

```
predikce(měsíc) = průměr_historie × sezónní_koeficient (+ dárky u „Dárky")
```

- **průměr_historie** (`getHistAvg`): prostý aritmetický průměr všech minulých měsíců, kde kategorie měla výdaj.
- **sezónní_koeficient** (`SEASON` v app.js): pevně zadané hodnoty (leden 0,85 … prosinec 1,35), stejné pro všechny uživatele i kategorie.

**Slabiny:**
1. Prostý průměr nereaguje na trend (rostoucí nájem, postupné šetření) – bere stejně starý i nový měsíc.
2. Jednorázové výkyvy (lednice, dovolená) trvale zvednou průměr všech budoucích měsíců.
3. Sezóna je globální, neodvozená z reálných dat uživatele (částečně řešeno vizualizací v záložce „Sezonalita (reál)").

## Rozhodnutí

### 1. Lineární trend (K IMPLEMENTACI)

Místo prostého průměru proložit historií kategorie **lineární regresi** (metoda nejmenších čtverců) a extrapolovat na budoucí měsíc.

**Princip:**
```
Pro body (x_i = pořadí měsíce, y_i = výdaj v měsíci):
  sklon b = Σ((x-x̄)(y-ȳ)) / Σ((x-x̄)²)
  posun  a = ȳ − b·x̄
  predikce(x_nový) = a + b·x_nový
```
Pak se na výsledek aplikuje sezónní koeficient stejně jako dnes.

**Bezpečnostní pojistky:**
- Min. 3–4 měsíce dat, jinak fallback na současný průměr (regrese z 1–2 bodů je nesmysl).
- Výsledek clampovat na ≥ 0 (predikce výdaje nemůže být záporná).
- Volitelně omezit sklon (např. ±50 % průměru/měsíc), aby extrapolace neutekla do extrému.

**Dopad na predikci:**
- Zachytí dlouhodobý růst/pokles → realističtější „Předpoklad YTD" a „Odhad roku".
- Příklad: nájem rostl 12 000 → 12 500 → 13 000 → trend predikuje 13 500 (průměr by dal 12 500).
- Riziko: citlivější na šum u nestabilních kategorií → proto pojistky výše.

### 2. Detekce a vyřazení outlierů (ODLOŽENO – jen návrh)

**Co to je:** outlier = měsíc s netypicky vysokým/nízkým výdajem (jednorázový nákup), který zkresluje průměr i trend.

**Jak by se dělalo (metoda IQR – mezikvartilové rozpětí):**
```
1. Seřaď měsíční hodnoty kategorie.
2. Spočítej Q1 (25. percentil) a Q3 (75. percentil).
3. IQR = Q3 − Q1.
4. Hranice: dolní = Q1 − 1,5·IQR, horní = Q3 + 1,5·IQR.
5. Hodnoty mimo hranice = outliery → vyřaď je z výpočtu průměru/trendu.
```
Alternativa: z-skóre (kolik směrodatných odchylek od průměru; |z| > 2 = outlier). IQR je robustnější u malých vzorků.

**Dopad:** predikce běžného měsíce by nebyla zkreslená jednorázovou velkou útratou. Např. kategorie „Elektronika" s jedním nákupem notebooku 30 000 v jinak prázdných měsících – outlier detekce ho vyřadí z měsíční predikce.

**Proč odloženo:** u řídkých dat (málo měsíců) může IQR vyhodit i legitimní hodnoty; potřebuje pečlivé testování na reálných datech, aby nezmizely sezónní špičky (prosinec by mohl vypadat jako outlier). Necháváme na pozdější session po nasazení lineárního trendu.

## Důsledky

- `getHistAvg` zůstane jako fallback; přidá se `getHistTrend(catId, sub, forM, forY, D)` vracející extrapolovanou hodnotu.
- `predictCat` zkusí trend, při < 3 bodech spadne na průměr.
- Sezónní koeficient a dárkový příplatek beze změny.
- Žádná externí knihovna – regrese je pár řádků čistého JS.

## Alternativy zvážené a zamítnuté

- **Vážený průměr (exponenciální)** – jednodušší než regrese, ale nezachytí směr trendu, jen rychlejší reakci. Lineární trend je informativnější.
- **Pravé ML (neuronové sítě, ARIMA)** – overkill pro řady jednotlivce s ~12–36 body. Málo dat, riziko přeučení, velká závislost. Jednoduchý model + sezóna obvykle vyhraje.

---
*ADR-052 · Session 10 · 2026-06-01*
