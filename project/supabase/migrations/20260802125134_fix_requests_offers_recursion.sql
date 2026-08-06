/*
# Fix: infinite recursion between requests and offers RLS policies

## Problem
`requests_select_suppliers` checks `EXISTS (SELECT 1 FROM offers ...)` and
`offers_select_mechanic_on_own_request` checks `EXISTS (SELECT 1 FROM requests ...)`.
Postgres applies RLS to every table in a policy subquery, so:
  requests → offers → requests → offers → ... → infinite recursion.
Suppliers therefore get zero rows from `requests` and see no new demands.

## Fix
Replace the offers subquery inside `requests_select_suppliers` with a
SECURITY DEFINER function that reads offers bypassing RLS, breaking the cycle.
*/

CREATE OR REPLACE FUNCTION supplier_has_offer_on_request(p_request_id uuid, p_supplier_uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM offers o
    WHERE o.request_id = p_request_id
      AND o.supplier_id = p_supplier_uid
  );
$$;

REVOKE ALL ON FUNCTION supplier_has_offer_on_request(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION supplier_has_offer_on_request(uuid, uuid) TO authenticated;

-- Rewrite requests_select_suppliers to use the function instead of a subquery
DROP POLICY IF EXISTS "requests_select_suppliers" ON requests;
CREATE POLICY "requests_select_suppliers" ON requests FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'supplier')
      AND (
        EXISTS (
          SELECT 1 FROM supplier_brands sb
          JOIN supplier_profiles sp ON sp.id = sb.supplier_id
          WHERE sp.user_id = auth.uid()
            AND sb.brand_id = requests.vehicle_brand_id
        )
        OR supplier_has_offer_on_request(requests.id, auth.uid())
      )
    )
    OR (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'delivery')
    )
  );
