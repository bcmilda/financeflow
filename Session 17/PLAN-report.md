# Plán: Report přehled + vylepšení Měsíčního reportu

Milan poslal dvě věci najednou — svůj **Excel** (aktuální měsíc + kumulace roku + sumáře minulých let) a **ChatGPT mockup** prémiového reportu (skóre, cashflow, AI shrnutí, PDF export). Jsou to dva různé pohledy a doporučuju je **nemíchat do jedné karty**.

## Můj názor

Máš pravdu, že to chce **novou kartu a nový JS** (`report.js`), ne přetěžovat stávající Měsíční report. Důvody:
- Stávající „Měsíční report" je **jednoměsíční snímek** (tento vs. minulý měsíc + predikce). To je jiný účel než tvůj Excel.
- Tvůj Excel je **matice roků** – kategorie × (měsíční / roční / 2021–2026). To je „velký přehled", kam se chodíš podívat jednou za čas, ne měsíční report.
- Prémiový PDF report (ChatGPT) je **třetí věc** – exportovatelný dokument pro poradce.

Navrhuju tedy tři odlišené vrstvy, každou zvlášť a postupně:

### 1) Nová karta „Report" (report.js) — tvůj Excel v appce  🔴 hlavní přání
Matice jako v Excelu, ale interaktivní. Sloupce: **Měsíční | Roční (YTD) | 2026 | 2025 | 2024 | 2023 | 2022 | 2021**. Řádky = kategorie seskupené do bloků (Dům, Splátky, Jídlo, Doprava, Investice, Členství, Telefon…). Barevné kódování jako u tebe (zelená = OK, oranžová/červená = velký výdaj). Data už v appce máme — jen je poskládat do matice.

Podkarty (taby): **Přehled (matice) · Tento měsíc · Kumulace roku · Roky**. Přesně tvá tři hlediska: aktuální měsíc + kumulace v roce + sumáře minulých let.

Postup budování: (a) skeleton karty + tab „Roky" (matice kategorie×rok, čte z transakcí); (b) tab „Kumulace roku" (YTD křivka + tabulka měsíc po měsíci); (c) tab „Tento měsíc" (může přebrat obsah dnešního Měsíčního reportu). Laděno iterativně, jak píšeš.

### 2) Vylepšení stávajícího Měsíčního reportu  🟡
Doplnit, co slibuje: vyhodnocení, srovnání, plán, grafy, tabulky. Konkrétně přidat:
- **„Tento měsíc jednou větou"** na konec (Milanův + ChatGPT nápad): *„V červnu jste utratili méně, zvýšili úspory a finanční zdraví vzrostlo ze 78 na 82 bodů."* Skvělá drobnost, malá práce, velký dojem. → udělám hned jako první krok.
- Barevný **indikátor u každého bloku** (🟢 lepší / 🟡 beze změny / 🔴 horší než minulý měsíc) – ChatGPT to navrhuje, my už trendy počítáme.
- Podkarty: Příjmy/Výdaje · Dluhy · Aktiva · Cíle · Doporučení (rozbití dnešního dlouhého reportu do tabů).

### 3) PDF export reportu  🟢 (později)
Jedním klikem stáhnout report jako PDF (pro poradce). Až budou 1+2 hotové. Vygenerovat z HTML reportu (html2pdf/print stylesheet), první strana = skóre + cashflow + AI shrnutí, další strany = detaily. Tohle dodá „prémiový SaaS" dojem, jak píše ChatGPT.

## Doporučené pořadí (inkrementálně, tvůj styl)
1. **Hned, malé:** „Tento měsíc jednou větou" + barevné indikátory do stávajícího Měsíčního reportu. (rychlá výhra, žádná nová karta)
2. **Nová karta Report (report.js):** skeleton + tab „Roky" (matice). Pak přidávat taby.
3. Vylepšit Měsíční report do podkaret.
4. PDF export.

## Otázka pro Milana
- **Kam s maticí roků:** nová karta „Report" v sekci Analýzy (vedle Měsíční report / Grafy / Statistiky)? Nebo jako podkarta uvnitř Měsíčního reportu? (Doporučuju samostatnou kartu – matice roků je jiný žánr než měsíční snímek.)
- **Odkud brát roky zpět (2021…):** z historických transakcí v appce. Pokud data z těch let nemáš naimportovaná, matice ukáže jen roky, kde data jsou. OK?

Řekni, jestli souhlasíš s pořadím, a jestli začneme krokem 1 (jedna věta + indikátory) nebo rovnou skeletonem nové karty Report.
