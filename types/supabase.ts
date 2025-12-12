export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      semesters: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          year_level: number;
          start_date: string;
          end_date: string;
          is_current: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          year_level: number;
          start_date: string;
          end_date: string;
          is_current?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          year_level?: number;
          start_date?: string;
          end_date?: string;
          is_current?: boolean;
          created_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          semester_id: string;
          code: string;
          name: string;
          color: string;
          goal_grade: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          semester_id: string;
          code: string;
          name: string;
          color: string;
          goal_grade?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          semester_id?: string;
          code?: string;
          name?: string;
          color?: string;
          goal_grade?: number | null;
          created_at?: string;
        };
      };
      grade_weights: {
        Row: {
          id: string;
          course_id: string;
          name: string;
          weight_percent: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          name: string;
          weight_percent: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          name?: string;
          weight_percent?: number;
          created_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          course_id: string;
          grade_weight_id: string | null;
          title: string;
          status: "Todo" | "In Progress" | "Done";
          priority: "Low" | "Medium" | "High";
          do_date: string | null;
          due_date: string | null;
          score_received: number | null;
          score_max: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          grade_weight_id?: string | null;
          title: string;
          status?: "Todo" | "In Progress" | "Done";
          priority?: "Low" | "Medium" | "High";
          do_date?: string | null;
          due_date?: string | null;
          score_received?: number | null;
          score_max?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          grade_weight_id?: string | null;
          title?: string;
          status?: "Todo" | "In Progress" | "Done";
          priority?: "Low" | "Medium" | "High";
          do_date?: string | null;
          due_date?: string | null;
          score_received?: number | null;
          score_max?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
