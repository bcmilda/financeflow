# Patch – Session 10 (část 2) – 2026-05-29

> **Navazuje na:** patch-session10.md (bublinové grafy v7.06)
>
> **Cíl:** Oprava nestabilního Finančního skóre + zamrzání Detektoru úspor.
>
> **Verze:** v7.06 → **v7.07**
>
> **Změněné soubory:** `premium.js`, `projects.js`, `index.html`, `admin.js`
>
> ⚠️ **Pozn. k souborům v outputs:** finální soubory mají suffix `_v2`
> (`premium_v2.js`, `projects_v2.js`, `index_v2.html`, `admin_v2.js`).
> `index_v2.html` a `admin_v2.js` jsou KUMULATIVNÍ – obsahují i v7.06 změny
> bublinových grafů. Při nasazení tedy stačí použít `_v2` verze + `ui.js` (v7.06).

---

## 🐛 FIX 1 – Nestabilní Finanční skóre

**Soubor:** `premium.js` → `computeFinancialScore()`

### Příčina
Konzistenční bonus se počítal mutací stavu:
```js
if(!D.scoreState) D.scoreState={};
D.scoreState.consistencyMonths = trendImproving
  ? Math.min(6,(D.scoreState.consistencyMonths||0)+1) : 0;
```
`computeFinancialScore()` je volaná z mnoha míst (renderFinancialScore, renderNetWorth, ai.js 3×) a při každém přepnutí měsíce. Každé volání inkrementovalo nebo resetovalo `consistencyMonths`. Bonus `[0,0,2,5,9,13,15]` má mezi stupni rozdíl až +11 bodů → skóre skákalo bez zjevného důvodu (18 → 25 → 31 po překliknutí květen-duben-květen).

### Oprava
Bonus se počítá **deterministicky** z historie dat: projde posledních 6 měsíců zpět od aktuálního a spočítá, kolik po sobě jdoucích měsíců mělo meziměsíční pokles výdajů (a předchozí měsíc měl příjem). Čistá funkce, žádná mutace `D.scoreState`. Stejná data = stejné skóre, bez ohledu na kolikrát/odkud se funkce zavolá.

---

## 🐛 FIX 2 – Detektor úspor zamrzá prohlížeč

**Soubor:** `projects.js` → `renderDetektor()` sekce 6 (Refinancování)

### Příčina
```js
const origSched = d.schedule?.length?d.schedule:generateSchedule(d);
const betterSched = generateSchedule(betterDebt);
```
`generateSchedule()` má strop `maxPeriods = periodsPerYear * 600` = **7200 období** a v každém kroku tvoří `Date` objekt + `toISOString()` + push do pole. U velkého dluhu (screenshot: **-4 834 000 Kč**) s nízkou splátkou, která sotva pokrývá úrok, smyčka běžela až k 7200 a vytvořila **dvě obří pole na každý drahý dluh**. Při (opakovaném) renderu → prohlížeč zamrzl.

### Oprava
Nahrazeno lehkou funkcí `estimateTotalInterest()`:
- žádné `Date` objekty, žádná pole – jen akumulace úroku
- tvrdý strop 50 let (`periodsPerYear * 50`)
- pokud splátka ≤ úrok prvního období → vrátí `null` (kalendář by byl nekonečný) → návrh refinancování se pro daný dluh přeskočí
- fallback splátky přes `calcAnnuity()` když `d.payment` chybí

Výsledek a výpočet úspory (`saved>10000`, per-period saving) zůstávají zachovány.

---

## 📋 Aktualizace dokumentace (k aplikaci do doc/)

### `bugs.md` – nové
- **FIX-091** · `premium.js` – computeFinancialScore deterministický konzistenční bonus (řeší nestabilitu skóre při přepínání měsíců). Cross-ref ADR-042.
- **FIX-092** · `projects.js` – Detektor úspor: lehký odhad úroku místo generateSchedule (řeší zamrzání u velkých dluhů). Cross-ref TODO-074, TODO-087.

### `todo.md` – cross-reference (dle poznámky Milana)
- **TODO-068** (bubliny pod lištu) → ✅ DOKONČENO S10 (chyběl cross-ref; vyřešeno spolu s OPEN-031/TODO-076 v7.06).
- **TODO-069** (Gradient bez sdílených) → ✅ DOKONČENO S10 (fallback UI + tooltip, chyběl cross-ref).

---

## 🧪 Co otestovat
1. Dashboard → Finanční skóre: přepínej měsíce květen↔duben↔květen **opakovaně** → číslo musí být **stabilní** pro daný měsíc (nemění se náhodně).
2. Otevři skóre na PC i mobilu se stejnými daty → stejné číslo.
3. Detektor úspor → klikni na záložku → musí se **otevřít bez zamrznutí** (i s velkým dluhem -4,8 mil.).
4. Pokud máš drahý dluh (>10 % p.a.) s rozumnou splátkou → návrh refinancování se zobrazí; s nesplatitelnou splátkou se přeskočí (žádný crash).

---

## 📦 Nasazení (Milan později)
```bash
# Soubory _v2 → přejmenovat zpět na originál a nahrát do dev:
#   premium_v2.js  → js/premium.js
#   projects_v2.js → js/projects.js
#   admin_v2.js    → js/admin.js
#   index_v2.html  → index.html
#   ui.js (v7.06)  → js/ui.js   (z první části Session 10)
firebase deploy --only hosting
# Ctrl+Shift+R
```

### Cache-busting hashe (v7.07)
| Soubor | Hash |
|---|---|
| `ui.js` | `c0df6548552c885f` (v7.06) |
| `premium.js` | `d024caa669e780f0` |
| `projects.js` | `5ae46065fb095191` |

*Session 10 část 2 · v7.07 · Claude Opus · 2026-05-29*
