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

### ARCHITEKTURA A PRÁCE SE STAVEM (STATE MANAGEMENT) — STRIKTNÍ PRAVIDLA

1. **Zákaz mutace v renderu:** Renderovací (UI) funkce **NIKDY** nesmí mutovat globální stav `S`. Mají **přísný zákaz** cokoliv přepisovat.
2. **Čisté výpočty:** Výpočetní funkce a analytika (např. `*BuildData(D)`) pouze **přijímají data `D`**, provedou logiku a **vrací** nově vypočtené hodnoty. Žádný side-effect na `S`.
3. **Změny stavu:** Jakákoliv manipulace se stavem `S` (přidání, smazání, úprava) probíhá **striktně odděleně v akčních funkcích (handlerech)** – nikdy ne během vykreslování stránky.
4. **Využívání helperů:** Pro vizuální komponenty primárně používej funkce z `helpers.js` – v tomto projektu jmenovitě **`statCard(value,label,color,opts)`, `statGrid(cards,cols)`, `emptyState(icon,title,desc)`, `sectionCard(title,bodyHtml,opts)`, `escHtml(s)`**. Zamez duplikaci inline HTML bloků (nepsat všude `<div style="background:var(--surface2);border-radius:10px;...">`).
   - *(Pozn.: Gemini navrhovala názvy `uiStatCard`/`uiEmptyState`; v repu jsou reálně bez prefixu `ui` – platí názvy výše.)*

### Oportunistický refaktor + vzor Build/Render
- Pravidlo **„když už to otevírám, tak to po sobě uklidím"** je nejbezpečnější cesta k udržitelnému kódu.
- U **nových** funkcí rovnou nasadit oddělení dat (`buildData`) a UI (`renderHTML`).
- **Stará monstra** (např. `renderKomunita`) nechat v klidu žít, dokud do nich nemusíš sáhnout kvůli nové funkcionalitě.
- **ŽÁDNÝ big-bang refaktor ani zavádění frameworku.** Velký refaktor je historicky nejrizikovější (špatné stránky, přepsané verzované soubory, vynechávky při merge).

> Pozn.: tato pravidla přímo řeší dvě opakované chyby – **problikávání** (render mutoval/překresloval zbytečně) a **mutaci dat** (FIX-090 mutace `scoreState`).

---
*Skills · Session 11 · 2026-06-02*
