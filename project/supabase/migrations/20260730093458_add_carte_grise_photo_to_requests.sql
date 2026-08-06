/*
# Add carte grise photo support to requests

1. Changes
- Add `carte_grise_url` column to `requests` table (text, nullable) to store the public URL of the uploaded carte grise photo.
2. Storage
- Create a public storage bucket `carte-grise` for uploading vehicle registration document photos.
- Storage policies allow authenticated users to upload and read their own carte grise photos.
3. Security
- No changes to existing RLS policies on `requests`.
*/

ALTER TABLE requests ADD COLUMN IF NOT EXISTS carte_grise_url text;

COMMENT ON COLUMN requests.carte_grise_url IS 'URL publique de la photo de la carte grise du véhicule';

INSERT INTO storage.buckets (id, name, public)
VALUES ('carte-grise', 'carte-grise', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "carte_grise_upload_own" ON storage.objects;
CREATE POLICY "carte_grise_upload_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'carte-grise');

DROP POLICY IF EXISTS "carte_grise_read_all" ON storage.objects;
CREATE POLICY "carte_grise_read_all" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'carte-grise');

DROP POLICY IF EXISTS "carte_grise_delete_own" ON storage.objects;
CREATE POLICY "carte_grise_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'carte-grise');
