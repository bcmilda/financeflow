# Summary Session 20

**2026-08-28** · v10.04 → **v10.27** · 24 verzí

---

## Co se dnes stalo

Session začala jako „dodělat zbytek z S19" a přerostla v **kompletní rešerši
všech 33 funkčních celků** appky (8 dokumentů) plus 20 opravených chyb, z toho
tři vážné.

Nejdůležitější zjištění: **appka tiše mazala data**. Kdokoli si otevřel
„Sdílení & Partneři" a odškrtl přepínač, přišel o obsah té sekce v cloudu —
bez varování, bez partnera, bez souvislosti se sdílením. Milan to potvrdil
z vlastní zkušenosti.

---

## ⚠️ NEZAPOMENOUT — čeká na Milana

### 1. Nasazení tří vrstev ve správném pořadí
1. `database_rules.json` → **Firebase Console**
2. `worker.js` → **Cloudflare Dashboard**
3. zbytek → GitHub

Bez prvních dvou zůstane **Komunitní přehled prázdný** (klient už syrová data
číst nesmí) a partneři neuvidí sdílená data.

### 2. Ověřit, že worker běží
Po nasazení otevřít **Admin → 🩺 Zdraví** a podívat se na dlaždici
„Komunitní agregát". Když ukáže „chybí", worker se nespustil nebo mu chybí
`FIRE­BASE_DB_SECRET`. Naživo jsem to otestovat nemohl.

### 3. Onboarding je netestovaný
`previewOnboarding()` v konzoli (F12) ho otevře i na starém účtu. Modal jsem
stavěl jen z CSS, ne z živého náhledu — čekám drobné doladění rozestupů.

### 4. Zálohy
Milan přišel o data (falešná, takže nevadí), ale mechanismus zálohy zůstal
neověřený: **Nastavení → ☁️ Automatické zálohy**, drží 5 dní, uzel `backups`
je mimo `data`, takže ho mazání nepostihlo.

---

## ⏰ ČEKÁ NA CLAUDA — příští session

### Fáze 2 opravy sdílení (nejdřív ~týden po nasazení v10.11)
1. `database_rules.json`: odebrat z uzlu `data` část
   `|| root.child('users').child($uid).child('partners').child(auth.uid).exists()`
2. `app.js` (`loadPartners`) a `stats.js` (`addPartner`): odstranit fallback
   `shared → data` (bloky označené „FÁZE 1")
3. **Ověřit před tím** v Console, že aktivní účty mají uzel `shared`

### Úklid po ověření agregace
V `admin.js` zůstal starý čtecí blok za přepínačem `COMMUNITY_LEGACY_READ = false`.
Až agregace poběží spolehlivě, smazat i s přepínačem.

---

## Otevřené úkoly z části C (S19)

| ID | Stav |
|---|---|
| **TODO-228** váha S2 ve skóre | 🔴 **nezačato** — uživatel bez dluhů má 56 % škály zadarmo, Milan: „až moc". Potřebuje rozhodnutí, jak váhu snížit. |
| **TODO-230** rodinné souhrny | 🟡 **částečně** — hotový žebříček, graf, N členů, filtry. Zbývá `t.scope` (společný vs. osobní výdaj) — návrh v `PLAN-rodina-datovy-model.md`, čeká Krok 0. |
| **TODO-231** našeptávač | ✅ v10.05 |
| **TODO-232** administrace tagů | ⏸️ **odloženo Milanem** — panel „Item Tagy" už to z větší části řeší; navíc `window._communityTagSuggestions` je mrtvý kód (nikde se nenastavuje), takže riziko z popisu úkolu nemá kudy se projevit |
| **TODO-233** uživatelské menu | 🔴 **nezačato** — Tutoriál · Moje účtenky · Uložené transakce · Nastavení · Předplatné · Odhlásit |
| **TODO-234** onboarding krok 1 | ✅ v10.06 |

---

## Nálezy z rešerší, které ČEKAJÍ na rozhodnutí

| Kde | Co | Proč jsem to neopravil |
|---|---|---|
| `worker.js` | `bumpFounderCount()` není odolná proti opakovanému doručení webhooku | Stripe umí poslat týž event vícekrát → počítadlo zakládajících míst by se zvýšilo dvakrát za jednu platbu |
| Stripe | Nic nebrání kliknout na Payment Link podruhé, i když už Premium existuje | Vznikly by dvě subscriptions, appka by o druhé nevěděla |
| `community` | Záznamy klíčované `uid` nejsou anonymní vůči ostatním | Řešením je pseudonym místo uid — mění strukturu i pravidla |
| `projects.js` | Simulace: scénář A po inflaci vs. B před inflací → investice vypadá 6× lepší místo 2× | `realReturn` se počítá a nikde nepoužívá |
| `projects.js` | Scénář B investuje i při záporném přebytku | Rada investovat peníze, které uživatel nemá |
| `assets.js` | `assetCatLiq` testuje „spoření" před „penzijní" | Týká se jen kategorií s nevyplněnou Likviditou; přehodilo by zařazení |
| `admin.js` | Admin má právo číst kompletní data všech uživatelů | Panel to nevyužívá; zúžit až přibudou lidé |

---

## Co bych dělal příště, kdybych volil já

1. **Ověřit nasazení** (worker + pravidla + onboarding) — nic dalšího nemá smysl
   stavět, dokud nevíme, že tohle běží
2. **TODO-228** (váha S2) — malý zásah, ale potřebuje Milanovo rozhodnutí, takže
   se hodí na začátek session
3. **Simulace života** — dvě chyby v jedné funkci, obě mění doporučení, které
   appka dává. Z otevřených nálezů má největší dopad na uživatele.
4. **TODO-233** (uživatelské menu) — čistě UI, žádná datová rizika

---

## Poučení ze session

**Ověřuj na celé funkci, ne na výseči souboru.** Dva z mých nálezů byly falešné
poplachy — `grep` na části funkce minul řádek, který nález vyvracel.

**Když opravuješ „kdo kontroluje souhlas", hledej „kdo do toho uzlu zapisuje".**
FIX-278 byl neúplný právě proto, že jsem hledal kontrolu místo zapisovatelů.

**Test závislý na reálném čase je odpočet, ne test.** `smoke_dluh_widget.js`
začal selhávat sám od sebe, když kontejner přeskočil na další měsíc.

**Oprava volajícího neopraví helper.** FIX-273 jsem opravil v
`renderFamilySummary`, ale `computeBank` si tutéž chybu nesl uvnitř (FIX-280).
