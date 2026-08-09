# PLÁN · TODO-201 — Automatické ceny investic (Fáze 1)

**Session:** 18 · **Priorita:** 🟡 P2 · **ADR:** ADR-098 · **Stav:** čeká na schválení
**Odhad:** 1 session · **Dotčené soubory:** `worker.js`, `assets.js`, `firebase.js` (schéma), `database_rules.json`, `charts.js` nebo `assets.js` (graf)

---

## Krok 0 · Než začneš psát (povinné)

- [ ] Zkontrolovat, jestli výpočet hodnoty aktiva **už někde neexistuje** — `assets.js` má `computeNetWorth`, `premium.js` měl kdysi kolizi stejného jména. Před pojmenováním nové funkce ověřit kolize napříč moduly.
- [ ] Ověřit stávající `/cnb` endpoint ve `worker.js` a **napodobit jeho vzor**, ne vymýšlet nový (SKILL 17 — Inflace vs. Zdražování).

## Krok 1 · Worker: endpoint `/quotes`

- [ ] `GET /quotes?symbols=VWCE.DE,BTC,CSPX.L`
- [ ] Routing podle typu symbolu: krypto → CoinGecko · burzovní → Stooq CSV · fallback Finnhub
- [ ] **Cache v Cloudflare KV, TTL 12 h** — chrání před limity feedů i před tím, aby každý render tahal síť
- [ ] Odpověď: `{symbol, price, ccy, ts, source}`; při chybě `{symbol, error}` — **nikdy nespadnout celý batch kvůli jednomu symbolu**
- [ ] CORS hlavičky jako u `/cnb`
- [ ] ⚠️ `worker.js` se nasazuje **zvlášť mimo hash chain** (ADR-068) — v dodávce výslovně uvést

## Krok 2 · Datový model

- [ ] `asset.symbol` (volitelné) — bez něj aktivum funguje jako dnes, ručně
- [ ] `asset.qty` — počet kusů
- [ ] `asset.quote = {price, ccy, ts, source}` — poslední známá cena
- [ ] `asset.priceHistory[] = {d:'YYYY-MM-DD', v:hodnotaCZK}` — denní snapshot
- [ ] ⚠️ **Všechna nová pole doplnit do schématu `saveToFirebase`**, jinak je sync tiše smaže
- [ ] ⚠️ **Doplnit Firebase pravidla** pro nové uzly — co není výslovně povoleno, je zakázáno (poučení FIX-220)
- [ ] Hlídat velikost `priceHistory` — ořezávat na 24 měsíců

## Krok 3 · Přepočet na CZK

- [ ] Cena v cizí měně → CZK přes **stávající ČNB kurzy**, žádný nový mechanismus
- [ ] Hodnota pozice = `qty × price × kurz`
- [ ] ⚠️ Ruční aktualizace hodnoty **má přednost** před feedem, pokud je novější (nemovitosti, sbírky, penzijko ticker nemají)

## Krok 4 · UI v `assets.js`

- [ ] Pole „Ticker / ISIN" a „Počet kusů" v modalu aktiva — **volitelná**, nesmí zkomplikovat rychlé ruční zadání
- [ ] Na kartě aktiva: aktuální hodnota, změna od vkladu (Kč i %), časová značka ceny
- [ ] **Viditelně uvést, že cena je orientační a se zpožděním** — ne schované v nápovědě
- [ ] Prázdný stav vysvětlí, co se prověřilo: „Aktivum nemá zadaný ticker — hodnotu zadáváš ručně." (SKILL 22, poučení FIX-214)
- [ ] Selhání feedu = tichý fallback na poslední známou cenu + nenápadná značka, **ne chybová hláška**

## Krok 5 · Graf vývoje v čase

- [ ] Čára hodnoty portfolia z `priceHistory`, volitelně po typech aktiv
- [ ] ⚠️ Povinné náležitosti grafu: osy X/Y s popisky a jednotkami, legenda, tooltip, dostatečný padding
- [ ] SVG: `max-width` + `preserveAspectRatio` (jinak ~4× zvětšení na desktopu)
- [ ] Canvas: šířka přes `requestAnimationFrame` + fallback (skryté taby mají `clientWidth=0`)
- [ ] Anti-flicker: `_dataSig()` porovnání před re-renderem

## Krok 6 · Testy před dodáním

- [ ] `node --check` na všech změněných souborech
- [ ] **Runtime smoke test** (SKILL 14): prázdná data · aktivum bez tickeru · feed vrátí chybu · cizí měna · `qty=0`
- [ ] Ověřit, že bez sítě appka nespadne a ukáže poslední známou hodnotu
- [ ] Přepnutí měsíců nebliká

---

## Co se v Fázi 1 NEDĚLÁ

- ❌ Žádné napojení na broker účty, žádné API klíče uživatelů
- ❌ Žádné doporučení co koupit/prodat — appka není investiční poradce
- ❌ Žádná PSD2 agregace
- ❌ Žádné intradenní ceny — denní granularita stačí

## Otevřené otázky pro Milana

1. **Pro tarif, nebo Premium?** ADR-098 navrhuje Pro (299 Kč) kvůli provozním nákladům feedů. Souhlasíš?
2. **Párování ISIN → ticker** u evropských ETF je netriviální. Začít jen tickerem (uživatel zadá `VWCE.DE`), nebo rovnou řešit ISIN?
3. **Kolik měsíců historie** držet? Návrh 24.
