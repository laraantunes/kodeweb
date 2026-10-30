const CACHE_NAME = 'kodeweb-pwa-cache-v4';

self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') {
        return;
    }

    const url = new URL(e.request.url);

    // Ignore cross-origin requests (e.g. CDN scripts) to avoid Tracking Prevention storage blocks
    if (url.origin !== self.location.origin) {
        return;
    }

    // Let navigation requests (index.php, login.php, redirects), API calls, and manifest.json go directly to the network
    if (
        e.request.mode === 'navigate' ||
        url.pathname.endsWith('.php') ||
        url.pathname.endsWith('/') ||
        url.pathname.endsWith('manifest.json') ||
        url.pathname.includes('/api/') ||
        url.search.includes('action=')
    ) {
        return;
    }

    e.respondWith(
        fetch(e.request)
            .then((response) => {
                if (response && response.status === 200 && response.type === 'basic' && !response.redirected) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(e.request, responseClone);
                    }).catch(() => {});
                }
                return response;
            })
            .catch(async () => {
                const cached = await caches.match(e.request);
                return cached || Response.error();
            })
    );
});
