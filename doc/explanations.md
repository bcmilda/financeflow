# FinanceFlow – Technická vysvětlení a omezení

> **Doplnění Session 25** (2026-10-09): na konci souboru nová sekce „Session 25 (2026-10-05 až 2026-10-09) · v11.30 → v11.57“ včetně dodatku v11.28–v11.30. Přehled v `doc/Summary_s25.md`.

## 📖 Proč tento dokument existuje

V průběhu vývoje FinanceFlow se ukázalo, že některé otázky a technická rozhodnutí se
napříč sessions **opakovaně vracejí**. Typicky jde o situace, kdy:

- Autor (nebo nový Claude) v další session navrhne něco, co už bylo jednou zvážené
  a **záměrně zamítnuté** z technického důvodu (např. „pojďme udělat systémový PIN pad")
- Bug vypadá jako chyba implementace, ale **je to technické omezení** platformy (prohlížeč,
  Firebase, Cloudflare Worker, API limity)
- Rozhodnutí odporuje tomu, co radí obecné zdroje (ChatGPT, Stack Overflow) – a důvod,
  proč v **našem** kontextu platí opak, se špatně dohledává

Tento soubor existuje proto, aby Claude i autor **nemuseli znovu řešit stejné otázky**.
Jde o sbírku „**proč je to tak a ne jinak**" – vysvětlení s kontextem, technickou příčinou
a odkazy do ostatních dokumentů.

### Kdy zde hledat
- „Proč nejde X?" – přečti si vysvětlení místo hádání nebo zbytečných pokusů
- „Mohli bychom udělat Y?" – pokud je Y v seznamu jako technicky nemožné, ušetři si čas
- Než napíšeš kód řešící problém, který tady je popsaný – možná už je vyřešený jinak

### Formát každého vysvětlení
1. **Otázka** – jak se problém opakovaně ptá
2. **Krátká odpověď** – TL;DR pro rychlou orientaci
3. **Technická příčina** – detail pro pochopení
4. **Kontext v projektu** – cross-reference na `bugs.md`, `features.md`, atd.

---

## 1. PIN obrazovka — proč není jako systémový PIN telefonu (Wallet app)

### Otázka
„V appce Wallet vidím hezký full-screen PIN pad s číselníkem, který vypadá jako systémový.
Proč naše aplikace takový nemá? Mohli bychom to udělat?"

### Krátká odpověď
**Nemůžeme.** PIN pad z fotky Wallet appky je **systémový PIN telefonu**, který zobrazuje
operační systém (iOS / Android). Webová aplikace k tomu nemá přístup – je to záměrné
omezení prohlížeče kvůli bezpečnosti.

### Technická příčina
- **Systémový PIN** = ochrana na úrovni OS (FaceID, TouchID, systémový PIN kód telefonu).
  Přístup k tomuto API mají **jen nativní aplikace** nainstalované přes App Store / Google Play.
- **Webová aplikace** (PWA, běžná webovka) běží v sandboxu prohlížeče. Má přístup jen k:
  - `prompt()` / input dialogům (ošklivé)
  - Vlastnímu aplikačnímu overlay (to, co teď děláme)
  - `WebAuthn` / `Credential Management API` (biometrika přes prohlížeč, ale to je jiná věc)
- Vypadat jako systémový PIN pad **smí** – ale nefunguje se stejnou bezpečnostní úrovní
  a nenabízí se uživateli na úrovni OS

### Co je aktuálně implementované
- Aplikační PIN overlay v `settings.js` + `index.html`
- Spouští se ~800 ms po `loadSettings()` (delay kvůli async načtení Firebase dat)
- Hash PIN uložen v `localStorage` (viz `decisions.md` – „PIN v localStorage, ne Firebase")

### Pokud PIN nefunguje
Zkontroluj, zda byl nahrán aktuální `app.js` – bez něj delay nezadlí a PIN se nespustí
ve správný moment.

### Možné budoucí vylepšení (ale ne „systémový PIN")
- **WebAuthn** – biometrika přes prohlížeč (FaceID/TouchID z webové appky)
  - Vyžaduje registraci credentials, složitější setup
  - Není ekvivalent systémového PIN padu, je to úplně jiný koncept (biometrika)
- **TWA wrapper pro Google Play** (viz `todo.md` TODO-027) – aplikace zabalená do
  nativního kontejneru by teoreticky mohla volat systémové API, ale reálně TWA je jen
  „plný prohlížeč v nativním obalu" a stejná omezení platí

### Kontext v projektu
- `features.md` – sekce „PIN ochrana při přihlášení" (hotová funkce)
- `decisions.md` – rozhodnutí „PIN v localStorage (ne Firebase)" a „Firebase Auth pro autentizaci"
- `bugs.md` – OPEN-021 byl uzavřen (uživatel potvrdil funkčnost)

---

## 2. Email notifikace — proč Resend selhává

### Otázka
„Proč kontaktní formulář neposílá emaily? Odesílání se tváří úspěšně, ale email nepřijde.
Je to bug v kódu?"

### Krátká odpověď
**Není to bug kódu.** Resend free tier má **striktní omezení**: z adresy `onboarding@resend.dev`
lze posílat **pouze na email registrovaný na Resend účtu**. Všechny ostatní adresáty Resend
tiše zahodí bez chybové hlášky.

### Technická příčina
Resend je email provider, který pro free tier zavedl ochranu proti spamu:

```
Free tier pravidla:
  1. Z adresy onboarding@resend.dev → lze posílat pouze na email účtu
  2. Z vlastní domény (např. noreply@tvojedomena.cz) → lze posílat kamkoli
     ALE vyžaduje DNS verifikaci domény (SPF, DKIM záznamy)

Naše aktuální konfigurace:
  from: "onboarding@resend.dev"   ← Resend výchozí
  to:   "bc.milda@gmail.com"      ← příjemce z contact formu

Otázka, která rozhoduje: Je "bc.milda@gmail.com" zaregistrovaný na resend.com?
  ANO → emaily chodí
  NE  → emaily jsou tiše zahazovány
```

**Proč Resend nepíše chybovou hlášku?** Aby zabránili farmingu informací o tom, jaké
emaily existují. Request vrátí HTTP 200, ale email nikdy nedorazí.

### Možná řešení (podle preference)

#### Řešení A – Nejjednodušší: Ověřit Resend účet
1. Přihlásit se na `resend.com`
2. Podívat se, jaký email je registrovaný na účtu
3. Pokud je to `bc.milda@gmail.com` → **mělo by fungovat** (zkontroluj spam)
4. Pokud je to jiný email → buď změnit, nebo zvolit B/C

**Výhoda:** Žádná další práce, kromě přihlášení se a kontroly
**Nevýhoda:** Funguje jen pro jeden konkrétní email (nemůžeš posílat cizím uživatelům)

#### Řešení B – EmailJS (pro univerzální odesílání)
- **Web:** emailjs.com
- **Free tier:** 200 emailů / měsíc
- **Setup:** ~10 minut
- **Nevyžaduje doménu**
- **Funguje na jakýkoli email** (není omezení na registrovaného)

**Kroky:**
1. Registrace na emailjs.com
2. Vytvořit Gmail Service
3. Vytvořit Email Template (proměnné: `from_name`, `from_email`, `msg_type`, `message`)
4. Z dashboardu zkopírovat: Service ID + Template ID + Public Key
5. Předat Claudovi → přidá do `premium.js` místo aktuálního Worker fallbacku

**Výhoda:** Univerzální, žádná doména
**Nevýhoda:** Další služba k managementu, limit 200/měsíc

#### Řešení C – Ověřit vlastní doménu na Resend
- Vyžaduje vlastní doménu (viz `todo.md` TODO-040)
- Setup DNS záznamů (SPF, DKIM) → 24–48h propagace
- Pak lze posílat z `noreply@tvojedomena.cz` kamkoli

**Výhoda:** Profesionální email z vlastní domény
**Nevýhoda:** Nejvíce práce, vyžaduje koupenou doménu

### Doporučení
Pro **contact form od uživatelů** (kde přijímáš zprávy **ty**) → **Řešení A** je nejrychlejší.
Pro **notifikace uživatelům** (kde posíláš zprávy **jim**) → **Řešení B nebo C** jsou nutné.

### ⚠️ Security prerequisite
Před jakýmkoli řešením A/B/C je potřeba dořešit rotaci API klíče. Viz:
- `bugs.md` FIX-041 – Resend klíč hardcoded v kódu (deaktivován po GitGuardian incidentu)
- `architecture.md` sekce 7 – správné zacházení s API klíči (přesun do `env.RESEND_API_KEY`)

### Kontext v projektu
- `bugs.md` – OPEN-001 (aktivní bug, tam je shrnutí všech 3 řešení)
- `todo.md` – TODO-003 (akční úkol)
- `architecture.md` – sekce 7 (Resend konfigurace)
- `features.md` – „Kontaktní formulář" (70 % hotové, blokováno Resendem)

---

## 📋 Plánovaná vysvětlení (přidat při příležitosti)

Tyto otázky se opakovaly, ale zatím nejsou rozepsané. Doplnit při další session:

- **3. Worker — proč musí existovat** (a ne přímé volání Claude API z prohlížeče)
  → API klíč, CORS, rate limiting, centrální bod kontroly
- **4. `amount` vs `amt` — proč obojí** a ne refaktor na jedno
  → zpětná kompatibilita se starými daty, viz `decisions.md` ADR
- **5. `firebase.js` jako poslední skript** — proč ChatGPT radí špatně
  → async `type="module"`, stub funkce čekající na Firebase
- **6. CSS `display:none → block` u grafů** — proč potřebuje `rAF` delay
  → browser nedokončí layout synchronně, `clientWidth = 0` bez delay
- **7. OECD spotřební jednotky** — proč ne prostý počet osob
  → mezinárodní standard, zohledňuje spotřebu dětí vs. dospělých
- **8. COICOP 13 skupin** — proč ne vlastní klasifikace
  → srovnání s ČSÚ daty vyžaduje standard, CZ-COICOP 2024

---

## Vysvětlení doplněná v Session 10

### Proč komunitní srovnání používá „na osobu" + OECD přepočet
ČSÚ data evidujeme jako průměr **na osobu** (`avg_osoba`). Pro režim „domácnost" přepočítáváme přes OECD ekvivalent (`calcOECD`). Nejsou to protichůdné údaje – odpovídají na dvě různé otázky: „kolik utrácí typický člověk" vs „kolik utrácí moje domácnost dané velikosti/složení". Dřív se používalo `avg_domacnost` natvrdo, což ignorovalo složení domácnosti (FIX-102). Viz ADR-049.

### Proč 13 oddílů CZ-COICOP 2024
Klasifikace musí odpovídat aktuální metodice ČSÚ, aby srovnání dávalo smysl. CZ-COICOP 2024 má 13 oddílů (ne 12). Definice je dvakrát: `COICOP_GROUPS_DEF` v helpers.js (s guardem) a hardcoded kopie v receipts.js – **obě se musí aktualizovat společně**. Viz ADR-050.

### Proč predikce není „AI/ML"
Predikce = klouzavý průměr historických výdajů × pevný sezónní koeficient (`SEASON` v app.js). Není to strojové učení – je to průhledná statistika, kterou uživatel pochopí. Plán dalšího zpřesnění: lineární trendová extrapolace + IQR detekce odlehlých hodnot (ADR-052), stále bez ML.

### Proč je sdílení read-only
Partneři se vidí navzájem, ale každý zapisuje jen svá data – neexistuje jeden „vlastník" účtu. Jednodušší a bezpečnější (žádné konflikty zápisu, jasná Firebase pravidla). Rodinný souhrn sčítá výdaje přes `partnerData`. Viz ADR-051.

### Proč zelená čára v denním grafu = reálný příjem, ne průměr
V denním grafu radaru zelená čára ukazuje **reálný příjem daného měsíce**, ne tříměsíční průměr. Dřív se bral vyšší z {reálný, průměr}, takže při příjmu 28 000 a průměru 68 150 ukazovala 68 150 – matoucí. Když reálný příjem ještě nepřišel (0), zobrazí se „odhad příjmu" s jiným popiskem (FIX-111).

### Proč denní sloupce musí být ve stejném měřítku jako osa
Modré denní sloupce dřív měly vlastní škálu (max sloupec = X % výšky), takže opticky klamaly (vypadaly obří proti hodnotě na ose). Nyní vrchol sloupce odpovídá hodnotě denního výdaje na ose Kč.

---

*Vytvořeno: 2026-04-16 | Autor: Milan Migdal | Doplněno Session 10: 2026-06-01*


---

## Session 11 – nové vzory a vysvětlení

### Split double counting pattern **(Session 11)**

Split transakce = 1 parent (celá částka, vlastní kategorie) + N children (rozpad do jiných kategorií, vlastní catId). KAŽDÁ agregační funkce musí filtrovat `!t.splitParent`, jinak se částka počítá dvakrát (parent + children).

**Proč se to stává:** Parent má `splitParent: true` a vlastní `catId`. Children mají `splitId` a vlastní `catId`. Pokud filtruješ jen podle `catId` (bez `splitParent` exclusion), počítáš parent v jeho kategorii A children v jejich kategoriích.

**Příklad (PENNY 99,90 Kč split na Doprava + Dítě):**
- Špatně: Jídlo 99,90 + Doprava 49,95 + Dítě 49,95 = **199,80 Kč** (double counted)
- Správně: Jídlo 0 (excluded) + Doprava 49,95 + Dítě 49,95 = **99,90 Kč** ✅

**Kde musíš fixnout VŠECHNA místa (audit checklist):**
- `helpers.js`: `getActual()`, `incSum()`, `expSum()`
- `ui.js`: `allExpTxs` (měsíční souhrn)
- `transactions.js`: měsíční výdaj index
- `stats.js`: `prevYearTotal`, `allTotal`, `allIncome`
- `charts.js`: 12-měsíční grafy (přes `incSum`/`expSum` – opraveno)

**Pravidlo:** Split parent se NIKDE nezapočítává. Children pokrývají celou sumu.

**Implementace:** `!t.splitParent` na všechna `filter()` volání.

---

### Anti-flicker _dataSig past **(Session 11)**

`renderPage()` v SPA aplikaci přeskočí re-render když `_dataSig()` signature nezměněna (optimalizace proti problikávání z Firebase realtime listeneru). Past: hrubá signature nezachytí všechny změny.

**Co signature MUSÍ pokrývat:**
- Počty záznamů (tx, debts, wallets, assets, categories)
- Finanční sumy (transaction amounts, asset values)
- Wallet balances (wsum) ← **S11 přidáno**
- Goals/cíle (gsum) ← **S11 přidáno**
- Tagy a podkategorie (tsum) ← **S11 přidáno**

**Řešení pro user akce:** `save()` vždy nastaví `_renderForce = true`. Firebase `onValue` auto-renders stále používají signature (anti-flicker chráněn). User actions vždy renderují (správné chování).

**Anti-pattern:** Opravit jen v jedné funkci a předpokládat, že stačí. Vždy zkontrolovat, zda `_dataSig` pokrývá editovanou hodnotu.

---

### String vs Array tagy past **(Session 11)**

`(x || []).length` je **truthy pro neprázdný string** (vrátí délku textu, ne 0). Volání `.map()` na stringu pak hodí TypeError nebo vrátí unexpected výsledky.

**Vždy používej `Array.isArray(x)` pro type-safe check:**
```js
// ❌ Špatně - truthy i pro string
if ((t.tags || []).length) { t.tags.map(...) }

// ✅ Správně
if (Array.isArray(t.tags) && t.tags.length) { t.tags.map(...) }
```

**V FinanceFlow kontextu:**
- Array tagy = manuálně přidané v editoru transakce → modré badge (`rgba(30,58,138,...)`)
- String tagy = z účtenky (`addReceiptAsTx` dělá `items.map(it=>it.tag).join(' ')`) → zelené badge (`rgba(74,222,128,...)`)

---

### Focus guard past při re-renderu **(Session 11)**

Anti-flicker guard `if(document.activeElement.closest('#container')) return` blokuje re-render pro JAKÝKOLI focusovaný prvek. Past: blokuje i legitimní update po změně `<select>` (kategorie → subkategorie se nevykreslí).

**Řešení: blokovat jen tam kde vadí (text inputs = ztráta kurzoru):**
```js
const focused = document.activeElement;
const isTextInput = focused 
  && focused.tagName === 'INPUT' 
  && focused.type !== 'number'
  && focused.closest('#rp_items');
if (isTextInput) return; // Blokuj jen TEXT input, ne SELECT/button/number
```

**Alternativa:** `element.blur()` před voláním re-render funkce → element opustí focus → guard neprovede blok → re-render proběhne → focus vrátit manuálně (pokud potřeba).

---

### Inline editor v seznamu – Firebase re-render past **(Session 11)**

Inline editor ve scrollovatelném seznamu (receipt editor v řádku History) je křehký: Firebase `onValue` re-render přebuduje celý seznam a zničí editor slot uprostřed editace.

**Symptom:** Editor se otevře, položky se začnou načítat, ale mizí (slot nahrazen prázdným HTML).

**Root cause chain:**
1. Uživatel otevře editor
2. Předchozí `save()` nastavil `_renderForce = true`
3. Firebase `onValue` přijde → `renderPage()` → force re-render → `renderUctenky()` → slot přepsán
4. Editor zmizel

**Řešení – ochranný flag:**
```js
// Při otevření editoru:
window._receiptEditorOpen = true;

// V renderUctenky():
if (window._receiptEditorOpen) {
  const anyOpen = /* zkontroluj zda slot skutečně otevřen */;
  if (anyOpen) return; // Přeskoč re-render
  window._receiptEditorOpen = false; // slot byl zavřen, pokračuj
}

// Při zavření/uložení:
window._receiptEditorOpen = false;
```

**Alternativa:** Místo inline editoru použít modal (robustnější, ale jiné UX).

---

### Receipt lineTotal model – price vs lineTotal sémantika **(Session 11)**

Váhové účtenky (kg, g) mají tři čísla: hmotnost × cena/kg = celková cena. Problém nastane, když je `price` sémanticky nejednoznačné (je to cena/kg nebo celková cena?).

**Datový model (ADR-059):**
```json
{
  "price": 29.90,     // vždy cena za jednotku (Kč/kg, Kč/ks)
  "qty": 6.445,       // vždy množství (kg nebo ks)
  "unit": "kg",
  "lineTotal": 128.26, // skutečně zaplacená cena řádku (zdroj pravdy)
  "discount": 64.45    // sleva (kladné číslo)
}
```

**Helper pro zpětnou kompatibilitu:**
```js
function lineAmt(it) {
  if (it.lineTotal != null) return parseFloat(it.lineTotal) || 0;
  return (parseFloat(it.price) || 0) * (parseFloat(it.qty) || 1);
}
```

Staré záznamy bez `lineTotal` → fallback `price × qty` (původní chování).
Nové záznamy → `lineTotal` (správné).

---

### Version bump banner – sed pattern past **(Session 11)**

Banner verze v "O aplikaci" má formát `>Verze 7.55<`. Sed pattern musí být `s|>Verze X.YY<|>Verze X.ZZ<|` – s ostrými závorkami. Bez nich pattern neodpovídá a banner zůstane na staré verzi.

**Správný sed příkaz:**
```bash
sed -i 's|>Verze 7.68<|>Verze 7.69<|' app.html
# Ověřit:
grep -o 'Verze 7.69' app.html
```

**4 atomické kroky version bump:**
1. `<title>` tag
2. Sidebar logo text
3. **Banner v O aplikaci** (tento pattern)
4. `VERZE_LOG` v admin.js + cache-busting sha256 hashe + `CACHE_NAME` v sw.js

---

*Aktualizace Session 11: 2026-06-09*

---

# SESSION 12.1 (v7.70 -> v7.94)

### Proč přesuny nejsou výdaj/příjem **(v7.83)**
P�evod z běžného na spořicí účet je pohyb mezi vlastními peněženkami – jmění se nemění. Proto je vyloučen ze statistik (incSum/expSum) i z detekce výplaty/Runway, ale započítán do zůstatků peněženek (computeWalletBalance) a do likvidní/investiční vrstvy aktiv.

### Logika Radar „Kam směřuju" **(v7.94)**
Cashflow = Příjem − Plánovaný výdej − Budoucí platby. Plánovaný výdej = už utracené + odhad zbytku měsíce z denního tempa (ne slepý průměr). Budoucí platby = jen známé naplánované. Sloupce jsou disjunktní → prosté odečtení. Tečkovaná čára = skutečný stav teď (je výš, měsíc neskončil).

### Ekonomika AI / tier systém **(v7.91)**
Sonnet 4 ~$3/M vstup, $15/M výstup. Účtenka ~0,75 Kč, import ~1,4 Kč, rádce ~0,7 Kč. Běžný premium ~63 Kč/měs API → při 149 Kč neprodělá. Heavy user bez limitů = ztráta → rate limiting je pojistka. Free = 0 AI (jen CSV parsing bez AI).

---

*Aktualizace Session 12.1: 2026-06-14 | v7.70 → v7.94 | FIX-129-146, TODO-122-136, ADR-060-064*

---

## Session 15 (2026-07-02 → 2026-07-06, v8.57 → v8.74)

> Technické vysvětlivky ze Session 15.

### Proč Dashboard skóre normalizuje 310 → 100 (TODO-159)
Milanovy tabulky mají různá maxima (S1=75, S2=DTI60+DSTI40=100, S3=50, S4=35). Přidáním 5. složky Rozpočet (0–50) vzniklo teoretické maximum 310 bodů (+ bonus 30 v rámci stropu). Aby prsten a "grade" fungovaly na intuitivní škále 0–100, počítá se `total = round(rawTotal/rawMax*100)`. Komponenty se ale ZOBRAZUJÍ ve svých PŮVODNÍCH maximech (např. "37/75"), aby uživatel viděl přesně kde v Milanově tabulce stojí.

### Proč Dluhový stres index NEpoužívá plné Milanovy tabulky přímo
Stres index má OPAČNOU sémantiku – vysoké skóre = špatně (riziko), zatímco DTI/DSTI tabulky dávají vysoké skóre = dobře (nízké zadlužení). Řešení: `msc_DSTI`/`msc_DTI` se zavolají a INVERTUJÍ: `stresBody = (1 − tabulkovéBody/max) × 25`. Zachovává jemné odstupňování Milanovy tabulky (41/61 řádků) v rámci stresové škály 0–25 na faktor.

### Proč byl Financial Freedom Ratio "navždy nulový" (FIX-187)
`getActual()` je navržený a používaný VŠUDE pro součet VÝDAJŮ dané kategorie v měsíci. FFR potřebuje součet PASIVNÍCH PŘÍJMŮ. Použití stejné funkce na příjmovou kategorii vrátilo 0 (protože žádné výdajové transakce v příjmové kategorii typicky nejsou) – KROMĚ jednoho miléřského případu: kategorie "Finanční úřad" měla výdajovou transakci (daň), která `getActual` sečetl a vydával za "100% příjmu z Finančního úřadu". Odtud matoucí chování na screenshotu Milana.

### Proč se šipka trendu v Měsíčním reportu obarvuje šedě i při velkém růstu (v8.74)
Trend kategorie (např. ↑436 %) je VŽDY meziměsíční změna výdajů, nezávisle na tom, jestli je kategorie v limitu. Dřív byla obarvena vždy červeně při růstu > 5 %, což bylo matoucí, když kategorie držela limit (skóre 100 = zelená). Od v8.74: pokud `inLimit` (zelená/bez limitu), šipka je šedá/informativní; teprve při PŘEKROČENÉM limitu je červená skutečným varováním.

---

*Session 15 KOMPLETNÍ · v8.57 → v8.74 · 18 verzí · 2026-07-02 až 2026-07-06*
*Autor: Milan Migdal + Claude (Sonnet 4.6) · FIX-174–191 · ADR-079–085 · TODO-144–159 · CLAUDE_SKILLS SKILL 5–12*

---

*Aktualizace Session 15: 2026-07-06 | v8.57 → v8.74 | FIX-174–191 · ADR-079–085 · TODO-144–159*

---

## Session 18 (v9.42 → v9.78, 2026-08-03)

### Proč Radar a Finanční obraz ukazují u „Kam směřuju" jiná čísla
Nejde o chybu — jsou to dva různé vzorce pod stejným názvem (TODO-203, zaznamenáno už dřív jako TODO-176):
- **Radar → Projekce konce měsíce:** příjem − výdaje − odhad zbytku měsíce z **denního tempa** běžné útraty. Záměrně neobsahuje jednorázové platby (nájem, splátka), proto u nich vypadá optimisticky.
- **Finanční obraz → Kam směřuju:** používá **predikční engine** (`predictCat` se sezónností), počítá dopředu přes měsíce, ne dny.
Od v9.78 podtitulek u projekce Radaru výslovně říká „bez známých plateb X — s nimi Y", aby rozdíl nebyl skrytý.

### Proč se ve stejné session čtyřikrát opakovala stejná chyba (`ReferenceError`)
`_ffrD`, `_s1pts`, `months`, `fs` — ve všech čtyřech případech šlo o proměnnou použitou dřív, než byla v daném scope platně deklarovaná. `node --check` tuhle třídu chyb nezachytí, protože kód je syntakticky správný; chyba se projeví až za běhu. Dva pokusy o regexovou kontrolu selhaly (nezvládly blokový scope JS — `const` uvnitř `try{}` regex bere jako platné pro celou funkci). Řešením byl skutečný parser, ne lepší regex. Detail: `CLAUDE_SKILLS.md` SKILL 23.

### Proč Report (`report.js`) přestal mít ruční přiřazení kategorie → sektor
V9.52 zavedla editor, kde si uživatel sám řadil kategorie do sektorů (Dům, Jídlo, Doprava…). Ukázalo se to jako chybný model: u Milana je **kategorie sama** tou nejvyšší úrovní, kterou chtěl v sektoru vidět, a **podkategorie** jsou to, co se má rozpadnout do řádků. Editor mu tedy nabízel zařadit sektor do sektoru. Oprava (v9.54): sektor = kategorie, řádek = podkategorie, čtené přímo z dat — žádné ruční přiřazování.

### Proč okno 12M (diff-read fáze 2b) vzniklo a hned zaniklo
Postaveno ve v9.55 s trojí pojistkou proti ztrátě dat, odstraněno ve v9.57. Milan: „já to stejně zapínat nikdy nebudu ani žádný uživatel aplikace." Přínos byl čistě výkonový (rychlejší start s roky historie), ale appka s nulovým až nízkým počtem uživatelů a krátkou historií ten problém nemá. Poučení: ověřit, že problém existuje, než se staví řešení — zvlášť u datově citlivé změny.

---

*Aktualizace Session 18: 2026-08-03 | v9.42 → v9.78 | FIX-220–251 · ADR-098–103 · TODO-200–211*

---

## Session 19 (2026-08-21) — vysvětlení pro uživatele

### Proč se nejisté příjmy nepočítají do plánu
Brigády, prodeje a jednorázovky se v kartě Příští měsíc zobrazují **zvlášť** a do součtu
nevstupují. Kdo si podle nich naplánuje výdaj a peníze nepřijdou, dostane se do potíží.
Ukazuje se jen věta „kdyby dorazily všechny, měl bys navíc X".

### Proč se odhad běžných výdajů někdy rovná nule
Odhad = predikce všech kategorií **minus** platby, které už mají v seznamu své datum.
Když jsou známé platby vyšší než celá predikce, zbyde nula. Není to chyba — je to stav,
kdy velké splátky pokrývají celou očekávanou útratu.

### Proč kurzová ztráta nic neukazuje
Pole „Skutečně v Kč" se předvyplní kurzem ČNB. Když ho uživatel **nepřepíše** podle
výpisu z banky, je kurz banky roven kurzu ČNB a rozdíl je přesně nula — není co zobrazit.
Nápověda u pole to od v9.94 říká.

### Proč se u editace kurz sám nepřepočítá
Kurz se u uložené transakce **fixuje schválně** — jinak by se historická útrata přepisovala
dnešním kurzem a měření marže by ztratilo smysl. Když se změní částka nebo měna, jde
o nové měření a přepočte se **oboje** (částka i referenční kurz).

### Proč Osa života nemá čisté jmění
Aplikace nezná stav aktiv a dluhů **zpětně po měsících**, jen dnešní. Taková křivka by
se musela dokreslit. Místo ní je **kumulovaný tok** — nasčítaný rozdíl příjmů a výdajů,
který se z transakcí odvodit dá.

### Proč se u dlouhé historie ukazují průměry, ne součty
Když se osa slučuje po letech, příjmy a výdaje ukazují **průměr na měsíc**. Součet za rok
by udělal umělý dvanáctinásobný skok proti měsíčnímu zobrazení.

### Proč u dovolené nevidím „Příjmy" a „Bilance"
Zobrazí se, jen když projekt příjem opravdu má — u dotace na rekonstrukci nebo vrácené
půjčky dávají smysl. U dovolené bez příjmů je bilance vždy záporná útrata, tedy totéž
číslo dvakrát.

### Proč se srovnání projektů někdy nezobrazí
Potřebuje **aspoň dva ukončené** projekty téhož typu. Průměr z jednoho projektu není
průměr. Dokud data nestačí, karta se neukáže vůbec.

### Proč mi admin ukazuje jiný počet přivedených, než vidím u sebe
Body se připisují do vlastního účtu až při **dalším přihlášení** majitele kódu —
bezpečnostní pravidla nedovolí zapsat je do cizího účtu. Admin čte skutečný zdroj,
uživatel vidí svoje zrcadlo. Rozdíl je normální stav mezi registrací a přihlášením.

### Proč se ptáme „Stálo to za to?"
Aplikace ví, **kam** peníze šly, ale ne **jestli ti za to stály**. 2 000 Kč za večeři
s rodinou a 2 000 Kč za impulzivní nákup vypadají v datech stejně. Rozdíl je jen v hlavě
uživatele — a bez jeho hodnocení ho žádný výpočet nenajde.

**Souhrn mluví o budoucnosti, ne o minulosti:** místo „utratil jsi 4 200 Kč za věci,
které ti nic nedaly" říká „kdybys polovinu poslal jinam, máš za rok X navíc — ne proto,
že by ty výdaje byly špatné, ale protože jsi u nich sám váhal".

---

# Session 22 (2026-09-12 až 2026-09-16) · v10.59 → v10.82

> Vysvětlení pro uživatele — nové metriky ze Session 22.

## Proč skóre někdy neukáže známku **(Session 22)**
Skóre se skládá z pěti oblastí. Když appka některou nemá z čeho spočítat,
nedá jí nulu ani plný počet — **vynechá ji** a rozdělí její váhu mezi zbylé.
Když takhle vypadne víc než polovina, známka se neukáže vůbec. Důvod: nula
i plný počet by lhaly stejně, jen opačným směrem.

## Proč se rezerva měří proti výdajům **(Session 22)**
Rezerva odpovídá na otázku „jak dlouho vydržím bez příjmu". To, jak dlouho
vydržíš, určuje kolik **utrácíš**, ne kolik vyděláváš. Kdo vydělává hodně
a utrácí málo, vystačí s menší rezervou než ten, kdo utrácí skoro vše.

## Co je Finanční obraz a proč je jiný než skóre **(Session 22)**
Skóre měří **úroveň** — jak na tom jsi teď. Obraz měří **změnu** — kam se
hýbeš za posledních 6 nebo 12 měsíců. Proto obě čísla můžou vypadat různě
a obě mají pravdu.

Obraz potřebuje dva body v čase. Po vymazání dat nebo u nového účtu tedy
ukáže prázdnou stupnici — nemá zatím co porovnávat.

## Proč přidání o 3 % nemusí být zlepšení **(Session 22)**
Když ti přidají 3 % a ceny vzrostly o 3 %, koupíš si přesně totéž co loni —
stojíš na místě. Při inflaci 8 % si koupíš míň, i když je na výplatnici vyšší
číslo. Appka proto růst příjmu očišťuje o inflaci, a když má dost účtenek,
použije **tvoji vlastní** inflaci místo celostátního průměru.

## Proč přesčasy nikdy neuberou body **(Session 22)**
Bonus za práci navíc se počítá ze **stavu**, ne ze změny. Když omezíš přesčasy
ze čtyř na dva týdně, bonus se jen zmenší — nikdy nespadne do mínusu. Appka
tě nemá tlačit k tomu, abys dřel víc.

## Proč účtenka za 122,60 vyrobí transakci za 123 **(Session 22)**
České účtenky mají často dvě částky: `SOUČET` je součet položek, `CELKEM` to,
co jsi doopravdy zaplatil po zaokrouhlení na koruny. Transakce je za zaplacenou
částku, protože ta odešla z účtu. Rozdíl do koruny je zaokrouhlení a appka na
něj neupozorňuje.

## Co dělat, když appka přečte účtenku špatně **(Session 22)**
Když součet položek nesedí na částku na dokladu, appka to napíše a nabídne
dvě tlačítka: použít částku z účtenky, nebo doplnit rozdíl jako položku.
**Sama nic nepřepisuje** — účtenku máš v ruce ty. Třetí tlačítko chybu nahlásí,
volitelně i s fotkou.

---

# Session 25 (2026-10-05 až 2026-10-09) · v11.30 → v11.57

> Vysvětlení ze Session 25. Kontext v `Summary_s25.md`.

## Proč appka „sekala“ – přepisy, 90 dní, neuložené změny, limity **(Session 25, Milanova otázka)**
Milan: „Proč se v appce neustále vyskytují takové sekance, že se něco přemaže za 90 dní, že se něco přepíše, neuloží,
nefunguje, má to limity a jak se tomu vyhnout?“ Za tím byly tři různé věci:

1. **Přepisy a neuložené změny** měly jednu společnou příčinu: synchronizace nahrazovala data místo slučování (FIX-432
   až FIX-438). Opravovat projevy po jednom nestačilo. Od v11.52 se slučuje po záznamech a rozepsaná práce má přednost.
2. **„Za 90 dní“** je obnova údajů o výrobku z veřejných databází (cache workeru `/ean`). Má smysl, protože se databáze
   doplňují. Chyba byla, že obnova přepsala i to, co doplnil uživatel nebo fotka. Od v11.50 se ruční a fotkou doplněné
   údaje zachovají.
3. **Limity** jsou záměrné:
   - délka textů podle pravidel DB, aby nikdo nezahltil databázi
   - počet fotek podle tarifu (bezplatných 10 GB R2)
   - počet AI dotazů (každý stojí peníze)

   Od v11.52 jedna hodnota přes limit nezastaví ukládání ostatního a texty se zkrátí už v appce.

Jak se tomu vyhnout: nové funkce, které drží data přes `await` nebo v otevřeném okně, hledají objekt podle id a registrují
se v ochraně rozpracované práce. Viz pravidla v `CLAUDE.md` S25.

## Proč se offline zapisují jen transakce **(Session 25)**
Transakce jsou samostatné záznamy s vlastním id, takže se nesrazí s ničím na serveru. Ostatní části (kategorie, účtenky,
nastavení) jsou celé seznamy. Kdyby se zapsaly naslepo, mohly by přepsat novější verzi z jiného zařízení. Proto počkají,
až appka po připojení načte stav serveru a sloučí ho se svými změnami.

## Proč appka někdy nepřekreslí stránku a ukáže „🔄 Přišly změny z jiného zařízení“ **(Session 25)**
Uživatel právě něco píše nebo má otevřený editor, kartu či okno. Překreslení by mu práci zahodilo. Změna se uloží do dat
hned, na obrazovce se ukáže, až práci dokončí nebo okno zavře.

## Proč se zkratka z účtenky nepřebírá jako název výrobku **(Session 25, Milan)**
„Smet.jogurt bílý 1kg KK“ je text pokladny. Na obalu je „Smetanový jogurt bílý“ a jiný obchod ho napíše jinak. Kdyby se
zkratka uložila jako název, v Mých výrobcích a statistikách by zůstala navždy. Proto je jen nápověda a název píše uživatel
z obalu. Stejný výrobek pod jinou zkratkou spojují aliasy.

## Proč má výrobek tři názvy **(Session 25, Milan)**
- **Název z EAN** je z mezinárodní databáze, často v originálním jazyce.
- **Přední strana obalu** je marketingový název výrobce.
- **Český popisek** je zákonem povinná nálepka dovozce a říká, co výrobek je.

U zahraničního zboží se všechny tři liší. Appka ukazuje přednostně tvůj název, pak český popisek.

## Proč jsou ceny ostatních vidět až od 3 lidí **(Session 25)**
Z průměru jednoho člověka by šla vyčíst jeho cena. U dvou lidí zná každý z nich i cenu toho druhého. Od tří se jednotlivec
v souhrnu ztratí. Lékárna a zdraví se nesdílí vůbec, protože už samotný nákup by mohl prozradit zdravotní stav.

## Proč AI komentář reportu někdy nahradí věta appky **(Session 25)**
AI dostane jen spočítaná čísla. Kdyby přesto napsala číslo, které v datech není (zaokrouhlení, vlastní dopočet), appka
ho nenajde mezi ověřenými a celý odstavec nahradí svým výpočtem. Lepší je strohá pravdivá věta než hezká a nepřesná.

## Proč má 5. úroveň COICOP jen jídlo **(Session 25)**
ČSÚ vede 5. úroveň (přílohu potravin) jen u potravin a nápojů. U drogerie a ostatního zboží končí číselník na 4. úrovni.
Srovnání s ČR a inflace dál počítají ze 4. úrovně, takže se jejich čísla nezměnila.

## Proč čekací okno při analýze účtenky nejde zavřít tlačítkem Zpět **(Session 25)**
Analýza už běží a spotřebovává jednu analýzu z limitu. Zavření okna by ji nezastavilo, jen by uživatel nevěděl, že pořád
běží, a spustil ji znovu. Po 20 s se nabídne Zrušit, které dotaz opravdu ukončí.
