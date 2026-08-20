/*
# Storage bucket for request voice messages

## Summary
`requests.audio_url` already exists in the initial schema but was never
wired to a storage bucket — mechanics can now record a short voice message
(max 5s, enforced client-side) instead of / in addition to typing the part
name. The raw audio is kept as-is and stays playable by suppliers, per the
MVP spec (no transcription).

## Storage
- New public bucket `request-audio` for the recorded clips.
- Same access pattern as the existing `carte-grise` / `part-photos`
  buckets: any authenticated user can upload/read/delete objects in it.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('request-audio', 'request-audio', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "request_audio_upload_own" ON storage.objects;
CREATE POLICY "request_audio_upload_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'request-audio');

DROP POLICY IF EXISTS "request_audio_read_all" ON storage.objects;
CREATE POLICY "request_audio_read_all" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'request-audio');

DROP POLICY IF EXISTS "request_audio_delete_own" ON storage.objects;
CREATE POLICY "request_audio_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'request-audio');
