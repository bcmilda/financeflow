# Session 25 · FinanceFlow · shrnutí

> 2026-10-05 až 2026-10-09 · appka **v11.30 → v11.57** (27 verzí) · worker **v11.30 → v11.57** · pravidla DB: verze z v11.39
> Na GitHubu (`dev`) je **v11.30**. Ve výstupech je kompletní stav v11.31–v11.57.
> Dodatek: v11.28–v11.30 (2026-10-04 až 05) vznikly mezi S24 a S25 a v MD nebyly. Jsou zapsané v sekcích Session 25 jako „Dodatek v11.28–v11.30“.

---

## Co přibylo

| Oblast | Hlavní body |
|---|---|
| **Stabilita dat (v11.52)** | Audit přepisů a jejich společné příčiny. Tří-cestné slučování po záznamech (základ / tady / jinde), ozvěna vlastního uložení se ignoruje, rozepsaná práce se nepřekresluje, offline se zapisují jen transakce až do sloučení, vadná hodnota nezastaví zbytek, účtenky mají stálé id. Šest mechanismů přepisu odstraněno, ne jen jejich projevy. |
| **Produktový katalog** | Gramáž jako samostatné pole (v11.37), pobočka a kraj z hlavičky účtenky (v11.38), **sdílené ceny po krajích** (v11.39, worker `/ceny`), číselník CZ-COICOP 2018 v appce (v11.36) a 5. úroveň v taxonomii (v11.41), **📐 Statistika položek** (v11.35, nový modul) |
| **Karta výrobku** | Rozšířená karta (v11.34), ruční živiny s kontrolou (v11.43), období pro tvůj podíl (v11.42), **přestavba v2** (v11.56): bloky v rámečcích, mřížka popisek / hodnota, COICOP panel přímo na řádku. **Tři názvy** (v11.57): Název z EAN, Obal – přední strana, Obal – CZ popisek (nová fotka „📸 Vyfotit český popisek“). |
| **Čárové kódy** | Odebrání chybného přiřazení (v11.30), 🎯 Nejspíš (v11.48), **📦 Moje výrobky** (v11.49, od v11.55 samostatná záložka), zápis názvu u neznámého kódu (v11.50), K vyřízení ve Skenovat (v11.51), „zatím jen zkratka z účtenky“ místo „databáze nezná“ (v11.54). Název z účtenky se do názvu výrobku nepřebírá (v11.55). |
| **Analýza účtenky** | **Čekací okno** s přesýpacími hodinami, kroky, časem a Zrušit (v11.53), ochrana proti dvojímu ťuknutí. Editor nové účtenky už neztrácí úpravy (v11.48). Duplicitní účtenky s transakcí (v11.32). Zelený štítek zpět podle modelu ČSÚ (v11.34). Vážené zboží: částka za položku (v11.34). |
| **Doklady** | Uschování všech fotek účtenky jedním klepnutím a automaticky (v11.28), 🔎 Najít fotky bez účtenky (v11.49), úložiště podle tarifu Free 300 / Premium 1 000 a admin záložka 💾 Úložiště (v11.50), upozornění na konec záruky na Dashboardu (v11.46). |
| **Měsíční report** | E-mailem jako PDF přes Cloudflare Browser Rendering (v11.28), zůstatek den po dni (v11.28), **AI komentář** s ověřením každého čísla (v11.47, worker `/report-ai`). |
| **Google Play** | Smazání účtu i z Firebase Auth (v11.45), stránka `smazani-uctu.html`, podklady `google-play.md` v3, landing hamburger (v11.44). |
| **Drobnosti** | Tlačítko Zpět na telefonu (v11.51), datum v letním čase (v11.44), Inflace a Detektor bez falešného zdražení (v11.46), Finanční obraz bez „0 Kč“ (v11.46), Kalendář – kopírování směn do konce roku, dovolená v hodinách, výplata po měsících (v11.33), proklik z Predikce (v11.29), nový výběr kategorie, zůstatek peněženky ke dni, bankomat ve výpisu (v11.28). |

## Opravy
FIX-405 až FIX-442 (`bugs.md`). Nejdůležitější:
- **FIX-432 · Ozvěna vlastního uložení nahrazovala objekty.** Byla to společná příčina ztracených fotek účtenek a EAN kódů ve v11.43–v11.48.
- **FIX-433 až FIX-438 · Zbylé mechanismy přepisu ze sync auditu.** Neodeslaná změna se tvářila jako uložená, změny z jiného zařízení přepisovaly celou část, rozepsaná práce se přepsala, offline nebyl základ a editor ukládal podle pozice.
- **FIX-426 · Editor nové účtenky ztrácel úpravy.**
- **FIX-420 · Datum v letním čase.** Splátky dluhů vycházely o den dřív.
- **FIX-425 · Worker dával platícím uživatelům limity Free.**

## Rozhodnutí
ADR-183 až ADR-202 (`decisions.md`). Klíčová rozhodnutí:
- **ADR-195 až ADR-198:** synchronizace po záznamech, přednost rozepsané práce, offline a stálé id účtenky.
- **ADR-189:** ceny po krajích jen jako souhrny, zobrazené od 3 lidí, nikdy lékárna.
- **ADR-192:** AI komentář jen z ověřených čísel.
- **ADR-200:** zkratka z účtenky se nepřebírá jako název.
- **ADR-202:** tři názvy výrobku a jejich pořadí.

## Poučení
SKILL 71–80 (`CLAUDE_SKILLS.md`):
- Hledat společnou příčinu.
- Negativní kontrola na starém kódu.
- Nezávislá revize kritických změn.
- Stav hlásit v okně, ne v toastu pod ním.
- Datum nikdy přes UTC.
- Nepřebírat data mezi významově různými poli.
- Rozložení ověřit v Chromiu na šířce telefonu.
- Staré TODO číst z dokumentace, ne z paměti.
- Synchronní zámek u placených akcí.
- Test na text upravit spolu se změnou UX.

## Co se nepovedlo napoprvé
- **Přepisy dat jsem opravoval po jednom** (v11.43–v11.48), než Milan řekl: „Toto se musí odhalit a napravit.“ Teprve audit ve v11.52 našel šest společných mechanismů. Tři kola nezávislé revize pak našla dalších 16 skutečných chyb v nové vrstvě (SKILL 71, 73).
- **TODO-144 jsem vysvětlil špatně**, z paměti a ne z dokumentace (SKILL 78).
- **Převzetí názvu z účtenky jedním ťuknutím** (v11.54) Milan odmítl, protože zkratka není název. Ve v11.55 je převzetí zrušené (ADR-200).
- **Odkaz „přiřadit i k jiné položce“** byl zbytečný, protože totéž řeší aliasy. Ve v11.55 je odebraný.
- **COICOP panel byl napoprvé pod blokem**, ne na řádku, a karta měla jen dva názvy. Opraveno ve v11.57.

---

## Stav na konci session
- **Appka:** v11.57 ve výstupech, na GitHubu `dev` je v11.30.
- **Worker:** v11.57. Nové jsou `/ceny` a `/report-ai`, v `/ean` přibyla akce `ziviny` a fotka `popisek`. Limit `report_ai` je Free 0, trial 5, Premium 15.
- **Pravidla DB:** verze z v11.39 (nový uzel `community/ceny`: čte každý přihlášený, zapisuje jen worker).
- **Testy:** 143 sad, všechny procházejí. Nové sady:
  - sync a rozpracovaná práce: `smoke_sync_rozprac`
  - analýza účtenky: `smoke_cekani_uctenka`, `smoke_uctenky_duplikaty`, `smoke_uctenka_ean_ulozeni`
  - karta výrobku a EAN: `smoke_ean_karta_ux`, `smoke_karta_v2`, `smoke_karta_vyrobku`, `smoke_moje_vyrobky`, `smoke_zpet_kvyrizeni`, `smoke_ziviny_rucne`, `smoke_gramaz_nazvy`
  - COICOP a taxonomie: `smoke_coicop_ciselnik`, `smoke_coicop5`, `smoke_stitek_polozky`
  - ceny a statistika: `smoke_ceny_kraje`, `smoke_pobocka`, `smoke_statistika_polozek`, `smoke_zdrazovani_karta`
  - doklady a úložiště: `smoke_doklady_obraz`, `smoke_uloziste_karta`
  - report: `smoke_report_ai`
  - ostatní: `smoke_kalendar_prace`, `smoke_datum_mistni`, `smoke_smazani_uctu`
- **Nové soubory:** `js/ceny-kraje.js`, `js/statistika-polozek.js`, `data/coicop2018.json`, `smazani-uctu.html`.
- **Nové pracovní podklady:** `google-play.md` (v3), `kategorie.md` (revize kategorií, k diskusi).

## Nasazení (z v11.30)
1. `database.rules.json` → Firebase (uzel `community/ceny`).
2. `worker.js` → Cloudflare. Ověř, že běží proměnné `CF_ACCOUNT_ID`, `CF_BR_TOKEN` (od v11.28) a `FIREBASE_SERVICE_ACCOUNT`.
3. GitHub:
   - stránky: `app.html`, `sw.js`, `index.html`, `legal.html`, nový `smazani-uctu.html`
   - `js/` (25 změněných + 2 nové: `ceny-kraje.js`, `statistika-polozek.js`)
   - data: `data/taxonomie.json`, nový `data/coicop2018.json`
   - `tools/` (38 sad)
   - MD soubory z této session
4. Po nasazení se v Analýza účtenek objeví jednorázové oznámení o sdílení cen. Starší účtenky dostanou stálé id samy při prvním uložení.

---

## Session 26 – návrh
1. **TODO-323 · Ikony – grafické ztvárnění.** Milan: „ikony budeme muset lépe ztvárnit graficky.“ Nejdřív vzorky jednotné SVG sady, pak nasazení.
2. **TODO-332 · Vyzkoušet v provozu v11.31–v11.57.** Hlavně sync mezi telefonem a PC, offline, čekací okno, Moje výrobky a karta výrobku se třemi názvy.
3. **TODO-318 · Vodopád „Od příjmu k úspoře“** v appce. Kandidát je Dashboard.
4. **TODO-325 · Odhad příjmů v reportu i mimo šablony.** Zbytek z TODO-317.
5. TODO-324 (➕ Přidat doklad bez účtenky, čeká na potvrzení), TODO-275 (poslední 4 číslice karty), TODO-326 (volitelně 🤖 Navrhnout název).

**Odloženo Milanem:**
- Zrychlení načítání („zatím taky nedělej“).
- Překlad do angličtiny (TODO-144 je starý neuzavřený úkol, cílí se na Čechy).

**Milan:**
- Google Play: vývojářský účet, testovací účet pro recenzenta, IČO v `legal.html`, potvrdit uchování 3 roky, druhý otisk `assetlinks.json` (TODO-301).
- Ověřit `FIREBASE_SERVICE_ACCOUNT` ve workeru.
- Rozhodnout o `kategorie.md` (TODO-321).
- Nahrát MD na GitHub (TODO-316).
