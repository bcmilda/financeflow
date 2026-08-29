# Rešerše funkčních celků FinanceFlow — část 2

**Stav k v10.12 (2026-08-28)** · 39 JS modulů · Session 20

Pokračování `RESERSE-funkcni-celky.md` (karty 1–14). Tady tři obslužné celky,
které v první části chyběly.

> Vygenerováno čtením kódu, ne z paměti. Nálezy označené 🔴 / 🟡 jsou ověřené
> spuštěním, ne odhad.

---

## 15 · Sdílení & rodina 👨‍👩‍👧

**Otázka:** *Jak jsme na tom jako domácnost?*

Tři samostatné věci pod jednou hlavičkou, které spolu souvisejí méně, než se zdá:

| Část | Funkce | Modul |
|---|---|---|
| Rodinný souhrn | `renderFamilySummary` | `stats.js` |
| Správa sdílení | `renderSdileni`, `addPartner`, `removePartner` | `stats.js` |
| Partnerský odkaz + referral | `pairPartners`, `checkIncomingPartner` | `share.js` |

### Jak se lidé propojí

Sdílení je **párové a oboustranné**: `users/{uid}/partners/{jinyUid}` znamená
„tenhle člověk smí číst moje data". Aby se dva viděli navzájem, musí tam být
oba zápisy.

Existují **dvě cesty**, jak to vznikne:

1. **Ručně** — `addPartner()`, opsání cizího UID. Zapíše **jen jeden směr**,
   druhý člověk musí udělat totéž.
2. **Odkazem** — `?partnerOf={uid}` → `checkIncomingPartner()` → `pairPartners()`,
   který zapíše **oba směry najednou** a připíše referral bonus.

> **Korekce vlastního návrhu (S20):** v `PLAN-rodina-datovy-model.md` jsem psal,
> že 4členná domácnost znamená 12 ručních přidání a že chybí pozvánkový odkaz.
> **Odkaz už existuje** (`getPartnerUrl`, `copyPartnerLink`). Reálná bariéra je
> tedy 6 kliknutí (každá dvojice jednou), ne 12 opisování UID. Entita
> `households` by pořád dávala smysl (jeden zdroj pravdy, kdo do rodiny patří),
> ale argument „je to nepoužitelné" neplatí — návrh je v tomhle bodě opraven.

### Rodinný souhrn

Souhrnné dlaždice (příjmy, výdaje, saldo, dluh) za **všechny členy**, graf
trendu 6/12 měsíců, žebříček „Kdo na co utratil" s filtrem podle člena,
a sloupec s detailem pro každého.

**Zdroj:** `S` (moje data) + `partnerData[uid].data` (jejich). Každý člen má
vlastní `D` a všechny agregace jdou přes `txCZK(t, D)` — bez toho by se
partnerova cizoměnová transakce počítala kurzem z **mých** peněženek (FIX-273).

**Filtr člena zúží jen žebříček**, ne dlaždice ani graf. Kdyby filtroval i je,
„rodinné saldo" by přestalo být rodinné, aniž by to bylo z obrazovky poznat.

### 🔴 Co tady bylo špatně (opraveno v S20)

**FIX-274 — vypnutí přepínače mazalo data z cloudu.** `users/{uid}/data` byl
zároveň úložiště i výdejní okénko a `shareSettings` se vynucovaly při zápisu.
Odškrtnutí „Transakce" tedy nezastavilo sdílení, ale zapsalo
`transactions/{id} = null`. Týkalo se **každého uživatele**, i toho bez
partnera. Opraveno oddělením `data` (úložiště) od `shared` (výřez).

**Partnerova data se nesanitizovala** při prvním načtení v `loadPartners()`
ani nikde v `addPartner()` — jen v jednom listeneru. Přitom je to hlavní XSS
vektor (S16.5). Doplněno na všech čtyřech místech.

**`partners[0]`** — souhrn počítal jen prvního partnera, ostatní tiše zahazoval.

### Hranice

- Sdílení je **jedna kopie pro všechny** — nelze „babičce ukázat tohle, mámě tamto"
- Chybí koncept **společný vs. osobní výdaj** (`cat.shared` je o COICOP, ne o rodině)
- `removePartner()` nemaže `shared` — po odebrání partnera tam výřez zůstane
  (nečitelný, pravidlo kontroluje `partners`, ale leží tam)

---

## 16 · Nákupní seznam 🛒

**Otázka:** *Co mám koupit a zlevnilo něco, co hlídám?*

Dvě záložky: **Seznam** (položky + hlídač cen) a **Plány a cíle** (spoření na věc).

### Seznam a hlídač cen

Položka může být navázaná na **komunitní katalog** (`catalog/items` ve Firebase).
Katalog plní sami uživatelé přes analýzu účtenek (`publishPricesToCatalog`).

**Klíč položky** vzniká v `nakupNormKey()`: malá písmena, **odstraní se jednotky**
(`500 g`, `1 l`, `10 ks`), interpunkce, mezery na podtržítka, oříznuto na 40 znaků.
Stejná logika jako v `receipts.js` — díky tomu „Mléko 1 l" a „mléko 1l" spadnou
pod jeden klíč.

**Alert se spustí**, když `(refPrice − latestPrice) / refPrice × 100 ≥ alertPct`.

**Stáří ceny rozhoduje** (TODO-229): `fresh` → alert platí, `stale` / `expired`
→ alert **se nespustí**. Záznamy bez data (`latestDate` chybí) se chovají jako
dřív — schválně, aby starší položky nepřestaly hlásit ze dne na den.

Filtry: `all` · `alert` (hlídané) · `triggered` (zlevněné).

### Plány a cíle

Cíl = cílová částka + volitelný termín + měsíční odkládaná částka. Vklady leží
**mimo `S`**, ve `users/{uid}/goalDeposits/{goalId}` (`goalLoadDeposits`).

Stav počítá `goalGetStatus()`: `saved` (součet vkladů), `pct`, `remaining`,
`monthsLeft = ceil(remaining / monthly)` a **motivační nálada** podle procent
(🎉 100 % · 🟢 75 % · 🔵 40 % · 🟠 pod 10 % · 🟡 jinak).

### 🟡 Nález: cíl s prošlým termínem hlásí záporné dny

Varování se spouští při `daysLeft < 30`, ale **nemá spodní hranici**. U cíle
s termínem v minulosti tak vyjde:

```
termín: 2026-06-01 | dnes: 2026-08-28
daysLeft = -88
hláška: 🔴 Deadline za -88 dní!
```

Mělo by říct „Termín uplynul před 88 dny" (nebo podobně). Navíc `new Date()`
nese aktuální čas, zatímco `new Date('2026-06-01')` je půlnoc — u termínu
„dnes" tedy `Math.ceil` vyjde 0 nebo −1 podle denní doby.

**Pozor na formulaci opravy:** appka nikoho nekárá. „Termín uplynul" je fakt,
„Nestihl jsi to" už je hodnocení.

### 🟢 Drobnost: zastaralý komentář

Hlavička `nakup.js` uvádí `_nakupFilter = 'all' | 'active' | 'alert'`.
Skutečné hodnoty jsou `all` | `alert` | `triggered` — `active` neexistuje.

### Hranice

- Bez navázání na katalog (`catalogKey`) hlídač cen nefunguje — jen ruční `refPrice`
- Katalog je **komunitní a bez ověření**: cena, kterou nahraje kdokoli, se ukáže všem
- Ceny se liší **regionálně**, katalog zná obchod, ne kraj → proto opatrné
  „naposledy viděno", ne „je za"

---

## 17 · Import 📥

**Otázka:** *Jak dostanu do appky výpis z banky?*

Tři cesty: **CSV/Excel** (mapování sloupců podle banky), **PDF** (přes pdf.js
a AI extrakci) a **SMS** (`sms-import.js`).

**Tok:** soubor → `mapImportRows(rows, bank)` → náhled s návrhem kategorií →
editor s **detekcí duplicit** → `executeImport()`.

### Datum

`parseImportDate()` zkouší tři tvary v pořadí: `DD.MM.YYYY` → `YYYY-MM-DD` →
`MM/DD/YYYY`. Když neprojde ani jeden, vrací `null`.

**Riziko:** lomítkový tvar se čte jako **americký**. Pokud banka exportuje
`03/04/2026` v evropském pořadí, appka to přečte jako 4. března místo 3. dubna.
Tichá záměna — nikde se neohlásí.

### Detekce duplicit

`calcDupScore()` boduje shodu proti existujícím transakcím (FIX-074):

| Kritérium | Body |
|---|---|
| Datum ±1 d / ±3 d / ±7 d | 30 / 20 / 10 |
| Částka ±1 / ±10 / ±50 Kč | 40 / 20 / 10 |
| Název přesně / velmi podobný / podobný | 20 / 10 / 5 |
| Typ (příjem/výdaj) | 10 |

Rozdíl data > 10 dní → přeskočit. Bez jakékoli shody názvu → **strop 70 bodů**.
Prahy: žlutá ≥ 40, oranžová ≥ 60, červená ≥ 80.

### 🟡 Nález: duplicity neumí cizí měnu

`buildExistingIndex()` staví porovnávací částku takto:

```js
_amt: t.amount || t.amt || 0     // ← bez txCZK
```

Existující transakce v EUR má `amount = 100` a `amtCZK = 2500`. Bankovní výpis
nese **2500 Kč**. Porovnává se tedy 2500 proti 100 → rozdíl 2400 → **0 bodů
za částku** → duplikát propadne a transakce se naimportuje podruhé.

Je to přesně ten vzorec, který je v `CLAUDE.md` vedený jako opakovaná chyba
(SKILL 20): agregace a porovnání částek **vždy přes `txCZK(t, D)`**.

### 🟡 Nález: návrh podkategorie je mrtvá větev

`guessCategoryFromKeyword()` hledá podkategorie takto:

```js
for(const sub of (c.subcats || c.subcategories || [])) {
```

Jenže pole se v celé appce jmenuje **`subs`** (ověřeno v `categories.json`
i v `stats.js`, `ui.js`, `admin.js`, `helpers.js`, `charts.js`). Tenhle řádek je
**jediný výskyt `subcats`/`subcategories` v celém kódu** — smyčka tedy nikdy
neproběhne a import **nikdy nenavrhne podkategorii**, jen hlavní kategorii.

Nic nespadne, nic se nenahlásí. Funkce se prostě tiše nekoná.

### Hranice

- Import bez `_ts` (nečitelné datum) projde detekcí duplicit **bez bodů za datum**
- `MERCHANT_CATEGORIES` ze `sms-import.js` se použije, jen pokud je modul načtený
- PDF cesta závisí na AI a `repairTruncatedTxJson()` — u dlouhých výpisů se
  odpověď ořezává a opravuje heuristicky

---

## Shrnutí nálezů

| | Kde | Co | Dopad |
|---|---|---|---|
| 🟡 | `nakup.js` | Prošlý termín cíle → „Deadline za −88 dní!" | Kosmetické, ale vypadá rozbitě |
| 🟢 | `nakup.js` | Zastaralý komentář u `_nakupFilter` | Matoucí při čtení kódu |
| 🟡 | `import.js` | Duplicity porovnávají částku bez `txCZK` | **Dvojitý import** transakcí v cizí měně |
| 🟡 | `import.js` | `subcats` místo `subs` | Import nikdy nenavrhne podkategorii |
| 🔴 | `stats.js` | Vypnutí sdílení mazalo data | ✅ opraveno v S20 (FIX-274) |
| 🟡 | `stats.js` | `partners[0]` | ✅ opraveno v S20 |

**Doporučené pořadí oprav:** duplicity s cizí měnou (skutečná ztráta správnosti
dat) → `subs` v importu (chybějící funkce) → termín cíle (kosmetika).

Žádný z otevřených nálezů nemaže data ani neohrožuje bezpečnost — proto jsem je
zapsal a neopravoval hned, aby o nich Milan mohl rozhodnout.
