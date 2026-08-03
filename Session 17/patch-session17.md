# Patch Session 17 — v9.00 → v9.42

**Období:** 2026-07-19 → 2026-08-01 · **Verzí:** 42 · **Nové moduly:** 3 (`report.js`, `inflace.js`, `review.js`)

Session 17 měla dvě těžiště: **produktové funkce** (Report, Inflace, Review, Sezónnost, Ušlý zisk) a **spuštění plateb** (Stripe end-to-end včetně bezpečnostních oprav, které by jinak podřízly monetizaci).

---

## 1. NAVIGACE A STRUKTURA

### v9.00 — Menu redesign
Sidebar reorganizován do 11 sekcí dle Milanova zadání: PŘEHLED · MAJETEK · PLÁNOVÁNÍ · AI ASISTENT · ANALÝZY · NÁSTROJE · RODINA · SPRÁVA · IMPORT DAT · BETA (admin) · ADMIN SEKCE.
Souhrn výdajů skryt pro uživatele (přesunut do BETA, jen admin) — obsah je součástí Měsíčního reportu.

### v9.02 — Ikony
Prohozeny ikony Predikce 🔮 ↔ Simulace života 🧭.

---

## 2. NOVÉ MODULY

### `report.js` (v9.09, redesign v9.12) — karta Report
Matice roků dle Milanova Excelu. Premium/Pro, sekce Analýzy, page id `report2`.
- Taby: Přehled (matice) · Tento měsíc · Kumulace roku · Roky
- **v9.12 redesign:** kategorie seskupené do **sektorů** dle COICOP oddílů ČSÚ + samostatný sektor 💳 Splátky (z `t.debtId`). Barevná hlavička sektoru, zelený mezisoučet, žlutý CELKEM. Nahoře mřížka sektorů s podílem v % a Kč.
- CSS třída `.report-matrix` (sticky header i první sloupec, hover, mobil 680px)

### `inflace.js` (v9.11, opravy v9.17–9.20) — karta Inflace
Vlastní inflace z účtenek. Premium/Pro.
- **Dva indexy:** YoY (medián 12 měs vs. předchozích 12) + první→poslední cena + jejich rozdíl. Oba vážené podílem na výdajích.
- Tabulka **podle obchodu** + tabulka položek
- **Sloupec „Za kg/l"** (v9.19) — u váženého zboží přímo jeho cena (zdražení se odhalí i při různě nakoupené hmotnosti), u baleného dopočet z názvu + detekce **shrinkflace** (|Δ% per kg − Δ% balení| > 3 p.b.)
- Karta **„položka napříč obchody"** (v9.20) při výběru jedné položky: první/poslední cena, **Běžná Ø** (bez akce), **Akční Ø**, za kg/l, štítek „nejlevnější"
- Multifiltr obchody + položky (rozbalovací seznam abecedně od v9.15)
- Slevněné položky značené, do indexu default nezahrnuté (přepínač)

### `review.js` (v9.34) — Měsíční review (TODO-198)
Hodnocení útrat 1–5 („Stálo to za to?"), tlačítko v Měsíčním reportu.
- **Tři pohledy:** 📦 Sumarizace (skupiny vč. položek z účtenek — pečivo, sladkosti, pivo, alkohol, káva, maso, mléčné, ovoce/zelenina, nápoje, cigarety, drogerie, mazlíček) · 🔟 Top 10 · 🔬 Vše (jen admin)
- **Srovnání přístupů** (admin): kolik % objemu pokryje top 5 skupin vs. top 10 transakcí vs. všechny → odpoví, jestli má smysl sumarizace
- Návrh hodnocení vychází **výhradně z historie uživatele** (min. 3 záznamy), zobrazen jen jako orientační „Ø". Aplikace nikdy sama neoznačí útratu za zbytečnou.
- Souhrn mluví o **budoucnosti** („kdybys polovinu přesměroval, je to X Kč za rok"), ne o výčitkách
- Data: `transactions[].priority` + `priorityNote`

---

## 3. NOVÉ FUNKCE

| Verze | Funkce |
|---|---|
| v9.02 | **Sezónnost po kategoriích** (TODO-184) — tabulka pod grafem Sezonalita, % nad nejlevnějším měsícem, heatmap |
| v9.02 | **Přesnost predikce** (TODO-186) — 4. záložka grafu predikce, tracking měsíc po měsíci, MAPE, auto-snímek `denikAutoSnapshot` |
| v9.03 | **Ušlý zisk** (TODO-183) — karta ve Finančním obrazu, per-peněženka úrok, referenční sazba, operační rezerva |
| v9.04 | **Hodinová mzda** — Pracovní kalendář: efektivní hodinovka, základní sazba přes vážené hodiny, příplatky víkend/svátek/noční/přesčas, CZ svátky vč. Velikonoc |
| v9.04 | **Výchozí peněženka + typ platby** v Nastavení |
| v9.05 | **Budoucí platby → „✓ Zaplaceno"** (přepracováno v9.07/9.08 na detekci z transakcí) |
| v9.06 | **Přesčas jako samostatný typ dne** (v9.10 + výběr směny) |
| v9.06 | **„🔄 + Šablona" v panelu Transakce** + typ Dluh/Splátka v šablonovém modalu |
| v9.13 | **Detektor úspor: 🍺 Alkohol & tabák + 🛒 Častý nákup** (top 5 z účtenek za 3 měs) |
| v9.13 | **Graf položek → čárový** s multifiltrem, 12měsíční tracker |
| v9.14 | **Třetí bar 👥 Komunita** v COICOP tabulce |
| v9.15 | **Kumulace v grafu nákupů** (📊 Měsíčně / 📈 Kumulativně, sloupcově) |
| v9.16 | **„Vše od začátku"** rozbalí kompletní seznam položek (zrušen limit 15) |
| v9.22–24 | **Finanční obraz:** aktuální měsíc v grafu, popisky hodnot, cashflow v rámečku, čára Rezerva, **slovní vyhodnocení na 6 měsíců** |
| v9.23–24 | **Graf cyklů přepracován** — týdenní mediány jako sloupce, denní režim, zelená křivka „zbývá z výplaty" |
| v9.23 | **Stres index redesign** — gauge dle Fin. obrazu, faktory jako kompaktní karty |
| v9.38 | **Připomenutí konce trialu** na Dashboardu (posledních 7 dní, rostoucí naléhavost) |

---

## 4. STRIPE — SPUŠTĚNÍ PLATEB (TODO-153)

### v9.26 — Webhook
`worker.js`: route `POST /stripe-webhook`. Ověření Stripe-Signature (HMAC-SHA256, Web Crypto, timing-safe), události `checkout.session.completed` / `invoice.paid` / `customer.subscription.deleted`, zápis `users/{uid}/premium` přes Firebase DB Secret.
Mapování `stripeCustomers/{customerId}` → uid řeší renewal/cancel eventy, které nenesou `client_reference_id`.

### v9.27 — Zakládající cena
99 Kč/měs a 990 Kč/rok pro prvních 100 uživatelů. **Samostatný Payment Link nad vlastní cenou, ne kupón** — kupón po čase vyprší a cena by skočila na 149; zakládající cena má platit navždy.
Počítadlo `stats/founderCount` inkrementuje webhook, klient jen čte.

### v9.28 — Audit plateb
Admin záložka **💳 Audit plateb**: klasifikace ✅ Zaplaceno / 🔵 Ručně / 🔴 PODEZŘELÉ, dlaždice s „Přijato dle logu" k porovnání se Stripe Dashboard, obsazenost zakládajících míst, hlídání anomálií (trial > 32 dní, premiumUntil > rok).
**Neměnný audit log** `premiumLog/{uid}` — zapisuje jen webhook, klient nemá čtení ani zápis.

### v9.30–9.32 — Payment Links
Vloženy ostré odkazy: zakládající 99/990, běžné 149/1490, donate, Customer Portal.
`planFromPriceId` využívá explicitní mapování price ID → tier.

### v9.42 — Checkout UX
Informační lišta po otevření platby (checkout je v nové záložce bez historie → Zpět nefunguje).

---

## 5. OPRAVY CHYB

### 🔴 Kritické (blokovaly monetizaci nebo ohrožovaly příjmy)

| ID | Verze | Popis |
|---|---|---|
| **—** | v9.27 | **Self-upgrade na Premium.** `users/$uid` mělo `.write: auth.uid === $uid` a v Firebase právo zápisu **kaskáduje dolů** → `users/{uid}/premium` byl volně zapisovatelný z klienta. Kdokoli si mohl nastavit `{type:"premium", premiumUntil:9999...}`. Řešeno přes `.validate` (nekaskáduje): z klienta smí `type` jen `trial`/`free`, `premiumUntil` jen do minulosti, `trialUntil` max +32 dní, `trialUsed` nejde vrátit na false. Stejnou dírou šlo resetovat `aiUsage` a obejít AI kvóty (přímý náklad na Claude API). |
| **FIX-220** | v9.36 | **Trial nešel nikomu spustit.** `startTrial` zapisuje dedup uzel `trialsUsed/{emailKey}`, ale ten **neměl v pravidlech nic** → PERMISSION_DENIED shodil celou aktivaci. Doplněna pravidla + zpevnění (dedup je bonus, ne podmínka). |
| **FIX-223** | v9.41 | **Firefox blokoval platební bránu.** `window.open` se volal až po `await` (zjišťování zakládajících míst) → prohlížeč to nevyhodnotil jako reakci na klik. Počet míst se nyní načítá dopředu do cache, checkout se otevírá synchronně. Pojistka: fallback do aktuální záložky. |
| **—** | v9.17 | **ReferenceError: rows is not defined** — celá aplikace nešla načíst. Při refaktoru `coicop.js` zůstal v novém obalu původní řádek odkazující na proměnné staré funkce. `node --check` chybu neodhalil (syntakticky validní). |

### 🟠 Datové chyby (zkreslené výstupy)

| ID | Verze | Popis |
|---|---|---|
| **FIX-212** | v9.13 | **Srovnání ČR** sčítalo `tx.amount` bez `txCZK` a bez vyloučení přesunů/splitů → cizí měny v nominálu, přesuny jako výdaj. Srovnání s ČSÚ nadhodnocené. |
| **FIX-213** | v9.14 | **Komunitní přehled** publikoval **názvy kategorií**, ale čtecí strana očekává **COICOP ID 1–13** → mapování selhávalo („COICOP Jídlo & Pití"). Navíc bez `txCZK` a bez vyloučení. *(Třetí výskyt téže třídy chyby.)* |
| **FIX-211** | v9.13 | COICOP tabulka ignorovala zvolený měsíc (dostávala vždy všechny položky) + počítala `price × qty` místo `lineTotal` (ignorovala slevy, rozpor s ADR-059). |
| **FIX-215/216** | v9.17/9.18 | **Inflace: „Rohlík 43g = 81 Kč".** Přepočítávala na Kč/kg **všechny** položky s hmotností v názvu. Rohlík se prodává na kusy. Nově hlavní metrikou cena za balení, Kč/kg jen u váženého zboží (`unit=kg/l`) + jako doplněk pro shrinkflaci. |
| **FIX-210** | v9.06–9.09 | **Auto-šablony.** Původně `today.getDate()===den` → transakce vznikla jen když uživatel otevřel appku přesně v den splatnosti. Po iteracích finální pravidlo: doplní se výskyt tohoto měsíce, **jen pokud den splatnosti ještě nenastal** (proaktivně, nikdy zpětně). |

### 🟡 UX a zobrazení

| ID | Verze | Popis |
|---|---|---|
| **FIX-207** | v9.03 | Klik na tag vedl na prázdné transakce (Tagy agregují napříč měsíci, filtr bral jen zvolený) |
| **FIX-208** | v9.03 | Skryté karty Dashboardu nešlo obnovit — chybělo tlačítko |
| **FIX-209** | v9.04 | Přesčas nešel nastavit: desetinná čárka na mobilu → NaN → tichý fallback |
| **FIX-214** | v9.15 | COICOP karta zmizela i s přepínačem, když v měsíci nebyly účtenky |
| **FIX-217** | v9.21 | Souhrn výdajů se zobrazoval pod Poradcem — guard existoval, ale větev končí **early return** před úklidem; `#reportSouhrn` je navíc **sourozenec**, ne potomek |
| **FIX-218** | v9.30 | `isLiveEnv()` neznal doménu `financeflow.cz` → na produkci by se nabízely nevyplněné testovací odkazy |
| **FIX-219** | v9.35 | Odkaz na Zdražování otevíral prázdnou stránku (špatné ID záložky + `showPage` vykresluje až později) |
| **FIX-221** | v9.37 | Banner hlásil „Trial vypršel" i nováčkům, kteří trial nikdy neměli |
| **FIX-222** | v9.39 | Paywall vždy spouštěl trial — kdo chtěl zaplatit, neměl jak; po aktivaci trialu nešlo předplatit vůbec |
| **—** | v9.10/9.11 | Přetékání textu na mobilu (5 míst) → systémově v `styles.css` (clamp, overflow-wrap, breakpoint 480→680px) |

### 🔧 Admin

| Verze | Popis |
|---|---|
| v9.29 | **Admin nemohl odebrat Premium** cizímu uživateli — `users/$uid` nemělo admin výjimku ve `.write`. Doplněno **výhradně na uzel `premium`** (ne na finanční data uživatelů). |
| v9.29 | **Banování účtu** — nový uzel `banned/{uid}` **mimo** `users/{uid}` (jinak by si ho uživatel smazal, protože právo zápisu kaskáduje) |

---

## 6. ZMĚNĚNÉ SOUBORY

**Nové:** `report.js` · `inflace.js` · `review.js` · `.nojekyll`

**Upravené:** `app.html` · `admin.js` · `projects.js` · `premium.js` · `receipts.js` · `coicop.js` · `debts.js` · `kalendar.js` · `budouci.js` · `transactions.js` · `ui.js` · `donate.js` · `nakup.js` · `settings.js` · `app.js` · `sw.js` · `styles.css` · `index.html` · `worker.js` · `database_rules.json`

**Nasazují se zvlášť:** `worker.js` (Cloudflare) · `database_rules.json` (Firebase Console) · `.nojekyll` (kořen repa)

---

## 7. NOVÁ TODO

| ID | Popis | Priorita |
|---|---|---|
| TODO-182 | Bank: graf 12 měsíců + ruční výnosy ze Správy majetku | 🟡 P2 |
| TODO-187 | Mimořádné transakce mimo statistiky (hypotéka) — přes Projekt, typ Přesun | 🟡 P2 |
| TODO-188 | Landing: slogany + vyzdvihnout funkce | ✅ částečně v9.21 |
| TODO-189 | Účtenková služba (admin sken pro jiné uživatele) | 🟢 P3 |
| TODO-190 | Budoucí platby → auto-materializace | 🟡 P2 |
| TODO-191 | Defaultní peněženky + checklist krok pro nové uživatele | 🟡 P2 |
| TODO-192 | Sjednocení opakování do modalu transakce (plán ve 3 fázích) | 🟡 P2 |
| TODO-193 | Report přehled — další taby + PDF export | 🔴 P1 |
| TODO-194 | Provázání položkových COICOP dat s komunitou | 🟡 P2 |
| TODO-195 | Přesunout Inflaci do Analýzy účtenek | 🟡 P2 |
| TODO-196 | Sjednocení názvů položek (překlepy) — 3 vrstvy vč. admin kurátora | 🟡 P2 |
| TODO-197 | Inflace: matice položky × obchody | 🟡 P2 |
| **TODO-198** | **Měsíční AI review** — ✅ fáze 1 hotová v9.34, fáze 2–4 zbývají | 🔴 P1 |
| TODO-199 | Checkout Session s `cancel_url` místo Payment Links | 🟡 P2 |

---

## 8. ZBÝVÁ NA MILANOVI

1. Nasadit `database_rules.json` (naposledy měněn v9.36 — obsahuje opravu trialu) a `worker.js` (v9.33)
2. Cloudflare Secrets: `STRIPE_PRICE_FOUNDER`, `STRIPE_PRICE_FOUNDER_YEARLY` (bez nich se nepočítají zakládající místa)
3. Otestovat platbu 99 Kč → ověřit `users/{uid}/premium`, `stats/founderCount`, Audit plateb → refundovat
4. Rozhodnout o promo kódech (pozor: sleva by šla uplatnit i na zakládající cenu — omezit na konkrétní produkty)
