import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { courses, gradeWeights, semesters, tasks } from "@/schema";
import { z } from "zod";

export const semesterSchema = createInsertSchema(semesters).omit({
  id: true,
  userId: true,
  createdAt: true,
});
export const courseSchema = createInsertSchema(courses).omit({
  id: true,
  userId: true,
  createdAt: true,
});
export const gradeWeightSchema = createInsertSchema(gradeWeights).omit({
  id: true,
  createdAt: true,
});

export const taskSchema = createInsertSchema(tasks).omit({
  id: true,
  userId: true,
  createdAt: true,
});

// Schedule Import Schemas
export const scheduleEventSchema = z.object({
  type: z.string(),
  section: z.string(),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  location: z.string().optional(),
  building: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  exceptionDates: z.array(z.string()).optional(),
  isExamSlot: z.boolean().optional(),
});

export const scheduleDataSchema = z.object({
  events: z.array(scheduleEventSchema),
});

export const importScheduleSchema = z.object({
  fileContent: z.string(),
});

export const saveScheduleMatchSchema = z.object({
  matches: z.array(
    z.object({
      courseId: z.string().uuid(),
      events: z.array(scheduleEventSchema),
    }),
  ),
});
