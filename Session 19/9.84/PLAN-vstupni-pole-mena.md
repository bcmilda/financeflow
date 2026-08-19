# PLÁN · Bod 1 — popisky `(Kč)` u vstupních polí

**Odpověď na „nerozbije se nic?"** — samotná změna popisku **rozbije data**. Proto to zatím
neudělané. Tady je, jak to udělat bezpečně.

## Proč je to nebezpečné

```html
<label>Rozpočet (Kč)</label>
<input id="projectBudget" type="number">
```
```js
budget: parseFloat(document.getElementById('projectBudget').value)   // uloží se SYROVĚ
```

Hodnota se ukládá **jako CZK**. Změním-li popisek na „Rozpočet (€)", uživatel napíše
`1000` s myšlenkou *1 000 €* a uloží se **1 000 Kč**. Tichá ztráta dat — nikde se to
neprojeví chybou, jen bude rozpočet 25× menší.

**Špatný popisek je nepříjemný. Špatně uložená data jsou horší.**

## Oprava musí být dvoudílná

| Krok | Co |
|---|---|
| 1 | Popisek → `curSym()` |
| 2a | **Uložení:** základní měna → CZK (`hodnota × kurz`) |
| 2b | **Načtení do editace:** CZK → základní měna (`czkToBase`) |

**Krok 2b se zapomíná nejčastěji** a je nejhorší: bez něj se při každém otevření
a uložení hodnota vynásobí kurzem znovu. Rozpočet 25 000 → 632 500 → 16 milionů.
Proto je round-trip test podmínkou, ne doplňkem.

## Rozsah: 18 polí, 5 modulů

| Modul | Pole |
|---|---|
| `projects.js` | rozpočet projektu |
| `debts.js` | jistina, zbývá, splátka, fixní pokuta, konsolidace, simulace ×2 |
| `premium.js` | částka šablony, cena přání, měsíční vklad, cílová částka, částka vkladu |
| `assets.js` | hodnota aktiva, vloženo celkem, hodnota v historii |
| `budouci.js` | dárek k narozeninám, měsíční částka k rozhodnutí |

Každé pole má **dva dotyky** (uložení + načtení) → ~36 míst.

## Postup, který navrhuju

**1. Dvě funkce v `helpers.js`** — jeden zdroj pravdy, ne 36 ručních převodů:
```js
baseToCzk(v)              // vstup uživatele → CZK k uložení
fillMoneyInput(id, czk)   // CZK → pole (převede + nastaví popisek)
readMoneyInput(id)        // pole → CZK
```

**2. Popisky dostanou `id`** a naplní se z `curSym()` po startu — žádné natvrdo psané `(Kč)`.

**3. Pole po jednom**, vždy oba dotyky najednou. Nikdy jen popisek.

**4. Round-trip test na každé pole:**
`zadám 1000 při EUR → uloží se 25 300 CZK → otevřu editaci → vidím 1000 → uložím → pořád 25 300`.
Druhé uložení je to podstatné — tam se projeví chybějící krok 2b.

**5. Migrace: žádná.** Uložená data zůstávají v CZK, mění se jen vrstva zadávání.

## Co se rozbít NEMŮŽE

- Existující data — formát se nemění, pořád CZK
- Uživatelé se základní měnou CZK — kurz 1,0, převod je identita
- Zobrazení — už je opravené přes `fmtB()`

## Co se rozbít MŮŽE, když se to udělá špatně

- **Chybí krok 2b** → hodnota se při každé editaci násobí kurzem (nejhorší, tichá eskalace)
- **Převod na obou stranách u pole, kde jeden krok už existuje** → dvojí převod
- **Pole sdílené dvěma modaly** (např. cena přání × cíl) → jeden opraven, druhý ne

Všechny tři odchytí round-trip test. **Bez něj do toho nechoď.**

## Odhad

18 polí × 2 dotyky + 18 testů. Jedna soustředěná session.
Doporučuju dělat po modulech a mezi nimi nasazovat — ne všech 18 najednou.
