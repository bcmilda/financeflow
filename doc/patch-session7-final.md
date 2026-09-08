# FinanceFlow – Patch Session 7 (2026-04-25)

---

## ✅ Dokončeno

### OPEN-003 · PDF import – token limit (VYŘEŠENO)
- pdf.js 3.11.174 extrahuje text, posílá po dávkách 15 stránek přes nový Worker typ `bank_statement_text`
- Dotčené soubory: `worker.js`, `js/import.js`

### initReferral · Permission denied (VYŘEŠENO)
- Přidány uzly `referrals` a `referral_clicks` do `database.rules.json`

### Git chaos – 700 staged souborů (VYŘEŠENO)
- Řešení: `git reset HEAD .` + smazání `.claude/worktrees/` přes Průzkumník
- Přidat do .gitignore: `node_modules/`, `.firebase/`, `.claude/`, `.specstory/`, `ai_memory/`

---

## 📋 Nové úkoly (TODO-049 až TODO-055)

### TODO-049 · Přání a nákupy – rozšíření o Plány a cíle (P2)
- Evoluce stávající sekce `nakup.js`, ne nová sekce
- Přidat: deadline, targetAmount, savedAmount, monthlyTarget, progress bar, motivační stav
- Virtuální peněženka – uživatel zaznamená vklad ručně
- Datový model: `users/{uid}/goal_deposits/{id}`
- Soubory: `nakup.js`, `firebase.js`, `styles.css`

### TODO-050 · Měsíční report – záložky 7D/1M/3M/6M/12M (P2)
- Každá záložka přepočítá metriky za dané období
- Plánované výdaje per kategorie (uživatel si nastaví limit)
- Soubory: `projects.js`, `settings.js`

### TODO-051 · Budoucí platby – přehled (P2)
- Zdroje: šablony + narozeniny + plány a cíle
- UI: timeline nejbližších plateb s datem a částkou

### TODO-052 · Report pro finančního poradce (P2)
- Karty: Finanční zdraví / Cashflow / Zadlužení (DSTI+DTI) / Rezerva / Net Worth
- Cashflow graf 12M + struktura výdajů + AI doporučení (3–5 rad od Claudea)
- Nový Worker typ `advisor_report`
- Soubory: nový `advisor.js`, `worker.js`, `index.html`, `styles.css`
- Závislosti: TODO-050, TODO-049

### TODO-053 · Drill-down bubliny (P2) – NAHRAZUJE koláčový graf
- Level 1: kategorie | Level 2: podkategorie jako satelity | Level 3: sdílené tagy
- Sdílené položky: gradient okraj + 🔗 + breadcrumb navigace
- Soubory: `charts.js`, `index.html`, `styles.css`

### TODO-054 · Chord diagram – propojení kategorií (P3)
- Pro Statistiky nebo Report poradce
- Kategorie = oblouky na kružnici, stuhy = sdílené výdaje
- Soubory: `charts.js`, `stats.js`

### TODO-055 · Treemap – roční přehled (P3)
- Součást záložky 12M v TODO-050
- Soubory: `charts.js`

---

## 🎨 Vizualizační rozhodnutí

| Graf | Použití |
|---|---|
| Drill-down bubliny | ✅ Hlavní dashboard |
| Chord diagram | ✅ Statistiky / Report poradce |
| Horizontal bar | ✅ Měsíční report |
| Treemap | ✅ Roční přehled 12M |
| Koláč | ❌ Nahrazen |

---

## 🔧 Poznámky
- Patch = jeden soubor na session (od Session 7)
- Session číslo = číslo konverzace, ne číslo v todo.md
- pdf.js: používat verzi 3.x (UMD), ne 4.x (ESM only)
- import.js: commitnout v příští session

## 📁 Prototypy → uložit do doc/prototypes/
chart-preview-v3.html, bubble-categories-v2.html, shared-bubbles-v2.html, propojeni-grafy.html

*Session 7 · 2026-04-25*

---

## 🎯 Session 7.1 – plán
- Implementovat TODO-053 · Drill-down bubliny (nahradit koláčový graf)
- Implementovat TODO-049 · Přání a nákupy rozšíření o cíle
- Případně TODO-050 · Měsíční report záložky

## 📌 Číslování TODO
- Poslední v todo.md před Session 7: TODO-055 (ne 052 jak Milan předpokládal)
- Session 7 přidala: TODO-049 až TODO-055 (7 nových úkolů)
- Session 7.1 začne od: TODO-056
