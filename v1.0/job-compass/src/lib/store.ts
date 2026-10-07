// localStorage 数据存储层
// MVP 阶段用 localStorage 模拟后端，后续可替换为 API 调用

import type {
  Application, Resume, StatusLog, Schedule, MatchReport,
  Review, Notification, UserProfile, WeeklyReport,
} from './types';
import { uid } from './utils';
import { deleteJdScreenshot } from './jd-image-store';
import { seedApplications, seedResumes, seedProfile, seedNotifications } from './mock-data';
import { clearResumeBlobs, deleteResumeBlob } from './resume-files';

const STORAGE_KEY = 'job-compass-data-v1';

export interface AppData {
  profile: UserProfile | null;
  applications: Application[];
  resumes: Resume[];
  statusLogs: StatusLog[];
  schedules: Schedule[];
  matchReports: MatchReport[];
  reviews: Review[];
  notifications: Notification[];
  weeklyReports: WeeklyReport[];
  userId: string;
}

const DEFAULT_DATA: AppData = {
  profile: null,
  applications: [],
  resumes: [],
  statusLogs: [],
  schedules: [],
  matchReports: [],
  reviews: [],
  notifications: [],
  weeklyReports: [],
  userId: 'demo-user',
};

let cache: AppData = DEFAULT_DATA;
let listeners: Array<() => void> = [];
let hydrated = false;

// 从 localStorage 加载数据（仅客户端，挂载后调用）
export function hydrate() {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    // 有存档则加载；无存档（首次访问或重置后）一律保持空态，不预填任何数据。
    // 示例数据只能由用户在界面上主动点击「载入示例数据」时写入。
    cache = raw ? { ...DEFAULT_DATA, ...(JSON.parse(raw) as Partial<AppData>) } : { ...DEFAULT_DATA };
  } catch {
    cache = { ...DEFAULT_DATA };
  }
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function save(data: AppData) {
  cache = data;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
  listeners.forEach((l) => l());
}

export function getState(): AppData {
  return cache;
}

export function isHydrated(): boolean {
  return hydrated;
}

export function setState(updater: (data: AppData) => AppData) {
  const next = updater(cache);
  save(next);
}

// ===== 档案 =====
export function getProfile(): UserProfile | null {
  return cache.profile;
}

export function saveProfile(profile: UserProfile) {
  setState((d) => ({ ...d, profile }));
}

// ===== 简历 =====
export function getResumes(): Resume[] {
  return cache.resumes;
}

export function getResume(id: string): Resume | undefined {
  return cache.resumes.find((r) => r.id === id);
}

export function addResume(resume: Omit<Resume, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Resume {
  const now = new Date().toISOString();
  const r: Resume = { ...resume, id: uid(), userId: cache.userId, createdAt: now, updatedAt: now };
  setState((d) => ({
    ...d,
    // 主简历只能有一份：新建并设为主简历时，取消其余版本的主标记
    resumes: [
      ...(r.isPrimary ? d.resumes.map((x) => (x.isPrimary ? { ...x, isPrimary: false } : x)) : d.resumes),
      r,
    ],
  }));
  return r;
}

export function updateResume(id: string, patch: Partial<Resume>) {
  setState((d) => ({
    ...d,
    resumes: d.resumes.map((r) => {
      if (r.id === id) return { ...r, ...patch, updatedAt: new Date().toISOString() };
      if (patch.isPrimary && r.isPrimary) return { ...r, isPrimary: false };
      return r;
    }),
  }));
}

export function deleteResume(id: string) {
  const fileId = cache.resumes.find((r) => r.id === id)?.sourceFile?.fileId;
  setState((d) => ({ ...d, resumes: d.resumes.filter((r) => r.id !== id) }));
  if (fileId) void deleteResumeBlob(fileId);
}

// ===== 投递 =====
export function getApplications(): Application[] {
  return cache.applications.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getApplication(id: string): Application | undefined {
  return cache.applications.find((a) => a.id === id);
}

export function addApplication(app: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Application {
  const now = new Date().toISOString();
  const a: Application = { ...app, id: uid(), userId: cache.userId, createdAt: now, updatedAt: now };
  setState((d) => {
    // 状态流转记录
    const log: StatusLog = {
      id: uid(),
      applicationId: a.id,
      fromStatus: null,
      toStatus: a.status,
      createdAt: now,
    };
    return { ...d, applications: [...d.applications, a], statusLogs: [...d.statusLogs, log] };
  });
  return a;
}

export function updateApplication(id: string, patch: Partial<Application>) {
  setState((d) => ({
    ...d,
    applications: d.applications.map((a) =>
      a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a
    ),
  }));
}

export function deleteApplication(id: string) {
  setState((d) => ({
    ...d,
    applications: d.applications.filter((a) => a.id !== id),
    statusLogs: d.statusLogs.filter((l) => l.applicationId !== id),
    schedules: d.schedules.filter((s) => s.applicationId !== id),
    matchReports: d.matchReports.filter((r) => r.applicationId !== id),
    reviews: d.reviews.filter((r) => r.applicationId !== id),
  }));
  void deleteJdScreenshot(id);
}

export function changeStatus(applicationId: string, toStatus: Application['status'], remark?: string) {
  const data = cache;
  const app = data.applications.find((a) => a.id === applicationId);
  if (!app || app.status === toStatus) return;
  const fromStatus = app.status;
  const now = new Date().toISOString();
  const log: StatusLog = { id: uid(), applicationId, fromStatus, toStatus, remark, createdAt: now };
  setState((d) => ({
    ...d,
    applications: d.applications.map((a) =>
      a.id === applicationId ? { ...a, status: toStatus, updatedAt: now } : a
    ),
    statusLogs: [...d.statusLogs, log],
  }));
}

export function getStatusLogs(applicationId: string): StatusLog[] {
  return cache
    .statusLogs.filter((l) => l.applicationId === applicationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function findDuplicate(company: string, position: string): Application | undefined {
  return cache.applications.find(
    (a) => a.company.trim() === company.trim() && a.position.trim() === position.trim()
  );
}

// ===== 日程 =====
export function getSchedules(applicationId?: string): Schedule[] {
  const data = cache;
  const list = applicationId
    ? data.schedules.filter((s) => s.applicationId === applicationId)
    : data.schedules;
  return list.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

export function addSchedule(schedule: Omit<Schedule, 'id'>): Schedule {
  const s: Schedule = { ...schedule, id: uid() };
  setState((d) => ({ ...d, schedules: [...d.schedules, s] }));
  return s;
}

export function deleteSchedule(id: string) {
  setState((d) => ({ ...d, schedules: d.schedules.filter((s) => s.id !== id) }));
}

// ===== 匹配报告 =====
export function getMatchReport(applicationId: string): MatchReport | undefined {
  return cache.matchReports.find((r) => r.applicationId === applicationId);
}

export function saveMatchReport(report: MatchReport) {
  setState((d) => {
    const existing = d.matchReports.findIndex((r) => r.applicationId === report.applicationId);
    const matchReports = [...d.matchReports];
    if (existing >= 0) {
      matchReports[existing] = report;
    } else {
      matchReports.push(report);
    }
    return { ...d, matchReports };
  });
}

// 岗位信息/JD 在报告生成后被修改时，标记该投递的报告为已过期
export function markMatchReportOutdated(applicationId: string) {
  setState((d) => ({
    ...d,
    matchReports: d.matchReports.map((r) =>
      r.applicationId === applicationId ? { ...r, outdated: true } : r
    ),
  }));
}

// ===== 复盘 =====
export function getReview(applicationId: string): Review | undefined {
  return cache.reviews.find((r) => r.applicationId === applicationId);
}

export function saveReview(applicationId: string, data: Partial<Review>) {
  setState((d) => {
    const existing = d.reviews.findIndex((r) => r.applicationId === applicationId);
    const reviews = [...d.reviews];
    if (existing >= 0) {
      reviews[existing] = { ...reviews[existing], ...data, updatedAt: new Date().toISOString() };
    } else {
      reviews.push({ id: uid(), applicationId, ...data, updatedAt: new Date().toISOString() });
    }
    return { ...d, reviews };
  });
}

// ===== 通知 =====
export function getNotifications(): Notification[] {
  return cache.notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getUnreadCount(): number {
  return cache.notifications.filter((n) => !n.isRead).length;
}

export function markNotificationRead(id: string) {
  setState((d) => ({
    ...d,
    notifications: d.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
  }));
}

export function markAllNotificationsRead() {
  setState((d) => ({
    ...d,
    notifications: d.notifications.map((n) => ({ ...n, isRead: true })),
  }));
}

// ===== 周复盘 =====
export function getWeeklyReports(): WeeklyReport[] {
  return cache.weeklyReports.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

// ===== 重置数据 =====
// 写入一份显式的空数据存档（保留 key），而不是 removeItem 后重新 hydrate。
// 否则 hydrate 会把「无 key」误判为首次访问，重新灌入示例数据，导致重置无效。
export async function resetData() {
  const empty: AppData = { ...DEFAULT_DATA };
  cache = empty;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(empty));
  }
  listeners.forEach((l) => l());
  try {
    await clearResumeBlobs();
  } catch {
    // 列表已经清空；原件清理失败时不挡住重置
  }
}

// ===== 载入示例数据（仅由用户在界面上主动触发，用于体验演示）=====
// 已有用户数据的集合保持不动，避免覆盖真实记录
export function loadSeedData() {
  setState((d) => ({
    ...d,
    profile: d.profile ?? seedProfile,
    applications: d.applications.length ? d.applications : seedApplications,
    resumes: d.resumes.length ? d.resumes : seedResumes,
    notifications: d.notifications.length ? d.notifications : seedNotifications,
  }));
}
