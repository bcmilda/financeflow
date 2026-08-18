# AUDIT · FIX-252 fáze 2 — `getActual()` a surové částky

**Session 19 · 2026-08-17 · REVIEW, nic zatím neopraveno**
Cíl: zjistit, na čem jsme, než sáhneme na sdílený výpočet (SKILL 12).

---

## 0 · Odpověď na Milanovu otázku: rozbije se něco?

**Ano — a přesně na dvou místech.** Není to teorie, ověřil jsem to spuštěným testem.

Tvoje intuice („logicky by se nemělo nic rozbít, jde jen o odstranění chybné logiky")
byla správná **pro výdajové kategorie**. Neplatí ale pro kategorie **spoření a investic**,
protože ty jsou v `categories.json` typu `transfer`:

```
cat_t_invest  | Investice        | type=transfer | isSaving=true
cat_t_trading | Trading          | type=transfer | isSaving=true
cat_t_reserve | Finanční rezerva | type=transfer | isSaving=true
cat_t_savings | Spoření          | type=transfer | isSaving=true
cat_t_funds   | Fondy            | type=transfer | isSaving=true
cat_t_pension | Penzijko         | type=transfer | isSaving=true
```

`isTransferTx()` vrací `true` pro **každou** transakci v těchto kategoriích.
A dvě místa v kódu na `getActual()` nad těmito kategoriemi **přímo stojí**:

| Soubor | Řádek | Co počítá |
|---|---|---|
| `premium.js` | 1520 | `totalSaved` → **S4 „Aktivní spoření"** (0–35 b) ve Finančním skóre |
| `projects.js` | 512 | `totalSaved` → **savingScore** ve Zdraví financí |

### Důkaz (spuštěný test, 3 varianty implementace)

```
kategorie                              DNES   plošně  chytře
Spoření (isSaving)                     5000        0     5000
Investice (isSaving)                   3000        0     3000
Půjčka (both, obsahuje přesun 4000)    5500     1500     1500
Jídlo (čistý výdaj)                    2200     2200     2200

DOPAD NA totalSaved (premium.js:1520 · projects.js:512)
  dnes  : 8000 Kč
  plošně: 0 Kč   ← S4 „Aktivní spoření" spadne na NULU
  chytře: 8000 Kč ← beze změny
```

**Kdybych přidal `!isTransferTx(t)` naslepo, uživateli by se Finanční skóre propadlo
až o 35 bodů a Zdraví financí by hlásilo „🔴 Spoření nízké / nenastaveno"** — u člověka,
který spoří poctivě dál. Přesně tohle SKILL 12 hlídá.

### Řešení: varianta „chytře"

Filtr se neaplikuje plošně, ale **jen když dotazovaná kategorie sama není přesunová**:

```js
const catIsTransfer = window._transferCatIds && window._transferCatIds.has(catId);
// … .filter(t => catIsTransfer ? true : !isTransferTx(t))
```

Logika: *když se někdo ptá přímo na kategorii Spoření, chce vidět, co do ní přiteklo.
Když se ptá na Jídlo nebo Půjčku, přesun tam nepatří.*

**Výhoda: nemění se ani jedno ze 37 volání.** Rozhoduje se podle argumentu, ne podle volajícího.
Žádný alternativní parametr, žádná úprava call sites, nulové riziko, že se na některé zapomene.

---

## 1 · Všech 37 volání `getActual()` — klasifikace

| # | Místo | Funkce | Kategorie odkud | Dopad opravy |
|---|---|---|---|---|
| 1 | `advisor.js:94` | `advisorBuildData` | expense/both | ✅ zpřesní |
| 2 | `ai.js:77` | `buildFinanceContext` | expense/both | ✅ zpřesní |
| 3 | `helpers.js:375` | `computeYearForecast` | expense/both | ✅ zpřesní |
| 4 | **`premium.js:1520`** | `computeFinancialScore` | **isSaving/isInvest → transfer** | ⚠️ **plošně = 0** |
| 5 | `projects.js:369` | `_autoLimitsSuggest` | expense/both | ✅ zpřesní |
| 6 | `projects.js:500` | `computeHealthScores` | expense/both | ✅ zpřesní |
| 7 | **`projects.js:512`** | `computeHealthScores` | **isSaving/isInvest → transfer** | ⚠️ **plošně = 0** |
| 8 | `projects.js:668` | `getActualRange` | expense/both | ✅ zpřesní |
| 9–10 | `projects.js:694,703` | `reportWatchlist` | expense/both | ✅ zpřesní |
| 11–12 | `projects.js:761,762` | `reportBiggestMoves` | expense/both | ✅ zpřesní |
| 13 | `projects.js:942` | `renderReport` | expense/both | ✅ zpřesní |
| 14–16 | `stats.js:30,33,38` | `statCatSum` | podle volajícího | ✅ zpřesní |
| 17–21 | `stats.js:86,99,107,219,220` | `renderStats` | expense/both | ✅ **odstraní rozpor se součtem** |
| 22–23 | `stats.js:266,268` | `renderChordDiagram` | expense/both | ✅ zpřesní |
| 24 | `stats.js:1067` | `renderFamilySummary` | expense/both | ✅ zpřesní |
| 25–28 | `transactions.js:92,115,120,132` | `renderPredTable` | expense/both | ✅ zpřesní |
| 29–30 | `ui.js:514,588,589` | treemap / bubliny | expense/both | ✅ zpřesní |
| 31–35 | `ui.js:1098,1103,1104,1123` | `renderSouhrn` | expense/both | ✅ **odstraní rozpor se součtem** |
| 36–37 | `ui.js:1155,1156` | `renderSuhrnReport` | expense/both | ✅ zpřesní |

**Souhrn: 35 volání ✅ zpřesní · 2 volání ⚠️ vyžadují variantu „chytře".**

### Viditelný rozpor, který oprava odstraní

V **Souhrnu výdajů** (`ui.js:1070`) se celkový součet nahoře počítá funkcí, která
přesuny **vylučuje** (`allExpTxs`, komentář S16.13: *„přesuny nejsou výdaj"*).
Řádky kategorií pod ním jedou přes `getActual()`, která je **zahrnuje**.

> **Součet řádků může být vyšší než celkový součet na téže obrazovce.**

Stejný rozpor je mezi **Reportem** (přesuny vylučuje) a **Statistikami** (zahrnuje) —
stejná kategorie, stejný měsíc, dvě různá čísla.

**Jak si to ověříš za minutu:** otevři Souhrn výdajů, sečti řádky kategorií a porovnej
s celkovým součtem nahoře. Když sedí, nemáš přesuny pod výdajovými kategoriemi
a problém je u tebe jen teoretický.

---

## 2 · Surové částky bez `txCZK` — 20 míst

Grep našel `a+(t.amount||t.amt||0)`. **Ne všechno je chyba** — u některých míst
cizí měna nedává smysl nebo se transakce už filtrovaly jinde. Prošel jsem každé.

### 🔴 CHYBA — cizí měna se sčítá v nominálu (100 € = 100 Kč)

| Místo | Funkce | Co se pokazí |
|---|---|---|
| `projects.js:300` | `computeBaseIncome` | **Základ příjmu** — vstupuje do S1/DTI/DSTI/S3/S4, tedy do **celého skóre**. Nejzávažnější z celého seznamu |
| `projects.js:662` | `getActualRange` | Report za období — a sousední `getActual()` počítá správně, takže se rozcházejí |
| `projects.js:4682` | `renderDetektor` | Kategorie přes limit → falešná/chybějící doporučení |
| `projects.js:4572` | `renderDetektor` | Bankovní poplatky |
| `projects.js:4649,4665` | `renderDetektor` | Pojištění, telefon |
| `projects.js:4794,4798` | `renderDetektor` | „Utratíš vše v prvním týdnu po výplatě" |
| `stats.js:228,234,235` | `renderStats` | Roční a celkové součty v insights |
| `ui.js:523` | `renderDashTreemap` | Bucket „Ostatní" na dashboardu |
| `debts.js:530` | `computeDebtPaid` | **Splátka v eurech** → špatně zaplacená jistina i úrok |
| `ai.js:108` | `buildFinanceContext` | AI dostane špatné číslo → radí podle něj |
| `projects.js:2704` | `renderRadarPayday` | Tempo flexibilních výdajů v cyklu |

### 🟡 K ROZHODNUTÍ

| Místo | Proč to není jednoznačné |
|---|---|
| `projects.js:53,54,111,112` | **Projekty** (rekonstrukce, dovolená). Projekt v cizině se možná *má* počítat v cizí měně — je to vědomé rozhodnutí, ne chyba. **Otázka na tebe.** |

### ✅ V POŘÁDKU

`projects.js:4794` (`paydayTx` – hledá se *největší* transakce, ne součet)
— porovnání nominálů je zde nepřesné, ale nikoli početně chybné.

---

## 3 · Navrhovaný postup

**Fáze A — `txCZK` (bez rizika).**
Nahradit surové částky na 15 🔴 místech. Nemění logiku, jen měnu.
V CZK-only datech se nezmění **nic**; u cizích měn se čísla opraví nahoru.
`computeBaseIncome` udělat první — visí na něm celé skóre.

**Fáze B — přesuny (varianta „chytře").**
Jedna změna v `getActual()` + stejná v `getHistAvg()` (aby zůstaly zrcadlové).
Nula změn na 37 call sites. Regresní test na obě skórovací místa **před i po**.

**Fáze C — `renderDetektor`.**
Sedm míst v jedné funkci, žádné nevylučuje `splitParent` ani `isBalancing`.
Zaslouží si vlastní průchod, ne přílepek.

**Doporučení:** A a B v jedné verzi (v9.81) s testy, C zvlášť.
Rozsah A+B je ~17 řádků ve 4 souborech — na jednu session akorát.

---

## 4 · Proč to celé vzniklo

Není to nedbalost, je to **stáří kódu**. `getActual`, `getHistAvg` a `computeBaseIncome`
vznikly, když aplikace uměla jen koruny a neměla přesuny ani rozdělené transakce.
Když pak přibyly (v8.58 cizí měny, v8.71 přesuny, FIX-119 splity), opravily se funkce,
kde se to **projevilo na obrazovce**. Ty, které vracejí *odhad* nebo *skóre*, prošly bez
povšimnutí — od odhadu nikdo přesnost nečeká a skóre je jen číslo mezi 0 a 100.

**Poučení pro CLAUDE_SKILLS:** když se opravuje vzor (ne konkrétní chyba),
je potřeba prohledat **všechny výskyty toho vzoru**, ne jen místo, kde se ohlásil.
Tenhle audit je přesně ta chybějící část u FIX-073, FIX-119 a S16.13.
