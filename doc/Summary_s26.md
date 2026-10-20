# Session 26 · FinanceFlow · shrnutí

> 2026-10-10 až 2026-10-16 · appka **v11.62 → v11.83** (22 verzí) · worker beze změny (v11.61) · pravidla DB: **v11.68** (`community/eanZamky`, admin čte `eanKartyLog`)
> Na GitHubu (`dev`) je **v11.61**. Ve výstupech `verze/v11.62` až `verze/v11.83` je kompletní stav; push čeká na PAT (22 commitů).
> ⚠️ `vyplatnice-import.json` (skutečné výplatnice) leží ve veřejně čitelném repu – smazat při příštím pushi (Milan zatím nepotvrdil).

---

## Co přibylo

| Oblast | Hlavní body |
|---|---|
| **Výplatnice (v11.77–v11.83)** | Import přes AI pro jakoukoli pásku (pokyn s šablonou, nové položky se do šablony přidají, odvody opsané z pásky, kontrola součtů, nahrání souboru). Karta měsíce s celou páskou. Grafy se stupnicí, mřížkou, průměrem a filtrem. Šest složek mzdy (pevná, příplatky, **přesčas**, prémie, mimořádné odměny, ostatní). Nové karty: **🔭 Megagraf** (30 řad, hlavní/vedlejší osa, pás událostí) s **❓ otázkami v bublinách**, **🏛️ Daně a odvody** (odvody z přesčasu přesně, 734 Kč z tisícovky), **💪 Přivýdělek nad rámec**, **🎁 Mimořádné odměny**, **✂️ Srážky po měsících**, **🧾 Roční zúčtování daně**. |
| **Pracovní kalendář (v11.75, v11.78–v11.81)** | Směna 12 h − 1 h přestávka = 11 h (dovolená i přesčas). **Odhad výplaty z pásky + hodin kalendáře** s rozpisem (ověřeno zpětně na páskách). **🧪 Simulace přesčasů** klepnutím na volné dny. Typ dne **🩺 Paragraf** (neplacený zaměstnavatelem, dávka od ČSSZ). Zůstatek dovolené z pásek + kalendáře. Jeden měsíc = jedna výplata. |
| **Účtenky** | **Vratné lahve** (znaménko z AI se už neabsolutizuje, ♻️ oprava v editoru) a sloupec Celkem (v11.76). Historie a Doklady míří vždy na správnou účtenku (v11.70, v11.74). Hromadná kategorie položek (v11.71). Zaokrouhlení jen nabídnout, ne měnit (v11.71). Filtr Dokladů (v11.74). |
| **Čárové kódy a karta výrobku** | Známé výrobky se přiřadí samy, komunita automaticky jen při jasně vedoucím kódu (v11.64). Gramáž z obalu (v11.66). Živiny v nákupu (v11.67). Nové karty bez schvalování + 🔒 zámek admina (v11.68, TODO-334). Kód z fotky bez pádu (v11.72). Karta: pruhy % denní dávky, Nutri-Score jen z OFF, prázdná pole → „Doplnit na Open Food Facts“, Dovozce jen když je známý, prodejny bez duplicit, oprava názvu z EAN adminem, obnova po 90 dnech i při otevření (v11.82). |
| **Duplicity** | Podezřelé páry za všechny měsíce (v11.73), „Není duplikát“ natrvalo, smazání kopie účtenky; transakce účtenky jen přes účtenku (v11.74). |
| **Okna a odezva** | „💾 Uložit změny?“ u všech oken s Uložit (v11.72). Brzda překreslování nejvýš 60 s + „🔄 Ukázat změny“ (v11.74). Karta výrobku se nezavře klepnutím vedle ani prvním Zpět. |
| **Měsíční report (v11.69)** | Nový vzhled (světlý podklad, logo, tmavší písmo), karty se sloupci za 6 měsíců, kalendář útraty po týdnech, diamanty jen bez přístupu. |
| **Osa života (v11.62–v11.63)** | Barevné poznámky, rozsah 6M/Rok/2 roky/Vše, filtr, posuvník u dlouhé historie. |

## Opravy
FIX-451 až FIX-474 (`bugs.md`). Nejdůležitější:
- **FIX-452 · Historie: ✎ otevřel jinou účtenku** (pozice v seznamu bez duplikátů ≠ index v datech). Stejná chyba v Dokladech (FIX-457).
- **FIX-465 · Vratné lahve se přičítaly** – `Math.abs` u ceny z AI.
- **FIX-469 · Odhad výplaty přenášel přesčas** (sazba z minulé výplaty × „vážené hodiny“ 198 h).
- **FIX-458 · Kód z fotky shodil appku** (celá 50Mpx fotka v paměti).
- **FIX-468 · Nutri-Score šel dál ručně upravit**, přestože jsem tvrdil, že je jen z OFF.

## Rozhodnutí
ADR-209 až ADR-222 (`decisions.md`). Klíčové:
- **ADR-210:** nové karty výrobků bez schvalování, admin jen přehled a zámek.
- **ADR-213:** transakce účtenky se maže jen přes účtenku.
- **ADR-216 / ADR-217:** odhad výplaty z pásky + kalendáře; jeden měsíc = jedna výplata.
- **ADR-218:** paragraf = neplacený zaměstnavatelem.
- **ADR-219:** otázky k výplatám počítá appka (worker se nemění).
- **ADR-220:** Nutri-Score jen z OFF, prázdná pole přes Open Food Facts.
- **ADR-221:** data letáků (Kupi.cz) jen se souhlasem provozovatele.
- **ADR-222:** zákonné částky ročního zúčtování v tabulce po rocích.

## Poučení
SKILL 86–93 (`CLAUDE_SKILLS.md`):
- Odhad z dat ověřit zpětně na skutečných datech.
- „Opraveno“ hlásit jen s testem, který to hlídá.
- Znaménko z AI neabsolutizovat.
- Pozice v zobrazeném seznamu ≠ index v datech.
- Sazba z minulého období nesmí nést jednorázové složky.
- V textu appky nikdy jméno konkrétního uživatele.
- Právní a mzdové pojmy ověřit u uživatele (paragraf).
- Jedna obrazovka = jedno číslo, nemíchat „v měsíci“ a „za měsíc“.

## Co se nepovedlo napoprvé
- **Zaokrouhlení účtenky** jsem ve v11.70 měnil automaticky; Milan: „ne všechny obchody zaokrouhlují“ → v11.71 jen nabídka (ADR-212).
- **Smazání duplikátu z Transakcí** (v11.73) šlo i u originálu; Milan to nechtěl → v11.74 ochrana (ADR-213).
- **Paragraf** jsem ve v11.78 bral jako placenou překážku; Milan: „snižuje mzdu, peníze přijdou od státu“ → v11.79 (ADR-218).
- **„V listopadu přijde výplata za říjen“** (v11.80) Milan odmítl: jeden měsíc = jedna výplata → v11.81 zrušeno.
- **Nutri-Score** zůstal ručně upravitelný, i když jsem řekl, že je jen z OFF → v11.82 (SKILL 87).
- **Návrhy dalších kroků** byly slabé („Moc novinek si mi neporadil“) – lepší se ukázaly konkrétní nápady z dat (roční zúčtování).

## Otevřené (podrobně v `todo.md`, Session 26)
TODO-343 push + nasazení + smazání `vyplatnice-import.json` · TODO-344 vyzkoušet v11.62–v11.83 · TODO-345 predikce výplaty v Příštím měsíci a Do výplaty · TODO-346 kontrola výplatnice proti kalendáři · TODO-347 kalibrace odhadu podle skutečnosti · TODO-348 hlídání letáků (Kupi API / Open Prices) · TODO-349 AI otázky k výplatám (endpoint) · TODO-342 C-lite překreslování.

---

## Pokračování · v11.84 → v11.89 (2026-10-16 až 2026-10-18) **(Session 26)**

> Milan nasadil **v11.89** a sám ji nahrál na GitHub (`dev` = 40d1214). Kód v repu je shodný s mým, chyběly jen MD soubory (doplněny tímto commitem).
> Pravidla DB: **v11.89** (`users/$uid/inbox`, `inboxPairing`, `inboxLinks`). Worker beze změny (v11.61). Testy: **167 prošlo, 0 selhalo**.
> Od v11.88 posílám jen **změněné soubory** (ne celé sady).
> Komentáře v kódu označené „S27“ patří do Session 26 (číslo session opraveno 18. 10.).

| Verze | Hlavní body |
|---|---|
| v11.84 | Měřidla: VT/NT, stabilní karta s panely místo vyskakovacích oken, úprava a mazání odečtů, hromadný import odečtů (innogy), odhad podle loňska |
| v11.85 | Tarif jen u elektřiny a nahoře v nastavení, druh jako text, plyn (m³) a voda se stejnou kartou |
| v11.86 | Transakce: viditelné aktivní filtry (štítky), „všechny měsíce“ se při přepnutí měsíce vypne. Zálohy z měřidla jako opakovaná platba (šablona) |
| v11.87 | Megagraf na celou stránku, osy výslovně, sledování od ledna (YTD). Prohozené datum účtenky, Podezřelé: ruční transakce = položka účtenky, úprava transakce už nemaže tankování, graf ceny za litr s odsazenou osou, sloupec Ušetřeno |
| v11.88 | Tankování z účtenky benzínky (bez ruční transakce), megagraf jako samostatná stránka ve Výplatnici, otázky „kolik dovolené zbývá“ a „seřaď hrubou mzdu“ |
| v11.89 | 📲 Notifikace z telefonu → 📥 Doručené (`js/inbox.js`), spojení s naskenovanou účtenkou (sken převezme platbu), pravidla DB v11.89 |

**Mimo web:** `PLAN_NATIVNI_APLIKACE.md` (pomalý převod do nativní appky, vícejazyčnost). Lokální projekt `financeflow-native` v0.1.0 (Android „FinanceFlow Inbox“, Kotlin, nikdy nesestaven – Android SDK tady není dostupné). Paralelní Session N1 mezitím rozhodla jinak (N-005 oznámení rovnou do Transakcí, N-008 bez kategorie) → **Inbox pozastaven** (ADR-231, TODO-357). Repo `financeflow-native` patří n0.2, proto jsem ho pro Inbox nezakládal.

**ID:** FIX-475–483 · ADR-223–231 · SKILL 94–97 · TODO-350–357.
**Celkový rozsah Session 26:** v11.62 → v11.89 · FIX-451–483 · ADR-209–231 · SKILL 86–97 · TODO-342–357.

### Poučení (pokračování)
- SKILL 94: funkce schovaná v nastavení pro uživatele neexistuje (VT/NT zaškrtávátko).
- SKILL 95: skrytý stav, který mění výsledek, musí být vidět (filtry Transakcí).
- SKILL 96: úprava záznamu nesmí tiše mazat připojená data (tankování).
- SKILL 97: před stavbou nové velké části zkontrolovat Projekt a paměť (Inbox vs. N1).

### Co se nepovedlo napoprvé (pokračování)
- **VT/NT** jsem ve v11.84 schoval za zaškrtávátko, Milan ho nenašel → v11.85 tarif nahoře a jen u elektřiny.
- **Megagraf** jsem ve v11.87 udělal na celou šířku karty; Milan chtěl samostatnou stránku → v11.88.
- **Tankování z účtenky:** Milan musel transakci psát ručně, jinak se nezobrazila ve Vozidlech → v11.88 tankování přímo z účtenky.
- **Inbox:** postaven bez kontroly rozhodnutí paralelní Session N1 → pozastaveno, SKILL 97.

### Otevřené (podrobně v `todo.md`)
TODO-357 rozhodnutí Inbox vs. n0.2 · TODO-356 🧮 Kalkulačky (jedna stránka) · TODO-355 Monte Carlo · TODO-345 / 346 výplata · TODO-350 / 352 Měřidla · smazání `vyplatnice-import.json` z repa (čeká na souhlas).
Plán další session: `PLAN-SESSION-27.md`.

---
