// import { Database } from './supabase'; // Removed unused

// Map Drizzle schema types roughly to what we had, or just use the inferred types from Drizzle if we want to be stricter.
// But to minimize breakage in components that import these types, let's keep the shape compatible.

// For Supabase types, we were using the Row definition.
// Drizzle result types (from db.select()) are plain objects.

// We should really infer types from Drizzle schema, but to match the previous Typescript interfaces:
import { InferSelectModel } from "drizzle-orm";
import {
  semesters,
  courses,
  gradeWeights,
  tasks,
  users,
  documents,
} from "@/schema";

export type Semester = InferSelectModel<typeof semesters>;
export type Course = InferSelectModel<typeof courses>;
export type GradeWeight = InferSelectModel<typeof gradeWeights>;
export type Task = InferSelectModel<typeof tasks>;
export type User = InferSelectModel<typeof users>;
export type Document = InferSelectModel<typeof documents>;

export type TaskStatus = "Todo" | "In Progress" | "Done";
export type TaskPriority = "Low" | "Medium" | "High";

// AI Tool Types for useChat and UIMessagePart
export type StudentOSTools = {
  parse_syllabus: {
    input: {
      raw_text: string;
      course_code?: string;
    };
    output: {
      course: string;
      tasks: Array<{
        title: string;
        weight: number;
        due_date: string;
        type: string;
      }>;
      ui: {
        preview: boolean;
        title: string;
        taskCount: number;
        validTaskCount: number;
        invalidCount: number;
        summary: string;
      };
    };
  };
  calculate_grade_requirements: {
    input: {
      course_code: string;
    };
    output: {
      current_grade: string;
      goal_grade: number;
      remaining_weight: number;
      required_avg_on_remaining: string;
      status: "Impossible" | "Secured" | "Possible";
      error?: string;
    };
  };
  update_task_score: {
    input: {
      task_name: string;
      score: number;
    };
    output: {
      success: boolean;
      task?: string;
      score?: number;
      status?: string;
      message?: string;
    };
  };
  create_tasks_natural_language: {
    input: {
      request: string;
    };
    output: {
      tasks: Array<{
        id: string;
        title: string;
        dueDate: string | null;
        status: string;
        scoreReceived: string | null;
        scoreMax: string | null;
      }>;
    };
  };
  auto_schedule_tasks: {
    input: Record<string, never>;
    output: {
      message: string;
      updates: Array<{
        title: string;
        new_do_date: string;
      }>;
    };
  };
  rebalance_priorities: {
    input: Record<string, never>;
    output: {
      message: string;
      count: number;
    };
  };
  query_schedule: {
    input: {
      start_date: string;
      end_date: string;
    };
    output: {
      tasks: Task[];
      start_date: string;
      end_date: string;
      count: number;
    };
  };
  find_missing_data: {
    input: Record<string, never>;
    output: {
      tasks_without_weights?: Array<{ title: string }>;
      tasks_without_dates?: Array<{ title: string }>;
      suggestion?: string;
    };
  };
  manage_grade_weights: {
    input: {
      action: "list" | "add" | "update" | "delete";
      course_code: string;
      grade_weight_name?: string;
      weight_percent?: number;
      grade_weight_id?: string;
    };
    output: {
      success: boolean;
      error?: string;
      action?: "added" | "updated" | "deleted";
      course?: {
        code: string;
        name: string;
        id?: string;
      };
      grade_weights?: Array<{
        id: string;
        name: string;
        weight_percent: number;
      }>;
      total_weight?: number;
      is_valid?: boolean;
    };
  };
  web_search: {
    input: {
      query: string;
      searchDepth?: "basic" | "advanced";
      topic?: "general" | "news" | "finance";
      includeAnswer?: boolean;
      maxResults?: number;
    };
    output: {
      results: Array<{
        title: string;
        url: string;
        content: string;
        score?: number;
      }>;
      answer?: string;
    };
  };
  extract_content: {
    input: {
      urls: string[];
      extractDepth?: "basic" | "advanced";
      format?: "markdown" | "text";
    };
    output: {
      results: Array<{
        url: string;
        content: string;
        images?: string[];
      }>;
    };
  };
  crawl_website: {
    input: {
      url: string;
      maxDepth?: number;
      limit?: number;
      instructions?: string;
    };
    output: {
      results: Array<{
        url: string;
        content: string;
      }>;
    };
  };
  map_website: {
    input: {
      url: string;
      maxDepth?: number;
      limit?: number;
      instructions?: string;
    };
    output: {
      results: Array<{
        url: string;
        title?: string;
      }>;
    };
  };
  bulk_update_tasks: {
    input: {
      search_query: string;
      course_code?: string;
      updates: {
        status?: "Todo" | "In Progress" | "Done";
        priority?: "Low" | "Medium" | "High";
        due_time?: string;
        due_date_offset_days?: number;
        do_time?: string;
        do_date_offset_days?: number;
      };
    };
    output: {
      success: boolean;
      error?: string;
      searched_for?: string;
      course_filter?: string | null;
      summary?: string;
      course?: {
        code: string;
        name: string;
      } | null;
      search_query?: string;
      updated_tasks?: Array<{
        id: string;
        title: string;
        changes: {
          status?: string;
          priority?: string;
          dueDate?: {
            from: string;
            to: string;
          };
          doDate?: {
            from: string;
            to: string;
          };
        };
      }>;
      errors?: Array<{
        id: string;
        title: string;
        error: string;
      }>;
    };
  };
  retrieve_course_context: {
    input: {
      query: string;
      course_code?: string;
      top_k?: number;
    };
    output: {
      found: number;
      summary?: string;
      message?: string;
      results: Array<{
        chunk_number: number;
        file_name: string;
        document_type: string;
        content: string;
        similarity: string;
      }>;
      ui: {
        type: string;
        title: string;
        icon: string;
      };
    };
  };
  save_to_memory: {
    input: {
      content: string;
      document_name?: string;
      course_code?: string;
      document_type?: "syllabus" | "notes" | "other";
    };
    output: {
      success: boolean;
      error?: string;
      saved?: {
        course?: {
          code: string;
          name: string;
        };
        document_name: string;
        document_type: string;
        chunk_count: number;
      };
    };
  };
};

export type StudentOSDataTypes = Record<string, never>;

// Schedule Import Types
export type ScheduleEvent = {
  type: string; // "LEC", "TUT", "PRA", "LAB"
  section: string; // "0106"
  dayOfWeek: number; // 0-6 (0=Sunday)
  startTime: string; // "13:00"
  endTime: string; // "15:00"
  location?: string; // "MN 1270"
  building?: string; // "MAANJIWE NENDAMOWINAN"
  startDate: string; // "2025-09-08" (ISO date)
  endDate: string; // "2025-12-02"
  exceptionDates?: string[]; // ["2025-10-13"]
  isExamSlot?: boolean; // true if location is "ZZ TBA" (exam/test slot, not weekly)
};

export type ScheduleData = {
  events: ScheduleEvent[];
};

export type CourseMatch = {
  icsCode: string;
  icsCourseName: string;
  events: ScheduleEvent[];
  suggestedCourseId: string | null;
  suggestedCourseName: string;
  availableCourses: Array<{
    id: string;
    code: string;
    name: string | null;
    semesterName: string | null;
  }>;
  semesterId: string | null;
  semesterName: string | null;
};

export type ParsedICSCourse = {
  courseCode: string;
  courseName: string;
  events: ScheduleEvent[];
};

// Course with schedule data for schedule page
export type CourseWithSchedule = {
  id: string;
  code: string;
  name: string | null;
  color: string | null;
  schedule: ScheduleData | null;
  semester?: {
    id: string;
    name: string;
  } | null;
};
