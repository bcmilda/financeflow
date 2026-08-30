# Rešerše funkčních celků FinanceFlow — část 5

**Stav k v10.17 (2026-08-28)** · Session 20

Pokračování částí 1 (karty 1–14), 2 (15–17), 3 (18–20), 4 (21–23).

> Nálezy označené 🔴 / 🟡 jsou ověřené spuštěním, ne odhad.

---

## 24 · Půjčky 💰

**Otázka:** *Kolik ještě dlužím a kolik mě to stojí navíc?*

Dluh nese věřitele, celkovou částku, zbývající jistinu, úrok p.a., frekvenci
(měsíčně / 14 dní / týdně) a splátku. Z toho se generuje **splátkový kalendář**
(`generateSchedule`) a dopočítá **RPSN** (`calcRPSN`).

### Jak se počítá

`generateSchedule()` jede standardní anuitní rozpad: úrok = zbytek × sazba
za období, zbytek splátky jde na jistinu, opakuje se, dokud zbytek neklesne
pod 0,5 Kč.

`calcRPSN()` hledá vnitřní výnosové procento **Newtonovou metodou** (200 iterací,
prvních 360 splátek, počáteční odhad z poměru úroků k jistině). Má ošetřenou
divergenci i dělení nulou.

**Splátka nepokrývající úrok** se pozná (`principalPart <= 0 && annualRate > 0`)
a generování se zastaví — jinak by cyklus běžel do limitu 600 let.

### 🟡 Nález: splátky na konci měsíce přeskakují

Datum splátky se počítá `d.setMonth(d.getMonth() + periodNum)` nad kopií
počátečního data. JavaScript při přetečení přelije do dalšího měsíce. U půjčky
se splátkou 31. v měsíci vyjde:

```
splátka #1: 2026-01-31
splátka #2: 2026-03-03   ← únor přeskočen, spadlo do března
splátka #3: 2026-03-31   ← druhá splátka v témže měsíci
splátka #4: 2026-05-01   ← duben přeskočen
splátka #5: 2026-05-31
```

Únor a duben nemají splátku vůbec, březen a květen ji mají dvakrát. Týká se
každého dluhu se splatností 29.–31. — tedy i hypoték, které se často platí
ke konci měsíce.

**Dopad je informativní, ne finanční**: částky a úroky jsou spočítané správně,
posunutá jsou jen data. Ale kalendář, podle kterého si člověk plánuje platby,
ukazuje neexistující termíny — a Budoucí platby z něj čerpají.

**Oprava:** posouvat měsíc a den ošetřit zvlášť (`Math.min(původníDen, početDníVMěsíci)`),
což je běžný postup u splátkových kalendářů.

### 🟢 Pozorování: zastavení kalendáře nic neřekne

Když splátka nepokryje úrok, `break` kalendář utne. Uživatel uvidí krátký nebo
prázdný rozpis a nedozví se proč — přitom je to důležitá informace („tímhle
tempem dluh nikdy nesplatíš"). Formulace by měla zůstat věcná, ne varovná.

### Hranice

- RPSN počítá jen z **prvních 360 splátek** (u delších hypoték přibližné)
- Kalendář se generuje ze `zbývající` jistiny, ne z původní — po částečné
  splátce se přepočítá od nuly
- Mimořádné splátky nemají vlastní evidenci, projeví se až přegenerováním

---

## 25 · Finanční aktiva 📈

**Otázka:** *Kolik mám v investicích a spoření?*

Aktiva se dělí na spoření / investice / nemovitosti a plní se **automaticky
z přesunových transakcí** (`syncInvestmentAssets`). Seskupuje se podle
podkategorie: každá podkategorie přesunu = jedno aktivum.

### Automatické napojení

Aktivum vzniká samo, jakmile existuje přesun do dané podkategorie.
Napojení drží `linkedKey` (`catId::podkategorie`). Modul umí i **adopci** ručně
založeného aktiva stejného jména — pak se jeho dosavadní hodnota stane
*baseline* a další vklady se přičítají nad ni.

Vypnout to jde přes `noAutoSync` (uživatel aktivum odpojí). Napojené aktivum
nejde smazat — dřív se po smazání už nikdy neobnovilo (FIX-184).

### 🟢 Pozorování: „Hodnota" není tržní hodnota

```js
asset.value = Math.round(asset.valueBaseline + (inv - asset.investedAtBaseline));
```

Hodnota aktiva = baseline + přírůstek **vkladů**. Appka nemá ceny akcií ani
fondů, takže hodnota **kopíruje vložené peníze** a sama od sebe neroste ani
neklesá. Přecenit jde ručně (`openAssetValModal`, historie ocenění + graf).

Je to legitimní návrh — vymýšlet si tržní ceny by bylo horší. Ale sloupec
„Hodnota" vedle sloupce „Vloženo" budí dojem, že jde o dvě různá čísla
z různých zdrojů, přičemž bez ručního přecenění jsou vždy totožná. Popisek
typu „Hodnota (ručně)" nebo tichá poznámka u nepřeceněných aktiv by to vyjasnil.

### 🟢 Pozorování: vlastní přepočet měny místo `txCZK`

`syncInvestmentAssets` má vlastní funkci `_amtCZK()`, která duplikuje logiku
`txCZK` — zafixovaná částka má přednost, jinak kurz peněženky. Chování je
shodné, ale je to druhá kopie téhož pravidla. Kdyby se `txCZK` změnilo
(jako v FIX-280), tahle kopie se veze bez opravy.

U starých transakcí bez `amtCZK` se navíc použije **dnešní** kurz, takže
„Vloženo" u cizoměnových vkladů se retroaktivně mění podle kurzu. Komentář
v kódu to přiznává jako vědomý fallback.

---

## 26 · Import z banky (SMS) 📲

**Otázka:** *Můžu do appky nasypat notifikace z banky?*

Uživatel vloží text notifikací, `parseMultipleNotifications()` je rozdělí,
`parseBankNotification()` z každé vytáhne částku, měnu, obchodníka a datum.
Podporuje vzory ČSOB, KB, Air Bank, Fio, Moneta, Revolut a další — dohromady
přes dvacet regulárních výrazů. Kategorie se navrhne přes `MERCHANT_CATEGORIES`.

### 🔴 Nález: částka s tečkovým oddělovačem tisíců se zmenší 1000×

`parseCzNum()` normalizuje číslo takto:

```js
String(str).replace(/\s/g, '').replace(',', '.')
```

`replace(',', '.')` **bez `/g`** nahradí jen první čárku a tečka jako oddělovač
tisíců zůstane. `parseFloat` pak čte jen po druhou tečku:

```
"1 234,50"  →  1234.5     ✓
"1 000"     →  1000       ✓
"1.234,50"  →  1.234      ← místo 1234,50 Kč se naimportuje 1,23 Kč
"1,234.50"  →  1.234      ← totéž u anglického formátu
```

České banky obvykle používají mezeru, takže hlavní cesta funguje. Ale formát
s tečkou se objevuje u některých notifikací (zejména zahraničních plateb
a Revolutu) — a chyba je **tichá**: transakce se naimportuje, jen s tisícinovou
částkou. Nic nespadne, nic se nenahlásí.

**Oprava:** rozpoznat, který znak je desetinný (poslední z `,` / `.`), zbytek
zahodit jako oddělovače tisíců.

### Hranice

- Parsování je čistě **regulární výrazy** — nový formát banky = tichý neúspěch
- `MERCHANT_CATEGORIES` je pevný seznam řetězců, neučí se z chování uživatele
- Datum se v mnoha vzorech nevyskytuje → dosadí se dnešek

---

## Shrnutí nálezů

| | Kde | Co | Dopad |
|---|---|---|---|
| 🔴 | `sms-import.js` | `parseCzNum` u tečkového oddělovače | **Částka 1000× menší**, tiše |
| 🟡 | `debts.js` | `setMonth` přeteče u splátek 29.–31. | Kalendář ukazuje neexistující termíny |
| 🟢 | `debts.js` | Zastavení kalendáře bez vysvětlení | Chybějící informace |
| 🟢 | `assets.js` | „Hodnota" = vklady, dokud se ručně nepřecení | Matoucí popisek |
| 🟢 | `assets.js` | Vlastní `_amtCZK` místo `txCZK` | Druhá kopie téhož pravidla |

**Doporučené pořadí:** `parseCzNum` (mění částky) → data splátek → zbytek.

---

## Stav pokrytí rešerší

| Část | Karty |
|---|---|
| 1 | Dashboard · Transakce · Příští měsíc · Predikce · Radar · Finanční obraz · Detektor · Měsíční report · Report matice · Účtenky · Inflace · Deník · Projekty · AI Rádce |
| 2 | Sdílení & rodina · Nákupní seznam · Import |
| 3 | Kurzy měn · Simulace života · Komunitní přehled |
| 4 | Zůstatek a peněženky · Budoucí platby & šablony · Souhrn výdajů |
| 5 | Půjčky · Finanční aktiva · Import z banky (SMS) |

**Zbývá nepokryto:** Kalendář, Tagy, Grafy, Statistiky, Narozeniny & přání,
Kategorie, Typy plateb, Admin panel.
