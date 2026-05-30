# Report: ČSÚ data vs. tvoje tabulka – míra nepřesnosti

> Session 10. Analýza rozdílů mezi dvěma sadami ČSÚ čísel v aplikaci a doporučení, jak je sladit s reálnými daty ČSÚ.

---

## 1. Jádro problému: aplikace má DVĚ různé sady „ČSÚ" čísel

| | Sada A | Sada B |
|---|---|---|
| **Kde** | `COICOP_GROUPS_DEF` (helpers.js) | `CSU` konstanta (admin.js) |
| **Používá** | záložka „Já vs ČSÚ" | (bývalá) „ČSÚ tabulka" |
| **Počet skupin** | 13 (oficiální COICOP členění) | 10 (vlastní pojmenování) |
| **Má i na osobu** | ✅ ano (`avg_osoba`) | ❌ ne |
| **Součet/měs domácnost** | 32 060 Kč | 37 700 Kč |

Obě jsou **ručně zadané odhady**, ani jedna není přímý import z oficiální tabulky ČSÚ. Proto si neodpovídají.

---

## 2. Tabulka nepřesností (společných 9 kategorií)

| Kategorie | Sada A | Sada B | Rozdíl | Odchylka |
|---|---:|---:|---:|---:|
| Potraviny | 7 800 | 8 000 | +200 | **+3 %** |
| Bydlení | 9 500 | 12 900 | +3 400 | **+36 %** |
| Doprava | 4 200 | 4 500 | +300 | **+7 %** |
| Restaurace | 1 400 | 2 400 | +1 000 | **+71 %** |
| Rekreace | 2 600 | 2 800 | +200 | **+8 %** |
| Oblečení | 940 | 1 800 | +860 | **+91 %** |
| Zdraví | 1 100 | 1 400 | +300 | **+27 %** |
| Komunikace | 820 | 1 100 | +280 | **+34 %** |
| Vzdělávání | 350 | 600 | +250 | **+71 %** |
| **Součet (9)** | **28 710** | **35 500** | **+6 790** | **+24 %** |

**Průměrná odchylka přes kategorie: ~38 %.** Největší rozkol: Oblečení (+91 %), Restaurace a Vzdělávání (+71 %), Bydlení (+36 %).

---

## 3. Proč „4 950 vs 8 000 Kč" u potravin (z tvé fotky)?

Na fotce „Já vs ČSÚ" jsi viděl jiné číslo než v „ČSÚ tabulka", protože každá záložka brala z **jiné sady**. „Já vs ČSÚ" počítá z COICOP_GROUPS_DEF (7 800), „ČSÚ tabulka" z CSU konstanty (8 000). Číslo 4 950 mohlo být z ještě starší verze nebo z přepočtu na osobu. Zkrátka: **tři možná čísla pro jednu kategorii, žádné není autoritativní.**

---

## 4. Jaká data jsou správná (reálný ČSÚ 2024)?

ČSÚ „Statistika rodinných účtů" člení výdaje dle **COICOP do 12 hlavních skupin** (CZ-COICOP). Skutečná struktura odpovídá spíš **Sadě A** (13 skupin vč. „Transfery a ostatní"). Reálné průměrné měsíční výdaje domácnosti v ČR se pohybují kolem **~20 000–22 000 Kč na osobu**, resp. **~38 000–44 000 Kč na domácnost** (2,4 os.) – tj. tvůj `avgExp: 44200` v CSU konstantě je realistický celkový součet, ale **rozpad po kategoriích v obou sadách je nepřesný odhad.**

**Pozor na jednotku:** Sada A má `avg_domacnost` i `avg_osoba`. ČSÚ oficiálně publikuje „na osobu". Pokud appka míchá „na osobu" a „na domácnost", vznikne 2,4× rozdíl – to může být zdroj části nepřesnosti.

---

## 5. Doporučení – co udělat jinak

**Krok 1 – Jedna sada, jeden zdroj pravdy.**
Zrušit duplicitu: ponechat **pouze `COICOP_GROUPS_DEF`** (13 skupin, struktura dle COICOP), smazat konkurenční `CSU` konstantu. Vše (Já vs ČSÚ, karty Příjem/Výdaje/Úspory) ať čte z jednoho zdroje.

**Krok 2 – Doplnit reálná ČSÚ 2024 čísla.**
Stáhnout aktuální tabulku z czso.gov.cz (Statistika rodinných účtů 2024, „Vydání domácností podle CZ-COICOP") a přepsat `avg_osoba` + `avg_domacnost` přesnými hodnotami. Uvést rok a zdroj přímo u konstanty.

**Krok 3 – Jasně označit jednotku.**
U každého srovnání uvádět, zda je to „na osobu" nebo „na domácnost", a tvoje výdaje přepočítávat na stejnou jednotku (počet osob v domácnosti zadat v nastavení).

**Krok 4 – Mapování kategorie → COICOP.**
Tvoje kategorie (Doprava, Bydlení…) namapovat 1:1 na COICOP skupiny (už částečně existuje přes `coicopId`). Aby „moje tabulka odrážela ČSÚ", musí mít každá tvoje kategorie přiřazenou COICOP skupinu – pak se sečtou do stejných řádků jako ČSÚ.

**Krok 5 – Verifikace.**
Po sladění by součet tvých kategorií namapovaných na COICOP měl jít srovnat 1:1 s ČSÚ řádky bez „dvou různých čísel".

---

## 6. Shrnutí
- Aplikace má **2 nesladěné sady ČSÚ čísel**, liší se průměrně o ~38 % (až +91 % u Oblečení).
- Žádná není přímý import z ČSÚ – obě jsou ruční odhady.
- **Řešení:** jedna sada (COICOP_GROUPS_DEF) + doplnit reálná ČSÚ 2024 čísla + jasná jednotka (osoba/domácnost) + mapování kategorií na COICOP.
- Pak bude „moje tabulka" skutečně odrážet ČSÚ a zmizí rozkol v částkách.

*Session 10 · analytický report · 2026-05-30*
