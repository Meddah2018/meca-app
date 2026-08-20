/*
# Daily expiration of unselected requests and offers (12:05 Algeria time)

## Summary
Every day at 12:05 Algeria time (11:05 UTC — Algeria has no DST, always
UTC+1), any request that still has no offer chosen by the mechanic gets
closed, and every still-active offer on those requests gets rejected. This
defines the daily "cycle": anything created after 12:05 belongs to the next
cycle.

## What this NEVER touches
- Requests already `offer_selected` or `closed`.
- Offers already `selected` or `rejected`.
- Orders in any delivery state — they follow their normal lifecycle to
  delivery regardless of this rule.

## Implementation
`pg_cron` (SQL-only, no edge function) scheduled via `cron.schedule`. If
`pg_cron` isn't enabled on this project, this migration will fail on the
`cron.schedule` call — enable the extension via Database > Extensions in
the Supabase dashboard first, then re-run.

## Security
`expire_unselected_requests_and_offers` is SECURITY DEFINER with a fixed
search_path, but EXECUTE is not granted to `authenticated`/`anon` — only
the cron scheduler (running as the job owner) can invoke it.
*/

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

  -- 2. Close every request still open (no offer chosen for this cycle)
  UPDATE requests
    SET status = 'closed', completed_at = now()
  WHERE status = 'open';
END;
$$;

REVOKE ALL ON FUNCTION expire_unselected_requests_and_offers() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire_unselected_requests_daily') THEN
    PERFORM cron.unschedule('expire_unselected_requests_daily');
  END IF;
END $$;

SELECT cron.schedule(
  'expire_unselected_requests_daily',
  '5 11 * * *',
  $$SELECT expire_unselected_requests_and_offers();$$
);
