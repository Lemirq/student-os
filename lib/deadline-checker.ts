import { db } from "@/drizzle";
import { tasks, courses } from "@/schema";
import { sendPushToUser } from "@/actions/notifications";
import { and, eq, gte, lt, ne } from "drizzle-orm";
import { format, startOfTomorrow, addDays } from "date-fns";

/**
 * Stats returned by checkAndNotifyDeadlines
 */
export type DeadlineCheckStats = {
  totalTasks: number;
  sent: number;
  failed: number;
};

/**
 * Finds incomplete tasks due tomorrow and sends push notifications to their owners.
 *
 * @returns An object with the total number of tasks checked (`totalTasks`), the number of notifications successfully sent (`sent`), and the number of failed notifications (`failed`).
 */
export async function checkAndNotifyDeadlines(): Promise<DeadlineCheckStats> {
  const stats: DeadlineCheckStats = {
    totalTasks: 0,
    sent: 0,
    failed: 0,
  };

  try {
    // Calculate tomorrow's date range (00:00:00 to 23:59:59)
    const tomorrowStart = startOfTomorrow();
    const dayAfterStart = addDays(tomorrowStart, 1);

    console.log(
      `Checking for deadlines between ${tomorrowStart.toISOString()} and ${dayAfterStart.toISOString()}`,
    );

    // Query tasks due tomorrow that are incomplete
    const dueTasks = await db.query.tasks.findMany({
      where: and(
        gte(tasks.dueDate, tomorrowStart),
        lt(tasks.dueDate, dayAfterStart),
        ne(tasks.status, "Done"),
      ),
      with: {
        course: true,
      },
    });

    stats.totalTasks = dueTasks.length;
    console.log(`Found ${stats.totalTasks} tasks due tomorrow`);

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
          // Format the due date
          const dueDate = task.dueDate
            ? format(new Date(task.dueDate), "MMM d, yyyy 'at' h:mm a")
            : "No date";

          // Get course info
          const courseCode = task.course?.code || "No course";
          const courseName = task.course?.name || "";

          // Construct notification body
          let body = `${courseCode}`;
          if (courseName) {
            body += ` - ${courseName}`;
          }
          body += `\n${dueDate}`;

          // Send push notification
          const result = await sendPushToUser(userId, {
            title: `📚 Due Tomorrow: ${task.title}`,
            body,
            icon: "/icon-192.png",
            badge: "/badge-72.png",
            data: {
              taskId: task.id,
              url: `/tasks?task=${task.id}`,
              type: "deadline_reminder",
            },
          });

          if (result.success && result.sentCount > 0) {
            stats.sent++;
            console.log(
              `✓ Sent notification for task "${task.title}" to ${result.sentCount} device(s)`,
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