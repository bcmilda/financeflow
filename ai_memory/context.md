# FinanceFlow – Context pro AI asistenta

## Název projektu
**FinanceFlow** – Rodinné finance pod kontrolou

## Cíl aplikace
Webová progresivní aplikace (PWA) pro sledování osobních a rodinných financí.
Umožňuje správu příjmů/výdajů, import z banky, AI analýzu účtenek, grafy,
predikce, správu půjček, rozpočtů a srovnání výdajů s průměry ČSÚ.
Cílí na český trh, plánuje se vydání na Google Play.

## Použité technologie
| Vrstva | Technologie |
|--------|------------|
| Frontend | HTML5, CSS3, Vanilla JavaScript (bez frameworku) |
| Databáze | Google Firebase Realtime Database (europe-west1) |
| Auth | Firebase Authentication (Google Sign-In / Google OAuth) |
| AI proxy | Cloudflare Worker (Node.js runtime) |
| AI model | Claude Sonnet (`claude-sonnet-4-20250514`) přes Anthropic API |
| Email | **(Session 3)** Resend.com API (přes Worker) – viz omezení níže |
| Hosting | **(Session 1)** GitHub Pages &nbsp;·&nbsp; **(Session 2 + 3)** Firebase Hosting |
| Offline | Lokální režim přes `localStorage` (bez Google účtu) |
| Verzování | GitHub (větve: `main` = produkce, `dev` = vývoj) |
| CI/CD | **(Session 2)** GitHub Actions (automatický deploy při merge do `main`) |
| Testy | **(Session 3)** Playwright – nainstalován, testy nenapsány |

## Aktuální stav
- **Verze:** **(Session 1)** v6.27 &nbsp;·&nbsp; **(Session 2)** v6.36 &nbsp;·&nbsp; **(Session 3)** v6.41
- **URL (produkce):**
  - **(Session 1)** https://bcmilda.github.io/financeflow
  - **(Session 2 + 3)** https://financeflow-a249c.web.app
- **GitHub:** https://github.com/bcmilda/financeflow
- **Cloudflare Worker:** https://misty-limit-0523.bc-milda.workers.dev
- **Firebase projekt:** financeflow-a249c
- **Stav:** Funkční, v aktivním vývoji
- **(Session 3)** **Přihlášení:** Google Sign-In – perzistentní session (uživatel se znovu nepřihlašuje)
- **(Session 3)** **Grafy:** CSS timing bug opraven – vyžaduje nahrání `helpers.js` v6.41
- **(Session 3)** **Email notifikace:** Nefungují plně – Resend free tier omezení (viz níže)
- **(Session 3)** **PIN:** Nastaven v settings, ale full-screen PIN pad chybí

### Premium / Monetizace **(Session 3)**
- 30denní trial (manuální aktivace)
- Platební systém **není** implementován
- Plánovaná cena: **99 Kč/měsíc** nebo **699 Kč/rok**

### Implementované funkce
- ✅ AI analýza účtenek (Claude přes Cloudflare Worker)
- ✅ COICOP engine (13 skupin, keyword matching)
- ✅ Split transakce
- ✅ Import CSV / XLSX / PDF
- ✅ Admin panel (keyword engine, corrections, low confidence, stats)

### Známá omezení
- ⚠️ Monetizace (GoPay) není implementována
- ⚠️ PWA offline podpora pouze částečná (localStorage)

## Firebase konfigurace
```
apiKey:            AIzaSyDtEdQw4WccmEzxXzMwPQlenqfnjoiVw4A
authDomain:        financeflow-a249c.firebaseapp.com
databaseURL:       https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app
projectId:         financeflow-a249c
storageBucket:     financeflow-a249c.firebasestorage.app
messagingSenderId: 399807761148
appId:             1:399807761148:web:a20b1d9ae78aec23e7a579
Admin UID:         LNEC8VNB2QPwIv6WWQ9lqgR4O5v1
```

## Cloudflare Worker
```
URL:    https://misty-limit-0523.bc-milda.workers.dev
Secret: ANTHROPIC_API_KEY
CORS:   (Session 1) pouze https://bcmilda.github.io
        (Session 2) neuvedeno
```

**(Session 3)** Worker je nyní **v4** a routuje navíc requesty na **Resend.com API** (email).

## Resend (email) **(Session 3)**
```
Provider:     Resend.com (přes Cloudflare Worker)
Admin email:  bc.milda@gmail.com
API klíč:     re_UZf6...  [REDACTED – viz security incident, klíč byl uniknut na GitHubu]
```

> 🔴 **Pozor:** v původním Session 3 souboru byl Resend API klíč uveden v plain textu.
> Byl odstraněn kvůli security incidentu (GitGuardian alert). Pro identifikaci je
> ponechán pouze prefix (`re_UZf6...`).
> Doplň novou hodnotu z `.env` až po regeneraci.

### Resend free tier omezení
- `from` = pouze `onboarding@resend.dev`
- `to` = pouze email registrovaný na Resend účtu (bez verified domény)
- **Alternativa:** EmailJS (`emailjs.com`, free 200/měsíc, nevyžaduje doménu)

## Důležité poznámky pro AI

### Workflow a verzování
1. **Verze se inkrementuje o 0.01** – vždy zkontroluj řádek 6 v `index.html` (`<title>FinanceFlow vX.XX</title>`)
2. **Commit vždy do větve `dev`**, nikdy do `main`
3. **Commit zpráva:** `vX.XX - stručný popis změn`
4. **Po commitu vždy push** a pak `firebase deploy --only hosting`
5. **Verzovací schéma:** bug fix → +0.01, nová feature → +0.01 (od v6.11), milestone → +1.00

### Architektura a struktura souborů
Více souborů – `index.html` + samostatné JS moduly (Session 3 specifikuje **19 modulů**), kritické pořadí načítání.

6. Pořadí JS souborů je kritické – viz `architecture.md`, `firebase.js` musí být **POSLEDNÍ**
7. `firebase.js` používá `type="module"` – nelze přesunout výše v pořadí skriptů
8. Největší past: prázdný `<script>` tag z původního HTML se opakovaně vracel do `index.html` – vždy zkontroluj konec souboru

#### Script pořadí v `index.html` (19 souborů, **(Session 3)**, nesmí být změněno)
```
app.js → helpers.js → charts.js → stats.js → transactions.js → projects.js
→ premium.js → ui.js → debts.js → ai.js → receipts.js → duplicates.js
→ settings.js → share.js → sms-import.js → kalendar.js → nakup.js
→ admin.js → import.js → firebase.js
```

#### Konvence názvu souboru
Filename je vždy `index.html` (commit do `dev`).

### Code quality – co NIKDY nedělat
9. **Nikdy** nedefinovat funkce uvnitř jiných funkcí (nested function declarations)
10. **Nikdy** volat `renderXxx()` z `oninput` handleru – blikání a ztráta focusu
11. **Vždy** používat `addEventListener()` pro komplexní formuláře

### COICOP engine – globální scope
- `COICOP_GROUPS_DEF`, `COICOP_KEYWORDS`, `COICOP_CATEGORY_MAP`, `mapToCOICOP()` musí být **globální** (ne uvnitř jiné funkce)
- `buildCompareTab()` potřebuje `householdSize` jako **explicitní parametr** (není v closure)
- `guessReceiptCategory()` musí být **globální** (ne uvnitř `buildReceiptPreviewHTML`)

### UI specialitky
- Overlay klik **nezavírá** `modalSplit` – výjimka v event handleru
- Split children se nezobrazují samostatně – filtr: `!t.splitId || t.splitParent`

### Data a importy
- **KB CSV** je v kódování `windows-1250`, header je na řádku 16 (přeskočí metadata)
- **(Session 3)** `t.amt` vs `t.amount` – `saveTx` ukládá obojí: `{amount: amt, amt}`. Vždy čti `t.amount || t.amt || 0`.

### Historické bugy – VŽDY zkontrolovat před úpravou **(Session 3)**
- **`premium.js` balance -1** – starý fragment `sendContactForm` zůstává v souboru. Vždy začínej od `uploads/premium.js` jako základu, ne od `outputs/`.
- **`settings.js` NESMÍ přepisovat `applySettings()`** – `_origApplySettings = applySettings`, pak přepsaná funkce volá sebe → nekonečná rekurze. `renderSettingsPage()` volá `ui.js` přímo.
- **`computePersonalSeason` / `detectTrend` / `computeYearForecast`** – definovány v `helpers.js` na konci souboru. Pokud chybí (špatný upload) → predikce se rozpadnou.
- **Grafy root cause** – `.page{display:none}` v CSS. `showPage()` volá `renderGrafy()` synchronně před CSS reflow → `canvas.parentElement.clientWidth = 0` → prázdné plátno. **Fix:** `requestAnimationFrame(() => setTimeout(() => renderPage(), 50))` v `showPage` pro grafy.
- **Cache busting** – po každé změně JS aktualizuj `?v=sha256hash` v `index.html`.

### Validace
- **Při opravě souboru** – vždy zkontroluj syntax: `node --check soubor.js`
- **Po editaci `index.html`** – ověř, že verze v řádku 6 sedí a soubor není ořezaný
- **(Session 3)** Kontroluj brace balance `{` vs `}` po každé změně
- **(Session 3)** Aktualizuj `?v=hash` v `index.html` po každé změně JS souboru

## Nasazení workflow **(Session 3)**
```bash
# 1. GitHub: nahrát js/*.js + index.html do dev větve
# 2. firebase deploy --only hosting
# 3. Prohlížeč: Ctrl+Shift+R (hard refresh)
# 4. Cloudflare Worker: Dashboard → Workers → Edit → Deploy
# 5. Firebase Rules: Console → Realtime DB → Rules → Publish
```

## Jak má AI pomáhat
- Opravovat konkrétní soubory (ne celý projekt najednou)
- Vždy ověřit syntax před předáním souboru
- Inkrementovat verzi správně
- Ptát se na kontext, pokud není jasný
- Nemazat existující funkce při přidávání nových
- Při editaci velkého souboru – editovat jen relevantní část, ne celý soubor
- Preferovat Python skripty pro editaci souborů (přesnější než `str_replace` na velkých souborech)
- Vždy pracovat s nejnovějším `index.html`
- **(Session 3)** Opravovat bugy vždy na základě `uploads/` souborů (aktuální Firebase verze), nikdy z `outputs/`
- **(Session 3)** Před úpravou přečíst aktuální verzi souboru – nikdy nepředpokládat obsah
- **(Session 3)** Upozornit, pokud změna ovlivňuje script pořadí nebo závislosti mezi moduly

## Provozovatel
**Milan Migdal** – bc.milda@gmail.com – Ostrava, CZ
