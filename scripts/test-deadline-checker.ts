#!/usr/bin/env bun
/**
 * Test script for manually triggering the deadline notification system
 * Usage: bun scripts/test-deadline-checker.ts
 */

import {
  checkAndNotifyDeadlines,
  cleanupOldNotifications,
} from "../lib/deadline-checker";

/**
 * Runs a manual test of the deadline notification workflow and prints a concise summary.
 *
 * Executes the deadline check for tasks due within 24h, 6h, and 1h windows.
 * Logs total tasks found, notifications sent, skipped (already sent), and failed.
 * If an error occurs the process is terminated with exit code 1.
 */
async function main() {
  console.log("Starting manual deadline check test...\n");
  console.log("Notification windows:");
  console.log("  - 24h: Tasks due in 23-25 hours");
  console.log("  - 6h:  Tasks due in 5-7 hours");
  console.log("  - 1h:  Tasks due in 0.5-1.5 hours");
  console.log("");

  try {
    const stats = await checkAndNotifyDeadlines();

    console.log("\n=== Test Results ===");
    console.log(`Total tasks in notification windows: ${stats.totalTasks}`);
    console.log(`Notifications sent: ${stats.sent}`);
    console.log(`Notifications skipped (already sent): ${stats.skipped}`);
    console.log(`Notifications failed: ${stats.failed}`);

    if (stats.totalTasks > 0) {
      const processed = stats.sent + stats.skipped + stats.failed;
      console.log(
        `Success rate: ${((stats.sent / Math.max(processed, 1)) * 100).toFixed(1)}%`,
      );
    }

    // Also run cleanup
    console.log("\n=== Cleanup ===");
    const cleanedUp = await cleanupOldNotifications();
    console.log(
      `Cleaned up sent notifications for ${cleanedUp} past-due tasks`,
    );
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

main();
