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
};

export type StudentOSDataTypes = Record<string, never>;
