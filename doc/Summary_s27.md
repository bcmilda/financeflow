# Session 27 · FinanceFlow · shrnutí

> 2026-10-19 až 2026-10-24 · appka **v11.90 → v12.10** (21 verzí) · worker beze změny (v11.61) · pravidla DB beze změny (v11.89)
> **52 JS modulů** (nové `kalkulacky.js`, `dotazy.js`, `obchody.js`) · testy: 186 sad `tools/smoke_*` + `smoke.js`, vše prochází.
> Ze session se nepushuje: repo není připojené, Milan nahrává sám přes GitHub Desktop ze složek `outputs/vX.YY/`. Lokálně 24 commitů.

---

## Co přibylo

| Oblast | Hlavní body |
|---|---|
| **🧮 Kalkulačky (v11.90–v11.91)** | Nová stránka s rozklikávacími kartami: 🛟 Rezerva, 🚬 Cena zlozvyku (i z položek účtenek), 📅 Do výplaty. Monte Carlo (2 000 simulací, vějíř, pevný seed). Zatím zdarma. |
| **🧾 Účtenky (v11.92–v11.97)** | ✍️ Ruční účtenka (+ 📷 přidat skenem), název výrobku z kódu pod položkou s kontrolou proti zkratce, jedna zkratka → víc druhů (výběr „Který druh?“), větší pole tagu. |
| **🔎 Zeptej se svých dat (v11.96)** | Otázka vlastními slovy (káva, pečivo, jak často do obchodu), AI jen plán, čísla počítá appka; přepínání období, míry, výstupu a rozpadu. |
| **💰 Měsíc jako měsíc (v11.98–v12.02)** | Čistý majetek, Rezerva ve skóre (hotovost, účet, spořicí, cíle ÷ Ø výdajů 6 měsíců) a dluhy ke konci vybraného měsíce. 📜 Změny půjčky, Zbývá · ke dni, splátka z Opakované platby snižuje Zbývá, Splátkový kalendář od začátku s 📍 Dnes. |
| **💹 Ceny a obchody (v12.05–v12.08)** | Stejné se stejným v Zdražování, zálohy mimo ceny, palivo za litr, tankování jen ze skutečného paliva s úpravou. 🏪 Trend nákupů po obchodech (Analýza účtenek, Report strana 3, Grafy → 🏪 Obchody s porovnáním let). Jednotky l / kg / ks a Ø za jednotku. |
| **📲 Doručené (v11.91, v12.06)** | Odkaz na APK FinanceFlow Inbox (funguje, platby z banky chodí). Tatáž platba 2× = jedna, banka podle aplikace, 📈 Investice, ↔️ Přesun, karta / účet → peněženka. |
| **🗺️ Mapa položek (v11.92, v12.09)** | Karta podle kódu, 📅 data nákupů → otevřít účtenku, ✎ Opravit název (karty se spojí), předělané 🔄 přeřazení starých účtenek, pasti v zařazení (taxonomie 1.3). |
| **🛒 Nákupní seznam (v12.10)** | Našeptávač bez dvojic, jen cena, hlídač ceny na záznam s cenou. |
| **Mimo kód** | Google Play: vývojářský účet, interní testování (verze 1), druhý otisk v `assetlinks.json`. GitHub Desktop: rozjetá větev vyřešena Pullem. |

## Opravy
FIX-484 až FIX-492 (`bugs.md`). Nejdůležitější:
- **FIX-486 · Rozpracovaná účtenka se po klepnutí na záložku ztratila**, editor zůstal a tlačítka nic nedělala.
- **FIX-485 · Mapa položek tvořila karty podle názvu**, ne podle kódu (Milena 2 karty, chipsy 1).
- **FIX-492 · Nákupní seznam: výrobek víckrát, jednou „cena neznámá“** – dva zapisovače katalogu s různým klíčem; hlídač ceny by u takové položky nikdy neupozornil.
- **FIX-491 · „ø Kč/ks“ byl průměr za nákup** a palivo mělo „kg/l“ nebo „ks“.
- **FIX-488 / 489 · Duplikáty:** tlačítka v řádku obráceně, filtr Podezřelé zůstal zapnutý bez tlačítka.

## Rozhodnutí
ADR-233 až ADR-247 (`decisions.md`). Klíčové:
- **ADR-233 / 239 / 234:** rezerva, Čistý majetek a dluhy ke konci vybraného měsíce; investice, penzijko a DIP do rezervy ne, cíle ano.
- **ADR-237:** karta podle kódu, víc druhů u zkratky lokálně, žádný dialog při skenu, komunitní práh zatím ne.
- **ADR-241:** stejné se stejným – obecně jen ovoce, zelenina, brambory, pečivo.
- **ADR-243:** trend obchodů z účtenek i notifikací, zapamatovaná barva obchodu.
- **ADR-244 / 245:** karty bez kódu se automaticky neslučují („není brambor jako brambor“); chybné zařazení se opravuje v datech (pasti), bez podmínek, COICOP nikdy ručně.
- **ADR-246 / 247:** přeřazení starých účtenek po výrobcích s důvodem; jeden klíč komunitního katalogu.

## Poučení
SKILL 98–105 (`CLAUDE_SKILLS.md`):
- Neměnit, co nebylo zadáno.
- Všechny zapisovače jednoho uzlu se stejným klíčem.
- Popisek jednotky z čitatele a jmenovatele.
- Výchozí volba, kterou uživatel nevidí, musí jít změnit.
- Odhad podle jednoho slova je past – opravovat v datech.
- Nejdřív nejjednodušší ruční cesta, automatika až když je jistá.
- Překreslení při `blur` zahodí klepnuté pole.
- Filtr musí svítit všude a zmizet se svým důvodem.

## Co se nepovedlo napoprvé
- **Neobjednané změny:** k opravě tagu jsem přidal `autocomplete` / `enterkeyhint` – Milan: „Proč si to měnil?“ → vráceno (SKILL 98).
- **Push:** pokus o push skončil 403 a připojení repa Milan odmítl – „Push byla moje mýlka“. Soubory jdou přes outputs.
- **Návrh pro Mapu položek** (slučování podle obecného názvu, podobné názvy, štítek v zařazení) Milan odmítl jako „nedomyšlený a komplikovaný“ → ruční oprava názvu a pasti (SKILL 103).
- **Okno přeřazení starých účtenek** ze S24 bylo nesrozumitelné a navrhovalo nesmysly (koš, taška, restaurace) → v12.09.
- **Barvy obchodů:** Lidl a Kaufland vyšly skoro stejně modré → porovnání podle odstínu. Malé písmo SVG v Reportu na telefonu → užší viewBox.
- **Testy s plynoucím časem** (`smoke_castka_splatky`) padaly → pevný „dnešek“.

## Otevřené (podrobně v `todo.md`, Session 27)
TODO-365 vyzkoušet v11.90–v12.10 na skutečných datech · TODO-363 Google Play (minSdk 24, versionCode 2, hlavní panel, testeři) · TODO-364 `legal.html` provozovatel · TODO-358 🔗 Spojit s… · TODO-359 AI fronta Mimo taxonomii · TODO-361 revize kategorií + ☕ sledovaná témata · TODO-362 Inbox (auto-načtení, pravidlo `$id`, Play) · TODO-360 karta bez kódu · TODO-366–371 menší a odložené · TODO-343 `vyplatnice-import.json` z repa (čeká na souhlas) · TODO-345 / 346 výplata.
Plán další session: `PLAN-SESSION-28.md`.

---

## Dodatek · v12.11–v12.12 (2026-10-25 až 2026-10-26)

> Session 27 celkem: **v11.90 → v12.12** (23 verzí) · worker beze změny (v11.61) · pravidla DB beze změny (v11.89) · testy 189 sad + `smoke.js`, vše prochází.

| Oblast | Co |
|---|---|
| **📅 Analýza účtenek od vybraného měsíce (v12.11–v12.12)** | Nejčastější položky a Vývoj nákupů 1M–12M do vybraného měsíce, Trend, Slevy, Statistika položek, Srovnání ČR = průměr za kalendářní rok (popsáno na kartě), Trend obchodů podle roku nahoře. Statistiky (Za co utrácíš, souhrn, Výdaje dle kategorie, Co nakupuješ) a 🧬 Nákupní DNA s přepínačem 📅 měsíc / ∞ Vše. Bez probliknutí. |
| **🔗 Spojit s… (v12.12)** | Mapa položek → karta: připojit jinou kartu, hlavní název, zkratka se zapamatuje, ✕ Odpojit. |
| **📄 Report – strana Obchody (v12.12)** | 3 největší a 3 nejmenší nákupy, srovnání s minulým měsícem, obchody a trend; strana Účtenky už nepřetéká A4. |
| **💱 Převodník (v12.11)** | Kurzy měn: částka, z / do, ⇅. |
| **🎂 Narozeniny, svátky a výročí (v12.11)** | Druh a rok narození → věk / „bude N let“. |
| **FIX-493** | Bublina grafu obchodů a Aktiv na telefonu 9× větší. |

**Rozhodnutí:** ADR-248–251. **Poučení:** SKILL 106 (canvas a dpr), SKILL 107 (stránka s měsícem nahoře).
**Vysvětleno bez změny kódu:** nižší daň z výplaty od 12/2025 (sleva na dítě 1 267 Kč), březen 2025 = 33 h přesčasu (`explanations.md`).
**Zhodnoceno, nestaví se:** rozklik řádků „Za co utrácíš“ s grafem po měsících – jde to za jednu verzi (TODO-372).
**Otevřené navíc:** TODO-372, TODO-373. TODO-358 hotovo.
