import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { readPublicSupabase } from '@/lib/public-env';

export async function createSupabaseServer() {
  const cfg = readPublicSupabase();
  if (!cfg) return null;
  const cookieStore = await cookies();
  return createServerClient(cfg.url, cfg.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // 路由渲染阶段不一定能写 cookie，会话刷新放在 proxy。
        }
      },
    },
  });
}

export async function readSessionUser(): Promise<{ id: string; email: string | null } | null> {
  const supabase = await createSupabaseServer();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}
