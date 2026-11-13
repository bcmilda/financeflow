# Session 28 · FinanceFlow · shrnutí

> 2026-10-26 až 2026-11-06 · appka **v12.13 → v12.38** (26 verzí) · worker **v12.38** · pravidla DB **v12.26**
> **52 JS modulů** · testy: 217 sad `tools/smoke_*` + `smoke.js` + test pravidel (117 případů), vše prochází.
> Ze session se nepushuje: Milan nahrává sám přes GitHub Desktop ze složek `outputs/vX.YY/` (soubory jednotlivě, ne zip).

---

## Co přibylo

| Oblast | Hlavní body |
|---|---|
| **👛 Peněženky (v12.13–v12.14)** | Přesun mezi měnami kurzem ČNB, zůstatek cizí peněženky v její měně, report sčítá přes Kč. |
| **📲 Doručené (v12.15)** | Příchozí platba = příjem, zapamatované karty a účty, typ platby. |
| **📟 Energie a voda (v12.16–v12.17, v12.29, v12.37)** | Rozpis záloh, srovnání záloh se spotřebou a návrh zálohy, přepínač měřidel, tři režimy zálohy, plyn za m³ s přepočtem z kWh. |
| **🔄 Šablony (v12.18–v12.19, v12.26–v12.27)** | FIX-498 (vynechaný nejbližší výskyt od v6.49), první splatnost, zápis v den splatnosti, formulář jako Transakce. |
| **⭐ Sledovaná témata (v12.20)** | Značka u položky nebo platby (káva, pivo, Mac), AI paměť, statistiky se nemění. |
| **🧾 Účtenky (v12.21–v12.35)** | Oprava kódu výrobku, srovnání s ČSÚ v kartě výrobku (dva bloky, od první účtenky), známé položky po skenu, název doslova, vazba na transakci (datum, obchod), úprava jen v editoru účtenky, **rozdělení transakce podle kategorií položek** (staré i nové účtenky). |
| **🔒 Bezpečnost (v12.25–v12.26)** | Pravidla DB: sdílené uzly jen po položkách, trial jednou, čítač AI ve workeru, jeden hlas komunity na uživatele. |
| **🧮 Audit výpočtů (v12.30–v12.38)** | 22 z 24 bodů – viz `bugs.md`. Dluhy jen jistina, dnešek v místním čase, jeden limit a základ, predikce, report, RPSN, inflace, komunita, výplatnice 23 %, AI tip 1× denně, mrtvý kód. |

## Opravy
FIX-494 až FIX-507 a audit S28 (`bugs.md`). Nejdůležitější:
- **FIX-502 · Transakce zůstala se špatně přečteným datem** po opravě data v editoru účtenky (Milan: „zásadní a vážná chyba“).
- **Audit 1 · Splátka snižovala dluh i o úrok** (hypotéka −98 978 Kč za rok navíc).
- **Audit 2 · Dnešek v UTC** – mezi půlnocí a 1:00 / 2:00 se zapisoval včerejšek.
- **Audit 13 · Inflace srovnávaná s jiným typem oficiální inflace** – chyba mého návrhu z S23.

## Na co si dát pozor (SKILL 108–116)
Srovnávat stejné veličiny · AI nepřepisuje údaj, podle kterého se páruje · stejné id / jméno funkce = tichá kolize · odvozená data s deterministickým id · Cache-Control drží prohlížeč · slib = úkol · všechny vstupy jedné akce · text od AI escapovat · průměr dělit sledovaným obdobím.

## Mimo kód
- DataStat: výběr prodloužen na 24 měsíců (Milan), `/inflace` = 13 bodů průměrné roční míry.
- GitHub: smazány `vyplatnice-import.json` a `doc/todo(6).md`. Chyběly testy `smoke_dluh_jistina.js`, `smoke_dnes_mistni.js` a aktualizace `smoke_inbox.js` – poslány s dokumentací.
- Design artefakt „Editor účtenky – návrh“ (řádek B, nový návrh B4 6. 11.).

## Otevřené
TODO-374 (editor účtenky B) · TODO-377 (audit: inflace z účtenek, Vozidla, AI texty, Komunita) · TODO-375 · TODO-376 · TODO-378 · TODO-379 · TODO-380 · TODO-381 · TODO-382 · TODO-383.


---

## Dodatek (7.–8. 11. 2026) · v12.39 → v12.42

| Verze | Co |
|---|---|
| **v12.39** | Swipe se zámkem směru · skrytá kopie účtenky jde upravit · filtr ceny v Transakcích · Podezřelé „Položka účtenky“ s podmínkou názvu · ⚠️ a „Není duplikát“ na mobilu · Revolut „Vám posílá“ · ✎ Zapsat ručně do formuláře |
| **v12.40** | Doručené a zpětné platby v cizí měně kurzem ČNB dne · datum transakce = datum účtenky, rozpojené se napojí · Historie účtenek: filtr ceny, žlutý oddělovač měsíců |
| **v12.41** | Rozdělenou platbu jde upravit (lišta, klepnutí na část), části jdou s platbou |
| **v12.42** | **Nový editor účtenky** (TODO-374): karta položky, tři názvy, sleva, Druh, modré tagy a poznámky položek i celého nákupu, ☑ Vybrat, Kam se zapíše; Tagy částkou položky, hledání v položkách |

- Opravy FIX-508 až FIX-516, rozhodnutí ADR-272 až ADR-275, SKILL 117–120.
- 222 sad testů (vše prochází), nové `smoke_v1239.js`, `smoke_v1240.js`, `smoke_v1241.js`, `smoke_editor_uctenky_b.js`.
- Ověřeno: rozdělené platby se ve statistikách počítají po částech v jejich kategoriích.
- Otevřené: TODO-384 (přesun do investic – probrat) · TODO-385 · TODO-386 · TODO-387 · TODO-388 · TODO-377 (audit) · TODO-375 (vybledlá účtenka) · TODO-376 (polovina převodu).
