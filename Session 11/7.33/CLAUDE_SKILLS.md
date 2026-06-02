# FinanceFlow – CLAUDE SKILLS (naučené chyby, kterým se vyhnout)

> Pravidla z opakovaných chyb. Claude je dodržuje při KAŽDÉ úpravě FinanceFlow.

## SKILL 1 – Text a barvy na tmavém pozadí
- **NIKDY** nepoužívat `var(--text3)` ani `var(--text2)` pro důležitý/čtený text – jsou špatně čitelné na tmavém pozadí.
- Volit světlejší barvy (`#a8aec8` a světlejší), **větší** a barevnější text.
- Popisky grafů, vysvětlivky a legendy musí být dobře viditelné.
- Platí pro HTML i pro `ctx.fillStyle` v canvas grafech.

## SKILL 2 – Grafy (povinné u KAŽDÉHO grafu)
- Osa X **i** osa Y s popisky a jednotkami.
- Legenda (mimo plochu grafu, nepřekrývat data).
- Tooltip / interaktivita (hover, snap na hodnotu) – pokud uživatel nechce jinak.
- Data **NESMÍ** překreslovat/přesahovat osy → dost paddingu (pad/right/top/bottom).
- **SVG** s malým `viewBox` (např. 320) + `width:100%` se na desktopu roztáhne ~4× → VŽDY `max-width` + `preserveAspectRatio="xMidYMid meet"`.
- **Canvas**: skrytá záložka má `clientWidth=0` → měřit šířku přes `requestAnimationFrame` + `setTimeout` + fallback (`Math.max(clientWidth, 320)`).
- Sloupce/čáry ve stejném měřítku jako osa (nemít vlastní škálu, která opticky klame).

## SKILL 3 – Problikávání obrazovky
- Častá chyba: obrazovka problikává při změně dat/měsíce (Firebase `onValue` → `renderPage` při každém renderu).
- Vždy řešit:
  - anti-flicker guard – porovnat podpis dat (`_dataSig`) před překreslením, překreslit jen při změně,
  - necachovat/neměnit loading placeholder při každém renderu,
  - debounce `renderPage`.
- Před dokončením ověřit, že přepnutí měsíce neproblikává.

## SKILL 4 – Workflow (z dřívějška, stále platí)
- Chaining: vždy začít kopií z NEJNOVĚJŠÍCH outputs (ne /mnt/project).
- `node --check` po každém editu.
- 4-krokový version bump: title + sidebar + „O aplikaci" + VERZE_LOG + cache-busting hashe.
- Finální ověření: všech 14 `?v=` hashů konzistentních.
- Reaktivita: grafy/výpočty vázat na `S.curMonth`/`S.curYear`, ne na `today` (jinak nereagují na přepnutí měsíce).

## SKILL 5 – Architektura kódu (proti duplikaci a křehkosti, Session 11)

Z připomínek (Gemini) + vlastních bugů. Cíl: méně duplikace, méně tokenů, méně chyb ze stavu.

- **UI helpery místo inline HTML stringů.** Opakované bloky (stat-karty, prázdné stavy, karty se záhlavím) skládat přes helpery v `helpers.js`:
  - `statCard(value, label, color, opts)`, `statGrid(cards, cols)`, `emptyState(icon, title, desc)`, `sectionCard(title, bodyHtml, opts)`, `escHtml(s)`.
  - Nepsat všude znovu `<div style="background:var(--surface2);border-radius:10px;...">`.
- **Oddělit výpočet od renderu** (vzor `advisorBuildData(D)` / `advisorRenderHTML(d)`):
  - *compute* funkce bere `D` (data) a **vrací** hodnoty/objekt,
  - *render* funkce jen skládá HTML z těch hodnot (a z UI helperů).
  - Default pro **nové** funkce. Staré (`renderKomunita` apod.) přepisovat **oportunisticky** – jen když je stejně otevírám.
- **Stav (`S`) – disciplína, ne eliminace:**
  - Render funkce **NIKDY nemutují** `S` ani jiný globální stav.
  - Výpočty berou `D` jako parametr a **vrací** výsledky (řeší bugy typu FIX-090 mutace `scoreState`, problikávání).
  - `S` jako centrální stav je OK – problém je nekontrolovaná mutace, ne jeho existence.
- **ŽÁDNÝ big-bang refaktor ani zavádění frameworku.** Postupně a oportunisticky. Velký refaktor je historicky nejrizikovější (špatné stránky, přepsané verzované soubory, vynechávky při merge).

---
*Skills · Session 11 · 2026-06-02*
