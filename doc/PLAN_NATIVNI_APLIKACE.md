# FinanceFlow Native: plán postupného převodu do nativní aplikace

> Session 26 · 17. 10. 2026 · návrh pro Milana
>
> Nový samostatný projekt, který poběží souběžně s webovou appkou FinanceFlow. Webová appka se dál vyvíjí a ladí.
>
> **Cíle převodu:**
> - stabilita;
> - nic se neztratí (rozepsaná práce ani data);
> - změny se projeví hned;
> - vícejazyčnost od prvního řádku;
> - nativní funkce telefonu: notifikace z banky, kamera, push, widget.

---

## 1. Proč a co se má změnit

### Co nás dnes trápí na webu (a proč to nejde jednoduše opravit)

| Problém | Příčina v dnešní architektuře | Jak to řeší nová appka |
|---|---|---|
| Rozepsaná práce mizí po synchronizaci nebo překreslení | Celá stránka se staví znovu přes `innerHTML`, takže formulář zmizí i s textem. Brzda a „Uložit změny?“ jsou jen záplaty (ADR-214, TODO-342). | Komponenty se překreslují jednotlivě. Každý formulář si průběžně ukládá koncept do zařízení. |
| Změna se někdy projeví až po obnovení stránky | Data `S` jsou jeden velký objekt, překreslení hlídá podpis dat. Vlastní uzly (měřidla, vozidla) mají vlastní cache. | Jeden reaktivní datový sklad. Komponenta, která data čte, se přepočítá sama. |
| Texty jsou natvrdo v češtině ve 48 souborech | Žádná vrstva překladů. Čísla a data se formátují ručně. | Žádný text v kódu. Vše jde přes klíče překladu (i18n) a `Intl`. |
| Čtení bankovních notifikací nejde | Webová stránka nemá k notifikacím přístup. Dnes existuje jen ruční vložení textu (`sms-import.js`). | Nativní Android modul čte notifikace bank (s výslovným souhlasem). |
| Chyby se vracejí | Globální funkce, žádné typy, testy jsou jen „smoke“ nad zdrojákem. | TypeScript, datová schémata, testy výpočtů přenesené z dnešních `smoke_*`. |

### Co se NEMĚNÍ
- **Data zůstávají ve Firebase.** Stejný účet a stejná databáze, web i nativní appka pracují nad stejnými daty. Pomalý převod je díky tomu bezpečný: co ještě v nativní appce není, uděláš na webu.
- **Produktová pravidla platí dál:** ADR-001 až ADR-229, SKILL 1–96. Například „peníze jsou jen v transakcích“, „jeden měsíc = jedna výplata“, „appka nabízí, nemění“.
- **Webová appka běží dál** a dál se ladí. Nativní appka ji nahrazuje postupně, obrazovku po obrazovce.

---

## 2. Volba technologie

| Varianta | Jak | Plus | Mínus | Verdikt |
|---|---|---|---|---|
| **A: Obal dnešního webu** (TWA / Capacitor + dnešní kód) | Dnešní `app.html` a JS zabalit do Android appky (TWA pro Google Play už rozpracované – TODO-113, TODO-331) | Hotové za pár dní, v Play Store rychle | Přenese všechny dnešní problémy (překreslování, texty natvrdo). TWA navíc neumí nativní pluginy (notifikace). | ✅ jen jako **přechodný krok** – web v Play dál jako TWA |
| **B: Nové UI nad sdíleným jádrem** (Capacitor + TypeScript + React/Preact + Vite) | Výpočty a parsery vytáhnout do balíčku `core`, nové obrazovky postupně | Jeden kód pro Android, iOS i web. Výpočty a testy se přenesou. Claude v TS/Reactu pracuje nejspolehlivěji. Nativní pluginy přes Capacitor. | Nové UI se staví postupně, chvíli běží dvě appky | ⭐ **doporučeno** |
| **C: Úplný přepis** (Flutter / React Native) | Vše znovu v jiném jazyce | Nejvíc „nativní“ pocit | Výpočty a parsery se musí přepsat a znovu otestovat. Dart je nový jazyk. Nejdelší cesta. | ❌ zbytečné riziko |

**Doporučení:** varianta **B**. Fáze 1 začne zjednodušenou companion appkou (bod 5), aby byl první užitek hned.

### Zvolená sada
- **Jazyk:** TypeScript (strict). Typy hlídají přesně ty chyby, které dnes chytáme až u Milana (index místo klíče, `null` místo čísla).
- **UI:** React (nebo Preact kvůli velikosti) + Vite. Komponenty, router, žádné `innerHTML` celé stránky.
- **Nativní vrstva:** Capacitor 6+. Android první, iOS později. Pluginy: Camera, Push (FCM), Biometric, Share, Preferences a vlastní plugin pro notifikace.
- **Data v zařízení:** IndexedDB přes Dexie (nebo SQLite plugin), funguje i offline.
- **Synchronizace:** Firebase RTDB (stejné cesty jako web) + Firebase Auth.
- **Validace dat:** Zod schémata pro každou entitu (transakce, účtenka, páska, měřidlo, vozidlo…).
- **Překlady:** i18next + ICU MessageFormat (množná čísla, rody), formátování přes `Intl.NumberFormat`, `Intl.DateTimeFormat` a `Intl.RelativeTimeFormat`.
- **Testy:**
  - Vitest pro `core`, kam se přenesou dnešní smoke testy výpočtů;
  - Playwright pro UI;
  - Maestro pro end-to-end testy na Androidu.
- **CI:** GitHub Actions. Testy, build APK/AAB a verze se generují automaticky (semver + changelog z commitů).

---

## 3. Architektura

```
financeflow-native/            (nové repo, např. bcmilda/financeflow-native)
├── packages/
│   ├── core/                  ← čisté výpočty bez UI (přenesené z webu)
│   │   ├── vyplatnice/        (vyplDopocet, odhad, roční zúčtování, megagraf data)
│   │   ├── meridla/           (merOdhad, sezónní odhad, VT/NT)
│   │   ├── vozidla/           (tankStatistiky, tankZUctenky)
│   │   ├── transakce/         (duplicity, kategorie, rozpočty)
│   │   ├── parsery/           (bankovní notifikace = dnešní BANK_PARSERS, účtenky)
│   │   ├── dane/              (CZ zákonné konstanty po rocích → „regionální balíček“)
│   │   └── schema/            (Zod: Transakce, Uctenka, Paska, Meridlo, Vozidlo…)
│   ├── i18n/                  ← cs.json, en.json, sk.json… + pomocné funkce formátování
│   └── data/                  ← local-first sklad + synchronizace s Firebase
├── apps/
│   ├── mobile/                ← Capacitor appka (Android, později iOS)
│   │   └── android/plugins/bank-notifications/  (Kotlin: NotificationListenerService)
│   └── web2/                  ← (později) stejné UI jako web, až dožene paritu
└── tools/                     ← migrace, kontrola kompatibility s webem
```

### 3.1 Data: local-first, nic se neztratí
- **Zdroj pravdy v zařízení je lokální databáze.** Každá změna se zapíše hned lokálně (UI ji ukáže okamžitě) a zároveň do **fronty změn** (`outbox`).
- **Synchronizace na pozadí** odešle frontu do Firebase. Při výpadku sítě čeká, nic se nezahodí.
- **Zápis po záznamech, nikdy celé `S`.** Dnešní web zapisuje velké části dat najednou a konflikt mezi zařízeními může přepsat cizí změnu. Nově má každý záznam `id`, `updatedAt` a `updatedBy`. Konflikt se řeší po polích a smazání nechává „náhrobek“ (`deleted: true`, `deletedAt`), aby se smazaný záznam nevrátil z druhého zařízení.
- **Koncepty (drafts):** každý formulář (transakce, odečet, výplatnice, editor účtenky) průběžně ukládá rozepsaný stav do lokální DB pod klíčem obrazovky. Po pádu appky, zavření nebo obnovení se nabídne: „Máš rozepsaný odečet z 8:42 – pokračovat?“
- **Zálohy:** automatický export do souboru 1× týdně (lokálně) a ruční export / import JSON jako dnes.
- **Schéma má verzi.** Při změně tvaru dat proběhne migrace s testem. Starý web musí nová data dál přečíst (kontraktní testy, bod 7).

### 3.2 UI: změny se projeví hned, nic nebliká
- Reaktivní sklad (Zustand nebo signály): komponenta odebírá jen svá data, takže změna transakce překreslí jen řádek a součty, ne celou stránku.
- **Optimistické zápisy:** UI ukáže výsledek hned. Když zápis selže, vrátí se a ukáže důvod.
- **Router s ochranou rozepsané práce:** odchod z obrazovky s neuloženou změnou se zeptá (dnešní ADR-214 zabudované do základu, ne jako záplata).
- **Dlouhé seznamy** (tisíce transakcí) se vykreslují virtualizovaně, stránka nezamrzne.
- **Grafy:** jedna knihovna nebo vlastní SVG komponenty s pravidly ze SKILL (osa, mřížka, průměr, výpis klepnutím, tabulka pod grafem, ověřené barvy).

### 3.3 Vícejazyčnost (i18n) od prvního řádku
- **Žádný text přímo v kódu.** Pravidlo v linteru (`eslint-plugin-i18next`) build zastaví, když v komponentě najde český text.
- **Klíče podle obrazovek:** `vyplatnice.megagraf.titulek`, `meridla.odecet.vt`. Překlady v `cs.json` (výchozí), `en.json`, `sk.json`, případně `de.json` a `pl.json`.
- **Množná čísla a rody přes ICU:**
  - CS: `{n, plural, one {# tankování} few {# tankování} other {# tankování}}`;
  - stejný mechanismus dá „1 účtenka / 2 účtenky / 5 účtenek“.
- **Formáty jen přes `Intl`:** měna, čísla (mezery v tisících, desetinná čárka), datum a dny v týdnu. Nikdy ručně `toFixed().replace('.', ',')`.
- **Jazyk ≠ země.** Jazyk rozhraní a **regionální balíček** (daně, odvody, sleva na poplatníka, svátky, banky a jejich formáty notifikací) jsou dvě nastavení. Čech může mít appku anglicky a dál počítat českou daň.
- **Uživatelská data se nepřekládají.** Výchozí kategorie mají klíč (`cat.potraviny`), vlastní názvy zůstanou, jak je uživatel napsal.
- **AI pokyny** (účtenky, výplatnice) mají verzi pro každý jazyk a regionální balíček.
- **Kontrola chybějících překladů v CI:** chybějící klíč v `en.json` = build selže.

### 3.4 Stabilita a kvalita
- **TypeScript strict + Zod:** data z Firebase a z AI se vždy validují. Neplatný záznam se nezahodí, jde do karantény s upozorněním.
- **Testy:** všechny dnešní `tools/smoke_*.js`, které testují výpočty, se převedou na Vitest testy balíčku `core`. Smoke testy, které hledají text ve zdrojáku, se nahradí testy komponent.
- **Feature flags:** nová funkce jde nejdřív jen Milanovi (admin), pak všem.
- **Hlášení chyb:** Sentry nebo Firebase Crashlytics s anonymizací a bez finančních dat.
- **Verze a nasazení:** CI postaví APK/AAB, nahraje do interního testování v Play Console a z repozitáře se generuje changelog. Žádné ruční `?v=` hashe.

---

## 4. Nativní funkce

| Funkce | Android | iOS | Poznámka |
|---|---|---|---|
| **Čtení bankovních notifikací** | ✅ `NotificationListenerService`, uživatel povolí „Přístup k oznámením“ | ❌ iOS cizí notifikace číst nedovolí | Parsery už máme (`sms-import.js`: Revolut, George, Moneta, KB, ČSOB, Air Bank, mBank, Fio…) |
| iOS náhrada | – | Zkratky (Shortcuts): automatizace „Transakce“ v Peněžence (Apple Pay) → poslat do appky | **Ověřit** dostupnost pro karty českých bank |
| Skener účtenek a EAN | ✅ ML Kit / kamera | ✅ | Rychlejší a spolehlivější než webová kamera (dnes FIX-458) |
| Push upozornění | ✅ FCM | ✅ APNs přes FCM | Hlídání cen, připomínky odečtů, výplata |
| Widget na plochu | ✅ | ✅ (WidgetKit) | „Do výplaty zbývá X Kč / N dní“ |
| Sdílení do appky | ✅ Share target | ✅ Share extension | PDF výplatnice, foto účtenky přímo z galerie |
| Biometrický zámek | ✅ | ✅ | Otisk / Face ID |
| Offline | ✅ | ✅ | Local-first (bod 3.1) |

### Napojení na banky (doplněk k notifikacím)
- **Fio banka:** vlastní API s tokenem pro osobní účty, vydá ho uživatel v internetovém bankovnictví. Zdarma a spolehlivé ([dokumentace Fio API](https://www.fio.cz/docs/cz/API_Bankovnictvi.pdf)).
- **Ostatní banky přes PSD2:** potřebují licencovaného agregátora.
  - Dřívější bezplatný GoCardless Bank Account Data (Nordigen) **už nepřijímá nové registrace** ([přehled k 06/2026](https://www.openbankingtracker.com/guides/free-open-banking-apis), [diskuse v projektu Actual](https://github.com/actualbudget/actual/issues/5505)).
  - **Enable Banking** má bezplatný režim „Restricted Production“, ale jen pro účty, které si propojíš sám. Pro ostatní uživatele je potřeba smlouva.
  - Pokrytí českých bank je nutné ověřit.
- **Doporučení:** notifikace (Android) + Fio API + ruční / CSV import. Agregátora řešit až s platícími uživateli.

### Google Play: co čtení notifikací vyžaduje
- **Výrazné upozornění (prominent disclosure) v appce PŘED žádostí o přístup:** co čteme (jen notifikace vybraných bankovních aplikací), proč a že se nic neodesílá bez potvrzení.
- Pravdivě vyplněný formulář **Data safety** a zásady ochrany soukromí.
- **Filtr na balíčky bankovních aplikací:** ostatní notifikace appka ignoruje a nikam neukládá.
- Účet vývojáře v Google Play stojí jednorázově 25 USD, Apple Developer Program 99 USD ročně.

---

## 5. Fáze převodu

Převod je pomalý a každá fáze má vlastní užitek. Odhady jsou orientační a počítají s prací po večerech přes Claude Code.

### Fáze 0: Základy (2–3 týdny)
- Repo `financeflow-native`, CI a lint (včetně zákazu textu natvrdo).
- Balíček `core`: přenést čisté funkce a jejich testy.
  - výplatnice, měřidla, vozidla, duplicity;
  - parsery notifikací, daně.
- Balíček `i18n`: cs + en kostra.
- Balíček `data`: lokální DB, fronta změn a synchronizace jednoho typu záznamu (transakce) proti testovací kopii Firebase.
- **Hotovo, když:** testy `core` prochází a transakce zapsaná v nativní kostře se objeví na webu a naopak.

### Fáze 1: Companion appka „📲 FinanceFlow Inbox“ (4–6 týdnů) ⭐ první užitek
Splňuje Milanův bod 2: tlačítko „Přeji si notifikace z banky“.
- **Web:** v Nastavení tlačítko „📲 Načítat platby z notifikací banky“ → odkaz na Play Store / APK.
- **Nativní appka:**
  1. přihlášení stejným účtem;
  2. výběr bankovních aplikací, které má poslouchat;
  3. upozornění a souhlas;
  4. povolení přístupu k oznámením.
- **Zpracování notifikace:**
  1. přijde notifikace;
  2. parser z `core` z ní vytáhne částku, obchodníka a datum;
  3. nabídne kategorii podle dnešních pravidel;
  4. zapíše do `users/{uid}/inbox/{id}` (nový uzel, nikdy přímo do transakcí).
- **Web i appka mají „📥 Doručené“:**
  - klepnutím potvrdíš, upravíš kategorii, nebo zahodíš;
  - teprve potvrzení vytvoří transakci;
  - kontrola duplicit (ruční zápis i import z banky) proběhne před potvrzením.
- Rychlé přidání transakce a sken účtenky z telefonu (kamera).
- **Hotovo, když:** platba kartou se do minuty objeví v Doručených na webu a po potvrzení je v Transakcích jen jednou.

### Fáze 2: Čtecí obrazovky (4 týdny)
- Přehled, Transakce (virtualizovaný seznam, filtry jako štítky), Do výplaty, Rozpočty.
- Widget „Do výplaty“.
- Jazyk EN připravený (strojový překlad + revize).

### Fáze 3: Zápis a úpravy (4–6 týdnů)
- Formulář transakce s koncepty, kategorie, šablony a opakované platby, peněženky.
- Ochrana rozepsané práce, „Zpět“ po smazání (místo dotazů „Opravdu?“).

### Fáze 4: Moduly (6–10 týdnů, postupně)
- Účtenky (sken, editor, karta výrobku), Výplatnice (import, megagraf, roční zúčtování), Měřidla, Vozidla, Pracovní kalendář.
- Každý modul se převede až tehdy, když na webu nemá otevřené chyby.

### Fáze 5: Analytika a iOS (6 týdnů)
- Radar, reporty, simulace, Osa života, Finanční replay (bod 8).
- iOS build: stejný kód, jen bez čtení notifikací.

### Fáze 6: Rozhodnutí o webu
- Až má nativní appka paritu: `apps/web2` ze stejného kódu, nebo dnešní web dál, podle toho, co bude jednodušší udržovat.

---

## 6. Souběh s webovou appkou

- **Stejná databáze, stejné cesty.** Nativní appka nesmí změnit tvar dat, dokud to neumí i web. Nové uzly (`inbox`, `drafts`) web zatím jen čte nebo ignoruje.
- **Kontraktní testy:** sada vzorových dat (fixtures) se pouští proti `core` i proti dnešním web funkcím. Obě strany musí spočítat totéž (výplata, odhad vyúčtování, duplicity).
- **Pravidla databáze:** nové uzly se přidávají do `database.rules.json` ve webovém repu, je jen jedno.
- **Tabulka parity** (`doc/PARITA.md` v novém repu): obrazovka · web · nativní · poznámka.
- **Verze:** web dál `v11.xx`, nativní `n0.x`. Changelog obou je vidět v appce.

---

## 7. Produkt: co by appku udělalo populární a placenou

Jak bych finanční appku stavěl já:

1. **Nulová práce se zápisem.** Lidé appky opouštějí kvůli ručnímu zapisování. Notifikace z banky, sken účtenek a výplatnice přes AI jsou největší hodnota, za kterou se platí.
2. **Jedno číslo na první obrazovce:** „Do výplaty můžeš utratit 3 240 Kč (215 Kč denně)“. Ne dvacet grafů.
3. **Upozornění, která šetří peníze:** zdražení u stálých nákupů, sleva na hlídanou položku, zapomenuté předplatné, nedoplatek za energie dopředu, chyba na výplatnici (proplacený přesčas ≠ kalendář).
4. **Česká specialita, kterou světové appky nemají:** výplatnice a roční zúčtování, energie s VT/NT, ceny z účtenek po krajích, inflace „tvého košíku“. Tím se FinanceFlow odliší od Wallet / Spendee.
5. **Příběh místo tabulek:** měsíční report, finanční replay (bod 8), „rok ve FinanceFlow“ ke sdílení.
6. **Důvěra:** data jsou tvoje, export kdykoli, žádné prodávání dat, jasné ceny.

### Ceny: navázat na dnešní ceník (S15–S17, Stripe)
Dnešní ceník: Free 0 · Premium 149 Kč/měs. (1 490 Kč/rok) · zakládající 99 / 990 Kč pro prvních 100 · Pro 299 Kč („Brzy“).

Návrh, co by v nativní appce patřilo kam (ceny beze změny, rozhodne Milan):

| Tarif | Obsah navíc v nativní appce |
|---|---|
| Free | Ruční zápis, přehled, rozpočty, pár účtenek měsíčně, **📥 Doručené z notifikací jen pro 1 banku** (ochutnávka automatiky) |
| Premium | Notifikace ze všech bank, neomezené účtenky a AI, výplatnice a roční zúčtování, měřidla, vozidla, megagraf, finanční replay, widget |
| Pro | Rodina / sdílení (2–4 lidé), Fio API a další napojení na banky, export pro účetní |

⚠️ Předplatné prodávané **uvnitř** appky z Google Play většinou musí jít přes Google Play Billing (poplatek Googlu). Před fází 1 ověřit podmínky a jak to sladit se Stripe na webu.

---

## 8. Backlog nápadů (z dotazu „málo kalkulaček“ a „finanční replay“)

### Kalkulačky a simulace (dnes je „🔮 Finanční simulace života“ se scénáři A/B/C)
- **Cena zlozvyku:** cigarety, alkohol, sázky, energy drinky z kategorií a účtenek. Kolik to stálo a kolik by to bylo investované za 10 let.
- **Kdy budu finančně nezávislý (FIRE):** z reálných výdajů a úspor, ne z odhadu.
- **Hypotéka vs. nájem**, předčasné splacení, refinancování.
- **Auto:** vlastní vs. leasing vs. sdílené, z dat Vozidel (Kč/km).
- **Rezerva:** na kolik měsíců vystačí při ztrátě příjmu, podle skutečných výdajů.
- **Přesčas vs. volno:** kolik čistého přinese přesčas (už máme simulaci v kalendáři), rozšířit na „stojí mi to za to?“
- **Důchod a DIP / penzijko:** státní příspěvek, daňový odpočet, co přinese spoření X Kč měsíčně.
- **Inflace úspor:** kolik reálně ztrácejí peníze na běžném účtu.

### Finanční replay („život v penězích“)
- **Animovaná časová osa z Osy života a transakcí.** Roky běží, roste čisté jmění, mění se výplata, objevují se události: nová práce, ztráta práce, auto, dovolená, dítě, stěhování.
- **Kapitoly s čísly:**
  - „Výplata za 5 let +34 %“;
  - „Ztráta zaměstnání v 2023 stála 86 400 Kč“ (výpadek příjmu proti trendu);
  - „Dovolené 2024: 42 000 Kč“;
  - „Alkohol a tabák od 2022: 31 800 Kč = X dní práce“.
- **Formát jako „Spotify Wrapped“**, karty ke sdílení bez konkrétních částek (procenta, poměry), aby šly ukázat.
- **Technicky:** počítá se z dat, která už máme (Osa života, transakce, výplatnice, kategorie, účtenky). Animace přes SVG / Canvas.
  - Na webu jde postavit hned.
  - V nativní appce ve fázi 5.

---

## 9. Rizika

| Riziko | Dopad | Opatření |
|---|---|---|
| Google Play zamítne čtení notifikací | Fáze 1 bez hlavní funkce | Upozornění před souhlasem, filtr jen bankovních aplikací, Data safety. Záloha: sdílení textu notifikace do appky (Share). |
| Dvě appky nad stejnými daty si přepíšou změny | Ztráta dat | Zápis po záznamech, `updatedAt`, náhrobky, kontraktní testy, nejdřív testovací kopie DB |
| Převod se protáhne a web stagnuje | Uživatelé nevidí zlepšení | Fáze 1 přináší užitek hned, web má dál vlastní verze |
| Parsery notifikací se rozbijí při změně textu banky | Chybějící platby | Notifikace, kterou parser nepozná, jde do Doručených jako „nerozpoznaná“ s textem k ručnímu doplnění |
| iOS neumí číst notifikace | Polovina trhu bez automatiky | Zkratky (Apple Pay), sken, CSV / Fio API |

---

## 10. Otázky pro Milana před startem

1. **Repo:** `bcmilda/financeflow-native` (nový) – souhlas s názvem?
2. **Android první** (kvůli notifikacím), iOS až ve fázi 5 – OK?
3. **Jazyky:** cs + en od začátku. Přidat sk, de, pl?
4. **Companion appka (fáze 1) jako samostatná appka** „FinanceFlow Inbox“, nebo rovnou první verze plné appky s jednou obrazovkou?
5. **Které banky** máš ty a tvoje okolí (kvůli parserům a testům notifikací)?
6. **Placení:** zůstat u Stripe (web), nebo v nativní appce Google Play Billing? Pro digitální obsah v Play je Billing povinný – nutné ověřit podmínky.

---

## 11. Stav po Session N1 (17. 10. 2026) · dodatek

> Připsáno na konec, výše uvedený plán se nepřepisuje. Platná rozhodnutí a podrobnosti jsou v repu `financeflow-native` (`doc/ROZHODNUTI.md`, `doc/ARCHITEKTURA.md`, `doc/PARITA.md`, `doc/SESSION-N1.md`). Repo zatím není na GitHubu – poslední stav je v `financeflow-native-n0.2.zip`.

### Co se proti plánu změnilo (Milanova rozhodnutí)
- **Nativní appka je klon webu, jen vyladěnější** (N-009). Dokumentace webu je mapa obrazovek a výpočtů, ne pravidla nového projektu (N-002).
- **Žádná companion appka ani „📥 Doručené“** (bod 5, fáze 1): oznámení z banky se zapisují **rovnou do Transakcí** (N-005), s ochranou proti dvojímu zápisu a duplicitám s ručním zápisem.
- **Žádný odhad kategorie z oznámení** (N-008). Transakce z oznámení je bez kategorie, kategorii dá uživatel nebo položky připojené účtenky.
- **Jazyky od začátku:** cs, en, sk, pl, de, uk (bod 10/3).
- **Banky:** všechny české, Milan má KB (KB+) – parser KB ověřen na skutečných oznámeních (bod 10/5).
- **Zařízení:** musí fungovat na všech. Android všechny značky; iPhone cizí oznámení číst nedovolí → náhrada přes Zkratky a Apple Pay (zatím nepostavené).
- **Přihlášení:** Google i e-mail (N-010).

### Co je hotové (n0.2)
- Monorepo: `packages/core` (výpočty z webu + kontraktní test proti kódu webu, parsery bank, duplicity, párování účtenky s platbou), `packages/i18n` (6 jazyků, kontrola překladů a textu natvrdo), `apps/mobile` (React + Capacitor 8, Android služba čtení oznámení v Javě).
- Obrazovky: Přihlášení (Google + e-mail), Přehled (souhrnné karty, výdaje podle kategorií, poslední transakce, peněženky), Transakce (po dnech, hledání, filtry), formulář transakce (koncept, jen změněná pole, smazání se Zpět), Z banky, Nastavení.
- Data: živá synchronizace po transakcích, snímek v zařízení, fronta zápisů v zařízení (nic se neztratí ani bez internetu).
- 99 testů, CI staví debug APK.

### Proti původní technické sadě
- Kotlin plugin → **Java** (jednodušší build bez Kotlinu). Dexie → **idb-keyval** (stačí snímek a fronta). eslint pravidlo → **vlastní kontrola** (`tools/kontrola-textu.mjs`). Capacitor **8**.
- Web nemá samostatné „Rozpočty“ (fáze 2) – jen limity zdraví u kategorií a rozpočty projektů. Fáze se řídí tabulkou parity s webem.

### Další session
Plán v `PLAN-SESSION-N2.md` (repo `doc/` i Projekt): nejdřív appka na telefonu (první Android build, Google přihlášení, testovací průchod na skutečných datech), pak Peněženky a přesuny, Kategorie a Dluhy.

---

## 12. Stav po Session 26 (web, 18. 10. 2026) · dodatek

> Připsáno na konec. Session 26 (web) běžela souběžně se Session N1 a o jejích rozhodnutích nevěděla.

- **Web v11.89 + pravidla DB v11.89** přidaly „📲 Notifikace z telefonu“ (`js/inbox.js`, uzly `users/{uid}/inbox`, `inboxPairing`, `inboxLinks`) a vznikl samostatný prototyp **FinanceFlow Inbox v0.1.0** (Kotlin, `financeflow-native-v0.1.0.zip`). Je to přesně „companion appka + 📥 Doručené“ z fáze 1 tohoto plánu – kterou ale Milan v N1 **zamítl** (N-005: zápis rovnou do Transakcí, N-008: bez odhadu kategorie).
- **Platí rozhodnutí N1.** Nativní appka je n0.2 (repo `financeflow-native`). Inbox v0.1.0 se na GitHub nenahrává, APK se nestaví – čeká na Milanovo rozhodnutí (TODO-357):
  - **a)** Inbox zrušit; web v11.89 zůstane bez funkce (pravidla neškodí) a v další verzi se sekce 📲 schová / odstraní;
  - **b)** Inbox nechat jako **lehkou alternativu** pro lidi, kteří nechtějí celou nativní appku (jen čtení oznámení → Doručené na webu).
- **Co ze Session 26 se hodí i pro n0.2:** pravidlo „sken převezme platbu“ (účtenka se stejnou částkou ± 1 Kč a datem ± 2 dny nahradí transakci z oznámení, `inboxPrevzetiUctenkou`) – n0.2 má párování účtenky s platbou v `core`, sjednotit tolerance. Filtr citlivých oznámení (kódy, PIN, hesla) a „jen zprávy s částkou“ z `BankListener.kt` stojí za porovnání s Java službou n0.2.

**Aktualizace 18. 10. večer (ADR-232):** Milan rozhodl variantu **b)**. Rozhodnutí N1 se týkají jen nativní appky n0.2; web má Inbox jako vlastní nadstavbu (repo `bcmilda/financeflow-inbox`, Doručené → Transakce). Přenos „sken převezme platbu“ a filtru citlivých oznámení do n0.2 platí dál jako doporučení.
