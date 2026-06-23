# 📊 Summary — FinanceFlow Session 13

> Souhrn nejdůležitějšího z jednotlivých verzí. Co jsme řešili a co implementovali.
> **Rozsah:** v8.10 → v8.27 (18 verzí) · 18.–20. 6. 2026 · Jazyk: čeština

---

## 🎯 Hlavní témata session

1. **Izolace dat mezi uživateli** (kritický bezpečnostní fix)
2. **Dotažení cílů a přání** (reverz peněz, měny, sjednocený modal)
3. **API tracking nákladů** (tokeny, Kč, per user + komunita)
4. **Vyjasnění COICOP** (overrides vs shared)
5. **Přesuny** (nový typ kategorie pro investice/spoření/rezervu + napojení na dashboard)
6. **Frekvence výplaty** (Runway pro týdenní/nepravidelné příjmy)
7. **Kvalita pro nové uživatele** (čistý start, onboarding, nápověda, export)
8. **Verzovací hlavičky** (okamžitá identifikace aktuálnosti souborů)

---

## 📦 Co přinesla jednotlivá verze

### v8.10–v8.12 · Velký refaktor cílů
**Řešili jsme:** cíle dvojitě odečítaly peníze, neuměly cizí měnu, přání a cíl měly oddělené modaly.
**Implementovali jsme:** reverz peněz mazáním párové transakce (žádné dvojí odečtení), měnový přepočet do cíle (`toCZK`), sjednocený modal Přání/Cíl s 20 ikonami, záložky Aktivní/Splněno, virtuální peněženku v čistém majetku.

### v8.13 · Cizí měny a filtry
**Řešili jsme:** eurová peněženka zobrazovala „Kč", filtr typu platby byl skoro prázdný.
**Implementovali jsme:** správné zobrazení měny (EUR/GBP), filtr přes `getPayTypes` (všechny typy).

### v8.14 · Kategorie přesunů z reálných dat
**Řešili jsme:** virtuální přesun směřoval na vymyšlené ID → „?" u transakce.
**Implementovali jsme:** hledání reálné kategorie podle jména (`findCatIdByName`), odebrání vymyšlené kategorie, admin tier ve workeru (bez rate limitu).

### v8.15 · 🚨 KRITICKÝ fix úniku dat
**Řešili jsme:** při střídání účtů na zařízení viděl uživatel data předchozího uživatele (stav `S` se nevyčistil, listenery zůstaly).
**Implementovali jsme:** `resetAppState()` při odhlášení (před zrušením uživatele), čistou aplikaci pro nového uživatele (žádná demo data), 100% mazání dat (včetně IndexedDB), fix modelu workeru (`claude-sonnet-4-6` místo 404), pravidlo pro welcomeMessage.

### v8.16 · Partner view a systémové kategorie
**Řešili jsme:** „Zobrazit jako uživatel" ukazoval adminovi jeho vlastní data místo uživatelových.
**Implementovali jsme:** načtení dat uživatele před přepnutím, zamčení systémové kategorie pro ne-admina, 28 emotikonů pro uvítací hlášku.

### v8.17 · Komunitní bar
**Implementovali jsme:** sloučený bar Já vs komunita (modrá = průměr, zelená = ty, červená = přebytek).

### v8.18 · Béžové téma + skóre aktivity
**Implementovali jsme:** béžové (sepia) téma šetrné k očím, skóre aktivity uživatele v admin detailu, sloupce Typ platby + Peněženka v tabulce transakcí (jen desktop).

### v8.19 · COICOP v komunitě
**Řešili jsme:** komunita zobrazovala COICOP jako holá čísla „1, 4, 6".
**Implementovali jsme:** mapování na oficiální názvy divizí, konzistentní výpočet obou stran.

### v8.20 · Export, vyhledávání, checklist, nápověda
**Implementovali jsme:** CSV export transakcí (pro Excel/účetnictví), vyhledávání napříč měsíci, měsíční checklist na dashboardu (výplata + 20 transakcí), stránku nápovědy `napoveda.html` pro web.

### v8.21 · API tracking
**Řešili jsme:** nevěděli jsme kolik uživatelé provolají na AI a za kolik.
**Implementovali jsme:** worker ukládá tokeny + náklady v Kč per user/typ, admin detail „Spotřeba AI", komunitní karta s agregací nákladů a top uživateli.

### v8.22 · 🐛 Fix pádu Budoucích plateb
**Řešili jsme:** kliknutí na cíl shazovalo appku (`nakupSwitchTab is not defined` — zastaralé volání po přesunu cílů).
**Implementovali jsme:** opravu odkazu na `showPage('narozeniny')` + zpřístupnění funkcí na `window`.

### v8.23 · Označení sdílených podkategorií
**Řešili jsme:** nebylo poznat které podkategorie jsou sdílené s jinou kategorií.
**Implementovali jsme:** zlatý přerušovaný rámeček + ↔ + tooltip u sdílených podkategorií (Pojištění v Bydlení, Alkohol v Jídle). Vyjasnili jsme rozdíl: `coicopOverrides` (jiná COICOP divize) vs `shared` (kategorie i jako podkategorie jinde).

### v8.24 · Verzovací hlavičky
**Řešili jsme:** nešlo na první pohled poznat jestli je soubor aktuální verze.
**Implementovali jsme:** hlavičku `// FinanceFlow · vX.XX · soubor · datum` na začátku každého souboru (JS, worker, sw, database_rules) + dokumentaci Session 13.

### v8.25 · Typ kategorie Přesun
**Řešili jsme:** spoření/investice se počítaly jako výdaj (snižovaly majetek), což je špatně.
**Implementovali jsme:** nový typ kategorie „Přesun" vedle Příjem/Výdaj/Oboji. Transakce v nich nesnižují majetek, ale peněženka se upraví. Výchozí: Investice, Trading, Finanční rezerva, Spoření, Fondy, Penzijko. V „Oboji" zůstaly Finanční úřad + Půjčka.

### v8.26 · Frekvence výplaty
**Řešili jsme:** Runway uměl jen jednu měsíční výplatu — ne týdenní výplatu, mateřskou, dávky, zálohu+doplatek nebo OSVČ.
**Implementovali jsme:** nastavení frekvence (měsíčně/14denně/týdně/2× měsíčně/nepravidelně), Runway počítá cyklus podle ní. Nepravidelný režim počítá z průměrného odstupu reálných příjmů.

### v8.27 · Napojení přesunů na dashboard (fáze 2)
**Implementovali jsme:** dashboard kartu „Moje úspory a investice" — kolik peněz směřuje do Investic a Rezervy/Spoření (kumulativně + tento měsíc) + rozpad podle kategorie. Počítáno z přesunových transakcí, vždy konzistentní (nemutuje data).

---

## 🔢 ID a čísla

| Typ | Rozsah Session 13 |
|-----|-------------------|
| **Verze** | v8.10 → v8.27 (18 bumpů) |
| **FIX** | FIX-147 až FIX-159 (13 oprav) |
| **ADR** | ADR-065 až ADR-074 (10 rozhodnutí) |
| **TODO** | TODO-137 až TODO-143 (7 položek) |

---

## ⚠️ Otevřené body / co dál

- **TODO-137** Cookie/consent UI pro analytická data (GDPR) — GA4 zatím běží bezpodmínečně
- **TODO-138** Hlídač součtu limitů kategorií (>100 %)
- **TODO-139/140** Doporučené limity + pokyn v checklistu pro nové uživatele
- **TODO-143** Fáze 3 přesunů: tabulky a grafy vývoje investic/spoření v čase
- **TODO-075** AI Rate Limiting — kód hotový, pending ověření secrets

## 🚀 Deploy

- **Hosting:** `firebase deploy --only hosting`
- **Worker:** Cloudflare Dashboard (model fix + token tracking)
- **Pravidla:** database_rules.json (welcomeMessage + aiUsage)
- **Secrets:** ověřit FIREBASE_SERVICE_ACCOUNT + FIREBASE_DB_URL v Cloudflare
