'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  MSG_CLOUD_WRITE_FAILED,
  MSG_LOGIN_CLOUD_READ,
  MSG_PRIMARY_CLOUD,
  MSG_PRIMARY_LOCAL,
  MSG_ROLLBACK,
  MSG_STILL_LOCAL,
  MSG_SWITCHED_CLOUD,
} from '@/lib/demo-messages';
import { readPrimarySource, writePrimarySource } from '@/lib/primary-source';
import { getState, replaceState, type AppData } from '@/lib/store';

const BACKUP_KEY = 'job-compass-import-backup-v1';

function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const data = value as Partial<AppData>;
  return Array.isArray(data.applications) && Array.isArray(data.resumes);
}

export function CloudPanel() {
  const { user, openLoginPrompt } = useAuth();
  const [primary, setPrimary] = useState(readPrimarySource);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  const syncNow = async () => {
    if (!user) {
      openLoginPrompt('cloud');
      return;
    }
    setPending(true);
    setMessage('');
    try {
      const response = await fetch('/api/cloud/sync', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(getState()),
      });
      const body = (await response.json()) as { ok?: boolean; message?: string };
      if (response.status === 401) {
        setMessage(body.message || MSG_LOGIN_CLOUD_READ);
        return;
      }
      setMessage(body.ok ? '已把本地台账推到云端。主源仍是本地。' : body.message || MSG_CLOUD_WRITE_FAILED);
      if (body.ok) {
        const kept = writePrimarySource('local', true);
        if (kept.ok) setPrimary('local');
      }
    } catch {
      setMessage(MSG_CLOUD_WRITE_FAILED);
    } finally {
      setPending(false);
    }
  };

  const importCloud = async () => {
    if (!user) {
      openLoginPrompt('devices');
      return;
    }
    if (!window.confirm('将用云端快照覆盖这台浏览器里的文字台账。导入前会先做一份本地备份。确定继续吗？')) {
      return;
    }
    setPending(true);
    setMessage('');
    try {
      const response = await fetch('/api/cloud/import', { method: 'GET', credentials: 'same-origin' });
      const body = (await response.json()) as { ok?: boolean; data?: unknown; message?: string };
      if (!response.ok || !body.ok || !isAppData(body.data)) {
        setMessage(body.message || '没有拉到云端数据。本地没有改动，主源仍是本地。');
        return;
      }
      const backup = JSON.stringify(getState());
      window.localStorage.setItem(BACKUP_KEY, backup);
      replaceState(body.data);
      const switched = writePrimarySource('cloud', true);
      if (!switched.ok) {
        setMessage(switched.message);
        return;
      }
      setPrimary('cloud');
      setMessage(MSG_SWITCHED_CLOUD);
    } catch {
      setMessage('没有拉到云端数据。本地没有改动，主源仍是本地。');
    } finally {
      setPending(false);
    }
  };

  const rollback = () => {
    const raw = window.localStorage.getItem(BACKUP_KEY);
    if (!raw) {
      setMessage('没有可用的导入前备份，不能回滚。主源没有因此改成云端。');
      return;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!isAppData(parsed)) {
        setMessage('导入前备份已损坏，不能回滚。');
        return;
      }
      replaceState(parsed);
      writePrimarySource('local', Boolean(user));
      setPrimary('local');
      setMessage(MSG_ROLLBACK);
    } catch {
      setMessage('导入前备份已损坏，不能回滚。');
    }
  };

  return (
    <div id="cloud-import" className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <h2 className="font-semibold text-gray-900">云端与多端</h2>
      <p className="text-sm text-gray-500">
        台账在这台浏览器里，未登录也可以增删改查。当前{primary === 'cloud' ? MSG_PRIMARY_CLOUD : MSG_PRIMARY_LOCAL}。云同步、多端和切换主源需要登录。
      </p>
      <p className="text-sm text-gray-500">
        AI 可在新建投递、简历和数据洞察里使用。供应商 Key 只在服务端，这台浏览器不保存明文 Key。
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void syncNow()}
          disabled={pending}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50"
        >
          {pending ? '正在处理…' : '云同步'}
        </button>
        <button
          type="button"
          onClick={() => void importCloud()}
          disabled={pending}
          className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm disabled:opacity-50"
        >
          多端导入
        </button>
        <button
          type="button"
          onClick={rollback}
          className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm"
        >
          回滚导入
        </button>
        {!user && (
          <Link href="/login?feature=cloud" className="px-4 py-2 border border-blue-200 text-blue-700 rounded-lg text-sm">
            去登录
          </Link>
        )}
      </div>
      {message && <p className="text-sm text-gray-700">{message}</p>}
      {user && primary === 'local' && <p className="text-xs text-gray-400">{MSG_STILL_LOCAL}</p>}
    </div>
  );
}
