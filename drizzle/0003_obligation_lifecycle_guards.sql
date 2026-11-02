-- Never invent metadata or rewrite immutable legacy facts.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM obligation_events) THEN
  RAISE EXCEPTION 'HB011_LEGACY_METADATA_REVIEW_REQUIRED: obligation_events must be empty; no automatic title backfill';
 END IF;
END $$;
--> statement-breakpoint
ALTER TABLE obligation_events ADD COLUMN title text NOT NULL;
ALTER TABLE obligation_events ADD COLUMN due_date date;
ALTER TABLE obligation_events ADD CONSTRAINT obligation_title CHECK (title=btrim(title) AND char_length(title) BETWEEN 1 AND 200);
ALTER TABLE obligation_events ADD CONSTRAINT obligation_amount CHECK (outstanding_cents<=original_cents);
ALTER TABLE obligation_events ADD CONSTRAINT obligation_action CHECK (action IN ('CREATE','AMEND','PARTIAL_SETTLEMENT','PAID','CANCELLED'));
CREATE UNIQUE INDEX obligation_one_creation ON obligation_events(owner_user_id,account_id,obligation_id)
 WHERE action='CREATE' AND supersedes_id IS NULL;
CREATE CONSTRAINT TRIGGER obligation_position_date AFTER INSERT ON obligation_events
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hb_checkpoint_position_date();
--> statement-breakpoint
CREATE FUNCTION hb_obligation_snapshot(e obligation_events) RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT jsonb_build_object('schemaVersion',1,'revisionId',e.id,'obligationId',e.obligation_id,
 'originatingPeriodId',o.originating_period_id,'fundingPeriodId',e.funding_period_id,'title',e.title,'dueDate',e.due_date,
 'originalCents',e.original_cents::text,'outstandingCents',e.outstanding_cents::text,
 'status',e.status,'isPossible',e.is_possible,'reserveFull',e.reserve_full)
 FROM obligations o WHERE o.id=e.obligation_id AND o.owner_user_id=e.owner_user_id AND o.account_id=e.account_id
$$;
--> statement-breakpoint
-- Deliberately narrow: validates membership/order used for SQL lineage, not complete manifests.
CREATE FUNCTION hb_obligation_before(a uuid,b uuid,owner_id uuid,acct uuid,k bigint) RETURNS boolean LANGUAGE plpgsql STABLE AS $$
DECLARE x historical_positions; y historical_positions; m jsonb; ai bigint; bi bigint;
BEGIN
 SELECT * INTO x FROM historical_positions WHERE id=a AND owner_user_id=owner_id AND account_id=acct AND recorded_seq<=k;
 SELECT * INTO y FROM historical_positions WHERE id=b AND owner_user_id=owner_id AND account_id=acct AND recorded_seq<=k;
 IF x.id IS NULL OR y.id IS NULL THEN RETURN false; END IF;
 IF x.historical_date<>y.historical_date THEN RETURN x.historical_date<y.historical_date; END IF;
 SELECT manifest INTO m FROM ordering_revisions WHERE owner_user_id=owner_id AND account_id=acct AND historical_date=x.historical_date AND recorded_seq<=k ORDER BY recorded_seq DESC LIMIT 1;
 IF m->>'schemaVersion'<>'1' OR jsonb_typeof(m->'positionIds') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
 SELECT min(n) INTO ai FROM jsonb_array_elements_text(m->'positionIds') WITH ORDINALITY AS t(id,n) WHERE id=a::text HAVING count(*)=1;
 SELECT min(n) INTO bi FROM jsonb_array_elements_text(m->'positionIds') WITH ORDINALITY AS t(id,n) WHERE id=b::text HAVING count(*)=1;
 RETURN COALESCE(ai<bi,false);
END $$;
--> statement-breakpoint
CREATE FUNCTION hb_obligation_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
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
  IF p.status<>'UNPAID' OR p.funding_period_id<>NEW.funding_period_id THEN
   RAISE EXCEPTION 'TERMINAL_OR_FUNDING_CHANGE' USING ERRCODE='23514';
  END IF;
  IF NEW.action='AMEND' THEN
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
CREATE CONSTRAINT TRIGGER obligation_integrity AFTER INSERT ON obligation_events
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hb_obligation_integrity();
