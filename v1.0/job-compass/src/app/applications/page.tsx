'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Trash2, MapPin, Pencil } from 'lucide-react';
import { useApplications } from '@/lib/use-store';
import { deleteApplication } from '@/lib/store';
import { APPLICATION_CHANNELS, ApplicationStatus, STATUS_LABEL, STATUS_COLOR, STATUS_TEXT_COLOR } from '@/lib/types';
import { cn, formatDate, hasJdText } from '@/lib/utils';

const CHANNELS = ['全部', ...APPLICATION_CHANNELS];

export default function ApplicationsPage() {
  const applications = useApplications();
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<number>(0);
  const [channelFilter, setChannelFilter] = useState('全部');

  const filtered = applications.filter((a) => {
    if (keyword && !`${a.company}${a.position}`.includes(keyword)) return false;
    if (statusFilter && a.status !== statusFilter) return false;
    if (channelFilter !== '全部' && a.channel !== channelFilter) return false;
    return true;
  });

  return (
    <div className="px-4 md:px-6 py-5">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">投递记录</h1>
        <div className="flex items-center gap-3">
          <Link href="/applications/new?mode=quick" className="text-sm text-blue-600 hover:underline">快速录入</Link>
          <Link href="/applications/new" className="text-sm text-blue-600 hover:underline">+ 新建</Link>
        </div>
      </div>

      {/* 搜索筛选 */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索公司或岗位"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(Number(e.target.value))}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value={0}>全部状态</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          {CHANNELS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">暂无投递记录</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">公司 / 岗位</th>
                  <th className="text-left px-4 py-3 font-medium">渠道</th>
                  <th className="text-left px-4 py-3 font-medium">城市</th>
                  <th className="text-left px-4 py-3 font-medium">投递日期</th>
                  <th className="text-left px-4 py-3 font-medium">状态</th>
                  <th className="text-left px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/applications/${a.id}`} className="block">
                        <div className="font-medium text-gray-900">{a.company}</div>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                          <span>{a.position}</span>
                          {!hasJdText(a.jdRaw) && <span className="text-amber-700">待补 JD</span>}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.channel}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {a.cities?.[0] && <span className="inline-flex items-center gap-0.5 text-xs"><MapPin className="w-3 h-3" />{a.cities[0]}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(a.applyDate)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', STATUS_TEXT_COLOR[a.status])}>
                        <span className={cn('w-2 h-2 rounded-full', STATUS_COLOR[a.status])} />
                        {STATUS_LABEL[a.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/applications/${a.id}?edit=1`}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="编辑"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => {
                            if (confirm('确定删除这条投递记录？')) deleteApplication(a.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
