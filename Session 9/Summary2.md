# FinanceFlow – Summary2 (v6.66 → v7.02.1)
**Session 9 · 2026-05-27 – 2026-05-28**
*Kompletní přehled všech změn v každé verzi – přesná kopie VERZE_LOG z admin.js*

---

## ✅ Hotovo – v6.66 (2026-05-25)

**Opraveno:**
- 🐛 projects.js – Projekce konce měsíce opravena pro uzavřené měsíce (zobrazovala špatná čísla)
- 🐛 premium.js – Opraveno nafukování předplatného z celé historie (počítalo se víckrát)

**Nové:**
- ✨ projects.js – Rámeček budoucích plateb (30 dní) v sekci Přehled
- ✨ projects.js – Cashflow graf 12 měsíců (leden–prosinec)
- ✨ projects.js – Kvartální tabulka Q1–Q4 + YTD (year-to-date) souhrn

---

## ✅ Hotovo – v6.67 (2026-05-25)

**Nové:**
- ✨ Fáze 1 (S9): categories.json – přidáno pole `coicop` (1–13|null) ke všem 46 kategoriím dle CZ-COICOP 2024
- ✨ Fáze 1 (S9): categories.json – přidáno pole `coicopOverrides` pro podkategorie s jiným COICOP než nadřazená kategorie (např. Auto→Pojištění auta: COICOP 12, Dítě→Školka: COICOP 10)
- ✨ Fáze 1 (S9): categories.json – přidáno pole `shared` (ID překrývajících kategorií) pro vizuální označení sdílených témat (Opravy↔Auto, Alkohol↔Jídlo&Pití, Pojištění↔Bydlení/Auto, Poplatky↔Banka, Cigarety↔Alkohol, Ubytování↔Dovolená, Rekonstrukce↔Opravy)
- ✨ Fáze 1 (S9): stats.js – nový renderCatPage(): Skupiny (Příjmy/Výdaje/Oboje), ▲▼ šipky pro přesun kategorií, Expand/collapse podkategorií, Badgy (příjem/výdaj/stabilní)

---

## ✅ Hotovo – v6.73 (2026-05-25)

**Nové:**
- ✨ Fáze 1 (S9): categories.json – přidáno pole `coicop` (1–13|null) ke všem 46 kategoriím dle CZ-COICOP 2024
- ✨ Fáze 1 (S9): categories.json – přidáno pole `coicopOverrides` pro podkategorie s jiným COICOP než nadřazená kategorie (např. Auto→Pojištění auta: COICOP 12, Dítě→Školka: COICOP 10)
- ✨ Fáze 1 (S9): categories.json – přidáno pole `shared` (ID překrývajících kategorií) pro vizuální označení sdílených témat (Opravy↔Auto, Alkohol↔Jídlo&Pití, Pojištění↔Bydlení/Auto, Poplatky↔Banka, Cigarety↔Alkohol, Ubytování↔Dovolená, Rekonstrukce↔Opravy)
- ✨ Fáze 1 (S9): app.js – DEFAULT_CATEGORIES synchronizován s Firebase exportem: aktuální podkategorie uživatele, nová pole coicop/shared/coicopOverrides

**Opraveno:**
- 🗑️ FIX (S9): app.js – odstraněn duplicitní starý blok DEFAULT_CATEGORIES (způsoboval SyntaxError)

---

## ✅ Hotovo – v6.74 (2026-05-25)

**Nové:**
- ✨ Fáze 2 (S9): stats.js – COICOP kruh (barevné číslo 1–13) u každé kategorie v rohu ikony. Barva dle COICOP_GROUPS_DEF. Hover tooltip zobrazí název skupiny.
- ✨ Fáze 3 (S9): stats.js – sdílené kategorie (shared flag) mají přerušovaný barevný rámeček + badge „⟷ sdílené" s tooltipem názvů překrývajících kategorií.
- ✨ Fáze 2b (S9): stats.js – v expand sekci podkategorií se zobrazí COICOP kruh u podkategorií kde se liší COICOP od nadřazené kategorie (coicopOverrides).

---

## ✅ Hotovo – v6.75 (2026-05-25)

**Opraveno:**
- 🐛 FIX (S9): helpers.js – COICOP_GROUPS_DEF přesunuto do helpers.js (načítá se před stats.js). V v6.74 kruhy nefungovaly protože receipts.js se načítá PO stats.js.
- 🐛 FIX (S9): stats.js – COICOP lookup přes window.COICOP_GROUPS_DEF jako fallback.
- 🐛 FIX (S9): firebase.json – odstraněna sekce „database" (odkazovala na neexistující soubor → Error při firebase deploy --only database). deploy --only hosting funguje bez ní.

**Nové/UX:**
- ✨ UX (S9): stats.js – badge Příjem/Výdaj/Oboje má barevné pozadí + emoji (💰/💸/↔️) pro lepší čitelnost
- ✨ UX (S9): stats.js – název sekce „Podkategorie" zvýrazněn (var(--text2), font-weight:700)
- ✨ UX (S9): stats.js – tagy podkategorií mají vyšší kontrast (opacity .18/.4, color:var(--text))

---

## ✅ Hotovo – v6.76 (2026-05-25)

**Opraveno – KRITICKÉ:**
- 🐛 FIX (S9): stats.js – COICOP kruhy a shared přerušované rámečky se nezobrazovaly protože pole coicop/shared/coicopOverrides se neukládají do Firebase (jen v DEFAULT_CATEGORIES). Oprava: runtime merge z DEFAULT_CATEGORIES v renderCatPage() – bez zápisu do Firebase.

---

## ✅ Hotovo – v6.77 (2026-05-25)

**Nové:**
- ✨ NEW (S9): stats.js – tagy podkategorií v expand sekci mají přerušovaný rámeček pokud název podkategorie odpovídá názvu jiné kategorie (např. „Opravy" v Auto, „Pojištění" v Bydlení). Tooltip zobrazí „Sdíleno s kategorií: X". Symbol ⟷ za názvem.

---

## ✅ Hotovo – v6.78 (2026-05-25)

**Opraveno/Odstraněno:**
- 🗑️ REMOVED (S9): stats.js – zrušen přerušovaný rámeček u tagů podkategorií (nahrazen COICOP kruhy které jsou přehlednější)

**UX:**
- ✨ UX (S9): stats.js – text „Zobrazit/Skrýt podkategorie" zvýrazněn: color:var(--text2), font-weight:500
- ✨ UX (S9): index.html – popisky v modalu Kategorie zvýrazněny: „(výdaj) / Min % (spoření)", „(volitelné)", „Ponech prázdné...", „% je minimum..." – vše var(--text2) místo var(--text3)

**Zaznamenané TODO:**
- 📋 TODO-081 (S9): Admin rozhraní pro přiřazení COICOP čísla vlastním kategoriím uživatelů
- 📋 TODO-082 (S9): computeCoicopAggregates() + Komunitní přehled UI (uživatel vs. ČSÚ průměr)

---

## ✅ Hotovo – v6.79 (2026-05-25)

**Nové:**
- ✨ TODO-079 (S9): admin.js – nová záložka „🏷️ Adopce kategorií": tabulka využití kategorií (počet transakcí, počet uživatelů, top podkategorie, progress bar, badge custom/bez COICOP). Souhrnné metriky: celkem transakcí, nezařazeno %, v Jiné %. Upozornění na nevyužité výchozí kategorie.
- ✨ TODO-081 (S9): admin.js – sekce „Vlastní kategorie bez COICOP": seznam custom kategorií uživatelů, select 1–13 + tlačítko Přiřadit. Přiřazení uloží do Firebase /admin_coicop_overrides/{catId}.

---

## ✅ Hotovo – v6.80 (2026-05-25)

**Opraveno:**
- 🐛 FIX (S9): admin.js – renderAdmin() zachovává aktivní záložku při re-renderu (změna měsíce způsobovala reset na záložku Uživatelé)
- 🐛 FIX (S9): admin.js – loadCategoryAdoption() COICOP čísla čtena z DEFAULT_CATEGORIES (ne z Firebase dat uživatelů kde chybí) → oprava badge „bez COICOP" u výchozích kategorií
- 🐛 FIX (S9): admin.js – nevyužité kategorie v banneru zobrazeny jako seznam kategorií (ne podkategorií) se zlomem řádku
- 🐛 FIX (S9): firebase.json – obnovena sekce database pro firebase deploy --only database

**UX:**
- ✨ UX (S9): admin.js – podkategorie zobrazeny jako barevné tagy pod každou kategorií (počty v závorce)

---

## ✅ Hotovo – v6.81 (2026-05-25)

**Opraveno:**
- 🐛 FIX (S9): admin.js – loadCategoryAdoption() správné pole subkategorie: tx.subcat (bylo tx.subCategory → nefungovalo)
- 🐛 FIX (S9): admin.js – loadCustomCatsNoCoicop() robustnější načítání: filter(Boolean) pro null položky, debug info o počtu načtených kategorií, správné zpracování pole i objektu

---

## ✅ Hotovo – v6.82 (2026-05-25) – KRITICKÝ FIX

**Opraveno:**
- 🐛 KRITICKÝ FIX (S9): stats.js – renderCatPage() runtime merge (coicop/shared/coicopOverrides) mutoval přímo S.categories objekty → při save() se coicopOverrides s klíči „Školka/škola" (obsahují „/") ukládaly do Firebase → crash „invalid key". Opraveno: merge nyní vytváří shallow kopii {...c} pro každou kategorii, S.categories zůstává čisté.
- 🐛 FIX (S9): stats.js – renderCatPage() přejmenování lokální proměnné cats→rawCats aby nedošlo ke konfliktu s nově definovanou cats (výsledek merge kopií).
- 🐛 FIX (S9): admin.js – loadCategoryAdoption() správné pole subkategorie tx.subcat (bylo tx.subCategory)
- 🐛 FIX (S9): admin.js – loadCustomCatsNoCoicop() robustnější načítání s filter(Boolean) a debug info

---

## ✅ Hotovo – v6.83 (2026-05-25)

**Opraveno:**
- 🐛 FIX (S9): admin.js – HTTP 400 při načítání admin panelu: odstraněn orderBy="premium/type" z loadUserStats() – Firebase Realtime DB vyžaduje index pro orderBy, bez něj vrací 400. Nahrazeno přímým načtením bez filtru.
- 🐛 FIX (S9): admin.js – assignCoicop() nyní skutečně propíše COICOP číslo do Firebase kategorií všech uživatelů kteří ji mají (PATCH /users/{uid}/data/categories/{idx}/coicop). Dříve se ukládalo jen do admin_coicop_overrides ale nikde se to nečetlo.

---

## ✅ Hotovo – v6.84 (2026-05-25) – TODO-014

**Nové:**
- ✨ TODO-014 (S9): app.js – globální categoryMappings systém: normalizeMappingKey(), loadCategoryMappings(), saveCategoryMapping(), lookupCategoryMapping(), initCategoryMappings(). Ukládání do Firebase users/{uid}/categoryMappings/{key} i localStorage.
- ✨ TODO-014 (S9): ai.js – aiCategorizeTx() nejdřív zkontroluje lokální mappings cache (zobrazí „Z paměti (N×)") s možností přepsat AI dotazem. applyAiCat() uloží mapování do Firebase.
- ✨ TODO-014 (S9): import.js – showImportPreview() async, auto-přiřadí kategorie z mappings cache před zobrazením. setCatMapping() ukládá i do Firebase. Badge „🧠 X transakcí automaticky kategorizováno z AI paměti".

---

## ✅ Hotovo – v6.85 (2026-05-25) – TODO-015

**Nové:**
- ✨ TODO-015 (S9): ui.js – in-app notifikace nadcházejících plateb: getUpcomingNotifications(), updateNotificationBadge(), showNotificationPanel(), snoozeNotifications()
- ✨ TODO-015 (S9): ui.js – badge (červený/žlutý) na nav položce „Budoucí platby" s počtem plateb do 7 dní
- ✨ TODO-015 (S9): ui.js – notifikační panel (slide-up) 1,5s po přihlášení: platby do 3 dní, celková suma, tlačítka Zobrazit vše / Odložit na 1 den (snooze do localStorage)

---

## ✅ Hotovo – v6.86 (2026-05-25) – TODO-080

**Nové:**
- ✨ TODO-080 (S9): stats.js – renderStats() category breakdown rozšířen o podkategorie: barevné tagy s částkami pod každou kategorií (jen s daty)
- ✨ TODO-080 (S9): projects.js – renderReport() health rows rozšířeny o podkategorie: tagy s částkami pod každou kategorií v sekci Finanční zdraví

---

## ✅ Hotovo – v6.87 (2026-05-25)

**Opraveno:**
- 🐛 FIX (S9): ai.js – aiCategorizeTxForce() přidány dvě tlačítka: „🧠 Zapamatovat" (jen uloží mapping, NEotevírá modal) a „➕ Zapamatovat & přidat transakci" (uloží + otevře modal). Původně jen Použít = vždy otevřel modal.

**Nové:**
- ✨ TODO-014 (S9): receipts.js – addReceiptAsTx() používá lookupCategoryMapping(store) jako primární zdroj kategorie. Při uložení volá saveCategoryMapping() → příští účtenka od stejného obchodu se kategorizuje automaticky.
- ✨ TODO-014 (S9): receipts.js – manuální změna kategorie v receipt preview selectu ukládá mapování do Firebase (saveCategoryMapping).

---

## ✅ Hotovo – v6.88 (2026-05-25)

**Nové:**
- ✨ TODO-014 (S9): receipts.js – guessItemCatId() – nová funkce: priority 1) AI mappings cache, 2) keyword match → vrací {catId, catName, fromMemory}. Badge 🧠 u položek z AI paměti.
- ✨ TODO-014 (S9): receipts.js – rpRender() přepracován: select zobrazuje uživatelské kategorie (catId jako value), onchange ukládá saveCategoryMapping(jméno_položky, catId). Skupiny položek mají barevný rámeček dle kategorie.
- ✨ TODO-014 (S9): receipts.js – addReceiptAsTx() přepsán na multi-transakce: každá skupina položek stejné kategorie = samostatná transakce. Každá položka uloží mapování. Fallback na jednu transakci pokud nejsou položky.

---

## ✅ Hotovo – v6.89 (2026-05-25)

**Nové:**
- ✨ NEW (S9): receipts.js – subkategorie v item selectu: druhý select se zobrazí pokud má kategorie podkategorie (rpItemSubcatOptions()). Uloží se jako itemSubcat na položce.
- ✨ NEW (S9): receipts.js – updateItemStats() – Firebase agregát /users/{uid}/itemStats/{key}: count, totalSpent, avgPrice, lastDate, catId, subcat, history[] (posledních 24 cen pro trend)
- ✨ NEW (S9): receipts.js – buildStatsTab() přepsán: kategorie výdajů z položek (catId→jméno), filtr 1M/3M/6M/12M/vše pro top položky, trend ceny (↑↓), min–max cena

---

## ✅ Hotovo – v6.90 (2026-05-27)

**Opraveno:**
- 🐛 FIX (S9): database.rules.json – catalog/items chybělo write pravidlo → PERMISSION_DENIED při publishPricesToCatalog. Přidáno .write: "auth != null" s validací

**UX:**
- ✨ UX (S9): receipts.js – subkat select: lepší kontrast (color:var(--text2), font-weight:500), barevný rámeček dle kategorie

**Nové:**
- ✨ NEW (S9): receipts.js – buildHistoryTab() přepsán: seskupení dle obchodů + expandovatelné skupiny (▶) → individuální účtenky s datem + kategoriemi → expandovatelné položky s catId+subcat
- 🐛 FIX (S9): receipts.js – buildStoresTab() průměr zobrazen jen pokud visits > 1 (dříve průměr = celková suma při 1 návštěvě)
- ✨ UX (S9): receipts.js – renderItemStatsList() zvýrazněno: větší text (.88rem/.95rem), barevný název kategorie, obchod kde nakoupeno, badge počtu nákupů

---

## ✅ Hotovo – v6.91 (2026-05-27)

**Opraveno:**
- 🐛 FIX (S9): receipts.js – buildStoresTab() správně používá normalizeStoreName pro seskupení receipts → PENNY/PENNY MARKET s.r.o. se teď rozkliknou
- 🐛 FIX (S9): receipts.js – editReceiptFromHistory() nezobrazuje se více na záložce Skenovat. Otevře se jako modal overlay nad aktuální záložkou.
- 🐛 FIX (S9): receipts.js – qty spinner krok 1 (bylo 0.001), label "ks". Cena: šířka 68px, textField bez spinner reset.

**Nové:**
- ✨ NEW (S9): receipts.js – buildStoresTab() přepracován: expandovatelné obchody → účtenky → položky (stejná logika jako buildHistoryTab). Progress bar se zobrazí při rozbalení.
- ✨ NEW (S9): receipts.js – normalizeStoreName(): sloučení variant PENNY/PENNY MARKET s.r.o., MOJ/MÔJ/MÚJ obchod → jeden záznam v storeStats.

**UX:**
- ✨ UX (S9): receipts.js – buildHistoryTab() + buildStoresTab(): větší font texty (.85rem/.95rem), var(--text2) pro popis, průměr vedle sumy, šipka ▶ 0.85rem
- ✨ UX (S9): receipts.js – renderItemStatsList(): 4-sloupcový grid layout: Položka+Kategorie | Počet (Syne bold) | Celkem Kč (červená) | Průměr Kč/ks. Bez obchodu.

---

## ✅ Hotovo – v6.92 (2026-05-27)

**Opraveno:**
- 🐛 FIX (S9): receipts.js – buildStoresTab() správně používá normalizeStoreName pro seskupení receipts → PENNY/PENNY MARKET s.r.o. se teď rozkliknou
- 🐛 FIX (S9): receipts.js – editReceiptFromHistory() inline expand pod řádkem účtenky (ne modal overlay, ne přepnutí na Skenovat záložku)

**UX:**
- ✨ UX (S9): receipts.js – buildHistoryTab() + buildStoresTab(): větší font texty (.85rem/.95rem), var(--text2) pro popis, průměr vedle sumy, šipka ▶ 0.85rem
- ✨ UX (S9): receipts.js – renderItemStatsList(): 4-sloupcový grid layout: Položka+Kategorie | Počet (Syne bold) | Celkem Kč (červená) | Průměr Kč/ks. Bez obchodu.

---

## ✅ Hotovo – v6.93 (2026-05-27) – KRITICKÝ FIX

**Opraveno:**
- 🐛 FIX (S9): receipts.js – buildStoresTab() a buildHistoryTab() přijímají uniqueReceipts jako parametr (ne S.receipts globál) → konec duplicit v zobrazení
- 🐛 FIX (S9): receipts.js – editReceiptFromHistory() inline expand opravena detekce rodičovského řádku přes querySelectorAll+getAttribute

**Nové:**
- ✨ NEW (S9): receipts.js – deduplicator v renderUctenky(): identifikátor obchod|datum|suma|počet položek → žlutý banner s počtem duplikátů + tlačítko „Smazat duplikáty" (removeDuplicateReceipts)

---

## ✅ Hotovo – v6.94 (2026-05-27)

**Opraveno:**
- 🐛 FIX (S9): worker.js – receipt prompt rozšířen o PRAVIDLO 2 pro váhové položky (0.246 kg × 249.90 Kč/kg → price=61.40, ne price=249.90) a PRAVIDLO 3 pro slevy (závorková cena = skutečná cena)
- 🐛 FIX (S9): receipts.js – rpRender() nepřekresluje DOM pokud je fokusovaný input → konec blikání při editaci počtu/ceny na mobilu
- 🐛 FIX (S9): receipts.js – toggleHistReceipt() přidán scroll-safe fix pro mobile

**Nové:**
- ✨ ARCH (S9): receipts.js – buildHistoryTab() přepsán jako master seznam účtenek (řazení dle data, kategorie tagy, editace inline přes rcpt_hist_{idx} slot)
- ✨ ARCH (S9): receipts.js – editReceiptFromHistory() používá dedikovaný rcpt_hist_ slot v historii, fallback pro Obchody záložku

---

## ✅ Hotovo – v6.95 (2026-05-27) – TODO-008

**Nové:**
- ✅ TODO-008 (S9): receipts.js – validateReceiptJSON(): robustní validace AI odpovědi – store fallback, total jako číslo, date formát, items musí být pole, price/qty normalizace, přeskočení nulových položek, dopočet totalu
- ✅ TODO-008 (S9): ai.js – validateAiCatJSON(): validace catId, confidence enum, fallbacky pro chybějící pole

---

## ✅ Hotovo – v6.96 (2026-05-27)

**Nové:**
- ✨ NEW (S9): share.js – affiliate sdílení redesign: velké zelené primární tlačítko „📤 Sdílet s přáteli" (native share sheet – otevře WhatsApp/Messenger/Signal/Email/SMS a vše ostatní co má uživatel nainstalované)
- ✨ NEW (S9): share.js – přidána přímá tlačítka: Signal (kopíruje zprávu + hint), Telegram (t.me/share/url), mřížka 3×2 s emoji ikonami
- ✨ NEW (S9): share.js – getShareMessage() rozšířen o signal a telegram zprávy
- ✨ NEW (S9): share.js – shareVia() case signal (deep link + clipboard fallback) a case telegram (t.me share URL)

---

## ✅ Hotovo – v6.97 (2026-05-28)

**Nové:**
- ✨ NEW (S9): index.html + debts.js – modal Přidat transakci: přidány pole Peněženka a Typ platby (populateTxWalletSelect, populateTxPayTypeSelect). Hodnoty se ukládají do txObj.wallet a txObj.payType.
- ✨ NEW (S9): debts.js – Převodník měn pod polem Částka: orientační kurzy CZK/EUR/USD/PLN/GBP/CHF/HUF. Při výběru peněženky s měnou se automaticky přepne. Funkce updateTxConverter().
- ✨ NEW (S9): debts.js – Kalkulačka 🧮: rozkliknutelný panel pod polem Částka, 4×4 grid (0-9, ÷×−+, C⌫=), tlačítko „Vložit do Částka". Funkce calcBtn(), calcInsert(), toggleTxCalc().

**UX:**
- ✨ UX (S9): index.html – labely polí v modalu transakce zvýrazněny zlatou barvou (var(--bank)), font-weight:700, letter-spacing
- ✨ UX (S9): debts.js – sub-chip (podkategorie) má rámeček v barvě vybrané kategorie, vybraná podkategorie má barevné pozadí + bílý text

---

## ✅ Hotovo – v6.98 (2026-05-28)

**Nové:**
- ✨ NEW (S9): receipts.js – extractUnit(): extrakce hmotnosti/objemu z názvu položky (500g→0.5kg, 1.5l, 250ml→0.25l) → pricePerUnit = Kč/kg nebo Kč/l
- ✨ NEW (S9): receipts.js – Shrinkflation detektor: pokud hmotnost klesla o >2% při zachování ceny → badge 🔻 Shrinkflation s detailem gramů
- ✨ NEW (S9): receipts.js – buildPricesTab() přepracován: 3 sekce – Shrinkflation (červená) / Cena/kg a cena/l (žlutá) / Cenové změny. Každá položka má timeline ceny/ks i ceny/kg.
- ✨ NEW (S9): receipts.js – Cena/kg timeline: samostatný panel pod každou položkou kde byla detekována hmotnost v názvu.

---

## ✅ Hotovo – v6.99 (2026-05-28) – TODO-006 + TODO-082

**Nové:**
- ✅ TODO-006 (S9): app.js – globální error handler: window.addEventListener(error) + unhandledrejection → showCrashBanner(). Ignoruje third-party, ResizeObserver, Firebase network/permission chyby. Sentry capture pokud dostupný.
- ✅ TODO-006 (S9): index.html – #globalErrorBanner HTML element: červený banner fixed top, tlačítko 🔄 Obnovit a ✕ zavřít. Auto-hide po 8s.
- ✅ TODO-082 (S9): helpers.js – computeCoicopAggregates(txs, D): projde transakce, přiřadí COICOP dle DEFAULT_CATEGORIES + coicopOverrides + user kategorie. Vrátí {cats:{1:sum,...}, unassigned}.
- ✅ TODO-082 (S9): helpers.js – uploadCoicopToFirebase(): anonymní upload do /community/{YYYY-MM}/users/{uid}. Voláno throttlovaně (5 min) po každém save().
- ✅ TODO-082 (S9): admin.js – Komunitní přehled: nová záložka „🔢 COICOP přehled" – přesné srovnání mých výdajů vs. ČSÚ průměr dle COICOP skupin 1–13. Dual progress bar, % odchylka, upozornění na nezařazené výdaje.

---

## ✅ Hotovo – v6.99.1 (2026-05-28) – KRITICKÝ FIX

**Opraveno:**
- 🐛 FIX (S9): receipts.js – ReferenceError: _activeUctenkyTab is not defined při otevření záložky Analýza účtenek. Proměnná deklarována až za místem prvního použití. Fix: přidána inicializace `let _activeUctenkyTab = 'scan'` před toggleHistGroup().

---

## ✅ Hotovo – v7.00 (2026-05-28)

**Opraveno:**
- 🐛 FIX (S9): receipts.js – buildHistoryTab() přepsán: sort/filter toolbar (📅 Nejnovější/Nejstarší/Nejvyšší/Nejnižší, filtr dle obchodu), datum zlatě před názvem, vše v jednom řádku. Odstraněn orphan duplicitní kód.
- 🐛 FIX (S9): receipts.js – X tlačítko v editoru inteligentní: zavře rcpt_hist_{idx} slot, rcpt_edit_{idx} div nebo receiptPreview dle kontextu.
- 🐛 FIX (S9): receipts.js – „Přidat jako transakci" → „💾 Uložit změny"

**Nové:**
- ✨ NEW (S9): receipts.js – Položkové tagy: každá položka má pole 🏷️ tag (datalist suggestions), onchange ukládá do community Firebase /community/itemTags/{itemKey}/{tag}.
- ✨ NEW (S9): admin.js – záložka „🔖 Item Tagy": seznam komunitních tagů s počty, admin může Schválit (✓) nebo Odmítnout (✕) → uloží do itemTagValidation.
- ✨ NEW (S9): database.rules.json – přidány community/itemTags a community/itemTagValidation

---

## ✅ Hotovo – v7.01 (2026-05-28)

**Opraveno:**
- 🐛 FIX (S9): receipts.js – saveItemTagMapping() CORS chyba: odstraněn method TRANSACTION, klíče normalizovány přes NFD (bez diakritiky, bez mezer), správné GET+PUT
- 🐛 FIX (S9): receipts.js – X zavřít červená barva + červený rámeček, opravena logika zavírání (rcpt_hist/rcpt_edit/receiptPreview)
- 🐛 FIX (S9): receipts.js – tag input nápověda zmizí při focus (onfocus/onblur)
- 🐛 FIX (S9): receipts.js – catTags v Historii růžová barva (rgba(236,72,153)) místo barvy kategorie
- ✅ Fix (S9): receipts.js – přehozen počet účtenek za select filtry v buildHistoryTab toolbar
- ✅ Fix (S9): admin.js – (1×) badge: růžová #ec4899, font-weight:700, font-size:.7rem
- ✅ Fix (S9): admin.js – fajfka validace tagu: šedá = neschváleno, zelená = schváleno (stav načítán z itemTagValidation)
- ✅ Fix (S9): receipts.js – zelené tagy viditelné v Statistikách (renderItemStatsList – tagBadges pod názvem kategorie)
- ✅ Fix (S9): receipts.js – addReceiptAsTx() ukládá subcat (z první položky skupiny) + tags (unikátní tagy položek jako string) do transakce

---

## ✅ Hotovo – v7.02 (2026-05-28)

**Opraveno:**
- 🐛 FIX (S9): receipts.js – duplicita položek ve Statistikách: normalizace klíče na lowercase (ROHLÍK 43G ≡ Rohlík 43g)
- 🐛 FIX (S9): ui.js – tagy v Transakcích: modrá barva → růžová (#ec4899) pro hashtag tagy (t.tags[]), přidány zelené tagy z účtenek (t.tags string s 🏷️)
- ✅ Fix (S9): admin.js – v7.01 přidán do VERZE_LOG (chyběl)

**Nové:**
- ✨ NEW (S9): receipts.js – Statistiky: přidán sloupec „Ks" (celkový počet kusů), zobrazení více tagů na položku, displayName = nejdelší varianta názvu
- ✨ NEW (S9): receipts.js – Graf položek/tagů: SVG sloupcový + čárový kumulativní graf, selekce Název/Tag × Ks/Kč × 1M/3M/6M/12M
- ✅ Fix (S9): receipts.js – renderItemChart() inicializuje se při přepnutí záložky Statistiky

---

## ✅ Hotovo – v7.02.1 (2026-05-28)

**Opraveno:**
- 🐛 FIX (S9): admin.js – Low confidence: deduplikace dle názvu transakce (Mujobchod NC Lucina 5× → 1 řádek s růžovým badge 5×). Info text: „pravidlo stačí přidat jednou – platí pro všechny výskyty stejného názvu"
- 🐛 FIX (S9): admin.js – addKeywordFromLowConf(): nahrazen prompt() inline formulářem přímo pod řádkem tabulky. Předvyplněné klíčové slovo (první slovo z názvu), COICOP select + nová volba „0. Bez COICOP (investice, spoření…)". Po uložení: řádek zešedne + přeškrtne, tlačítko zobrazí ✅ Hotovo.
- 🐛 FIX (S9): admin.js – saveLowConfRule(): async uložení s vizuálním feedbackem (⏳ Ukládám → ✅ Uloženo: kw → skupina), auto-zavře dialog po 1.5s
- 🐛 FIX (S9): app.js – scroll blikání admin panelu: renderPage() throttlován na 150ms v Firebase onValue listeneru. Zabrání překreslení celé stránky při každé malé Firebase změně (uploadCoicop, itemTags atd.)

---

*Session 9 · v6.66 → v7.02.1 · Claude Sonnet 4.6 · 2026-05-28*
*Zdroj: VERZE_LOG z admin.js + přepis konverzace*

---

## ✅ Hotovo – v7.03 (2026-05-28) – TODO-086

**Nové:**
- ✨ TODO-086 (S9): import.js – guessCategoryFromKeyword(): navrhne kategorii z MERCHANT_CATEGORIES + shoda názvu kategorie/podkategorie. Nenamapované transakce dostanou `suggestedCatId`.
- ✨ TODO-086 (S9): import.js – showImportPreview() rozšířen: sloupec Kategorie s žlutým badge „🤖 Doporučeno" u návrhů, 🧠 u AI paměti. Počet doporučených v info banneru.
- ✨ TODO-086 (S9): import.js – tlačítko „✓ Přijmout doporučené" → acceptAllSuggestions(): hromadně přijme návrhy, uloží do categoryMappings.
- ✨ TODO-086 (S9): import.js – recordSuggestionOverride(): zaznamená pokud uživatel zvolí JINOU kategorii než doporučenou → /community/suggestionOverrides/{key}.
- ✨ TODO-086 (S9): admin.js – nová záložka „🤖 Doporučení": přehled které doporučené kategorie uživatelé mění a na co (s počty × růžový badge).
- ✨ TODO-086 (S9): database.rules.json – přidán community/suggestionOverrides (admin read, auth write).

---

## ✅ Hotovo – v7.04 (2026-05-29)

**Opraveno:**
- 🐛 FIX (S9): admin.js – COMMUNITY_MONTH_KEY() vždy vracela dnešní datum místo S.curMonth/S.curYear → komunitní přehled zobrazoval vždy jen aktuální měsíc. Fix: parametry (month, year).
- 🐛 FIX (S9): admin.js – renderKomunita() throttlována 120ms → konec blikání při přepínání měsíce.
- 🐛 FIX (S9): admin.js – myExp počítá pouze type=expense bez isBalancing (žádné příjmy v COICOP).
- 🐛 FIX (S9): admin.js – záložky přejmenovány: „Já vs. ČSÚ" / „ČSÚ tabulka" / „Já vs. komunita".
- 🐛 FIX (S9): index.html – zastaralé Poznámky k vydání (v6.35–v3.5) odstraněny. Nahrazeny dynamickým renderReleaseNotes() z VERZE_LOG.
- 🐛 FIX (S9): share.js + index.html – Sdílet FinanceFlow: přidán vždy viditelný shareLinkBar s odkazem, tlačítky „📋 Kopírovat" (s feedbackem ✅) a „📤 Sdílet" (nativní share sheet).

**Nové:**
- ✨ NEW (S9): share.js – initShareLinkBar(): okamžitá inicializace odkazu bez blokování.
- ✨ NEW (S9): share.js – copyShareLinkDirect(): kopíruje s vizuálním feedbackem.
- ✨ NEW (S9): share.js – renderReleaseNotes(): generuje Poznámky k vydání z VERZE_LOG (8 verzí, max 3 změny/verze).
- ✨ NEW (S9): ui.js – renderPage() hook pro oAplikaci: initShareLinkBar + renderReleaseNotes + renderShareSection.

---

## ✅ Hotovo – v7.05 (2026-05-29) – TODO-087

**Nové:**
- ✨ TODO-087 (S9): projects.js – Detektor úspor A) Zbytečné utrácení: detekce plateb ≤300 Kč opakujících se 4× a více za měsíc. Top 3 položky, odhad úspory 50 %. Barva oranžová ☕.
- ✨ TODO-087 (S9): projects.js – Detektor úspor B) Výplata efekt: pokud ≥60 % měsíčních výdajů padne do 7 dní po první příjmové transakci → alert s % a tipem „metoda obálky". Závažnost high při ≥75 %. Barva fialová 📅.
- ✨ TODO-087 (S9): projects.js – Detektor úspor C) Jídlo venku: keyword match 20+ výrazů (restaurace/kavárna/McDonald/KFC/Starbucks…), denní průměr Kč/den, odhad měsíční sumy, úspora 30 %. High při >200 Kč/den. Barva oranžovočervená 🍽️.
- ✨ TODO-087 (S9): projects.js – Detektor úspor D) Zdražení: propojení s S.receipts – porovnání cen položek za 3 měsíce zpět z naskenovaných účtenek. Alert při zdražení >10 %, top 3 zdražené položky, odhadovaná měsíční ztráta (4 nákupy/měsíc). Odkaz do Analýza účtenek → Zdražování. Barva červená 📈.
- ✨ TODO-087 (S9): projects.js – catColor rozšířen o 4 nové barvy. analyzesList rozšířen na 10 položek.
- ✨ TODO-087 (S9): projects.js – info sekce: odkaz „Analýza účtenek → Zdražování" pro detailní přehled.

---

## 📋 Plánované – Session 10 (návrhy ChatGPT + nové TODO)

- **TODO-086** ✅ dokončeno
- **TODO-087** ✅ dokončeno
- **TODO-088** · Financial Freedom Ratio (FFR = pasivní příjem / výdaje × 100)
- **TODO-089** · Inflace životního stylu (výdaje rostou rychleji než příjmy)
- **TODO-090** · Asset Allocation vizualizace (donut chart z aktiva.js)
- **TODO-091** · Income Diversification Score (počet/váha příjmových zdrojů)
- **TODO-092** · Wealth Momentum (průměrný přírůstek čistého jmění/měs za 12M)
- **TODO-083** · Sledování slev z letáků (kupi.cz tlačítko v Nákupním seznamu)
- Bubble chart blikání (TODO-060 bug)
- Měsíční report period tabs fix (TODO-057 bug)

---

*Session 9 · v6.66 → v7.05 · Claude Sonnet 4.6 · 2026-05-29*
