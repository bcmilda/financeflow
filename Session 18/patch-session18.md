# PATCH — Session 18

**Verze:** v9.42 → **v9.78** · **Datum:** 2026-08-03 · **Doména:** financeflow.cz (LIVE)

---

## 🚀 NASADIT

### Soubory v hash chain (nasadit společně)
```
app.js  ·  projects.js  ·  premium.js  ·  ui.js  ·  charts.js
report.js  ·  review.js  ·  advisor.js  ·  firebase.js  ·  styles.css
app.html  ·  admin.js  ·  sw.js
```

### Mimo hash chain (nasadit ZVLÁŠŤ)
| Soubor | Kam | Proč |
|---|---|---|
| **`database_rules.json`** | Firebase Console | ⚠️ **NUTNÉ** — nový uzel `reviews` bez pravidel nepůjde zapsat |
| `firebase.json` | repo | vyloučení `tools/`, `package.json`, náhledů z nasazení |
| `tools/check_tdz.js` | repo | kontrolní skript (viz níže) |

### Jednorázově v repu
```bash
npm install --save-dev acorn acorn-walk
```

---

## 📋 CO PŘIBYLO

### Životní mapa (v9.45, v9.50)
- Milníky s datem, ikonou a poznámkou — **neovlivňují bodování** (kontext, ne výmluva)
- **Etapy** jako druhý typ záznamu (období, ne bod) + srovnání průměrných výdajů mezi etapami
- **Automatický milník „Začal jsem sledovat výdaje"** po 5. transakci
- Uzel `users/{uid}/data/milestones` — registrován na **4 místech** v `app.js`

### Diff-read fáze 2 (v9.46)
- Transakce přes `onChildAdded/Changed/Removed`, meta po klíčích
- Změna jedné transakce už netahá celou databázi
- **Fallback + vypínač** `localStorage.ff_read_split = '0'`
- ⚠️ Okno 12M z v9.55 bylo **odstraněno ve v9.57** — nikdo by ho nezapnul

### Grafy (v9.47–9.49)
- Heatmapa Kategorie × měsíce (Roční), matice jedné kategorie (Všechny roky)
- Sloupce s červenou linkou průměru + kumulace, tooltipy
- FIX-224: filtr „Příjmy" vracel prázdno

### Finanční obraz (v9.51, 9.69–9.73)
- **Cesta finančního zdraví** s vodopádem + Monthly/Momentum Score
- Net Worth Momentum, FFR/Liquidity Momentum, Diverzifikace jako karty
- Lifestyle: tabulka ukazatelů, Kam růst přistál, Reálný růst, Rezerva vydrží
- **9 očíslovaných sekcí**, vysvětlivky „Co to je" rozbalené

### Měsíční report (v9.58–9.68)
- **14 očíslovaných sekcí**, banner s celým řetězcem výpočtu skóre
- Co se nejvíc změnilo · Na co si dát pozor · Stav bohatství · Z účtenek · Milníky · Výhled · Stálo to za to
- Souhrn výdajů přesunut výš, seřazený, s rozklikáváním
- Při 2–12M **kumuluje** i v blocích 11–14

### Report (report.js) (v9.52, 9.54)
- **Sektor = kategorie, řádek = podkategorie** (přepracováno)
- Sloupec „vs. loni" proti stejnému období
- Zrušeny 2 placeholdery a duplicitní tab „Roky"

### Recenze (v9.75–9.77)
- Hodnocení 1–5 hvězdiček + text přímo v aplikaci
- Souhrn (průměr + počet), admin panel se všemi recenzemi
- Uzel `reviews/{uid}` — **mimo `users`, takže pravidla nutná**

---

## 🐛 OPRAVY (FIX-220 → FIX-251)

| ID | Co | Příčina |
|---|---|---|
| FIX-224 | filtr Příjmy vracel prázdno | natvrdo `_txKind !== 'income'` v renderu |
| FIX-226 | Finanční obraz se neotevřel | `_ffrD` použit před deklarací |
| FIX-227 | sloupec Roční konstantní | počítal celý rok místo kumulace |
| FIX-228 | graf skóre ≠ Dashboard | `computeFinancialScore` uměla jen aktuální měsíc |
| FIX-229 | Růst uživatelů ve všech záložkách | chybělo `'rust'` v seznamu |
| FIX-230 | report se neotevřel | `_s1pts` skončil v jiné funkci |
| FIX-234 | nešlo hodnotit položky účtenek | zápis šel jen na transakce |
| FIX-237 | report se neotevřel | `months` vs `nMonths` |
| FIX-238 | výdaj 20 000 se nepropsal | `||!prev` vyhodilo nové kategorie |
| FIX-240 | admin: `txs.forEach is not a function` | transakce jsou objekt, ne pole |
| FIX-241 | report se neotevřel | `fs` v jiném bloku (scope) |
| FIX-243 | tabulka rozhozená | sumáře 5 sloupců vs. řádky 7 |
| FIX-244 | chyběly součty cyklů | `colspan=3` slučoval sloupce |
| FIX-245 | tabulka rozhozená | **doslovný Python zápis v CSS** |
| FIX-246 | bubliny přetékaly | pevný viewBox u Drill/Gradient |
| FIX-247/248 | Budoucí platby = 0 | vynulování + horizont 30 dní |
| FIX-249 | modal mimo obrazovku | špatné CSS třídy |
| FIX-250 | Plánovaný výdej = 0 | obě složky nulové u budoucího měsíce |
| FIX-251 | hodnocení bez odezvy | `toast()` neexistuje, je `showToast()` |

---

## 🔧 KONTROLNÍ SKRIPT `tools/check_tdz.js`

Vznikl po **třech pádech na produkci** ve stejné session. Prošel čtyřmi verzemi:

| verze | přístup | co propustila |
|---|---|---|
| v1 (v9.59) | regex, jen `_podtržítko` | `months` |
| v2 (v9.63) | regex nad celou funkcí | `fs` — **neznala blokový scope** |
| v4 (v9.67) | **acorn parser + skutečné scope** | — |

Hlídá dvě věci: použití před deklarací v témže scope a **identifikátory, které nejsou deklarované nikde** (včetně globálů z ostatních souborů a inline skriptů v `app.html`).

**Spouštět před každou dodávkou.** Odhalil `computePersonalInflation`, `APP_VERSION`, `renderSettings` a `_rep` — funkce, které jsem volal, ale v aplikaci neexistují.

---

## ⚠️ POUČENÍ

1. **Regexy nestačí na scope.** JS má blokový scope; `const` uvnitř `try{}` neplatí ve zbytku funkce.
2. **Ověřovat názvy funkcí v kódu, ne odhadovat.** `toast` × `showToast`, `computePersonalInflation` × `_inflCollect`.
3. **Ověřovat CSS třídy a umístění tlačítek** — aplikace používá `overlay`/`modal`/`modal-head`.
4. **Kotva pro vkládání kódu musí být jedinečná v rámci funkce**, ne souboru.
5. **Uzly mimo `users/{uid}` potřebují vlastní pravidla** (kaskáda `.write` tam neplatí).
