// import { Database } from './supabase'; // Removed unused

// Map Drizzle schema types roughly to what we had, or just use the inferred types from Drizzle if we want to be stricter.
// But to minimize breakage in components that import these types, let's keep the shape compatible.

// For Supabase types, we were using the Row definition.
// Drizzle result types (from db.select()) are plain objects.

// We should really infer types from Drizzle schema, but to match the previous Typescript interfaces:
import { InferSelectModel } from "drizzle-orm";
import { semesters, courses, gradeWeights, tasks, users } from "@/schema";

export type Semester = InferSelectModel<typeof semesters>;
export type Course = InferSelectModel<typeof courses>;
export type GradeWeight = InferSelectModel<typeof gradeWeights>;
export type Task = InferSelectModel<typeof tasks>;
export type User = InferSelectModel<typeof users>;

export type TaskStatus = "Todo" | "In Progress" | "Done";
export type TaskPriority = "Low" | "Medium" | "High";
