# FinanceFlow – Architektura & Dokumentace projektu
**Verze:** 6.36 | **Datum:** Duben 2026 | **Autor:** Milan Migdal + Claude AI

---

## 1. PŘEHLED PROJEKTU

FinanceFlow je progresivní webová aplikace (PWA) pro správu rodinných financí.
Technologický stack: čisté HTML/CSS/JS (bez frameworku) + Google Firebase + Cloudflare Worker + Claude AI.

### Hosting
- **Firebase Hosting:** https://financeflow-a249c.web.app
- **GitHub repozitář:** https://github.com/bcmilda/financeflow
- **Větve:** `main` (produkce) → `dev` (vývoj)
- **Deploy příkaz:** `firebase deploy --only hosting`

---

## 2. STRUKTURA SOUBORŮ

```
financeflow/
├── index.html              # HTML struktura + odkazy na moduly
├── manifest.json           # PWA manifest
├── css/
│   └── styles.css          # Veškerý CSS styling (467 řádků)
├── js/
│   ├── app.js              # State, konstanty, Firebase wrappery, seed data (512 ř.)
│   ├── helpers.js          # Pomocné funkce, predikce, bank výpočty (121 ř.)
│   ├── ui.js               # Render router, dashboard, souhrn (441 ř.)
│   ├── transactions.js     # Transakce, bank, predikce render (200 ř.)
│   ├── charts.js           # Grafy, vizualizace, nové záložky (724 ř.)
│   ├── stats.js            # Statistiky, kategorie, rodina, sdílení (294 ř.)
│   ├── debts.js            # Půjčky, simulace, widgety (1513 ř.)
│   ├── ai.js               # AI rádce (389 ř.)
│   ├── premium.js          # Premium systém, peněženky, kontakt (880 ř.)
│   ├── projects.js         # Projekty, zdraví, report, radar, detektor (1241 ř.)
│   ├── receipts.js         # Účtenky, COICOP engine (1455 ř.)
│   ├── admin.js            # Admin panel, komunita, tagy, split (1357 ř.)
│   ├── import.js           # Import CSV/PDF, editor duplikátů (872 ř.)
│   └── firebase.js         # Firebase init, auth, DB (type="module") (53 ř.)
└── data/
    └── categories.json     # Výchozí kategorie (seed)
```

### Pořadí načítání JS (kritické!)
```html
app.js → helpers.js → ui.js → transactions.js → charts.js →
stats.js → debts.js → ai.js → premium.js → projects.js →
receipts.js → admin.js → import.js → firebase.js (type="module")
```
**Pozor:** firebase.js musí být POSLEDNÍ a jako `type="module"` – Firebase se
načítá asynchronně a ostatní soubory mají stubs funkce které čekají na Firebase.

---

## 3. FIREBASE DATABÁZE – STRUKTURA

```
Firebase Realtime Database (europe-west1):
├── users/
│   └── {uid}/
│       ├── data/           # Hlavní data uživatele (S object)
│       │   ├── transactions[]
│       │   ├── categories[]
│       │   ├── debts[]
│       │   ├── wallets[]
│       │   ├── birthdays[]
│       │   ├── wishes[]
│       │   ├── projects[]
│       │   ├── payTypes[]
│       │   ├── sablony[]
│       │   └── bank: {startBalance}
│       ├── premium/        # Premium status
│       │   ├── type: 'free'|'trial'|'premium'
│       │   ├── trialUntil: timestamp
│       │   └── premiumUntil: timestamp
│       └── profile/        # Profil uživatele
│           └── displayName, photoURL
├── sharing/                # Sdílení dat mezi partnery
│   └── {uid}/partners[]
├── community/              # Komunitní data
│   ├── subscriptions/      # Detekovaná předplatná (detektor úspor)
│   │   └── {keyword}: {count, lastSeen}
│   └── stats/              # Anonymní statistiky
├── support/                # Kontaktní formuláře
│   └── {timestamp}: {name, email, type, message, date, version}
├── leads/                  # Affiliate leads (admin)
└── affiliate/              # Affiliate statistiky
```

---

## 4. CLOUDFLARE WORKER

**URL:** https://misty-limit-0523.bc-milda.workers.dev
**Soubor:** financeflow-worker-v3.js

Worker slouží jako proxy mezi aplikací a Claude API:
- Ověřuje Firebase ID token
- Volá Claude API (claude-sonnet-4-20250514)
- `max_tokens: 8192` (maximum)

### Typy požadavků:
| type | Popis | max_tokens |
|------|-------|-----------|
| `chat` | AI Rádce konverzace | 8192 |
| `receipt` | Analýza účtenky (foto) | 8192 |
| `bank_statement` | Import PDF výpisu | 8192 |
| `wish_url` | Extrakce produktu z URL | 8192 |

### Povolené origins:
```javascript
['https://bcmilda.github.io',
 'https://misty-limit-0523.bc-milda.workers.dev',
 'https://financeflow-a249c.web.app']
```

---

## 5. MATEMATICKÉ VZORCE A ALGORITMY

### 5.1 Predikce výdajů
```
predictCat(catId, sub, měsíc, rok):
  1. Historický průměr = průměr všech minulých měsíců pro danou kategorii
  2. Sezónní koeficient (SEASON[měsíc].mult)
  3. Bonus narozenin (pokud kategorie = Dárky a v měsíci jsou narozeniny)

  Predikce = round(historický_průměr × sezónní_koeficient) + bonus_narozenin
```

**Sezónní koeficienty (SEASON):**
| Měsíc | Koef. | Důvod |
|-------|-------|-------|
| Leden (0) | 0.85 | Úsporný měsíc po Vánocích |
| Únor (1) | 1.05 | Valentýn |
| Březen (2) | 1.00 | Normál |
| Duben (3) | 1.02 | Velikonoce |
| Květen (4) | 1.15 | Dovolená, MDŽ |
| Červen (5) | 1.10 | Léto začíná |
| Červenec (6) | 1.10 | Hlavní sezóna |
| Srpen (7) | 1.08 | Léto končí |
| Září (8) | 1.05 | Škola začíná |
| Říjen (9) | 1.00 | Normál |
| Listopad (10) | 1.12 | Předzásobení |
| Prosinec (11) | 1.35 | Vánoce! |

---

### 5.2 Výpočet zůstatku (Bank)
```
computeBank():
  startBalance = počáteční zůstatek (nastavení)
  Pro každý měsíc s transakcemi (do aktuálního):
    balance += příjmy_měsíce - výdaje_měsíce
  return balance
```

---

### 5.3 Finanční zdraví (3 složky, každá 0-100)

#### A) Výdajové zdraví (expScore)
```
ratio = výdaje_měsíce / příjmy_měsíce

ratio ≤ 0.70 → score = 100  (výdaje < 70% příjmů = skvělé)
ratio ≤ 0.90 → score = 100 - (ratio-0.70)/0.20 × 30  (70→90% = score 100→70)
ratio ≤ 1.00 → score = 70 - (ratio-0.90)/0.10 × 30   (90→100% = score 70→40)
ratio > 1.00  → score = max(0, 40 - (ratio-1.00) × 40) (výdaje > příjmy = 40→0)
```

#### B) Rozpočtové zdraví (budgetScore)
```
Pro každou kategorii s limitem:
  ratio = utraceno / limit_kategorie

  ratio ≤ 0.80 → catScore = 100
  ratio ≤ 1.00 → catScore = 100 - (ratio-0.80)/0.20 × 30  (100→70)
  ratio ≤ 1.50 → catScore = 70 - (ratio-1.00)/0.50 × 50   (70→20)
  ratio > 1.50  → catScore = max(0, 20 - (ratio-1.50) × 20) (20→0)

budgetScore = průměr(catScore všech kategorií s limitem)
Výchozí (bez limitů): 75
```

#### C) Úsporové zdraví (savingScore)
```
min_spoření = základní_příjem × 10%
ratio = skutečně_ušetřeno / min_spoření
savingScore = min(100, round(ratio × 100))

Výchozí (bez spoření kategorií): 50
```

#### Celkové skóre
```
overall = round((expScore + budgetScore + savingScore) / 3)
```

**Interpretace:**
- 71-100 = Zelená (dobré)
- 41-70 = Žlutá (průměrné)
- 0-40 = Červená (špatné)

---

### 5.4 Základní příjem (computeBaseIncome)
```
Průměr příjmů ze stabilních kategorií za poslední 3 měsíce
(kategorie se stable=true, typ='income')

baseIncome = (příjem_M-1 + příjem_M-2 + příjem_M-3) / 3
```

---

### 5.5 DTI a DSTI (bankovní hodnocení)
```
DTI (Debt-to-Income) = celkový_dluh / roční_příjem × 100
  ČNB limity: < 700% ✅ | 700-900% ⚠️ | > 900% 🚨

DSTI (Debt-Service-to-Income) = měsíční_splátky / měsíční_příjem × 100
  ČNB limity: < 35% ✅ | 35-45% ⚠️ | > 45% 🚨

Splátky = součet aktuálních installments[].amt ze všech půjček
(Hledá poslední platný záznam kde inst.from <= aktuální_měsíc)
```

---

### 5.6 Detekce duplikátů při importu (calcDupScore)
```
Skóre 0-100 pro každý pár (importovaná × existující transakce):

Datum ±1 den:  +30 bodů
Datum ±3 dny:  +10 bodů
Částka ±0.01:  +30 bodů
Částka ±5 Kč:  +20 bodů
Částka ±50 Kč: +5 bodů
Stejný typ:    +10 bodů
Stejný název:  +30 bodů
Název obsahuje druhý: +20 bodů
Sdílená slova (>2 znaky): +5 bodů/slovo (max 15)

Výsledek:
≥ 75% → 🔴 Pravděpodobný duplikát (výchozí: nezaškrtnuto)
25-74% → 🟡 Možný duplikát (výchozí: zaškrtnuto)
< 25%  → 🟢 Nová transakce (výchozí: zaškrtnuto)
```

---

### 5.7 COICOP klasifikace (mapToCOICOP)
```
Evropský standard klasifikace výdajů domácností (13 skupin):

1. Potraviny a nealk. nápoje    (avg/os: 3 300 Kč/měs)
2. Alkohol a tabák              (avg/os:   310 Kč/měs)
3. Oblečení a obuv              (avg/os:   400 Kč/měs)
4. Bydlení a energie            (avg/os: 4 000 Kč/měs)
5. Vybavení domácnosti          (avg/os:   500 Kč/měs)
6. Zdraví                       (avg/os:   500 Kč/měs)
7. Doprava                      (avg/os: 1 800 Kč/měs)
8. Komunikace                   (avg/os:   350 Kč/měs)
9. Rekreace a kultura           (avg/os: 1 100 Kč/měs)
10. Vzdělávání                  (avg/os:   150 Kč/měs)
11. Restaurace a ubytování      (avg/os:   600 Kč/měs)
12. Ostatní zboží a služby      (avg/os:   400 Kč/měs)
13. Transfery a ostatní         (avg/os:   200 Kč/měs)

Algoritmus:
1. Hledej klíčové slovo v názvu transakce → přiřaď COICOP ID (confidence=70)
2. Pokud nenalezeno → mapuj dle názvu kategorie (confidence=50)
3. Pokud nenalezeno → mapuj dle podkategorie (confidence=30)
4. Výchozí: skupina 12 (Ostatní)
```

---

### 5.8 Finanční obraz – skóre zlepšení
```
Porovnává první a poslední měsíc z posledních 6 měsíců:

Výchozí skóre: 50

Příjmy rostou (>5%):    +15 | Příjmy klesají (<-5%): -15
Výdaje klesají (<-5%):  +15 | Výdaje rostou (>10%):  -15
Úspory rostou (>10%):   +15 | Úspory klesají (<-10%): -15
Dluh klesá (<-5%):      +15 | Dluh roste (>5%):      -15

Výsledek: max(0, min(100, score))
≥ 65 → Zlepšuji se 📈
40-64 → Stagnuji ↔️
< 40  → Zhoršuji se 📉
```

---

### 5.9 OECD ekvivalenční stupnice (domácnost)
```
Výpočet pro srovnání výdajů domácnosti s průměrem ČR:

calcOECD(dospělí, děti_0-13, děti_14+):
  equiv = 1.0 (první dospělý)
       + 0.5 × (ostatní_dospělí + děti_14+)
       + 0.3 × děti_0-13

Příklad: rodina 2+1 (dítě 5 let) = 1.0 + 0.5 + 0.3 = 1.8
avg_domácnost = avg_osoba × equiv
```

---

### 5.10 Premium systém
```
TRIAL_DAYS = 30

Stavy: 'free' | 'trial' | 'premium'

Nový uživatel → automaticky 30denní trial
Trial expiruje → přejde na 'free'
Premium = platba → premiumUntil = timestamp

hasPremiumAccess():
  return status === 'trial' && daysLeft > 0
      || status === 'premium' && until > now
```

---

### 5.11 Import CSV – detekce formátu banky
```
Podporované banky a jejich CSV formáty:

Fio:    oddělovač ;, header obsahuje 'datum' + 'objem'
AirBank: header obsahuje 'popis transakce'
ČSOB:   header obsahuje 'datum zaúčtování'
KB:     header obsahuje 'nazev protiuctu' nebo 'datum zauctovani'
        kódování: windows-1250 (automaticky detekováno)
        header na řádku 16 (přeskočí metadata)
RB:     header obsahuje 'datum' + 'částka'
Šablona: datum;castka;nazev;kategorie;podkategorie;poznamka

Detekce kódování:
1. Pokus o UTF-8 (fatal=true)
2. Fallback na windows-1250 (KB, ČSOB)

Hledání hlavičky:
Prochází prvních 30 řádků, hledá řádek
obsahující 'datum' A ('castka'|'částka'|'amount'|'objem')
```

---

## 6. PŘEHLED IMPLEMENTOVANÝCH FUNKCÍ

### ✅ HOTOVO A FUNKČNÍ

#### Základní funkce
- [x] Dashboard s přehledem příjmů/výdajů/saldo/bank
- [x] Správa transakcí (přidat/editovat/smazat)
- [x] Kategorie a podkategorie (vlastní + výchozí)
- [x] Filtrování a řazení transakcí
- [x] Tagy na transakcích
- [x] Split transakcí (rozdělení na více kategorií)
- [x] Převody mezi účty (Transfer typ)

#### Uživatelský systém
- [x] Google přihlášení (Firebase Auth)
- [x] Lokální režim (bez účtu, localStorage)
- [x] Sdílení dat s partnerem (read-only)
- [x] Rodinný souhrn (agregace dat)
- [x] Profil uživatele (jméno, foto)
- [x] Admin panel (správa uživatelů, keywords)

#### Finanční nástroje
- [x] Predikce výdajů (historický průměr × sezónnost)
- [x] Finanční zdraví (3 složky: výdajové/rozpočtové/úsporové)
- [x] DTI a DSTI výpočet (bankovní hodnocení)
- [x] Finanční radar (predikce problémů)
- [x] Finanční obraz (trendy za 6 měsíců)
- [x] Detektor úspor (předplatná, poplatky, pojištění)
- [x] Půjčky a splátkový kalendář
- [x] Simulace dluhu vs investování
- [x] Simulace budoucnosti (inflace, spoření)
- [x] Měsíční report s DTI/DSTI
- [x] Net Worth (čistý majetek)
- [x] Číslo zdraví/skóre na dashboardu

#### Peněženky a platby
- [x] Peněženky (účty, hotovost, spoření)
- [x] Typy plateb (karta, hotovost, převod...)
- [x] Opakované šablony (automatické transakce)
- [x] Projekty (Dovolená, Rekonstrukce...)

#### Import/Export
- [x] Import CSV (Fio, AirBank, ČSOB, KB, RB, šablona)
- [x] Import PDF bankovního výpisu (přes Claude AI)
- [x] Export CSV transakcí
- [x] Export JSON (záloha dat)
- [x] Editor importu s detekcí duplikátů (dvousloupcový)
- [x] Detekce kódování windows-1250 (KB)

#### AI funkce
- [x] AI Rádce (chat s finančním poradcem)
- [x] Analýza účtenek (foto → transakce)
- [x] Extrakce produktu z URL (Heureka, Alza)
- [x] Import PDF přes Claude (bank_statement)

#### Grafy
- [x] Příjmy/výdaje – 12 měsíců
- [x] Saldo měsíce – sloupcový graf
- [x] Půjčky – vývoj
- [x] Predikce vs skutečnost
- [x] Nové záložky: Obecné / Měsíční / Roční
- [x] Měsíční graf s kumulativní křivkou a mediánem
- [x] Roční tabulka s barevným kódováním
- [x] Box plot (krabicový graf)
- [x] Sdílený filtr kategorie/podkategorie mezi záložkami

#### COICOP
- [x] Klasifikace transakcí do 13 COICOP skupin
- [x] Srovnání s průměrem ČR (OECD ekvivalence)
- [x] Komunitní benchmark
- [x] Trend analýza

#### Ostatní
- [x] Narozeniny a přání (s připomínkami)
- [x] Statistiky (tabulky, kategorie)
- [x] Komunita (anonymní statistiky)
- [x] PWA (manifest, ikony, offline-ready)
- [x] Mobilní responzivní design
- [x] Firebase Hosting + GitHub CI/CD
- [x] Privacy Policy (CZ + EN)
- [x] Podmínky používání (CZ + EN)
- [x] Kontaktní formulář (ukládá do Firebase)
- [x] Premium systém (free/trial/premium)
- [x] Paywall s 30denním trialem
- [x] Sekce "O aplikaci" (verze, changelog)
- [x] Affiliate tracking (?ref= parametr)

---

## 7. CO ZBÝVÁ UDĚLAT (BACKLOG)

### 🔴 Vysoká priorita
- [ ] **Dělení PDF na části** – překonání limitu 8192 tokenů pro velké výpisy
- [ ] **Kontrola duplikátů v záložce Transakce** – tlačítko pro kontrolu existujících dat
- [ ] **Nové kategorie z xlsx** – Auto, Předplatné, Sebevzdělání, Domácí mazlíček, Trading, Pošta, Cigarety + podkategorie
- [ ] **Nákupní seznam** – s komunitním našeptávačem z účtenek
- [ ] **Hlídání cen** – notifikace při poklesu ceny produktu

### 🟡 Střední priorita
- [ ] **AI pamatuje mapování kategorií** – při importu si AI zapamatuje uživatelovu volbu pro příště
- [ ] **Web Push notifikace** – vyžaduje Service Worker, povolení v Nastavení
- [ ] **Notifikace plateb** – hlídání opakovaných plateb
- [ ] **Vylepšení mobilního zobrazení** – editor importu na mobilu
- [ ] **Export do XLSX** – nyní jen CSV
- [ ] **Vlastní doména** – místo financeflow-a249c.web.app

### 🟢 Nízká priorita / Budoucnost
- [ ] **Napojení na banky** – Open Banking API (PSD2) – vyžaduje licenci a certifikáty
- [ ] **Google Pay notifikace** – automatický import plateb z Google Pay
- [ ] **Google Play** – zabalení jako TWA/PWA pro Android
- [ ] **Rozdělení app.js do menších modulů** – js/ui.js, js/charts.js jsou stále velké
- [ ] **Bundling/minifikace** – Vite nebo esbuild pro rychlejší načítání
- [ ] **Podpora více měn** – při importu a v peněženkách
- [ ] **Ohodnocení na Google Play** – odkaz až po publikaci
- [ ] **Více jazyků** – nyní jen čeština

---

## 8. ZNÁMÉ PROBLÉMY A TECHNICKÝ DLUH

| Problém | Závažnost | Popis |
|---------|-----------|-------|
| Pomalé načítání | Střední | 13 JS souborů se načítá sekvenčně, bez bundleru |
| Prázdný `<script>` tag | Vyřešen | Původní HTML obsahoval `<script>` bez obsahu před script tagy |
| `</script>` v JS | Vyřešen | Při extrakci modulů se dostal HTML tag do JS souboru |
| `_db = db` | Vyřešen | Chybějící `window.` prefix způsoboval ReferenceError |
| Velký `debts.js` | Nízká | 1513 řádků – může být rozděleno |
| CSV kódování KB | Vyřešen | windows-1250 autodetekce |
| Seed data Netflix | Vyřešen | Nahrazeno YouTube Premium |
| DTI splátky | Vyřešen | Nyní čte z installments[].amt |

---

## 9. DEPLOYMENT WORKFLOW

```
1. Lokální vývoj:
   - Editace souborů v C:\Users\Milan\Desktop\FinanceFlow\financeflow\financeflow
   - GitHub Desktop: Current branch = dev

2. Nasazení na DEV:
   cd C:\Users\Milan\Desktop\FinanceFlow\financeflow\financeflow
   firebase deploy --only hosting
   → Dostupné na https://financeflow-a249c.web.app

3. Commit a push:
   - GitHub Desktop → Summary: "V X.XX - popis změn"
   - Commit to dev → Push origin

4. Merge do MAIN (produkce):
   - GitHub Desktop → Preview Pull Request
   - GitHub web → Create PR → Merge → Confirm
   → Automaticky se nasadí (GitHub Actions workflow)

5. Aktualizace Cloudflare Worker:
   - dash.cloudflare.com → Workers → misty-limit-0523
   - Edit Code → Ctrl+A → vložit nový kód → Deploy
```

---

## 10. VERZE A CHANGELOG

| Verze | Datum | Změny |
|-------|-------|-------|
| v6.36 | 04/2026 | Oprava přihlášení, DTI/DSTI, detektor úspor, nové grafy (Měsíční+Roční) |
| v6.35 | 04/2026 | Privacy Policy, Podmínky, Kontaktní formulář, Hodnocení aplikace |
| v6.34 | 04/2026 | Modulární JS struktura (13 souborů), vylepšený editor importu |
| v6.33 | 04/2026 | Dvousloupcový editor importu |
| v6.32 | 04/2026 | Oprava Import Editor bug |
| v6.31 | 04/2026 | Modální editor importu s detekcí duplikátů |
| v6.3  | 04/2026 | Import CSV/PDF, oprava KB formátu, Firebase Hosting |
| v6.27 | 03/2026 | Import dat, Worker v2, AI vylepšení |
| v4.2  | 2025 | Peněženky, Typy plateb, Šablony, Export CSV |
| v4.1  | 2025 | Premium systém, 30denní trial, Paywall |
| v4.0  | 2025 | Firebase, Google přihlášení, Sdílení, Rodinný souhrn |
| v3.5  | 2025 | AI Rádce, Predikce, Grafy, Půjčky simulace |

---

## 11. KLÍČOVÉ KONSTANTY

```javascript
// app.js
TRIAL_DAYS = 30                    // Délka trial periody
LOCAL_STORAGE_KEY = 'ff_v43_local' // Klíč pro lokální režim
WORKER_URL = 'https://misty-limit-0523.bc-milda.workers.dev'

// import.js
IMPORT_PAGE_SIZE = 50   // Transakcí na stránku v editoru
IMPORT_MAX = 500        // Max transakcí v jednom importu

// Sezónní koeficienty pro predikci (měsíc: koeficient)
SEASON = {0:0.85, 1:1.05, 2:1.00, 3:1.02, 4:1.15,
          5:1.10, 6:1.10, 7:1.08, 8:1.05, 9:1.00,
          10:1.12, 11:1.35}

// Hodnocení zdraví
healthColor: ≥71 → zelená | ≥41 → žlutá | <41 → červená
```

---

*Dokument generován z konverzace Claude AI + Milan Migdal, duben 2026.*
*Aktualizuj tento soubor při každé větší změně architektury.*
