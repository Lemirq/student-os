import { db } from "@/drizzle";
import { tasks, courses } from "@/schema";
import { sendPushToUser } from "@/actions/notifications";
import { and, eq, gte, lt, ne, lte } from "drizzle-orm";
import { format, addHours } from "date-fns";
import { hasTime } from "./date-parser";

/**
 * Stats returned by checkAndNotifyDeadlines
 */
export type DeadlineCheckStats = {
  totalTasks: number;
  sent: number;
  failed: number;
};

/**
 * Checks for tasks with upcoming deadlines and sends push notifications to users
 * For tasks with specific times: notifies 24 hours before
 * For tasks without times (end of day defaults): notifies on the day at 9 AM UTC
 * @returns Statistics about the notification process
 */
export async function checkAndNotifyDeadlines(): Promise<DeadlineCheckStats> {
  const stats: DeadlineCheckStats = {
    totalTasks: 0,
    sent: 0,
    failed: 0,
  };

  try {
    const now = new Date();
    const in24Hours = addHours(now, 24);

    console.log(
      `Checking for deadlines between now (${now.toISOString()}) and 24 hours from now (${in24Hours.toISOString()})`,
    );

    // Query tasks due within the next 24 hours that are incomplete
    const dueTasks = await db.query.tasks.findMany({
      where: and(
        gte(tasks.dueDate, now),
        lte(tasks.dueDate, in24Hours),
        ne(tasks.status, "Done"),
      ),
      with: {
        course: true,
      },
    });

    stats.totalTasks = dueTasks.length;
    console.log(`Found ${stats.totalTasks} tasks with upcoming deadlines`);

    // Group tasks by user to batch notifications
    const tasksByUser = new Map<string, typeof dueTasks>();
    for (const task of dueTasks) {
      if (!tasksByUser.has(task.userId)) {
        tasksByUser.set(task.userId, []);
      }
      tasksByUser.get(task.userId)!.push(task);
    }

    // Send notifications to each user
    for (const [userId, userTasks] of tasksByUser.entries()) {
      console.log(
        `Processing ${userTasks.length} tasks for user ${userId.substring(0, 8)}...`,
      );

      for (const task of userTasks) {
        try {
          if (!task.dueDate) continue;

          const dueDate = new Date(task.dueDate);
          const includeTime = hasTime(dueDate);

          // Format the due date with time if available
          const dueDateStr = includeTime
            ? format(dueDate, "MMM d, yyyy 'at' h:mm a")
            : format(dueDate, "MMM d, yyyy");

          // Get course info
          const courseCode = task.course?.code || "No course";
          const courseName = task.course?.name || "";

          // Construct notification body
          let body = `${courseCode}`;
          if (courseName) {
            body += ` - ${courseName}`;
          }
          body += `\nDue: ${dueDateStr}`;

          // Determine notification title based on timing
          const hoursUntilDue =
            (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
          let title: string;
          if (hoursUntilDue <= 24 && hoursUntilDue > 12) {
            title = `📚 Due Tomorrow: ${task.title}`;
          } else if (hoursUntilDue <= 12 && hoursUntilDue > 6) {
            title = `⏰ Due Soon: ${task.title}`;
          } else if (hoursUntilDue <= 6) {
            title = `🔴 Due Very Soon: ${task.title}`;
          } else {
            title = `📚 Upcoming: ${task.title}`;
          }

          // Send push notification
          const result = await sendPushToUser(userId, {
            title,
            body,
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            data: {
              taskId: task.id,
              url: `/tasks?task=${task.id}`,
              type: "deadline_reminder",
              urgent: hoursUntilDue <= 6,
            },
          });

          if (result.success && result.sentCount > 0) {
            stats.sent++;
            console.log(
              `✓ Sent notification for task "${task.title}" to ${result.sentCount} device(s) (due in ${hoursUntilDue.toFixed(1)}h)`,
            );
          } else {
            stats.failed++;
            console.log(
              `✗ Failed to send notification for task "${task.title}"`,
            );
          }
        } catch (error) {
          stats.failed++;
          console.error(
            `Error sending notification for task ${task.id}:`,
            error,
          );
        }
      }
    }

    console.log(
      `Deadline check completed: ${stats.totalTasks} total, ${stats.sent} sent, ${stats.failed} failed`,
    );

    return stats;
  } catch (error) {
    console.error("Error in checkAndNotifyDeadlines:", error);
    throw error;
  }
}
