import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  date,
  timestamp,
  decimal,
  check,
} from "drizzle-orm/pg-core";

/* USERS */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().notNull(), // references auth.users
  email: text("email").notNull(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/* SEMESTERS */
export const semesters = pgTable("semesters", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  yearLevel: integer("year_level").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isCurrent: boolean("is_current").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/* COURSES */
export const courses = pgTable("courses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id), // no cascade in Supabase
  semesterId: uuid("semester_id").references(() => semesters.id, {
    onDelete: "cascade",
  }),
  code: text("code").notNull(),
  name: text("name"), // nullable in Supabase
  color: text("color").default("#000000"),
  goalGrade: decimal("goal_grade", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/* GRADE WEIGHTS */
export const gradeWeights = pgTable("grade_weights", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id").references(() => courses.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  weightPercent: decimal("weight_percent", {
    precision: 5,
    scale: 2,
  }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/* TASKS */
export const tasks = pgTable(
  "tasks",
  () => ({
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),

    courseId: uuid("course_id").references(() => courses.id, {
      onDelete: "cascade",
    }),
    gradeWeightId: uuid("grade_weight_id").references(() => gradeWeights.id, {
      onDelete: "set null",
    }),

    title: text("title").notNull(),
    status: text("status").default("Todo"),
    priority: text("priority").default("Medium"),

    doDate: timestamp("do_date", { withTimezone: true }),
    dueDate: timestamp("due_date", { withTimezone: true }),

    scoreReceived: decimal("score_received", { precision: 5, scale: 2 }),
    scoreMax: decimal("score_max", {
      precision: 5,
      scale: 2,
    }).default("100.00"),

    description: text("description"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  }),
  (table) => ({
    priorityCheck: check(
      "tasks_priority_check",
      sql`${table.priority} = any (array['Low','Medium','High'])`,
    ),
    statusCheck: check(
      "tasks_status_check",
      sql`${table.status} = any (array['Todo','In Progress','Done'])`,
    ),
  }),
);
