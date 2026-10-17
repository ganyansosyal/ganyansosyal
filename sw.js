/* GanyanSosyal Service Worker
   Strateji: önce ağ (güncel dosya), yavaşsa/çevrimdışıysa önbellek.
   Firebase SDK dosyaları (sürüm numaralı) önbellekten sunulur.
   Firestore / Auth / diğer API istekleri ellenmez. */
const CACHE = 'ganyansosyal-v4';
const NET_TIMEOUT = 3000;
const SHELL = ['./', 'index.html', 'manifest.json', 'css/style.css',
  'icon-192.png', 'icon-512.png',
  'js/01-core-tjk.js','js/02-notifs.js','js/03-feed.js','js/04-betting.js','js/05-tabs.js',
  'js/06-account.js','js/07-firebase.js','js/08-admin.js','js/09-chat.js','js/10-install-guide.js'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(SHELL.map(async u => {
      try {
        const r = await fetch(new Request(u, {cache: 'reload'}));
        if (r.ok) await c.put(u, r);
      } catch (_) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

const okRes = r => r && (r.ok || r.type === 'opaque');

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Firebase SDK (sürüm numaralı, değişmez): önbellekten
  if (url.hostname === 'www.gstatic.com' && url.pathname.indexOf('/firebasejs/') === 0) {
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (okRes(res)) { const c = await caches.open(CACHE); c.put(req, res.clone()); }
      return res;
    })());
    return;
  }

  if (url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const base = self.location.pathname.replace(/sw\.js$/, '');

    // Ağ isteği: HTTP önbelleğini de atlar, başarılıysa önbelleği günceller
    const network = fetch(req, {cache: 'no-store'}).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    });

    // En fazla NET_TIMEOUT bekle, olmazsa önbelleğe düş
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), NET_TIMEOUT));
    try {
      return await Promise.race([network, timeout]);
    } catch (err) {
      network.catch(() => {});
      const hit = await cache.match(req, {ignoreSearch: true});
      if (hit) return hit;
      if (req.mode === 'navigate') {
        const home = await cache.match(base, {ignoreSearch: true})
                  || await cache.match(base + 'index.html', {ignoreSearch: true});
        if (home) return home;
      }
      return network;
    }
  })());
});
