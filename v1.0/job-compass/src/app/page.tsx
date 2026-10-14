'use client';

import Link from 'next/link';
import { useApplications } from '@/lib/use-store';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { ApplicationStatus } from '@/lib/types';
import { loadSeedData } from '@/lib/store';
import { Briefcase, FileCheck, Users, Trophy, TrendingUp, Sparkles, Cloud, MonitorSmartphone, Bot } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function HomePage() {
  const applications = useApplications();
  const { user, openLoginPrompt } = useAuth();

  const stats = {
    total: applications.length,
    applied: applications.filter((a) => a.status >= ApplicationStatus.APPLIED && a.status !== ApplicationStatus.CLOSED).length,
    interview: applications.filter((a) => a.status === ApplicationStatus.INTERVIEW).length,
    offer: applications.filter((a) => a.status === ApplicationStatus.OFFER).length,
  };

  const interviewRate = stats.applied > 0 ? Math.round((stats.interview / stats.applied) * 100) : 0;

  return (
    <div className="py-5">
      <div className="px-4 md:px-6 mb-4">
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-gray-600">
            台账在这台浏览器里，未登录也可以增删改查。当前主源：本地。云同步、多端和切换主源需要登录。
          </p>
          <div className="flex flex-wrap gap-2">
            <GateButton loggedIn={Boolean(user)} feature="cloud" href="/profile#cloud-import" onLogin={openLoginPrompt}>
              <Cloud className="w-4 h-4" />云同步
            </GateButton>
            <GateButton loggedIn={Boolean(user)} feature="devices" href="/profile#cloud-import" onLogin={openLoginPrompt}>
              <MonitorSmartphone className="w-4 h-4" />多端
            </GateButton>
            <GateButton loggedIn={Boolean(user)} feature="ai" href="/insights" onLogin={openLoginPrompt}>
              <Bot className="w-4 h-4" />AI
            </GateButton>
          </div>
        </div>
      </div>
      {applications.length === 0 ? (
        /* 空态：只渲染一处引导，不渲染看板 */
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Briefcase className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm">还没有投递记录</p>
          <p className="text-xs mt-1">可以先快速记下公司和岗位，JD 以后再补</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/applications/new?mode=quick"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              快速录入
            </Link>
            <Link
              href="/applications/new"
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-white"
            >
              粘贴 JD 新建
            </Link>
          </div>
          <button
            onClick={loadSeedData}
            className="mt-5 px-4 py-2 border border-purple-200 text-purple-600 rounded-lg text-sm hover:bg-purple-50 flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />载入示例数据体验
          </button>
        </div>
      ) : (
        <>
          {/* 数据概览 */}
          <div className="px-4 md:px-6 mb-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={Briefcase} label="总投递" value={stats.total} color="text-blue-600" bg="bg-blue-50" />
              <StatCard icon={FileCheck} label="已投递" value={stats.applied} color="text-indigo-600" bg="bg-indigo-50" />
              <StatCard icon={Users} label="面试中" value={stats.interview} color="text-orange-600" bg="bg-orange-50" />
              <StatCard icon={Trophy} label="Offer" value={stats.offer} color="text-green-600" bg="bg-green-50" />
            </div>
            {stats.applied > 0 && (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg px-4 py-2.5">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span>
                  面试率 <strong className="text-gray-800">{interviewRate}%</strong>
                  {interviewRate < 10 ? '，偏低，建议优化简历匹配度' : '，表现不错，继续保持'}
                </span>
              </div>
            )}
          </div>

          {/* 看板 */}
          <KanbanBoard applications={applications} />
        </>
      )}
    </div>
  );
}

function GateButton({
  loggedIn, feature, href, onLogin, children,
}: {
  loggedIn: boolean;
  feature: 'ai' | 'cloud' | 'devices';
  href: string;
  onLogin: (feature: 'ai' | 'cloud' | 'devices') => void;
  children: React.ReactNode;
}) {
  const className = 'inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700';
  if (loggedIn) return <Link href={href} className={className}>{children}</Link>;
  return <button type="button" onClick={() => onLogin(feature)} className={className}>{children}</button>;
}

function StatCard({
  icon: Icon, label, value, color, bg,
}: {
  icon: typeof Briefcase; label: string; value: number; color: string; bg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <div className="text-xl font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}
