# FinanceFlow – Patch Session 12.1 (MD-Diff Multi-patch)

> Session 12.1 · v7.70 → v7.77 · 2026-06-10
> Struktura dle UPDATE_RULES sekce 8 (separátory `## 📄 soubor.md` pro AI Merge).
> Témata: Runway do výplaty (cyklus výplata→výplata, rezerva, projekce, srovnání cyklů),
> produktová DB z ČSÚ spotřebního koše 2026, COICOP opravy (merge overridů, podkategorie,
> AI Rádce, volba 0), mobilní audit přetékání, touch tooltipy grafů, onboarding průvodce,
> admin výkon Krok 1 (shallow), scoring-config.json.

---

## 📄 bugs.md

> Nové opravy ze Session 12.1 (v7.70 → v7.77).

### FIX-129 · Den výplaty = první příjem místo největšího **(Session 12.1)**
- **Příčina:** Denní graf radaru i „Výplata efekt" braly jako výplatu PRVNÍ příjem měsíce – drobný příjem (cashback 2. dne) posunul referenční bod a rozhodil týdny od výplaty.
- **Oprava:** Výplata = den NEJVĚTŠÍHO příjmu měsíce; v7.76 navíc jediný zdroj pravdy `radarPaydayInfo()` (kotva z Nastavení/auto-detekce, největší příjem ji jen zpřesňuje ±6 dní).
- **Soubor:** `projects.js`

### FIX-130 · settingFirstDay se nikdy neukládal **(Session 12.1)**
- **Příčina:** Select „První den měsíce" existoval v Nastavení, ale `saveSettingsBtn()` v premium.js hodnotu vůbec nečetl → mrtvé UI.
- **Oprava:** Ukládá se `_settings.firstDay`; přejmenováno na „Den výplaty" + výchozí volba „🤖 Automaticky (z transakcí)" (0), aby nedotčené nastavení nelhalo.
- **Soubor:** `premium.js`, `settings.js`

### FIX-131 · coicopOverrides merge zahodil defaultní overridy **(Session 12.1)**
- **Příčina:** `renderCatPage`: `c.coicopOverrides || def.coicopOverrides` – jakmile měla kategorie JEDEN vlastní override, všechny defaultní zmizely → ztracená čísla u podkategorií sdílených kategorií.
- **Oprava:** Sloučení `{...def.coicopOverrides, ...c.coicopOverrides}`. helpers.js `computeCoicopAggregates` navíc čte i userCat.coicopOverrides (admin domapování se nepropisovalo do analýzy) a override `0` sub VYŘADÍ (nezdědí rodiče).
- **Soubor:** `stats.js`, `helpers.js`

### FIX-132 · DEFAULT cat42 Poplatky – chybný COICOP rodič **(Session 12.1)**
- **Příčina:** Poplatky měly `coicop:12` bez overridů. Do 12 (Pojištění a fin. služby) patří jen Bankovní poplatek; Správní poplatek/Kolky/Notář/Katastr/Registr patří do 13 → žádná čísla u podkategorií + špatná analýza.
- **Oprava:** Rodič `coicop:13` + `coicopOverrides:{'Bankovní poplatek':12}`.
- **Soubor:** `app.js`

### FIX-133 · Predikce – „Skrýt prázdné podkategorie" se resetovalo **(Session 12.1)**
- **Oprava:** Stav v `localStorage ff_predHideEmptySubs`, přežije reload i přepnutí stránky.
- **Soubor:** `transactions.js`

### FIX-134 · Tooltipy grafů nefungovaly na mobilu **(Session 12.1)**
- **Příčina:** Canvas grafy měly jen `onmousemove` – na dotykových zařízeních nestřílí.
- **Oprava:** `attachChartTouch()` – touchstart/touchmove → stejný handler, `touch-action:pan-y` zachová svislý scroll. Aktivováno: area graf, saldo bary (+ nová legenda ■ přebytek/■ schodek), graf dluhů.
- **Soubor:** `charts.js`

### FIX-135 · statCard helper mimo mobilní clamp **(Session 12.1)**
- **Příčina:** Globální audit (v7.74) cílil `.stat-value`, ale helper `statCard` měl font-size INLINE → nepokryt.
- **Oprava:** Helper převeden na třídy `.stat-value-h`/`.stat-label-h` s clamp() v styles.css.
- **Soubor:** `helpers.js`, `styles.css`

---

## 📄 todo.md

### Hotovo v Session 12.1
- ✅ **TODO-122** · Admin výkon Krok 1: shallow + per-uid categories (`adminFetchUserCategories`, pool 8) – loadCustomCatsNoCoicop, loadCustomSubsNoCoicop, assignCoicop, assignSubCoicop **(v7.77)**

### Nové úkoly
- **TODO-123** 🔴 · Score-engine dle ADR-060: `js/score-engine.js` + snapshoty `D.scoring[YYYY-MM]` při save(); dashboard jen čte. Config hotov (`data/scoring-config.json`).
- **TODO-124** · Admin výkon Krok 2 dle ADR-061: `/index/userSummary/{uid}` (spouštěč: >50 uživatelů nebo Google Play).
- **TODO-125** · Grafy dávka 2: SVG grafy v premium.js + projects.js – osy, legendy, tooltipy (pak dávka 3: assets.js, advisor.js).
- **TODO-126** · Runway: push notifikace při 2 dnech překročení denního limitu po sobě; mini-widget denního limitu na Dashboardu.
- **TODO-127** · COICOP: editace overridu podkategorie přímo v uživatelském modalu kategorie (dnes jen admin Adopce).
- **TODO-128** · Produktová DB: zpětná vazba úspěšnosti tagování (kolik položek účtenky trefil slovník vs. AI) → ladění keywords.

---

## 📄 decisions.md

### ADR-060 · Config-driven Score Engine pro Dashboard **(Session 12.1)**
- **Rozhodnutí:** Bodování Dashboardu z `data/scoring-config.json` (tabulky z dashboard_body.xlsx 1:1, maxima dle tabulek = 290 b., oprava překlepu S1 1.00–1.25). Nový `score-engine.js` = čisté funkce; snapshoty do `D.scoring[YYYY-MM]` při save(); dashboard pouze zobrazuje. Vstupy: S1 exp/inc, S2 DTI+DSTI z debts.js, S3 spořicí/invest. peněženky, S4 isSaving kategorie, bonus = streak poklesů výdajů.
- **Stav:** Config HOTOV (v7.77), engine = TODO-123. Detail: `ADR-060-score-engine.md`.

### ADR-061 · Škálování admin auditů – agregační index **(Session 12.1)**
- **Rozhodnutí:** Krok 1 (shallow + per-uid categories) HOTOV v7.77. Krok 2: klient při save() zapisuje `/index/userSummary/{uid}` (≤2 kB: email, txCount, catUsage, customCats, verze) → admin čte jediný uzel; pravidla: zápis vlastníkem, čtení adminem. POZOR na pattern FIX-118 při zápisu mimo hlavní uzel.
- **Stav:** Odloženo (spouštěč: >50 uživatelů / Google Play). Detail: `ADR-061-admin-scale.md`.

---

## 📄 features.md

### Runway do výplaty **(Session 12.1, v7.71 + v7.75)**
- Finanční radar má přepínač **📅 Měsíc / 💸 Do výplaty**. Runway počítá cyklus výplata→výplata: volné peníze do další výplaty (po rezervě na známé budoucí platby), bezpečný denní limit, progress utraceno vs. uplynulý cyklus.
- Detekce výplaty: kotva z Nastavení („Den výplaty", 0 = 🤖 automaticky = medián dne největšího příjmu za 6 měsíců), přichycení na reálnou příjmovou transakci ±6 dní, víkendová výplata → pátek. Hint při nesouladu nastavení vs. realita.
- **Tempo po týdnech cyklu:** stacked graf + tabulka, rozpad dle charakteru výdaje (Fixní/Variabilní/Jednoráz.+nepravid./Neurčeno z `expenseChar`), Kč/den jen z odžitých dní. Karta **Co žene variabilní výdaje** (top 5).
- **v7.75:** 🛡️ Nedotknutelná rezerva (Nastavení → `_settings.minReserve`) – denní limit až po odečtení; 📉 projekce konce cyklu z flexibilního tempa; 🔁 srovnání s minulým cyklem do stejného dne (±%); tempo všední den vs. víkend.

### Produktová databáze (ČSÚ spotřební koš 2026) **(Session 12.1, v7.72)**
- `data/product-groups.json` (116 kB): 402 CZ-COICOP skupin s váhami, všech 427 cenových reprezentantů, 1066 klíčových slov (vč. účtenkových zkratek JOG./ROHL./TOAL.), krátké tagy kompatibilní s community/itemTags.
- `js/product-db.js`: `productGroupLookup(název)` → {code, tag, group} (NFD normalizace, delší klíč vyhrává, krátké klíče jen na začátek slova, gramáže stripnuty). `productGroupPrefill(receipt)` v `buildReceiptPreviewHTML` předvyplní 🏷️ tagy položek (jen kde chybí) → méně AI volání (synergie ADR-041).
- Restaurační reprezentanti (oddíl 11) vyřazeni z matchingu položek (KUŘECÍ PRSA ≠ restaurace).

### COICOP správa **(Session 12.1, v7.73 + v7.74)**
- Admin → Adopce: nová sekce **🧩 Podkategorie bez COICOP** – audit napříč uživateli, `assignSubCoicop()` hromadně zapíše override do Firebase. Audit zahrnuje i defaultní suby SDÍLENÝCH kategorií (dědění nejednoznačné) a vynechává příjmové kategorie.
- Volba **„0 – mimo COICOP"** (příjem/převod/spoření) – platné přiřazení, analýza vyřadí.
- **🤖 AI Rádce** u každého řádku mapování: navrhne oddíl 0–13 + důvod, předvyplní select.
- AI auto-kategorizace transakcí vrací a zobrazuje COICOP (🧭 chip) + tlačítko „Přiřadit COICOP N kategorii" pro vlastní kategorie.

### Onboarding průvodce **(Session 12.1, v7.76)**
- 🚀 „Dokonči nastavení (X/5)" na vrchu Přehledu: první transakce → den výplaty → rezerva → charakter výdajů (≥3) → domácnost. Kroky klikací (vedou na místo), progress bar, ✕ = `ff_onboardHide`, zmizí po 5/5, skryt v admin náhledu.

---

## 📄 GLOSSARY.md

- **Runway do výplaty** – pohled radaru počítající cyklus výplata→výplata místo kalendářního měsíce; volné peníze do další výplaty po rezervě na známé platby.
- **Kotva výplaty (anchor)** – očekávaný den výplaty: Nastavení → Den výplaty, jinak auto-detekce (medián dne největšího příjmu, 6 měsíců). Reálná výplata = největší příjem ±6 dní od kotvy; víkend → pátek. Jediný zdroj pravdy: `radarPaydayInfo()`.
- **Nedotknutelná rezerva** – `_settings.minReserve`; Runway ji odečítá před výpočtem denního limitu.
- **Produktová DB** – `data/product-groups.json` + `product-db.js`; mapování názvů položek účtenek na COICOP skupiny/tagy (zdroj: ČSÚ spotřební koš 2026).
- **COICOP 0 (mimo COICOP)** – platné přiřazení pro nespotřební položky (příjem/převod/spoření); vyřazeno z COICOP analýzy, nezdědí rodiče.
- **adminFetchUserCategories()** – shallow seznam UID + per-uid stažení jen kategorií (pool 8); náhrada stahování celé users.json v auditech.

---

## 📄 context.md

- **Verze:** v7.77 (Session 12.1, 2026-06-10). Řada v7.71–v7.77: Runway do výplaty, produktová DB ČSÚ, COICOP opravy a správa podkategorií, mobilní audit, touch grafy, onboarding, admin shallow Krok 1, scoring-config.
- **Nové soubory:** `data/product-groups.json`, `js/product-db.js`, `data/scoring-config.json`, `ADR-060-score-engine.md`, `ADR-061-admin-scale.md`.
- **Nová nastavení:** `_settings.firstDay` (Den výplaty, 0=auto), `_settings.minReserve` (nedotknutelná rezerva).
- **Poznámka k verzi:** při bumpu kontrolovat i `<title>` v app.html – v7.55 strašila v náhledech odkazů (řada 12.1 sjednotila title/sidebar/banner).

---

## 📄 explanations.md

### Pattern: Dva zdroje pravdy pro jeden údaj (den výplaty)
`radarPaydayInfo()` (robustní) vs. lokální detekce v `renderRadarDailyChart` (první/největší příjem) ukazovaly různé týdny ve dvou záložkách téhož Radaru. Ponaučení: odvozený údaj používaný na více místech MUSÍ mít jednu funkci-zdroj; ostatní místa ji volají (v7.76). Stejný pattern hlídat u: payday, COICOP merge, volné peníze.

### Pattern: Runtime-merge vs. persistence (COICOP)
`coicop/shared/coicopOverrides` se do Firebase u defaultních kategorií nezapisují (doplňují se za běhu z DEFAULT_CATEGORIES) – to je OK. ALE: merge musí SLUČOVAT (`{...def, ...user}`), ne nahrazovat; a konzumenti (analýzy) musí číst i uživatelskou vrstvu. Tři malé chyby ve třech souborech = dojem „celé to nefunguje".

### Pattern: Inline styl poráží globální CSS audit
Mobilní clamp v styles.css nepokryl helper s inline `font-size`. Při auditech vždy grepnout inline `font-size:`/`width:` v JS šablonách – helpery převést na třídy.
