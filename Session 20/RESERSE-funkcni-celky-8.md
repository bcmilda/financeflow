# Rešerše funkčních celků FinanceFlow — část 8 (závěrečná)

**Stav k v10.26 (2026-08-28)** · Session 20

Poslední nepokrytý celek. Na rozdíl od karet 1–32 se neptám „rozumí tomu
uživatel", ale **„dá se tím appka bezpečně spravovat"**.

---

## 33 · Admin panel 🔐

**Otázka:** *Co se v appce děje a co s tím můžu udělat?*

Třináct záložek: Uživatelé · Růst · Keyword engine · User corrections ·
Low confidence · Statistiky · Adopce kategorií · Item Tagy · Doporučení ·
Leady · Oznámení · Verze · Audit plateb · Údržba · Recenze.

Přístup hlídá `isAdmin()` proti `ADMIN_UIDS` a Firebase pravidla mají shodnou
výjimku na `users/$uid`. Kontrola tedy neběží jen v UI — kdyby si někdo panel
otevřel podvrženým klientem, pravidla ho stejně nepustí.

### Co je udělané dobře

**Čtení seznamu uživatelů je `shallow`.** Počet transakcí se zjišťuje přes
`?shallow=true`, takže se stáhnou jen klíče, ne obsah:

```js
fetch(`${base}/${path}.json?shallow=true&auth=${idToken}`)
```

Kdyby to bylo bez toho, otevření záložky Uživatelé by stáhlo transakce všech
uživatelů — pomalé a zbytečně invazivní. Tohle je přesně ten druh detailu,
který se snadno přehlédne.

**Audit plateb** (S17.28) porovnává `users/{uid}/premium` proti `premiumLog`
a hlásí nesoulad. `premiumLog` zapisuje výhradně webhook přes Database Secret,
takže je to nezávislý zdroj — klient do něj nedosáhne.

**Referral se čte ze správného zdroje.** `users/{uid}/referral/conversions` je
jen zrcadlo, které se naplní až při přihlášení vlastníka; skutečná pravda je
`referrals/{kod}/conversions/{uid}`. Admin čte to druhé.

**Destruktivní akce mají potvrzení** — v souboru je 11 volání `confirm()`.

**Smazání účtu panel vůbec nenabízí.** Text v UI odkazuje na Firebase Console
(Authentication + ruční odstranění uzlu). Je to nepohodlné schválně: nevratná
operace nad cizím účtem nemá být jedno kliknutí v prohlížeči.

### 🟢 Pozorování: admin vidí všechno, i když to nepotřebuje

Pravidlo `users/$uid` má `.read` výjimku pro admin UID, takže admin může číst
kompletní data kteréhokoli uživatele — všechny transakce, účtenky, deník.
Panel sám to nepoužívá (bere jen profil, premium, referral, počet transakcí),
ale právo tam je.

Pro jednoho vývojáře, který je zároveň jediný uživatel, je to praktické.
Až přibudou lidé, stojí za zvážení zúžit výjimku na konkrétní podstromy
(`profile`, `premium`, `activity`) místo celého `users/$uid`. Vzhledem
k tomu, že appka drží finanční data, je to rozdíl mezi „mohu, kdybych
potřeboval" a „nemohu, ani kdybych chtěl" — a to druhé se lépe vysvětluje.

### 🟢 Pozorování: mazání leadu obchází běžnou cestu

`deleteLead()` volá Firebase REST přímo přes `fetch` s `?auth=idToken`, místo
aby použil `_remove()` z SDK jako zbytek appky. Funguje to, ale je to jediné
místo s tímhle vzorcem — a REST cesta obchází offline frontu i posluchače,
takže se seznam po smazání překresluje ručně (`_cachedLeads.filter`).

---

## Co by se dalo přidat

Seřazeno podle poměru užitek/práce, ne podle atraktivity.

### 1. Přehled zdraví aplikace na první obrazovce *(malé)*

Panel má třináct záložek, ale žádný rozcestník — abys věděl, jestli je něco
špatně, musíš je proklikat. Karta nahoře s několika čísly by to vyřešila:
nesoulady z Auditu plateb, počet Low confidence položek k rozhodnutí,
neschválené Item Tagy, nové leady od poslední návštěvy.

Vše se už načítá, jen roztroušeně po záložkách.

### 2. Sledování chyb ze Sentry *(malé)*

Sentry je v appce zapojený, ale panel o něm neví. I jen počet chyb za posledních
24 h s odkazem do Sentry by ušetřil přepínání nástrojů.

### 3. Kontrola integrity dat *(střední)*

Tlačítko, které projde vlastní data a vypíše nesrovnalosti, jaké jsme dnes
hledali ručně: transakce odkazující na neexistující kategorii nebo peněženku,
aktiva bez odpovídajících přesunů, splátkové kalendáře s daty mimo měsíc,
cíle se zápornou částkou.

Většina dnešních nálezů (FIX-273, 275, 280, 283) by se takhle dala odhalit
dřív, než si jich někdo všimne v UI.

### 4. Stav komunitní agregace *(malé, navazuje na TODO-235)*

Po dnešním workeru je `community/{měsíc}/aggregate` černá skříňka. Řádek
s časem posledního přepočtu, počtem přispěvatelů (`k`) a tlačítkem
„přepočítat teď" by ušetřil chození do Firebase Console — zvlášť teď,
kdy se agregace teprve ověřuje v provozu.

### 5. Odemčení zamčených funkcí pro testovací účet *(malé)*

Zkoušet Premium funkce dnes znamená měnit si vlastní `premium` uzel.
Přepínač „zobraz mi appku jako Free / Trial / Premium" bez zásahu do dat
by testování zjednodušil a nehrozilo by, že si omylem přepíšeš vlastní stav.

---

## Co by se dalo upravit

**Záložek je třináct a nejsou seskupené.** Přirozeně tvoří čtyři skupiny:
provoz (Uživatelé, Růst, Statistiky, Audit plateb), učení AI (Keyword engine,
User corrections, Low confidence, Adopce, Item Tagy), obsah (Oznámení,
Doporučení, Recenze, Leady) a systém (Verze, Údržba). Vizuální oddělení
by orientaci zrychlilo víc než jakákoli nová funkce.

**Verze** je dnes výpis `VERZE_LOG`. Vyhledávání v něm by pomohlo — po dnešní
session je tam přes dvacet záznamů jen za jeden den a hledat „kde jsem to
opravoval" znamená scrollovat.

---

## Shrnutí

| | Co | Poznámka |
|---|---|---|
| 🟢 | Admin má právo číst kompletní data všech uživatelů | Dnes praktické, později zúžit na podstromy |
| 🟢 | `deleteLead` obchází SDK a jde přes REST | Funguje, ale je to jediné takové místo |

**Žádný červený ani žlutý nález.** Panel je na interní nástroj postavený
opatrněji, než bývá zvykem — `shallow` čtení, nezávislý audit plateb,
a hlavně to, že mazání účtu se schválně nedá udělat z prohlížeče.

---

## Rešerše dokončena

**33 celků v osmi dílech.** Souhrn nálezů napříč všemi částmi je v jednotlivých
dokumentech; opraveno v S20: FIX-273 až FIX-292.
