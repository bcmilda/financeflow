### Sladění mechanismu — jedna otázka

Granularitu **řídíš strukturou kategorií**: 1 kategorie = 1 aktivum. Pro penzijko ideální. Ale u investic to znamená, že **Trading se subkategoriemi Bybit/XTB/Binance = jedno „Trading" aktivum** (vše sloučené dohromady).

Pokud chceš sledovat **každého brokera zvlášť** (Bybit jako samostatné aktivum, XTB jako samostatné…), stačí udělat **samostatnou kategorii pro každého** místo subkategorií. Mechanismus je tedy flexibilní — ty rozhodneš.

**Vyhovuje ti takhle category-level mapování** (penzijko = 1 aktivum, brokeři dle toho, jak si uděláš kategorie), nebo bys u investic chtěl automaticky aktivum **per subkategorie** (per broker)? Podle toho případně doladím.

### Vlastní podkategorie se teď ukládá

Když napíšeš novou podkategorii přímo v transakci (to pole „nebo napiš vlastní…"), **přidá se rovnou do kategorie** → jde filtrovat v Transakcích a příště se nabídne jako chip. Neomezuju tvorbu — můžeš ji zadat hned, a přitom se uloží. Platí pro přesun do aktiv i běžné výdaje/příjmy. (Helper `ensureSubcat` v `helpers.js`.)

### 🔗 Investice → Finanční aktiva

Mechanismus přesně podle tvého modelu: **každá transfer-kategorie = jedno finanční aktivum.** Když přidáš transakci, automaticky se propíše do Aktiv.

**Tvůj penzijní příklad** (otestováno):

- Kategorie „Doplňkové penzijní spoření" s podkategoriemi _vlastní vklad + státní příspěvek + příspěvek zaměstnavatele_
- → **jedno aktivum**, `vloženo` = součet všech tří napříč podkategoriemi (mínus případné výběry)
- typ se sám pozná jako **Spoření** (název obsahuje „penzij")

**Klíčový detail — vloženo vs. hodnota:** aktivum má `vloženo` (auto ze součtu vkladů) i `aktuální hodnotu` (tržní). Dokud tržní hodnotu nezadáš ručně, kopíruje vklady. Jakmile ji zadáš (třeba penzijko narostlo na 50 000), **sync ji už nepřepíše** — vidíš zhodnocení. Karta to umí zobrazit (čárkovaná linka „vloženo" + zelený/červený zisk). Napojené aktivum má odznak **„🔄 z přesunů"**.

Testy: penzijko (3 podkat → 1 aktivum, 1530 Kč) ✅, Trading (Bybit+XTB sloučeno) ✅, běžné kategorie ignorovány ✅, idempotentní (žádné duplikáty) ✅, ruční hodnota zachována ✅. Sync běží centrálně v `save()`, takže se aktualizuje při každé změně (přidání/úpravě/smazání transakce). Smažeš-li napojené aktivum, znovu se nevytvoří.


### Nápady na User Center (inspirace Bybitem)

Teď je profil jen malý modal se jménem. Bylo by fajn udělat z toho **plnohodnotnou stránku „Profil & Účet"** s odděleními (jako Bybit má taby My info / Security / Preference). Většina dílků už v appce existuje, jen jsou roztroušené — šlo by je sjednotit:

**👤 Profil** — avatar (zatím jen ikonka, šlo by iniciály+barva nebo nahrání), jméno, e-mail, UID, stav Premium (Free / platné do…), **referral kód + odkaz + statistiky + zadání kódu**.

**🔒 Zabezpečení** — změna hesla, PIN zámek (appka ho má, jen ho zviditelnit), odhlásit všude, **smazat účet** (a to se hezky pojí s tím referral prahem — smazání + nová registrace už body nefarmí).

**👨‍👩‍👧 Rodina / Partneři** — s kým sdílíš, přepnutí pohledu, pozvat partnera (dnes je to v sidebaru).

**⚙️ Předvolby** — motiv, jazyk, výchozí měna, notifikace.

**💾 Data** — export CSV, záloha JSON, import.

**ℹ️ O aplikaci** — nápověda, podmínky, ohodnotit, verze, kontakt.

Hlavní přínos = jedno přehledné místo místo roztroušených nastavení + doplnění chybějícího (avatar, mazání účtu, jasnější Premium/referral). Klidně to udělám jako samostatnou stránku.

**Affiliate pole** už v profilu **je** (přidal jsem ho v v8.32 pod „Zobrazované jméno"). Na tvém screenu (Image 2) ho nevidíš, protože je to ještě před nasazením v8.32. Po nasazení se objeví — uživatel se přihlásí sám a pak tam vloží kamarádův kód → je „pod ním" → kamarád dostane body. Přesně tvůj scénář.

**Lepší práh proti zneužití (v8.33)** — hotovo. Místo „5 transakcí" se body pozvateli připíšou, až když má referovaný účet:

- **používá appku ≥ 14 dní**, NEBO
- **≥ 7 dní s přihlášením** (max 1× za den) **+ ≥ 5 transakcí**.

Přidal jsem lehký tracker (`users/{uid}/activity` — počítá dny přihlášení a stáří účtu). Otestováno: nový účet ❌, 14 dní starý ✅, 7 přihlášení + 5 tx ✅, 7 + 3 tx ❌. Prahy jsou v `share.js` nahoře (`REFERRAL_MIN_DAYS`, `REFERRAL_MIN_LOGINDAYS`, `REFERRAL_MIN_TX`) — můžeš si je doladit.