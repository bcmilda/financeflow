— nová logika + čárový překryv skutečnosti:
**Co bylo špatně (tvůj postřeh seděl):**

- **Plánovaný výdej** bral `avgExp` = slepý 3měsíční průměr. Ignoroval, co se reálně děje tento měsíc.
- **Sloupce se překrývaly** — plán i budoucí platby obsahovaly tytéž peníze, proto ten matoucí `max()` hack v cashflow.

**Nová logika (přesně jak jsi navrhl):**

- **Plánovaný výdej** = skutečná útrata `(co jsi už utratil)` + odhad zbytku měsíce z denního tempa. Tedy realita + projekce, ne průměr.
- **Budoucí platby** = jen známé naplánované platby (splátky, opakující, narozeniny). Žádný překryv s útratou.
- **Cashflow** = `Příjem − Plánovaný výdej − Budoucí platby` — prosté odečtení, protože sloupce už jsou disjunktní. Pod grafem je výpočet **rozepsaný**, takže uvidíš přesně jak se k číslu došlo.

**Čárový graf skutečnosti (tvůj nápad):**

- Přes sloupce odhadu jde **tečkovaná čára aktuálního stavu** — skutečný příjem, skutečná útrata, skutečně zaplacené budoucí platby, skutečný cashflow k dnešnímu dni.
- Body čáry jsou obarvené podle sloupců. Jak jsi správně předpokládal: **skutečný cashflow je výš** než plánovaný, protože měsíc ještě neskončil — ještě jsi neutratil zbytek a nezaplatil všechny budoucí platby.
- Popisek pod grafem to vysvětluje: „tečkovaná čára = skutečný stav teď (X. den) · sloupce = odhad konce měsíce".