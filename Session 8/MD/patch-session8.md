# Patch – Session 8 (2026-05-19 → 2026-05-24)

> **Rozsah verzí:** v6.51 → v6.65
> **Větev:** `dev` (merge do `main` po otestování)
> **Stav:** Částečně otestováno – viz sekce Stav testování
> **Pracovní jazyk:** čeština
> **Datum patch souboru:** 2026-05-24

---

## 🔑 max_tokens – odpověď na dotaz Milana

`max_tokens` v Claude API je **output limit** (kolik tokenů smí Claude vygenerovat v odpovědi),
**ne** celkový context window. Claude Sonnet 4 context window = 200k tokenů.

| Typ volání | max_tokens | Proč |
|---|---|---|
| `chat` | 2 048 | Krátká odpověď, max ~300 slov |
| `receipt` | 8 192 | JSON struktura 1 účtenky |
| `bank_statement_text` | 16 384 | 72 transakcí × ~150 tok/tx ≈ 10 800 + rezerva |
| `advisor_report` | 1 024 | Krátký report |
| `wish_url`, `price_alert` | 512 | Jednoduchý JSON |

---

## 📋 Stav testování (Milanova zpětná vazba)

| Funkce | Stav | Poznámka |
|---|---|---|
| PDF import (72 transakcí) | ✅ Funguje | Vyrovnávací platby evidovány, nezapočítány |
| Import Editor (duplikáty) | ✅ Funguje | Nový modal, 4 barvy, nové scoring |
| Detektor úspor | ✅ Funguje | Datum v labelu, opravené částky |
| Bubble chart | ❌ Stále nefunguje | SVG overflow přetrvává – nutno přepracovat |
| Finanční skóre | 🔄 Ladí se | Excel tabulky v přípravě, scoring v2 nasazen |
| Stripe / Donate | ⏳ Nenasazeno | Payment linky nevyplněny v donate.js |
| Offline synchronizace | ⏳ Netestováno | FIX-057, FIX-058 nasazeny ale neověřeny |
| Admin panel (správa členství) | ⏳ Čeká na uživatele | TODO-023 nasazeno, nelze otestovat bez jiného uživatele |
| Sentry | ⚠️ Neopraveno | release dynamický přidán, ale error JAVASCRIPT-2 stále Ongoing v Sentry (viz screenshot) – bug byl opraven kódem, ale Sentry verze tracker neaktualizoval. Po deployi v6.60+ by mělo zmizet. |
| FIX-058 komprese fotek | ⏳ Netestováno | Vyžaduje fyzický test focení účtenky |
| AI limity (ADR-041) | 📝 ADR sepsán, neimplementován | Čeká na Firebase Admin SDK ve Workeru |
| Dashboard (Příjmy/Výdaje) | ✅ Opraveno | getActual() a expSum/incSum čtou amount\|\|amt |
| Treemap "Ostatní" | ✅ Přidáno | Transakce bez kategorie viditelné |
| Bar chart NaN | ✅ Opraveno | Guard přidán |

---

## 🐛 Změny v bugs.md

### Nové OTEVŘENÉ bugy (Session 8)

#### OPEN-031 · Bubble chart – přetékání bublin ze SVG (Session 8)
- **Soubor:** `ui.js` – `bCluster()`
- **Popis:** Satelitní bubliny přetékají mimo SVG viewBox na pravém a dolním okraji. Pokusy o FIX-072 (padding 60px) nezabraly – bug přetrvává.
- **Priorita:** 🟡 Střední
- **Stav:** Otevřeno – nutno přepsat pozicování (absolutní px → relativní, nebo force-clip)
- **Poznámka:** Nahrazuje OPEN-027 z Session 7.1 (přejmenováno)

#### OPEN-032 · Sentry JAVASCRIPT-2 – Ongoing navzdory kódové opravě (Session 8)
- **Soubor:** `import.js`, `index.html`
- **Popis:** Sentry stále hlásí `renderImportEditor → importEditorStats is null`. Modal byl přidán (FIX-068) a pořadí volání opraveno (FIX-068b), ale Sentry issue zůstává Ongoing.
- **Teorie:** Sentry cache starého eventu, nebo uživatel (Milan) používal starou verzi při testu.
- **Priorita:** 🟡 Střední
- **Stav:** Sledovat – po deployi v6.60+ by mělo zmizet

#### OPEN-033 · Stripe / Donate – chybí Payment Link hodnoty (Session 8)
- **Soubor:** `donate.js`
- **Popis:** Konstanta `DONATE_PAYMENT_LINK_TEST/LIVE` a `PREMIUM_MONTHLY/YEARLY_LINK` jsou vyplněny jako `REPLACE_ME`. Stripe Payment Links nevytvořeny v Stripe Dashboard.
- **Priorita:** 🟡 Střední
- **Akce:** Milan musí vytvořit Stripe produkty a vyplnit linky. Viz `stripe-setup-guide.md`.

#### OPEN-034 · FIX-058 komprese fotek – netestováno (Session 8)
- **Soubor:** `receipts.js`, `offline-sync.js`
- **Popis:** Dvojí komprese účtenek opravena (FIX-058), ale nebyla fyzicky otestována focením.
- **Priorita:** 🟢 Nízká
- **Akce:** Otestovat: ofotit účtenku → ověřit že se nekomprimuje 2×

### Uzavřené bugy (Session 8)

#### ~~OPEN-003~~ · ~~PDF import – chybějící transakce + crash~~ ✅ VYŘEŠENO S8 v6.60–v6.61
- **Vyřešeno:** FIX-067 (prompt pro KB EUR + Vyrovnávací úhrada), FIX-068 (chybějící modal), FIX-068b (pořadí open/render)
- **Výsledek:** 72/72 transakcí, Import Editor otevírá správně

#### ~~OPEN-026~~ · ~~Import preview crash při 0 transakcích~~ ✅ VYŘEŠENO S8
- Součást FIX-068

#### ~~OPEN-029~~ · ~~Měsíční report – přepočet dat dle periody~~ – Stav neutrální
- `getTxByRange()` přidán v Session 7.1, ale neotestován v S8. Ponecháno otevřené.

---

## ✅ Změny v todo.md

### Nová TODO (Session 8)

#### TODO-072 · Finanční kategorie příjmů – váhy a stable flag (Session 8, 🟡 P2)
- **Popis:** Definovat příjmové kategorie s váhami stability: zaměstnání > brigáda > OSVČ > investice > cashback > dary. Přidat UI pro `stable:true` v nastavení kategorií.
- **Stav:** Odloženo – po doladění scoring systému
- **Závisí na:** Konfigurace tabulek ze `FinanceFlow_Scoring_Konfigurace.xlsx`

#### TODO-073 · Donate / Stripe – Premium subscription (Session 8, 🟡 P2)
- **Popis:** Vytvořit Stripe Subscription produkty (99 Kč/měs, 999 Kč/rok) a vyplnit Payment Link konstanty v `donate.js`. Přidat tlačítka do `showPaywall()` v `premium.js`.
- **Stav:** Infrastruktura připravena, PaymentLinks chybí
- **Soubor:** `donate.js` – konstanty `PREMIUM_MONTHLY_LINK_*`, `PREMIUM_YEARLY_LINK_*`

#### TODO-074 · Detektor úspor – přepracování (Session 8, ✅ HOTOVO v6.58–v6.65)
- **Popis:** Oprava logiky detektoru předplatných
- **Hotovo:** 1 transakce = 1 nález, datum v labelu, odstraněna hranice 50 Kč (v6.65)

#### TODO-075 · AI Rate Limiting – implementace ADR-041 (Session 8, 🔴 P1)
- **Popis:** Worker + Firebase Admin SDK + `ai-limits.js` + UI v Settings + Admin karta
- **Stav:** ADR-041 schválen, implementace čeká
- **Závisí na:** Firebase Admin SDK v Cloudflare Worker (JWT auth přes REST API)

#### TODO-076 · Bubble chart – kompletní přepracování pozicování (Session 8, 🟡 P2)
- **Popis:** SVG přetékání bublin není opraveno ani po FIX-072. Nutno přepsat na force-directed layout nebo používat relativní % souřadnice s clip-path.
- **Stav:** Otevřeno

#### TODO-077 · Krátkodobý pohled ve Finančním obrazu (Session 8, 🟡 P2)
- **Popis:** Přidat srovnání s MINULÝM měsícem (ne jen s baseline) v `renderObraz()`. Finanční obraz reaguje příliš pomalu na malé změny protože baseline je stará 6 měsíců.
- **Stav:** Navrženo, neimplementováno

### Uzavřená TODO (Session 8)

#### ~~TODO-023~~ · Admin panel – správa členství (Session 8, ✅ NASAZENO v6.57)
- Seznam uživatelů, detail modal, manuální správa Premium/Trial, audit log
- **Čeká:** Testování s reálnými uživateli

---

## 📐 Změny v decisions.md

### ADR-041 · AI Rate Limiting – per-type kvóty ✅ SCHVÁLENO (Session 8)

| Typ | Free/měs | Trial/měs | Premium/měs |
|---|---:|---:|---:|
| receipt | 15 | 50 | 50 |
| bank_statement_text | 2 | 5 | 5 |
| chat | 20 | 80 | 80 |
| advisor_report | 1 | 5 | 5 |
| wish_url | 5 | 15 | 15 |
| price_alert | 5 | 15 | 15 |
| contact_form | 1 | 3 | 3 |
| **Global cap (total)** | 50 | 1 000 | 1 000 |

Architektura: Firebase Realtime DB pro counter, Dual enforcement (klient + Worker), Refund pro receipt/bank_statement/wish_url při prázdném výsledku, Fail-open při Firebase outage.

Plný ADR: `/mnt/user-data/outputs/ADR-041-ai-rate-limiting.md`

### ADR-042 · Architektura 3 hodnotících systémů (Session 8)

| Systém | Soubor | Funkce | Zobrazení |
|---|---|---|---|
| S1 | `premium.js` | `computeFinancialScore()` | Dashboard "Finanční skóre" 0-100 |
| S2A | `projects.js` | `computeHealthScores()` | Souhrn výdajů "Finanční zdraví" |
| S2B | `projects.js` | `renderObraz()` | Záložka "Finanční obraz" trend |

### ADR-043 · Scoring v2 – 4 nezávislé složky (Session 8) ✅ IMPLEMENTOVÁNO v6.64

Přepracování `computeFinancialScore()` dle Option C:
- **S1 Cash Flow (0-25):** expRatio lookup 26 řádků (0.50→>1.60)
- **S2 Zadluženost (0-25):** DTI (0-13) + DSTI (0-12) NEZÁVISLE
- **S3 Rezerva (0-25):** POUZE monthsReserve – eliminuje dvojitý postih se S1
- **S4 Spoření (0-25):** activeSavingRate = isSaving kategorií / baseIncome
- **Konzistenční bonus:** +2/+5/+9/+13/+15 za 2-6 měsíců nepřetržitého zlepšení (cap 100)

FIX: Odstraněn dvojitý postih za záporné saldo (starý S1 + S3 trestaly oboje).

Excel konfigurace: `FinanceFlow_Scoring_Komplet_v3.xlsx`

---

## 📝 Dotčené MD soubory

| Soubor | Co se změnilo |
|---|---|
| `bugs.md` | +OPEN-031, OPEN-032, OPEN-033, OPEN-034; uzavřeny OPEN-003, OPEN-026 |
| `todo.md` | +TODO-072 až TODO-077; uzavřeny TODO-023, TODO-074 |
| `decisions.md` | +ADR-041 (AI Rate Limiting), ADR-042 (3 systémy), ADR-043 (Scoring v2) |
| `formulas.md` | Viz sekce níže |
| `architecture.md` | Viz sekce níže |
| `context.md` | Session kontext aktualizován |

---

## 📐 Změny v formulas.md

### Přidat sekci: Scoring v2 formule

```
expRatio = totalExp / totalInc                          (S1)
DTI      = totalDebt / (baseIncome × 12) × 100          (S2a)
DSTI     = monthlyPayments / baseIncome × 100            (S2b)
monthsReserve = savBalance / baseIncome                  (S3)
activeSavingRate = sum(isSaving txs) / baseIncome × 100  (S4)
```

Konflikty: DSTI definice v decisions.md vs. premium.js je nyní konzistentní
(obojí používá `baseIncome`, ne `totalInc`).

---

## 🏗️ Změny v architecture.md

### Přidat:

**Sekce 18: PDF Import – KB Multiměnový účet**
Komerční banka vytváří 3 záznamy pro každou EUR platbu:
1. Původní EUR výdaj (`CLAUDE.AI SUBSCRIPTION -21,78 EUR`) – `isBalancing: false`
2. Vyrovnávací příjem EUR (`MILAN MIGDAL +20,78 EUR`) – `isBalancing: true`
3. Vyrovnávací výdaj CZK (`MILAN MIGDAL -525,63 Kč`) – `isBalancing: true`

`isBalancing: true` transakce jsou uloženy do DB ale vyloučeny z `incSum()`/`expSum()` v `helpers.js`.
Datum provedení (`executionDate`) je použit jako primární datum (ne datum zaúčtování).

**Sekce 19: Import Editor**
`modalImportEditor` div musí existovat v `index.html` (přidán v v6.60).
Volání pořadí: `modal.open()` → `await requestAnimationFrame` → `renderImportEditor()`.
4 barevné úrovně duplikátů: 🟢 <40 / 🟡 40-59 / 🟠 60-79 / 🔴 ≥80.

---

## 📦 Nasazené soubory – kompletní seznam

### Firebase Hosting (nasadit přes `firebase deploy --only hosting`)

| Soubor | Verze zavedena | Hash v6.65 | Stav |
|---|---|---|---|
| `index.html` | v6.51 → v6.65 | — | ✅ |
| `admin.js` | v6.57 + v6.65 | `7520811f` | ✅ |
| `app.js` | v6.59 | `dca4fc41` | ✅ |
| `donate.js` | v6.54 + v6.59 | `cdd38092` | ⚠️ Payment links nevyplněny |
| `firebase.js` | v6.59 + v6.62 | `220ea7e9` | ✅ |
| `helpers.js` | v6.61 + v6.62 | `d326aa4f` | ✅ |
| `import.js` | v6.52 + v6.60-v6.61 + v6.62 | `10afdcb1` | ✅ |
| `offline-sync.js` | v6.55 + v6.56 | (hash v outputs) | ⏳ Netestováno |
| `premium.js` | v6.64 | `00f68740` | ✅ nasazeno, ladí se |
| `projects.js` | v6.58 + v6.63 + v6.65 | `15c40231` | ✅ |
| `receipts.js` | v6.56 + v6.59 | `be7baff2` | ⏳ FIX-058 netestováno |
| `sms-import.js` | v6.53 | (hash v outputs) | ✅ |
| `ui.js` | v6.51 + v6.59-v6.63 | `28ff576f` | ⚠️ bubble chart nefunguje |

### Cloudflare Worker (nasadit ručně přes Dashboard)

| Soubor | Verze | Stav |
|---|---|---|
| `worker.js` | v6.52 + v6.59 + v6.61 | ✅ nasazen |

---

## 🔢 Přečíslování ID – session 8

| Původní (dočasné) | Finální ID | Popis |
|---|---|---|
| — | FIX-054 | worker.js max_tokens pro bank_statement |
| — | FIX-055 | import.js JSON repair + async editor |
| — | FIX-056 | helpers.js genTxId() kolize |
| — | FIX-057 | offline-sync.js Worker URL + auth |
| — | FIX-058 | receipts.js dvojí komprese fotek |
| — | FIX-059 | projects.js Detektor úspor (3× iterace v S8) |
| — | FIX-060 | ui.js bar chart Jan-Dec + worker.js chat tokens |
| — | FIX-061 | receipts.js timeout + import.js PDF debug log |
| — | FIX-062 | import.js anti-double-click |
| — | FIX-063 | app.js + firebase.js beforeunload/sendBeacon |
| — | FIX-064 | admin.js adminViewUserAs → switchToPartner |
| — | FIX-065 | donate.js Premium subscription links |
| — | FIX-066 | projects.js Detektor úspor layout |
| — | FIX-067 | worker.js KB EUR Vyrovnávací úhrada prompt |
| — | FIX-068 | index.html modalImportEditor chyběl |
| — | FIX-068b | import.js pořadí open/render + null check |
| — | FIX-069 | worker.js + import.js executionDate + isBalancing |
| — | FIX-070 | import.js calcDupScore přepis (Milan spec) |
| — | FIX-071 | ui.js renderBarChart NaN guard |
| — | FIX-072 | ui.js bCluster SVG padding (částečně) |
| — | FIX-073 | helpers.js getActual() amount\|\|amt + isBalancing |
| — | FIX-074 | import.js calcDupScore final verze + orange |
| — | FIX-075 | index.html Sentry dynamic release + firebase.js user |
| — | FIX-076 | ui.js renderSouhrn() totalCur/totalPrev all txs |
| — | FIX-077 | projects.js renderObraz() baseline first month with data |
| — | FIX-078 | premium.js computeFinancialScore v2 – 4 složky |

---

## 📌 Co zbývá před Session 9

### Kritické (nutno před spuštěním)
1. **AI Rate Limiting** (TODO-075) – bez toho Worker otevřený pro zneužití
2. **Stripe Payment Links** (OPEN-033) – vyplnit v `donate.js`
3. **Bubble chart** (OPEN-031, TODO-076) – vizuálně nepoužitelné

### Střední
4. **Offline sync test** (FIX-057, FIX-058) – fotit účtenku offline → sync
5. **Sentry** (OPEN-032) – po deployi v6.60+ by se mělo vyřešit samo
6. **Admin panel test** (TODO-023) – otestovat s druhým uživatelem
7. **Krátkodobý pohled** ve Finančním obrazu (TODO-077)
8. **Kategorie příjmů** s `stable:true` a `isSaving` (TODO-072)

### Na Session 9
- Implementace `computeHealthScores()` s reálnými `healthPct`/`healthAmt` z Excel konfigurace
- TODO-061 Chord diagram (stats.js)
- TODO-062 Treemap v 12M záložce (projects.js)

---

*Patch vytvořen: Session 8 (2026-05-24) | Autor: Milan Migdal + Claude Sonnet 4.6*
