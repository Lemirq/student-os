import { relations, sql } from "drizzle-orm";
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
  jsonb,
  vector,
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

export const usersRelations = relations(users, ({ many }) => ({
  semesters: many(semesters),
  courses: many(courses),
  tasks: many(tasks),
  chats: many(chats),
  pushSubscriptions: many(pushSubscriptions),
  documents: many(documents),
  googleCalendarIntegrations: many(googleCalendarIntegrations),
}));

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

export const semestersRelations = relations(semesters, ({ one, many }) => ({
  user: one(users, {
    fields: [semesters.userId],
    references: [users.id],
  }),
  courses: many(courses),
}));

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
  syllabus: text("syllabus"),
  goalGrade: decimal("goal_grade", { precision: 5, scale: 2 }),
  notes: jsonb("notes"),
  schedule: jsonb("schedule").$type<{
    events: Array<{
      type: string;
      section: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      location?: string;
      building?: string;
      startDate: string;
      endDate: string;
      exceptionDates?: string[];
      isExamSlot?: boolean;
    }>;
  }>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const coursesRelations = relations(courses, ({ one, many }) => ({
  semester: one(semesters, {
    fields: [courses.semesterId],
    references: [semesters.id],
  }),
  gradeWeights: many(gradeWeights),
  tasks: many(tasks),
  documents: many(documents),
}));

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

export const gradeWeightsRelations = relations(
  gradeWeights,
  ({ one, many }) => ({
    course: one(courses, {
      fields: [gradeWeights.courseId],
      references: [courses.id],
    }),
    tasks: many(tasks),
  }),
);

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
    notes: jsonb("notes"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
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

export const tasksRelations = relations(tasks, ({ one }) => ({
  course: one(courses, {
    fields: [tasks.courseId],
    references: [courses.id],
  }),
  gradeWeight: one(gradeWeights, {
    fields: [tasks.gradeWeightId],
    references: [gradeWeights.id],
  }),
}));

/* CHATS */
export const chats = pgTable("chats", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  messages: jsonb("messages").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const chatsRelations = relations(chats, ({ one }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.id],
  }),
}));

/* PUSH SUBSCRIPTIONS */
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const pushSubscriptionsRelations = relations(
  pushSubscriptions,
  ({ one }) => ({
    user: one(users, {
      fields: [pushSubscriptions.userId],
      references: [users.id],
    }),
  }),
);

/* SENT NOTIFICATIONS - tracks which deadline notifications have been sent to prevent duplicates */
export const sentNotifications = pgTable("sent_notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  notificationType: text("notification_type").notNull(), // '24h', '6h', '1h'
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow(),
});

export const sentNotificationsRelations = relations(
  sentNotifications,
  ({ one }) => ({
    user: one(users, {
      fields: [sentNotifications.userId],
      references: [users.id],
    }),
    task: one(tasks, {
      fields: [sentNotifications.taskId],
      references: [tasks.id],
    }),
  }),
);

/* DOCUMENTS - for RAG system */
export const documents = pgTable(
  "documents",
  () => ({
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").references(() => courses.id, {
      onDelete: "cascade",
    }),
    documentType: text("document_type").notNull(), // 'syllabus', 'notes', or 'other'
    fileName: text("file_name").notNull(), // original filename
    chunkIndex: integer("chunk_index").notNull(), // chunk number in document
    content: text("content").notNull(), // chunked text content
    embedding: vector("embedding", { dimensions: 1536 }), // pgvector embedding
    metadata: jsonb("metadata").$type<{
      pageNumber?: number;
      section?: string;
      heading?: string;
      [key: string]: unknown;
    }>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  }),
  (table) => ({
    documentTypeCheck: check(
      "documents_document_type_check",
      sql`${table.documentType} = any (array['syllabus','notes','other'])`,
    ),
  }),
);

export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [documents.courseId],
    references: [courses.id],
  }),
}));

/* GOOGLE CALENDAR INTEGRATIONS */
export const googleCalendarIntegrations = pgTable(
  "google_calendar_integrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    googleEmail: text("google_email").notNull(),
    lastSyncAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
);

export const googleCalendarIntegrationsRelations = relations(
  googleCalendarIntegrations,
  ({ one, many }) => ({
    user: one(users, {
      fields: [googleCalendarIntegrations.userId],
      references: [users.id],
    }),
    googleCalendars: many(googleCalendars),
  }),
);

/* GOOGLE CALENDARS */
export const googleCalendars = pgTable(
  "google_calendars",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    integrationId: uuid("integration_id")
      .notNull()
      .references(() => googleCalendarIntegrations.id, {
        onDelete: "cascade",
      }),
    googleCalendarId: text("google_calendar_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    backgroundColor: text("background_color"),
    foregroundColor: text("foreground_color"),
    primary: boolean("primary").default(false),
    timezone: text("timezone"),
    isVisible: boolean("is_visible").default(true),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueGoogleCalendarId: table.googleCalendarId,
  }),
);

export const googleCalendarsRelations = relations(
  googleCalendars,
  ({ one, many }) => ({
    integration: one(googleCalendarIntegrations, {
      fields: [googleCalendars.integrationId],
      references: [googleCalendarIntegrations.id],
    }),
    googleCalendarEvents: many(googleCalendarEvents),
  }),
);

/* GOOGLE CALENDAR EVENTS */
export const googleCalendarEvents = pgTable("google_calendar_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  calendarId: uuid("calendar_id")
    .notNull()
    .references(() => googleCalendars.id, {
      onDelete: "cascade",
    }),
  googleEventId: text("google_event_id").notNull(),
  summary: text("summary"),
  description: text("description"),
  location: text("location"),
  htmlLink: text("html_link"),
  startDateTime: timestamp("start_date_time", { withTimezone: true }),
  endDateTime: timestamp("end_date_time", { withTimezone: true }),
  isAllDay: boolean("is_all_day").default(false),
  lastUpdated: timestamp("last_updated", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const googleCalendarEventsRelations = relations(
  googleCalendarEvents,
  ({ one }) => ({
    calendar: one(googleCalendars, {
      fields: [googleCalendarEvents.calendarId],
      references: [googleCalendars.id],
    }),
  }),
);
