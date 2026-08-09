# ADR-098 · Automatické tržní ceny investic (Fáze 1 portfolia)

**Datum:** 2026-08-03 · **Session:** 18 · **Stav:** 🟢 Navrženo, čeká na schválení
**Souvisí:** TODO-201, TODO-143 (tabulky a grafy investic v čase), TODO-090 (Asset Allocation), ADR-068 (verzování worker.js)

---

## Kontext

Milan se ptal, zda jde propojit investiční účty s aplikací — správa portfolia, pohyby na účtu, změny v čase.

Modul `assets.js` (v8.93) už má připraveno:
- typ aktiva `investment` (ETF, akcie, dluhopisy, krypto), `liq: 'invest'`
- ruční aktualizaci tržní hodnoty (aditivní základ pro další vklad — ADR z S13)
- napojení Převod → Investice → podkategorie na konkrétní aktivum
- přepočet EUR vkladů přes ČNB kurzy (`/cnb` endpoint ve `worker.js`)

Chybí **jediná věc**: automatický zdroj cen. Ne celý modul.

## Zvažované varianty

### A) Přímé napojení na brokery přes API
| Instituce | Veřejné API pro 3. strany | Poznámka |
|---|---|---|
| Binance / Coinbase / Kraken | ✅ ano, read-only klíče | dobře zdokumentované, stabilní |
| Trading 212 | ✅ ano, read-only rozsah | |
| Interactive Brokers | ⚠️ ano, ale OAuth vyžaduje schvalování | pro solo vývojáře náročné |
| Degiro, XTB, Portu, Fondee | ❌ ne | jen reverzované knihovny — porušují ToS, lámou se |

**Zamítnuto pro Fázi 1.** Vyžaduje bezpečné uložení klíčů, což je jiná bezpečnostní kategorie než dosavadní data.

### B) PSD2 / Open Banking agregace
PSD2 pokrývá **platební účty, ne investiční portfolia** — držené cenné papíry přes něj nezískáme.
Agregátoři (GoCardless Bank Account Data, Salt Edge) fungují jako licencovaný AISP; dělat AISP sám znamená licenci ČNB.

**Zamítnuto** jako cesta k portfoliu. Případně později jako samostatná funkce „napojení banky" (TODO-025/026), ne jako portfolio.

### C) Veřejné cenové feedy nad ručně zadanou pozicí ✅ **ZVOLENO**
Uživatel zadá ticker/ISIN + počet kusů, appka si denně stáhne cenu.

## Rozhodnutí

**Fáze 1 = varianta C.** Dává ~80 % vnímané hodnoty (vývoj hodnoty v čase, zisk/ztráta, složení portfolia) za ~10 % práce a rizika, **bez jakéhokoli přístupu k účtu uživatele**.

### Architektura

```
assets.js  ──►  worker.js  /quotes?symbols=…  ──►  externí feed
   │                 (cache v Cloudflare KV, TTL 12 h)
   └──►  S.assets[].quote = {symbol, price, ccy, ts}
   └──►  S.assets[].priceHistory[] = denní snapshot → graf v čase
```

- Nový endpoint `/quotes` ve `worker.js` — **stejný vzor jako stávající `/cnb`**, nepsat znovu (SKILL 17)
- Zdroje: Stooq (zdarma, CSV, evropské burzy), CoinGecko (krypto, zdarma, bez klíče), Finnhub/Alpha Vantage jako fallback pro US tickery
- Cizí měna → CZK přes **stávající ČNB kurzy**, ne nový mechanismus (SKILL 25 — transakce vždy přes `txCZK`)
- Denní snapshot hodnoty portfolia → časová řada pro graf (obdoba `denikAutoSnapshot` z S17)

### Hranice rozhodnutí

- **Aplikace nikdy nedoporučuje, co koupit nebo prodat.** Zobrazuje vývoj a složení, nic víc. FinanceFlow není investiční poradce a nesmí tak působit — jinak vzniká regulatorní expozice.
- Ceny jsou **orientační, se zpožděním**. Musí to být viditelně uvedeno u hodnoty, ne schované v nápovědě.
- Prázdný stav vysvětlí, co se prověřilo (SKILL 22): „Aktivum nemá zadaný ticker — hodnotu zadáváš ručně."
- Ruční aktualizace hodnoty **zůstává** a má přednost před feedem (nemovitosti, sbírky, penzijko ticker nemají).

### Monetizace

Automatické ceny mají provozní náklad (API limity) → přirozená náplň **Pro tarifu 299 Kč**, který je dnes na landingu jako „Brzy". Premium ponechá ruční zadávání.

## Důsledky

**Pozitivní:** dokončí `assets.js` do použitelné podoby; naplní TODO-143 a TODO-090; dá Pro tarifu první konkrétní obsah; nulová bezpečnostní expozice.

**Negativní / rizika:** závislost na neoficiálních feedech (Stooq, Yahoo) — musí mít fallback a graceful degradation na ruční hodnotu; párování ISIN→ticker je u evropských ETF netriviální; `priceHistory` roste — hlídat velikost uzlu ve Firebase.

**Nutné dodržet:**
- Nové pole v `S` (`quote`, `priceHistory`) musí přibýt do **schématu `saveToFirebase`**, jinak je Firebase sync tiše smaže
- Nový uzel = **nové Firebase pravidlo**, jinak tichý PERMISSION_DENIED (poučení FIX-220)
- Postranní zápis snapshotu obalit vlastním `try/catch` — je to bonus, ne podmínka hlavní funkce
- Graf vývoje splňuje povinné náležitosti (osy s jednotkami, legenda, tooltip, `max-width` + `preserveAspectRatio`)

## Fáze 2 a 3 (zatím neschváleno)

- **Fáze 2:** read-only API klíče pro krypto burzy + Trading 212. Klíče **výhradně v Cloudflare KV, čtené jen workerem** — nikdy ve Firebase ani v prohlížeči (byly by vidět v DevTools).
- **Fáze 3:** PSD2 agregace běžných účtů přes GoCardless. Samostatná funkce, ne portfolio.
