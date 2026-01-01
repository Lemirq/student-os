CREATE TABLE "sent_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"notification_type" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "sent_notifications" ADD CONSTRAINT "sent_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sent_notifications" ADD CONSTRAINT "sent_notifications_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;