# AUDIT · Otevřené úkoly a bugy — Session 18 (2026-08-03)

**Metoda:** křížové porovnání `todo.md` / `bugs.md` proti `VERZE_LOG` (298 verzí, v6.45 → v9.42) a **proti skutečnému kódu**. Grep na ID v changelogu se ukázal jako nespolehlivý — zápisy popisují funkce bez čísel úkolů. Rozhodující byl důkaz v kódu.

**Výchozí stav:** 94 „otevřených" TODO + 25 OPEN bugů.
**Závěr:** ~55 je hotových nebo bezpředmětných. Reálně otevřených zůstává **~30**.

> ⚠️ TL;DR tabulka na začátku `todo.md` je z éry Session 9 a tvrdí ~67 úkolů. Je zastaralá — přepsat.

---

## 🟢 A) ZAVŘÍT — vysoká jistota (kód prokazatelně existuje)

Dedikovaný modul nebo funkce, žádná pochybnost.

| ID | Úkol | Důkaz |
|---|---|---|
| TODO-002 | Offline transakce | `offline-sync.js` (celý modul) |
| TODO-007 | Sentry monitoring | `app.html`, `firebase.js`, `app.js` |
| TODO-009 | Box plot | `charts.js` |
| TODO-010 | Webová landing page | **běží na financeflow.cz** |
| TODO-012 | Kategorie z xlsx | `categories.json` |
| TODO-013 | Kontrola duplikátů | `duplicates.js` (celý modul) |
| TODO-014 | AI mapování kategorií | `categoryMappings` — v `todo.md` už značeno hotové (překryv X) |
| TODO-015 | Notifikace opakovaných plateb | `budouci.js` |
| TODO-019 | Service Worker | `sw.js`, verzovaný `ff-shell-v9.43` |
| TODO-021 | Komprese fotek | `receipts.js` |
| TODO-029 | Podpora více měn | `baseCur/baseRate/czkToBase` v `helpers.js` |
| TODO-030 | Web Push | `push.js`, `worker-push.js` |
| TODO-031 | Export dat | Nastavení → Záloha dat (JSON) |
| TODO-033 | Auto-kategorizace | keyword engine v `import.js`, `product-db.js` |
| TODO-034 | Komunita – průměry | `community/` uzly, Srovnání ČR |
| TODO-036 | COICOP vlastní sekce | `coicop.js` |
| TODO-037 | Podkategorie v grafech | `charts.js` |
| TODO-038 | **Porovnání cen mezi obchody** | `inflace.js` — multifiltr obchodů, `normalizeStoreName` (S17) |
| TODO-039 | Split z účtenky | `splitParent` napříč 16 moduly |
| TODO-040 | **Vlastní doména** | financeflow.cz běží |
| TODO-041 | Světlý/tmavý motiv | `settings.js`, `ff_theme` |
| TODO-042 | Auto kurz měn | `kurzy.js` + ČNB endpoint |
| TODO-043 | Sdílení read-only | `share.js` |
| TODO-046 | Offline indikátor | `app.js` |
| TODO-047 | Nákupní seznam | už v `todo.md`: „splněno praxí" |
| TODO-048 | COICOP vylepšení | `coicopSubclassTotals`, `coicop.js` |
| TODO-061 | Chord diagram | `stats.js` |
| TODO-062 | Treemap 12M | `ui.js` (`bubbleTreemapWrap`) — **v todo.md dvakrát** |
| TODO-072 | Váhy příjmů + stable flag | napříč 6 moduly |
| TODO-077 | Krátkodobý pohled | `projects.js` |
| TODO-084 | Kč/kg tracking | `receipts.js` + `inflace.js` (S17) |
| TODO-085 | Shrinkflation detektor | `receipts.js` + `inflace.js` (S17) |
| TODO-088 | Financial Freedom Ratio | `helpers.js`, `projects.js` |
| TODO-089 | Inflace životního stylu | `projects.js` |
| TODO-090 | Asset Allocation | `assets.js` |
| TODO-091 | Income Diversification | `projects.js` |
| TODO-092 | Wealth Momentum | `projects.js` — S16 TODO-171 („Úspory → Momentum") |
| TODO-093 | Anti-flicker `_dataSig` | `app.js`, `ui.js` |
| TODO-094 | ČSÚ skupiny a třídy | `coicop.js` |
| TODO-095 | COICOP mapování 1:1 | `admin.js` |
| TODO-098 | Lineární trend + IQR | `charts.js` |
| TODO-099 | Spending Pace | „Tempo výdajů" (S16 TODO-168) |
| TODO-117 | Slevy → nákupní seznam | `nakup.js` |
| TODO-119 | Push na mobil | `push.js` |
| TODO-121 | GDPR consent GA4 | `app.html`, `index.html` |
| TODO-142 | Telemetrie aktivity | `admin.js` |
| TODO-147 | Graf pod Zdražování | `receipts.js` `buildPricesTab` |
| TODO-154 | MacroDroid parser | `sms-import.js` |

**Platební systém — čtyři duplicitní záznamy jednoho úkolu, všechny hotové S17:**
TODO-022 · TODO-073 · TODO-097 · TODO-153 → Stripe LIVE, webhook, Customer Portal, audit plateb.
Tím se zároveň uzavírá **konflikt A** („GoPay vs. Stripe") v tabulce překryvů — rozhodnuto ve prospěch Stripe.

**Také hotové, jen nezavřené:** TODO-011 (`predictCat`), TODO-017 (`categories.json`), TODO-018 (`push.js` hlídání cen), TODO-023 (admin členství — už značeno hotové jinde), TODO-075 (rate limiting **je aktivní** ve `worker.js`, `AI_LIMITS` + `aiUsage` — poznámka „pending secrets" už neplatí).

---

## 🗑 B) ZRUŠIT — mrtvé nebo bezpředmětné (ne „dokončit", ale škrtnout)

| ID | Úkol | Proč zrušit |
|---|---|---|
| TODO-020 | Playwright testy | Zvolena jiná cesta — `smoke.js` (S16 TODO-175). Playwright pro solo projekt nadbytečný |
| TODO-035 | Bundling Vite/esbuild | Odporuje architektonické zásadě „žádné frameworky" |
| TODO-118 | „Upravit split" tlačítko | **Odporuje tvé UX preferenci** — swipe místo tlačítek. Zrušit jako záměrně zamítnuté |
| TODO-024 | Android NotificationListener | Nahrazeno `sms-import.js` + MacroDroid (TODO-154) |
| TODO-044 | Google Pay notifikace | Totéž |
| TODO-025 | Fio API | **ADR-098 (dnes)** rozhodl proti přímému napojení bank |
| TODO-026 | Open Banking API | Totéž — PSD2 zamítnuto pro portfolio |
| TODO-032 | Email týdenní report | Překryv s TODO-179 (push digest). Ponechat jen jeden |
| TODO-137 | Cookie consent UI | **Duplikát TODO-121** |
| TODO-143 | Grafy investic v čase | **Nahrazeno TODO-201** (dnešní ADR-098) |
| TODO-054 | Docs složka na GitHubu | Dokumentace žije v repu jako `.md` — bezpředmětné |
| TODO-055 | Merge `dev` → `main` | Provozní úkon, ne funkce. Nepatří do roadmapy |
| TODO-141 | Kategorie typu přesun | V `todo.md` **dvakrát**, jednou označeno VYŘEŠENO (v8.25) — smazat duplikát |

---

## ⚠️ C) OVĚŘIT VIZUÁLNĚ — kód existuje, ale nevím, zda řeší původní problém

Tohle ti z kódu nepotvrdím, musíš se podívat do appky.

- **TODO-068 · 069 · 070 · 076 — Bubble chart (4 záznamy).** Kód **žije** v `ui.js`: tři varianty (A Cluster, B Drill, C Gradient — varianta D zmizela). Otázky: přetékají ještě bubliny pod lištu? Má Gradient data? Funguje tooltip? Když jsou v pořádku, zavírá se tím i **OPEN-027/028/031**.
- **TODO-067 — Report přepočet dle periody.** `report.js` vznikl v S17, ale zbytek pokrývá **TODO-193**. Doporučuju TODO-067 zavřít a nechat jen TODO-193.
- **TODO-080 — Grafy po podkategoriích.** Kód v `charts.js` je, značeno „částečně".
- **TODO-016 — Mobilní zobrazení.** Nikdy nekončící úkol, ne konkrétní zadání. Buď zrušit, nebo přepsat na konkrétní body.

---

## 🔴 D) SKUTEČNĚ OTEVŘENÉ

**P1**
- **TODO-177** Diff-write fáze 2 — *0 uživatelů je nejbezpečnější okno, po Stripe se zavírá*
- **TODO-193** Report — taby „Tento měsíc" a „Kumulace roku" + PDF
- **TODO-198** Měsíční review fáze 2–4

**P2**
- TODO-182 Bank graf 12M · TODO-187 čerpání hypotéky · TODO-190 auto-materializace (idempotence!) · TODO-191 defaultní peněženky · TODO-192 sjednocení opakování · TODO-194 položkové COICOP do komunity · TODO-195 přesunout Inflaci k účtenkám · TODO-196 sjednocení názvů položek · TODO-197 matice položky × obchody · TODO-199 Checkout Session · TODO-178 typografie
- **TODO-138 · 139 · 140** Limity kategorií — hlídač součtu, doporučené limity, krok v checklistu (v `projects.js` je jen výpočet `healthPct`/`healthAmt`, chybí nadstavba)
- **TODO-145 · 146** Měny — `duplicates.js` neřeší měnu vůbec, denní sumář sčítá nominál
- TODO-148 historický kurz vkladu · TODO-078 AI rozřazení fáze 3 · TODO-083 letáky

**P3 / čekající**
- TODO-189 účtenková služba · TODO-179 push digest · TODO-180 Capacitor · TODO-181 Stripe Radar · TODO-176 názvy „Kam směřuju" · TODO-027 Google Play (**čeká na SHA-256 z PWABuilderu**) · TODO-028 lokalizace · TODO-096 rodinný souhrn

**Nové v S18**
- TODO-200 ✅ obloukový ukazatel skóre (v9.43, čeká na nasazení)
- TODO-201 🆕 portfolio ceny (ADR-098)
- Landing page — texty hotové, čekají **screenshoty** a finální učesání

---

## 🐛 E) OPEN bugy

**Zavřít (kód existuje):** OPEN-033 (Stripe hodnoty — hotovo S17) · OPEN-005 (box plot) · OPEN-007 (popup — vyřešeno FIX-223) · OPEN-014 (split delete) · OPEN-018 (diakritika) · OPEN-019 (nákupní seznam) · OPEN-020 (auto téma) · OPEN-027/028/031 (bubble — po vizuálním ověření) · OPEN-029 (report periody → TODO-193)

**Skutečně otevřené:** OPEN-013 (.xlsm nepodporováno — v `import.js` chybí) · OPEN-017 (COICOP trend prázdný graf) · OPEN-032 (Sentry ongoing) · OPEN-004 (PDF Worker size limit) · OPEN-010 (pomalé načítání) · OPEN-016 (offline přihlášení)

**Zrušit:** OPEN-011 (Playwright → viz TODO-020)

> `bugs.md` je jinak v pořádku — číslování FIX je aktuální (FIX-223 v changelogu i v souboru). Zastaralý je **jen seznam OPEN**.

---

## Doporučený postup

1. Projít sekci **A** a hromadně označit ✅ (nejvíc práce, nejmenší riziko)
2. Sekci **B** označit ~~škrtnutím~~ s poznámkou proč — ať se nápady nevrátí za tři sessions zpátky
3. Sekci **C** otevřít v appce a rozhodnout (10 minut)
4. **Přepsat TL;DR tabulku** na začátku `todo.md` — dnes lže
5. Sloučit duplicity: TODO-062 (2×), TODO-141 (2×), TODO-075 (2×), platební čtveřice

Po pročištění zbyde roadmapa ~30 položek, se kterou se dá reálně pracovat.
