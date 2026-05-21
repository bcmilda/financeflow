# Patch – Session 8 (2026-05-19)

> **Cíl session:** v6.51 dashboard refactor (Treemap nahoru, Bubble dolů, 12měs bar) + v6.52 PDF import critical fixes (TODO-005 / OPEN-003 reopen).
>
> **Procedura:** Tento patch obsahuje pouze delta změny k `.md` souborům. Před aplikací zkontroluj, že žádný záznam nepřepisuje historická data.
>
> **Konflikty:** Žádné identifikované. Patch navazuje na Session 7.1 (v6.50).

---

## 📄 `bugs.md` – aktualizace

### Sekce: `## 🔴 OTEVŘENÉ CHYBY – Kritické`

#### `OPEN-003` – **uzavřít** (vyřešeno v Session 8 / v6.52)

Nahradit současný blok `OPEN-003 · PDF import – token limit` tímto:

```markdown
### ~~OPEN-003~~ · ~~PDF import – chybějící transakce + crash~~ ✅ VYŘEŠENO S8 **(Session 2 → 7.0 → 7.1 reopen → 8)**
- **Soubory:** `worker.js`, `import.js`
- **Historie:**
  - **S2:** Velké PDF (>200 transakcí) selhávaly na `stop_reason: max_tokens`
  - **S7.0:** Chunking 15 stránek/dávka + pdf.js text extraction (FIX-052) → ČÁSTEČNĚ vyřešeno
  - **S7.1 reopen (2026-05-19):** Dva nové bugy:
    - **Bug A:** 70 z 72 transakcí (8stránkový PDF) – ztráta 2 posledních
    - **Bug B:** Po kliknutí „Přidat a editovat" prohlížeč zamrzne
  - **S8 (v6.52, 2026-05-19):** ✅ VYŘEŠENO – FIX-054 (Bug A) + FIX-055 (Bug B)
- **Root cause Bug A:** `worker.js` měl `max_tokens: 8192` pro `bank_statement_text`. Při 70+ transakcích Claude vrátil oříznutý JSON uprostřed poslední transakce. `JSON.parse` selhal → `continue` → ZTRÁTA i transakcí které Claude úspěšně dokončil.
- **Root cause Bug B:** `calcDupScore()` v `openImportEditor` má komplexitu O(N_import × N_existing) s drahými operacemi (`new Date()` × 2, `toLowerCase().split()`) pro každý pár. Pro 72 nových × ~5000 existujících = 360 000+ iterací string operací → UI thread zablokovaný několik desítek sekund.
- **🔗 Cross-reference:** FIX-054, FIX-055, `todo.md` TODO-005, `architecture.md` sekce 17, ADR-032
```

#### TL;DR aktualizace

V tabulce `📋 TL;DR – Stav otevřených bugů` snížit „Kritické" z 2 na 1:

```markdown
| 🔴 Kritické | 1 | **Bubble chart – bubliny pod lištu** (OPEN-027) |
```

V sekci čísel pod tabulkou:

```markdown
**Celkem aktuálně otevřených:** ~20 bugů
**Vyřešeno v Session 8 (v6.52):** FIX-054 (PDF max_tokens 8192→16384 + repair truncated JSON), FIX-055 (calcDupScore optimalizace + async chunking)
```

### Sekce: `### Session 7.1 – aktiva a bubble chart`

Za blok `FIX-053` přidat novou sekci:

```markdown
---

### Session 8 – PDF import critical fixes + dashboard refactor **(Session 8, v6.51–v6.52)**

#### FIX-054 · PDF import – oříznutý JSON kvůli max_tokens **(S8, OPEN-003 Bug A)**
- **Soubory:** `worker.js`, `import.js`
- **Závažnost:** 🔴 Kritická – základní funkce importu nefungovala, ztráta transakcí
- **Root cause:** `worker.js` `bank_statement_text` měl `max_tokens: 8192`. Při 70+ transakcích výstupní JSON přesáhl limit → Claude oříznul odpověď uprostřed transakce → `lastIndexOf('}')` našel poslední `}` uvnitř transakce, ale chybělo `]}` na konci → `JSON.parse` selhal → `continue` v import.js → ZTRÁTA celé dávky.
- **Oprava:**
  1. `worker.js`: `max_tokens` 8192 → **16384** pro `bank_statement_text` a `bank_statement`
  2. `import.js`: Detekce `data.stop_reason === 'max_tokens'` s console warning
  3. `import.js`: Nová funkce `repairTruncatedTxJson(jsonStr)` – při selhání `JSON.parse` projde znaky uvnitř `"transactions": [...]`, tracking depth `{}` a stringy s escape, najde poslední úplnou transakci (depth=0 po `}`) a doplní `]}` → zachrání všechny dokončené transakce
- **Verze:** v6.52
- **🔗 Cross-reference:** OPEN-003 (uzavřeno), `todo.md` TODO-005 (uzavřeno), `architecture.md` sekce 17

#### FIX-055 · Import editor – freeze při velkém DB **(S8, OPEN-003 Bug B)**
- **Soubor:** `import.js`
- **Závažnost:** 🔴 Kritická – po kliknutí „Potvrdit a otevřít Editor" prohlížeč zamrzal
- **Root cause:** `calcDupScore()` v `openImportEditor` měl komplexitu **O(N_import × N_existing)** s drahými string operacemi:
  - `new Date(r.date)` a `new Date(t.date)` pro každý pár (2× allocation per iteration)
  - `(r.name).toLowerCase().trim().split(/\s+/)` opakovaně pro stejnou r v každé iteraci
  - Žádný early-exit při dobré shodě
  - Pro 72 nových × 5000+ existujících = 360 000+ iterací → ~30+ sekund blokovaný UI thread → browser hang
- **Oprava:**
  1. **`calcDupScore`** přepsán: použít `r._ts`, `r._nameLow`, `r._words` (pre-cached), early-skip `if diffDays > 14 continue`, `break` při `best >= 90`
  2. **Nová `buildExistingIndex(existing)`** – jednorázový build cached indexu na vstupu (pre-computed `_ts`, `_amt`, `_nameLow`, `_words`)
  3. **`openImportEditor` async** – scoring po dávkách 25 transakcí s `requestAnimationFrame` yield mezi nimi → UI se může vykreslit
  4. **Loading indikátor** pro DB >500 transakcí: „Zpracovávám N transakcí proti M existujícím..."
  5. **`confirmImportAndEdit` async** – await na `openImportEditor`
- **Verze:** v6.52
- **🔗 Cross-reference:** OPEN-003 (uzavřeno), `todo.md` TODO-005 (uzavřeno), ADR-036 (kolize funkcí – pozor na podobné optimalizace)
```

---

## 📄 `todo.md` – aktualizace

### Sekce: `## 🔴 P1 – KRITICKÉ ÚKOLY`

#### `TODO-005` – **uzavřít**

Nahradit současný blok `TODO-005 · ~~Dělení PDF~~ ⚠️ ČÁSTEČNĚ VYŘEŠENO → REOPEN` tímto:

```markdown
### TODO-005 · ~~Dělení PDF + import editor freeze~~ ✅ DOKONČENO S8 **(Session 2 → 7.0 → 7.1 reopen → 8)**
- **(Session 7.0):** pdf.js 3.11.174 text extraction + chunking 15 stránek/dávka nasazeno ✅
- **(Session 7.1 reopen 2026-05-19):** 🔴 Dva nové bugy při testování:
  - **Bug A:** 70 z 72 transakcí (8str PDF) – ztráta 2 posledních
  - **Bug B:** Crash po „Přidat a editovat" – prohlížeč zamrzne
- **(Session 8 – v6.52, 2026-05-19):** ✅ VYŘEŠENO oba bugy:
  - **FIX-054:** `worker.js` `max_tokens` 8192→16384 + `import.js` `repairTruncatedTxJson()` pro záchranu transakcí z oříznutého JSON
  - **FIX-055:** `calcDupScore` optimalizace (pre-cached indexy, early-skip ±14d, break >=90), async `openImportEditor` s chunkingem 25/dávka, loading indikátor pro DB>500
- **🔗 Cross-reference:** `bugs.md` OPEN-003 (uzavřeno), `bugs.md` FIX-054 + FIX-055, `decisions.md` ADR-032, `architecture.md` sekce 17
```

### Sekce: `## 📋 TL;DR – Stav TODO`

Aktualizovat počty:

```markdown
| 🔴 Kritické (P1) | 2 | Offline integrace ⚠️ (neověřeno), Měsíční report přepočet ⚠️ |
```

Aktualizovat řádek pod tabulkou:

```markdown
**Celkem otevřených úkolů:** ~66
**Dokončeno Session 8 (v6.51–v6.52):** Dashboard refactor (Treemap top, Bubble bottom, 12měs bar) ✅, TODO-005 PDF import (FIX-054 + FIX-055) ✅
```

Odstranit řádek:
```markdown
**Reopen 2026-05-19:** TODO-005 PDF crash + chybějící transakce 🔴
```

### Sekce: `### ⚠️ Překryvy a konflikty napříč sessions`

Aktualizovat řádek U:

```markdown
| U | **Dělení PDF + import freeze** | S2–S7.0 reopen → S8 | ✅ **Vyřešeno S8** – FIX-054 (max_tokens + JSON repair) + FIX-055 (calcDupScore optimalizace, async chunking). Viz `bugs.md` OPEN-003 uzavřeno |
```

### Sekce: `### V Session 8 (v6.51–v6.52)` – **přidat novou sekci**

Za blok `### V Session 7.1 (v6.49–v6.50)` přidat:

```markdown
### V Session 8 (v6.51–v6.52)
- ✅ **Dashboard refactor (v6.51)** · Treemap přesunuta do horní karty (místo bubble), Bubble chart do vlastní karty pod ní (min-height 340px), 6měs → 12měs bar chart
- ✅ **TODO-068** · Bubble chart – bubliny pod lištu opraveny (SVG H 280→320, Y pozice POS upraveny) → částečně řeší OPEN-027
- ✅ **TODO-005** · PDF import – Bug A + Bug B vyřešeny (FIX-054 + FIX-055) ✅
- ✅ **FIX-054** · worker.js `max_tokens` 8192→16384 + `repairTruncatedTxJson()` pro oříznutý JSON
- ✅ **FIX-055** · `calcDupScore` optimalizace + async `openImportEditor` s chunkingem → editor neblokuje UI thread
```

### Sekce: `### Verze-level`

Přidat řádky:

```markdown
| v6.51 | ✅ Hotovo **(S8)** | Dashboard refactor: Treemap top, Bubble bottom, 12měs bar (bubliny už nezasahují pod lištu) |
| v6.52 | ✅ Hotovo **(S8)** | FIX-054 PDF max_tokens + JSON repair, FIX-055 import editor async optimalizace |
```

A v `v6.51+` řádku změnit na:
```markdown
| v6.53+ | 🔄 Plánované | Error handler (TODO-006), Měsíční report přepočet (TODO-067), Tooltip bubliny (TODO-070), Plány záložka (TODO-072) |
```

---

## 📄 `architecture.md` – aktualizace

### Sekce 17 (PDF import systém) – **přidat pod aktuální obsah**

```markdown
### Session 8 – kritické fixy (v6.52)

**max_tokens limit:** `worker.js` měl pro `bank_statement_text` (a `bank_statement`) limit 8192 tokenů. Při 70+ transakcích výstupní JSON přesáhl limit, Claude oříznul odpověď uprostřed transakce, klient nedokázal JSON parsnout a celá dávka se ztratila. Po zvýšení na 16384 tokenů by se výstup měl vejít i pro ~150 transakcí v jediné dávce. Pro extrémně velké výpisy je k dispozici fallback `repairTruncatedTxJson()` v `import.js`, který:
1. Najde `"transactions": [` v JSON stringu
2. Iteruje znaky, tracking depth `{}` a stringy (s escape sekvencemi `\\`)
3. Najde poslední pozici kde `depth=0` po uzavírající `}` = konec úplné transakce
4. Odřízne string na této pozici a doplní `]}`
5. Vrátí validní JSON, který obsahuje všechny dokončené transakce

**Import editor optimalizace:** `calcDupScore` byla O(N × M) s drahými string operacemi na každý pár. Pro velkou databázi (5000+ existujících) × 100 nových importovaných = milion+ iterací → UI thread blokován desítky sekund. Optimalizace:
- `buildExistingIndex()` – pre-cache `_ts` (timestamp), `_amt`, `_nameLow`, `_words` jednou na začátku
- `calcDupScore` – přijímá pre-cached objekty, používá `Math.abs((rTs - tTs) / 86400000)` místo `new Date()`, má early-skip `if diffDays > 14 continue` a `break if best >= 90`
- `openImportEditor` async – scoring v chunks po 25 transakcích s `requestAnimationFrame` yield → UI se rendruje, loading indikátor je viditelný
```

---

## 📄 `decisions.md` – aktualizace (volitelné, nový ADR)

### ADR-038 · max_tokens vs chunking trade-off **(Session 8)**

```markdown
### ADR-038 · max_tokens generování vs chunking dávek **(Session 8, FIX-054)**

**Kontext:** PDF import přes Claude AI – jeden bankovní výpis může mít desítky až stovky transakcí. Worker.js posílá batch textu z pdf.js a očekává JSON s polem `transactions`.

**Problém:** `max_tokens` v Claude API určuje MAXIMÁLNÍ délku **výstupu**, ne vstupu. Pokud je nastaven nízko (8192), Claude ořízne odpověď uprostřed JSON.

**Rozhodnutí:** Nastavit `max_tokens: 16384` (max pro `claude-sonnet-4-20250514`) pro všechny PDF/bank handlery + implementovat klientský fallback `repairTruncatedTxJson()` pro extrémní případy.

**Důsledky:**
- ✅ ~150 transakcí v dávce 15 stránek se vejde do 16384 tokenů
- ✅ Pokud i to selže, fallback parser zachrání všechny úplné transakce
- ⚠️ Vyšší `max_tokens` = potenciálně větší účet za API (Claude účtuje za output tokeny)
- ⚠️ Pro extrémně velké PDF (>200 transakcí) je stále potřeba snížit `PDF_PAGES_PER_BATCH` z 15 na např. 8

**Související:** FIX-054, OPEN-003, ADR-032 (PDF chunking)
```

---

## 📄 `admin.js` – VERZE_LOG (už aplikováno přímo)

V Session 8 byly přímo přidány záznamy v6.51 a v6.52 do `VERZE_LOG`. Detaily viz commit / soubor `admin.js` z outputs.

---

*Patch vytvořen: 2026-05-19 | Session 8 | Autor: Milan Migdal*
*Pozn.: Aplikace patche znamená manuální editaci `bugs.md`, `todo.md`, `architecture.md`, `decisions.md` v `doc/` složce dle výše uvedených pokynů.*
