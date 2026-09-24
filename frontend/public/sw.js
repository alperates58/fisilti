// Fısıltı PWA Service Worker (v1.0.0)
const CACHE_NAME = 'fisilti-cache-v1';

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

const STATIC_ASSETS = [
  appScope,
  `${appScope}manifest.webmanifest`,
  `${appScope}manifest.json`,
  `${appScope}favicon.ico`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((asset) => cache.add(asset).catch(() => null))
      );
    })
  );
  self.skipWaiting();
});

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
  // Yalnızca GET isteklerini ve web isteklerini yakala (WebSocket ve API hariç)
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Kendi scope'umuz dışındaki isteklere ASLA dokunma (ana domain uygulamasını korur)
  if (!url.pathname.startsWith(appScope) && url.pathname !== basePath) return;

  // API veya WebSocket isteklerini es geç
  if (
    url.pathname.startsWith(`${basePath}/api`) ||
    url.pathname.startsWith(`${basePath}/ws`) ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/ws')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match(appScope);
          }
        });
      })
  );
});

// Push Bildirimleri Yakalayıcı
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || 'Fısıltı';
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
