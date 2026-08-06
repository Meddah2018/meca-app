/*
# Fix: supplier_brands RLS policies used wrong key

## Problem
The RLS policies on `supplier_brands` compared `auth.uid()` directly to
`supplier_id`. But `supplier_brands.supplier_id` stores `supplier_profiles.id`
(an auto-generated UUID), NOT `auth.users.id`. So every policy silently failed:
suppliers could not read, insert, update, or delete their own brand links, and
saved brands never appeared when reopening the "Marques" modal.

## Fix
Rewrite all supplier_brands policies to join through `supplier_profiles` and
match on `supplier_profiles.user_id = auth.uid()`.
*/

-- SELECT: supplier sees own brands (via supplier_profiles.user_id)
DROP POLICY IF EXISTS "supplier_brands_select_own" ON supplier_brands;
CREATE POLICY "supplier_brands_select_own" ON supplier_brands FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM supplier_profiles sp
      WHERE sp.id = supplier_brands.supplier_id AND sp.user_id = auth.uid()
    )
  );

-- INSERT
DROP POLICY IF EXISTS "supplier_brands_insert_own" ON supplier_brands;
CREATE POLICY "supplier_brands_insert_own" ON supplier_brands FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM supplier_profiles sp
      WHERE sp.id = supplier_brands.supplier_id AND sp.user_id = auth.uid()
    )
  );

-- UPDATE
DROP POLICY IF EXISTS "supplier_brands_update_own" ON supplier_brands;
CREATE POLICY "supplier_brands_update_own" ON supplier_brands FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM supplier_profiles sp
      WHERE sp.id = supplier_brands.supplier_id AND sp.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM supplier_profiles sp
      WHERE sp.id = supplier_brands.supplier_id AND sp.user_id = auth.uid()
    )
  );

-- DELETE
DROP POLICY IF EXISTS "supplier_brands_delete_own" ON supplier_brands;
CREATE POLICY "supplier_brands_delete_own" ON supplier_brands FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM supplier_profiles sp
      WHERE sp.id = supplier_brands.supplier_id AND sp.user_id = auth.uid()
    )
  );

-- Admin read (unchanged, already correct)
DROP POLICY IF EXISTS "supplier_brands_select_admin" ON supplier_brands;
CREATE POLICY "supplier_brands_select_admin" ON supplier_brands FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
