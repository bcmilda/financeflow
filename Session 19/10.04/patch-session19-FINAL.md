# PATCH · Session 19 — v9.78 → v9.98

**20 verzí** · nový modul `pristi.js` (38. modul) · 12 nástrojů v `tools/`
· 8 oprav označených FIX · 7 nových TODO

---

## 1 · Co se nasazuje

Všechny soubory najednou, **`worker.js` zvlášť do Cloudflare**.

| Soubor | Verze | Hlavní důvod změny |
|---|---|---|
| **`js/pristi.js`** | 🆕 v9.94 | nový modul – karta Příští měsíc |
| `js/projects.js` | v9.97 | Osa života, karta Projektu, Detektor, kurzové nálezy |
| `js/debts.js` | v9.97 | přepínač měny, kurzové ztráty, párování amtCZK+fxRef |
| `js/kurzy.js` | v9.97 | historický kurz ČNB k datu transakce |
| `js/admin.js` | v9.98 | evidence aktivity, referral, VERZE_LOG |
| `js/ui.js` | v9.96 | filtr měn, kurzová ztráta v řádku, dispatch |
| `js/helpers.js` | v9.95 | FIX-252, TODO-212, peněžní pole, kurzové výpočty |
| `js/review.js` | v9.93 | měsíční review fáze 2+3 |
| `js/premium.js` `js/assets.js` `js/nakup.js` `js/charts.js` | v9.91 | vstupní pole v základní měně |
| `js/settings.js` | v9.88 | zálohy dat |
| `js/app.js` | v9.87 | zálohy, evidence aktivity, `pristiCfg` |
| `js/transactions.js` | v9.84 | základní měna v Predikci |
| `js/stats.js` `js/ai.js` | v9.81 | `txCZK` v agregacích |
| `app.html` · `sw.js` | v9.98 | verze, hashe, nová pole a stránka |
| **`worker.js`** | v9.97 | ⚠️ **Cloudflare, nasazuje se zvlášť** |

**Firebase pravidla se nemění.** Nové uzly (`activity`, `backups`, `pristiCfg`)
leží pod `users/$uid`, kde zápis kaskáduje a čtení má vlastník s adminem.

---

## 2 · Nové funkce

**📅 Příští měsíc** (TODO-211, Free) — jediná karta, která odpoví na „vyjdu do výplaty".
Tři úrovně jistoty; nejisté příjmy se do plánu **nezapočítávají**. Přepínač
kalendářní ↔ výplatní cyklus, ruční úprava i vlastní zápis kteréhokoli řádku,
průběžný zůstatek den po dni. Rollback: `PRISTI_ENABLED = false`.

**🛡️ Automatické zálohy** (TODO-208) — denní snímek do `users/{uid}/backups`,
posledních 5, obnova s pojistkou „pred-obnovou". Do dneška aplikace neměla
**žádnou** automatickou zálohu.

**💱 Kurzové ztráty** (TODO-215) — přepínač měny u transakce, referenční kurz ČNB
k **datu transakce**, výpočet marže banky, rozpad po transakcích a nález
v Detektoru podle způsobu platby.

**📊 Evidence aktivity** (TODO-213) — `users/{uid}/activity`, přepočítané skóre,
filtry a metriky v adminu. Bez IP, polohy a otisku zařízení.

**⭐ Měsíční review fáze 2+3** (TODO-198) — souhrn hodnocení v Deníku a vzorce
(den v týdnu, způsob platby, druh nákupu, velikost útraty).

**🗺️ Osa života** (TODO-207/B) a **📁 karta Projektu** (TODO-217) — čas vedle peněz,
graf kumulativní útraty, srovnání s podobnými projekty.

**💶 Základní měna** — 143 míst převedeno na `fmtB()`, 20 vstupních polí
převádí na obou stranách.

---

## 3 · Opravy

| | Co bylo špatně | Dopad |
|---|---|---|
| **FIX-252** | `getHistAvg()` sčítal přes `t.amt` a nefiltroval splity | cizí měny v nominálu, splity dvakrát — **celý predikční engine** |
| **FIX-253** | kotva výplatního cyklu z `radarPaydayInfo()` | výplata vypadla z okna a posunula se o měsíc |
| **FIX-254** | Detektor počítal splity, vyrovnání a přesuny | chybná čísla šla přímo do **doporučených úspor** |
| **FIX-255** | převodník bral u přesunu `'CZK'` doslova | 100 € počítáno jako 100 Kč (jen zobrazení) |
| **FIX-256** | modal záloh na neexistujících CSS třídách | nešel otevřít |
| **FIX-257** | „do plusu se takhle nedostaneš" i při rostoucí rezervě | text **popíral graf vedle sebe** |
| **FIX-258** | dva koše se stejným popiskem „Neuvedeno" | „rozdíl mezi Neuvedeno a Neuvedeno" |
| **FIX-259/261** | `amtCZK` a `fxRef` se mohly rozejít | appka počítala kurz ze dvou čísel popisujících jiný stav |
| **FIX-260** | tagy se v Projektu nezobrazovaly | uživatel je zapsal a nikde neviděl |
| — | `announcements.js` měl v `app.html` zastaralý hash | servírovala se stará verze modulu |

**Nejzávažnější je FIX-252.** `computeBaseIncome()` vstupuje do S1, DTI, DSTI, S3 i S4 —
kdo měl příjem v cizí měně, měl **celé finanční skóre** počítané z nominálu.

⚠️ **Po nasazení se čísla v Predikci a Finančním obrazu pohnou** — nahoru u cizích měn,
dolů kde byly splity. Není to regrese, je to náprava.

---

## 4 · Audit `getActual()` (SKILL 12)

Prošlo **37 volání** a **20 míst** se surovou částkou. Výsledek v `AUDIT-FIX252-faze2.md`.

**Klíčové zjištění:** plošné vyloučení přesunů by rozbilo skóre. Kategorie spoření
a investic jsou typu `transfer`, takže `isTransferTx()` je u nich vždy `true` —
`premium.js:1520` a `projects.js:512` na nich stojí. Plošný filtr by vrátil **nulu**
a poctivě spořícímu uživateli by spadlo Finanční skóre až o **35 bodů**.

Řešení: filtr se neuplatní, když je dotazovaná kategorie sama přesunová.
Rozhoduje se podle **argumentu**, ne podle volajícího → žádné ze 37 volání se neměnilo.

---

## 5 · Zamítnuto a proč

**Denní doba u vzorců** — transakce nesou jen datum. Zavedený sběr času zápisu
(v9.92) byl **o hodinu později zrušen** (v9.93): Milan doplňuje transakce i druhý den,
takže by vzorec „večer utrácím špatně" byl vymyšlený.

**Kategorie „Kurzové ztráty"** — rozbila by součty, ty peníze jsou už v `amtCZK`
původní transakce. Ztráta není samostatný výdaj, je to vlastnost transakce.

**Čtvrtá křivka „Čisté jmění" v Ose života** — historicky ji spočítat nelze.
Místo dokreslené čáry je tam kumulovaný tok.

**Fáze 4 měsíčního review** (varování při zadávání) — v okamžiku zápisu je nákup
už hotový. Varování by způsobilo jen nepříjemný pocit bez možnosti cokoli změnit.
**Návrh zavřít jako zamítnuté.**

**Ořezání Osy života na 6 let** — postaveno a na Milanovu námitku zrušeno.
Historie se neořezává, přizpůsobuje se hustota.

---

## 6 · Testy

**12 nástrojů v `tools/`**, spouští se před každou dodávkou:

`check_tdz.js` (Milanův, doplnit allowlist o `getComputedStyle`, `File`, `Response`,
`Request`, `self`) · `smoke_pristi` 50 · `smoke_fxpair` 11 · `smoke_review` 15 ·
`smoke_moneyin` 14 · `smoke_backup` 12 · `smoke_projekt` 10 · `smoke_fxloss` 11 ·
`smoke_osa` 12 · `smoke_activity` 9 · `smoke_fix252` + `smoke_fix252b` 14 ·
`smoke_mena` 4 · `smoke_txcur` 11 · `smoke_detektor` 5 · `smoke_fxref` 8

**Testy odhalily tři chyby v mých vlastních opravách** — mezeru ve FIX-261,
sirotky po obnově zálohy a chybějící vyloučení v Detektoru.

`audit_transfer.js` je jen historický doklad, **do repa ho dávat nemusíš**.

---

## 7 · Po nasazení zkontroluj

1. **Obnovu ze zálohy** vyzkoušej dřív, než ji budeš potřebovat doopravdy
2. **Čísla v Predikci a Finančním obrazu** — po FIX-252 se posunou
3. **Souhrn výdajů** — součet řádků teď musí sedět s celkovým součtem
4. **Oznámení** — měla zastaralý hash, ověř, že fungují
5. **Evidence aktivity** naskočí až po prvním přihlášení na v9.85+
6. **Kurzová ztráta** se ukáže, jen když v poli „Skutečně v Kč" přepíšeš
   předvyplněný kurz ČNB podle výpisu z banky

---

## 8 · Otevřené

**Zbývá z měny:** `receipts.js` (35), `stats.js` (31), `report.js` (18),
`premium.js` (11), `inflace.js` (9), `review.js` (9) — moduly, které `fmtB` neznají.

**TODO-212** — přesuny v kategoriích typu `both` pro `getActual` i `getHistAvg`
najednou (~40 spotřebitelů, vlastní audit).

**TODO-200** — diff-read 2b, **doporučuju formálně zavřít jako zamítnuté**.

**Google Play** — čeká na D-U-N-S (ověřit, jestli ho OSVČ dostane),
SHA-256 z Play Console a čisté mobilní screenshoty bez reálných dat.

**Rešerše aplikace** — popis ~20 funkčních celků (Report, Obraz, Detektor,
Predikce, AI účtenky, Deník…), odhad 1–2 session.

---

## 9 · Do dokumentace

**SKILL 26 · Peníze a měny** — návrh hotový v `SKILL-26-mena.md`.
Tři vrstvy (uložení / sčítání / zobrazení), tři pasti plošné náhrady,
pravidla pro vstupní pole.

**Poučení k SKILL 12:** opravuje-li se **vzor** (ne konkrétní chyba), je nutné
prohledat **všechny jeho výskyty**. Tenhle audit je přesně ta část, která
chyběla u FIX-073, FIX-119 i S16.13.

**Nová past:** `charts.js` má funkce na jediném řádku. Komentář `//` za nahrazeným
příkazem zakomentuje **zbytek řádku** včetně závorek. `node --check` to odhalí,
ale při plošných náhradách je to tichý zabiják.

---
---

# DODATEK · v9.99 → v10.00 (dokončení TODO-219)

## Základní měna kompletní

Zbývajících **šest modulů**, které `fmtB()` dosud neznaly:
`review.js` · `inflace.js` · `report.js` · `stats.js` · `premium.js` · `receipts.js`

### Pravidlo podle Milanova zadání

> „Nemusíš do každé tabulky připisovat příznak Kč, stačí někde do popisku,
> podstatné je aby se přepočítala částka. Důležité tam nemíchat jiné jednotky (l, kg, g)."

| Kde | Jak |
|---|---|
| **Matice a tabulky** (Report, Statistiky, ceny v Inflaci) | holá čísla, symbol **jednou** v hlavičce sloupce nebo v popisku karty |
| **Samostatné hodnoty** (souhrny, karty, dialogy, věty) | `fmtB()` — symbol si nese sám |
| **Popisky s vlastní jednotkou** (`Kč/ks`, `Kč/měs`, `Kč/nákup`, `Kč/kg`) | `_cNum()` + `curSym()` — jednotka se převede celá |
| **Počty kusů** (`metric==='qty'`, `totalQty`) | **nepřevádí se** — nejsou to peníze |

**Kontrola jednotek** (odpověď na Milanovu otázku):
```
CZK → ø 4 820 Kč/měs
EUR → ø 191 €/měs
GBP → ø 171 £/měs
```
Symbol i hodnota se mění společně. Nikdy nezůstane „191 Kč/měs".

### `receipts.js` — 34 míst, každé zvlášť
Jediný modul, kde se koruny potkávají s cenami za kus, za kilo a s počty kusů.
Plošná náhrada by připsala symbol i k počtu kusů. Karty „Ušetřeno slevami" měly
jednotku natvrdo v popisku pod číslem (`tento měsíc (Kč)`) — teď bere `curSym()`.

**Rozsah celého TODO-219:** 11 modulů, 20 vstupních polí, ~180 zobrazovacích míst.

---

## FIX-262 · matice Reportu se při vodorovném posunu rozjížděla

Milan nahlásil ze screenshotů. **Dvě nezávislé příčiny:**

**1. Řádek se jménem sektoru byl `<td colspan>` s `position:sticky`.**
Zůstával přilepený vlevo, zatímco tabulka odjela — text se ořízl.
Ze screenshotu: `SPLÁTKY ÚVĚRŮ A HYPOTÉK` → viditelné jen `A HYPOTÉK`,
`BYDLENÍ` → `YDLENÍ`, `DOPRAVA` → `OPRAVA`.
Sticky je nyní na vnořeném `<span>`, buňka samotná se posouvá s tabulkou.

**2. Šířka prvního sloupce se lišila mezi hlavičkou a tělem.**
`<th>` měl `min-width:158px`, `<td>` jen `white-space:nowrap` bez omezení.
Sloupce se rozešly a `KATEGORIE` překrývala sloupec `Měsíční` (zbylo z něj `Í`).
Nyní pevných **170 px** v obou, plus `z-index` 5 pro hlavičku a 2 pro tělo.

## FIX-263 · tabulka „Inflace podle obchodu" na mobilu

Hlavičky se lámaly po jednom písmenu pod sebe (`Ú T R AT A`) a čísla na dva
řádky (`3 6 76`). Příčinou byla šířka sloupců, ne chybějící text —
**Milan upřesnil, že tabulku posouvá posuvníkem.**

Proto **zrušena výpustka u názvu obchodu**, kterou jsem nejdřív přidal:
ořezání by mu vzalo přesně to, co si chce přečíst. Název zůstává celý,
tabulka roste do šířky. Opravu řeší `white-space:nowrap` na hlavičkách
i číslech a `min-width:520px`.

---

## Poznámka k Predikci

Ponechána s „Kč" v každé buňce — rozhodnutí Milana:
*„kupodivu to nevypadá špatně (ponechej)"*.
Je to jediná tabulka, která symbol opakuje. Vědomá výjimka.

---
---

# DODATEK 2 · v10.00 → v10.03 (hloubková analýza)

Session pokračovala **hloubkovou analýzou karet**. Vypadlo z ní deset dalších oprav,
z toho **pět kritických**. Dvě nahlásil Milan při testu cizího účtu, zbytek odhalilo
čtení kódu.

## 1 · Kritické opravy

| | Co | Dopad |
|---|---|---|
| **FIX-264** | `seedData()` běželo jen při zcela chybějícím uzlu `/data` | **nový uživatel bez kategorií a peněženky** |
| **FIX-265** | posluchač přepisoval lokální pole na `[]`, když klíč v DB chyběl | **aplikace uživateli mazala data** |
| **FIX-266** | Komunitní přehled měřil vlastní a cizí výdaje jinak | uživatel vypadal hůř, než je |
| **FIX-267** | 11 míst v Radaru se surovými částkami | hlavní graf + špatně zakotvený výplatní cyklus |
| **FIX-268** | Inflace slučovala různé produkty do jednoho klíče | index si vymýšlel zdražení |
| **FIX-269** | Inflace ignorovala slevy | akce se v indexu neprojevila |
| **FIX-270** | detektory se navzájem nevylučovaly | součet dal 110 % z útraty |

Detail všech v `bugs.md`, rozhodnutí v `decisions.md` (ADR-109 až ADR-115).

## 2 · Změny chování

**Finanční skóre začíná od nuly (ADR-113).** Nový uživatel dostával **217/310 = 70/100
„Dobré"** ještě než zadal první transakci. Skóre má nyní dynamický jmenovatel —
co nelze změřit, se nehodnotí. Prahy hodnocení se počítají z dosažitelného maxima.

**Detektor ukazuje rozsah** místo jednoho čísla a odděluje doložitelné od odhadu.

**Komunitní benchmark používá medián.** Minimální počet uživatelů se **nezavádí** —
rozhodnutí Milana.

**Kontrola úplnosti účtenky** — součet položek vs. suma na dokladu, tolerance 1 Kč.

**Základní měna dokončena** — 11 modulů celkem.

## 3 · Bezpečnost ⚠️

`SECURITY.md` obsahovala realisticky vypadající **Resend API klíč** jako „špatný
příklad" a **GitHub Secret Scanning kvůli němu zablokoval push**.

Soubor opraven, do dokumentu doplněno varování. **Milan musí klíč revokovat,
pokud byl skutečný — je v historii commitů. Nepoužívat „Bypass".**

## 4 · Nové nástroje

`smoke_seed.js` · `smoke_fix266_267.js` · `smoke_uctenka.js` · `smoke_skore.js`
Celkem **17 nástrojů** v `tools/`.

## 5 · Nová dokumentace

| Soubor | Obsah |
|---|---|
| `ANALYZA-obraz-detektor-report.md` | Finanční obraz, Detektor, Měsíční report |
| `ANALYZA-komunita-uctenky.md` | Komunitní přehled, Analýza účtenek (8 podkaret) |
| `ANALYZA-radar-pristi-inflace.md` | Radar, Příští měsíc, Inflace |
| `PLAN-coicop-srovnavace.md` | tři COICOP srovnávače, tři různé zdroje dat |
| `RESERSE-funkcni-celky.md` | přehled 14 karet |

---

# DODATEK 3 · v10.04 — platnost slev

**TODO-229.** Sleva v Nákupním seznamu se držela, dokud ji nepřepsala novější cena.
Katalog přitom `latestDate` **už nesl**, jen se nikde nekontrolovalo.

| Stáří ceny | Stav |
|---|---|
| do 7 dní | 🎉 **SLEVA** — plnohodnotný nález |
| 8–30 dní | ⏳ **BYLA SLEVA** — zobrazí se, do nálezu se **nepočítá** |
| nad 30 dní | nález zaniká |
| bez data | chová se jako dřív (zpětná kompatibilita) |

Popisek nově říká **„naposledy viděno v Lidlu · 18. 8. (před 6 dny)"** místo
„v Lidlu je za X" — ceny se liší i regionálně a katalog zná obchod, ne kraj.
Nepředstírat přesnost, kterou nemáme.

**Nasazuje se:** `nakup.js`, `admin.js`, `app.html`, `sw.js`
