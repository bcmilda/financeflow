# Návrh SKILL 26 · Peníze a měny

Zatím máme jen **SKILL 20** (agregace přes `txCZK`). Ten řeší **sčítání**, ne **zobrazení**
ani **zadávání** — a přesně tam vznikly chyby S19. Tohle je návrh k doplnění do
`CLAUDE_SKILLS.md`.

---

## Tři vrstvy, tři pravidla

| Vrstva | Pravidlo | Funkce |
|---|---|---|
| **Uložení** | Vnitřní jednotka je **vždy CZK**. Cizí měna se ukládá do `t.amtCZK` a **už nikdy se nepřepočítává** živým kurzem | `t.amount` = původní · `t.amtCZK` = zafixovaná CZK |
| **Sčítání** | **Vždy** `txCZK(t, D)`. Nikdy `t.amount \|\| t.amt` | SKILL 20 |
| **Zobrazení** | **Vždy** `fmtB(v)`. Nikdy `fmt(v) + ' Kč'` | `fmtB` = převod + symbol |

## ⚠️ Nikdy neprovádět plošnou náhradu `fmt(` → `fmtB(`

Tři pasti, na které jsem narazil v S19:

**1. Dvojí převod.** `fmt(Math.round(czkToBase(v)))` už převedeno má.
Náhrada za `fmtB` převede podruhé. → Doplnit jen symbol: `+ ' ' + curSym()`.

**2. Nepeněžní hodnoty.** `fmt()` se používá i na počty kusů, procenta, dny.
→ Před náhradou zkontrolovat, co proměnná znamená.

**3. Kontext, který není obrazovka.** `ai.js` staví prompt pro model.
Vnitřní jednotka je CZK, takže „Kč" je tam **správně**. Míchat v jednom promptu
koruny a základní měnu by model mátlo. → Nechat.

## Zadávání: měna vyhrává podle peněženky

- Popisek pole ukazuje **měnu vybrané peněženky** (`_txEntryCur()`), ne základní měnu.
  Platíš-li z korunového účtu, zadáváš koruny.
- Základní měna se použije, **jen když není vybraná žádná peněženka**.
- U přesunů mezi peněženkami je zdrojová měna **měna zdrojové peněženky** —
  `_txEntryCur()` tam vrací `'CZK'` schválně (kvůli skrytí pole „Skutečně v Kč"),
  takže se **na ni nesmí spoléhat** nikde jinde. To byl FIX-255.

## 🚩 Nejnebezpečnější past: popisky vstupních polí

**Změnit `<label>Rozpočet (Kč)</label>` na základní měnu BEZ převodu na vstupu
je horší než nechat špatný popisek.** Hodnota se ukládá syrově jako CZK — uživatel
by napsal `1000` s myšlenkou „1 000 €" a uložilo by se **1 000 Kč**. Tichá ztráta dat.

Správná oprava je **vždy dvoudílná**:
1. popisek → `curSym()`
2. převod **na obou stranách**: základní měna → CZK při ukládání,
   CZK → základní měna při načtení do editace

Chybí-li krok 2, změnu popisku **nedělat**.

## Kontrolní seznam před dodávkou

- [ ] Každá agregace přes `txCZK(t, D)`, s vyloučením `splitParent`, `isBalancing`, `isTransferTx`
- [ ] `D` je v dosahu na každém místě, kde volám `txCZK(t, D)`
- [ ] Žádné `fmt(x) + ' Kč'` u částky na obrazovce
- [ ] Žádné `fmtB()` nad hodnotou, která už prošla `czkToBase()`
- [ ] Popisek vstupního pole měněn jen společně s převodem na obou stranách
- [ ] Porovnávání částek (např. „největší příjem") také přes `txCZK` —
      jinak 1 200 EUR prohraje s 3 000 Kč (FIX-254)
