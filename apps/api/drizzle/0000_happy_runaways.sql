CREATE TABLE "agent_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"category" text NOT NULL,
	"urgency" text NOT NULL,
	"draft_response" text NOT NULL,
	"confidence" numeric(4, 3) NOT NULL,
	"action_taken" text NOT NULL,
	"model_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calibration_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"confidence_bucket" text NOT NULL,
	"predicted_accuracy" numeric(4, 3) NOT NULL,
	"actual_accuracy" numeric(4, 3) NOT NULL,
	"sample_size" integer NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "human_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"decision_id" uuid NOT NULL,
	"was_category_correct" boolean NOT NULL,
	"was_response_correct" boolean NOT NULL,
	"corrected_category" text,
	"corrected_response" text,
	"corrected_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"raw_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_decisions" ADD CONSTRAINT "agent_decisions_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_corrections" ADD CONSTRAINT "human_corrections_decision_id_agent_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."agent_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_decisions_ticket_id_idx" ON "agent_decisions" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "agent_decisions_created_at_idx" ON "agent_decisions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "calibration_snapshots_computed_at_idx" ON "calibration_snapshots" USING btree ("computed_at");--> statement-breakpoint
CREATE INDEX "human_corrections_decision_id_idx" ON "human_corrections" USING btree ("decision_id");--> statement-breakpoint
CREATE INDEX "tickets_status_idx" ON "tickets" USING btree ("status");