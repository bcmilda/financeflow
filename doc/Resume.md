# Resume - FinanceFlow Session 13

> **Doplnění Session 25** (2026-10-09): na konci souboru nová sekce „Session 25 (2026-10-05 až 2026-10-10) · v11.30 → v11.61“ včetně dodatku v11.28–v11.30. Přehled v `doc/Summary_s25.md`.

Verze: v8.10 -> v8.24 (15 verzi)
Datum: 18.-20. 6. 2026
Jazyk: cestina . Stack: Vanilla JS, Firebase, Cloudflare Workers, Claude API

---

## Hlavni milniky session

1. KRITICKY fix uniku dat mezi uzivateli - reset stavu + odpojeni listeneru pri odhlaseni, cisty novy uzivatel, 100% mazani dat
2. Velky refaktor cilu - reverz penez mazanim transakce, menovy prepocet, slouceny modal Prani/Cil
3. Kategorie virtualnich presunu v realnych datech - zadne vymyslene ID, hledani podle jmena
4. API tracking - tokeny + naklady v Kc per user/typ + komunitni agregace v admin panelu
5. Worker model fix (claude-sonnet-4-6) - zprovozneni vsech AI funkci
6. Bezove tema, skore aktivity, sloupce tabulky, slouceny komunitni bar
7. Export CSV, vyhledavani napric mesici, mesicni checklist, stranka napovedy
8. COICOP vyjasneni - coicopOverrides vs shared, oznaceni sdilenych podkategorii
9. Verzovaci hlavicky souboru - okamzita identifikace aktualnosti

## Deploy stav
- Hosting: firebase deploy --only hosting
- Worker: Cloudflare Dashboard (model fix + token tracking nasazeno)
- Pravidla: database_rules.json (welcomeMessage + aiUsage)
- POZOR: overit secrets FIREBASE_SERVICE_ACCOUNT + FIREBASE_DB_URL v Cloudflare (rate limiting + token tracking)

## Otevrene body
- TODO-137 Cookie/consent UI (GDPR)
- TODO-138 Hlidac souctu limitu kategorii
- TODO-139 Doporucene limity v checklistu
- TODO-140 Checklist pokyn nastav limit
- TODO-141 Kategorie typu presun pro sporeni/investice
- TODO-142 Plna telemetrie aktivity
- TODO-075 AI Rate Limiting aktivace (pending secrets)

---

ID rozsah Session 13: FIX-147-159, TODO-137-142, ADR-065-072

---

# Resume – FinanceFlow Session 22

Verze: v10.59 → v10.82 (24 verzí)
Datum: 12.–16. 9. 2026
Jazyk: čeština · Stack: Vanilla JS, Firebase, Cloudflare Workers, Claude API

## Hlavní výstupy
- **Finanční skóre v2** – váhy místo bodovacích tabulek, práh pokrytí,
  rezerva proti výdajům
- **Finanční obraz v1** – čtyři složky, škála 0–200, teploměrová stupnice
- **Deníkové poznámky k výdajům** – nový modul `poznamky.js`
- **Simulátory vah** v admin panelu pro skóre i Obraz
- **Inflace z ČSÚ** přes Cloudflare Worker (sada CEN0101E)
- **Nahlášení špatně přečtené účtenky** i s fotkou, po výslovném souhlasu

## Opravy
20 oprav (FIX-327 až FIX-346). Nejzávažnější: řetězec vad u účtenek
(prompt neznal Kauflandovu slevu a zároveň nutil analyzér čísla srovnat),
dělení účtenky na sedm transakcí od v6.88, a Service Worker uvízlý na v10.66.

## Dva systematické audity
Synchronizační schéma (37 polí, 41 modulů) a řetězec účtenka → transakce →
statistiky. Výstupem `tools/smoke_schema.js` – audit, který se opakuje sám.

## Nová poučení
SKILL 45–49: navrhovat podle chování ne podle názvu · dotáhnout důsledky
změny · tiché selhání je horší než pád · testy jsou nástroj session ·
ukládat jen to, co se nedá dopočítat.

---

# Resume – FinanceFlow Session 25

Verze: v11.30 → v11.61 (31 verzí) + dodatek v11.28–v11.30
Datum: 5.–9. 10. 2026
Jazyk: čeština · Stack: Vanilla JS, Firebase RTDB, Cloudflare Workers + R2 + Browser Rendering, Claude API, Resend

## Hlavní výstupy
- **Stabilita dat** – audit přepisů, tří-cestné slučování po záznamech, ochrana rozpracované práce, offline bez ztrát
  (v11.52)
- **Produktový katalog** – gramáž, pobočka, sdílené ceny po krajích, číselník CZ-COICOP 2018 s 5. úrovní,
  📐 Statistika položek
- **Karta výrobku v2** – bloky, tři názvy (EAN / přední strana / CZ popisek), COICOP panel na řádku, ruční živiny
- **📦 Moje výrobky** – samostatná záložka, K vyřízení, zápis názvu neznámého kódu
- **Čekací okno** při analýze účtenky
- **Měsíční report** – e-mailem jako PDF a AI komentář z ověřených čísel
- **Google Play** – smazání účtu i z Firebase Auth, `smazani-uctu.html`, podklady v3

## Opravy
38 oprav (FIX-405 až FIX-442). Nejzávažnější:
- ozvěna vlastního uložení nahrazovala objekty (společná příčina ztracených fotek a EAN kódů)
- editor nové účtenky ztrácel úpravy
- data v letním čase o den dřív
- worker dával platícím limity Free

## Nová poučení
SKILL 71–80:
- hledat společnou příčinu
- negativní kontrola
- nezávislá revize
- stav v okně
- den nikdy přes UTC
- nepřebírat mezi různými poli
- kontrola v Chromiu
- TODO z dokumentace
- synchronní zámek
- testy se změnou UX

ID rozsah Session 25: FIX-405–442, TODO-323–332, ADR-183–202, SKILL 71–80

## Dodatek v11.58–v11.60 (2026-10-09 večer) **(Session 25)**

v11.58 vlastní SVG ikony (automaticky přes taxonomii) · v11.59 Měsíční report: neměřené skóre a zarovnání · v11.60 jednotná karta výrobku s osobní kartou pro položky bez kódu. Rozhodnutí: admin schvaluje jen nové karty a změny názvů (ADR-206). ID: FIX-443–446, ADR-203–206, TODO-333–335, SKILL 81–83.

## Dodatek v11.61 (2026-10-10) **(Session 25)**

- **v11.61:** Open Food Facts jen doplňuje (ADR-207), jedna karta všude s opravou každého políčka a štítkem zdroje (ADR-208). FIX-447 až 450, SKILL 84–85, TODO-336–341. **Celkový rozsah Session 25:** FIX-405–450, TODO-323–341, ADR-183–208, SKILL 71–85.
