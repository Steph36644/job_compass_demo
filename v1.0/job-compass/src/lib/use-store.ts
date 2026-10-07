'use client';

import { useSyncExternalStore, useEffect, useMemo } from 'react';
import * as store from './store';
import type { AppData } from './store';

let hydrating = false;

function ensureHydrated() {
  if (typeof window === 'undefined' || hydrating) return;
  hydrating = true;
  Promise.resolve().then(() => store.hydrate());
}

// getSnapshot 返回 cache 对象本身（稳定引用），满足 useSyncExternalStore 要求
export function useStore(): AppData {
  useEffect(() => {
    ensureHydrated();
  }, []);

  return useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState
  );
}

export function useApplications() {
  const data = useStore();
  return useMemo(
    () => [...data.applications].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [data.applications]
  );
}

// 服务端快照固定为 false，与 SSR 输出的「加载中」一致。
// 动态路由会在布局 effect 灌完 localStorage 之后才水合；若首帧直接读
// isHydrated()，客户端会画出真实数据，和这段服务端 HTML 对不上。
// useSyncExternalStore 在水合时用 getServerSnapshot，水合完成后再切到客户端快照。
const getServerHydrated = () => false;

export function useHydrated(): boolean {
  useStore();
  return useSyncExternalStore(store.subscribe, store.isHydrated, getServerHydrated);
}

export function useApplication(id: string) {
  const data = useStore();
  return useMemo(
    () => data.applications.find((a) => a.id === id),
    [data.applications, id]
  );
}

export function useResumes() {
  const data = useStore();
  return data.resumes;
}

export function useProfile() {
  const data = useStore();
  return data.profile;
}

export function useNotifications() {
  const data = useStore();
  return data.notifications;
}

export function useUnreadCount() {
  const data = useStore();
  return useMemo(
    () => data.notifications.filter((n) => !n.isRead).length,
    [data.notifications]
  );
}

export function useWeeklyReports() {
  const data = useStore();
  return useMemo(
    () => [...data.weeklyReports].sort((a, b) => b.weekStart.localeCompare(a.weekStart)),
    [data.weeklyReports]
  );
}

export function useMatchReport(applicationId: string) {
  const data = useStore();
  return useMemo(
    () => data.matchReports.find((r) => r.applicationId === applicationId),
    [data.matchReports, applicationId]
  );
}

export function useReview(applicationId: string) {
  const data = useStore();
  return useMemo(
    () => data.reviews.find((r) => r.applicationId === applicationId),
    [data.reviews, applicationId]
  );
}

export function useSchedules(applicationId?: string) {
  const data = useStore();
  return useMemo(() => {
    const list = applicationId
      ? data.schedules.filter((s) => s.applicationId === applicationId)
      : data.schedules;
    return [...list].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  }, [data.schedules, applicationId]);
}

export function useStatusLogs(applicationId: string) {
  const data = useStore();
  return useMemo(
    () =>
      data.statusLogs
        .filter((l) => l.applicationId === applicationId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [data.statusLogs, applicationId]
  );
}
