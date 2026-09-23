ALTER TABLE "notes" ADD COLUMN "session_id" text;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notes_session_id_unique" ON "notes" USING btree ("session_id") WHERE "notes"."session_id" is not null;