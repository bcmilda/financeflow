# ADR-060 · Config-driven Score Engine pro Dashboard (compute/render oddělení)

> **Stav:** Schváleno (design) · implementace plánována
> **Session:** 12.1 · 2026-06-10
> **Souvisí:** scoring-config.json (data hotová), ADR-061 (admin výkon), architecture.md – princip „separate compute from render"

## Kontext

Dashboard dnes finanční skóre **počítá i zobrazuje** na jednom místě (`renderFinancialScore`). Milan dodal granulární bodovací tabulky (dashboard_body.xlsx): S1 Cash Flow (75 b.), S2 DTI (60) + DSTI (40) dle ČNB, S3 Rezerva (50), S4 Aktivní spoření (35), konzistenční bonus (30) → **celkem 290 b.** Cíl: dashboard má data **jen zobrazovat**, ne počítat; bodování má být laditelné bez zásahu do kódu.

## Rozhodnutí

1. **`data/scoring-config.json`** – všechny prahy/body 1:1 z xlsx (HOTOVO v S12.1, vč. opravy překlepu řady S1 1.00–1.25 a sjednocení maxim na hodnoty tabulek = 290). Změna bodování = úprava JSONu, žádný deploy kódu navíc.
2. **`js/score-engine.js`** (nový modul) – čisté funkce bez vedlejších efektů:
   - `loadScoringConfig()` – fetch + cache (vzor product-db.js)
   - `computeDashboardScore(D, m, y)` → `{total, parts:{s1,dti,dsti,s3,s4,bonus}, vstupy}` – jen čte `D`, nic nemutuje (architektonický princip č. 2 a 3)
   - interpolace: obecný resolver nad `typ: ratio_max | pct_max | min | streak`
3. **Zdroje vstupů (mapování dat):**
   - S1: `expSum/incSum` aktuálního měsíce (s `!t.splitParent`)
   - S2 DTI/DSTI: `debts.js` – celkový zůstatek dluhů / roční příjem; měsíční splátky / měsíční příjem
   - S3: zůstatky peněženek označených spořicí/investiční ÷ průměrný měsíční příjem
   - S4: součet `isSaving` kategorií ÷ základní příjem × 100
   - Bonus: streak po sobě jdoucích měsíců s meziměsíčním poklesem výdajů
4. **Persistence snapshotů:** při `save()` se uloží měsíční snapshot do `D.scoring[YYYY-MM]` → dashboard **čte snapshot**, historie skóre zdarma (graf vývoje). Přepočet jen při změně dat daného měsíce.

## Důsledky

- ✅ Dashboard = čistý render; bodování laditelné v JSONu; historie skóre pro trend graf
- ⚠️ Migrace: první výpočet snapshotů pro starší měsíce on-demand
- ⚠️ Maxima v hlavičce xlsx (235) nahrazena maximy tabulek (290) – odsouhlaseno Milanem v S12.1

## Implementační kroky (další session)

1. score-engine.js + zapojení do save() a renderFinancialScore (jen čtení)
2. Trend mini-graf skóre na Dashboardu (z D.scoring)
3. VERSIONING bump + hash, sw cache
