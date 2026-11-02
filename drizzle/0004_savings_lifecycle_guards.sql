-- Forward-only HB-012. Never invent historical names or confirmed release evidence.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM savings_events) THEN
  RAISE EXCEPTION 'HB012_LEGACY_METADATA_REVIEW_REQUIRED';
 END IF;
END $$;
--> statement-breakpoint
ALTER TABLE savings_events ADD COLUMN title text NOT NULL;
ALTER TABLE savings_events ADD CONSTRAINT saving_title CHECK (title=btrim(title) AND char_length(title) BETWEEN 1 AND 200);
ALTER TABLE savings_events ADD CONSTRAINT saving_active_positive CHECK (status<>'ACTIVE' OR amount_cents>0);
ALTER TABLE savings_events ADD CONSTRAINT saving_action CHECK (action IN ('CREATE','AMEND','INCREASE','PARTIAL_RELEASE','FULL_RELEASE'));
CREATE UNIQUE INDEX saving_one_creation ON savings_events(owner_user_id,account_id,savings_id)
 WHERE action='CREATE' AND supersedes_id IS NULL;
CREATE CONSTRAINT TRIGGER saving_position_date AFTER INSERT ON savings_events
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hb_checkpoint_position_date();
--> statement-breakpoint
-- Extract existing ordering semantics; the old obligation entry point remains compatible.
CREATE FUNCTION hb_position_before(a uuid,b uuid,owner_id uuid,acct uuid,k bigint) RETURNS boolean LANGUAGE plpgsql STABLE AS $$
DECLARE x historical_positions; y historical_positions; m jsonb; ai bigint; bi bigint;
BEGIN
 SELECT * INTO x FROM historical_positions WHERE id=a AND owner_user_id=owner_id AND account_id=acct AND recorded_seq<=k;
 SELECT * INTO y FROM historical_positions WHERE id=b AND owner_user_id=owner_id AND account_id=acct AND recorded_seq<=k;
 IF x.id IS NULL OR y.id IS NULL THEN RETURN false; END IF;
 IF x.historical_date<>y.historical_date THEN RETURN x.historical_date<y.historical_date; END IF;
 SELECT manifest INTO m FROM ordering_revisions WHERE owner_user_id=owner_id AND account_id=acct AND historical_date=x.historical_date AND recorded_seq<=k ORDER BY recorded_seq DESC LIMIT 1;
 IF m->>'schemaVersion' IS DISTINCT FROM '1' OR jsonb_typeof(m->'positionIds') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
 SELECT min(n) INTO ai FROM jsonb_array_elements_text(m->'positionIds') WITH ORDINALITY AS t(id,n) WHERE id=a::text HAVING count(*)=1;
 SELECT min(n) INTO bi FROM jsonb_array_elements_text(m->'positionIds') WITH ORDINALITY AS t(id,n) WHERE id=b::text HAVING count(*)=1;
 RETURN COALESCE(ai<bi,false);
END $$;
CREATE OR REPLACE FUNCTION hb_obligation_before(a uuid,b uuid,owner_id uuid,acct uuid,k bigint) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT hb_position_before(a,b,owner_id,acct,k)
$$;
--> statement-breakpoint
CREATE FUNCTION hb_saving_snapshot(e savings_events) RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT jsonb_build_object('schemaVersion',1,'revisionId',e.id,'savingsId',e.savings_id,
 'originatingPeriodId',g.originating_period_id,'fundingPeriodId',e.funding_period_id,'title',e.title,
 'amountCents',e.amount_cents::text,'status',e.status)
 FROM savings_goals g WHERE g.id=e.savings_id AND g.owner_user_id=e.owner_user_id AND g.account_id=e.account_id
$$;
--> statement-breakpoint
CREATE FUNCTION hb_saving_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
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
  IF p.status<>'ACTIVE' OR p.funding_period_id<>NEW.funding_period_id THEN
   RAISE EXCEPTION 'TERMINAL_OR_FUNDING_CHANGE' USING ERRCODE='23514';
  END IF;
  IF NEW.action='AMEND' THEN
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
CREATE CONSTRAINT TRIGGER saving_integrity AFTER INSERT ON savings_events
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hb_saving_integrity();
