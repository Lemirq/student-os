"use client";

import { useEffect, useState } from "react";
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
 * Invisible component that automatically checks for existing push subscription
 * and registers service worker. Does NOT automatically subscribe - subscription
 * requires user interaction (button click) to avoid browser throttling.
 *
 * Note: On iOS, notifications only work when the app is installed as a PWA
 */
export const PushNotificationSetup = (): null => {
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    const setupServiceWorker = async () => {
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
          await navigator.serviceWorker.ready;
          console.log("✅ Service Worker is ready");

          setIsRegistered(true);

          // Check for existing subscription
          const existingSubscription =
            await registration.pushManager.getSubscription();

          if (existingSubscription) {
            console.log(
              "✅ Found existing push subscription:",
              existingSubscription.endpoint,
            );

            // Verify subscription is still valid by sending to server
            const result = await subscribeToPush(
              JSON.parse(JSON.stringify(existingSubscription)),
            );

            if (!result.success) {
              console.error(
                "❌ Failed to verify existing subscription:",
                result.error,
              );
            } else {
              console.log("✅ Existing subscription verified");
            }
          } else {
            console.log(
              "ℹ️ No existing subscription found. User needs to enable notifications in settings.",
            );
          }
        }
      } catch (error) {
        console.error("❌ Error setting up service worker:", error);
      }
    };

    setupServiceWorker();
  }, []);

  return null;
};
