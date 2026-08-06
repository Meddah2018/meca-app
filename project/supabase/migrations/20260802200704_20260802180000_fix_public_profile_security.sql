/*
# Fix public profile security warnings

## Summary
1. Drop the `public_profiles` view — it was flagged as SECURITY DEFINER and
   is not needed (RLS on profiles already restricts non-admin users to their
   own row; the `get_public_profiles` RPC is the real mechanism for anonymous
   reference lookups).
2. Revoke EXECUTE on `get_public_profiles` from the anon role so only
   authenticated users can look up anonymous references. The function returns
   only id, anonymous_reference, role — no personal data.
*/

DROP VIEW IF EXISTS public_profiles;
REVOKE EXECUTE ON FUNCTION get_public_profiles(uuid[]) FROM anon;
