import { createBrowserClient } from '@supabase/ssr';
import { readPublicSupabase } from '@/lib/public-env';

export function createSupabaseBrowser() {
  const cfg = readPublicSupabase();
  if (!cfg) return null;
  return createBrowserClient(cfg.url, cfg.anonKey);
}
