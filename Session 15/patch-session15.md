# FinanceFlow – Patch Session 15 (MD-Diff Multi-patch)

> Session 15 · v8.57 → v8.69 · 2026-07-02 až 2026-07-04
> Struktura dle UPDATE_RULES sekce 8 (separátory `## 📄 soubor.md` pro AI Merge).
> Pracovní složka: `/home/claude/s15/` a `/home/claude/s16/`
> Témata: Zafixovaný kurz transakcí v cizí měně, základní měna uživatele (CZK/EUR/USD/GBP/PLN),
> přesun mezi měnami, duplicity v základní měně, automatické limity kategorií, grafy Finančního obrazu,
> Stripe napojení (webhook infrastruktura), ikony TWA, opravy UX.

---

## 📄 bugs.md

> Nové bugy a opravy ze Session 15 (v8.57 → v8.69).

### FIX-174 · Editace transakce nevyplňovala peněženku ani typ platby **(Session 15, v8.58)**
- **Příčina:** `editTx()` v `ui.js` nevolal `populateTxWalletSelect()` / `populateTxPayTypeSelect()` → selecty zůstaly na „– výchozí –" / „– nevybráno –" i když transakce peněženku měla.
- **Oprava:** `editTx()` naplní oba selecty a nastaví hodnoty `t.wallet` / `t.payType`.
- **Soubor:** `ui.js`

### FIX-175 · Duplicitní detekce ignorovala měnu **(Session 15, v8.58)**
- **Příčina:** `detectDuplicates()` porovnávalo surové `t.amount` → 900 Kč a 900 GBP byly „stejná částka".
- **Oprava:** Porovnání v základní měně přes `txCZK()`. Tolerance 1 Kč (živý kurz u starých transakcí).
- **Soubor:** `duplicates.js`
- **🔗 Cross-reference:** `decisions.md` ADR-079

### FIX-176 · Přesun mezi peněženkami s různou měnou nepřeváděl částku **(Session 15, v8.59)**
- **Příčina:** Transfer větev `saveTx` pushovala txOut i txIn se STEJNOU surovou částkou → 100 EUR → 100 Kč místo ~2 530 Kč.
- **Oprava:** Při různých měnách peněženek zobrazí pole „Připsat do cílové peněženky" s křížovým kurzem ČNB. Cílová noha v měně cílové peněženky, obě nohy nesou `amtCZK`.
- **Soubory:** `debts.js`, `app.html`
- **🔗 Cross-reference:** `decisions.md` ADR-079

### FIX-177 · Kč-only limit kategorie nefungoval **(Session 15, v8.63)**
- **Příčina:** Chybějící `healthPct` dávalo `limitByPct = 0` → `min(0, Kč) = 0` → engine vyhodnotil „bez limitu" → zelený bar a skóre 75. Kč strop tedy ve skutečnosti nic neomezoval.
- **Oprava:** `limitByPct` je nyní `Infinity` pokud `healthPct` není vyplněno (ne 0). Kč strop funguje samostatně. U spoření funguje Kč jako minimum. Když jsou % i Kč, platí přísnější.
- **Soubor:** `projects.js`

### FIX-178 · Přesuny zahrnuty v denních sumářích transakcí **(Session 15, v8.65)**
- **Příčina:** Denní hlavičky a souhrnný badge v Transakcích nezahrnovaly filtr `isTransferTx` → přesuny (převody i vklady do investic) se sčítaly jako výdaje.
- **Oprava:** Denní sumy i badge filtrovány přes `_statTx(t)` (bez přesunů, split rodičů, vyrovnání).
- **Soubor:** `ui.js`

### FIX-179 · Zaškrtnutí položky v Nákupním seznamu shodilo appku **(Session 15, v8.67)**
- **Příčina:** Lišta „V košíku X z Y" odkazovala na proměnnou `total` z jiné funkce mimo scope → `total is not defined`, crash při překreslení.
- **Oprava:** Nahrazeno `_nakupItems.length`.
- **Soubor:** `nakup.js`

### FIX-180 · Převodník měn se zasekl při editaci transakce **(Session 15, v8.68)**
- **Příčina:** `editTx()` nespouštělo `updateTxCurrency()` → převodník ukazoval „≈ 0 Kč" nebo hodnotu z předchozího modalu.
- **Oprava:** `editTx()` volá `updateTxCurrency()` po nastavení selectů.
- **Soubor:** `ui.js`

### FIX-181 · Šipky řazení kategorií přeskakují v sekci Příjmy **(Session 15, v8.68)**
- **Příčina:** Sekce Příjmy je u horního okraje stránky – scroll se neměl kam posunout (clamp) → kurzor skončil nad jinou kategorií a další klik posunul špatnou kartu.
- **Oprava:** Detekce clampu + dočasné zvýraznění (outline 0,7 s) přesunuté karty.
- **Soubor:** `stats.js`

---

## 📄 decisions.md

> Nová architektonická rozhodnutí ze Session 15 (ADR-079–082).

### ADR-079 · Zafixovaný kurz transakce v cizí měně (`amtCZK`) **(Session 15, v8.58)**
- **Datum:** 2026-07-02
- **Rozhodnutí:** Transakce v cizoměnové peněžence se při vložení/editaci zafixují na kurz z okamžiku vložení. Pole `amtCZK` ukládá skutečnou hodnotu v Kč (kurz banky). Jednou uložená hodnota se NIKDY nepřepočítává živým kurzem.
- **Důvod:** Živý přepočet měnil historické součty s každou změnou kurzu a neodpovídal skutečně strženým částkám. Kurz banky ≠ kurz ČNB.
- **Priorita čtení (`txCZK(t, data)` v helpers.js):** 1) `t.amtCZK` (zafixováno) → 2) CZK peněženka → `amount` → 3) cizí peněženka bez fixace → fallback živým kurzem `toCZK`.
- **Rozsah:** běžné transakce, splátky dluhů, vklady do aktiv (Přesun → Investice). `amtCZK: null` u CZK peněženky → Firebase klíč smaže.
- **Status:** ✅ Nasazeno v8.58

### ADR-080 · Základní měna uživatele – zobrazovací vrstva **(Session 15, v8.60)**
- **Datum:** 2026-07-02
- **Rozhodnutí:** Uživatel si v Nastavení → Lokalizace vybere základní měnu (CZK/EUR/USD/GBP/PLN). Interní kanonická měna zůstává CZK (amtCZK, rozpočty, cíle – žádná migrace dat). Základní měna je ZOBRAZOVACÍ vrstva: CZK hodnoty se před zobrazením převedou živým kurzem ČNB a dostanou symbol měny.
- **Nové helpery v helpers.js:** `baseCur()`, `baseRate()`, `czkToBase(v)`, `curSym()`, `fmtB(v)`, `fmtBP(v)`.
- **Rozsah fáze 1 (v8.60):** dashboard karty, transakce (denní hlavičky, badge, ≈ poznámky), bublinové grafy, donut statistik, měsíční souhrny a tabulky v grafech, nadcházející platby.
- **Rozsah fáze 2 (v8.61):** Projekty, Dluhy, Aktiva, Banka, Kalendář, Budoucí platby, AI Poradce, Nákupní DNA, Radar, canvas grafy.
- **Záměrně zůstává v Kč/měně peněženky:** vstupní pole, reálné ceny produktů, ceny předplatného, SMS parsery, AI prompty.
- **Status:** ✅ Nasazeno v8.61

### ADR-081 · Zaškrtávací nákupní seznam (inCart) **(Session 15, v8.62)**
- **Datum:** 2026-07-02
- **Rozhodnutí:** Nákupní seznam rozšířen o stav `inCart: bool` per položka. Zaškrtnutí ztlumí kartu, přeškrtne název a zařadí dolů. Lišta „V košíku X z Y" + tlačítko Vysypat košík. Stav synchronizován přes Firebase.
- **Status:** ✅ Nasazeno v8.62

---

## 📄 todo.md

> Nové a dokončené úkoly ze Session 15.

### TODO-144 · Měny podle základní měny uživatele ✅ DOKONČENO (fáze 1+2) **(Session 15, v8.58–v8.61)**
- **Řešení:** Zafixovaný kurz při vložení (`amtCZK`, ADR-079) + zobrazovací základní měna (ADR-080). Základní měna CZK/EUR/USD/GBP/PLN.

### TODO-145 · Duplicitní detekce ignoruje měnu ✅ DOKONČENO **(Session 15, v8.58)**
- **Viz FIX-175** – porovnání přes `txCZK`.

### TODO-146 · Denní sumář sčítá cizí měnu bez převodu ✅ DOKONČENO **(Session 15, v8.58)**
- **Viz FIX-178** – `incSum`/`expSum`/`getActual` + denní hlavičky přes `txCZK`.

### TODO-147 · Graf vývoje cen pod tabulkou Zdražování ✅ DOKONČENO **(Session 15, v8.58)**
- **Implementace:** SVG interaktivní graf (top 5 položek dle změny), osy Kč/ks a datum, legenda s %, tooltip (datum · cena · obchod). Compute/render odděleno.
- **Soubor:** `receipts.js`

### TODO-148 · Historický kurz vkladu do aktiv ✅ DOKONČENO **(Session 15, v8.58)**
- **Vyřešeno** zafixovanou `amtCZK` – vklad nese kurz z okamžiku vložení. `syncInvestmentAssets` i `assetDepositEvents` preferují `amtCZK`.

### TODO-149 · Přesun mezi peněženkami s různou měnou ✅ DOKONČENO **(Session 15, v8.59)**
- **Viz FIX-176** – editovatelná cílová částka s křížovým kurzem ČNB.

### TODO-150 · Základní měna uživatele – nastavení ✅ DOKONČENO **(Session 15, v8.60–v8.61)**
- **Viz ADR-080.** 5 měn: CZK/EUR/USD/GBP/PLN. CHF a HUF vynechány (nejsou v nabídce jazyků).

### TODO-151 · Základní měna – fáze 2 (zbývající moduly) ✅ DOKONČENO **(Session 15, v8.61)**
- **Pokryto:** Projekty, Dluhy, Aktiva, Banka, Kalendář, Budoucí platby, AI Poradce, Nákupní DNA, Radar, canvas grafy (ticky os, tooltipy).

### TODO-152 · Automatické rozdělení limitů kategorií **(Session 15, v8.63–v8.64)**
- **Implementace:** Nový krok v checklistu dashboardu „🎯 Nastav limity kategorií". Modal navrhne % limity (2 desetinná místa) podle skutečných výdajů za 3 měsíce / základu příjmu. Bez historie: ČSÚ COICOP průměrná útrata CZ domácnosti (obálka 80 %). Po 3 měsících přepočet ze skutečných dat.
- **Status:** ✅ Nasazeno v8.64

### TODO-153 · Stripe webhook a Premium tier infrastruktura **(Session 15, 🟡 P2, otevřeno)**
- **Popis:** Stripe sandbox nastaven (Product 149 Kč/měs, Payment Link, Webhook endpoint na Cloudflare Worker `/stripe-webhook`). Chybí: implementace webhooku v `worker.js`, vložení URL do `donate.js`, zámky `hasPremiumAccess`. Webhook secret (`whsec_...`) + Stripe API klíč + Firebase DB Secret → Cloudflare Secrets.
- **Stav:** Stripe Dashboard nakonfigurován, kód netestován.
- **🔗 Cross-reference:** `decisions.md` ADR-053 (Stripe), `bugs.md` OPEN-033

### TODO-154 · MacroDroid parser bankovních notifikací **(Session 15, 🟢 P3, odloženo)**
- **Popis:** Notifikace z bankovní appky → MacroDroid HTTP POST → Worker `/notify-parse` → `txCZK` zpracování → fronta v Firebase. Odloženo – funguje jen pro power-usery (ne masové nasazení). Pro všechny uživatele správná cesta je TWA s nativním přístupem k notifikacím.
- **Stav:** Navrženo, neimplementováno.

---

## 📄 features.md

> Nové a aktualizované funkce ze Session 15.

### Zafixovaný kurz transakce v cizí měně (ADR-079) **(v8.58)**
Při výběru cizoměnové peněženky se v modalu pod Částkou zobrazí pole „Skutečně v Kč" – předvyplněné kurzem ČNB, editovatelné (každá banka má jiný kurz). Uloží se do `t.amtCZK`, nikdy se nepřepočítává. Label částky ukazuje měnu peněženky (ČÁSTKA (EUR)). U cizoměnového řádku v seznamu se zobrazí „≈ X Kč".

### Přesun mezi peněženkami s různou měnou (FIX-176) **(v8.59)**
Modal Přesun: při různých měnách peněženek zobrazí „Připsat do cílové peněženky (X)" s křížovým kurzem ČNB, editovatelné. Cílová noha v měně cílové peněženky.

### Základní měna uživatele – CZK/EUR/USD/GBP/PLN (ADR-080) **(v8.60–v8.61)**
Nastavení → Lokalizace → Výchozí měna. Interní data zůstávají v CZK, zobrazení se přepočítává kurzem ČNB. Pokrývá celou appku (dashboard, transakce, grafy, aktiva, projekty, dluhy, AI, radar…). Změna měny se projeví okamžitě po uložení nastavení.

### Zadávání v základní měně (ADR-080 doplnění) **(v8.62)**
Výchozí peněženka + základní měna ≠ CZK → label ČÁSTKA (EUR), zadává se v základní měně. Pole „Skutečně v Kč" nese přepočet (editovatelný). Editace vrátí částku zpět v základní měně bez kurzovního driftu.

### Zaškrtávací nákupní seznam (ADR-081) **(v8.62)**
Zaškrtávátko na kartě položky: ztlumení, přeškrtnutí, řazení dolů. Lišta „🛒 V košíku X z Y" + Vysypat košík. Firebase sync.

### Graf Finanční simulace života – přepis **(v8.62)**
Canvas rewrite: barevné scénáře (šedý/zelený/modrý čárkovaný), legenda nahoře (nekryje se s osou X), popisky os (Věk/Majetek v základní měně), DPR škálování (ostré na mobilu), tooltip 3 scénáře (myš i dotyk).

### Automatické rozdělení limitů kategorií **(v8.63–v8.64)**
Dashboard checklist → modal: % limity z dat za 3 měsíce / základu příjmu. Bez historie: ČSÚ COICOP průměrná útrata. Živý součet „zbývá X % do 100 %". Krok 0,01 v poli %. Modal kategorie: popisek „Max % ze základu příjmu", info o zbývajícím % (live).

### Grafy Finančního obrazu (Inflace životního stylu + Wealth Momentum) **(v8.66–v8.67)**
Inflace životního stylu: zrcadlový SVG graf příjmy ◀ | ▶ výdaje, 3 stavy (červený/žlutý/zelený). Wealth Momentum: sloupcový SVG graf sald s Ø linkou, interaktivní tooltipy (dotyk i myš), popisky hodnot uvnitř vysokých sloupců (nekryjí osu). Tabulka „Měsíc po měsíci" doplněna o sloupce Úspory a Dluh.

### Statistiky → Vše jako roční tabulka **(v8.67)**
Režim „Vše" přepracován na tabulku kategorie × roky (sticky první sloupec, rozbalitelné podkategorie, řádek Celkem) – stejný formát jako Rok.

### TWA ikony pro Google Play **(v8.69)**
Sada ikon z předlohy icon_FINAL.png: play-store-icon-512 (ostré rohy), icon-192/512 (zaoblené), icon-maskable-192/512 (adaptivní, bezpečná zóna 72 %), apple-touch-icon-180, feature-graphic-1024×500 (Google Play listing). `manifest.json` aktualizován na skutečné PNG místo emoji placeholderu.

---

### ADR-082 · Hlavičky JS souborů při version bumpu **(Session 15)**
- **Datum:** 2026-07-02
- **Rozhodnutí:** Při každém version bumpu se aktualizují hlavičky VŠECH změněných souborů ve formátu: `// FinanceFlow · vX.XX · soubor.js · YYYY-MM-DD`. Platí pro JS moduly, `sw.js`, `worker.js` a `database_rules.json`.
- **Status:** ✅ Pravidlo platí od v8.59

---

## 📄 CLAUDE.md

> Aktualizace pravidel a stavu projektu pro příští session.

### Aktuální stav projektu (Session 16 start)
- **Verze:** v8.69 | **Doména:** financeflow.cz (LIVE) | **Datum:** 2026-07-04
- **GitHub:** `bcmilda/financeflow` (private, branch `dev`)
- **Firebase projekt:** `financeflow-a249c` (RTDB europe-west1)
- **Admin UID:** `LNEC8VNB2QPwIv6WWQ9lqgR4O5v1`
- **Cloudflare Worker:** `misty-limit-0523.bc-milda.workers.dev` (AI proxy, model `claude-sonnet-4-6`)
- **JS modulů:** 33 (přidány: `kurzy.js`, `coicop.js`, `duplicates.js`, `offline-sync.js`, `push.js`, `product-db.js`, `sms-import.js`, `donate.js`, `announcements.js`, `share.js` vs. 25 v CLAUDE.md)

### Kritická technická pravidla doplněná v S14–S15
- `S` je deklarováno jako `let` v app.js — **nikdy `window.S`** (tiché blokování sync aktiv)
- `position:sticky` selže pokud má ancestor `overflow:hidden`
- Nová pole v `S` musí být explicitně v `saveToFirebase` nebo je Firebase sync smaže
- CSS `var()` nefunguje v canvas kontextu → vždy hex barvy
- `computeNetWorth` kolize: `premium.js` = `computeNetWorth`, `assets.js` = `computeAssetsNetWorth` — NIKDY nepřejmenovávat
- CRLF soubory (assets.js, push.js, debts.js, premium.js, settings.js, budouci.js, share.js, worker.js): editovat přes Python `io.open(newline='')`
- Transakce: vždy číst jako `t.amount || t.amt || 0`
- Split transakce: vždy filtrovat `!t.splitParent` ze všech agregací
- `isTransferTx(t)` vylučuje přesuny ze statistik ale ne ze zůstatků peněženek
- Version bump = 4 kroky: title + sidebar + banner + CACHE_NAME v sw.js + sha256 hashe v app.html + VERZE_LOG v admin.js + hlavičky změněných souborů (od v8.59)

### Otevřené priority pro Session 16
1. **TODO-153** (🟡 P2): Stripe webhook implementace (`worker.js` + `donate.js` + Premium zámky)
2. **Testování zafixovaného kurzu** v produkci – ověřit `amtCZK` v reálných transakcích
3. **TWA Google Play** – finalizace balíčku přes PWABuilder, assetlinks.json, Play Console upload
4. **TODO-154** (🟢 P3): MacroDroid notifikační parser – odloženo na pozdější fázi

---

## 📄 architecture.md

> Architektonické změny ze Session 15.

### Nová pole v datovém modelu **(Session 15)**

#### Transakce – nové pole `amtCZK`
```
t.amtCZK: number | null
  = zafixovaná hodnota transakce v CZK (kurz banky z okamžiku vložení)
  = null u CZK peněženky (Firebase klíč se smaže)
  = null u starých transakcí bez fixace (fallback živý kurz via toCZK)
Priorita: t.amtCZK ?? toCZK(t.amount, walletCur) ?? t.amount
```

#### Nákupní seznam – nové pole `inCart`
```
S.nakupList[i].inCart: bool
  = true pokud uživatel zaškrtl „mám v košíku"
  = false / undefined = v seznamu (výchozí)
```

### Nové helpery v helpers.js **(Session 15, ADR-080)**
```javascript
txCZK(t, data)     // částka transakce v CZK (amtCZK → fallback toCZK)
baseCur()          // základní měna z _settings.currency ('CZK'|'EUR'|...)
baseRate()         // Kč za 1 jednotku základní měny (z _FX_RATES)
czkToBase(v)       // v CZK → v základní měně (v / baseRate)
curSym(c?)         // symbol měny ('Kč'|'€'|'$'|'£'|'zł')
fmtB(v)            // fmt(czkToBase(v)) + ' ' + curSym()
fmtBP(v)           // fmtP(czkToBase(v)) + ' ' + curSym()
```

### Sada ikon pro TWA/Google Play **(Session 15, v8.69)**
```
icons/
  play-store-icon-512.png  – 512×512 ostré rohy (Play si zaoblí sám)
  icon-192.png             – 192×192 zaoblené (telefon/manifest)
  icon-512.png             – 512×512 zaoblené (telefon/manifest)
  icon-maskable-192.png    – 192×192 bezpečná zóna 72 % (adaptivní Android)
  icon-maskable-512.png    – 512×512 bezpečná zóna 72 %
  apple-touch-icon-180.png – 180×180 pro iOS plochu
  feature-graphic-1024x500.png – Google Play listing banner
```

---

## 📄 explanations.md

> Technické vysvětlivky ze Session 15.

### Vzor: txCZK — částka transakce v základní měně **(Session 15)**
Všechny nové agregace čtou částku přes `txCZK(t, D)` (helpers.js, globální `window.txCZK`):
```
txCZK(t, D):
  1) t.amtCZK != null  → zafixovaná hodnota (kurz banky)
  2) CZK peněženka / bez peněženky → t.amount||t.amt||0
  3) cizí peněženka bez fixace → toCZK(amount, měna)  // fallback pro staré tx
```
**Kdy NEpoužívat txCZK:** průběžný zůstatek peněženky (v měně peněženky), zobrazení částky v řádku.

### Vzor: Skóre kategorie (0–100) a Finanční obraz **(Session 15)**
Plná dokumentace s interaktivním výpočtem v `FinanceFlow_Vypocty_Skore.xlsx` (3 listy: Limity kategorií, Finanční obraz, Finanční radar). Soubor vygenerován v Session 15 pro ověření shody kódu a dokumentace.

### Chování checkboxu Spoření/investic **(Session 15)**
Checkbox 🐷 v modalu kategorie se zobrazuje **výhradně u typu Přesun**. U výdajů a příjmů nedává smysl. Uložené hodnoty starých kategorií zůstávají funkční (neviditelné, ale aktivní). Přesuny do spořicích/investičních kategorií se počítají do skóre S4 (Aktivní spoření).

---

*Session 15 · v8.57 → v8.69 · 2026-07-02–04 · Autor: Milan Migdal + Claude (Sonnet 4.6)*
*Verze sesssion: FIX-174–181, ADR-079–082, TODO-144–154, feature: txCZK, baseCur, fmtB, nakup inCart, ikony TWA*
