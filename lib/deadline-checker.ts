import { db } from "@/drizzle";
import { tasks, sentNotifications } from "@/schema";
import { sendPushToUser } from "@/actions/notifications";
import { and, eq, gte, lt, ne, lte, inArray } from "drizzle-orm";
import { format, addHours } from "date-fns";
import { hasTime } from "./date-parser";

/**
 * Notification windows for deadline reminders
 */
const NOTIFICATION_WINDOWS = [
  {
    type: "24h",
    minHours: 23,
    maxHours: 25,
    emoji: "📚",
    label: "Due Tomorrow",
  },
  { type: "6h", minHours: 5, maxHours: 7, emoji: "⏰", label: "Due Soon" },
  {
    type: "1h",
    minHours: 0.5,
    maxHours: 1.5,
    emoji: "🔴",
    label: "Due Very Soon",
  },
] as const;

type NotificationType = (typeof NOTIFICATION_WINDOWS)[number]["type"];

/**
 * Stats returned by checkAndNotifyDeadlines
 */
export type DeadlineCheckStats = {
  totalTasks: number;
  sent: number;
  failed: number;
  skipped: number;
};

/**
 * Checks for tasks with upcoming deadlines and sends push notifications to users.
 * Notifications are sent at 24 hours, 6 hours, and 1 hour before the deadline.
 * Each notification type is only sent once per task (tracked in sent_notifications table).
 * Only incomplete tasks (status != "Done") receive notifications.
 *
 * @returns Statistics about the notification process
 */
export async function checkAndNotifyDeadlines(): Promise<DeadlineCheckStats> {
  const stats: DeadlineCheckStats = {
    totalTasks: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
  };

  try {
    const now = new Date();

    console.log(`Checking for deadlines at ${now.toISOString()}`);

    // Query all incomplete tasks with due dates in the future (up to 25 hours out)
    const maxWindow = addHours(now, 25);
    const dueTasks = await db.query.tasks.findMany({
      where: and(
        gte(tasks.dueDate, now),
        lte(tasks.dueDate, maxWindow),
        ne(tasks.status, "Done"),
      ),
      with: {
        course: true,
      },
    });

    if (dueTasks.length === 0) {
      console.log("No tasks with upcoming deadlines found");
      return stats;
    }

    stats.totalTasks = dueTasks.length;
    console.log(`Found ${stats.totalTasks} tasks with upcoming deadlines`);

    // Get all task IDs to check for already-sent notifications
    const taskIds = dueTasks.map((t) => t.id);

    // Query existing sent notifications for these tasks
    const existingSentNotifications = await db.query.sentNotifications.findMany(
      {
        where: inArray(sentNotifications.taskId, taskIds),
      },
    );

    // Create a Set for quick lookup: "taskId:notificationType"
    const sentNotificationKeys = new Set(
      existingSentNotifications.map(
        (sn) => `${sn.taskId}:${sn.notificationType}`,
      ),
    );

    // Process each task
    for (const task of dueTasks) {
      if (!task.dueDate) continue;

      const dueDate = new Date(task.dueDate);
      const hoursUntilDue =
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Find which notification window this task falls into
      const window = NOTIFICATION_WINDOWS.find(
        (w) => hoursUntilDue >= w.minHours && hoursUntilDue <= w.maxHours,
      );

      if (!window) {
        // Task is not in any notification window
        continue;
      }

      const notificationKey = `${task.id}:${window.type}`;

      // Check if we already sent this notification
      if (sentNotificationKeys.has(notificationKey)) {
        stats.skipped++;
        console.log(
          `⏭ Skipping "${task.title}" - ${window.type} notification already sent`,
        );
        continue;
      }

      try {
        const includeTime = hasTime(dueDate);
        const dueDateStr = includeTime
          ? format(dueDate, "MMM d, yyyy 'at' h:mm a")
          : format(dueDate, "MMM d, yyyy");

        const courseCode = task.course?.code || "No course";
        const courseName = task.course?.name || "";

        let body = courseCode;
        if (courseName) {
          body += ` - ${courseName}`;
        }
        body += `\nDue: ${dueDateStr}`;

        const title = `${window.emoji} ${window.label}: ${task.title}`;

        // Send push notification
        const result = await sendPushToUser(task.userId, {
          title,
          body,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          data: {
            taskId: task.id,
            url: `/tasks?task=${task.id}`,
            type: "deadline_reminder",
            notificationType: window.type,
            urgent: window.type === "1h",
          },
        });

        if (result.success && result.sentCount > 0) {
          // Record that we sent this notification
          await db.insert(sentNotifications).values({
            userId: task.userId,
            taskId: task.id,
            notificationType: window.type,
          });

          stats.sent++;
          console.log(
            `✓ Sent ${window.type} notification for "${task.title}" to ${result.sentCount} device(s)`,
          );
        } else if (result.sentCount === 0) {
          // No subscriptions for this user - not a failure, just no devices
          stats.skipped++;
          console.log(
            `⏭ No push subscriptions for user, skipping "${task.title}"`,
          );
        } else {
          stats.failed++;
          console.log(`✗ Failed to send notification for "${task.title}"`);
        }
      } catch (error) {
        stats.failed++;
        console.error(`Error sending notification for task ${task.id}:`, error);
      }
    }

    console.log(
      `Deadline check completed: ${stats.totalTasks} total, ${stats.sent} sent, ${stats.skipped} skipped, ${stats.failed} failed`,
    );

    return stats;
  } catch (error) {
    console.error("Error in checkAndNotifyDeadlines:", error);
    throw error;
  }
}

/**
 * Cleans up old sent notification records for tasks that are now completed or past due.
 * This helps keep the table from growing indefinitely.
 * Should be run periodically (e.g., daily).
 */
export async function cleanupOldNotifications(): Promise<number> {
  try {
    const now = new Date();

    // Find tasks that are either done or past due
    const tasksToCleanup = await db.query.tasks.findMany({
      where: and(lt(tasks.dueDate, now)),
      columns: { id: true },
    });

    if (tasksToCleanup.length === 0) {
      return 0;
    }

    const taskIds = tasksToCleanup.map((t) => t.id);

    // Delete sent notifications for these tasks
    const result = await db
      .delete(sentNotifications)
      .where(inArray(sentNotifications.taskId, taskIds));

    console.log(
      `Cleaned up sent notifications for ${taskIds.length} past-due tasks`,
    );
    return taskIds.length;
  } catch (error) {
    console.error("Error cleaning up old notifications:", error);
    throw error;
  }
}
