# Patch – Session 10 (2026-05-29 – 2026-05-31)

> **Cíl session:** Stabilizace skóre a Měsíčního reportu (deterministický výpočet, agregace přes období), oprava bublinového grafu (přetékání, satelity, tooltipy), Finanční obraz (FFR, inflace, diverzifikace, momentum, asset allocation), kompletní přepracování Komunitního přehledu na oficiální CZ-COICOP 2024 (13 oddílů, 3 úrovně stromu, OECD přepočet osoba/domácnost, rodinný souhrn přes sdílení), stavové UI v Nastavení a řada bugfixů blikání/čitelnosti.
>
> **Verze:** v7.06 → v7.21 (navazuje na Session 9, která skončila v7.05)
>
> **Konflikty:** žádné. Patch-only – pouze delta změny, nemazat historická data.
>
> **Procedura:** Mandatory 4-krokový version bump dodržen u všech verzí (title, sidebar, „O aplikaci", VERZE_LOG + cache-busting hash). Finální stav v7.21 ověřen – všech 14 `?v=` hashů konzistentních.

---

## 🎯 Hlavní témata Session 10

1. **Skóre & výpočty** – deterministický `computeFinancialScore`, agregace `getActualRange`, sjednocení 3 systémů skóre na `computeHealthScores().overall`.
2. **Bublinový graf** – přepis na relativní souřadnice + dynamický bounding box (konec přetékání), tooltipy, sdílené prvky se sponkou 📎, zvětšené satelity v Clusteru.
3. **Finanční obraz** – FFR, detektor inflace životního stylu, diverzifikace příjmů, Wealth Momentum, Asset Allocation donut.
4. **Komunitní přehled / COICOP** – oficiální 13 oddílů CZ-COICOP 2024, 3úrovňový rozklikávací strom (oddíl → skupina → třída), přepínač osoba/domácnost s OECD přepočtem, rodinný souhrn přes sdílení.
5. **Sdílení & Partneři** – ověřeno funkční (read-only model), propojeno s Komunitním přehledem (sčítání výdajů rodiny).
6. **UI/UX & čitelnost** – kontrast textu, stavové tlačítko Uložit, anti-flicker guardy, responzivní karty.

---

## 📄 `todo.md` – aktualizace

### Přidat do sekce `## ✅ DOKONČENO` novou podsekci:

```markdown
### V Session 10 (v7.06 → v7.21)
- ✅ TODO-076 / OPEN-031 · Bublinový graf nepřetéká – bCluster() relativní souřadnice + dynamický bounding box (ui.js)
- ✅ TODO-088 · Financial Freedom Ratio (FFR) – pasivní příjem / výdaje (projects.js)
- ✅ TODO-089 · Detektor inflace životního stylu – růst výdajů vs příjmů (projects.js)
- ✅ TODO-090 · Asset Allocation donut – rozložení majetku dle typu + peněženky (assets.js)
- ✅ TODO-091 · Income Diversification Score – inverzní Herfindahl index (projects.js)
- ✅ TODO-092 · Wealth Momentum – průměrný měsíční přírůstek jmění (projects.js)
- ✅ TODO-093 · Centrální debounce renderPage – slučování Firebase onValue volání (ui.js, app.js)
- ✅ COICOP 13 oddílů + 3úrovňový strom (oddíl → skupina → třída), OECD přepočet, rodinný souhrn (admin.js, helpers.js, receipts.js)
- ✅ Stavové tlačítko Uložit nastavení (settings.js, premium.js)
```

### Aktualizovat stav těchto TODO:

```markdown
### TODO-061 · Chord diagram → Statistiky
- **Stav (S10):** Neřešeno, zůstává otevřené.

### TODO-062 · Treemap → 12M tab v reportu
- **Stav (S10):** Záložka D (Treemap) v bublinovém grafu byla naopak ODEBRÁNA jako duplikát samostatné Treemap karty (v7.06). Treemap do 12M reportu zůstává otevřené.
```

### Přidat nové TODO (za TODO-093):

```markdown
### TODO-094 · ČSÚ data na úrovni skupin a tříd **(Session 10, 🟡 P2)**
- **Popis:** Doplnit reálné ČSÚ částky pro 2. úroveň (40 skupin) a 3. úroveň (třídy) COICOP. Aktuálně v rozklikávací tabulce zobrazeno „—".
- **Bloker:** ČSÚ tyto detaily publikuje jen v placených/tabulkových přílohách (nepodařilo se extrahovat). avg_osoba na úrovni 13 oddílů je kalibrovaný odhad na ověřené kotvy.
- **Stav:** Otevřené. Struktura (COICOP_CLASSES) připravena, čeká na data.

### TODO-095 · Mapování vlastních kategorií na COICOP 1:1 **(Session 10, 🟡 P2)**
- **Popis:** Každá uživatelská kategorie má mít coicopId (1–13), aby se výdaje sčítaly do stejných řádků jako ČSÚ. Částečně existuje, dořešit pokrytí (cca 11 % výdajů zatím „Nezařazeno").
- **Stav:** Otevřené.

### TODO-096 · Plný rodinný souhrn – zápis do sdílené DB **(Session 10, 💡 nápad)**
- **Popis:** Aktuální model je read-only (partner vidí, ale píše do svého; Komunitní přehled sčítá výdaje členů). Plný společný rozpočet (oba píší do jedné DB) by vyžadoval households/{id} strukturu + úpravu security rules.
- **Stav:** Otevřené, rozhodnuto zatím ponechat read-only model (viz ADR-049).
```

---

## 📄 `decisions.md` – nové ADR (pokračovat od ADR-048)

```markdown
### ADR-049 · Komunitní srovnání – báze „na osobu" + OECD ekvivalent **(Session 10)** ✅ IMPLEMENTOVÁNO v7.15–v7.17
- **Kontext:** Aplikace měla dvě nesladěné sady ČSÚ čísel (COICOP_GROUPS_DEF v helpers.js/receipts.js vs CSU konstanta v admin.js), lišily se průměrně o ~38 %.
- **Rozhodnutí:**
  - Jediný zdroj pravdy = `COICOP_GROUPS_DEF` (13 oddílů). CSU konstanta nadále jen pro karty Příjem/Výdaje/Úspory ČR (agregáty), ne pro rozpad kategorií.
  - Báze = `avg_osoba` (Kč/osoba/měsíc) – tak ČSÚ primárně publikuje (Statistika rodinných účtů, „průměry na osobu za rok").
  - Srovnání domácnosti = `avg_osoba × OECD_ekvivalent(domácnost)` přes `calcOECD()` (1. dospělý 1,0; další dospělý 0,5; dítě 14+ 0,5; dítě 0–13 0,3).
  - Rozlišení dvou pojmů „domácnost": „průměrná ČR domácnost" = ×2,4 (statistická velikost), „tvoje domácnost" = ×OECD ekvivalent z Nastavení. Není rozpor – dvě různé otázky.
- **Důvod:** Dřívější `csuAmt = avg_domacnost` natvrdo → změna počtu osob v Nastavení neměla efekt (bug). OECD ekvivalent je férový přepočet pro konkrétní domácnost.
- **🔗 Cross-reference:** REPORT_CSU_vs_moje.md, formulas.md (OECD), ADR-043.

### ADR-050 · CZ-COICOP 2024 – 13 oddílů, ne 12 **(Session 10)** ✅ OVĚŘENO
- **Kontext:** Pochybnost, zda má klasifikace 12 nebo 13 oddílů (uživatel měl 13, dřívější domněnka byla „o 1 navíc").
- **Zjištění (czso.gov.cz):** Revidovaná CZ-COICOP platná od 1.1.2024 má 15 základních oddílů; pro spotřební výdaje domácností se používá **prvních 13**. Oddíl 13 (Osobní péče, sociální ochrana a různé) je nová oficiální divize.
- **Rozhodnutí:** 13 oddílů je správně. Aktualizovány oficiální názvy + struktura groups[] (40 skupin 2. úrovně) + COICOP_CLASSES (3. úroveň, reprezentativní třídy).
- **🔗 Cross-reference:** CZ_COICOP_2018_prehled.md, helpers.js, receipts.js.

### ADR-051 · Sdílení mezi partnery – read-only, rovnocenní členové **(Session 10)** ✅ POTVRZENO (systém už existoval)
- **Kontext:** Požadavek na „sdílenou databázi" pro rodinné finance.
- **Zjištění:** Systém sdílení už byl plně implementován (stránka page-sdileni, addPartner/removePartner, partnerData listeners, loadPartners při startu) včetně security rules (`users/$uid/data .read` povoluje partnerům z `partners` uzlu).
- **Rozhodnutí:** Ponechat read-only model rovnocenných členů (každý píše do svého, partneři navzájem vidí). Komunitní přehled v režimu Domácnost sčítá výdaje členů (rodinný souhrn). Plný společný zápis = TODO-096 (později).
- **Akce nutná od uživatele:** ověřit, že aktuální database_rules.json je nasazen ve Firebase konzoli.
```

---

## 📄 `bugs.md` – nové FIX záznamy (pokračovat od FIX-089)

```markdown
| FIX-090 | v7.07 | premium.js | computeFinancialScore() nestabilní – konzistenční bonus se MUTOVAL do D.scoreState při každém volání → skóre skákalo při přepínání měsíců (18→25→31). Nyní deterministický výpočet z historie 6 měsíců, žádná mutace. |
| FIX-091 | v7.07 | projects.js | Detektor úspor / Refinancování – ZAMRZNUTÍ prohlížeče. generateSchedule() u velkého dluhu běžela do stropu 7200 období × 2. Nahrazeno lehkým odhadem úroku (strop 50 let). |
| FIX-092 | v7.08 | advisor.js | Poradce zobrazoval 3 skóre místo 12 (periodMap nečetl „advisor"). Poradce nyní vždy 12 měsíců. |
| FIX-093 | v7.08 | advisor.js | AI doporučení se volalo automaticky při otevření Poradce. Nyní jen na tlačítko + cache. |
| FIX-094 | v7.08 | advisor.js + projects.js | Poradce problikával při scrollu (Firebase onValue → renderPage → renderAdvisor). Anti-flicker guard (podpis dat). |
| FIX-095 | v7.10 | projects.js + advisor.js | Celkové fin. zdraví – kruh měl jinou barvu než štítek. drawHealthRing() byla duplicitně v advisor.js s jinými prahy. Duplicita odstraněna. |
| FIX-096 | v7.11 | transactions.js | Predikce vs skutečnost se nezobrazovala – neshoda ID canvasu (predLineCanvas vs yearPredChart) + t.amt bez fallbacku. |
| FIX-097 | v7.12 | index.html | Kalkulačka v „Přidat transakci" nefungovala (JS template literal v HTML → text). Nahrazeno statickými tlačítky. |
| FIX-098 | v7.12 | projects.js + advisor.js | Vývoj fin. skóre – čísla nesedila (13 vs 25 vs 56). Sjednoceno na computeHealthScores().overall. |
| FIX-099 | v7.12 | admin.js + receipts.js | Low confidence – Firebase error u klíčů s tečkou (fbSafeKey sanitizace) + pravidlo se „vracelo" (mapToCOICOP čte cache window._kwOverrides). |
| FIX-100 | v7.13 | styles.css | Rozbité pravidlo .tx-filt-btn (přišlo o selektor, slilo se s #splitItemsList) → taby nečitelné. |
| FIX-101 | v7.13 | admin.js | „Já vs ČSÚ" zobrazovala i ČSÚ tabulku (ktab-csu-content neměl display:none). |
| FIX-102 | v7.15 | admin.js | „Já vs ČSÚ" ignorovala OECD přepočet (csuAmt = avg_domacnost natvrdo) → změna počtu osob bez efektu. Přidán přepínač + calcOECD. |
| FIX-103 | v7.16 | admin.js | Komunitní přehled blikal při přepínání (loading placeholder při každém renderu). Cache _komunitaLoaded. |
| FIX-104 | v7.17 | admin.js | Karty ČR byly omylem až pod COICOP tabulkou místo nahoře. |
| FIX-105 | v7.19 | admin.js | Odkaz „Sdílení & Partneři" vedl omylem do „O aplikaci" místo na funkční stránku sdileni. |
| FIX-106 | v7.20 | admin.js | Karty ČR nezarovnané (text vlevo + jiný font) vs horní řada. Sjednoceno (text na střed, Syne). |
```

---

## 📄 Změny v kódu – přehled po souborech

> Detailní popis je v `admin.js` `VERZE_LOG` (v7.06–v7.21). Níže souhrn co se kde dělo.

```markdown
| Soubor | Verze | Hlavní změny S10 |
|---|---|---|
| ui.js | v7.06, v7.09, v7.13, v7.14 | bCluster relativní souřadnice + bounding box; tooltipy bTip/bEsc; sdílené prvky 📎; zvětšené satelity; debounce renderPage; anti-flicker guard; Treemap záložka odebrána |
| premium.js | v7.07, v7.21 | computeFinancialScore deterministický; markSettingsSaved() po uložení |
| projects.js | v7.08–v7.12 | FFR, inflace ž. stylu, diverzifikace, momentum; getActualRange agregace; hybridní graf skóre; DTI/DSTI přesun do Půjček; sbalitelné popisky záložek; drawHealthRing sjednocen |
| advisor.js | v7.08, v7.10, v7.12 | graf vývoje skóre; Poradce 12 měsíců; AI jen na tlačítko + cache; anti-flicker |
| assets.js | v7.09 | Asset Allocation donut (SVG) |
| transactions.js | v7.11 | Predikce vs skutečnost oprava |
| stats.js | v7.11, v7.13 | TOP 30 s přepínačem Měsíc/Rok/Vše; roční rozpad po měsících; rozbalení podkat; duplicitní graf/tabulka odebrány |
| charts.js | v7.13 | Grafy/Obecné – filtr kategorií skryt (bez efektu) |
| styles.css | v7.12, v7.13, v7.14 | kontrast textu (--text2/--text3); oprava .tx-filt-btn; community-stat-grid + csu-cr-grid responzivní; taby bílé |
| helpers.js | v7.15–v7.17 | COICOP_GROUPS_DEF 13 oddílů + groups[]; COICOP_CLASSES (3. úroveň) |
| receipts.js | v7.15, v7.16 | COICOP_GROUPS_DEF synchronizace (13 oddílů + groups[]) |
| admin.js | v7.13–v7.21 | Komunitní přehled kompletně: přepínač osoba/domácnost, OECD přepočet, 3úrovňový rozklikávací strom, rodinný souhrn, sjednocené karty, odkazy do Nastavení a Sdílení; Affiliate pole odebráno; VERZE_LOG |
| settings.js | v7.16, v7.18, v7.21 | id settingsHousehold; tlačítko Uložit pod složení domácnosti; stavové (zelené jen při změně) |
| index.html | v7.06–v7.21 | version bumpy, cache-busting hashe, kalkulačka statická tlačítka, graf přejmenování |
```

---

## 📄 `formulas.md` – doplnit

```markdown
### OECD ekvivalentní velikost domácnosti (Session 10)
calcOECD(adults, ch013, ch14) = 1,0 + (adults − 1) × 0,5 + ch14 × 0,5 + ch013 × 0,3
- 1 dospělý = 1,0 | 2 dospělí = 1,5 | 2 dospělí + 1 dítě 0–13 = 1,8

### ČSÚ srovnání – referenční částka (Session 10)
- Režim „osoba": csuRef = avg_osoba
- Režim „domácnost": csuRef = avg_osoba × calcOECD(...)
- „Průměrná ČR domácnost" (tabulka): avg_osoba × 2,4 (statistická velikost domácnosti)

### Rodinný souhrn (Session 10)
familyExp = myExp + Σ partnerExp[i]  (partneři z partnerData, jen v režimu Domácnost)
```

---

## ✅ Finální stav

**Aktuální verze:** v7.21 (Session 10, 2026-05-31)

**Ověření hashů:** všech 14 `?v=` odkazů v index.html konzistentních se skutečnými soubory v outputs (styles.css, app.js, helpers.js, ui.js, transactions.js, charts.js, stats.js, premium.js, projects.js, receipts.js, settings.js, assets.js, advisor.js, admin.js).

**Doprovodné dokumenty (outputs):**
- `REPORT_CSU_vs_moje.md` (v2) – analýza ČSÚ dat, jednotky, plán sladění
- `FinanceFlow_scoring_v3.xlsx` – 6 listů (Přehled, Dashboard 4 složky, Report 3 složky, Radar, Obraz, ČSÚ COICOP)

**Otevřené na další session:**
- TODO-094 – ČSÚ částky na úrovni skupin/tříd (čeká na data)
- TODO-095 – dokončit mapování kategorií na COICOP (~11 % nezařazeno)
- TODO-096 – plný rodinný souhrn (zápis do sdílené DB)
- TODO-061 – Chord diagram → Statistiky
- TODO-062 – Treemap → 12M report

---

*Session 10 patch · 2026-05-29 – 2026-05-31 · v7.06 → v7.21 · Autor: Claude Opus 4.8*
