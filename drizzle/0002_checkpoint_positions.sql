-- Forward-only HB-010 guards. JSON manifest/dependency validation remains runtime-owned.
CREATE FUNCTION hb_checkpoint_position_date() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actual_date date; expected_date date;
BEGIN
 SELECT historical_date INTO actual_date FROM historical_positions
 WHERE id=NEW.position_id AND owner_user_id=NEW.owner_user_id AND account_id=NEW.account_id;
 IF TG_TABLE_NAME='balance_checkpoints' THEN expected_date:=NEW.observed_date;
 ELSE expected_date:=NEW.effective_date; END IF;
 IF actual_date IS DISTINCT FROM expected_date THEN
  RAISE EXCEPTION 'POSITION_DATE_MISMATCH' USING ERRCODE='23514';
 END IF;
 RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER checkpoint_position_date AFTER INSERT ON balance_checkpoints
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hb_checkpoint_position_date();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER allocation_position_date AFTER INSERT ON allocation_revisions
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hb_checkpoint_position_date();
--> statement-breakpoint
CREATE FUNCTION hb_ordering_predecessor() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE prior ordering_revisions;
BEGIN
 IF NEW.previous_revision_id IS NOT NULL THEN
  SELECT * INTO prior FROM ordering_revisions WHERE id=NEW.previous_revision_id;
  IF prior.id IS NULL OR prior.owner_user_id<>NEW.owner_user_id OR prior.account_id<>NEW.account_id
   OR prior.historical_date<>NEW.historical_date OR prior.recorded_seq>=NEW.recorded_seq THEN
   RAISE EXCEPTION 'INVALID_ORDERING_PREDECESSOR' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER ordering_predecessor AFTER INSERT ON ordering_revisions
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hb_ordering_predecessor();
--> statement-breakpoint
CREATE UNIQUE INDEX ordering_one_root ON ordering_revisions(owner_user_id,account_id,historical_date)
 WHERE previous_revision_id IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX ordering_one_child ON ordering_revisions(previous_revision_id)
 WHERE previous_revision_id IS NOT NULL;
