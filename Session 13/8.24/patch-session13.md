# 🔧 Patch Session 13 — FinanceFlow (v8.10 → v8.24)

> Formát: MD-Diff multi-patch pro AI Merge. Každá sekce `## 📄 soubor.md` se připojí (append) k odpovídajícímu konsolidovanému dokumentu.
> Datum: 2026-06-18 až 2026-06-20 · Pracovní jazyk: čeština
> Verze: v8.10 → **v8.24** (15 verzí) · Navazuje na: FIX-146, OPEN-034, TODO-136, ADR-064

---

## 📄 bugs.md

### FIX-147 · Otazník u kategorie virtuálních přesunů **(v8.13→v8.14)**
Transakce vkladu/výběru do cíle směřovaly na neexistující `catId:'virtual_transfer'` → render zobrazil „?". Čisté řešení (v8.14): kód najde reálnou kategorii uživatele podle jména přes `findCatIdByName('Virtuální přesun')` a použije její skutečné ID + podkategorie (Vklad do cíle / Reverz). Odebrána migrace `ensureVirtualTransferCat`, vymyšlená kategorie z `DEFAULT_CATEGORIES` i fallback v getCat. Vše je v datech uživatele — kategorizovatelné a statistikovatelné.

### FIX-148 · Transakce v cizí měně zobrazené v Kč **(v8.13)**
Eurová/librová peněženka zobrazovala částku i běžící zůstatek natvrdo v „Kč". Opraveno na správnou měnu (EUR/GBP) na desktopu i mobilu. Přepočet do cíle (`toCZK`) byl správně, šlo jen o zobrazení (ověřeno testem: 100 EUR = 2530 Kč).

### FIX-149 · Filtr Typ platby jen Vše/Přesun **(v8.13, v8.16, v8.18)**
Filtr v Transakcích používal `D.payTypes` (jen custom, většinou prázdné). Opraveno na `getPayTypes(D)` (default + custom) — zobrazí všechny typy včetně Edenred.

### FIX-150 · KRITICKÝ — únik dat mezi uživateli **(v8.15)**
Při odhlášení se nevyčistil stav `S`, neodpojil `_dbListener`, `onUserSignedIn` neresetoval `S`. Při střídání účtů na zařízení se data předchozího uživatele zapsala do uzlu nového (autosave nad cizím `S`) a nový uživatel je viděl i na jiném zařízení. Fix: `resetAppState()` (app.js) odpojí listenery + vynuluje S/partnerData/viewingUid, voláno při odhlášení (firebase.js, PŘED `_currentUser=null`) a na začátku `onUserSignedIn`.

### FIX-151 · Seed data u nového uživatele **(v8.15)**
`seedData()` plnil fiktivní demo transakce/dluhy/peněženky. Nový uživatel = ČISTÁ aplikace — žádná vložená ani cizí data, jen sdílené kategorie + typy plateb z kódu (globální nastavení admina).

### FIX-152 · Mazání dat nefungovalo na 100 % **(v8.15)**
`confirmDeleteAllData` mazal špatné localStorage klíče (`ff_v43_local`) a vůbec nemazal IndexedDB snapshot (`ff_snapshot_db`) → data se vracela ze snapshotu. Opraveno: odpojí listener, smaže IndexedDB + správné klíče (`ff_snapshot_{uid}`), pak reset.

### FIX-153 · Worker volal vyřazený model (404) **(v8.13→v8.15)**
Worker používal `claude-sonnet-4-20250514`, který API vrací jako 404 → nefungoval URL import, sken účtenek ani AI Rádce. Aktualizováno na `claude-sonnet-4-6` (7 míst). Pravá příčina „rate_limit"/404 chyb v konzoli.

### FIX-154 · welcomeMessage PERMISSION_DENIED **(v8.15)**
`database_rules.json` neměl pravidlo pro `welcomeMessage` → Firebase default deny i pro admina, uvítací hlášku nešlo uložit. Přidáno pravidlo (čtení přihlášení, zápis admin).

### FIX-155 · „Zobrazit jako uživatel" nepřepnul na cizí data **(v8.16)**
`adminViewUserAs` nastavil `viewingUid`, ale nenačetl `partnerData[uid]` → `getData()` spadlo zpět na `S` (admin viděl svoje data). Opraveno: data uživatele se načtou z Firebase do partnerData PŘED `switchToPartner`. (Důsledek: ve v8.16 admin správně vidí reálná data uživatele, ne svoje — proto se u testovacích uživatelů „objevily" prázdné kategorie.)

### FIX-156 · Mobilní přepnutí na partnera padalo **(v8.18)**
`switchToPartner` volal `getElementById(...).classList.add()` bez null-checku → na mobilu mohl spadnout před `renderPage()`. Null-safe + zavře sidebar + toast „👁 Prohlížíš data: …".

### FIX-157 · COICOP v komunitě zobrazený jako čísla **(v8.19)**
Komunita nahrávala COICOP klíče (1-13) správně, ale zobrazení je bralo jako názvy → holé „1", „4", „6". Fix (admin.js): COICOP klíč se mapuje na oficiální název divize přes `COICOP_GROUPS_DEF`; obě strany (ty i komunita) se počítají přes `computeCoicopAggregates` — konzistentní.

### FIX-158 · Budoucí platby — pád na zastaralý nakupSwitchTab **(v8.22)**
Kliknutí na cíl shazovalo aplikaci (`ReferenceError: nakupSwitchTab is not defined`). budouci.js volal funkci odstraněnou při přesunu cílů z Nákupního seznamu do stránky „Přání a narozeniny". Opraveno na `showPage('narozeniny')`. Klíčové funkce nakup.js navíc explicitně zpřístupněny na `window` (robustnost).

### FIX-159 · exportCSV chyby v datech **(v8.20)**
`exportCSV()` četl `t.category` místo `t.catId||t.category` a `t.amount` bez fallbacku; nefiltroval split parenty. Opraveno + rozšířeno o sloupce (měna, podkategorie, peněženka, typ platby) a CSV s BOM pro Excel.

---

## 📄 features.md

### Sjednocený modal Přání/Cíl **(v8.12)**
Oba typy mají všechna pole (ikona/URL/název/popis/cena/priorita/měsíční vklad/deadline), liší se jen popisky. Klikací sada 20 ikon (WISH_ICONS). Worker URL import čte cenu z JSON-LD a meta tagů.

### Velký refaktor cílů — reverz a měna **(v8.10→v8.11)**
Vklad do cíle pamatuje původ (peněženka, částka, měna) → smazání cíle/vkladu/splnění smaže párový výdaj → peníze zpět přes `computeWalletBalance` (žádné dvojí odečtení). Měnový přepočet do cíle (`toCZK`), převod Z cíle zpět, hlídání cílové částky, splnění (`goalMarkDone`), záložky Aktivní/Splněno. Virtuální peněženka v Čistém majetku (žluté kolečko).

### Sloučený komunitní bar Já vs komunita **(v8.17, v8.19)**
Dva bary (Průměr + Vy) sloučeny do jednoho pruhu: modrá = průměr komunity, zelená = ty (pod průměrem), červená = přebytek (nad). COICOP divize s oficiálními názvy.

### Béžové (sepia) téma **(v8.18)**
Teplý tón šetrný k očím, mezi tmavým a světlým. 4. možnost v Nastavení → Barevné téma (mřížka 2×2: Tmavé/Béžové/Světlé/Auto). `applyTheme` větev `mode==='sepia'`.

### Skóre aktivity uživatele **(v8.18)**
Admin detail uživatele: bar Neaktivní—Průměrný—Aktivní z počtu transakcí + čerstvosti poslední aktivity. Bez nové telemetrie — jen z existujících dat.

### Tabulka transakcí — sloupce Typ platby + Peněženka **(v8.18)**
Jen web/desktop (CSS grid 7→9 sloupců, třídy `tx-col-paytype/tx-col-wallet` skryté na mobilu). Na mobilu jen filtry. Split řádky doplněny o prázdné buňky.

### Systémová kategorie Virtuální přesun **(v8.16)**
Pro ne-admina gold ohraničení 🔒 + skrytá tlačítka edit/smazat/stabilní/přesun (`_isLockedCat`). Admin má plnou kontrolu.

### Uvítací hláška — emoji palety **(v8.16)**
Klikací sada 28 emotikonů (WELCOME_EMOJIS) pro ikonu i pro vkládání do textu zprávy.

### Export transakcí do CSV **(v8.20)**
Nastavení → Data & Soukromí → Export transakcí (CSV). Modal s výběrem období (od/do) a typu. Pro Excel/účetnictví/daně. JSON záloha zůstává zvlášť.

### Vyhledávání napříč měsíci **(v8.20)**
V Transakcích přepínač „Hledat ve všech měsících" — když zapnuto a zadán text/tag, prohledá všechny transakce bez ohledu na zvolený měsíc.

### Měsíční checklist na dashboardu **(v8.20)**
Opakuje se každý měsíc: přidej výplatu + zapiš aspoň 20 transakcí. Resetuje se změnou měsíce, lze skrýt. Doplňuje jednorázový onboarding průvodce.

### Stránka nápovědy **(v8.20)**
`napoveda.html` pro financeflow.cz — návod jak začít, klíčové funkce, skenování účtenek, cíle, rozpočet, tipy, FAQ. V duchu landing page.

### API tracking — tokeny + náklady **(v8.21)**
Worker ukládá tokeny (in/out/total) a odhad nákladů v Kč (tokeny × cena Sonnet × kurz) per user, per typ do `users/{uid}/aiUsage/{měsíc}`. Admin detail: sekce Spotřeba AI (volání, tokeny, Kč, rozpad podle typu). Admin Statistiky: karta Komunitní aktivita & spotřeba AI (agregace všech uživatelů, top podle nákladů). Pozn.: funguje jen se secrets FIREBASE_SERVICE_ACCOUNT + FIREBASE_DB_URL.

### Označení sdílených podkategorií **(v8.23)**
Podkategorie sdílená se samostatnou kategorií (Pojištění v Bydlení, Alkohol v Jídle) má přerušovaný zlatý rámeček + ↔ a tooltip s názvem a COICOP samostatné kategorie. Doplňuje COICOP kroužek (override) u podkategorií.

### Verzovací hlavička souborů **(v8.24)**
Každý změněný soubor (JS, worker.js, sw.js, database_rules.json) má na začátku hlavičku `// FinanceFlow · vX.XX · soubor · datum`. Na první pohled je vidět zda je soubor aktuální verze.

---

## 📄 decisions.md

### ADR-065 · Kategorie virtuálních přesunů = reálná data uživatele **(v8.14)**
Žádné vymyšlené ID ani skryté kategorie v kódu. Kód hledá kategorii podle jména (`findCatIdByName`) a používá skutečné ID + podkategorie z dat uživatele. Důvod: vše musí být v datech — kategorizovatelné, statistikovatelné, ovladatelné uživatelem. Auto-dorovnání chybějících kategorií zavrženo (přepsalo by úmyslné úpravy uživatele — přejmenování/smazání).

### ADR-066 · Reverz peněz mazáním transakce, ne úpravou balance **(v8.10)**
Zůstatek peněženky = startBal + suma transakcí (`computeWalletBalance`). Vrácení peněz z cíle = smazání párového výdaje (txOut), ne úprava balance — jinak dvojí odečtení. Vklad pamatuje původ (transferId, walletId, walletAmount, walletCurrency, txOutId) pro reverz.

### ADR-067 · Nový uživatel = čistá aplikace **(v8.15)**
Žádná seed/demo data. Sdílené prvky (kategorie, typy plateb, COICOP) se distribuují přes kód (`DEFAULT_CATEGORIES`, `DEFAULT_PAY_TYPES`), ne přes sdílený Firebase uzel. Osobní data (transakce, peněženky se zůstatky, cíle) čistě per-user.

### ADR-068 · Stav `S` a listenery se musí vyčistit při odhlášení **(v8.15)**
`resetAppState()` při odhlášení odpojí `_dbListener` + partner listenery a vynuluje S/partnerData/viewingUid PŘED zrušením `_currentUser`. Zabraňuje úniku dat mezi uživateli na zařízení.

### ADR-069 · Admin tier ve workeru **(v8.14)**
Admin UID má ve workeru vlastní tier `admin` s limity 9999 — žádný free rate_limit na URL import a další AI funkce. `getPremiumTier` vrací 'admin' pro ADMIN_UIDS.

### ADR-070 · „Sdílené" kategorie ≠ COICOP **(v8.23)**
Dva nezávislé mechanismy: (1) `coicopOverrides` = podkategorie se počítá do jiné COICOP divize než kategorie (Alkohol→2 v Jídle/11, Zdravotní pojištění→6 v Pojištění/12). (2) `shared` = kategorie se zároveň objevuje jako podkategorie jinde (Pojištění je i v Bydlení a Autu). Bydlení je „sdílené" protože Pojištění má `shared:['cat3','cat11']`, ne kvůli COICOP. Záměrné, ne náhoda.

### ADR-071 · API náklady = provozní data, ne analytika **(v8.21)**
Per-user API tracking (volání, tokeny, Kč) a komunitní agregace jsou interní admin/provozní data — legitimní bez souhlasu uživatele (provozní/účetní nutnost). Souhlas (GDPR) se týká analytiky chování (GA4), ne provozního měření nákladů.

### ADR-072 · Verzovací hlavička v souborech **(v8.24)**
Každý změněný soubor nese na začátku `// FinanceFlow · vX.XX · soubor · datum`. database_rules.json používá `//` komentář (Firebase RTDB pravidla je přijímají, konzole je strhne). Umožňuje okamžitě poznat aktuálnost souboru bez dohadování stará/nová verze.

---

## 📄 todo.md

### TODO-137 · Cookie/consent UI pro analytická data **(plánováno)**
Přepínač „Povolit analytická data" (GA4) v appce — nezbytná data vždy zapnutá, marketingové vynechat (žádné reklamy). GA4 v app.html teď běží bezpodmínečně — musí poslouchat souhlas. Důležité pro GDPR.

### TODO-138 · Hlídač součtu limitů kategorií **(open)**
Žádný cenový/součtový hlídač u `healthPct` — uživatel může nastavit součet limitů přes 100 % a nic ho nezastaví. Návrh: upozornění při překročení 100 % příjmu + volitelný rozpočtový strop.

### TODO-139 · Doporučené limity v checklistu **(open)**
Tlačítko „Nastavit doporučené limity" pro nové uživatele — předvyplní rozumné `healthPct` (bydlení 25 %, jídlo 15 %, doprava 10 %…).

### TODO-140 · Checklist pokyn „nastav limit kategorie" **(open)**
Po přidání transakce do kategorie bez limitu nabídnout nastavení limitu (promyslet umístění, ať není otravné).

### TODO-141 · Kategorie typu „přesun" pro spoření/investice/fondy **(open)**
Spoření jako `type:expense` se počítá do výdajů (`expSum` nevylučuje `isSaving`, jen transfery). Návrh: spoření/investice/fondy jako přesun, aby se nepočítaly jako spotřeba. Pozor: dotkne se statistik, skóre, čistého majetku — promyslet ať nerozbije výpočty.

### TODO-142 · Plná telemetrie aktivity **(open)**
Pro detailní statistiku aktivity (čas v appce, prokliky menu, počet přihlášení) je třeba začít sbírat data. Jednoduché skóre z existujících dat hotové (v8.18). Plná telemetrie = samostatná featura + souhlas.

### TODO-075 · AI Rate Limiting — aktivace **(kód hotový, pending secrets)**
Kód rate limitingu plně napsaný (ADR-041), ale aktivní jen když má worker OBA secrets FIREBASE_SERVICE_ACCOUNT + FIREBASE_DB_URL (fail-open). Per-typ měsíční kvóty Free/Trial/Premium/Admin. Bez secrets se přeskakuje.

---

## 📄 architecture.md

### Verzovací hlavička (S13, v8.24)
Každý zdrojový soubor (JS, worker.js, sw.js, database_rules.json) nese na prvním řádku `// FinanceFlow · vX.XX · soubor · datum`. Slouží k okamžité identifikaci aktuálnosti při porovnání produkce vs pracovní kopie.

### resetAppState (S13, v8.15)
`resetAppState()` v app.js: odpojí `_dbListener` (vlastní uzel) + partner listenery, vynuluje S/partnerData/viewingUid/saveTimeout. Voláno při odhlášení (firebase.js, před `_currentUser=null`) a na začátku `onUserSignedIn`. Kritické pro izolaci dat mezi uživateli.

### API usage tracking (S13, v8.21)
Worker → `users/{uid}/aiUsage/{YYYY-MM}`: počty per typ, total, lastCallAt (checkAndIncrementQuota) + tokensIn/Out/Total, costCzk, tokens_<typ>, cost_<typ> (recordTokens, po odpovědi Claude). Cena: SONNET_PRICE_IN_USD=3, OUT=15, USD_CZK=23.5. Admin: openUserDetail sekce Spotřeba AI + loadCommunityActivity (agregace přes _cachedUsers).

### Detekce sdílených podkategorií (S13, v8.23)
V renderu podkategorií: `cats.find(x => x.name === s && (x.shared||[]).includes(c.id))` → podkategorie která je zároveň samostatnou kategorií hlásící se přes `shared`. Vizuální označení (zlatý rámeček + ↔).

---

## 📄 Resume.md

# 📋 Resume — FinanceFlow Session 13

**Verze:** v8.10 → **v8.24** (15 verzí)
**Datum:** 18.–20. 6. 2026
**Jazyk:** čeština · **Stack:** Vanilla JS, Firebase, Cloudflare Workers, Claude API

## 🎯 Hlavní milníky session

1. **KRITICKÝ fix úniku dat mezi uživateli** — reset stavu + odpojení listenerů při odhlášení, čistý nový uživatel, 100% mazání dat
2. **Velký refaktor cílů** — reverz peněz mazáním transakce, měnový přepočet, sloučený modal Přání/Cíl
3. **Kategorie virtuálních přesunů v reálných datech** — žádné vymyšlené ID, hledání podle jména
4. **API tracking** — tokeny + náklady v Kč per user/typ + komunitní agregace v admin panelu
5. **Worker model fix** (claude-sonnet-4-6) — zprovoznění všech AI funkcí
6. **Béžové téma, skóre aktivity, sloupce tabulky, sloučený komunitní bar**
7. **Export CSV, vyhledávání napříč měsíci, měsíční checklist, stránka nápovědy**
8. **COICOP vyjasnění** — coicopOverrides vs shared, označení sdílených podkategorií
9. **Verzovací hlavičky souborů** — okamžitá identifikace aktuálnosti

## 🚀 Deploy stav
- Hosting: `firebase deploy --only hosting`
- Worker: Cloudflare Dashboard (model fix + token tracking nasazeno)
- Pravidla: database_rules.json (welcomeMessage + aiUsage)
- ⚠️ Ověřit secrets FIREBASE_SERVICE_ACCOUNT + FIREBASE_DB_URL v Cloudflare (rate limiting + token tracking)

---

## 📄 VERSIONING.md

### Verzovací hlavička souborů (Session 13, v8.24)

Každý změněný zdrojový soubor nese na **prvním řádku** verzovací hlavičku:

```js
// FinanceFlow · v8.24 · app.js · 2026-06-20
```

- **JS soubory:** `// FinanceFlow · vX.XX · <soubor> · <datum>` na řádku 1
- **worker.js:** v existující `/** ... */` hlavičce řádek `* FinanceFlow · Cloudflare Worker · vX.XX · datum`
- **sw.js:** v komentářové hlavičce `//  FinanceFlow · Service Worker · vX.XX · datum`
- **database_rules.json:** `// FinanceFlow · database rules · vX.XX · datum` na řádku 1 (Firebase RTDB pravidla `//` komentáře přijímají, konzole je strhne)

**Pravidlo:** při každém bumpu verze aktualizovat hlavičku každého změněného souboru na novou verzi. Hlavička se mění → mění se hash → přegenerovat `?v=hash` v app.html (standardní postup). Účel: na první pohled poznat zda je soubor aktuální verze, bez dohadování stará/nová.

**Pořadí 5 atomických kroků verzování (rozšířeno):**
1. `<title>` v app.html
2. Sidebar text (`vX.XX · <span id="sidebarTierLabel">`)
3. „Verze X.XX" banner (O aplikaci)
4. `CACHE_NAME` (ff-shell-vX.XX) v sw.js
5. **Verzovací hlavička každého změněného souboru** + sha256 hashe v app.html + `VERZE_LOG` v admin.js (přegenerovat admin.js hash NAPOSLEDY)

---

## 📄 context.md

### Session 13 (v8.10 → v8.24, 18.–20. 6. 2026)

Hlavní téma: **izolace dat mezi uživateli** (kritický fix), dotažení cílů/přání, API tracking nákladů, vyjasnění COICOP mechanismů, kvalita pro nové uživatele (čistý start, onboarding, nápověda).

Klíčové soubory dotčené: app.js (resetAppState, seedData, getData), firebase.js (logout reset), settings.js (CSV export, mazání dat, béžové téma), premium.js (findCatIdByName, exportCSV), stats.js (zamčená kategorie, sdílené podkategorie, COICOP warning), admin.js (partner view, activity score, API tracking, komunitní aktivita, COICOP mapování), ui.js (payType filtr, sloupce tabulky, vyhledávání, měsíční checklist), nakup.js + budouci.js (oprava cílů), worker.js (model fix, recordTokens), database_rules.json (welcomeMessage, aiUsage).

Nové soubory: napoveda.html (stránka nápovědy pro financeflow.cz).

Konvence zavedené: verzovací hlavička v každém souboru (v8.24), kategorie virtuálních přesunů přes findCatIdByName (ne hardcoded ID).
