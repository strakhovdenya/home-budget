ALTER TABLE ordering_revisions ADD CONSTRAINT ordering_revisions_previous_revision_id_scope_fk FOREIGN KEY (owner_user_id,account_id,previous_revision_id) REFERENCES ordering_revisions(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE balance_checkpoints ADD CONSTRAINT balance_checkpoints_supersedes_id_scope_fk FOREIGN KEY (owner_user_id,account_id,supersedes_id) REFERENCES balance_checkpoints(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE balance_checkpoints ADD CONSTRAINT balance_checkpoints_position_id_scope_fk FOREIGN KEY (owner_user_id,account_id,position_id) REFERENCES historical_positions(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE allocation_revisions ADD CONSTRAINT allocation_revisions_supersedes_id_scope_fk FOREIGN KEY (owner_user_id,account_id,supersedes_id) REFERENCES allocation_revisions(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE allocation_revisions ADD CONSTRAINT allocation_revisions_checkpoint_id_scope_fk FOREIGN KEY (owner_user_id,account_id,checkpoint_id) REFERENCES balance_checkpoints(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE allocation_revisions ADD CONSTRAINT allocation_revisions_previous_revision_id_scope_fk FOREIGN KEY (owner_user_id,account_id,previous_revision_id) REFERENCES allocation_revisions(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE allocation_revisions ADD CONSTRAINT allocation_revisions_position_id_scope_fk FOREIGN KEY (owner_user_id,account_id,position_id) REFERENCES historical_positions(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE period_allocations ADD CONSTRAINT period_allocations_allocation_revision_id_scope_fk FOREIGN KEY (owner_user_id,account_id,allocation_revision_id) REFERENCES allocation_revisions(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE period_allocations ADD CONSTRAINT period_allocations_period_id_scope_fk FOREIGN KEY (owner_user_id,account_id,period_id) REFERENCES budget_periods(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE obligations ADD CONSTRAINT obligations_originating_period_id_scope_fk FOREIGN KEY (owner_user_id,account_id,originating_period_id) REFERENCES budget_periods(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE obligation_events ADD CONSTRAINT obligation_events_obligation_id_scope_fk FOREIGN KEY (owner_user_id,account_id,obligation_id) REFERENCES obligations(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE obligation_events ADD CONSTRAINT obligation_events_previous_revision_id_scope_fk FOREIGN KEY (owner_user_id,account_id,previous_revision_id) REFERENCES obligation_events(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE obligation_events ADD CONSTRAINT obligation_events_supersedes_id_scope_fk FOREIGN KEY (owner_user_id,account_id,supersedes_id) REFERENCES obligation_events(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE obligation_events ADD CONSTRAINT obligation_events_position_id_scope_fk FOREIGN KEY (owner_user_id,account_id,position_id) REFERENCES historical_positions(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE obligation_events ADD CONSTRAINT obligation_events_funding_period_id_scope_fk FOREIGN KEY (owner_user_id,account_id,funding_period_id) REFERENCES budget_periods(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE savings_goals ADD CONSTRAINT savings_goals_originating_period_id_scope_fk FOREIGN KEY (owner_user_id,account_id,originating_period_id) REFERENCES budget_periods(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE savings_events ADD CONSTRAINT savings_events_savings_id_scope_fk FOREIGN KEY (owner_user_id,account_id,savings_id) REFERENCES savings_goals(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE savings_events ADD CONSTRAINT savings_events_previous_revision_id_scope_fk FOREIGN KEY (owner_user_id,account_id,previous_revision_id) REFERENCES savings_events(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE savings_events ADD CONSTRAINT savings_events_supersedes_id_scope_fk FOREIGN KEY (owner_user_id,account_id,supersedes_id) REFERENCES savings_events(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE savings_events ADD CONSTRAINT savings_events_position_id_scope_fk FOREIGN KEY (owner_user_id,account_id,position_id) REFERENCES historical_positions(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE savings_events ADD CONSTRAINT savings_events_funding_period_id_scope_fk FOREIGN KEY (owner_user_id,account_id,funding_period_id) REFERENCES budget_periods(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE transfer_proposals ADD CONSTRAINT transfer_proposals_base_checkpoint_id_scope_fk FOREIGN KEY (owner_user_id,account_id,base_checkpoint_id) REFERENCES balance_checkpoints(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE transfer_proposals ADD CONSTRAINT transfer_proposals_base_allocation_revision_id_scope_fk FOREIGN KEY (owner_user_id,account_id,base_allocation_revision_id) REFERENCES allocation_revisions(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE transfer_proposals ADD CONSTRAINT transfer_proposals_target_period_id_scope_fk FOREIGN KEY (owner_user_id,account_id,target_period_id) REFERENCES budget_periods(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE transfer_proposals ADD CONSTRAINT transfer_proposals_source_period_id_scope_fk FOREIGN KEY (owner_user_id,account_id,source_period_id) REFERENCES budget_periods(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE transition_decisions ADD CONSTRAINT transition_decisions_before_allocation_revision_id_scope_fk FOREIGN KEY (owner_user_id,account_id,before_allocation_revision_id) REFERENCES allocation_revisions(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE transition_decisions ADD CONSTRAINT transition_decisions_after_allocation_revision_id_scope_fk FOREIGN KEY (owner_user_id,account_id,after_allocation_revision_id) REFERENCES allocation_revisions(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE transition_decisions ADD CONSTRAINT transition_decisions_position_id_scope_fk FOREIGN KEY (owner_user_id,account_id,position_id) REFERENCES historical_positions(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE budget_transfers ADD CONSTRAINT budget_transfers_proposal_id_scope_fk FOREIGN KEY (owner_user_id,account_id,proposal_id) REFERENCES transfer_proposals(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE budget_transfers ADD CONSTRAINT budget_transfers_decision_id_scope_fk FOREIGN KEY (owner_user_id,account_id,decision_id) REFERENCES transition_decisions(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE budget_transfers ADD CONSTRAINT budget_transfers_source_period_id_scope_fk FOREIGN KEY (owner_user_id,account_id,source_period_id) REFERENCES budget_periods(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE budget_transfers ADD CONSTRAINT budget_transfers_target_period_id_scope_fk FOREIGN KEY (owner_user_id,account_id,target_period_id) REFERENCES budget_periods(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE budget_transfers ADD CONSTRAINT budget_transfers_before_allocation_revision_id_scope_fk FOREIGN KEY (owner_user_id,account_id,before_allocation_revision_id) REFERENCES allocation_revisions(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE budget_transfers ADD CONSTRAINT budget_transfers_after_allocation_revision_id_scope_fk FOREIGN KEY (owner_user_id,account_id,after_allocation_revision_id) REFERENCES allocation_revisions(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE month_closings ADD CONSTRAINT month_closings_period_id_scope_fk FOREIGN KEY (owner_user_id,account_id,period_id) REFERENCES budget_periods(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE month_closings ADD CONSTRAINT month_closings_previous_version_id_scope_fk FOREIGN KEY (owner_user_id,account_id,previous_version_id) REFERENCES month_closings(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE month_closings ADD CONSTRAINT month_closings_last_checkpoint_id_scope_fk FOREIGN KEY (owner_user_id,account_id,last_checkpoint_id) REFERENCES balance_checkpoints(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE month_closings ADD CONSTRAINT month_closings_end_checkpoint_id_scope_fk FOREIGN KEY (owner_user_id,account_id,end_checkpoint_id) REFERENCES balance_checkpoints(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE month_closings ADD CONSTRAINT month_closings_historical_allocation_revision_id_scope_fk FOREIGN KEY (owner_user_id,account_id,historical_allocation_revision_id) REFERENCES allocation_revisions(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE report_heads ADD CONSTRAINT report_heads_period_id_scope_fk FOREIGN KEY (owner_user_id,account_id,period_id) REFERENCES budget_periods(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE report_heads ADD CONSTRAINT report_heads_closing_id_scope_fk FOREIGN KEY (owner_user_id,account_id,closing_id) REFERENCES month_closings(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE accounts ADD CONSTRAINT accounts_active_allocation_revision_id_scope_fk FOREIGN KEY (owner_user_id,id,active_allocation_revision_id) REFERENCES allocation_revisions(owner_user_id,account_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
CREATE FUNCTION hb_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'IMMUTABLE_HISTORY' USING ERRCODE='23514'; END $$;
--> statement-breakpoint
CREATE TRIGGER budget_updates_immutable BEFORE UPDATE OR DELETE ON budget_updates FOR EACH ROW EXECUTE FUNCTION hb_immutable();
--> statement-breakpoint
CREATE TRIGGER budget_periods_immutable BEFORE UPDATE OR DELETE ON budget_periods FOR EACH ROW EXECUTE FUNCTION hb_immutable();
--> statement-breakpoint
CREATE TRIGGER audit_events_immutable BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION hb_immutable();
--> statement-breakpoint
CREATE TRIGGER historical_positions_immutable BEFORE UPDATE OR DELETE ON historical_positions FOR EACH ROW EXECUTE FUNCTION hb_immutable();
--> statement-breakpoint
CREATE TRIGGER ordering_revisions_immutable BEFORE UPDATE OR DELETE ON ordering_revisions FOR EACH ROW EXECUTE FUNCTION hb_immutable();
--> statement-breakpoint
CREATE TRIGGER balance_checkpoints_immutable BEFORE UPDATE OR DELETE ON balance_checkpoints FOR EACH ROW EXECUTE FUNCTION hb_immutable();
--> statement-breakpoint
CREATE TRIGGER allocation_revisions_immutable BEFORE UPDATE OR DELETE ON allocation_revisions FOR EACH ROW EXECUTE FUNCTION hb_immutable();
--> statement-breakpoint
CREATE TRIGGER period_allocations_immutable BEFORE UPDATE OR DELETE ON period_allocations FOR EACH ROW EXECUTE FUNCTION hb_immutable();
--> statement-breakpoint
CREATE TRIGGER obligations_immutable BEFORE UPDATE OR DELETE ON obligations FOR EACH ROW EXECUTE FUNCTION hb_immutable();
--> statement-breakpoint
CREATE TRIGGER obligation_events_immutable BEFORE UPDATE OR DELETE ON obligation_events FOR EACH ROW EXECUTE FUNCTION hb_immutable();
--> statement-breakpoint
CREATE TRIGGER savings_goals_immutable BEFORE UPDATE OR DELETE ON savings_goals FOR EACH ROW EXECUTE FUNCTION hb_immutable();
--> statement-breakpoint
CREATE TRIGGER savings_events_immutable BEFORE UPDATE OR DELETE ON savings_events FOR EACH ROW EXECUTE FUNCTION hb_immutable();
--> statement-breakpoint
CREATE TRIGGER transfer_proposals_immutable BEFORE UPDATE OR DELETE ON transfer_proposals FOR EACH ROW EXECUTE FUNCTION hb_immutable();
--> statement-breakpoint
CREATE TRIGGER transition_decisions_immutable BEFORE UPDATE OR DELETE ON transition_decisions FOR EACH ROW EXECUTE FUNCTION hb_immutable();
--> statement-breakpoint
CREATE TRIGGER budget_transfers_immutable BEFORE UPDATE OR DELETE ON budget_transfers FOR EACH ROW EXECUTE FUNCTION hb_immutable();
--> statement-breakpoint
CREATE TRIGGER month_closings_immutable BEFORE UPDATE OR DELETE ON month_closings FOR EACH ROW EXECUTE FUNCTION hb_immutable();
--> statement-breakpoint
CREATE FUNCTION hb_vector_sum() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rid uuid; expected bigint; actual numeric;
BEGIN
 IF TG_TABLE_NAME='period_allocations' THEN rid:=NEW.allocation_revision_id; ELSE rid:=NEW.id; END IF;
 SELECT c.balance_cents INTO expected FROM allocation_revisions r JOIN balance_checkpoints c ON c.id=r.checkpoint_id WHERE r.id=rid;
 SELECT COALESCE(sum(amount_cents),0) INTO actual FROM period_allocations WHERE allocation_revision_id=rid;
 IF expected IS NULL OR actual<>expected THEN RAISE EXCEPTION 'ALLOCATION_SUM_MISMATCH' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER revision_complete AFTER INSERT ON allocation_revisions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hb_vector_sum();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER allocation_complete AFTER INSERT ON period_allocations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hb_vector_sum();
--> statement-breakpoint
CREATE FUNCTION hb_vector_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE created_tx text;
BEGIN
 SELECT insert_transaction INTO created_tx FROM allocation_revisions WHERE id=NEW.allocation_revision_id;
 IF created_tx IS DISTINCT FROM pg_current_xact_id()::text THEN RAISE EXCEPTION 'SEALED_ALLOCATION_REVISION' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER vector_insert BEFORE INSERT ON period_allocations FOR EACH ROW EXECUTE FUNCTION hb_vector_insert();
--> statement-breakpoint
CREATE FUNCTION hb_revision_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE anchor_date date;
BEGIN
 IF NEW.insert_transaction<>pg_current_xact_id()::text THEN RAISE EXCEPTION 'INVALID_INSERT_TRANSACTION'; END IF;
 SELECT observed_date INTO anchor_date FROM balance_checkpoints WHERE id=NEW.checkpoint_id;
 IF anchor_date>NEW.effective_date THEN RAISE EXCEPTION 'ANCHOR_AFTER_VECTOR'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER revision_insert BEFORE INSERT ON allocation_revisions FOR EACH ROW EXECUTE FUNCTION hb_revision_insert();
--> statement-breakpoint
CREATE FUNCTION hb_checkpoint_vector() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM allocation_revisions WHERE checkpoint_id=NEW.id AND budget_update_id=NEW.budget_update_id) THEN
 RAISE EXCEPTION 'CHECKPOINT_REQUIRES_COMPLETE_VECTOR' USING ERRCODE='23514';
 END IF;
 RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER checkpoint_complete AFTER INSERT ON balance_checkpoints DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hb_checkpoint_vector();
--> statement-breakpoint
CREATE FUNCTION hb_correction() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE prior record;
BEGIN
 IF NEW.supersedes_id IS NOT NULL THEN
 EXECUTE format('SELECT logical_fact_id,recorded_seq FROM %I WHERE id=$1 AND owner_user_id=$2 AND account_id=$3',TG_TABLE_NAME) INTO prior USING NEW.supersedes_id,NEW.owner_user_id,NEW.account_id;
 IF prior IS NULL OR prior.logical_fact_id<>NEW.logical_fact_id OR prior.recorded_seq>=NEW.recorded_seq THEN RAISE EXCEPTION 'INVALID_CORRECTION_CHAIN' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX balance_checkpoints_correction_tip ON balance_checkpoints(supersedes_id) WHERE supersedes_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX balance_checkpoints_logical_root ON balance_checkpoints(account_id,logical_fact_id) WHERE supersedes_id IS NULL;
--> statement-breakpoint
CREATE TRIGGER correction_chain BEFORE INSERT ON balance_checkpoints FOR EACH ROW EXECUTE FUNCTION hb_correction();
--> statement-breakpoint
CREATE UNIQUE INDEX allocation_revisions_correction_tip ON allocation_revisions(supersedes_id) WHERE supersedes_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX allocation_revisions_logical_root ON allocation_revisions(account_id,logical_fact_id) WHERE supersedes_id IS NULL;
--> statement-breakpoint
CREATE TRIGGER correction_chain BEFORE INSERT ON allocation_revisions FOR EACH ROW EXECUTE FUNCTION hb_correction();
--> statement-breakpoint
CREATE UNIQUE INDEX obligation_events_correction_tip ON obligation_events(supersedes_id) WHERE supersedes_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX obligation_events_logical_root ON obligation_events(account_id,logical_fact_id) WHERE supersedes_id IS NULL;
--> statement-breakpoint
CREATE TRIGGER correction_chain BEFORE INSERT ON obligation_events FOR EACH ROW EXECUTE FUNCTION hb_correction();
--> statement-breakpoint
CREATE UNIQUE INDEX savings_events_correction_tip ON savings_events(supersedes_id) WHERE supersedes_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX savings_events_logical_root ON savings_events(account_id,logical_fact_id) WHERE supersedes_id IS NULL;
--> statement-breakpoint
CREATE TRIGGER correction_chain BEFORE INSERT ON savings_events FOR EACH ROW EXECUTE FUNCTION hb_correction();
--> statement-breakpoint
-- Cross-row storage checks supplement the generated row checks.
ALTER TABLE budget_updates ADD CONSTRAINT batch_actor_owner CHECK (actor_id=owner_user_id);
--> statement-breakpoint
ALTER TABLE month_closings ADD CONSTRAINT closing_actor_owner CHECK (closed_by=owner_user_id);
--> statement-breakpoint
CREATE FUNCTION hb_transition_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v allocation_revisions; c balance_checkpoints;
BEGIN
 SELECT * INTO v FROM allocation_revisions WHERE id=NEW.after_allocation_revision_id;
 SELECT * INTO c FROM balance_checkpoints WHERE id=v.checkpoint_id;
 IF v.budget_update_id IS DISTINCT FROM NEW.budget_update_id OR
   (NEW.observation_mode='ACTUAL_CHECK' AND c.budget_update_id IS DISTINCT FROM NEW.budget_update_id) OR
   (NEW.observation_mode='REUSE_CONFIRMED' AND c.budget_update_id=NEW.budget_update_id)
 THEN RAISE EXCEPTION 'TRANSITION_OBSERVATION_MISMATCH'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER transition_integrity AFTER INSERT ON transition_decisions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hb_transition_integrity();
--> statement-breakpoint
CREATE FUNCTION hb_transfer_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d transition_decisions; p transfer_proposals; before_v allocation_revisions; after_v allocation_revisions; source_amount bigint; target_amount bigint;
BEGIN
 SELECT * INTO d FROM transition_decisions WHERE id=NEW.decision_id;
 SELECT * INTO p FROM transfer_proposals WHERE id=NEW.proposal_id;
 SELECT * INTO before_v FROM allocation_revisions WHERE id=NEW.before_allocation_revision_id;
 SELECT * INTO after_v FROM allocation_revisions WHERE id=NEW.after_allocation_revision_id;
 IF d.mode IS DISTINCT FROM 'CARRY' OR d.budget_update_id IS DISTINCT FROM NEW.budget_update_id OR d.before_allocation_revision_id IS DISTINCT FROM before_v.id OR d.after_allocation_revision_id IS DISTINCT FROM after_v.id OR p.base_allocation_revision_id IS DISTINCT FROM before_v.id OR p.base_checkpoint_id IS DISTINCT FROM before_v.checkpoint_id OR p.source_period_id IS DISTINCT FROM NEW.source_period_id OR p.target_period_id IS DISTINCT FROM NEW.target_period_id THEN RAISE EXCEPTION 'TRANSFER_LINEAGE_MISMATCH'; END IF;
 IF d.observation_mode='REUSE_CONFIRMED' THEN
 IF before_v.checkpoint_id IS DISTINCT FROM after_v.checkpoint_id THEN RAISE EXCEPTION 'TRANSFER_CHANGED_CHECKPOINT'; END IF;
 SELECT COALESCE(sum(amount_cents),0)::bigint INTO source_amount FROM period_allocations WHERE allocation_revision_id=before_v.id AND period_id=NEW.source_period_id;
 SELECT COALESCE(sum(amount_cents),0)::bigint INTO target_amount FROM period_allocations WHERE allocation_revision_id=before_v.id AND period_id=NEW.target_period_id;
 IF EXISTS (
 SELECT 1 FROM (
 SELECT period_id,sum(CASE WHEN allocation_revision_id=after_v.id THEN amount_cents ELSE -amount_cents END) AS delta
 FROM period_allocations WHERE allocation_revision_id IN (before_v.id,after_v.id) GROUP BY period_id
 ) a WHERE a.delta<>CASE WHEN a.period_id=NEW.source_period_id THEN -source_amount WHEN a.period_id=NEW.target_period_id THEN source_amount ELSE 0 END
 ) THEN RAISE EXCEPTION 'TRANSFER_VECTOR_MISMATCH'; END IF;
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER transfer_integrity AFTER INSERT ON budget_transfers DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hb_transfer_integrity();
--> statement-breakpoint
CREATE FUNCTION hb_close_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p text; c balance_checkpoints; v allocation_revisions; prev month_closings; last_day date;
BEGIN
 SELECT period INTO p FROM budget_periods WHERE id=NEW.period_id;
 last_day:=(to_date(p||'-01','YYYY-MM-DD')+interval '1 month - 1 day')::date;
 IF NEW.historical_through_date<>last_day OR (NEW.closed_at AT TIME ZONE 'Europe/Berlin')::date<=last_day THEN RAISE EXCEPTION 'PERIOD_NOT_ENDED'; END IF;
 IF NEW.version>1 THEN
 SELECT * INTO prev FROM month_closings WHERE id=NEW.previous_version_id;
 IF prev.id IS NULL OR prev.period_id<>NEW.period_id OR prev.version+1<>NEW.version OR jsonb_array_length(NEW.change_evidence_refs)=0 THEN RAISE EXCEPTION 'INVALID_REPORT_CHAIN'; END IF;
 END IF;
 IF NEW.bank_data_completeness='NO_OBSERVATION' THEN
 IF NEW.last_checkpoint_id IS NOT NULL OR NEW.last_bank_observed_date IS NOT NULL OR NEW.last_bank_observed_at IS NOT NULL OR NEW.last_observed_balance_cents IS NOT NULL OR NEW.historical_allocation_revision_id IS NOT NULL OR NEW.allocation_effective_date IS NOT NULL OR NEW.historical_allocated_cents IS NOT NULL OR NEW.historical_free_cents IS NOT NULL OR NEW.end_checkpoint_id IS NOT NULL OR NEW.end_balance_cents IS NOT NULL THEN RAISE EXCEPTION 'NO_OBSERVATION_REQUIRES_NULL'; END IF;
 ELSE
 SELECT * INTO c FROM balance_checkpoints WHERE id=NEW.last_checkpoint_id;
 SELECT * INTO v FROM allocation_revisions WHERE id=NEW.historical_allocation_revision_id;
 IF c.id IS NULL OR v.id IS NULL OR v.checkpoint_id<>c.id OR c.observed_date>last_day OR v.effective_date>last_day OR c.recorded_seq>NEW.evidence_recorded_cutoff_seq OR v.recorded_seq>NEW.evidence_recorded_cutoff_seq OR NEW.last_bank_observed_date IS DISTINCT FROM c.observed_date OR NEW.last_bank_observed_at IS DISTINCT FROM c.observed_at OR NEW.last_observed_balance_cents IS DISTINCT FROM c.balance_cents OR NEW.allocation_effective_date IS DISTINCT FROM v.effective_date OR NEW.historical_allocated_cents IS DISTINCT FROM (SELECT COALESCE(sum(amount_cents),0)::bigint FROM period_allocations WHERE allocation_revision_id=v.id AND period_id=NEW.period_id) OR NEW.historical_free_cents IS NULL THEN RAISE EXCEPTION 'REPORT_SOURCE_MISMATCH'; END IF;
 IF NEW.bank_data_completeness='END_DATE_OBSERVED' THEN
 IF c.observed_date<>last_day OR NEW.end_checkpoint_id IS DISTINCT FROM c.id OR NEW.end_balance_cents IS DISTINCT FROM c.balance_cents THEN RAISE EXCEPTION 'INVALID_END_OBSERVATION'; END IF;
 ELSIF NEW.bank_data_completeness='INCOMPLETE' THEN
 IF c.observed_date=last_day OR NEW.end_checkpoint_id IS NOT NULL OR NEW.end_balance_cents IS NOT NULL THEN RAISE EXCEPTION 'UNKNOWN_END_BALANCE_REQUIRED'; END IF;
 ELSE RAISE EXCEPTION 'INVALID_BANK_COMPLETENESS';
 END IF;
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER close_integrity BEFORE INSERT ON month_closings FOR EACH ROW EXECUTE FUNCTION hb_close_integrity();
--> statement-breakpoint
CREATE FUNCTION hb_report_head() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c month_closings;
BEGIN
 SELECT * INTO c FROM month_closings WHERE id=NEW.closing_id;
 IF c.period_id IS DISTINCT FROM NEW.period_id OR (TG_OP='INSERT' AND c.version<>1) OR (TG_OP='UPDATE' AND NEW.closing_id<>OLD.closing_id AND c.previous_version_id IS DISTINCT FROM OLD.closing_id) THEN RAISE EXCEPTION 'STALE_REPORT_HEAD'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER report_head_integrity BEFORE INSERT OR UPDATE ON report_heads FOR EACH ROW EXECUTE FUNCTION hb_report_head();
--> statement-breakpoint
CREATE INDEX balance_checkpoints_history ON balance_checkpoints(account_id,observed_date,recorded_seq);
--> statement-breakpoint
CREATE INDEX allocation_revisions_history ON allocation_revisions(account_id,effective_date,recorded_seq);
--> statement-breakpoint
CREATE INDEX obligation_events_history ON obligation_events(account_id,obligation_id,effective_date,recorded_seq);
--> statement-breakpoint
CREATE INDEX savings_events_history ON savings_events(account_id,savings_id,effective_date,recorded_seq);
--> statement-breakpoint
