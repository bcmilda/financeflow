# Otevřené body ze Session 19

**Stav k v10.03 (2026-08-24)** · průchod celou konverzací

Rozděleno podle toho, **kdo je na tahu**. Body označené 🔵 jsou věci, na které
jsem upozornil a nedostal odpověď — nevyčítám, jen ať nezapadnou.

---

# ČÁST A · Na tahu jsi ty

## 🔴 A1 · Revokovat Resend klíč
`SECURITY.md` obsahovala realisticky vypadající klíč a GitHub kvůli němu zablokoval push.
Soubor je opravený, ale **klíč zůstává v historii commitů**. Pokud byl skutečný,
revokuj ho v Resend a vygeneruj nový. **Nepoužívej „Bypass"** v tom dialogu.

## 🔴 A2 · Nasazení — nevím, co je venku
Během session jsi jednou zapomněl `app.js` a hlavička ukazovala `pristi` místo
`📅 Příští měsíc`. Od té doby jsem nasazení neověřoval.

**Zkontroluj, že běží v10.03** a že je nasazený i **`worker.js` do Cloudflare**
(od v9.97 přijímá `/cnb?date=`, bez něj se používají dnešní kurzy).

## 🟡 A3 · Google Play — tři věci čekají na tebe
1. **Ověřit u Dun & Bradstreet, jestli jako OSVČ dostaneš D-U-N-S.**
   Bez něj není organizační účet a bez toho není EOP. **Udělej to první** —
   podle výsledku se mění celý plán.
2. **SHA-256** z Play Console (⚠️ *app signing key*, ne upload key).
3. **Čisté mobilní screenshoty** bez lišty prohlížeče, bez poznámek a bez reálných dat.

## 🟡 A4 · Rozhodnutí o Premium v TWA
Buď EOP (10 % + nativní integrace + hlášení do 24 h), nebo Premium v Android
aplikaci vůbec nenabízet. Souvisí s A3.

## 🟡 A5 · `check_tdz.js` — doplnit allowlist
Do `KNOWN` přidat `getComputedStyle`, `File`, `Response`, `Request`, `self`.
Bez toho hlásí ~55 falešných chyb. Musí se udělat ve **tvojí** verzi souboru (TODO-222).

## 🟢 A6 · Ověřit `announcements.js`
Měl v `app.html` zastaralý hash — uživatelům s cache se servírovala stará verze
modulu oznámení. Opraveno ve v9.80, ale **nikdy jsme neověřili, že oznámení fungují**.

---

# ČÁST B · 🔵 Na co jsi nereagoval

Nic z toho není naléhavé. Uvádím to, protože jsem to zmínil a odpověď nepřišla.

## B1 · Formálně zavřít dvě TODO
- **TODO-200 (diff-read 2b)** — navrhl jsem zamítnout. Řekl jsi, že to bylo složité
  a vyžadovalo tvůj zásah, ale formálně to visí mezi otevřenými P1.
- **TODO-198 fáze 4** (varování při zadávání) — sám jsi ji vyvrátil („v momentě, kdy
  zadáváš transakci, už transakce proběhla"). Navrhuju zapsat jako zamítnuté
  i s tvým důvodem, ať to někdo znovu nenavrhne.

## B2 · Tři krátkodobé opravy COICOP tabulky
Odložil jsi celý plán („nechci se pouštět do něčeho, co možná nikdo nebude chtít"),
ale tři věci **nic nestojí a tabulka dnes klame**:
1. **Zelený sloupec má dva významy** — u oddílů odhad ČSÚ, u podskupin tvoje skutečná
   útrata. Rozdělit na dva sloupce.
2. **Doplnit součet a pokrytí** — „zařazeno 4 180 z 5 340 Kč (78 %)".
3. **28 z 84 tříd nelze nikdy naplnit** — skrýt nebo označit.

## B3 · Komunitní přehled — tři otázky soukromí
- **Opt-out, ne opt-in** — sdílení je výchozí zapnuté. Právně obhajitelné,
  u finanční aplikace bych volil opt-in.
- **`uid` je v cestě** `community/{měsíc}/users/{uid}` — admin vidí, který účet
  kolik utrácí. Pro anonymní benchmark stačí náhodné ID.
- **Žádná segmentace** — student se srovnává s rodinou 2+2. Data
  (`householdSize`, OECD) existují, nepoužívají se.

## B4 · Účtenky
- **Kontrola kvality fotky před odesláním** — dnes se uživatel dozví o špatném
  výsledku až po spotřebování jednoho volání z kvóty.
- **Free tarif 15 účtenek/měsíc** — kdo nakupuje obden, vyčerpá je za týden.
  Přitom právě položková data dělají appku užitečnou. Není to chyba, ale stojí
  za ověření na reálném chování.

## B5 · Inflace
- **Odlehlé hodnoty** — jedna překlepnutá cena z AI (98 místo 9,80) posune index
  položky o stovky procent.
- **YoY potřebuje 2 roky dat** — u nového uživatele je dlaždice trvale prázdná.
- **Duplicitní logika s `receipts.js`** (`perUnitData`, `shrinkflation`) — už jednou
  se tudy vrátily opravené chyby.

## B6 · Finanční obraz a Report
- **Čtyři různá časová okna na jedné obrazovce** — S1 z aktuálního měsíce,
  `baseIncome` ze 3 měsíců, DTI/DSTI z 12, momentum ze všech. Nikde to není napsané.
- **Zlomy `computeCatHealth`** (0,8 / 1,0 / 1,5) jsou natvrdo v kódu, zatímco
  skóre je v `scoring-config.json`. Nekonzistence.
- **FFR z jednoho měsíce** — čtvrtletní dividendy dělají skoky ze 4 % na 40 %.
- **`radarScore`** se odvozuje z **počtu** alertů, ne z jejich závažnosti.
- **`computeFinancialScore` je v `premium.js`**, zobrazuje se v `projects.js`.

---

# ČÁST C · Rozhodnuto, ale neuděláno

| ID | Co | Poznámka |
|---|---|---|
| **TODO-228** | Váha S2 ve skóre | uživatel bez dluhů má 56 % škály zadarmo — *„až moc"* |
| ~~TODO-229~~ | ✅ **hotovo v10.04** | tři stavy podle stáří ceny |
| **TODO-230** | Rodinné souhrny | žádné grafy, `cat.shared` nevstupuje do výpočtu |
| **TODO-231** | Našeptávač u Transakcí | vzor existuje 2× (`nakupShowCatalogSuggest`) |
| **TODO-232** | Administrace komunitních tagů | většinové hlasování + rozhodnutí admina |
| **TODO-233** | Uživatelské menu | tutoriál, účtenky, transakce, nastavení |
| **TODO-234** | Onboarding krok 1 | vč. frekvence výplaty + dne (tvůj bod) |
| **TODO-220** | Přesuny v kategoriích typu `both` | ~43 volání `getActual`, vlastní audit |
| **TODO-219** | ✅ **hotovo** | základní měna dokončena |

---

# ČÁST D · Velké věci na horizontu

## D1 · Překlad do angličtiny
Odsouhlaseno, nezačato. **~3 900 řetězců** (3 329 JS + 616 HTML), z toho
**614 šablonových literálů s `${}`**, které nejde jen vyměnit.

Tvoje zadání: **účtenky zůstávají v češtině**, COICOP se přeloží,
pořadí **postranní panel → karty → info hlášky**.

⚠️ Skrytá cena: dvojjazyčnost zdraží **každou budoucí změnu UI** odhadem o 30 %.
Doporučuju napřed ověřit v GA4, kolik návštěvníků je mimo ČR.

## D2 · Dokončit hloubkovou analýzu
Hotovo **8 ze 14 karet**. Zbývá: Dashboard · Transakce · Deník · Predikce ·
Projekty · Statistiky a Grafy · AI Rádce · Kalendář a Budoucí platby ·
Majetek a Půjčky · Import · Sdílení a Rodina · Admin.

Odhad **3–4 karty na sezení**.

## D3 · Kurzové ztráty — historická data
Záznamy před v9.89 nemají `fxRef`. Zvážit jednorázový backfill přes `/cnb?date=`
(TODO-223).

## D4 · Ostatní
- **Landing page** — ceník neodpovídá Stripe (99 Kč / 100 uživatelů), duplicity
  mezi `index.html` a podstránkami
- **TODO-209** — sekce B auditu, 13 kandidátů na zrušení, nezměněno od S18
- **TODO-201** Portfolio ceny — odloženo tebou
- **TODO-207/A** Životní mapa varianta A — svislé značky v existujících grafech
- **PSD2** bankovní propojení — dřív označeno za nejvýznamnější budoucí funkci

---

# Co bych vzal příští session

1. **A1 a A2** — bezpečnost a ověření nasazení. Pět minut, ale visí to.
2. **TODO-234 onboarding krok 1** — odemkne S2 ve skóre a řeší prázdné rozbalovátko
   peněženek. Navazuje na FIX-264.
3. **TODO-231 našeptávač** — levné, viditelné zlepšení.
4. **B2** — tři opravy COICOP tabulky, protože dnes klame.

Analýzu zbylých karet bych prokládal, ne dělal v bloku — po každé vypadnou opravy
a je lepší je řešit hned, dokud je kontext čerstvý.
