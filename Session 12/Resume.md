# 📋 Resume — FinanceFlow Session 12.1

**Verze:** v7.70 → **v7.94** (24 verzí)
**Datum:** 11.–14. 6. 2026
**Jazyk:** čeština · **Stack:** Vanilla JS, Firebase, Cloudflare Workers, Claude API

---

## 🎯 Hlavní milníky session

1. **Tier systém free/premium/pro** se zámky na AI funkce (ochrana nákladů)
2. **Finanční aktiva dle likvidity** + track record investic s grafem
3. **Mobilní transakce přepracované na karty** (Wallet styl)
4. **Email+heslo přihlášení** + zprovoznění info@financeflow.cz (ImprovMX)
5. **Uvítací hláška** editovatelná z admin panelu
6. **Transfery jako pohyb majetku** napříč celou aplikací
7. **Přepracovaná logika Radaru** „Kam směřuju" + řada UI oprav grafů

---

## 📦 Verze po verzích

| Verze | Co přineslo |
|-------|-------------|
| **v7.71** | Runway „Do výplaty" – radar přepínač Měsíc/Do výplaty, cyklus výplata→výplata, denní limit, stacked týdenní graf. FIX výplata = největší příjem. |
| **v7.72** | Produktová DB ČSÚ (402 COICOP skupin, 1066 keywords) – productGroupLookup, prefill účtenky. |
| **v7.73** | COICOP správa v adminu, AI auto-kategorizace s coicop chip. FIX merge override, mobilní tooltipy. |
| **v7.74** | Poplatky COICOP, volba „0 – mimo COICOP", AI Rádce pro COICOP. |
| **v7.75** | Runway upgrady: minReserve 🛡️, projekce konce cyklu, srovnání s minulým cyklem, víkend/všední tempo. |
| **v7.76** | Onboarding průvodce (5 kroků). Payday týdny čtou jednotný zdroj. |
| **v7.77** | Admin výkon (shallow fetch + pool 8). scoring-config.json (ADR-060). |
| **v7.78** | Nákupní DNA obchody (tabulka + trend graf). Playwright starter kit. |
| **v7.79** | Email+heslo přihlášení (22 CZ hlášek, reset). Bezpečnostní HTTP hlavičky. FIX COICOP 0. |
| **v7.80** | „Pokračovat bez účtu" odstraněno z UI. Konsolidovaná dokumentace. |
| **v7.81–82** | Nákupní DNA doladění: redesign „Pravidelně nakupuješ", dedup obchodů, trend dle sumy. |
| **v7.83** | **Transfery = pohyb majetku** (isTransferTx). FIX prázdný modal Přesun/Dluh. |
| **v7.84** | Mobilní edit transakce (tap → modal s tlačítky). **Šablona typu Přesun** (opakovaná platba na spoření). |
| **v7.85** | Průběžný zůstatek peněženky „(644 035 Kč)". Klikací projekt. **Zobrazení slev** (sčítač úspor). |
| **v7.86** | **Finanční aktiva dle likvidity** (💧/📈/🏠) + Net Worth. **Track record** investic + graf vývoje hodnoty. |
| **v7.87** | Transfer v budoucích platbách: neutrální barva, ikona ↔️, cílová peněženka. |
| **v7.88** | FIX mizející editor účtenky. FIX email smyčka (notifikace přímo na Gmail). |
| **v7.89** | **Uvítací hláška** /welcomeMessage – modal jednou při startu, admin editor + náhled. |
| **v7.90** | **Mobilní transakce = karty** – tap edit, kompletní částka, podkategorie, bez tlačítek v řádku. |
| **v7.91** | **Tier systém free/premium/pro** + zámky na 6 AI funkcí (ADR-062). Ceny 149/299 Kč. |
| **v7.92** | FIX záměny Import dat/banky. Měny rozšířeny (14). Emoji picker u typu platby. |
| **v7.93** | UI opravy: Treemap tooltipy + 3 vrstvy, Tempo verdikt pod grafem, predikční tabulka nowrap + legenda, sezonalita osa po 10%. |
| **v7.94** | **Přepracovaný Radar „Kam směřuju"** – žádný překryv sloupců, prosté odečtení cashflow, čára skutečného stavu. |

---

## 🔧 Klíčové opravy (FIX-129 až FIX-146)

- **Transfery** se počítaly jako příjem/výdaj → vyloučeny ze statistik, započítány do zůstatků (FIX-138)
- **Prázdný modal** u Přesunu/Dluhu (parentElement řetěz) (FIX-137)
- **Mizející editor účtenky** po překliknutí stránek (FIX-139)
- **Email smyčka** info→info → přímo na Gmail (FIX-140)
- **Import dat** omylem skryt místo Import z banky (FIX-142)
- **Matoucí cashflow** v Radaru (překrývající se sloupce) (FIX-146)

---

## 🏗️ Architektonická rozhodnutí (ADR)

- **ADR-060/061** – score-engine konfigurace, admin škálování
- **ADR-062** – tier systém (free/premium/pro, trial=premium, ekonomika AI)
- **ADR-063** – finanční aktiva dle likvidity + track record
- **ADR-064** – email architektura (Resend odesílání, ImprovMX příjem)

---

## 💰 Ekonomika AI (důležité pro tier)

- Claude Sonnet 4: ~$3/M vstup, $15/M výstup
- Účtenka ~0,75 Kč · import ~1,4 Kč · rádce ~0,7 Kč · kategorizace ~0,10 Kč
- Běžný premium uživatel ~63 Kč/měs API → při ceně 149 Kč **neprodělá**
- Heavy user bez limitů = ztráta → **rate limiting (TODO-134) je pojistka**

---

## 🌐 Infrastruktura

- **DNS:** přesun na Cloudflare (štít před Firebase Hosting)
- **Email odesílání:** Resend z info@financeflow.cz (Amazon SES DNS)
- **Email příjem:** ImprovMX (MX mx1/mx2.improvmx.com + SPF, DNS only) → bc.milda@gmail.com ✅
- **Worker:** ruční deploy na Cloudflare Dashboard (email fix v7.88, v7.94 needsdeploy)

---

## ⏭️ Co dál (pending)

1. **Rate limiting Krok 2** (TODO-134) – počítání kvót aiUsage/{uid}/{YYYY-MM}, vyžaduje Firebase Admin SDK v Cloudflare Workeru
2. **Ceník UI** Free/Premium/Pro karty (TODO-135) – až Stripe/živnost
3. **Měna v transakci** – přepočet kurzem ČNB (TODO-124, měny už rozšířeny)
4. **Kategorie do accordionu** (TODO-136)
5. **Firebase App Check** (TODO-132)
6. **Apple Sign In** (TODO-129, $99/rok – až iOS)

---

## 📋 Nasazení v7.94

- JS soubory → `js/`, JSON data → `data/`, app.html + styles.css + sw.js + firebase.json → root, styles.css → `css/`
- `firebase deploy --only hosting` + `firebase deploy --only database` (COICOP 0 + /subs)
- `worker.js` → ručně na Cloudflare Dashboard
- Firebase Console → Authentication → povolit Email/Password
- Po nasazení: `npm test` v Playwright kitu (kontrola verzí + integrita)
