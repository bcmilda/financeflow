# ADR-054 · Hlídání slev – AI monitoring letáků (fázovaný návrh)

**Session 10 · stav: NÁVRH (neimplementováno, fázováno)**

## Kontext
Uživatel může sledovat produkt a appka eviduje historii cen z účtenek (`pricePerUnit`, shrinkflation, historie cen u položek nákupního seznamu). Chybí proaktivní hlídání slev: AI by 2×/týden prohledala letáky a poslala notifikaci o slevě sledovaného produktu.

## Problém / blokery
1. **Zdroj dat letáků** – Claude API neprochází web. kupi.cz/akcniceny.cz nemají veřejné API; scraping je proti podmínkám a křehký. **Největší bloker.**
2. **Periodické spouštění** – nemůže běžet v prohlížeči (appka není stále otevřená). Nutný Cloudflare Worker **Cron Trigger**.
3. **Notifikace** – web push (TODO-030) zatím není.

→ Řetěz 4 nehotových komponent: zdroj dat → cron → porovnání → push.

## Rozhodnutí – fázování
- **Fáze 1 (snadná, vysoká hodnota):** hlídání přes VLASTNÍ data. Když uživatel u sledovaného produktu zapíše účtenku s nižší cenou, appka upozorní „nejnižší cena za 6 měsíců". Žádný externí zdroj. Staví na `pricePerUnit`/historii, kterou konkurence nemá.
- **Fáze 2 (až bude push):** porovnání ceny napříč obchody z vlastní historie + web push upozornění.
- **Fáze 3 (velký projekt):** AI + externí letáky + Worker cron 2×/týden. Až bude vyřešen zdroj dat a appka výdělečná.

## Důvod
Vlastní cenová data jsou cennější a unikátnější než veřejné letáky a nevyhánějí uživatele z appky. Externí letáky (Fáze 3) mají vysoké náklady (zdroj dat, právní rizika scrapingu) a nízkou prioritu (P4).

## Důsledky
- TODO-083 zůstává otevřené jako návrh (NIKDY nebylo implementováno – oprava chybného stavu v todo.md).
- Závislosti: Fáze 2/3 čekají na TODO-030 (push) a vyřešený zdroj dat.

---
*ADR-054 · Session 10 · 2026-06-01*
