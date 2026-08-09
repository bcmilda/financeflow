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

### 4.2 Expense Ratio — ⚠️ UŽ EXISTUJE, jen ho vytáhnout

**Zjištění 2026-08-03:** Expense Ratio se v aplikaci **už počítá i zobrazuje**.

| Kde | Vzorec | Role |
|---|---|---|
| **`expRatio`** — `premium.js:1305`, `finScoreS1()` | výdaje / příjmy | **složka S1 Cash flow skóre 0–310** (max 75 b, tabulka v `scoring-config.json`) |
| `activeSavingRate` — S4 | investice / příjem | složka Spoření |
| `savingRate` — `admin.js:5003` | (příjem − výdaje) / příjem | **jen komunitní agregace**, uživateli se nezobrazuje |

→ **Nedefinovat nový výpočet.** Vzít `expRatio` z engine skóre a zobrazit ho ve Finančním obrazu.
Zaručí to, že Finanční obraz a skóre 0–310 neukážou rozporná čísla (SKILL 17).
Ve skóre už má i popisek: `🟡 Výdaje 86% příjmu` (`premium.js:1356`).

**Stávající větu ponechat** — nepřekrývá se, každá odpovídá na jinou otázku:

> **Růst životního stylu**
> Tvůj životní styl spotřebuje **86 % příjmu**.
> Průměr 2. vs 1. poloviny okna: příjmy −56 % · výdaje −53 %. Výdaje nerostou rychleji než příjmy.

### 4.2b Proč obojí

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

> **Oprava atribuce (2026-08-03):** okno „6 vs 6" NEnavrhl Milan — pochází z odpovědi ChatGPT,
> kterou Milan vkládal do konverzace. Dřívější poznámka to připisovala Milanovi chybně.

| Dostupná data | Baseline | Aktuální okno | Dostupné metriky |
|---|---|---|---|
| **0–6 M** | ❌ není | — | jen Expense Ratio + úrovně |
| **6–11 M** | průměr 1. poloviny | průměr 2. poloviny | vše, označit „předběžné" |
| **12 M+** | průměr měsíců −12…−7 | průměr měsíců −6…−1 | vše |

⚠️ **Nutno upřesnit:** u pásma 6–11 M formulace „průměr dostupných 6–11 měsíců" nerozlišuje
baseline od aktuálního okna. Návrh výše (půlení dostupných dat) to řeší — potvrdit.

### 4.4b Horizonty — doporučení proti roztříštění

Milan zvažoval 6M + 12M + historii. Riziko: **6 podmetrik × 3 horizonty = 18 čísel** na obrazovce.

**Doporučení:** postavit **jen 6M**, u každé podmetriky viditelně uvést okno.
Přepínač 6M/12M přidat později jako **jednu volbu nahoře přepínající vše naráz**, ne tři sady vedle sebe.
Historie (100M) až nakonec, pokud vůbec.

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

---

## 5 · ROZHODNUTÍ (2026-08-03, Milan)

### ✅ Expense Ratio, ne Saving Rate
Jsou komplementární (`ER = 100 % − SR`), zobrazit jen jedno.
Bere se **`expRatio` ze složky S1 skóre 0–310** (`premium.js:1305`), nedefinovat nový výpočet.

### ✅ Zůstává ve Finančním obrazu, nová sekce NEvzniká
Zvažováno založit samostatnou sekci „Růst životního stylu". **Zamítnuto:**
1. Tyto metriky jsou definicí Finančního obrazu (viz jeho vlastní popisek) — po vytažení
   by zbyla prázdná sekce a nová by převzala její roli. Dvě sekce dělající totéž.
2. `renderObraz()` už staví 6M řadu (příjmy, výdaje, dluhy, saldo), kterou všechny nové
   metriky čtou. Nová sekce = druhý výpočet téhož = scénář Inflace vs. Zdražování (SKILL 17).
3. Skrytá cena nové sekce: navigace, render, anti-flicker guard, prázdné stavy, Firebase pravidla.

**Hustota se řeší sbalitelnými řádky**, ne novou sekcí:
`🏠 Lifestyle` · `🏖️ Nezávislost a stabilita` · `💎 Majetek` — rozbalený jen aktivní.
Pokud to za ~6 měsíců přeroste, vytáhnout ven **tehdy** (opportunistický refaktor).

### ✅ FÁZE 1 = data naplocho, BEZ bodování
Skóre je komprese — když se postaví dřív, než je vidět chování čísel na reálných datech,
nejde poznat, že je pod ním chyba. **Prahy nelze odvodit bez rozptylu reálných dat**
(je Income Capture 40 % dobrý výsledek? dnes to neví nikdo).

**Postup:** nejdřív čísla a tabulky → 2–3 měsíce provozu → teprve pak vzorec skóre.
Stávající skóre 0–100 zůstává beze změny, nové metriky ho zatím **nekrmí**.
⚠️ V kódu označit komentářem jako **záměrnou fázi, ne nedodělek**.

### Metriky k implementaci (fáze 1)
| Metrika | Podmetrika | Okno | Poznámka |
|---|---|---|---|
| Příjmy | Income Momentum | 3M vs 3M | |
| Výdaje | Expense Control | 3M vs 3M | výdaje **vůči** příjmům |
| Momentum | Income Capture / Resilience | 6M vs baseline | vzájemně se vylučují |
| Dluhy | Debt Momentum | 3M vs 3M | **v Kč**, ne v %; vyloučit mimořádné splátky |
| FFR | FFR Momentum | 6M vs baseline | bez půlení okna |
| Likvidita | Liquidity Momentum | 6M vs baseline | bez půlení okna |
| Čisté jmění | Net Worth Momentum | 6M vs baseline | **nové** — rozdělit na vlastní spoření vs. růst tržní hodnoty |
| Růst životního stylu | Expense Ratio + Kam růst přistál + Reálný růst | 6M | tabulka baseline vs. aktuální |
| Cesta fin. zdraví | Monthly Score + 6M Momentum Score | 6M | vodopád složek |

**Každá podmetrika má vysvětlivku „Co to je"** — v UI jako ⓘ tooltip / rozbalovací text,
ne natrvalo viditelné (zdvojnásobilo by výšku karet).

**Model k náhledu:** `model-financni-obraz-v2.html`

---

## 6 · Přepínač okna ve Finančním obrazu (2026-08-03)

**Vzor už existuje:** `cycSetMode()` v `projects.js:2672` — přepnout režim → `renderObraz()`,
včetně hotového stylu tlačítek (`projects.js:2781`). Nepsat novou komponentu (SKILL 17).

### ✅ JEDNO pravidlo místo tří baseline pásem

> **Okno se vždy rozpůlí a porovná se 2. polovina s 1. polovinou.**

| Přepínač | Porovnání | Potřeba dat |
|---|---|---|
| Auto (nový uživatel) | půlka dostupných měsíců | 2+ měsíce |
| **6M** — výchozí | 3 vs 3 | 6 měsíců |
| **12M** | 6 vs 6 | 12 měsíců |
| **Celkově** | půlka historie vs. druhá | cokoli |

**Nahrazuje dřívější 3stupňovou baseline z bodu 4.4.** Jeden vzorec pro všechny případy,
datová náročnost = délka okna, a sedí s tím, co `computeLifestyleInflation()` dělá dnes.

### ⚠️ Rizika

1. **Skóre se s oknem změní** (6M → 82, 12M → 71) a uživatel si bude myslet, že se něco pokazilo.
   → **Skóre ukotvit na 6M** jako hlavní číslo. Přepínač mění metriky a porovnání, ne skóre.
   → **Časovou osu Journey zobrazovat vždy celou** — to je ta „cesta odkud kam".
      Přepínač jen posouvá, odkud kam se počítá rozdíl (+18 bodů).
2. **„Celkově" naráží na TODO-177** (diff-write fáze 2). Načítat celou historii při každém
   renderu bude na letech dat pomalé. → Buď přidat až po TODO-177, nebo cachovat a nepřepočítávat.
3. **Volbu ukládat do `localStorage`.** `_cycMode` se dnes nepamatuje a po překreslení skočí
   na výchozí — u trackeru je to otravné.
4. Anti-flicker: přepnutí okna nesmí blikat (`_dataSig` guard).

---

## 7 · Deník: Journey + Životní mapa (zadání pro v9.45)

### Oprava mého dřívějšího tvrzení
Napsal jsem, že metriky jsou v Deníku „statické číslo v dynamickém kontextu". **Nepřesné.**
Mění se každý měsíc, a jak během měsíce přibývají transakce, posouvá se i průměr
aktuálního měsíce → hýbe se to i uvnitř měsíce. Milanova námitka byla oprávněná.

### 7.1 Journey graf (celá historie)
Časová řada **skóre 0–100 + čisté jmění** přes celou historii, bez ohledu na zvolené okno.
Odpovídá na „odkud kam to vedlo" líp než jedno číslo z 12v12.
Přepínač okna mění jen **odkud kam se počítá rozdíl**, ne rozsah grafu.

### 7.2 Životní mapa ⭐ (Milanův nápad)

**Uživatel si na časovou osu značí zlomové události:**
změna práce · narození dítěte · hypotéka · stěhování · koupě auta · nemoc · rozvod · dědictví…

**Proč je to důležité (a ne jen ozdoba):**
Dříve jsem argumentoval proti dlouhým horizontům tím, že delší okno neměří návyky,
ale životní události — metrika přestane měřit to, co tvrdí.
**Životní mapa tuhle námitku ruší:** jakmile uživatel zlomy označí, přestanou být šumem
a stanou se vysvětlením. Dlouhý horizont je najednou čitelný.

**Sedí to k filozofii appky:** místo penalizace zlomu ho aplikace vysvětlí.
Dítě zhorší Expense Ratio, Income Capture i rezervu — bez kontextu to vypadá jako selhání,
s popiskem na mapě je to fakt, ne výtka. Aplikace nikdy nehodnotí, jen ukazuje (SKILL 22).

**Vedlejší přínos:** umožní srovnání **před událostí vs. po ní**, ukotvené na skutečném zlomu
místo na libovolném okně. Nahrazuje potřebu 12v12 / 24v24 lépe než větší okno.

### 7.3 Technické

- **Datový model:** `D.milestones[] = {id, date, label, icon, note}`
  - ⚠️ **Nový uzel → nové Firebase pravidlo**, jinak tichý PERMISSION_DENIED (poučení FIX-220)
  - ⚠️ **Doplnit do schématu `saveToFirebase`**, jinak sync pole tiše smaže
- **Kde se zadává:** Deník (je to jeho přirozené místo — deník života i financí)
- **Kde se zobrazuje:** svislé značky na Journey grafu ve Finančním obrazu + v Deníku
- **Sdílený výpočet:** Deník i Obraz musí číst z `computeObrazSubmetrics()` (v9.44),
  ne počítat podruhé (SKILL 17)
- Graf: povinné náležitosti (osy, legenda, tooltip, `max-width` + `preserveAspectRatio`)
- Značky nesmí překrývat data ani při 5+ událostech v jednom roce — zvážit shlukování

### 7.4 Otevřené
- Přednastavený seznam událostí, nebo volný text? (návrh: seznam + „vlastní")
- Má událost ovlivnit výpočet metrik, nebo být jen vizuální kontext?
  **Návrh: jen kontext.** Automatické „odpuštění" bodů kvůli události by bylo hodnocení
  a otevřelo by dveře ke zneužití.


---

## 8 · OPRAVA: Firebase pravidla pro milestones NEBYLA potřeba (2026-08-03)

V bodě 7.3 jsem napsal „nový uzel → nové Firebase pravidlo, jinak tichý PERMISSION_DENIED".
**Při implementaci se ukázalo, že to pro tento případ neplatí.**

`users/$uid` má `.write: "auth.uid === $uid"`, který **kaskáduje dolů** —
takže `users/{uid}/data/milestones` je krytý automaticky a nové pravidlo netřeba.
Poučení FIX-220 platí pro uzly **mimo** kaskádu (např. `banned/{uid}`, `stripeCustomers`),
ne pro nové klíče uvnitř `users/$uid/data`.

Do pravidel přidána pouze `.validate` na délku `label`/`note`/`icon`
(stejný vzor jako u transakcí) — to je ochrana proti zneužití, ne podmínka funkčnosti.

**Co naopak bylo nutné a málem se přehlédlo:** registrace uzlu na **4 místech v `app.js`** —
`_DW_META`, `_dwMetaVals()` a **dva** lokální snapshoty. Bez zápisu do `_DW_META`
by se pole tiše nesynchronizovalo do cloudu (diff-write ho vůbec nevidí).
