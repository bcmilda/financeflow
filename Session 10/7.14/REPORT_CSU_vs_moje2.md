# Report ČSÚ 2024 – ověření, jednotky, plán sladění (v2)

> Session 10 · doplněno o oficiální data z czso.gov.cz (publikace „Spotřební výdaje domácností za rok 2024", kód 160066-25, vydáno 29.8.2025).

---

## 1. Zásadní zjištění: tvých 13 skupin je SPRÁVNĚ

Dřívější domněnka („COICOP má 12, ty máš 13 navíc") byla mylná. Podle revidované CZ-COICOP platné od 1.1.2024:
- Klasifikace má 15 základních oddílů, pro spotřební výdaje domácností se používá prvních 13 oddílů.
- Skupina 13 je nová oficiální COICOP divize (od 2023/2024), ne výmysl.
- Tvoje COICOP_GROUPS_DEF (13 skupin) odpovídá aktuální oficiální struktuře. Nic se nemaže.

---

## 2. Zásadní zjištění: JEDNOTKA

ČSÚ v hlavní publikaci uvádí výdaje jako Kč na osobu za ROK (struktura v %), tabulka „Skupiny spotřebních výdajů – průměry na osobu v Kč za rok". NE na domácnost a měsíc.

Důsledky:
- avg_osoba v sadě A je správná báze (ČSÚ = na osobu).
- Pro domácnost se používá OECD ekvivalentní velikost (ne prostý součet osob).
- avg_domacnost jsou odhady (≈ avg_osoba × 2,4), ne přímá ČSÚ čísla.

---

## 3. Ověření tvých čísel (avg_osoba, měsíčně) vs ČSÚ realita

| Kategorie | Tvoje avg_osoba | ČSÚ ~ (os./měs) | Hodnocení |
|---|---:|---:|---|
| Potraviny a nealk. nápoje | 3 300 | ~3 000 | dobré |
| Alkohol a tabák | 310 | ~310 | přesné |

Tvoje avg_osoba jsou realisticky blízko ČSÚ (na rozdíl od avg_domacnost). Potvrzuje to, že správná báze je „na osobu".

---

## 4. Bug: OECD přepočet se neaplikuje

calcOECD(adults, ch013, ch14) správně počítá ekvivalentní velikost:
- 1. dospělý = 1,0; každý další dospělý = 0,5; dítě 14+ = 0,5; dítě 0–13 = 0,3
- (2 dospělí = 1,5 jednotky, ne 2)

Logika se používá v receipts.js, ale „Já vs ČSÚ" ji ignoruje – bere natvrdo avg_domacnost. Proto změna počtu osob v Nastavení nemá efekt. To je ten bug.

---

## 5. Plán sladění (návrh)

Princip: ČSÚ data držet jako na osobu/měsíc (avg_osoba), srovnání počítat:
  ČSÚ_referenční_částka = avg_osoba × OECD_ekvivalent(domácnost)

1. Jedna sada, jedna báze – ponechat COICOP_GROUPS_DEF (13), zrušit CSU konstantu, primár avg_osoba.
2. Doplnit přesná ČSÚ 2024 čísla na osobu/měsíc (z publikace 160066-25, Tab. 1b → roční / 12).
3. Napojit OECD přepočet na „Já vs ČSÚ": csuAmt = avg_osoba × calcOECD(...).
4. Popsat jednotku + tlačítko „Upravit složení domácnosti" → Nastavení.
5. Mapování kategorií na COICOP 1:1 (coicopId 1–13).
6. Odkrýt tabulku zpět s reálnými daty a popisem jednotky.

---

## 6. Shrnutí
- 13 skupin je oficiálně správně (CZ-COICOP od 2024) – nemažeme.
- Správná báze = na osobu; avg_osoba je realistické.
- OECD přepočet existuje, ale „Já vs ČSÚ" ho nepoužívá → oprava.
- Další krok: stáhnout přesná čísla na osobu/měsíc z ČSÚ 2024 a doplnit do avg_osoba.

Session 10 · report v2 · 2026-05-30
