/*
# Fix: preserve supplier history in requests SELECT policy

## Problem
The previous `requests_select_suppliers` policy only let suppliers see requests
whose `vehicle_brand_id` matched one of their `supplier_brands` entries. This
broke the supplier's history view: requests the supplier had already made
offers on became invisible when their brand no longer matched (e.g. the supplier
changed their specializations, or older requests had no `vehicle_brand_id`).

## Fix
Add an OR branch so a supplier can also SELECT any request they have already
submitted an offer on. This preserves the history while keeping the brand-based
filtering for new open requests.

## Security
- No new tables or columns.
- Suppliers still cannot see open requests outside their brand specialization.
- The added branch only exposes requests linked to the supplier's own offers.
*/

DROP POLICY IF EXISTS "requests_select_suppliers" ON requests;
CREATE POLICY "requests_select_suppliers" ON requests FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'supplier')
      AND (
        EXISTS (
          SELECT 1 FROM supplier_brands sb
          WHERE sb.supplier_id = auth.uid()
            AND sb.brand_id = requests.vehicle_brand_id
        )
        OR EXISTS (
          SELECT 1 FROM offers o
          WHERE o.request_id = requests.id
            AND o.supplier_id = auth.uid()
        )
      )
    )
    OR (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'delivery')
    )
  );
