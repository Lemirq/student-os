/**
 * Query key factory for consistent cache keys across the app
 * Following TanStack Query best practices for nested key structure
 */
export const queryKeys = {
  // Sidebar navigation
  sidebar: {
    all: ["sidebar"] as const,
    user: (userId: string) => ["sidebar", userId] as const,
  },

  // Semesters
  semesters: {
    all: ["semesters"] as const,
    detail: (id: string) => ["semesters", id] as const,
    tasks: (id: string) => ["semesters", id, "tasks"] as const,
  },

  // Courses
  courses: {
    all: ["courses"] as const,
    detail: (id: string) => ["courses", id] as const,
    tasks: (id: string) => ["courses", id, "tasks"] as const,
    gradeWeights: (id: string) => ["courses", id, "gradeWeights"] as const,
    fullData: (id: string) => ["courses", id, "full"] as const,
  },

  // Tasks
  tasks: {
    all: ["tasks"] as const,
    detail: (id: string) => ["tasks", id] as const,
    bySemester: (semesterId: string) =>
      ["tasks", "semester", semesterId] as const,
    byCourse: (courseId: string) => ["tasks", "course", courseId] as const,
  },

  // Dashboard
  dashboard: {
    all: ["dashboard"] as const,
    semester: (semesterId: string) =>
      ["dashboard", "semester", semesterId] as const,
    metrics: (semesterId: string) =>
      ["dashboard", "metrics", semesterId] as const,
  },

  // AI Context
  ai: {
    context: (userId: string) => ["ai", "context", userId] as const,
  },
} as const;
