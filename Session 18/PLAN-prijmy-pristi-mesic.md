# PLÁN · Predikce příjmů + kalendář „Příští měsíc"

**Zadala:** Milanova žena · **Session:** 18 · **Stav:** 🟢 Návrh, čeká na schválení
**Odhad:** 1 session (bez PDF) · **Dotčené:** `helpers.js`, `budouci.js`, nový modul nebo `projects.js`

---

## Co už v aplikaci JE

Prošel jsem kód, ať nestavíme podruhé to, co existuje:

| Funkce | Co umí | Co neumí |
|---|---|---|
| **Kam směřuju** (Fin. obraz) | projekce 6 měsíců dopředu | příjem = **jeden 12M klouzavý průměr**, žádný rozpad na zdroje |
| **Finanční radar** | varuje „příští měsíc splátky X = Y % příjmu" | jen varování, ne přehled |
| **Budoucí platby** (`budouci.js`) | šablony + splátky s **konkrétními daty** | ⚠️ **ř. 23: `if (s.type === 'income') return;`** — příjmové šablony se **záměrně vynechávají** |
| **Predikce výdajů** (`predictCat`) | historie + sezónnost + narozeniny | ⚠️ **natvrdo `type !== 'expense'`** — příjmy neumí vůbec |
| **Deník** | den po dni, kumulace, predikce | jen **aktuální** měsíc, ne příští |

**Závěr:** infrastruktura z 80 % existuje, ale **příjmy jsou z ní systematicky vyloučené** na dvou místech. Chybí kalendářní pohled na příští měsíc.

---

## Co postavit

### Krok 1 · Predikce příjmů (jádro)

`predictCat()` parametrizovat na typ místo natvrdo výdajů. Stejný model (historie + sezónnost),
jen nad příjmovými kategoriemi.

⚠️ **Klíčové rozlišení, bez kterého to nemá cenu:** využít existující **`stable` flag** (TODO-072).
- **Pravidelný příjem** (výplata, mateřská, alimenty) → predikce spolehlivá
- **Nepravidelný** (brigáda, prodej) → ukázat zvlášť jako „nejisté", ne míchat do jednoho čísla

Bez toho by matka na mateřské viděla optimistický průměr včetně loňské brigády a plánovala podle čísla, které nepřijde.

### Krok 2 · Příjmové šablony do budoucích plateb

Odstranit `if (s.type === 'income') return;` v `budouci.js` a doplnit parametr,
aby si volající řekl, co chce (dnes všechna volání očekávají jen výdaje — nutno projít).

Tím vzniknou **příjmy s konkrétními daty**: výplata 15., dávka 5., alimenty 18.

### Krok 3 · Kalendář „Příští měsíc" ⭐ jádro požadavku

Nové tlačítko / sekce. **Řádky podle data**, ne jeden součet:

```
📅 Září 2026 — odhad

 5. 9.   ➕ Rodičovský příspěvek      +13 900    → zůstatek 13 900
15. 9.   ➕ Výplata                   +28 400    → zůstatek 42 300
18. 9.   ➕ Alimenty                   +4 500    → zůstatek 46 800
20. 9.   ➖ Nájem                     −12 000    → zůstatek 34 800
23. 9.   ➕ Přídavek na dítě             +830    → zůstatek 35 630
25. 9.   ➖ Splátka úvěru              −3 200    → zůstatek 32 430
   měs.  ➖ Odhad běžných výdajů      −18 500    → zůstatek 13 930
─────────────────────────────────────────────────────────────
         Jisté příjmy      47 630 · Nejisté   0
         Známé platby      15 200 · Odhad    18 500
         ZBUDE ODHADEM     13 930
```

**Tři úrovně jistoty, vizuálně odlišené:**
1. 🟢 **Jisté** — šablona nebo splátka s datem
2. 🟡 **Pravděpodobné** — pravidelný příjem podle historie (bez šablony)
3. ⚪ **Odhad** — predikce běžných výdajů, rozpuštěná přes měsíc

Sloupec **průběžného zůstatku** je to hlavní: odpovídá na „vyjdu do 15., než přijde výplata?".

### Krok 4 · Porovnání se skutečností

Když měsíc proběhne, u každého řádku přibude skutečná částka a odchylka.
Tím se predikce sama kalibruje a uživatel vidí, jestli jí může věřit.

*(Přesnost predikce už se v appce měří — TODO-098. Napojit, ne psát znovu.)*

### Krok 5 · PDF export 🟡 samostatně

Aplikace **zatím žádný PDF export nemá** (TODO-193 ho měl mít pro Report, neudělal se).

Nejlevnější cesta: **tisková CSS třída + `window.print()`** → uživatel si zvolí „Uložit jako PDF".
Žádná knihovna, funguje všude, jde založit do diáře. Skutečnou PDF knihovnu (jsPDF) jen tehdy,
kdyby to nestačilo.

---

## Kam to umístit

**Doporučuji: samostatná karta „Příští měsíc"** v sekci Analýzy, ne přílepek k Deníku.

Důvod: Deník řeší **aktuální** měsíc a má vlastní vizuální jazyk (papír, kronika). Míchat do něj
výhled by rozmazalo jeho účel. Naopak z Deníku i z Finančního radaru na novou kartu odkázat.

⚠️ **Vyhnout se duplicitě s „Kam směřuju":** ta zůstane u 6měsíčního trendu (kam dlouhodobě míříš),
nová karta řeší **jeden konkrétní měsíc po dnech** (co se stane teď). Doplnit do obou křížový odkaz,
aby bylo jasné, která odpovídá na kterou otázku.

---

## Na co si dát pozor

- **`stable` flag rozhoduje o důvěryhodnosti.** Bez rozlišení jistý/nejistý příjem je celá karta zavádějící.
- **Nepočítat převody** — `isTransferTx`, `splitParent`, `isBalancing` (SKILL 25).
- **Cizí měny přes `txCZK`.**
- **Prázdný stav musí vysvětlit**, co chybí: „Zadej opakované příjmy jako šablony a uvidíš přesná data."
- **Nikdy netvrdit jistotu.** Formulace „odhadem", „pravděpodobně" — ne „budeš mít". Kdo si podle toho naplánuje výdaj a příjem nepřijde, přijde o důvěru v celou aplikaci.
- **Nezobrazovat záporný zůstatek jako poplašnou zprávu** — u nepravidelných příjmů je to běžné a appka nemá strašit (SKILL 22).

---

## Otevřené otázky

1. **Kolik měsíců dopředu?** Návrh: jen příští (jak žena chtěla). Víc měsíců už řeší „Kam směřuju".
2. **Free, nebo Premium?** Predikce příjmů je silný argument pro Premium, ale zrovna tahle funkce
   nejvíc pomůže lidem s nepravidelným příjmem — tedy těm, kdo mají nejmíň peněz. Zvážit Free.
3. **Ruční úprava odhadu?** Uživatel často ví víc než historie („příští měsíc brigáda nebude").
   Možnost přepsat řádek by přesnost výrazně zvedla.

---

# ROZHODNUTÍ A UPŘESNĚNÍ (Milan, 2026-08-03)

## Schváleno

| Otázka | Rozhodnutí |
|---|---|
| Kam to umístit | **Nový samostatný modul** – ať se nemíchají dvě logiky |
| Tarif | **Free** |
| Horizont | Jen **příští měsíc** |
| Ruční úprava odhadu | **Ano** |
| Rozlišení jistoty | **Ano, přes `stable` flag (TODO-072)** |
| Struktura | **Dvě tabulky:** Příjmy + data · Výdaje + data |

## Otevřená otázka: kdy začíná „měsíc"?

Milan správně upozornil, že kalendářní měsíc a finanční cyklus nejsou totéž.

**Návrh: přepínač se dvěma režimy, výchozí kalendářní.**

1. **Kalendářní** (1.–31.) – srozumitelné, sedí s nájmem, splátkami a fakturami
2. **Od výplaty k výplatě** – odpovídá realitě člověka, jehož měsíc reálně začíná 15.

⚠️ **Druhý režim už v aplikaci existuje** – payday cykly ve Finančním obrazu (sekce 8) a `P.lastPayday`.
Nepočítat znovu, jen převzít (SKILL 17).

## Budoucí platby: NEZAHRNOVAT příjmy (revize dřívějšího návrhu)

Milanova námitka je správná: sekce se jmenuje **Budoucí platby** a příjmy by tam zkreslovaly součty i grafy.

**Revidovaný postup:** `if (s.type === 'income') return;` v `budouci.js` **ponechat**.
Nový modul si příjmové šablony načte sám vlastním průchodem `D.sablony` – to je pár řádků
a nezasahuje to do existující logiky, na které visí grafy Radaru.

*(Poznámka k Milanovu dotazu: budoucí platby se generují ze splátek půjček, cílů, narozenin
a opakovaných šablon. Ručně do nich zadat nejde – proto se příjmy musí brát ze šablon přímo.)*

## Rozšíření nad rámec původního zadání

### A) Příjmy do tabulky Predikce
V grafu Přesnost už **příjem predikce i skutečnost existují** (viz screenshot).
Chybí jen v detailní tabulce po kategoriích. **Návrh: přepínač Výdaje / Příjmy**, ne míchat do jedné
tabulky – jinak se ztratí přehled o tom, co je co.

### B) „Kam směřuju" s daty příjmů
Milanův nápad: doplnit do Radaru predikci příjmu **s konkrétními daty**, čímž by projekce nemusela
končit u jednoho měsíce.

**Souhlasím, ale s výhradou:** přesnost s časem klesá rychle. Doporučuji **první měsíc po dnech,
další měsíce jen jako měsíční souhrn** – jinak appka slibuje přesnost, kterou nemá.
Kalibraci řeší následující měsíc, jak Milan navrhl (a přesnost predikce už se měří, TODO-098).

---

# 🐛 NALEZENÁ CHYBA V RADARU (při kontrole, 2026-08-03)

**Milan nahlásil:** ve „Kam směřuju" se nezobrazují budoucí platby ani predikce.

**Ověřeno v kódu – není to chyba dat, ale záměrné chování s nechtěným dopadem:**

```js
// projects.js:1259
const budToEOM = (isCurrentMonth ? budItems : []).filter(...)
```

Když uživatel přepne na **jiný než aktuální měsíc**, budoucí platby se **vynulují na prázdné pole**.
Proto na screenshotu:

| | Kam směřuju | Nadcházející platby |
|---|---|---|
| Září 2026 | Budoucí platby **0** | **66 902 Kč** |
| Říjen 2026 | Budoucí platby **0** | **67 513 Kč** |

Dvě sekce na jedné obrazovce ukazují **rozporná čísla ze stejných dat**.

**Proč to tak vzniklo:** logika počítá „kolik ZBÝVÁ do konce měsíce", což u minulého měsíce
opravdu nedává smysl (všechno už proběhlo). U **budoucího** měsíce ale smysl dává –
tam ještě neproběhlo nic, takže by se měl ukázat celý plán.

**Návrh opravy (FIX-247):**
- **minulý měsíc** → 0 (správně, nic nezbývá)
- **aktuální** → jen platby od dneška do konce měsíce (dnešní chování)
- **budoucí** → **celý plán daného měsíce** + popisek „plán měsíce", ne „zbývá"

Zároveň sjednotit s kartou Nadcházející platby, aby obě braly stejný zdroj.
