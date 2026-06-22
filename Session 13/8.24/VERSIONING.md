# FinanceFlow – Pravidla verzování a workflow

> Tento dokument definuje pravidla pro verzování aplikace, souborů a dokumentace.
> Po schválení Milanem přesunout do `doc/VERSIONING.md`.
> Vytvořeno: Session 7, 2026-04-23

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
