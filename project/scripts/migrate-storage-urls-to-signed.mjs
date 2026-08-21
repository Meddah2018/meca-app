// One-off migration: rewrite public storage URLs stored on `requests` rows into
// long-lived signed URLs, ahead of flipping the carte-grise / part-photos /
// request-audio buckets to private (see SECURITY_AUDIT.md, finding #2).
//
// Must run with SUPABASE_SERVICE_ROLE_KEY set — it needs to (a) read/update every
// mechanic's requests, not just the caller's own, and (b) sign objects it doesn't
// own. The anon key cannot do either under RLS.
//
// Safe to re-run: any URL that is already a signed URL (contains "/object/sign/")
// is left untouched.
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/migrate-storage-urls-to-signed.mjs         # dry run (default)
//   SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/migrate-storage-urls-to-signed.mjs --apply # writes changes

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter(line => line.includes('='))
    .map(line => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

const url = env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required (this script must bypass RLS). Aborting.');
  process.exit(1);
}

// Must match SIGNED_URL_TTL_SECONDS in src/pages/MechanicDashboard.tsx.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 5; // 5 ans

const APPLY = process.argv.includes('--apply');
console.log(`Mode: ${APPLY ? 'APPLY (writing changes)' : 'DRY RUN (no writes — pass --apply to commit)'}`);
console.log(`Against: ${url}`);

const supabase = createClient(url, serviceKey);

// Matches https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path...}
const PUBLIC_URL_RE = /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/;

function isAlreadySigned(u) {
  return typeof u === 'string' && u.includes('/object/sign/');
}

async function toSignedUrl(publicUrl) {
  if (!publicUrl || isAlreadySigned(publicUrl)) return { url: publicUrl, changed: false };

  const match = publicUrl.match(PUBLIC_URL_RE);
  if (!match) {
    console.warn(`  ! Unrecognized URL shape, left as-is: ${publicUrl}`);
    return { url: publicUrl, changed: false };
  }
  const [, bucket, path] = match;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(decodeURIComponent(path), SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    console.error(`  ! Failed to sign ${bucket}/${path}: ${error?.message}`);
    return { url: publicUrl, changed: false, failed: true };
  }
  return { url: data.signedUrl, changed: true };
}

async function run() {
  const PAGE_SIZE = 500;
  let from = 0;
  let totalRows = 0;
  let totalUpdated = 0;
  let totalUrlsSigned = 0;
  let totalFailed = 0;

  for (;;) {
    const { data: rows, error } = await supabase
      .from('requests')
      .select('id, carte_grise_url, part_photo_urls, reference_photo_url, audio_url')
      .range(from, from + PAGE_SIZE - 1)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Query error:', error);
      process.exit(1);
    }
    if (!rows || rows.length === 0) break;

    for (const row of rows) {
      totalRows++;
      const update = {};
      let rowChanged = false;
      let rowFailed = false;

      if (row.carte_grise_url) {
        const r = await toSignedUrl(row.carte_grise_url);
        if (r.failed) rowFailed = true;
        if (r.changed) { update.carte_grise_url = r.url; rowChanged = true; totalUrlsSigned++; }
      }

      if (row.reference_photo_url) {
        const r = await toSignedUrl(row.reference_photo_url);
        if (r.failed) rowFailed = true;
        if (r.changed) { update.reference_photo_url = r.url; rowChanged = true; totalUrlsSigned++; }
      }

      if (row.audio_url) {
        const r = await toSignedUrl(row.audio_url);
        if (r.failed) rowFailed = true;
        if (r.changed) { update.audio_url = r.url; rowChanged = true; totalUrlsSigned++; }
      }

      if (Array.isArray(row.part_photo_urls) && row.part_photo_urls.length > 0) {
        const results = await Promise.all(row.part_photo_urls.map(toSignedUrl));
        if (results.some(r => r.failed)) rowFailed = true;
        if (results.some(r => r.changed)) {
          update.part_photo_urls = results.map(r => r.url);
          rowChanged = true;
          totalUrlsSigned += results.filter(r => r.changed).length;
        }
      }

      if (rowFailed) totalFailed++;

      if (rowChanged) {
        totalUpdated++;
        console.log(`${APPLY ? 'Updating' : '[dry run] would update'} request ${row.id} (${Object.keys(update).join(', ')})`);
        if (APPLY) {
          const { error: updateErr } = await supabase.from('requests').update(update).eq('id', row.id);
          if (updateErr) {
            console.error(`  ! Update failed for ${row.id}: ${updateErr.message}`);
            totalFailed++;
          }
        }
      }
    }

    from += PAGE_SIZE;
  }

  console.log('---');
  console.log(`Requests scanned: ${totalRows}`);
  console.log(`Requests ${APPLY ? 'updated' : 'that would be updated'}: ${totalUpdated}`);
  console.log(`Individual URLs signed: ${totalUrlsSigned}`);
  console.log(`Failures: ${totalFailed}`);
  if (!APPLY) console.log('\nDry run only — re-run with --apply to write changes.');
  if (totalFailed > 0) process.exit(1);
}

await run();
