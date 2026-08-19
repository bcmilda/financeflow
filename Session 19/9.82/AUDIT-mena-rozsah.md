# AUDIT · Základní měna — rozsah problému

**Session 19 · zjištění, NEOPRAVENO** (podklad pro rozhodnutí, kdy se do toho pustit)

## Jak to má fungovat

| Funkce | Co dělá |
|---|---|
| `fmt(n)` | jen naformátuje číslo — **žádný převod, žádný symbol** |
| `fmtB(v)` | CZK hodnota → převede kurzem a přidá symbol základní měny → `1 234 €` |
| `czkToBase(v)` | jen převod bez symbolu |

Vnitřní jednotka aplikace je **vždy CZK**. Do základní měny se převádí až při zobrazení.
Takže **každé `fmt()` nad peněžní hodnotou je chyba** — číslo zůstane v korunách,
jen bez popisky, takže vypadá „nějak".

## Rozsah

```
modul             fmt()  fmtB()      modul             fmt()  fmtB()
projects.js         122     179      transactions.js      35      16
receipts.js          35       0      stats.js             31       2
ui.js                26      18      report.js            18       0
ai.js                17       0      charts.js            16      37
debts.js             12      70      premium.js           11       3
inflace.js            9       0      review.js             9       0
```

**Ne každé `fmt()` je chyba** — používá se i na počty kusů, procenta, dny.
Ale moduly s **nulou v pravém sloupci** (`receipts.js`, `report.js`, `inflace.js`,
`review.js`, `ai.js`) peníze v základní měně nezobrazují **vůbec**.

Navíc **9 modulů má natvrdo psané `" Kč"`** za `fmt()` — tam se měna nezmění ani náhodou:
`projects.js` 15× · `admin.js` 14× · `ai.js` 14× · `receipts.js` 10× ·
`duplicates.js` 2× · `nakup.js` 2× · `debts.js` · `premium.js` · `offline-sync.js`

A **20 popisků `(Kč)` natvrdo v `app.html`** — to je ta „ČÁSTKA (KČ)" z Milanova
screenshotu, i když má nastavené GBP. Formuláře: šablona, dluh, aktivum, rozpočet projektu.

## Co je naopak správně

**Transakce v seznamu ukazují původní měnu** (−150 PLN, +13 000 Kč) s přepočtem `≈` pod tím.
To je korektní: zaplatil jsi v té měně a částka se nemá přepisovat. Přepočítávají se
až **součty**, které jedou v základní měně. Milanova domněnka byla správná.

## Priorita oprav

1. **`app.html` — 20 popisků `(Kč)`.** Uživatel vidí špatnou měnu při každém zadávání.
   Nejlevnější a nejviditelnější. Popisky dostanou `id` a doplní se `curSym()` po startu.
2. **Natvrdo psané `" Kč"` v 9 modulech.** Mechanická náhrada `fmt(x) Kč` → `fmtB(x)`.
3. **Moduly bez jediného `fmtB`** — `report.js`, `inflace.js`, `review.js`, `receipts.js`.
   Nutno projít ručně: rozlišit peníze od počtů a procent.
4. **`admin.js`** zůstává v CZK schválně — admin potřebuje jednu srovnatelnou jednotku
   napříč uživateli. **K potvrzení.**

## Odhad

Body 1–2 jsou převážně mechanické, ~60 míst, jedna session s testy.
Bod 3 je ruční průchod čtyř modulů, ~90 míst, druhá session.
