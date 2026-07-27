// ══════════════════════════════════════════════════════
//  FinanceFlow · Service Worker · v9.08 · 2026-07-19
//  Cíl: aby se aplikace načetla a fungovala i OFFLINE
//  (app shell – HTML/JS/CSS – z cache). Přepínání stránek
//  je čistě klientské, takže po nacachování shellu funguje
//  bez sítě. Firebase data/auth NEintercepujeme (necháváme
//  je na síti; SDK si drží session v IndexedDB).
//
//  Strategie:
//   - Navigace (HTML): network-first → offline fallback na cached index.html
//   - Same-origin statika (JS s ?v=hash, CSS, obrázky): stale-while-revalidate
//   - Statické CDN (fonty, gstatic Firebase SDK): stale-while-revalidate
//   - Vše ostatní (Firebase RTDB/Auth, Cloudflare Worker): neintercepováno
//
//  ⚠️ Verzování: CACHE_NAME bumpni s každou verzí appky (jako cache-bust),
//  ať se starý shell zahodí. Statika má navíc ?v=hash, takže se invaliduje sama.
// ══════════════════════════════════════════════════════

const CACHE_NAME = 'ff-shell-v9.08';
const SHELL = ['./', './index.html', './app.html', './manifest.json'];

// Statické CDN, které smíme cachovat pro offline (NE Firebase data/auth)
const STATIC_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'www.gstatic.com',        // Firebase SDK moduly (statické)
  'cdnjs.cloudflare.com',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((c) => c.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // 1) Navigace (otevření appky): network-first, offline fallback na shell
  if (req.mode === 'navigate') {
    // S16.5 (AUDIT P1-3): offline fallback dle cesty – /app* → app.html, jinak landing.
    // FIX: dřív se KAŽDÁ navigace ukládala pod klíč './index.html' (návštěva /app tak
    // přepsala cache landingu obsahem appky a naopak) – nyní cache pod vlastní URL.
    const isApp = url.pathname === '/app' || url.pathname.startsWith('/app/') || url.pathname.endsWith('/app.html');
    e.respondWith(
      fetch(req)
        .then((res) => {
          caches.open(CACHE_NAME).then((c) => c.put(req, res.clone())).catch(() => {});
          return res;
        })
        .catch(() => caches.match(isApp ? './app.html' : './index.html')
          .then((r) => r || caches.match(req))
          .then((r) => r || caches.match('./')))
    );
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const staticCDN  = STATIC_HOSTS.includes(url.hostname);

  // 2) Same-origin statika + statické CDN: stale-while-revalidate
  if (sameOrigin || staticCDN) {
    e.respondWith(
      caches.match(req).then((cached) => {
        const net = fetch(req)
          .then((res) => {
            if (res && (res.status === 200 || res.type === 'opaque')) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || net;
      })
    );
    return;
  }

  // 3) Vše ostatní (Firebase RTDB/Auth, Cloudflare Worker) – neintercepováno
});

// Umožni stránce vynutit aktivaci nové verze SW
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

// ══════════════════════════════════════════════════════
//  WEB PUSH (Session 11, v7.41)
//  Příchozí push → zobraz notifikaci. Klik → zaměř/otevři appku.
//  Payload (z Workeru): { title, body, url, icon, tag }
// ══════════════════════════════════════════════════════
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (_) { data = { body: event.data ? event.data.text() : '' }; }

  const title = data.title || 'FinanceFlow';
  const options = {
    body:    data.body || 'Máš nové oznámení ve FinanceFlow.',
    icon:    data.icon || './icon-192.png',
    badge:   './icon-192.png',
    tag:     data.tag || 'ff-push',
    renotify: !!data.tag,
    data:    { url: data.url || './' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.focus();
          if (url && url !== './' && c.navigate) { try { c.navigate(url); } catch (_) {} }
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
