"use server";

import { db } from "@/drizzle";
import { pushSubscriptions } from "@/schema";
import { createClient } from "@/utils/supabase/server";
import { eq, and } from "drizzle-orm";
import webpush from "web-push";
import { z } from "zod";

// Configure web-push with VAPID details
const vapidDetails = {
  subject: "mailto:sharmavihaan190@gmail.com",
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  privateKey: process.env.VAPID_PRIVATE_KEY!,
};

// Validate VAPID keys are configured
if (!vapidDetails.publicKey || !vapidDetails.privateKey) {
  console.warn("VAPID keys not configured. Push notifications will not work.");
} else {
  webpush.setVapidDetails(
    vapidDetails.subject,
    vapidDetails.publicKey,
    vapidDetails.privateKey,
  );
}

// Zod schema for push subscription validation
const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

export type PushSubscriptionJSON = z.infer<typeof pushSubscriptionSchema>;

/**
 * Create or update the authenticated user's push subscription.
 *
 * @param subscription - Push subscription data containing `endpoint` and `keys` (`p256dh`, `auth`)
 * @returns `success: true` if the subscription was created or updated, `false` otherwise. When `false`, `error` contains a short failure message.
 */
export async function subscribeToPush(
  subscription: PushSubscriptionJSON,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Unauthorized");
    }

    // Validate subscription data
    const validated = pushSubscriptionSchema.parse(subscription);

    // Check if subscription already exists for this user and endpoint
    const existingSubscription = await db.query.pushSubscriptions.findFirst({
      where: and(
        eq(pushSubscriptions.userId, user.id),
        eq(pushSubscriptions.endpoint, validated.endpoint),
      ),
    });

    if (existingSubscription) {
      // Update existing subscription
      await db
        .update(pushSubscriptions)
        .set({
          p256dh: validated.keys.p256dh,
          auth: validated.keys.auth,
        })
        .where(eq(pushSubscriptions.id, existingSubscription.id));
    } else {
      // Insert new subscription
      await db.insert(pushSubscriptions).values({
        userId: user.id,
        endpoint: validated.endpoint,
        p256dh: validated.keys.p256dh,
        auth: validated.keys.auth,
      });
    }

    // Invalidate cache for push subscriptions table
    await db.$cache.invalidate({ tables: [pushSubscriptions] });

    return { success: true };
  } catch (error) {
    console.error("Failed to subscribe to push notifications:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send a push notification to all subscriptions for a user and remove subscriptions that have expired.
 *
 * @param userId - ID of the user whose subscriptions will receive the notification
 * @param payload - Notification payload
 * @param payload.title - Notification title
 * @param payload.body - Notification body
 * @param payload.icon - Optional URL to an icon image
 * @param payload.badge - Optional URL to a badge image
 * @param payload.data - Optional arbitrary metadata delivered with the notification
 * @returns An object with `success` indicating overall operation success, `sentCount` for notifications delivered, and `failedCount` for notifications that failed
 */
export async function sendPushToUser(
  userId: string,
  payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: Record<string, unknown>;
  },
): Promise<{ success: boolean; sentCount: number; failedCount: number }> {
  try {
    // Fetch all subscriptions for the user
    const subscriptions = await db.query.pushSubscriptions.findMany({
      where: eq(pushSubscriptions.userId, userId),
    });

    if (subscriptions.length === 0) {
      return { success: true, sentCount: 0, failedCount: 0 };
    }

    let sentCount = 0;
    let failedCount = 0;
    const expiredSubscriptions: string[] = [];

    // Send push notification to each subscription
    const pushPromises = subscriptions.map(async (subscription) => {
      try {
        const pushSubscription: webpush.PushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        };

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(payload),
        );
        sentCount++;
      } catch (error) {
        failedCount++;
        // Check if error is 410 (Gone) - subscription expired
        if (error && typeof error === "object" && "statusCode" in error) {
          const statusCode = (error as { statusCode: number }).statusCode;
          if (statusCode === 410) {
            expiredSubscriptions.push(subscription.id);
          }
        }
        console.error(
          `Failed to send push to ${subscription.endpoint}:`,
          error,
        );
      }
    });

    await Promise.all(pushPromises);

    // Delete expired subscriptions
    if (expiredSubscriptions.length > 0) {
      for (const id of expiredSubscriptions) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id));
      }

      // Invalidate cache for push subscriptions table
      await db.$cache.invalidate({ tables: [pushSubscriptions] });

      console.log(
        `Deleted ${expiredSubscriptions.length} expired subscriptions`,
      );
    }

    return {
      success: true,
      sentCount,
      failedCount,
    };
  } catch (error) {
    console.error("Failed to send push notifications:", error);
    return {
      success: false,
      sentCount: 0,
      failedCount: 0,
    };
  }
}

/**
 * Remove a push subscription for the authenticated user.
 *
 * @param endpoint - The push subscription endpoint URL to delete
 * @returns `{ success: true }` on success; `{ success: false, error }` on failure where `error` is the failure message
 */
export async function unsubscribeFromPush(
  endpoint: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Unauthorized");
    }

    // Delete the subscription
    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, user.id),
          eq(pushSubscriptions.endpoint, endpoint),
        ),
      );

    // Invalidate cache for push subscriptions table
    await db.$cache.invalidate({ tables: [pushSubscriptions] });

    return { success: true };
  } catch (error) {
    console.error("Failed to unsubscribe from push notifications:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Retrieve all push subscriptions belonging to the authenticated user.
 *
 * @returns An object containing a `success` flag, a `subscriptions` array with entries `{ id, endpoint, createdAt }`, and an optional `error` message when `success` is `false`.
 * @throws Throws an `Error` with message `"Unauthorized"` when no authenticated user is available.
 */
export async function getUserPushSubscriptions(): Promise<{
  success: boolean;
  subscriptions: Array<{
    id: string;
    endpoint: string;
    createdAt: Date | null;
  }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Unauthorized");
    }

    const subscriptions = await db.query.pushSubscriptions.findMany({
      where: eq(pushSubscriptions.userId, user.id),
      columns: {
        id: true,
        endpoint: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      subscriptions,
    };
  } catch (error) {
    console.error("Failed to get push subscriptions:", error);
    return {
      success: false,
      subscriptions: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}