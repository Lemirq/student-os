import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { courses, gradeWeights, semesters, tasks } from "@/schema";

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
