# Patch – Session 10 KOMPLETNÍ (2026-05-29 → 2026-06-01)

> **Verze:** v7.06 → v7.31 (Session 9 skončila v7.05)
> **Procedura:** Mandatory 4-krokový version bump dodržen u všech 26 verzí. Finální stav v7.31 – všech 14 `?v=` hashů konzistentních.
> **Tento dokument = kompletní patch + REVIZE stavu TODO.md / BUGS.md** (doplnění chybějících ✅, cross-reference, opravy stavů).

---

## ČÁST A – REVIZE STAVU (co bylo hotové, ale neoznačené)

> **Kompletní audit bod-po-bodu proti kódu je v samostatném `AUDIT_todo_bugs_s10.md`.**
> Shrnutí rozhodnutí Milana (2026-06-01): TODO-083 = nikdy neimplementováno (jen návrh, opravit chybný stav); OPEN-005 box plot = HOTOVO (ve Všechny roky); TODO-062 Treemap = částečně (dashboard ano, 12M report ne).


Prošel jsem TODO.md (853 řádků) a BUGS.md (841 řádků) a porovnal s reálným kódem + VERZE_LOG. Níže body, které je třeba **přeznačit jako hotové** nebo doplnit.

### TODO.md – přeznačit na ✅ DOKONČENO (ověřeno v kódu)

| ID | Co | Důkaz v kódu | Verze |
|---|---|---|---|
| TODO-088 | Financial Freedom Ratio (FFR) | `computeFFR()` projects.js ř.1630 | v7.08 |
| TODO-089 | Inflace životního stylu | `computeLifestyleInflation()` projects.js ř.1648 | v7.08 |
| TODO-090 | Asset Allocation vizualizace | assets.js ř.54 (donut SVG) | v7.09 |
| TODO-091 | Income Diversification Score | inverzní HHI, projects.js ř.1660 | v7.08 |
| TODO-092 | Wealth Momentum | projects.js ř.1683 | v7.08 |
| TODO-067 | Měsíční report – přepočet dle periody | `getActualRange()` projects.js ř.525 | v7.10 |
| TODO-007 | Sentry monitoring (bylo „OVĚŘIT") | dynamický load + setUser, globalErrorBanner aktivní | ověřeno S10 |

### TODO.md – aktualizovat stav (částečně → konkrétní)

| ID | Nový stav |
|---|---|
| TODO-080 | Drill-down podkategorie: stats.js + projects.js hotovo; bubble drill-down level 2 stále otevřené |
| TODO-011 / OPEN-006 | Predikce minulé měsíce: ✅ ověřeno – 3 kumulativní křivky (YTD/Předpoklad/Odhad) v7.24–v7.25 |

### TODO.md – NOVÉ úkoly Session 10 (přidat)

```markdown
### TODO-094 · ČSÚ data na úrovni skupin a tříd (Session 10, 🟡 P2) – otevřené, čeká na data
### TODO-095 · Mapování vlastních kategorií na COICOP 1:1 (Session 10, 🟡 P2) – ~11 % nezařazeno
### TODO-096 · Plný rodinný souhrn – zápis do sdílené DB (Session 10, 💡) – zatím read-only
### TODO-097 · Stripe Payment Links + Premium zámky (Session 10, 🔴 P1) – návod hotov, čeká na URL od Milana (viz STRIPE_SETUP_navod.md)
### TODO-098 · Lineární trend predikce + IQR outliery (Session 10, 🟡 P2) – ADR-052, k implementaci
### TODO-099 · Spending Pace – druhý měsíc dat pro plný efekt (Session 10, 🟢 P3) – graf hotov v7.31, čeká na data
```

### BUGS.md – přeznačit na ✅ VYŘEŠENO

| ID | Co | Důkaz | Verze |
|---|---|---|---|
| OPEN-031 | Bubble chart přetékání | relativní souřadnice + bbox, ui.js ř.363 | v7.06 |
| OPEN-029 | Report přepočet dle periody | `getActualRange()` | v7.10 |
| OPEN-006 | Predikce modré hodnoty minulé měsíce | 3 kumulativní křivky | v7.24 |

### BUGS.md – stále OTEVŘENÉ (potvrzeno, nehotovo)

| ID | Co | Pozn. |
|---|---|---|
| OPEN-005 | Box plot ve špatné záložce | stále v „Roční", přesun do „Všechny roky" neproběhl |
| OPEN-033 | Stripe Payment Links chybí | rozpracováno – návod hotov (TODO-097), čeká na URL |
| OPEN-032 | Sentry JAVASCRIPT-2 ongoing | monitoring běží, root cause neuzavřen |
| OPEN-034 | Komprese fotek netestováno | netestováno |
| TODO-075 | AI Rate Limiting | ADR-041 hotový, implementace pending |

---

## ČÁST B – CHANGELOG v7.06–v7.31 (co se reálně udělalo)

### Skóre & výpočty
- v7.07 FIX-090 deterministický `computeFinancialScore` (žádná mutace scoreState)
- v7.07 FIX-091 anti-freeze detektor úspor (strop 50 let místo 7200 období)
- v7.12 FIX-098 skóre sjednoceno na `computeHealthScores().overall`

### Finanční obraz (TODO-088–092)
- v7.08 FFR, inflace životního stylu, diverzifikace, momentum
- v7.09 Asset Allocation donut

### Bublinový graf (OPEN-031)
- v7.06 relativní souřadnice + bounding box, tooltipy, sdílené 📎, Treemap záložka odebrána

### Komunita / COICOP (ADR-049/050/051)
- v7.15–v7.17 13 oddílů CZ-COICOP 2024, 3úrovňový strom, OECD přepočet osoba/domácnost
- v7.19 rodinný souhrn (sčítání partnerů v režimu Domácnost) + odkaz na Sdílení
- v7.20 sjednocení karet ČR

### Sdílení & Partneři
- v7.19 ověřeno funkční (read-only model), odkaz opraven na stránku sdileni (FIX-105)

### UI / nastavení
- v7.18 tlačítko Uložit pod složení domácnosti
- v7.21 stavové tlačítko Uložit (zelené jen při změně)

### Finanční radar – velká přestavba (v7.22–v7.31)
- v7.22 metriky max 2/mobil, cashflow 3 měsíce + modrá saldo linie, sekce „Kam směřuju" + predikční alerty
- v7.23 tlačítko „Plná predikce roku"
- v7.24 FIX eomLeft TDZ, kvartální alert, popisky 3 sloupců predikce
- v7.25 denní graf radaru, sezonalita graf přesun
- v7.26 SVG max-width fix (4× roztažení), kumul vs medián legenda
- v7.27 grafy reagují na přepnutí měsíce (S.curMonth), 4 sloupce Kam směřuju, 30/60/90 platby, receipt future-date banner
- v7.28 volné peníze, žlutý trend, denní graf i pro minulé měsíce
- v7.29 odstranění duplicitního banneru, oprava sloupců/barev
- v7.30 zelená = reálný příjem (ne průměr), sloupce ve správném měřítku, trend po týdnech od výplaty
- v7.31 platby po měsících, ideální tempo, Spending Pace záložka

### Predikce (transactions.js)
- v7.24–v7.25 3 kumulativní křivky + záložka Sezonalita
- v7.26 legenda zesvětlena, tlačítko skrýt prázdné podkategorie
- v7.31 Spending Pace záložka

### Účtenky
- v7.27 banner „Datum v budoucnosti – zkontroluj" (receipts.js)

---

## ČÁST C – ADR (nové v Session 10)

- **ADR-049** Komunitní srovnání – báze na osobu + OECD ekvivalent ✅
- **ADR-050** CZ-COICOP 2024 = 13 oddílů ✅ ověřeno
- **ADR-051** Sdílení read-only, rovnocenní členové ✅
- **ADR-052** Lineární trend + IQR outliery (návrh, k implementaci) → samostatný soubor ADR-052-prediction-ml.md

---

## ČÁST D – FIX (Session 10, FIX-090 až FIX-106)

FIX-090 deterministické skóre · FIX-091 anti-freeze · FIX-092–094 Poradce (12 měs, AI na tlačítko, anti-flicker) · FIX-095 health ring barvy · FIX-096 predikce vs skutečnost canvas ID · FIX-097 kalkulačka statická tlačítka · FIX-098 skóre sjednoceno · FIX-099 low confidence Firebase · FIX-100 .tx-filt-btn taby · FIX-101 ČSÚ tabulka display · FIX-102 OECD přepočet · FIX-103 komunita blikání · FIX-104 karty ČR pozice · FIX-105 odkaz sdílení · FIX-106 karty ČR zarovnání

**Nové FIX v7.22–v7.31 (doplnit do bugs.md):**
- FIX-107 v7.24 eomLeft TDZ (predikce před alerty)
- FIX-108 v7.26 SVG grafy 4× roztažení (max-width + preserveAspectRatio)
- FIX-109 v7.27 grafy radaru nereagovaly na přepnutí měsíce (today → S.curMonth)
- FIX-110 v7.29 duplicitní banner volných peněz
- FIX-111 v7.30 zelená čára brala průměr místo reálného příjmu

---

## ČÁST E – Externí review (Gemini) – ověřeno NEPLATNÉ

3 připomínky z analýzy starších stažených souborů (`admin-2.js`, `projects-1.js`, `index-3.html`):
1. `updateItemStats` „padá do console.warn" → **NEPLATNÉ**, plně implementováno (Firebase PUT, receipts.js ř.2023)
2. Správa členství „jen kostra" → **NEPLATNÉ**, `adminSetPremium/adminExtendTrial/adminRevokePremium` funkční (admin.js ř.1554+)
3. globalErrorBanner „neprovázán" → **NEPLATNÉ**, napojen na error + unhandledrejection (app.js ř.42+)

Gemini analyzoval starší verze; funkce dokončeny v S8–S9.

---

## ČÁST E2 – AKTUALIZACE OSTATNÍCH .md SOUBORŮ (Session 10)

> Patch musí pokrýt VŠECHNY dotčené dokumenty, ne jen todo/bugs/decisions/formulas.
> Níže delta pro každý .md soubor, kterého se Session 10 dotkla.

### `context.md` – aktualizovat „aktuální stav"
- Verze v7.05 → **v7.31**.
- Doplnit moduly a oblasti Session 8–10: Finanční radar (predikce, denní graf, Kam směřuju, 30/60/90 platby, Spending Pace), Komunita s 13 oddíly CZ-COICOP 2024 + OECD přepočet, sdílení partnerů (rodinný souhrn), stavové UI nastavení.
- Stav skóre: sjednoceno na `computeHealthScores().overall`.

### `architecture.md` – doplnit S8–S10 (0 zmínek o radaru/FFR → kritické)
- **projects.js** – nové funkce: `renderRadar`, `computeFFR`, `computeLifestyleInflation`, `getActualRange`, `renderRadarDailyChart`/`drawRadarDaily`, `renderPaydayWeeksTable`, predikční blok (eomLeft, pred3Total, futureMonths, kvartál).
- **transactions.js** – `predictCat`-vázané grafy: `drawPredTripleLine` (3 křivky), `renderSeasChart`/`drawSeasLines`, `renderPaceChart`/`drawPaceChart` (Spending Pace), `switchPredGraph`, `togglePredEmptySubs`.
- **helpers.js** – `COICOP_GROUPS_DEF` (13 oddílů + groups[]), `COICOP_CLASSES`, `calcOECD`, `predictCat`, `getHistAvg`, `computeYearForecast`.
- **admin.js** – `renderKomunita` (přepínač osoba/domácnost, 3úrovňový strom, rodinný souhrn), `goToHouseholdSettings`, `goToSharing`, `adminSetPremium/adminExtendTrial/adminRevokePremium`.
- **assets.js** – Asset Allocation donut.
- **receipts.js** – `updateItemStats` (Firebase), `rpCheckFutureDate` (banner budoucí datum), `addReceiptAsTx` (split dle kategorií).
- **app.js** – globalErrorBanner handler, debounce renderPage, `loadPartners`, categoryMappings systém.
- **Datový tok:** grafy/výpočty vázány na `S.curMonth`/`S.curYear` (ne `today`) – reaktivita na přepnutí měsíce.

### `features.md` – doplnit Session 8–10 funkce
- Finanční radar: včasné varování + predikce (konec měsíce, 3 měsíce, kvartál), denní graf s ideálním tempem, volné peníze, 30/60/90 platby po měsících.
- Predikce: 3 kumulativní křivky (YTD/Předpoklad/Odhad), Sezonalita reál vs model, Spending Pace.
- Komunita: 13 oddílů CZ-COICOP 2024, osoba/domácnost, OECD, rodinný souhrn.
- Finanční obraz: FFR, inflace životního stylu, diverzifikace, Wealth Momentum, Asset Allocation.
- Sdílení & Partneři: read-only model.
- Účtenky: split dle kategorií, varování budoucí datum, itemStats.

### `GLOSSARY.md` – přidat nové termíny
- **Spending Pace** – tempo utrácení: aktuální kumulativní výdaje vs historický průměr ke stejnému dni.
- **Ideální tempo (idealPace)** – rovnoměrné rozložení příjmu přes měsíc (referenční čára v denním grafu).
- **eomLeft** – odhad zůstatku na konci měsíce (příjem − výdaje − známé platby).
- **OECD ekvivalent** – přepočet velikosti domácnosti (1. dosp. 1,0; další 0,5; dítě 14+ 0,5; dítě 0–13 0,3).
- **Rodinný souhrn** – sečtené výdaje partnerů v režimu Domácnost.
- **Payday weeks** – výdaje po týdnech od výplaty (Kč/den).
- **Volné peníze** – kolik lze ještě utratit do konce měsíce po rezervě na závazky.

### `explanations.md` – doplnit
- Proč ČSÚ „na osobu" + OECD přepočet (ADR-049): dvě různé otázky, ne rozpor.
- Proč 13 oddílů CZ-COICOP 2024 (ADR-050).
- Proč predikce = klouzavý průměr × pevná sezóna (ne ML); plán lineárního trendu (ADR-052).
- Proč sdílení read-only (ADR-051).
- Proč zelená čára v denním grafu = reálný příjem, ne průměr (FIX-111).

### `CLAUDE.md` – aktualizovat stav
- Aktuální verze v7.31, Session 10 dokončena.
- Počet modulů beze změny (25), žádný nový JS soubor v S10 (jen úpravy stávajících).
- Doplnit odkaz na `CLAUDE_SKILLS.md` (text/barvy, grafy, problikávání).

### `SECURITY.md` – doplnit
- Sdílení partnerů: read-only model, Firebase rules `users/$uid/data .read` povoluje partnerům z `partners` uzlu (ADR-051). Ověřit nasazení rules v konzoli.
- Stripe (TODO-097): webhook secret + sk_key pouze ve Worker secrets, NIKDY v klientu. Payment Links bez API klíče v appce.

### `UPDATE_RULES.md` – beze změny
- Pravidla platí; pouze připomenout: po Session 10 doplnit ✅ u 18 bodů (viz AUDIT_todo_bugs_s10.md).

### `VERSIONING.md` – beze změny
- Procedura dodržena (26 verzí v7.06–v7.31). Pravidlo „grafy/výpočty na S.curMonth ne today" doplnit do checklistu.

### `stripe-setup-guide.md` → nahrazeno `STRIPE_SETUP_navod.md`
- Aktualizovaný návod (Payment Links, webhook, Firebase zápis). **Pozn. Session 11:** Stripe blokován – Milan nemá IČO/OSVČ; zvážit Ko-fi/QR pro donate.

### Nové ADR (decisions.md) – ADR-049, 050, 051, 052 (viz ČÁST C výše)


- `ADR-052-prediction-ml.md` – lineární trend + IQR
- `STRIPE_SETUP_navod.md` – kompletní průvodce aktivací plateb
- `REPORT_CSU_vs_moje.md` – ČSÚ analýza
- `FinanceFlow_scoring_v3.xlsx` – 6 listů

---

## ČÁST G – Otevřené pro Session 11
1. **Stripe aktivace** (TODO-097) – Milan dodá Payment Links URL → webhook do worker.js → aktivace zámků
2. **Premium zámky** – seznam Premium-only funkcí (vše kromě analýzy účtenek)
3. **Lineární trend predikce** (ADR-052/TODO-098)
4. **OPEN-005** box plot přesun do „Všechny roky"
5. **TODO-094/095** ČSÚ data skupin/tříd + mapování kategorií
6. **TODO-096** plný rodinný souhrn (sdílená DB)

---
*Session 10 kompletní patch · v7.06 → v7.31 · 26 verzí · Autor: Claude Opus 4.8*
