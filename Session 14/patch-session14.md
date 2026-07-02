# 🔧 Patch Session 14 — FinanceFlow (v8.27 → v8.57)

> Formát: MD-Diff multi-patch pro AI Merge. Každá sekce `## 📄 soubor.md` se připojí (append) k odpovídajícímu konsolidovanému dokumentu.
> Datum: 2026-06-26 až 2026-06-29 · Pracovní jazyk: čeština
> Verze: v8.27 → **v8.57** (31 verzí) · Navazuje na: FIX-159, OPEN-034, TODO-143, ADR-074
> Hlavní témata: Kurzy měn (ČNB), COICOP detailní DNA, Excel filtr Období, Swipe gesta (ADR-075), Propojení Transakce→Aktiva (ADR-076), přepracování Finančních aktiv do 4 sekcí + likvidita kategorií, řada oprav.

---

## 📄 bugs.md

### FIX-160 · KRITICKÝ — Přesun→Investice se nepropisoval do aktiv **(v8.49→v8.56)**
Synchronizace aktiv z přesunových transakcí (`syncInvestmentAssets`) se **nikdy nespustila**. Kód používal `window.S`, jenže `S` je deklarované jako `let S` (app.js:401) → není vlastností `window` → `window.S` bylo `undefined` a guard `if(!window.S) return;` funkci hned ukončil. Stejná příčina blokovala tlačítko „Přepojit" (alert „Data nejsou načtena"). Opraveno záměnou `window.S` → `S` na 3 místech (assets.js). Od té chvíle se aktiva z přesunů tvoří automaticky. **Diagnostika:** neprůstřelné tlačítko „🔄 Přepojit" (try/catch + vždy alert s výpisem) v Aktivech.

### FIX-161 · Avatary v profilu nešly vybrat **(v8.56)**
`renderAvatarPicker()` resetoval `_selectedAvatar` na uloženou hodnotu při KAŽDÉM překreslení. Protože `selectAvatar()` po kliknutí volá `renderAvatarPicker()`, výběr se okamžitě přepsal zpět → klik vypadal jako nefunkční. Fix: inicializace `_selectedAvatar` pouze při otevření modalu (`openProfileModal`), ne v renderu.

### FIX-162 · Tagy u transakcí — dědění a nemazatelnost **(v8.55)**
Dva bugy: (1) `openAddTx` nečistil pole `txTags` → nová transakce dědila tagy z předchozí. (2) Uložení zapisovalo tagy jen `if(tags.length)` → smazání všech tagů při editaci se nepropsalo (`Object.assign` je nepřepsal, staré zůstaly). Fix: openAddTx pole vyčistí; save zapisuje `txObj.tags = tags` vždy (i prázdné).

### FIX-163 · Web ztratil akční tlačítka po skrytí pro mobil **(v8.51→v8.53)**
Skrytí ✂✎✕📷 v landscape tabulce (pro swipe na mobilu) omylem skrylo tlačítka i na webu (myš), kde swipe nejde. Fix: detekce vstupu přes `matchMedia('(pointer: coarse)')` — dotyk = swipe + skrytá tlačítka; myš (web) = tlačítka viditelná.

### FIX-164 · Sticky hlavička tabulky transakcí nefungovala **(v8.50→v8.53)**
`position:sticky` na `.tx-table-head` neúčinkovalo — rodičovská `.card` má `overflow:hidden`, což sticky ruší (hlavička odscrollovala pryč a karta ji ořízla). Fix: `#txCard{overflow:visible}` + správný offset `top:54px` pod topbar.

### FIX-165 · Swipe „Upravit" u účtenky otevíral špatnou akci **(v8.48→v8.50)**
Swipe volal `editTx` (obecná editace transakce) → dvojí chování (jednou rozbalení položek, jednou edit okno). Opraveno na `openReceiptInHistory(receiptDate, receiptStore)` — otevře konkrétní naskenovanou účtenku v Historii (jak to fungovalo dřív).

### FIX-166 · Kurzy měn zamrzlé **(v8.50)**
Klient si odpověď Workeru `/cnb` cachoval v prohlížeči (`cache:'default'`, Worker bez `Cache-Control`). Fix: klient vždy `cache:'no-store'`; Worker vrací `Cache-Control:no-cache` + edge cache 30 min. Pozn.: o víkendu a v pracovní den před ~14:30 ČNB drží kurz z předchozího dne — to je korektní, ne chyba.

### FIX-167 · Zelené tagy v landscape ořezané na 1 písmeno **(v8.52)**
Tagy se v tabulkovém (landscape) zobrazení vykreslovaly v úzké buňce „Název" (~40 px, `overflow:hidden`) → každý tag ořezán na emoji + první písmeno. Fix: v landscape se tagy vykreslují jako pruh přes celou šířku pod řádkem. Portrait (karta) beze změny.

### FIX-168 · Zdražování — chybná cena/kg u vážených položek **(v8.46)**
Přepočet Kč/kg dělil `unitPrice/(unitInfo.value*qty)`. Fix: vážené položky (`unit==='kg'/'l'`) používají cenu přímo, kusové `unitPrice/unitInfo.value` bez ×qty (Rohlík 43 g: 2,90 → 67,4 Kč/kg).

### FIX-169 · Kurzy — připnuté měny mizely **(v8.46)**
Piny byly v `S.pinnedFx`, které není v uloženém schématu → Firebase sync je smazal. Přesunuto do `localStorage` (`ff_pinnedFx`). Tlačítko „Obnovit" odebráno (ČNB denně).

### FIX-170 · COICOP 3. úroveň v nesprávném formátu **(v8.46)**
`_coicopClass` produkoval „01.11" místo „01.1.1" → neshoda s klíči tabulky. Opraveno na formát „01.1.1".

### FIX-171 · Šipky přesunu kategorie v „Příjem i výdaj" **(v8.45)**
`moveCatUp/Down` prohazovaly sousedy v surovém poli, ale po přeskupení podle typu byly prohození neviditelná. Fix: prohození v rámci STEJNÉ sekce (typu) přes `_catSection(c)`, `isFirst/isLast` dle indexu ve skupině; scroll-kompenzace udrží tlačítko pod kurzorem.

### FIX-172 · GA4 sbíral data bez souhlasu **(v8.44)**
app.html nemělo consent mode → GA4 sbíralo data bez souhlasu. Přidáno `gtag('consent','default',{analytics_storage:'denied'})` + grant dle uloženého souhlasu (`ff_cookie_analytics`), řízeno přepínačem v Oznámení→Soukromí.

### FIX-173 · Ořez názvu položky v „Nejčastěji nakupované" **(v8.44)**
Grid `1fr` + `nowrap/ellipsis` ořezával dlouhé názvy. Fix: `minmax(0,1fr)` + `word-break:break-word`.

---

## 📄 features.md

### Propojení Transakce → Finanční aktiva podle podkategorie (ADR-076) **(v8.49)**
Přesun do přesunové kategorie (typ `transfer`) se propisuje do aktiva pojmenovaného podle PODKATEGORIE (ETF, Fondy, Akcie…), ne podle kategorie. Klíč `catId::subcat` (`linkedKey`). Vklady v cizí měně převod na CZK dle živých kurzů ČNB (`_FX_RATES` dle měny peněženky `t.wallet`). Ruční tržní hodnota se zachovává, další vklad se přičítá: `value = valueBaseline + (invested − investedAtBaseline)`. Existující ručně vytvořené aktivum stejného jména se ADOPTUJE (napojí, hodnota zůstane). Smazané napojené aktivum se neobnovuje (`S.noSyncKeys`, persistováno do Firebase).

### Finanční aktiva — 4 sekce + Net Worth 5 karet **(v8.54)**
Přepracováno do sekcí: 👛 Peněženky · 🛟 Finanční rezerva · 📈 Střednědobá a investiční · 🏠 Fyzická a dlouhodobá. Net Worth nahoře = 5 responzivních karet (Peněženky, Fin. rezerva, Střednědobá, Fyzická, Závazky) místo 3 velkých + 3 malých. Sekce se určuje přes `assetTier(a)` (viz ADR-077).

### Likvidita u přesunových kategorií **(v8.54)**
Přesunová kategorie má „Likviditu aktiva" (🛟 likvidní rezerva / 📈 střednědobé / 🏠 dlouhodobé), volíš v Uprav kategorii u typu Přesun (`catLiq`). Řídí, do které sekce Finančních aktiv přesun spadne. Bez nastavení se odvodí z názvu (rezerva/spoření→rezerva, investice/fondy→střednědobé, penzijko→dlouhodobé).

### Historie hodnoty aktiva — vklady z transakcí + graf **(v8.57)**
Historie hodnoty investičního aktiva zobrazuje i VKLADY z transakcí (📥, read-only, bez tlačítka X — jsou dané z Transakcí) vedle ručních ocenění (📊, mazatelná). Graf vývoje (hodnota vs vloženo) se ukáže i s jedním ručním oceněním, protože do řady vstupují i vklady (kumulativně); práh `ocenění + vklady ≥ 2`. Helper `assetDepositEvents(asset)`.

### Kurzy měn — záložka + živé ČNB **(v8.36)**
Nový modul `kurzy.js` + Worker endpoint `/cnb` (parsuje denní kurzovní lístek ČNB). Záložka „Kurzy měn" (30 měn, hvězdička připne nahoru, uloženo v localStorage). Živé kurzy napájejí `_FX_RATES` (přepočty peněženek, aktiv, cílů) i převodník u zadávání transakce.

### COICOP detailní DNA (fáze 1–4) **(v8.37→v8.40)**
Nový modul `coicop.js` — rozpad výdajů dle klasifikace COICOP (13 divizí, podtřídy 01.1, třídy 01.1.1) z `product-groups.json` (402 tříd) přes `productGroupLookup`. Rozpad, karty, a tag filtr v „Nejčastěji nakupované položky".

### Excel filtr Období v Transakcích **(v8.41)**
Tlačítko „📅 Období" (a ikona 🔽 u sloupce DATUM) otevře panel: dropdown roku (vč. „Všechny roky") + zaškrtávací měsíce → filtr přes více měsíců i „leden napříč všemi roky". `_txDateFilter` přepíše výběr měsíce jen v renderTx; navigace měsíce filtr zruší.

### Swipe-to-edit u účtenek + akce na mobilu (ADR-075) **(v8.48→v8.51)**
Účtenkové transakce: swipe doleva → „Upravit" (otevře naskenovanou účtenku). V landscape/mobil skryta tlačítka ✂✎✕📷 (překlik), na webu (myš) zůstávají. Delegovaný touch handler `_txSwipeInit`.

### Přepojit + diagnostika ve Finančních aktivech **(v8.53)**
Tlačítko „🔄 Přepojit" — znovu propojí aktiva z přesunových transakcí, odblokuje dříve smazaná (`noSyncKeys`) a ukáže výpis (počet přesunových kategorií, transakcí po podkategoriích, vytvořených/napojených aktiv). Neprůstřelné (try/catch).

### Admin Růst tab **(v8.43)**
`renderGrowthTab` — 6 souhrnných karet, SVG sloupcový graf registrací (12 měs.), tabulka posledních 30 dní, expirované předplatné. Čte `premium.createdAt/type/premiumUntil`.

### Funkční GDPR cookies **(v8.44)**
Přepínač analytických cookies v Oznámení→Soukromí řídí GA4 `analytics_storage` (granted/denied) + `localStorage ff_cookie_analytics`. Nezbytné cookies uzamčené. Cookie banner na landing page.

### Ostatní **(v8.28–v8.47)**
SW update banner „Nová verze [Aktualizovat]" (v8.42). Pro tier 🚀 (v8.44). Emoji avatary v profilu (v8.35). Peněženky: cizí měna ve vlastním sloupci + čistší písmo tabular-nums (v8.55). Debts/přesuny overhaul, admin Údržba tab (v8.28–v8.34).

---

## 📄 decisions.md

### ADR-075 · Swipe gesta na dotyku, tlačítka na webu **(v8.48, v8.53)**
Na mobilu/tabletu Milan nechce hodně tlačítek. Akce u transakcí (edit/smazat/rozdělit/klonovat) řešit SWIPE gestem (jako Wallet), ne viditelnými tlačítky. Běžné transakce: tap edituje. Účtenkové: swipe doleva → „Upravit" → otevře naskenovanou účtenku (`openReceiptInHistory`). Rozlišení dotyk vs myš přes `matchMedia('(pointer: coarse)')` — na webu (myš) tlačítka zůstávají, protože swipe nejde. Platí pro portrait i landscape.

### ADR-076 · Transakce→Aktiva podle podkategorie, EUR→CZK, baseline model **(v8.49)**
Napojení aktiv podle PODKATEGORIE přesunu (ne kategorie). Vklady v cizí měně převod na CZK dle kurzů ČNB (dle měny peněženky). Ruční tržní hodnota se zachová, další vklad se přičte: `value = valueBaseline + (invested − investedAtBaseline)`. Ručně vytvořené aktivum stejného jména se adoptuje. Per-key blokace smazaných (`S.noSyncKeys`, persistováno). **Pozn.:** převod používá aktuální kurz ČNB, ne historický (data ČNB po dnech nejsou k dispozici).

### ADR-077 · Likvidita přesunové kategorie řídí sekci aktiva **(v8.54)**
Přesunová kategorie nese stupeň likvidity `liq`: `reserve` (finanční rezerva – likvidní), `mid` (střednědobé/investiční), `long` (dlouhodobé/fyzické). `assetTier(a)` řadí aktivum do sekce: napojené aktivum dle `linkedCatId → assetCatLiq`, jinak dle `liqTier`, jinak dle typu (investment→mid, savings→reserve, ostatní→fixed). Bez ručního nastavení se `liq` odvodí z názvu kategorie. Sekce: Peněženky (peněženky), Finanční rezerva (reserve), Střednědobá (mid), Fyzická (fixed).

### ADR-078 · Hodnota investičních aktiv jen přes historii hodnoty **(v8.57)**
U střednědobých/investičních aktiv (`liq==='invest'`) se „Aktuální hodnota" nemění v editaci aktiva — pole je skryté. Hodnota se mění výhradně přes tlačítko 📈 „historie hodnoty" (ruční ocenění) nebo automaticky z vkladů. Zabraňuje kolizi dvou míst zadávání téže hodnoty. U nemovitostí/aut/hotovosti pole v editaci zůstává.

---

## 📄 todo.md

### TODO-144 · Měny podle nastavení uživatele (základní měna) **(otevřeno)**
Zavést uživatelskou základní měnu (Milan: CZK). Hlavní pole částky nahradit polem **Částka + proměnná měna** (Kč/EUR/GBP/USD/PLN…). Všechny součty, denní sumáře i detekce duplicit počítat v základní měně (přepočet cizích peněženek). Do převodníku (zelená částka) přidat i CZK (princip: platím v eurech, chci vidět kolik utrácím v Kč).

### TODO-145 · Duplicitní detekce ignoruje měnu **(otevřeno)**
Detektor duplicit označí 900 Kč a 900 GBP jako podobné (porovnává surovou částku). Po TODO-144 porovnávat v základní měně / s měnou peněženky.

### TODO-146 · Denní sumář sčítá cizí měnu bez převodu **(otevřeno)**
Hlavička dne v Transakcích sčítá např. 900 GBP jako 900 Kč. Řeší se v rámci TODO-144 (přepočet ve všech agregacích).

### TODO-147 · Graf pod tabulkou Zdražování **(otevřeno)**
Interaktivní graf s osami + legendou pod tabulkou Zdražování v Nákupní DNA.

### TODO-148 · Historický kurz vkladu **(volitelné)**
EUR/GBP vklady do aktiv převádí aktuálním kurzem ČNB, ne kurzem z data vkladu. Zvážit uložení „zamčeného" kurzu k datu vkladu (historická data ČNB po dnech nutno doplnit).

---

## 📄 architecture.md

### Nové moduly a přehled souborů S14
- `kurzy.js` — záložka Kurzy měn, `fetchFxRates` (always `no-store`), napájí `_FX_RATES`.
- `coicop.js` — COICOP rozpad (compute/render oddělené: `coicopBreakdown`/`coicopBreakdownCard`).
- `worker.js` — endpoint `/cnb` (parser ČNB, edge cache 30 min, `Cache-Control:no-cache`). Nasazuje se ZVLÁŠŤ (Cloudflare), ne přes firebase deploy.
- `assets.js` — ADR-076/077/078: `syncInvestmentAssets` (klíč `catId::subcat`), `assetTier`/`assetCatLiq`, `assetDepositEvents`, `resyncAssetsFromTransfers`, 4 sekce + Net Worth 5 karet.

### Klíčová ponaučení S14
- **`S` je `let` (app.js:401) — NENÍ na `window`.** Nikdy nepoužívat `window.S`; přistupovat přímo přes `S`. (Příčina FIX-160.)
- `position:sticky` selže, má-li kterýkoli předek `overflow:hidden/auto/scroll`. (FIX-164.)
- Rozlišení dotyk/myš: `matchMedia('(pointer: coarse)')`. (ADR-075.)
- Nová pole v `S` persistovat explicitně do `saveToFirebase` (schéma) — jinak je Firebase sync smaže (např. `noSyncKeys`, dřív `pinnedFx`).
- CRLF soubory (Python `open(newline='')`): assets.js, push.js, debts.js, premium.js, settings.js, budouci.js, share.js.
