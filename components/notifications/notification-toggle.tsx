"use client";

import { useState, useEffect } from "react";
import { subscribeToPush, unsubscribeFromPush } from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

/**
 * Convert a URL-safe base64-encoded VAPID public key into a Uint8Array suitable for Web Push subscription.
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
      checkSubscription();
    }
  }, []);

  async function checkSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub);
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  }

  async function subscribeToPushNotifications() {
    setIsLoading(true);
    try {
      // Request permission
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        toast.error("Notification permission denied");
        setIsLoading(false);
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        toast.error("VAPID key not configured");
        setIsLoading(false);
        return;
      }

      // Subscribe to push notifications (with user interaction - no hanging!)
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          vapidPublicKey,
        ) as BufferSource,
      });

      // Save to database
      const serializedSub = JSON.parse(JSON.stringify(sub));
      const result = await subscribeToPush(serializedSub);

      if (!result.success) {
        toast.error("Failed to save subscription");
        setIsLoading(false);
        return;
      }

      setSubscription(sub);
      toast.success("Push notifications enabled!");
    } catch (error) {
      console.error("Error subscribing to push:", error);
      toast.error("Failed to enable notifications");
    } finally {
      setIsLoading(false);
    }
  }

  async function unsubscribeFromPushNotifications() {
    setIsLoading(true);
    try {
      if (subscription) {
        await subscription.unsubscribe();
        await unsubscribeFromPush(subscription.endpoint);
        setSubscription(null);
        toast.success("Push notifications disabled");
      }
    } catch (error) {
      console.error("Error unsubscribing:", error);
      toast.error("Failed to disable notifications");
    } finally {
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

  return (
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
          <BellOff className="mr-2 h-4 w-4" />
          Disable
        </Button>
      ) : (
        <Button
          onClick={subscribeToPushNotifications}
          disabled={isLoading}
          size="sm"
        >
          <Bell className="mr-2 h-4 w-4" />
          Enable
        </Button>
      )}
    </div>
  );
};
