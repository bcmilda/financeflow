# Patch – Session 10 (část 4) – 2026-05-29

> **Navazuje na:** patch-session10_v3.md (v7.08)
>
> **Cíl:** Centrální debounce renderPage (TODO-093) + pokročilé finanční metriky (TODO-088/089/090/091/092).
>
> **Verze:** v7.08 → **v7.09**
>
> **Změněné soubory:** `ui.js`, `app.js`, `projects.js`, `assets.js`, `index.html`, `admin.js`
>
> ⚠️ **Pozn. k outputs:** finální soubory této části mají suffix `_v3`
> (`ui_v3.js`, `app_v3.js`, `projects_v3.js`, `assets_v3.js`, `admin_v3.js`, `index_v3.html`).
> Soubory beze změny v této části (`premium`, `advisor`, `styles`) zůstávají jako `_v2`.
> `index_v3.html` správně odkazuje na obě sady (ověřené hashe).

---

## 🐛 TODO-093 – Centrální debounce renderPage

**Soubory:** `ui.js`, `app.js`

### Příčina (širší než jen Poradce)
Firebase `onValue` listener (app.js) volá `renderPage()` při KAŽDÉ synchronizaci dat – i drobné/cizí změny → celý DOM se přegeneruje → problikávání napříč stránkami.

### Řešení
- `ui.js`: `renderPageDebounced(force)` – slučuje rychlá volání (120 ms) a navíc přeskočí render, pokud se podpis dat `_dataSig()` nezměnil. `_dataSig` = lehký otisk `S` (počty + kontrolní součty + aktuální stránka/měsíc).
- `renderPage()` na konci aktualizuje `_lastRenderSig`, aby následný debounce zbytečně nepřekresloval po přímé akci.
- `app.js`: oba Firebase listenery (vlastní data ř.442 + partnerská data ř.533) volají `renderPageDebounced()`.
- Uživatelské akce (`showPage`, `showPageByName`, `changeMonth`, `save`) renderují **přímo** `renderPage()` – okamžitá odezva zachována.

> Číslo TODO-089 bylo již obsazené (Inflace životního stylu), proto debounce dostal **TODO-093**.

---

## ✨ Pokročilé finanční metriky

### TODO-088 · Financial Freedom Ratio (FFR) — `projects.js` (Finanční obraz)
`FFR = pasivní příjem / měsíční výdaje × 100`. Pasivní příjem = příjmové kategorie s `incomeChar==='passive'`. Progress bar + fáze: závislost (<25 %) → částečná svoboda (25–75 %) → téměř svobodný (75–99 %) → finanční nezávislost (≥100 %). Pokud uživatel nemá označené pasivní kategorie, zobrazí se nápověda.

### TODO-089 · Inflace životního stylu — `projects.js` (Finanční obraz)
Porovná růst příjmů vs výdajů (první vs poslední měsíc s daty v 6M okně). Alert pokud výdaje rostou o ≥3 p.b. rychleji než příjmy; jinak pozitivní potvrzení.

### TODO-090 · Asset Allocation — `assets.js` (záložka Finanční aktiva)
SVG donut graf rozložení majetku dle typu (nemovitosti/investice/vozidla/spoření/ostatní) + peněženky, s legendou, částkami a procenty. Pod Net Worth souhrnem.

### TODO-091 · Income Diversification Score — `projects.js` (Finanční obraz)
Skóre 0–100 přes inverzní Herfindahl index (HHI) příjmových zdrojů. 1 zdroj = 0 (vysoké riziko), více vyrovnaných zdrojů = vyšší. Bary jednotlivých zdrojů + podíl největšího.

### TODO-092 · Wealth Momentum — `projects.js` (Finanční obraz)
Průměrný měsíční přírůstek jmění (avg saldo za okno s daty) + aktuální čisté jmění z `computeAssetsNetWorth`.

---

## 📋 Aktualizace dokumentace (k aplikaci do doc/)

### `todo.md` – uzavřít jako DOKONČENO S10
- TODO-088 ✅ FFR
- TODO-089 ✅ Inflace životního stylu
- TODO-090 ✅ Asset Allocation
- TODO-091 ✅ Income Diversification
- TODO-092 ✅ Wealth Momentum
- TODO-093 ✅ (nové) Centrální debounce renderPage

### `bugs.md`
- **FIX-097** · ui.js + app.js – centrální debounce renderPage (řeší problikávání napříč stránkami z Firebase listeneru).

---

## 🧪 Co otestovat
1. Nech aplikaci běžet na libovolné stránce, ať proběhne Firebase sync → **neproblikává**.
2. Přepínání stránek / měsíců → okamžitá odezva (přímý render).
3. Finanční obraz → nové sekce: FFR (s progress barem), Inflace životního stylu, Diverzifikace příjmů (s bary), Wealth Momentum.
4. Označ příjmovou kategorii jako „🌱 Pasivní" → FFR se začne počítat.
5. Finanční aktiva → donut „Rozložení majetku" s legendou.
6. Přidej více příjmových kategorií s daty → Diverzifikace stoupne; jeden zdroj → skóre 0 + varování.

---

## 📦 Nasazení (Milan později) – KOMPLETNÍ sada Session 10
```bash
# Přejmenovat na originál a nahrát do dev:
#   ui_v3.js       → js/ui.js
#   app_v3.js      → js/app.js
#   projects_v3.js → js/projects.js
#   assets_v3.js   → js/assets.js
#   admin_v3.js    → js/admin.js
#   premium_v2.js  → js/premium.js     (z části 2)
#   advisor_v2.js  → js/advisor.js     (z části 3)
#   styles_v2.css  → css/styles.css    (z části 3)
#   index_v3.html  → index.html        (NEJNOVĚJŠÍ – obsahuje všechny hashe)
firebase deploy --only hosting
# Ctrl+Shift+R
```

### Finální cache-busting hashe (v7.09)
| Soubor | Hash | Část |
|---|---|---|
| `ui.js` | `8a3294a431f94adb` | v7.06+v7.09 |
| `app.js` | `bae4a6e11d37a7dc` | v7.09 |
| `projects.js` | `342845d36d725b6e` | v7.07+v7.08+v7.09 |
| `assets.js` | `5668034a91883e36` | v7.09 |
| `premium.js` | `d024caa669e780f0` | v7.07 |
| `advisor.js` | `8ad7cb4c4f2e5d89` | v7.08 |
| `styles.css` | `af64fa9771b32401` | v7.08 |

*Session 10 část 4 · v7.09 · Claude Opus · 2026-05-29*
