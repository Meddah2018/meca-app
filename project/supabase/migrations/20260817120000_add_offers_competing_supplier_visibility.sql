/*
# Allow suppliers to see competing offers on requests they've bid on

## Problem
The business model (reverse-auction logic) requires suppliers to see
competing offers in real time on a request once they've submitted their own
offer on it, so they can revise their price while the request stays open.
The current `offers` RLS only lets a supplier SELECT their own rows
(`offers_select_own_supplier`), so competing offers are invisible.

## Attempt #1 (reverted — caused infinite recursion)
A first version used a plain `EXISTS (SELECT 1 FROM offers my WHERE ...)`
subquery directly in the policy. Postgres re-applies RLS to that subquery
on the same table, which re-evaluates this very policy for each candidate
row — an unbounded loop. Postgres detects it at query time and raises
"infinite recursion detected in policy for relation offers" (surfaced as a
500 by PostgREST). This is the same class of bug as the earlier
requests/offers cross-table recursion fixed in
20260802125134_fix_requests_offers_recursion.sql, just on a single table.

## Fix
Reuse the existing SECURITY DEFINER function `supplier_has_offer_on_request`
(created in 20260802125134) to check "does auth.uid() have an offer on this
request" — it reads `offers` bypassing RLS, so no recursive re-evaluation
happens.

## Security
- Suppliers still cannot see offers on requests they haven't bid on.
- The offer row exposes `supplier_id`; the frontend resolves it to an
  anonymous reference via `get_public_profiles`, never the real company
  profile (supplier_profiles stays restricted to mechanics/delivery/admin).
*/

DROP POLICY IF EXISTS "offers_select_competing_supplier" ON offers;
CREATE POLICY "offers_select_competing_supplier" ON offers FOR SELECT
  TO authenticated USING (
    supplier_has_offer_on_request(offers.request_id, auth.uid())
  );
