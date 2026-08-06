/*
# Public profile lookup function

## Summary
Provides a SECURITY DEFINER function that returns only the anonymous reference
and role for a set of user IDs, bypassing RLS so non-admin users can see other
users' anonymous references without exposing personal info (name, phone, etc.).

## Function `get_public_profiles(user_ids uuid[])`
Returns TABLE(id uuid, anonymous_reference text, role text) for the requested
IDs. Only public columns are returned — never personal data.
*/

CREATE OR REPLACE FUNCTION get_public_profiles(p_user_ids uuid[])
RETURNS TABLE(id uuid, anonymous_reference text, role text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id, anonymous_reference, role
  FROM profiles
  WHERE id = ANY(p_user_ids) AND anonymous_reference IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION get_public_profiles(uuid[]) TO authenticated, anon;
