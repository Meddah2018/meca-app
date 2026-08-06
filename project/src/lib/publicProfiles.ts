import { supabase } from '@/lib/supabase';
import type { PublicProfile } from '@/lib/database.types';

/**
 * Fetch anonymous references for a set of user IDs.
 * Non-admin users cannot read other users' profiles directly (RLS),
 * so we use the SECURITY DEFINER RPC `get_public_profiles` which returns
 * only id, anonymous_reference, and role — no personal info.
 */
export async function fetchPublicProfiles(userIds: string[]): Promise<Map<string, PublicProfile>> {
  const map = new Map<string, PublicProfile>();
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) return map;
  const { data, error } = await supabase.rpc('get_public_profiles', { p_user_ids: unique });
  if (error || !data) return map;
  for (const row of data as PublicProfile[]) {
    map.set(row.id, row);
  }
  return map;
}
