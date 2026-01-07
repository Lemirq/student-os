CREATE TABLE "google_calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"calendar_id" uuid NOT NULL,
	"google_event_id" text NOT NULL,
	"summary" text,
	"description" text,
	"location" text,
	"html_link" text,
	"start_date_time" timestamp with time zone,
	"end_date_time" timestamp with time zone,
	"is_all_day" boolean DEFAULT false,
	"last_updated" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "google_calendar_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"google_email" text NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "google_calendars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"google_calendar_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"background_color" text,
	"foreground_color" text,
	"primary" boolean DEFAULT false,
	"timezone" text,
	"is_visible" boolean DEFAULT true,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "google_calendar_events" ADD CONSTRAINT "google_calendar_events_calendar_id_google_calendars_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."google_calendars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_calendar_integrations" ADD CONSTRAINT "google_calendar_integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_calendars" ADD CONSTRAINT "google_calendars_integration_id_google_calendar_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."google_calendar_integrations"("id") ON DELETE cascade ON UPDATE no action;