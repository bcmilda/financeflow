# Rešerše funkčních celků FinanceFlow — část 3

**Stav k v10.14 (2026-08-28)** · Session 20

Pokračování `RESERSE-funkcni-celky.md` (1–14) a `RESERSE-funkcni-celky-2.md` (15–17).

> Nálezy označené 🔴 / 🟡 jsou ověřené spuštěním, ne odhad.

---

## 18 · Kurzy měn 💱

**Otázka:** *Kolik je dneska euro?*

Denní kurzovní lístek ČNB přes Cloudflare Worker (`/cnb`, cache 1×/den), možnost
připnout oblíbené měny. Modul `kurzy.js` (163 řádků, nejmenší v appce).

### Tři vrstvy kurzů

| Vrstva | Kde | K čemu |
|---|---|---|
| `_fxData` | `kurzy.js`, z Workeru | Živý lístek ČNB pro dnešek |
| `_fxHistCache` | `kurzy.js`, `/cnb?date=` | **Historický** lístek k datu transakce (TODO-215) |
| `_FX_RATES` | `debts.js:325`, napevno | Orientační průměry — `EUR: 25.3, USD: 23.1, …` |

**Řetěz pádů:** Worker neodpoví → `_fxData.source = 'fallback'` → `initFxRates()`
**záměrně nepřepíše** `_FX_RATES` → počítá se s orientačními průměry zapsanými v kódu.

### Co je udělané dobře

**Historický kurz k datu transakce** (`fxRatesForDate`). Milanova námitka byla
správná: když se transakce zapisuje se zpožděním, „dnešní" kurz k ní nepatří.
Cachuje se v paměti — historický lístek se už nezmění.

**Fallback se nikdy nevydává za ČNB.** `_fxRefNow()` vrací `null`, když je
`source === 'fallback'`. Komentář v `debts.js` to říká natvrdo: *„zapsat je jako
referenční ČNB by byla lež."* To je přesně ten druh poctivosti, který má appka mít.

**`fxRef` + `fxRefDate` jdou spolu** (ADR-101) — u srovnání bankovní marže se
tak dá poznat, jak čerstvý lístek to byl.

### 🟢 Pozorování: `amtCZK` se předvyplní orientačním kurzem bez upozornění

`_readTxCzk()` (`debts.js:162`) počítá předvyplněnou částku takto:

```js
const rate = _FX_RATES[cur] || 1;
```

Když Worker neodpověděl, je `_FX_RATES` orientační průměr z kódu — a výsledek
se uloží do `amtCZK`, které je **zafixované**. Uživatel má pole „Skutečně v Kč"
přepsat podle výpisu, takže designově je to odhad k opravě. Ale kdo ho nepřepíše
(většina), uloží si orientační číslo jako fakt a nikde se nedozví, že nešlo
o kurz ČNB.

Rozdíl proti `fxRef` je nápadný: tam se poctivě zapíše `null`, tady se tiše
dopočítá. Za zvážení stojí buď stejná poctivost, nebo tichá poznámka u pole.

**Druhá vrstva téhož:** `initFxRates()` se spouští `setTimeout(…, 4000)`.
Transakce zadaná v prvních čtyřech sekundách po startu dostane orientační kurz
i tehdy, když je Worker dostupný.

### Hranice

- Fallback kurzy jsou **zamrzlé v kódu** — čím starší verze, tím větší odchylka
- ČNB nevede SKK, proto zůstává `1.0` (historická hodnota)
- Kurzovní lístek vychází v pracovní dny ~14:30; víkendový zápis používá páteční

---

## 19 · Simulace života 🔮

**Otázka:** *Jak budu na tom v důchodu?*

Tři scénáře do věku odchodu do důchodu: **A** spoření bez investic, **B** aktivní
investování, **C** dřívější splacení dluhu. Vstupy se předvyplní z reálných dat
(příjem, průměrné výdaje za 3 měsíce, dluhy, spořicí a investiční peněženky).

Výstup: koncová částka, měsíční renta podle **pravidla 4 %**, graf.

### 🟡 Nález: scénáře A a B nejsou srovnatelné

Scénář A si každý měsíc **odečítá inflaci**:
```js
scenA *= (1 - inflation/100/12);
```
Scénář B počítá **nominálním** výnosem, inflaci neřeší:
```js
scenB = scenB * (1+r) + monthlyInvest;      // r = investReturn/100/12
```

A je tedy v dnešních penězích, B v budoucích. Vedle sebe se ale zobrazují jako
rovnocenná čísla. Ověřeno na stejné měsíční částce 4 500 Kč po 30 letech:

```
A (spoření, PO odečtení inflace):      1 106 938 Kč
B (investice, BEZ odečtení inflace):   6 301 519 Kč   ← takhle to appka ukazuje
B přepočtené na dnešní peníze:         2 596 142 Kč   ← férové srovnání s A
```

**Investování vypadá 6× lepší, férově je 2×.** Rozdíl nedělá investice, ale
metodika.

Že šlo o nedopatření, napovídá i tenhle řádek:
```js
const realReturn = (investReturn - inflation) / 100 / 12;
```
`realReturn` se spočítá a **nikde se nepoužije** — jediný výskyt v celém souboru.
Autor to zjevně zamýšlel, jen to nedotáhl.

### 🟡 Nález: scénář B investuje peníze, které uživatel nemá

```js
const monthlySurplus = income - expenses - debtPayment;   // může být záporný
const monthlyInvest  = income * investPct / 100;          // ale tohle na něm nezávisí
```

Ověřeno: příjem 30 000, výdaje 28 000, splátky 5 000 → **měsíčně chybí 3 000 Kč**.
Appka přesto počítá scénář, kde dotyčný investuje **4 500 Kč měsíčně**, a ukáže
mu 6,3 milionu. Scénář A na to reaguje (`savingsRate = Math.max(0, surplus)` → 0),
scénář B ne.

Zadlužený člověk s napjatým rozpočtem tak dostane číslo, které předpokládá peníze,
jež nemá. To je přesně ten typ rady, kterou finanční appka dávat nemá.

### 🟢 Drobnosti

- `bestLabel` porovnává jen B a C, scénář A do soutěže nevstupuje — při nulovém
  výnosu může být „nejlepší" označen scénář, který není nejvyšší
- `stateDuchodEst = income * 0.4 * 0.7` — 28 % příjmu jako odhad státního důchodu,
  v kódu okomentované jako *„rough estimate"*, bez zdroje a bez vysvětlení v UI

### Hranice

- Simulace **nepočítá s růstem příjmu** ani se změnou výdajů v čase
- Dluh v scénáři C se splácí **bez úroku** — jen se odečítá jistina
- Pravidlo 4 % je americká konvence pro akciové portfolio, ne český důchodový standard

---

## 20 · Komunitní přehled 🌍

**Otázka:** *Utrácím víc než ostatní?*

Srovnání vlastních výdajů s průměrem ostatních uživatelů a s daty ČSÚ, rozpad
podle COICOP oddílů. Režim „na osobu" / „na domácnost" (OECD ekvivalent).

**Zápis:** `publishCommunityStats(D)` (`admin.js:5878`) se volá po každém uložení
do Firebase. Odesílá do `community/{měsíc}/users/{uid}`:

```
cats       – výdaje po COICOP oddílech
income     – základní měsíční příjem
totalExp   – celkové výdaje za měsíc
savingRate – míra úspor v %
```

Podmínky odeslání: přihlášený neanonymní uživatel, známý příjem, aspoň 3 transakce.

### 🔴 Nález: opt-out ze sdílení do komunity NEEXISTUJE

Funkce začíná kontrolou souhlasu:

```js
const optOut = document.getElementById('settingCommunity');
if (optOut && !optOut.checked) return;
```

**Element `settingCommunity` se v celém projektu nevyskytuje nikde jinde** —
ověřeno napříč všemi `.js` soubory i `app.html`. Není v Nastavení, není v HTML,
nikdy nevznikl. `getElementById` tedy vrací vždy `null`, podmínka `optOut && …`
je vždy nepravdivá a **funkce se nikdy nezastaví**.

Důsledek: příjem, celkové výdaje, míra úspor a rozpad výdajů po COICOP se
odesílají **při každém uložení, všem uživatelům, bez možnosti to vypnout**.
Kód se přitom tváří, že souhlas kontroluje — ovládací prvek k němu jen nikdy
nevznikl.

Data nejsou anonymní na úrovni uzlu: klíčem je `uid` a `community/{měsíc}/users`
má `.read: auth != null`, tedy **každý přihlášený uživatel může přečíst záznamy
všech ostatních** včetně jejich UID. Agregace na průměr probíhá až v prohlížeči.

Vzhledem k GDPR a k tomu, že appka pracuje s finančními údaji, je tohle
nejzávažnější otevřený nález téhle rešerše. Neopravoval jsem to na místě —
oprava má dvě části (chybějící přepínač + rozhodnutí, co dělat s už odeslanými
daty) a druhá je věcné rozhodnutí, ne programátorské.

### Co je udělané dobře

**FIX-266 (S18)** srovnal měření: dřív se vlastní číslo počítalo jinak než
komunitní průměr (`t.amount` vs. `txCZK`, přesuny započítané vs. ne), takže
uživatel vycházel hůř, než ve skutečnosti byl. Dnes obě strany vylučují
`splitParent`, `isBalancing` i přesuny a jdou přes `txCZK`.

**Příspěvek přepisuje předchozí** (`_set` na `users/{uid}`), takže se nehromadí
duplicity za tentýž měsíc.

### Hranice

- Bez známého základního příjmu nebo pod 3 transakce měsíčně se nepublikuje
- Průměr je **neochráněný proti odlehlým hodnotám** — jeden uživatel s extrémním
  měsícem posune průměr celé komunity
- ČSÚ data jsou roční průměry, srovnání s konkrétním měsícem je orientační

---

## Shrnutí nálezů

| | Kde | Co | Dopad |
|---|---|---|---|
| 🔴 | `admin.js` | Opt-out z komunity neexistuje — kontroluje se element, který nikdy nevznikl | **Data se odesílají bez souhlasu, nelze vypnout** |
| 🟡 | `projects.js` | Scénáře A a B nesrovnatelné (A po inflaci, B před) | Investování vypadá 6× lepší místo 2× |
| 🟡 | `projects.js` | Scénář B investuje i při záporném přebytku | Rada investovat peníze, které uživatel nemá |
| 🟢 | `debts.js` | `amtCZK` se předvyplní orientačním kurzem bez upozornění | Nepřesnost, kterou uživatel nevidí |
| 🟢 | `projects.js` | `bestLabel` ignoruje scénář A; `stateDuchodEst` bez zdroje | Kosmetika |

**Doporučené pořadí:** opt-out komunity (soukromí, GDPR) → srovnatelnost scénářů
(appka radí na základě zkresleného srovnání) → scénář B bez krytí → zbytek.
