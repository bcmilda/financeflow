# FinanceFlow – Patch Session 11

> **Session 11** (2026-06-02) · verze **v7.31 → v7.32**
> **Rozsah:** Sloučení dvojitého affiliate bloku v O aplikaci + responzivní kanály sdílení + logika Body → Premium + nová sekce Oznámení (admin → uživatelé, read-only).
> **Nový modul:** `announcements.js` (26. JS modul)
> **Změněné soubory:** `index.html`, `share.js`, `admin.js`, `ui.js`, `database.rules.json`, **nový** `announcements.js`
> **Struktura dle UPDATE_RULES sekce 8** – separátory `## 📄 soubor.md` pro MD Diff.

---

## 📄 decisions.md

> Nová architektonická rozhodnutí Session 11.

### ADR-055 – Body → Premium: 500 bodů = 1 měsíc zdarma **(Session 11)**
- **Datum:** 2026-06-02
- **Rozhodnutí:** Referral body se přeměňují na Premium v poměru **500 bodů = 1 měsíc Premium zdarma**. Poměr je v `share.js` jako jediná konstanta `POINTS_PER_PREMIUM_MONTH = 500` (snadná změna).
- **Mechanika uplatnění:** Uživatel klikne „Uplatnit body" → vytvoří se požadavek do `/support` (`type: 'points_redeem'`) → **admin aktivuje Premium ručně** přes `activatePremiumManually()`. Klient si Premium **nepřiděluje sám** (body i `premium` node jsou zapisovatelné uživatelem → self-grant by byl nebezpečný).
- **Důvod:** Platební systém (Stripe, ADR-053) je blokovaný (IČO). Manuální aktivace přes admina je bezpečná a funguje s existující infrastrukturou.
- **Status:** ✅ Nasazeno (v7.32). Po spuštění plateb lze automatizovat.
- **🔗 Cross-reference:** `bugs.md` FIX-112, `todo.md` TODO-100, ADR-053 (Stripe).

### ADR-056 – Oznámení: admin broadcast, uživatelé read-only **(Session 11)**
- **Datum:** 2026-06-02
- **Rozhodnutí:** Nový Firebase node `/announcements` pro admin → uživatelé zprávy (novinky, tipy, nové funkce, info, důležité). Čtení pro všechny přihlášené, zápis pouze admin UID. Stejný pattern jako `keyword_overrides` / `admin_coicop_overrides`.
- **Struktura:** `/announcements/{id} → {title, text, type, createdAt, active, author}`. Typy: `novinka`, `funkce`, `tip`, `info`, `dulezite`.
- **Implementace:** nový modul `announcements.js` (user render + admin správa), karta v O aplikaci, záložka 📢 Oznámení v Admin panelu.
- **Status:** ✅ Nasazeno (v7.32).
- **🔗 Cross-reference:** `architecture.md` (node + modul), `features.md`.

---

## 📄 architecture.md

> Nový modul a Firebase node Session 11.

### Modul `announcements.js` **(Session 11)**
- **Počet JS modulů:** 25 → **26** (nový `announcements.js`).
- **Pořadí v `index.html`:** za `donate.js`, **před** `admin.js` (classic script, ne module).
- **Obsah:** `ANNOUNCEMENT_TYPES`, `loadAnnouncements()`, `renderAnnouncements()` (uživatelská karta v O aplikaci), badge logika (`localStorage ff_announce_seen`), admin funkce `loadAdminAnnouncements()` / `addAnnouncement()` / `deleteAnnouncement()` / `toggleAnnouncement()`.
- **Mazání v RTDB:** `_set(ref, null)` (projekt nemá `_remove` helper).

### Firebase node `/announcements` **(Session 11)**
- `.read`: `auth != null` · `.write`: admin UID `LNEC8VNB2QPwIv6WWQ9lqgR4O5v1`
- Validace `$id`: musí mít `title`, `text`, `type`, `createdAt`.
- **🔗 Cross-reference:** `database.rules.json`, `decisions.md` ADR-056.

### Body → Premium tok **(Session 11)**
- `share.js`: `redeemPointsForPremium()` zapisuje do `/support/redeem_{uid}_{ts}` (`type: 'points_redeem'`, splňuje validaci support: `email`/`message`/`date`).

---

## 📄 features.md

> Nové funkce Session 11.

### Sdílení / O aplikaci – přepracování **(Session 11, v7.32)**
- **Sloučen dvojitý affiliate blok.** Ponecháno: horní lišta (odkaz + malé 📋 Kopírovat + 📤 Sdílet), počítadlo (Kliknutí/Registrací/Bodů), „Tvůj osobní odkaz" s kódem, Referral program. Odebráno: duplicitní velké „Sdílet s přáteli" a velké „Kopírovat odkaz".
- **Responzivní kanály:** na mobilu velké ikony (vč. SMS a QR), na PC kompaktní řada (5 kanálů), **SMS a QR skryté na PC** (`.ff-share-mobileonly` + media query ≥641px).

### Body → Premium **(Session 11, v7.32)**
- Progres bar „kolik chybí do 1 měsíce" nebo CTA „Uplatnit X bodů za Y měsíců Premium" když má uživatel ≥ 500 bodů.
- **500 bodů = 1 měsíc Premium zdarma** (`POINTS_PER_PREMIUM_MONTH`).

### Oznámení **(Session 11, v7.32)**
- **Uživatel:** karta 📢 Oznámení v O aplikaci (čtení) – typ, nadpis, text, relativní datum, barevné odlišení dle typu.
- **Admin:** záložka 📢 Oznámení v Admin panelu – formulář (typ/nadpis/text), seznam s tlačítky skrýt 👁️ / smazat ✕.

---

## 📄 bugs.md

> Opravy Session 11.

### FIX-112 · Dvojitý affiliate blok v O aplikaci **(Session 11)**
- **Příčina:** `index.html` měl statickou horní lištu `shareLinkBar` (odkaz + Kopírovat + Sdílet) a zároveň `share.js` → `renderShareSection()` vykresloval druhý kompletní blok (velké „Sdílet s přáteli" + „Kopírovat odkaz"). Vznikla vizuální duplikace stejných akcí.
- **Oprava:** `renderShareSection()` přepsán – odstraněno velké „Sdílet s přáteli" (duplikát horního 📤 Sdílet) a velké „Kopírovat odkaz" (duplikát horní lišty). Kanály sjednoceny do jedné responzivní mřížky.
- **Soubor:** `share.js`, `index.html`
- **Verze:** v7.32

---

## 📄 todo.md

> Nové úkoly Session 11.

### TODO-100 · Automatizace Body → Premium po spuštění plateb **(Session 11, 🟢 P3)**
- **Popis:** Aktuálně uplatnění bodů vytvoří požadavek do `/support` a admin aktivuje Premium ručně (ADR-055). Po spuštění platebního systému (ADR-053, Stripe – blokováno IČO) automatizovat: odečet bodů + automatická aktivace Premium přes Worker (server-side validace, aby si klient nemohl Premium přidělit sám).
- **Priorita:** 🟢 P3 (čeká na odblokování plateb)
- **🔗 Cross-reference:** `decisions.md` ADR-055, ADR-053; `bugs.md` FIX-112

### TODO-101 · Badge nepřečtených oznámení v menu **(Session 11, 🔵 P4)**
- **Popis:** `announcements.js` má připravenou logiku `unreadAnnouncementsCount()` + `updateAnnounceBadge()` (`localStorage ff_announce_seen`). Zbývá přidat element `#announceBadge` k položce „O aplikaci" v navigaci a volat `updateAnnounceBadge()` po načtení (např. v `updateNotificationBadge`).
- **Priorita:** 🔵 P4 (nice-to-have)

---

## 📄 CLAUDE.md

> Aktualizace stavu Session 11.

**(Session 11 update):**
- **Verze:** v7.32
- **Moduly:** 25 → **26** JS souborů (nový `announcements.js`, řazen za `donate.js`, před `admin.js`).
- **Hlavní oblasti S11:** O aplikaci – sloučení affiliate bloku + responzivní kanály sdílení; Body → Premium (500 b = 1 měsíc); nová sekce Oznámení (admin broadcast, uživatelé read-only) + Firebase node `/announcements`.
