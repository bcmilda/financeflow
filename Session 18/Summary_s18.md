# SUMMARY — Session 18

**v9.42 → v9.78** · 2026-08-03 · 36 verzí, 32 oprav

---

## Co se postavilo

**Životní mapa** (Deník) — milníky a etapy na časové ose. Vznikla proto, že dlouhé horizonty neměří návyky, ale životní události; bez kontextu vypadá skok v číslech jako selhání. **Neovlivňuje bodování** — appka nemá rozhodovat, které životní volby jsou omluvitelné.

**Diff-read fáze 2** — čtení rozdělené po záznamech. Změna jedné transakce už netahá celou databázi.

**Finanční obraz v2** — devět očíslovaných sekcí, Cesta finančního zdraví s vodopádem, Monthly a Momentum Score, Lifestyle s tabulkou ukazatelů, karty Nezávislosti a Majetku.

**Měsíční report v2** — 14 sekcí. Nově: Co se nejvíc změnilo, Na co si dát pozor, Stav bohatství, Z účtenek, Milníky, Výhled, výsledky hodnocení útrat.

**Report přepracován** na sektor = kategorie, řádek = podkategorie.

**Recenze v aplikaci** — hodnocení a texty rovnou v appce, souhrn veřejně, texty jen pro admina.

**Grafy** — heatmapy, matice jedné kategorie, sloupce s průměrem, kumulace, tooltipy.

**Materiály** — leták A5 oboustranný, náhledy Životní mapy, plán predikce příjmů.

---

## Co se nepovedlo a proč

**Tři pády na produkci v jedné session** (`_ffrD`, `_s1pts`, `months`, `fs`) — všechny stejného typu: proměnná použitá před deklarací nebo v jiném scope. `node --check` je nezachytí.

**Reakce:** kontrolní skript `tools/check_tdz.js`. První dvě regexové verze samy propustily další chybu; teprve **čtvrtá verze s acorn parserem** umí skutečný scope. Od té doby chytil čtyři chyby ještě před dodávkou.

**Opakovaný vzorec:** volal jsem funkce, které v aplikaci neexistují — `toast`, `computePersonalInflation`, `APP_VERSION`, `renderSettings`, `computeFuturePlanned`. Psal jsem je podle toho, jak by se logicky jmenovaly, místo abych je ověřil.

**Postavil jsem funkci, kterou nikdo nezapne** (okno 12M, v9.55). Milan to řekl přímo a měl pravdu — v9.57 odstraněna. Měl jsem se ptát, jestli ten problém vůbec má, než jsem se do toho pustil.

---

## Odpovědi na dotazy

**Rozdíl mezi projekcí Radaru a Cashflow v „Kam směřuju":**
- Projekce = příjem − výdaje − odhad zbytku měsíce **z denního tempa**
- Cashflow = totéž **plus známé budoucí platby**

Obojí správně, ale projekce vypadala optimisticky u velkých plateb na konci měsíce. **Od v9.78 podtitulek říká, co v projekci není** („bez známých plateb 47 952 — s nimi −22 612").

**Plánovaný výdej v Radaru** = skutečnost + odhad z **denního tempa**, ne z predikční tabulky. Predikční engine (`predictCat`, sezónnost) používá **Finanční obraz** → „Kam směřuju" (v8.83). Dvě sekce stejného jména, dva různé vzorce — stálo by za to je pojmenovat jinak (TODO-176 to už zmiňuje).

**Historie Radaru:** v6.66 první oprava projekce · **v7.94 (S12.1s) přepracovaná logika sloupců** · v8.80 (S16, TODO-166) „Kam směřuju" ve Finančním obrazu · v8.83 výdaje z predikčního enginu · v9.25 plán za celý měsíc.

---

## Otevřené

**Rozpracované:**
- **Predikce příjmů + kalendář „Příští měsíc"** — plán hotový (`PLAN-prijmy-pristi-mesic.md`), schváleno: nový modul, Free, jeden měsíc, ruční úprava, `stable` flag. **Nezačato.**
- Životní mapa — vizuální varianty (náhled hotový, nevybráno)
- Landing page — 6 podstránek čeká na vyřešení duplicit a screenshoty
- TODO-201 portfolio ceny — čeká na rozhodnutí Pro vs. Premium
- Sekce B auditu — 13 kandidátů na zrušení

**Nalezené mezery:**
- ⚠️ **Žádná pravidelná záloha dat.** Jen jednorázová před migrací a ruční export. Pro aplikaci s platícími zákazníky je to díra — doporučuju řešit dřív než výkon.
- Predikce příjmů neexistuje (`predictCat` umí jen výdaje, `budouci.js` příjmové šablony vynechává)
- Skóre 0–310: rozsah vzorce je −10 až 110, krajní hodnoty jsou přeplněné
- Stagnace na dobré úrovni se hlásí jako „Stagnuji" — chybí rozlišení směru a úrovně
- Čtyři různá skóre pod podobnými názvy (0–100 report, 0–310 dashboard, 0–100 obraz, 3 složky)

---

## Pravidla, která platí dál

- **Před dodávkou:** `node tools/check_tdz.js js/*.js` + `node --check`
- **Uzly mimo `users/{uid}`** potřebují vlastní Firebase pravidla
- **Nový uzel v `S`** musí být na **4 místech** v `app.js` (`_DW_META`, `_dwMetaVals`, 2× snapshot)
- **Ověřovat názvy funkcí a CSS tříd v kódu**, ne odhadovat
- `charts.js` je CRLF, `ui.js` je LF — kontrolovat po každé editaci
- Hlášky přes `showToast()`, ne `toast()`
