# ADR-053 · Platby a Premium – Stripe Payment Links + webhook

**Session 10 · stav: NÁVRH (blokováno – Milan nemá IČO/OSVČ)**

## Kontext
FinanceFlow má připravený Premium systém (`hasPremiumAccess`, `showPagePremium`, navlock) i donate UI, ale bez funkčních plateb. `hasPremiumAccess()` dočasně vrací `true` pro všechny (zámky vypnuté).

## Rozhodnutí
1. **Model plateb = Stripe Payment Links** (hosted stránky Stripe), ne API klíče v klientovi. V aplikaci žádný tajný klíč.
2. **Ověření platby = webhook** v Cloudflare Worker:
   - event `checkout.session.completed` / `invoice.paid` → ověřit `Stripe-Signature` (webhook secret) → zapsat `users/{uid}/premium = {type, premiumUntil}` přes Firebase REST.
   - `client_reference_id` v Payment Linku = Firebase UID (appka doplní k odkazu).
3. **Tajné klíče** (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, Firebase zápis) pouze ve Worker secrets, NIKDY v klientu ani v repu.
4. **Aktivace zámků** (`hasPremiumAccess` → kontrola `type==='premium'||'trial'`) až jako poslední krok po nasazení Stripe.
5. **Premium-only = vše kromě analýzy účtenek** (dle Milana; přesný seznam stránek dodá Milan).

## Blokery
- **🔴 Stripe účet vyžaduje IČO/OSVČ** – Milan zatím nemá. Bez business identity nelze účet v ČR otevřít.
- Webhook secret + nasazení Worker dělá Milan (bezpečnostní hranice – Claude klíče nenastavuje).

## Alternativy pro donate bez IČO (zvážit pro Session 11)
- **Ko-fi / BuyMeACoffee / PayPal.me / Revolut QR** – přijímají dobrovolné příspěvky i jako fyzická osoba.
- ⚠️ Daňové dopady konzultovat s účetní (i dary mohou být zdanitelný příjem).

## Důsledky
- TODO-097 otevřené, čeká na OSVČ.
- Návod: `STRIPE_SETUP_navod.md` (Payment Links, webhook, secrets).
- Pro teď: Premium zámky zůstávají vypnuté.

---
*ADR-053 · Session 10 · 2026-06-01*
