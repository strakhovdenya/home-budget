CREATE TABLE "transfer_proposal_cancellations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"proposal_id" uuid NOT NULL,
	"control_request_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"payload_identity" text NOT NULL,
	"document" jsonb NOT NULL,
	"cancelled_at" timestamp with time zone NOT NULL,
	"reason" text NOT NULL,
	CONSTRAINT "transfer_proposal_cancellations_owner_user_id_account_id_id_unique" UNIQUE("owner_user_id","account_id","id"),
	CONSTRAINT "transfer_proposal_cancellations_owner_user_id_account_id_control_request_id_unique" UNIQUE("owner_user_id","account_id","control_request_id"),
	CONSTRAINT "transfer_proposal_cancellations_proposal_id_unique" UNIQUE("proposal_id"),
	CONSTRAINT "cancel_actor" CHECK ("transfer_proposal_cancellations"."actor_id"="transfer_proposal_cancellations"."owner_user_id")
);
--> statement-breakpoint
ALTER TABLE "transfer_proposals" ALTER COLUMN "source_period_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "obligation_events" ADD COLUMN "transition_decision_id" uuid;--> statement-breakpoint
ALTER TABLE "savings_events" ADD COLUMN "transition_decision_id" uuid;--> statement-breakpoint
ALTER TABLE "transfer_proposals" ADD COLUMN "mode" text;--> statement-breakpoint
ALTER TABLE "transfer_proposals" ADD COLUMN "observation_mode" text;--> statement-breakpoint
ALTER TABLE "transition_decisions" ADD COLUMN "proposal_id" uuid;--> statement-breakpoint
ALTER TABLE "transfer_proposal_cancellations" ADD CONSTRAINT "transfer_proposal_cancellations_owner_user_id_account_id_accounts_owner_user_id_id_fk" FOREIGN KEY ("owner_user_id","account_id") REFERENCES "public"."accounts"("owner_user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transition_decisions" ADD CONSTRAINT "transition_decisions_proposal_id_unique" UNIQUE("proposal_id");
--> statement-breakpoint
ALTER TABLE obligation_events DROP CONSTRAINT obligation_action;
ALTER TABLE obligation_events ADD CONSTRAINT obligation_action CHECK(action IN ('CREATE','AMEND','PARTIAL_SETTLEMENT','PAID','CANCELLED','FUNDING_TRANSFER'));
ALTER TABLE savings_events DROP CONSTRAINT saving_action;
ALTER TABLE savings_events ADD CONSTRAINT saving_action CHECK(action IN ('CREATE','AMEND','INCREASE','PARTIAL_RELEASE','FULL_RELEASE','FUNDING_TRANSFER'));
ALTER TABLE obligation_events ADD CONSTRAINT obligation_funding_decision CHECK((action='FUNDING_TRANSFER')=(transition_decision_id IS NOT NULL));
ALTER TABLE savings_events ADD CONSTRAINT saving_funding_decision CHECK((action='FUNDING_TRANSFER')=(transition_decision_id IS NOT NULL));
ALTER TABLE obligation_events ADD CONSTRAINT obligation_decision_scope FOREIGN KEY(owner_user_id,account_id,transition_decision_id) REFERENCES transition_decisions(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE savings_events ADD CONSTRAINT saving_decision_scope FOREIGN KEY(owner_user_id,account_id,transition_decision_id) REFERENCES transition_decisions(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE transition_decisions ADD CONSTRAINT decision_proposal_scope FOREIGN KEY(owner_user_id,account_id,proposal_id) REFERENCES transfer_proposals(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE transfer_proposal_cancellations ADD CONSTRAINT cancellation_proposal_scope FOREIGN KEY(owner_user_id,account_id,proposal_id) REFERENCES transfer_proposals(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
CREATE UNIQUE INDEX obligation_one_funding ON obligation_events(transition_decision_id,obligation_id) WHERE action='FUNDING_TRANSFER';
CREATE UNIQUE INDEX saving_one_funding ON savings_events(transition_decision_id,savings_id) WHERE action='FUNDING_TRANSFER';
CREATE TRIGGER cancellations_immutable BEFORE UPDATE OR DELETE ON transfer_proposal_cancellations FOR EACH ROW EXECUTE FUNCTION hb_immutable();

--> statement-breakpoint
CREATE OR REPLACE FUNCTION hb_obligation_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p obligation_events; c obligation_events; e obligation_events;
BEGIN
 IF NEW.supersedes_id IS NOT NULL THEN
  SELECT * INTO c FROM obligation_events WHERE id=NEW.supersedes_id;
  IF c.obligation_id IS DISTINCT FROM NEW.obligation_id OR c.action IS DISTINCT FROM NEW.action THEN
   RAISE EXCEPTION 'INVALID_OBLIGATION_CORRECTION' USING ERRCODE='23514';
  END IF;
 END IF;
 IF NEW.action='CREATE' THEN
  IF NEW.previous_revision_id IS NOT NULL OR NEW.before_state IS NOT NULL OR NEW.status<>'UNPAID' OR NEW.outstanding_cents<>NEW.original_cents THEN
   RAISE EXCEPTION 'INVALID_OBLIGATION_CREATE' USING ERRCODE='23514';
  END IF;
 ELSE
  SELECT * INTO p FROM obligation_events WHERE id=NEW.previous_revision_id AND owner_user_id=NEW.owner_user_id AND account_id=NEW.account_id;
  IF p.id IS NULL OR p.obligation_id<>NEW.obligation_id OR p.recorded_seq>NEW.recorded_seq
   OR (p.recorded_seq=NEW.recorded_seq AND p.budget_update_id<>NEW.budget_update_id)
   OR NOT hb_obligation_before(p.position_id,NEW.position_id,NEW.owner_user_id,NEW.account_id,NEW.recorded_seq)
   OR NEW.before_state IS DISTINCT FROM hb_obligation_snapshot(p) THEN
   RAISE EXCEPTION 'INVALID_OBLIGATION_PREDECESSOR' USING ERRCODE='23514';
  END IF;
  IF p.status<>'UNPAID' OR (NEW.action<>'FUNDING_TRANSFER' AND p.funding_period_id<>NEW.funding_period_id) THEN
   RAISE EXCEPTION 'TERMINAL_OR_FUNDING_CHANGE' USING ERRCODE='23514';
  END IF;
  IF NEW.action='FUNDING_TRANSFER' THEN
   IF NEW.supersedes_id IS NOT NULL OR NEW.funding_period_id=p.funding_period_id OR NEW.status<>p.status OR NEW.original_cents<>p.original_cents OR NEW.outstanding_cents<>p.outstanding_cents OR NEW.title<>p.title OR NEW.due_date IS DISTINCT FROM p.due_date OR NEW.is_possible<>p.is_possible OR NEW.reserve_full<>p.reserve_full OR NEW.bank_date IS NOT NULL THEN
    RAISE EXCEPTION 'INVALID_FUNDING_STATE' USING ERRCODE='23514';
   END IF;
  ELSIF NEW.action='AMEND' THEN
   IF NEW.status<>'UNPAID' OR NEW.original_cents::numeric-NEW.outstanding_cents::numeric<>p.original_cents::numeric-p.outstanding_cents::numeric THEN
    RAISE EXCEPTION 'INVALID_OBLIGATION_AMEND' USING ERRCODE='23514';
   END IF;
  ELSE
   IF NEW.original_cents<>p.original_cents OR NEW.title<>p.title OR NEW.due_date IS DISTINCT FROM p.due_date OR NEW.is_possible<>p.is_possible THEN
    RAISE EXCEPTION 'INVALID_OBLIGATION_TRANSITION' USING ERRCODE='23514';
   END IF;
   IF (NEW.action='PARTIAL_SETTLEMENT' AND (NEW.status<>'UNPAID' OR NEW.outstanding_cents>=p.outstanding_cents OR NEW.reserve_full<>p.reserve_full))
    OR (NEW.action='PAID' AND (NEW.status<>'PAID' OR NEW.outstanding_cents<>0))
    OR (NEW.action='CANCELLED' AND (NEW.status<>'CANCELLED' OR NEW.outstanding_cents<>p.outstanding_cents)) THEN
    RAISE EXCEPTION 'INVALID_OBLIGATION_TRANSITION' USING ERRCODE='23514';
   END IF;
  END IF;
 END IF;
 -- Resolve corrections at final batch knowledge; an old UNPAID reference cannot bypass terminal state.
 FOR e IN SELECT t.* FROM obligation_events t WHERE t.obligation_id=NEW.obligation_id AND t.account_id=NEW.account_id AND t.recorded_seq<=NEW.recorded_seq
  AND NOT EXISTS(SELECT 1 FROM obligation_events child WHERE child.supersedes_id=t.id AND child.recorded_seq<=NEW.recorded_seq)
  AND t.status IN ('PAID','CANCELLED')
 LOOP
  IF EXISTS(SELECT 1 FROM obligation_events t WHERE t.obligation_id=e.obligation_id AND t.recorded_seq<=NEW.recorded_seq AND t.id<>e.id
   AND NOT EXISTS(SELECT 1 FROM obligation_events child WHERE child.supersedes_id=t.id AND child.recorded_seq<=NEW.recorded_seq)
   AND NOT hb_obligation_before(t.position_id,e.position_id,NEW.owner_user_id,NEW.account_id,NEW.recorded_seq)) THEN
   RAISE EXCEPTION 'TERMINAL_OBLIGATION' USING ERRCODE='23514';
  END IF;
 END LOOP;
 RETURN NULL;
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION hb_saving_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p savings_events; c savings_events; e savings_events;
BEGIN
 IF NEW.supersedes_id IS NOT NULL THEN
  SELECT * INTO c FROM savings_events WHERE id=NEW.supersedes_id;
  IF c.savings_id IS DISTINCT FROM NEW.savings_id OR c.action IS DISTINCT FROM NEW.action
   OR c.position_id IS DISTINCT FROM NEW.position_id OR c.effective_date IS DISTINCT FROM NEW.effective_date
   OR c.funding_period_id IS DISTINCT FROM NEW.funding_period_id THEN
   RAISE EXCEPTION 'INVALID_SAVING_CORRECTION' USING ERRCODE='23514';
  END IF;
 END IF;
 IF NEW.action='CREATE' THEN
  IF NEW.previous_revision_id IS NOT NULL OR NEW.before_state IS NOT NULL OR NEW.status<>'ACTIVE' THEN
   RAISE EXCEPTION 'INVALID_SAVING_CREATE' USING ERRCODE='23514';
  END IF;
 ELSE
  SELECT * INTO p FROM savings_events WHERE id=NEW.previous_revision_id AND owner_user_id=NEW.owner_user_id AND account_id=NEW.account_id;
  IF p.id IS NULL OR p.savings_id<>NEW.savings_id OR p.recorded_seq>NEW.recorded_seq
   OR (p.recorded_seq=NEW.recorded_seq AND p.budget_update_id<>NEW.budget_update_id)
   OR NOT hb_position_before(p.position_id,NEW.position_id,NEW.owner_user_id,NEW.account_id,NEW.recorded_seq)
   OR NEW.before_state IS DISTINCT FROM hb_saving_snapshot(p) THEN
   RAISE EXCEPTION 'INVALID_SAVING_PREDECESSOR' USING ERRCODE='23514';
  END IF;
  IF p.status<>'ACTIVE' OR (NEW.action<>'FUNDING_TRANSFER' AND p.funding_period_id<>NEW.funding_period_id) THEN
   RAISE EXCEPTION 'TERMINAL_OR_FUNDING_CHANGE' USING ERRCODE='23514';
  END IF;
  IF NEW.action='FUNDING_TRANSFER' THEN
   IF NEW.supersedes_id IS NOT NULL OR NEW.funding_period_id=p.funding_period_id OR NEW.status<>p.status OR NEW.amount_cents<>p.amount_cents OR NEW.title<>p.title THEN
    RAISE EXCEPTION 'INVALID_FUNDING_STATE' USING ERRCODE='23514';
   END IF;
  ELSIF NEW.action='AMEND' THEN
   IF NEW.amount_cents<>p.amount_cents OR NEW.status<>'ACTIVE' OR NEW.title=p.title THEN
    RAISE EXCEPTION 'INVALID_SAVING_AMEND' USING ERRCODE='23514';
   END IF;
  ELSE
   IF NEW.title<>p.title OR (NEW.action='INCREASE' AND (NEW.status<>'ACTIVE' OR NEW.amount_cents<=p.amount_cents))
    OR (NEW.action='PARTIAL_RELEASE' AND (NEW.status<>'ACTIVE' OR NEW.amount_cents>=p.amount_cents))
    OR (NEW.action='FULL_RELEASE' AND (NEW.status<>'RELEASED' OR NEW.amount_cents<>0)) THEN
    RAISE EXCEPTION 'INVALID_SAVING_TRANSITION' USING ERRCODE='23514';
   END IF;
  END IF;
 END IF;
 FOR e IN SELECT t.* FROM savings_events t WHERE t.savings_id=NEW.savings_id AND t.account_id=NEW.account_id AND t.recorded_seq<=NEW.recorded_seq
  AND NOT EXISTS(SELECT 1 FROM savings_events child WHERE child.supersedes_id=t.id AND child.recorded_seq<=NEW.recorded_seq) AND t.status='RELEASED'
 LOOP
  IF EXISTS(SELECT 1 FROM savings_events t WHERE t.savings_id=e.savings_id AND t.recorded_seq<=NEW.recorded_seq AND t.id<>e.id
   AND NOT EXISTS(SELECT 1 FROM savings_events child WHERE child.supersedes_id=t.id AND child.recorded_seq<=NEW.recorded_seq)
   AND NOT hb_position_before(t.position_id,e.position_id,NEW.owner_user_id,NEW.account_id,NEW.recorded_seq)) THEN
   RAISE EXCEPTION 'TERMINAL_SAVING' USING ERRCODE='23514';
  END IF;
 END LOOP;
 RETURN NULL;
END $$;

--> statement-breakpoint
CREATE FUNCTION hb_funding_link() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d transition_decisions; m jsonb; src uuid; target uuid; p text; t text;
BEGIN
 IF NEW.action<>'FUNDING_TRANSFER' THEN RETURN NULL; END IF;
 SELECT * INTO d FROM transition_decisions WHERE id=NEW.transition_decision_id AND owner_user_id=NEW.owner_user_id AND account_id=NEW.account_id;
 src:=(NEW.before_state->>'fundingPeriodId')::uuid;
 SELECT period INTO p FROM budget_periods WHERE id=src AND account_id=NEW.account_id;
 SELECT period INTO t FROM budget_periods WHERE id=NEW.funding_period_id AND account_id=NEW.account_id;
 m:=d.manifest; target:=(m->>'targetPeriodId')::uuid;
 IF d.id IS NULL OR d.mode NOT IN ('CARRY','FRESH_START') OR d.budget_update_id<>NEW.budget_update_id OR d.recorded_seq<>NEW.recorded_seq OR d.position_id<>NEW.position_id OR target IS DISTINCT FROM NEW.funding_period_id OR p IS NULL OR t IS NULL OR p>=t
  OR (d.mode='CARRY' AND src IS DISTINCT FROM (SELECT source_period_id FROM transfer_proposals WHERE id=d.proposal_id))
  OR NOT COALESCE((m->'sourcePeriodIds') @> jsonb_build_array(src::text),false)
  OR NOT COALESCE((m->'funding') @> jsonb_build_array(jsonb_build_object('decisionId',d.id,'budgetUpdateId',NEW.budget_update_id,'positionId',NEW.position_id,'sourcePeriodId',src,'targetPeriodId',target,'beforeRevisionId',NEW.previous_revision_id,'afterRevisionId',NEW.id)),false)
 THEN RAISE EXCEPTION 'INVALID_FUNDING_DECISION' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER obligation_funding_link AFTER INSERT ON obligation_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hb_funding_link();
CREATE CONSTRAINT TRIGGER saving_funding_link AFTER INSERT ON savings_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hb_funding_link();

--> statement-breakpoint
CREATE FUNCTION hb_proposal_lock() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM 1 FROM accounts WHERE id=NEW.account_id AND owner_user_id=NEW.owner_user_id FOR UPDATE;
 RETURN NEW;
END $$;
CREATE TRIGGER cancellation_account_lock BEFORE INSERT ON transfer_proposal_cancellations FOR EACH ROW EXECUTE FUNCTION hb_proposal_lock();
CREATE TRIGGER decision_account_lock BEFORE INSERT ON transition_decisions FOR EACH ROW EXECUTE FUNCTION hb_proposal_lock();
CREATE FUNCTION hb_proposal_outcome() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE pid uuid; p transfer_proposals; d transition_decisions; pos historical_positions; src text; target text;
BEGIN
 pid:=NEW.proposal_id;
 IF pid IS NULL THEN
  RAISE EXCEPTION 'MISSING_PROPOSAL' USING ERRCODE='23514';
 END IF;
 SELECT * INTO p FROM transfer_proposals WHERE id=pid AND owner_user_id=NEW.owner_user_id AND account_id=NEW.account_id;
 IF p.id IS NULL THEN RAISE EXCEPTION 'PROPOSAL_SCOPE' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM transition_decisions WHERE proposal_id=pid) AND EXISTS(SELECT 1 FROM transfer_proposal_cancellations WHERE proposal_id=pid) THEN
  RAISE EXCEPTION 'PROPOSAL_TERMINAL_CONFLICT' USING ERRCODE='23514';
 END IF;
 IF TG_TABLE_NAME='transition_decisions' THEN
  d:=NEW;
  SELECT * INTO pos FROM historical_positions WHERE id=d.position_id;
  SELECT period INTO target FROM budget_periods WHERE id=p.target_period_id;
  SELECT period INTO src FROM budget_periods WHERE id=p.source_period_id;
  IF d.mode IS DISTINCT FROM p.mode OR d.observation_mode IS DISTINCT FROM p.observation_mode OR d.before_allocation_revision_id IS DISTINCT FROM p.base_allocation_revision_id
   OR (d.manifest->>'targetPeriodId') IS DISTINCT FROM p.target_period_id::text OR pos.budget_update_id<>d.budget_update_id
   OR d.position_id IS DISTINCT FROM (SELECT position_id FROM allocation_revisions WHERE id=d.after_allocation_revision_id)
   OR (d.observation_mode='REUSE_CONFIRMED' AND p.base_checkpoint_id IS DISTINCT FROM (SELECT checkpoint_id FROM allocation_revisions WHERE id=d.after_allocation_revision_id))
   OR (d.mode='CARRY' AND (src IS NULL OR src>=target OR NOT EXISTS(SELECT 1 FROM budget_transfers WHERE decision_id=d.id)))
   OR (d.mode<>'CARRY' AND EXISTS(SELECT 1 FROM budget_transfers WHERE decision_id=d.id)) THEN
   RAISE EXCEPTION 'PROPOSAL_DECISION_MISMATCH' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER proposal_cancel_outcome AFTER INSERT ON transfer_proposal_cancellations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hb_proposal_outcome();
CREATE CONSTRAINT TRIGGER proposal_confirm_outcome AFTER INSERT ON transition_decisions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hb_proposal_outcome();

--> statement-breakpoint
CREATE FUNCTION hb_transfer_final_source() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d transition_decisions;
BEGIN
 SELECT * INTO d FROM transition_decisions WHERE id=NEW.decision_id;
 IF COALESCE((SELECT sum(amount_cents) FROM period_allocations WHERE allocation_revision_id=NEW.after_allocation_revision_id AND period_id=NEW.source_period_id),0)<>0
  OR (d.proposal_id IS NOT NULL AND d.proposal_id<>NEW.proposal_id) THEN RAISE EXCEPTION 'INVALID_FINAL_TRANSFER' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER transfer_final_source AFTER INSERT ON budget_transfers DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hb_transfer_final_source();

--> statement-breakpoint
CREATE FUNCTION hb_proposal_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v allocation_revisions; src text; target text;
BEGIN
 SELECT * INTO v FROM allocation_revisions WHERE id=NEW.base_allocation_revision_id;
 SELECT period INTO src FROM budget_periods WHERE id=NEW.source_period_id;
 SELECT period INTO target FROM budget_periods WHERE id=NEW.target_period_id;
 IF NEW.mode IS NULL OR NEW.mode NOT IN ('CARRY','FRESH_START','DEFER') OR NEW.observation_mode IS NULL OR NEW.observation_mode NOT IN ('ACTUAL_CHECK','REUSE_CONFIRMED')
  OR (NEW.mode='FRESH_START' AND NEW.observation_mode<>'ACTUAL_CHECK') OR NEW.expected_revision<0
  OR v.checkpoint_id IS DISTINCT FROM NEW.base_checkpoint_id OR NEW.proposal->>'schemaVersion' IS DISTINCT FROM '1' OR jsonb_typeof(NEW.proposal->'input'->'allocations') IS DISTINCT FROM 'array'
  OR (NEW.mode='CARRY' AND (src IS NULL OR src>=target)) OR (NEW.mode<>'CARRY' AND NEW.source_period_id IS NOT NULL)
 THEN RAISE EXCEPTION 'INVALID_PROPOSAL' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER proposal_insert_integrity AFTER INSERT ON transfer_proposals DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hb_proposal_insert();

--> statement-breakpoint
CREATE FUNCTION hb_confirmed_vector_match() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p transfer_proposals; actual jsonb; expected jsonb;
BEGIN
 SELECT * INTO p FROM transfer_proposals WHERE id=NEW.proposal_id;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('period',b.period,'amountCents',a.amount_cents::text) ORDER BY b.period),'[]') INTO actual
 FROM period_allocations a JOIN budget_periods b ON b.id=a.period_id WHERE a.allocation_revision_id=NEW.after_allocation_revision_id;
 SELECT COALESCE(jsonb_agg(e ORDER BY e->>'period'),'[]') INTO expected FROM jsonb_array_elements(p.proposal->'input'->'allocations') e;
 IF actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'CONFIRMED_VECTOR_MISMATCH' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER confirmed_vector_match AFTER INSERT ON transition_decisions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hb_confirmed_vector_match();
