# FinanceFlow – Pravidla verzování a workflow

> Tento dokument definuje pravidla pro verzování aplikace, souborů a dokumentace.
> Po schválení Milanem přesunout do `doc/VERSIONING.md`.
> Vytvořeno: Session 7, 2026-04-23
> **Doplnění Session 25** (2026-10-09): na konci souboru nová sekce „Session 25 (2026-10-05 až 2026-10-09) · v11.30 → v11.57“ včetně dodatku v11.28–v11.30. Přehled v `doc/Summary_s25.md`.

---

## 1. Verzování aplikace (index.html)

### Schéma verzí

```
Bug fix / malý tweak    → +0.01   (např. v6.47 → v6.48)
Nová feature            → +0.01   (od v6.11)
Velký milestone         → +1.00   (např. v7.0 = publikace aplikace)
```

### Co se musí změnit při každém incrementu verze

Při každé změně JS souboru nebo index.html **VŽDY** aktualizovat:

1. **`<title>`** v `index.html` řádek 6:
   ```html
   <title>FinanceFlow v6.48</title>
   ```

2. **Sidebar logo** v `index.html`:
   ```html
   <small>v6.48 · Premium</small>
   ```

3. **"O aplikaci" banner** v `index.html` sekce `page-oAplikaci`:
   ```html
   <div style="font-size:.8rem;color:var(--text3);margin-top:4px">Verze 6.48</div>
   ```

4. **Cache-busting hash** pro každý změněný JS soubor:
   ```html
   <script src="js/app.js?v=NOVÝ_HASH">
   ```
   Hash = prvních 8 znaků MD5 souboru: `md5sum js/app.js | cut -c1-8`

5. **VERZE_LOG** v `js/admin.js` – nový záznam na začátek pole:
   ```javascript
   const VERZE_LOG = [
     {
       verze: 'v6.48',
       datum: '2026-04-23',
       zmeny: [
         '✅ popis změny 1',
         '🐛 popis opravy 1',
       ]
     },
     // ... starší záznamy
   ];
   ```

### Ikony v VERZE_LOG

| Ikona | Význam |
|---|---|
| ✅ | Nová feature / nasazení |
| 🐛 | Oprava bugu |
| ⚠️ | Částečné řešení / k ověření |
| 🔐 | Security oprava |
| 📝 | Dokumentace / Admin panel |
| 🔄 | Refaktor bez změny funkce |

---

## 2. Verzování .md dokumentů

### Filozofie

`doc/` obsahuje vždy **aktuální master verzi** každého dokumentu.
`docs/` je pracovní složka pro change preview a snapshoty.

### Archivní snapshoty sessions

Před každou session (nebo po ní) lze vytvořit snapshot stavu před:
```
docs/todo_s7.md      ← stav todo.md před Session 7
docs/bugs_s7.md      ← stav bugs.md před Session 7
```

**Naming konvence:** `[název]_s[číslo_session].md`

Snapshoty slouží jako záloha a auditní stopa. Nejsou povinné, ale doporučené – zejména před velkými úpravami.

### Change preview workflow (POVINNÉ před úpravou doc/)

```
1. Claude vytvoří docs/change_[název].md
   └─ Kopie originálu se změnami označenými <ins>/<del>

2. Milan zkontroluje a napíše "schváleno" nebo "připomínky"

3. Claude přepíše doc/[název].md finální verzí
   └─ Bez <ins>/<del> tagů
```

**Výjimka:** Milan může říct "rovnou přepiš" nebo "bez preview" – pak krok 1 přeskočíme.

### Tagy v change preview

```markdown
<ins>nový nebo doplněný text</ins>         → GitHub zobrazí zeleně podtržené
<del>odstraněný nebo přesunutý text</del>  → GitHub zobrazí červeně přeškrtnuté
*(beze změn)*                              → zkratka pro sekce bez změn
```

---

## 3. Workflow při změně kódu

```
Claude edituje DEV/js/soubor.js
       ↓
Claude VŽDY aktualizuje DEV/index.html:
  ✅ title verze +0.01
  ✅ sidebar logo verze +0.01
  ✅ O aplikaci banner verze +0.01
  ✅ cache-busting hash pro každý změněný .js
  ✅ VERZE_LOG záznam v admin.js
       ↓
Milan kopíruje z DEV/ → financeflow/financeflow/
       ↓
GitHub Desktop: commit + push → branch dev
       ↓
firebase deploy --only hosting
```

---

## 4. Workflow při aktualizaci dokumentace

```
Claude přečte doc/[soubor].md
       ↓
Claude vytvoří docs/change_[soubor].md
  (change preview s <ins>/<del>)
       ↓
Milan zkontroluje → "schváleno" / připomínky
       ↓
Claude přepíše doc/[soubor].md (bez tagů)
       ↓
(volitelně) Claude uloží snapshot docs/[soubor]_sN.md
```

---

## 5. Přehled složek

| Složka | Obsah | Přístup Claude |
|---|---|---|
| `doc/` | Master .md dokumenty (9 souborů) | Jen po schválení change preview |
| `docs/` | Change preview, snapshoty, dočasné soubory | Volný přístup |
| `js/` | JS moduly | Volný přístup, vždy aktualizovat verzi |
| `css/` | Styly | Volný přístup |
| `cloudflare-worker/` | Worker kód | Volný přístup, nasazení ručně v Cloudflare |

---

## 6. Soubory v doc/

| Soubor | Obsah |
|---|---|
| `todo.md` | Seznam úkolů, priority, roadmap |
| `bugs.md` | Bugy a opravy, FIX záznamy |
| `architecture.md` | Technická architektura, struktura souborů |
| `decisions.md` | ADR záznamy (architektonická rozhodnutí) |
| `features.md` | Přehled funkcí a jejich stav |
| `context.md` | Kontext projektu, cílová skupina |
| `explanations.md` | Technické vysvětlivky |
| `GLOSSARY.md` | Slovník pojmů |
| `SECURITY.md` | Bezpečnostní pravidla, API klíče |
| `VERSIONING.md` | Tenhle soubor – pravidla verzování |

---

*Vytvořeno: Session 7, 2026-04-23 | Autor: Milan Migdal + Claude*


---

## Session 11 – aktualizace verzovacího procesu

### Oprava version bump procesu (FIX-125, v7.68)

**Problém:** Banner „Verze X.YY" v sekci O aplikaci zůstal na v7.55 přes celou Session 11 (v7.56–v7.67). Příčina: sed pattern `s|Verze 7.XX|...` neobsahoval `>` závorky → nikdy neodpovídal HTML formátu `>Verze 7.55</div>`.

**Správný sed příkaz pro banner (krok 3):**
```bash
sed -i 's|>Verze 7.68<|>Verze 7.69<|' app.html
# Ověření:
grep -o 'Verze 7.69' app.html | head -1
```

### Kompletní version bump – 4 atomické kroky + ověření

```bash
# Nastavit proměnné
OLD=7.68; NEW=7.69

# Krok 1: title tag
sed -i "s|v${OLD}</title>|v${NEW}</title>|" app.html

# Krok 2: sidebar logo
sed -i "s|v${OLD} · Premium|v${NEW} · Premium|" app.html

# Krok 3: O aplikaci banner (POZOR na > závorky!)
sed -i "s|>Verze ${OLD}<|>Verze ${NEW}<|" app.html

# Krok 4: VERZE_LOG v admin.js (Python prepend)
python3 - << 'PYEOF'
content = open('js/admin.js').read()
entry = """  { verze: 'v${NEW}', datum: '$(date +%Y-%m-%d)', zmeny: ['...'] },\n"""
content = content.replace("const VERZE_LOG = [\n", "const VERZE_LOG = [\n" + entry, 1)
open('js/admin.js', 'w').write(content)
PYEOF

# sw.js CACHE_NAME
sed -i "s|'ff-shell-v${OLD}'|'ff-shell-v${NEW}'|" sw.js

# Cache hashe pro všechny změněné soubory
for f in admin helpers ui receipts; do
  h=$(sha256sum js/$f.js | cut -c1-16)
  sed -i -E "s|js/${f}\.js\?v=[A-Za-z0-9]+|js/${f}.js?v=$h|" app.html
done

# Ověření VŠECH 4 kroků:
grep -o "v${NEW}</title>" app.html
grep -o "v${NEW} · Premium" app.html
grep -o "Verze ${NEW}" app.html
grep -o "ff-shell-v${NEW}" sw.js
```

### Rozsah verzí po sessions
| Session | Verze rozsah | Datum |
|---|---|---|
| Session 8 | v6.51 → v6.65 | 2026-05-24 |
| Session 9 | v6.74 → v7.05 | 2026-05-28 |
| Session 10 | v7.06 → v7.30 | 2026-06-01 |
| Session 11 | v7.50 → v7.69 | 2026-06-08/09 |

---

*Aktualizace Session 11: 2026-06-09*


---

## Verzovaci hlavicka souboru (Session 13, v8.24)

Kazdy zmeneny zdrojovy soubor nese na PRVNIM radku verzovaci hlavicku:

```js
// FinanceFlow - v8.24 - app.js - 2026-06-20
```

- JS soubory: // FinanceFlow - vX.XX - <soubor> - <datum> na radku 1
- worker.js: v existujici hlavicce radek * FinanceFlow - Cloudflare Worker - vX.XX - datum
- sw.js: v komentarove hlavicce //  FinanceFlow - Service Worker - vX.XX - datum
- database_rules.json: // FinanceFlow - database rules - vX.XX - datum na radku 1 (Firebase RTDB pravidla // komentare prijima, konzole je strhne)

Pravidlo: pri kazdem bumpu verze aktualizovat hlavicku kazdeho zmeneneho souboru na novou verzi. Hlavicka se meni -> meni se hash -> pregenerovat ?v=hash v app.html. Ucel: na prvni pohled poznat zda je soubor aktualni verze, bez dohadovani stara/nova.

### Poradi atomickych kroku verzovani (rozsireno na 5)
1. <title> v app.html
2. Sidebar text (vX.XX . <span id=sidebarTierLabel>)
3. Verze X.XX banner (O aplikaci)
4. CACHE_NAME (ff-shell-vX.XX) v sw.js
5. Verzovaci hlavicka kazdeho zmeneneho souboru + sha256 hashe v app.html + VERZE_LOG v admin.js (pregenerovat admin.js hash NAPOSLEDY)

---

*Aktualizace Session 13: 2026-06-20*

---

## Doplnění Session 18 (2026-08-03)

**Nový krok před nasazením** — přidat před dosavadní verzovací kroky, ne místo nich:

0. `node tools/check_tdz.js js/*.js` — kontrola proměnných použitých před deklarací. Vyžaduje `npm install --save-dev acorn acorn-walk` (jednorázově v repu). Teprve po čistém výsledku pokračovat kroky 1–5 níže.

**Soubory mimo hash chain, nasazované zvlášť (rozšířeno o S18):**
- `database_rules.json` — u S18 nutné kvůli novým uzlům `reviews` a validaci `milestones`
- `tools/check_tdz.js` — vývojářský nástroj, nikdy se nenasazuje (v `firebase.json` ignore)

*Aktualizace Session 18: 2026-08-03*

---

## Session 19 (2026-08-21) — v9.79 → v9.98

### Doplnění k postupu

**Soubory nasazované zvlášť** (mimo hash chain) — nyní **čtyři**:
`worker.js` (Cloudflare) · `database_rules.json` (Firebase Console) · `.nojekyll` ·
**`tools/**`** (v `firebase.json` v `ignore` — nikdy se nenasadí).
Jejich verze v hlavičce = **verze poslední změny**, ne aktuální verze aplikace (ADR-068).

**`worker.js` změněn ve v9.97** — přijímá `/cnb?date=`. Nezapomeň nahrát do Cloudflare.

### Ověření hashů po každé dodávce
```python
# admin.js VŽDY jako poslední – jeho VERZE_LOG odkazuje na hashe ostatních
for f in zmenene_soubory_krome_admin: rehash(f)
rehash('admin.js')
```
Kontrola: všech **33** `?v=` hashů v `app.html` musí sedět se skutečným SHA-256.
V S19 se našel **zastaralý hash `announcements.js`** — uživatelům s cache se
servírovala stará verze modulu. **Ověřuj všechny hashe, ne jen ty, které jsi měnil.**

### Hlavičky souborů
Aktualizovat **jen ve skutečně změněných** souborech. V S19 měly nesjednocený formát:
- `// FinanceFlow · vX · soubor.js · datum` (většina)
- `//  FinanceFlow · vX · soubor.js · datum` (dvě mezery — `debts.js`, `assets.js`, `charts.js`)
- `ai.js` hlavičku **neměl vůbec** — doplněna ve v9.81
- `worker.js` má hlavičku v blokovém komentáři `/** … */`

### CRLF soubory — ověřený stav (S19)
```
CRLF:  premium.js  settings.js  assets.js  charts.js  nakup.js  ai.js
       budouci.js  worker.js  push.js  share.js  duplicates.js
LF:    debts.js ← POZOR, dřívější seznam ho uváděl jako CRLF
```
**Před každou úpravou ověř skutečný stav**, neřiď se seznamem.
Python: `io.open(f, encoding='utf-8', newline='')` zachová konce řádků beze změny.

### ⚠️ Jednořádkové funkce (SKILL 29)
`charts.js` má některé funkce na jediném řádku. Komentář `//` za nahrazeným příkazem
zakomentuje **zbytek řádku** včetně zavíracích závorek. `node --check` to odhalí,
ale při plošných náhradách je to tichý zabiják.

---

# Session 22 (2026-09-12 až 2026-09-16) · v10.59 → v10.82

> Poučení z verzování ve Session 22.

## ⚠️ Bump se musí OVĚŘIT, ne jen provést **(Session 22)**
`CACHE_NAME` v `sw.js` uvízl na `ff-shell-v10.66` po **třinácti verzích**.
Příčina: bump se prováděl textovou náhradou, jejíž kotva obsahovala **konkrétní
datum**. Jakmile přestala sedět, náhrada **tiše nic neudělala** — bez chyby,
bez varování. Verze 10.67–10.79 tedy cache shellu nevynucovaly znovu
a prohlížeč mohl servírovat starý `app.html`.

**Nové pravidlo:** po každém bumpu ověřit, že se hodnota skutečně zapsala:
```bash
grep -n "CACHE_NAME" sw.js
grep -n "<title>\|Verze " app.html
```
Kotva náhrady **nesmí obsahovat datum ani jiný proměnlivý údaj**.

**🔗 Cross-reference:** `bugs.md` FIX-341, `CLAUDE_SKILLS.md` SKILL 47

## Pořadí nasazení Session 22
1. `database_rules.json` → Firebase Console (uzel `receipt_reports`)
2. `worker.js` → Cloudflare (prompt na slevy + routa `/inflace`)
3. zbytek → GitHub

⚠️ **Nový soubor `poznamky.js`** — bez něj se stránka poznámek nenačte
a prohlížeč vypíše `Uncaught SyntaxError` (hosting vrátí HTML místo 404).

---

# Session 23 (2026-09-25) · v10.82 → v11.04

> Poučení z verzování ve Session 23.

- Nasazení pouze `worker.js` do Cloudflare **nezvyšuje verzi appky** (Session 23).
  Hlavička workeru se srovná s nejbližším vydáním appky.
- Po bumpu ověřit hashe **všech** souborů v `app.html`, ne jen měněných (Session 23).
- `transactions.js` má v hlavičce DVĚ mezery (`//  FinanceFlow`) – bump regex na to musí
  počítat, jinak tiše neprojde a soubor zůstane na staré verzi (Session 23).

---

# Session 24 (2026-09-26 až 2026-10-03) · v11.04 → v11.26

## Verze
| Verze | Obsah |
|---|---|
| v11.05 | Mapa položek F3 (osobní vrstva) |
| v11.06 | EAN u položky účtenky, worker `/ean` |
| v11.07 | Taxonomie T1 + admin Mapa T2 |
| v11.08 | Mapa T3 – podkategorie → rozpočet |
| v11.09 | Mapa položek předělaná + karta výrobku |
| v11.10 | Dashboard skóre, zámek Poradce, kalendář na mobilu |
| v11.11 | ⛽ Tankování + Vozidla |
| v11.12 | 📟 Energie a voda |
| v11.13 | 🤖 AI zařazení do COICOP (worker `/coicop`) |
| v11.14 | Detail spotřeby, dvoutarif, detail vozidla, příspěvky, oprava AI |
| v11.15 | ⭐ Hlavní zdroj příjmů, limit u příjmů skryt |
| v11.16 | Free 3 účtenky, cat47, bankomat = přesun, testy |
| v11.17 | Příspěvky/doplatky oboustranně, peněženka |
| v11.18 | Blok 📟 v transakci, karty útraty v Reportu, menu klepnutím vedle |
| v11.19 | T4 krok 1 – zdražování a shrinkflace přes taxonomii |
| v11.20 | Vymazat data i uzly S24, TODO-289/311, typy workeru |
| v11.21 | Karty po položkách + ruční karta, odečty v checklistu, záloha modulů |
| v11.22 | TODO-314, menu Měřidla, ilustrace |
| v11.23 | EAN: AI český název + zařazení, admin Čárové kódy, smazání tagů |
| v11.24 | Český název (zdroje, návrhy), fotka obalu/živin |
| v11.25 | Samostatné skenování EAN, doplnění AI u starých výrobků |
| v11.26 | T4 krok 2 – inflace, statistiky a COICOP přes taxonomii |
| v11.27 | Měsíční report na skutečných datech v Report2 (TODO-317 F2), Report odemčen pro Free |

Worker: v11.06 → v11.13 → v11.16 → v11.20 → v11.23 → **v11.24**. Pravidla DB: nasadit verzi z v11.24.

## Pořadí nasazení (Milan má v11.14)
1. `database.rules.json` → Firebase · 2. `worker.js` → Cloudflare · 3. GitHub: všechny soubory z výstupů v11.15–v11.26
(`app.html`, `sw.js`, `index.html`, `js/…`, `data/categories.json`, `data/taxonomie.json`, `tools/…`). Od v11.27 navíc nový `js/report-mesicni.js` a `js/report.js`.

---

# Session 25 (2026-10-05 až 2026-10-09) · v11.30 → v11.57

## Verze
| Verze | Obsah |
|---|---|
| v11.28 | *(dodatek)* okna a scroll, nový výběr kategorie, zůstatek ke dni, import do peněženky, report e-mailem PDF, uschování fotek účtenky |
| v11.29 | *(dodatek)* proklik z Predikce, detail vozidla, barvy tlačítek Měřidel |
| v11.30 | *(dodatek)* fotka živin v okně, přiřazení přes účtenky, ✕ Odebrat, kód ze souboru – **stav GitHubu `dev`** |
| v11.31 | foťák u živin (regrese), AI český název se značkou |
| v11.32 | duplicitní účtenky + transakce, ID obchodů, český název bez cizího |
| v11.33 | zelený štítek z taxonomie (vráceno v11.34), kopírování směn do konce roku, dovolená v hodinách, výplata po měsících |
| v11.34 | štítek podle ČSÚ + paměť, vážené zboží, rozšířená karta výrobku |
| v11.35 | 📐 Statistika položek (nový modul) |
| v11.36 | číselník CZ-COICOP 2018 |
| v11.37 | gramáž jako pole, názvy zvlášť |
| v11.38 | pobočka z hlavičky účtenky |
| v11.39 | sdílené ceny po krajích (`/ceny`, pravidla DB) |
| v11.40 | Zdražování podle výrobků, naskenované výrobky se pamatují |
| v11.41 | 5. úroveň CZ-COICOP v taxonomii |
| v11.42 | období pro tvůj podíl |
| v11.43 | ruční živiny s kontrolou |
| v11.44 | datum v letním čase, export, landing hamburger |
| v11.45 | smazání účtu i z Firebase Auth, `smazani-uctu.html` |
| v11.46 | záruka na Dashboardu, obecné názvy mimo Inflaci, Finanční obraz bez dat |
| v11.47 | AI komentář reportu, oprava tarifu ve workeru |
| v11.48 | editor účtenky neztrácí úpravy, 🎯 Nejspíš |
| v11.49 | 📦 Moje výrobky, fotky bez účtenky |
| v11.50 | úložiště podle tarifu, admin 💾 Úložiště, zápis názvu neznámého kódu |
| v11.51 | Zpět na telefonu, K vyřízení |
| v11.52 | **sync audit** – tří-cestné slučování, rozpracovaná práce, offline |
| v11.53 | čekací okno analýzy účtenky |
| v11.54 | karta: zkratka z účtenky, český název, ✓ Přiřazeno |
| v11.55 | 📦 Moje výrobky jako záložka, bez převzetí zkratky |
| v11.56 | přestavba karty výrobku v2 |
| v11.57 | tři názvy výrobku, fotka českého popisku, COICOP panel na řádku |

**Worker:** měněn ve v11.31, v11.32, v11.34, v11.37, v11.38, v11.39, v11.43, v11.47, v11.50 a v11.57 → nasadit **v11.57**. Hlavička ručně: ` * FinanceFlow · Cloudflare Worker · vX.YY · datum`.
**Pravidla DB:** nasadit verzi z v11.39 (hlavička `// FinanceFlow · database rules · v11.39`).

## Postup verzování v S25
- Jeden bump na odpověď (Milan). Bump dělá skript (`bump.py STARÁ NOVÁ DATUM log.json soubory…`). Skript upraví:
  - hlavičky souborů
  - `VERZE_LOG` v `admin.js`
  - v `app.html` titulek, sidebar a banner Verze
  - `?v=` = prvních 16 znaků sha256
  - `CACHE_NAME` v `sw.js` (`ff-shell-vX.YY`)
- Testy běží z ploché složky (všechny `js`, `data`, `tools`, html, `worker.js`, `database.rules.json` + kopie `database_rules.json`), `TZ=Europe/Prague`.
- Kontrola UI v Chromiu (Playwright + lokální server) na šířce telefonu u každé změny karty.

## Pořadí nasazení (GitHub má v11.30)
1. `database.rules.json` → Firebase
2. `worker.js` → Cloudflare
3. GitHub: soubory z výstupů v11.31–v11.57 (seznam v `Summary_s25.md`) + MD soubory S25
