# Návrh · Kurzové ztráty

## Nejdřív: databáze kurzů

**Nestav ji.** Data už máš uložená v každé transakci — historický kurz z ní jde
dopočítat zpětně:

```
implicitní kurz = amtCZK / amount        → 594 / 20 = 29,70 Kč za €
```

To je **kurz, který ti banka skutečně dala**, včetně poplatku a marže. Přesně to,
co chceš měřit. Žádná tabulka, žádné místo v databázi navíc.

Chybí jen **referenční kurz ČNB k datu transakce**, abys věděl, o kolik byl ten
bankovní horší. Tři možnosti:

| Řešení | Místo v DB | Přesnost |
|---|---|---|
| **Uložit referenční kurz do transakce** (`t.fxRef`) | 1 číslo u cizoměnových transakcí | ✅ přesná, zafixovaná |
| Stáhnout historii z ČNB při výpočtu | 0 | ✅ přesná, ale síť + rate limit |
| Porovnávat proti dnešnímu kurzu | 0 | ❌ u starších transakcí nesmysl |

**Doporučuji první.** Worker už `/cnb` endpoint má, kurz se v modalu stejně načítá
kvůli předvyplnění — stačí ho **uložit vedle částky**. Jedno číslo, jen u transakcí
v cizí měně, žádné denní snímky celého kurzovního lístku.

## Kde to zobrazit — a kde ne

**Novou kategorii „Kurzové ztráty" nedělej.** Tři důvody:

1. Rozbila by součty — kategorie se sčítají do výdajů, ale ty peníze už jsou
   započítané v `amtCZK` té původní transakce. Počítalo by se to **dvakrát**.
2. Automaticky zapisované transakce nemá uživatel jak opravit ani smazat.
3. Porušuje pravidlo, že appka nevytváří záznamy, které uživatel nezadal.

**Kurzová ztráta není samostatný výdaj — je to vlastnost existující transakce.**
Proto ji ukazuj *u ní*, ne vedle ní.

### Návrh umístění

| Kde | Co | Proč |
|---|---|---|
| **Detail transakce** | „Kurz 29,70 · ČNB 25,30 · přirážka **88 Kč (17 %)**" | Tady si člověk spojí příčinu s následkem |
| **Souhrn období** | Jeden řádek „Na kurzech a poplatcích: **1 240 Kč**" | Číslo, které jinde neuvidí |
| **Detektor úspor** | Nález s rozpadem podle peněženky | Detektor je od toho, aby ukazoval, kde peníze tečou |
| **Projekty** | U dovolené: „z toho kurz a poplatky 640 Kč" | Nejsilnější kontext — dovolená *je* ta směna |

### Nejcennější výstup

Rozpad podle **peněženky a typu platby** — protože to je jediné, s čím se dá
něco udělat:

```
Průměrná přirážka nad kurz ČNB
  💳 Karta ČSOB      +2,1 %     14 plateb
  🏧 Bankomat        +8,4 %      3 výběry
  🏦 Přepážka       +11,2 %      1 směna
```

Tohle je rada, kterou lze následovat: *příště plať kartou, nevybírej v bankomatu.*
Samotné „nechal jsi tam 1 240 Kč" je jen konstatování.

## Postup

**Fáze 1** — ukládat `t.fxRef` (referenční kurz ČNB) při zápisu cizoměnové transakce.
Bez toho se nedá počítat nic. Sám o sobě žádné UI, jen sběr dat.

**Fáze 2** — zobrazení v detailu transakce a jeden řádek v Souhrnu.

**Fáze 3** — rozpad podle peněženky a typu platby, nález v Detektoru.

**Důležité:** fáze 1 musí běžet **dřív**, než bude co ukazovat. Než se nasbírá pár
zahraničních plateb, bude to prázdné. U starších transakcí `fxRef` chybět bude —
dopočítat ho zpětně nejde a odhadovat by znamenalo vyrábět čísla.
