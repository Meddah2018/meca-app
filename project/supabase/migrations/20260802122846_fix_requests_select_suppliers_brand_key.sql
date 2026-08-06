/*
# Fix: requests_select_suppliers brand branch used wrong key

## Problem
The brand-filter branch of `requests_select_suppliers` matched
`supplier_brands.supplier_id = auth.uid()`, but `supplier_id` stores
`supplier_profiles.id`, not the auth user id. So brand filtering never matched
and suppliers with saved brands still saw no open requests.

## Fix
Join through `supplier_profiles` so the match is on `user_id = auth.uid()`.
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
          JOIN supplier_profiles sp ON sp.id = sb.supplier_id
          WHERE sp.user_id = auth.uid()
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
