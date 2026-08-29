# Rešerše funkčních celků FinanceFlow — část 4

**Stav k v10.15 (2026-08-28)** · Session 20

Pokračování částí 1 (karty 1–14), 2 (15–17) a 3 (18–20).

> Nálezy označené 🔴 / 🟡 jsou ověřené spuštěním, ne odhad.

---

## 21 · Zůstatek a peněženky 👛

**Otázka:** *Kolik mám celkem?*

Peněženka nese `name`, `type` (hotovost / běžný účet / spořicí / investice /
kreditka / jiné), `currency`, `balance` a barvu. Celkový zůstatek počítá
`computeBank()` (`helpers.js:544`).

### Jak se zůstatek počítá

Ne jako součet `balance` peněženek, ale **od počátečního zůstatku plus všechna
salda měsíců až po zvolený měsíc**:

```js
let total = D.bank?.startBalance || 0;
monthKeys.forEach(key => {
  if (y > S.curYear || (y === S.curYear && m > S.curMonth)) return;   // budoucí měsíce ne
  total += incSum(txs) - expSum(txs);
});
```

Budoucí měsíce se vynechávají, takže při listování zpět ukazuje zůstatek
k tehdejšímu datu, ne dnešní.

### 🟡 Nález: `computeBank` počítá cizí měnu podle špatných peněženek

Uvnitř se volá `incSum(txs)` a `expSum(txs)` — **bez druhého argumentu `D`**
(řádky 553, 566, 568). `txCZK(t, D)` bez `D` spadne na `S.wallets`, tedy
peněženky **přihlášeného uživatele**.

Pro vlastní data je to neškodné. Jenže `computeBank(D)` se volá i nad
**partnerovými** daty — `stats.js:1055` (`familyBank += computeBank(D)`)
a `stats.js:1069`. Partnerova eurová peněženka v mých datech neexistuje,
takže se použije CZK a částka se vezme v nominále:

```
partnerův příjem: 2000 EUR
computeBank dnes (bez D): 2000 Kč   ← bere to jako koruny
správně (s D):           50000 Kč
```

Je to **stejná třída chyby jako FIX-273** (opravený dnes v `renderFamilySummary`),
jen o úroveň hlouběji — opravil jsem volající funkci, ale `computeBank` si tutéž
chybu nese uvnitř. Týká se i `bankSeries()`, která kreslí graf vývoje zůstatku.

Nenapravil jsem to hned: `computeBank` má osm volajících napříč appkou a zásah
do helperu, který používá skoro všechno, si zaslouží vlastní kolo testů.

---

## 22 · Budoucí platby & opakované šablony 🔄

**Otázka:** *Co mě čeká a co už jsem zaplatil?*

Sloučený výhled ze čtyř zdrojů: **opakované šablony**, **narozeniny**,
**splátky dluhů** a **cíle**. Horizont je volitelný, výchozí 30 dní.
Funkce `budouciGetAll()` (`budouci.js:15`).

**Šablony jsou jen projekce** — nic se nezapisuje samo. „Zaznamenat" otevře
běžný modal transakce s předvyplněnými hodnotami a uživatel potvrdí. Plná
automatizace je vedená jako TODO-190. To je dobré rozhodnutí: tichý zápis
na pozadí je přesně to, co člověku rozhodí účetnictví bez varování.

### Jak se pozná zaplacená platba

`budouciIsPaid()` hledá mezi transakcemi shodu **jména** a **období**:

```js
const nameMatch = tn === nm || tn.includes(nm) || nm.includes(tn);
```

Pro splatnost, která ještě nenastala, se porovnává přesný den; po splatnosti
stačí shoda měsíce (aby se poznala i ručně zapsaná platba mimo termín).

### 🟡 Nález: shoda jmen je příliš volná

`includes` v obou směrech znamená, že **kratší název je podřetězcem delšího**.
Ověřeno:

```
šablona → transakce v témže měsíci → označí jako zaplacené?
  "Voda"  vs "Vodafone"                → ANO ⚠️
  "Nájem" vs "Nájemné garáž"           → ANO ⚠️
  "Plyn"  vs "Plynulá jízda pojištění" → ANO ⚠️
  "Auto"  vs "Autolékárna"             → ANO ⚠️
```

Šablona „Voda" se označí jako zaplacená, protože jsi v témže měsíci zaplatil
Vodafone. **Částka se neporovnává vůbec** — nájem 15 000 Kč se tváří jako
zaplacený i tehdy, když jsi zaplatil zálohu 500 Kč se stejným názvem.

Dopad je mírný (jde o informativní odznak, ne o výpočet), ale směr chyby je
nepříjemný: appka řekne „✓ Zaplaceno" u něčeho, co zaplacené není, a člověk
podle toho nezaplatí. Falešné „Nezaplaceno" by bylo neškodnější.

**Nápad na opravu:** vyžadovat u kratších názvů shodu celého slova (ne
podřetězce) a přidat toleranci na částku, například ±20 %.

---

## 23 · Souhrn výdajů 📋

**Otázka:** *Kde jsem tento měsíc utratil víc než minule?*

Tabulka kategorie × (minulý měsíc · tento měsíc · predikce · změna · podíl).
Funkce `renderSouhrn()` (`ui.js:1063`). Slouží zároveň jako podklad pro
Měsíční report (`window._suhrnReport`).

### Co je udělané dobře

Tahle karta nese stopy dvou dřívějších oprav a obě sedí:

- **FIX-076**: celkový součet jde přes **všechny** výdajové transakce, ne přes
  součet kategorií — jinak by chyběly nezařazené (typicky z PDF importu)
- **S16.13**: součet přes `txCZK(t, D)`, ne raw `amount`, a `isTransferTx`
  vyloučené — přesun na spořicí účet není výdaj

V řádcích se navíc drobné položky sbalí (pod 3 % výdajů a bez výrazného pohybu),
takže tabulka neroste donekonečna.

### 🟢 Pozorování: podíly nesečtou 100 %

Sloupec „Podíl" počítá `cur / totalCur`, kde `totalCur` zahrnuje **i nezařazené
transakce**, ale řádky tabulky jsou jen kategorie. Když má někdo hodně
nezařazených výdajů, podíly v součtu nedají 100 % a není z čeho poznat proč.

Není to chyba výpočtu — obě čísla jsou správně, jen se vztahují k mírně jinému
základu. Za zvážení stojí řádek „Nezařazeno" s doplňkem do 100 %.

---

## Shrnutí nálezů

| | Kde | Co | Dopad |
|---|---|---|---|
| 🟡 | `helpers.js` | `computeBank`/`bankSeries` volají `incSum`/`expSum` bez `D` | Partnerova cizí měna v nominále (2000 místo 50 000) |
| 🟡 | `budouci.js` | Shoda jmen přes `includes` obousměrně, částka se neporovnává | „✓ Zaplaceno" u nezaplacené položky |
| 🟢 | `ui.js` | Podíly nesečtou 100 % kvůli nezařazeným | Kosmetika, ale matoucí |

**Doporučené pořadí:** `computeBank` (týká se čísel, ne popisků) → shoda jmen
u budoucích plateb → podíly.

---

## Stav pokrytí rešerší

| Část | Karty |
|---|---|
| 1 | Dashboard · Transakce · Příští měsíc · Predikce · Radar · Finanční obraz · Detektor · Měsíční report · Report matice · Účtenky · Inflace · Deník · Projekty · AI Rádce |
| 2 | Sdílení & rodina · Nákupní seznam · Import |
| 3 | Kurzy měn · Simulace života · Komunitní přehled |
| 4 | Zůstatek a peněženky · Budoucí platby & šablony · Souhrn výdajů |

**Zbývá nepokryto:** Kalendář, Tagy, Finanční aktiva, Půjčky, Grafy, Statistiky,
Narozeniny & přání, Kategorie, Typy plateb, Import z banky (SMS), Admin panel.
