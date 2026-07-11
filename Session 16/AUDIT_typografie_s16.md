# AUDIT_typografie_s16.md — Písmo a styly grafů
**v8.87 · 2026-07-11 · S16** · Každý nález má důkaz (soubor:řádek / počty z grepu).

## 1) Písmo — systém je zdravý, problém je v nejmenších velikostech

**Základ konzistentní ✅:** dvě rodiny s jasnými rolemi — **Syne** (nadpisy, velká čísla: `.page-title`, `.card-title`, `.stat-value`, skóre) + **Instrument Sans** (tělo, `body` v styles.css:18). Deník má záměrně **Georgia** (dobový vzhled) — v pořádku, je to izolovaná stylizace. Barvy textu: `--text #e8eaf2`, `--text2 #a8aec8`, `--text3 #7e84a0`.

**Histogram velikostí (CSS + inline, celá aplikace):** dominuje pásmo **.68–.82rem** (≈10,9–13,1 px) — to je v pořádku pro sekundární text. Problém je chvost:

| Velikost | px | Výskytů | Verdikt |
|---|---|---|---|
| .66rem | 10,6 | 47 | ⚠️ hraniční |
| .64rem | 10,2 | 20 | ⚠️ hraniční |
| .6rem | 9,6 | 25 | 🔴 pod čitelností na mobilu |
| .50–.58rem | 8–9,3 | 7 míst | 🔴 nečitelné (admin 2×, **kalendar 2×** — .55/.56 z S16!, debts, premium, projects, styles) |

**Nejhorší kombinace — porušuje naše vlastní pravidlo** („nikdy text3 pro důležitý text"): `--text3` (#7e84a0, slabý kontrast) + písmo ≤.68rem zároveň — **90 výskytů** (admin 32, projects 28, debts 20, ui 8, premium 2). To jsou přesně ta „nevýrazná" místa.

## 2) Grafy — dvourychlostní stav po S16

Opravené grafy (S16) mají jednotný standard; starší grafy zaostávají:

| Graf | Osy čitelné | Legenda | Tooltip | Poznámka |
|---|---|---|---|---|
| Měsíční přehled | ✅ #a8aec8 10px | ✅ | ✅ | vzor (v8.81) |
| Tempo výdajů | ✅ | ✅ HTML | ✅ | vzor (v8.81) |
| Obecné (3 grafy) | 🔴 `rgba(139,144,168,.5)` 13px (charts.js:33) | ✅ | ✅ (ř. 102/201/285) | jen osy |
| **Roční graf** | 🔴 `.5` opacity (ř. 926, 949) | ✅ | **🔴 CHYBÍ** | porušuje normu |
| **Všechny roky** | ⚠️ `.7/.8` (ř. 975, 978) | ✅ | **🔴 CHYBÍ** | porušuje normu |
| SVG Obraz/Deník | ✅ #a8aec8 | ✅ | ✅ `_obrazTip` | ⚠️ 5 popisků 7,5–8,5 (cashflow hodnoty v projekci) |

**Canvas fonty nekonzistentní:** 9–14 px v jednom souboru (15× 10px, ale i 9/9.5/13/14). SVG standard je 9–9.5, výjimky 7.5–8.5.

## 3) Navrhovaný standard (k zanesení do CLAUDE.md po odsouhlasení)

1. **Minimální velikosti:** informační text ≥ **.68rem**; cokoli v barvě `--text3` ≥ **.72rem** (menší text smí být jen `--text2`/#a8aec8 a světlejší); datové hodnoty ≥ .7rem. Pásmo .50–.64rem zrušit (povýšit).
2. **Canvas grafy:** osy a popisky **#a8aec8, 10px Instrument Sans** (titulky bold 11–13px). Žádné `rgba(139,144,168,<1)`.
3. **SVG grafy:** popisky ≥ **9**, osy #a8aec8; hodnoty u bodů ≥ 8.5 jen s bold.
4. **Tooltipy povinné** (už v pravidlech) → **dorovnat Roční graf a Všechny roky**.

## 4) Plán oprav (odhad)

| # | Oprava | Rozsah | Náročnost |
|---|---|---|---|
| T1 | Roční + Všechny roky: tooltipy (vzor z měsíčního) + osy #a8aec8; Obecné: osy | charts.js | 🟢–🟠 malá/střední |
| T2 | Sub-10px čistka: 7 míst .5x rem + 25× .6rem → ≥.66/.68rem | 6 souborů | 🟢 malá (mechanické) |
| T3 | text3+malé písmo (90 míst): kritická podmnožina (hodnoty, legendy, popisky grafů) → #a8aec8/.72rem; čistě dekorativní ponechat | admin/projects/debts | 🟠 střední (vyžaduje úsudek u každého) |
| T4 | Sjednotit canvas na 10px standard | charts.js | 🟢 malá |

Doporučené pořadí: **T1+T4** (jeden bump, viditelný efekt), pak **T2**, pak **T3** po dávkách.

**Nekontrolováno (mimo rozsah):** landing index.html typografie (jiný kontext), e-maily.
