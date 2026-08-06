/*
# Admin-managed user accounts (no public registration)

## Summary
Redesigns authentication so only Administrators can create user accounts.
Public self-registration is disabled. Users log in with an admin-assigned
Login ID + password (no email required). Each user receives a unique anonymous
reference (MEC-0001, SUP-0001, DRV-0001, ADM-0001) that is the only identifier
visible to other non-admin users. Real names / phones / addresses remain
visible only to Administrators and the user themselves.

## Changes to `profiles` table
New columns:
- login_id text UNIQUE         — admin-assigned username (e.g. "mec0001")
- anonymous_reference text UNIQUE — generated ref (e.g. "MEC-0001")
- first_name text              — admin-entered
- last_name text               — admin-entered
- employee_id text             — optional internal employee id
- address text                 — admin-entered
- city text                    — admin-entered
- is_active boolean DEFAULT true — active/inactive toggle (admin)
- first_login_completed boolean DEFAULT false — must change temp password on first login
- created_by uuid              — admin who created the account

Existing columns kept (full_name, phone, is_approved) for backward compatibility;
is_approved is forced true for admin-created accounts.

## New view `public_profiles`
Exposes only id, anonymous_reference, role — the minimal info non-admin users
may see about other users. Real names/phones/addresses are NOT exposed.

## New function `generate_anonymous_reference(role)`
SECURITY DEFINER function that returns the next available reference for a role
(MEC-0001, SUP-0001, DRV-0001, ADM-0001) by scanning existing profiles.

## Security
- RLS on profiles unchanged (own + admin). Non-admins cannot read other users'
  personal info; they use public_profiles instead.
- public_profiles is readable by all authenticated users (anon ref + role only).
- is_admin() helper reused for admin checks.
*/

-- Add new columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS login_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS anonymous_reference text UNIQUE,
  ADD COLUMN IF NOT EXISTS first_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS employee_id text,
  ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS first_login_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Backfill anonymous_reference for any existing profiles that lack one
DO $$
DECLARE
  r RECORD;
  next_n int;
  prefix text;
BEGIN
  FOR r IN SELECT id, role FROM profiles WHERE anonymous_reference IS NULL LOOP
    prefix := CASE r.role
      WHEN 'mechanic' THEN 'MEC'
      WHEN 'supplier' THEN 'SUP'
      WHEN 'delivery' THEN 'DRV'
      WHEN 'admin' THEN 'ADM'
    END;
    SELECT COALESCE(MAX(CAST(SUBSTRING(anonymous_reference FROM 5) AS int)), 0) + 1
      INTO next_n
      FROM profiles
      WHERE role = r.role AND anonymous_reference IS NOT NULL;
    UPDATE profiles
      SET anonymous_reference = prefix || '-' || lpad(next_n::text, 4, '0')
      WHERE id = r.id;
  END LOOP;
END $$;

-- Function to generate the next anonymous reference for a role
CREATE OR REPLACE FUNCTION generate_anonymous_reference(p_role text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    CASE p_role
      WHEN 'mechanic' THEN 'MEC'
      WHEN 'supplier' THEN 'SUP'
      WHEN 'delivery' THEN 'DRV'
      WHEN 'admin' THEN 'ADM'
      ELSE 'USR'
    END
    || '-'
    || lpad(
      (COALESCE(
        (SELECT MAX(CAST(SUBSTRING(anonymous_reference FROM 5) AS int))
         FROM profiles
         WHERE role = p_role AND anonymous_reference IS NOT NULL),
        0
      ) + 1)::text,
      4, '0'
    );
$$;

-- Public view: only anonymous reference + role, no personal info
CREATE OR REPLACE VIEW public_profiles AS
  SELECT id, anonymous_reference, role
  FROM profiles
  WHERE anonymous_reference IS NOT NULL;

-- RLS-style access: view is readable by all authenticated users.
-- (Views do not have RLS; they inherit from underlying table. Since profiles
--  SELECT policies already allow own + admin, we grant SELECT on the view
--  directly to authenticated and anon so the limited columns are visible.)
GRANT SELECT ON public_profiles TO authenticated, anon;

-- Allow non-admins to read the anonymous reference of any user via the view.
-- The view exposes only id, anonymous_reference, role — no personal data.
