# FinanceFlow – Patch Session 11 (průběžný)

> **Session 11** (2026-06-02 – 2026-06-05) · verze **v7.31 → v7.45**
> **⚠️ Průběžný patch** – Session 11 stále probíhá. Tento dokument zachycuje stav k v7.45.
> **Rozsah:** UI opravy + Oznámení 2.0 + PIN sync + Service Worker + Web Push + cron cenové alerty + chord diagram + snapshot IndexedDB + aktiva ikony + nákupní karty + kalendář + debts reorder.
> **Nové moduly:** `announcements.js` (26.) · `push.js` (27.) · **Nové soubory:** `sw.js` · `worker-push.js`
> **Dotčené soubory:** `index.html`, `app.js`, `admin.js`, `helpers.js`, `share.js`, `ui.js`, `offline-sync.js`, `receipts.js`, `nakup.js`, `sms-import.js`, `kalendar.js`, `assets.js`, `settings.js`, `stats.js`, `push.js` _(nový)_, `announcements.js` _(nový)_, `sw.js` _(nový)_, `worker-push.js` _(nový)_, `database_rules.json`, `worker.js` _(CORS update)_
> **Struktura dle UPDATE_RULES sekce 8** – separátory `## 📄 soubor.md`.

---

## 📄 decisions.md

> ADR-055 až ADR-062 přidány Session 11. ADR-057 aktualizován (localStorage → Firebase).

### ADR-055 – Body → Premium: 500 bodů = 1 měsíc zdarma **(Session 11, v7.32)**
- **Datum:** 2026-06-02
- **Rozhodnutí:** Referral body → Premium v poměru **500 bodů = 1 měsíc**. Konstanta `POINTS_PER_PREMIUM_MONTH = 500` v `share.js`.
- **Mechanika:** Uplatnění → požadavek do `/support` (`type: 'points_redeem'`) → admin aktivuje ručně. Klient si Premium nepřiděluje sám.
- **Status:** ✅ Nasazeno (v7.32). Po spuštění plateb lze automatizovat (TODO-100).
- **🔗 Cross-reference:** ADR-053, `bugs.md` FIX-112, `todo.md` TODO-100.

### ADR-056 – Admin broadcast oznámení **(Session 11, v7.32)**
- **Datum:** 2026-06-02
- **Rozhodnutí:** Firebase node `/announcements`. Write = admin UID, read = `auth != null`. Typy: `novinka | funkce | tip | info | dulezite | anketa`.
- **Status:** ✅ Nasazeno (v7.32). Rozšířeno o anketu (v7.38) a editaci (v7.40).
- **🔗 Cross-reference:** ADR-057, `database_rules.json`.

### ADR-057 – Osobní oznámení: Firebase `users/{uid}/notifications` **(Session 11, v7.34 → v7.36)**
- **Datum:** 2026-06-02, aktualizováno 2026-06-03
- **Rozhodnutí:** Per-uživatelské události ukládány do **Firebase `users/{uid}/notifications/{id}`** (cross-device sync) s localStorage offline cache. NEukládají se do admin `/announcements`.
- **v7.34:** localStorage `ff_local_notifs` (per-zařízení). **v7.36 upgrade:** Firebase (cross-device), localStorage cache.
- **API:** `addLocalNotification()`, `loadPersonalNotifs()`, `dismissNotification()`, `openNotifLink(kind)`.
- **Status:** ✅ Nasazeno (v7.36).
- **🔗 Cross-reference:** ADR-056, `bugs.md` FIX-114.

### ADR-058 – Service Worker: offline app shell **(Session 11, v7.37)**
- **Datum:** 2026-06-03
- **Rozhodnutí:** `sw.js` — navigace = network-first + offline fallback; same-origin statika + statické CDN = stale-while-revalidate; Firebase = neintercepováno. `CACHE_NAME = 'ff-shell-v{verze}'` — bumpovat s každým deployem.
- **Zároveň:** `push` a `notificationclick` handlery (prerekvizita pro ADR-060).
- **Status:** ✅ Nasazeno (v7.37).
- **🔗 Cross-reference:** ADR-062 (snapshot), ADR-060 (Web Push), `todo.md` TODO-019 (uzavřen).

### ADR-059 – PIN ochrana: SHA-256 hash + Firebase sync **(Session 11, v7.37)**
- **Datum:** 2026-06-03
- **Rozhodnutí:** PIN hashovaný (SHA-256, sůl `ff_pin_v1:`) v Firebase `users/{uid}/security/pinHash` + localStorage cache. `loadPin()` async (LS okamžitě + FB refresh). `await loadPin()` v `onUserSignedIn`. Migrace plaintextu automatická.
- **Status:** ✅ Nasazeno (v7.37). `settings.js` + `app.js`.
- **Pozn.:** PIN 6–12 alfanumerický — navržen, odložen (TODO-107).

### ADR-060 – Web Push PWA notifikace **(Session 11, v7.41)**
- **Datum:** 2026-06-03
- **Rozhodnutí:** VAPID (ES256) + aes128gcm (RFC 8291). `push.js` = klientský modul (subscribe → `users/{uid}/push/{deviceId}` + plochý index `push_subs`). `worker-push.js` = samostatný Cloudflare Worker odesílač. Admin broadcast přes zaškrtávátko u tvorby oznámení.
- **Status:** ✅ Nasazeno (v7.41/v7.42). `push_subs` + pravidla.
- **🔗 Cross-reference:** ADR-058 (SW), ADR-061 (cron), `todo.md` TODO-030 (uzavřen).

### ADR-061 – Cron: cenové alerty **(Session 11, v7.43)**
- **Datum:** 2026-06-03
- **Rozhodnutí:** Cloudflare Cron Trigger → `scheduled()` v `worker-push.js`. Čte Firebase REST: `users/*/data.nakupList` + `catalog/items` + `push_subs`. Trigger: `drop = (refPrice - latestPrice) / refPrice * 100 ≥ alertPct`. Dedup: `price_alerts/{uid}_{itemId}` = alertovaná cena.
- **Status:** ✅ Implementováno (v7.43). Vyžaduje `FIREBASE_DB_URL` + `FIREBASE_DB_SECRET` v Worker secrets.

### ADR-062 – Offline snapshot: localStorage → IndexedDB **(Session 11, v7.39 → v7.45)**
- **Datum:** 2026-06-03, finalizováno 2026-06-05
- **Rozhodnutí:** Snapshot `S` do **IndexedDB `ff_snapshot_db`** (store `snapshots`, keyPath `uid`). Důvod: localStorage limit ~5 MB nestačí pro uživatele s tisíci transakcemi.
- **Migrace:** automatická — `loadSnapshot()` při IDB miss přenese starý LS klíč do IDB a smaže z LS.
- **Fallback:** Safari Private / starý prohlížeč → localStorage.
- **Oddělení:** Jiná DB než `ff_offline_db` (receipts/tx queue v offline-sync.js) — bez verzi-konfliktu.
- **Status:** ✅ Nasazeno (v7.45). `app.js` — `_openSnapDB()`, `saveSnapshot()` (async), `loadSnapshot()` (async, awaited).

---

## 📄 architecture.md

> Nové moduly, Firebase nodes, IDB, patterns Session 11.

### Modul `announcements.js` **(Session 11, 26. modul)**
- Pořadí: za `donate.js`, před `admin.js` (classic script).
- Klíčové funkce: `ANNOUNCEMENT_TYPES`, `loadAnnouncements()`, `openNotificationsModal()`, `renderNotifModalBody()`, `toggleNotifMsg(id)`, `updateAnnounceBadge()` (aktualizuje `#announceBadge` i `#navAnnounceBadge`), `addLocalNotification()`, `loadPersonalNotifs()`, `dismissNotification()`, `loadPollVotes()`, `votePoll()`, `_renderPollHTML()`, `ensureWelcomeNotification()`, `sendBroadcastPush()`, `editAnnouncement()`, `addAnnouncement()`.
- `addLocalNotification` exportováno na `window` (volá ho `offline-sync.js` za běhu).

### Modul `push.js` **(Session 11, 27. modul)**
- Pořadí: za `import.js`, před `firebase.js` (classic script).
- Klíčové funkce: `enablePush()`, `disablePush()`, `pushToggleClick()`, `pushUpdateUI()`, `pushTest()`, `_savePushSub()` (→ `users/{uid}/push` + `push_subs`), `_removePushSub()`.
- `VAPID_PUBLIC_KEY` hardcoded (veřejný). Privátní klíč pouze v Cloudflare secrets.

### Service Worker `sw.js` **(Session 11, v7.37)**
- Root soubor. `CACHE_NAME = 'ff-shell-v{verze}'` — bumpnout s každou verzí.
- `install`: precache shell + skipWaiting. `activate`: purge + claim. `fetch`: routing. `push` + `notificationclick`: Web Push. `message`: skipWaiting on demand.

### Worker `worker-push.js` **(Session 11, samostatný)**
- `fetch()`: POST `/push` → VAPID JWT (ES256) + aes128gcm → push endpoint.
- `scheduled()`: Cron → cenové alerty (čte Firebase REST).
- Self-contained (Web Crypto, bez npm) → pasivní do Cloudflare Dashboard.
- Secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PUSH_SECRET`, `FIREBASE_DB_URL`, `FIREBASE_DB_SECRET`.

### Firebase nodes Session 11

| Node | read | write | Účel |
|---|---|---|---|
| `/announcements/{id}` | `auth != null` | admin UID | Broadcast oznámení |
| `/poll_votes/{pollId}/{uid}` | `auth != null` | `auth.uid === $uid` | Hlasy ankety |
| `/push_subs/{uid}_{deviceId}` | admin UID | `auth != null` (validate uid) | Plochý index push odběrů |
| `users/{uid}/notifications/{id}` | owner | owner | Osobní oznámení (cross-device) |
| `users/{uid}/push/{deviceId}` | owner | owner | Push subscription |
| `users/{uid}/security/pinHash` | owner | owner | Hashovaný PIN |
| `users/{uid}/meta/welcomed` | owner | owner | Dedup uvítací zprávy |

### IndexedDB `ff_snapshot_db` **(Session 11, v7.45)**
- Store `snapshots`, keyPath `uid`. Oddělená od `ff_offline_db`.
- `_openSnapDB()` = lazy singleton promise. `saveSnapshot()` = async, fire-and-forget. `loadSnapshot()` = async, awaited v `onUserSignedIn`.

### Offline cold-start flow **(Session 11, v7.39)**
```
onUserSignedIn (async)
  ├─ loadUserProfile (offline-safe, fallback auth.displayName)
  ├─ if offline: await loadSnapshot() → hydratuj S → toast "📴 Offline"
  ├─ if online: await _get(userRef) → S = snap.val() → saveSnapshot()
  ├─ _onValue (aktualizuje S + saveSnapshot při reconnect)
  ├─ try { await loadPartners() } catch {}
  ├─ try { await loadPremiumStatus() } catch {}
  └─ try { await loadSettings() } catch {}
```

### Chord diagram **(Session 11, v7.44)**
- `stats.js` → `renderChordDiagram()` z `renderStats()`. Kontejner `#statChord` v `page-statistiky`.
- SVG bez d3. TOP 8 výdajových kategorií dle `_statCatMode`. Arky + filled chord shapes (bezier přes centrum). Tooltip + legenda.

### Vzory potvrzené Session 11
- `saveSnapshot()` = fire-and-forget; `loadSnapshot()` = awaited.
- Každý `await _get()` v `onUserSignedIn` = try/catch nebo podmíněn `navigator.onLine`.
- Plochý index pro broadcast (`push_subs`) místo čtení `users/*`.

---

## 📄 features.md

> Nové funkce Session 11 (v7.32 – v7.45).

### Sdílení – přepracování **(v7.32 → v7.33)**
- Sloučen dvojitý affiliate blok. Responzivní kanály: mobil SMS+QR, PC bez nich. Body → Premium: `⌊earned/500⌋` měsíců, odečet `N×500`, zbytek přenesen.

### UI helpery **(v7.33)**
- `helpers.js`: `statCard()`, `statGrid()`, `emptyState()`, `sectionCard()`, `escHtml()`.

### Oznámení 2.0 **(v7.34 → v7.40)**
- **Popup modal** (bottom sheet mobil / centered card PC). Obálky ✉️/📭, expand/collapse, smazání osobních 🗑️.
- **Badge v navigaci** (`#navAnnounceBadge`) + v sekci (`#announceBadge`). Auto-refresh 3,5 s po startu.
- **Anketa:** admin tvoří otázku + možnosti. Uživatelé hlasují, vidí % výsledky. `/poll_votes`.
- **Uvítací zpráva:** jednou pro nového uživatele. Flag `users/{uid}/meta/welcomed`.
- **Editace:** tlačítko ✎ u každého oznámení → načte do formuláře → Uložit změny.

### Offline UX účtenek (FIX-114) **(v7.34 → v7.35)**
- Badge „🔄 Analyzuji účtenku i/N…" + osobní oznámení s prokliknem po dokončení.

### Receipts – posuvník **(v7.35)**
- `overflow-x:auto` + min-width 600px. Název položky min-width 130px.

### Nákupní karty **(v7.35)**
- Grid `auto-fill minmax(158px, 1fr)`. Ikona v kolečku, badge, cena, akce dole.

### Kalendář – pace + centrované číslo **(v7.35 → v7.36)**
- Plné saldo uprostřed. `fmtK` opravena pro záporná. Pace indikátor 3px dole.

### Aktiva – výběr ikon **(v7.38)**
- Ikona se mění s typem. `ASSET_ICONS` grid per typ. `assetRenderIconPicker()`.

### Půjčky – pořadí **(v7.38)**
- `#debtCards` nad analytickými widgety (Kalkulačka, Stres index, …).

### PIN Firebase sync **(v7.37)**
- SHA-256 hash v `users/{uid}/security/pinHash`. Cross-device sync. Migrace plaintextu.

### Service Worker **(v7.37)**
- Offline app shell. `CACHE_NAME` bump každá verze.

### Offline snapshot + IndexedDB **(v7.39 → v7.45)**
- Snapshot S do `ff_snapshot_db`. Offline cold start = hydratace dat. Migrace z localStorage.

### Web Push **(v7.41 → v7.42)**
- Přepínač Nastavení. Test push (lokální SW). Admin broadcast (zaškrtávátko). VAPID + aes128gcm.

### Cron: cenové alerty **(v7.43)**
- Cloudflare Cron Trigger `0 */6 * * *`. Push při poklesu ceny pod hlídaný práh. Dedup `price_alerts`.

### Chord diagram – Statistiky **(v7.44)**
- `#statChord` v `page-statistiky`. SVG chord TOP 8 výdajových kategorií. Tooltip + legenda.

---

## 📄 bugs.md

> FIX-112 až FIX-117 přidány Session 11.

### FIX-112 · Dvojitý affiliate blok v O aplikaci **(v7.32)**
- **Příčina:** Horní lišta v `index.html` + `renderShareSection()` vykreslovaly stejné akce dvakrát.
- **Oprava:** `renderShareSection()` přepsán, duplikát odstraněn.
- **Soubor:** `share.js`, `index.html` · **Verze:** v7.32

### FIX-113 · Přetrvávající duplikace odkazu + kód sekce **(v7.33)**
- **Příčina:** Po FIX-112 zůstával blok „Tvůj osobní odkaz" s duplikátem odkazu + Kopírovat.
- **Oprava:** Blok zredukován na kód + info. Odkaz/Kopírovat jen v horní liště.
- **Soubor:** `share.js` · **Verze:** v7.33

### FIX-114 · Offline účtenka se analyzuje „neviditelně" **(v7.34)**
- **Příčina:** `syncOneReceipt()` zanalyzuje a uloží tiše; jen prchavý toast.
- **Oprava:** `showAnalyzingBadge()` během syncu + `addLocalNotification()` s prokliknem po dokončení.
- **Soubor:** `offline-sync.js`, `announcements.js` · **Verze:** v7.34

### FIX-115 · Duplikátní částka v buňce kalendáře **(v7.35)**
- **Příčina:** `fmtK()` neuměla záporná čísla → saldo plné, výdaj zkrácený = vizuální duplikát.
- **Oprava:** `fmtK()` přepsána (magnitude-based). Druhý řádek jen při dni s příjmem i výdajem.
- **Soubor:** `kalendar.js` · **Verze:** v7.35

### FIX-116 · Ikona aktiva zůstává při změně typu **(v7.38)**
- **Příčina:** `assetUpdateTypeHint()` neaktualizovala ikonu, chyběl výběr ikon.
- **Oprava:** Ikona se mění s typem. Přidán `ASSET_ICONS` grid.
- **Soubor:** `assets.js`, `index.html` · **Verze:** v7.38

### FIX-117 · `onUserSignedIn` crashing offline **(v7.39)**
- **Příčina:** `loadPartners()`, `loadPremiumStatus()`, `loadSettings()` bez try/catch → exception offline → přerušení flow před `renderPage()`.
- **Oprava:** Každý await v try/catch. `loadUserProfile()` offline-safe (fallback auth.displayName).
- **Soubor:** `app.js` · **Verze:** v7.39

---

## 📄 todo.md

> Uzavřené TODO + nové TODO Session 11.

### ✅ TODO-019 – Service Worker **(uzavřeno v7.37)**
### ✅ TODO-030 – Web Push notifikace **(uzavřeno v7.41)**
### ✅ TODO-101 – Badge v navigaci **(uzavřeno v7.36)**

### TODO-100 · Automatizace Body → Premium **(S11, 🟢 P3)**
- Po spuštění plateb automatizovat přes Worker. Čeká na Stripe/IČO (ADR-053).

### TODO-102 · Google Play TWA publikace **(S11, 🟡 P2)**
- Zbývá: `assetlinks.json`, Bubblewrap, Play Console. SW prerekvizita splněna (ADR-058).

### TODO-103 · Web Share Target **(S11, 🟢 P3)**
- `share_target` v manifestu + handler → sdílení bankovní notifikace do appky.

### TODO-104 · ADR-052 implementace – lineární trend **(přesun S10, 🟡 P2)**
- Schváleno, neimplementováno. Nahradit SMA × fixní sezónní koeficient.

### TODO-105 · AI Rate Limiting – ADR-041 **(přesun S10, 🟡 P2)**
- Firebase Admin SDK v Cloudflare Workeru. Plán hotov, čeká na implementaci.

### TODO-106 · Stripe/Donate platební linky **(přesun S10, 🟡 P2)**
- Platební linky stále nenastaveny. Blokuje monetizaci.

### TODO-107 · PIN 6–12 alfanumerický **(S11, 🔵 P4)**
- Navrženo, odloženo Milanem. Jednoduché (validace + inputMode + maxlength).

### TODO-108 · Chord diagram: příjem → výdaje **(S11, 🔵 P4)**
- Stávající = expense-only TOP 8. Smysluplnější: income segment + expense kategorie jako tok.

### TODO-109 · Session patch 11 finalizace **(S11, 🟡 P2)**
- Tento patch je průběžný. Po ukončení Session 11 aktualizovat všechny dotčené .md soubory.

---

## 📄 CLAUDE.md

> Aktuální stav Session 11 k v7.45 (průběžný).

- **Verze:** v7.45
- **JS moduly:** 25 → **27** (`announcements.js` jako 26., `push.js` jako 27.)
- **Nové soubory:** `sw.js` (root, Service Worker), `worker-push.js` (samostatný Cloudflare Worker)
- **Firebase nodes nové:** `/announcements`, `/poll_votes`, `/push_subs`, `users/{uid}/notifications`, `users/{uid}/push`, `users/{uid}/security/pinHash`, `users/{uid}/meta/welcomed`
- **IndexedDB nové:** `ff_snapshot_db` (snapshot S; oddělená od `ff_offline_db`)
- **Klíčová pravidla workflow přidaná S11:**
  - `CACHE_NAME` v `sw.js` = bumpnout s každou verzí
  - `saveSnapshot()` = fire-and-forget async; `loadSnapshot()` = awaited v `onUserSignedIn`
  - Každý `await _get()` v `onUserSignedIn` = try/catch nebo `navigator.onLine` guard
  - VAPID public key = hardcoded v `push.js` (veřejný); privátní jen v Cloudflare secrets
  - Worker push URL + PUSH_SECRET = admin drží v localStorage (ne ve sdíleném kódu)

---

*Patch Session 11 · průběžný · v7.31 → v7.45 · 14 sub-verzí · 2026-06-02/06-05*

---

## 📄 Doplněk v7.46–v7.53 (Session 11 pokračování · 2026-06-06)

### Co bylo přidáno od v7.46 do v7.53

---

## 📄 import.js · v7.50

**FIX:** Banner PDF importu je podmíněný stavem přihlášení.
- Přihlášený uvidí: `📄 Max ~200 transakcí na soubor`
- Nepřihlášený uvidí: `🔒 Pro import z PDF se přihlas`
- Dřív: statický `⚠️ Max ~200 transakcí · vyžaduje přihlášení` – matoucí pro přihlášeného uživatele

---

## 📄 app.js · v7.51 · FIX-118 (KRITICKÉ)

**Ztráta dat v saveToFirebase – chybějící klíče v `dataToSave`.**
- `_set` přepisuje celý uzel `/data`; v seznamu klíčů chyběly `assets` a `importHistory`
- Transakce se ukládaly, ale majetek a historie importů ne → po reloadu mizely
- Oprava: doplněny `assets: ss.assets===false ? [] : S.assets||[]` a `importHistory: S.importHistory||[]`

---

## 📄 helpers.js · v7.51 · FIX-119

**Přepínač měsíců skrytý na stránce Import dat.**
- `showPage()` + `showPageByName()` nově volají: `_mn.style.display = (name==='import') ? 'none' : ''`
- Při překliknutí měsíce se resetovala rozkliknutá pod-záložka importu → opraveno skrytím

---

## 📄 worker-push.js · v7.51

- Aktualizovaná hlavička: verze → v7.51
- Opravena ukázková URL: `firebaseio.com` → `europe-west1.firebasedatabase.app`

---

## 📄 assets.js · v7.52

**Odstraněny záložky typů aktiv, nahrazeny flat seznamem.**
- Dřív: tab bar Nemovitosti / Investice / Vozidla / Spoření / Ostatní
- Nově: jeden flat seznam všech aktiv seřazený dle hodnoty + tlačítko `+ Přidat` v záhlaví
- `renderAssetsTab()` zachována pro zpětnou kompatibilitu, ale v `renderAssets()` se nevolá
- `assetBuildCard()` sdílená funkce, funguje pro všechny typy

---

## 📄 push.js · v7.52

**openNotifSettings() redesignováno jako fullscreen stránka.**
- Dřív: bottom-sheet floating modal (`align-items:flex-end`, `border-radius:20px 20px 0 0`)
- Nově: `position:fixed;inset:0;background:var(--bg)` + sticky top bar s `← Zpět`
- Titulek: `Nastavení oznámení` → `🔔 Oznámení`
- Přidán toggle: `🏘️ Anonymní data – Komunitní srovnání` v sekci „Soukromí" (key: `communityData`)
- Footer: `Zprávy najdeš vždy v 📢 Oznámení` → `Zprávy najdeš vždy v 📭 Zprávy`

---

## 📄 announcements.js · v7.52 + v7.53

**Inbox přejmenován Oznámení → Zprávy.**
- Modal header: `✉️ Oznámení` → `📭 Zprávy`
- Přidána funkce `dismissBroadcast(id)` – skryje admin broadcast lokálně (LS key `ff_dismissed_broadcasts`)
- Admin broadcast zprávy filtrovány při render (vyloučeny dismissed)
- Tlačítko 🗑️ Smazat přesunuto do header řádku (osobní zprávy)

**v7.53: Zprávy (openNotificationsModal) → fullscreen stránka.**
- CSS: `#ffNotifModal` z bottom-sheet overlay → `position:fixed;inset:0;background:var(--bg)`
- `#ffNotifSheet` z rounded bottom card → flex column full-height
- Header: `✕` → `← Zpět`, sticky top bar
- 🗑️ Smazat v header řádku pro VŠECHNY typy zpráv (admin + personal), `event.stopPropagation()`
- Admin: volá `dismissBroadcast(realId)`; Personal: volá `dismissNotification(id)`
- Odstraněno staré `🗑️ Smazat` ze spodku expanded content (bylo pouze pro personal)
- `dismissBroadcast` + `dismissNotification` obě re-renderují modal po smazání

---

## 📄 index.html · v7.52

**O aplikaci sekce – přejmenování + nový řádek Oznámení.**
- `📢 Oznámení` (inbox zpráv) → `📭 Zprávy` s titulkem „Novinky, tipy a výsledky analýz"
- Nový řádek `🔔 Oznámení` → `openNotifSettings()` (nastavení push notifikací)
- Badge `#navAnnounceBadge` přesunut ke správnému Oznámení řádku

---

## 📄 admin.js · v7.52

- Komunitní přehled: `Vypnout lze v Nastavení` → nyní volá `openNotifSettings()` a zobrazuje text „Oznámení"

---

## 📄 Google Play balík (nové soubory, nepatří do appky)

- `legal.html` – veřejná Privacy Policy + Podmínky + GDPR (à la alocano.cz, dark theme, deployovat na /legal.html)
  - Sekce: Soukromí, GDPR práva, Podmínky, Cookies, Kontakt
  - Přesné zpracovatele (Firebase EU, Cloudflare, Anthropic/Claude, Sentry, Resend) + SCC poznámka
  - Věk 15+, žádná citlivá data, „AI data se netrénují", Oprávnění aplikace, detail uchovávání
- `google-play-listing.md` – store listing: titulek (29 znaků), krátký popis (78 znaků), plný popis s ASO klíčovými slovy, Data Safety odpovědi, specifikace grafiky, screenshoty pořadí, checklist vydání
- `feature-graphic-mine.svg` – Milanova varianta: srdce + malý wordmark + AI + cenový graf (zelená nahoru/červená dolů) v pozadí
- `feature-graphic-creative.svg` – Claudova kreativní varianta: tep financí – zelené srdce s EKG vlnou uvnitř (spodní výkyv červený, zbytek zelený), glow halo, „FinanceFlow s AI"

---

## 📄 Klíčová zjištění a rozhodnutí (v7.46–v7.53)

- **Import historie bug root cause:** `importHistory` + `assets` chyběly v `dataToSave` v `saveToFirebase()`. `_set` přepisuje celý `/data` uzel, klíče mimo seznam se ztratí. Vždy kontrolovat seznam klíčů při přidání nového pole do `S`.
- **Dvě renderovací cesty pro Zprávy:** `renderAnnouncements()` (inline v O aplikaci) a `openNotificationsModal()` + `renderNotifModalBody()` (overlay/page). Změny je třeba udělat v obou místech.
- **Fullscreen pattern (Oznámení + Zprávy):** `position:fixed;inset:0;background:var(--bg);z-index:10000+;display:flex;flex-direction:column` + sticky top bar s `← Zpět`. Žádný overlay backdrop.
- **Konkurence (Wallet/BudgetBakers):** Bank sync (AIS/open banking) = jejich killer feature. Naše diferenciace: AI-first (Claude), české ČSÚ srovnání, soukromí (no ads/no data sell). Cenou nekonkurovat.
- **Google Play identity:** Nový dedikovaný email + vlastní doména doporučeno. Google Play vyžaduje ověřenou identitu; pro skrytí jména → s.r.o. (také odemkne Stripe).

---

*Patch Session 11 · FINÁLNÍ doplněk · v7.46 → v7.53 · 2026-06-06*

---

## 📄 Doplněk v7.56–v7.59 (Session 11 · 2026-06-08)

---

## 📄 manifest.json + legal.html + landing pages · v7.55b

- `manifest.json`: start_url, scope, id → `https://financeflow.cz/`; start_url → `/app`
- `legal.html`: všechny URL + kontaktní email → `financeflow.cz` + `info@financeflow.cz`
- `landing_v2/v3/v4.html`: linky na aplikaci → `financeflow.cz`

---

## 📄 Přestrukturování webu · v7.56

**Landing page jako homepage `financeflow.cz/`:**
- `landing_v4.html` → `index.html` (landing page = homepage)
- Původní `index.html` (appka) → `app.html`
- `firebase.json` rewrites: `/app` → `app.html`; `/**` → `index.html` (landing)
- `manifest.json` `start_url` → `/app`
- `app.html` dostala `<base href="/">` pro správné relativní cesty

---

## 📄 worker.js · CORS + email · v7.56

- Přidáno `https://financeflow.cz` + `https://www.financeflow.cz` do `allowedOrigins`
- Sender email: `onboarding@resend.dev` → `info@financeflow.cz`
- Recipient: `bc.milda@gmail.com` → `info@financeflow.cz`

**Nasazení:** Cloudflare Dashboard → Worker `misty-limit-0523` → Edit → Deploy (až po ověření Resend domény)

---

## 📄 Resend + ImprovMX email infrastruktura · 2026-06-07

- Resend: stará doména `financeflow-a249c.web.app` smazána, přidána `financeflow.cz` (EU/Ireland region). DNS záznamy (DKIM, SPF, DMARC) přidány do WEDOS DNS. **Status: Verified ✅**
- ImprovMX: přidána doména `financeflow.cz`, alias `info@` → `bc.milda@gmail.com`. Free tier = příjem + přeposílání. Odesílání řeší Resend. **Status: ✅**

---

## 📄 stats.js · Chord diagram + Postřehy · v7.58

**FIX: Chord diagram v oddílu Vše:**
- Příčina bugu: mode 'all' filtroval `amount < 0`, ale výdaje jsou kladná čísla s `type:'expense'` → vše 0 → zpráva „přidej 2 kategorie"
- Oprava: mode 'all' používá `statCatSum()` která prochází všechny roky/měsíce přes `getActual()`

**FIX: Postřehy banner – mode-aware:**
- Měsíc: porovnání s předchozím měsícem (jako dřív)
- Rok: porovnání s předchozím rokem + celkové výdaje roku
- Vše: celkové výdaje / příjmy / saldo za všechna data

---

## 📄 charts.js · Grafy záložky opravy · v7.57–v7.59

**FIX v7.57:**
- `onGrafFilterChange()`: přidáno `renderVsechnyRoky()` pro záložku Všechny roky
- `renderVsechnyRoky()`: čte přes `getGrafTxs()` místo `D.transactions` → respektuje filtry

**FIX v7.59 – switchGrafTab:**
- Obecné: `month-nav` globální zobrazen (vrácen) – používá `curMonth` pro 12M grafy
- Měsíční: skryje globální `month-nav`, zobrazí `grafMonthNav` (vlastní `‹ Červen 2026 ›`)
- Roční: zobrazí `grafYearNav` (vlastní `‹ 2026 ›`), rok nastavuje `changeGrafYear()`
- Všechny roky: skryje `grafFilterWrap` (má vlastní interní filtr `#vsechnyGrafCat`)

**FIX v7.59 – renderMesicniGraf:**
- `maxVal` nyní zahrnuje max(cumul, medVal, daily) → zelená kumulativní linie nezmizel pod osy
- Přidána legenda nahoře vpravo: Denní výdaje (modrá) / Kumulace (zelená) / Medián (červená)
- Sloupce: opacity 0.55 (byly 0.7)

**FIX v7.59 – renderKumulChart:**
- Odstraněn duplicitní label Medián u přímé linie (byl i v legendě → překrývaly se)
- Medián hodnota přesunuta napravo od linie
- Legenda: 11px bold, `#c2c7da` barva → čitelnější

---

## 📄 app.html · Filtry Grafy redesign · v7.57

- `grafFilterWrap`: kompaktní pill-style selects (`border-radius:20px`, `height:30px`, inline)
- Přidány `#grafMonthNav` (Měsíční) a `#grafYearNav` (Roční) navigační prvky
- Text filtru typ: „Vše" → „Příjmy + Výdaje"

---

## 📄 Google Play + Landing page · v7.56

**Nové soubory (deployovat):**
- `index.html` = landing page v4 (financeflow.cz homepage)
- `legal.html` = veřejná privacy/GDPR stránka (financeflow.cz/legal.html)
- `landing_v4.html` = zdrojová kopie (nepotřeba deployovat)

**Landing page v4 struktura:**
- Hero: „Přestaň hádat. Začni vědět, kam mizí peníze." + WOW receipt mockup
- Enemy section: Finanční slepota (10-20% příjmů)
- Cesta uživatele: Den 1→3→10→30
- Výsledky (ne funkce): 6 karet
- Srovnání: banka vs FinanceFlow tabulka
- Founder story (důvěra)
- FOMO pricing: 249→49 Kč zakládající cena
- Virální score karta
- Testimonials

---

## 📄 TODO pro příští session

- **TODO-110:** Rodinné finance – přidat pole `owner: uid` k transakcím, barevné odlišení v přehledech, filtr Moje/Partnerovy/Vše
- **TODO-111:** Landing page – počítadlo návštěv (Plausible nebo Firebase Analytics)
- **TODO-112:** Premium prodejní stránka v appce (benefits tiers + social proof)
- **TODO-113:** TWA build (Bubblewrap + assetlinks.json) pro Google Play
- **TODO-114:** Statistiky – Chord diagram animace/interaktivita (tooltip hover)
- **TODO-115:** AI Rate Limiting (ADR-041) – Firebase Admin SDK v Cloudflare Worker
- **TODO-116:** Screenshoty pro Google Play (z běžící appky)

---

*Patch Session 11 · PRŮBĚŽNÝ doplněk · v7.51 → v7.59 · 2026-06-08*

---

## 📄 Doplněk v7.63 (Session 11 · 2026-06-08 pozdní večer)

### Google Analytics 4 · v7.63
- GA4 tag `G-F2Z8DK4RR0` přidán do `index.html` (landing page) a `app.html` (appka)
- Konfigurace: `anonymize_ip: true`, `send_page_view: false` (manuální tracking)
- `helpers.js showPage()`: trackuje `page_view` event při každém přechodu stránky
- ⚠️ GDPR: pro EU uživatele doporučit přidat Cookie Consent Mode v budoucnu

### Push notifikace — diagnostika problémů
- **Duplicitní UI odstraněn**: sidebar měl dva řádky volající openNotifSettings() — "Oznámení" + "Nastavení oznámení". Odstraněn druhý (pushToggleRow, display:none). Zůstává jen jeden "Oznámení".
- **0 subscribers problém**: subscription v RTDB je uložena pouze z Firefox/Windows. Pro mobil je nutné subscribovat ZNOVU přímo z mobilního prohlížeče (nebo nainstalované PWA).
  - Cesta kde worker hledá: `push_subs/{uid}_{deviceId}` (ne `users/{uid}/push/`)
  - Cesta kde klient ukládá: OBOJÍ — `users/{uid}/push/` i `push_subs/`
  - Pokud push_subs/ je prázdný → worker najde 0 subscribers → nic neposílá
  - **Řešení**: v mobilu otevřít appku → Oznámení → vypnout a znovu zapnout push
- **Red underline v worker-push.js** (řádek 227): lintovací varování editoru (TypeScript inference v Cloudflare Monaco editoru), ne runtime chyba. Kód je správně.
- **Fotky účtenek**: po OCR zpracování jsou smazány z IndexedDB. Ukládají se pouze jako JPEG blob pro offline frontu (dočasně). Po synchronizaci s Cloudflare Worker se smaže blob, uloží se jen JSON data (store, total, items) do Firebase RTDB. Fotky se nedají zpětně zobrazit — jen JSON výsledek.

### Receipt AI prompt — finalizace · worker.js
- Finální verze PRAVIDEL pro Penny/Albert typ účtenek:
  - PRAVIDLO 2: váhové položky — `lineTotal` = pravý sloupec (zaplaceno), `price` = cena/kg
  - PRAVIDLO 3: sleva na SAMOSTATNÉM řádku (Meloun + SLEVA VĚRNOSTI -64,45) → `lineTotal=128.26, discount=64.45`
  - Nové pole `discount` (číslo ≥ 0) pro každou položku

### TODO aktualizace
- **TODO-111** ✅ HOTOVO — Google Analytics 4 implementováno (v7.63)
- **TODO-117** — Sledování slev z účtenek + propojení s Nákupním seznamem:
  - `discount` pole v JSON promptu je implementováno
  - Logika propojení: skenovaná položka s `discount > 0` → fuzzy match s `nakupList` → zapsat do `catalog/items/{key}.lastDiscount: {date, store, pct, saved}` → push notifikace "Meloun byl v akci −33% v Penny"
  - Přidána jako aktivní TODO pro příští session

*Patch Session 11 · PRŮBĚŽNÝ doplněk · v7.51 → v7.63 · 2026-06-08*

---

## 📄 Doplněk v7.64–v7.67 (Session 11 · 2026-06-09)

### Receipt bugy (v7.64–v7.66)
- **Bug edit v Historii**: setTimeout(initReceiptEditor,50) → race condition s Firebase re-render. Opraveno: synchronní volání + reset window._editReceipt + zavření ostatních editorů před otevřením.
- **Obchody tab**: odstraněna ✎/✕ tlačítka (edit patří do Historie). Items přepracovány na grid sloupce Položka | Kč | Mn. s lineAmt() a discount badge.
- **Transakce z účtenky**: buildTxRow rozpozná receiptItems → 📷 N pol. ▾ badge → klik rozbalí položky (Split styl). Pro split parent receipt expand vypnut (konflikt kliků).
- **rpRender focus guard**: blokoval re-render pro JAKÝKOLI focusovaný prvek (i select) → kategorie/subkat se nevykreslily. Opraveno: blokuje jen TEXT inputy. Subkat select zobrazen vždy vedle kategorie.

### Split DOUBLE COUNTING – komplexní oprava (v7.65, v7.67)
Split parent (celá částka) + children (rozpad) se počítaly DVAKRÁT. Opraveno napříč celou aplikací filtrem `!t.splitParent`:
- `helpers.js`: getActual (FIX-120), incSum, expSum
- `ui.js`: allExpTxs (měsíční suhrn)
- `transactions.js`: měsíční výdaj index
- `stats.js`: prevYearTotal, allTotal, allIncome, statCatSum (přes getActual)
- Pravidlo: split parent se NIKDE nezapočítává, children pokrývají celou sumu ve svých kategoriích.

### Zelené tagy fix (v7.67)
- addReceiptAsTx ukládá tags jako STRING (join), ale buildTxRow array check `(t.tags||[]).length` u stringu vrátil délku → `.map()` spadl → tagy neviditelné. Opraveno: `Array.isArray(t.tags)` check.

### Receipt link provázanost (v7.67)
- addReceiptAsTx ukládá receiptDate + receiptStore na transakci.
- openReceiptInHistory(date, store): 📷 tlačítko otevře KONKRÉTNÍ účtenku v Historii (filtr obchodu + scroll + editor).

### Partner/affiliate (v7.62)
- PARTNER_BONUS_PTS: 50 bodů.
- 2 odkazy ve Sdílení: affiliate (?ref=KÓD, nová registrace) + partner (?partnerOf=UID, spárování partnerů). Zvážit sjednocení na 1.

### Push notifikace – STÁLE NEFUNGUJÍ na mobil
- Subscription v RTDB jen z Firefox/Windows. Mobil nesubscribed.
- Web Push certificates v Firebase FCM prázdné – ale náš systém používá VAPID přímo přes Cloudflare Worker, ne FCM.
- Cron trigger nastaven (potvrdil uživatel).
- DIAGNÓZA POKRAČUJE: ověřit push_subs/ path obsah, VAPID klíče v Cloudflare, mobile subscribe flow.

### TODO aktualizace
- TODO-117: Slevy z účtenek (discount pole) → propojení s Nákupním seznamem – ČEKÁ
- TODO-118: "Upravit split" UI button (re-edit splitu bez mazání children) – ČEKÁ
- TODO-119: Push notifikace mobile – DIAGNÓZA
- TODO-120: Zvážit sjednocení affiliate + partner odkazu

*Patch Session 11 · v7.51 → v7.67 · 2026-06-09*
