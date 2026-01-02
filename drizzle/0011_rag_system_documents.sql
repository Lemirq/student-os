-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
-- Create documents table with vector support
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid,
	"document_type" text NOT NULL,
	"file_name" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "documents_document_type_check" CHECK ("documents"."document_type" = any (array['syllabus','notes']))
);
--> statement-breakpoint
-- Add foreign key constraints
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Create HNSW index for fast similarity search
CREATE INDEX ON "documents" USING hnsw ("embedding" vector_cosine_ops) WITH (m = 16, ef_construction = 64);
--> statement-breakpoint
-- Create composite index for querying documents by user, course, and type
CREATE INDEX "documents_user_id_idx" ON "documents" ("user_id");
--> statement-breakpoint
CREATE INDEX "documents_course_id_idx" ON "documents" ("course_id");
--> statement-breakpoint
CREATE INDEX "documents_document_type_idx" ON "documents" ("document_type");
--> statement-breakpoint
-- Enable Row Level Security
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- Users can view their own documents
CREATE POLICY "Users can view their own documents" ON "documents"
  FOR SELECT USING (auth.uid() = user_id);
--> statement-breakpoint
-- Users can insert their own documents
CREATE POLICY "Users can insert their own documents" ON "documents"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint
-- Users can update their own documents
CREATE POLICY "Users can update their own documents" ON "documents"
  FOR UPDATE USING (auth.uid() = user_id);
--> statement-breakpoint
-- Users can delete their own documents
CREATE POLICY "Users can delete their own documents" ON "documents"
  FOR DELETE USING (auth.uid() = user_id);
