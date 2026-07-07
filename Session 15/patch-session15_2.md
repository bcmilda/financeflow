# FinanceFlow – Patch Session 15 (KOMPLETNÍ, MD-Diff Multi-patch)

> Session 15 · v8.57 → v8.74 · 2026-07-02 až 2026-07-06 · 18 verzí
> Struktura dle `UPDATE_RULES.md` sekce 8 (separátory `## 📄 soubor.md` pro MD Diff → AI Merge → Multi-patch).
> Toto je FINÁLNÍ verze patche za celou session – nahrazuje dřívější dílčí `patch-session15.md`.
> ID rozsah: FIX-174 až FIX-191 · ADR-079 až ADR-085 · TODO-144 až TODO-159

---

## 📄 bugs.md

> Nové bugy a opravy ze Session 15 (18 FIXů, v8.58 → v8.74).

### FIX-174 · Editace transakce nevyplňovala peněženku ani typ platby **(v8.58)**
- **Příčina:** `editTx()` v `ui.js` nevolal `populateTxWalletSelect()`/`populateTxPayTypeSelect()`.
- **Oprava:** `editTx()` naplní oba selecty a nastaví `t.wallet`/`t.payType`.
- **Soubor:** `ui.js`

### FIX-175 · Duplicitní detekce ignorovala měnu **(v8.58)**
- **Příčina:** `detectDuplicates()` porovnávalo surové `t.amount` → 900 Kč a 900 GBP vyhodnoceny jako duplikát.
- **Oprava:** Porovnání v CZK přes `txCZK()`, tolerance 1 Kč.
- **Soubor:** `duplicates.js` · 🔗 ADR-079

### FIX-176 · Přesun mezi peněženkami s různou měnou nepřeváděl částku **(v8.59)**
- **Příčina:** Transfer větev pushovala obě nohy se stejnou surovou částkou (100 EUR → 100 Kč místo ~2 530 Kč).
- **Oprava:** Pole „Připsat do cílové peněženky" s křížovým kurzem ČNB, editovatelné. Obě nohy nesou `amtCZK`.
- **Soubory:** `debts.js`, `app.html` · 🔗 ADR-079

### FIX-177 · Kč-only limit kategorie nefungoval **(v8.63)**
- **Příčina:** Chybějící `healthPct` dávalo `limitByPct=0` → engine vyhodnotil „bez limitu" i když byl vyplněn Kč strop.
- **Oprava:** `limitByPct = Infinity` když `healthPct` není vyplněno (ne 0).
- **Soubor:** `projects.js`

### FIX-178 · Přesuny zahrnuty v denních sumářích transakcí **(v8.65)**
- **Příčina:** Denní hlavičky/badge v Transakcích nefiltrovaly `isTransferTx`.
- **Oprava:** Denní sumy filtrovány přes `_statTx(t)`.
- **Soubor:** `ui.js`

### FIX-179 · Zaškrtnutí položky v Nákupním seznamu shodilo appku **(v8.67, KRITICKÝ)**
- **Příčina:** Lišta „V košíku X z Y" odkazovala na `total` z jiné funkce mimo scope → `total is not defined`, crash.
- **Oprava:** Nahrazeno `_nakupItems.length`.
- **Soubor:** `nakup.js`

### FIX-180 · Převodník měn se zasekl při editaci transakce **(v8.68)**
- **Příčina:** `editTx()` nespouštěl `updateTxCurrency()` → převodník ukazoval starou/nulovou hodnotu.
- **Oprava:** `editTx()` volá `updateTxCurrency()` po nastavení selectů.
- **Soubor:** `ui.js`

### FIX-181 · Šipky řazení kategorií přeskakují v sekci Příjmy **(v8.68, 1. pokus)**
- **Příčina:** U horního okraje stránky se scroll nemá kam posunout (clamp) → kurzor skončí nad jinou kartou.
- **Oprava (částečná):** Detekce clampu + zvýraznění přesunuté karty.
- **Soubor:** `stats.js` · ⚠️ Nedostatečné, viz FIX-182 a FIX-183

### FIX-182 · Šipky kategorií – anti-bounce guard **(v8.70, 2. pokus)**
- **Příčina:** FIX-181 jen zvýraznil kartu, ale klik na jinou kategorii těsně po clampu ji stále přesunul.
- **Oprava (částečná):** 500ms guard ignoruje klik na jinou kategorii po neúspěšné kompenzaci.
- **Soubor:** `stats.js` · ⚠️ Milan hlásil "zadrhávání nahoru, dolů OK" → viz FIX-183

### FIX-183 · Šipky kategorií – finální oprava (redirect) **(v8.71, 3. pokus, VYŘEŠENO)**
- **Příčina:** Ignorování klik (FIX-182) nechalo uživatele "trčet" – klik nic neudělal.
- **Oprava:** Klik po clampu se PŘESMĚRUJE na původně přesouvanou kartu (stejný směr, okno 900 ms) → plynulé opakované klikání i u okraje stránky.
- **Soubor:** `stats.js`

### FIX-184 · Napojená aktiva po smazání se už neobnoví **(v8.71)**
- **Příčina:** Blocklist `S.noSyncKeys` – jednou smazané napojené aktivum (ze Přesunu) se navždy zablokovalo, i po nové transakci.
- **Oprava:** Blocklist zrušen + jednorázový úklid starých blokací. Tlačítko ✕ u napojených aktiv skryto (nelze smazat ručně, jen přes transakce).
- **Soubor:** `assets.js` · 🔗 ADR-076/077/078

### FIX-185 · Progress bar půjčky ukazoval 0 % i při částečném splacení **(v8.71)**
- **Příčina:** Progress počítal jen splátky zadané v appce (transakce), ne rozdíl (půjčeno − zbývá) z historie před appkou.
- **Oprava:** `_prePaid = total − remaining − paidPrincipal` – Milanův příklad (60k/40,5k) ukazuje 32,5 % místo 0 %.
- **Soubor:** `transactions.js`

### FIX-186 · Denní cena dluhu nesouhlasila s bannerem (125 vs 215 Kč/den) **(v8.71)**
- **Příčina:** Kalkulačka dělila součtem délek VŠECH úvěrů (jako by běžely za sebou), banner délkou NEJDELŠÍHO úvěru.
- **Oprava:** Sjednoceno na dobu nejdelšího úvěru.
- **Soubor:** `debts.js`

### FIX-187 · Financial Freedom Ratio a Diverzifikace příjmů nefungovaly **(v8.72, ZÁSADNÍ)**
- **Příčina:** Obě metriky používaly `getActual` (jen VÝDAJE) → pasivní příjem vždy 0, jediným "zdrojem příjmu" byla kategorie s výdajovou transakcí (Finanční úřad – daň).
- **Oprava:** Nový helper `getIncActual` (příjmy, bez přesunů/splitů/vyrovnání) v `helpers.js`.
- **Soubory:** `helpers.js`, `projects.js`

### FIX-188 · DSTI nesouhlasilo mezi widgety (732 % vs 753 %) **(v8.72)**
- **Příčina:** Dluhový stres index ignoroval `d.installments` (proměnlivé splátky), počítal jen z `d.payment`.
- **Oprava:** Sdílené helpery `computeMonthlyDebtPayments()` + `computeEffectiveIncome()` v `helpers.js` – jeden zdroj pravdy pro Stres index, Bankovní hodnocení i Dashboard.
- **Soubory:** `helpers.js`, `debts.js`, `projects.js`, `premium.js`

### FIX-189 · KRITICKÁ chyba – Půjčky nešly otevřít **(v8.73, způsobeno vlastní chybou v8.72)**
- **Příčina:** Při sjednocování DSTI (FIX-188) hromadný `replace` s nejedinečným vzorem trefil PRVNÍ výskyt (Kalkulačka dluhové reality místo Dluhového stres widgetu) a smazal 108 řádků včetně `function renderDebtStressWidget`. Syntax zůstala validní → `node --check` chybu nezachytil.
- **Oprava:** Obnoveno z v8.71 + oprava aplikována na správné místo.
- **Soubor:** `debts.js`
- **📌 Poučení zapsáno do `CLAUDE_SKILLS.md` SKILL 5.**

### FIX-190 · Převodní měna z Nastavení se nepropsala u nové transakce **(v8.73)**
- **Příčina:** `openAddTx()` nespouštěl `updateTxCurrency()` (jen editace to dělala).
- **Oprava:** `openAddTx()` volá `updateTxCurrency()` přes `setTimeout(...,0)`.
- **Soubor:** `debts.js`

### FIX-191 · Finanční obraz – šipka trendu vs. hodnocení rozhozené **(v8.74)**
- **Příčina:** U metrik Výdaje/Dluhy se posílalo `trend:-hodnota` aby "sedělo" hodnocení good/bad → šipka i fajfka byly obě obrácené (výdaje +37 % ukazovaly ↓ se zelenou ✅).
- **Oprava:** Rozděleno na `rawTrend` (skutečný směr, pro šipku) a `good` (hodnocení, pro ✅/⚠️) – nezávisle na sobě.
- **Soubor:** `projects.js`

---

## 📄 decisions.md

> Nová architektonická rozhodnutí ze Session 15 (ADR-079 až ADR-085).

### ADR-079 · Zafixovaný kurz transakce v cizí měně (`amtCZK`) **(v8.58)**
- **Rozhodnutí:** Transakce v cizoměnové peněžence se při vložení zafixují na kurz z okamžiku vložení (pole `amtCZK`, kurz banky – ne živý ČNB). Jednou uložená hodnota se NIKDY nepřepočítává.
- **Důvod:** Živý přepočet měnil historické součty s každou změnou kurzu; kurz banky ≠ kurz ČNB.
- **Priorita čtení (`txCZK(t,D)`):** 1) `t.amtCZK` → 2) CZK peněženka → `amount` → 3) fallback živý kurz `toCZK`.
- **Status:** ✅ Nasazeno, jádro celé multi-currency architektury session.

### ADR-080 · Základní měna uživatele – zobrazovací vrstva **(v8.60–61)**
- **Rozhodnutí:** Nastavení → Lokalizace → základní měna (CZK/EUR/USD/GBP/PLN). Interní data zůstávají v CZK; zobrazení se přepočítává živým kurzem ČNB (`baseCur()`, `czkToBase()`, `fmtB()`, `fmtBP()`).
- **Rozsah:** Celá appka – dashboard, transakce, grafy, aktiva, projekty, dluhy, AI, radar, canvas grafy.
- **Status:** ✅ Nasazeno napříč všemi moduly do konce session.

### ADR-081 · Zaškrtávací nákupní seznam (`inCart`) **(v8.62)**
- **Rozhodnutí:** Nákupní seznam rozšířen o `inCart: bool` – zaškrtnutí ztlumí kartu, přeškrtne název, zařadí dolů. Lišta "V košíku X z Y" + Vysypat košík.
- **Status:** ✅ Nasazeno.

### ADR-082 · Hlavičky JS souborů při version bumpu **(v8.59)**
- **Rozhodnutí:** Při KAŽDÉM version bumpu se aktualizují hlavičky VŠECH změněných souborů (`// FinanceFlow · vX.XX · soubor.js · YYYY-MM-DD`).
- **Status:** ✅ Pravidlo dodržováno od v8.59 do konce session.

### ADR-083 · Rezerva vs. Aktivní spoření – oddělené vlajky kategorie **(v8.70, NOVÉ)**
- **Rozhodnutí:** Kategorie typu Přesun mají DVA vzájemně výlučné přepínače: 🛟 `isSaving` (finanční rezerva/spoření) a 📈 `isInvest` (investice/aktivní spoření). Modal "Do investic & spoření" seskupuje KAM podle těchto vlajek. Virtuální přesun (informativní, v8.71) nelze označit ani jedním – je mimo skórování i výběr KAM.
- **Důvod:** Milan potřeboval jasně rozlišit body za Rezervu (S3) a Aktivní spoření (S4) v dashboardu – dřív obě jely na jeden checkbox `isSaving`.
- **Status:** ✅ Nasazeno, propojeno do score enginu v8.72.

### ADR-084 · Sdílené výpočetní helpery pro dluhové metriky **(v8.72, NOVÉ)**
- **Rozhodnutí:** `computeMonthlyDebtPayments(D)` a `computeEffectiveIncome(D)` v `helpers.js` jsou JEDINÝ zdroj pravdy pro měsíční splátky dluhů a efektivní příjem. Používají je: Dluhový stres index, Bankovní hodnocení (DTI/DSTI), Dashboard Finanční skóre (S2 Zadluženost).
- **Důvod:** FIX-188 (DSTI 732 % vs 753 %) – tři místa počítala stejnou věc jinak.
- **Status:** ✅ Nasazeno.

### ADR-085 · Milanovy plné bodovací tabulky jako `_SCORING` **(v8.73, NOVÉ)**
- **Rozhodnutí:** `dashboard_body.xlsx` (S1 76 řádků, DTI 60, DSTI 41, S3 50, S4 31, bonus 13) načten 1:1 do `helpers.js` jako `const _SCORING` + lookup funkce `msc_S1/msc_DTI/msc_DSTI/msc_S3/msc_S4/msc_BONUS`. Nahrazuje dřívější zjednodušené 4-skokové tabulky v `premium.js`.
- **Důvod:** Milan poukázal na hrubé skoky (5 půjček = 25 stres bodů stejně jako 100 půjček) – jemné odstupňování řeší férovost hraničních případů.
- **Status:** ✅ Nasazeno do Dashboardu, Měsíčního reportu, Bankovního hodnocení i Dluhového stres indexu (v8.74).

---

## 📄 todo.md

> Nové a dokončené úkoly ze Session 15 (TODO-144 až TODO-159).

### TODO-144 · Měny podle základní měny uživatele ✅ DOKONČENO **(v8.58–61)**
Zafixovaný kurz (ADR-079) + zobrazovací základní měna (ADR-080).

### TODO-145 · Duplicitní detekce ignoruje měnu ✅ DOKONČENO **(v8.58)** – viz FIX-175

### TODO-146 · Denní sumář sčítá cizí měnu bez převodu ✅ DOKONČENO **(v8.58)** – viz FIX-178

### TODO-147 · Graf vývoje cen pod tabulkou Zdražování ✅ DOKONČENO **(v8.58)**
SVG interaktivní graf top 5 položek, osy Kč/ks + datum, legenda, tooltip. Soubor `receipts.js`.

### TODO-148 · Historický kurz vkladu do aktiv ✅ DOKONČENO **(v8.58)**
Vyřešeno zafixovanou `amtCZK` – vklad nese kurz z okamžiku vložení.

### TODO-149 · Přesun mezi peněženkami s různou měnou ✅ DOKONČENO **(v8.59)** – viz FIX-176

### TODO-150 · Základní měna uživatele – nastavení ✅ DOKONČENO **(v8.60–61)** – viz ADR-080

### TODO-151 · Základní měna – fáze 2 (zbývající moduly) ✅ DOKONČENO **(v8.61)**
Projekty, Dluhy, Aktiva, Banka, Kalendář, Budoucí platby, AI Poradce, Nákupní DNA, Radar, canvas grafy.

### TODO-152 · Automatické rozdělení limitů kategorií ✅ DOKONČENO **(v8.63–64)**
Modal navrhne % limity dle skutečných výdajů (3M historie) nebo ČSÚ COICOP (nováčci, obálka 80 %). Tlačítko na stránce Kategorie od v8.70.

### TODO-153 · Stripe webhook a Premium tier infrastruktura **(🟡 P2, STÁLE OTEVŘENO)**
- **Stav:** Stripe sandbox nastaven (Product 149 Kč/měs, Payment Link, Webhook endpoint na Cloudflare `/stripe-webhook`).
- **Chybí:** Implementace webhooku v `worker.js`, URL do `donate.js`, zámky `hasPremiumAccess`. Payment Link URL + `sk_test_...` + `whsec_...` + Firebase DB Secret → Cloudflare Secrets.
- **🔗 Cross-reference:** `decisions.md` ADR-053 (Stripe)

### TODO-154 · MacroDroid parser bankovních notifikací **(🟢 P3, odloženo)**
Navrženo, neimplementováno – funguje jen pro power-usery. Pro masy = TWA nativní přístup.

### TODO-155 · Rezerva vs. Aktivní spoření – oddělené vlajky ✅ DOKONČENO **(v8.70–72)**
Viz ADR-083 a ADR-084. S4 čte `isInvest` (fallback `isSaving`), S3 Rezerva započítává i napojená aktiva v sekci 🛟 Finanční rezerva.

### TODO-156 · Avalanche vs. Sněhová koule strategie splácení ✅ DOKONČENO **(v8.71, v8.74)**
- **v8.71:** Základní simulace, graf kumulativních úroků, verdikt s prvním splaceným dluhem.
- **v8.74 rozšíření:** Slider Horizont (5–30 let), graf počtu aktivních půjček v čase, tabulka toku peněz (pořadí splácení, ✅ u splacených, sloupce Avalanche vs. Koule).

### TODO-157 · Propojení Dashboard ↔ Měsíční report ✅ DOKONČENO **(v8.72, v8.74)**
- **v8.72:** Report čte živé Dashboard skóre (Cash flow/Rezerva/Spoření) jako informativní řádek.
- **v8.74:** Report Výdajové/Úsporové složky POČÍTAJÍ přes stejné Milanovy tabulky jako Dashboard (S1/S4), ne vlastní zjednodušenou logiku.

### TODO-158 · Milanovy plné bodovací tabulky do všech výpočtů ✅ DOKONČENO **(v8.73)**
Viz ADR-085. `_SCORING` + `msc_*` lookupy nahrazují všechny dřívější zjednodušené 4-skokové tabulky.

### TODO-159 · Dashboard plné škály (75/100/50/35 + Rozpočet) ✅ DOKONČENO **(v8.74)**
Dashboard Finanční skóre škáluje na plné tabulky (Cash flow 0–75, Zadluženost 0–100, Rezerva 0–50, Spoření 0–35) + NOVÁ 5. složka Rozpočet 0–50 (napojená na Měsíční report). Součet 310 b (+ bonus 30) normalizován na 0–100 pro prsten. Měsíční report zůstal 0–100.

---

## 📄 features.md

> Nové a aktualizované funkce ze Session 15 (chronologicky).

- **Zafixovaný kurz transakce (v8.58)** – pole "Skutečně v Kč" pod Částkou u cizoměnové peněženky, editovatelné, nikdy se nepřepočítává.
- **Přesun mezi měnami (v8.59)** – editovatelná cílová částka s křížovým kurzem ČNB.
- **Základní měna uživatele CZK/EUR/USD/GBP/PLN (v8.60–61)** – Nastavení → Lokalizace, přepočet živým ČNB kurzem napříč celou appkou.
- **Zaškrtávací nákupní seznam (v8.62)** – `inCart`, ztlumení, řazení dolů, lišta "V košíku X z Y".
- **Graf Finanční simulace života – přepis (v8.62)** – hex barvy, DPR škálování, legenda nahoře, tooltip.
- **Automatické rozdělení limitů kategorií (v8.63–64, v8.70)** – ČSÚ COICOP pro nováčky / skutečné výdaje pro historii; tlačítko na stránce Kategorie.
- **Grafy Finančního obrazu – Inflace životního stylu + Wealth Momentum (v8.66–67)** – zrcadlový graf příjmy◀▶výdaje, sloupcový graf sald s Ø linkou, interaktivní tooltipy (dotyk i myš).
- **Statistiky → Vše jako roční tabulka (v8.67)** – sloupce = roky, rozbalitelné podkategorie, sticky první sloupec.
- **TWA ikony pro Google Play (v8.69)** – play-store-icon-512 (ostré rohy), icon-192/512 (zaoblené), maskable (bezpečná zóna 72 %), apple-touch-icon-180, feature-graphic-1024×500.
- **3 vlastní koncepty ikon (mimo release)** – "Tok" (proudy peněz), "Mince v proudu" (Kč symbol), "Puls růstu" (sparkline) – ukázka kreativních směrů, nenasazeno.
- **Rezerva vs. Investice – oddělené vlajky kategorie (v8.70–72)** – 🛟 isSaving / 📈 isInvest, seskupené KAM v modalu Přesun, propojeno do score enginu.
- **Karta půjčky – Přeplatíš/Doplatíš/Zbývá doba (v8.71)** – nový řádek s úroky, datem konce, dobou splácení.
- **Modal Přidat půjčku – přejmenováno a přepočteno (v8.71)** – "Půjčeno – jistina", plán ze Zbývá (funguje i pro rozjeté úvěry), "Celý úvěr vás vyjde na".
- **Avalanche vs. Sněhová koule (v8.71, rozšířeno v8.74)** – slider extra splátky + horizont, graf úroků, graf počtu půjček, tabulka toku peněz.
- **Grafy Dluh vs. Investice + Simulace budoucnosti – přepis (v8.71)** – hex barvy, DPR, osy, legenda, tooltip.
- **Excel FinanceFlow_Vypocty_Skore.xlsx (v8.68, rozšířeno v8.72)** – 4 listy: Limity kategorií, Finanční obraz, Finanční radar, Dluhový stres index – interaktivní výpočty s Milanovými reálnými čísly.
- **Nastavení → Převodní měna (v8.72–73)** – převodník se předvolí na zvolenou měnu; měny 1:1 s Kurzy měn (~33 měn z živých ČNB kurzů).
- **Modal Přesun – reorganizace (v8.72)** – Název/Částka/Datum nahoře jako u ostatních typů, Typ platby + peněženky/KAM pod nimi.
- **Dashboard 5. složka Rozpočet + plné škály (v8.74)** – viz TODO-159.
- **Sumář tabulky Měsíc po měsíci ve Finančním obraze (v8.74)** – řádek Σ za období + Ø/měs.

---

## 📄 CLAUDE_SKILLS.md

> Nová poučení ze Session 15 – pokračování číslování (SKILL 1–4 z dřívějška beze změny).

## SKILL 5 – Jedinečnost vzoru při hromadném replace (KRITICKÉ, z FIX-189)
- Před `src.index(vzor)` / `str_replace` VŽDY ověřit, že se vzor v souboru vyskytuje PRÁVĚ JEDNOU – jinak hrozí zásah do špatného místa.
- Krátké/obecné vzory (např. začátek běžného bloku kódu jako `const baseIncome = computeX(D);`) se mohou opakovat na více místech souboru – najde a upraví se PRVNÍ výskyt, ne ten zamýšlený.
- **Bezpečný postup:** buď (a) použít dostatečně dlouhou/jedinečnou kotvu (celý blok, ne jen první řádek), nebo (b) `grep -c` nejdřív ověřit počet výskytů, nebo (c) po editaci vždy zkontrolovat, že se smazalo/přidalo jen tolik řádků, kolik bylo zamýšleno.
- `node --check` NEODHALÍ smazání celé funkce, pokud zbylý kód zůstane syntakticky validní – nutná i funkční kontrola (grep na název funkce, počet řádků souboru před/po).

## SKILL 6 – Směr metriky (šipka) vs. hodnocení metriky (dobře/špatně) jsou DVĚ VĚCI (z FIX-191)
- Nikdy neposílat "obrácenou" hodnotu (`-trend`) jen proto, aby vyšlo správně binární hodnocení (`good`/`bad`) – rozbije to zobrazení SKUTEČNÉHO směru (šipka nahoru/dolů).
- Vždy držet dvě oddělené proměnné: `rawTrend` (fakt, co se stalo – pro šipku/text) a `good`/`isPositive` (interpretace, jestli je to žádoucí – pro barvu/emoji). Render čte OBĚ nezávisle.

## SKILL 7 – Sdílené výpočetní helpery pro metriky používané na více místech (z FIX-188)
- Pokud se stejná metrika (např. měsíční splátky dluhů, efektivní příjem) počítá na 3+ místech v kódu, HNED při druhém výskytu extrahovat do jedné sdílené funkce v `helpers.js`.
- Duplicitní implementace se v čase nenápadně rozejdou (jedna zohlední `installments`, druhá ne) → stejná metrika ukazuje jiná čísla na různých obrazovkách, což uživatel odhalí jako "chybu", ale je to symptom architektury.

## SKILL 8 – Sémantika agregační funkce musí sedět se směrem metriky (z FIX-187)
- `getActual()` sčítá VÝDAJE. Pokud metrika potřebuje PŘÍJMY (pasivní příjem, diverzifikace zdrojů), NIKDY nepoužívat `getActual` jen proto, že "vypadá podobně" – vytvořit zrcadlový helper (`getIncActual`).
- Tichý důsledek špatné volby: metrika nespadne s chybou, jen vždy vrátí 0 nebo zavádějící číslo (Financial Freedom Ratio bylo měsíce "rozbité", aniž by appka cokoliv hlásila).

## SKILL 9 – Normalizace více škál do jedné zobrazované škály
- Když se kombinují dílčí skóre s RŮZNÝMI maximy (0–75, 0–100, 0–50, 0–35...) do jednoho čísla 0–100, počítat `rawTotal / rawMax * 100` — NIKDY netvrdě předpokládat součet = 100.
- Vracet z výpočetní funkce jak `rawTotal`/`rawMax` (pro transparentnost a ladění), tak normalizovaný `total` (pro zobrazení).
- Render komponent (bar/prsten) by měl číst POMĚR (`c.score/c.max`), ne hardcoded konstantu – pak automaticky funguje při jakékoli změně max hodnot v budoucnu.

## SKILL 10 – Přesun HTML bloku uvnitř souboru → vždy zkontrolovat balanci `<div>`
- Po přesunu bloku (např. transferDetailsBlock pod Částku/Datum) vždy spočítat `<div` vs `</div>` v celém souboru (`src.count('<div')` vs `src.count('</div>')`) – snadno vznikne přebývající nebo chybějící uzávěr při ručním skládání stringů.

## SKILL 11 – GitHub může zaostávat za lokální prací o několik verzí
- Na začátku session VŽDY porovnat `<title>` v `/mnt/project/app.html` (GitHub snapshot) s hlavičkou posledního lokálního souboru z předchozí pracovní složky – pokud se liší, chainovat z LOKÁLNÍ poslední práce, ne z `/mnt/project/`, dokud Milan nepotvrdí, že pushnul.

## SKILL 12 – Změna zdroje bodovacích tabulek vyžaduje audit VŠECH spotřebitelů
- Když se mění výpočetní tabulka (např. z hardcoded 4-skokové na plnou 76řádkovou `_SCORING`), vždy vyhledat grep-em VŠECHNA místa, která starou tabulku používala (Dashboard, Měsíční report, Bankovní hodnocení, Dluhový stres index) – nestačí opravit jen to místo, na které se uživatel zeptal.

---

## 📄 CLAUDE.md

> Aktualizace pravidel a stavu projektu pro příští session.

### Aktuální stav projektu (konec Session 15 / start Session 16)
- **Verze:** v8.74 | **Doména:** financeflow.cz (LIVE) | **Datum:** 2026-07-06
- **GitHub:** `bcmilda/financeflow` (private, branch `dev`) – ⚠️ ověřit, zda Milan pushnul v8.58–v8.74 (18 verzí)
- **Firebase projekt:** `financeflow-a249c` (RTDB europe-west1)
- **Admin UID:** `LNEC8VNB2QPwIv6WWQ9lqgR4O5v1`
- **Cloudflare Worker:** `misty-limit-0523.bc-milda.workers.dev` (AI proxy, model `claude-sonnet-4-6`)
- **JS modulů:** 33 (oproti 25 v dřívějším CLAUDE.md – přibyly: kurzy.js, coicop.js, duplicates.js, offline-sync.js, push.js, worker-push.js, product-db.js, sms-import.js, donate.js, announcements.js, share.js, ai.js, import.js)

### Nová kritická pravidla ze Session 15 (viz CLAUDE_SKILLS.md SKILL 5–12 pro detaily)
- Jedinečnost vzoru před hromadným replace (SKILL 5) – způsobilo kritický produkční výpadek (FIX-189).
- Směr metriky (šipka) vs. hodnocení (dobře/špatně) – vždy dvě oddělené proměnné (SKILL 6).
- Sdílené helpery pro metriky na více místech: `computeMonthlyDebtPayments`, `computeEffectiveIncome`, `getIncActual` (SKILL 7–8).
- Normalizace vícero škál: vracet raw i normalizovanou hodnotu (SKILL 9).
- Balance `<div>` po přesunu HTML bloků (SKILL 10).
- GitHub vs lokální stav – ověřit na začátku session (SKILL 11).
- Audit všech spotřebitelů při změně zdroje výpočtu (SKILL 12).

### Kritická technická pravidla (kumulativně, beze změny ze Session 14 + nová)
- `S` deklarováno jako `let` v app.js — **nikdy `window.S`**.
- Nová pole v `S` musí být explicitně v `saveToFirebase` schématu.
- `position:sticky` selže při `overflow:hidden` na ancestor.
- Canvas grafy vyžadují hex barvy (ne CSS `var()`) + DPR škálování.
- Transakce vždy čteny jako `t.amount || t.amt || 0`.
- Split transakce: vždy filtrovat `!t.splitParent`.
- `isTransferTx(t)` vylučuje přesuny ze statistik, ne ze zůstatků peněženek.
- Version bump = title + sidebar + banner + CACHE_NAME + sha256 hashe + VERZE_LOG + hlavičky VŠECH změněných souborů.
- CRLF soubory (Python `io.open(newline='')`): assets.js, push.js, debts.js, premium.js, settings.js, budouci.js, share.js, worker.js, duplicates.js.

### Klíčové helpery ze Session 15 (helpers.js)
```javascript
txCZK(t, D)                    // částka transakce v CZK (amtCZK → fallback toCZK)
getIncActual(catId,sub,m,y,D)  // příjmová obdoba getActual (FIX-187)
computeMonthlyDebtPayments(D)  // sdílené splátky dluhů (FIX-188)
computeEffectiveIncome(D)      // sdílený efektivní příjem (FIX-188)
_SCORING                       // Milanovy plné bodovací tabulky (ADR-085)
msc_S1/msc_DTI/msc_DSTI/msc_S3/msc_S4/msc_BONUS  // lookup funkce nad _SCORING
baseCur()/czkToBase()/fmtB()/fmtBP()  // základní měna (ADR-080)
```

### Otevřené priority pro Session 16
1. **TODO-153** (🟡 P2): Stripe webhook implementace – čeká na Milanovo dodání Payment Link URL + `sk_test_/whsec_` klíčů do Cloudflare Secrets.
2. **TWA Google Play** – ikony hotové (v8.69), zbývá finalizace přes PWABuilder + Play Console upload.
3. Zvážit rozšíření Dluhového stres indexu o plné Milanovy tabulky i pro faktory "počet půjček" a "rizikové typy" (aktuálně vlastní 4-skoková logika, záměrně ponechána kvůli odlišné škále 0–100 kde víc = hůř).
4. **TODO-154** (🟢 P3): MacroDroid parser – odloženo, čeká na TWA nativní řešení.

---

## 📄 architecture.md

> Architektonické změny ze Session 15.

### Nová/rozšířená pole v datovém modelu
```
t.amtCZK: number|null          // zafixovaná CZK hodnota transakce (ADR-079)
c.isSaving: bool               // 🛟 kategorie finanční rezervy (ADR-083)
c.isInvest: bool                // 📈 kategorie aktivního spoření (ADR-083, nové)
S.nakupList[i].inCart: bool    // zaškrtnutí v košíku (ADR-081)
_settings.currency: string      // základní měna (ADR-080)
_settings.convCur: string       // preferovaná převodní měna (v8.72)
d.installments[]               // proměnlivé splátky dluhu (čteno přes computeMonthlyDebtPayments)
```

### Score engine – vrstvy (Session 15 finální stav)
```
helpers.js: _SCORING + msc_*()          // 1) zdroj pravdy – Milanovy tabulky (ADR-085)
premium.js: computeFinancialScore(D)    // 2) Dashboard – plné škály + normalizace 310→100 (TODO-159)
projects.js: computeHealthScores(D,m,y) // 3) Měsíční report – S1/S4 tabulky, Rozpočet původní (TODO-157)
debts.js: renderDebtStressWidget(D)     // 4) Dluhový stres index – DSTI/DTI z tabulek invertované na 0–25
projects.js: bankovní DTI/DSTI karty    // 5) Bankovní hodnocení – body z tabulek zobrazeny přímo
```
Všechny 4 spotřebitelé (2–5) čtou stejné `_SCORING` + sdílené helpery `computeMonthlyDebtPayments`/`computeEffectiveIncome` – žádná duplicitní logika.

### Avalanche/Snowball simulační engine (`_payoffSim`, debts.js, v8.71+v8.74)
```
_payoffSim(strategy, extra, capMonths) → {
  months, totalInterest, curve[], intCurve[],
  aliveCurve[],      // v8.74: počet živých půjček po měsících
  perDebt[],         // v8.74: zůstatek KAŽDÉ půjčky po měsících
  focusCurve[],      // v8.74: na kterou půjčku šly extra peníze daný měsíc
  firstPaidMonth, firstPaidName,
  paidMonths[]       // v8.74: {name, m} kdy je která půjčka splacená
}
```

### TWA ikony (v8.69)
```
icons/play-store-icon-512.png       // ostré rohy, Play zaoblí sám
icons/icon-192.png, icon-512.png    // zaoblené, manifest.json
icons/icon-maskable-192/512.png     // bezpečná zóna 72 %
icons/apple-touch-icon-180.png
icons/feature-graphic-1024x500.png  // Google Play listing
```

---

## 📄 explanations.md

> Technické vysvětlivky ze Session 15.

### Proč Dashboard skóre normalizuje 310 → 100 (TODO-159)
Milanovy tabulky mají různá maxima (S1=75, S2=DTI60+DSTI40=100, S3=50, S4=35). Přidáním 5. složky Rozpočet (0–50) vzniklo teoretické maximum 310 bodů (+ bonus 30 v rámci stropu). Aby prsten a "grade" fungovaly na intuitivní škále 0–100, počítá se `total = round(rawTotal/rawMax*100)`. Komponenty se ale ZOBRAZUJÍ ve svých PŮVODNÍCH maximech (např. "37/75"), aby uživatel viděl přesně kde v Milanově tabulce stojí.

### Proč Dluhový stres index NEpoužívá plné Milanovy tabulky přímo
Stres index má OPAČNOU sémantiku – vysoké skóre = špatně (riziko), zatímco DTI/DSTI tabulky dávají vysoké skóre = dobře (nízké zadlužení). Řešení: `msc_DSTI`/`msc_DTI` se zavolají a INVERTUJÍ: `stresBody = (1 − tabulkovéBody/max) × 25`. Zachovává jemné odstupňování Milanovy tabulky (41/61 řádků) v rámci stresové škály 0–25 na faktor.

### Proč byl Financial Freedom Ratio "navždy nulový" (FIX-187)
`getActual()` je navržený a používaný VŠUDE pro součet VÝDAJŮ dané kategorie v měsíci. FFR potřebuje součet PASIVNÍCH PŘÍJMŮ. Použití stejné funkce na příjmovou kategorii vrátilo 0 (protože žádné výdajové transakce v příjmové kategorii typicky nejsou) – KROMĚ jednoho miléřského případu: kategorie "Finanční úřad" měla výdajovou transakci (daň), která `getActual` sečetl a vydával za "100% příjmu z Finančního úřadu". Odtud matoucí chování na screenshotu Milana.

### Proč se šipka trendu v Měsíčním reportu obarvuje šedě i při velkém růstu (v8.74)
Trend kategorie (např. ↑436 %) je VŽDY meziměsíční změna výdajů, nezávisle na tom, jestli je kategorie v limitu. Dřív byla obarvena vždy červeně při růstu > 5 %, což bylo matoucí, když kategorie držela limit (skóre 100 = zelená). Od v8.74: pokud `inLimit` (zelená/bez limitu), šipka je šedá/informativní; teprve při PŘEKROČENÉM limitu je červená skutečným varováním.

---

*Session 15 KOMPLETNÍ · v8.57 → v8.74 · 18 verzí · 2026-07-02 až 2026-07-06*
*Autor: Milan Migdal + Claude (Sonnet 4.6) · FIX-174–191 · ADR-079–085 · TODO-144–159 · CLAUDE_SKILLS SKILL 5–12*
