'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { scrubSecretStorage } from '@/lib/scrub-storage';
import { registerCloudSync } from '@/lib/store';
import type { LoginFeature } from '@/lib/safe-next-path';

export interface SessionUser {
  id: string;
  email: string | null;
}

interface AuthValue {
  ready: boolean;
  configured: boolean;
  user: SessionUser | null;
  refresh: () => Promise<void>;
  openLoginPrompt: (feature: LoginFeature) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session', { cache: 'no-store' });
      const body = (await response.json()) as { configured?: boolean; user?: SessionUser | null };
      setConfigured(body.configured === true);
      setUser(body.user?.id ? body.user : null);
    } catch {
      setConfigured(false);
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    scrubSecretStorage();
    void refresh();
  }, [refresh]);

  useEffect(() => {
    registerCloudSync(async (data) => {
      if (!user) return;
      try {
        await fetch('/api/cloud/sync', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(data),
        });
      } catch {
        // 云端失败不回滚本地。
      }
    });
    return () => registerCloudSync(null);
  }, [user]);

  const openLoginPrompt = useCallback((feature: LoginFeature) => {
    router.push(`/login?feature=${feature}`);
  }, [router]);

  const value = useMemo<AuthValue>(
    () => ({ ready, configured, user, refresh, openLoginPrompt }),
    [ready, configured, user, refresh, openLoginPrompt],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return value;
}
