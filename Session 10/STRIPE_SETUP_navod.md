# FinanceFlow – Stripe + Premium: kompletní návod

Stav: připravujeme aktivaci plateb a Premium zámků. Tento dokument je tvůj checklist.

---

## Architektura (jak to bude fungovat)

```
Uživatel klikne "Upgradovat"
   → otevře se Stripe Payment Link (hosted stránka Stripe)
   → uživatel zaplatí
   → Stripe pošle WEBHOOK na tvůj Cloudflare Worker
   → Worker ověří podpis + zapíše do Firebase: users/{uid}/premium = {type:'premium', premiumUntil: ...}
   → aplikace při dalším načtení vidí Premium
```

**Proč Payment Links a ne API klíče v kódu:** Payment Links jsou hosted stránky Stripe – žádný tajný klíč není v aplikaci. Bezpečné a jednoduché. Tajný klíč je jen ve Workeru (webhook).

---

## FÁZE 1 – Stripe Dashboard (děláš TY)

### 1.1 Produkty a ceny
Stripe Dashboard → **Products** → vytvoř:

| Produkt | Typ ceny | Doporučení |
|---|---|---|
| FinanceFlow Premium měsíční | Recurring / měsíc | např. 99 Kč/měs |
| FinanceFlow Premium roční | Recurring / rok | např. 990 Kč/rok (2 měs zdarma) |
| Dobrovolný příspěvek (donate) | One-time, customer zadá částku | „Customer chooses price" |

### 1.2 Payment Links
Stripe Dashboard → **Payment Links** → New → pro každý produkt:
- **Důležité:** v sekci „After payment" nech default (Stripe hosted potvrzení) nebo Custom URL zpět do appky.
- **Klíčové pro webhook:** v Payment Link nastav **„Client reference ID"** nebo použij metadata – potřebujeme propojit platbu s Firebase UID uživatele. Viz FÁZE 3 (appka přidá `?client_reference_id={uid}` k odkazu automaticky).

Zkopíruj 5 URL (test i live):
- Donate (test + live)
- Premium měsíční (test + live)
- Premium roční (test + live)
- Portál pro správu předplatného (Stripe → Settings → Customer Portal → aktivovat → zkopíruj link)

### 1.3 Pošli mi těchto 7 URL
Vložím je do `donate.js` (nahradím `REPLACE_ME`).

---

## FÁZE 2 – Webhook ve Workeru (kód připravím JÁ, nasadíš TY)

### 2.1 Co udělám já
Přidám do `worker.js` novou routu `/stripe-webhook`, která:
- ověří podpis Stripe (`Stripe-Signature` header + webhook secret),
- z eventu `checkout.session.completed` / `invoice.paid` přečte `client_reference_id` (= Firebase UID) a datum konce předplatného,
- zapíše přes Firebase REST API do `users/{uid}/premium`.

### 2.2 Co uděláš ty
**a) Webhook endpoint ve Stripe:**
Stripe Dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://misty-limit-0523.bc-milda.workers.dev/stripe-webhook`
- Events: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.paid`
- Zkopíruj **Signing secret** (`whsec_...`)

**b) Cloudflare Worker Secrets** (Dashboard → Worker → Settings → Variables):
- `STRIPE_WEBHOOK_SECRET` = `whsec_...`
- `STRIPE_SECRET_KEY` = `sk_live_...` (nebo `sk_test_...` pro testy)
- `FIREBASE_DB_SECRET` nebo service-account pro zápis do RTDB (viz 2.3)

**c) Nasadíš Worker** přes Cloudflare Dashboard (jako dosud).

### 2.3 Zápis do Firebase z Workeru – POZOR
Worker potřebuje právo zapisovat do `users/{uid}/premium`. Dvě možnosti:
- **Jednodušší:** Database Secret (Firebase → Project Settings → Service Accounts → Database secrets) – legacy, ale funguje: `https://...firebasedatabase.app/users/{uid}/premium.json?auth=SECRET`
- **Bezpečnější:** Service account + OAuth token (složitější). Pro start doporučuji Database Secret.

Tohle rozhodnutí udělej a dej vědět – podle toho doladím kód zápisu.

---

## FÁZE 3 – Propojení platby s uživatelem (kód JÁ)

Aby webhook věděl, KOMU přiřadit Premium, appka přidá k Payment Linku parametr:
```
PAYMENT_LINK?client_reference_id=FIREBASE_UID&prefilled_email=EMAIL
```
To přidám do `donate.js`. Stripe to vrátí ve webhooku jako `client_reference_id`.

---

## FÁZE 4 – Aktivace zámků (1 změna, JÁ – až bude vše hotové)

V `premium.js` funkce `hasPremiumAccess()` teď vrací `true` i pro `free`. Po nasazení Stripe ji změním na:
```js
function hasPremiumAccess() {
  if (!_premiumStatus) return false;
  return _premiumStatus.type === 'premium' || _premiumStatus.type === 'trial';
}
```
Tím se zámky aktivují: `free` uživatelé uvidí paywall.

### Co bude zamčené (dle tvého zadání)
Všechny Premium funkce + AI volání KROMĚ analýzy účtenek (ta zůstane dostupná všem).
**Pošli mi seznam**, které stránky/funkce mají být Premium-only, ať nastavím `showPagePremium` a `navlock-` správně. Z kódu vidím tyto kandidáty: predikce, radar, obraz, detektor, komunita, simulace, statistiky… – potvrď které.

---

## Tvůj bezprostřední úkol
1. Vytvoř ve Stripe produkty + Payment Links (FÁZE 1).
2. Pošli mi 7 URL.
3. Rozhodni o zápisu do Firebase (Database Secret vs service account).
4. Pošli seznam Premium-only funkcí.

Pak vložím odkazy, napíšu webhook a aktivujeme to.

---
*Návod · Session 10 · 2026-06-01*
