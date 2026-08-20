import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

// Minimal .env parser (avoids adding a dotenv dependency for a one-off script)
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
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
const usingServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

console.log(`Using ${usingServiceRole ? 'SERVICE ROLE (bypasses RLS)' : 'ANON key (subject to RLS)'} against ${url}`);

const supabase = createClient(url, key);

const requestId = process.argv[2] ?? '44c27baf-7b58-4ba6-bb25-7445f7e9535b';

const { data, error } = await supabase
  .from('offers')
  .select('id, request_id, supplier_id, part_name, part_brand, net_price, status')
  .eq('request_id', requestId);

if (error) {
  console.error('Query error:', error);
  process.exit(1);
}

console.log(`Rows found: ${data.length}`);
console.table(data);
