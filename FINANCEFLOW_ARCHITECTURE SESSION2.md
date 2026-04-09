# FinanceFlow – Architecture & Knowledge Base
## Vývojová session sumarizace | v6.41 | Duben 2026

---

## 1. TECH STACK

| Vrstva | Technologie | Detail |
|--------|-------------|--------|
| Frontend | Vanilla JS modulární | 19 JS souborů, žádný framework |
| Hosting | Firebase Hosting | financeflow-a249c.web.app (EU) |
| Databáze | Firebase Realtime DB | europe-west1, pravidla per UID |
| Auth | Firebase Auth | Google Sign-In |
| AI / Claude | Cloudflare Worker v4 | misty-limit-0523.bc-milda.workers.dev |
| Email | Resend.com API | re_UZf6C8UZ... (free tier – viz poznámky) |
| CI/CD | GitHub větev dev | 146+ commitů, firebase deploy |
| Testy | Playwright | nainstalován, testy nenapsány |

---

## 2. SCRIPT POŘADÍ (19 souborů v index.html)

```
app.js → helpers.js → charts.js → stats.js → transactions.js → projects.js
→ premium.js → ui.js → debts.js → ai.js → receipts.js → duplicates.js
→ settings.js → share.js → sms-import.js → kalendar.js → nakup.js
→ admin.js → import.js → firebase.js
```

**KRITICKÉ:** Pořadí nesmí být změněno. Závislosti:
- `helpers.js` musí být před všemi ostatními (definuje getTx, fmt, incSum...)
- `premium.js` musí být před `settings.js` (definuje applySettings, _settings)
- `projects.js` musí být před `premium.js` (computeBaseIncome)
- `firebase.js` musí být poslední (inicializuje Firebase a volá onUserSignedIn)

---

## 3. KLÍČOVÉ IDENTIFIKÁTORY

```
Firebase projekt:     financeflow-a249c
Firebase DB:          financeflow-a249c-default-rtdb (europe-west1)
Admin UID:            LNEC8VNB2QPwIv6WWQ9lqgR4O5v1
Cloudflare Worker:    https://misty-limit-0523.bc-milda.workers.dev
Resend API klíč:      re_UZf6C8UZ_CKPTuUfUo61dgFBZ5Cxuka9E
GitHub větev:         dev
Admin email:          bc.milda@gmail.com
Verze aplikace:       v6.41
Claude model:         claude-sonnet-4-20250514
```

---

## 4. FIREBASE DATABÁZOVÁ STRUKTURA

```
/users/{uid}/
  data/                    ← hlavní data uživatele (transactions, debts, categories...)
  settings/                ← nastavení (lang, currency, dateFmt, household...)
  referral/                ← referral kód, kliknutí, konverze, body
  partners/                ← sdílení s partnerem
/referrals/{code}/         ← globální index referral kódů
/support/{key}/            ← kontaktní formulář zprávy
/support_anon/{key}/       ← anonymní zprávy
/community/subscriptions/  ← komunitní učení předplatných
/catalog/                  ← globální katalog produktů (nákupní seznam)
  items/                   ← produkty s cenami
  prices/                  ← historie cen
/affiliate/{timestamp}/    ← affiliate kliknutí
```

---

## 5. CO BYLO IMPLEMENTOVÁNO V TÉTO SESSION

### 5.1 NOVÉ MODULY

**settings.js (v6.39)** – 648 řádků
- PIN kód (localStorage, 5 pokusů → odhlášení)
- Dark/Light/Auto téma (CSS proměnné, matchMedia listener)
- Vymazat data: 3-krokové potvrzení (musí napsat "SMAZAT") → Firebase delete + localStorage clear + odhlášení
- FAQ accordion (8 otázek)
- Export JSON zálohy
- Wallet-style sekce: Profil, Obecné, Vzhled, Lokalizace, Domácnost, Zabezpečení, Data, Nápověda

**share.js (v6.38)** – 462 řádků
- Referral systém: unikátní kód (8 znaků: 4 z UID + 4 náhodné)
- Firebase `/referrals/{code}` sledování kliknutí a konverzí
- Sdílení: WhatsApp, SMS, Email, QR kód (qrcodejs CDN), kopírovat, native Share API
- Bodový systém: +50 za registraci, +100 za aktivní měsíc, +300 za Premium upgrade
- Předvyplněné zprávy per platforma

**sms-import.js (v6.38)** – 606 řádků
- Parser bankovních notifikací (textové pole pro debug/testování)
- Podporované banky: Revolut, George (Erste), Moneta, KB, ČSOB, Air Bank, mBank, Google Pay, Apple Pay, PayPal
- Auto-kategorizace merchantů (Shell→Doprava, Albert→Jídlo, Netflix→Zábava)
- Konverze měn (EUR×25, USD×23, GBP×29)
- POZNÁMKA: Produkční řešení = Android NotificationListenerService (viz Backlog)

**duplicates.js (v6.37)** – 370 řádků
- Jaro-Winkler similarity algoritmus pro porovnání názvů
- 3 typy detekce: přesný duplikát, opožděné zaúčtování (±5 dní), podobný název (≥72%)
- Badge + inline akce: Sloučit / Smazat / Není duplikát
- Filtr "⚠️ Podezřelé" v transakčním listu
- Fix: per-transaction dedup (každá tx max 1×), sort keywords longest-first

**nakup.js (v6.37)** – 592 řádků
- Nákupní seznam s autocomplete z Firebase /catalog/items
- Hlídač cen: slider 0-50% pokles ceny → email alert přes Worker
- Historie cen s line grafem
- Publikování cen do komunity při skenování účtenek

**kalendar.js (v6.41)** – 180 řádků
- Čtvercový kalendář Po–Ne
- Každý den: saldo (+/- Kč), intenzita barev dle výše částky
- Klik na den → modal s detailem transakcí
- Header: souhrn měsíce (příjmy/výdaje/saldo)
- Hover efekt scale(1.03)

### 5.2 VYLEPŠENÍ EXISTUJÍCÍCH MODULŮ

**Predikční systém v2 (helpers.js)**
→ viz sekce 7. VÝPOČTY A LOGIKA pro detaily

**Predikce tabulka (transactions.js)**
- Přejmenování: "Prosinec" → "Předpoklad YTD"
- Nový sloupec: "Odhad roku" (suma predikcí Led-Pro bez actual)
- Minulé měsíce: modrá predikce (opacity 55%) + odchylka od skutečnosti
- Nadpis: "Predikce – 2026" (bez měsíce)

**Grafy – Všechny roky (charts.js)**
- Nová záložka "Všechny roky"
- Heatmap tabulka: červená=nad průměrem, zelená=pod průměrem
- Box plot (krabicový graf): Q1/Q3/medián/průměr/min/max per rok
- Roční line graf s area fill

**DTI/DSTI výpočet (projects.js)**
- Fallback: pokud není kategorie označená jako "stabilní", použije průměr příjmů z posledních 3 měsíců
- Zobrazení null stavu (žádný příjem = "--" místo 0%)

**Detektor úspor (projects.js)**
- Hledá v posledních 3 měsících (ne jen aktuálním)
- Per-transaction dedup (usedTxIds Set)
- Sort keywords longest-first (google one před google)

**Dashboard (ui.js)**
- "Saldo" přejmenováno na "Zůstatek"
- emptyMonthBanner: pokud je aktuální měsíc prázdný a předchozí má data → banner s odkazem zpět

**Kontaktní formulář (premium.js)**
- Firebase uložení do /support/
- Resend API v Cloudflare Worker
- Auto-close modal po 2.5s
- Typ "💡 Návrh funkce" přidán

**Smart month detection (app.js)**
- Po načtení dat: pokud curMonth prázdný a předchozí má data → auto-přechod (max 3 měsíce zpět)

### 5.3 BEZPEČNOST & INFRASTRUKTURA

**Firebase Security Rules (v6.40)**
```json
{
  "users": {
    "$uid": {
      ".read": "auth.uid === $uid",
      ".write": "auth.uid === $uid",
      "data": {
        ".read": "auth.uid === $uid || root.child('partners/' + auth.uid + '/' + $uid).exists()"
      }
    }
  },
  "support": {
    ".read": "auth.uid === 'LNEC8VNB2QPwIv6WWQ9lqgR4O5v1'",
    ".write": "auth != null"
  }
}
```

**Cloudflare Worker v4 – typy requestů**
- `chat` → AI Rádce (Claude Sonnet)
- `receipt` → Analýza účtenek (Claude Vision)
- `wish_url` → Fetchuje URL pro hlídač přání
- `price_alert` → Email alert pro hlídač cen
- `contact_form` → Email přes Resend API

**Cache busting**
- Každý JS soubor má `?v=sha256hash` v index.html
- Po každé změně JS souboru MUSÍ být aktualizován hash v index.html
- Formát: `src="js/charts.js?v=54223b0d"`

---

## 6. OPRAVENÉ BUGY (chronologicky)

| # | Bug | Příčina | Oprava | Soubor |
|---|-----|---------|--------|--------|
| 1 | Orphaned await :777 | Duplikovaný fragment sendContactForm | Odstraněn fragment | premium.js |
| 2 | Script MIME type error | Nové soubory nebyly nahrány do /js/ | Cache busting + nahrání | index.html |
| 3 | renderFinancialScore undefined | Špatné pořadí scriptů | Opraveno pořadí | index.html |
| 4 | **GRAFY PRÁZDNÉ (root cause)** | `.page{display:none}` → `clientWidth=0` před CSS reflow; showPage() volá renderGrafy() synchronně PŘED tím, než browser aplikuje display:block | showPage() pro grafy: `requestAnimationFrame(()=>setTimeout(fn,50))`; `getBoundingClientRect()` místo `clientWidth` | helpers.js, charts.js |
| 5 | DTI/DSTI = 0% | computeBaseIncome vrací 0 bez stable=true kategorie | Fallback na průměr příjmů 3M | projects.js |
| 6 | Detektor: duplikáty (google+google one) | Keywords neseřazeny, per-tx dedup chybí | Sort longest-first, usedTxIds Set | projects.js |
| 7 | Nastavení: "Načítám..." | settings.js se načítá před premium.js → _settings undefined | Fallback z localStorage | settings.js, ui.js |
| 8 | Predikce Trend +852% | Outlier (servis auta 19342 Kč), < 4 měsíce dat | Min 4 měsíce, outlier removal (>3× medián) | helpers.js |
| 9 | Worker SyntaxError line 249 | contact_form vložen za return, rozbil try/catch | Vložen správně do else-if chainu | worker.js |
| 10 | Dashboard prázdný (duben) | curMonth=3 (Duben), data v Březnu | Smart month auto-přechod | app.js |
| 11 | t.amt vs t.amount | incSum/expSum používaly jen t.amt | `t.amount\|\|t.amt\|\|0` všude | helpers.js |
| 12 | Premium.js balance -1 | Historický fragment staré sendContactForm | Odstraněn ze dvou míst | premium.js |
| 13 | **too much recursion** | `_origApplySettings = applySettings` pak `applySettings()` přepsána → ukazuje na sebe | Odstraněna rekurzivní override z settings.js | settings.js |
| 14 | computePersonalSeason not defined | Funkce přidána do helpers.js ale verze v outputs nebyla správná | Přidáno znovu + odstraněno z predikční buňky (volá se uvnitř predictCat) | helpers.js, transactions.js |

---

## 7. VÝPOČTY A LOGIKA

### 7.1 PREDIKČNÍ SYSTÉM v2

#### getHistAvg(catId, sub, forM, forY, D)
```
Průměrná měsíční útrata pro kategorii:
1. Vezmi všechny transakce kategorie PŘED daným měsícem/rokem
2. Seskup po měsících: { "2024-3": 1200, "2024-4": 980, ... }
3. Průměr = suma / počet_měsíců
Vrátí: null pokud žádná data
```

#### computePersonalSeason(catId, sub, D)
```
Personalizované sezónní koeficienty z vlastní historie:
Podmínka: min. 2 roky dat
1. Seskup transakce po rok-měsíc párech
2. Pro každý měsíc (0-11): průměr přes všechny roky
3. Koeficient = měsíční_průměr / celkový_průměr
4. Kde chybí data: fallback na globální SEASON[m].mult

Vrátí: pole 12 koeficientů nebo null (< 2 roky dat)
Příklad: [0.85, 1.05, 1.0, 1.02, 0.28, ...] pro Dopravu s opravou auta v Březnu
```

#### detectTrend(catId, sub, D)
```
Detekce trendu výdajů:
Podmínka: min. 4 měsíce s daty (po outlier removal)
1. Vezmi posledních 12 měsíců s nenulovou hodnotou
2. Outlier removal: odstraň hodnoty > 3 × medián
3. Rozděl na starší polovinu a novější polovinu
4. pct = (avg_novejsi - avg_starsi) / avg_starsi × 100
5. Trend: 'up' pokud pct > 15%, 'down' pokud pct < -15%, jinak 'stable'

Vrátí: { trend, pct, avgOlder, avgNewer }
Proč 15%? Menší změny jsou šum, ne skutečný trend.
Proč outlier removal? Servis auta za 19342 Kč by falsely signalizoval +852% trend.
```

#### predictCat(catId, sub, m, y, data) – hlavní funkce
```
Výsledná predikce = baseAvg × seasMult × trendMult + bdayBoost

baseAvg:    getHistAvg() nebo aktuální měsíc jako základ

seasMult:   personalSeason dostupná?
              ANO: personalSeason[m] × 0.8 + SEASON[m] × 0.2  (blend)
              NE:  SEASON[m].mult  (globální konstanta)

trendMult:  trend 'up':   1 + min(pct/100 × 0.5, 0.15)  → max +15%
            trend 'down': 1 + max(pct/100 × 0.5, -0.15) → max -15%
            trend stable: 1.0

bdayBoost:  Kategorie obsahuje "dárek" → přidej hodnoty dárků z narozenin v daném měsíci

Globální SEASON (pevné koeficienty, stejné pro všechny):
  Led: 0.85  Úno: 1.05  Bře: 1.00  Dub: 1.02  Kvě: 1.15  Čvn: 1.10
  Čvc: 1.10  Srp: 1.08  Zář: 1.05  Říj: 1.00  Lis: 1.12  Pro: 1.35
```

#### computeYearForecast(catId, sub, year, D) – "Předpoklad YTD"
```
Roční odhad = suma za všechny měsíce:
  Minulé měsíce (< curMonth):    getActual() (reálná data)
  Aktuální měsíc (= curMonth):   getActual() (reálná data)
  Budoucí měsíce (> curMonth):   predictCat() (predikce)

Sloupec "Odhad roku" = suma predictCat() pro všech 12 měsíců (bez actual)
→ Čistě prediktivní, nezávislý na aktuálních datech
```

### 7.2 FINANČNÍ SKÓRE (0-100 bodů)

```javascript
scores = {
  incVsExp:  Math.min(25, Math.max(0, Math.round(25 - (expRatio-50)*0.5))),
  // 25 bodů pokud výdaje < 50% příjmů, 0 bodů pokud výdaje = 100%+ příjmů

  debt:      Math.min(25, Math.max(0, debts.length === 0 ? 25 : Math.round(25 - (debtScore/100)*25))),
  // 25 bodů bez dluhů, sníží se dle výše dluhů

  savings:   Math.min(25, Math.max(0, Math.round(bankBalance / (avgExpense*3) * 25))),
  // 25 bodů pokud rezerva >= 3× průměrný měsíční výdaj

  trend:     trend==='improving' ? 25 : trend==='stable' ? 15 : 5
  // 25 bodů pokud se výdaje zlepšují, 15 stabilní, 5 zhoršují
}
overall = incVsExp + debt + savings + trend  // 0-100
```

Hodnocení:
- 80-100: Výborné (zelená)
- 60-79:  Dobré (žlutá)
- 40-59:  Průměrné (oranžová)
- 0-39:   Pozor (červená)

### 7.3 DTI a DSTI (ČNB limity)

```
DTI  = celkový_dluh / roční_příjem × 100
       ČNB limit: max 900% (varování nad 700%)

DSTI = měsíční_splátky / měsíční_příjem × 100
       ČNB limit: max 50% (varování nad 35%)

Příjem = computeBaseIncome() → průměr kategorií označených stable=true
Fallback (v6.40): pokud stable=true kategorie neexistují →
  průměr skutečných příjmů z posledních 3 měsíců
```

### 7.4 DETEKCE DUPLIKÁTŮ (Jaro-Winkler)

```
Jaro similarity:
  s1, s2 = dva názvy transakcí (lowercase, bez diakritiky)
  m = počet shodných znaků v okně max(|s1|,|s2|)/2 - 1
  t = počet transpozic / 2
  jaro = (m/|s1| + m/|s2| + (m-t)/m) / 3

Jaro-Winkler:
  prefix = délka společného prefixu (max 4 znaky)
  jw = jaro + prefix × 0.1 × (1 - jaro)

Prahy:
  jw >= 0.92: "přesný duplikát"
  jw >= 0.80: "podobný název"
  Časové okno: ±5 dní pro "opožděné zaúčtování"

Skóre snížení:
  Různá podkategorie: ×0.85
  Různý typ (příjem vs výdaj): ×0.0 (automaticky vyloučeno)
```

### 7.5 REFERRAL BODY

```
Za registraci přes tvůj odkaz:      +50 bodů
Za aktivní měsíc (přihlašuje se):   +100 bodů
Za upgrade na Premium:              +300 bodů

Kód = UID.slice(0,4).toUpperCase() + 4 náhodné znaky z "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
Kolize: pokud kód existuje, přegeneruj poslední znak
```

### 7.6 BANK BALANCE (Úspory)

```
bankBalance = startBalance + suma_příjmů_na_bankovních_účtech - suma_výdajů_z_bank_účtů
Kde "bankovní transakce" = transakce přiřazené k peněžence typu 'bank'
startBalance = S.bank.startBalance (nastavitelné)
```

---

## 8. BACKLOG – CO ZBÝVÁ UDĚLAT

### 🔴 KRITICKÉ (blokuje základní funkce)

**Email notifikace**
- Problém: Resend free tier neumožňuje posílat na libovolné adresy bez verified domény
- Řešení A: EmailJS (emailjs.com) – free 200 emailů/měsíc, nevyžaduje doménu
  - Potřeba: Service ID, Template ID, Public Key → přidám do premium.js
- Řešení B: Ověřit doménu na resend.com (potřeba vlastní doména)
- Stav: Firebase uložení funguje, email se neposílá

**Grafy obecné/měsíční**
- Root cause opraven (viz bug #4) ale vyžaduje nahrání nových helpers.js + charts.js
- Po nahrání: Ctrl+Shift+R a grafy by měly fungovat

**PIN při přihlášení**
- Logika funguje (app.js check po loadSettings)
- Chybí: full-screen PIN pad s číselníkem (jako Wallet appka)
- Přepsat modalPinVerify na plnohodnotný PIN overlay

### 🟡 DŮLEŽITÉ (výrazně zlepší appku)

**Webová landing page**
- Nemáme žádnou vstupní stránku pro nové uživatele
- Nutné pro referral systém (lidé kliknou na odkaz a nevědí co očekávat)
- Obsah: features, screenshots, FAQ, tlačítko "Vyzkoušet zdarma"
- Umístění: /landing nebo samostatná doména

**Playwright testy**
- Nainstalováno (JavaScript verze), konfigurace hotová
- Testy nenapsány – kritické flows:
  - Přihlášení Google účtem
  - Přidání transakce
  - Zobrazení dashboardu s daty
  - Grafy se renderují

**Box plot přesun**
- Roční záložka: box plot tam nedává smysl s jedním rokem dat
- Přesunout do záložky "Všechny roky" (kde je srovnání více roků)
- Měsíční záložka: přidat 12 box plotů (jeden per měsíc přes roky)

**EmailJS integrace**
- emailjs.com → přihlásit se
- Vytvořit Email Service (Gmail)
- Vytvořit Email Template s proměnnými: from_name, from_email, msg_type, message
- Zkopírovat Service ID, Template ID, Public Key → předat Claudovi → přidám do premium.js

**Import z bank – AUTOMATICKÝ**
- Aktuální textové pole je jen pro debug/testování
- Produkční řešení = Android NotificationListenerService
- WebAPP to nemůže dělat nativně (bezpečnostní omezení browseru)
- Viz sekce 9.

### 🟢 NICE-TO-HAVE (příští sprinty)

| Funkce | Popis | Odhad |
|--------|-------|-------|
| Android NotificationListener | React Native nebo Kotlin wrapper | 2-3 týdny MVP |
| Platební systém | Stripe/Paddle Premium subscription | 1 týden |
| PWA push notifikace | Service Worker, offline režim | 3-5 dní |
| Mobilní appka | React Native nebo nativní | 4-8 týdnů |
| Email týdenní report | Automatický přehled příjmů/výdajů | 2-3 dny |
| Automatická pravidla | Auto-kategorizace dle pravidel | 3-5 dní |
| Export CSV/PDF | Měsíční/roční přehled ke stažení | 2-3 dny |
| Správa měn | Více měn, směnné kurzy | 2-3 dny |
| Komunita | Anonymní průměry výdajů per kategorie | 1 týden |

---

## 9. ANDROID NOTIFICATION LISTENER – ARCHITEKTURA

```
Uživatel povolí push/SMS notifikace v bankovní aplikaci
         ↓
Android NotificationListenerService (nativní Android API)
  - Vyžaduje: android.permission.BIND_NOTIFICATION_LISTENER_SERVICE
  - Uživatel musí manuálně povolit v Nastavení → Přístup k notifikacím
         ↓
Listener zachytí notifikaci od podporované appky
  (Revolut, George, KB, ČSOB, Google Pay, atd.)
         ↓
Text notifikace předán parseru (sms-import.js logika v nativním kódu)
  - Regex parsery per banka
  - Extrakce: částka, měna, obchodník, typ, datum
         ↓
Firebase REST API nebo Firebase SDK (nativní)
  - POST na /users/{uid}/data/transactions
         ↓
Webová appka zobrazí novou transakci (real-time přes onValue)

TECHNOLOGIE:
  Option A: React Native
    + Sdílený JS kód s webovou appkou
    + Stejné parsery z sms-import.js
    - Potřeba native module pro NotificationListenerService
    Balíčky: @react-native-firebase/app, react-native-notification-listener

  Option B: Kotlin nativní
    + Přímý přístup k Android API
    + Lepší výkon
    - Samostatný kódový základ
    - Složitější maintenance

DOPORUČENÍ: React Native (sdílení kódu, rychlejší vývoj)
```

---

## 10. NASAZENÍ WORKFLOW

```bash
# 1. GitHub – nahrát soubory do /js/ složky
#    index.html → root
#    js/*.js → js/

# 2. Firebase Hosting
firebase deploy --only hosting

# 3. Prohlížeč
Ctrl+Shift+R  # hard refresh (force reload cache)

# 4. Cloudflare Worker (pro změny worker.js)
# Dashboard → Workers → financeflow-worker → Edit → Paste → Deploy

# 5. Firebase Rules (pro změny bezpečnostních pravidel)
# Console → Realtime Database → Rules → Paste → Publish
```

**DŮLEŽITÉ o cache busting:**
Po každé změně JS souboru MUSÍ být aktualizován hash v index.html:
```html
<!-- Špatně (stará verze): -->
<script src="js/charts.js?v=ee209722"></script>

<!-- Správně (nová verze): -->
<script src="js/charts.js?v=54223b0d"></script>
```
Hash = SHA256 souboru, prvních 8 hexadecimálních znaků.

---

## 11. KLÍČOVÉ TECHNICKÉ POZNÁMKY PRO NOVÝ CHAT

### Historické bugy které se opakují:

1. **premium.js má historicky balance -1** (starý fragment sendContactForm)
   - Vždy začínej od `uploads/premium.js` jako základu, ne od `outputs/`
   - Po každé úpravě zkontroluj zda žádný fragment nezůstal

2. **settings.js NESMÍ přepisovat applySettings()**
   - `_origApplySettings = applySettings` pak nová `applySettings()` → rekurze
   - renderSettingsPage() se volá přímo z renderPage() v ui.js

3. **computePersonalSeason/detectTrend/computeYearForecast**
   - Definovány v helpers.js (konec souboru)
   - Volány z helpers.js/predictCat() – NIKOLI přímo z transactions.js buněk
   - Pokud se ztratí (špatný upload) → Predikce se rozpadnou

4. **Grafy root cause:**
   - `.page { display:none }` v CSS
   - `showPage()` volá `renderPage()` SYNCHRONNĚ
   - Browser aplikuje display:block ASYNCHRONNĚ
   - Fix: `requestAnimationFrame(() => setTimeout(() => renderPage(), 50))`

5. **t.amt vs t.amount:**
   - Nové transakce ukládají OBOJÍ: `{ amount: amt, amt, ... }`
   - Vždy používej `t.amount || t.amt || 0` pro čtení

6. **Index.html konvence:**
   - Přejmenovávej jako `index_v6.XX.html`
   - Aktuální produkční: `index_v6.41.html`

### Resend email omezení:
- Free tier: `from` = pouze `onboarding@resend.dev`
- `to` = pouze email registrovaný na resend.com účtu
- Bez verified domény nelze posílat na libovolné adresy
- Doporučení: přejít na EmailJS (nevyžaduje doménu)

