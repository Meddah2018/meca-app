/*
# Admin impersonation audit log

## Summary
Admins can now start a full session as another user ("se connecter en tant
que") to troubleshoot problems remotely. Every impersonation start is logged
here for accountability, since actions taken during impersonation are
otherwise indistinguishable from the real user's own actions.

## New table: impersonation_log
- admin_id: the admin who started the impersonation
- target_user_id: the user being impersonated
- created_at: when it started

## Security
- RLS enabled, admin-only SELECT.
- No INSERT policy for the `authenticated` role: rows are only ever written
  by the `admin-users` edge function using the service-role key (which
  bypasses RLS), so a client can never fabricate a log entry.
*/

CREATE TABLE IF NOT EXISTS impersonation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES profiles(id),
  target_user_id uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE impersonation_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "impersonation_log_select_admin" ON impersonation_log;
CREATE POLICY "impersonation_log_select_admin" ON impersonation_log FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_impersonation_log_admin ON impersonation_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_log_target ON impersonation_log(target_user_id);
