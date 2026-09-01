/*
# Align the delivery-date work week with the request rule: Saturday–Thursday

## Why
`select_offer()` (from 20260821100000) skipped Friday AND Saturday when
computing a delivery date (old "Sun–Thu" assumption). The business now runs
Saturday–Thursday with Friday as the only day off, matching
`expire_open_requests_at_2000_working_days`. Friday is the only day rolled
over.

## Change
Only the delivery-date working-day loop changes: `DOW IN (5, 6)` -> `DOW = 5`.
The noon cutoff (before 12:00 Algiers -> same day, otherwise next working day)
and everything else in the function are unchanged. Full body re-declared so
this migration is self-contained.

The matching browser-side helper `src/lib/delivery.ts` is updated in the same
commit; it is only used for display, the value written to `orders` is the one
this function computes.
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

  -- Algeria = UTC+1 fixed year-round (no DST).
  v_algiers_now := (v_now AT TIME ZONE 'UTC') + interval '1 hour';
  v_algiers_hour := EXTRACT(HOUR FROM v_algiers_now);
  v_delivery_date := v_algiers_now::date;
  IF v_algiers_hour >= 12 THEN
    v_delivery_date := v_delivery_date + 1;
  END IF;
  -- Algeria work week is Saturday–Thursday; Friday (DOW 5) is the only day off.
  WHILE EXTRACT(DOW FROM v_delivery_date) = 5 LOOP
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
