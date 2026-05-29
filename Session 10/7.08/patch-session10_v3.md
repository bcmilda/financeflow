# Patch – Session 10 (část 3) – 2026-05-29

> **Navazuje na:** patch-session10.md (v7.06 grafy) + patch-session10_v2.md (v7.07 skóre/detektor)
>
> **Cíl:** Mobilní náhledovka Měsíčního reportu, graf vývoje finančního skóre, opravy Poradce (3→12 skóre, AI na tlačítko, problikávání).
>
> **Verze:** v7.07 → **v7.08**
>
> **Změněné soubory:** `projects.js`, `advisor.js`, `styles.css`, `index.html`, `admin.js`
>
> ⚠️ **Pozn. k outputs:** finální kumulativní soubory mají suffix `_v2`
> (`projects_v2.js`, `advisor_v2.js`, `styles_v2.css`, `index_v2.html`, `admin_v2.js`,
> `premium_v2.js`). `index_v2.html` a `admin_v2.js` obsahují VŠECHNY změny Session 10
> (v7.06 + v7.07 + v7.08). `ui.js` (v7.06) zůstává beze změny z první části.

---

## ✨ 1. Mobilní náhledovka Měsíčního reportu

**Soubory:** `projects.js` (renderReport), `styles.css`

### Problém
Stat-karty (Příjmy / Výdaje / Saldo / Základ příjmu) byly v gridu `repeat(4,1fr)`.
Na úzkém mobilu se 4 karty nevešly a `font-size:1.35rem` + `white-space:nowrap;text-overflow:ellipsis` ořezával částky na „133…“, „142…“, „-8…“.

### Oprava
- Markup používá novou třídu `.report-stat-grid`.
- CSS: desktop 4 sloupce, `@media(max-width:600px)` → **2×2 grid**, menší font (1.08rem), `@media(max-width:360px)` → 0.95rem.
- Částky se teď na mobilu zobrazí celé.

---

## ✨ 2. Graf vývoje finančního skóre (TODO-088)

**Soubory:** `advisor.js` (nová `renderHealthScoreChart` + `drawHealthScoreLineChart`), `projects.js` (sekce v reportu)

Dle požadavku: **spojnicový graf**, osa X = měsíce, osa Y = skóre (0–100), vyšší bod = výš, body spojené čarou, barva bodu dle úrovně (zelená/žlutá/červená), hodnota nad bodem.

Počet měsíců dle periody:
- **Poradce** → vždy 12 měsíců (rok), nebo max. dostupný
- **Měsíční report** → dle záložky: 1M=1 (velké číslo místo grafu), 3M=3, 6M=6, 12M=12

Nahradil původní „kruhy dle měsíců“ (`renderHealthProgressSchema` → odstraněno).

---

## 🐛 3. Poradce – 3 skóre místo 12

**Soubor:** `advisor.js`

### Příčina
`renderHealthProgressSchema` četl `_reportPeriod`, který je v Poradci `'advisor'`. Ten nebyl v `periodMap` → fallback `|| 3` → 3 kruhy.

### Oprava
`periodMap` má `'advisor':12`. Poradce teď vždy 12 měsíců.

---

## 🐛 4. Poradce – automatické API volání Clauda

**Soubor:** `advisor.js`

### Příčina
`renderAdvisor()` volal `advisorLoadAI(data, D)` automaticky při každém otevření (a při každém re-renderu z Firebase listeneru → opakované API volání).

### Oprava
- AI box obsahuje tlačítko **„✨ Vygenerovat AI doporučení“** – volání jen na vyžádání.
- Výsledek se cachuje (`_advisorData` s podpisem dat) → po re-renderu se zobrazí bez nového volání.
- Loader (🤖 „Analyzuji…“) se zobrazí až po kliknutí.

---

## 🐛 5. Poradce – problikávání

**Soubory:** `advisor.js`, `projects.js`

### Příčina
Firebase `onValue` listener (app.js ř.442 `if(viewingUid===null) renderPage()`) se spouští při KAŽDÉ synchronizaci dat. Řetězec `renderPage → renderReport → renderAdvisor` přegeneroval celý DOM Poradce při každé synchronizaci → blikání při scrollování/práci.

### Oprava (anti-flicker)
- `renderAdvisor()`: spočítá podpis relevantních dat (`_advisorLastSig`); pokud se nezměnil a box existuje → **přeskočí re-render**.
- `renderReport()` (advisor větev): nepřepisuje `el.innerHTML`, pokud `advisorContainer` už existuje – nechá rozhodnout `renderAdvisor` (s vlastním guardem).

> Pozn.: kořenová příčina (render z Firebase listeneru) je širší a týká se i jiných stránek. Zde vyřešeno lokálně pro Poradce. Doporučený follow-up (mimo S10): centrální debounce/guard renderPage při shodných datech.

---

## 📋 Aktualizace dokumentace (k aplikaci do doc/)

### `bugs.md` – nové
- **FIX-093** · advisor.js – Poradce 3→12 skóre (periodMap fallback).
- **FIX-094** · advisor.js – AI doporučení na tlačítko místo auto-volání + cache.
- **FIX-095** · advisor.js + projects.js – Poradce anti-flicker guard.
- **FIX-096** · projects.js + styles.css – responzivní stat-karty reportu.

### `todo.md`
- **TODO-088** (graf vývoje skóre) → ✅ DOKONČENO S10. Spojnicový graf v Poradci (12M) i reportu (dle periody).
- **OPEN-029 / TODO-067** (report přepočet periody) – částečně souvisí; skóre graf nyní respektuje periodu.

### Navrhované nové TODO
- **TODO-089** · Centrální anti-flicker pro renderPage (debounce při shodných datech z Firebase listeneru) — širší follow-up. P3.

---

## 🧪 Co otestovat
1. Měsíční report na mobilu → stat-karty 2×2, všechny částky čitelné (Příjmy/Výdaje/Saldo/Základ).
2. Report → přepínej 1M/3M/6M/12M → sekce „Vývoj finančního skóre“: 1M = velké číslo, 3M/6M/12M = spojnicový graf s tolika body.
3. Poradce → graf skóre má **12 bodů** (rok), spojený čarou, osa = měsíce.
4. Poradce → AI doporučení se **nespustí samo**; až po kliknutí na tlačítko.
5. Poradce → scrolluj / nech aplikaci běžet → **neproblikává**.

---

## 📦 Nasazení (Milan později)
```bash
# Soubory _v2 → přejmenovat na originál a nahrát do dev:
#   projects_v2.js → js/projects.js
#   advisor_v2.js  → js/advisor.js
#   admin_v2.js    → js/admin.js
#   premium_v2.js  → js/premium.js   (z části 2)
#   styles_v2.css  → css/styles.css
#   index_v2.html  → index.html
#   ui.js (v7.06)  → js/ui.js         (z části 1)
firebase deploy --only hosting
# Ctrl+Shift+R
```

### Cache-busting hashe (v7.08)
| Soubor | Hash |
|---|---|
| `ui.js` | `c0df6548552c885f` (v7.06) |
| `premium.js` | `d024caa669e780f0` (v7.07) |
| `projects.js` | `c62a4783fb8842d3` |
| `advisor.js` | `8ad7cb4c4f2e5d89` |
| `styles.css` | `af64fa9771b32401` |

*Session 10 část 3 · v7.08 · Claude Opus · 2026-05-29*
