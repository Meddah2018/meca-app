/*
# Add part photos and reference photo support to requests

## Summary
Mechanics can now attach up to 3 photos of the part itself plus one photo of
the part's reference (label/plate showing the reference number), alongside
the existing carte grise photo, when publishing a request. This helps
suppliers submit accurate offers without guessing the exact part.

## Changes
- `requests.part_photo_urls` (text[], default '{}'): up to 3 public photo URLs
  of the part. The 3-photo cap is enforced client-side; a CHECK constraint
  backs it up in the database.
- `requests.reference_photo_url` (text, nullable): public URL of a photo
  showing the part's reference.

## Storage
- New public bucket `part-photos` for both part photos and the reference
  photo (same access pattern as the existing `carte-grise` bucket: any
  authenticated user can upload/read/delete objects in it).

## Security
- No changes to existing RLS policies on `requests` — these are plain
  nullable/array columns, covered by the existing owner-scoped policies.
*/

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS part_photo_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reference_photo_url text;

ALTER TABLE requests
  ADD CONSTRAINT requests_part_photo_urls_max_three
  CHECK (array_length(part_photo_urls, 1) IS NULL OR array_length(part_photo_urls, 1) <= 3);

COMMENT ON COLUMN requests.part_photo_urls IS 'URLs publiques des photos de la pièce (max 3)';
COMMENT ON COLUMN requests.reference_photo_url IS 'URL publique de la photo de la référence de la pièce';

INSERT INTO storage.buckets (id, name, public)
VALUES ('part-photos', 'part-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "part_photos_upload_own" ON storage.objects;
CREATE POLICY "part_photos_upload_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'part-photos');

DROP POLICY IF EXISTS "part_photos_read_all" ON storage.objects;
CREATE POLICY "part_photos_read_all" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'part-photos');

DROP POLICY IF EXISTS "part_photos_delete_own" ON storage.objects;
CREATE POLICY "part_photos_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'part-photos');
