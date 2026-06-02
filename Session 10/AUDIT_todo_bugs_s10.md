# Session 10 – KOMPLETNÍ AUDIT TODO.md / BUGS.md (ověřeno v kódu)

> Každý nedokončený/neoznačený bod prošel kontrolou příslušného JS souboru.
> Legenda: ✅ HOTOVO · 🟡 ČÁSTEČNĚ · ❌ NEHOTOVO · ❓ NEJASNÉ (čeká na rozhodnutí Milana)

---

## A. Body označené jako „částečně/otevřené", ale v KÓDU HOTOVÉ → přeznačit ✅

| ID | TODO.md stav | Realita v kódu | Důkaz |
|---|---|---|---|
| TODO-013 | neoznačeno | ✅ HOTOVO | `detectDuplicates`, `jaroWinkler`, `dupMerge`, `renderDupBanner` (duplicates.js) |
| TODO-014 | neoznačeno | ✅ HOTOVO (S9) | `saveCategoryMapping`/`lookupCategoryMapping` (app.js, receipts.js) |
| TODO-039 | neoznačeno P2 | ✅ HOTOVO | `addReceiptAsTx` rozděluje položky dle kategorií do více transakcí (receipts.js ř.2522) |
| TODO-070 | 🔵 P4 | ✅ HOTOVO (S10) | `bTip`/`bTipHide` tooltip na bublinách (ui.js ř.459) |
| TODO-080 | „částečně" | ✅ HOTOVO | drill-down L1→L2→L3 `bDrillL1/L2/L3` (ui.js ř.534+) – bubble drill-down level 2 existuje |
| TODO-088 | neoznačeno | ✅ HOTOVO (v7.08) | `computeFFR()` projects.js ř.1630 |
| TODO-089 | neoznačeno | ✅ HOTOVO (v7.08) | `computeLifestyleInflation()` projects.js ř.1648 |
| TODO-090 | neoznačeno | ✅ HOTOVO (v7.09) | Asset Allocation donut assets.js ř.54 |
| TODO-091 | neoznačeno | ✅ HOTOVO (v7.08) | Income Diversification (HHI) projects.js ř.1660 |
| TODO-092 | neoznačeno | ✅ HOTOVO (v7.08) | Wealth Momentum projects.js ř.1683 |
| TODO-067 | 🔴 P1 | ✅ HOTOVO (v7.10) | `getActualRange()` přepočet dle periody projects.js ř.525 |
| TODO-007 | „OVĚŘIT" | ✅ HOTOVO | Sentry dynamický load + globalErrorBanner aktivní |
| OPEN-031 | otevřené | ✅ HOTOVO (v7.06) | relativní souřadnice + bbox ui.js ř.363 |
| OPEN-029 | otevřené | ✅ HOTOVO (v7.10) | `getActualRange()` |
| OPEN-006 | „ověřit" | ✅ HOTOVO (v7.24) | 3 kumulativní křivky predikce |
| TODO-068 | 🟡 P2 | ✅ fakticky HOTOVO | vyřešeno přepisem bublin (OPEN-031/TODO-076) |
| TODO-028 | otevřené | 🟡 ČÁSTEČNĚ | `applyLanguage()` + `t()` i18n systém existuje (premium.js ř.560); nutno ověřit pokrytí všech textů |

---

## B. Body skutečně NEHOTOVÉ (ověřeno – v kódu nejsou) ❌

| ID | Co | Zjištění |
|---|---|---|
| TODO-009 / OPEN-005 | Box plot přesun | box plot je v Roční (`boxplotChart`) I ve Všechny roky (`vsechnyBoxCanvas`) → viz ❓ níže |
| TODO-010 | Landing page | žádný soubor/kód |
| TODO-015 | Notifikace opakovaných plateb | žádné Notification/reminder napojení na šablony |
| TODO-019 | Service Worker (plný offline) | žádný SW soubor ani registrace |
| TODO-020 | Playwright testy | žádné testy |
| TODO-030 | Web Push notifikace | žádný PushManager |
| TODO-061 | Chord diagram | žádný výskyt v kódu |
| TODO-062 | Treemap v 12M reportu | Treemap existuje na DASHBOARDU (`renderDashTreemap`), ale ne v 12M reportu |
| TODO-075 | AI Rate Limiting | ADR-041 hotový, implementace pending (Worker) |
| TODO-029 | Podpora více měn | jen výběr výchozí měny, žádný přepočet kurzem (kryje se s plánem ČNB converteru) |

---

## C. ROZHODNUTÍ MILANA (2026-06-01)

1. **TODO-083 (slevy z letáků / kupi.cz):** ❌ NEHOTOVO. Nikdy nebylo implementováno – byl to pouze návrh. TODO.md stav „Naimplementováno v S9" je CHYBNÝ → opravit na: „💡 Návrh, neimplementováno". Zůstává otevřené.

2. **TODO-009 / OPEN-005 (box plot):** ✅ HOTOVO. Box plot je ve Všechny roky (`vsechnyBoxCanvas`) – splňuje záměr. Uzavřít.

3. **TODO-062 (Treemap v 12M reportu):** 🟡 ČÁSTEČNĚ. Treemap funguje na dashboardu, v 12M reportu zatím ne. Ponechat částečně hotové.

---

## D. Statistika (po rozhodnutí Milana)

- **Přeznačit na ✅:** 18 bodů (sekce A + TODO-009/OPEN-005)
- **Skutečně otevřené ❌:** 10 bodů (sekce B) + TODO-083 (chybný stav opravit na „návrh, neimplementováno")
- **Částečně 🟡:** TODO-028 (lokalizace), TODO-029 (měny – jen výběr), TODO-062 (Treemap), TODO-077 (krátkodobý obraz)

---
*Audit · Session 10 · 2026-06-01 · ověřeno proti reálnému kódu v /mnt/user-data/outputs*
