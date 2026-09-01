/*
# Move the daily request expiry to 20:00 Algeria time, working days only

## New rule (replaces the 12:05 cycle from 20260819090000)
A mechanic's request is open for the whole business day. Every working day at
20:00 Algeria time, any request that the mechanic has NOT finalised is
cancelled — whether or not it already has offers:

- request with no offers        -> closed, nothing else to do
- request with offers, none picked (still `open`) -> closed, and every still
  `active` offer on it is rejected

Anything created after 20:00 rolls into the next working day's cycle.

## Working week
Algeria: Saturday -> Thursday. Friday is the only day off, so the job does
NOT run on Friday (cron day-of-week 5). A request left open on Thursday is
cancelled Thursday 20:00; one created Friday survives until Saturday 20:00.

## What this still NEVER touches
- Requests already `offer_selected` or `closed`.
- Offers already `selected` or `rejected`.
- Orders in any delivery state.

## Time zone
Algeria is UTC+1 all year (no DST), so 20:00 local == 19:00 UTC.
Cron: `0 19 * * 0-4,6`  (every day except Friday, at 19:00 UTC).

## Implementation
Reuses the existing `expire_unselected_requests_and_offers()` function (its
body already closes every `open` request and rejects their active offers —
exactly the behaviour we want). Only the `pg_cron` schedule changes. The job
keeps the name `expire_unselected_requests_daily` so there is never more than
one expiry job registered.
*/

-- Function body is unchanged from 20260819090000; re-declared here so this
-- migration is self-contained and safe to run on a fresh database.
CREATE OR REPLACE FUNCTION expire_unselected_requests_and_offers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Reject active offers on requests that are still open (run before closing them)
  UPDATE offers o
    SET status = 'rejected', updated_at = now()
  WHERE o.status = 'active'
    AND EXISTS (
      SELECT 1 FROM requests r WHERE r.id = o.request_id AND r.status = 'open'
    );

  -- 2. Close every request still open (mechanic did not select an offer today)
  UPDATE requests
    SET status = 'closed', completed_at = now()
  WHERE status = 'open';
END;
$$;

REVOKE ALL ON FUNCTION expire_unselected_requests_and_offers() FROM PUBLIC, anon, authenticated;

-- Re-point the daily job to 20:00 Algeria time (19:00 UTC), Saturday–Thursday.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire_unselected_requests_daily') THEN
    PERFORM cron.unschedule('expire_unselected_requests_daily');
  END IF;
END $$;

SELECT cron.schedule(
  'expire_unselected_requests_daily',
  '0 19 * * 0-4,6',
  $$SELECT expire_unselected_requests_and_offers();$$
);
