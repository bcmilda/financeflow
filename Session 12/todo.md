# FinanceFlow – TODO & Roadmap

> **Zdrojový soubor (základ):** `todo_consolidated_2026-05-15_s6_v2.md` (konsolidace Sessions 1–6)
> **Aplikované patche Session 8:** `patch-session8.md` (2026-05-24), verze v6.51–v6.65
> **Předchozí patche Session 7:** sekce todo ze souboru `patch-session7-COMBINED(1).md` – Session 7.0 (2026-04-25) + Session 7.1 (2026-04-30)
> **Procedura:** Aplikace S7 combined patche. Dočasná ID z patche (TODO-049–055 → přečíslováno na TODO-056–062, nová TODO-063–072). Označeno `**(Session 7.0)**` / `**(Session 7.1)**`.
> **Datum poslední aktualizace:** 2026-05-15
>
> Konsolidovaný dokument ze **7 sessions (vč. 7.1)**. Úkoly přečíslovány pod unikátní ID `TODO-001+`. Každý záznam označen zdrojovou session: `**(Session N)**`.
> Doplnění ze `s5` jsou označena `**(Merge S1-5)**`.
> Poslední aktualizace: 2026-05-28 (Session 9 patch).

---

## 📋 TL;DR – Stav TODO

| Priorita | Otevřené | Příklady |
|---|---|---|
| 🔴 Kritické (P1) | 1 | **AI Rate Limiting** (TODO-075) – Worker otevřený pro zneužití |
| 🟡 Střední (P2) | ~12 | Box plot, Landing page, Playwright, Měsíční report přepočet, Bubble chart bubliny, Zdražování rozšíření (TODO-084/085) |
| 🟢 Nízké (P3) | ~18 | Service Worker, Platební systém, Google Play, Bundling, Měny (plné), Chord diagram, Treemap 12M |
| 🔵 Nice-to-have (P4) | ~8 | Push notif, Vlastní doména, Motivy, Sdílení read-only, Tooltip bubliny, **AI rozřazení importu fáze 3** (TODO-078) |
| 💡 Nápady | ~20 | Gamifikace, AI report, Google Sheets, Hlas, Portfolio, Multi-user |

**Celkem otevřených úkolů:** ~67
**Dokončeno Session 7.0 (v6.49):** TODO-056 Plány a cíle ✅, TODO-057 Měsíční report záložky ✅, TODO-058 Budoucí platby ✅, TODO-059 Advisor+Aktiva ✅, TODO-060 Bubble chart ✅, PDF chunking (TODO-005 ✅)
**Dokončeno Session 7.1 (v6.49–v6.50):** TODO-063 Bank NaN fix ✅, TODO-064 O aplikaci banner ✅, TODO-065 helpers funkce ✅, TODO-066 PDF JSON parsing ✅, TODO-071 Progres schema ✅, TODO-072 Plány záložka ✅ (deployment fix)
**Otevřené Session 7.1:** TODO-067 report přepočet ⚠️ (projects.js částečně), TODO-068 bubliny pod lištu ⚠️, TODO-069 Gradient prázdný ⚠️, TODO-070 tooltip bubliny ⚠️
**Dokončeno Session 8 (v6.51–v6.65):** TODO-023 Admin členství ✅, TODO-074 Detektor úspor ✅
**Nové Session 8:** TODO-072–077
**Dokončeno Session 9 (v6.74–v7.05):** TODO-006 ✅, TODO-008 ✅, TODO-014 ✅, TODO-015 ✅, TODO-079 ✅, TODO-081 ✅, TODO-082 ✅, TODO-086 ✅, TODO-087 ✅
**Nové Session 9:** TODO-083–092

---

## ⚠️ Překryvy a konflikty napříč sessions

| # | Téma | Sessions | Stav / rozhodnutí |
|---|---|---|---|
| A | **Platební provider** | S1: **GoPay** 99/699 Kč vs S3: **Stripe/Paddle** | 🔴 **Otevřené rozhodnutí** – nutno vybrat jeden |
| B | **PWA / Service Worker / offline** | S1 P2, S2 Nízká, S3 P3, S4 Nízká (TODO-07) | ⚠️ Částečně hotové – S4 přes IndexedDB (`offline-sync.js`), zbývá Service Worker pro plný offline |
| C | **Push notifikace** | S1 P4, S2 Vysoká, S3 P3 | ⚠️ Různá priorita – sjednoceno na P3 (viz níže) |
| D | **Export PDF/XLSX** | S1 P4, S2 Střední, S3 P3 | ⚠️ Sjednoceno na P3 |
| E | **Měny (EUR/USD/GBP)** | S1 P4, S2 Nízká, S3 P3 | ⚠️ Sjednoceno na P3 |
| F | **Lokalizace EN/SK** | S1 P3, S2 Nízká | Sjednoceno na P3 |
| G | **Google Play** | S2 Nízká, S3 Q4 milestone | P3 |
| H | **Playwright testy** | S3 P2 vs S4 Nízká (TODO-08) | S3 je novější, ale S4 je nejnovější → P3 (detail TODO-08) |
| I | **Bundling (Vite/esbuild)** | S2 Nízká – jen zde | P3 |
| J | **Komunita – průměry domácností** | S2 Nápady, S3 P3 | P3 |
| K | **Nákupní seznam** | S2 Vysoká | ✅ **Funkční** – prokázáno implementací Plány a cíle v S7.1 (záložky uvnitř `nakup.js`). TODO-047 průzkum splněn praxí. |
| L | **COICOP auto-učení** | S1 P2 | ✅ Pravděpodobně dokončeno (v S2+ existuje `coicop_corrections` v Firebase) |
| M | **PIN pad** | S3 P1 | ✅ **Dokončeno** (potvrzeno uživatelem – viz `bugs.md`) |
| N | **Grafy fix** | S3 P1 → S5 partial → **S6 potvrzeno** | ✅ **Dokončeno** – FIX-042–045 (S5) potvrzeno Milanem v S6 |
| O | **Firebase Rules admin** | S4 TODO-01 | ✅ **Dokončeno S6** – nasazeno do Firebase Console, 403 se nevrací |
| P | **GitHub Pages cluster** | S5 | ✅ **Dokončeno S6** – GH Pages funguje z větve `dev`, CORS Worker opraven, Firebase Auth domain přidána |
| Q | **Worker v5 deploy** | S5 | ✅ **Dokončeno S6** – Worker v5 nasazen, `RESEND_API_KEY` v Cloudflare Secrets |
| R | **Predikce fix** | S5 OPEN-022 | ✅ **Dokončeno S6** – `computeYearForecast()` přidána do `helpers.js` (FIX-049) |
| S | **Email / Resend** | S3–S6 | ✅ **Dokončeno S6** – Worker v5 nasazen, `RESEND_API_KEY` v Secrets, Řešení A (Resend účet) úspěšné |
| T | **Sentry monitoring** | S6 | ⚠️ **Nasazeno S6** – async loader v `index.html`, DSN nastaven, čeká na ověření |
| X | **AI mapování kategorií** | S9 | ✅ **Dokončeno S9** – categoryMappings systém v app.js/ai.js/import.js (TODO-014) |
| Y | **COICOP auto-učení** | S1/S9 | ✅ **Dokončeno S9** – computeCoicopAggregates(), uploadCoicopToFirebase(), komunitní přehled (TODO-082) |
| U | **Dělení PDF** | S2–S7.0 | ✅ **Vyřešeno S7.0** – pdf.js text extraction + chunking 15 stránek/dávka. Viz TODO-005, ADR-032 |
| V | **Bubble chart vs donut** | S7.0/7.1 | ✅ **Implementováno** – 4 varianty A/B/C/D. ⚠️ OPEN-026, OPEN-027 otevřené |
| W | **Plány a cíle** | S7.0/7.1 | ⚠️ **Částečně** – kód hotov, záložka se nezobrazuje → TODO-072, OPEN-030 |

---

## 🔴 P1 – KRITICKÉ ÚKOLY (blokují funkčnost nebo hlavní roadmap)

### TODO-001 · ~~Firebase Rules pro Admin panel~~ ✅ DOKONČENO S6 **(Session 4 TODO-01)**
- **Soubor:** Firebase Console → Realtime Database → Rules
- **Problém:** `loadLowConf()` a `loadMappingStats()` vracíly 403.
- **(Session 6 update):** ✅ VYŘEŠENO – `database.rules.json` nasazen do Firebase Console. Chyba 403 se nevrací, Admin panel funguje.
- **🔗 Cross-reference:** `architecture.md` sekce 8.8, `decisions.md` ADR-018, `bugs.md` FIX-039.

### TODO-002 · Integrace offline transakcí do `app.js` **(Session 4 TODO-02 → Session 6 update)**
- **Soubor:** `app.js` (přesunuto z `transactions.js` — implementováno centrálně v `save()`)
- **Původní problém:** `OfflineSync.saveTxOffline()` existuje, ale nevolala se – transakce offline stále selžaly.
- **(Session 6 update):** ⚠️ IMPLEMENTOVÁNO – offline větev přidána do `save()` v `app.js`. **Čeká na ověření uživatelem.**
  ```javascript
  if (!navigator.onLine && window.OfflineSync) {
    const lastTx = S.transactions?.[S.transactions.length - 1];
    if (lastTx) {
      window.OfflineSync.saveTxOffline(lastTx).then(() => {
        showToast('⏳ Offline – transakce bude uložena po připojení k internetu');
      });
    }
    return;
  }
  ```
- **Funkční tok (Session Summary S6):**
  1. Uživatel přidá transakci offline → uloží se do `S.transactions` (lokální paměť)
  2. `save()` detekuje `!navigator.onLine` → uloží do IndexedDB fronty
  3. Zobrazí oranžový toast ⏳
  4. Badge ☁️ ukazuje počet čekajících transakcí
  5. Po obnovení připojení → `runSync()` automaticky synchronizuje s Firebase
- **Co testovat:** Vypnout internet → přidat transakci → ověřit toast a badge → zapnout internet → ověřit sync
- **🔗 Cross-reference:** `decisions.md` ADR-028, `architecture.md` sekce 6

### TODO-003 · ~~Email notifikace – EmailJS integrace~~ ✅ DOKONČENO S6 **(Session 3 P1)**
- **Stav:** Resend free tier omezení + security incident s klíčem (viz `bugs.md` OPEN-001)
- **Akce:**
  1. Jít na `emailjs.com` → vytvořit účet
  2. Vytvořit Gmail Service
  3. Vytvořit Email Template (proměnné: `from_name`, `from_email`, `msg_type`, `message`)
  4. Zkopírovat: Service ID, Template ID, Public Key → předat Claudovi
  5. Přidat do `premium.js` (nahradí Worker fallback)
- **Časový odhad:** 30 minut
- **Alternativa:** Zůstat u Resend + verifikovat doménu (viz `bugs.md` OPEN-001 Řešení B)
- **(Session 4 update):** Email integrace stále čeká na nasazení, priorita zůstává P1. **(Merge S1-5)**
- **(Session 5 update):** Worker v5 připraven v repu, klíč přesunut do `env.RESEND_API_KEY`.
- **(Session 6 update):** ✅ VYŘEŠENO – Použito Řešení A (ověření Resend účtu). Worker v5 nasazen, `RESEND_API_KEY` v Cloudflare Secrets, emaily fungují. EmailJS není potřeba.

### TODO-004 · ~~Grafy – znovu opravit~~ ✅ DOKONČENO S6 **(Session 3 P1, reopen, S5 partial fix, S6 potvrzeno)**
- **Soubory:** `charts.js`, `helpers.js`
- **Stav po S5:** Základní grafy (Obecné / Měsíční / Roční / Všechny roky) **opraveny v6.45** (FIX-042–045). ✅
- **Vedlejší efekt:** Sekce Predikce přestala fungovat → přesunuto do **TODO-049** (vyřešeno v S6).
- **(Session 6 update):** ✅ POTVRZENO Milanem – grafy fungují. TODO-049 (Predikce) také vyřešeno. Kompletně uzavřeno.
- **🔗 Cross-reference:** `bugs.md` OPEN-002 (uzavřeno)

> ⚠️ **Poznámka k verzi (Merge S1-5):** `todo_5_github.md` zachovával TODO-004 jako plně otevřený reopen. `todo_5_.md` + `todo_s6.md` ho správně označují jako částečně/plně vyřešený. Finálně uzavřeno v S6 potvrzením Milana. 🔗 Viz `bugs.md` OPEN-002.

### TODO-005 · ~~Dělení PDF~~ ✅ VYŘEŠENO S8 **(Session 2 → S7.0 → S7.1 reopen → S8 final)**
- **(Session 7.0):** pdf.js 3.11.174 text extraction + chunking 15 stránek/dávka nasazeno ✅
- **(Session 8 update):** ✅ VYŘEŠENO – FIX-067 (KB EUR prompt), FIX-068 (modal), FIX-068b (pořadí). 72/72 transakcí. Import Editor funguje.
- **🔗 Cross-reference:** `bugs.md` OPEN-003 (uzavřeno), FIX-067, FIX-068

### TODO-049 · ~~Opravit sekci Predikce~~ ✅ DOKONČENO S6 **(Session 5, 🔴 P1)**
- **Sekce:** Grafy → Predikce
- **(Session 6 update):** ✅ VYŘEŠENO – `computeYearForecast()` přidána do `helpers.js` (FIX-049).
- **🔗 Cross-reference:** `bugs.md` OPEN-022 (uzavřeno)

### TODO-050 · ~~Nasadit Cloudflare Worker v5~~ ✅ DOKONČENO S6 **(Session 5, 🔴 P1)**
- **(Session 6 update):** ✅ VYŘEŠENO – Worker v5 nasazen, CORS opraven, `RESEND_API_KEY` v Secrets.

### TODO-051 · ~~Nastavit `RESEND_API_KEY` v Cloudflare~~ ✅ DOKONČENO S6 **(Session 5, 🔴 P1)**
- **Problém:** Nový Resend API klíč nebyl nastavený v Cloudflare.
- **(Session 6 update):** ✅ VYŘEŠENO – Secret `RESEND_API_KEY` nastaven v Cloudflare Secrets, Worker v5 nasazen. Emaily fungují (Řešení A).

### TODO-078 · AI rozřazení transakcí při importu – keyword matching + Claude API **(Session 9, 🔵 P4)**
- **Popis:** Při importu z banky mají transakce jen název obchodníka, žádné kategorie → vše jako „Ostatní". Řešení ve třech fázích:
  1. **Fáze 1:** Lokální keyword tabulka (~150 obchodníků CZ) → rychlé, bezplatné, offline
  2. **Fáze 2:** Uživatelovo učení – aplikace si pamatuje `obchodník → kategorie` do Firebase (= TODO-014, ✅ hotovo S9)
  3. **Fáze 3:** Claude API pro nerozřazené transakce (batch, 1 API call na import)
- **Očekávaná přesnost:** ~70 % automaticky, ~30 % s UI návrhem „Vypadá to jako Jídlo & Nákupy, souhlasíš?"
- **Stav:** Fáze 2 dokončena (TODO-014, TODO-086). Fáze 1 a 3 odkládáme na fázi reálných uživatelů.
- **Poznámka:** Kalibrovat až s reálnou zpětnou vazbou uživatelů.
- **🔗 Cross-reference:** TODO-014 (categoryMappings ✅ S9), TODO-086 (Import doporučení ✅ S9)

### TODO-079 · ~~Uživatelská adopce kategorií – analytika využití~~ ✅ DOKONČENO S9 **(Session 9, Admin panel)**
- **Původní popis:** Sledovat která kategorie/podkategorie se reálně používá a která ne:
  - Počet transakcí přiřazených do každé kategorie/podkategorie
  - Které kategorie si uživatelé přidávají sami (custom vs. výchozí)
  - Které výchozí kategorie zůstávají prázdné (nikdy nepoužité)
  - Podíl transakcí v „Jiné/Ostatní" = míra nepokrytosti kategoriemi
- **Využití:** Ladění výchozí sady kategorií, identifikace chybějících kategorií, prioritizace vývoje
- **(Session 9 update):** ✅ VYŘEŠENO – tabulka využití, top podkategorie, custom badge implementovány v Admin panelu (`admin.js`). Viz FIX-084.

### TODO-080 · Aktualizace grafů po podkategoriích **(Session 9, 🟡 P2 – částečně)**
- **(Session 10) ✅ HOTOVO** – ověřeno v kódu: drill-down podkategorie L1/L2/L3 (bDrillL1/L2/L3).
- **Popis:** Po dokončení podkategorií transakcí aktualizovat všechny grafy a tabulky aby zobrazovaly podkategorii jako drill-down vrstvu:
  - Bubble chart – drill-down level 2 (podkategorie uvnitř kategorie)
  - Měsíční report – tabulka výdajů rozšířit o podkategorie
  - Statistiky – pie/bar chart na úrovni podkategorií
  - Advisor – expense structure chart s podkategoriemi
  - Finanční radar – detekce předplatných přes podkategorii „Předplatné"
- **Závislost:** Čeká na dokončení UI podkategorií a naplnění dat uživatelem
- **(Session 9 update):** ✅ Částečně implementováno – `stats.js` category breakdown + `projects.js` health rows. Drill-down v ostatních sekcích zůstává otevřené.

### TODO-081 · ~~Admin rozhraní – přiřazení COICOP čísla vlastním kategoriím~~ ✅ DOKONČENO S9 **(Session 9)**
- **Původní popis:** Uživatel může přidat vlastní kategorii (např. „Kryptoměny") – ta nemá `coicop` číslo. Admin (Milan) vidí v Admin panelu seznam kategorií bez `coicop` a může jim číslo přiřadit.
- **Rozsah:** `admin.js` – sekce „Kategorie bez COICOP", select 1–13 + tlačítko uložit → `assignCoicop()` propíše do Firebase všem uživatelům.
- **Poznámka:** Uživatel COICOP sám nevolí – byl by zmatený. Admin přiřazuje globálně.
- **(Session 9 update):** ✅ VYŘEŠENO – `assignCoicop()` implementováno (FIX-084). PATCH loop přes všechny uživatele s danou kategorií.
- **🔗 Cross-reference:** ADR-044, FIX-084

### TODO-082 · ~~COICOP agregáty – výpočet a komunitní přehled~~ ✅ DOKONČENO S9 **(Session 9)**
- **Původní popis:** `computeCoicopAggregates(D)` projde transakce, přiřadí každé `coicop` číslo (z kategorie nebo `coicopOverrides` podkategorie) a vrátí `{1: sum, ..., 13: sum}`. Zobrazení: sloupcový graf uživatel vs. ČSÚ průměr.
- **Duplicity:** Každá transakce se započítá jednou. Bez `coicop` → „nezařazeno".
- **Komunitní data:** Anonymní agregát (`/community/{uid}/coicop/{číslo}`) → průměr komunity FinanceFlow.
- **Závislost:** Vyžaduje TODO-081 pro pokrytí vlastních kategorií (✅ obojí hotovo S9).
- **(Session 9 update):** ✅ VYŘEŠENO – `computeCoicopAggregates()` + `uploadCoicopToFirebase()` + záložka COICOP v Komunitním přehledu (`helpers.js`, `admin.js`, v6.99).
- **🔗 Cross-reference:** ADR-044, `formulas.md` sekce COICOP agregáty


### TODO-083 · Sledování slev z letáků **(Session 9, 💡 nápad)**
- **Popis:** Tlačítko „🔍 Hledat slevy" u položky v Nákupním seznamu → otevře `kupi.cz/hledani?q={název}` (Varianta C – okamžitě). Varianta B (AI web_search Worker) jako doplněk.
- **Stav:** ❌ NEIMPLEMENTOVÁNO – pouze návrh. **(Session 10 oprava stavu):** Předchozí stav „Naimplementováno v S9" byl CHYBNÝ – v kódu (nakup.js) není žádný kupi.cz odkaz ani tlačítko hledat slevy (ověřeno auditem). Rozhodnutí Milana: zůstává jako návrh. Fázovaný plán viz ADR-054 (Fáze 1 = vlastní data, Fáze 2 = push, Fáze 3 = AI letáky + cron).

### TODO-084 · Cena/kg a cena/l tracking **(Session 9, 🟡 P2)**
- **Popis:** `extractUnit()` detekuje hmotnost/objem z názvu položky → `pricePerUnit`. Funguje v záložce Zdražování.
- **Stav:** ✅ Implementováno v v6.98 (`receipts.js`)
- **🔗 Cross-reference:** `formulas.md` sekce Cena/kg, ADR-046

### TODO-085 · Shrinkflation detektor **(Session 9, 🟡 P2)**
- **Popis:** Detekce poklesu hmotnosti >2% při zachování ceny. Badge 🔻 Shrinkflation v záložce Zdražování.
- **Stav:** ✅ Implementováno v v6.98 (`receipts.js`)
- **🔗 Cross-reference:** `formulas.md` sekce Shrinkflation, ADR-046

### TODO-086 · ~~Doporučené přiřazení transakcí z importu~~ ✅ DOKONČENO S9 **(Session 9)**
- **Popis:** Žlutý badge 🤖, `acceptAllSuggestions`, `recordSuggestionOverride`, admin záložka Doporučení.
- **Stav:** ✅ Implementováno v7.03

### TODO-087 · ~~Detektor úspor – vzorce chování~~ ✅ DOKONČENO S9 **(Session 9)**
- **Popis:** A) zbytečné utrácení, B) výplata efekt, C) jídlo venku, D) zdražení (propojeno s účtenkami).
- **Stav:** ✅ Implementováno v7.05 (`projects.js`)

### TODO-088 · Financial Freedom Ratio (FFR) **(Session 9, 🟡 P2)**
- **(Session 10) ✅ HOTOVO** – ověřeno v kódu: Financial Freedom Ratio (computeFFR).
- **Popis:** FFR = (Pasivní příjem / Měsíční výdaje) × 100. Pasivní příjem = kategorie označené jako pasivní (dividendy, nájem, úroky). Zobrazit v Finančním obrazu/Radaru.
- **Škála:** 0 % → závislost, 25–75 % → částečná svoboda, 100 % → finanční nezávislost, >100 % → růst bez práce.

### TODO-089 · Inflace životního stylu **(Session 9, 🟡 P2)**
- **(Session 10) ✅ HOTOVO** – ověřeno v kódu: inflace životního stylu (computeLifestyleInflation).
- **Popis:** Detekce že výdaje rostou rychleji než příjmy. Pokud příjem +10 % ale výdaje +15 % → alert „inflace životního stylu". Zobrazit v Finančním obrazu.

### TODO-090 · Asset Allocation vizualizace **(Session 9, 🟢 P3)**
- **(Session 10) ✅ HOTOVO** – ověřeno v kódu: Asset Allocation donut (assets.js).
- **Popis:** Rozložení majetku z `assets.js` – akcie/krypto/hotovost/nemovitosti jako donut/pie chart. Zobrazit v Finančním obrazu nebo Aktiva záložce.

### TODO-091 · Income Diversification Score **(Session 9, 🟢 P3)**
- **(Session 10) ✅ HOTOVO** – ověřeno v kódu: Income Diversification HHI.
- **Popis:** Počet a váha různých příjmových zdrojů. Jeden zdroj = vysoké riziko. Více zdrojů = stabilita. Score 0–100.

### TODO-092 · Wealth Momentum **(Session 9, 🟢 P3)**
- **(Session 10) ✅ HOTOVO** – ověřeno v kódu: Wealth Momentum.
- **Popis:** Rychlost růstu net worth za 12M. Průměrný přírůstek čistého jmění Kč/měs. Propojit s `assets.js`.


---

## 🔴 P1 – NOVÉ ÚKOLY Session 7.1

### TODO-067 · Měsíční report – přepočet dat dle periody **(Session 7.1, 🔴 P1)**
- **(Session 10) ✅ HOTOVO** – ověřeno v kódu: report přepočet dle periody (getActualRange).
- **Sekce:** Měsíční report → záložky 7D / 1M / 3M / 6M / 12M
- **Problém:** UI záložek přidáno, ale `computeHealthScores()` ignoruje `rMonth/rYear` — bere stále `S.curMonth/S.curYear` hardcoded. Přepínání záložek nemá efekt na data.
- **Root cause:** Datová logika záložek není implementována — jen UI shell.
- **(2026-05-19 update):** `projects.js` částečně opraven – `computeHealthScores(D, m, y)` přijímá volitelné m, y. `rMonth/rYear` se počítá před voláním. `getActual()` používá m, y místo `S.curMonth/S.curYear`. Ale report stále zobrazuje jen 1 hodnotu – chyba pravděpodobně v renderovací vrstvě nebo v datové agregaci.
- **(Session 8 update):** `projects.js` FIX-077 – `renderObraz()` baseline první měsíc s daty. Stále otevřeno – `computeHealthScores()` čeká na Excel konfiguraci.
- **🔗 Cross-reference:** `bugs.md` OPEN-029, TODO-057, ADR-042, ADR-043

### TODO-072 · ~~Plány a cíle – záložka se nezobrazuje~~ ✅ VYŘEŠENO **(Session 7.1, 2026-05-19)**
- **(2026-05-19 update):** ✅ VYŘEŠENO – problém byl v **nasazení**, ne v kódu. Na server byl nahraný starý `nakup.js` bez záložky. Po nahrání správného souboru záložka funguje.
- **🔗 Cross-reference:** `bugs.md` OPEN-030 (uzavřeno), ADR-034


---

## 🟡 P2 – STŘEDNÍ PRIORITA

### TODO-006 · ~~Globální error handler~~ ✅ DOKONČENO S9 **(Session 4 TODO-03)**
- **Problém:** Neočekávané JS výjimky mimo `try/catch` způsobí bílou obrazovku bez informace pro uživatele.
- **Akce:** Přidat do `app.js` nebo `helpers.js`:
  ```javascript
  window.addEventListener('error', (e) => showCrashScreen(e.message));
  window.addEventListener('unhandledrejection', (e) => showCrashScreen(e.reason));
  ```
- Implementovat „Něco se pokazilo – Zkusit znovu" obrazovku.

### TODO-007 · Monitoring chyb – Sentry **(Session 4 TODO-04)** ⚠️ NASAZENO S6 – OVĚŘIT
- **Problém:** Nevíme, kdy a kde aplikace padá u uživatelů, na jakých zařízeních.
- **(Session 6 update):** ⚠️ NASAZENO – Sentry async loader přidán do `index.html` (v6.48) před `</body>`. DSN: `3ce6efc6...ingest.de.sentry.io/...`. `tracesSampleRate: 0`, `integrations: []`. `Sentry.setUser()` v `app.js` po přihlášení (setTimeout 3000ms). **Čeká:** ověření příchodu events v Sentry dashboard.
- **⚠️ Historie implementace (Session Summary S6):**
  - **1. pokus (SELHAL):** Sentry script v `<head>` synchronně → způsobil **pád mobilní aplikace** a zpomalení webu. Dashboard zůstal prázdný.
  - **2. pokus (FUNKČNÍ):** Script injektován dynamicky **před `</body>`**, `async=true, defer=true`. Trojitý `try/catch` – pokud Sentry CDN selže, aplikace pokračuje. `tracesSampleRate: 0.1` (10%), Session Replay = 0%.
  - **Poznámka:** Warning "Sentry CDN unavailable" v omezených prostředích (Claude okno, firemní sítě) je **normální chování** – aplikace funguje.
- **Co testovat:** Ověřit příchod events v Sentry dashboard po přihlášení uživatele.
- **🔗 Cross-reference:** FIX-050, `decisions.md` ADR-025, `architecture.md` sekce 14

### TODO-008 · ~~Validace JSON odpovědí z AI~~ ✅ DOKONČENO S9 **(Session 4 TODO-05)**
- **Problém:** Když Claude vrátí jiný formát než se čeká, aplikace buď spadne nebo zobrazí prázdná data. `JSON.parse` bez schématu je křehký.
- **Akce:** Přidat ruční validaci schématu v `receipts.js` a `ai.js`:
  ```javascript
  if (!receipt.store || typeof receipt.total !== 'number') {
    throw new Error('Neplatný formát odpovědi – chybí store nebo total');
  }
  ```

### TODO-009 · Box plot přesun **(Session 3 P2)**
- **Soubor:** `charts.js`
- **Aktuálně:** Box plot je v záložce „Roční" (dává smysl až při více letech dat)
- **Akce:**
  - Záložka „Roční" – odebrat box plot
  - Záložka „Všechny roky" – přidat box plot per rok (srovnání roků)
  - Záložka „Měsíční" – přidat 12 box plotů (jeden per měsíc přes všechny roky)
- **🔗 Cross-reference:** `bugs.md` OPEN-005

### TODO-010 · Webová landing page **(Session 3 P2)**
- **Problém:** Žádná vstupní stránka pro nové uživatele (referral odkaz → rovnou login)
- **Obsah:** features, screenshots, FAQ, CTA „Vyzkoušet zdarma 30 dní"
- **Umístění:** `/landing.html` nebo samostatná doména
- **Potřeba pro:** referral systém

### TODO-011 · Predikce – ověřit modré hodnoty pro minulé měsíce **(Session 3 P2)**
- **Soubor:** `transactions.js` v6.41
- **Má být:** `actual` + modrá predikce (opacity 55%) + odchylka pro minulé měsíce
- **🔗 Cross-reference:** `bugs.md` OPEN-006

### TODO-012 · Nové kategorie z xlsx souboru **(Session 2 Vysoká)**
Sada kategorií k importu:
- **Auto:** Palivo, Pojištění, Opravy, STK, Havarijní pojištění, Parkovné
- **Předplatné:** YouTube Premium, Google One, Patreon, Noviny, Alza+, Aplikace
- **Sebevzdělání:** Kurzy, Školení, Cizí jazyk
- **Domácí mazlíček:** Jídlo, Pelíšek, Doktor
- **Trading:** Bybit, XTB
- **Pošta:** Zásilka, Clo, Dopis, Poštovné, Ověření podpisu
- **Cigarety:** Krabičky, Tabák, Příslušenství
- **Výběry ATM**
- **Rekonstrukce:** Zedník, Instalatér, Materiál, Kotel, Okna…
- **Zdraví rozšíření:** Oční, Zubní, Holič
- **Kultura a zábava:** Bruslení, Posilovna, Vstupenky, Kino, Zoo…

### TODO-013 · Kontrola duplikátů v záložce Transakce **(Session 2 Vysoká)**
- **(Session 10) ✅ HOTOVO** – ověřeno v kódu: detekce duplikátů transakcí (detectDuplicates/jaroWinkler, duplicates.js).
- Tlačítko „🔍 Zkontrolovat duplikáty" v záložce Transakce
- Spustí stejný editor jako při importu
- Uživatel může duplicitní transakce smazat

### TODO-014 · AI pamatuje mapování kategorií **(Session 2 Střední)**
- **(Session 10) ✅ HOTOVO** – ověřeno v kódu: AI pamatuje mapování kategorií (saveCategoryMapping).
- Při importu si AI zapamatuje: „LIDL → Jídlo & Nákupy"
- Uložit do Firebase: `users/{uid}/categoryMappings/{keyword}`
- Při dalším importu auto-přiřadit

### TODO-015 · Notifikace opakovaných plateb **(Session 2 Střední)**
- Upozornit X dní před splatností šablony
- Propojit s Web Push (TODO-030)

### TODO-016 · Vylepšení mobilního zobrazení **(Session 2 Střední)**
- Editor importu na mobilu je těžko použitelný
- Dvousloupcový layout → jednosloupcový na mobilu

### TODO-017 · Příspěvky zaměstnavatele – kategorie **(Session 2 Střední)**
- Penzijko, Edenred benefit
- Typ: `income`, `stable: false`

### TODO-018 · Hlídání cen produktů **(Session 2 Vysoká – přeřazeno)**
- Historické ceny produktů z účtenek
- Notifikace při poklesu ceny pod nastavený práh
- Nastavení v sekci Nastavení → Notifikace
- **Pozn.:** Částečně řešeno ve Workeru (`type: 'price_alert'`), viz `architecture.md` sekce 7

### TODO-047 · Nákupní seznam – průzkum a dokumentace funkce **(konsolidace 2026-04-16)**
- **Soubor:** `nakup.js`
- **Problém:** Feature existuje od Session 3 (viz `architecture.md`), ale uživatel si nepamatuje, co přesně dělá, jak funguje a zda je plně implementovaná
- **Původní záměr (Session 2 Vysoká):**
  - Přidat stránku Nákupní seznam do menu
  - Našeptávač produktů z Firebase (`community/products/`)
  - Data se sbírají z analýzy účtenek (receipts)
  - Komunitní – čím více uživatelů, tím lepší databáze
- **Akce:**
  1. Otevřít `nakup.js` a projít kód – co reálně funkce umí?
  2. Projít UI v aplikaci – najít Nákupní seznam v menu a otestovat workflow
  3. Porovnat s původním záměrem (viz výše)
  4. Dokumentovat aktuální stav do `architecture.md`
  5. Rozhodnout, zda je feature kompletní, nebo potřebuje dokončit

### TODO-048 · COICOP – úprava a vylepšení **(konsolidace 2026-04-16)**
- **Problém:** Předchozí opravy COICOP enginu se uživateli nelíbí – potřeba přepracovat
- **Dotčené části:**
  - COICOP mapping engine (`receipts.js`)
  - Komunitní přehled – **upravit vzhled progres baru**
  - Keyword engine a auto-učení
- **Akce:**
  1. Projít aktuální COICOP implementaci a identifikovat konkrétní problémy
  2. Upravit vzhled progres baru u Komunitního přehledu (samostatný UX úkol)
  3. Zvážit rework mapping logiky, pokud aktuální přístup nevyhovuje
- **🔗 Cross-reference:** ADR-005 v `decisions.md` (COICOP jako globální klasifikace), `bugs.md` OPEN-017 (COICOP trend záložka prázdná), OPEN-018 (keyword engine diakritika)
- **Priorita:** Střední – ovlivňuje UX hlavní funkce aplikace

### TODO-052 · ~~Opravit GitHub Pages~~ ✅ DOKONČENO S6 **(Session 5, 🟡 P2)**
- **URL:** `https://bcmilda.github.io/financeflow/`
- **Problém:** Stránka se nenačte. GitHub Pages je zapnuté (branch: `main`), ale web neběží. Stejný problém s `lepsi-uver.html`.
- **Možné příčiny:**
  - Chybí Service Worker (`sw.js`) pro SPA routing na GitHub Pages
  - Firebase Auth nepovoluje `bcmilda.github.io` jako authorized domain
  - Soubory na `main` větvi nejsou aktuální (chybí merge z `dev`)
- **Akce:** Deploy Worker v5 + Firebase Auth domain.
- **(Session 6 update):** ✅ VYŘEŠENO – GH Pages funguje z větve `dev`. Firebase Auth domain přidána. Worker v5 nasazen s CORS.
- **🔗 Cross-reference:** `bugs.md` OPEN-023, OPEN-024, OPEN-025

### TODO-053 · ~~Přidat `bcmilda.github.io` do Firebase Auth~~ ✅ DOKONČENO S6 **(Session 5, 🟡 P2)**
- **Problém:** Pokud `bcmilda.github.io` není v Firebase Console → Authentication → Settings → Authorized domains, Google Sign-In z GitHub Pages nebude fungovat.
- **Akce:** Firebase Console → Authentication → Settings → Authorized domains.
- **(Session 6 update):** ✅ VYŘEŠENO – Doména přidána.

### TODO-068 · Bubble chart – bubliny pod přepínací lištu **(Session 7.1, 🟡 P2)**
- **Sekce:** Dashboard → Bubble chart záložka A (Cluster)
- **Problém:** Bubliny zasahují do prostoru přepínací lišty záložek — vizuální překryv.
- **Root cause:** `POS` array y hodnoty nekontrolují horní limit; `viewBox` H nedostatečná.
- **🔗 Cross-reference:** `bugs.md` OPEN-027, ADR-037

### TODO-069 · Bubble chart – Gradient varianta bez sdílených dat **(Session 7.1, 🟡 P2)**
- **Sekce:** Dashboard → Bubble chart záložka C (Gradient)
- **Problém:** Při reálných datech je `SHARED_NAMES` prázdná → záložka C nevykresluje nic.
- **Root cause:** Chybí fallback UI nebo demo mode pro případ prázdných sdílených subkategorií.
- **🔗 Cross-reference:** `bugs.md` OPEN-028, ADR-037


---

## 🔴 P1 – NOVÉ ÚKOLY Session 8

### TODO-075 · AI Rate Limiting – implementace ADR-041 **(Session 8, 🔴 P1)**
- **Popis:** Worker + Firebase Admin SDK + `ai-limits.js` + UI v Settings + Admin karta. Bez toho je Worker otevřený pro zneužití.
- **Stav:** ADR-041 schválen, implementace čeká na Firebase Admin SDK v Cloudflare Worker (JWT auth přes REST API).
- **🔗 Cross-reference:** `decisions.md` ADR-041

### TODO-076 · Bubble chart – kompletní přepracování pozicování **(Session 8, 🔴 P1)**
- **Popis:** SVG přetékání bublin není opraveno ani po FIX-072. Přepsat na force-directed layout nebo relativní % souřadnice s clip-path.
- **Stav:** Otevřeno — vizuálně nepoužitelné.
- **🔗 Cross-reference:** `bugs.md` OPEN-031, FIX-072

---

## 🟡 P2 – NOVÉ ÚKOLY Session 8

### TODO-072 · Finanční kategorie příjmů – váhy a stable flag **(Session 8, 🟡 P2)**
- **Popis:** Definovat příjmové kategorie s váhami stability: zaměstnání > brigáda > OSVČ > investice > cashback > dary. Přidat UI pro `stable:true` v nastavení kategorií.
- **Stav:** Odloženo – po doladění scoring systému.
- **Závisí na:** Konfigurace tabulek ze `FinanceFlow_Scoring_Konfigurace.xlsx`

### TODO-073 · Donate / Stripe – Premium subscription **(Session 8, 🟡 P2)**
- **Popis:** Vytvořit Stripe Subscription produkty (99 Kč/měs, 999 Kč/rok) a vyplnit Payment Link konstanty v `donate.js`.
- **Stav:** Infrastruktura připravena (`donate.js`), Payment Links nevyplněny.
- **Soubory:** `donate.js` – konstanty `PREMIUM_MONTHLY_LINK_*`, `PREMIUM_YEARLY_LINK_*`
- **🔗 Cross-reference:** `bugs.md` OPEN-033, FIX-065

### ~~TODO-074~~ · ~~Detektor úspor – přepracování~~ ✅ HOTOVO S8 (v6.58–v6.65) **(Session 8)**
- 1 transakce = 1 nález, datum v labelu, odstraněna hranice 50 Kč.
- **🔗 Cross-reference:** FIX-059, FIX-066

### TODO-077 · Krátkodobý pohled ve Finančním obrazu **(Session 8, 🟡 P2)**
- **Popis:** Přidat srovnání s MINULÝM měsícem (ne jen s baseline) v `renderObraz()`. Finanční obraz reaguje příliš pomalu na malé změny (baseline stará 6 měsíců).
- **Stav:** Navrženo, neimplementováno.
- **🔗 Cross-reference:** FIX-077, ADR-042


---

## 🟢 P3 – NIŽŠÍ PRIORITA (příští sprinty)

### TODO-019 · Service Worker pro plný offline **(Session 4 TODO-07)**
- **Problém:** Aplikace se bez internetu vůbec nenačte (žádný SW)
- **Akce:** Service Worker s cache-first strategií pro statické assety
- **Odhad:** 2–3 dny
- **Poznámka:** S4 částečně vyřešen přes IndexedDB (`offline-sync.js`), ale to řeší jen offline data, ne offline načtení aplikace
- **(Session 5 update):** S5 explicitně zmiňuje `sw.js` jako prerekvizitu pro funkční PWA na GitHub Pages. Service Worker je potřeba nejen pro offline, ale i pro GH Pages SPA routing.

### TODO-020 · Automatizované testy – Playwright **(Session 3 P2 → Session 4 TODO-08)**
- **Stav:** Playwright nainstalován, žádné testy
- **Kritické flows:**
  - Přihlášení / odhlášení (Google)
  - Přidání výdajové transakce
  - Zobrazení dashboardu s daty
  - Grafy se renderují (canvas šířka > 0)
  - Analýza účtenky (mock Worker)
  - Offline uložení a sync
  - Predikce tabulka (bez JS chyb)

### TODO-054 · Docs složka na GitHubu **(Session 5, 🟢 P3)**
- **Problém:** Všech 11 `.md` souborů je pouze v Claude Projectu, ne v repu.
- **Akce:** Nahrát všechny konsolidované `.md` soubory do `/docs/` na `dev` větvi GitHubu.
- **Pozn.:** Repo je private — sanitizace není nutná, ale viz `SECURITY.md` pro API klíče v `.md` souborech.

### TODO-055 · Merge `dev` → `main` po testování **(Session 5, 🟢 P3)**
- **Problém:** GitHub Pages čte z `main` větve, ale práce probíhá na `dev`. Bez merge není na GH Pages nic aktuálního.
- **Akce:**
  1. Otestovat preview URL z GitHub Actions (automatický deploy na push do `dev`)
  2. Pokud vše OK → vytvořit Pull Request `dev` → `main`
  3. Merge → automatický deploy na Firebase Hosting + GitHub Pages
- **Prerekvizita pro:** TODO-052 (GitHub Pages funkčnost)

### TODO-021 · Komprese fotek v `analyzeMultiReceipt` offline větvi **(Session 4 TODO-09)**
- **Problém:** V offline větvi se konvertuje base64 → Blob ručně (atob loop). Fotky jsou již zkomprimované z `compressReceiptImage()`, ale konverze je neefektivní.
- **Akce:** Refaktorovat – ukládat Blob přímo při `addReceiptPhoto()` místo base64

### TODO-022 · Platební systém 💰 **(Konflikt mezi sessions)**
> ⚠️ **OTEVŘENÉ ROZHODNUTÍ:**
> - **(Session 1 P1)** GoPay (český provider)
> - **(Session 3 P3)** Stripe nebo Paddle (mezinárodní)
>
> Vyberte jeden – Stripe je jednodušší setup, GoPay je lepší pro CZ trh (české účty, QR platby).
- **Premium ceník:** 99 Kč/měsíc nebo 699 Kč/rok
- **Webhooky** pro aktivaci/deaktivaci Premium
- **Cíl Firebase:** `users/{uid}/premium/` – `type`, `trialUntil`, `premiumUntil`

### TODO-023 · Admin panel – správa členství **(Session 1 P1)**
- Datum registrace, typ plánu, délka předplatného
- Manuální přidělení/odebrání prémiového přístupu
- Referral propojení s affiliate systémem

### TODO-024 · Android NotificationListenerService **(Session 3 P3)**
- **Technologie:** React Native nebo Kotlin wrapper
- **Funkce:** Zachytává notifikace bank → parser → Firebase
- **Odhad:** 2–3 týdny MVP
- **🔗 Cross-reference:** `architecture.md` sekce 13 (plánovaná architektura)

### TODO-025 · Fio API napojení **(Session 1 P2)**
- Automatické stahování transakcí z Fio banky
- API token uložen v Firebase (šifrovaně)
- **Alternativa:** Open Banking (TODO-026) – univerzálnější, ale komplexnější

### TODO-026 · Open Banking API **(Session 2 Nízká)**
- PSD2 licence a certifikáty
- Automatický import transakcí ze všech bank (nejen Fio)
- Notifikace nových plateb v reálném čase
- **Poznámka:** Velmi komplexní, vyžaduje měsíce vývoje a regulatorní schválení

### TODO-027 · Google Play vydání **(Session 2 Nízká / Session 3 Q4)**
- TWA (Trusted Web Activity) wrapper
- Vývojářský účet Google Play (25 USD)
- Ikony ve všech rozlišeních
- Odkaz „Ohodnotit aplikaci" v O aplikaci

### TODO-028 · Lokalizace CS/EN/SK **(Session 1 P3 / Session 2 Nízká)**
- Infrastruktura existuje (`_settings.lang`, `PAGE_TITLES` pro vícejazyčnost)
- Chybí: přeložené texty v UI, přeložené chybové hlášky

### TODO-029 · Podpora více měn **(S1 P4 / S2 Nízká / S3 P3)**
- EUR, USD, GBP při importu
- Kurzy z ČNB API nebo ECB
- Nastavitelné směnné kurzy
- Konverze v reportech

### TODO-030 · Web Push notifikace **(S1 P4 / S2 Vysoká / S3 P3)**
Sjednoceno na P3. Typy notifikací:
- Hlídání cen (TODO-018)
- Opakované platby (TODO-015)
- Narozeniny
- Překročení měsíčního limitu kategorie
- „Dnes tě dluh stál X Kč"
- Připomínka blížící se splátky

### TODO-031 · Export CSV / PDF / XLSX report **(S1 P4 / S2 Střední / S3 P3)**
Sjednoceno na P3:
- Měsíční nebo roční přehled ke stažení
- PDF s grafem + tabulkou kategorií
- Excel (SheetJS)

### TODO-032 · Email týdenní report **(Session 3 P3)**
- Automatický souhrn příjmů/výdajů
- Cron přes Cloudflare Workers Scheduled Triggers

### TODO-033 · Automatická pravidla (auto-kategorizace) **(Session 3 P3)**
- „Shell" → Doprava/Benzín, „Albert" → Jídlo/Supermarket
- UI pro správu pravidel v nastavení

### TODO-034 · Komunita – průměry výdajů **(S2 Nápady / S3 P3)**
- Anonymní srovnání s průměrem podobných domácností
- Firebase `/community/` struktura připravena

### TODO-035 · Bundling (Vite / esbuild) **(Session 2 Nízká)**
- Sloučit 22 JS souborů do jednoho minifikovaného
- Rychlejší načítání
- **🔗 Cross-reference:** `bugs.md` OPEN-010

### TODO-036 · Přesunout COICOP / Srovnání ČR do vlastní sekce **(Session 1 P3)**
- Aktuálně v záložkách Analýzy účtenek
- Zaslouží si vlastní stránku: `page-coicop`

### TODO-037 · Podkategorie v grafech **(Session 1 P3)**
- Souhrn výdajů a Měsíční report zobrazují jen kategorie, ne podkategorie
- Drill-down kliknutím na kategorii

### TODO-038 · Porovnání cen mezi obchody **(Session 1 P3)**
- Záložka „Obchody" v analýze účtenek
- Kde je který produkt nejlevnější

### TODO-039 · Split transakce – automatický z účtenky **(Session 1 P2)**
- **(Session 10) ✅ HOTOVO** – ověřeno v kódu: split z účtenky na více transakcí dle kategorií (addReceiptAsTx).
- Po skenování účtenky → každá položka = vlastní podtransakce
- Parent = celková částka účtenky

### TODO-061 · Chord diagram – propojení kategorií **(Session 7.0, 🟢 P3)**
- **Sekce:** Statistiky nebo Report poradce
- **Popis:** Vizualizace propojení kategorií — které kategorie sdílejí subkategorie, jak jsou výdaje provázané.
- **🔗 Cross-reference:** ADR-031, `decisions.md`

### TODO-062 · Treemap v záložce 12M reportu **(Session 7.0, 🟢 P3)**
- **Sekce:** Měsíční report → záložka 12M
- **Popis:** Základ `bTreemap()` je hotový v `ui.js`. Potřeba napojit na data 12M.
- **🔗 Cross-reference:** ADR-030


---

## 🔵 P4 – NICE TO HAVE

### TODO-040 · Vlastní doména **(Session 2 Střední – posunuto na P4)**
- Místo `financeflow-a249c.web.app`
- Potřeba pro Google Play a Privacy Policy URL

### TODO-041 · Světlý/tmavý motiv **(Session 1 P4)**
- **Stav:** ✅ Částečně hotovo (existuje `applyTheme()`), ale viz `bugs.md` OPEN-020 (Auto téma)

### TODO-042 · Více měn v jedné peněžence + auto kurz **(Session 1 P4)**
- Různé peněženky v různých měnách
- Automatický kurz z ECB API
- **Souvisí s TODO-029** (globální podpora měn)

### TODO-043 · Sdílení přehledu – read-only link bez přihlášení **(Session 1 P4)**

### TODO-044 · Google Pay notifikace **(Session 2 Nízká)**
- Automatický import plateb z Google Pay
- Propojení přes Intent / API

### TODO-045 · ~~Verze v „O aplikaci" sekci~~ ✅ HOTOVO **(Session 4 TODO-06)**
- **Problém:** Verze v „O aplikaci" dashboardu ukazovala v6.35 zatímco Admin panel měl v6.45 – nesoulad
- **Stav:** ✅ Vyřešeno Memory Rules pro Claude Code (potvrzeno uživatelem)

### TODO-046 · Offline mode – explicitní indikátor **(S1 P2 / S2 Nízká)**
Indikátor stavu připojení v UI. Částečně hotové (offline badge pro pending účtenky).

### TODO-070 · Tooltip při hover na bublinu **(Session 7.1, 🔵 P4)**
- **(Session 10) ✅ HOTOVO** – ověřeno v kódu: tooltip na bublinách (bTip).
- **Sekce:** Dashboard → Bubble chart
- **Popis:** Při najetí na bublinu zobrazit tooltip s názvem kategorie a sumou. Prototyp existuje v `ff-grafy-final.html`.
- **🔗 Cross-reference:** `architecture.md` sekce 16

### TODO-071 · ~~Progres schema finančního zdraví v reportu~~ ✅ VYŘEŠENO **(Session 7.1, 2026-05-19)**
- **(2026-05-19 update):** ✅ VYŘEŠENO – `advisor.js` implementuje `renderHealthProgressSchema(data)` + `drawHealthRing(canvasId, score, size)`. Nová sekce "🏥 Finanční zdraví – průběh měsíců" v reportu poradce. Kruhy: 3M=80px, 6M=64px, 12M=52px. `advisorMonthScore(inc, exp, D)` počítá reálné skóre.
- **🔗 Cross-reference:** `features.md`, `architecture.md` sekce 3 (advisor.js)


---

## 💡 NÁPADY (nezavázané, bez prioritizace)

### Gamifikace a engagement
- Gamifikace: „Tento měsíc jsi ušetřil X Kč oproti průměru 🎉" **(S1)**
- Odznaky za dosažení cílů spoření **(S2)**
- Odznaky za finanční cíle **(S3)**

### AI / Automation
- AI měsíční report: Claude automaticky shrne měsíc a navrhne úspory **(S1)**
- Chatbot pro rychlé přidání transakce hlasem **(S2)**
- Hlasové zadávání transakcí – Web Speech API **(S3)**
- OCR pro papírové výpisy (foto → transakce) **(S3)**

### Integrace
- Google Sheets export **(S1)**
- Google Calendar – narozeniny, výdaje **(S3)**
- Heureka/Alza – sledování cen přání **(S2)**
- Investiční portfolio tracker (propojení s brokerem) **(S3)**

### UX
- Kategorie s „limitem" – barevné upozornění při překročení **(S1)**
- Darkpattern detektor – upozornění na automaticky obnovující se předplatná **(S1)**
- Rodinný rozpočet s cílovými částkami per kategorie **(S2)**
- QR kód pro sdílení přístupu s partnerem **(S2)**
- Sdílení účtenky přes QR kód **(S3)**

### Mobile / Platform
- Widget pro Android (dnešní výdaje) **(S2 / S3)**
- Multi-user household (více než 2 lidé) **(S3)**
- Podpora pro Slovensko (EUR, IBAN) **(S3)** — **souvisí s TODO-028** (lokalizace SK)

### Advanced financial
- Daňové přiznání – přehled příjmů z podnikání **(S3)**
- Srovnání s průměrem podobné domácnosti (anonymní) **(S2)** — **souvisí s TODO-034**

---

## ✅ DOKONČENO (historicky napříč sessions)

### V Session 3 (v6.35 → v6.41)
- ✅ Nastavení (téma, PIN logika, export)
- ✅ Sdílení dat s partnerem
- ✅ SMS import (debug textové pole)
- ✅ Duplikáty (Jaro-Winkler)
- ⚠️ Nákupní seznam (`nakup.js`) — **nutno ověřit funkčnost** (viz TODO-047)
- ✅ Kalendář (`kalendar.js`)
- ✅ Predikce v2
- ✅ Resend email integrace (Worker)

### V Session 4 (v6.41 → v6.44)
- ✅ BUG-01 Save bar nezmizí (`premium.js`)
- ✅ BUG-02 Auto téma – ⚠️ reopened (viz `bugs.md` OPEN-020)
- ✅ BUG-03 Permission denied v Admin (`admin.js` → REST API)
- ✅ BUG-04 Prázdné grafy – ⚠️ reopened, vyřešeno S5+S6
- ✅ BUG-05 Resend API klíč rotace – vyřešeno S6
- ✅ FEATURE: Offline účtenky s IndexedDB (`offline-sync.js` + `receipts.js`)
- ✅ Verzovací Memory Rules pro Claude Code
- ✅ Cache-busting hashe aktualizovány pro všechny změněné soubory
- ✅ `index.html` přejmenován na FinanceFlow v6.44

### V Session 5 (v6.44 → v6.46)
- ✅ 4 bugy grafů opraveny (infinite loop, kumulChart, HTML layout, box plot canvas) — `bugs.md` FIX-042 až FIX-045
- ✅ `.env` soubor vytvořen pro Resend API klíč (security best practice)
- ✅ Záložka **Verze** přidána do Admin panelu (changelog UI)
- ✅ GitHub Actions – automatický preview deploy na push do `dev`
- ✅ Worker v5 v repu (`cloudflare-worker/worker.js`) — deploy proběhl v S6
- ✅ Playwright soubory přesunuty do složky `Playwrite/`
- ✅ `CLAUDE.md` vytvořen – onboarding kontext pro Claude Code sessions
- ✅ `cloudflare-worker/worker.js` verzovaný v repu (ne jen v Cloudflare dashboardu)

### V Session 6 (v6.47 → v6.48)
- ✅ **TODO-001** · Firebase Rules nasazeno – chyba 403 se nevrací ✅
- ✅ **TODO-002** · Offline větev přidána do `save()` v `app.js` – ⚠️ čeká na ověření
- ✅ **TODO-003** · Email funguje – Řešení A (Resend účet ověřen), Worker v5 nasazen ✅
- ✅ **TODO-004** · Grafy potvrzeny Milanem ✅
- ✅ **TODO-007** · Sentry nasazen (async loader, DSN, setUser) – ⚠️ čeká na ověření
- ✅ **TODO-049** · Predikce opravena – `computeYearForecast()` přidána do `helpers.js` (FIX-049) ✅
- ✅ **TODO-050** · Worker v5 nasazen do Cloudflare ✅
- ✅ **TODO-051** · `RESEND_API_KEY` nastaven v Cloudflare Secrets – emaily fungují ✅
- ✅ **TODO-052** · GitHub Pages funguje z větve `dev` ✅
- ✅ **TODO-053** · `bcmilda.github.io` přidána do Firebase Auth ✅
- ✅ `index.html` aktualizován na v6.48, „O aplikaci" banner opraven (6.35 → 6.48)
- ✅ `js/admin.js` – VERZE_LOG záznam v6.48 přidán
- ✅ `docs/VERSIONING.md` – nová dokumentace pravidel verzování vytvořena
- ✅ `settings.js` – rekurzivní `applySettings()` opraven znovu (FIX-048, reopen FIX-035)


### V Session 7.0 (v6.49)
- ✅ **TODO-056** · Plány a cíle – progress bar, deadline, goal_deposits ✅
- ✅ **TODO-057** · Měsíční report – záložky 7D/1M/3M/6M/12M/Poradce přidány (UI) ✅
- ✅ **TODO-058** · Budoucí platby – `budouci.js`, horizont 30–365 dní ✅
- ✅ **TODO-059** · Report poradce + Finanční aktiva – `advisor.js` + `assets.js` ✅
- ✅ **TODO-060** · Bubble chart 4 varianty – nahrazuje donut v dashboardu ✅
- ✅ **TODO-005** · Dělení PDF – pdf.js 3.11.174, chunking 15 stránek/dávka ✅
- ✅ Firebase Rules referrals + referral_clicks opraveny (FIX-051) ✅

### V Session 7.1 (v6.49–v6.50)
- ✅ **TODO-063** · Bank sekce – NaN/0 při prázdném měsíci opraveno ✅
- ✅ **TODO-064** · O aplikaci banner – hardcoded verze aktualizována ✅
- ✅ **TODO-065** · helpers.js – `getTxByRange()`, `getMonthsInRange()` přidány ✅
- ✅ **TODO-066** · PDF JSON parsing – `indexOf('{')` + `lastIndexOf('}')` (FIX-052) ✅
- ✅ **computeAssetsNetWorth** kolize s `computeNetWorth` opravena (FIX-053) ✅


### V Session 8 (v6.51 → v6.65)
- ✅ **TODO-023** · Admin panel – správa členství nasazena (⏳ čeká na test s reálným uživatelem)
- ✅ **TODO-074** · Detektor úspor přepracován – datum v labelu, 1 nález/transakce, bez hranice 50 Kč
- ✅ **TODO-005** · PDF import – 72/72 transakcí, Import Editor funkční (FIX-067, FIX-068)
- ✅ FIX-054–078 nasazeny (25 oprav napříč v6.51–v6.65) – viz `bugs.md` sekce Session 8
- ✅ Scoring v2 nasazen – `computeFinancialScore()` přepracován na 4 nezávislé složky (ADR-043)
- ✅ isBalancing flag – KB EUR vyrovnávací transakce správně vyloučeny ze součtů
- ✅ Import Editor – nový modal, 4 barevné úrovně duplikátů, nové scoring (FIX-070, FIX-074)
- ⏳ Offline sync (FIX-057, FIX-058) – nasazeno, netestováno
- ⏳ Stripe Payment Links (TODO-073) – infrastruktura připravena, konstanty nevyplněny


### V Session 9 (v6.74 → v7.05)
- ✅ **TODO-006** · Globální error handler – window.error + unhandledrejection → banner (`app.js`, `index.html`)
- ✅ **TODO-008** · Validace JSON z AI – `validateReceiptJSON()` + `validateAiCatJSON()` (`receipts.js`, `ai.js`)
- ✅ **TODO-014** · AI pamatuje mapování kategorií – `normalizeMappingKey`, `loadCategoryMappings`, `saveCategoryMapping`, `lookupCategoryMapping` (`app.js`, `ai.js`, `import.js`, `receipts.js`)
- ✅ **TODO-015** · In-app notifikace nadcházejících plateb – badge nav, slide-up panel, snooze (`ui.js`)
- ✅ **TODO-079** · Adopce kategorií v admin panelu – tabulka využití, top podkategorie, custom badge (`admin.js`)
- ✅ **TODO-081** · Admin COICOP přiřazení vlastním kategoriím – `assignCoicop()` propíše do Firebase všem uživatelům (`admin.js`)
- ✅ **TODO-082** · COICOP agregáty + komunitní přehled – `computeCoicopAggregates()`, `uploadCoicopToFirebase()`, záložka COICOP v komunitním přehledu (`helpers.js`, `admin.js`)
- ✅ **TODO-084** · Cena/kg tracking – `extractUnit()`, `pricePerUnit` (`receipts.js`, v6.98)
- ✅ **TODO-085** · Shrinkflation detektor – badge 🔻, weightChange < -2% (`receipts.js`, v6.98)
- ✅ **TODO-086** · Doporučené přiřazení z importu – 🤖 badge, `acceptAllSuggestions`, admin záložka (`import.js`, v7.03)
- ✅ **TODO-087** · Detektor úspor – vzorce chování A/B/C/D propojeny s účtenkami (`projects.js`, v7.05)
- ✅ **TODO-080** (částečně) · Aktualizace grafů po podkategoriích – stats.js category breakdown + projects.js health rows

### Mimo sessions (pravděpodobně dokončeno)
- ✅ COICOP auto-učení → Firebase (`coicop_corrections/{uid}/{kw}`)
- ✅ PIN obrazovka – funguje (potvrzeno uživatelem v `bugs.md`)
- ✅ Privacy Policy + Podmínky **(Session 2)**
- ✅ Editor duplikátů při importu **(Session 2)**
- ✅ Modulární JS architektura **(Session 2 – viz `decisions.md` ADR-001b)**
- ✅ Firebase Hosting **(Session 2 – viz `decisions.md` ADR-011)**

---

## 📅 ROADMAP – konsolidace verzí a kvartálů

### Verze-level (Session 3 zdroj + aktualizace)

| Verze | Stav | Obsah |
|---|---|---|
| v6.35 | ✅ Hotovo | Nastavení, Sdílení, SMS import, Duplikáty, Nákupní seznam |
| v6.38–6.40 | ✅ Hotovo | Opravy bugů (grafy pokus #1, DTI, predikce, kontaktní formulář) |
| v6.41 | ✅ Hotovo | Kalendář, Predikce v2, Resend email, PIN logika |
| v6.42 | 🔄 Plánované | EmailJS (TODO-003), Box plot přesun (TODO-009), Landing page (TODO-010) |
| v6.43–6.44 | ✅ Hotovo | Offline IndexedDB, Session 4 opravy |
| v6.45 | ✅ Hotovo **(S5)** | 4 opravy grafů (FIX-042–045), GitHub Actions, Worker v5 v repu, `.env`, CLAUDE.md |
| v6.46 | ✅ Hotovo **(S5→S6)** | Predikce fix, Worker deploy, RESEND key, GitHub Pages |
| v6.47 | ✅ Hotovo **(S6)** | Firebase Rules, email fix, Predikce `computeYearForecast`, settings rekurze |
| v6.48 | ✅ Hotovo **(S6)** | Sentry monitoring, offline transakce `save()`, O aplikaci banner, VERZE_LOG |
| v6.49 | ✅ Hotovo **(S7.0)** | Plány a cíle, Budoucí platby, Advisor+Aktiva, Bubble chart 4 varianty, PDF chunking |
| v6.50 | ✅ Hotovo **(S7.1)** | computeAssetsNetWorth fix, Bank NaN fix, PDF JSON parsing fix, helpers funkce |
| v6.51–v6.65 | ✅ Hotovo **(S8)** | Scoring v2, PDF fix, Import Editor, Admin členství, Detektor úspor, isBalancing |
| v6.66–v6.73 | ✅ Hotovo **(S8 dodatek)** | Meziversze Session 8 (nedokumentovány) |
| v6.74–v6.99 | ✅ Hotovo **(S9)** | COICOP systém, categoryMappings, itemStats, error handler, shrinkflation, affiliate sdílení, modal transakce |
| v7.03–v7.05 | ✅ Hotovo **(S9 dodatek)** | Import doporučení, COMMUNITY_MONTH_KEY fix, Detektor úspor vzorce |
| v7.06+ | 🔄 Plánované | AI Rate Limiting (TODO-075), Bubble chart (TODO-076), FFR (TODO-088) |
| v6.5x | ⬜ Budoucnost | Playwright testy (TODO-020), Android NotificationListener MVP (TODO-024) |
| v6.6x | ⬜ Budoucnost | Platební systém (TODO-022) |
| v6.7x | ⬜ Budoucnost | PWA Service Worker (TODO-019), plný offline režim |
| v7.0 | ⬜ Q4 2026 | Velký redesign nebo nativní mobilní appka, veřejné spuštění |

### Kvartál-level (konsolidace S1 + S2 + S3)

```
Q2 2026 (Duben–Červen):
  ✅ Import CSV/PDF
  ✅ Editor duplikátů
  ✅ Modulární JS
  ✅ Firebase Hosting
  ✅ Privacy Policy + Podmínky
  ✅ Nákupní seznam
  ✅ IndexedDB offline (účtenky)
  ✅ Grafy opraveny (S5, v6.45)
  ✅ GitHub Actions (S5)
  ✅ Worker v5 nasazen (S6)
  ✅ RESEND_API_KEY nastaven (S6)
  ✅ Firebase Rules admin (S6)
  ✅ Email funguje – premium.js opraven (S6)
  ✅ Predikce opravena – computeYearForecast (S6)
  ✅ GitHub Pages funguje (S6)
  ✅ Sentry nasazen (S6, ověřit)
  ✅ Offline transakce implementovány (S6, ověřit)
  🔄 Nové kategorie (TODO-012)
  🔄 Hlídání cen (TODO-018)
  🔄 Ověření Sentry (TODO-007)
  🔄 Ověření offline transakcí (TODO-002)
  ✅ Bubble chart + nové sekce S7.0
  ✅ PDF chunking (S7.0)
  ⚠️ Plány záložka (TODO-072)
  ⚠️ Report přepočet (TODO-067)

Q3 2026 (Červenec–Září):
  ⬜ Playwright testy (TODO-020)
  ⬜ Android NotificationListener MVP (TODO-024)
  ⬜ Platební systém (TODO-022)
  ⬜ Google Play vydání (TODO-027)
  ⬜ Vlastní doména (TODO-040)
  ⬜ AI mapování kategorií (TODO-014)
  ⬜ Sentry monitoring (TODO-007)
  ⬜ Service Worker (TODO-019)

Q4 2026 (Říjen–Prosinec):
  ⬜ Lokalizace EN/SK (TODO-028)
  ⬜ Podpora více měn (TODO-029)
  ⬜ Web Push notifikace (TODO-030)
  ⬜ PDF/XLSX export (TODO-031)
  ⬜ Open Banking (pokud reálné, TODO-026)
  ⬜ Bundling Vite/esbuild (TODO-035)
  ⬜ v7.0 velký milestone / veřejné spuštění
```

---

## 📏 Versioning pravidla (převzato z `decisions.md`)

```
Bug fix / malý tweak  → +0.01
Nová feature          → +0.01 (od v6.11)
Velký milestone       → +1.00  (např. v7.0 = publikace aplikace)
```

Viz `decisions.md` sekce 5.2 a `doc/VERSIONING.md` pro kompletní pravidla versioningu a commit workflow.

Při každé změně verze aktualizovat: `<title>`, sidebar logo, „O aplikaci“ banner, cache-busting hashé, VERZE_LOG v `admin.js`.

---

## Nové úkoly Session 10 (TODO-094 až 099)

### TODO-094 · ČSÚ data na úrovni skupin a tříd **(Session 10, 🟡 P2)**
- **Popis:** Komunitní srovnání má 13 oddílů COICOP; doplnit ČSÚ referenční hodnoty i pro skupiny/třídy (úroveň 2 a 3 stromu).
- **Stav:** ❌ Otevřené, čeká na data ČSÚ.

### TODO-095 · Mapování vlastních kategorií na COICOP 1:1 **(Session 10, 🟡 P2)**
- **Popis:** ~11 % výdajů nezařazeno do COICOP. Doplnit mapování zbývajících kategorií.
- **Stav:** ❌ Otevřené.

### TODO-096 · Plný rodinný souhrn – zápis do sdílené DB **(Session 10, 💡)**
- **Popis:** Rodinný souhrn je nyní read-only (čte partnerData). Zvážit sdílenou agregaci se zápisem.
- **Stav:** 💡 Návrh (ADR-051 read-only model).

### TODO-097 · Stripe Payment Links + Premium zámky **(Session 10, 🔴 P1)**
- **Popis:** Aktivace plateb. Návod hotov (STRIPE_SETUP_navod.md, ADR-053).
- **Stav:** 🔴 BLOKOVÁNO – Milan nemá IČO/OSVČ. Pro donate zvážit Ko-fi/QR. Čeká na URL Payment Links.

### TODO-098 · Lineární trend predikce + IQR outliery **(Session 10, 🟡 P2)**
- **Popis:** Vylepšení predikce nad klouzavý průměr × sezóna. ADR-052.
- **Stav:** 📋 Návrh, k implementaci.

### TODO-099 · Spending Pace – druhý měsíc dat **(Session 10, 🟢 P3)**
- **Popis:** Graf Spending Pace hotov (v7.31), plný efekt až s 2+ měsíci historie.
- **Stav:** ✅ Graf hotov, čeká na data.

### TODO-062 · Treemap v 12M reportu **(aktualizace stavu Session 10)**
- **Stav:** 🟡 ČÁSTEČNĚ – Treemap funguje na dashboardu (`renderDashTreemap`), v 12M reportu zatím ne. Rozhodnutí Milana: ponechat částečně.

*Konsolidováno: 2026-04-23 | Doplněno S6: 2026-05-15 | Session 7.0+7.1 patch: 2026-05-15 | Sessions: 1 → 10 | Poslední update: Session 10, 2026-06-01 | Autor: Milan Migdal*
*Poznámka ke konsolidaci: `todo_consolidated_s6_v2.md` jako základ + aplikace `patch-session7-COMBINED(1).md`. TODO-049/050 uzavřeny jako S6 ✅. TODO-056–066 přidány jako S7 hotové. TODO-061/062/067–072 přidány jako S7 otevřené.*
*Poznámka ke konsolidaci: `todo_s6.md` jako základ — nejkomplexnější S6 verze (správně uzavřené TODO, Překryvy N–T, Roadmap v6.45–6.48). Doplněno: přesnější TL;DR P1 počet, Session 4 update u TODO-003, conflict note u TODO-004, detailní TODO-002 offline flow (SESSION_SUMMARY S6), dvoupokusová histoire Sentry (SESSION_SUMMARY S6), Dokončeno S5+S6 sekce. Vše označeno `(Merge S1-5)` / `(Session Summary S6)`.*


---

## Session 11 – nové a aktualizované TODO (v7.50 → v7.69)

### TODO-111 · Google Analytics 4 ✅ HOTOVO **(Session 11)**
- **Implementováno:** v7.63
- **Řešení:** Tag G-F2Z8DK4RR0, landing i app, anonymize_ip, page_view tracking v showPage().

### TODO-117 · Slevy z účtenek → propojení s Nákupním seznamem 🟡 P2 **(Session 11)**
- **Popis:** Položka s `discount > 0` → fuzzy match s `nakupList` katalogem → zapsat `catalog/items/{key}.lastDiscount: {date, store, pct, saved}` → push notifikace „X byl v akci −Y% v Z obchodě".
- **Příprava:** Pole `discount` přidáno do AI promptu (worker.js) a datového modelu. Základ pro propojení je hotov.
- **Zbývá:** Fuzzy matching logika + katalog lastDiscount + push trigger.
- **Priorita:** 🟡 Střední
- **Stav:** ⏳ Čeká

### TODO-118 · „Upravit split" UI button 🟢 P3 **(Session 11)**
- **Popis:** Po splitu transakce na children nelze split znovu upravit (změnit kategorie, částky) bez mazání children. Potřeba tlačítka „Upravit split" které otevře split modal s existujícími children načtenými k editaci.
- **Priorita:** 🟢 Nízká
- **Stav:** ⏳ Čeká

### TODO-119 · Push notifikace na mobil 🔴 P1 **(Session 11)**
- **Popis:** Push notifikace se zobrazují jen v aplikaci jako in-app zprávy, ale NE jako systémové notifikace telefonu (push okénko jako bankovní app). Subscription v RTDB existuje pouze z Firefox/Windows PC.
- **Diagnostika:**
  1. Ověřit `push_subs/` v Firebase RTDB – je tam mobile endpoint? (Chrome: `fcm.googleapis.com`, Firefox: `updates.push.services.mozilla.com`)
  2. Ověřit VAPID klíče v Cloudflare Worker Settings → Variables (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`)
  3. Na mobilu: appka → Oznámení → toggle push → systémový dialog „Povolit notifikace"?
  4. Ověřit cron trigger v Cloudflare: `0 */6 * * *`
- **Technická note:** Náš systém = VAPID přímo (Cloudflare Worker), NE Firebase Cloud Messaging. Firebase FCM Web Push Certificates nejsou potřeba.
- **Priorita:** 🔴 Kritická (uživatel čeká na push)
- **Stav:** 🔴 Otevřené

### TODO-120 · ~~Sjednotit affiliate + partner odkaz~~ ✅ HOTOVO **(Session 11)**
- **Implementováno:** v7.68 (ADR-058)
- **Řešení:** Jeden `?ref=KÓD` odkaz, `checkIncomingRef()` dělá affiliate + partner pairing.

### TODO-121 · GDPR Cookie Consent Mode pro GA4 🟢 P3 **(Session 11)**
- **Popis:** GA4 běží bez cookie consent banneru. Pro EU/ČR uživatele je doporučeno implementovat Consent Mode v2 (defaultně denied, update po souhlasu).
- **Priorita:** 🟢 Nízká (aktuální implementace anonymize_ip je minimální soulad)
- **Stav:** ⏳ Čeká

### TODO-093 (update) · Anti-flicker _dataSig + render architektura **(Session 11)**
- **Update:** `save()` vždy nastavuje `_renderForce = true`. `_dataSig()` rozšířen o wallet balances (wsum), goals saved+target (gsum), tagy+subcat délka (tsum). Viz FIX-124.

### Stav otevřených TODO po Session 11

| Priorita | TODO | Popis | Stav |
|---|---|---|---|
| 🔴 P1 | TODO-119 | Push notifikace na mobil | 🔴 Otevřené |
| 🔴 P1 | TODO-075 | AI Rate Limiting (ADR-041) | ⏳ Design hotov, impl. čeká |
| 🟡 P2 | TODO-117 | Slevy → Nákupní seznam | ⏳ Základ hotov |
| 🟡 P2 | TODO-113 | Google Play TWA wrapper | ⏳ Package ready |
| 🟡 P2 | TODO-073 | Stripe payment activation | ⏳ Čeká na živnost |
| 🟢 P3 | TODO-118 | Upravit split UI | ⏳ Čeká |
| 🟢 P3 | TODO-121 | GDPR Cookie Consent | ⏳ Čeká |
| 🟢 P3 | TODO-110 | Rodinné finance owner per-tx | ⏳ Čeká |

---

*Aktualizace Session 11: 2026-06-09 | TODO-117–121*

---

# SESSION 12.1 (v7.70 -> v7.94)

- **TODO-122** ✅ · Admin výkon Krok 1 (v7.77): adminFetchUserCategories shallow+per-uid (pool 8), 4 loadery přepsány.
- **TODO-123** · score-engine.js dle ADR-060 (config hotový, vyjasnit 290 vs 295 b).
- **TODO-124** · měna v transakci (dědit z peněženky currency + přepočet na CZK). Nabídka měn rozšířena (v7.92, 14 měn), zbývá přepočet kurzem.
- **TODO-125** · SVG grafy dávka 2.
- **TODO-126–128** · drobné UI doladění predikce/dashboard (částečně řešeno v7.93).
- **TODO-129** · Apple Sign In (Apple Developer Program $99/rok, odloženo na iOS publikaci).
- **TODO-130** · Cloudflare: po aktivaci ověřit SSL Full strict, Bot Fight Mode ON, e-mail MX = DNS only. ✅ ImprovMX zprovozněn (MX mx1/mx2.improvmx.com + SPF).
- **TODO-131** · Nákupní DNA rozšířit o COICOP skupiny z product-groups.json (frequent items přes productGroupLookup).
- **TODO-132** · Firebase App Check (reCAPTCHA Enterprise) – ochrana RTDB + workeru.
- **TODO-133** · Přesun jako budoucí platba z trvalého příkazu. ✅ vyřešeno v7.84 (šablona typu Přesun).
- **TODO-134** · Rate limiting Krok 2 – počítání kvót aiUsage/{uid}/{YYYY-MM} ve Firebase, vyžaduje Firebase Admin SDK v Cloudflare Workeru. Limity: Free 0 AI (jen CSV), Premium ~150 účtenek/30 importů/30 reportů/měs, Pro vyšší.
- **TODO-135** · Ceník UI Free/Premium/Pro karty (až Stripe/živnost).
- **TODO-136** · Kategorie do rozklikávacího accordionu (stránka dlouhá).

---

---

*Aktualizace Session 12.1: 2026-06-14 | v7.70 → v7.94 | FIX-129-146, TODO-122-136, ADR-060-064*
