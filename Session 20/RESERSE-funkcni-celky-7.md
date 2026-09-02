# Rešerše funkčních celků FinanceFlow — část 7

**Stav k v10.25 (2026-08-28)** · Session 20

Pokračování částí 1–6 (karty 1–29).

---

## 30 · Kategorie 📋

**Otázka:** *Jak si roztřídím peníze a kolik chci kde utrácet?*

Nejhustší nastavení v celé appce. Kategorie nese název, ikonu, barvu, **typ**
(příjem / výdaj / obojí / **přesun**), podkategorie, COICOP kód, likviditu
aktiva a **limit finančního zdraví**.

### Limit finančního zdraví

Dvojí zadání: **% ze základu příjmu** a volitelně **max. částka**. Když jsou
vyplněné obě, platí přísnější z nich. Sémantika se liší podle typu:

| Kategorie | `%` znamená |
|---|---|
| běžný výdaj | **maximum** — kolik nejvýš tam smí jít |
| finanční rezerva / spoření (`isSaving`) | **minimum** — kolik tam má aspoň jít |
| investice / aktivní spoření (`isInvest`) | **minimum** (od v8.70) |

Pod poli běží živý přehled: *„Rozděleno napříč kategoriemi: 73,52 % výdaje ·
zbývá 26,48 % do 100 %."*

### 🟡 Nález: přehled rozdělení ignoruje přesunové kategorie

`updateCatPctInfo()` prochází kategorie takto:

```js
if (!(c.type === 'expense' || c.type === 'both')) return;
```

Kategorie typu **přesun** se tedy do součtu nezapočítají — přestože mohou mít
`healthPct` a přestože právě ony bývají označené jako spoření nebo investice.
Milanovo „Penzijní spoření" je typu *Přesun (investice, rezerva)*, má limit
20 % a zaškrtnuté *Kategorie investic / aktivního spoření* — a do součtu
nevstupuje.

Zároveň **editovaná** kategorie se do součtu přičte vždy, bez ohledu na typ
(`if (curSaving) savAlloc += curVal;`). Součet se tak chová jinak podle toho,
kterou kategorii má člověk zrovna otevřenou.

### ✗ Odvolaný nález: „přehled se po otevření nepřepočítá"

Původně jsem sem zapsal druhou chybu — že `editCat()` nevolá
`updateCatPctInfo()`. **Neplatí.** Obě funkce (`openCatModal` i `editCat`)
přepočet volají na svém posledním řádku; můj původní grep procházel jen část
funkce a ten řádek minul.

Milanův snímek (kategorie s 20 % a zaškrtnutou investicí, ale text jen
*„73,52 % výdaje"*) vysvětluje **první nález sám** — ostatní přesunové
kategorie se do součtu nedostaly.

**Oprava:** zahrnout do smyčky i `c.type === 'transfer'`.

### Hranice

- Podkategorie jsou pole řetězců (nebo objektů `{name}`) — nemají vlastní limity
- COICOP kód se plní ručně nebo z mapování, nekontroluje se proti číselníku
- Smazání kategorie nepřeřadí existující transakce

---

## 31 · Tagy 🏷️

**Otázka:** *Kolik mě stála dovolená, když je rozprostřená přes deset kategorií?*

Tag je volný štítek na transakci (`t.tags`, pole řetězců). Doplňuje kategorie
napříč — dovolená zasáhne Dopravu, Jídlo i Ubytování, ale tag je spojí.

**Zadávání** má našeptávač (`tagsInputHandler`) z tagů, které už uživatel
použil, s počtem výskytů. Vstup přijímá `#tag1 #tag2`, Enter i klik na návrh.

**Vyhodnocení** — přehled tagů se součty a možnost prokliknout na transakce.

Tagy jsou zároveň jediné místo, kde se v appce potkává **vlastní** štítkování
s **komunitním** (`community/itemTags` u položek účtenek) — ale ty dva systémy
spolu nesouvisí a nemíchají se, což je dobře.

### Hranice

- Tag je prostý řetězec bez normalizace: „Dovolená" a „dovolená" jsou dva tagy
- Nejde přejmenovat hromadně — přejmenování znamená projít transakce ručně
- Tagy se nepromítají do rozpočtů ani do skóre

---

## 32 · Typy plateb 💳

**Otázka:** *Platím spíš kartou, nebo hotově?*

Jednoduchý číselník (`S.payTypes`) s ikonou a názvem, přiřazuje se
k transakci. Výchozí sada vzniká v `seedData()`; uživatel může přidávat.

V Nastavení jde zvolit **výchozí typ platby** (`_settings.defPayType`), který
se předvyplní u nové transakce — a od S20 se ptá i onboarding.

Slouží hlavně k filtrování a k rozpadu v Souhrnu; do žádného výpočtu
finančního zdraví nevstupuje.

### 🟢 Pozorování: mazání typu nechá transakce s odkazem na nic

Typ platby jde smazat, ale transakce, které ho nesou, si `payType` ponechají.
V přehledech pak spadnou do „nezařazeno". Není to ztráta dat a u číselníku
téhle velikosti to nevadí — ale je to stejný vzorec jako u kategorií.

---

## Shrnutí nálezů

| | Kde | Co | Dopad |
|---|---|---|---|
| 🟡 | `stats.js` | `updateCatPctInfo` přeskakuje přesunové kategorie | Součet % nesedí, chová se jinak podle otevřené kategorie |
| 🟢 | `premium.js` | Smazaný typ platby zůstane na transakcích | Kosmetika |

Druhý žlutý nález, který tu původně byl („`editCat` nepřepočítá přehled"),
jsem **odvolal** — viz výše. Ověřování nálezu na výseči souboru místo na celé
funkci je přesně ta chyba, která vyrobí falešný poplach.

---

## Stav pokrytí rešerší — HOTOVO

| Část | Karty |
|---|---|
| 1 | Dashboard · Transakce · Příští měsíc · Predikce · Radar · Finanční obraz · Detektor · Měsíční report · Report matice · Účtenky · Inflace · Deník · Projekty · AI Rádce |
| 2 | Sdílení & rodina · Nákupní seznam · Import |
| 3 | Kurzy měn · Simulace života · Komunitní přehled |
| 4 | Zůstatek a peněženky · Budoucí platby & šablony · Souhrn výdajů |
| 5 | Půjčky · Finanční aktiva · Import z banky (notifikace) |
| 6 | Kalendář · Narozeniny & přání · Grafy |
| 7 | Kategorie · Tagy · Typy plateb |

**Zbývá jediné:** Admin panel — ale ten je interní nástroj pro Milana, ne
uživatelská karta. Stojí za rešerši, jen s jinou otázkou: ne „rozumí tomu
uživatel", ale „dá se tím appka bezpečně spravovat".
