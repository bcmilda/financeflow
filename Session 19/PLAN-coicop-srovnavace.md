# Plán · COICOP srovnávače

**Stav k v10.01** · podklad pro rozhodnutí, ne hotové zadání

---

## 1 · Co dnes v aplikaci je

Tři srovnávače, **tři různé zdroje dat**, o kterých uživatel neví.

| Kde | Zdroj uživatelských dat | Hloubka | Referenční data |
|---|---|---|---|
| **Komunitní přehled** → Průměrné výdaje ČSÚ | **položky účtenek** (`S.receipts`) přes `productGroupLookup` | oddíl → podskupina → třída | ČSÚ **jen oddíl** |
| **Komunitní přehled** → druhé srovnání | transakce | oddíl | ČSÚ oddíl |
| **Analýza účtenek** → 🇨🇿 Srovnání ČR | **transakce** (`S.transactions`) přes `mapToCOICOP` | oddíl | ČSÚ oddíl |

**Dvě různá mapování na totéž:**

```
položka účtenky → productGroupLookup()  → kód 01.113 (5 míst, přesné)
transakce       → mapToCOICOP()         → coicopId 1–13 (oddíl, hrubé)
```

`mapToCOICOP` má čtyřstupňovou kaskádu: admin override (95 %) → klíčové slovo
v názvu (70 %) → název kategorie (50 %) → podkategorie (30 %). Nespadne-li nic,
skončí v oddílu 12 „Ostatní".

---

## 2 · Tři skutečné mezery

### 2.1 · Chybí referenční data pod úrovní oddílu ⛔

`COICOP_GROUPS_DEF` má `avg_osoba` **jen pro 13 oddílů**. Pro podskupiny (01.1)
a třídy (01.1.1) žádná čísla ČSÚ nemáme.

Proto jsou v tabulce sloupce *Osoba/měs* a *Domácnost ČR* u vnořených řádků
natvrdo `—`. **Není to chyba, je to chybějící data.** Dokud je nezískáme,
hlubší srovnání nemůže existovat — jen zobrazení vlastní útraty bez porovnání.

### 2.2 · Zelený sloupec má dva různé významy 🔴

```js
// řádek oddílu:      ČSÚ průměr × koeficient domácnosti
domMine = Math.round(os * oecd2)
// řádek podskupiny:  TVOJE skutečná útrata z účtenek
_subT.sub[code]
```

Stejný sloupec, stejná hlavička „Tvoje dom.", **dvě neporovnatelná čísla**.
Na tvém screenshotu je `6 600` u Potravin odhad ČSÚ, ne tvoje útrata — a řádky
pod ním, kdyby se naplnily, by měřily něco jiného.

**Tohle je jediná věc, která přímo klame.** Zbytek jsou jen chybějící data.

### 2.3 · Chybí celkový součet a pokrytí

Tabulka nikde neříká, **kolik z tvé útraty se vůbec podařilo zařadit**.
`_coicopRollupItems` počítá `matched` i `unmatched`, ale tabulka je nezobrazuje.
Bez toho uživatel nepozná, jestli prázdné řádky znamenají „neutrácíš"
nebo „nenaskenoval jsi účtenku".

**Pokrytí klíčovými slovy podle oddílu** (215 podtříd, 175 pokrytých):

```
01 Potraviny      58/58  ✅      07 Doprava      15/23
02 Alkohol, tabák  5/5   ✅      08 Komunikace    8/12
05 Bydlení        22/26          10 Vzdělávání    2/6
09 Rekreace       21/26          12 Pojištění     0/4   ⛔
```

Databáze je stavěná na **potraviny**, protože ty chodí z účtenek.
Nájem, pojištění a školné se z účtenky nikdy nepřečtou.

**28 z 84 zobrazovaných tříd nemá jediné klíčové slovo** — nikdy se nenaplní:
`07.1.1` Nákup automobilů · `08.2.1` Telefony · celý oddíl 12 Pojištění.

---

## 3 · Krátkodobě — udělat tabulku pravdivou

Nevyžaduje žádná nová data. Odhad: **jedna kratší session.**

### 3.1 · Rozdělit zelený sloupec na dva

| Oddíl | Osoba/měs | Domácnost ČR | **Odhad pro tvou dom.** | **Tvoje útrata** | % |
|---|---|---|---|---|---|
| 01 Potraviny | 3 300 | 7 920 | 6 600 | **4 180** | 63 % |
| ↳ 01.1 Potraviny | — | — | — | **3 910** | — |
| ↳↳ 01.1.1 Pekárenské | — | — | — | **620** | — |

- **Odhad pro tvou dom.** = `avg_osoba × OECD` — jen u oddílů, jinde `—`
- **Tvoje útrata** = skutečnost z účtenek na všech úrovních
- **%** = poměr skutečnosti k odhadu, jen tam, kde existují obě čísla

Tím zmizí dvojznačnost i bez nových dat.

### 3.2 · Doplnit součet a pokrytí

Pod tabulku jeden řádek:

> Zařazeno **4 180 Kč** z **5 340 Kč** naskenovaných položek (78 %).
> Zbylých 1 160 Kč databáze nerozpoznala.
> Řádky bez čísla znamenají, že jsi v nich tento měsíc nic nenaskenoval.

### 3.3 · Skrýt třídy, které nelze naplnit

28 tříd bez klíčového slova buď skrýt, nebo označit šedě s poznámkou
„z účtenek se nedá zjistit". Dnes vypadají jako chyba.

### 3.4 · Sjednotit tři srovnávače

Za mě **zredukovat na dva** s jasně odlišeným účelem:

- **Komunitní přehled** — *„jak si stojím proti ČR"*: jen oddíly, zdroj transakce,
  protože pokrývají celý rozpočet včetně nájmu
- **Analýza účtenek → COICOP** — *„co konkrétně kupuju"*: hloubka až na třídy,
  zdroj položky, bez srovnání s ČSÚ

Druhé srovnání v Komunitním přehledu zrušit — dělá totéž jako první.

---

## 4 · Dlouhodobě — mapovat i transakce

Cíl: **jeden mapovací řetěz**, který pokryje celý rozpočet, ne jen účtenky.

### Fáze A · `cat.coicop` do hloubky ⭐ nejlevnější krok

Kategorie **už pole `coicop` mají** — 36 ze 49. Ale drží jen **číslo oddílu**
(`Doprava → 7`). Kdyby držely plný kód (`07.2.2`), transakce by se rovnou
zařadila do třídy.

```
Nájem            → 04.1.1
Energie          → 04.5.1
Benzín           → 07.2.2
Pojištění vozidla→ 12.5.4
```

**Podkategorie jsou přesně ta úroveň, kde COICOP třídy začínají dávat smysl.**
Kategorie „Doprava" má podkategorie MHD, Benzín, Servis, STK — a ty mapují
na `07.3.1`, `07.2.2`, `07.2.3`. Ručně je to ~100 řádků číselníku, jednorázově.

Zisk: oddíly 04, 07, 08, 10, 12 se konečně naplní. Bez nových dat od ČSÚ.

### Fáze B · Sloučit oba zdroje s prioritou

```
Pro každý výdaj:
  má transakce položky z účtenky?  → použij položkové mapování (přesnější)
  jinak                            → použij cat.coicop + subcat
```

⚠️ **Kritické: nesmí se sčítat obojí.** Transakce z Lidlu za 800 Kč, která má
naskenované položky, se musí započítat **jednou** — buď rozpadem na položky,
nebo jako celek. Jinak dvojí počítání, přesně jako FIX-254.

### Fáze C · Referenční data ČSÚ pod oddíl

**Tohle je ta největší mezera** a bez ní hlubší srovnání zůstane jednostranné.

ČSÚ zveřejňuje *Vydání a spotřeba domácností* v podrobnějším členění než 13 oddílů —
otázka je, jak hluboko a v jakém formátu. Potřeba **ověřit dostupnost**, než
se cokoli slíbí uživateli.

Pokud data existují: doplnit `avg_osoba` k podskupinám v `COICOP_GROUPS_DEF`
a sloupce se naplní samy — zbytek už funguje.

Pokud neexistují: hlubší srovnání s ČR **zrušit** a nechat jen vlastní útratu.
Lepší než sloupec, který nikdy nic neukáže.

### Fáze D · Vážená inflace přes COICOP

`product-groups.json` má u každé skupiny **váhu ze spotřebního koše** (`w`).
S plným mapováním by šlo spočítat osobní inflaci váženou stejně jako ČSÚ —
tedy **přímo porovnatelnou s oficiálním číslem**.

To by byl skutečně unikátní výstup: *„ČSÚ hlásí 2,8 %, tvoje osobní inflace
je 4,1 % — protože nakupuješ víc masa a míň energií, než počítá koš."*

Tohle je až po fázích A–C.

---

## 5 · Doporučené pořadí

| | Co | Přínos | Náklad |
|---|---|---|---|
| **1** | Rozdělit zelený sloupec (3.1) | odstraní klamání | malý |
| **2** | Součet a pokrytí (3.2, 3.3) | uživatel pozná, proč je prázdno | malý |
| **3** | `cat.coicop` na plné kódy (fáze A) | naplní oddíly mimo potraviny | střední |
| **4** | Ověřit data ČSÚ (fáze C) | **rozhodne, jestli má smysl 5 a 6** | průzkum |
| **5** | Sloučit zdroje (fáze B) | jeden konzistentní řetěz | střední |
| **6** | Sjednotit srovnávače (3.4) | tři na dva | střední |
| **7** | Vážená inflace (fáze D) | unikátní výstup | velký |

**Bod 4 udělej dřív než 5 a 6.** Kdyby se ukázalo, že ČSÚ podrobnější data
nezveřejňuje, mění se celý smysl hlubší tabulky a bylo by zbytečné do ní
investovat práci.

---

## 6 · Otázka, kterou bych si položil první

Tabulka se 84 třídami je hodně podrobná. **Kdo ji čte a proč?**

Srovnání *„utrácím za pekárenské výrobky 620 Kč, průměr ČR je 540"* je zajímavé
jednou. Užitečné je až tehdy, když z něj plyne akce — a ta v tabulce není.

Možná je hodnota jinde: ne v úplném stromu, ale v **pěti největších odchylkách**
od průměru ČR. Jedna karta místo tabulky:

> Nejvíc nad průměrem: **Alkohol +180 %**, Restaurace +95 %, Sladkosti +60 %
> Nejvíc pod průměrem: Zdraví −70 %, Vzdělávání −100 %

To se dá přečíst za pět vteřin a něco to říká. Stojí za zvážení dřív,
než se do stromu investuje víc práce.
