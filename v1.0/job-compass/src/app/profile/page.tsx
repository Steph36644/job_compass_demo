'use client';

import { useState } from 'react';
import { useHydrated, useProfile } from '@/lib/use-store';
import { saveProfile, resetData } from '@/lib/store';
import type { UserProfile } from '@/lib/types';
import { User, GraduationCap, Briefcase, CheckCircle2, AlertTriangle } from 'lucide-react';

const DEGREE_OPTIONS = [
  { value: 1, label: '大专' },
  { value: 2, label: '本科' },
  { value: 3, label: '硕士' },
  { value: 4, label: '博士' },
];

const STAGE_OPTIONS = [
  { value: 1, label: '实习' },
  { value: 2, label: '秋招' },
  { value: 3, label: '春招' },
  { value: 4, label: '社招' },
];

export default function ProfilePage() {
  const hydrated = useHydrated();
  const profile = useProfile();

  // 表单 state 只在水合完成后初始化。否则刷新时会用空默认值盖住 localStorage 里的档案，
  // 再点保存会把学历、毕业年份等写回成默认值。
  if (!hydrated) {
    return <div className="px-4 md:px-6 py-10 text-center text-gray-400">加载中...</div>;
  }

  return <ProfileForm profile={profile} />;
}

function ProfileForm({ profile }: { profile: UserProfile | null }) {
  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [school, setSchool] = useState(profile?.school || '');
  const [major, setMajor] = useState(profile?.major || '');
  const [degree, setDegree] = useState(profile?.degree || 2);
  const [graduationYear, setGraduationYear] = useState(profile?.graduationYear || 2027);
  const [targetDirections, setTargetDirections] = useState((profile?.targetDirections || []).join('、'));
  const [expectedCities, setExpectedCities] = useState((profile?.expectedCities || []).join('、'));
  const [jobStage, setJobStage] = useState(profile?.jobStage || 2);
  const [saved, setSaved] = useState(false);

  const directionList = targetDirections ? targetDirections.split(/[、,，\s]+/).filter(Boolean) : [];
  const canSave = Boolean(school.trim() && major.trim() && directionList.length);

  const handleSave = () => {
    if (!canSave) return;
    const data: UserProfile = {
      nickname: nickname || undefined,
      school,
      major,
      degree,
      graduationYear,
      targetDirections: directionList,
      expectedCities: expectedCities ? expectedCities.split(/[、,，\s]+/).filter(Boolean) : undefined,
      jobStage,
    };
    saveProfile(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="px-4 md:px-6 py-5 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">我的</h1>
        <p className="text-sm text-gray-500 mt-0.5">完善求职档案，AI 分析时会作为上下文参考</p>
      </div>

      {/* 求职档案 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-gray-500" />求职档案
        </h2>
        <div className="space-y-4">
          <Field label="昵称">
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="选填" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="学校" required>
              <input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="如：某某大学" className={inputCls} />
            </Field>
            <Field label="专业" required>
              <input value={major} onChange={(e) => setMajor(e.target.value)} placeholder="如：计算机科学与技术" className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="学历">
              <select value={degree} onChange={(e) => setDegree(Number(e.target.value))} className={inputCls}>
                {DEGREE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="毕业年份">
              <input type="number" value={graduationYear} onChange={(e) => setGraduationYear(Number(e.target.value))} className={inputCls} />
            </Field>
          </div>
          <Field label="目标方向" required>
            <input value={targetDirections} onChange={(e) => setTargetDirections(e.target.value)} placeholder="如：产品经理、产品运营（用顿号分隔）" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="期望城市">
              <input value={expectedCities} onChange={(e) => setExpectedCities(e.target.value)} placeholder="北京、杭州" className={inputCls} />
            </Field>
            <Field label="求职阶段">
              <select value={jobStage} onChange={(e) => setJobStage(Number(e.target.value))} className={inputCls}>
                {STAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              保存档案
            </button>
            {saved && <span className="text-sm text-green-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />已保存</span>}
          </div>
        </div>
      </div>

      {/* 数据管理 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-gray-500" />数据管理
        </h2>
        <p className="text-sm text-gray-500 mb-3">你的所有数据都保存在本地浏览器中，清除浏览器数据会导致丢失。</p>
        <button
          onClick={() => {
            if (confirm('确定要重置所有数据吗？此操作不可恢复，将清空所有投递、简历、复盘记录，以及已上传的简历原件。')) {
              void resetData().finally(() => location.reload());
            }
          }}
          className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 flex items-center gap-1.5"
        >
          <AlertTriangle className="w-4 h-4" />重置所有数据
        </button>
      </div>

      {/* 关于 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-gray-500" />关于求职罗盘
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          求职罗盘是一款面向应届生与实习生的 AI 求职过程管理工具。帮你记录投递、分析岗位差距、复盘求职过程，
          用数据和 AI 回答「我投到哪了、我还缺什么、下一步该做什么」。
        </p>
        <div className="mt-3 text-xs text-gray-400">
          V1.0 MVP · 数据存储于本地浏览器 · AI 功能为模拟演示
        </div>
      </div>
    </div>
  );
}

const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
