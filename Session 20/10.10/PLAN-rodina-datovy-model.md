# Rodina & sdílené výdaje — návrh datového modelu

**Session 20 · podklad k rozhodnutí, nic z toho zatím není implementované**

Navazuje na TODO-230. Zadání předpokládalo, že `cat.shared` je o rodinném
sdílení — ověřeno, že není (je to COICOP propojení pro ČSÚ, viz `bugs.md`).
Koncept „společný vs. osobní výdaj" v appce **dnes vůbec neexistuje**, takže
se musí navrhnout od začátku.

---

## ⚠️ Nejdřív: nález, který mění zadání

**Vypnutí přepínače v „Sdílení & Partneři" dnes SMAŽE data z cloudu.**

`users/{uid}/data` je současně (a) primární úložiště uživatele a (b) jediné
místo, odkud partneři čtou. `shareSettings` se vynucuje **při zápisu** —
`_dwMetaVals()` vrátí pro vypnutou sekci `[]`, `_dwTxObj()` vrátí `{}`,
a diff-write pak zapíše `transactions/{id} = null` pro každou transakci.

Ověřeno simulací diff-write logiky (app.js ř. 1244–1246):

```
Před vypnutím – sledované transakce: [ 'a', 'b' ]
Zápis do Firebase po vypnutí: {"transactions/a":null,"transactions/b":null}
```

Uživatel, který si v Sdílení odškrtne „Transakce", tedy nepřestane sdílet —
**přijde o transakce v cloudu**. Diff-read je pak (přes `_splitSeen`) vyhodnotí
jako skutečné smazání a vyprázdní i lokální stav.

> ⚠️ **NEZKOUŠET na produkčním účtu.** Pokud to chceš ověřit, jedině na testovacím
> účtu s daty, o která nevadí přijít.

Proč to sem patří: jakýkoliv návrh „co je sdílené a co ne" nemůže stavět na
současném `shareSettings`. Nejdřív musí být oddělené **„moje data"** od
**„výřez pro ostatní"**. Doporučené řešení je v Kroku 0 níže.

---

## Jak sdílení funguje dnes

| Věc | Stav |
|---|---|
| Počet členů | `partnerData` je objekt `uid → {profile, data}` — **N členů datově zvládá už teď**. Omezení je jen v `renderFamilySummary()`, kde je natvrdo `partners.map(...)[0]` = první partner. |
| Vztah | **Párový a oboustranný.** `users/{uid}/partners/{jinyUid}` = „tenhle člověk smí číst moje data". Aby se dva viděli navzájem, musí se přidat oba. |
| Granularita | Jedna kopie dat pro **všechny** partnery. Nelze „babičce ukázat tohle, mámě tamto". |
| Přístup | Firebase rule: `root.child('users').child($uid).child('partners').child(auth.uid).exists()` |

**Pro 4člennou rodinu (babička, děda, máma, táta) to znamená 12 vzájemných
přidání** (N×(N−1)). Když jeden zapomene, vidí každý jinou „rodinu" — souhrny
si nesedí a nikdo nepozná proč.

---

## Krok 0 — oddělit vlastní data od sdíleného výřezu (nutná podmínka)

Bez tohohle nemá smysl stavět nic dalšího.

**Varianta A — sdílený výřez do vlastního uzlu** *(doporučeno)*
```
users/{uid}/data          ← vždy KOMPLETNÍ, nikdy nefiltrované, čte jen vlastník
users/{uid}/shared        ← výřez podle shareSettings, tohle čtou partneři
```
- Firebase rule pro partnery se přesune z `data` na `shared`
- `shareSettings` konečně dělá, co slibuje, a nemůže mazat
- Cena: data sdílených sekcí se drží 2×, zápis je o jeden `update` navíc

**Varianta B — filtrovat při čtení, ne při zápisu**
- `data` zůstane úplné, partner čte přes rule, které respektují `shareSettings`
- Levnější na zápis, ale Firebase rules neumí filtrovat pole podle jiného uzlu
  dost dobře — v praxi by šlo skrýt jen celé sekce, ne jednotlivé transakce
- Nedoporučuji: složitá pravidla = přesně ta třída chyb, co nás už dvakrát stála nejvíc

---

## Krok 1 — příznak „společný vs. osobní" na transakci

```js
t.scope = 'household' | 'personal' | undefined
```

**Proč na transakci a ne na kategorii:** stejná kategorie je jednou rodinná
a jednou osobní. Nákup v Albertu = týdenní nákup pro celou domácnost, ale taky
moje pivo. Kategorie to nikdy nerozliší, a hádat to za uživatele by porušilo
princip, že appka nehodnotí sama.

**`undefined` znamená „nezodpovězeno", ne „osobní"** (SKILL 31 — absence dat
není informace). V souhrnu se takové transakce ukážou zvlášť jako „nezařazené",
ne tiše přiřazené na jednu stranu. Až uživatel odpoví, přesunou se.

**Migrace:** žádná. Staré transakce prostě `scope` nemají a spadnou do
„nezařazené". Nic se nepřepočítává, nic se neztratí.

---

## Krok 2 — výchozí hodnota podle kategorie (ať se neklika u všeho)

```js
cat.defaultScope = 'household' | 'personal' | undefined
```

Nová transakce podědí `defaultScope` své kategorie. Uživatel může u konkrétní
transakce přepsat — **explicitní `t.scope` vždy vyhrává nad kategorií.**

Rozumné výchozí: Bydlení/Energie/Potraviny → `household`; Koníčky/Oblečení →
`personal`. Ale **nenastavovat to natvrdo v `DEFAULT_CATEGORIES`** — u někoho
je jídlo společné, u jiného každý svoje. Nabídnout to jako návrh v onboardingu
nebo ve Správě kategorií, ne rozhodnout za uživatele.

---

## Krok 3 — rodina jako entita (až bude potřeba)

Párové vztahy stačí pro dva lidi. Pro 4člennou domácnost dávají 12 přidání
a žádný společný pohled. Návrh:

```
households/{hid}/
  name: "Novákovi"
  createdBy: uid
  members/{uid}: { joinedAt, displayName }

users/{uid}/householdId: hid          ← odkaz zpět
```

- **Připojení odkazem už existuje** — `getPartnerUrl()` / `pairPartners()`
  (`share.js`) přidá **oba směry najednou** přes `?partnerOf={uid}`.
  *(Korekce S20: původně jsem tu psal, že pozvánka chybí a že 4členná domácnost
  znamená 12 ručních přidání. Ve skutečnosti je to 6 kliknutí na odkaz.
  Zjištěno až při rešerši `share.js`.)*
- Firebase rule: čtu `shared` toho, kdo má stejné `householdId`
- Jeden zdroj pravdy → všichni vidí stejnou rodinu, i ten, kdo se přidal poslední

**Zbývající přínos households** po téhle korekci: ne pohodlí připojení, ale
**konzistence** — dnes si každý drží vlastní seznam partnerů, takže když jeden
člen odkaz nepoužije, vidí jinou rodinu než ostatní a nikdo nepozná proč.

**Role se neřeší** (rozhodnuto S20). Členem domácnosti je prostě kdokoli —
táta, dítě, strejda, babička. Žádné oprávnění se od toho neodvíjí, všichni
členové vidí totéž. Odpadá tím celá vrstva složitosti ve Firebase rules;
displayName z profilu stačí na to, aby bylo poznat, čí co je.


---

## Co bych dělal v jakém pořadí

| # | Co | Náklad | Poznámka |
|---|---|---|---|
| 1 | ~~`renderFamilySummary()` na N členů~~ | — | ✅ **Hotovo v10.10** |
| 2 | Krok 0 (oddělit `data` od `shared`) | střední | **Nutná podmínka**, zároveň opravuje mazání dat |
| 3 | Krok 1 + 2 (`t.scope`, `cat.defaultScope`) | střední | Vlastní přínos pro uživatele |
| 4 | Krok 3 (households) | velký | Až se ukáže, že párové sdílení nestačí |

---

## Rozhodnuto (S20, Milan)

| Otázka | Rozhodnutí |
|---|---|
| **Role** (máma/dítě/babička) | ❌ **Neřeší se.** Všichni jsou prostě členové domácnosti, žádná role neomezuje přístup. |
| **Podíly** (60/40 na výdaji) | ❌ **Binárně** — jen společný/osobní. Vyplňovat procenta u každého nákupu nikdo nebude a appka má odlehčovat, ne zatěžovat. Kdyby se ukázalo, že to někdo chce, `t.scope` se dá rozšířit o volitelný `t.scopeRatio` bez migrace. |
| **„Táta zaplatil, ale je to mámin výdaj"** | ❌ **Neřeší se.** Bylo by to vyrovnávání mezi členy = samostatná velká funkce. |
| **Počet členů** | ✅ Domácnost může mít libovolný počet členů (babička, děda, máma, táta…). Hotovo v v10.10. |

## Zbývá rozhodnout

1. **Krok 0** — potvrzuješ nález o mazání dat při vypnutí sdílení? Jdeme
   do varianty A (oddělit `data` od `shared`)?
2. **Kdy Krok 1+2** (`t.scope`, `cat.defaultScope`) — až po Kroku 0, nebo
   dřív s vědomím, že sdílení má tuhle mezeru?

