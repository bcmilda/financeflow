# 🔧 Patch Session 15 — FinanceFlow (v8.57 → v8.60)

> Formát: MD-Diff multi-patch pro AI Merge. Každá sekce `## 📄 soubor.md` se připojí (append) k odpovídajícímu konsolidovanému dokumentu.
> Datum: 2026-07-02 · Pracovní jazyk: čeština
> Verze: v8.57 → **v8.60** (3 verze) · Navazuje na: FIX-173, TODO-148, ADR-078
> Hlavní téma: **Zafixovaný kurz u transakcí v cizí měně** (TODO-144–146, 148) + graf Zdražování (TODO-147).
> Nové pravidlo S15: při version bumpu se aktualizují i hlavičky změněných JS souborů (`// FinanceFlow · vX.XX · soubor.js · datum`), workeru a database.rules.json (pokud se měnily).

---

## 📄 decisions.md

### ADR-079 · Zafixovaný kurz transakce v cizí měně (`amtCZK`) **(Session 15, v8.58)**
- **Datum:** 2026-07-02
- **Rozhodnutí:** Transakce v cizoměnové peněžence se při vložení/editaci **nezafixovávají na živý kurz** — místo toho se do transakce uloží pole `amtCZK` (skutečná hodnota v Kč). Pole „Skutečně v Kč" v modalu je předvyplněné aktuálním kurzem ČNB, ale **volně editovatelné** — uživatel zapíše, kolik mu banka reálně strhla (každá banka má jiný kurz než ČNB). Jednou uložená hodnota se už NIKDY nepřepočítává živým kurzem.
- **Důvod:** Živý přepočet měnil historické součty s každou změnou kurzu a neodpovídal skutečně strženým částkám. Kurz banky ≠ kurz ČNB.
- **Priorita čtení (helper `txCZK(t, data)` v helpers.js):** 1) `t.amtCZK` (zafixováno) → 2) CZK peněženka / bez peněženky → `amount` → 3) cizí peněženka bez fixace (staré transakce) → fallback živým kurzem `toCZK`. Staré transakce se zafixují při první editaci (pole se předvyplní, uložením se fixuje).
- **Rozsah:** běžné transakce, splátky dluhů, vklady do aktiv (Přesun → Investice). Přesun mezi peněženkami pole nezobrazuje (částky zůstávají v měnách peněženek, přesuny jsou mimo statistiky). U CZK peněženky se ukládá `amtCZK: null` → Firebase klíč smaže.
- **Status:** ✅ Nasazeno v8.58

---

## 📄 bugs.md

### FIX-174 · Editace transakce nevyplňovala peněženku ani typ platby **(Session 15, v8.58)**
- **Příčina:** `editTx()` (ui.js) nevolal `populateTxWalletSelect()`/`populateTxPayTypeSelect()` a nenastavoval hodnoty selectů → v editaci zůstalo „– výchozí –" / „– nevybráno –", i když transakce peněženku měla. Uložení beze změny selectu starou peněženku tiše zachovalo (Object.assign nepřepsal), ale uživatel ji neviděl. Objeveno při implementaci TODO-144 (pole „Skutečně v Kč" se řídí měnou peněženky → editace musí peněženku znát).
- **Oprava:** `editTx()` naplní oba selecty a nastaví `t.wallet`/`t.payType`.
- **Soubor:** `ui.js`

### FIX-175 · Duplicitní detekce ignorovala měnu (TODO-145) **(Session 15, v8.59)**
- **Příčina:** `detectDuplicates()` porovnávalo surové `t.amount` → 900 Kč a 900 GBP byly „stejná částka" a označeny jako duplikát.
- **Oprava:** Porovnání v základní měně přes `txCZK()` (900 GBP ≈ 26 500 Kč → žádná shoda). Tolerance zvýšena z 0,01 na 1 Kč (živý kurz u starých nezafixovaných transakcí může mírně kolísat mezi rendery).
- **Soubor:** `duplicates.js`
- **🔗 Cross-reference:** `todo.md` TODO-145 (uzavřeno), `decisions.md` ADR-079

---

## 📄 features.md

### Zafixovaný kurz u transakcí v cizí měně (ADR-079) **(v8.58)**
Při výběru cizoměnové peněženky v modalu transakce se pod Částkou zobrazí pole **„Skutečně v Kč (kurz tvé banky)"** — předvyplněné živým kurzem ČNB, ale editovatelné. Uloží se do `t.amtCZK` a už se nepřepočítává. Label částky ukazuje měnu peněženky („ČÁSTKA (EUR)"). Platí pro běžné transakce, splátky i vklady do aktiv; přepínání peněženky/typu/režimu pole aktualizuje (`updateTxCzkField`). U cizoměnového řádku v seznamu transakcí se pod částkou ukazuje „≈ X Kč" (u nezafixovaných starých transakcí s poznámkou „orient.").

### Součty v základní měně (TODO-146) **(v8.58)**
Denní hlavičky v Transakcích, souhrnný badge a klíčové agregace (`incSum`/`expSum`/`getActual` — statistiky, rozpočty, banka) počítají v Kč přes `txCZK()`. 900 GBP se v denním součtu započítá jako ~26 500 Kč, ne 900 Kč.

### Historický kurz vkladu do aktiv (TODO-148) **(v8.58)**
`syncInvestmentAssets()` i historie hodnoty aktiva (`assetDepositEvents`) používají zafixovanou `amtCZK` z okamžiku vkladu místo aktuálního kurzu ČNB. Staré vklady bez fixace zůstávají na živém kurzu (fallback).

### Graf vývoje cen pod Zdražováním (TODO-147) **(v8.60)**
Analýza účtenek → Zdražování: pod seznamem položek interaktivní SVG graf — top 5 položek s největší |změnou| ceny. Osy s popisky (Cena Kč/ks, Datum nákupu), 4 gridliny, legenda s % změnou, tooltip na bod (datum · cena · obchod, funguje i na dotyk). Pevný viewBox 640×300 + `max-width` + `preserveAspectRatio` → kreslí se korektně i ve skryté záložce, bez měření šířky. Compute/render odděleno (`pricesTrendChartData` / `buildPricesTrendChart`).

---

## 📄 todo.md

### TODO-144 · Měny podle základní měny uživatele ✅ DOKONČENO (zjednodušený model) **(Session 15, v8.58)**
- **Řešení (rozhodnutí Milana):** místo živého přepočtu **zafixovaný kurz při vložení** + ručně editovatelná skutečná cena v Kč (ADR-079). Základní měna zatím CZK napevno (jako celá appka); uživatelské nastavení základní měny odloženo — vytvořit nové TODO až bude potřeba.

### TODO-145 · Duplicitní detekce ignoruje měnu ✅ DOKONČENO **(Session 15, v8.59)**
- Viz FIX-175 — porovnání v Kč přes `txCZK`.

### TODO-146 · Denní sumář sčítá cizí měnu bez převodu ✅ DOKONČENO **(Session 15, v8.58)**
- Denní hlavičky + badge + incSum/expSum/getActual přes `txCZK`.

### TODO-147 · Graf pod tabulkou Zdražování ✅ DOKONČENO **(Session 15, v8.60)**
- SVG graf s osami, legendou a tooltipem (viz features.md).

### TODO-148 · Historický kurz vkladu ✅ DOKONČENO **(Session 15, v8.58)**
- Vyřešeno zafixovanou `amtCZK` — vklad nese kurz z okamžiku vložení, historická data ČNB nejsou potřeba.

### TODO-149 · Přesun mezi peněženkami s různou měnou nepřevádí částku **(Session 15, 🟡 P2, otevřeno)**
- **Popis:** Převod peněženka→peněženka vytvoří txOut i txIn se STEJNOU surovou částkou. Převod 100 z eurové do korunové peněženky připíše 100 Kč místo ~2 530 Kč. Do modalu Přesunu přidat přepočet/editovatelnou cílovou částku (stejný princip jako ADR-079).
- **🔗 Cross-reference:** `decisions.md` ADR-079

---

## 📄 explanations.md

### Vzor: txCZK — částka transakce v základní měně **(Session 15)**
Všechny nové agregace čtou částku přes `txCZK(t, D)` (helpers.js, globální `window.txCZK`), NE přes `t.amount||t.amt||0`:
```
txCZK(t, D):
  1) t.amtCZK != null            → zafixovaná hodnota (kurz banky, needitovatelná kurzem)
  2) bez peněženky / CZK         → t.amount||t.amt||0
  3) cizí peněženka bez fixace   → toCZK(amount, měna)  // fallback pro staré tx
```
- `incSum`/`expSum` mají nový volitelný 2. parametr `data` (kvůli partner view — peněženky partnera); stávající volání beze změny fungují.
- **Kdy NEpoužívat txCZK:** průběžný zůstatek peněženky (`_txBalMap`), zobrazení částky v řádku — ty zůstávají v měně peněženky (FIX-148, S13).
- `amtCZK: null` u CZK peněženky → Firebase klíč při uložení smaže (změna peněženky EUR→CZK nezanechá starou fixaci).

---

## 📄 CLAUDE.md

### Pravidlo hlaviček souborů **(Session 15)**
Při version bumpu se kromě 4 standardních kroků (title/sidebar/banner, `sw.js` CACHE_NAME, hashe, VERZE_LOG) aktualizují i **hlavičky všech změněných souborů** ve formátu:
```
// FinanceFlow · vX.XX · soubor.js · YYYY-MM-DD
```
Platí pro JS moduly, `sw.js` (formát `//  FinanceFlow · Service Worker · vX.XX · datum`), `worker.js` a `database_rules.json` — pokud se v dané verzi měnily. Landing `index.html` verzi aktuálně neobsahuje (odstraněna v S9, renderReleaseNotes) — nic k aktualizaci.

---

## Přehled verzí Session 15

| Verze | Změny | Soubory |
|---|---|---|
| v8.58 | Zafixovaný kurz `amtCZK` (TODO-144/146/148, ADR-079) + FIX-174 | `debts.js`, `helpers.js`, `ui.js`, `assets.js`, `app.html` |
| v8.59 | Duplicity v základní měně (TODO-145, FIX-175) | `duplicates.js` |
| v8.60 | Graf vývoje cen pod Zdražováním (TODO-147) | `receipts.js` |

**Hashe (app.html, finální v8.60):** helpers `26ff1aa866ebe087` · ui `29472330fba46e98` · debts `e7098cf828253105` · assets `125b118048dbcfd6` · duplicates `107a91de6d37f311` · receipts `47145ee4f7c9eaac` · admin `cc12e1c65625a471`

**Beze změny:** `worker.js`, `database_rules.json`, landing `index.html` (žádný deploy Workeru není potřeba).

*Session 15 · v8.57 → v8.60 · Autor: Claude (Fable 5) + Milan Migdal*
