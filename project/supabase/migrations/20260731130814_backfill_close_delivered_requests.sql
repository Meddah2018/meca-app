/*
# Backfill: close requests with delivered orders

1. Purpose
- Some orders were marked `delivered` BEFORE the auto-close trigger was
  installed, so their parent requests are still stuck in `offer_selected`
  status with `completed_at = null`. They show up in the active "Mes demandes"
  tab instead of the "Historique" tab.
- This migration backfills those requests: for every order with
  `delivery_status = 'delivered'`, it finds the parent request (through the
  offer) and sets `status = 'closed'` and `completed_at` to the order's
  delivery date if available, otherwise the order's created_at, otherwise
  the request's created_at.

2. Changes
- UPDATE on `requests` only — no schema changes, no data loss.
- Idempotent: only touches rows where `status <> 'closed'`.

3. Security
- No RLS changes. Runs with definer privileges inside the database.
*/

UPDATE requests r
  SET status = 'closed',
      completed_at = COALESCE(
        r.completed_at,
        (SELECT o.delivery_date
           FROM orders o
           JOIN offers of ON of.id = o.offer_id
          WHERE of.request_id = r.id
            AND o.delivery_status = 'delivered'
          ORDER BY o.delivery_date DESC NULLS LAST
          LIMIT 1),
        (SELECT o.created_at
           FROM orders o
           JOIN offers of ON of.id = o.offer_id
          WHERE of.request_id = r.id
            AND o.delivery_status = 'delivered'
          ORDER BY o.created_at DESC
          LIMIT 1),
        r.created_at
      )
  WHERE r.status <> 'closed'
    AND EXISTS (
      SELECT 1
        FROM orders o
        JOIN offers of ON of.id = o.offer_id
       WHERE of.request_id = r.id
         AND o.delivery_status = 'delivered'
    );
