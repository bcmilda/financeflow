# ROZPRACOVANÉ BODY — souhrn k znovupřečtení

**Stav k 2026-08-03 (Session 18)** · Nasazeno až po **v9.49**

> Účel: rychle se zorientovat, o co u každého bodu šlo, bez čtení celé konverzace.
> Řazeno podle toho, jak snadné je se do toho vrátit — nahoře věci s hotovým zadáním.

---

## 1 · TODO-193 — Report (`report.js`): dva prázdné taby

**Co to je:** Karta `report.js` je **tvůj Excel převedený do appky** — matice kategorie × období.
Vznikla proto, že „Měsíční report" je jednoměsíční snímek, kdežto tvůj Excel je velký přehled
napříč roky. Záměrně to jsou dvě různé karty, ne jedna přetížená.

**Čtyři taby, dva hotové:**

| Tab | Stav | Co v něm má být |
|---|---|---|
| Přehled (matice) | ✅ hotový | kategorie × Měsíční / Roční / jednotlivé roky |
| Roky | ✅ hotový | ⚠️ ale je to **ta tabulka, kterou jsme právě smazali z Grafů** — viz bod 2 |
| **Tento měsíc** | ❌ placeholder | aktuální měsíc detailně; může převzít obsah dnešního Měsíčního reportu |
| **Kumulace roku** | ❌ placeholder | YTD křivka + tabulka měsíc po měsíci |

Pak **PDF export** („pošli poradci") — až budou taby hotové.

### 1a · Tvoje nová připomínka: rozdělit matici do sekcí

Dnes je matice jedna dlouhá tabulka. V Excelu (screen 1–2) máš **bloky**:
Dům · Splátky · Jídlo a nákupy · Auto a doprava · Sára · Členství · Telefon · Investice…
Každý blok má vlastní mezisoučet a barevné kódování.

**Ano, jde to udělat.** Potřebuje to jednu věc navíc: **mapování kategorie → blok**.
Buď odvodit z COICOP sektorů (už je máš), nebo dát uživateli vlastní seskupení.
Doporučuju COICOP jako výchozí + možnost přejmenovat, ať to nemusíš klikat od nuly.

### 1b · Tvoje připomínka: sloupec „Roční" se má chovat jinak podle zvoleného měsíce

Dnes „Roční" = celý rok 2026. Ty chceš, aby při přepnutí na minulý měsíc
sčítal **jen měsíce do zvoleného měsíce včetně** (YTD k danému měsíci).

**Jde to a dává to smysl** — jinak nelze poctivě srovnat „letos k květnu" vs. „loni k květnu".
Návrh: sloupec pojmenovat **„Roční (YTD k <měsíc>)"**, ať je jasné, co se počítá.
⚠️ Pozor na jednu past: pro srovnání s minulými roky musí být **stejné okno i tam** —
jinak porovnáváš 5 měsíců letos s 12 měsíci loni.

---

## 2 · Report → tab „Roky" obsahuje zavrženou tabulku

V Grafech jsme tabulku ROK × měsíce **odstranili** (v9.48), protože míchala kategorie
dohromady a nešlo z ní nic vyčíst. Stejná tabulka je ale pořád v Reportu.

**Doporučení:** nahradit ji tím, co jsme postavili místo ní —
matice **jedné kategorie** (měsíce × roky) s výběrem nad tabulkou, řádky Ø a Celk.

---

## 3 · Finanční obraz — zbylé metriky (zadání hotové, neimplementováno)

Postaveno v **v9.44**: přepínač okna 6M/12M/Celkově, čtyři podmetriky
(Income Momentum, Expense Control, Income Capture/Resilience, Debt Momentum),
Expense Ratio, „Růst životního stylu".

**Zbývá — vše je namodelované v `model-financni-obraz-v2.html`:**

### 3a · Cesta finančního zdraví s vodopádem 🔴 nejvyšší hodnota
„Před 6 měsíci 64/100 → dnes 82/100 → **+18 bodů**" a pod tím **vodopád**,
který ukáže, čím to bylo: Cash flow +7, Rezerva +5, Zadluženost +4, Spoření +3, Rozpočet −1.
Plus dvě podmetriky: **Monthly Score** (tento měsíc vs. baseline) a **6M Momentum Score**
(směr a stálost, ne úroveň).

### 3b · Net Worth Momentum
Čisté jmění dnes nikde jako **stav** není — Wealth Momentum měří jen **tok** (Ø saldo).
Klíčové: rozdělit růst na část, **kterou jsi vytvořil sám** (spoření, splátky), a část
z **růstu tržní hodnoty** (nemovitost, investice). To první je zásluha, to druhé trh.

### 3c · FFR a Liquidity Momentum
Porovnávají se **proti baseline, bez půlení okna** — jsou to pomalu se měnící zásoby,
ne měsíční toky. FFR = jaká část výdajů je krytá pasivním příjmem.

### 3d · Sbalitelné řádky
Devět metrik v jedné hromadě se nedá číst. Rozdělit na
`🏠 Lifestyle` · `🏖️ Nezávislost a stabilita` · `💎 Majetek`, rozbalený jen aktivní.

### ⚠️ Stále nerozhodnuto
**Vzorec skóre 0–100** — jak nové podmetriky vstoupí do stávajícího skóre Finančního obrazu.
Záměrně odloženo: prahy nelze poctivě určit, dokud není vidět rozptyl na reálných datech.
(Je Income Capture 40 % dobrý výsledek? Dnes to neví nikdo.)

---

## 4 · Deník — proužek „kde jsi na cestě"

Životní mapa je hotová (**v9.45**). Zbývá do Deníku přidat **kompaktní proužek**:
dnešní skóre proti stavu před půl rokem, s odkazem do Finančního obrazu.

⚠️ **Podmínka:** musí číst z `computeObrazSubmetrics()` (existuje od v9.44),
ne počítat podruhé. Jinak si zopakujeme Inflaci vs. Zdražování.

*(Poznámka: dřív jsem tvrdil, že metriky se v Deníku „nemění". Bylo to nepřesné —
mění se každý měsíc a uvnitř měsíce se posouvá průměr aktuálního měsíce.)*

---

## 5 · Životní mapa — rozšíření

Základ hotový (v9.45): milníky s datem, ikonou a poznámkou, bez vlivu na bodování.

### 5a · Milníky pro minulá data ⭐ nejsilnější nápad
Milník **„Začal jsem sledovat výdaje"** vytvářený **automaticky** při prvním importu.
Umožní srovnání **nesledované vs. sledované období** — jediný způsob, jak aplikace
doloží vlastní hodnotu tvými čísly, ne marketingovým tvrzením.
Pro data z PDF/Excelu není potřeba nic navíc — transakce už datum mají.

### 5b · Životní etapy
Student → svobodný → rodina → dítě. **Podmínka: musí to být období, ne body.**
Milník je datum, etapa má začátek a konec → druhý typ záznamu `type:'era'` s `dateTo`.
Pak jde počítat „Ø výdaje v etapě Rodina bez dětí vs. s dítětem".

---

## 6 · Měsíční report v2 — návrhy odsouhlasené, neimplementované

Náhledy: `navrh-mesicni-report.html` (1M) a `nahled-report-3M.html` (3M).

**Po odečtení toho, co už v appce je**, zbývá jako skutečně nové:

1. **Blok „Na co si dát pozor"** — pravidla se liší podle délky okna:
   - **N = 1:** vzrostlo o víc než **25 % a zároveň 500 Kč**, nebo překročen limit
   - **N > 1:** frekvenčně a trendově — „limit překročen ve 3 ze 3 měsíců",
     „rostla 3 měsíce v řadě", „měsíc nad 2× vlastní medián"
   - ⚠️ Nárůst vysvětlený milníkem ze Životní mapy je **modrý kontext, ne červený problém**
2. **Výsledky „Stálo to za to?"** — tlačítko v reportu máš, ale hodnocení
   (`t.priority`, `t.priorityNote` na transakci) **nikde jiné modul nečte**. Mrtvá data.
3. **Stav bohatství** — čisté jmění, dluhy, kolik vydrží rezerva
4. **Blok z účtenek** — osobní inflace za období, nejvíc zdražilo, nejlevnější obchod
5. **Milníky období** ze Životní mapy
6. **Výhled na příští období** — report se dnes dívá jen dozadu

**Hranice vůči Finančnímu obrazu:** Report = „co se stalo" (kumuluje a trackuje **uvnitř** okna).
Obraz = „kam to míří" (porovnává **půlky** okna). Proto report nepotřebuje dvojnásobek historie.

---

## 7 · Diff-read fáze 2b (TODO-177 pokračování) 🔴

Hotovo (**v9.46**): čtení rozdělené — transakce po záznamech, meta po klíčích.
Při každé změně se už nestahuje celá databáze.

**Zbývá:** omezit **úvodní načtení** na posledních 12 měsíců.
⚠️ Nelze nasadit samostatně — potřebuje **agregáty `stats/{YYYY}`** a dotahování starších let,
jinak zmizí historie z grafů „Všechny roky" a z matice v reportu.

---

## 8 · Landing page — hotová, ale nenasaditelná

6 podstránek vytvořeno (`funkce`, `jak-to-funguje`, `proc-my`, `cenik`, `zabezpeceni`, `o-zakladateli`)
+ `css/landing.css` + upravený `firebase.json`.

**Blokuje:**
1. **Duplicity** — ceník, funkce a text o zakladateli jsou teď na dvou místech.
   Co zkrátit, je rozepsané v `POZNAMKY-s18.md`, bod 1.
2. **Screenshoty aplikace** — pořád chybí
3. ⚠️ `index.html` má CSS **inline**, podstránky používají `/css/landing.css` → při úpravě stylů měnit **obě místa**

**Hotové navíc:** letáky `letak-financeflow-A4.html` a `letak-financeflow-A5.html` (oboustranný).

---

## 9 · TODO-201 — Portfolio ceny (ADR-098)

Plán hotový (`PLAN-portfolio-ceny.md`). **Fáze 1** = automatické ceny nad ručně zadanou pozicí
(ticker + počet kusů), bez jakéhokoli přístupu k účtu. Endpoint `/quotes` ve `worker.js`
podle vzoru `/cnb`, zdroje Stooq / CoinGecko.

**Čeká na tvoje rozhodnutí:** Pro tarif (299 Kč), nebo Premium? A ticker vs. ISIN?

---

## 10 · Audit — sekce B (13 kandidátů na zrušení)

Sekce A uzavřena (59 úkolů, u každého důkaz v kódu).
**Sekce B nezavřena na tvoje přání** — chtěl jsi ověřit jednotlivě.
Jde o věci jako Playwright (nahrazen `smoke.js`), Bundling (odporuje „žádné frameworky"),
„Upravit split" tlačítko (odporuje tvé preferenci swipe), Fio API a Open Banking
(zamítnuto v ADR-098). Detail: `AUDIT_todo_bugs_s18.md`.

---

## Nasazený stav

| Verze | Obsah |
|---|---|
| v9.43 | obloukový ukazatel finančního skóre |
| v9.44 | přepínač okna + podmetriky Finančního obrazu |
| v9.45 | Životní mapa v Deníku |
| v9.46 | diff-read fáze 2 (čtení po částech) |
| v9.47 | heatmapa Kategorie × měsíce, matice jedné kategorie, grafy s průměrem a kumulací |
| v9.48 | FIX-224 filtr „Příjmy", odstranění duplicitních tabulek, Ø a Ø>0 |
| v9.49 | tooltipy nových grafů |

**Ostatní podklady:** `POZNAMKY-s18.md` (detailní zadání) · `AUDIT_todo_bugs_s18.md` ·
`RESERSE-konkurence-MFFT.md` · `ADR-098-portfolio-ceny.md` · `PLAN-portfolio-ceny.md`
