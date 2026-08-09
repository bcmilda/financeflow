# POZNÁMKY · Session 18 — k dořešení

> Zapsáno 2026-08-03. **Nic z toho není implementováno**, Milan si to chce promyslet.

---

## 1 · Restrukturalizace landing page (nutné PŘED nasazením podstránek)

Přidáním `/funkce`, `/cenik`, `/jak-to-funguje`, `/proc-my`, `/zabezpeceni`, `/o-zakladateli` vznikly **duplicity** — landing má stejný obsah podruhé.

### Co na `index.html` zkrátit nebo odebrat

| Sekce na landingu | Kolize s | Návrh |
|---|---|---|
| Cenové karty (`#pricing`) | `/cenik` | **Nechat na landingu** (hlavní konverzní bod), ale odebrat FAQ pod nimi — to patří na `/cenik` |
| FAQ (6 otázek + FAQPage JSON-LD) | `/cenik`, `/jak-to-funguje` | Zkrátit na 3 nejdůležitější, zbytek odkázat. ⚠️ **JSON-LD musí odpovídat viditelnému textu**, jinak to Google penalizuje |
| Autorský text „Proč FinanceFlow vznikl" | `/o-zakladateli` | Zkrátit na 3–4 věty + odkaz „Přečíst celý příběh →" |
| Výčet funkcí / „Co získáš" | `/funkce` | Zredukovat na 5–6 nejsilnějších s odkazem na plný seznam |
| Cesta uživatele (5 kroků, Den 1–30) | `/jak-to-funguje` | **Ponechat** — je to vizuálně silné a je to jádro landingu. Na podstránce je jiný úhel (5 kroků nastavení, ne 30 dní) |
| Sekce „Je FinanceFlow pro tebe?" | `/proc-my` | Ponechat, ale odkázat na plné srovnání |
| Zmínky o bezpečnosti v FAQ | `/zabezpeceni` | Nahradit jedním odkazem |

### Čím nahradit uvolněné místo
- **Srovnávací tabulka** (banka vs. Excel vs. FinanceFlow) — zkrácená na 5 řádků, silný vizuální prvek
- **Screenshoty** aplikace — pořád čekají na dodání
- Blok „Co umíme jinak" s trojicí: účtenky po položkách · vlastní inflace · hodnocení útrat

### Technické
- ⚠️ `index.html` má CSS **inline**, podstránky používají `/css/landing.css`. Při úpravě stylů se musí měnit **obě místa**, jinak se rozejdou. Zvážit převod `index.html` na sdílený soubor.
- Bílé pozadí v náhledu = nenačtené `/css/landing.css` (absolutní cesta neexistuje mimo produkci). Na ostrém webu je to v pořádku, ověřeno: `body{background:var(--bg)}` je v obou.
- Do patičky doplnit IČO (Milan: později)
- `/cenik` dnes odkazuje na cenové karty zpět na `/#pricing` — po restrukturalizaci sjednotit

---

## 2 · Rozšíření Inflace životního stylu (Finanční obraz)

### ⚠️ Klíčové zjištění: z velké části už to existuje

`computeLifestyleInflation()` v `projects.js` (v8.66), **už zobrazeno ve Finančním obrazu** — tedy přesně tam, kam to Milan chce.

Dnes umí:
- průměr 1. vs 2. poloviny okna (v8.65 opraveno z „první vs poslední měsíc" kvůli šumu)
- tři stavy: `inflation` (výdaje rostou rychleji) · `squeeze` (příjmy padají, výdaje ne) · `ok`
- výstup: `incG`, `expG` v procentech

**Nejde tedy o novou funkci, ale o dopočet nad existující.** Před psaním nového kódu rozšířit `computeLifestyleInflation()`, ne psát vedle (SKILL 17).

### Co doplnit

**A) Income Growth Capture Rate** — `(ΔÚspory) / (ΔPříjem)`
- „Z nárůstu příjmu o 7 000 Kč se do úspor promítlo 0 Kč (0 %)."

**B) Změna míry úspor** — nezávislá informace, má vlastní hodnotu
- „Míra úspor klesla ze 16,7 % na 13,5 %, přestože ti měsíčně zbývá stejně."

**C) Reálný růst příjmu očištěný o osobní inflaci** ⭐ *unikát*
- Spojit s `inflace.js` (osobní inflace z účtenek)
- „Příjem +23 %, tvoje osobní inflace 9 % → reálně +14 %."
- **Tohle nemá žádný konkurent v ČR** — vyžaduje položkové účtenky

**D) Kam růst přistál: trvalé závazky vs. jednorázovky** ⭐ *nejcennější*
- Zdroj: opakované platby / šablony (`budouci.js`)
- „Ze 7 000 Kč nárůstu skončilo 4 500 Kč v pravidelných měsíčních závazcích."
- Lepkavé náklady při poklesu příjmu nezmizí — proto je to akčnější než MPC

**E) Dopad na runway rezervy**
- „Rezerva 100 000 Kč pokrývala 4,0 měsíce, nyní 3,1 měsíce."
- Nejhmatatelnější odpověď na „něco se změnilo", bez obviňování

**F) Asymetrie výdajů** (pokročilé, později)
- Reagovaly výdaje, když v minulosti klesl příjem? Měří odolnost, ne minulost.

### ❌ Co NEDĚLAT

- **Nezobrazovat MPC i Capture Rate zároveň.** Platí `ΔI = ΔE + ΔS`, tedy `Capture = 1 − MPC` — je to jedno číslo řečené dvakrát. Vybrat **Capture Rate** (dopředný, ne obviňující).
- **Nepoužívat MPC bez prahu.** Při ΔPříjem = 200 Kč a ΔVýdaje = 600 Kč vyjde 300 %. Minimální práh ~5 % nebo 2 000 Kč, jinak se metrika neukáže.
- Nespouštět pod 6 měsíců dat — pod tím je to šum.

### Povinné ošetření
- `txCZK(t,D)`, vyloučit `splitParent`, `isBalancing`, `isTransferTx` (SKILL 25)
- Ořez jednorázovek (bonus, dovolená, velký nákup) — medián nebo IQR filtr, jinak metriku rozbijí
- **Směr ≠ hodnocení.** Růst výdajů není automaticky špatně (dítě, stěhování, investice do sebe). Formulace neutrální, aplikace nikdy neoznačí útratu za zbytečnou (SKILL 22).
- Prázdný stav vysvětlí, co se prověřilo: „Zatím máš 4 měsíce dat, tuhle analýzu spustíme od 6."

### Umístění
**Finanční obraz** (Milanovo rozhodnutí, potvrzené kódem — lifestyle inflation už tam je).
ChatGPT navrhoval Finanční radar; Finanční obraz je správně, protože jde o dlouhodobý vývoj, ne o aktuální stav.

---

## 3 · Otevřené z S18

- **Screenshoty** aplikace pro landing — čeká na dodání
- **v9.43** nasadit (5 souborů: `premium.js`, `styles.css`, `app.html`, `admin.js`, `sw.js`)
- **Podstránky** nasadit až po restrukturalizaci landingu (bod 1) + `firebase.json`
- **Sekce B auditu** (13 kandidátů na zrušení) — Milan chce ověřit jednotlivě, zatím nezavřeno
- **TODO-201** portfolio ceny — čeká na rozhodnutí o tarifu (Pro vs. Premium)


---

## 4 · NÁVRH ARCHITEKTURY: Finanční obraz — metriky a podmetriky

> Rozpracováno 2026-08-03 po diskusi. **Čeká na Milanovo určení vzorce pro Skóre finančního obrazu.**

### 4.1 Přejmenování (nutné)

**Problém:** karta lifestyle inflation nemá stabilní název — mění identitu podle stavu
(`⚠️ Inflace životního stylu` / `🟡 Příjmy klesají rychleji` / `✅ Životní styl pod kontrolou`).
Metrika musí mít **trvalý název a proměnný verdikt**, ne naopak.

**Řešení:** karta se vždy jmenuje **„Životní styl"**, stav je odznak uvnitř.

**Kolize názvů:** aplikace už má *osobní inflaci z účtenek* (`inflace.js`). Druhá „inflace"
o něčem úplně jiném = zmatek, zvlášť až se obě spojí do reálného růstu příjmu.
→ **Slovo „inflace" vyhradit cenám z účtenek.** Zde použít **„Růst životního stylu"**.

### 4.2 Expense Ratio — PŘIDAT, nikoli nahradit

| | Otázka | Potřebuje historii |
|---|---|---|
| **Expense Ratio** = výdaje / příjmy | „Kolik z příjmu spotřebuju?" | ❌ funguje od 1. měsíce |
| **Růst životního stylu** = tempo výdajů vs. tempo příjmů | „Mění se to?" | ✅ 6–12 měsíců |

**Zaplňuje díru v baseline pásmu 0–6M**, kde růstové metriky nedávají smysl.
Nový uživatel dostane užitečné číslo místo prázdné karty.

**Implementace:** graf (`_obrazDivergingChart`) **zůstává**, přidá se nad něj číselný řádek.
Nová karta není potřeba.

⚠️ **Expense Ratio = 100 % − míra úspor.** Nezobrazovat obojí (stejná chyba jako MPC + Capture).
Doporučená formulace: *„Tvůj životní styl spotřebuje 86 % příjmu. Před rokem 83 %."*

### 4.3 Struktura metrika → podmetrika (Milanův návrh, schváleno)

Zanoření řeší dřívější námitku proti 8 dlaždicím: vztah je viditelný, ne skrytý,
a každá podmetrika přidává **relaci**, kterou nadřazená úroveň nemá.

| Metrika (úroveň) | Podmetrika (relace) | Vzorec |
|---|---|---|
| Příjmy | **Income Momentum** | Δ příjmů mezi okny |
| Výdaje | **Expense Control** | Δ výdajů **vs.** Δ příjmů |
| Momentum | **Income Capture** | Δ úspor / Δ příjmů *(jen při růstu příjmu)* |
| Momentum | **Income Resilience** | reakce výdajů na pokles příjmu *(jen při poklesu)* |
| Dluhy | **Debt Momentum** | Δ zadlužení |
| — | **Expense Ratio** | výdaje / příjmy *(bez baseline)* |

**Capture vs. Resilience se vylučují** — mapují na existující stavy:
`inflation` → nízký Capture · `ok` → zdravý Capture · `squeeze` → Resilience.
Důvod: ΔS/ΔI dá při obou záporných hodnotách kladné číslo, takže 50 % může znamenat
„přišel jsem o 5 000" i „získal jsem 5 000".

### 4.4 Baseline — 3 pásma (Milanovo zadání)

| Dostupná data | Baseline | Aktuální okno | Dostupné metriky |
|---|---|---|---|
| **0–6 M** | ❌ není | — | jen Expense Ratio + úrovně |
| **6–11 M** | průměr 1. poloviny | průměr 2. poloviny | vše, označit „předběžné" |
| **12 M+** | průměr měsíců −12…−7 | průměr měsíců −6…−1 | vše |

⚠️ **Nutno upřesnit:** u pásma 6–11 M formulace „průměr dostupných 6–11 měsíců" nerozlišuje
baseline od aktuálního okna. Návrh výše (půlení dostupných dat) to řeší — potvrdit.

### 4.5 Rizika k ošetření

1. **Příjem = 0 Kč** (viděno ve screenshotu Finančního obrazu!) → Income Capture i Expense Control
   dělí nulou. Tvrdý guard + vlastní prázdný stav, nikdy `NaN`/`Infinity`.
2. **Nesoulad oken:** karty dnes počítají „Ø posl. 3 vs předch. 3 měs.", Capture navrhován na 6 vs 6.
   Dvě různá okna v jedné sekci se rozejdou a uživatel to nepozná.
   → **Sjednotit, nebo u každé podmetriky viditelně uvést okno.**
3. **Pravidelný vs. celkový příjem:** pro Capture použít očištěný pravidelný příjem.
   ✅ Infrastruktura **už existuje** — `cat.stable` + váhy příjmových kategorií (`projects.js:308`, TODO-072).
4. **Žádné druhé skóre.** Finanční obraz už má vlastní skóre 0–100 („Zhoršuji se 35/100")
   vedle finančního skóre 0–310. Třetí agregát nepřidávat.
   → Milan určí, jak nové podmetriky vstoupí do **stávajícího** skóre 0–100.
5. `txCZK(t,D)`, vyloučit `splitParent`, `isBalancing`, `isTransferTx` (SKILL 25).
6. Jednorázovky (bonus, dovolená, velký nákup) rozbijí Δ — 6M průměry tlumí, ale strukturální
   jednorázovky (prodej auta) ne. Zvážit ořez IQR.
7. **Rozšířit `computeLifestyleInflation()`**, nepsat vedle něj nový výpočet (SKILL 17).

### 4.6 Čeká na Milana

- [ ] **Vzorec pro Skóre finančního obrazu** — jak nové podmetriky vstoupí do stávajícího 0–100
- [ ] Potvrdit půlení dat v pásmu 6–11 M
- [ ] Sjednotit okno 3v3 vs 6v6, nebo přijmout dvě okna s viditelným popiskem
- [ ] Expense Ratio, nebo míra úspor? (jsou komplementární, jen jedno)
