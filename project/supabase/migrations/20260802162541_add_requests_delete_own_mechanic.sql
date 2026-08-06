DROP POLICY IF EXISTS "requests_delete_own_mechanic" ON requests;
CREATE POLICY "requests_delete_own_mechanic" ON requests FOR DELETE
  TO authenticated USING (auth.uid() = mechanic_id);
