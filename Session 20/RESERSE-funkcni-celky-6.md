# Rešerše funkčních celků FinanceFlow — část 6

**Stav k v10.24 (2026-08-28)** · Session 20

Pokračování částí 1–5 (karty 1–26).

---

## 27 · Kalendář 📅

**Otázka:** *Co se dělo který den — a kolik jsem si vydělal?*

Dva režimy: **Finance** (denní příjmy/výdaje v mřížce měsíce, týdenní souhrny,
poznámky ke dni) a **Práce** (směny, přesčasy, výpočet hodinové mzdy).

### Pracovní režim

Den může být směna, přesčas, dovolená, nemoc nebo volno. Ze zadaných hodin se
počítá **efektivní hodinovka** (výplata ÷ placené hodiny) a **základní sazba**
(výplata ÷ vážené hodiny, kde příplatkové hodiny „váží" víc).

Příplatky: víkend, svátek, noční, přesčas — každý s vlastním procentem
v konfiguraci. Svátky se počítají z **pohyblivého data Velikonoc** (Meeusův
algoritmus pro Velký pátek a Velikonoční pondělí) plus 11 pevných státních svátků.

Detail, který je udělaný správně: `if (isHol) holH += p; else if (víkend) weH += p;` —
svátek má přednost, takže se sobotní svátek nezapočítá dvakrát.

### 🟢 Pozorování: noční příplatek za celou směnu

`if (wd.shift === 'nocni') nightH += p;` přičte **celou délku směny** jako noční.
Zákoník práce přiznává příplatek jen za hodiny mezi 22:00 a 6:00, takže směna
14:00–22:00 označená jako noční dostane příplatek za všech 8 hodin.

Pro odhad hodinovky to stačí a appka nikde netvrdí, že počítá mzdu přesně podle
zákoníku. Za zmínku ale stojí, že u smíšených směn bude efektivní hodinovka
mírně nadhodnocená.

### Hranice

- Mzda se zadává ručně (`cfg.salary`), nepočítá se z transakcí
- Přestávka se odečítá pevnou hodnotou pro každou směnu (`breakMin`)
- Pracovní data žijí v `S.workCal`, nezávisle na transakcích

---

## 28 · Narozeniny & přání 🎂

**Otázka:** *Komu se blíží narozeniny a co mu koupit?*

Seznam narozenin s volitelnou částkou na dárek a poznámkou, plus wishlist
(přání jako budoucí výdaje). Narozeniny vstupují i do **Budoucích plateb**
jako plánovaný výdaj.

### 🟡 Nález: den, kdy má někdo narozeniny, appka přeskočí

`daysUntilBday()` porovnává **půlnoc cílového dne** s **aktuálním časem**:

```js
let next = new Date(ny, b.month-1, b.day);
if (next < now) next = new Date(ny+1, b.month-1, b.day);
return Math.round((next - now) / 86400000);
```

Půlnoc dnešního dne je vždycky menší než „teď", takže se datum posune o rok.
Ověřeno (simulovaný dnešek 28. 8. 2026, 15:00):

```
DNEŠNÍ narozeniny (28.8.):  364 dní
zítřejší (29.8.):             0 dní
```

Dva důsledky:
- **V den narozenin se připomínka neukáže vůbec** — místo „dnes" se zobrazí
  „za 364 dní" a položka spadne na konec seřazeného seznamu.
- **Zítřejší narozeniny hlásí „za 0 dní"**, tedy vypadají jako dnešní.
  (29. 8. půlnoc − 28. 8. 15:00 = 9 hodin → `Math.round(0.375)` = 0.)

Celý seznam „Nejbližší narozeniny" je tedy posunutý o den a ten nejdůležitější
den chybí. Týká se i Budoucích plateb, které z toho čerpají.

**Oprava:** normalizovat obě data na půlnoc, stejně jako u FIX-276 (termín cíle) —
```js
const now = new Date(); now.setHours(0,0,0,0);
```
a porovnávat `next < now` až po normalizaci. Pak dnešek vyjde 0 a zítřek 1.

### Hranice

- Narozeniny nemají rok narození, takže se nepočítá věk
- 29. února v nepřestupném roce spadne JS automaticky na 1. března

---

## 29 · Grafy 📈

**Otázka:** *Jak se moje čísla vyvíjejí?*

Čtyři pohledy za posledních 12 měsíců: příjmy, výdaje, měsíční saldo a vývoj
zůstatku. Kreslí se do `<canvas>` vlastními funkcemi (`drawSimpleAreaChart`,
`drawSaldoBars`) — bez externí knihovny.

### Co je udělané dobře

**Interaktivita bez překreslování celého grafu:** `canvas.onmousemove` spočítá
index sloupce z pozice kurzoru a překreslí jen zvýraznění; `onmouseleave` vrátí
původní stav.

**Měření šířky přes `requestAnimationFrame`** s fallbackem — canvas ve skryté
záložce má `clientWidth = 0`, takže bez toho by se graf nakreslil do nuly.

**Posun přes hranici roku** je správně: `if (m < 0) { m += 12; y--; }` — leden
2026 mínus 11 měsíců dá únor 2025.

### 🟢 Pozorování: popisky nerozlišují rok

`labels12.push(CZ_M[m].slice(0,3))` ukládá jen zkratku měsíce. U dvanácti měsíců
je každý právě jednou, takže nejednoznačnost nevzniká — ale kdyby se rozsah
někdy prodloužil (jako u rodinného trendu, kde jde přepnout 6/12), popisky by
se začaly opakovat bez rozlišení roku.

Rodinný graf přidaný v S20 má stejný vzorec a zatím stejný strop 12 měsíců.

---

## Shrnutí nálezů

| | Kde | Co | Dopad |
|---|---|---|---|
| 🟡 | `charts.js` | `daysUntilBday` porovnává půlnoc s aktuálním časem | **V den narozenin se připomínka neukáže**, zítřek hlásí „0 dní" |
| 🟢 | `kalendar.js` | Noční příplatek za celou směnu, ne jen 22–6 h | Mírně nadhodnocená efektivní hodinovka |
| 🟢 | `charts.js` | Popisky měsíců bez roku | Zatím neškodné, past při rozšíření rozsahu |

**Doporučení:** opravit `daysUntilBday` — je to stejná třída chyby jako FIX-276
(termín cíle) a oprava je stejná: normalizovat na půlnoc.

---

## Stav pokrytí rešerší

| Část | Karty |
|---|---|
| 1 | Dashboard · Transakce · Příští měsíc · Predikce · Radar · Finanční obraz · Detektor · Měsíční report · Report matice · Účtenky · Inflace · Deník · Projekty · AI Rádce |
| 2 | Sdílení & rodina · Nákupní seznam · Import |
| 3 | Kurzy měn · Simulace života · Komunitní přehled |
| 4 | Zůstatek a peněženky · Budoucí platby & šablony · Souhrn výdajů |
| 5 | Půjčky · Finanční aktiva · Import z banky (notifikace) |
| 6 | Kalendář · Narozeniny & přání · Grafy |

**Zbývá nepokryto:** Tagy, Statistiky, Kategorie, Typy plateb, Admin panel.
