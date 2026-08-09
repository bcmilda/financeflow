# POZNÁMKY · Session 18 — k dořešení

> Zapsáno 2026-08-03. **Nic z toho není implementováno**, Milan si to chce promyslet.

---

## 1 · Restrukturalizace landing page (nutné PŘED nasazením podstránek)

Přidáním `/funkce`, `/cenik`, `/jak-to-funguje`, `/proc-my`, `/zabezpeceni`, `/o-zakladateli` vznikly **duplicity** — landing má stejný obsah podruhé.

### Co na `index.html` zkrátit nebo odebrat

| Sekce na landingu | Kolize s | Návrh |
|---|---|---|
| Cenové karty (`#pricing`) | `/cenik` | **Nechat na landingu** (hlavní konverzní bod), ale odebrat FAQ pod nimi — to patří na `/cenik` |
| FAQ (6 otázek + FAQPage JSON-LD) | `/cenik`, `/jak-to-funguje` | Zkrátit na 3 nejdůležitější, zbytek odkázat. ⚠️ **JSON-LD musí odpovídat viditelnému textu**, jinak to Google penalizuje |
| Autorský text „Proč FinanceFlow vznikl" | `/o-zakladateli` | Zkrátit na 3–4 věty + odkaz „Přečíst celý příběh →" |
| Výčet funkcí / „Co získáš" | `/funkce` | Zredukovat na 5–6 nejsilnějších s odkazem na plný seznam |
| Cesta uživatele (5 kroků, Den 1–30) | `/jak-to-funguje` | **Ponechat** — je to vizuálně silné a je to jádro landingu. Na podstránce je jiný úhel (5 kroků nastavení, ne 30 dní) |
| Sekce „Je FinanceFlow pro tebe?" | `/proc-my` | Ponechat, ale odkázat na plné srovnání |
| Zmínky o bezpečnosti v FAQ | `/zabezpeceni` | Nahradit jedním odkazem |

### Čím nahradit uvolněné místo
- **Srovnávací tabulka** (banka vs. Excel vs. FinanceFlow) — zkrácená na 5 řádků, silný vizuální prvek
- **Screenshoty** aplikace — pořád čekají na dodání
- Blok „Co umíme jinak" s trojicí: účtenky po položkách · vlastní inflace · hodnocení útrat

### Technické
- ⚠️ `index.html` má CSS **inline**, podstránky používají `/css/landing.css`. Při úpravě stylů se musí měnit **obě místa**, jinak se rozejdou. Zvážit převod `index.html` na sdílený soubor.
- Bílé pozadí v náhledu = nenačtené `/css/landing.css` (absolutní cesta neexistuje mimo produkci). Na ostrém webu je to v pořádku, ověřeno: `body{background:var(--bg)}` je v obou.
- Do patičky doplnit IČO (Milan: později)
- `/cenik` dnes odkazuje na cenové karty zpět na `/#pricing` — po restrukturalizaci sjednotit

---

## 2 · Rozšíření Inflace životního stylu (Finanční obraz)

### ⚠️ Klíčové zjištění: z velké části už to existuje

`computeLifestyleInflation()` v `projects.js` (v8.66), **už zobrazeno ve Finančním obrazu** — tedy přesně tam, kam to Milan chce.

Dnes umí:
- průměr 1. vs 2. poloviny okna (v8.65 opraveno z „první vs poslední měsíc" kvůli šumu)
- tři stavy: `inflation` (výdaje rostou rychleji) · `squeeze` (příjmy padají, výdaje ne) · `ok`
- výstup: `incG`, `expG` v procentech

**Nejde tedy o novou funkci, ale o dopočet nad existující.** Před psaním nového kódu rozšířit `computeLifestyleInflation()`, ne psát vedle (SKILL 17).

### Co doplnit

**A) Income Growth Capture Rate** — `(ΔÚspory) / (ΔPříjem)`
- „Z nárůstu příjmu o 7 000 Kč se do úspor promítlo 0 Kč (0 %)."

**B) Změna míry úspor** — nezávislá informace, má vlastní hodnotu
- „Míra úspor klesla ze 16,7 % na 13,5 %, přestože ti měsíčně zbývá stejně."

**C) Reálný růst příjmu očištěný o osobní inflaci** ⭐ *unikát*
- Spojit s `inflace.js` (osobní inflace z účtenek)
- „Příjem +23 %, tvoje osobní inflace 9 % → reálně +14 %."
- **Tohle nemá žádný konkurent v ČR** — vyžaduje položkové účtenky

**D) Kam růst přistál: trvalé závazky vs. jednorázovky** ⭐ *nejcennější*
- Zdroj: opakované platby / šablony (`budouci.js`)
- „Ze 7 000 Kč nárůstu skončilo 4 500 Kč v pravidelných měsíčních závazcích."
- Lepkavé náklady při poklesu příjmu nezmizí — proto je to akčnější než MPC

**E) Dopad na runway rezervy**
- „Rezerva 100 000 Kč pokrývala 4,0 měsíce, nyní 3,1 měsíce."
- Nejhmatatelnější odpověď na „něco se změnilo", bez obviňování

**F) Asymetrie výdajů** (pokročilé, později)
- Reagovaly výdaje, když v minulosti klesl příjem? Měří odolnost, ne minulost.

### ❌ Co NEDĚLAT

- **Nezobrazovat MPC i Capture Rate zároveň.** Platí `ΔI = ΔE + ΔS`, tedy `Capture = 1 − MPC` — je to jedno číslo řečené dvakrát. Vybrat **Capture Rate** (dopředný, ne obviňující).
- **Nepoužívat MPC bez prahu.** Při ΔPříjem = 200 Kč a ΔVýdaje = 600 Kč vyjde 300 %. Minimální práh ~5 % nebo 2 000 Kč, jinak se metrika neukáže.
- Nespouštět pod 6 měsíců dat — pod tím je to šum.

### Povinné ošetření
- `txCZK(t,D)`, vyloučit `splitParent`, `isBalancing`, `isTransferTx` (SKILL 25)
- Ořez jednorázovek (bonus, dovolená, velký nákup) — medián nebo IQR filtr, jinak metriku rozbijí
- **Směr ≠ hodnocení.** Růst výdajů není automaticky špatně (dítě, stěhování, investice do sebe). Formulace neutrální, aplikace nikdy neoznačí útratu za zbytečnou (SKILL 22).
- Prázdný stav vysvětlí, co se prověřilo: „Zatím máš 4 měsíce dat, tuhle analýzu spustíme od 6."

### Umístění
**Finanční obraz** (Milanovo rozhodnutí, potvrzené kódem — lifestyle inflation už tam je).
ChatGPT navrhoval Finanční radar; Finanční obraz je správně, protože jde o dlouhodobý vývoj, ne o aktuální stav.

---

## 3 · Otevřené z S18

- **Screenshoty** aplikace pro landing — čeká na dodání
- **v9.43** nasadit (5 souborů: `premium.js`, `styles.css`, `app.html`, `admin.js`, `sw.js`)
- **Podstránky** nasadit až po restrukturalizaci landingu (bod 1) + `firebase.json`
- **Sekce B auditu** (13 kandidátů na zrušení) — Milan chce ověřit jednotlivě, zatím nezavřeno
- **TODO-201** portfolio ceny — čeká na rozhodnutí o tarifu (Pro vs. Premium)
