// Service Worker for PWA offline support
const CACHE_NAME = "shopping-list-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/src/css/styles.css",
  "/src/js/config.js",
  "/src/js/sheets.js",
  "/src/js/categories.js",
  "/src/js/voice.js",
  "/src/js/vision.js",
  "/src/js/ui.js",
  "/src/js/app.js",
  "/manifest.json",
];

// Install event - cache resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Opened cache");
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error("Error caching files:", error);
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        });
      })
      .catch(() => {
        // Return offline page if available
        return caches.match("/index.html");
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Background sync for offline operations
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-shopping-list") {
    event.waitUntil(syncShoppingList());
  }
});

async function syncShoppingList() {
  // Get pending operations from IndexedDB
  // This would sync any operations that were queued while offline
  console.log("Syncing shopping list...");

  // Implementation would go here to sync offline changes
  // For now, we'll just log it
}

// Push notification handler (for future enhancement)
self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: "/src/assets/icons/icon-192x192.png",
      badge: "/src/assets/icons/icon-96x96.png",
      vibrate: [200, 100, 200],
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(clients.openWindow("/"));
});
