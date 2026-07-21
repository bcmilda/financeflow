# Plán: Sjednocení opakování do modalu transakce (TODO-192)

**Kontext:** Milan navrhuje přesunout „opakování" přímo do modalu Přidat transakci pro **všechny typy** (Příjem / Výdaj / Přesun / Dluh-splátka) a zrušit samostatnou kartu **Opakované šablony**. Dnes existují dvě nesouvisející cesty a jedna neúplná:

| Kde | Co umí | Chybí |
|-----|--------|-------|
| Karta **Opakované šablony** | Příjem/Výdaj/Přesun/Dluh, frekvence týdně–ročně, den v měsíci, datum ukončení, auto-vytváření | – |
| Modal transakce → **Dluh/Splátka** → „🔁 Opakovaná splátka" | jen frekvence (měsíčně/14dní/týdně) | den v měsíci, čtvrtletně, ročně, datum ukončení, auto-checkbox |
| Modal transakce → Příjem/Výdaj/Přesun | **nic** – opakování tu vůbec není | vše |

## Cílový stav

Do modalu transakce (pod poznámku, jednotně pro všechny 4 typy) přidat blok:

```
☐ 🔁 Opakovat tuto transakci
   ├─ Frekvence: [týdně | 14 dní | měsíčně | čtvrtletně | ročně]
   ├─ Den v měsíci: [1–31]   (jen u měsíčně/čtvrtletně/ročně)
   ├─ Datum ukončení: [volitelné]
   └─ ☑ Automaticky vytvářet transakce
```

Při uložení transakce se zaškrtnutým opakováním se **vedle transakce** založí i záznam v `S.sablony` (stejná struktura jako dnes). Tím:
- Uživatel zadá platbu jednou, rovnou i s opakováním.
- Karta „Opakované šablony" se stane jen **read-only přehledem** (seznam + edit/smazat), nebo se skryje do Nastavení.

## Proč NE „velký třesk" hned

Dotýká se jádra `addTx`/`saveTx` v debts.js (~ř. 400+), ukládání do `S.sablony`, všech 4 typů a měnové logiky. Riziko regrese ve vstupu transakcí = nejcitlivější místo appky. Postupovat inkrementálně:

### Fáze 1 (malá, bezpečná) – sjednotit dluhovou opakovanou splátku
Doplnit k `debtRecurring` v modalu: den v měsíci, čtvrtletně + ročně, datum ukončení, auto-checkbox. Napojit na stávající `debt.freq`/`schedule`. **Žádný zásah do obecného addTx.** → hotové během jedné verze.

### Fáze 2 – univerzální blok opakování pro Příjem/Výdaj/Přesun
Přidat sdílený HTML blok `txRecurring*` do modalu, zobrazený pro všechny typy. V `addTx` po úspěšném uložení transakce: pokud je opakování zaškrtnuto, zavolat `saveSablonaFromTx(txObj, recurCfg)` → vytvoří šablonu. Znovupoužít validace ze `saveSablona`.

### Fáze 3 – zjednodušit kartu Šablony
Karta zůstane jako přehled (seznam, edit, smazat, ⚡ použít teď). Tlačítko „+ Přidat" může otevřít rovnou modal transakce s předzaškrtnutým opakováním. Kartu nemazat úplně – je užitečná jako soupis všech opakování na jednom místě.

## Otevřené otázky pro Milana
1. **Karta Šablony:** úplně smazat, nebo nechat jako read-only přehled? (Doporučuji nechat přehled – jinak uživatel nikde neuvidí všechna svá opakování pohromadě.)
2. **Zpětná kompatibilita:** stávající šablony zůstávají beze změny (jen se k nim přidá cesta zadání z transakce). OK?
3. **Auto-checkbox default:** zapnuto, nebo vypnuto? Dnes je v šabloně default zapnuto, u dluhu chybí.

**Doporučení:** začít Fází 1 (dluh) v příští verzi – malá, uzavřená, hned použitelná. Fáze 2–3 až po odsouhlasení odpovědí výše.
