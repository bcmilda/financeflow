# Patch Session 20 — v10.04 → v10.27

**2026-08-28** · 24 verzí · 20 opravených chyb · rešerše všech 33 funkčních celků

---

## ⚠️ NASAZENÍ — pořadí je důležité

Session obsahuje **dva soubory mimo hash chain**, které se nasazují ručně
a **musí jít před appkou**:

| # | Soubor | Kam | Proč první |
|---|---|---|---|
| 1 | `database_rules.json` (v10.24) | Firebase Console | Bez nových pravidel appka neuvidí `shared` ani `aggregate` |
| 2 | `worker.js` (v10.24) | Cloudflare Dashboard | Bez něj nevznikne komunitní agregát |
| 3 | zbytek | GitHub → Firebase Hosting | |

**Soubory do repozitáře:** `app.html`, `admin.js`, `app.js`, `assets.js`,
`budouci.js`, `charts.js`, `debts.js`, `helpers.js`, `import.js`, `nakup.js`,
`onboarding.js` *(nový)*, `premium.js`, `settings.js`, `sms-import.js`,
`stats.js`, `sw.js`, `ui.js` + `tools/smoke_*.js`.

---

## 🔴 Kritické opravy

### FIX-274 · Vypnutí sdílení mazalo data z cloudu
`users/{uid}/data` byl současně úložiště i výdejní okénko pro partnery, a
`shareSettings` se vynucoval **při zápisu**. Odškrtnutí přepínače tedy nezastavilo
sdílení, ale zapsalo `transactions/{id} = null`. **Týkalo se každého uživatele**,
i toho bez partnera — přepínače se vykreslují nezávisle na seznamu partnerů.
Milan to potvrdil vlastní zkušeností (přišel o půjčky a peněženky).

**Oprava:** `users/{uid}/data` = úložiště (nikdy nefiltrované), `users/{uid}/shared`
= výřez. Nasazení dvoufázové — fáze 1 (v10.11) povoluje partnerům obojí,
fáze 2 odebere přístup k `data`.

### FIX-278 + FIX-279 · Sdílení do komunity nešlo vypnout
`publishCommunityStats()` kontroloval element `settingCommunity`, který
**v celém projektu nikdy neexistoval** → podmínka vždy nepravdivá → data se
odesílala vždy, všem, bez souhlasu.

Oprava měla dvě kola: FIX-278 opravil hlavní funkci, ale při práci na
`computeBank` se ukázalo, že `uploadCoicopToFirebase()` zapisuje do **téhož uzlu**
a souhlas nekontrolovala vůbec. Bez FIX-279 by vypnutý přepínač nic neřešil.

### TODO-235 · Serverová agregace komunitních dat
`community/{měsíc}/users` byl klíčovaný `uid` a čitelný pro každého přihlášeného.
uid přitom appka sama vybízí sdílet (`?partnerOf={uid}`), takže kdokoli, komu
uživatel poslal pozvánku, si mohl najít jeho příjem. Nově počítá statistiky
worker přes Database Secret; klient čte jen agregát bez uid.

---

## 🟡 Opravy chyb ve výpočtech

| ID | Co bylo špatně |
|---|---|
| **FIX-273** | Rodinný souhrn počítal partnerovu cizí měnu podle **mých** peněženek |
| **FIX-275** | Detekce duplicit při importu porovnávala částky bez `txCZK` → transakce v cizí měně se importovala **podruhé** |
| **FIX-276** | Cíl s prošlým termínem hlásil „Deadline za −88 dní!"; v detailu dokonce „(dnes!)" |
| **FIX-277** | Import **nikdy nenavrhl podkategorii** — hledal v `subcats`, pole se jmenuje `subs` |
| **FIX-280** | `computeBank`/`bankSeries` bez `D`; příčina byla v `txCZK`, kde fallback sahal do `S.wallets` i při prohlížení partnera |
| **FIX-281** | „✓ Zaplaceno" u nesouvisejících plateb („Voda" ↔ „Vodafone"), částka se neporovnávala vůbec |
| **FIX-282** | Částka z notifikace mohla vyjít **1000× menší** (`1.234,50` → `1.234`) |
| **FIX-283** | Splátkový kalendář přeskakoval měsíce u splatnosti 29.–31. |
| **FIX-289** | Virtuální peněženka mizela z majetku po označení cíle za splněný |
| **FIX-291** | **V den narozenin se připomínka neukázala** (hlásila „za 364 dní") |
| **FIX-292** | Přehled rozdělení % přeskakoval přesunové kategorie |

---

## ✨ Nové funkce

- **TODO-231** Našeptávač u polí Název a Poznámka (vlastní historie podle četnosti)
- **TODO-234** Onboarding krok 1 — nový modul `onboarding.js` (39. modul)
- **TODO-230** (částečně) Rodinné souhrny: žebříček „Kdo na co utratil", graf trendu
  6/12 měsíců, **všichni členové domácnosti** místo prvního partnera, filtr podle člena
- **FIX-287** Dashboard i Aktiva počítají čisté jmění stejně (dřív se lišily)
- **FIX-285** „Vklad do cíle" už není investice — vlastní sekce Virtuální přesuny
- **FIX-288/289** Koláč Rozložení majetku: členění dle likvidity, peněženky
  i při záporném zůstatku, minimální viditelná výseč 8°, interaktivní střed
- **FIX-284** Widget „Jak pracuješ pro banky": dny pro banku červené nezávisle
  na hodnocení zatížení, čitelná legenda, bar ve dnech místo tří jednotek
- **Admin → Zdraví**: rozcestník + kontrola integrity dat + stav agregace

---

## 🧪 Testy

**37 smoke testů** (z 22 na začátku session). Nové: `naseptavac`, `onboarding`,
`family`, `sdileni`, `import_dup`, `cil_subkat`, `komunita`, `zustatek`,
`budouci`, `castka_splatky`, `dluh_widget`, `virtualni`, `alokace`,
`narozeniny`, `katpct`, `zdravi`.

Opraveny dva zastaralé testy (`smoke_detektor.js`, `smoke_review.js` — FIX-272)
a `check_tdz.js` dostal chybějící allowlist.

**Poučení:** `smoke_dluh_widget.js` začal během session selhávat sám od sebe,
protože si bral **reálné datum** a kontejner přeskočil na 1. září. Testy závislé
na čase mají zmrazený „dnešek".

---

## Odvolané nálezy

Dva nálezy z rešerší **neplatily** a jsou v dokumentech označené:

1. **„Penzijní spoření spadne do Finanční rezervy"** — přehlédl jsem, že
   `assetCatLiq()` čte nejdřív ruční nastavení `cc.liq`. Milan má vyplněno
   *Dlouhodobé/fyzické*, takže se ho to netýká.
2. **„`editCat` nepřepočítá přehled %"** — obě funkce přepočet volají na
   posledním řádku; můj grep procházel jen výseč funkce.

Obojí vzniklo ověřováním na části souboru místo na celé funkci.
