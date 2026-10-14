# FinanceFlow – Technická vysvětlení a omezení

## 📖 Proč tento dokument existuje

V průběhu vývoje FinanceFlow se ukázalo, že některé otázky a technická rozhodnutí se
napříč sessions **opakovaně vracejí**. Typicky jde o situace, kdy:

- Autor (nebo nový Claude) v další session navrhne něco, co už bylo jednou zvážené
  a **záměrně zamítnuté** z technického důvodu (např. „pojďme udělat systémový PIN pad")
- Bug vypadá jako chyba implementace, ale **je to technické omezení** platformy (prohlížeč,
  Firebase, Cloudflare Worker, API limity)
- Rozhodnutí odporuje tomu, co radí obecné zdroje (ChatGPT, Stack Overflow) – a důvod,
  proč v **našem** kontextu platí opak, se špatně dohledává

Tento soubor existuje proto, aby Claude i autor **nemuseli znovu řešit stejné otázky**.
Jde o sbírku „**proč je to tak a ne jinak**" – vysvětlení s kontextem, technickou příčinou
a odkazy do ostatních dokumentů.

### Kdy zde hledat
- „Proč nejde X?" – přečti si vysvětlení místo hádání nebo zbytečných pokusů
- „Mohli bychom udělat Y?" – pokud je Y v seznamu jako technicky nemožné, ušetři si čas
- Než napíšeš kód řešící problém, který tady je popsaný – možná už je vyřešený jinak

### Formát každého vysvětlení
1. **Otázka** – jak se problém opakovaně ptá
2. **Krátká odpověď** – TL;DR pro rychlou orientaci
3. **Technická příčina** – detail pro pochopení
4. **Kontext v projektu** – cross-reference na `bugs.md`, `features.md`, atd.

---

## 1. PIN obrazovka — proč není jako systémový PIN telefonu (Wallet app)

### Otázka
„V appce Wallet vidím hezký full-screen PIN pad s číselníkem, který vypadá jako systémový.
Proč naše aplikace takový nemá? Mohli bychom to udělat?"

### Krátká odpověď
**Nemůžeme.** PIN pad z fotky Wallet appky je **systémový PIN telefonu**, který zobrazuje
operační systém (iOS / Android). Webová aplikace k tomu nemá přístup – je to záměrné
omezení prohlížeče kvůli bezpečnosti.

### Technická příčina
- **Systémový PIN** = ochrana na úrovni OS (FaceID, TouchID, systémový PIN kód telefonu).
  Přístup k tomuto API mají **jen nativní aplikace** nainstalované přes App Store / Google Play.
- **Webová aplikace** (PWA, běžná webovka) běží v sandboxu prohlížeče. Má přístup jen k:
  - `prompt()` / input dialogům (ošklivé)
  - Vlastnímu aplikačnímu overlay (to, co teď děláme)
  - `WebAuthn` / `Credential Management API` (biometrika přes prohlížeč, ale to je jiná věc)
- Vypadat jako systémový PIN pad **smí** – ale nefunguje se stejnou bezpečnostní úrovní
  a nenabízí se uživateli na úrovni OS

### Co je aktuálně implementované
- Aplikační PIN overlay v `settings.js` + `index.html`
- Spouští se ~800 ms po `loadSettings()` (delay kvůli async načtení Firebase dat)
- Hash PIN uložen v `localStorage` (viz `decisions.md` – „PIN v localStorage, ne Firebase")

### Pokud PIN nefunguje
Zkontroluj, zda byl nahrán aktuální `app.js` – bez něj delay nezadlí a PIN se nespustí
ve správný moment.

### Možné budoucí vylepšení (ale ne „systémový PIN")
- **WebAuthn** – biometrika přes prohlížeč (FaceID/TouchID z webové appky)
  - Vyžaduje registraci credentials, složitější setup
  - Není ekvivalent systémového PIN padu, je to úplně jiný koncept (biometrika)
- **TWA wrapper pro Google Play** (viz `todo.md` TODO-027) – aplikace zabalená do
  nativního kontejneru by teoreticky mohla volat systémové API, ale reálně TWA je jen
  „plný prohlížeč v nativním obalu" a stejná omezení platí

### Kontext v projektu
- `features.md` – sekce „PIN ochrana při přihlášení" (hotová funkce)
- `decisions.md` – rozhodnutí „PIN v localStorage (ne Firebase)" a „Firebase Auth pro autentizaci"
- `bugs.md` – OPEN-021 byl uzavřen (uživatel potvrdil funkčnost)

---

## 2. Email notifikace — proč Resend selhává

### Otázka
„Proč kontaktní formulář neposílá emaily? Odesílání se tváří úspěšně, ale email nepřijde.
Je to bug v kódu?"

### Krátká odpověď
**Není to bug kódu.** Resend free tier má **striktní omezení**: z adresy `onboarding@resend.dev`
lze posílat **pouze na email registrovaný na Resend účtu**. Všechny ostatní adresáty Resend
tiše zahodí bez chybové hlášky.

### Technická příčina
Resend je email provider, který pro free tier zavedl ochranu proti spamu:

```
Free tier pravidla:
  1. Z adresy onboarding@resend.dev → lze posílat pouze na email účtu
  2. Z vlastní domény (např. noreply@tvojedomena.cz) → lze posílat kamkoli
     ALE vyžaduje DNS verifikaci domény (SPF, DKIM záznamy)

Naše aktuální konfigurace:
  from: "onboarding@resend.dev"   ← Resend výchozí
  to:   "bc.milda@gmail.com"      ← příjemce z contact formu

Otázka, která rozhoduje: Je "bc.milda@gmail.com" zaregistrovaný na resend.com?
  ANO → emaily chodí
  NE  → emaily jsou tiše zahazovány
```

**Proč Resend nepíše chybovou hlášku?** Aby zabránili farmingu informací o tom, jaké
emaily existují. Request vrátí HTTP 200, ale email nikdy nedorazí.

### Možná řešení (podle preference)

#### Řešení A – Nejjednodušší: Ověřit Resend účet
1. Přihlásit se na `resend.com`
2. Podívat se, jaký email je registrovaný na účtu
3. Pokud je to `bc.milda@gmail.com` → **mělo by fungovat** (zkontroluj spam)
4. Pokud je to jiný email → buď změnit, nebo zvolit B/C

**Výhoda:** Žádná další práce, kromě přihlášení se a kontroly
**Nevýhoda:** Funguje jen pro jeden konkrétní email (nemůžeš posílat cizím uživatelům)

#### Řešení B – EmailJS (pro univerzální odesílání)
- **Web:** emailjs.com
- **Free tier:** 200 emailů / měsíc
- **Setup:** ~10 minut
- **Nevyžaduje doménu**
- **Funguje na jakýkoli email** (není omezení na registrovaného)

**Kroky:**
1. Registrace na emailjs.com
2. Vytvořit Gmail Service
3. Vytvořit Email Template (proměnné: `from_name`, `from_email`, `msg_type`, `message`)
4. Z dashboardu zkopírovat: Service ID + Template ID + Public Key
5. Předat Claudovi → přidá do `premium.js` místo aktuálního Worker fallbacku

**Výhoda:** Univerzální, žádná doména
**Nevýhoda:** Další služba k managementu, limit 200/měsíc

#### Řešení C – Ověřit vlastní doménu na Resend
- Vyžaduje vlastní doménu (viz `todo.md` TODO-040)
- Setup DNS záznamů (SPF, DKIM) → 24–48h propagace
- Pak lze posílat z `noreply@tvojedomena.cz` kamkoli

**Výhoda:** Profesionální email z vlastní domény
**Nevýhoda:** Nejvíce práce, vyžaduje koupenou doménu

### Doporučení
Pro **contact form od uživatelů** (kde přijímáš zprávy **ty**) → **Řešení A** je nejrychlejší.
Pro **notifikace uživatelům** (kde posíláš zprávy **jim**) → **Řešení B nebo C** jsou nutné.

### ⚠️ Security prerequisite
Před jakýmkoli řešením A/B/C je potřeba dořešit rotaci API klíče. Viz:
- `bugs.md` FIX-041 – Resend klíč hardcoded v kódu (deaktivován po GitGuardian incidentu)
- `architecture.md` sekce 7 – správné zacházení s API klíči (přesun do `env.RESEND_API_KEY`)

### Kontext v projektu
- `bugs.md` – OPEN-001 (aktivní bug, tam je shrnutí všech 3 řešení)
- `todo.md` – TODO-003 (akční úkol)
- `architecture.md` – sekce 7 (Resend konfigurace)
- `features.md` – „Kontaktní formulář" (70 % hotové, blokováno Resendem)

---

## 📋 Plánovaná vysvětlení (přidat při příležitosti)

Tyto otázky se opakovaly, ale zatím nejsou rozepsané. Doplnit při další session:

- **3. Worker — proč musí existovat** (a ne přímé volání Claude API z prohlížeče)
  → API klíč, CORS, rate limiting, centrální bod kontroly
- **4. `amount` vs `amt` — proč obojí** a ne refaktor na jedno
  → zpětná kompatibilita se starými daty, viz `decisions.md` ADR
- **5. `firebase.js` jako poslední skript** — proč ChatGPT radí špatně
  → async `type="module"`, stub funkce čekající na Firebase
- **6. CSS `display:none → block` u grafů** — proč potřebuje `rAF` delay
  → browser nedokončí layout synchronně, `clientWidth = 0` bez delay
- **7. OECD spotřební jednotky** — proč ne prostý počet osob
  → mezinárodní standard, zohledňuje spotřebu dětí vs. dospělých
- **8. COICOP 13 skupin** — proč ne vlastní klasifikace
  → srovnání s ČSÚ daty vyžaduje standard, CZ-COICOP 2024

---

*Vytvořeno: 2026-04-16 | Autor: Milan Migdal*
