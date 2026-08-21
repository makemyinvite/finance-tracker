/**
 * FinanceFlow Service Worker
 * Enables offline functionality and caching
 */

/* BUMP THIS ON EVERY RELEASE.
   The activate handler already deletes caches whose name differs from the current one — it
   just never fired, because the name was hardcoded and therefore never differed. One
   constant, so the three names cannot drift apart. */
const APP_VERSION = '1.2.0';
const CACHE_NAME = 'financeflow-v' + APP_VERSION;
const STATIC_CACHE = 'financeflow-static-v' + APP_VERSION;
const DYNAMIC_CACHE = 'financeflow-dynamic-v' + APP_VERSION;

// Files to cache immediately on install
const STATIC_ASSETS = [
    './',
    './index.html',
    './login.html',
    './accounts.html',
    './transactions.html',
    './investments.html',
    './emis.html',
    './calculators.html',
    './reports.html',
    './categories.html',
    './settings.html',
    './logs.html',
    './docs.html',
    './css/styles.css',
    './css/animations.css',
    './css/auth.css',
    './css/accounts.css',
    './js/config.js',
    './js/storage.js',
    './js/sheets-api.js',
    './js/app.js',
    './js/auth.js',
    './js/dashboard.js',
    './js/accounts.js',
    './js/transactions.js',
    './js/investments.js',
    './js/emis.js',
    './js/calculators.js',
    './js/reports.js',
    './js/categories.js',
    './js/settings.js',
    './js/animations.js',
    './manifest.json',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png'
];

// External resources to cache
const EXTERNAL_ASSETS = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('[SW] Installing service worker...');

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[SW] Caching static assets...');
                // Cache static assets (ignore failures for missing files)
                return Promise.allSettled(
                    STATIC_ASSETS.map(url =>
                        cache.add(url).catch(err => console.log(`[SW] Failed to cache: ${url}`))
                    )
                );
            })
            .then(() => {
                // Cache external assets separately
                return caches.open(DYNAMIC_CACHE).then(cache => {
                    return Promise.allSettled(
                        EXTERNAL_ASSETS.map(url =>
                            cache.add(url).catch(err => console.log(`[SW] Failed to cache external: ${url}`))
                        )
                    );
                });
            })
            .then(() => {
                console.log('[SW] Installation complete');
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('[SW] Activating service worker...');

    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => {
                            return name.startsWith('financeflow-') &&
                                   name !== STATIC_CACHE &&
                                   name !== DYNAMIC_CACHE;
                        })
                        .map(name => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Activation complete');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip API requests (Google Apps Script) - always go to network
    if (url.hostname === 'script.google.com' ||
        url.hostname === 'script.googleusercontent.com') {
        return;
    }

    // Skip chrome-extension and other non-http protocols
    if (!url.protocol.startsWith('http')) {
        return;
    }

    /* NETWORK-FIRST FOR OUR OWN CODE.
       This used to be cache-first for everything: serve the cached copy, refresh in the
       background. For images that is ideal. For HTML/JS/CSS it means the user always runs
       the PREVIOUS release and a reload just serves the cache again — a permanent
       one-deploy lag, not a staleness window. It is why fix after fix appeared to have no
       effect on the device.
       So code goes to the network first and falls back to the cache, which keeps offline
       working. Everything else stays cache-first, which is what a service worker is for. */
    const isOwnCode = url.origin === self.location.origin &&
        /\.(?:html|js|css)$/i.test(url.pathname);

    if (isOwnCode) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    if (response && response.ok) {
                        const copy = response.clone();
                        event.waitUntil(
                            caches.open(STATIC_CACHE).then(c => c.put(request, copy)).catch(() => {})
                        );
                    }
                    return response;
                })
                // Offline, or the request failed: the cache is the fallback, not the default.
                .catch(() => caches.match(request).then(cached => cached || fetchAndCache(request)))
        );
        return;
    }

    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // Return cached version and update cache in background
                    event.waitUntil(updateCache(request));
                    return cachedResponse;
                }

                // Not in cache - fetch from network
                return fetchAndCache(request);
            })
            .catch(error => {
                console.log('[SW] Fetch failed:', error);

                // Return offline page for navigation requests
                if (request.mode === 'navigate') {
                    return caches.match('./index.html');
                }

                return new Response('Offline', { status: 503 });
            })
    );
});

// Fetch from network and cache the response
async function fetchAndCache(request) {
    try {
        const response = await fetch(request);

        // Only cache successful responses
        if (response.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        console.log('[SW] Network fetch failed:', error);
        throw error;
    }
}

// Update cache in background (stale-while-revalidate)
async function updateCache(request) {
    try {
        const response = await fetch(request);

        if (response.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            await cache.put(request, response);
        }
    } catch (error) {
        // Network failed - that's okay, we have cache
        console.log('[SW] Background update failed:', error);
    }
}

// Handle messages from clients
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.keys().then(names => {
            names.forEach(name => {
                if (name.startsWith('financeflow-')) {
                    caches.delete(name);
                }
            });
        });
    }
});

// Background sync for offline transactions (future enhancement)
self.addEventListener('sync', event => {
    if (event.tag === 'sync-transactions') {
        event.waitUntil(syncOfflineTransactions());
    }
});

async function syncOfflineTransactions() {
    // This would sync any transactions made while offline
    // Implementation depends on IndexedDB storage of offline data
    console.log('[SW] Syncing offline transactions...');
}

// Push notifications (future enhancement)
self.addEventListener('push', event => {
    if (!event.data) return;

    const data = event.data.json();

    const options = {
        body: data.body || 'You have a new notification',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        },
        actions: [
            { action: 'open', title: 'Open' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'FinanceFlow', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    const url = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                // Focus existing window if available
                for (const client of clientList) {
                    if (client.url.includes(url) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Open new window
                return clients.openWindow(url);
            })
    );
});
