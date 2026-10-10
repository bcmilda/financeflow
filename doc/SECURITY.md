# FinanceFlow – Security

> Bezpečnostní pravidla, incidenty a postupy pro projekt FinanceFlow.
> Tento dokument slouží jako **centrální místo** pro vše security-related.
> Pokud si nejsi jistý, zda něco je bezpečné — podívej se sem dřív, než to uděláš.
> Poslední aktualizace: 2026-04-16.
> **Doplnění Session 25** (2026-10-09): na konci souboru nová sekce „Session 25 (2026-10-05 až 2026-10-10) · v11.30 → v11.61“ včetně dodatku v11.28–v11.30. Přehled v `doc/Summary_s25.md`.

---

## 📋 Rychlý checklist — „před každým deployem"

- [ ] **Žádný API klíč v kódu?** Prohledej: `grep -r "re_\|sk-ant\|AIzaSy" js/`
- [ ] **`.gitignore` obsahuje `.env`?**
- [ ] **Firebase Rules** — neobsahují `".write": true` nebo `".read": true` bez `auth`?
- [ ] **Worker CORS** — povolené jen produkční domény?
- [ ] **`node --check`** na všech změněných JS souborech?
- [ ] **Cache busting** — aktualizované `?v=hash` v `index.html`?

---

## 1. Pravidla pro správu API klíčů

### ❌ NIKDY

- Hardcodovat klíč přímo do JS / Worker kódu
- Commitovat klíč do GitHubu (ani do private repa — git historie pamatuje)
- Ukládat klíč do `.md` dokumentace
- Posílat klíč v chatu, emailu, screenshotu
- Sdílet klíč mezi prostředími (produkce vs. dev)

### ✅ VŽDY

- Ukládat do **Cloudflare Worker Secrets** (Dashboard → Worker → Settings → Variables → Type: Secret)
- V kódu Workeru číst přes `env.NAZEV_KLICE` (nikdy ne literál)
- Lokálně držet v `.env` souboru, který je v `.gitignore`
- Mít `.env.example` v repu jako šablonu (bez skutečných hodnot)
- **Při jakémkoli podezření na únik → okamžitá rotace** (viz sekce 3)

### Aktuální klíče a kde jsou uloženy

| Klíč | Správné místo | Stav |
|---|---|---|
| `ANTHROPIC_API_KEY` | Cloudflare Worker Secrets (`env.ANTHROPIC_API_KEY`) | ✅ Správně |
| `RESEND_API_KEY` | Cloudflare Worker Secrets (`env.RESEND_API_KEY`) | 🔴 **Nutno přesunout** — aktuálně hardcoded v kódu |
| Firebase Web API Key | V JS klientu (veřejné by design) | ✅ OK — bezpečnost zajišťují Firebase Rules |
| Admin UID | V kódu + Firebase Rules | ✅ OK — znalost UID bez auth tokenu nic neznamená |

### Příklad správného Worker kódu
```javascript
// ✅ Správně:
'Authorization': `Bearer ${env.RESEND_API_KEY}`,

// ❌ Špatně:
'Authorization': 'Bearer re_9jY2risE_PHnkUvHmqPfgSH9vQp1j9zLC',
```

### Doporučená struktura `.gitignore`
```
.env
.env.local
.env.*.local
*.key
secrets/
```

### Doporučený `.env.example` (v repu, bez skutečných hodnot)
```
# Cloudflare Worker secrets (nastavit v dashboardu, ne tady)
ANTHROPIC_API_KEY=sk-ant-xxx
RESEND_API_KEY=re_xxx

# Firebase (veřejné, ale pro přehlednost)
FIREBASE_API_KEY=AIzaSyXxx
FIREBASE_PROJECT_ID=financeflow-xxx
```

---

## 2. Firebase Security Rules — aktuální stav

### Co je dobře ✅

| Uzel | Pravidlo | Poznámka |
|---|---|---|
| `users/$uid/*` | `auth.uid === $uid` | Vzorová izolace per-uživatel |
| `users/$uid/data` | Partner sharing přes `partners` lookup | Elegantní řešení |
| `coicop_corrections` | Admin read/write + jednorázový user write | Správně |
| `admins` | Read-only, write blokován | Správně |
| `keyword_overrides` | Jen admin zapisuje | Správně |

### Co potřebuje opravu 🔴

| Uzel | Problém | Priorita | Odkaz |
|---|---|---|---|
| `leads` | `.read + .write: auth != null` → kdokoli přihlášený čte cizí emaily (GDPR!) | 🔴 Vysoká | `architecture.md` sekce 8.5 |
| `affiliate` | Volné read/write | 🔴 Vysoká | `architecture.md` sekce 8.5 |
| `community` | Volné write – riziko spamu / DoS | 🟡 Střední | `architecture.md` sekce 8.5 |
| `catalog` | Kdokoli může mazat / přepisovat bez `createdBy` | 🟡 Střední | `architecture.md` sekce 8.5 |
| `support` | Validace neověřuje formát / délku polí | 🟢 Nízká | `architecture.md` sekce 8.5 |
| Root | Chybí explicitní default deny | 🟢 Nízká | `architecture.md` sekce 8.5 |

### Doporučený postup oprav
Viz `architecture.md` sekce 8.7 — fázový přístup: A (safe, nic nerozbije) → B (po úpravě kódu) → C (po vybudování Worker endpointu).

---

## 3. Postup při úniku API klíče (Incident Response)

### Krok za krokem (v tomhle pořadí!)

```
1. OKAMŽITĚ INVALIDOVAT starý klíč
   → Resend:    resend.com/api-keys → Delete
   → Anthropic: console.anthropic.com → API Keys → Revoke
   → Firebase:  console.firebase.google.com → Project Settings → API Keys

2. VYGENEROVAT nový klíč
   → Na stejném portálu, kde jsi smazal starý

3. ULOŽIT nový klíč do Cloudflare Secrets
   → Dashboard → Worker → Settings → Variables → Type: Secret
   → Název: stejný jako v env (např. RESEND_API_KEY)
   → Save and Deploy

4. OVĚŘIT, že kód čte z env, ne z literálu
   → grep -r "re_\|sk-ant" financeflow-worker*.js
   → Pokud najdeš hardcoded → opravit → deploy

5. OTESTOVAT funkčnost
   → Pošli test request (contact form, AI chat, účtenka)

6. ZKONTROLOVAT git historii
   → Pokud byl klíč v commitu: repo je private? → OK (skrytá historie)
   → Pokud je public repo: zvážit git history surgery (BFG Repo-Cleaner)

7. ZDOKUMENTOVAT incident
   → Přidat do sekce 4 tohoto souboru
```

### Doba od úniku do invalidace — proč záleží na minutách

| Čas | Riziko |
|---|---|
| <5 minut | Minimální — boti ještě nenašli |
| 5–60 minut | Střední — automatizované scannery (GitGuardian, TruffleHog) |
| >1 hodina | Vysoké — klíč pravděpodobně indexován, zneužití možné |
| >24 hodin | Kritické — předpokládej zneužití, monitoruj účty |

---

## 4. Historie bezpečnostních incidentů

### Incident #1 — Resend API klíč v GitHubu (Session 3 → 4)

| Pole | Hodnota |
|---|---|
| **Datum** | Duben 2026 |
| **Co se stalo** | Resend API klíč `re_UZf6C8UZ_*` byl commitnut do public GitHub repa |
| **Jak to bylo zjištěno** | GitGuardian automatický alert |
| **Dopad** | Klíč mohl být použit k odesílání emailů přes Resend API na náklady autora |
| **Reakce** | Klíč invalidován, nový vygenerován |
| **Opakování** | Nový klíč (`re_9jY2risE_*`) byl opět hardcoded v Worker kódu (Session 4) |
| **Stav** | 🔴 Oba klíče deaktivovány. Čeká se na: nový klíč → Cloudflare Secrets + opravený Worker kód |
| **Poučení** | 1. Nikdy hardcodovat klíč v kódu. 2. Vždy `env.RESEND_API_KEY`. 3. Přesunout do Secrets PŘED commitováním |

### Incident #2 — Public GitHub repo

| Pole | Hodnota |
|---|---|
| **Datum** | Duben 2026 |
| **Co se stalo** | Repo `bcmilda/financeflow` bylo public, obsahovalo Firebase config, Admin UID, zdrojový kód |
| **Dopad** | Potenciální: únik Firebase konfigurace, business logiky, historických secretů v git historii |
| **Reakce** | Repo převedeno na **private** |
| **Kontrola** | 0 forků potvrzeno — nikdo repo nezkopíroval |
| **Stav** | ✅ Vyřešeno |
| **Poučení** | 1. Repo s produkční aplikací = vždy private. 2. Firebase API Key je sice „veřejný", ale usnadňuje útočníkovi práci |

---

## 5. Dvoufaktorové ověření (2FA) — checklist

| Služba | 2FA zapnuto? | Kde zapnout |
|---|---|---|
| **GitHub** | ⬜ Ověřit | `github.com/settings/security` |
| **Google (Firebase)** | ⬜ Ověřit | `myaccount.google.com/security` |
| **Cloudflare** | ⬜ Ověřit | `dash.cloudflare.com/profile` |
| **Resend** | ⬜ Ověřit | `resend.com/settings` |
| **Anthropic** | ⬜ Ověřit | `console.anthropic.com/settings` |

> 🔴 **Doporučení:** Zapnout 2FA na **všech** službách výše. Zabere to 5 minut za službu
> a dramaticky snižuje riziko kompromitace účtu.

---

## 6. Cloudflare Worker — bezpečnostní nastavení

### CORS (Access-Control-Allow-Origin)
Aktuální povolené domény:
```javascript
const allowedOrigins = [
  'https://financeflow-a249c.web.app',
  'https://financeflow-a249c.firebaseapp.com',
  'https://misty-limit-0523.bc-milda.workers.dev'  // ← zbytečné v produkci
];
```

**Doporučení:** Odebrat `workers.dev` z `allowedOrigins` (nepotřebné v produkci, zvyšuje attack surface).

### Rate limiting
- **Aktuální:** 60 requestů / hodina per UID (Cloudflare Cache API)
- **Omezení:** Cache API je per-datacenter, ne globální — limit je obejitelný přes různé POPy
- **Budoucí:** Migrovat na Cloudflare KV pro globální rate limiting

### Token verifikace
- **Aktuální:** Firebase `identitytoolkit.googleapis.com` lookup (funguje, ale přidává latenci)
- **Ideální:** Lokální JWT verifikace přes Google public keys (odstraní extra network call)

### SSRF ochrana (`wish_url` endpoint)
- **Aktuální:** Worker fetchuje libovolnou URL zadanou uživatelem
- **Riziko:** Uživatel může Worker použít jako proxy / DDoS nástroj
- **Doporučení:** Přidat whitelist protokolů (`http:`, `https:`) a blokovat private IP rozsahy

---

## 7. GDPR relevantní body

### Osobní údaje v aplikaci

| Typ | Kde | Kdo vidí |
|---|---|---|
| Finanční data (transakce) | `/users/{uid}/data/` | Jen uživatel + partner (pokud sdílí) |
| Profil (jméno, foto) | `/users/{uid}/profile/` | Všichni přihlášení (`.read: auth != null`) |
| PIN hash | `localStorage` | Jen uživatel (lokální) |
| Leady (email, jméno, telefon) | `/leads/` | 🔴 **Kdokoli přihlášený** — nutno opravit |
| Support zprávy | `/support/` | Jen admin |
| Komunitní data | `/community/` | Anonymní (bez UID) ✅ |

### Co je potřeba dořešit
- **`leads`** uzel — obsahuje potenciálně osobní údaje (email, jméno, telefon) zájemců o konsolidaci úvěrů. Aktuálně přístupný pro čtení **všem přihlášeným uživatelům** → GDPR problém
- **Privacy Policy** — existuje (CZ + EN), ale přezkoumat, zda pokrývá sdílení dat v `community` a `catalog`

---

## 8. Bezpečnostní tipy pro AI asistenta (Claude)

Pravidla, která má Claude dodržovat při práci s FinanceFlow:

1. **Nikdy nenavrhnout** hardcoding API klíče do kódu — vždy `env.*`
2. **Nikdy necommitovat** soubory obsahující secrets (ani „dočasně")
3. **Před každou úpravou Firebase Rules** ověřit, že:
   - Neotvíráš `.read: true` nebo `.write: true` na root úrovni
   - `leads` zůstává omezený (GDPR)
   - Admin UID je správný
4. **Při práci s Worker kódem** — kontroluj CORS, rate limiting, token verifikaci
5. **Při tvorbě nových endpointů** — vždy ověřovat Firebase token, nikdy nedůvěřovat klientským datům

---

*Vytvořeno: 2026-04-16 | Autor: Milan Migdal*

---

# Session 25 (2026-10-05 až 2026-10-10) · v11.30 → v11.61

> Bezpečnost a soukromí v Session 25. Kontext v `Summary_s25.md`.

## Sdílené ceny po krajích (v11.39, ADR-189)
- **Co se posílá:** jen výrobek, cena, řetězec, kraj a měsíc. Nikdy uid, datum nákupu, celá účtenka, lékárna ani zdraví.
- **Kategorie:** jen potraviny, nápoje, alkohol, tabák a drogerie (CZ-COICOP 01, 02, 05.6.1, 13.1.2).
- **Jak worker ukládá:** jen souhrn. Opakovaný příspěvek pozná krátkým HMAC otiskem (tajemství + uid + cesta), který platí jen pro jeden uzel. Mezi uzly ani s účtem nejde otisky spojit.
- **Zobrazení:** až od 3 různých lidí, aby z průměru nešla vyčíst cena jednoho člověka.
- **Pravidla:** `community/ceny` čte jen přihlášený, zapisuje jen worker (`.write: false`).
- **Souhlas:** opt-out v Nastavení → Data & Soukromí, odstavec v `legal.html` (oprávněný zájem).

## AI komentář reportu (v11.47, ADR-192)
Claude dostane jen předpočítaná čísla, žádné transakce, názvy ani jména. Text se kontroluje číslo po čísle.

## Report e-mailem (v11.28, ADR-184)
Posílá se **jen na e-mail přihlášeného účtu**, který worker zjistí z ověřeného Firebase tokenu, nikdy na adresu z požadavku. Limity: automaticky 1× za měsíc,
ručně 5× denně. PDF vzniká ve workeru (Browser Rendering).

## Smazání účtu (v11.45, ADR-191)
Data i přihlašovací účet Firebase Auth. Při požadavku na čerstvé přihlášení appka vyzve k novému přihlášení a smazání zopakuje.
Veřejný postup `smazani-uctu.html` (Google Play: odkaz na smazání bez instalace appky).

## Cloudflare Worker – proměnné (nastavit v dashboardu, nikdy v kódu)
- **Nové:** `CF_ACCOUNT_ID`, `CF_BR_TOKEN` (v11.28 – Browser Rendering).
- **Ověřit:** `FIREBASE_SERVICE_ACCOUNT` (TODO-330). Na něm stojí tarif, rate limiting, `/ceny` a `/report-ai`.
- **Tarif:** worker čte tarif ze stejných polí, která ukládá appka. Dřív platící dostávali limity Free (FIX-425), takže chyba byla v náš neprospěch, ne v neprospěch bezpečnosti.

## Odolnost zápisu (v11.52)
- **Odmítnutí jedné části:** pravidla DB nezastaví celé ukládání. Zápis jde po cestách, s max. 3 pokusy (ADR-197).
- **Zkrácení textů:** na limity pravidel se zkrátí už v appce (`_ffHlidejLimity`). Pravidla zůstávají poslední obranou.
- **Bariéra po připojení:** `users/{uid}/syncPing` patří pod kaskádu `users/$uid`, zapisuje jen vlastník.
- **Kontrola uid:** po připojení appka ověří, že se mezitím nezměnil přihlášený uživatel. Data jednoho účtu se nesmí zapsat do druhého.
- **Zbytky `sendBeacon`:** uzly `-N…` pod `data` se ignorují. Admin je může smazat.

## Dodatek v11.58–v11.60 (2026-10-09 večer) **(Session 25)**

- **Osobní karta výrobku** (`S.uiCfg.karty`, v11.60) je v `users/{uid}/data/uiCfg`. Čte ji jen vlastník a admin a partnerovi se nesdílí (uiCfg je v seznamu „záměrně se nesdílí“). Ruční živiny bez kódu nejdou do komunity.
- **Ikony** (v11.58) jsou statické SVG z kódu appky, žádný uživatelský obsah v SVG. `ffIkona` propustí barvu jen ve tvaru hex / `var(--x)` / slovo a titulek escapuje.

## Dodatek v11.61 (2026-10-10) **(Session 25)**

- **Ruční úpravy karty výrobku pro všechny** (akce workeru `pole`, ADR-207/208) jdou jen přes worker s ověřeným Firebase tokenem.
  - Klient do `community/eanProdukty` dál nezapisuje (pravidla beze změny, zapisuje worker nebo admin).
  - Worker hodnotu ořízne, zkontroluje a přijme jen povolená políčka (`EAN_POLE_RUCNE`). Názvy touto cestou nejdou (návrh adminovi, ADR-206).
- **Log `community/eanUpravyLog/{ean}/{uid}/{pole}`** obsahuje uid. Zapisuje ho jen worker a klient ho číst nemůže, protože žádné pravidlo čtení nepovoluje. Slouží adminovi k dohledání vandalismu (TODO-339).
- **Admin „Načíst znovu“** už kartu nemaže (`kdy: 0`), takže nepřijdeme o data komunity.
