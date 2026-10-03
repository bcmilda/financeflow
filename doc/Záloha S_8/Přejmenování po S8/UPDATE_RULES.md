# FinanceFlow – Pravidla pro aktualizaci .md souborů

> Tento dokument je **instrukce pro budoucího Claudea** (nebo jiného AI asistenta).
> Popisuje, **jak aktualizovat** konsolidované `.md` soubory v Project knowledge,
> **jaký styl a logiku dodržovat**, a obsahuje **konkrétní příklad aktualizace** (Session 5 → `todo.md`).
> Autor: Milan Migdal + Claude | Vytvořeno: 2026-04-19 | Poslední aktualizace: 2026-05-15

---

## 1. PRAVIDLA AKTUALIZACE .md SOUBORŮ

### 1.1 Základní principy

1. **NIKDY nepřepisuj celý soubor.** Vždy přidávej a aktualizuj existující obsah.
2. **NIKDY neměň strukturu** (pořadí sekcí, číslování, nadpisy) — pokud to není explicitně požadováno.
3. **Zachovej styl a formátování** předchozích sessions — neimprovizuj nové konvence.
4. **Konflikty označ, nepřepisuj.** Pokud nová session říká něco jiného než starší, označ oba zdroje — nech autora rozhodnout.
5. **Session čísla vždy uváděj** jako `**(Session N)**` za každou novou informací.
6. **Cross-reference vždy přidávej** — pokud změna v jednom `.md` souvisí s jiným, odkaž na konkrétní sekci.

### 1.2 Jak přidat nový úkol / bug / feature

- Přiděluj **další volné ID** v sekvenci (`TODO-049`, `OPEN-026`, `FIX-046`, atd.)
- **Nevynechávej ID** — i kdyby se ti zdálo, že některé číslo „pasuje" lépe, drž sekvenční pořadí
- Pokud nový úkol **souvisí s existujícím** → přidej cross-reference (`🔗 Souvisí s TODO-003`)
- Pokud nový úkol **nahrazuje existující** → nemazej starý, označ ho jako `⚠️ Viz aktualizace v TODO-XXX`

### 1.3 Jak aktualizovat existující záznam

- Přidej blok `**(Session N update):**` pod existující text
- Starý text **nemazej** — nech ho jako historii
- Pokud se stav změnil (otevřený → vyřešený), označ to:
  - `~~starý text~~` pro vizuální škrtnutí + nový stav za tím
  - Nebo přesuň do sekce ✅ Dokončeno s odkazem na původní ID

### 1.4 Jak aktualizovat TL;DR tabulku

- TL;DR tabulka na začátku souboru je **souhrn**, ne zdroj pravdy
- Aktualizuj **počty** a **příklady** tak, aby odrážely aktuální stav
- Nezapomeň aktualizovat řádek „Celkem otevřených úkolů"
- Přidej jednořádkový poznámku o tom, co se v nové session stalo

### 1.5 Jak reagovat na „Session bez kontextu" (jako S5)

Někdy přijde session, která „vaří z vody" — nemá plný kontext projektu.
V tom případě:
- **Nepřijímej její strukturu ani číslování** (může být naivní nebo nekonzistentní)
- **Přijmi její obsah** — nové bugy, opravy, úkoly
- **Namapuj na existující ID** tam, kde je to jasné
- **Vytvoř nové ID** jen pro skutečně nové věci
- **Označ** v poznámce: „S5 neměla plný kontext"

### 1.6 Jak zacházet se sekcí ✅ Dokončeno

- Přidávej nové položky **chronologicky** — nová session = nová podsekce
- Pokud dokončená položka **měla otevřený bug/todo** → přidej cross-reference
- Pokud dokončená položka má **vedlejší efekt** (něco rozbila) → označ ⚠️ s odkazem

---

## 2. STYL A KONVENCE

### 2.1 Formátování

```
Nadpisy:     ## sekce → ### podsekce → #### detail
Priority:    🔴 Kritické → 🟡 Střední → 🟢 Nízké → 🔵 Nice-to-have → 💡 Nápady
Stav:        ✅ Hotovo | ⚠️ Rozpracováno/Otevřené | 🔴 Reopen | ❌ Neopraveno
Session:     **(Session N)** nebo **(S5)**
ID formát:   TODO-001, OPEN-001, FIX-001 (třímístné číslo, sekvenční)
Cross-ref:   🔗 Cross-reference: `soubor.md` sekce X
Konflikty:   > ⚠️ **Konflikt:** popis
Škrtnutí:    ~~starý stav~~ nový stav
```

### 2.2 Jazyk

- **Čeština** jako primární jazyk dokumentace
- **Anglické termíny** tam, kde jsou ustálené (deploy, merge, commit, CORS, API, Worker, …)
- **Nikdy** nepřekládej: `TODO`, `OPEN`, `FIX`, `Cross-reference`, `TL;DR`

### 2.3 Typické formulace (copy-paste ready)

```markdown
## Nový úkol:
### TODO-XXX · Název úkolu **(Session N)**
- **Soubor:** `soubor.js`
- **Problém:** Popis problému
- **Akce:** Konkrétní kroky
- **🔗 Cross-reference:** `bugs.md` OPEN-XXX

## Aktualizace existujícího:
**(Session N update):** Popis změny. Worker v5 připraven v repu, deploy čeká.

## Přesun do dokončených:
- [x] TODO-XXX Popis – **(Session N)**

## Nový konflikt:
> ⚠️ **Konflikt S4 vs S5:** S4 říká X, S5 říká Y. Nutno ověřit.
```

---

## 3. KONKRÉTNÍ PŘÍKLAD: Session 5 → `todo.md`

### 3.1 Vstupní data ze Session 5

```
🔴 Urgentní:
  - Opravit sekci Predikce (BUG-01)
  - Nasadit Cloudflare Worker v5
  - Nastavit RESEND_API_KEY v Cloudflare

🟡 Střední:
  - Opravit GitHub Pages (BUG-02, BUG-03)
  - Service worker (sw.js)
  - Přidat bcmilda.github.io do Firebase Hosting

🟢 Vylepšení:
  - Docs složka na GitHubu
  - Merge dev → main
  - VERZE_LOG v admin.js
  - Otestovat Predikce po opravě

✅ Dokončeno:
  - 4 bugy grafů opraveny (v6.45)
  - .env soubor
  - Záložka Verze v Admin panelu
  - GitHub Actions
  - Worker v5 v repu
  - Playwright složka
  - CLAUDE.md
  - cloudflare-worker/worker.js v repu
```

### 3.2 Mapování na existující TODO (rozhodovací proces)

| S5 položka | Existující ID | Akce | Zdůvodnění |
|---|---|---|---|
| Opravit Predikce | **TODO-004** (Grafy) | UPDATE + nový **TODO-049** | TODO-004 se grafy S5 částečně vyřešily (FIX-042–045), ale vedlejší efekt rozbil Predikce → nový TODO-049 |
| Nasadit Worker v5 | **TODO-003** (Email) | SPLIT: nový **TODO-050** | TODO-003 byl o EmailJS integraci. Deploy Worker v5 je operativní úkol, ne feature — oddělil jsem ho |
| Nastavit RESEND_API_KEY | **TODO-003** | SPLIT: nový **TODO-051** | Explicitní krok: nastavit env secret v Cloudflare. Odděleno, protože je to jiný krok než deploy kódu |
| GitHub Pages nefunguje | nový | **TODO-052** | Neexistoval — nový cluster problémů z S5 (OPEN-023, 024) |
| Service Worker | **TODO-019** | UPDATE | Existoval, S5 ho zmiňuje specificky pro GH Pages |
| bcmilda.github.io do Firebase | nový | **TODO-053** | Neexistoval — S5 přidává potřebu auth z GH Pages domény |
| Docs složka na GitHubu | nový | **TODO-054** | Workflow úkol z S5 |
| Merge dev → main | nový | **TODO-055** | Workflow úkol z S5 |
| VERZE_LOG v admin.js | existuje implicitně | pouze poznámka | Verzovací Memory Rules (S4) už to pokrývají, S5 jen připomíná |
| Otestovat Predikce | **TODO-049** | součást | Testování je součást opravy, ne samostatný TODO |

### 3.3 Dokončené položky z S5 → mapování

| S5 dokončeno | Kam | Poznámka |
|---|---|---|
| 4 bugy grafů (v6.45) | ✅ Dokončeno sekce, S5 podsekce | = FIX-042 až FIX-045, viz `bugs.md` |
| .env soubor pro Resend | ✅ Dokončeno | Security best practice |
| Záložka Verze v Admin | ✅ Dokončeno | Nová feature |
| GitHub Actions preview deploy | ✅ Dokončeno | CI/CD vylepšení |
| Worker v5 v repu | ✅ Dokončeno, ale ⚠️ deploy čeká | Kód hotov, deploy ne |
| Playwright → složka | ✅ Dokončeno | Organizace |
| CLAUDE.md | ✅ Dokončeno | Onboarding dokument |
| cloudflare-worker/worker.js | ✅ Dokončeno | Worker verzovaný v repu |

### 3.4 Výsledné změny v `todo.md` (diff)

```diff
HLAVIČKA:
- > Konsolidovaný dokument ze **4 sessions**
+ > Konsolidovaný dokument ze **5 sessions**
- > Poslední aktualizace: konsolidace 4 sessions, 2026-04-16.
+ > Poslední aktualizace: konsolidace 5 sessions, 2026-04-19.

TL;DR TABULKA:
- | 🔴 Kritické (P1) | 5 | Firebase Rules admin, Offline integrace, Email, Dělení PDF, Grafy fix |
+ | 🔴 Kritické (P1) | 5 | **Predikce nefunguje** (S5), Deploy Worker v5 (S5), Nastavit RESEND_API_KEY (S5), Firebase Rules admin, Dělení PDF |
  (Grafy a Email přesunuty / sloučeny — grafy částečně opraveny, email čeká na deploy)

TODO-003 (Email):
+ **(Session 5 update):** Worker v5 je připraven v repu (`cloudflare-worker/worker.js`),
+ klíč přesunut do `env.RESEND_API_KEY`. Zbývá: deploy Worker v5 (TODO-050) +
+ nastavit Cloudflare Secret (TODO-051).

TODO-004 (Grafy):
+ **(Session 5 update):** Základní grafy (Obecné/Měsíční/Roční/Všechny roky) opraveny
+ v6.45 (FIX-042–045). Vedlejší efekt: Predikce přestala fungovat → viz TODO-049.

NOVÉ ÚKOLY:
+ TODO-049 · Opravit sekci Predikce (Session 5, 🔴 P1)
+ TODO-050 · Nasadit Cloudflare Worker v5 (Session 5, 🔴 P1)
+ TODO-051 · Nastavit RESEND_API_KEY v Cloudflare (Session 5, 🔴 P1)
+ TODO-052 · Opravit GitHub Pages (Session 5, 🟡 P2)
+ TODO-053 · Přidat bcmilda.github.io do Firebase Auth (Session 5, 🟡 P2)
+ TODO-054 · Docs složka na GitHubu (Session 5, 🟢 P3)
+ TODO-055 · Merge dev → main po testování (Session 5, 🟢 P3)

PŘEKRYVY TABULKA:
+ P | **GitHub Pages cluster** | S5 | Nový — OPEN-023/024/025 + TODO-052/053
+ Aktualizace N (Grafy): S5 částečně opraveny (v6.45)

DOKONČENO:
+ ### V Session 5 (v6.45 → v6.46)
+ [x] 4 bugy grafů (infinite loop, kumulChart, HTML layout, box plot canvas) — FIX-042–045
+ [x] .env soubor pro Resend API klíč (security best practice)
+ [x] Záložka Verze v Admin panelu (changelog UI)
+ [x] GitHub Actions – preview deploy na push do dev
+ [x] Worker v5 v repu (cloudflare-worker/worker.js) — ⚠️ deploy dosud neproběhl
+ [x] Playwright soubory přesunuty do složky Playwrite/
+ [x] CLAUDE.md – onboarding kontext pro Claude Code sessions
+ [x] cloudflare-worker/worker.js verzovaný v repu

ROADMAP:
+ v6.45 | ✅ Hotovo | 4 opravy grafů (Session 5), GitHub Actions, Worker v5 v repu
+ v6.46 | 🔄 Aktuální | Predikce fix (TODO-049), Worker deploy (TODO-050), RESEND key (TODO-051)
```

---

## 4. CHECKLIST PRO BUDOUCÍ AKTUALIZACE

Při každé nové session, než začneš upravovat `.md` soubory:

- [ ] **Přečti si TL;DR** aktuálního souboru (první ~20 řádků)
- [ ] **Namapuj nová data** na existující ID (viz příklad 3.2)
- [ ] **Rozlišuj UPDATE vs NOVÝ** — pokud existující TODO pokrývá téma, aktualizuj ho; nový vytvoř jen pro skutečně nové věci
- [ ] **Aktualizuj TL;DR tabulku** (počty, příklady)
- [ ] **Aktualizuj překryvy tabulku** (pokud se stav změnil)
- [ ] **Přidej do ✅ Dokončeno** co session dokončila
- [ ] **Aktualizuj Roadmap** (verze-level tabulku)
- [ ] **Aktualizuj datum** v hlavičce a patičce
- [ ] **Neměň strukturu** — jen přidávej a aktualizuj
- [ ] **Re-read po každé editaci** — po každém `str_replace` znovu přečíst dotčenou sekci před další editací **(2026-05-15)**
- [ ] **Při více zdrojích** — nejdříve namapuj co odkud, pak edituj **(2026-05-15)**

---

## 5. Pravidla ze Session 7.0 **(Session 7.0)**

- **Patch-only workflow:** AI vytváří pouze `patch-sessionN.md` se změnami, nikdy celé `.md` soubory. Celé soubory zbytečně spotřebovávají tokeny a zvyšují riziko přepsání dat.
- **Číslování TODO:** Vždy ověřit poslední použité číslo grep-em v `todo.md` před přidáním nového:
  ```bash
  grep -o "TODO-[0-9]*" todo.md | sort -t'-' -k2 -n | tail -3
  ```
- **Chaining souborů:** V rámci session vždy chain editací z předchozích outputs (`/home/claude/` nebo `/mnt/user-data/outputs/`). NIKDY znovu kopírovat z `/mnt/project/` pokud byl soubor v téže session upraven.
- **Session 7.0 TODO range:** TODO-049 až TODO-055

---

## 6. Pravidla ze Session 7.1 **(Session 7.1)**

### Chainování souborů (KRITICKÉ)
- AI **MUSÍ** vždy vycházet ze svého posledního výstupu — nikdy znovu z `/mnt/project/` pokud byl soubor v téže session upraven.
- Opakované kopírování z `/mnt/project/` přepisuje provedené změny → ztráta práce.

### Kolize funkcí – před přidáním nové funkce
Ověř existující funkce grep-em:
```bash
grep -n "function nazev" /mnt/project/*.js
```
Známé kritické kolize – **NIKDY nepřejmenovávat:**
- `premium.js`: `computeNetWorth(D)` → `{rows, total, totalDebt}`
- `assets.js`: `computeAssetsNetWorth(D)` → `{totalAssets, totalWallets, netWorth, byType}`

### Async funkce v DOM
- Async funkce píšící do DOM: **vždy volat přes `setTimeout(..., 30)`** po `el.innerHTML`
- Vytvořit cílový kontejner div **PŘED** voláním async funkce

### Git operace při konfliktech
- Při „unmerged files": `git revert --abort`, pak `git reset --hard <hash>`
- Zjistit hash: `git log --oneline | head -20`
- **NIKDY** `git push origin` bez předchozího ověření funkčnosti v prohlížeči

### Script tagy v `index.html`
- Nové JS soubory řadit **ZA `nakup.js`**, **PŘED `admin.js`**
- Aktuální pořadí nových souborů: `budouci.js` → `assets.js` → `advisor.js` → `admin.js`
- Cache-bust: `?v=todo<číslo>` pro každý nový soubor (např. `?v=todo056`)
- `firebase.js` musí být vždy **POSLEDNÍ** s `type="module"`

### Verzování `index.html`
- Každé TODO dostane vlastní verzi: `index_v649_TD056-057.html` atd.
- V changelog (`admin.js` → `VERZE_LOG`) zapsat každé TODO s datem
- **Session 7.1 TODO range:** TODO-056 až TODO-072+

---

## 7. Pravidla ze zkušeností při konsolidaci .md souborů **(2026-05-15)**

Tato sekce zachycuje konkrétní chyby které nastaly při konsolidaci Sessions 1–7 a jak se jim vyhnout.

### 7.1 Pravidlo re-read po každé editaci (KRITICKÉ)

Po každém úspěšném `str_replace` je **předchozí `view` invalidovaný**. Před další editací téhož souboru **VŽDY znovu přečíst dotčenou sekci**.

```
❌ ŠPATNĚ:
  view(soubor, řádky 480-560)
  str_replace(editace A)
  str_replace(editace B)  ← pracuje se zastaralým view!

✅ SPRÁVNĚ:
  view(soubor, řádky 480-560)
  str_replace(editace A)
  view(soubor, řádky 480-560)  ← znovu přečíst!
  str_replace(editace B)
```

**Důsledek porušení:** Zdvojené sekce, chybějící obsah, špatné umístění dat.

### 7.2 Python skript pro velké restrukturalizace

Při restrukturalizaci celé sekce (změna pořadí, sloučení duplicit, přidání chybějícího bloku) **použij Python skript** místo série `str_replace`.

```python
# Vzor: přečti → uprav v paměti → zapiš
with open('soubor.md', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Přesná manipulace s řádky
new_lines = lines[:start] + [novy_blok] + lines[end:]

with open('soubor.md', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

# VŽDY ověřit výsledek
grep -n "klíčový text" soubor.md
```

**Proč:** `str_replace` na dlouhých blocích s podobným textem selhává nebo netrefí správný výskyt. Python je atomický a ověřitelný.

### 7.3 Mapování zdrojů před editací (více zdrojových souborů)

Při konsolidaci z více zdrojových souborů **nejdříve namapuj** co odkud pochází — pak teprve edituj.

```markdown
## Mapa zdrojů (vyplň před začátkem editace)
| Sekce | Zdroj | Poznámka |
|---|---|---|
| TL;DR | todo_s6.md | Aktuální S6 verze |
| Dokončeno S3-S4 | todo_s6.md | Originál |
| Dokončeno S5 | change_todo.md | Doplněk |
| Dokončeno S6 | SESSION_SUMMARY | Nejdetailnější |
```

**Důsledek ignorování:** Duplicitní sekce z různých zdrojů, chybějící sekce (S4 bylo pouze v `todo_consolidated_s5` a nikde jinde).

### 7.4 Kontrolní dotaz před prezentací výsledku

Před `present_files` projít mentální checklist:

- [ ] Je TL;DR tabulka pouze jednou?
- [ ] Jsou sekce Dokončeno v chronologickém pořadí (S1 → S2 → ... → Sn)?
- [ ] Žádná sekce se nepřidala dvakrát?
- [ ] Žádná sekce nebyla smazána (UPDATE_RULES: nikdy nepřepisuj, jen přidávej)?
- [ ] Je hlavička aktualizována (datum, Sessions: 1 → N)?
- [ ] Je patička aktualizována?

### 7.5 Při zdvojení — sloučit, nesmazat

Pokud vzniknou duplicitní sekce, **nevybírej jednu a nesmazej druhou** — slouč jejich obsah do jedné. Každá verze může mít unikátní informace.

```markdown
❌ ŠPATNĚ: Smazat starší verzi Session 6
✅ SPRÁVNĚ: Sloučit obě verze — vzít TODO čísla z jedné,
           detailní popis z druhé, bannery z třetí
```

---

## 8. Pravidla pro MD-Diff **(Session 9)**

Tato sekce popisuje správnou strukturu `patch-sessionN.md` pro použití v **MD Diff → AI Merge → Multi-patch** workflow.

### 8.1 Správné separátory (KRITICKÉ)

Multi-patch rozsekání v MD Diff hledá **přesně tento formát** separátoru:

```
## 📄 název_souboru.md
```

**Každá sekce MUSÍ začínat tímto řádkem** — jinak aplikace soubor nerozseká.
Používej přesný název souboru který existuje v `doc/` složce.

❌ ŠPATNĚ (MD Diff nerozsekne):
```
## 📋 Změny v bugs.md
## Bugs
### bugs.md
```

✅ SPRÁVNĚ:
```
## 📄 bugs.md
```

### 8.2 Dostupné soubory v doc/ (platné separátory)

```
## 📄 decisions.md
## 📄 architecture.md
## 📄 features.md
## 📄 bugs.md
## 📄 todo.md
## 📄 context.md
## 📄 CLAUDE.md
## 📄 VERSIONING.md
## 📄 SECURITY.md
## 📄 GLOSSARY.md
## 📄 explanations.md
## 📄 formulas.md
```

### 8.3 Struktura patch souboru pro MD Diff

Patch soubor musí mít tuto strukturu — každá sekce odpovídá jednomu `.md` souboru v `doc/`:

```markdown
## 📄 decisions.md

> Nová architektonická rozhodnutí, změny technologií, ADR záznamy.

### ADR-0XX – Název **(Session N)**
- **Datum:** YYYY-MM-DD
- **Rozhodnutí:** Co bylo rozhodnuto
- **Důvod:** Proč
- **Status:** ✅ Nasazeno

---

## 📄 bugs.md

> Nové bugy a opravy z této session.

### FIX-0XX · Název **(Session N)**
- **Příčina:** ...
- **Oprava:** ...
- **Soubor:** `soubor.js`

---

## 📄 todo.md

> Nové úkoly vzniklé během session.

### TODO-0XX · Název **(Session N)**
- **Popis:** ...
- **Priorita:** 🔴 P1 / 🟡 P2 / 🟢 P3
```

### 8.4 Co do patch souboru NEPATŘÍ

- ❌ Nadpisy ve stylu `## 📋 Změny v bugs.md` (emoji jiné než 📄, text navíc)
- ❌ Celý obsah existujícího `.md` souboru (patch-only workflow)
- ❌ Tabulky ve formátu „co se změnilo" místo samotných změn
- ❌ Sekce bez separátoru `## 📄 název.md`
- ❌ Metadata session (autor, datum, FIX čísla) jako samostatné sekce bez separátoru

### 8.5 Workflow použití v MD Diff

```
1. Claude vytvoří patch-sessionN.md (správná struktura viz výše)
2. Milan otevře MD Diff → záložka Projects
3. Nahraje patch soubor jako NEW, originály jako OLD
4. Spustí AI Merge → Multi-patch
5. MD Diff rozseká podle separátorů ## 📄 a merguje každý soubor zvlášť
```

### 8.6 Šablona separátoru (copy-paste)

```markdown
## 📄 decisions.md

## 📄 architecture.md

## 📄 features.md

## 📄 bugs.md

## 📄 todo.md

## 📄 context.md

## 📄 CLAUDE.md

## 📄 VERSIONING.md

## 📄 explanations.md

## 📄 formulas.md
```

---
