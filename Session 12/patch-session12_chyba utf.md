# 🔧 Patch Session 12 — FinanceFlow (v7.70 → v7.94)

> Formát: MD-Diff multi-patch pro AI Merge. Každá sekce `## 📄 soubor.md` se připojí (append) k odpovídajícímu konsolidovanému dokumentu.
> Datum: 2026-06-14 · Pracovní jazyk: čeština

---

## 📄 bugs.md

### FIX-129 · Runway: výplata = největší příjem, ne první příjem **(v7.71)**
radarPaydayInfo() bral první příjem v měsíci jako výplatu; nyní medián největšího příjmu za 6 měsíců (auto-detekce kotvy) s přichycením ±6 dní, víkend→pátek.

### FIX-130 · firstDay se neukládal **(v7.71)**
Ruční nastavení dne výplaty (_settings.firstDay) se nepropisovalo do Firebase.

### FIX-131 · COICOP merge override **(v7.73)**
coicopOverrides nyní {...definice, ...userOverrides} — uživatelská přiřazení nepřepisovala defaultní.

### FIX-132 · Poplatky bez COICOP **(v7.74)**
cat42 Poplatky dostala coicop:13 + override {'Bankovní poplatek':12}.

### FIX-133 · Predikce: skrývání prázdných podkategorií **(v7.73)**
localStorage ff_predHideEmptySubs — stav přepínače se neukládal.

### FIX-134 · Mobilní tooltipy grafů **(v7.73)**
attachChartTouch — dotykové tooltipy na grafech nefungovaly.

### FIX-135 · statCard čitelnost na tmavém pozadí **(v7.75)**
P�echod na třídy .stat-value-h/.stat-label-h (var(--text3) byl nečitelný).

### FIX-136 · database_rules validate blokoval COICOP 0 **(v7.79)**
admin_coicop_overrides validate vyžadoval coicop>=1; volba „0 – mimo COICOP" selhala. Opraveno >=0 + pravidlo pro /subs.

### FIX-137 · Prázdný modal u Přesunu a Dluhu **(v7.83)**
setTxType skrýval kategorie přes catPicker.parentElement.parentElement — po přestavbě modalu řetěz vylezl na .modal-body a schoval celý formulář. Nyní explicitní #catSection.

### FIX-138 · Přesuny započítané jako příjem/výdaj **(v7.83)**
incSum/expSum nevylučovaly transfery → převod na spoření se počítal jako výdaj i příjem. Nový isTransferTx(t); vyloučeno i z detekce výplaty a Runway. computeWalletBalance je dál započítává (pohyb majetku).

### FIX-139 · Mizející editor účtenky **(v7.88)**
Po překliknutí stránek zůstal _receiptEditorOpen=true s osiřelým _editReceipt → blokoval render i nové otevření. Tvrdý reset při openu, guard čistí osiřelý stav, switchUctenkyTab zavírá editor.

### FIX-140 · Email kontakt smyčka info→info **(v7.88)**
Worker posílal z info@ na info@ (závislé na ImprovMX forwardingu → Bounced). Nyní přímo na bc.milda@gmail.com + reply_to na odesílatele.

### FIX-141 · Tabulka obchodů ořezávala levý sloupec **(v7.82, revert)**
min-width:380px byl správný (posuvník); zbytečná oprava vrácena.

### FIX-142 · Import dat omylem skryt místo Import z banky **(v7.92)**
v7.91 skryl špatnou položku. Import dat (CSV/Excel/PDF) dostupný všem; Import z banky (SMS/push) skryt pro neadminy; PDF výpis = Premium, CSV/Excel zdarma.

### FIX-143 · Emoji vstup u typu platby **(v7.92)**
maxlength=2 blokoval složené emoji. Zvýšeno na 8 + emoji picker (12 ikon).

### FIX-144 · Tempo graf: verdikt překrýval legendu **(v7.93)**
„Utrácíš o X% pomaleji" na top-12 přes legendu → přesunuto pod graf.

### FIX-145 · Predikce tabulka: zalomené číslice **(v7.93)**
white-space:nowrap na buňky, sloupec Kategorie min 130px, širší měsíční sloupce.

### FIX-146 · Radar „Kam směřuju" – překrývající se sloupce a matoucí cashflow **(v7.94)**
Plánovaný výdej = slepý 3měsíční průměr (avgExp), sloupce se překrývaly, cashflow počítán přes matoucí max(). Přepracováno: plánovaný výdej = skutečná útrata + projekce zbytku z denního tempa; budoucí platby samostatně; cashflow = prosté odečtení. Přidána tečkovaná čára skutečného stavu + rozepsaný výpočet.

---

## 📄 todo.md

- **TODO-122** ✅ · Admin výkon Krok 1 (v7.77): adminFetchUserCategories shallow+per-uid (pool 8), 4 loadery přepsány.
- **TODO-123** · score-engine.js dle ADR-060 (config hotový, vyjasnit 290 vs 295 b).
- **TODO-124** · měna v transakci (dědit z peněženky currency + přepočet na CZK). Nabídka měn rozšířena (v7.92, 14 měn), zbývá přepočet kurzem.
- **TODO-125** · SVG grafy dávka 2.
- **TODO-126–128** · drobné UI doladění predikce/dashboard (částečně řešeno v7.93).
- **TODO-129** · Apple Sign In (Apple Developer Program $99/rok, odloženo na iOS publikaci).
- **TODO-130** · Cloudflare: po aktivaci ověřit SSL Full strict, Bot Fight Mode ON, e-mail MX = DNS only. ✅ ImprovMX zprovozněn (MX mx1/mx2.improvmx.com + SPF).
- **TODO-131** · Nákupní DNA rozšířit o COICOP skupiny z product-groups.json (frequent items přes productGroupLookup).
- **TODO-132** · Firebase App Check (reCAPTCHA Enterprise) – ochrana RTDB + workeru.
- **TODO-133** · Přesun jako budoucí platba z trvalého příkazu. ✅ vyřešeno v7.84 (šablona typu Přesun).
- **TODO-134** · Rate limiting Krok 2 – počítání kvót aiUsage/{uid}/{YYYY-MM} ve Firebase, vyžaduje Firebase Admin SDK v Cloudflare Workeru. Limity: Free 0 AI (jen CSV), Premium ~150 účtenek/30 importů/30 reportů/měs, Pro vyšší.
- **TODO-135** · Ceník UI Free/Premium/Pro karty (až Stripe/živnost).
- **TODO-136** · Kategorie do rozklikávacího accordionu (stránka dlouhá).

---

## 📄 decisions.md

### ADR-060 · Score-engine (konfigurace) **(v7.77)**
scoring-config.json z dashboard XLSX: S1 76ř, DTI 60, DSTI 41, S3 50, S4 31, bonus 13; max 290. Oprava S1 (0.100-0.125 → 1.00-1.25).

### ADR-061 · Admin škálování **(v7.77)**
adminFetchUserCategories shallow fetch + per-uid pool 8 paralelně.

### ADR-062 · Tier systém free/premium/pro **(v7.91)**
Trial = premium (sloučeno). Ceny: Premium 149 Kč/měs, Pro 299 Kč/měs. Admin = vždy pro. Free = 0 AI volání kromě CSV importu (bez AI). Centrální brána: getUserTier/hasTier/canUseFeature/gateFeature. FEATURE_TIERS mapuje funkce na minimální tier. Zámky na vstupu funkcí (ne jen UI). Ekonomika: Sonnet 4 ~$3/$15 za M tokenů; běžný premium ~63 Kč/měs API → při 149 Kč neprodělá; heavy user bez limitů = ztráta → rate limiting (ADR-041) je pojistka.

### ADR-063 · Finanční aktiva dle likvidity **(v7.86)**
3 skupiny: 💧 likvidní (peněženky se živými zůstatky), 📈 investiční (akcie/ETF/krypto/spoření/termínované), 🏠 nelikvidní (nemovitosti/auta/kovy/umění). Net Worth nahoře. Track record: a.valuations[{d,v}], a.invested; editace MERGUJE (zachová valuations).

### ADR-064 · Email architektura **(v7.79, v7.88)**
Odesílání: Resend z info@financeflow.cz (Amazon SES DNS). Příjem: ImprovMX (MX mx1/mx2.improvmx.com prio 10/20 + SPF, DNS only/šedý mrak). Notifikace z kontaktu jdou přímo na admin Gmail + reply_to (ne info→info smyčka).

---

## 📄 features.md

### Runway „Do výplaty" **(v7.71, v7.75, v7.76)**
Radar přepínač Měsíc/Do výplaty; cyklus výplata→výplata, denní limit, stacked týdenní graf, minReserve 🛡️, projekce konce cyklu, srovnání s minulým cyklem, víkend/všední tempo.

### Produktová databáze ČSÚ **(v7.72)**
product-groups.json (402 COICOP skupin, 427 reprezentantů, 1066 keywords); productGroupLookup → {code, tag, group}; prefill hook v náhledu účtenky.

### COICOP správa **(v7.73, v7.74)**
Admin „Podkategorie bez COICOP" + assignSubCoicop; volba „0 – mimo COICOP"; AI auto-kategorizace vrací coicop chip.

### Onboarding průvodce **(v7.76)**
renderOnboardingCard – 5 kroků, ff_onboardHide.

### Email + heslo přihlášení **(v7.79, v7.80)**
Google OAuth + Email/heslo (přepínač Přihlásit/Registrovat), 22 českých chybových hlášek, reset hesla, zobrazit/skrýt heslo. „Pokračovat bez účtu" odstraněno z UI.

### Nákupní DNA – obchody **(v7.78, v7.81, v7.82)**
Tabulka „Obchody v měsíci" + spojnicový graf „Trend útrat dle obchodů" (storeBrandColor 20 CZ řetězců, badge s iniciálou na průsečíku, dotyk). Dedup obchodů (NFD). Řazení dle sumy, min 1 návštěva.

### Transfery = pohyb majetku **(v7.83, v7.84, v7.87)**
isTransferTx; přesuny vyloučeny ze statistik, započítány do zůstatků peněženek. Šablona typu ↔️ Přesun (opakovaná platba na spoření) – pár transakcí s transferId. V budoucích platbách neutrální barva.

### Mobilní transakce – karty **(v7.84, v7.90)**
Tap na řádek → editace; akční tlačítka 🗑/✂️ v modalu. Mobilní karta (≤820px): kompletní částka, podkategorie, zůstatek, tagy, bez tlačítek. Účtenkové řádky rozbalují položky, split rozbaluje děti.

### Průběžný zůstatek peněženky **(v7.85)**
„(644 035 Kč)" pod částkou transakce (Wallet styl), chronologicky per peněženka.

### Klikací projekt v transakci **(v7.85)**
📁 badge → openProjectDetail.

### Zobrazení slev **(v7.85)**
receiptSavings z it.discount (detekce z S10): „💸 ušetřeno" na účtence + karta „Ušetřeno slevami" (měsíc/rok/celkem + 6M průběh).

### Finanční aktiva dle likvidity + track record **(v7.86)**
Viz ADR-063. Graf vývoje hodnoty (osy, čára vloženo, tooltip), zisk/ztráta ▲/▼ v % i Kč.

### Uvítací hláška **(v7.89)**
/welcomeMessage – modal jednou při prvním spuštění; admin editor v Oznámení + náhled; verze hlášky umožní zobrazit znovu.

### Tier systém + zámky **(v7.91, v7.92)**
Free/Premium/Pro (viz ADR-062). Zámky: AI Rádce, Analýza účtenek, Nákupní seznam, Sdílení/rodina, PDF import = Premium; CSV/Excel zdarma; Import z banky (SMS) = admin.

### Zabezpečení **(v7.79)**
firebase.json: 5 bezpečnostních HTTP hlaviček + ignore rozšířen (database_rules.json, *.yml, dev HTML). Playwright starter kit.

### Predikce + Dashboard vylepšení **(v7.93, v7.94)**
Treemap tooltipy + 3 vrstvy; Tempo verdikt pod grafem; predikční tabulka nowrap + legenda barev; sezonalita osa Y po 10%; Radar „Kam směřuju" přepracovaná logika (žádný překryv sloupců) + čára skutečného stavu.

---

## 📄 GLOSSARY.md

- **isTransferTx(t)** – detekce přesunu mezi peněženkami (transferId / catId 'transfer'). Vyloučen ze statistik, započítán do zůstatků.
- **getUserTier() / hasTier(min) / canUseFeature(key) / gateFeature(key)** – tier brána (free/premium/pro).
- **FEATURE_TIERS** – mapa funkce → minimální tier ('premium'|'admin').
- **TIER_PRICES** – {premium:149, pro:299} Kč/měs.
- **LIQ_GROUPS** – skupiny aktiv dle likvidity (liquid/invest/fixed).
- **assetLiqTotals(D)** – součty aktiv dle likvidity (peněženky = liquid přes computeWalletBalance).
- **a.valuations[{d,v}]** – track record hodnoty aktiva v čase; a.invested = vloženo celkem.
- **receiptSavings(rec)** – součet slev na účtence (z it.discount).
- **welcomeMessage** – Firebase uzel uvítací hlášky; ff_welcome_seen drží poslední viděnou verzi.
- **_txBalMap** – mapa id→průběžný zůstatek peněženky.

---

## 📄 context.md

- **v7.71–v7.94 (Session 12.1):** Runway do výplaty, produktová DB ČSÚ, COICOP správa, onboarding, email+heslo auth, bezpečnostní hlavičky, Nákupní DNA obchody, transfery jako pohyb majetku + šablona přesunu, mobilní transakce karty, průběžný zůstatek, slevy, finanční aktiva dle likvidity + track record, uvítací hláška, tier systém free/premium/pro + zámky, predikce/dashboard UI opravy, přepracovaný Radar „Kam směřuju".
- **Infra:** DNS na Cloudflare (štít před Firebase Hosting); ImprovMX příjem e-mailů funkční; Resend odesílání.
- **Pending:** rate limiting kvót (Firebase Admin SDK ve workeru), ceník UI, Stripe (živnost), Firebase App Check.

---

## 📄 explanations.md

### Proč přesuny nejsou výdaj/příjem **(v7.83)**
P�evod z běžného na spořicí účet je pohyb mezi vlastními peněženkami – jmění se nemění. Proto je vyloučen ze statistik (incSum/expSum) i z detekce výplaty/Runway, ale započítán do zůstatků peněženek (computeWalletBalance) a do likvidní/investiční vrstvy aktiv.

### Logika Radar „Kam směřuju" **(v7.94)**
Cashflow = Příjem − Plánovaný výdej − Budoucí platby. Plánovaný výdej = už utracené + odhad zbytku měsíce z denního tempa (ne slepý průměr). Budoucí platby = jen známé naplánované. Sloupce jsou disjunktní → prosté odečtení. Tečkovaná čára = skutečný stav teď (je výš, měsíc neskončil).

### Ekonomika AI / tier systém **(v7.91)**
Sonnet 4 ~$3/M vstup, $15/M výstup. Účtenka ~0,75 Kč, import ~1,4 Kč, rádce ~0,7 Kč. Běžný premium ~63 Kč/měs API → při 149 Kč neprodělá. Heavy user bez limitů = ztráta → rate limiting je pojistka. Free = 0 AI (jen CSV parsing bez AI).
