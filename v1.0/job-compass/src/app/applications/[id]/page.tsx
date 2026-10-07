'use client';

import { Suspense, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, MapPin, Calendar, Clock, Sparkles, Loader2, CheckCircle2,
  AlertCircle, Plus, Trash2, FileText, Lightbulb, Target, TrendingUp,
  Pencil, UserPlus,
} from 'lucide-react';
import { changeStatus, addSchedule, deleteSchedule, saveReview, saveMatchReport, getApplication } from '@/lib/store';
import {
  useApplication, useHydrated, useMatchReport, useResumes, useReview, useSchedules, useStatusLogs,
} from '@/lib/use-store';
import { ApplicationForm } from '@/components/applications/ApplicationForm';
import { generateMatchReport } from '@/lib/mock-ai';
import {
  ApplicationStatus, STATUS_LABEL, STATUS_COLOR, STATUS_TEXT_COLOR,
  ScheduleType, SCHEDULE_TYPE_LABEL, type Application, type MatchStatus, type Resume,
} from '@/lib/types';
import { cn, formatDate, formatDateTime, hasJdText } from '@/lib/utils';

export default function ApplicationDetailPage() {
  return (
    <Suspense fallback={<div className="px-6 py-10 text-center text-gray-400">加载中...</div>}>
      <ApplicationDetailContent />
    </Suspense>
  );
}

function ApplicationDetailContent() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const hydrated = useHydrated();
  const app = useApplication(id as string);
  const [editing, setEditing] = useState(() => searchParams.get('edit') === '1');

  // 三态严格区分：未水合 → 加载态；已水合且无记录 → 不存在；已水合且有记录 → 正常渲染
  if (!hydrated) {
    return <div className="px-6 py-10 text-center text-gray-400">加载中...</div>;
  }

  if (!app) {
    return (
      <div className="px-6 py-10 text-center text-gray-400">
        <p>投递记录不存在</p>
        <Link href="/" className="text-blue-600 text-sm hover:underline mt-2 inline-block">返回看板</Link>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-5 max-w-5xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ChevronLeft className="w-4 h-4" /> 返回看板
      </Link>

      {editing ? (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h1 className="text-lg font-bold text-gray-900 mb-4">编辑投递</h1>
          <ApplicationForm
            mode="edit"
            initial={app}
            onSaved={() => setEditing(false)}
            onBack={() => setEditing(false)}
          />
        </div>
      ) : (
        <ApplicationDetail app={app} onEdit={() => setEditing(true)} />
      )}
    </div>
  );
}

function ApplicationDetail({ app, onEdit }: { app: Application; onEdit: () => void }) {
  const matchReport = useMatchReport(app.id);
  const review = useReview(app.id);
  const schedules = useSchedules(app.id);
  const statusLogs = useStatusLogs(app.id);
  const resumes = useResumes();

  // 状态切换
  const handleStatusChange = (status: ApplicationStatus) => {
    if (status !== app.status) {
      changeStatus(app.id, status);
    }
  };

  return (
    <div className="space-y-5">
      {/* 头部 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{app.company}</h1>
            <p className="text-gray-600 mt-0.5">{app.position}</p>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{app.cities?.join('、') || '未知'}</span>
              <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(app.applyDate)}</span>
              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{app.channel}</span>
              {app.salary && <span className="text-blue-600 text-xs">{app.salary}</span>}
              {app.referrer && (
                <span className="inline-flex items-center gap-1 text-xs"><UserPlus className="w-3.5 h-3.5" />内推：{app.referrer}</span>
              )}
              {!hasJdText(app.jdRaw) && (
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs">待补 JD</span>
              )}
            </div>
            {app.remark && <p className="text-sm text-gray-600 mt-3">{app.remark}</p>}
          </div>

          {/* 状态切换 + 编辑入口 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">状态：</span>
            <select
              value={app.status}
              onChange={(e) => handleStatusChange(Number(e.target.value))}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium border-2 bg-white',
                STATUS_TEXT_COLOR[app.status],
                STATUS_COLOR[app.status].replace('bg-', 'border-')
              )}
            >
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <button
              onClick={onEdit}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:text-blue-600 hover:border-blue-300 flex items-center gap-1"
            >
              <Pencil className="w-3.5 h-3.5" />编辑
            </button>
          </div>
        </div>
      </div>

      {/* AI 匹配报告 */}
      <MatchReportSection
        applicationId={app.id}
        resumeId={app.resumeId}
        report={matchReport}
        resumes={resumes}
        hasJd={hasJdText(app.jdRaw)}
      />

      {/* 日程安排 */}
      <ScheduleSection applicationId={app.id} schedules={schedules} />

      {/* 状态时间线 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />状态流转记录
        </h2>
        <div className="space-y-3">
          {statusLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              <div className="flex-1">
                <div className="text-sm text-gray-800">
                  {log.fromStatus ? `${STATUS_LABEL[log.fromStatus]} → ` : ''}
                  <span className="font-medium">{STATUS_LABEL[log.toStatus]}</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{formatDateTime(log.createdAt)}</div>
                {log.remark && <div className="text-sm text-gray-600 mt-1 bg-gray-50 px-2 py-1 rounded">{log.remark}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 复盘 */}
      <ReviewSection applicationId={app.id} initial={review} />

      {/* JD 原文 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500" />JD 原文
        </h2>
        {hasJdText(app.jdRaw) ? (
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
            {app.jdRaw}
          </pre>
        ) : (
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-sm text-amber-900">
            <p>还没有 JD。手机上不好复制时，可以截一张图，在编辑里识别成文字，或稍后粘贴原文。</p>
            <button
              type="button"
              onClick={onEdit}
              className="mt-3 px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-sm text-amber-800 hover:bg-amber-100"
            >
              补充 JD
            </button>
          </div>
        )}
      </div>

      {app.jobUrl && (
        <div className="text-sm text-gray-500 px-1">
          岗位链接：<a href={app.jobUrl} target="_blank" rel="noopener" className="text-blue-600 hover:underline break-all">{app.jobUrl}</a>
        </div>
      )}
    </div>
  );
}

// ===== AI 匹配报告区块 =====
function MatchReportSection({
  applicationId, resumeId, report, resumes, hasJd,
}: {
  applicationId: string;
  resumeId?: string;
  report: ReturnType<typeof useMatchReport>;
  resumes: Resume[];
  hasJd: boolean;
}) {
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [selectedResumeId, setSelectedResumeId] = useState(resumeId || resumes[0]?.id || '');

  const handleGenerate = async () => {
    const app = getApplication(applicationId);
    const resume = resumes.find((r) => r.id === selectedResumeId);
    if (!app || !resume) return;
    if (!hasJdText(app.jdRaw)) {
      setGenerateError('请先补充 JD，再生成匹配报告');
      return;
    }
    setGenerating(true);
    setGenerateError('');
    try {
      const result = await generateMatchReport(app, resume);
      saveMatchReport(result);
    } catch {
      setGenerateError('生成失败，请重试');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />AI 岗位匹配报告
          </h2>
          {report && (
            <button
              onClick={handleGenerate}
              disabled={generating || !selectedResumeId || !hasJd}
              className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              重新生成
            </button>
          )}
          {!report && (
            <div className="flex items-center gap-2">
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
              >
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <button
                onClick={handleGenerate}
                disabled={generating || !selectedResumeId || !hasJd}
                className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
              >
                {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                生成报告
              </button>
            </div>
          )}
        </div>

      {!hasJd && (
        <div className="mb-4 flex items-center gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-100 px-3 py-2.5 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          还没有 JD，补充原文或截图识别后再生成匹配报告。
        </div>
      )}
      {generateError && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2.5 rounded-lg">
          {generateError}
        </div>
      )}

      {report?.outdated && (
        <div className="mb-4 flex items-center gap-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 px-3 py-2.5 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          JD 已变更，建议重新生成
        </div>
      )}

      {report ? (
        <div className="space-y-4">
          {/* 分数与摘要 */}
          <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl">
            <div className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0',
              report.score >= 70 ? 'bg-green-100 text-green-600' : report.score >= 50 ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
            )}>
              {report.score}
            </div>
            <div>
              <div className="text-xs text-gray-500">综合匹配度</div>
              <p className="text-sm text-gray-700 mt-1 leading-relaxed">{report.summary}</p>
            </div>
          </div>

          {/* 要求清单 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">岗位要求匹配</h3>
            <div className="space-y-2">
              {report.requirements.map((req, i) => (
                <RequirementItem key={i} req={req} />
              ))}
            </div>
          </div>

          {/* 缺口建议 */}
          {report.gapSuggestions.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-orange-500" />能力缺口与行动建议
              </h3>
              <div className="space-y-2">
                {report.gapSuggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 bg-orange-50/50 rounded-lg">
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 mt-0.5',
                      s.type === 'skill' ? 'bg-blue-100 text-blue-600' :
                      s.type === 'project' ? 'bg-green-100 text-green-600' :
                      s.type === 'resume' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
                    )}>
                      {s.type === 'skill' ? '学技能' : s.type === 'project' ? '补项目' : s.type === 'resume' ? '改简历' : '调方向'}
                    </span>
                    <p className="text-sm text-gray-700">{s.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 简历优化建议 */}
          {report.resumeOptimizations.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-yellow-500" />简历优化建议
              </h3>
              <div className="space-y-2">
                {report.resumeOptimizations.map((o, i) => (
                  <div key={i} className="p-3 bg-yellow-50/50 rounded-lg">
                    <div className="text-xs font-medium text-gray-700 mb-1">📍 {o.location}</div>
                    {o.current && <div className="text-xs text-gray-500 line-through mb-1">当前：{o.current}</div>}
                    <div className="text-sm text-gray-800 mb-1">建议：{o.suggested}</div>
                    <div className="text-xs text-gray-500">理由：{o.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
            本报告由 AI 生成，仅供参考，请人工核对后使用。每条判定可点击查看原文引用。
          </p>
        </div>
      ) : (
        <div className="text-center py-10 text-gray-400">
          <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-40" />
          {hasJd ? (
            <>
              <p className="text-sm">选择简历版本并生成 AI 匹配报告</p>
              <p className="text-xs mt-1">了解你与该岗位的匹配度及需要补齐的能力</p>
            </>
          ) : (
            <>
              <p className="text-sm">还没有 JD，暂时无法生成匹配报告</p>
              <p className="text-xs mt-1">在编辑里粘贴原文，或用截图识别</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RequirementItem({ req }: { req: { category: string; text: string; matchStatus: MatchStatus; resumeQuote?: string; jdQuote: string; suggestion?: string } }) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = {
    matched: { label: '已具备', color: 'text-green-600', bg: 'bg-green-50', dot: 'bg-green-500' },
    partial: { label: '部分具备', color: 'text-orange-600', bg: 'bg-orange-50', dot: 'bg-orange-500' },
    missing: { label: '缺失', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' },
  }[req.matchStatus];

  const catLabel = { hard: '硬性', responsibility: '职责', skill: '技能', bonus: '加分' }[req.category] || '';

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <div className="flex items-start gap-2 p-3 cursor-pointer hover:bg-gray-50" onClick={() => setExpanded((v) => !v)}>
        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${statusConfig.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{catLabel}</span>
            <span className="text-sm text-gray-800 flex-1">{req.text}</span>
          </div>
        </div>
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded shrink-0', statusConfig.bg, statusConfig.color)}>
          {statusConfig.label}
        </span>
      </div>
      {expanded && (
        <div className="px-3 pb-3 space-y-2 text-xs">
          <div className="text-gray-500">
            <span className="text-gray-400">JD 原文：</span>{req.jdQuote}
          </div>
          {req.resumeQuote && (
            <div className="text-green-700">
              <span className="text-green-500">简历证据：</span>{req.resumeQuote}
            </div>
          )}
          {req.suggestion && (
            <div className="text-orange-700 bg-orange-50 p-2 rounded">
              <span className="text-orange-500">建议：</span>{req.suggestion}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===== 日程区块 =====
function ScheduleSection({ applicationId, schedules }: { applicationId: string; schedules: ReturnType<typeof useSchedules> }) {
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<ScheduleType>(ScheduleType.INTERVIEW);
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [remark, setRemark] = useState('');

  const handleAdd = () => {
    if (!time) return;
    addSchedule({ applicationId, type, scheduledAt: time, location: location || undefined, remark: remark || undefined });
    setShowForm(false);
    setTime('');
    setLocation('');
    setRemark('');
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />日程安排
        </h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />添加
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select value={type} onChange={(e) => setType(Number(e.target.value))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
              {Object.entries(SCHEDULE_TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <input type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="地点/链接" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="备注" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">保存</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">取消</button>
          </div>
        </div>
      )}

      {schedules.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm">暂无日程</div>
      ) : (
        <div className="space-y-2">
          {schedules.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800">
                  {SCHEDULE_TYPE_LABEL[s.type]}
                  {s.location && <span className="text-gray-500 font-normal ml-2">· {s.location}</span>}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{formatDateTime(s.scheduledAt)}</div>
                {s.remark && <div className="text-xs text-gray-500 mt-1">{s.remark}</div>}
              </div>
              <button onClick={() => deleteSchedule(s.id)} className="p-1.5 text-gray-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== 复盘区块 =====
function ReviewSection({ applicationId, initial }: { applicationId: string; initial: ReturnType<typeof useReview> }) {
  const [round, setRound] = useState(initial?.interviewRound?.toString() || '');
  const [questions, setQuestions] = useState(initial?.questions || '');
  const [selfEval, setSelfEval] = useState<number>(initial?.selfEvaluation || 0);
  const [rejectReasons, setRejectReasons] = useState<string[]>(initial?.rejectReasons || []);
  const [hrFeedback, setHrFeedback] = useState(initial?.hrFeedback || '');
  const [summary, setSummary] = useState(initial?.summary || '');
  const [saved, setSaved] = useState(false);

  const REASONS = ['学历不符', '经验不足', '技能不匹配', '薪资期望', '方向不符', '表达问题', '其他'];

  const handleSave = () => {
    saveReview(applicationId, {
      interviewRound: round ? Number(round) : undefined,
      questions: questions || undefined,
      selfEvaluation: selfEval || undefined,
      rejectReasons: rejectReasons.length ? rejectReasons : undefined,
      hrFeedback: hrFeedback || undefined,
      summary: summary || undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleReason = (r: string) => {
    setRejectReasons((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-gray-500" />岗位复盘
      </h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">面试轮次</label>
            <input type="number" value={round} onChange={(e) => setRound(e.target.value)} placeholder="如：1" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">自评表现</label>
            <select value={selfEval} onChange={(e) => setSelfEval(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value={0}>未评价</option>
              <option value={1}>很好</option>
              <option value={2}>一般</option>
              <option value={3}>不好</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">被拒原因（可多选）</label>
          <div className="flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <button
                key={r}
                onClick={() => toggleReason(r)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs border transition-colors',
                  rejectReasons.includes(r) ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-200'
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">考察问题</label>
          <textarea value={questions} onChange={(e) => setQuestions(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" placeholder="记录面试中被问到的问题" />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">HR 反馈</label>
          <textarea value={hrFeedback} onChange={(e) => setHrFeedback(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" placeholder="官方或 HR 告知的原因" />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">复盘总结</label>
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" placeholder="自由反思本次经历" />
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleSave} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">保存复盘</button>
          {saved && <span className="text-sm text-green-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />已保存</span>}
        </div>
      </div>
    </div>
  );
}
