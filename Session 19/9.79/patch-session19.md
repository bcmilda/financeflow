# PATCH · Session 19 — v9.78 → v9.79

**Datum:** 2026-08-17 · **Téma:** TODO-211 · Predikce příjmů + kalendář „Příští měsíc"
**Stav:** připraveno k nasazení, **neotestováno na produkci**

---

## 1 · Co přibylo

Nová karta **📅 Příští měsíc** (menu → Plánování, hned za Finančním radarem). **Tarif Free.**

Odpovídá na otázku, kterou aplikace dosud neuměla: *„vyjdu do 15., než přijde výplata?"*

| | |
|---|---|
| Horizont | **Jen příští měsíc.** Delší výhled zůstává v „Kam směřuju" (6 měsíců) |
| Struktura | Dvě tabulky s konkrétními daty (Příjmy · Výdaje) + průběžný zůstatek den po dni |
| Režim | Přepínač **kalendářní měsíc** ↔ **od výplaty k výplatě** (výchozí kalendářní) |
| Reaktivita | Cíl = `S.curMonth + 1` → přepnutí měsíce v horní liště posune i výhled |

### Tři úrovně jistoty

| | Zdroj | Do součtu |
|---|---|---|
| 🟢 **jisté** | opakovaná šablona nebo splátka s konkrétním datem | ✅ |
| 🟡 **pravděpodobné** | pravidelný příjem podle historie 6 měsíců (`stabilityWeight ≥ 0,7`) | ✅ |
| ⚪ **nejisté** | nepravidelný příjem (brigáda, prodej) | ❌ zvlášť, „kdyby všechno vyšlo" |

Bez tohoto rozlišení by matka na mateřské viděla optimistický průměr včetně loňské brigády
a plánovala podle čísla, které nepřijde. To byl hlavní důvod celého zadání.

### Ruční úprava
Tlačítko **✎** přepíše částku kteréhokoli řádku, **✕** ho z výpočtu vyřadí.
Navíc lze zadat **počáteční zůstatek** (s předvyplněním z `computeBank()`).
Ukládá se do `S.pristiCfg['YYYY-MM']`, synchronizuje se mezi zařízeními,
tlačítko „Zrušit ruční úpravy" vrátí měsíc na automatický odhad.

### Kalibrace
Když se přepne na už proběhlý měsíc, karta ukáže **odhad vedle skutečnosti** a odchylku v %.
Uživatel sám pozná, jestli se dá predikci věřit — nemusíme mu to tvrdit.

---

## 2 · Ošetřené dvojí počítání (největší riziko funkce)

Obojí je uživateli **vypsané přímo pod tabulkou**, ne schované — aby číslu rozuměl.

**Příjmy:** dopočet z historie se snižuje o částku, kterou už pokrývá šablona.
Když má výplatu jako šablonu (28 400) a historie kategorie ukazuje 30 900, ukáže se jen
rozdíl 2 500 jako „nad rámec šablony". Dopočet pod 300 Kč se neukazuje vůbec.

**Výdaje:** `odhad běžných výdajů = Σ predictCat(všechny výdajové kategorie) − známé platby s datem`.
Bez odečtu by nájem a splátka vešly do součtu dvakrát (jednou jako řádek s datem, podruhé
uvnitř predikce, která je počítá z historie).

**Spoření a přesuny** mají vlastní kartu a do „zbude odhadem" se **nepočítají** — peníze
neodcházejí, jen se přesouvají. ⚠️ *K rozhodnutí: z pohledu běžného účtu ale odtečou.*

---

## 3 · Změněné soubory

| Soubor | Změna | Nasazení |
|---|---|---|
| **`js/pristi.js`** | 🆕 **NOVÝ** · 38. modul, 480 řádků | Firebase Hosting |
| `app.html` | nav položka `navPristi`, `page-pristi`, script tag, verze ×3, rehash | Firebase Hosting |
| `js/app.js` | `PAGE_TITLES.pristi` + `pristiCfg` na **4 místech** | Firebase Hosting |
| `js/ui.js` | 1 řádek dispatch v `renderPage` | Firebase Hosting |
| `js/admin.js` | `VERZE_LOG` v9.79 | Firebase Hosting |
| `sw.js` | verze + `CACHE_NAME = 'ff-shell-v9.79'` | Firebase Hosting |

**Firebase pravidla se měnit NEMUSÍ** — `pristiCfg` leží pod `users/{uid}/data`, kde `.write`
kaskáduje z `users/$uid` (SKILL 13). Cloudflare Worker beze změny.

### ⚠️ Vedlejší nález — opraven
`announcements.js` měl v `app.html` **zastaralý hash** (`3cfc9cd5…`, skutečný `5ebbdf74…`).
Uživatelům s naplněnou cache se tedy servírovala stará verze modulu oznámení.
Hash opraven. Neví se, od které verze to trvalo — stojí za rychlé ověření, že se oznámení
zobrazují správně.

---

## 4 · Rollback

### Rychlá cesta (30 sekund, bez mazání)
V `js/pristi.js` na řádku 22:
```js
const PRISTI_ENABLED = false;   // bylo true
```
→ položka v menu se skryje, stránka se nevykreslí, nic jiného se nemusí sahat.
Rehashovat `pristi.js` v `app.html` a nasadit.

### Úplné odstranění (5 kroků)
1. **Smazat** `js/pristi.js`
2. `app.html` — smazat 3 bloky: řádek `<div class="nav-item" id="navPristi" …>`,
   celý `<div class="page" id="page-pristi">…</div>`, řádek `<script src="js/pristi.js…">`
3. `js/ui.js` — smazat řádek `if(curPage==='pristi'&&typeof renderPristiPage…`
4. `js/app.js` — smazat **4 výskyty** `pristiCfg` (`_DW_META`, `_dwMetaVals`, oba snapshoty)
   + `pristi:'📅 Příští měsíc'` z `PAGE_TITLES`
5. Rehashovat `app.js`, `ui.js` (a odebrat `pristi.js`) v `app.html`, bumpnout verzi

**Data:** uzel `users/{uid}/data/pristiCfg` zůstane ve Firebase ležet nevyužitý.
Nevadí — obsahuje jen ruční úpravy odhadu, žádné transakce. Smazat jde ručně v konzoli.
**Žádná migrace se nedělá, žádná existující data se nemění.**

---

## 5 · Testy před dodávkou

| Kontrola | Výsledek |
|---|---|
| `node --check` (5 změněných souborů) | ✅ |
| Kontrola TDZ (acorn parser, SKILL 23) | ✅ 0 nálezů |
| Runtime smoke test | ✅ **44/44** |
| Balance `<div>` v `app.html` | ✅ 1041 = 1041 (+6 oproti originálu, což je nová stránka) |
| Konzistence všech 33 `?v=` hashů | ✅ (`admin.js` hashován jako poslední) |
| Kolize globálních jmen napříč 37 moduly | ✅ 0 |
| Existence 24 volaných externích funkcí (SKILL 24) | ✅ ověřeno grepem |

### Co smoke test pokrývá
Oba režimy (kalendářní / od výplaty) × prázdná i plná data, dále:
šablona nezdvojuje historii · EUR příjem přes `txCZK` (2 500, ne 100) ·
`splitParent` / `isBalancing` / přesuny se do příjmů nedostanou ·
nepravidelný příjem je mimo plán · spoření mimo výdaje ·
vzorec odhadu (`predTotal − knownExp`) · ruční úprava i vypnutí řádku ·
`viewingUid` nenabízí editaci · přelom roku (prosinec → leden 2027) ·
už proběhlý měsíc (kalibrace) · **nikde `NaN` / `undefined` / `Infinity` v HTML**.

---

## 6 · Co jsem záměrně NEUDĚLAL

- **`budouci.js` zůstává beze změny.** `if (s.type === 'income') return;` tam nechávám —
  sekce se jmenuje Budoucí platby a příjmy by zkreslily součty i grafy Radaru.
  Nový modul si příjmové šablony načítá vlastním průchodem `D.sablony`.
- **`predictCat()` jsem nesahal.** Změna sdíleného výpočtu vyžaduje audit všech
  6 spotřebitelů (SKILL 12), a nebylo to potřeba.
- **PDF export** (Krok 5 plánu) — samostatné téma, tisková CSS + `window.print()`.
- **Návaznost na Radar** (křížové odkazy) — v modulu odkazy na Obraz a Budoucí platby jsou,
  opačným směrem zatím ne.

---

## 7 · Nalezená chyba k rozhodnutí (nebyla opravena)

`getHistAvg()` v `helpers.js` (základ `predictCat`) používá **`t.amt`, nikoli `txCZK(t, D)`**
a **nevylučuje `splitParent`**. Predikce výdajů tedy sčítá cizí měny v nominálu a započítává
rozdělené transakce dvakrát. Týká se to všech 6 míst, která `predictCat` volají
(Predikce, Radar, Finanční obraz, Transakce, Report, nově i Příští měsíc).

**Neopravil jsem to zde** — je to změna sdíleného výpočtu a podle SKILL 12 vyžaduje
audit všech spotřebitelů, což je samostatný úkol. **Návrh: založit jako FIX-252, P2.**

---

## 8 · Otevřené otázky pro Milana

1. **Spoření a přesuny** — nechat mimo „zbude odhadem" (dnes), nebo je do zůstatku započítat?
   Z účtu odtečou, ale nejsou to výdaje.
2. **Počáteční zůstatek** — teď se zadává ručně (s předvyplněním z `computeBank()`).
   Dopočítávat ho projekcí zbytku aktuálního měsíce by přidalo nepřesnost na nepřesnost.
3. **Práh nejistoty** `stabilityWeight ≥ 0,7` — sedí? (`regular` 1,0 · `passive` 0,7 ·
   `irregular` 0,4 · `onetime` 0,0 dle ADR-044). Při 0,7 spadne pasivní příjem ještě do
   „pravděpodobných".
4. **Okno historie 6 měsíců** pro odhad příjmů — víc už tlumí změnu (zvýšení platu),
   míň je šum.
5. **Umístění v menu** — teď Plánování za Radarem. Nemá být výš, když je to Free
   a pro nováčka srozumitelnější než Radar?
