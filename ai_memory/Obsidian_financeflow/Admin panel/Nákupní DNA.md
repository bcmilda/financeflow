**Nákupní DNA se buduje ze všech uložených účtenek** (`S.receipts`) při každém otevření záložky „Učí se" v Analýze účtenek. Jde o 6 věcí:

**1) Oblíbený obchod** — agreguje součet útrat za každý obchod (`r.store`), seřadí sestupně, vezme první. Zobrazí jméno obchodu + počet návštěv.

**2) Typický nákup (medián)** — vezme celkové částky všech účtenek, seřadí je a vrátí prostřední hodnotu. Medián místo průměru — záměrně, aby ho nezkreslovaly velké jednorázové nákupy (Ikea, elektro…).

**3) Nejčastější den nákupu** — z každé účtenky vezme den týdne (`getDay()`), sčítá výskyty, vrátí vítěze. Třeba „Pátek".

**4) Předpověď příštího nákupu** — z chronologicky seřazených dat účtenek počítá průměrné intervaly mezi nákupy (ignoruje mezery >60 dní = výpadky, ne vzor). Přidá průměrný interval k datu poslední účtenky a říká „Za 3 dny" / „Zítra" / „Dnes nebo včera".

**5) DNA vizualizace (sloupcový/pie chart)** — agreguje celkové útraty dle kategorie účtenky (`r.category`), kreslí barevné segmenty. Kategorie přiřazuje Claude při analýze fotky.

**6) Frequent items** — prochází **všechny položky** ze všech účtenek (`allItems`), normalizuje názvy na lowercase, sčítá výskyty. Zobrazí položky s `count >= 2` — věci, které kupuješ opakovaně (jogurt, rohlíky, pivo…). Ukládá i průměrnou cenu a ze kterých obchodů.

**Podstatné omezení:** DNA funguje jen z **ručně naskenovaných účtenek** — nemapuje se na transakce zadané jinak (import výpisu, ručně). Takže čím víc účtenek naskenuješ, tím přesnější obraz. Frequent items navíc teď skvěle ladí s novou **produktovou DB** (product-groups.json) — každá položka dostane tag automaticky, takže DNA může brzy pracovat i s COICOP skupinami, ne jen kategoriemi účtenek. To by bylo rozšíření do TODO.

Hotovo — **v7.78**, 4 dotčené soubory + Playwright kit. TODO o COICOP rozšíření DNA mám zapamatované ✅.

**🏪 Obchody v měsíci (tabulka)** — pro vybraný měsíc: obchod s barevným badge, počet návštěv, celková útrata, **Ø útrata na nákup** a **typický den nákupu** (nejčastější den v týdnu u daného obchodu). Top 8 dle útraty.

**📈 Trend útrat dle obchodů (spojnicový graf)** — top 4 obchody za posledních 6 měsíců. K logům: skutečná loga řetězců nemáme (autorská práva + assety), tak jsem udělal **barevné badge s iniciálou ve firemní barvě** — Lidl modrý, Kaufland červený, Albert zelený, Billa žlutá… (20 známých CZ řetězců namapováno, neznámé dostanou stabilní barvu z hashe názvu). Graf má vše dle tvých pravidel: osy s Kč popisky, mřížku, legendu pod grafem, tooltip fungující myší i prstem (`attachChartTouch`), a `requestAnimationFrame` + fallback pro skrytý tab (clientWidth=0).