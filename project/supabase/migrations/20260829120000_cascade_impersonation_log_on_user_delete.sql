/*
# Let user deletion cascade through impersonation_log

## Problem
Deleting a user (admin "Supprimer" -> auth.admin.deleteUser) cascades to the
`profiles` row, but `impersonation_log.admin_id` / `impersonation_log.target_user_id`
reference `profiles(id)` with the default NO ACTION rule. As soon as an admin has
impersonated a user once, an audit row exists and the delete fails with a
foreign key violation ("Database error deleting user").

## Fix
Recreate both foreign keys with ON DELETE CASCADE. The impersonation log is a
disposable audit trail; losing the entries for an account that no longer exists
is acceptable, and keeping them would require nullable columns + a retention
policy that this app does not have.

Financial/history tables (orders, reversements, ratings) intentionally keep
their restrictive FKs: a user with real activity should be deactivated, not
hard-deleted. The edge function now returns a readable message in that case.
*/

ALTER TABLE impersonation_log
  DROP CONSTRAINT IF EXISTS impersonation_log_admin_id_fkey,
  DROP CONSTRAINT IF EXISTS impersonation_log_target_user_id_fkey;

ALTER TABLE impersonation_log
  ADD CONSTRAINT impersonation_log_admin_id_fkey
    FOREIGN KEY (admin_id) REFERENCES profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT impersonation_log_target_user_id_fkey
    FOREIGN KEY (target_user_id) REFERENCES profiles(id) ON DELETE CASCADE;
