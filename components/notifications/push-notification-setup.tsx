"use client";

import { useEffect } from "react";
import { subscribeToPush } from "@/actions/notifications";

/**
 * Convert a URL-safe base64-encoded VAPID public key into a Uint8Array suitable for Web Push subscription.
 *
 * @param base64String - The URL-safe base64-encoded VAPID public key (may use '-' and '_' padding).
 * @returns The decoded key as a Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Invisible component that automatically requests notification permission,
 * registers service worker, and subscribes to push notifications
 *
 * Note: On iOS, notifications only work when the app is installed as a PWA
 */
export const PushNotificationSetup = (): null => {
  useEffect(() => {
    const setupPushNotifications = async () => {
      // Check if notifications are supported
      if (typeof window === "undefined" || !("Notification" in window)) {
        console.log("Notifications not supported in this browser");
        return;
      }

      // Check if running as installed PWA (required for iOS)
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;

      const isIOS = /iphone|ipad|ipod/.test(
        window.navigator.userAgent.toLowerCase(),
      );

      if (isIOS && !isStandalone) {
        console.log(
          "iOS device detected - notifications require PWA installation. Please add to home screen first.",
        );
        return;
      }

      console.log("Current notification permission:", Notification.permission);

      // Request permission if not already determined
      if (Notification.permission === "default") {
        console.log("Requesting notification permission...");
        const permission = await Notification.requestPermission();
        console.log("Permission result:", permission);

        if (permission !== "granted") {
          console.log("Notification permission denied");
          return;
        }
      } else if (Notification.permission !== "granted") {
        console.log("Notification permission was previously denied");
        return;
      }

      try {
        // Register service worker
        if ("serviceWorker" in navigator) {
          console.log("Registering service worker...");
          const registration = await navigator.serviceWorker.register(
            "/sw.js",
            {
              scope: "/",
              updateViaCache: "none",
            },
          );

          console.log("✅ Service Worker registered successfully");

          // Wait for service worker to be ready
          const swRegistration = await navigator.serviceWorker.ready;
          console.log("Service Worker is ready");

          // Get VAPID public key from environment
          const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

          if (!vapidPublicKey) {
            console.error("❌ VAPID public key not configured");
            return;
          }

          console.log("VAPID public key found, subscribing to push...");

          try {
            // Check for existing subscription first
            const existingSubscription =
              await swRegistration.pushManager.getSubscription();

            if (existingSubscription) {
              console.log(
                "Found existing subscription:",
                existingSubscription.endpoint,
              );

              // Send existing subscription to server
              const result = await subscribeToPush(
                JSON.parse(JSON.stringify(existingSubscription)),
              );

              if (!result.success) {
                console.error(
                  "❌ Failed to save existing subscription:",
                  result.error,
                );
                return;
              }

              console.log(
                "✅ Push notifications registered successfully (existing)",
              );
              return;
            }

            // Check permission state
            const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
            const permissionState =
              await swRegistration.pushManager.permissionState({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey as BufferSource,
              });
            console.log("Push permission state:", permissionState);

            if (permissionState !== "granted") {
              console.error(
                "❌ Push permission not granted, state:",
                permissionState,
              );
              return;
            }

            // Subscribe to push notifications
            console.log(
              "Application server key length:",
              applicationServerKey.length,
            );
            console.log("Attempting to subscribe to push manager...");

            // Don't await - let it complete in background
            console.log("🔄 Starting push subscription (non-blocking)...");

            // Add a timeout to detect if subscription hangs
            const subscriptionTimeout = setTimeout(() => {
              console.warn(
                "⚠️ Push subscription taking longer than 60 seconds...",
              );
              console.warn("This usually indicates:");
              console.warn(
                "  1. Browser extension interference (check for injected.js errors)",
              );
              console.warn("  2. Network/firewall blocking push service");
              console.warn("  3. Browser push service issues");
              console.warn(
                "Try: incognito mode, different browser, or disable extensions",
              );
            }, 60000);

            swRegistration.pushManager
              .subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey as BufferSource,
              })
              .then(async (subscription) => {
                clearTimeout(subscriptionTimeout);
                console.log(
                  "✅ Push subscription created:",
                  subscription.endpoint,
                );

                // Send subscription to server
                const result = await subscribeToPush(
                  JSON.parse(JSON.stringify(subscription)),
                );

                if (!result.success) {
                  console.error(
                    "❌ Failed to save subscription to server:",
                    result.error,
                  );
                  return;
                }

                console.log(
                  "✅ Push notifications registered successfully (saved to DB)",
                );
              })
              .catch((subscribeError) => {
                clearTimeout(subscriptionTimeout);
                console.error("❌ Push subscription FAILED:", subscribeError);

                // Log detailed error information
                if (subscribeError instanceof Error) {
                  console.error("Error type:", subscribeError.name);
                  console.error("Error message:", subscribeError.message);
                  console.error("Error stack:", subscribeError.stack);
                }

                // Check for specific error types
                if (subscribeError instanceof DOMException) {
                  console.error("DOMException code:", subscribeError.code);
                  console.error("DOMException name:", subscribeError.name);
                }

                console.log("💡 If you see this error repeatedly:");
                console.log("1. Try in incognito/private browsing mode");
                console.log("2. Disable all browser extensions");
                console.log(
                  "3. Check browser console for extension errors (injected.js)",
                );
              });

            // Return immediately - subscription continues in background
            console.log(
              "⏳ Push subscription request sent - waiting for browser response...",
            );
            console.log(
              "   This may take 10-30 seconds depending on browser/network",
            );
            console.log(
              "   If stuck here, check for browser extension errors above (injected.js)",
            );
            return;
          } catch (subError) {
            console.error("❌ Error in push subscription setup:", subError);
          }
        }
      } catch (error) {
        console.error("❌ Error setting up push notifications:", error);
      }
    };

    setupPushNotifications();
  }, []);

  return null;
};
