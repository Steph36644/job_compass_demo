'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { mapAuthError, loginFeatureCopy, type LoginFeature } from '@/lib/safe-next-path';
import { MSG_SIGNED_IN_LOCAL } from '@/lib/demo-messages';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'px-4 py-1.5 rounded-md text-sm font-medium bg-white text-blue-600 shadow-sm'
          : 'px-4 py-1.5 rounded-md text-sm font-medium text-gray-500'
      }
    >
      {children}
    </button>
  );
}

export function LoginScreen({
  configured,
  nextPath,
  feature,
}: {
  configured: boolean;
  nextPath: string;
  feature: LoginFeature;
}) {
  if (!configured) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h1 className="text-lg font-semibold text-gray-900">登录求职罗盘</h1>
        <p className="text-sm text-gray-600 leading-relaxed">
          本地台账不需要登录。登录只连接账号，求职数据暂时仍以这台浏览器为准。
        </p>
        <p className="text-sm font-medium text-gray-800">还没有配置 Supabase</p>
        <p className="text-sm text-gray-600 leading-relaxed">
          本地台账可以照常使用。要试注册和登录，在应用目录把 <code>.env.example</code> 复制为 <code>.env.local</code>，只填写下面两个变量后重启开发服务器：
        </p>
        <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
          <li><code>NEXT_PUBLIC_SUPABASE_URL</code></li>
          <li><code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
        </ul>
        <p className="text-sm text-gray-600">
          只使用你自己项目的 anon key。不要把其他密钥写进环境变量、前端或文档。公开演示不提供生产项目。
        </p>
        <Link href="/" className="inline-flex px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          回到工作台
        </Link>
      </div>
    );
  }
  return <LoginForm nextPath={nextPath} feature={feature} />;
}

function LoginForm({ nextPath, feature }: { nextPath: string; feature: LoginFeature }) {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  if (done || user) {
    return (
      <div className="bg-white rounded-xl border border-green-200 p-5 space-y-3">
        <p className="text-base font-semibold text-gray-900">{MSG_SIGNED_IN_LOCAL}</p>
        <p className="text-sm text-gray-600 leading-relaxed">
          云同步和导入迁移还没开始，求职数据仍以这台浏览器为准。
        </p>
        <Link href={nextPath} className="inline-flex px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          回到工作台
        </Link>
      </div>
    );
  }

  const submit = async () => {
    if (pending) return;
    setError('');
    setNotice('');
    const address = email.trim();
    if (!address.includes('@') || address.startsWith('@') || address.endsWith('@')) {
      setError('请填写有效邮箱');
      return;
    }
    if (password.length < 6) {
      setError('密码至少 6 位');
      return;
    }
    if (mode === 'sign-up' && password !== confirm) {
      setError('两次输入的密码不一致');
      return;
    }
    const supabase = createSupabaseBrowser();
    if (!supabase) {
      setError('还没有配置 Supabase');
      return;
    }
    setPending(true);
    try {
      if (mode === 'sign-up') {
        const { data, error: signError } = await supabase.auth.signUp({
          email: address,
          password,
          options: { emailRedirectTo: `${window.location.origin}/login` },
        });
        if (signError) {
          setError(mapAuthError(signError.message));
          return;
        }
        if (!data.session) {
          setNotice('注册邮件已发出。请到邮箱完成确认后再登录。确认前求职数据仍只在本机。');
          setMode('sign-in');
          return;
        }
      } else {
        const { data, error: signError } = await supabase.auth.signInWithPassword({
          email: address,
          password,
        });
        if (signError) {
          setError(mapAuthError(signError.message));
          return;
        }
        if (!data.session) {
          setNotice('请先到邮箱完成确认，再登录。');
          return;
        }
      }
      setDone(true);
      await refresh();
      router.refresh();
    } catch {
      setError('登录没有完成，请稍后再试');
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <h1 className="text-lg font-semibold text-gray-900">登录求职罗盘</h1>
      <p className="text-sm text-gray-500">{loginFeatureCopy(feature)}</p>
      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
        <Tab active={mode === 'sign-in'} onClick={() => setMode('sign-in')}>登录</Tab>
        <Tab active={mode === 'sign-up'} onClick={() => setMode('sign-up')}>注册</Tab>
      </div>
      <label className="block text-sm font-medium text-gray-700">
        邮箱
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
          className="mt-1.5 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        密码
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
          required
          className="mt-1.5 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
      {mode === 'sign-up' && (
        <label className="block text-sm font-medium text-gray-700">
          确认密码
          <input
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            required
            className="mt-1.5 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          {notice}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? '正在提交…' : mode === 'sign-up' ? '注册' : '登录'}
      </button>
    </form>
  );
}
