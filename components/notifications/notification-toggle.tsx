"use client";

import { useState, useEffect } from "react";
import { subscribeToPush, unsubscribeFromPush } from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Convert a URL-safe base64-encoded VAPID public key into a Uint8Array suitable for Web Push subscription.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const NotificationToggle = (): React.ReactElement => {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    ) {
      setIsSupported(true);
      console.log("NotificationToggle: Push notifications supported");
      console.log("NotificationToggle: User agent:", navigator.userAgent);

      // Detect problematic browsers
      const isHelium = /Helium/i.test(navigator.userAgent);
      if (isHelium) {
        console.warn(
          "NotificationToggle: ⚠️ Helium browser detected - push notifications may not work",
        );
      }

      checkSubscription();
    } else {
      console.log("NotificationToggle: Push notifications NOT supported");
      console.log(
        "NotificationToggle: serviceWorker:",
        "serviceWorker" in navigator,
      );
      console.log("NotificationToggle: PushManager:", "PushManager" in window);
    }
  }, []);

  async function checkSubscription() {
    try {
      console.log("NotificationToggle: Checking for existing subscription...");
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();

      if (sub) {
        console.log(
          "NotificationToggle: Found existing subscription:",
          sub.endpoint,
        );
      } else {
        console.log("NotificationToggle: No existing subscription found");
      }

      setSubscription(sub);
    } catch (error) {
      console.error("NotificationToggle: Error checking subscription:", error);
    }
  }

  async function subscribeToPushNotifications() {
    console.log("NotificationToggle: Subscribe button clicked");
    setIsLoading(true);

    let progressInterval: NodeJS.Timeout | undefined;

    try {
      console.log("NotificationToggle: Requesting notification permission...");

      // Request permission
      const permission = await Notification.requestPermission();
      console.log("NotificationToggle: Permission result:", permission);

      if (permission !== "granted") {
        console.error("NotificationToggle: Permission denied");
        toast.error("Notification permission denied");
        return;
      }

      console.log("NotificationToggle: Getting service worker registration...");

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      console.log("NotificationToggle: Service worker ready");
      console.log(
        "NotificationToggle: Service worker scope:",
        registration.scope,
      );
      console.log(
        "NotificationToggle: Service worker active:",
        !!registration.active,
      );

      // Get VAPID public key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      console.log("NotificationToggle: VAPID key present:", !!vapidPublicKey);
      console.log(
        "NotificationToggle: VAPID key (first 20 chars):",
        vapidPublicKey?.substring(0, 20),
      );
      console.log(
        "NotificationToggle: VAPID key length:",
        vapidPublicKey?.length,
      );

      if (!vapidPublicKey) {
        console.error("NotificationToggle: VAPID key not configured");
        toast.error("VAPID key not configured");
        return;
      }

      if (vapidPublicKey.length !== 87 && vapidPublicKey.length !== 88) {
        console.error(
          "NotificationToggle: VAPID key has invalid length. Expected 87-88, got:",
          vapidPublicKey.length,
        );
        toast.error("Invalid VAPID key format");
        return;
      }

      console.log("NotificationToggle: Converting VAPID key...");
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      console.log(
        "NotificationToggle: Key length:",
        applicationServerKey.length,
      );

      console.log("NotificationToggle: Subscribing to push manager...");
      console.log("NotificationToggle: Creating subscription promise...");

      // Add timeout to detect hanging subscription
      const subscriptionPromise = registration.pushManager
        .subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as BufferSource,
        })
        .then((sub) => {
          console.log(
            "NotificationToggle: 🎉 pushManager.subscribe() resolved!",
          );
          console.log("NotificationToggle: Subscription object:", sub);
          console.log("NotificationToggle: Subscription type:", typeof sub);
          console.log("NotificationToggle: Has endpoint:", !!sub?.endpoint);

          if (sub?.endpoint) {
            console.log(
              "NotificationToggle: Subscription endpoint:",
              sub.endpoint,
            );
          } else {
            console.error(
              "NotificationToggle: ⚠️ Subscription resolved but has no endpoint!",
            );
          }

          return sub;
        })
        .catch((error) => {
          console.error(
            "NotificationToggle: ❌ pushManager.subscribe() rejected!",
          );
          console.error("NotificationToggle: Error type:", error.name);
          console.error("NotificationToggle: Error message:", error.message);
          console.error("NotificationToggle: Full error:", error);
          throw error;
        });

      const timeoutPromise = new Promise<PushSubscription>((_, reject) => {
        setTimeout(() => {
          console.error("NotificationToggle: ⏰ 15-second timeout reached!");
          console.error(
            "NotificationToggle: pushManager.subscribe() never resolved or rejected",
          );
          console.error(
            "NotificationToggle: This indicates the browser's push service is not responding",
          );

          // Check if it's a known problematic browser
          const isHelium = /Helium/i.test(navigator.userAgent);
          if (isHelium) {
            console.error(
              "NotificationToggle: Helium browser does not support web push notifications",
            );
            reject(
              new Error(
                "Push notifications are not supported in Helium browser. Please use Chrome, Safari, or Firefox.",
              ),
            );
          } else {
            reject(
              new Error(
                "Subscription timed out after 15 seconds. This usually indicates a network issue or browser incompatibility.",
              ),
            );
          }
        }, 15000);
      });

      // Add periodic progress updates
      progressInterval = setInterval(() => {
        console.log(
          "NotificationToggle: ⏳ Still waiting for pushManager.subscribe()...",
        );
      }, 5000);

      console.log("NotificationToggle: Racing subscription vs timeout...");

      // Race between subscription and timeout
      const sub = await Promise.race([subscriptionPromise, timeoutPromise]);

      // Clear progress updates
      clearInterval(progressInterval);

      console.log("NotificationToggle: Race winner returned:", typeof sub, sub);

      // Validate subscription object
      if (!sub) {
        throw new Error("Subscription returned null or undefined");
      }

      if (!sub.endpoint) {
        console.error(
          "NotificationToggle: Subscription missing endpoint:",
          sub,
        );
        throw new Error("Subscription object is missing endpoint property");
      }

      console.log(
        "NotificationToggle: ✅ Race completed, subscription created:",
        sub.endpoint,
      );

      // Save to database
      console.log("NotificationToggle: Saving subscription to database...");
      const serializedSub = JSON.parse(JSON.stringify(sub));
      const result = await subscribeToPush(serializedSub);

      if (!result.success) {
        console.error(
          "NotificationToggle: Failed to save subscription:",
          result.error,
        );
        toast.error(`Failed to save subscription: ${result.error}`);
        return;
      }

      console.log("NotificationToggle: ✅ Subscription saved to database");
      setSubscription(sub);
      toast.success("Push notifications enabled!");
    } catch (error) {
      // Clear progress interval if it was started
      if (progressInterval) {
        clearInterval(progressInterval);
      }

      console.error("NotificationToggle: Error subscribing to push:", error);

      // Show detailed error message
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to enable notifications: ${errorMessage}`);
    } finally {
      console.log("NotificationToggle: Setting loading to false");
      setIsLoading(false);
    }
  }

  async function unsubscribeFromPushNotifications() {
    console.log("NotificationToggle: Unsubscribe button clicked");
    setIsLoading(true);

    try {
      if (subscription) {
        console.log("NotificationToggle: Unsubscribing from push manager...");
        await subscription.unsubscribe();

        console.log(
          "NotificationToggle: Removing subscription from database...",
        );
        const result = await unsubscribeFromPush(subscription.endpoint);

        if (!result.success) {
          console.error(
            "NotificationToggle: Failed to remove from database:",
            result.error,
          );
          toast.error(`Failed to remove subscription: ${result.error}`);
          return;
        }

        console.log("NotificationToggle: ✅ Successfully unsubscribed");
        setSubscription(null);
        toast.success("Push notifications disabled");
      }
    } catch (error) {
      console.error("NotificationToggle: Error unsubscribing:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to disable notifications: ${errorMessage}`);
    } finally {
      console.log("NotificationToggle: Setting loading to false");
      setIsLoading(false);
    }
  }

  if (!isSupported) {
    return (
      <div className="text-sm text-muted-foreground">
        Push notifications are not supported in this browser
      </div>
    );
  }

  // Check for known problematic browsers
  const isHelium =
    typeof navigator !== "undefined" && /Helium/i.test(navigator.userAgent);

  return (
    <div className="space-y-4">
      {isHelium && (
        <div className="text-xs text-amber-600 dark:text-amber-500">
          ⚠️ Helium browser has limited push notification support. For best
          experience, use Chrome, Safari, or Firefox.
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="text-sm font-medium">Push Notifications</div>
          <div className="text-xs text-muted-foreground">
            Get notified about upcoming deadlines
          </div>
        </div>
        {subscription ? (
          <Button
            variant="outline"
            size="sm"
            onClick={unsubscribeFromPushNotifications}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <BellOff className="mr-2 h-4 w-4" />
            )}
            Disable
          </Button>
        ) : (
          <Button
            onClick={subscribeToPushNotifications}
            disabled={isLoading}
            size="sm"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Bell className="mr-2 h-4 w-4" />
            )}
            Enable
          </Button>
        )}
      </div>
    </div>
  );
};
