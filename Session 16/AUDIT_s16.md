# AUDIT_s16.md — Bezpečnostní a architektonický audit FinanceFlow
**Verze auditu:** v8.84 · 2026-07-08 · Session 16 (v8.85 opravuje P1-1)
**Rozsah:** bezpečnost (XSS, Firebase rules, worker), GDPR/cookies, škálovatelnost 10 000 DAU, konzistence logiky, skryté vady. Každý nález ověřen v kódu (soubor:řádek).

---

## Celkový verdikt

| Oblast | Stav |
|---|---|
| Worker (AI proxy) | 🟢 Solidní — ověření Firebase ID tokenu, per-UID rate limit, CORS allowlist |
| Firebase rules | 🟡 Dobrá izolace uživatelů, ale chybí validace/limity a `leads`/`affiliate` jsou otevřené k zápisu |
| XSS | 🔴 `escHtml` existuje, ale ~50 sinků renderuje uživatelská jména RAW → **cross-user stored XSS přes sdílení** |
| GDPR/cookies | 🟡 App má Consent Mode v2 správně; **landing (index.html) spouští GA4 bez consentu** |
| Škálovatelnost 10k DAU | 🔴 Datová vrstva NE — full-object write + admin stahuje celé `users.json` |
| Logika/konzistence | 🟡 Grafy porušovaly vlastní pravidla (split/transfer/FX — ✅ opraveno ve v8.85) |

---

## 🔴 P0 — Kritické

### P0-1 · Cross-user stored XSS — ✅ OPRAVENO ve v8.86 (sanitizace na vstupu dat, 5 load míst vč. partnera)
- **Důkaz:** `escHtml` v `helpers.js:468` se používá jen ve `statCard`/`emptyState`. Jinde RAW: `ui.js:491`, `kalendar.js:213`, `premium.js:516` — celkem **9× `${t.name}` + 42× `${*.name}`** (dluhy, peněženky, aktiva, cíle).
- **Proč kritické:** rules dávají partnerovi čtení celého `data` uzlu. Partner A pojmenuje transakci `<img src=x onerror=…>` → vykreslí se v session partnera B → spuštění cizího kódu v cizím účtu.
- **Fix:** centrální sanitizace — `escHtml()` na všechna místa renderu uživatelských řetězců + validace délky v rules.
- **Náročnost:** 🟠 střední.

### P0-2 · Landing GA4 bez consentu — ✅ OPRAVENO ve v8.86 (consent default + cookie lišta)
- **Důkaz:** `app.html:11` má consent default denied ✅; **`index.html:7-12` volá `gtag('config')` bez consent default** → `_ga` cookies před souhlasem (GDPR/ePrivacy).
- **Fix:** consent-default blok + mini cookie lišta na landing (sdílený klíč `ff_cookie_analytics`).
- **Náročnost:** 🟢 malá.

### P0-3 · Admin stahoval celé users.json — ✅ OPRAVENO ve v8.86 (shallow + per-uid, pool 8; lastActivity dočasně = createdAt, plný agregát s ADR-061/062)
- **Důkaz:** `admin.js:2750` bez `shallow` (COICOP audity už shallow — S12.1c). ADR-061 krok 2 nedokončen.
- **Dopad při 10k:** ~10 GB na otevření stránky.
- **Fix:** shallow UID seznam + per-uid `profile`/`premium`, nebo `/adminIndex/{uid}` agregát.
- **Náročnost:** 🟠 střední.

### P0-4 · Full-object write při každém uložení
- **Důkaz:** `app.js:808` — `_set(users/{uid}/data, dataToSave)` celý objekt; `onValue` stahuje celek zpět (i partnerovi).
- **Matematika 10k DAU:** ~1,5 MB × 8 uložení/den × 10 000 = ~120 GB/den → tisíce $/měsíc RTDB egress + latence na mobilu.
- **Fix:** diff-write architektura (návrh probrán se zadavatelem, plán = ADR-062, 2 sessions).
- **Náročnost:** 🔴 velká.

---

## 🟠 P1 — Vysoké

### P1-1 · Grafy: split/transfer/FX — ✅ OPRAVENO ve v8.85
- getGrafTxs nefiltroval `splitParent`/`isBalancing` (splity 2×), přesuny jako výdaje; 7 součtů bez `txCZK` (EUR/GBP špatně). v8.85: povinné filtry + txCZK všude; Tempo = čisté výdaje vždy; typ Přesuny volitelný.

### P1-2 · Rules — ✅ ČÁSTEČNĚ v8.86: leads/affiliate create-only + validace délek; hloubková validace `data` odložena k ADR-062
- `data` bez `.validate` (cost-abuse, deformace pro partnera); `leads`/`affiliate` `.write: auth != null` (spam, self-referral); `app.js:640` affiliate klíč `Date.now()` (kolize).
- **Fix:** `.validate` (délky, typy), affiliate zápis přes worker, leads limity.

### P1-3 · SW offline fallback — ✅ OPRAVENO ve v8.86 (app.html v SHELL, fallback dle cesty + fix přepisování cache)
- `sw.js:20` — `SHELL` bez `app.html`, navigační fallback na `index.html` → offline boot appky spadne na landing. Před Google Play opravit.
- **Fix:** app.html do SHELL + fallback dle cesty `/app`.

---

## 🟡 P2 — Střední / konzistence

| # | Nález | Důkaz | Fix |
|---|---|---|---|
| P2-1 | `fmtP(t.amt)` | `ui.js:491` | ✅ opraveno v8.86 |
| P2-2 | Dvě definice „rezervy" (Stres Emergency = všechny peněženky vč. záporné kreditky; skóre S3 jinak) | `debts.js` vs `premium.js` | sjednotit přes `assetLiqTotals` + GLOSSARY |
| P2-3 | Dvě sekce „Kam směřuju" (Radar = konec měsíce, Obraz = 6M) | `projects.js` | ⏸ **TODO-176**: Milan (11.7.) — NEpřejmenovávat, probrat později |
| P2-4 | `calNotes.text` — sjednotit sanitizaci v rámci P0-1 | `kalendar.js` | s P0-1 |
| P2-5 | affiliate klíč `Date.now()` → `push()` | `app.js:640` | s P1-2 |

---

## ✅ Ověřeno v pořádku
Worker (token verify, rate limit, CORS), izolace v rules, consent v appce (S14 fix potvrzen), save() debounce, offline IndexedDB fronta, jediný interval, cache-busting disciplína, admin COICOP shallow.

## Odpověď „10 000 lidí denně?"
Frontend + Auth + Worker **ANO**; datová vrstva **NE** dokud platí P0-3/P0-4. Po shallow admin indexu a diff-write je 10k DAU na RTDB realistických.

## Pořadí oprav
1. ✅ P1-1 Grafy (v8.85) · 2. ✅ P0-2 consent (v8.86) · 3. ✅ P1-3 SW (v8.86) · 4. ✅ P0-1 XSS (v8.86) · 5. ✅ P1-2 rules-část (v8.86) · 6. ✅ P0-3 admin shallow (v8.86) · **7. P0-4 diff-write = ADR-062, schváleno Milanem, plán S17–S18.** Otevřené: P2-2 (definice rezervy), TODO-176 (názvy Kam směřuju).
