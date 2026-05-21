# Donate – Stripe Setup Guide (TODO-073)

> Krok-za-krokem návod pro nastavení Stripe Payment Link pro FinanceFlow donate funkci.
> Implementace: v6.54 (donate.js + modalDonate v index.html)

---

## 1. Vytvořit Stripe účet (5 minut)

1. Jdi na **https://dashboard.stripe.com/register**
2. Email + heslo + země: **Česká republika**
3. Po registraci budeš v **Test mode** – levé horní rohu uvidíš toggle "Test mode" (oranžová)
4. ✅ V test módu můžeš testovat platby s kartou `4242 4242 4242 4242` (libovolné CVV, libovolný budoucí datum exp.)

**Co Stripe bude chtít později (pro live mode):**
- Identifikace (občanka)
- IČO **NENÍ** povinné (můžeš jako fyzická osoba)
- Bankovní účet pro výplaty
- Krátký popis činnosti

---

## 2. Vytvořit Product

1. Dashboard → **Catalog → Products** → **+ Add product**
2. **Name:** `Donate FinanceFlow`
3. **Description:** `Dobrovolná podpora projektu FinanceFlow`
4. **Pricing model:** vybrat **"Customer chooses price"** (pay-what-you-want)
5. **Currency:** `CZK – Czech Koruna`
6. **Minimum amount:** `20 Kč` (Stripe to interně uloží jako 2000 haléřů)
7. **Preset amounts** (volitelné, ale doporučené): `50`, `100`, `200`, `500`
8. **Default amount:** `200`
9. ✅ **Save product**

---

## 3. Vytvořit Payment Link

1. Otevřít vytvořený product → záložka **Payment links** → **+ Create payment link**
2. **Line items:** automaticky vybráno
3. **Customer info to collect:**
   - ✅ **Email** (povinné)
   - ❌ **Phone number** (zbytečné)
   - ❌ **Shipping address** (digitální produkt)
4. **After payment:** vybrat **"Show confirmation page"** s textem:
   ```
   Děkuji za podporu! 💛
   Účtenku jsem ti poslal na email.
   Vracíš se zpět na: https://financeflow-a249c.web.app
   ```
   (nebo **"Don't show confirmation page"** → automatický redirect, ale tehdy nepřidá si možnost zobrazit zprávu)
5. **Advanced options:**
   - ✅ **Limit number of payments** → ne (chceš více donate od stejné osoby)
   - ✅ **Adjustable quantity** → ne
6. ✅ **Create link**

---

## 4. Zkopírovat URL a nastavit v aplikaci

Po vytvoření uvidíš URL formátu:
- **Test mode:** `https://buy.stripe.com/test_eVabc123xyz`
- **Live mode:** `https://buy.stripe.com/eVabc123xyz` (po aktivaci účtu)

Otevři **`donate.js`** a uprav:

```js
const DONATE_PAYMENT_LINK_TEST = 'https://buy.stripe.com/test_eVabc123xyz';  // ← sem
const DONATE_PAYMENT_LINK_LIVE = 'https://buy.stripe.com/REPLACE_ME';        // ← později
```

Po deploy aplikace automaticky vybere TEST link na localhost/dev a LIVE link na `financeflow-a249c.web.app`.

---

## 5. Testovací platba

1. Otevři app, klikni **O aplikaci → 💛 Podpořit projekt**
2. Vyber 100 Kč, klikni **Pokračovat na platbu**
3. Otevře se Stripe Checkout
4. Zadej:
   - **Email:** libovolný (např. test@test.cz)
   - **Karta:** `4242 4242 4242 4242`
   - **MM/YY:** libovolné budoucí (např. 12/30)
   - **CVC:** libovolné 3 číslice
   - **Jméno:** libovolné
5. Klikni **Donate** → uvidíš confirmation page
6. V Stripe Dashboard → **Payments** uvidíš testovací platbu ✅

---

## 6. Aktivace Live mode (až budeš připraven)

V Stripe Dashboard:
1. Levé menu → **Activate account** (nebo profil → **Account → Settings → Public details**)
2. Vyplň:
   - **Business type:** Individual (fyzická osoba) nebo Company (s IČO)
   - **Statutory information:** jméno, adresa, datum narození, telefon
   - **Description of business:** `Osobní open-source projekt – finanční aplikace s dobrovolnou podporou`
   - **Bank account:** IBAN pro výplaty (Stripe vyplácí v EUR/CZK)
3. Po schválení (pár hodin až 1 den) získáš LIVE Payment Link
4. Vlož ho do `donate.js` → `DONATE_PAYMENT_LINK_LIVE`
5. Deploy → na produkci se začne používat live link

---

## 7. Poplatky (orientačně)

| Co | Stripe poplatek (EU karta) | Příklad pro 100 Kč |
|---|---|---|
| Standardní karta | **1.4% + 6 Kč** | 100 - (1.40 + 6) = **92.60 Kč na účtu** |
| Karta mimo EU | 2.9% + 6 Kč | 100 - 8.90 = 91.10 Kč |
| Apple/Google Pay | stejné jako karta | – |

**Tip:** Stripe nedoporučuje "donor pays fee" checkbox pro malé částky – snižuje konverzi. Pro dárky 200+ Kč je možné to zvážit, ale v tvém případě (donate, ne charity) bych to vynechal.

---

## 8. Reporty a výplaty

- **Dashboard → Payments:** seznam plateb s emailem dárce
- **Dashboard → Payouts:** výplaty na tvůj bankovní účet (default: každé 2 dny v EUR, lze nastavit denně)
- **Daňová evidence:** všechny platby export → CSV/Excel pro tvého účetního
- **Daň z příjmu:** v ČR jsou dary do 15 000 Kč/rok od jedné osoby osvobozeny od daně z příjmu – nad to si dárce může odečíst, ale ty stejně musíš platit daň z příjmu jako z příjmu (konzultuj s daňovým poradcem)

---

## 9. Co dělat, když Stripe Payment Link nestačí

Až budeš chtít víc kontroly (např. vlastní formulář na donate page bez redirectu, subscription, custom thank-you UI), můžeš přejít na **Stripe Checkout Session API** přes Cloudflare Worker. Plán:

1. Worker endpoint `POST /stripe/checkout-session` → vrátí `session.url`
2. Klient `fetch()` + `window.location = session.url`
3. Worker drží Stripe **secret key** v `env.STRIPE_SECRET_KEY` (jako máš `RESEND_API_KEY`)
4. Webhook endpoint `POST /stripe/webhook` → potvrzení platby + zápis do Firebase (např. pro premium)

ADR-039 v `decisions.md` (TBD).

---

*Vytvořeno: Session 8 (2026-05-19) | v6.54 | Author: Milan Migdal + Claude*
