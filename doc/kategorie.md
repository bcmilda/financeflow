# FinanceFlow · revize kategorií a podkategorií

*Session 25 · podklad k diskusi · nic není implementováno*

Prošel jsem `data/categories.json` (49 kategorií: 31 výdajových, 2 oboustranné, 8 příjmových, 6 spořicích/investičních přesunů). Níže najdeš principy, konkrétní nálezy, návrh struktury a otevřené otázky.

---

## 1 · Principy, ze kterých vycházím

1. **Jedna věc = jedno místo u jednoho uživatele.** Nabídka může mít víc možností (to je tvůj osobní přístup a je správný), ale aktivní smí být jen jedno místo. Jinak se statistika, predikce i report tiše rozjedou.
2. **Základní a Výběrové kategorie.** Základní se nepřekrývají a dostane je každý. Výběrové (tvoje „vytažené" věci jako Pivo, Letenka, Dítě) si uživatel zapne. Zapnutá výběrová **převezme** odpovídající podkategorii ze základní.
3. **Podkategorie podle účelu, ne podle obchodu nebo kanálu.** „Supermarket" a „Pekárna" ano. „Online nákup" nebo „Kamenný obchod" spíš ne, protože to neříká, za co peníze šly. Obchod už appka eviduje u účtenky (Analýza účtenek → 🏪 Obchody).
4. **ID se nemění.** Přejmenování je bezpečné, výpočty jedou přes `cat1`, `cat20`… a nic se nepřepočítává.
5. **Každá výdajová kategorie má správný COICOP oddíl** (inflace, srovnání s ČSÚ, Detektor).
6. **Rozumný počet podkategorií:** zhruba 4–9. Delší seznam se v novém výběru hůř čte.

---

## 2 · Co jsem našel

### 2.1 Překryvy, kvůli kterým se data rozdělí

| Věc | Kde všude je | Doporučení |
|---|---|---|
| Restaurace | `cat1` Jídlo & Nákupy › Restaurace **a** `cat20` Jídlo & Pití › Restaurace | jen v `cat20` |
| Rozvoz jídla | `cat1` › Rozvoz jídla **a** `cat20` › Rozvoz | jen v `cat20` |
| Alkohol | `cat20` › Alkohol **a** `cat26` Alkohol (+ `cat26` › Bar/Hospoda) | rozdělit podle místa, viz 2.4 |
| Pojištění | `cat3` › Pojištění, `cat11` › Pojištění auta **i** Havarijní pojištění, `cat18` › Cestovní pojištění, `cat27` Pojištění | základ u věci (Auto, Bydlení, Dovolená), `cat27` jako výběrová, která je převezme |
| Posilovna | `cat4` Zdraví › Gym **a** `cat41` Fitness & Posilovna | z Zdraví pryč |
| Letenky | `cat2` Doprava › Letadlo **a** `cat22` Letenka | `cat22` výběrová, jinak Doprava › Letenky |
| Ubytování | `cat18` › Hotel/Ubytování **a** `cat38` Ubytování | `cat38` výběrová |
| Výlety | `cat5` Zábava › Výlety **a** `cat18` › Výlet | jen jedno místo (Dovolená & výlety) |
| Telefon | `cat19` Elektronika › Telefon, `cat25` Opravy › Telefon, `cat36` Telefon › Nový telefon / Oprava telefonu | přístroj → Elektronika, opravy → Opravy, `cat36` jen tarif a data |
| Internet | `cat3` Bydlení › Internet | → `cat36` Telefon & internet |
| Opravy domácnosti | `cat17` › Opravy domácnosti **a** `cat25` Opravy | jen `cat25` |
| Opravy auta | `cat11` › Opravy **a** `cat25` › Auto opravy | jen `cat11` |
| Kadeřník | `cat34` Služby › Holič/Kadeřník **a** `cat47` Péče o sebe | jen `cat47` |
| Bankovní poplatky | `cat12` Banka › Poplatky, › Ostatní bankovní poplatky **a** `cat42` › Bankovní poplatek | jen `cat12`, v Banka sloučit dvě skoro stejné podkategorie |
| Knihy | `cat29` › Knihy **a** `cat16` › Knihy a učebnice | v pořádku (dětské vs. moje), jen vědomě |
| Hypotéka / leasing / kreditka | `cat32` Půjčka › Hypotéka… **a** `cat35` Splátka › Splátka hypotéky… | vyjasnit roli: Půjčka = přijetí/poskytnutí peněz, Splátka = splácení |
| Dividendy, Pronájem | `cat8` Ostatní příjmy **i** `cat45` Pasivní příjem | jen `cat45` |
| Penzijko, DIP | `cat31` Příspěvky zaměstnavatele **i** `cat_t_pension` / `cat_t_funds` | příjem od zaměstnavatele v `cat31`, vlastní spoření v přesunech |
| Spořicí účet | `cat_t_reserve` **i** `cat_t_savings` | rozlišit účel: rezerva vs. cílové spoření |
| Podílové fondy, Krypto | `cat_t_invest` **i** `cat_t_funds` / `cat_t_trading` | Fondy pod Investice, Trading jen aktivní obchodování |

### 2.2 Podkategorie, které bych přesunul nebo upravil

- **Pošta › Losy** → nová výběrová „🎲 Sázky & loterie" (COICOP 09), nebo Zábava. Losy nejsou poštovní služba.
- **Pošta › Ověření podpisu** → Poplatky (úřední úkon).
- **Zábava › Pernamentka fotbal** → překlep (Permanentka). Patří spíš do Fitness & sport, případně „Sport – vstupy".
- **Zábava › Čajovna** → Restaurace & kavárny › Kavárna & čajovna.
- **Zábava › Bruslení** → Sport (Fitness & sport › Vstupy). Je to pohyb, ne kultura.
- **Bydlení › Deposit** → přejmenovat na Kauce.
- **Bydlení › Energie** vedle Plyn a Voda → rozepsat na Elektřina, Plyn, Teplo, Voda. Měřidla s tím pak lépe párují.
- **Doprava › Bus, Tramvaj/Metro a MHD** → MHD (tramvaj, metro, městský bus) + Autobus (meziměstský).
- **Letenka › tam / zpět / tam a zpět** → směr cesty neříká nic o útratě. Lepší: Letenka, Zavazadla, Místenka & příplatky.
- **Domácí potřeby › Obecné** → zbytečné, na to je kategorie sama.
- **Elektronika › Baterie** → Domácí potřeby.
- **Jídlo & Pití › Kebab, Pizza** → spadají pod Fast food. Pokud je chceš vidět zvlášť, jsou to přesně tvoje osobní podkategorie (viz 2.5).
- **Nákup** (Online, Kamenný obchod, Trh/Bazár, Aukce) → kategorie je bez účelu a stává se z ní druhé „Jiné". Navrhuji ji zrušit pro nové uživatele, případně přejmenovat na „🛍️ Bazar & second hand" s podkategoriemi Bazar, Aukce, Second hand.
- **Cashback › Vrácení peněz** → vrácené peníze za zboží by měly snižovat výdaj kategorie, ne zvyšovat příjem. Cashback jako odměna v příjmech dává smysl.

### 2.3 Špatně přiřazený COICOP

Appka používá COICOP 2018, kde **12 = Pojištění a finanční služby** a **13 = Osobní péče a různé**. Těchto šest kategorií má 12, ale patří do 13:

| Kategorie | Teď | Mělo by být |
|---|---|---|
| `cat6` Dárky | 12 | 13 |
| `cat16` Dítě | 12 | 13 (nebo podle podkategorií) |
| `cat21` Jiné | 12 | 13 |
| `cat23` Nákup | 12 | 13 |
| `cat34` Služby | 12 | 13 |
| `cat40` Ztráta | 12 | 13 |

Dál: **Daně, Půjčka a Splátka** (`cat14`, `cat32`, `cat35`) nejsou spotřeba a do COICOP by nejspíš neměly vstupovat vůbec (`null`). Jinak zkreslují osobní inflaci i srovnání s ČSÚ. Úrok je finanční služba (12), jistina ne.

Tuhle opravu bych udělal nezávisle na ostatním. Nic nemění uživatelům v zobrazení, jen zpřesní inflaci a Detektor.

### 2.4 Alkohol, hospoda a bar

Tvůj nápad s „Hospoda/bar" je trefa a sedí i na statistiku. COICOP rozlišuje **místo spotřeby**:
- pivo z obchodu = 02 (Alkoholické nápoje),
- pivo v hospodě = 11 (Stravování).

Doporučuji:
- **🍺 Alkohol** (`cat26`, z obchodu): Pivo, Víno, Destiláty.
- **🍻 Hospoda & bar** (nová výběrová, COICOP 11): Pivo, Víno, Drinky, Nealko, Jídlo k pití.
- **🚬 Cigarety** (`cat43`) nechat zvlášť jako výběrovou. Sloučení s alkoholem by ti vzalo přesně tu separátní viditelnost, o kterou ti jde.

Kdo nechce hospodu zvlášť, má bar jako podkategorii v Restaurace & kavárny. Zapnutím „Hospoda & bar" se převezme.

### 2.5 Tvoje vytažené podkategorie (Pivo, Letenka, McDonald, Dítě)

Souhlasím s účelem: chceš to vidět hned, bez filtru, a nechceš, aby to zapadlo pod Nákupy. Rozlišil bych dva druhy:

- **Obecně užitečné** (Letenky, Dítě, Hospoda & bar, Cigarety, Mazlíček, Ubytování) → **výběrové kategorie** ve výchozí sadě. Každý si je zapne jedním klepnutím.
- **Čistě osobní** (McDonald, Kebab, konkrétní obchod) → **vlastní kategorie** uživatele, ne výchozí sada. Appka to umí už dnes. Jen by měla nabídnout „převzít podkategorii z…", aby se nezdvojovalo (stejný mechanismus jako u výběrových).

---

## 3 · Navržená struktura

**Z** = základní (má každý), **V** = výběrová (zapne si uživatel a převezme uvedené podkategorie).

### Výdaje

| | ID | Název | Podkategorie | Změna |
|---|---|---|---|---|
| Z | cat1 | 🛒 Potraviny | Supermarket, Diskont, Pekárna, Řeznictví, Tržnice & farmář, Večerka, Online potraviny | přejmenováno, bez restaurací a rozvozu |
| Z | cat20 | ☕ Restaurace & kavárny | Restaurace, Kavárna & čajovna, Fast food, Bistro & oběd v práci, Rozvoz jídla, Cukrárna, Bar | přejmenováno, bez alkoholu |
| V | cat26 | 🍺 Alkohol | Pivo, Víno, Destiláty | jen z obchodu |
| V | nová | 🍻 Hospoda & bar | Pivo, Víno, Drinky, Nealko, Jídlo k pití | převezme Bar z cat20 |
| V | cat43 | 🚬 Cigarety | Krabičky, Tabák, E-cigareta & náplně, Příslušenství | sloučeny dvě podkategorie |
| Z | cat3 | 🏠 Bydlení | Nájem, Fond oprav & SVJ, Elektřina, Plyn, Teplo, Voda, Odpad, Daň z nemovitosti, Revize & kominík, Servis kotle, Kauce, TV & rozhlas | Internet pryč, Energie rozepsána |
| Z | cat36 | 📱 Telefon & internet | Mobilní tarif, Internet domů, Data & kredit, Roaming, SIM | bez přístrojů a oprav |
| Z | cat17 | 🧹 Domácnost | Drogerie & úklid, Praní, Nádobí & kuchyň, Spotřebiče, Nábytek, Bytový textil, Dekorace, Zahrada | přejmenováno, bez oprav |
| Z | cat25 | 🔧 Opravy & údržba | Řemeslník, Opravy spotřebičů, Opravy elektroniky, Údržba domu | bez auta |
| V | cat33 | 🔨 Rekonstrukce | Materiál, Řemeslníci, Kuchyň, Koupelna, Okna & dveře, Podlahy, Topení, Fasáda | beze změny účelu |
| Z | cat2 | 🚌 Doprava | MHD, Vlak, Autobus, Taxi & Uber, Sdílená kola & koloběžky, Letenky | Bus/Tramvaj sjednoceno |
| V | cat22 | ✈️ Letenky | Letenka, Zavazadla, Místenka & příplatky | převezme Letenky z Dopravy |
| Z | cat11 | 🚙 Auto | Palivo, Servis & opravy, STK, Pneumatiky, Parkovné, Dálniční známka & mýto, Povinné ručení, Havarijní pojištění, Mytí | převzaty opravy auta |
| Z | cat4 | 💊 Zdraví | Léky & lékárna, Lékař, Zubař, Oční & optika, Doplňky stravy | bez Gymu |
| V | cat41 | 💪 Fitness & sport | Posilovna, Permanentka, Trenér, Vybavení, Plavání, Jóga, Vstupy (bruslení, fotbal) | přejmenováno, převezme sport ze Zábavy |
| Z | cat47 | 💇 Péče o sebe | Kosmetika & drogerie, Kadeřník & holič, Kosmetický salon, Manikúra & pedikúra, Masáže, Parfémy | převzat kadeřník ze Služeb |
| Z | cat24 | 👕 Oblečení & obuv | Oblečení, Obuv, Sportovní, Doplňky, Opravy oděvů | zjednodušeno |
| Z | cat19 | 💻 Elektronika | Telefon, Počítač, TV & audio, Příslušenství, Smart home | bez baterií |
| Z | cat5 | 🎬 Zábava & kultura | Kino & divadlo, Koncerty, Vstupenky, Hry, Zoo & muzea, Knihy & hudba | bez výletů a sportu |
| V | cat30 | 📺 Předplatné | Streaming, Hudba, Cloud & software, Aplikace, Noviny & časopisy | konkrétní služby jako podkategorie nechat, ale jen jako návrhy |
| Z | cat18 | 🏖️ Dovolená & výlety | Ubytování, Zájezd, Výlety, Cestovní pojištění, Wellness | převzaty Výlety ze Zábavy |
| V | cat38 | 🏨 Ubytování | Hotel, Airbnb, Hostel, Penzion, Kemp | převezme Ubytování z Dovolené |
| Z | cat29 | 📚 Vzdělávání | Kurzy, Školení & certifikát, Jazyky, Knihy, Konference | beze změny |
| V | cat16 | 👶 Dítě | Škola & školka, Kroužky, Oblečení, Hračky, Obědy, Kapesné, Knihy & učebnice, Dětské spoření | bez Dárků a Zábavy (jdou přes tagy) |
| V | cat44 | 🐾 Mazlíček | Krmivo, Veterinář, Výbava, Hračky, Psí hotel | beze změny |
| Z | cat6 | 🎁 Dárky & dary | Narozeniny, Vánoce, Květiny, Ostatní dárky, **Charita & dary** | nově charita (odečitatelná v daňovém přiznání) |
| Z | cat34 | ⚙️ Služby | Účetnictví, Právník, IT, Úklid, Zahradník, Opravy hodinek | bez kadeřníka |
| Z | cat12 | 🏦 Banka | Vedení účtu, Karta, Kurzové poplatky, Úroky | sloučené poplatky |
| Z | cat42 | 📄 Poplatky & úřady | Správní poplatek, Kolky, Notář, Katastr, Ověření, Tisk | bez bankovních |
| V | cat27 | 🛡️ Pojištění | Životní, Majetek & domácnost, Povinné ručení, Havarijní, Cestovní | převezme pojištění z Auta, Bydlení a Dovolené |
| V | nová | 🎲 Sázky & loterie | Losy, Sázky, Loterie | z Pošty |
| Z | cat28 | 📮 Pošta | Zásilka, Balíkovna, Dopis, Clo | bez losů a ověření |
| Z | cat40 | 😰 Ztráta | Ztracená hotovost, Krádež, Pokuta, Penále, Propadlá záloha | beze změny |
| Z | cat21 | 📦 Jiné | Nerozřazeno | jedna podkategorie |
| — | cat23 | 🛍️ Nákup | — | zrušit pro nové uživatele, nebo „Bazar & second hand" |

### Závazky a daně (mimo COICOP)

| | ID | Název | Podkategorie | Poznámka |
|---|---|---|---|---|
| Z | cat35 | 💳 Splátka | Hypotéka, Úvěr, Leasing, Kreditní karta, Půjčka | splácení |
| Z | cat32 | 🤲 Půjčka | Přijatá půjčka, Půjčil jsem, Vráceno | jen pohyb jistiny |
| Z | cat14 | 🏛️ Finanční úřad | Daň z příjmů, DPH, Silniční daň, Záloha, Přeplatek | beze změny |

### Příjmy

| ID | Název | Podkategorie | Změna |
|---|---|---|---|
| cat7 | 💰 Výplata | Základní plat, Bonus, Přesčasy | beze změny |
| cat46 | 👷 Brigáda | DPP, DPČ, Jednorázová, Přivýdělek | sjednoceno |
| cat31 | 🏢 Od zaměstnavatele | Stravenky, Benefit karta, Příspěvek na penzijko, Příspěvek na sport/vzdělání | bez DIP (patří k Fondům) |
| cat45 | 🌱 Pasivní příjem | Dividendy, Úroky, Pronájem, Licence, P2P | převzaty z Ostatních příjmů |
| cat8 | 💵 Ostatní příjmy | Freelance, Prodej věcí, Ostatní | bez dividend a pronájmu |
| cat15 | 🤝 Dar | Od rodiny, Od přátel, Dědictví, Sbírka | beze změny |
| cat13 | 💸 Cashback | Karta, Věrnostní program | bez „vrácení peněz" |

### Spoření a investice (přesuny)

| ID | Název | Podkategorie | Změna |
|---|---|---|---|
| cat_t_reserve | 🛟 Finanční rezerva | Pohotovostní rezerva, Termínovaný vklad | spořicí účet jen v Spoření |
| cat_t_savings | 🐷 Spoření | Spořicí účet, Stavební spoření, Cílové spoření | beze změny |
| cat_t_invest | 📈 Investice | ETF, Akcie, Dluhopisy, REIT, Podílové fondy | převzaty Fondy |
| cat_t_funds | 🏛️ Fondy | — | sloučit do Investic, nebo nechat jako výběrovou |
| cat_t_trading | 📊 Trading | Akcie & CFD, Forex, Krypto | podle typu, ne podle brokera (broker = peněženka) |
| cat_t_pension | 👴 Penzijko | Penzijní připojištění, DPS, DIP | převzato DIP |

---

## 4 · Pořadí, ve kterém bych to dělal

1. **COICOP opravy** (sekce 2.3). Nulové riziko, uživatel nic nevidí, zpřesní inflaci a Detektor.
2. **Přejmenování a úklid podkategorií** u výchozí sady (ID zůstávají). Stávající uživatelé by dostali nabídku „aktualizovat výchozí kategorie", ne automatický přepis.
3. **Výběrové kategorie s převzetím podkategorií** a dotazem na přesun starších transakcí. Tohle je ta větší část.
4. **„Převzít podkategorii z…" u vlastních kategorií** (McDonald a spol.).

## 5 · Otázky

1. **Nákup (`cat23`):** zrušit pro nové uživatele, nebo z něj udělat „Bazar & second hand"?
2. **Zapnuté výběrové kategorie u nového uživatele:** všechny vypnuté, nebo pár předzapnutých (Dítě, Mazlíček podle onboardingu)?
3. **Starší transakce při zapnutí výběrové kategorie:** přesouvat vždy, nikdy, nebo se zeptat?
4. **Cigarety:** nechat zvlášť (můj návrh), nebo sloučit s Alkoholem podle COICOP?
5. **Konkrétní služby v Předplatném** (Netflix, Spotify…): nechat jako podkategorie, nebo obecné typy a konkrétní službu poznávat podle názvu transakce?
