/*
# Move order creation server-side (close cash_amount / supplier_id / delivery_date
  forgery hole)

## Problem
`MechanicDashboard.tsx` currently does the whole "select this offer" flow as 4
separate client-side calls:
  1. INSERT into orders with cash_amount = offer.displayed_price (client-supplied),
     supplier_id = offer.supplier_id (client-supplied), delivery_date computed on
     the browser's clock.
  2. UPDATE offers SET status = 'selected' on the chosen offer.
  3. UPDATE offers SET status = 'rejected' on the other offers of the request.
  4. UPDATE requests SET status = 'offer_selected'.

The only RLS guard on step 1 (`orders_insert_mechanic`) checks `auth.uid() =
mechanic_id` — nothing ties `offer_id` to a request actually owned by the caller,
nothing verifies the offer is still active, and nothing recomputes cash_amount /
supplier_id / delivery_date server-side. Since payment is cash-on-delivery, a
forged `cash_amount` directly changes how much cash the delivery driver collects
versus what the supplier is owed — a straightforward fraud vector, not just a
data-integrity nit.

## Fix
Replace the 4 client calls with a single `SECURITY DEFINER` RPC,
`select_offer(p_offer_id uuid)`, that:
- locks and re-reads the offer and its parent request server-side (`FOR UPDATE`,
  to avoid a race where two offers on the same request get selected concurrently),
- verifies the caller owns the request (`request.mechanic_id = auth.uid()`) and
  that both the request (`open`) and the offer (`active`) are still eligible,
- computes `cash_amount` from the offer's own `displayed_price` (the existing
  tiered-commission GENERATED column — never client input),
- computes `delivery_date` from the tiered Algeria business rule (UTC+1 fixed, no
  DST, cutoff at 12:00 local, Fri/Sat are not working days) using the database's
  own clock, not the browser's,
- inserts the order and updates offers/request status atomically in one
  transaction.

The direct `orders_insert_mechanic` policy is dropped: the RPC is now the only
way to create an order. It runs as `SECURITY DEFINER` so it still works with RLS
enabled on `orders`/`offers`/`requests`.

## Security
- `EXECUTE` is granted to `authenticated` only (not `anon`).
- The function re-validates request ownership itself; it does not trust
  anything from the caller except `p_offer_id`.
- This migration does not touch the `offers` UPDATE policy that lets a supplier
  edit their own offer's price/status (tracked separately — audit finding #7).
*/

CREATE OR REPLACE FUNCTION select_offer(p_offer_id uuid)
RETURNS orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer offers%ROWTYPE;
  v_request requests%ROWTYPE;
  v_now timestamptz := now();
  v_algiers_now timestamp;
  v_algiers_hour int;
  v_delivery_date date;
  v_order orders%ROWTYPE;
BEGIN
  SELECT * INTO v_offer FROM offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offre introuvable';
  END IF;
  IF v_offer.status <> 'active' THEN
    RAISE EXCEPTION 'Cette offre n''est plus active';
  END IF;

  SELECT * INTO v_request FROM requests WHERE id = v_offer.request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demande introuvable';
  END IF;
  IF v_request.mechanic_id <> auth.uid() THEN
    RAISE EXCEPTION 'Cette demande ne vous appartient pas';
  END IF;
  IF v_request.status <> 'open' THEN
    RAISE EXCEPTION 'Cette demande n''est plus ouverte';
  END IF;

  -- Algeria = UTC+1 fixed year-round (no DST). Same convention already used by
  -- expire_unselected_requests_and_offers (cron '5 11 * * *' = 12:05 Algiers).
  v_algiers_now := (v_now AT TIME ZONE 'UTC') + interval '1 hour';
  v_algiers_hour := EXTRACT(HOUR FROM v_algiers_now);
  v_delivery_date := v_algiers_now::date;
  IF v_algiers_hour >= 12 THEN
    v_delivery_date := v_delivery_date + 1;
  END IF;
  -- Algeria work week is Sun–Thu; Fri (5) and Sat (6) are not working days.
  WHILE EXTRACT(DOW FROM v_delivery_date) IN (5, 6) LOOP
    v_delivery_date := v_delivery_date + 1;
  END LOOP;

  INSERT INTO orders (offer_id, mechanic_id, supplier_id, cash_amount, selected_at, delivery_date)
  VALUES (v_offer.id, auth.uid(), v_offer.supplier_id, v_offer.displayed_price, v_now, v_delivery_date)
  RETURNING * INTO v_order;

  UPDATE offers SET status = 'selected', updated_at = v_now WHERE id = v_offer.id;
  UPDATE offers SET status = 'rejected', updated_at = v_now
    WHERE request_id = v_request.id AND id <> v_offer.id AND status = 'active';
  UPDATE requests SET status = 'offer_selected' WHERE id = v_request.id;

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION select_offer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION select_offer(uuid) TO authenticated;

-- The RPC above (SECURITY DEFINER) is now the only supported way to create an
-- order; drop the direct-insert policy so a client can no longer forge
-- cash_amount / supplier_id / delivery_date by calling the table directly.
DROP POLICY IF EXISTS "orders_insert_mechanic" ON orders;
