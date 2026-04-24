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
