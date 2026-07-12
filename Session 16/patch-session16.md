# patch-session16.md — Session 16 (2026-07-07 → 2026-07-12)

> **Rozsah verzí:** v8.74 → **v8.90** (16 bumpů — rekordní session)
> **Hlavní témata:** DTI/DSTI fix, kalendář (poznámky + pracovní režim + směny + kopírování), stres index 10 metrik + Excel, Měsíční report dlaždice, Finanční obraz (projekce, payday historie, trendy), **Deník v1→v2.1**, Grafy (normy + multi-select + Přesuny), skóre 0–310, **bezpečnostní audit + opravy (XSS, GDPR, rules, SW, admin)**, **ADR-062 diff-write S17**, typografický audit + T1/T2/T4, smoke-testy, postupné vykreslování.
> **Kontext:** aplikace má zatím 0 uživatelů kromě Milana; Milan plánuje smazat data a začít od nuly (ovlivnilo rozhodnutí o S18 — viz ADR sekce).

---

## Přehled verzí

| Verze | Obsah (zkráceně) |
|---|---|
| v8.75 | FIX-192: DTI/DSTI příjmová základna → 12M klouzavý průměr (3 konzumenti přes `computeEffectiveIncome`) |
| v8.76 | Kalendář: poznámky dnů (modrá tečka, notify flag), týdenní/víkendové statistiky, přepínač 💰Finanční / 🗓️Pracovní, pracovní kalendář (směna/dovolená/nemoc, hodiny, přesčasy, fond dovolené) |
| v8.77 | TODO-162: Dluhový stres index 4 → **10 metrik** (váhy Σ100: DSTI 20, Emergency 15, DTI 15, Interest Cost 10, Debt Quality 10, Počet 8, Váž. úrok 7, Likvidita 5, Trend 5, Velocity 5) + konfigurační Excel (2 listy, 47 formulí) |
| v8.78 | TODO-163: Report – zdraví kategorií jako kompaktní dlaždice (1–3 sloupce, částka/plán v baru, trend oranžově, bez podkategorií); TODO-164: typy směn R/O/N |
| v8.79 | TODO-165: kopírování úseku směn (3 kliky, volné dny čistí cíl, „opakovat do konce měsíce") |
| v8.80 | TODO-166/167: Obraz – „Kam směřuju" 6M projekce + historie payday cyklů (přichycení na reálnou výplatu ±6 dní) |
| v8.81 | TODO-168: Grafy-Měsíční dle norem (tooltipy hover+dotyk, osa X po 2 dnech, #a8aec8, zelené podbarvení); spodní graf → **„Tempo výdajů"** (tento vs. minulý měsíc vs. Ø6M); TODO-170/FIX-193: checklisty „Skrýt" + obnova (nové LS klíče); TODO-169: skóre **0–310 raw** (pásma: Výborné ≥279 … Kritické <93); DTI/DSTI podřádky zvýrazněny |
| v8.82 | TODO-171: trend regrese (později nahrazena, viz v8.84); Úspory → **Momentum**; TODO-172: payday tabulka 1.–5. týden (barvy vs. stejný týden předchozího cyklu, Δ, Ø); TODO-173: predikční tabulka |
| v8.83 | TODO-174: **DENÍK v1** (admin-only) – snímek predikcí vs. živá skutečnost, graf den po dni, `S.diary` (schéma 3×) |
| v8.84 | Trend → **Ø posl. 3 vs. předch. 3** (regrese zamítnuta – nečitelná; Milanův „součet rozdílů" teleskopicky = poslední−první, ověřeno: Σ=4427=4427); **Deník v2** – starodávná kniha (pergamen, kožená vazba, inkousty, Georgia), graf příjem/výdej/predikce |
| v8.85 | **FIX-194 (kritický)**: Grafy – splity dvojitě, přesuny jako výdaje, bez FX převodu → filtry + `txCZK` (7 míst); **multi-select filtry** (checkboxy) + typ 🔁Přesuny |
| v8.86 | **AUDIT opravy**: FIX-198 XSS (sanitizace na vstupu, 5 míst vč. partnera), P0-2 landing consent + cookie lišta, P0-3 admin shallow, P1-2 rules create-only, FIX-197 SW (app.html v SHELL, fallback dle cesty, cache poisoning), FIX-195 `fmtP(t.amt)`; **TODO-176** zapsáno (radar nepřejmenovávat) |
| v8.87 | P2-2: Emergency Fund = hotovost + likvidní rezerva (bez penzijka/DIP/investic – `assetTier`), Excel aktualizován |
| v8.88 | **S17 ADR-062: DIFF-WRITE** – automatický shadow-diff v saveToFirebase (tx → `data/transactions/{id}`, ~1 KB místo ~1,5 MB), lazy migrace + záloha `dataBackupV1`, `schemaV:2`, normalizace object→pole v `sanitizeUserData`, FIX-196 (onValue bez sanitizace), rules v2 (validace name<300/note<1000) |
| v8.89 | Typografie **T1** (Roční + Všechny roky: tooltipy ze snímku plátna, osy #a8aec8), **T4** (canvas 10px), **T2** (0 výskytů písma pod .62rem – 8 cílených + blanket .6→.66rem) |
| v8.90 | **Smoke-testy** (`tests/smoke.js`, 3 profily, baseline ručně ověřen); `computeStressIndex(D)` extrahován z renderu; **Deník v2.1** (snímek stresu + payday řádek na listu); **postupné vykreslování** seznamu transakcí (chunk 120, IntersectionObserver) |

## Nasazení / provozní poznámky

- `database_rules.json` se nasazuje **ručně v Firebase Console** (v8.86 create-only leads/affiliate; v8.88 validace tx).
- **v8.88 migrace:** proběhne při prvním uložení; vytvoří `users/{uid}/dataBackupV1`. **Rollback = vrátit hosting + obnovit z backupu** (ne jen hosting!).
- Deliverables od S16: **jen změněné soubory** (+ vždy app.html/admin.js/sw.js); Milan na mobilu → průběžně dodávána i kumulativní sada.
- CRLF: charts.js JE CRLF (Python `newline=''`); premium.js/debts.js jsou LF (paměť byla zastaralá). ai.js nemá verzní hlavičku (legacy).

## Klíčové dokumenty vzniklé v S16 (v repu vedle patchů)
`AUDIT_s16.md` · `AUDIT_typografie_s16.md` · `ADR-062-diff-write.md` · `FinanceFlow_StresIndex_Konfigurace.xlsx` · `tests/smoke.js`

## Otevřené k datu patche
- **S18** (ADR-062 fáze 2): query čtení, child listenery, `stats/{rok}` — **schváleno udělat brzy** (prevence > hašení; s 0 uživateli nejbezpečnější okamžik). Worker migrace spících účtů **škrtnuta** (nikdo neexistuje).
- **T3 typografie**: 90 míst text3+malé písmo (po dávkách, vyžaduje úsudek).
- **TODO-176**: názvy „Kam směřuju" (Radar vs. Obraz) — probrat později, NEpřejmenovávat.
- Stripe (čeká na klíče), TWA (čeká na SHA-256), push digest (po TWA), Capacitor (zásobník — až narazí TWA na limity; plný Kotlin přepis zamítnut).
