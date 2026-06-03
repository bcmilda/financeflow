# FinanceFlow – Patch Session 11

> **Session 11** (2026-06-02) · verze **v7.31 → v7.34**
> **Rozsah:** Sloučení dvojitého affiliate bloku v O aplikaci + responzivní kanály sdílení + logika Body → Premium + sekce Oznámení (admin → uživatelé) + osobní (lokální) oznámení s výsledkem offline analýzy účtenky. Kola: v7.32 (základ), v7.33 (oprava duplikace, přepracování bodů, Oznámení jako rozbalovací řádek, UI helpery), v7.34 (osobní oznámení + UX offline účtenek).
> **Nový modul:** `announcements.js` (26. JS modul)
> **Změněné soubory:** `index.html`, `share.js`, `admin.js`, `ui.js`, `helpers.js`, `offline-sync.js`, `database.rules.json`, **nový** `announcements.js`
> **Mimo MD Diff:** `CLAUDE_SKILLS.md` (nový SKILL 5 – architektura kódu).
> **Struktura dle UPDATE_RULES sekce 8** – separátory `## 📄 soubor.md` pro MD Diff.

---

## 📄 decisions.md

> Nová architektonická rozhodnutí Session 11.

### ADR-055 – Body → Premium: 500 bodů = 1 měsíc zdarma **(Session 11)**
- **Datum:** 2026-06-02
- **Rozhodnutí:** Referral body se přeměňují na Premium v poměru **500 bodů = 1 měsíc Premium zdarma**. Poměr je v `share.js` jako jediná konstanta `POINTS_PER_PREMIUM_MONTH = 500` (snadná změna).
- **Mechanika uplatnění (v7.33):** Uživatel klikne „Aktivovat Premium" → odečte se `N×500` z `earned` (zbytek se přenese, brání dvojímu uplatnění) → vytvoří se požadavek do `/support` (`type: 'points_redeem'`) → **admin aktivuje Premium ručně** přes `activatePremiumManually()`. Klient si Premium **nepřiděluje sám**.
- **Důvod:** Platební systém (Stripe, ADR-053) je blokovaný (IČO). Manuální aktivace přes admina je bezpečná a funguje s existující infrastrukturou.
- **Status:** ✅ Nasazeno (v7.32). Po spuštění plateb lze automatizovat.
- **🔗 Cross-reference:** `bugs.md` FIX-112, `todo.md` TODO-100, ADR-053 (Stripe).

### ADR-057 – Osobní (lokální) oznámení odděleně od admin broadcastu **(Session 11, v7.34)**
- **Datum:** 2026-06-02
- **Rozhodnutí:** Per-uživatelské systémové události (např. „offline účtenka byla zanalyzována") se **NEzapisují** do admin nodu `/announcements` (ten je broadcast: write=admin, read=all). Místo toho jdou do **lokálního kanálu** `localStorage['ff_local_notifs']` a zobrazují se ve stejném panelu Oznámení jako sekce „📬 Osobní".
- **Důvod:** Uživatel nemůže (a nemá) zapisovat do admin broadcastu; událost je per-uživatel/per-zařízení. Míchání by bylo bezpečnostně i logicky špatně.
- **API:** `addLocalNotification({icon,title,text,link:{kind,label},color})`, `getLocalNotifications()`, `dismissLocalNotification(id)`, routing `openNotifLink(kind)` (mapa akcí, bez eval).
- **Omezení:** per-zařízení (nesynchronizuje mezi zařízeními). Případná cross-device verze = zápis do `users/{uid}/notifications` (budoucí TODO).
- **Status:** ✅ Nasazeno (v7.34).
- **🔗 Cross-reference:** ADR-056 (admin Oznámení), `bugs.md` FIX-114.

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
- `share.js`: `redeemPointsForPremium()` zapisuje do `/support/redeem_{uid}_{ts}` (`type: 'points_redeem'`, splňuje validaci support: `email`/`message`/`date`) a odečítá uplatněné body z `users/{uid}/referral/earned`.

### UI helpery v `helpers.js` **(Session 11, v7.33)**
- `statCard(value,label,color,opts)`, `statGrid(cards,cols)`, `emptyState(icon,title,desc)`, `sectionCard(title,bodyHtml,opts)`, `escHtml(s)`.
- Účel: odstranit duplikaci inline HTML stringů, podpořit vzor compute/render. Načteno brzy (helpers.js je 2. script), dostupné všem modulům.

### Lokální oznámení + offline hook **(Session 11, v7.34)**
- `announcements.js`: kanál `localStorage['ff_local_notifs']` (cap 30), funkce `addLocalNotification`/`getLocalNotifications`/`dismissLocalNotification`/`openNotifLink`. `addLocalNotification` je exportováno na `window` (volá ho `offline-sync.js`, který se načítá dřív – volání běží až za běhu při syncu).
- `offline-sync.js`: `syncOneReceipt()` po úspěchu volá `addLocalNotification(...)`; `runSync()` ukazuje `showAnalyzingBadge()` během analýzy.
- Badge `#announceBadge` i „seen" (`ff_announce_seen`) počítají admin + osobní dohromady.

---

## 📄 features.md

> Nové funkce Session 11.

### Sdílení / O aplikaci – přepracování **(Session 11, v7.32)**
- **Sloučen dvojitý affiliate blok.** Ponecháno: horní lišta (odkaz + malé 📋 Kopírovat + 📤 Sdílet), počítadlo (Kliknutí/Registrací/Bodů), „Tvůj osobní odkaz" s kódem, Referral program. Odebráno: duplicitní velké „Sdílet s přáteli" a velké „Kopírovat odkaz".
- **Responzivní kanály:** na mobilu velké ikony (vč. SMS a QR), na PC kompaktní řada (5 kanálů), **SMS a QR skryté na PC** (`.ff-share-mobileonly` + media query ≥641px).

### Body → Premium **(Session 11, v7.32 → v7.33)**
- **v7.32:** progres bar / CTA při ≥ 500 bodech, 500 bodů = 1 měsíc (`POINTS_PER_PREMIUM_MONTH`).
- **v7.33 přepracováno:** blok vždy ukazuje **celkem bodů**, **nárok na N měsíců** (`floor(earned/500)`), tlačítko **„Aktivovat Premium (N měsíců)"** při ≥ 500 b, a **postup k dalšímu měsíci** (zbytek `earned % 500`).
- **Chování bodů:** počítadlo se **neresetuje**, body se kumulují. Při aktivaci se odečte `N×500` (zbytek se přenese, brání dvojímu uplatnění). Příklad: 450 + 300 = 750 → nárok na 1 měsíc, po aktivaci zbývá 250.

### Oznámení **(Session 11, v7.32 → v7.33)**
- **v7.33:** přesunuto pod banner FinanceFlow do seznamu jako **rozbalovací řádek** „📢 Oznámení" s **badge nepřečtených**. Klik rozbalí panel s oznámeními (lazy render). `announcements.js`: `toggleAnnouncementsPanel()`, `initAnnouncementsBadge()`, badge přes `localStorage ff_announce_seen`.
- **Admin:** záložka 📢 Oznámení v Admin panelu – formulář (typ/nadpis/text), seznam s tlačítky skrýt 👁️ / smazat ✕.

### UI helpery proti duplikaci **(Session 11, v7.33)**
- `helpers.js`: `statCard()`, `statGrid()`, `emptyState()`, `sectionCard()`, `escHtml()`. Počítadlo ve `share.js` migrováno na `statGrid` jako vzor build/render. Viz `CLAUDE_SKILLS.md` SKILL 5.

### Osobní oznámení + UX offline účtenek **(Session 11, v7.34)**
- **Panel Oznámení** má teď dvě sekce: **📬 Osobní** (lokální, per-zařízení) a **📢 Od FinanceFlow** (admin broadcast). Badge počítá nepřečtené z obou.
- **Offline účtenka:** po reconnectu se během analýzy ukazuje „🔄 Analyzuji účtenku i/N…" a po dokončení vznikne osobní oznámení „🧾 Účtenka zanalyzována" s prokliknem do Historie účtenek (řeší FIX-114).
- **API lokálních oznámení:** `addLocalNotification()` (globálně dostupné i z `offline-sync.js`), `getLocalNotifications()`, `dismissLocalNotification()`, `openNotifLink('receiptHistory')`.

---

## 📄 bugs.md

> Opravy Session 11.

### FIX-112 · Dvojitý affiliate blok v O aplikaci **(Session 11)**
- **Příčina:** `index.html` měl statickou horní lištu `shareLinkBar` (odkaz + Kopírovat + Sdílet) a zároveň `share.js` → `renderShareSection()` vykresloval druhý kompletní blok (velké „Sdílet s přáteli" + „Kopírovat odkaz"). Vznikla vizuální duplikace stejných akcí.
- **Oprava:** `renderShareSection()` přepsán – odstraněno velké „Sdílet s přáteli" (duplikát horního 📤 Sdílet) a velké „Kopírovat odkaz" (duplikát horní lišty). Kanály sjednoceny do jedné responzivní mřížky.
- **Soubor:** `share.js`, `index.html`
- **Verze:** v7.32

### FIX-114 · Offline účtenka se po reconnectu zanalyzuje „neviditelně" **(Session 11, v7.34)**
- **Příčina:** Po obnovení připojení `runSync()` → `syncOneReceipt()` pošle účtenku na Worker, zanalyzuje a přes `addReceiptAsTx()` rovnou založí transakci. Jediná zpětná vazba byl **prchavý toast** – uživatel neviděl, že analýza probíhá, nemohl do ní vstoupit, a účtenka se „po chvíli" objevila v historii.
- **Oprava (UX):**
  - Během syncu offline badge ukazuje viditelný stav „🔄 Analyzuji účtenku i/N…" (`showAnalyzingBadge`).
  - Po dokončení vznikne **trvalé osobní oznámení** (📬 Osobní) „Účtenka zanalyzována – {store} · {total} Kč" s tlačítkem **Zobrazit v historii účtenek** (`openNotifLink('receiptHistory')`).
- **Pozn.:** Offline účtenky se i nadále ukládají automaticky (bez editačního náhledu) – Milan to tak akceptoval; doplněna jen viditelnost a proklik.
- **Soubor:** `offline-sync.js`, `announcements.js`
- **Verze:** v7.34
- **Příčina:** I po FIX-112 zůstával blok „Tvůj osobní odkaz", který znovu zobrazoval celý odkaz `?ref=...` a vlastní tlačítko 📋 Kopírovat – tedy duplikát horní lišty (potvrzeno screenshotem).
- **Oprava:** Blok „Tvůj osobní odkaz" zredukován – odstraněn duplicitní odkaz i tlačítko Kopírovat, ponechán jen „Tvůj kód: XXXX" + informace o odměně. Odkaz a Kopírovat zůstávají pouze v horní liště.
- **Soubor:** `share.js`
- **Verze:** v7.33

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
- **Verze:** v7.34
- **Moduly:** 25 → **26** JS souborů (nový `announcements.js`, řazen za `donate.js`, před `admin.js`).
- **Hlavní oblasti S11:** O aplikaci – sloučení affiliate bloku + responzivní kanály sdílení; Body → Premium (500 b = 1 měsíc, odečet při aktivaci); Oznámení (admin broadcast + osobní lokální oznámení) + Firebase node `/announcements`; UI helpery v `helpers.js`; UX offline analýzy účtenek (viditelný průběh + osobní oznámení s prokliknem).
