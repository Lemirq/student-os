#!/usr/bin/env bun
/**
 * Test script for manually triggering the deadline notification system
 * Usage: bun scripts/test-deadline-checker.ts
 */

import { checkAndNotifyDeadlines } from "../lib/deadline-checker";

/**
 * Runs a manual test of the deadline notification workflow and prints a concise summary.
 *
 * Executes the deadline check, logs total tasks due tomorrow, notifications sent and failed,
 * and prints a success rate. If an error occurs the process is terminated with exit code 1.
 */
async function main() {
  console.log("Starting manual deadline check test...\n");

  try {
    const stats = await checkAndNotifyDeadlines();

    console.log("\n=== Test Results ===");
    console.log(`Total tasks due tomorrow: ${stats.totalTasks}`);
    console.log(`Notifications sent: ${stats.sent}`);
    console.log(`Notifications failed: ${stats.failed}`);
    console.log(
      `Success rate: ${stats.totalTasks > 0 ? ((stats.sent / stats.totalTasks) * 100).toFixed(1) : 0}%`,
    );
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

main();