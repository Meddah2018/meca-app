/*
# Auto-close requests on delivery

1. Purpose
- A request is considered "completed" (and should move to the mechanic's History tab)
  when the selected order is delivered AND the request is closed.
- Previously nothing ever set `requests.status` to `closed`, so completed requests
  stayed forever in the active list. This migration adds a database trigger that
  automatically closes a request the moment its associated order is marked
  `delivered` by the delivery driver.

2. Changes
- Adds a `completed_at timestamptz` column on `requests` to record the exact
  moment a request was closed (used for sorting the History tab).
- Adds trigger `close_request_on_delivery` that runs AFTER UPDATE on `orders`:
  when `delivery_status` becomes `delivered`, it finds the request linked
  through the order's offer and sets `status = 'closed'` and
  `completed_at = now()` (only if not already closed, to keep idempotent).
- Backfills `completed_at` for any already-closed requests using their
  `updated_at`/`created_at` so existing history sorts correctly.

3. Security
- No RLS policy changes. The trigger runs with definer privileges inside the
  database; it does not expose any new data to clients. Existing RLS policies
  on `requests` and `orders` remain unchanged.

4. Notes
- Idempotent: safe to re-run (uses IF NOT EXISTS, DROP IF EXISTS, and a
  guard `WHERE status <> 'closed'`).
- Does not drop or rename any existing columns; no data loss.
*/

-- 1. Add completed_at column on requests
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- 2. Backfill completed_at for already-closed requests (best-effort)
UPDATE requests
  SET completed_at = COALESCE(completed_at, created_at)
  WHERE status = 'closed' AND completed_at IS NULL;

-- 3. Function that closes the parent request when an order is delivered
CREATE OR REPLACE FUNCTION close_request_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req_id uuid;
BEGIN
  IF NEW.delivery_status = 'delivered' AND (OLD IS NULL OR OLD.delivery_status <> 'delivered') THEN
    SELECT o.request_id
      INTO req_id
      FROM offers o
      WHERE o.id = NEW.offer_id;

    IF req_id IS NOT NULL THEN
      UPDATE requests
        SET status = 'closed',
            completed_at = now()
        WHERE id = req_id
          AND status <> 'closed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Trigger on orders update
DROP TRIGGER IF EXISTS trg_close_request_on_delivery ON orders;
CREATE TRIGGER trg_close_request_on_delivery
  AFTER UPDATE OF delivery_status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION close_request_on_delivery();
