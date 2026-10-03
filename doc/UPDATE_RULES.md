# FinanceFlow – Pravidla pro aktualizaci .md souborů

> Tento dokument je **instrukce pro budoucího Claudea** (nebo jiného AI asistenta).
> Popisuje, **jak aktualizovat** konsolidované `.md` soubory v Project knowledge,
> **jaký styl a logiku dodržovat**, a obsahuje **konkrétní příklad aktualizace** (Session 5 → `todo.md`).
> Autor: Milan Migdal + Claude | Vytvořeno: 2026-04-19

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

---

*Vytvořeno: 2026-04-19 | Autor: Milan Migdal + Claude*
