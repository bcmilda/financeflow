# TWA + Google Play — co potřebuju od tebe

`google-play-listing.md` (Session 13) už texty má: název, krátký i plný popis,
ASO, kategorizaci, Data Safety. **Nepřepisuju je**, projdu je až podle toho,
co v aplikaci mezitím přibylo.

Chybí tři věci a dvě z nich musíš dodat ty.

---

## 1 · Screenshoty — 🔴 potřebuju je od tebe

Napsal jsem `ramecek.py`, který screenshot vloží do vizuálu telefonu
(1080×1920, přesně jak Play chce). Ukázku máš v `ukazka.png`.

**Ale zkušební běh odhalil dvě věci:**

**Tvoje screenshoty jsou z desktopu.** Do poměru telefonu se nevejdou — musí se
oříznout a půlka obsahu zmizí. V ukázce je useknutá pravá polovina karty.
→ **Vyfoť to na mobilu** (nebo v prohlížeči přes Ctrl+Shift+M, šířka ~390 px).

**Mají v sobě tvoje červené poznámky.** Ty se do obchodu poslat nedají.
→ Pošli čisté snímky.

### Co potřebuju
6–8 snímků, ideálně tyhle obrazovky:

| # | Obrazovka | Titulek do rámečku |
|---|---|---|
| 1 | Dashboard | „Přehled na první pohled" |
| 2 | Přidat transakci | „Zapsání za pět vteřin" |
| 3 | Účtenka po naskenování | „Účtenku přečte AI" |
| 4 | Příští měsíc | „Vyjdeš do výplaty?" |
| 5 | Detektor úspor | „Najde, kde peníze tečou" |
| 6 | Finanční obraz | „Kam směřuješ" |
| 7 | Import z banky | „Výpis naimportuje sám" |
| 8 | Projekt / Dovolená | „Rozpočet na dovolenou" |

Titulky si uprav, tohle je návrh. Rámečky pak vygeneruju.

**⚠️ Na screenshotech nesmí být tvoje reálná data** — jména, částky, e-maily.
Google to neřeší, ale je to tvůj výpis z účtu na veřejném internetu.
Buď použij testovací účet, nebo mi řekni a čísla v rámečku přebarvím.

---

## 2 · SHA-256 fingerprint — 🔴 potřebuju od tebe

Bez něj TWA nefunguje: Android ověřuje, že doména patří k aplikaci.

1. **PWABuilder** → zadej `https://financeflow.cz` → *Package for stores* → Android
2. Ve staženém balíčku je `assetlinks.json` a v něm otisk podpisového klíče
3. **Pošli mi ten soubor** (nebo jen fingerprint)

Pak ho umístíme na `https://financeflow.cz/.well-known/assetlinks.json`
a doplníme do `firebase.json` mezi `hosting.headers`, aby se servíroval
jako `application/json`. **To udělám já**, jakmile budu mít otisk.

⚠️ Klíč z PWABuilderu si **zálohuj**. Když ho ztratíš, aktualizaci aplikace
už nikdy nepodepíšeš stejným klíčem a musel bys na Play zakládat novou.

---

## 3 · Věci, které musíš vyplnit v konzoli Play — 🟡 tvoje rozhodnutí

| Položka | Poznámka |
|---|---|
| Jméno vývojáře / IČO | v `legal.html` je stále **[DOPLŇ]** |
| Kontaktní e-mail | musí být veřejný |
| URL zásad ochrany údajů | `legal.html` — ověř, že je dostupná bez přihlášení |
| Cena a předplatné | Play bere **15–30 %** z plateb v aplikaci. U Stripe platby přes web to neplatí, ale pravidla Play na tohle jsou přísná — **projdi si to dřív, než odešleš k revizi** |
| Věkové hodnocení | dotazník, u finanční aplikace bez obsahu je to rychlé |

**Ta cena je jediné skutečné riziko celého vydání.** Aplikace, které nabízejí
placený obsah a obcházejí platební systém Play, se vracejí z revize.
Řešení bývá nechat platby jen na webu a v aplikaci se o Premium vůbec nezmiňovat —
ale to je rozhodnutí, které ovlivní produkt, ne technikálie. Zaslouží si vlastní zamyšlení.

---

## Jak `ramecek.py` funguje

```bash
python3 ramecek.py vstup.png vystup.png "Titulek" "Podtitulek"
python3 ramecek.py dashboard.png play-1.png "Přehled" "Vše na jednom místě" --akcent "#4ade80"
```

Spouštím ho já, ty ho jen máš v repu. Výstup je 1080×1920 PNG připravený k nahrání.

---

## Pořadí

1. Pošli **čisté mobilní screenshoty** → vygeneruju rámečky
2. Pošli **assetlinks.json z PWABuilderu** → zapojím ho a upravím `firebase.json`
3. Projdu texty v `google-play-listing.md` proti dnešnímu stavu aplikace
   (přibyly funkce, které tam nejsou — Příští měsíc, kurzové ztráty, zálohy)
4. Rozhodneme, co s předplatným vůči pravidlům Play
