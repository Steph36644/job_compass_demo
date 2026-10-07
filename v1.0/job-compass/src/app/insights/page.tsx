'use client';

import { useMemo, useState } from 'react';
import { useApplications, useWeeklyReports } from '@/lib/use-store';
import { ApplicationStatus, STATUS_LABEL, STATUS_COLOR } from '@/lib/types';
import { BarChart3, TrendingUp, Sparkles, Target, Lightbulb, ChevronRight } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

export default function InsightsPage() {
  const applications = useApplications();
  const weeklyReports = useWeeklyReports();

  // 漏斗计算
  const funnel = useMemo(() => {
    const applied = applications.filter((a) => a.status >= ApplicationStatus.APPLIED).length;
    const assessment = applications.filter((a) => a.status >= ApplicationStatus.ASSESSMENT && a.status !== ApplicationStatus.CLOSED).length;
    const interview = applications.filter((a) => a.status === ApplicationStatus.INTERVIEW || a.status === ApplicationStatus.OFFER).length;
    const offer = applications.filter((a) => a.status === ApplicationStatus.OFFER).length;
    return {
      total: applications.length,
      applied,
      assessment,
      interview,
      offer,
      assessmentRate: applied > 0 ? Math.round((assessment / applied) * 100) : 0,
      interviewRate: applied > 0 ? Math.round((interview / applied) * 100) : 0,
      offerRate: applied > 0 ? Math.round((offer / applied) * 100) : 0,
    };
  }, [applications]);

  // 渠道维度
  const channelStats = useMemo(() => {
    const map = new Map<string, { total: number; interview: number }>();
    for (const a of applications) {
      const cur = map.get(a.channel) || { total: 0, interview: 0 };
      cur.total++;
      if (a.status === ApplicationStatus.INTERVIEW || a.status === ApplicationStatus.OFFER) cur.interview++;
      map.set(a.channel, cur);
    }
    return Array.from(map.entries()).map(([channel, v]) => ({
      channel, ...v, rate: v.total > 0 ? Math.round((v.interview / v.total) * 100) : 0,
    })).sort((a, b) => b.total - a.total);
  }, [applications]);

  // AI 诊断（基于漏斗数据）
  const diagnosis = useMemo(() => {
    if (funnel.applied < 3) return '投递样本较少，建议继续投递积累数据以获得更准确的诊断。';
    if (funnel.assessmentRate < 10) return '瓶颈在简历初筛：测评/笔试通过率偏低，建议优化简历与岗位的匹配度，针对岗位要求调整关键词。';
    if (funnel.interviewRate < 10) return '瓶颈在测评/面试：笔试通过率尚可但面试率低，建议加强笔试题练习与面试准备。';
    if (funnel.offerRate < 5) return '瓶颈在面试：面试率尚可但 Offer 少，建议复盘面试问题，针对性提升表达与专业能力。';
    return '整体转化健康，继续保持当前节奏，重点巩固已有 Offer 或冲刺更高目标。';
  }, [funnel]);

  return (
    <div className="px-4 md:px-6 py-5 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">数据洞察</h1>
        <p className="text-sm text-gray-500 mt-0.5">用数据看清你的求职转化，AI 帮你定位问题</p>
      </div>

      {/* 核心指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="总投递" value={funnel.total} color="text-blue-600" />
        <MetricCard label="已投递" value={funnel.applied} color="text-indigo-600" />
        <MetricCard label="面试率" value={`${funnel.interviewRate}%`} color="text-orange-600" />
        <MetricCard label="Offer" value={funnel.offer} color="text-green-600" />
      </div>

      {/* 漏斗图 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-gray-500" />转化漏斗
        </h2>
        <FunnelChart funnel={funnel} />
      </div>

      {/* AI 诊断 */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-100 p-5">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />AI 漏斗诊断
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed">{diagnosis}</p>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-white/60 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500">笔试通过率</div>
            <div className="text-lg font-bold text-purple-600 mt-1">{funnel.assessmentRate}%</div>
          </div>
          <div className="bg-white/60 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500">面试通过率</div>
            <div className="text-lg font-bold text-orange-600 mt-1">{funnel.interviewRate}%</div>
          </div>
          <div className="bg-white/60 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500">Offer 率</div>
            <div className="text-lg font-bold text-green-600 mt-1">{funnel.offerRate}%</div>
          </div>
        </div>
      </div>

      {/* 渠道对比 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-500" />渠道效果对比
        </h2>
        {channelStats.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">暂无数据</div>
        ) : (
          <div className="space-y-2">
            {channelStats.map((c) => (
              <div key={c.channel} className="flex items-center gap-3">
                <span className="w-20 text-sm text-gray-700 shrink-0">{c.channel}</span>
                <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden relative">
                  <div
                    className={cn('h-full rounded-full', c.rate >= 20 ? 'bg-green-400' : c.rate >= 10 ? 'bg-orange-400' : 'bg-red-400')}
                    style={{ width: `${Math.max(c.rate, 3)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-24 text-right">{c.total} 投 · 面试率 {c.rate}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 周复盘 */}
      <WeeklyReviewSection reports={weeklyReports} />
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={cn('text-2xl font-bold mt-1', color)}>{value}</div>
    </div>
  );
}

function FunnelChart({ funnel }: { funnel: { applied: number; assessment: number; interview: number; offer: number; assessmentRate: number; interviewRate: number; offerRate: number } }) {
  const stages = [
    { label: '已投递', value: funnel.applied, rate: 100, color: 'bg-blue-500' },
    { label: '测评/笔试', value: funnel.assessment, rate: funnel.assessmentRate, color: 'bg-purple-500' },
    { label: '面试', value: funnel.interview, rate: funnel.interviewRate, color: 'bg-orange-500' },
    { label: 'Offer', value: funnel.offer, rate: funnel.offerRate, color: 'bg-green-500' },
  ];

  return (
    <div className="space-y-2">
      {stages.map((s, i) => (
        <div key={s.label} className="flex items-center gap-3">
          <span className="w-16 text-xs text-gray-600 text-right shrink-0">{s.label}</span>
          <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
            <div
              className={cn('h-full rounded-lg flex items-center justify-end px-2 transition-all', s.color)}
              style={{ width: `${Math.max(s.rate, 5)}%` }}
            >
              <span className="text-white text-xs font-medium">{s.value}</span>
            </div>
          </div>
          <span className="w-12 text-xs text-gray-500">{s.rate}%</span>
        </div>
      ))}
    </div>
  );
}

function WeeklyReviewSection({ reports }: { reports: ReturnType<typeof useWeeklyReports> }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-purple-500" />AI 周度复盘
      </h2>
      {reports.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">本周还没有复盘数据，完成投递状态更新后生成</p>
        </div>
      ) : (
      reports.map((r, idx) => (
        <div key={r.id} className="border border-gray-100 rounded-lg overflow-hidden">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
          >
            <div className="text-left">
              <div className="text-sm font-medium text-gray-800">第 {idx + 1} 周复盘</div>
              <div className="text-xs text-gray-400">{formatDate(r.weekStart)} ~ {formatDate(r.weekEnd)}</div>
            </div>
            <ChevronRight className={cn('w-4 h-4 text-gray-400 transition-transform', expanded && 'rotate-90')} />
          </button>
          {expanded && (
            <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
              <div>
                <h4 className="text-xs font-medium text-gray-500 mb-1.5">本周数据</h4>
                <div className="flex gap-4 text-sm">
                  <span>新增投递 <strong className="text-gray-800">{r.dataOverview.newApplications}</strong></span>
                  <span>状态变更 <strong className="text-gray-800">{r.dataOverview.statusChanges}</strong></span>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 mb-1.5">诊断结论</h4>
                <p className="text-sm text-gray-700">{r.diagnosis}</p>
              </div>
              {r.resumeSuggestions && r.resumeSuggestions.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1"><Lightbulb className="w-3 h-3" />简历优化</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {r.resumeSuggestions.map((s, i) => <li key={i} className="flex gap-2"><span className="text-gray-300">•</span>{s}</li>)}
                  </ul>
                </div>
              )}
              {r.actionItems && r.actionItems.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1"><Target className="w-3 h-3" />下周行动</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {r.actionItems.map((s, i) => <li key={i} className="flex gap-2"><span className="text-gray-300">•</span>{s}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ))
      )}
    </div>
  );
}
