# FinanceFlow – podklady pro Google Play

Verze podkladů: 2026-10-08 (Session 25), verze 3 – doplněné funkce, stránka pro smazání účtu, testovací účet · balík `cz.financeflow.app` · jazyk záznamu: čeština (cs-CZ)

Všechny texty jsou ověřené proti limitům Google Play a proti tomu, co aplikace opravdu umí (nic, co je jen v plánu). Počty znaků jsou spočítané skriptem.

---

## 1. Název aplikace (max. 30 znaků)

| | Návrh | Znaků |
|---|---|---|
| ✅ doporučuji | **FinanceFlow: finance a účtenky** | 30 |
| alternativa | FinanceFlow – výdaje a účtenky | 30 |
| alternativa | FinanceFlow: osobní finance | 27 |

Proč: název má pro vyhledávání v Google Play největší váhu. „finance“ a „účtenky“ jsou slova, podle kterých tě lidé budou hledat, a zároveň říkají, čím se lišíš od bankovních aplikací. Google v názvu zakazuje slova jako „zdarma“, „nejlepší“, „#1“ nebo emoji – proto tam nejsou.

---

## 2. Krátký popis (max. 80 znaků)

Zobrazuje se pod názvem a silně ovlivňuje vyhledávání.

| | Návrh | Znaků |
|---|---|---|
| ✅ doporučuji | **Osobní finance do detailu: účtenky, ceny v obchodech, rozpočet, dluhy i výplata.** | 80 |
| alternativa – hlavní příběh | Účtenky po položkách, ceny v obchodech a vlastní inflace. Rozpočet do detailu. | 78 |
| alternativa (původní) | Sken účtenek, ceny napříč obchody, rozpočet a dluhy. Přehled financí do detailu. | 80 |

Proč první: „osobní finance“ je nejširší hledaný výraz (v úplném popisu zazní jen jednou, v úvodu). Druhá varianta sází na to, čím se lišíš – vhodná, pokud bys chtěl cílit na lidi, které zajímají ceny a inflace.

---

## 3. Úplný popis (max. 4 000 znaků)

Délka: **3623 znaků** včetně značek `<b>` · rezerva 377 znaků. Verze 3 – vychází z tvé úpravy, doplněná o celek „Od účtenky k vlastní inflaci“, klíčová slova ze seznamu a o převodník měn, Kurzy měn, import z CSV/Excelu/PDF, Predikci, Finanční radar, Finanční obraz a AI rádce.

**Záměrně vynecháno:** Deník a Import z banky (čtení bankovních notifikací) – v menu je zatím vidí jen admin. Google zamítá aplikace, jejichž popis slibuje funkce, které běžný uživatel nenajde. Až je zpřístupníš všem, doplníme je (místo zbývá).

Prvních ~170 znaků vidí každý bez rozkliknutí „Více“ – proto úvod nese nejsilnější výrazy (osobní finance, správa peněz, rodinné a domácí finance, sledování výdajů, měsíční rozpočet, finanční plánování).

```
FinanceFlow je česká aplikace pro osobní finance. Správa peněz, rodinné i domácí finance na jednom místě: sledování výdajů, měsíční rozpočet i finanční plánování bez tabulek. Uvidíš nejen kolik utrácíš, ale i za co přesně, kde nakupuješ a jak se ceny mění v čase.

<b>OD ÚČTENKY K VLASTNÍ INFLACI</b>
Běžná aplikace ti řekne, že jsi utratil 2 400 Kč v obchodě. FinanceFlow jde dál:
1. Účtenka – vyfotíš ji a AI ji rozepíše na jednotlivé produkty.
2. Produkt – rohlík, máslo, káva. Čárový kód (EAN) připojí přesný výrobek se složením a nutričními hodnotami.
3. Cena – kolik jsi zaplatil a kolik ušetřil na slevě.
4. Obchod – porovnání cen stejného produktu napříč obchody (Albert, Billa, Kaufland, Lidl, Penny, Tesco a další).
5. Vývoj ceny – jak se cena mění měsíc po měsíci.
6. Vlastní inflace – o kolik zdražuje právě tvůj nákup, vedle oficiální inflace ČSÚ.
7. Dopad na rozpočet – kolik tě zdražení stojí v korunách a které produkty ho způsobují.

<b>ÚČTENKY A NÁKUPY</b>
• skenování účtenek – nákupní výdaje rozepsané po položkách
• sledování cen – ceny potravin a dalšího zboží, které kupuješ pravidelně
• zařazení do spotřebního koše ČSÚ (CZ-COICOP) i s vahou skupiny u průměrné domácnosti
• statistika položek podle kategorie, obchodu, města a kraje
• nákupní seznam

<b>SROVNÁNÍ S OSTATNÍMI</b>
• tvé výdaje vedle komunity (medián) a průměrné domácnosti podle ČSÚ
• ceny v tvém kraji – jen anonymní souhrny od tří a více lidí, sdílení jde kdykoli vypnout

<b>VÝDAJE A ROZPOČET</b>
• příjmy a výdaje v kategoriích a podkategoriích, přehledné grafy
• měsíční rozpočet: limity kategorií nastavíš sám, nebo automaticky podle ČSÚ či svých výdajů; sledování rozpočtu ukáže, kde přetahuješ
• peněženky a účty včetně hotovosti a cizích měn
• kalkulačka a převodník měn přímo při zadání transakce, stránka Kurzy měn s kurzy ČNB
• import bankovního výpisu z CSV, Excelu i PDF
• opakované platby, budoucí platby a výhled na příští měsíc
• Predikce výdajů do konce měsíce a Finanční radar „do výplaty“ – kontrola výdajů v průběhu měsíce

<b>CÍLE, SPOŘENÍ A ČISTÉ JMĚNÍ</b>
• finanční cíle, přání a projekty (rekonstrukce, dovolená)
• spoření, finanční rezerva a čisté jmění včetně aktiv
• Finanční obraz, finanční skóre, Detektor úspor a měsíční finanční přehled v PDF
• AI rádce – doporučení a odpovědi postavené na tvých vlastních číslech

<b>DLUHY, PŮJČKY A ÚVĚRY</b>
Správa dluhů na jednom místě: splátkový kalendář, RPSN, simulace mimořádné splátky a srovnání strategií splácení úvěru. Při zadání půjčky funguje jako kalkulačka úvěru – hned vidíš splátky a celkové úroky. Ukazatel dluhového stresu napoví, jestli nejsi zadlužený víc, než je zdravé.

<b>PRACOVNÍ SMĚNY A VÝPLATA</b>
Nevíš, jakou máš příští měsíc směnu? Podíváš se a víš. Směny, přesčasy, dovolená v hodinách a hodinová sazba. Evidence výplatních pásek ukáže, z čeho se mzda skládá – i když zaměstnavatel zvedne základ a zároveň sebere na prémiích.

<b>AUTO A DOMÁCNOST</b>
• tankování, spotřeba auta a náklady na kilometr
• energie domácnosti – odečty elektřiny, plynu a vody
• doklady a záruky v archivu
• rodinné finance a rodinný rozpočet: sdílení s partnerem a souhrn za domácnost – sám určuješ, co partner uvidí

<b>SOUKROMÍ</b>
• žádné napojení na banku ani přihlašovací údaje k bankovnictví
• data na serverech v EU, šifrovaný přenos, bez reklam
• export do CSV a JSON, smazání účtu i dat přímo v aplikaci

Základní funkce jsou zdarma, včetně tří skenů účtenek měsíčně. Rozšířené analýzy a AI funkce jsou součástí Premium. Aplikace pro Android i web financeflow.cz se synchronizují.

Vyvíjeno v Česku. Nápad nebo chyba? Napiš na info@financeflow.cz.
```

---

## 4. Klíčová slova

Google Play **nemá pole pro klíčová slova**. Hledání bere slova z názvu, krátkého popisu a úplného popisu, a také z toho, jak lidé aplikaci používají a hodnotí. Uměle opakovaná slova („keyword stuffing“) Google trestá – proto každý výraz zazní přirozeně, většinou jednou až třikrát.

Počty výskytů v úplném popisu (spočítané skriptem, přesný tvar; u „půjčk“, „úvěr“, „splát“, „směn“, „výplat“ se počítají všechny tvary):

| Oblast | Výrazy (výskyty) |
|---|---|
| Hlavní oblast | správa peněz (1×) · osobní finance (1×) · rodinné finance (1×) · domácí finance (1×) · finanční přehled (1×) · finanční plánování (1×) |
| Výdaje a rozpočet | sledování výdajů (1×) · kontrola výdajů (1×) · rozpočet (5×) · měsíční rozpočet (2×) · sledování rozpočtu (1×) · rodinný rozpočet (1×) · příjmy a výdaje (1×) |
| Účtenky a nákupy | skenování účtenek (1×) · nákupní výdaje (1×) · sledování cen (1×) · ceny potravin (1×) · porovnání cen (1×) · nákupní seznam (1×) |
| Hlavní příběh | účtenka (1×) · produkt (4×) · vývoj ceny (1×) · vlastní inflace (1×) · dopad na rozpočet (1×) |
| Dluhy | správa dluhů (1×) · půjčk (2×) · úvěr (3×) · splácení úvěru (1×) · kalkulačka úvěru (1×) · splát (3×) · dluhového stresu (1×) |
| Další silné oblasti | finanční cíle (1×) · spoření (2×) · finanční rezerva (1×) · čisté jmění (2×) · směn (3×) · výplat (3×) · tankování (1×) · spotřeba auta (1×) · energie domácnosti (1×) |

Mimo úplný popis: „finance“ a „účtenky“ v názvu, „osobní finance“, „rozpočet“, „dluhy“, „výplata“ v krátkém popisu.

**Hlavní příběh** (čím je FinanceFlow jiná): *účtenka → produkty → cena → obchod → vývoj ceny → vlastní inflace → dopad na rozpočet*. V popisu má vlastní očíslovaný blok hned za úvodem a stejným příběhem by měly začínat i screenshoty (bod 10).

---

## 5. Kategorie a štítky

- **Typ aplikace:** Aplikace · **Kategorie:** Finance
- **Štítky** (vybírají se ze seznamu v Play Console, max. 5): doporučuji ty, které odpovídají „rozpočet / sledování výdajů / osobní finance / správa peněz / skenování účtenek“ – přesné názvy nabídne konzole.
- **Kontaktní e-mail:** info@financeflow.cz · **Web:** https://financeflow.cz
- **Zásady ochrany osobních údajů (URL):** https://financeflow.cz/legal.html

---

## 6. Co je nového (max. 500 znaků) – první testovací verze

Délka: **337 znaků**

```
První testovací verze FinanceFlow pro Android.
• analýza účtenek po položkách, slevy a vývoj cen v obchodech
• čárové kódy, karta výrobku a nutriční hodnoty
• rozpočet, peněženky, opakované platby a výhled na příští měsíc
• dluhy, cíle, pracovní kalendář a měsíční report
Díky, že testuješ. Chyby a nápady posílej na info@financeflow.cz.
```

---

## 7. Text pro testery (uzavřený test)

Hodí se do popisu testu v Play Console i do zprávy, kterou testerům pošleš s odkazem.

```
Díky, že pomáháš FinanceFlow otestovat!

Co od tebe potřebuju: používej aplikaci aspoň 14 dní tak, jak bys ji používal normálně. Zapisuj výdaje, naskenuj pár účtenek z různých obchodů, zkus čárový kód na obalu a podívej se do přehledů.

Na co se zaměř:
• co ti nedávalo smysl nebo kde ses zasekl
• co nefungovalo nebo vypadalo rozbitě (ideálně se screenshotem)
• co ti chybělo a co tě naopak bavilo

Zpětnou vazbu pošli na info@financeflow.cz nebo v aplikaci přes O aplikaci → Kontakt & podpora. Testování nic nestojí a odinstalovat můžeš kdykoli – jen prosím vydrž 14 dní, Google to pro zveřejnění aplikace vyžaduje.
```

**Pozor na podmínku Google:** u nového osobního vývojářského účtu musí uzavřený test běžet **aspoň 14 dní nepřetržitě s aspoň 12 testery**, kteří zůstanou přihlášení celou dobu. Až potom jde požádat o produkční přístup. Testery přidáváš e-mailem jejich Google účtu (Gmail), proto si e-mail vyžádej rovnou v náborovém příspěvku. Doporučuji jich nabrat 15–20 – vždycky někdo odpadne.

---

## 8. Zabezpečení údajů (Data safety) – návrh odpovědí

Vychází z `legal.html` (zpracovatelé: Google Firebase, Cloudflare, Anthropic, Sentry, Resend) a z toho, co aplikace dělá. **Před odesláním projdeme spolu** – formulář je právně závazný.

| Otázka | Odpověď | Poznámka |
|---|---|---|
| Shromažďuje aplikace data? | Ano | |
| Sdílí data se třetími stranami? | Ne | Předání zpracovatelům, kteří data zpracovávají jen pro nás (Firebase, Anthropic…), se podle Google za „sdílení“ nepovažuje. Sdílené ceny v kraji jsou anonymní souhrny. |
| Šifrování při přenosu | Ano | HTTPS |
| Lze požádat o smazání dat? | Ano | V aplikaci (Můj účet → Smazat účet) a na webu: **https://financeflow.cz/smazani-uctu.html** – tuto adresu vyplň v Play Console do pole „Adresa URL pro smazání účtu“ |
| Osobní údaje: e-mail, jméno | Ano – správa účtu | Přihlášení přes Google / e-mail |
| Finanční údaje: nákupy, ostatní finanční údaje | Ano – funkce aplikace | Transakce, účtenky, dluhy, výplatní pásky |
| Fotky | Ano – funkce aplikace | Účtenky a obaly se pošlou k AI analýze; uloží se jen doklad, který si uživatel sám „uschová“ |
| Aktivita v aplikaci | Ano – analytika | Google Analytics jen se souhlasem |
| Diagnostika, protokoly pádů | Ano – analytika | Sentry |
| Identifikátory zařízení | Pravděpodobně ano | Google Analytics / Firebase – ověřit |
| Poloha | Ne | Město a kraj se berou z účtenky, ne z GPS |
| Zdravotní údaje | Ne | Nutriční hodnoty výrobků nejsou zdravotní údaje uživatele |

---

## 9. Další formuláře v Play Console

- **Přístup k aplikaci:** aplikace vyžaduje přihlášení, proto se v Play Console zvolí „Všechny nebo některé funkce jsou omezené“ a vyplní **testovací účet** – viz bod 12.
- **Reklamy:** Ne.
- **Hodnocení obsahu (dotazník IARC):** kategorie „Nástroj/Produktivita/Finance“, bez násilí, hazardu a sexuálního obsahu. Uživatelé spolu nekomunikují (sdílení s partnerem je jen náhled dat, ne chat).
- **Cílová skupina:** 18+ (finanční aplikace, není pro děti).
- **Finanční funkce (prohlášení):** „Osobní finance / rozpočet“ – aplikace nepůjčuje peníze, neprovádí platby ani neobchoduje s investicemi. Porovnání úvěrů (`lepsi-uver.html`) do aplikace v Play režimu nedávat, jinak se rozšíří požadavky.
- **Vládní aplikace / zprávy / zdraví:** Ne.

---

## 10. Grafika – co bude potřeba (screenshoty zatím nejsou)

| Prvek | Rozměr | Stav |
|---|---|---|
| Ikona | 512 × 512 PNG | ✅ `icons/icon-512.png` je připravená |
| Grafika funkce (feature graphic) | 1024 × 500 JPG/PNG | **chybí** – návrh textu: „Víš, za co utrácíš?“ + náhled účtenky rozepsané na položky |
| Screenshoty telefonu | 2–8 ks, 9:16, min. 1080 px na kratší straně | **chybí** |

Doporučené pořadí screenshotů – prvních 5 vypráví hlavní příběh, první 3 uvidí každý:
1. **Účtenka rozepsaná na produkty** – „Každá účtenka po položkách“
2. **Karta výrobku s cenami v obchodech** – „Kde je stejný produkt levnější“
3. **Vývoj ceny / Zdražování** – „Jak se ceny mění v čase“
4. **Tvoje inflace vs. oficiální ČSÚ** – „Tvoje vlastní inflace“
5. **Co tě zdražuje nejvíc (dopad v Kč)** – „Kolik tě zdražení stojí“
6. **Dashboard / měsíční rozpočet** – „Rozpočet pod kontrolou“
7. **Dluhy – kdy budeš bez dluhů** – „Plán splácení a úroky“
8. **Pracovní kalendář se směnami** – „Směny a výplata pod kontrolou“

Krátký nadpis do horní části každého screenshotu prodá víc než samotný snímek. Data na screenshotech musí být ukázková, ne tvoje skutečná.

---

## 11. Co ještě udělat / ověřit

1. ✅ **Webová stránka pro smazání účtu** – hotovo: `smazani-uctu.html` (odkaz i z patičky webu a z `legal.html`). Po nasazení zkontroluj, že se otevře na https://financeflow.cz/smazani-uctu.html. V tabulce „Co zůstane“ je doba **3 roky** u záznamu o smazání – to je můj návrh, potvrď nebo změň.
2. **IČO a jméno vývojáře v `legal.html`** – Google zobrazuje údaje vývojáře veřejně a musí sedět s účtem.
3. **Zmínka o Premium** – v popisu je jen věta, že rozšířené funkce jsou součástí Premium, bez ceny a bez odkazu. Odkaz nebo výzva „kup na webu“ v popisu by porušila pravidla o platbách mimo Google Play. V aplikaci v Play režimu nákup už nahrazuje text bez odkazu (TODO-294).
4. **Názvy obchodů v popisu** (Albert, Billa, Kaufland, Lidl, Penny, Tesco) – jde o popis, které účtenky aplikace umí přečíst, to Google povoluje. Pokud by kontrola měla výhrady, nahradit „účtenky z běžných obchodních řetězců“.
5. **Screenshoty a grafika funkce** – až budou, doplnit do bodu 10.
6. **Druhý otisk do `assetlinks.json`** po prvním nahrání (TODO-301).

---

## 12. Testovací účet pro kontrolu Google

**Co to je:** než Google aplikaci schválí, projde ji jeho kontrolor (člověk i automat). Protože FinanceFlow bez přihlášení nic neukáže, musíš mu v Play Console (**Obsah aplikace → Přístup k aplikaci**) dát přihlašovací údaje k účtu, na kterém si aplikaci proklikne. Bez nich kontrolu většinou zamítnou s důvodem „nemohli jsme se dostat do aplikace“.

**Vytvořit ho musíš ty** – já se do tvého Firebase ani do aplikace přihlásit nemůžu. Je to obyčejný účet jako každý jiný:

1. Založ novou e-mailovou schránku jen pro tento účel (např. Gmail typu `financeflow.review@…`), ať se nemíchá s tvými daty.
2. V aplikaci se zaregistruj přes **e-mail a heslo** (ne přes Google – kontrolor se do cizího Google účtu nepřihlásí). Ověř e-mail.
3. Naplň účet **ukázkovými daty**: 2–3 peněženky, pár desítek transakcí za 2–3 měsíce, 5–10 naskenovaných účtenek z různých obchodů, jeden dluh, cíl a pár směn v kalendáři. Ať kontrolor vidí, že popis odpovídá.
4. Zapni mu **Premium**, ať vidí i funkce z popisu, které jsou v Premium (AI rádce, Predikce): Admin panel → uživatelé → detail účtu → **+1 rok Premium**. Premium je časově omezené – za rok ho prodluž, jinak kontrola další verze uvidí zamčené funkce.
5. Do Play Console vyplň e-mail, heslo a krátký pokyn, třeba: *„Přihlaste se e-mailem a heslem na úvodní obrazovce. Účet obsahuje ukázková data; skenování účtenek najdete v menu Analýza účtenek.“*
6. Účet **nemaž a neměň mu heslo** – Google ho používá i při kontrole každé další verze.

Stejný účet se ti pak hodí i na screenshoty (ukázková data místo tvých skutečných).
