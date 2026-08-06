
/*
# Fix infinite recursion on profiles RLS policies

## Problem
The admin policies on `profiles` reference `profiles` inside the policy,
causing infinite recursion: to check if a user is admin, the policy queries
profiles, which triggers the policy again, which queries profiles, etc.

## Fix
1. Create a SECURITY DEFINER function `is_admin()` that checks the caller's
   role in `profiles` without triggering RLS (because it runs as the owner).
2. Replace the self-referential admin policies with calls to `is_admin()`.
3. Apply the same pattern to other tables that reference profiles for admin
   checks (garage_profiles, supplier_profiles, offers, orders, reversements,
   requests).
*/

-- Drop the recursive admin policies first
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
DROP POLICY IF EXISTS "garage_admin_select" ON garage_profiles;
DROP POLICY IF EXISTS "supplier_profile_select_for_mechanics" ON supplier_profiles;
DROP POLICY IF EXISTS "offers_select_admin_delivery" ON offers;
DROP POLICY IF EXISTS "orders_select_admin_delivery" ON orders;
DROP POLICY IF EXISTS "requests_select_suppliers" ON requests;
DROP POLICY IF EXISTS "requests_update_admin" ON requests;
DROP POLICY IF EXISTS "reversements_select_admin" ON reversements;
DROP POLICY IF EXISTS "reversements_insert_admin" ON reversements;
DROP POLICY IF EXISTS "reversements_update_admin" ON reversements;
DROP POLICY IF EXISTS "ratings_select_all_auth" ON ratings;

-- Create helper function that bypasses RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  );
$$;

-- Re-create admin policies using is_admin()
CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT
  TO authenticated USING (is_admin());

CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- garage_profiles: admin can see all
CREATE POLICY "garage_admin_select" ON garage_profiles FOR SELECT
  TO authenticated USING (is_admin());

-- supplier_profiles: mechanics, delivery, admin can see
CREATE POLICY "supplier_profile_select_for_mechanics" ON supplier_profiles FOR SELECT
  TO authenticated USING (
    is_admin() OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('mechanic','delivery')
    )
  );

-- offers: admin & delivery can see all
CREATE POLICY "offers_select_admin_delivery" ON offers FOR SELECT
  TO authenticated USING (
    is_admin() OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'delivery'
    )
  );

-- orders: admin & delivery can see all
CREATE POLICY "orders_select_admin_delivery" ON orders FOR SELECT
  TO authenticated USING (
    is_admin() OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'delivery'
    )
  );

-- requests: suppliers, delivery, admin can see all
CREATE POLICY "requests_select_suppliers" ON requests FOR SELECT
  TO authenticated USING (
    is_admin() OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('supplier','delivery')
    )
  );

-- requests: admin can update
CREATE POLICY "requests_update_admin" ON requests FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- reversements: admin full access
CREATE POLICY "reversements_select_admin" ON reversements FOR SELECT
  TO authenticated USING (is_admin());

CREATE POLICY "reversements_insert_admin" ON reversements FOR INSERT
  TO authenticated WITH CHECK (is_admin());

CREATE POLICY "reversements_update_admin" ON reversements FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ratings: all authenticated can read
CREATE POLICY "ratings_select_all_auth" ON ratings FOR SELECT
  TO authenticated USING (true);
