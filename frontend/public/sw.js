// Aura PWA Service Worker (v2.0.0)
const CACHE_NAME = 'aura-cache-v2';

// Scope URL'sinden dinamik basePath ve varlık kökü tespiti
const getScopePath = () => {
  try {
    if (self.registration && self.registration.scope) {
      const scopeUrl = new URL(self.registration.scope);
      return scopeUrl.pathname.replace(/\/+$/, '');
    }
  } catch (e) {
    // fallback
  }
  return '';
};

const basePath = getScopePath();
const appScope = basePath ? `${basePath}/` : '/';

// 4. Install aşamasında KESİNLİKLE ağ isteği (cache.add/addAll vb.) yapılmaz.
// Bu sayede HTTP Basic Auth arkasında hiçbir precache challenge/401 oluşmaz.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 6. Activate aşamasında eski sürüm cache'leri temizle ve anında istemcileri devral
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Sadece GET isteklerini değerlendir
  if (event.request.method !== 'GET') return;

  // 2. Navigation isteklerini yerel tarayıcı pipeline'ına bırak (Basic Auth ve tam sayfa geçişleri için kritik)
  if (event.request.mode === 'navigate') return;

  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return;
  }

  // Kendi scope'umuz dışındaki isteklere ASLA dokunma
  if (!url.pathname.startsWith(appScope) && url.pathname !== basePath) return;

  // 1. Next.js RSC (React Server Components) isteklerini tamamen bypass et (_rsc query parametresi)
  // Bu istekler worker context'inde fetch edilirse Basic Auth credential'ları kaybolur ve 401 oluşur.
  if (url.searchParams.has('_rsc')) return;

  // 2. API ve WebSocket uç noktalarını Service Worker'dan tamamen bypass et
  if (
    url.pathname.startsWith(`${basePath}/api`) ||
    url.pathname.startsWith(`${basePath}/ws`) ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/ws')
  ) {
    return;
  }

  // 5. Web Manifest isteklerini worker'dan geçirme (tarayıcı use-credentials ile yönetsin)
  if (url.pathname.endsWith('/manifest.json') || url.pathname.endsWith('/manifest.webmanifest')) {
    return;
  }

  // 3. Yalnızca GÜVENLİ STATİK ASSET tiplerini yakala: script, style, image, font
  // Genel GET proxy/cache MANTIĞI KULLANILMAZ; programatik fetch/XHR istekleri doğrudan tarayıcıya bırakılır.
  const destination = event.request.destination;
  const isStaticDestination =
    destination === 'script' ||
    destination === 'style' ||
    destination === 'image' ||
    destination === 'font';

  const isStaticExtension = /\.(?:js|mjs|css|png|jpe?g|gif|svg|ico|webp|avif|woff2?|ttf|eot|otf)$/i.test(
    url.pathname
  );
  const isNextStatic = url.pathname.includes('/_next/static/');

  // Güvenli bir statik asset değilse (HTML, JSON, RSC, data fetch vb.), SW'den tamamen bypass et
  if (!isStaticDestination && !isStaticExtension && !isNextStatic) {
    return;
  }

  // Güvenli statik assetler için Cache-First stratejisi (bulunamazsa network'ten çekip cache'e koy)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request);
        });
    })
  );
});

// 7. Push Bildirimleri Yakalayıcı (Mevcut davranış aynen korunur)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || 'Aura';
    const options = {
      body: data.body || 'Yeni bir mesajınız var.',
      icon: data.icon || `${appScope}favicon.ico`,
      badge: data.badge || `${appScope}favicon.ico`,
      data: { url: data.url || appScope },
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Service Worker Push Hatası:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || appScope;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
