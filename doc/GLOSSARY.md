# FinanceFlow – Glossary (Slovníček)

> Abecední přehled termínů, zkratek a interních pojmů používaných v projektu FinanceFlow.
> Cíl: Claude i autor okamžitě najdou definici bez hledání v kódu nebo jiných .md souborech.
> Poslední aktualizace: 2026-04-16.

---

## A

**`admin.js`** – JS modul pro admin panel (jen Admin UID). Obsahuje changelog, keyword engine, leady, support zprávy, statistiky mapování.

**Admin UID** – Unikátní identifikátor admina ve Firebase: `LNEC8VNB2QPwIv6WWQ9lqgR4O5v1`. Používá se ve Firebase Security Rules pro omezení přístupu.

**ADR** – Architecture Decision Record. Formální záznam architektonického rozhodnutí (viz `decisions.md`). Číslování: ADR-001 až ADR-015.

**`amt`** – Starší alias pro `amount` v transakcích. Vždy čti `t.amount || t.amt || 0` kvůli zpětné kompatibilitě. Viz `decisions.md` „Ukládat obojí amount + amt".

**Annuitní splátka** – Konstantní měsíční splátka dluhu. Vzorec: `payment = principal × [r(1+r)^n] / [(1+r)^n - 1]`. Viz `formulas.md` sekce 3.

## B

**`baseIncome`** – Průměr stabilních příjmů za poslední 3 měsíce. Funkce `computeBaseIncome(D)` v `projects.js`. Fallback (v6.40): průměr všech příjmů pokud žádná `stable` kategorie neexistuje.

**Blend 80/20** – Vzorec pro sezónní predikci: `personalSeason[m] × 0.8 + SEASON[m].mult × 0.2`. 80 % vlastní historie + 20 % globální ČR průměr. Viz `formulas.md` sekce 4.5.

**Box plot** – Krabicový graf (Q1, medián, Q3, min, max). Aktuálně ve špatné záložce grafů — viz `todo.md` TODO-009.

## C

**Cache busting** – Technika proti browser cache: za každý `<script src>` se přidává `?v=XXXXXXXX` (prvních 8 znaků SHA256 hashe souboru). Po každé změně JS souboru nutno přepočítat.

**`calcOECD(a, c013, c14)`** – Funkce v `admin.js` pro výpočet OECD spotřebních jednotek. Viz sekce OECD.

**COICOP** – Classification of Individual Consumption by Purpose. Evropský standard klasifikace výdajů domácností. FinanceFlow používá CZ-COICOP 2024 s 13 skupinami. Viz `formulas.md` sekce 5.

**Completeness score** – Přesnost srovnání s ČR: `počet COICOP skupin s výdaji > 0 / 13 × 100`. 🟢≥80 % / 🟡≥50 % / 🔴<50 %.

**`computePersonalSeason()`** – Funkce v `helpers.js` pro výpočet personalizovaných sezónních koeficientů. Vyžaduje min. 2 roky dat. Viz `formulas.md` sekce 4.2.

**`confidence`** – Úroveň jistoty COICOP mapování: 70 (keyword), 50 (kategorie), 30 (podkategorie), 0 (fallback).

**`curPage`** – Globální proměnná uchovávající název aktuální stránky (např. `'prehled'`, `'transakce'`, `'grafy'`).

**ČNB** – Česká národní banka. Stanovuje limity pro DTI (<700 %) a DSTI (<35 %). Viz `formulas.md` sekce 2.

**ČSÚ** – Český statistický úřad. Zdroj průměrných výdajů domácností per COICOP skupina. Data z roku 2024.

## D

**`_db`** – Globální reference na Firebase Realtime Database instanci. Nastavuje se v `firebase.js` jako `window._db = db`.

**`detectTrend()`** – Funkce v `helpers.js` pro detekci trendu výdajů. Min. 4 měsíce dat, outlier removal >3× medián. Výstup: `'up'` / `'down'` / `'stable'`.

**DSTI** – Debt-Service-To-Income ratio. `měsíční_splátky / měsíční_příjem × 100`. ČNB limit: max 50 % (od 2023). Bezpečné: <35 %.

**DTI** – Debt-To-Income ratio. `celkový_dluh / roční_příjem × 100`. ČNB doporučení: max 900 %. Bezpečné: <700 %.

**DVI** – Debt vs. Investment analýza. Simulace: co kdyby peníze na splácení šly místo toho do investic.

## E

**EmailJS** – Alternativní email provider (emailjs.com). Free 200/měsíc, nevyžaduje vlastní doménu. Kandidát na náhradu Resend. Viz `explanations.md` sekce 2.

## F

**`firebase.js`** – Poslední JS modul v pořadí načítání (`type="module"`). Inicializuje Firebase SDK, `onAuthStateChanged`. **Musí být vždy poslední** — viz `decisions.md` ADR-010.

**Firebase Realtime Database** – NoSQL databáze (europe-west1). Ukládá data uživatelů pod `/users/{uid}/data/`. Viz `architecture.md` sekce 4.

**`fmt(n)`** – Utility funkce pro formátování čísla s mezerami: `1234567 → "1 234 567"`.

## G

**`getData()`** – Vrací `S` (vlastní data) nebo `partnerData[viewingUid].data` (partnerova data).

**`getHistAvg()`** – Historický průměr výdajů kategorie ze všech minulých měsíců. Viz `formulas.md` sekce 4.1.

**GoPay** – Český platební provider. Kandidát pro monetizaci (alternativa: Stripe/Paddle). Rozhodnutí otevřené — viz `todo.md` TODO-022.

## H

**`healthPct` / `healthAmt`** – Limit kategorie: % z baseIncome nebo absolutní částka. Používá se v detektoru úspor a rozpočtovém zdraví.

**`helpers.js`** – JS modul s utility funkcemi: `showPage()`, `renderPage()`, predikce, formátování, `computePersonalSeason`, `detectTrend`, `computeYearForecast`.

## I

**IndexedDB** – Klient-side databáze (bez limitu localStorage). Používá se pro offline účtenky (`offline-sync.js`). Tři tabulky: `pending_receipts`, `pending_tx`, `sync_log`.

**IQR** – Mezikvartilové rozpětí (Q3 − Q1). Používá se v box plot grafech.

## J

**Jaro-Winkler** – Algoritmus pro porovnávání řetězců (prefix weighting). Implementace v `duplicates.js`. Práh: ≥0.92 = přesný duplikát, ≥0.80 = podobný. Viz `formulas.md` sekce 10.3.

## K

**KB** – Komerční banka. CSV export: kódování `windows-1250`, header na řádku 16 (přeskočí metadata).

**Keyword engine** – COICOP mapovací engine: název transakce → klíčové slovo → COICOP skupina. Viz `formulas.md` sekce 5.

## L

**`localStorage`** – Úložiště v prohlížeči pro lokální režim (bez Google účtu) a PIN hash.

## M

**`mapToCOICOP(tx)`** – Hlavní funkce COICOP mapování. Vrací `{coicopId: number, confidence: 0|30|50|70}`.

**Memory Rules** – Pravidla uložená v Claude Code pro automatickou aktualizaci verze (4 povinné kroky). Viz `architecture.md` sekce 11.

## N

**Net Worth** – Čistý majetek: `suma(peněženky) - suma(dluhy)`. Funkce `computeNetWorth(D)` v `premium.js`.

## O

**OECD** – Organization for Economic Co-operation and Development. FinanceFlow používá OECD-modified scale pro spotřební jednotky: `1.dospělý=1.0, další=0.5, dítě 14+=0.5, dítě 0–13=0.3`.

**`OfflineSync`** – Globální objekt (`window.OfflineSync`) z `offline-sync.js`. API: `init()`, `saveReceiptOffline()`, `saveTxOffline()`, `runSync()`, `isOnline()`, `showOfflineQueue()`.

**`onUserSignedIn(user)`** – Callback v `app.js` volaný z `firebase.js` po úspěšném přihlášení. Načítá profil, partnery, renderuje stránku.

**Outlier removal** – Odstranění extrémních hodnot (>3× medián) z dat před výpočtem trendu. Ochrana proti jednorázovým výdajům (servis auta za 19 342 Kč).

## P

**`predictCat()`** – Hlavní predikční funkce: `baseAvg × seasMult × trendMult + bdayBoost`. Viz `formulas.md` sekce 4.5.

**PSD2** – Payment Services Directive 2. EU regulace pro Open Banking (automatický import transakcí). Vyžaduje licenci — viz `todo.md` TODO-026.

**PWA** – Progressive Web App. FinanceFlow má `manifest.json` a ikony, ale Service Worker pro plný offline chybí (viz `todo.md` TODO-019).

## R

**`rAF`** – `requestAnimationFrame`. Používá se pro delay před renderováním grafů (CSS `display:none → block` jinak vrací `clientWidth = 0`). Viz `explanations.md` sekce 6 (plánováno).

**Resend** – Email provider používaný pro kontaktní formulář. Free tier omezení: `from` jen `onboarding@resend.dev`, `to` jen registrovaný email. Viz `explanations.md` sekce 2.

**RPSN** – Roční procentní sazba nákladů. Newton-Raphson iterace (200×, clamp against divergence). Viz `formulas.md` sekce 3.

## S

**`S`** – Globální in-memory stav aplikace. Objekt obsahující `transactions`, `debts`, `categories`, `bank`, `wallets`, `projects`, `receipts`, atd. Viz `architecture.md` sekce 4.

**`save()`** – Hlavní ukládací funkce: `setTimeout(1200ms) → saveToFirebase()` nebo `saveLocal()`.

**`saveTx()`** – Funkce v `debts.js` pro uložení transakce. Ukládá obojí `{amount: amt, amt}` kvůli kompatibilitě.

**SEASON** – Globální objekt sezónních koeficientů (0–11 → multiplikátor). Leden 0.85, Prosinec 1.35. Viz `formulas.md` sekce 4.3.

**`showPage(name)`** – Navigační funkce v `helpers.js`. Přepíná CSS třídu `active` na stránkách a volá `renderPage()` s `rAF` delay.

**Smart month detection** – Auto-přechod na poslední měsíc s daty (max 3 měsíce zpět). Viz `formulas.md` sekce 20.

**SPA** – Single Page Application. FinanceFlow je SPA s CSS class `active` routingem místo URL hash routeru. Viz `decisions.md`.

**`splitId` / `splitParent`** – Pole pro split transakce. `splitParent: true` = hlavní, `false` = podtransakce. Anti double-counting filtr: `!t.splitId || t.splitParent`.

**`stable`** – Vlastnost kategorie (`stable: true`). Označuje stabilní příjem (výplata). Používá se pro výpočet `baseIncome`.

## T

**TWA** – Trusted Web Activity. Wrapper pro zabalení PWA do nativní Android aplikace (Google Play). Viz `todo.md` TODO-027.

## U

**UID** – User Identifier. Firebase Auth generuje unikátní UID pro každého uživatele.

## V

**`viewingUid`** – Globální proměnná. `null` = vlastní data, `uid` = prohlížení partnerových dat.

## W

**Worker** – Cloudflare Worker (`misty-limit-0523`). Proxy pro Claude API (chat, receipt, bank_statement, wish_url, price_alert, contact_form). Ověřuje Firebase token, rate limiting 60 req/hod. Viz `architecture.md` sekce 7.

---

*Vytvořeno: 2026-04-16 | Autor: Milan Migdal*
