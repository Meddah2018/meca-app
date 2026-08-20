/*
  Add preferred_language to profiles

  1. Changes
    - Adds `preferred_language` text column to `profiles`, default 'fr'.
    - Restricted to 'fr' or 'ar' via a CHECK constraint.
    - Existing RLS policies (profiles_update_own / profiles_update_admin) already
      allow a user to update their own row, so no new policy is needed.
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'fr'
  CHECK (preferred_language IN ('fr', 'ar'));
