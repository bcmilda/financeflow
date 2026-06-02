# FinanceFlow – Summary Session 10 (v7.06 → v7.31)
**Datum:** 2026-05-29 – 2026-06-01
**Rozsah:** 26 verzí (v7.06–v7.31), Finanční radar + Komunita/COICOP + Predikce

---

## 🔧 Opravené bugy (FIX)

### Kritické
| Verze | Soubor | Popis |
|---|---|---|
| v7.07 | premium.js | FIX-090: computeFinancialScore mutoval scoreState → skóre skákalo. Deterministický výpočet z 6 měsíců |
| v7.07 | projects.js | FIX-091: detektor úspor zamrzal prohlížeč (generateSchedule 7200 období). Strop 50 let |
| v7.24 | projects.js | FIX-107: ReferenceError eomLeft before initialization (TDZ). Predikční blok přesunut PŘED alerty |
| v7.26 | projects.js | FIX-108: SVG grafy radaru se roztáhly ~4× (viewBox 320 + width:100%). max-width + preserveAspectRatio |
| v7.27 | projects.js | FIX-109: grafy radaru braly today místo S.curMonth → neměnily se při přepnutí měsíce |
| v7.30 | projects.js | FIX-111: zelená čára „příjem" brala vyšší z {reálný, průměr} → ukazovala 68k místo 28k. Nyní reálný příjem |

### Střední
| Verze | Soubor | Popis |
|---|---|---|
| v7.12 | index.html | FIX-097: kalkulačka v Přidat transakci (JS template v HTML → text). Statická tlačítka |
| v7.12 | projects.js+advisor.js | FIX-098: skóre nesedělo (13/25/56). Sjednoceno na computeHealthScores().overall |
| v7.13 | styles.css | FIX-100: .tx-filt-btn selektor slitý → taby nečitelné |
| v7.15 | admin.js | FIX-102: „Já vs ČSÚ" ignorovala OECD (avg_domacnost natvrdo). Přepínač + calcOECD |
| v7.16 | admin.js | FIX-103: komunita blikala při přepínání. Cache _komunitaLoaded |
| v7.19 | admin.js | FIX-105: odkaz Sdílení vedl do „O aplikaci" místo stránky sdileni |
| v7.20 | admin.js | FIX-106: karty ČR nezarovnané. Sjednoceno (text na střed, Syne) |
| v7.29 | projects.js | FIX-110: duplicitní banner volných peněz (2× stejné číslo) |

---

## ✨ Nové funkce (NEW)

### Finanční obraz (v7.08–v7.09)
- v7.08 FFR (Financial Freedom Ratio), inflace životního stylu, Income Diversification (HHI), Wealth Momentum
- v7.09 Asset Allocation donut (assets.js)

### Bublinový graf (v7.06)
- Relativní souřadnice + dynamický bounding box (konec přetékání), tooltipy (bTip), sdílené prvky 📎, Treemap záložka odebrána (duplikát)

### Komunita / COICOP (v7.13–v7.20)
- v7.15–v7.17 13 oddílů CZ-COICOP 2024, 3úrovňový rozklikávací strom (oddíl→skupina→třída)
- Přepínač osoba/domácnost, OECD přepočet (calcOECD)
- v7.19 rodinný souhrn – sčítání výdajů partnerů v režimu Domácnost
- v7.20 sjednocení karet ČR

### Sdílení & Partneři (v7.19)
- Ověřeno funkční (read-only model), odkaz opraven na stránku sdileni

### UI / Nastavení (v7.18, v7.21)
- v7.18 tlačítko Uložit pod složení domácnosti
- v7.21 stavové tlačítko Uložit (zelené jen při změně, „Máte uloženo")

### Finanční radar – velká přestavba (v7.22–v7.31)
- v7.22 metriky max 2/mobil, cashflow 3 měsíce + modrá saldo linie, sekce „Kam směřuju" + predikční alerty
- v7.23 tlačítko „Plná predikce roku →"
- v7.24 kvartální alert „Qx směřuje k…", popisky 3 sloupců predikce
- v7.25 denní graf radaru (zelená příjem, bílá kumul, žlutá, modré sloupce, tečka příjmu)
- v7.26 kumulativní vs medián legenda + vysvětlení
- v7.27 4 sloupce „Kam směřuju" (Příjem/Plánovaný/Budoucí/Cashflow), 30/60/90 platby
- v7.28 volné peníze („můžeš ještě utratit"), denní graf i pro minulé měsíce
- v7.30 zelená = reálný příjem, sloupce ve správném měřítku, trend po týdnech od výplaty (Kč/den) + tabulka
- v7.31 platby po měsících (ne kumulativní okna), ideální tempo (žlutá), Spending Pace záložka

### Predikce (v7.24–v7.31, transactions.js)
- v7.24–v7.25 3 kumulativní křivky (YTD/Předpoklad/Odhad) + záložka Sezonalita (reál vs model)
- v7.25 sezonalita osa Y po 5 %, červený model
- v7.26 legenda zesvětlena, tlačítko „Skrýt prázdné podkategorie"
- v7.31 NOVÁ záložka Spending Pace (aktuální vs historický průměr ke dni, verdikt rychleji/pomaleji)

### Účtenky (v7.27)
- Banner „⚠️ Datum v budoucnosti – zkontroluj" (receipts.js, rpCheckFutureDate)

---

## 📐 ADR (nové)
- ADR-049 Komunitní srovnání – báze na osobu + OECD ekvivalent
- ADR-050 CZ-COICOP 2024 = 13 oddílů (ověřeno)
- ADR-051 Sdílení read-only, rovnocenní členové
- ADR-052 Lineární trend + IQR outliery (návrh predikce ML)
- ADR-053 Stripe Payment Links + webhook (blokováno IČO)
- ADR-054 Hlídání slev – AI monitoring letáků (fázovaný návrh)

---

## 🔢 Klíčové vzorce
- **calcOECD** = 1,0 + (dospělí−1)×0,5 + děti14+×0,5 + děti0–13×0,3
- **ČSÚ ref**: osoba → avg_osoba; domácnost → avg_osoba × calcOECD
- **eomLeft** = příjem − výdaje − známé platby do konce měsíce
- **predEnd** = dosud utraceno + (denní tempo × zbývající dny)
- **Spending Pace** = aktuální kumul / historický průměr ke stejnému dni
- **idealPace[d]** = příjem × (d / dny v měsíci)

---

## 📊 Stav
- **Verze:** v7.31 (14 souborů, všechny hashe konzistentní)
- **Audit:** 18 bodů přeznačeno na ✅ (byly hotové, neoznačené), 10 skutečně otevřených, viz AUDIT_todo_bugs_s10.md
- **Gemini review:** 3 připomínky ověřeny jako neplatné (starší stažené verze)

## 🔜 Pro Session 11
- Stripe – čeká na OSVČ (ADR-053), zvážit Ko-fi/QR donate
- Premium zámky – seznam Premium-only funkcí
- Lineární trend predikce (ADR-052)
- Hlídání slev Fáze 1 (vlastní data) (ADR-054)
- TODO-094/095 ČSÚ data + mapování COICOP
- TODO-062 Treemap do 12M reportu

---
*Summary Session 10 · v7.06 → v7.31 · 26 verzí · Claude Opus 4.8*
