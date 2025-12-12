import { z } from "zod";

export const semesterSchema = z.object({
  name: z.string().min(1, "Name is required"),
  year_level: z.coerce.number().min(1, "Year level must be at least 1"),
  start_date: z.string().date(),
  end_date: z.string().date(),
  is_current: z.boolean().default(false),
});

export const courseSchema = z.object({
  semester_id: z.string().uuid(),
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  color: z.string().min(1, "Color is required"),
  goal_grade: z.coerce.number().min(0).max(100).optional(),
});

export const gradeWeightSchema = z.object({
  course_id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  weight_percent: z.coerce.number().min(0).max(100),
});

export const taskSchema = z.object({
  course_id: z.string().uuid(),
  grade_weight_id: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required"),
  status: z.enum(["Todo", "In Progress", "Done"]).default("Todo"),
  priority: z.enum(["Low", "Medium", "High"]).default("Medium"),
  do_date: z.string().optional(), // ISO string or similar
  due_date: z.string().optional(),
  score_received: z.coerce.number().min(0).max(100).optional(),
  score_max: z.coerce.number().min(0).max(100).optional(),
});
