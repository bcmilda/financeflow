# Summary — Session 17

**v9.00 → v9.42** · 2026-07-19 → 2026-08-01 · 42 verzí · 3 nové moduly

---

## Co se v této session dělo

Dvě těžiště: **produktové funkce** (Report, Inflace, Review) a **spuštění plateb** — včetně několika bezpečnostních děr, které by monetizaci podřízly hned v první den.

---

## Nové moduly

- **`report.js`** — karta Report, matice roků po sektorech dle Milanova Excelu (COICOP oddíly ČSÚ + Splátky), barevné hlavičky sektorů, zelené mezisoučty
- **`inflace.js`** — vlastní inflace z účtenek: YoY index, první→poslední cena, sloupec Za kg/l, detekce shrinkflace, srovnání položky napříč obchody (běžná vs. akční cena)
- **`review.js`** — měsíční hodnocení útrat „Stálo to za to?" (1–5 smajlíky) ve třech pohledech: sumarizace / top 10 / vše (admin)

---

## Nové funkce

**Analýzy a predikce**
- Sezónnost po kategoriích (% nad nejlevnějším měsícem, heatmap)
- Přesnost predikce — tracking měsíc po měsíci, MAPE, automatické snímky
- Ušlý zisk — kolik ročně utíká na neúročených penězích
- Kumulace v grafu nákupů (měsíčně / kumulativně)

**Finanční obraz**
- Aktuální měsíc v grafu, popisky hodnot, čára Rezerva, cashflow v rámečku
- Slovní vyhodnocení výhledu na 6 měsíců
- Graf cyklů přepracován na profil utrácení (týdenní mediány + zelená křivka „zbývá z výplaty")
- Stres index — kompaktní gauge + faktory jako karty

**Pracovní kalendář**
- Hodinová mzda (efektivní i základní sazba, příplatky, CZ svátky vč. Velikonoc)
- Přesčas jako samostatný typ dne s výběrem směny

**Detektor úspor**
- Alkohol & tabák, Častý nákup (top 5 opakovaných položek z účtenek)
- Práh refinancování 10 % → 7 %
- Informativní prázdný stav (co se prověřilo a proč to prošlo)

**Ostatní**
- Menu reorganizováno do 11 sekcí
- Povinná peněženka a typ platby u transakcí
- Budoucí platby: stav zaplaceno/nezaplaceno odvozený z transakcí
- Šablony: typ Dluh/Splátka, tlačítko v panelu Transakce
- Připomenutí konce trialu na Dashboardu

---

## Platby (Stripe)

- **Webhook** ve workeru: ověření podpisu, tři události, zápis Premia do Firebase
- **Zakládající cena** 99 Kč/měs a 990 Kč/rok pro prvních 100 — samostatné ceny, ne kupón (kupón by vypršel)
- **Audit plateb** v admin panelu: ✅ Zaplaceno / 🔵 Ručně / 🔴 Podezřelé + kontrolní součet proti Stripe
- **Neměnný log plateb** — nezávislý zdroj pravdy, zapisuje jen webhook
- Payment Links vloženy, Customer Portal, informační lišta u checkoutu
- **Banování účtu** a odebrání Premia adminem

---

## Nejdůležitější opravy

**Bezpečnost**
- **Self-upgrade na Premium** — uživatel si mohl sám zapsat `type: "premium"`. Právo zápisu ve Firebase kaskáduje dolů, `.write` na `users/$uid` tedy odemklo i `premium`. Stejnou cestou šlo obejít AI kvóty.
- **Admin nemohl odebrat Premium** ani banovat — chyběla admin výjimka; ban navíc musel jít mimo uživatelův podstrom

**Blokovalo monetizaci**
- **Trial nešel nikomu spustit** (chybějící pravidla pro dedup uzel)
- **Firefox blokoval platební bránu** (`window.open` po `await` není reakce na klik)
- **Paywall vždy spouštěl trial** — kdo chtěl zaplatit, neměl jak
- **isLiveEnv neznal financeflow.cz** → na produkci by se nabízely testovací odkazy

**Datové chyby**
- Srovnání ČR i Komunitní přehled počítaly bez `txCZK` a bez vyloučení přesunů (třetí výskyt téže třídy)
- Komunita publikovala názvy kategorií místo COICOP ID
- Inflace přepočítávala kusové zboží na Kč/kg („rohlík 81 Kč")
- Auto-šablony vznikaly jen při otevření appky přesně v den splatnosti

**Pád aplikace**
- `ReferenceError: rows is not defined` — zbytek po refaktoru, `node --check` neodhalil

---

## Čísla

| | |
|---|---|
| Verzí | 42 (v9.00–v9.42) |
| Nové moduly | 3 |
| Opravené chyby | 17 označených FIX + 4 neoznačené kritické |
| Nová TODO | 18 (TODO-182 až TODO-199) |
| Změněné soubory | 20 + 4 nové |

---

## Co zbývá

1. Nasadit `database_rules.json` (v9.36) a `worker.js` (v9.33) — bez nich nefunguje trial ani platby
2. Doplnit Cloudflare Secrets pro zakládající ceny
3. Otestovat platbu 99 Kč end-to-end a refundovat
4. TODO-198 fáze 2–4 (souhrn v Deníku, vzorce, varování při zadávání)
5. TODO-193 Report — zbývající taby + PDF export
