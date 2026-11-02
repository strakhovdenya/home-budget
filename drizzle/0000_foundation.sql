CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"display_name" text NOT NULL,
	"aggregate_revision" bigint DEFAULT 0 NOT NULL,
	"recorded_seq" bigint DEFAULT 0 NOT NULL,
	"active_allocation_revision_id" uuid,
	CONSTRAINT "accounts_owner_user_id_id_unique" UNIQUE("owner_user_id","id"),
	CONSTRAINT "account_eur" CHECK ("accounts"."currency" = 'EUR'),
	CONSTRAINT "account_counters" CHECK ("accounts"."aggregate_revision" >= 0 AND "accounts"."recorded_seq" >= 0)
);
--> statement-breakpoint
CREATE TABLE "allocation_revisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"budget_update_id" uuid NOT NULL,
	"recorded_seq" bigint NOT NULL,
	"logical_fact_id" uuid NOT NULL,
	"supersedes_id" uuid,
	"checkpoint_id" uuid NOT NULL,
	"previous_revision_id" uuid,
	"position_id" uuid NOT NULL,
	"effective_date" date NOT NULL,
	"change_kind" text NOT NULL,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"insert_transaction" text DEFAULT pg_current_xact_id()::text NOT NULL,
	CONSTRAINT "allocation_revisions_owner_user_id_account_id_id_unique" UNIQUE("owner_user_id","account_id","id")
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"budget_update_id" uuid NOT NULL,
	"recorded_seq" bigint NOT NULL,
	"event_kind" text NOT NULL,
	"effective_date" date NOT NULL,
	"reason" text NOT NULL,
	"before_after" jsonb NOT NULL,
	CONSTRAINT "audit_events_owner_user_id_account_id_id_unique" UNIQUE("owner_user_id","account_id","id")
);
--> statement-breakpoint
CREATE TABLE "balance_checkpoints" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"budget_update_id" uuid NOT NULL,
	"recorded_seq" bigint NOT NULL,
	"logical_fact_id" uuid NOT NULL,
	"supersedes_id" uuid,
	"position_id" uuid NOT NULL,
	"observed_date" date NOT NULL,
	"observed_at" timestamp with time zone,
	"balance_cents" bigint NOT NULL,
	"reason" text NOT NULL,
	CONSTRAINT "balance_checkpoints_owner_user_id_account_id_id_unique" UNIQUE("owner_user_id","account_id","id"),
	CONSTRAINT "checkpoint_nonnegative" CHECK ("balance_checkpoints"."balance_cents" >= 0),
	CONSTRAINT "checkpoint_berlin" CHECK ("balance_checkpoints"."observed_at" IS NULL OR ("balance_checkpoints"."observed_at" AT TIME ZONE 'Europe/Berlin')::date = "balance_checkpoints"."observed_date")
);
--> statement-breakpoint
CREATE TABLE "budget_periods" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"period" text NOT NULL,
	CONSTRAINT "budget_periods_owner_user_id_account_id_id_unique" UNIQUE("owner_user_id","account_id","id"),
	CONSTRAINT "budget_periods_owner_user_id_account_id_period_unique" UNIQUE("owner_user_id","account_id","period"),
	CONSTRAINT "period_format" CHECK ("budget_periods"."period" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' AND left("budget_periods"."period",4) <> '0000')
);
--> statement-breakpoint
CREATE TABLE "budget_transfers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"budget_update_id" uuid NOT NULL,
	"recorded_seq" bigint NOT NULL,
	"proposal_id" uuid NOT NULL,
	"decision_id" uuid NOT NULL,
	"source_period_id" uuid NOT NULL,
	"target_period_id" uuid NOT NULL,
	"before_allocation_revision_id" uuid NOT NULL,
	"after_allocation_revision_id" uuid NOT NULL,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"funding_manifest" jsonb NOT NULL,
	CONSTRAINT "budget_transfers_owner_user_id_account_id_id_unique" UNIQUE("owner_user_id","account_id","id"),
	CONSTRAINT "budget_transfers_proposal_id_unique" UNIQUE("proposal_id"),
	CONSTRAINT "budget_transfers_decision_id_unique" UNIQUE("decision_id"),
	CONSTRAINT "different_periods" CHECK ("budget_transfers"."source_period_id"<>"budget_transfers"."target_period_id")
);
--> statement-breakpoint
CREATE TABLE "budget_updates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"payload_identity" text NOT NULL,
	"expected_revision" bigint NOT NULL,
	"recorded_seq" bigint NOT NULL,
	"actor_id" uuid NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"result" jsonb NOT NULL,
	"kind" text NOT NULL,
	CONSTRAINT "budget_updates_owner_user_id_account_id_id_unique" UNIQUE("owner_user_id","account_id","id"),
	CONSTRAINT "budget_updates_owner_user_id_account_id_request_id_unique" UNIQUE("owner_user_id","account_id","request_id"),
	CONSTRAINT "budget_updates_owner_user_id_account_id_recorded_seq_unique" UNIQUE("owner_user_id","account_id","recorded_seq"),
	CONSTRAINT "budget_updates_owner_user_id_account_id_id_recorded_seq_unique" UNIQUE("owner_user_id","account_id","id","recorded_seq"),
	CONSTRAINT "update_revision" CHECK ("budget_updates"."expected_revision" >= 0 AND "budget_updates"."recorded_seq" > 0 AND length("budget_updates"."payload_identity") > 0)
);
--> statement-breakpoint
CREATE TABLE "historical_positions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"budget_update_id" uuid NOT NULL,
	"recorded_seq" bigint NOT NULL,
	"historical_date" date NOT NULL,
	"kind" text NOT NULL,
	CONSTRAINT "historical_positions_owner_user_id_account_id_id_unique" UNIQUE("owner_user_id","account_id","id")
);
--> statement-breakpoint
CREATE TABLE "month_closings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"budget_update_id" uuid NOT NULL,
	"recorded_seq" bigint NOT NULL,
	"period_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"previous_version_id" uuid,
	"historical_through_date" date NOT NULL,
	"closed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_by" uuid NOT NULL,
	"evidence_recorded_cutoff_seq" bigint NOT NULL,
	"evidence_recorded_cutoff_at" timestamp with time zone NOT NULL,
	"reason" text NOT NULL,
	"change_evidence_refs" jsonb NOT NULL,
	"last_checkpoint_id" uuid,
	"last_bank_observed_date" date,
	"last_bank_observed_at" timestamp with time zone,
	"last_observed_balance_cents" bigint,
	"historical_allocation_revision_id" uuid,
	"allocation_effective_date" date,
	"end_checkpoint_id" uuid,
	"end_balance_cents" bigint,
	"bank_data_completeness" text NOT NULL,
	"operation_detail_status" text NOT NULL,
	"historical_allocated_cents" bigint,
	"historical_reserved_cents" bigint NOT NULL,
	"historical_savings_cents" bigint NOT NULL,
	"historical_free_cents" bigint,
	"snapshot_schema_version" integer NOT NULL,
	"selection_contract_version" integer NOT NULL,
	"snapshot_json" jsonb NOT NULL,
	"source_manifest" jsonb NOT NULL,
	"ordering_revision_refs" jsonb NOT NULL,
	CONSTRAINT "month_closings_owner_user_id_account_id_id_unique" UNIQUE("owner_user_id","account_id","id"),
	CONSTRAINT "month_closings_account_id_period_id_version_unique" UNIQUE("account_id","period_id","version"),
	CONSTRAINT "month_closings_previous_version_id_unique" UNIQUE("previous_version_id"),
	CONSTRAINT "closing_version" CHECK ("month_closings"."version">0 AND (("month_closings"."version"=1) = ("month_closings"."previous_version_id" IS NULL)) AND length(trim("month_closings"."reason"))>0 AND "month_closings"."evidence_recorded_cutoff_seq"<"month_closings"."recorded_seq" AND "month_closings"."snapshot_schema_version">0 AND "month_closings"."selection_contract_version">0),
	CONSTRAINT "closing_free" CHECK ("month_closings"."historical_reserved_cents">=0 AND "month_closings"."historical_savings_cents">=0 AND ("month_closings"."historical_allocated_cents" IS NULL OR ("month_closings"."historical_allocated_cents">=0 AND "month_closings"."historical_free_cents"="month_closings"."historical_allocated_cents"-"month_closings"."historical_reserved_cents"-"month_closings"."historical_savings_cents"))),
	CONSTRAINT "closing_detail" CHECK ("month_closings"."operation_detail_status" IN ('NOT_PROVIDED','PARTIAL','USER_CONFIRMED_COMPLETE'))
);
--> statement-breakpoint
CREATE TABLE "obligation_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"budget_update_id" uuid NOT NULL,
	"recorded_seq" bigint NOT NULL,
	"obligation_id" uuid NOT NULL,
	"previous_revision_id" uuid,
	"supersedes_id" uuid,
	"logical_fact_id" uuid NOT NULL,
	"position_id" uuid NOT NULL,
	"funding_period_id" uuid NOT NULL,
	"effective_date" date NOT NULL,
	"bank_date" date,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"action" text NOT NULL,
	"before_state" jsonb,
	"original_cents" bigint NOT NULL,
	"outstanding_cents" bigint NOT NULL,
	"status" text NOT NULL,
	"is_possible" boolean NOT NULL,
	"reserve_full" boolean NOT NULL,
	CONSTRAINT "obligation_events_owner_user_id_account_id_id_unique" UNIQUE("owner_user_id","account_id","id"),
	CONSTRAINT "obligation_state" CHECK ("obligation_events"."original_cents">0 AND "obligation_events"."outstanding_cents">=0 AND "obligation_events"."status" IN ('UNPAID','PAID','CANCELLED') AND ("obligation_events"."status"<>'UNPAID' OR ("obligation_events"."outstanding_cents">0 AND ("obligation_events"."is_possible" OR "obligation_events"."reserve_full"))) AND ("obligation_events"."status"='UNPAID' OR NOT "obligation_events"."reserve_full") AND ("obligation_events"."status"<>'PAID' OR "obligation_events"."outstanding_cents"=0))
);
--> statement-breakpoint
CREATE TABLE "obligations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"budget_update_id" uuid NOT NULL,
	"recorded_seq" bigint NOT NULL,
	"originating_period_id" uuid NOT NULL,
	CONSTRAINT "obligations_owner_user_id_account_id_id_unique" UNIQUE("owner_user_id","account_id","id")
);
--> statement-breakpoint
CREATE TABLE "ordering_revisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"budget_update_id" uuid NOT NULL,
	"recorded_seq" bigint NOT NULL,
	"historical_date" date NOT NULL,
	"previous_revision_id" uuid,
	"manifest" jsonb NOT NULL,
	"dependencies" jsonb NOT NULL,
	CONSTRAINT "ordering_revisions_owner_user_id_account_id_id_unique" UNIQUE("owner_user_id","account_id","id")
);
--> statement-breakpoint
CREATE TABLE "period_allocations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"allocation_revision_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"amount_cents" bigint NOT NULL,
	CONSTRAINT "period_allocations_owner_user_id_account_id_id_unique" UNIQUE("owner_user_id","account_id","id"),
	CONSTRAINT "period_allocations_allocation_revision_id_period_id_unique" UNIQUE("allocation_revision_id","period_id"),
	CONSTRAINT "allocation_nonnegative" CHECK ("period_allocations"."amount_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "report_heads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"closing_id" uuid NOT NULL,
	"correction_pending" boolean DEFAULT false NOT NULL,
	CONSTRAINT "report_heads_owner_user_id_account_id_id_unique" UNIQUE("owner_user_id","account_id","id"),
	CONSTRAINT "report_heads_account_id_period_id_unique" UNIQUE("account_id","period_id")
);
--> statement-breakpoint
CREATE TABLE "savings_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"budget_update_id" uuid NOT NULL,
	"recorded_seq" bigint NOT NULL,
	"savings_id" uuid NOT NULL,
	"previous_revision_id" uuid,
	"supersedes_id" uuid,
	"logical_fact_id" uuid NOT NULL,
	"position_id" uuid NOT NULL,
	"funding_period_id" uuid NOT NULL,
	"effective_date" date NOT NULL,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"action" text NOT NULL,
	"before_state" jsonb,
	"amount_cents" bigint NOT NULL,
	"status" text NOT NULL,
	CONSTRAINT "savings_events_owner_user_id_account_id_id_unique" UNIQUE("owner_user_id","account_id","id"),
	CONSTRAINT "savings_nonnegative" CHECK ("savings_events"."amount_cents">=0),
	CONSTRAINT "saving_status" CHECK ("savings_events"."status" IN ('ACTIVE','RELEASED') AND ("savings_events"."status"<>'RELEASED' OR "savings_events"."amount_cents"=0))
);
--> statement-breakpoint
CREATE TABLE "savings_goals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"budget_update_id" uuid NOT NULL,
	"recorded_seq" bigint NOT NULL,
	"originating_period_id" uuid NOT NULL,
	CONSTRAINT "savings_goals_owner_user_id_account_id_id_unique" UNIQUE("owner_user_id","account_id","id")
);
--> statement-breakpoint
CREATE TABLE "transfer_proposals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"expected_revision" bigint NOT NULL,
	"base_checkpoint_id" uuid NOT NULL,
	"base_allocation_revision_id" uuid NOT NULL,
	"target_period_id" uuid NOT NULL,
	"source_period_id" uuid NOT NULL,
	"payload_identity" text NOT NULL,
	"proposal" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transfer_proposals_owner_user_id_account_id_id_unique" UNIQUE("owner_user_id","account_id","id")
);
--> statement-breakpoint
CREATE TABLE "transition_decisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"budget_update_id" uuid NOT NULL,
	"recorded_seq" bigint NOT NULL,
	"mode" text NOT NULL,
	"observation_mode" text NOT NULL,
	"before_allocation_revision_id" uuid,
	"after_allocation_revision_id" uuid NOT NULL,
	"position_id" uuid NOT NULL,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"manifest" jsonb NOT NULL,
	"reason" text NOT NULL,
	CONSTRAINT "transition_decisions_owner_user_id_account_id_id_unique" UNIQUE("owner_user_id","account_id","id"),
	CONSTRAINT "transition_decisions_budget_update_id_unique" UNIQUE("budget_update_id"),
	CONSTRAINT "transition_mode" CHECK ("transition_decisions"."mode" IN ('CARRY','FRESH_START','DEFER') AND "transition_decisions"."observation_mode" IN ('ACTUAL_CHECK','REUSE_CONFIRMED') AND ("transition_decisions"."mode"<>'FRESH_START' OR "transition_decisions"."observation_mode"='ACTUAL_CHECK'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"google_subject" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"locale" text DEFAULT 'ru' NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	CONSTRAINT "users_google_subject_unique" UNIQUE("google_subject")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_revisions" ADD CONSTRAINT "allocation_revisions_owner_user_id_account_id_accounts_owner_user_id_id_fk" FOREIGN KEY ("owner_user_id","account_id") REFERENCES "public"."accounts"("owner_user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_revisions" ADD CONSTRAINT "allocation_revisions_owner_user_id_account_id_budget_update_id_recorded_seq_budget_updates_owner_user_id_account_id_id_recorded_seq_fk" FOREIGN KEY ("owner_user_id","account_id","budget_update_id","recorded_seq") REFERENCES "public"."budget_updates"("owner_user_id","account_id","id","recorded_seq") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_owner_user_id_account_id_accounts_owner_user_id_id_fk" FOREIGN KEY ("owner_user_id","account_id") REFERENCES "public"."accounts"("owner_user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_owner_user_id_account_id_budget_update_id_recorded_seq_budget_updates_owner_user_id_account_id_id_recorded_seq_fk" FOREIGN KEY ("owner_user_id","account_id","budget_update_id","recorded_seq") REFERENCES "public"."budget_updates"("owner_user_id","account_id","id","recorded_seq") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balance_checkpoints" ADD CONSTRAINT "balance_checkpoints_owner_user_id_account_id_accounts_owner_user_id_id_fk" FOREIGN KEY ("owner_user_id","account_id") REFERENCES "public"."accounts"("owner_user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balance_checkpoints" ADD CONSTRAINT "balance_checkpoints_owner_user_id_account_id_budget_update_id_recorded_seq_budget_updates_owner_user_id_account_id_id_recorded_seq_fk" FOREIGN KEY ("owner_user_id","account_id","budget_update_id","recorded_seq") REFERENCES "public"."budget_updates"("owner_user_id","account_id","id","recorded_seq") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_periods" ADD CONSTRAINT "budget_periods_owner_user_id_account_id_accounts_owner_user_id_id_fk" FOREIGN KEY ("owner_user_id","account_id") REFERENCES "public"."accounts"("owner_user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_transfers" ADD CONSTRAINT "budget_transfers_owner_user_id_account_id_accounts_owner_user_id_id_fk" FOREIGN KEY ("owner_user_id","account_id") REFERENCES "public"."accounts"("owner_user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_transfers" ADD CONSTRAINT "budget_transfers_owner_user_id_account_id_budget_update_id_recorded_seq_budget_updates_owner_user_id_account_id_id_recorded_seq_fk" FOREIGN KEY ("owner_user_id","account_id","budget_update_id","recorded_seq") REFERENCES "public"."budget_updates"("owner_user_id","account_id","id","recorded_seq") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_updates" ADD CONSTRAINT "budget_updates_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_updates" ADD CONSTRAINT "budget_updates_owner_user_id_account_id_accounts_owner_user_id_id_fk" FOREIGN KEY ("owner_user_id","account_id") REFERENCES "public"."accounts"("owner_user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historical_positions" ADD CONSTRAINT "historical_positions_owner_user_id_account_id_accounts_owner_user_id_id_fk" FOREIGN KEY ("owner_user_id","account_id") REFERENCES "public"."accounts"("owner_user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historical_positions" ADD CONSTRAINT "historical_positions_owner_user_id_account_id_budget_update_id_recorded_seq_budget_updates_owner_user_id_account_id_id_recorded_seq_fk" FOREIGN KEY ("owner_user_id","account_id","budget_update_id","recorded_seq") REFERENCES "public"."budget_updates"("owner_user_id","account_id","id","recorded_seq") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "month_closings" ADD CONSTRAINT "month_closings_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "month_closings" ADD CONSTRAINT "month_closings_owner_user_id_account_id_accounts_owner_user_id_id_fk" FOREIGN KEY ("owner_user_id","account_id") REFERENCES "public"."accounts"("owner_user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "month_closings" ADD CONSTRAINT "month_closings_owner_user_id_account_id_budget_update_id_recorded_seq_budget_updates_owner_user_id_account_id_id_recorded_seq_fk" FOREIGN KEY ("owner_user_id","account_id","budget_update_id","recorded_seq") REFERENCES "public"."budget_updates"("owner_user_id","account_id","id","recorded_seq") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation_events" ADD CONSTRAINT "obligation_events_owner_user_id_account_id_accounts_owner_user_id_id_fk" FOREIGN KEY ("owner_user_id","account_id") REFERENCES "public"."accounts"("owner_user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation_events" ADD CONSTRAINT "obligation_events_owner_user_id_account_id_budget_update_id_recorded_seq_budget_updates_owner_user_id_account_id_id_recorded_seq_fk" FOREIGN KEY ("owner_user_id","account_id","budget_update_id","recorded_seq") REFERENCES "public"."budget_updates"("owner_user_id","account_id","id","recorded_seq") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligations" ADD CONSTRAINT "obligations_owner_user_id_account_id_accounts_owner_user_id_id_fk" FOREIGN KEY ("owner_user_id","account_id") REFERENCES "public"."accounts"("owner_user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligations" ADD CONSTRAINT "obligations_owner_user_id_account_id_budget_update_id_recorded_seq_budget_updates_owner_user_id_account_id_id_recorded_seq_fk" FOREIGN KEY ("owner_user_id","account_id","budget_update_id","recorded_seq") REFERENCES "public"."budget_updates"("owner_user_id","account_id","id","recorded_seq") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordering_revisions" ADD CONSTRAINT "ordering_revisions_owner_user_id_account_id_accounts_owner_user_id_id_fk" FOREIGN KEY ("owner_user_id","account_id") REFERENCES "public"."accounts"("owner_user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordering_revisions" ADD CONSTRAINT "ordering_revisions_owner_user_id_account_id_budget_update_id_recorded_seq_budget_updates_owner_user_id_account_id_id_recorded_seq_fk" FOREIGN KEY ("owner_user_id","account_id","budget_update_id","recorded_seq") REFERENCES "public"."budget_updates"("owner_user_id","account_id","id","recorded_seq") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "period_allocations" ADD CONSTRAINT "period_allocations_owner_user_id_account_id_accounts_owner_user_id_id_fk" FOREIGN KEY ("owner_user_id","account_id") REFERENCES "public"."accounts"("owner_user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_heads" ADD CONSTRAINT "report_heads_owner_user_id_account_id_accounts_owner_user_id_id_fk" FOREIGN KEY ("owner_user_id","account_id") REFERENCES "public"."accounts"("owner_user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_events" ADD CONSTRAINT "savings_events_owner_user_id_account_id_accounts_owner_user_id_id_fk" FOREIGN KEY ("owner_user_id","account_id") REFERENCES "public"."accounts"("owner_user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_events" ADD CONSTRAINT "savings_events_owner_user_id_account_id_budget_update_id_recorded_seq_budget_updates_owner_user_id_account_id_id_recorded_seq_fk" FOREIGN KEY ("owner_user_id","account_id","budget_update_id","recorded_seq") REFERENCES "public"."budget_updates"("owner_user_id","account_id","id","recorded_seq") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_owner_user_id_account_id_accounts_owner_user_id_id_fk" FOREIGN KEY ("owner_user_id","account_id") REFERENCES "public"."accounts"("owner_user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_owner_user_id_account_id_budget_update_id_recorded_seq_budget_updates_owner_user_id_account_id_id_recorded_seq_fk" FOREIGN KEY ("owner_user_id","account_id","budget_update_id","recorded_seq") REFERENCES "public"."budget_updates"("owner_user_id","account_id","id","recorded_seq") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_proposals" ADD CONSTRAINT "transfer_proposals_owner_user_id_account_id_accounts_owner_user_id_id_fk" FOREIGN KEY ("owner_user_id","account_id") REFERENCES "public"."accounts"("owner_user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transition_decisions" ADD CONSTRAINT "transition_decisions_owner_user_id_account_id_accounts_owner_user_id_id_fk" FOREIGN KEY ("owner_user_id","account_id") REFERENCES "public"."accounts"("owner_user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transition_decisions" ADD CONSTRAINT "transition_decisions_owner_user_id_account_id_budget_update_id_recorded_seq_budget_updates_owner_user_id_account_id_id_recorded_seq_fk" FOREIGN KEY ("owner_user_id","account_id","budget_update_id","recorded_seq") REFERENCES "public"."budget_updates"("owner_user_id","account_id","id","recorded_seq") ON DELETE no action ON UPDATE no action;