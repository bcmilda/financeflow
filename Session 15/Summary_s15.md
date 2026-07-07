# FinanceFlow – Summary Session 15 (v8.57 → v8.74)

> Čitelné shrnutí "co jsme dělali a proč" – verze po verzi.
> 18 verzí · 2026-07-02 až 2026-07-06 · Téma session: multi-měnová architektura,
> propojení bodovacích systémů (Dashboard ↔ Měsíční report ↔ Půjčky), Stripe příprava, TWA ikony.

---

## 🗺️ Velký obrázek – 4 hlavní dějové linky session

1. **Multi-měnová podpora (v8.58–61)** – appka umí pracovat s cizími měnami, aniž by to rozbilo historické součty.
2. **Vizuální a UX doladění (v8.62–70)** – grafy, nákupní seznam, limity kategorií, TWA ikony.
3. **Sjednocení výpočtů napříč appkou (v8.71–74)** – Dashboard, Měsíční report, Půjčky a Bankovní hodnocení dřív počítaly stejné věci (příjem, splátky, skóre) RŮZNĚ. Tahle linka to narovnala.
4. **Stripe příprava (průběžně)** – sandbox nastaven, čeká na tvoje dodání klíčů.

---

## v8.58 – Zafixovaný kurz cizí měny + oprava editace transakcí

**Co bylo cílem:** Aby transakce v EUR/USD peněžence neplavaly v kurzu při každém přepočtu.

- Nové pole **"Skutečně v Kč"** – při vkládání transakce v cizí měně appka předvyplní kurz ČNB, ale TY ho můžeš opravit podle skutečně stržené částky bankou. Jednou uloženo = navždy fixní (nepřepočítává se).
- 🐛 Oprava: editace transakce nevyplňovala peněženku ani typ platby.
- 🐛 Oprava: appka hlásila duplicity i mezi 900 Kč a 900 GBP (ignorovala měnu).

---

## v8.59 – Přesun peněz mezi různými měnami

**Problém:** Když jsi převedl 100 EUR z eurového účtu do korunového, appka to zapsala jako "100 Kč" (ne 100 EUR = ~2 530 Kč).

- Nové pole v modalu Přesun: **"Připsat do cílové peněženky"** – appka spočítá křížový kurz, ty ho můžeš upravit.

---

## v8.60–61 – Základní měna uživatele (CZK/EUR/USD/GBP/PLN)

**Co je nového:** V Nastavení → Lokalizace si vybereš, v jaké měně chceš VIDĚT všechny součty a grafy (nezávisle na tom, v jaké měně vedeš jednotlivé peněženky).

- Data se interně pořád počítají v korunách – jen se při ZOBRAZENÍ přepočítají živým kurzem ČNB.
- Rozšířeno na celou appku: Dashboard, Transakce, Projekty, Dluhy, Aktiva, Banku, Kalendář, AI Poradce, Radar – všude.

---

## v8.62 – Zaškrtávací nákupní seznam

- Položka se dá zaškrtnout jako "mám v košíku" – ztlumí se, přeškrtne, přesune dolů.
- Lišta nahoře ukazuje "V košíku 3 z 12" + tlačítko Vysypat košík.
- Přepsán graf **Finanční simulace života** (barvy, popisky, tooltip fungující i na mobilu).

---

## v8.63–64 – Automatické limity kategorií + oprava Kč limitu

- 🐛 Kritická oprava: pokud jsi měl limit kategorie zadaný JEN v Kč (bez %), appka ho úplně ignorovala a ukazovala "bez limitu, zelená".
- Nová funkce: appka ti umí navrhnout % limity kategorií automaticky – buď podle tvé historie (3+ měsíce dat), nebo podle průměrné české domácnosti (ČSÚ), pokud jsi nový uživatel.

---

## v8.65 – Přesuny už nekazí denní součty

- 🐛 Oprava: převody mezi peněženkami se počítaly do denních výdajů v Transakcích (i když by neměly – přesun není utrácení).

---

## v8.66–67 – Grafy Finančního obrazu + oprava kritického bugu

- Nový graf **"Inflace životního stylu"** – zrcadlově ukazuje příjmy (vlevo, zeleně) vs výdaje (vpravo, červeně) po měsících.
- Nový graf **"Wealth Momentum"** – sloupce měsíčních sald + čárkovaná průměrová linka.
- 🚨 **KRITICKÝ BUG:** zaškrtnutí položky v Nákupním seznamu SHODILO CELOU APLIKACI (chyba "total is not defined"). Opraveno ihned.
- **Statistiky → Vše** přepracováno na přehlednou tabulku (roky ve sloupcích, kategorie v řádcích).

---

## v8.68 – Doladění UX + první Excel s vysvětlením výpočtů

- Oprava zaseknutého převodníku měn při editaci transakce.
- Pole "Skutečně v Kč" přes celou šířku modalu (bylo zmáčklé).
- 1. pokus o opravu šipek řazení kategorií (jen částečně fungoval – viz v8.70–71).
- **Excel `FinanceFlow_Vypocty_Skore.xlsx`** – poprvé vytvořen, vysvětluje bodování limitů kategorií a Finančního obrazu s interaktivními vzorci.

---

## v8.69 – Ikony pro Google Play (TWA)

- Kompletní sada ikon z tvé předlohy (srdce s EKG): Play Store (ostré rohy), telefon (zaoblené), adaptivní Android ikony, Apple touch icon, banner pro Play Store listing.
- Bonus: ukázal jsem 3 vlastní kreativní koncepty ikon (Tok peněz, Mince s Kč, Puls růstu) – jen jako inspirace, nenasazeno.

---

## v8.70 – Rozlišení Rezerva vs. Investice

**Proč:** Dashboard boduje zvlášť "Rezervu" a "Aktivní spoření", ale appka to uměla rozlišit jen jedním checkboxem.

- Kategorie typu Přesun mají teď DVA přepínače: 🛟 Finanční rezerva a 📈 Investice/aktivní spoření (vzájemně se vylučují).
- Modal Přesun teď v nabídce "KAM" seskupuje kategorie podle toho, co jsi označil.
- 2. pokus o opravu šipek kategorií (pořád ne úplně ono).
- Tlačítko "Nastavit limity automaticky" přímo na stránce Kategorie.

---

## v8.71 – Velká dávka oprav Půjček + Avalanche vs. Sněhová koule

- 🐛 Napojená aktiva (vzniklá automaticky z přesunů) po smazání zůstala navždy pryč, i po nové transakci. Opraveno + tlačítko smazat je teď u nich schované (spravují se sama).
- 🐛 Progress bar půjčky ukazoval 0 %, i když jsi měl už polovinu splacenou z doby PŘED appkou. Opraveno.
- 🐛 "Dluh tě stojí 125 Kč/den" vs banner "215 Kč/den" – dvě různá čísla na dvou místech. Sjednoceno.
- Karta půjčky nově ukazuje: kolik ještě PŘEPLATÍŠ, KDY doplatíš, kolik ti ZBÝVÁ doby.
- **Nová funkce: Avalanche vs. Sněhová koule** – porovnání dvou strategií splácení dluhů (nejdřív nejdražší úrok vs. nejdřív nejmenší dluh), s grafem a doporučením.
- 3. (finální) pokus o opravu šipek kategorií – tentokrát vyřešeno pořádně.

---

## v8.72 – ZÁSADNÍ oprava: Finanční obraz konečně funguje správně

- 🚨 **Financial Freedom Ratio a Diverzifikace příjmů byly celou dobu rozbité** – počítaly se ze VÝDAJŮ místo z PŘÍJMŮ. Proto jsi viděl nesmyslné "Finanční úřad tvoří 100 % tvých příjmů" (byla to ve skutečnosti daň, tedy výdaj). Opraveno.
- 🐛 Dluhový stres index a Bankovní hodnocení ukazovaly různé DSTI (732 % vs 753 %) – počítaly splátky dluhů jinak. Sjednoceno na jeden sdílený výpočet.
- Rezerva a Aktivní spoření propojeny do skutečného bodování (viz v8.70).
- Nastavení → nová volba "Převodní měna" – převodník se předvolí na tvoji oblíbenou měnu místo Kč→Kč.
- Modal Přesun přeuspořádán – Název/Částka/Datum nahoře jako u ostatních typů transakcí.

---

## v8.73 – KRITICKÁ chyba (moje vlastní) + Milanovy bodovací tabulky všude

- 🚨 **Moje chyba:** při opravě z v8.72 jsem omylem smazal 108 řádků kódu a stránka Půjčky přestala jít vůbec otevřít. Ihned opraveno, ale je to důležité poučení, které jsem si zapsal (viz níže).
- Tvoje **plné bodovací tabulky z Excelu** (přesné body pro každou desetinu procenta, ne jen hrubé skoky) implementovány do VŠECH výpočtů: Měsíční report, Bankovní hodnocení, Dluhový stres index.
- Oprava: převodní měna z Nastavení se nepropsala u NOVÉ transakce (jen u editace).
- Měny převodníku rozšířeny na všech ~33 měn z živých kurzů ČNB (dřív jen 5–7).

---

## v8.74 – Dashboard na plné škále + poslední doladění

- **Dashboard Finanční skóre** teď počítá s plnými body z tvých tabulek (Cash flow 0–75, Zadluženost 0–100, Rezerva 0–50, Spoření 0–35) místo zjednodušených 0–25 za každou složku.
- Přidána **5. složka: Rozpočet** (0–50 bodů), napojená na Měsíční report.
- 🐛 Oprava: Finanční obraz ukazoval zelenou fajfku u ROSTOUCÍCH výdajů (mělo být varování, ne pochvala) – šipka směru a hodnocení byly popletené.
- 🐛 Oprava: šipka trendu kategorie v Měsíčním reportu byla červená i když jsi byl v limitu (teď šedá = informativní, červená = skutečný problém).
- Avalanche vs. Sněhová koule rozšířeno: posuvník na 5–30 let, graf počtu půjček v čase, tabulka kam tečou peníze.
- Tabulka "Měsíc po měsíci" ve Finančním obraze má nově součtový řádek.

---

## 📊 Čísla za celou session

| Metrika | Počet |
|---|---|
| Verzí appky | 18 (v8.57 → v8.74) |
| Opravené bugy (FIX) | 18 |
| Architektonická rozhodnutí (ADR) | 7 |
| Nové/dokončené úkoly (TODO) | 16 |
| Nové JS helpery (sdílené výpočty) | 6 (`txCZK`, `getIncActual`, `computeMonthlyDebtPayments`, `computeEffectiveIncome`, `_SCORING`, `msc_*`) |
| Excel soubory vytvořené | 1 (rozšiřovaný, nakonec 4 listy) |
| Nejzávažnější bug | FIX-187 (Financial Freedom Ratio celé měsíce nefungovalo správně) |
| Nejkritičtější incident | FIX-189 (moje chyba smazala stránku Půjčky – ihned opraveno) |

---

## 🎯 Co zůstává otevřené pro příště

1. **Stripe platby (TODO-153)** – čeká na tebe: Payment Link URL + `sk_test_...` + `whsec_...` klíče do Cloudflare Secrets. Pak dopíšu webhook.
2. **Google Play / TWA** – ikony hotové, zbývá finalizovat balíček přes PWABuilder a nahrát do Play Console.
3. **MacroDroid parser** (TODO-154) – odloženo, nízká priorita.
4. Zvážit, zda Dluhový stres index (počet půjček, rizikové typy) má taky přejít na tvoje plné tabulky – zatím záměrně ponechán na vlastní logice, protože má opačnou škálu (víc bodů = hůř).

---

*Sepsáno na konci Session 15 · 2026-07-06 · Claude (Sonnet 4.6)*
