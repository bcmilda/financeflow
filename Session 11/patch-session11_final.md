# FinanceFlow – Patch Session 11 FINAL (MD-Diff Multi-patch)

> Session 11 · v7.50 → v7.68 · 2026-06-08 až 2026-06-09
> Struktura dle UPDATE_RULES sekce 8 (separátory `## 📄 soubor.md` pro AI Merge).
> Témata: landing page v4, doména financeflow.cz go-live, Resend/ImprovMX email, GA4,
> affiliate+partner sjednocení, receipt bugy (cena/edit/sloupce), Split double counting,
> zelené tagy, render-bug (_dataSig), virtuální peněženka v převodech, verze banner.

---

## 📄 bugs.md

> Nové bugy a opravy ze Session 11 (v7.50 → v7.68).

### FIX-118 · saveToFirebase() mazal assets + importHistory **(Session 11)**
- **Příčina:** `saveToFirebase()` neobsahoval klíče `assets` a `importHistory` → Firebase `_set` přepsal celý uzel a obě data tiše smazal při každém uložení.
- **Oprava:** Doplněny oba klíče do objektu v `saveToFirebase()`.
- **Soubor:** `app.js`
- **🔗 Cross-reference:** `explanations.md` – Data-loss pattern (Firebase _set přepisuje celý uzel).

### FIX-119 · Receipt cena – chybný výpočet u váhových položek **(Session 11)**
- **Příčina:** AI prompt říkal `price = cena za kus` ale výpočet total dělal `price × qty`. U váhových položek (meloun 6,445 kg × 29,90 = 192,71 se slevou 128,26) Claude počítal 6,445 × 128,26 = 826 Kč.
- **Oprava:** Nové pole `lineTotal` (vždy skutečně zaplacená cena řádku) + `discount`. PRAVIDLO 2 (váhové): price=cena/kg, qty=hmotnost, lineTotal=zaplaceno. PRAVIDLO 3 (sleva na samostatném řádku): lineTotal=po slevě. Helper `lineAmt(it)` = `it.lineTotal ?? price×qty` (zpětně kompatibilní).
- **Soubor:** `worker.js` (prompt, deploy Cloudflare), `receipts.js` (lineAmt, všechny statistiky)

### FIX-120 · Split DOUBLE COUNTING napříč aplikací **(Session 11)**
- **Příčina:** Split parent (celá částka, vlastní catId) + children (rozpad, vlastní catId) se počítaly DVAKRÁT. Příklad: PENNY 99,90 (Jídlo) + Doprava 49,95 + Dítě 49,95 = 199,80 místo 99,90.
- **Oprava:** Filtr `!t.splitParent` přidán na 5 míst: `getActual`/`incSum`/`expSum` (helpers.js), `allExpTxs` (ui.js suhrn), měsíční výdaj index (transactions.js), `prevYearTotal`/`allTotal`/`allIncome` (stats.js). Split parent se nikde nezapočítává – children pokrývají celou sumu.
- **Soubor:** `helpers.js`, `ui.js`, `transactions.js`, `stats.js`
- **🔗 Cross-reference:** `explanations.md` – Split double counting pattern.

### FIX-121 · Editace účtenky v Historii selhávala po navigaci **(Session 11)**
- **Příčina:** `setTimeout(initReceiptEditor, 50)` → race condition s Firebase `onValue` re-renderem který zničil slot dřív než editor naběhl. Navíc globální `window._editReceipt` nebyl resetován → konflikt stavu po překliknutí.
- **Oprava:** Synchronní `initReceiptEditor()` (bez setTimeout) + reset `window._editReceipt = null` + zavření všech ostatních editorů před otevřením. Guard v `initReceiptEditor` (abort pokud form chybí).
- **Soubor:** `receipts.js`

### FIX-122 · rpRender focus guard blokoval změnu kategorie **(Session 11)**
- **Příčina:** Guard `if(focused && focused.closest('#rp_items')) return` blokoval re-render pro JAKÝKOLI focusovaný prvek včetně `<select>` → po změně kategorie se subkategorie nevykreslila (až po uložení).
- **Oprava:** Guard blokuje jen TEXT inputy (`INPUT` typu != number), `SELECT` povolen. Subkategorie select zobrazen VŽDY vedle kategorie (opacity 0.4 pokud bez kategorie). `catEl.blur()` před `rpRender()`.
- **Soubor:** `receipts.js`

### FIX-123 · Zelené tagy z účtenky se nezobrazovaly v transakcích **(Session 11)**
- **Příčina:** `addReceiptAsTx` ukládá tagy jako STRING (`join(' ')`), ale `buildTxRow` kontroloval `(t.tags||[]).length` – u stringu vrátil délku textu (truthy) → `.map()` na stringu spadl → tagy neviditelné.
- **Oprava:** `Array.isArray(t.tags)` check. Array tagy = modré (manuální editace), string tagy = zelené (z účtenky).
- **Soubor:** `ui.js`

### FIX-124 · Render-bug: změny se projevily až po překliknutí **(Session 11)**
- **Příčina:** Anti-flicker guard v `renderPage()` přeskočil re-render když `_dataSig()` signature nezměněna. Signature sledovala jen počty + sumy transakcí/aktiv/dluhů – NESledovala wallet balances, virtuální cíle, tagy, podkategorie. Přidání 1000 Kč do cíle → signature stejná → render přeskočen.
- **Oprava:** `save()` vždy nastaví `_renderForce = true` (user akce vynutí render). `_dataSig` rozšířen o `wsum` (wallet balances), `gsum` (cíle), `tsum` (tagy+subcat délka).
- **Soubor:** `app.js`, `ui.js`

### FIX-125 · Verze v O aplikaci banneru se neaktualizovala **(Session 11)**
- **Příčina:** Banner měl formát `Verze 7.55</div>` ale sed pattern hledal `>Verze 7.XX<` → nikdy netrefilo. Banner zůstal na 7.55 přes mnoho verzí.
- **Oprava:** Sed pattern opraven na `>Verze 7.XX<`. Banner nyní = v7.68.
- **Soubor:** `app.html`
- **🔗 Cross-reference:** `VERSIONING.md` – verze bump je 4 atomické kroky, banner je 3. krok.

### FIX-127 · Edit účtenky prázdný (návrat bugu) – ROOT CAUSE **(Session 11)**
- **Příčina:** v7.68 `save()→_renderForce=true` způsobil že Firebase `onValue` sync spustil plný `renderPage()`→`renderUctenky()` který přepsal otevřený inline editor slot dřív než se položky vykreslily. Editor zůstal prázdný (jen tlačítko Uložit).
- **Oprava:** Flag `window._receiptEditorOpen` → `renderUctenky()` přeskočí re-render dokud je editor otevřený. Flag set v editReceiptFromHistory, clear v rpSave + toggle close. Záložní rpRender přes requestAnimationFrame.
- **Soubor:** `receipts.js`
- **🔗 Cross-reference:** Souvisí s FIX-124 (_renderForce) – vedlejší efekt.

### FIX-128 · Mobilní vizuál: částka přes text v Historii **(Session 11)**
- **Příčina:** History řádek měl částku + kategorie tagy ve stejném flex kontejneru → na úzkém mobilu se překrývaly.
- **Oprava:** 2-řádkový layout: datum+obchod+částka+akce (horní řádek), kategorie tagy přes celou šířku (dolní řádek).
- **Soubor:** `receipts.js`

### FIX-126 · Grafy duplikátní navigace + nečitelná legenda **(Session 11)**
- **Příčina:** Přidány grafMonthNav/grafYearNav které duplikovaly existující navigaci uvnitř karet. Legenda v canvas 9px v rohu, nečitelná.
- **Oprava:** Duplikátní nav odstraněn. Legenda přesunuta do HTML `#mesicniLegend` pod grafem (0.82rem, barevné indikátory). Filtry kompaktní (height 28px). Roční↔Vsechny sdílí filtry.
- **Soubor:** `charts.js`, `app.html`

---

## 📄 decisions.md

> Nová architektonická rozhodnutí ze Session 11.

### ADR-055 – Doména financeflow.cz go-live **(Session 11)**
- **Datum:** 2026-06-08
- **Rozhodnutí:** Web rozdělen: `financeflow.cz/` = landing (index.html), `/app` = aplikace (app.html), `/legal` = privacy. Firebase Hosting rewrites + `<base href="/">` v app.html.
- **Důvod:** Oddělit marketingovou landing page od aplikace pro lepší konverzi a SEO.
- **Status:** ✅ Nasazeno (WEDOS DNS, Firebase A 199.36.158.100, SSL auto).

### ADR-056 – Email infrastruktura: Resend + ImprovMX **(Session 11)**
- **Datum:** 2026-06-08
- **Rozhodnutí:** Odesílání transakčních emailů přes Resend (doména financeflow.cz, EU region, DKIM/SPF/DMARC). Příjem přes ImprovMX (free, forward info@→bc.milda@gmail).
- **Důvod:** Resend free tier 1 doména stačí. ImprovMX zdarma pro příjem (Resend řeší odesílání).
- **Status:** ✅ Verified.

### ADR-057 – GA4 analytika **(Session 11)**
- **Datum:** 2026-06-08
- **Rozhodnutí:** Google Analytics 4 (G-F2Z8DK4RR0) na landing i app. `anonymize_ip:true`, app `send_page_view:false` + manuální page_view v showPage().
- **Důvod:** Sledování návštěvnosti bez citlivých finančních dat.
- **Status:** ✅ Nasazeno. ⚠️ GDPR Consent Mode pro EU doporučeno do budoucna.

### ADR-058 – Sjednocení affiliate + partner odkazu **(Session 11)**
- **Datum:** 2026-06-09
- **Rozhodnutí:** Jeden `?ref=KÓD` odkaz dělá affiliate I partnerské párování. `checkIncomingRef` resolve `referrals/{ref}/uid` → owner → `pairPartners()` (bidirektivní + 50 bodů, dedup v `partner_bonus/`). Partner bar odstraněn z UI. Staré `?partnerOf=UID` odkazy zachovány pro zpětnou kompatibilitu.
- **Důvod:** Dva odkazy mátly uživatele. Jeden odkaz = jednodušší sdílení.
- **Status:** ✅ Nasazeno.

### ADR-059 – Receipt lineTotal + discount datový model **(Session 11)**
- **Datum:** 2026-06-09
- **Rozhodnutí:** Položka účtenky má `price` (cena/ks nebo /kg), `qty`, `unit`, `lineTotal` (skutečně zaplaceno), `discount`. Helper `lineAmt(it) = lineTotal ?? price×qty`.
- **Důvod:** Váhové položky a slevy nešly správně počítat z price×qty. lineTotal je zdroj pravdy, zpětně kompatibilní.
- **Status:** ✅ Nasazeno.

---

## 📄 features.md

> Nové funkce ze Session 11.

### Landing page v4 **(Session 11)**
- Outcome-framing místo feature-listu. Sekce: hero (receipt breakdown WOW), nepřítel (finanční slepota), user journey Den 1→30, banka-vs-FinanceFlow tabulka, founder story, FOMO pricing (zakládající 49 Kč), viral score card, testimonials.
- **Soubor:** `index.html`

### Virtuální peněženka v převodech **(Session 11)**
- "Převod mezi peněženkami" nyní umožňuje převod z reálné peněženky do virtuálního cíle (optgroup 🎯). `doTransfer` zpracuje `goal:ID` → výdaj z peněženky + vklad do `goal_deposits/{id}`.
- **Soubor:** `premium.js`
- **🔗 Cross-reference:** `todo.md` TODO-056 (Plány a cíle).

### Receipt items v transakcích (Split styl) **(Session 11)**
- Transakce ze skenované účtenky zobrazí badge 📷 N pol. ▾ → klik rozbalí položky (grid Položka|Kč|Mn.). Transakce a Historie účtenek jsou 1:1. 📷 tlačítko otevře konkrétní účtenku v Historii (`openReceiptInHistory` podle receiptDate+receiptStore).
- **Soubor:** `ui.js`, `receipts.js`

### Sledování slev z účtenek (příprava) **(Session 11)**
- `discount` pole v AI promptu. Připraveno pro propojení s Nákupním seznamem (TODO-117).
- **Soubor:** `worker.js`

---

## 📄 todo.md

> Nové úkoly a aktualizace stavů ze Session 11.

### TODO-111 · Google Analytics 4 **(Session 11)** ✅ HOTOVO
- Implementováno v7.63. Tag G-F2Z8DK4RR0 na landing i app.

### TODO-117 · Slevy z účtenek → Nákupní seznam **(Session 11)** 🟡 P2
- **Popis:** Položka s `discount > 0` → fuzzy match s `nakupList` → zapsat do `catalog/items/{key}.lastDiscount: {date, store, pct, saved}` → push notifikace "X byl v akci −Y% v Z".
- **Stav:** discount pole v promptu hotovo, propojení čeká.

### TODO-118 · "Upravit split" UI button **(Session 11)** 🟢 P3
- **Popis:** Re-editace splitu bez nutnosti mazat children. Aktuálně nelze split znovu upravit.

### TODO-119 · Push notifikace na mobil **(Session 11)** 🔴 P1
- **Popis:** Push se zobrazí jen v aplikaci, ne jako systémová notifikace telefonu. Subscription v RTDB jen z Firefox/Windows.
- **Akce:** Ověřit `push_subs/` obsahuje mobile endpoint, VAPID klíče v Cloudflare Worker, mobile subscribe flow (systémový dialog povolení).

### TODO-120 · ~~Sjednotit affiliate + partner odkaz~~ **(Session 11)** ✅ HOTOVO
- Sjednoceno v v7.68 (ADR-058). Jeden ?ref= odkaz dělá obojí.

### TODO-093 update **(Session 11):** Anti-flicker `_dataSig` rozšířen o wallet balances, cíle, tagy. `save()` vždy vynutí render. Viz FIX-124.

---

## 📄 explanations.md

> Hlubší vysvětlení vzorů a pastí objevených v Session 11.

### Split double counting pattern **(Session 11)**
Split transakce = 1 parent (celá částka, vlastní kategorie) + N children (rozpad do jiných kategorií). KAŽDÁ agregace transakcí musí filtrovat `!t.splitParent`, jinak se částka počítá dvakrát (parent + součet children). Past: oprava jen v jedné funkci nestačí – nutný audit VŠECH agregačních míst (getActual, incSum, expSum, allExpTxs, měsíční index, roční/all totály). Pravidlo: split parent se NIKDE nezapočítává, children pokrývají celou sumu ve svých kategoriích.

### Anti-flicker _dataSig past **(Session 11)**
`renderPage()` přeskočí re-render když `_dataSig()` signature nezměněna (optimalizace proti problikávání z Firebase listeneru). Past: hrubá signature (počty + sumy) nezachytí změny jako wallet balance, virtuální cíle, tagy, podkategorie → uživatel vidí změnu až po překliknutí. Řešení dvojí: (1) `save()` vždy nastaví `_renderForce=true` pro user akce, (2) rozšířit signature o sledované hodnoty.

### String vs Array tagy past **(Session 11)**
`(x || []).length` je truthy i pro neprázdný STRING (vrátí délku textu). Pokud kód pak volá `.map()`, na stringu spadne (string nemá .map). Vždy `Array.isArray(x)` pro type-safe rozlišení. V FinanceFlow: array tagy = manuální editace (modré), string tagy = z účtenky (zelené).

### Focus guard past při re-renderu **(Session 11)**
Anti-flicker guard `if(document.activeElement.closest('#container')) return` blokuje re-render pro JAKÝKOLI focusovaný prvek. Past: blokuje i legitimní update po změně `<select>` (kategorie → subkategorie se nevykreslí). Řešení: blokovat jen TEXT inputy (kde re-render ztratí kurzor), `SELECT`/`button`/number povolit. Alternativa: `element.blur()` před re-renderem.

---

## 📄 context.md

> Aktuální stav projektu po Session 11.

**(Session 11 update):** Aplikace na **v7.68**. Doména `financeflow.cz` live (landing + /app). Email (Resend send + ImprovMX receive) verified. GA4 nasazeno. Affiliate+partner odkaz sjednocen. Velká kampaň oprav: receipt cena (lineTotal model), Split double counting (5 míst), edit účtenek po navigaci, zelené tagy, render-bug (_dataSig + save force), verze banner, virtuální peněženka v převodech. Grafy: duplikátní nav odstraněn, čitelná legenda, sdílené filtry Roční↔Vsechny.

**Otevřené po S11:** Push notifikace na mobil (TODO-119, 🔴), Slevy z účtenek→Nákupní seznam (TODO-117), Upravit split UI (TODO-118), Google Play TWA wrapper, Stripe (čeká na živnost).

---

## 📄 VERSIONING.md

> Aktualizace verzovacího procesu.

**(Session 11 update):** Verze bump = 4 atomické kroky. 3. krok (O aplikaci banner) měl chybný sed pattern – formát je `>Verze X.YY<` (ne `Verze X.YY` bez `>`). Vždy ověřit `grep "Verze X.YY" app.html` po bumpu. Banner zůstal na 7.55 přes mnoho verzí kvůli této chybě (opraveno FIX-125). Rozsah verzí S11: v7.50 → v7.68.

---

## 📄 CLAUDE.md

> Onboarding poznámky pro budoucí session.

**(Session 11 update):** Nové naučené vzory (viz explanations.md): (1) Split double counting – audit VŠECH agregací, ne jen jedné. (2) Anti-flicker _dataSig – save() musí vynutit render. (3) Array.isArray pro tagy. (4) Focus guard jen na text inputy. (5) Receipt lineTotal model. (6) Verze banner sed pattern `>Verze X.YY<`. File chaining: edituj z /mnt/user-data/outputs, nikdy ne /mnt/project (read-only). Po str_replace re-view před další editací (Windows \r\n občas rozbije str_replace → Python skript).
