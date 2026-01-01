/**
 * Script to test push subscription in browser console
 *
 * Run this in the browser console on your deployed site to diagnose
 * why push subscriptions are hanging.
 *
 * Usage:
 * 1. Open browser console on https://studentos.vhaan.me
 * 2. Copy and paste this entire script
 * 3. Run: testPushSubscription()
 */

async function testPushSubscription() {
  console.log("=== Push Subscription Diagnostic Test ===\n");

  try {
    // Step 1: Check browser support
    console.log("1. Checking browser support...");
    if (!("serviceWorker" in navigator)) {
      console.error("❌ Service Worker not supported");
      return;
    }
    if (!("PushManager" in window)) {
      console.error("❌ Push Manager not supported");
      return;
    }
    console.log("✅ Browser supports push notifications\n");

    // Step 2: Check notification permission
    console.log("2. Checking notification permission...");
    console.log("Current permission:", Notification.permission);
    if (Notification.permission !== "granted") {
      console.log("Requesting permission...");
      const permission = await Notification.requestPermission();
      console.log("Permission result:", permission);
      if (permission !== "granted") {
        console.error("❌ Permission denied");
        return;
      }
    }
    console.log("✅ Notification permission granted\n");

    // Step 3: Check service worker
    console.log("3. Checking service worker...");
    const registration = await navigator.serviceWorker.ready;
    console.log("✅ Service worker ready");
    console.log("  - Scope:", registration.scope);
    console.log("  - Active:", !!registration.active);
    console.log("  - Installing:", !!registration.installing);
    console.log("  - Waiting:", !!registration.waiting);
    console.log("");

    // Step 4: Check existing subscription
    console.log("4. Checking for existing subscription...");
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      console.log("✅ Found existing subscription");
      console.log("  - Endpoint:", existing.endpoint);
      console.log(
        "  - Keys:",
        !!existing.getKey("p256dh"),
        !!existing.getKey("auth"),
      );
    } else {
      console.log("ℹ️ No existing subscription");
    }
    console.log("");

    // Step 5: Get VAPID key
    console.log("5. Checking VAPID public key...");
    const vapidKey =
      "BKjDtU7tktJC2WO9mvk9l4SXPTcSLC5PZZzWrF8DZkl0-Nh8eBewAyB549HEvCaxMIRobFVD4Pf5tAkJ38Ain94";
    console.log("  - Length:", vapidKey.length);
    console.log("  - First 20 chars:", vapidKey.substring(0, 20));

    // Convert to Uint8Array
    const padding = "=".repeat((4 - (vapidKey.length % 4)) % 4);
    const base64 = (vapidKey + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const applicationServerKey = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      applicationServerKey[i] = rawData.charCodeAt(i);
    }
    console.log("  - Converted length:", applicationServerKey.length);
    console.log("✅ VAPID key converted\n");

    // Step 6: Check permission state
    console.log("6. Checking push permission state...");
    const permissionState = await registration.pushManager.permissionState({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey,
    });
    console.log("  - Permission state:", permissionState);
    if (permissionState !== "granted") {
      console.error("❌ Push permission state not granted:", permissionState);
      return;
    }
    console.log("✅ Push permission state is granted\n");

    // Step 7: Attempt subscription with timeout
    console.log("7. Attempting push subscription...");
    console.log(
      "   (This is where it usually hangs - waiting 30 seconds max)\n",
    );

    const subscriptionPromise = registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey,
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Timeout after 30 seconds")), 30000);
    });

    const startTime = Date.now();
    try {
      const subscription = (await Promise.race([
        subscriptionPromise,
        timeoutPromise,
      ])) as PushSubscription;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`✅ Subscription successful! (took ${elapsed}s)`);
      console.log("  - Endpoint:", subscription.endpoint);
      console.log(
        "  - Keys present:",
        !!subscription.getKey("p256dh"),
        !!subscription.getKey("auth"),
      );

      return subscription;
    } catch (error) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(`❌ Subscription failed after ${elapsed}s:`, error);

      // Additional diagnostics
      console.log("\n=== Additional Diagnostics ===");
      console.log("Network online:", navigator.onLine);
      console.log("User agent:", navigator.userAgent);
      console.log("\nPossible causes:");
      console.log("1. Network/firewall blocking FCM (fcm.googleapis.com)");
      console.log("2. Invalid VAPID key on server");
      console.log("3. Browser security settings blocking push");
      console.log("4. Proxy/VPN interfering with FCM connection");

      throw error;
    }
  } catch (error) {
    console.error("\n=== Test Failed ===");
    console.error(error);
  }
}

// Make function available globally
(window as any).testPushSubscription = testPushSubscription;

console.log("Diagnostic script loaded. Run: testPushSubscription()");
