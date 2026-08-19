# K čemu jsou jednotlivé nástroje v `tools/`

Spouštím je já před dodávkou. Ty je jen držíš v repu, aby je měla i každá další session.
`firebase.json` má `tools/**` v `ignore`, takže se nikdy nenasadí.

| Nástroj | Co hlídá | Kdy se hodí |
|---|---|---|
| **`smoke_mena.js`** | Tři pasti měnové konverze: dvojí převod (`fmtB` nad hodnotou po `czkToBase`), natvrdo psané `" Kč"` u částky, a že každé zbylé `fmt()` je na schváleném seznamu výjimek | **Po každém zásahu do zobrazení částek.** Bez něj se chyba vrátí při první další úpravě |
| **`smoke_fix252.js`** | Že `getHistAvg` a `getActual` dají nad stejným měsícem **identické číslo** — zobrazují se vedle sebe jako „odhad vs. skutečnost" | Při zásahu do predikčního enginu |
| **`smoke_fix252b.js`** | Že přesuny nejsou ve výdajích kategorie, ale `totalSaved` zůstává (jinak spadne skóre spoření o 35 bodů). Kontroluje i „součet řádků = celkový součet" | Při zásahu do `getActual`, `getHistAvg` nebo kategorií typu transfer |
| **`smoke_detektor.js`** | Že Detektor úspor nepočítá splity dvakrát, ignoruje vyrovnání a přesuny, a výplatu určuje přes `txCZK` | Při úpravě Detektoru |
| **`smoke_projmena.js`** | Rozpad útraty projektu podle měn — základní měna se neopakuje, příjmy zvlášť od výdajů | Při úpravě Projektů |
| **`smoke_txcur.js`** | Přepínač měny: 20 € českou kartou uloží 594 Kč, přepnutí zpět přepis zruší, u přesunů se neuplatní. Plus odvození měny u starších transakcí bez pole `currency` | Při úpravě modalu Přidat transakci |
| **`smoke_pristi.js`** | Karta Příští měsíc — 50 testů: oba režimy, prázdná i plná data, kotva výplatního cyklu, přelom roku, `viewingUid`, nikde `NaN` v HTML | Při úpravě `pristi.js` |
| **`smoke_activity.js`** | Metriky aktivity: série dní, okna 30/90, aktivace, poškozené klíče (`2026-13-99` projde regulárním výrazem, ale datum to není) | Při úpravě admin panelu |
| **`smoke_backup.js`** | Zálohy: rotace na 5, pojistka „pred-obnovou", odmítnutí poškozené zálohy, a hlavně že obnova vynutí **plný zápis** — jinak by v databázi zůstali sirotci | Při úpravě záloh nebo diff-write |
| **`audit_transfer.js`** | Není test, ale **důkaz**: ukazuje ve třech variantách, co by udělal plošný filtr přesunů (`totalSaved` → 0) | Doklad k rozhodnutí, proč filtr není plošný |

## Jak je spouštím

```bash
node tools/check_tdz.js js/*.js     # tvůj, běží nad celým repem
for t in tools/smoke_*.js; do node $t; done
```

`check_tdz.js` potřebuje vidět **všechny** moduly i `app.html` — jinak hlásí falešné
„NENI NIKDE DEKLAROVANE" u funkcí z modulů, které nevidí.

**Tip:** přidej si do `KNOWN` chybějící prohlížečové globály, ať to nešumí:
`getComputedStyle`, `File`, `Response`, `Request`, `self`.
