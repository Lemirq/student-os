// Service Worker for Student OS Push Notifications
// Version 1.0.0

const CACHE_NAME = "student-os-v1";

// Install event - cache essential assets
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...");

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching essential assets");
      return cache.addAll(["/icon-192.png", "/icon-512.png"]).catch((error) => {
        console.warn("[Service Worker] Cache failed for some assets:", error);
      });
    }),
  );

  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activating...");

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      );
    }),
  );

  // Take control of all pages immediately
  return self.clients.claim();
});

// Push event - display notification
self.addEventListener("push", (event) => {
  console.log("[Service Worker] Push received:", event);

  let notificationData = {
    title: "Student OS",
    body: "You have a new notification",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200],
    requireInteraction: true,
    tag: "default",
    data: {
      url: "/",
    },
  };

  // Parse push data if available
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log("[Service Worker] Push payload:", payload);

      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        vibrate: payload.vibrate || notificationData.vibrate,
        requireInteraction:
          payload.requireInteraction !== undefined
            ? payload.requireInteraction
            : true,
        tag: payload.taskId
          ? `task-${payload.taskId}`
          : payload.tag || notificationData.tag,
        data: {
          taskId: payload.taskId,
          url: payload.url || payload.data?.url || notificationData.data.url,
          ...payload.data,
        },
        // Additional notification options
        actions: payload.actions,
        image: payload.image,
        timestamp: payload.timestamp || Date.now(),
        renotify: payload.taskId ? true : false, // Renotify for task updates
        silent: payload.silent || false,
      };
    } catch (error) {
      console.log("[Service Worker] Not JSON, trying plain text...");
      // Handle plain text (from DevTools test)
      try {
        const text = event.data.text();
        console.log("[Service Worker] Push text:", text);
        notificationData.title = "Test Notification";
        notificationData.body = text;
      } catch (textError) {
        console.error("[Service Worker] Error parsing push data:", error);
        // Use default notification data
      }
    }
  }

  // Display the notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      vibrate: notificationData.vibrate,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      actions: notificationData.actions,
      image: notificationData.image,
      timestamp: notificationData.timestamp,
      renotify: notificationData.renotify,
      silent: notificationData.silent,
    }),
  );
});

// Notification click event - handle user interaction
self.addEventListener("notificationclick", (event) => {
  console.log("[Service Worker] Notification clicked:", event);

  // Close the notification
  event.notification.close();

  // Get the URL to open
  const urlToOpen = event.notification.data?.url || "/";

  // Handle notification actions if any
  if (event.action) {
    console.log("[Service Worker] Action clicked:", event.action);
    // You can handle different actions here
    // For now, we'll just open the URL
  }

  // Focus or open the app
  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          // If app is already open, focus it and navigate
          if (
            client.url.includes(self.registration.scope) &&
            "focus" in client
          ) {
            return client.focus().then((focusedClient) => {
              // Navigate to the URL if possible
              if ("navigate" in focusedClient) {
                return focusedClient.navigate(urlToOpen);
              }
              return focusedClient;
            });
          }
        }

        // If no window is open, open a new one
        if (clients.openWindow) {
          const fullUrl = new URL(urlToOpen, self.location.origin).href;
          return clients.openWindow(fullUrl);
        }
      })
      .catch((error) => {
        console.error(
          "[Service Worker] Error handling notification click:",
          error,
        );
      }),
  );
});

// Notification close event - track dismissals
self.addEventListener("notificationclose", (event) => {
  console.log("[Service Worker] Notification dismissed:", event);

  // You can track notification dismissals here
  // For example, send analytics or update user preferences
  const notificationData = event.notification.data;

  if (notificationData?.taskId) {
    console.log(
      `[Service Worker] Task notification dismissed: ${notificationData.taskId}`,
    );
    // Could send a request to mark notification as dismissed
  }
});

// Message event - communicate with the app
self.addEventListener("message", (event) => {
  console.log("[Service Worker] Message received:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  // Handle other message types
  if (event.data && event.data.type === "GET_VERSION") {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Background sync event - handle offline actions (future enhancement)
self.addEventListener("sync", (event) => {
  console.log("[Service Worker] Background sync:", event.tag);

  if (event.tag === "sync-tasks") {
    event.waitUntil(
      // Handle background sync for tasks
      Promise.resolve(),
    );
  }
});

// Periodic background sync (requires permission, future enhancement)
self.addEventListener("periodicsync", (event) => {
  console.log("[Service Worker] Periodic sync:", event.tag);

  if (event.tag === "update-tasks") {
    event.waitUntil(
      // Handle periodic task updates
      Promise.resolve(),
    );
  }
});

console.log("[Service Worker] Loaded and ready");
