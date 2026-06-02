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

---
*Skills · Session 10 · 2026-06-01*
