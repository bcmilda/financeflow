# FinanceFlow – Summary Session 9 (v6.66 → v7.02)
**Datum:** 2026-05-27 – 2026-05-28  
**Rozsah:** 36 verzí (v6.66–v7.02), ~2800 řádků změn

---

## 🔧 Opravené bugy (FIX)

### Kritické
| Verze | Soubor | Popis |
|---|---|---|
| v6.82 | stats.js | **COICOP runtime merge mutoval S.categories** → Firebase crash "invalid key" (klíče s "/"). Fix: shallow copy `{...c}` |
| v6.83 | admin.js | HTTP 400 při orderBy="premium/type" – odstraněn orderBy, filtrace v kódu |
| v6.93 | receipts.js | **Duplicitní účtenky** v Obchodech/Historii – build funkce braly S.receipts globál místo uniqueReceipts |
| v6.99.1 | receipts.js | **_activeUctenkyTab is not defined** – proměnná deklarována až po prvním použití |
| v7.01 | receipts.js | **CORS chyba** saveItemTagMapping – odstraněn neplatný `method:'TRANSACTION'`, normalizace klíčů přes NFD |

### Střední
| Verze | Soubor | Popis |
|---|---|---|
| v6.90 | receipts.js | database.rules.json – chybějící `catalog/items` write pravidlo → PERMISSION_DENIED |
| v6.91 | receipts.js | buildStoresTab nepoužíval normalizeStoreName pro seskupení → 6 návštěv Penny ale 0 rozkliknutelných |
| v6.94 | receipts.js | rpRender() blikání při editaci na mobilu – guard na focused input |
| v6.94 | worker.js | Váhové položky (0.246 kg × 249.90 Kč/kg) – AI vracel cenu/kg místo skutečné ceny |
| v7.00 | receipts.js | X zavřít editor nefungoval – orphan kód, chybná logika hledání slotu |
| v7.02 | receipts.js | Duplicita položek ve Statistikách (ROHLÍK 43G ≡ Rohlík 43g) – case sensitivity |
| v7.02 | ui.js | Tagy v Transakcích – modrá barva → růžová (#ec4899) |

---

## ✨ Nové funkce (NEW)

### COICOP systém (v6.74–v6.83)
- **v6.74** – COICOP kruhy (číslo 1–13) v rohu ikon kategorií ve Statistikách
- **v6.76** – FIX: runtime merge bez mutace S.categories (shallow copy)
- **v6.79** – Admin záložka Adopce kategorií: tabulka využití, top podkategorie, custom badge
- **v6.83** – assignCoicop() – admin propíše COICOP do Firebase všem uživatelům

### TODO-014 · AI pamatuje mapování (v6.84)
- normalizeMappingKey(), loadCategoryMappings(), saveCategoryMapping(), lookupCategoryMapping()
- Firebase path: `users/{uid}/categoryMappings/{key}` + localStorage fallback
- ai.js: badge „🧠 Z paměti N×", dvě tlačítka (jen zapamatovat / zapamatovat + přidat)
- import.js + receipts.js: auto-přiřazení z cache při importu a skenování

### TODO-015 · In-app notifikace (v6.85)
- Badge (červený/žlutý) na nav „Budoucí platby"
- Slide-up panel 1.5s po přihlášení, auto-zavře 12s, snooze do localStorage

### Analýza účtenek – velký refaktor (v6.87–v6.95)
- **v6.88** – item-level kategorizace: guessItemCatId(), rpRender() subkat select, multi-tx per kategorie
- **v6.89** – itemStats Firebase: count, totalSpent, avgPrice, history 24 záznamů per položka
- **v6.90** – buildHistoryTab: seskupení dle obchodů (bylo bez struktury), průměr jen >1 návštěva
- **v6.92** – Statistiky: 4-sloupcový grid (Položka | Počet | Celkem | Průměr)
- **v6.94** – worker.js: PRAVIDLO 2 (váhové položky) + PRAVIDLO 3 (slevy/závorková cena)
- **v6.95** – TODO-008: validateReceiptJSON() + validateAiCatJSON()
- **v6.98** – extractUnit(): cena/kg a cena/l z názvu, shrinkflation detektor (pokles >2% hmotnosti)
- **v6.98** – buildPricesTab přepsán: 3 sekce – Shrinkflation / Cena/kg / Cenové změny
- **v7.00** – buildHistoryTab přepsán: sort (datum/suma), filtr dle obchodu, datum zlatě před názvem
- **v7.00** – Položkové tagy 🏷️: zelený input u každé položky, community Firebase mapování
- **v7.01** – Tag input: nápověda zmizí při focus, datalist suggestions
- **v7.02** – Statistiky: sloupec Ks, graf Název/Tag/Období (SVG sloupcový + čárový kumulativní)

### normalizeStoreName (v6.91)
- PENNY/PENNY MARKET s.r.o. → PENNY MARKET
- MOJ/MÔJ/MÚJ obchod → sloučení přes NFD normalizaci
- Deduplicator: žlutý banner + tlačítko „Smazat duplikáty"

### TODO-006 · Globální error handler (v6.99)
- window.addEventListener('error') + unhandledrejection → červený banner fixed top
- Ignoruje: ResizeObserver, third-party, Firebase network/permission, offline
- Sentry capture pokud dostupný, auto-hide 8s

### TODO-082 · COICOP agregáty (v6.99)
- computeCoicopAggregates(txs, D): přiřadí COICOP 1–13 každé transakci
- uploadCoicopToFirebase(): anonymní upload, throttle 5 min po save()
- Admin: záložka „🔢 COICOP přehled" – dual progress bar vs. ČSÚ průměr

### Modal Přidat transakci (v6.97)
- a) Peněženka select (populateTxWalletSelect)
- b) Typ platby select: Hotovost/Karta/Bankovní převod
- c) Měna z peněženky – auto-přepne převodník
- d) Převodník: orientační kurzy CZK/EUR/USD/PLN/GBP/CHF/HUF
- e) Kalkulačka 🧮: rozkliknutelný panel 4×4, „Vložit do Částka"
- f) Zlaté labely polí, sub-chip barva dle kategorie, vybraná podkat = plné pozadí + bílý text

### Affiliate sdílení (v6.96)
- Primární „📤 Sdílet s přáteli" – Web Share API (nativní share sheet)
- Přímé kanály: WhatsApp, Signal (clipboard fallback), Telegram, Messenger, Email, SMS, QR, kopírovat

### TODO-008 · Validace JSON (v6.95)
- validateReceiptJSON(): store fallback, total jako číslo, items jako pole, price/qty normalizace
- validateAiCatJSON(): catId, confidence enum, fallbacky

### Admin panel – Item Tagy (v7.00)
- Záložka „🔖 Item Tagy": komunitní mapování tagů položek
- (1×) růžová barva, fajfka šedá→zelená po schválení
- validateItemTag(): ukládá do itemTagValidation/{key}/{tag}/status

---

## 📐 Architektura – nové Firebase paths

| Path | Účel |
|---|---|
| `users/{uid}/categoryMappings/{key}` | AI mapování kategorií (TODO-014) |
| `users/{uid}/itemStats/{key}` | Statistiky naskenovaných položek |
| `admin_coicop_overrides/{catId}` | Admin COICOP přiřazení |
| `community/{YYYY-MM}/users/{uid}` | COICOP agregáty (TODO-082) |
| `community/itemTags/{key}/{tag}` | Komunitní tagy položek |
| `community/itemTagValidation/{key}/{tag}` | Admin validace tagů |

---

## ❓ Low confidence – co to je

**Low confidence** = záložka v Admin panelu kde jsou zobrazeny transakce uživatelů, které `mapToCOICOP()` funkce nedokázala s jistotou přiřadit do COICOP skupiny (confidence < 50%).

**Jak funguje:**
1. Každá expense transakce projde `mapToCOICOP(tx)` – keyword matching dle názvu transakce
2. Pokud confidence < 50% → transakce se zobrazí v Low confidence tabulce
3. Admin vidí: název txn, namapovanou skupinu, % jistoty
4. Tlačítko „+ Přidat pravidlo" otevře dialog kde admin zadá klíčové slovo (část názvu, např. "google") → uloží do `keyword_overrides/{kw}/coicopId`
5. **Propíše se:** při příštím mapování (nebo re-indexaci) se keyword_overrides aplikují před výchozím matchingem → transakce dostane správnou skupinu s jistotou 100%
6. Zlepšuje komunitní statistiky COICOP přehledu pro všechny uživatele

---

## 📦 Nasazení

```bash
# Firebase hosting
firebase deploy --only hosting

# Firebase rules (po každé změně database.rules.json)
firebase deploy --only database

# Cloudflare Worker (worker.js)
# → Cloudflare Dashboard → Workers → misty-limit-0523 → Edit code → Deploy
```

---

*Session 9 · v6.66–v7.02 · Claude Sonnet 4.6 · 2026-05-28*
