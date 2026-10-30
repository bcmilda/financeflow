# Session 27 · pracovní poznámky (přenést do doc/ na konci session)

> ✅ **Přeneseno do `doc/` 23. 10. 2026** (todo, bugs, decisions, features, CLAUDE_SKILLS, architecture, CLAUDE, GLOSSARY, VERSIONING, formulas, google-play, SECURITY, explanations, Resume, context, kategorie + Summary_s27, PLAN-SESSION-28).

> Složka `docs/` je pracovní (CLAUDE.md). Na konci Session 27 se z toho stanou záznamy v `doc/todo.md`, `doc/decisions.md`, `doc/bugs.md`, `doc/features.md`.

## Rozhodnutí Milana
- **Kalkulačky zdarma** pro všechny (zatím) – 2026-10-20.
- **Cena zlozvyku i z položek účtenek** („spíše na účtenky, případně obojí“) – v11.91.
- **Přepis kódu zpětně ve vlastních účtenkách ponechat** (2026-10-21): je lokální (jen moje účtenky a moje spojení obchod+zkratka), chybu pak opraví jeden sken. Pomůže název z kódu pod položkou (v11.93).
- **Dialog „Oprava / Jiný druh“ při skenu NE**: uživatel o duplicitě zkratky neví a vždy by zvolil „Oprava“.

## TODO – nové
### Čistý majetek / Finanční skóre podle měsíce (Milan 22. 10.) · pořadí: 1) karta ✅ v11.98 → 2) rezerva → 3) dluhy
- **Karta Čistý majetek** ✅ v11.98: stav ke konci vybraného měsíce + upozornění na mínus v hotovosti/spořáku (zapomenuté transakce).
- **Rezerva (S3 skóre)** ✅ v11.99 – rozhodnutí Milana: do rezervy patří hotovost, běžný účet, peněženky a spořicí účty/aktiva („peníze rychle k dispozici“). **Investice, penzijko a DIP NE** („dlouhodobé, při rychlém výběru neurčitá ztráta“). Kreditní karty nepočítám (karta = dluh). Peníze v cílech ANO (Milan 22. 10., v12.00). Otevřené: počítat do výdajů i vklady do spořicích/investičních kategorií? (dnes ano, stejně jako cash flow). `obrazDopadStylu` (projects.js) má vlastní starou rezervu (spořicí+investiční peněženky) – nesjednoceno. Jmenovatel = **průměr výdajů za 6 měsíců** ke konci vybraného měsíce. Čitatel = skutečný zůstatek (včetně transakcí) ke konci vybraného měsíce. Dnes chyby: 1 měsíc výdajů, dnešní stav pro staré měsíce, jen zadaný zůstatek bez transakcí, investiční peněženka celá vs investiční aktivum vůbec.
- **Dluhy – Milan 22. 10. večer:** do formuláře/detailu přidat **mimořádnou splátku, změnu měsíční splátky, změnu úroku, navýšení půjčky, konsolidaci**. Import z banky/Excelu dnes splátky s dluhem nepropojuje (žádné debtId) – Milan to zatím nezkoušel, ozve se. Půjčka musí existovat před importem, jinak není s čím párovat.
- **Dluhy – Milanův návrh:** datum začátku + měsíční splátka + datum splatnosti + „Zbývá“ (ke dni); částky se mají shodovat (kontrola); splátka se může v čase měnit (historie změn „od data – částka“) + mimořádné splátky → zbytek dluhu ke konci kteréhokoli měsíce. Dnes: kalendář splátek začíná datem začátku, ale počítá s dnešním zbytkem (míchá data).

### Zkratka s více kódy („víc druhů“) · ✅ v11.94 (původní návrh níže překonán)
- **Postaveno (Milan 21. 10.):** zkratka = odkaz, může vést k víc kartám. Jiný kód u položky se přidá jako další druh (jen ta položka, zpětně nic). 2+ druhy → žádná automatika, výběr „Který druh?“ pod řádkem položky v editoru (plné názvy, ▾ kód/gramáž/počet, ✕ Odebrat ze zkratky). Bez záložky, bez rozhodování v kartě, bez kontroly starších nákupů (Milan: „nad lidské síly“). Lokálně `S.uiCfg.eanDruhy`, komunitě se druh neposílá.
- Problém: „BL Luštěninové chipsy 65g“ = 3 různé výrobky (cizrnové, čočkové…). Paměť obchod+zkratka → 1 kód, poslední sken přepíše, automatika pak dává špatný druh.
- Návrh (bez dialogu při skenu):
  1. Appka si u zkratky pamatuje **všechny kódy, které k ní kdy byly přiřazeny** (lokálně, `S.uiCfg`), i když se přepisují.
  2. **Záložka „Zkratky s více kódy“** (Mapa položek / Učení): zkratka, obchod, seznam kódů s plným názvem z EAN (+ kód), akce „Jsou to různé druhy“ / „✕ tenhle kód je chyba“. Slouží k přehledu i úpravě (Milanův nápad 2).
  3. Zkratka označená „různé druhy“ → automatické přiřazení vypnuto; v editoru místo 📷 výběr **s plným názvem z EAN** („BL Luštěninové cizrnové chipsy 65 g“), rozbalitelný s podrobnostmi a kódem (Milanův nápad 1) + 📷 jiný + Nevím.
- Komunita: kódy u zkratky se 2+ potvrzenými kódy brát stejně (výběr, ne automatika) – až po bodu D.

### D · Práh komunity pro automatické přiřazení · P3 · odloženo (Milan: „zatím ne, zapsat“)
- Dnes stačí 1 hlas, když žádný jiný kód nemá stejně: jedno chybné naskenování jednoho člověka se tiše rozšíří k novým nákupům ostatních (jen k položkám bez kódu – existující kódy se nepřepisují).
- Návrh: automaticky až od 2 různých lidí; do té doby návrh na klepnutí „Komunita navrhuje: … [✓] [📷]“. Víc kódů s potvrzením → výběr. Admin zámky dál mají přednost.
- Doplňky: kontrola kódu proti zkratce už při skenu (v11.93 zatím jen žlutý řádek v editoru), hlas „tohle není ono“ by potřeboval worker.

### E · Obecné názvy bez 📷 a bez komunitního kódu · P3 · odloženo
- Milan: souhlasí s myšlenkou, ale bojí se chybného označení obecného názvu → zatím ponechat.
- Dnes: seznam `RP_GENERIC_NAMES` + `rpIsGenericName` (receipts.js) – obecný název se jen vyřazuje z porovnání cen, 📷 i komunitní kód se nabízí dál. Kódy obchodu (prefix 2) se odmítají už dnes.
- Budoucí směr (Milan): **obecné karty bez EAN** (rajče, rohlík, uzeniny) s živinami → Nákupní DNA a statistiky i pro nebalené potraviny.

## Inbox – stav 23. 10. (zpráva ze session Inboxu, předal Milan)
- Inbox zprovozněn a propojen, platby z Milanovy banky už vidí a může přidat.
- Repo `bcmilda/financeflow-inbox` staví APK přes GitHub Actions, stažení Releases → `nejnovejsi`. Aktuální 0.1.2 (nápověda k „Omezenému nastavení“, chyba v okně, stálý testovací podpis); Milan má 0.1.0.
- Firebase: zapnuté Anonymous přihlášení (jen telefon, web ho nepoužívá). Anonymní účet + párovací kód je záměr, Google přihlášení v Inboxu ne (nejmenší oprávnění).
- Instalace mimo Play: Play Protect → „Přesto nainstalovat“; Android 13+: Informace o aplikaci → ⋮ → „Povolit omezená nastavení“.
- **TODO web:** Doručené se neobnovují samy (jen 🔄 Načíst) → zvážit automatické načtení při otevření Importu z banky.
- **TODO pravidla DB:** kontrola tvaru ID návrhu `users/$uid/inbox/$id`, např. `$id.matches(/^n[0-9]+_[0-9a-f-]+$/)`.
- **TODO:** Inbox na Google Play (ověřený vývojář, vlastní podpis, Data safety) kvůli varování Play Protect.

## Google Play – web (TWA)
- Balík z PWABuilderu ze Session 23 (23. 9. 2026) nalezen: FinanceFlow.aab, .apk, assetlinks.json, signing.keystore, signing-key-info.txt. Milan nahrál do Interního testování (23. 10., verze 1 (1.0.0.0), automatická ochrana pro vydání vypnutá – vyžaduje minSdk 24, balík má 23). **TODO-301 ✅:** otisk podpisového klíče Google `9B:9C:F1:73:…:F8:7F` (z podepsaného univerzálního APK, vydavatel Google Inc.) doplněn do `.well-known/assetlinks.json` vedle nahrávacího `48:12:…`. Po nasazení webu ověřit, že se appka z Play otevře bez adresního řádku. Příští balík: minSdk 24 (automatická ochrana), stejný signing.keystore, versionCode 2.

## ✅ POSTAVENO v12.07 (Milan 23. 10.: „zkus to postavit teď“) · Trend nákupů po obchodech
1. **Analýza účtenek → 📈 Trend útrat dle obchodů:** přepínač 6 měsíců / 12 měsíců / kalendářní rok (‹ 2026 ›). Jedna barva obchodu všude – tabulka Obchody v měsíci, čára grafu i legenda (dnes tabulka = firemní barva, graf = přidělená). Barva se obchodu přidělí jednou a zapamatuje (S.uiCfg), takže je stejná ve všech kartách a měsících.
2. **Report 2:** sekce 🏪 Obchody – top 5 obchodů měsíce (návštěvy, útrata, Ø nákup) a trend **od začátku roku do vybraného měsíce (max 12 měsíců)** – Milan 23. 10.
3. **Grafy → nová záložka 🏪 Obchody:** (a) rok: měsíce I–XII, čára za obchod, ‹ rok › podle dostupných dat (2020–2027…); (b) porovnání let: sloupce = roky, filtr obchodů (víc najednou), míra útrata / návštěvy / Ø nákup; (c) tabulka rok × obchod pod grafem, klepnutí = detail.
- **Rozhodnuto (Milan 23. 10.):** zdroj = účtenky **i obchody z notifikací** (transakce z Doručených – obchodník z notifikace; transakce spojená s účtenkou se počítá jen jednou, přes účtenku). Výchozí míra = **útrata**.

## Nalezeno, neřešeno (k rozhodnutí Milana)
- ~~Splátka z Opakované platby nesnižuje Zbývá~~ ✅ v12.02 (Milan: „oprav to“). Starší splátky ze šablony (před v12.02) Zbývá nesnížily – opraví je nové zadání Zbývá · ke dni z výpisu.
- ~~Splátkový kalendář míchá data~~ ✅ v12.02.
- receipts.js má v hlavičce stále v11.95 (v11.97 ji neaktualizovala).

## Vysvětleno Milanovi (2026-10-23)
- **GitHub Desktop „12 ↑ 2 ↓“:** na GitHubu (dev) je poslední commit z 18. 10. (4f7c149 docs Inbox) – pushe ze Session 27 tam nedošly. Větev je rozjetá: na GitHubu 2 commity z S26 (c939102, 4f7c149 – jen doc/), které Milan lokálně nemá → Desktop místo Push nabízí Pull. Postup: Pull origin → případný konflikt v doc/decisions.md vzít lokální verzi (obsahuje ADR-232 i nové), ostatní doc soubory z GitHubu → Push origin.

## Vysvětleno Milanovi (2026-10-22)
- **Čistý majetek se po starší účtence nezmění:** peněženka má „Zůstatek · ke dni“ → transakce s datem před/do toho dne jsou už v zadaném zůstatku, dnešní stav (a Čistý majetek na Dashboardu) nemění. Transakce (číslo v závorce, FIX-484) z nich jen dopočítají historii zpět – mínus v minulosti = v appce chybí dřívější příjem/vklad do peněženky (např. výběr z bankomatu). Chování je správné, nic neopraveno.

## Hotovo v Session 27
- v12.07 🏪 Trend nákupů po obchodech (Analýza účtenek 6/12/rok, Report strana 3 od ledna, Grafy → 🏪 Obchody s porovnáním let), zapamatované barvy obchodů, zdroj účtenky + notifikace
- v12.06 FIX-490 Grafy → Denní přepínání měsíců · Doručené: duplikáty, banka podle appky, přesuny a investice, karta/účet → peněženka · Podle výrobků obecně jen ovoce/zelenina/brambory/pečivo
- v12.05 Stejné se stejným (Podle výrobků: vážené podle obecného názvu, balené jen konkrétní výrobek) · zálohy mimo ceny · palivo v Inflaci za litr · obchody podle sjednoceného názvu + barvy v trendu · tankování: jen skutečné palivo, úprava/odebrání, kontrola tachometru · šířky sloupců · Deník čára poznámky
- v12.04 FIX-489 prázdný seznam po smazání duplikátu (filtr Podezřelé zůstal zapnutý) · srozumitelná hláška u transakce z účtenky
- v12.03 FIX-488 tlačítka duplikátu v řádku obráceně („Smazat duplikát“ mazal druhou transakci)
- v12.02 Splátka z Opakované platby snižuje Zbývá (+ kategorie Splátka, Budoucí platby → Dluh/Splátka) · Splátkový kalendář od začátku s 📍 Dnes a Odplaceno · kalendář budoucích splátek od dneška
- v12.01 📜 Změny půjčky (mimořádná, splátka, úrok, navýšení; konsolidace se zapisuje), Zbývá · ke dni, historie dluhu ve skóre a Čistém majetku, DSTI bez splacených půjček (ADR-234)
- v12.00 Rezerva počítá i peníze v cílech (Milan) · doc/formulas.md + ADR-233 zapsány
- v11.99 Rezerva ve Finančním skóre: hotovost+účet+spořicí+jiné peněženky a rezervní aktiva ke konci vybraného měsíce ÷ průměr výdajů 6 měsíců; bez investic/penzijka/DIP/karet/cílů
- v11.98 Čistý majetek ke konci vybraného měsíce (peněženky od zadaného zůstatku, cíle, aktiva z historie; dluhy dnešní s poznámkou) · upozornění na mínus v hotovosti/spořáku
- v11.97 FIX-487 kurzor v zeleném tagu „uskočil“ (překreslení editoru při změně Balení/Názvu zahodilo klepnuté pole) · větší pole tagu
- v11.90 Kalkulačky (Rezerva, Cena zlozvyku, Do výplaty, Monte Carlo) · FIX-484 zůstatek v závorce v Transakcích
- v11.91 Cena zlozvyku z položek účtenek · odkaz na APK FinanceFlow Inbox
- v11.92 Ruční účtenka · FIX-485 Mapa položek podle kódu (Milena = 1 karta, chipsy = 3 karty)
- v11.96 🔎 Zeptej se svých dat (AI Rádce): AI pochopí otázku → plán, appka spočítá; období/míra/výstup/rozpad přepínatelné; bez AI rozpoznání podle slov
- v11.95 FIX-486 rozpracovaná účtenka se ztratila po klepnutí na záložku (editor zůstal, tlačítka nic, ➕ Přidat spadlo) + obnovení editoru s úpravami
- v11.94 Jedna zkratka → víc výrobků, výběr druhu v editoru účtenky
- v11.93 Název z kódu pod položkou + kontrola kódu proti zkratce · 📷 Přidat skenem v ruční účtence · test smoke_doklady.js zamrazí datum (padal s plynoucím časem)

## Mapa položek a zařazení – rozhodnutí Milana (2026-10-23 večer)
- **Spojování karet bez kódu:** žádné automatické slučování podle obecného názvu („není brambor jako brambor“ – ranní, konzumní, salátové, baby, batáty). Ruční „🔗 Spojit s…“: hlavní název (např. Brambory konzumní) + zkratky jako aliasy; zkratka se zapamatuje → další účtenky padnou do karty. ČEKÁ na souhlas se stavbou.
- **Překlep z účtenky (Drubeji × Drůběží):** rychlá ruční oprava místo utilit – v „Názvech z účtenek“ datum nákupu + „Otevřít účtenku“ / „Opravit název“ (oprava na účtence → karta se sama spojí). Návrh ukázán (mockup), ČEKÁ.
- **Pasti v zařazení:** dvouslovné názvy, žádné podmínky, štítek do zařazení netahat. Kandidáti: „makový hřeben“ (pečivo), „smetanový krém“ / „smet krem“ (mléčné dezerty), „drůbeží hamburger“ (masné výrobky jako karbanátky – Milan se ptá, jestli ne hotové jídlo), „koš“ (Nektarinky koš → Domácí potřeby), „taška“ (Papírová taška → Zábava, rozpočet podkategorie Poplatky na účtence = cat5). Test se seznamem pastí.
- **AI fronta Mimo taxonomii:** vysvětleno (admin potvrdí dávku; zamítnuté = Milan se ptá, co s nimi). ČEKÁ.
- **Karta bez kódu:** Milan chce jiné zařazení (např. „Vážené“ / „Bez kódu“) – promyslí později.
- **Přeřadit staré účtenky:** Milan: „chybí kontext, polovina správně, nejde jednotlivě – nechápu to“. Příčiny: odhad podle jednoho slova (koš, taška, švestka), položky z restaurace přeřazené do potravin (Švestka 0,5, Kečup), podkategorie obchodu (Obchůdek) aplikovaná na výrobek. Návrh (mockup): položky jednotlivě se zaškrtnutím, obchod + datum, důvod (tvoje volba / komunitní mapa / podle slova), odhady nezaškrtnuté, restaurace a změny jen podkategorie vynechané, nezaškrtnuté příště nenabízet. ČEKÁ.

## Hotovo v Session 27 (pokračování)
- v12.08 FIX-491 jednotky: palivo l, vážené kg/l, sloupec Množ., Ø za jednotku (dřív za nákup s popiskem Kč/ks) · Detektor úspor l u paliva · Statistika položek palivo za litr · Megagraf: „Seřadit podle řady“ u více řad
- v12.09 ✏️ Oprava názvu z účtenky v kartě výrobku (📅 data → otevře účtenku a zvýrazní položku, ✎ Opravit název → karty se spojí) · 🔄 předělané okno Opravit kategorii u starých účtenek (po výrobcích, zaškrtávání, proč, bez restaurace a podkategorií, nezaškrtnuté skrýt) · 🪤 pasti (makový hřeben, smetanový krém / Smet.krem, drůbeží hamburger = maso – Milan: „flák masa bez housky“, Nektarinky koš), taška/záloha/poplatek bez Zábavy · taxonomie 1.3
- v12.10 FIX-492 Nákupní seznam: našeptávač bez dvojic (jeden výrobek = jeden řádek s cenou, bez počtu skenů, název se nepřekrývá s cenou), hlídač ceny navázaný vždy na záznam s cenou, editor účtenky zapisuje název pod stejný klíč jako ceny. Staré dvojice v databázi zůstaly (neviditelné) – úklid jen na přání Milana.
