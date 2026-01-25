/**
 * Script to fix broken schedule event dates in the database
 *
 * Problem: Some events have endDate = startDate, causing them to only appear once
 * Solution: Find a valid endDate from other events in the same course and apply it
 */

import { db } from "@/drizzle";
import { courses } from "@/schema";
import { eq } from "drizzle-orm";
import type { ScheduleData } from "@/types";

async function fixScheduleDates() {
  console.log("Starting schedule date fix...\n");

  // Fetch all courses with schedules
  const allCourses = await db.query.courses.findMany({
    where: (courses, { isNotNull }) => isNotNull(courses.schedule),
  });

  let totalFixed = 0;
  let totalCourses = 0;

  for (const course of allCourses) {
    const schedule = course.schedule as ScheduleData;
    if (!schedule?.events) continue;

    let modified = false;
    const events = schedule.events;

    // Find the latest valid endDate in this course's events
    const validEndDates = events
      .filter((e) => e.endDate !== e.startDate)
      .map((e) => e.endDate);

    if (validEndDates.length === 0) {
      console.log(
        `⚠️  ${course.code}: No valid endDate found, skipping course`,
      );
      continue;
    }

    // Use the latest endDate as the default
    const defaultEndDate = validEndDates.sort().reverse()[0];

    // Fix events where endDate = startDate
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (event.endDate === event.startDate) {
        console.log(
          `  Fixing ${course.code} ${event.type}${event.section} on day ${event.dayOfWeek}`,
        );
        console.log(`    Old: ${event.startDate} → ${event.endDate}`);
        events[i] = {
          ...event,
          endDate: defaultEndDate,
        };
        console.log(`    New: ${event.startDate} → ${defaultEndDate}`);
        modified = true;
        totalFixed++;
      }
    }

    if (modified) {
      // Update the course in the database
      await db
        .update(courses)
        .set({
          schedule: { events } as ScheduleData,
        })
        .where(eq(courses.id, course.id));

      totalCourses++;
      console.log(`✓ Updated ${course.code}\n`);
    }
  }

  console.log(`\nComplete!`);
  console.log(`Fixed ${totalFixed} events across ${totalCourses} courses`);
}

fixScheduleDates()
  .then(() => {
    console.log("\n✓ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n✗ Script failed:", error);
    process.exit(1);
  });
