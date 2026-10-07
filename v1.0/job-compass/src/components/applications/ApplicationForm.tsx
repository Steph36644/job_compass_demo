'use client';

import { useEffect, useRef, useState, type ClipboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import {
  addApplication, updateApplication, findDuplicate, markMatchReportOutdated,
} from '@/lib/store';
import { loadJdScreenshot, saveJdScreenshot } from '@/lib/jd-image-store';
import { useResumes } from '@/lib/use-store';
import { parseJd } from '@/lib/mock-ai';
import { APPLICATION_CHANNELS, ApplicationStatus, type Application, type StructuredJd } from '@/lib/types';
import { cn } from '@/lib/utils';
import { imageFromClipboardData, JdScreenshotOcr } from './JdScreenshotOcr';

const QUICK_CHANNEL_FIRST = new Set<string>(['Boss直聘', '猎聘', '其他']);
const QUICK_CHANNELS = [
  'Boss直聘',
  '猎聘',
  '其他',
  ...APPLICATION_CHANNELS.filter((channel) => !QUICK_CHANNEL_FIRST.has(channel)),
];

interface StructuredSnapshot {
  text: string;
  data: StructuredJd;
  fresh: boolean;
}

interface ApplicationFormProps {
  mode: 'create' | 'edit';
  variant?: 'full' | 'quick';
  initial?: Application;
  initialCompany?: string;
  initialPosition?: string;
  initialCities?: string[];
  initialSalary?: string;
  jdRaw?: string;
  jdStructured?: StructuredJd;
  /** 本次会话里已经识别过的截图，保存时写入 IndexedDB。 */
  initialScreenshot?: Blob | null;
  onSaved: (id: string) => void;
  onBack?: () => void;
}

export function ApplicationForm({
  mode, variant = 'full', initial, initialCompany, initialPosition, initialCities, initialSalary,
  jdRaw = '', jdStructured, initialScreenshot = null, onSaved, onBack,
}: ApplicationFormProps) {
  const isQuick = variant === 'quick';
  const router = useRouter();
  const resumes = useResumes();
  const seededText = initial?.jdRaw ?? jdRaw;
  const seededStructured = jdStructured ?? initial?.jdStructured;
  const [company, setCompany] = useState(initial?.company ?? initialCompany ?? '');
  const [position, setPosition] = useState(initial?.position ?? initialPosition ?? '');
  const [channel, setChannel] = useState(initial?.channel ?? (isQuick ? '其他' : '官网'));
  const [applyDate, setApplyDate] = useState(initial?.applyDate ?? new Date().toISOString().slice(0, 10));
  const [cities, setCities] = useState(initial?.cities?.join('、') ?? initialCities?.join('、') ?? '');
  const [salary, setSalary] = useState(initial?.salary ?? initialSalary ?? '');
  const [jobUrl, setJobUrl] = useState(initial?.jobUrl ?? '');
  const [referrer, setReferrer] = useState(initial?.referrer ?? '');
  const [resumeId, setResumeId] = useState<string | null>(mode === 'edit' ? (initial?.resumeId ?? '') : null);
  const resolvedResumeId =
    resumeId ?? resumes.find((r) => r.isPrimary)?.id ?? resumes[0]?.id ?? '';
  const [remark, setRemark] = useState(initial?.remark ?? '');
  const [jd, setJd] = useState(seededText);
  const [structuredSnapshot, setStructuredSnapshot] = useState<StructuredSnapshot | null>(
    seededStructured ? { text: seededText, data: seededStructured, fresh: Boolean(jdStructured) } : null,
  );
  const [saving, setSaving] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [structureNote, setStructureNote] = useState('');
  const [saveError, setSaveError] = useState('');
  const [dup, setDup] = useState<Application | null>(null);
  const [reusableImage, setReusableImage] = useState<Blob | null>(initialScreenshot);
  const pendingImageRef = useRef<Blob | null>(initialScreenshot);
  const imageDirtyRef = useRef(Boolean(initialScreenshot));
  const ocrRecognizeRef = useRef<((file: Blob) => void) | null>(null);
  const channels = isQuick ? QUICK_CHANNELS : APPLICATION_CHANNELS;

  useEffect(() => {
    if (mode !== 'edit' || !initial?.id || initialScreenshot) return;
    let cancelled = false;
    loadJdScreenshot(initial.id)
      .then((blob) => {
        if (!cancelled && blob) setReusableImage(blob);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [mode, initial?.id, initialScreenshot]);

  const activeStructured =
    structuredSnapshot && structuredSnapshot.fresh && structuredSnapshot.text.trim() === jd.trim()
      ? structuredSnapshot.data
      : undefined;

  const structuredForSave = (jdValue: string): StructuredJd | undefined => {
    if (!jdValue || !structuredSnapshot) return undefined;
    return structuredSnapshot.text.trim() === jdValue ? structuredSnapshot.data : undefined;
  };

  const handleRecognized = async (text: string, image: Blob) => {
    pendingImageRef.current = image;
    imageDirtyRef.current = true;
    setReusableImage(image);
    setJd(text);
    setStructureNote('');
    try {
      const parsed = await parseJd(text);
      setStructuredSnapshot({ text, data: parsed, fresh: true });
      setCompany((current) => (
        current.trim() || !parsed.company || parsed.company === '未知公司' ? current : parsed.company
      ));
      setPosition((current) => (
        current.trim() || !parsed.position || parsed.position === '未知岗位' ? current : parsed.position
      ));
      setCities((current) => (current.trim() || !parsed.cities?.length ? current : parsed.cities.join('、')));
      setSalary((current) => (current.trim() || !parsed.salary ? current : parsed.salary));
    } catch {
      setStructureNote('文字已填入 JD，自动结构化未完成，仍可直接保存。');
    }
  };

  const persistScreenshot = async (applicationId: string) => {
    if (!imageDirtyRef.current || !pendingImageRef.current) return;
    try {
      await saveJdScreenshot(applicationId, pendingImageRef.current);
    } catch {
      // 截图没写进 IndexedDB 时，JD 文本仍然保留在投递记录里
    }
  };

  const handleSave = async (skipDupCheck = false) => {
    if (!company.trim() || !position.trim() || saving || ocrBusy) return;
    if (mode === 'create' && !skipDupCheck) {
      const found = findDuplicate(company, position);
      if (found) {
        setDup(found);
        return;
      }
    }
    setSaving(true);
    setSaveError('');
    const jdValue = jd.trim();
    const cityList = cities ? cities.split(/[、,，\s]+/).filter(Boolean) : undefined;

    try {
      if (mode === 'edit' && initial) {
        const prevJd = initial.jdRaw.trim();
        if (jdValue !== prevJd) markMatchReportOutdated(initial.id);
        updateApplication(initial.id, {
          company: company.trim(),
          position: position.trim(),
          channel,
          applyDate,
          cities: cityList,
          salary: salary.trim() || undefined,
          jobUrl: jobUrl.trim() || undefined,
          referrer: referrer.trim() || undefined,
          jdRaw: jdValue,
          jdStructured: structuredForSave(jdValue),
          resumeId: resolvedResumeId || undefined,
          remark: remark.trim() || undefined,
        });
        await persistScreenshot(initial.id);
        onSaved(initial.id);
        return;
      }

      const app = addApplication({
        company: company.trim(),
        position: position.trim(),
        channel,
        applyDate,
        cities: cityList,
        salary: salary.trim() || undefined,
        jobUrl: jobUrl.trim() || undefined,
        referrer: referrer.trim() || undefined,
        jdRaw: jdValue,
        jdStructured: structuredForSave(jdValue),
        resumeId: resolvedResumeId || undefined,
        status: ApplicationStatus.PENDING,
        remark: remark.trim() || undefined,
      });
      await persistScreenshot(app.id);
      onSaved(app.id);
    } catch {
      setSaveError('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const onPasteImage = (event: ClipboardEvent<HTMLDivElement>) => {
    const file = imageFromClipboardData(event.clipboardData);
    if (!file || !ocrRecognizeRef.current) return;
    event.preventDefault();
    ocrRecognizeRef.current(file);
  };

  return (
    <div className="space-y-4" onPaste={onPasteImage}>
      {isQuick && (
        <p className="text-sm text-gray-500">
          先记下公司和岗位就能进看板。手机 App 里复制不了 JD 时，用截图识别，或之后再补。
        </p>
      )}

      {activeStructured && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700">
          <Sparkles className="w-4 h-4 inline mr-1" />
          已根据 JD 解析以下字段，请核对后保存。已经填过的公司、岗位、地点和薪资不会被覆盖。
        </div>
      )}

      <Field label="公司名称" required>
        <input value={company} onChange={(e) => setCompany(e.target.value)} className={inputCls} placeholder="如：字节跳动" />
      </Field>

      <Field label="岗位名称" required>
        <input value={position} onChange={(e) => setPosition(e.target.value)} className={inputCls} placeholder="如：产品经理实习生" />
      </Field>

      {isQuick ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="工作地点">
              <input value={cities} onChange={(e) => setCities(e.target.value)} className={inputCls} placeholder="如：北京" />
            </Field>
            <Field label="薪资备注">
              <input value={salary} onChange={(e) => setSalary(e.target.value)} className={inputCls} placeholder="如：20-30K / 面议" />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="来源">
              <select value={channel} onChange={(e) => setChannel(e.target.value)} className={inputCls}>
                {channels.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="岗位链接">
              <input value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} className={inputCls} placeholder="https://..." />
            </Field>
          </div>
          <Field label="一句话备注">
            <input value={remark} onChange={(e) => setRemark(e.target.value)} className={inputCls} placeholder="如：内推优先，下周三截止" />
          </Field>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Field label="投递渠道">
              <select value={channel} onChange={(e) => setChannel(e.target.value)} className={inputCls}>
                {channels.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="投递日期">
              <input type="date" value={applyDate} onChange={(e) => setApplyDate(e.target.value)} className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="工作城市">
              <input value={cities} onChange={(e) => setCities(e.target.value)} className={inputCls} placeholder="北京、上海" />
            </Field>
            <Field label="薪资范围">
              <input value={salary} onChange={(e) => setSalary(e.target.value)} className={inputCls} placeholder="250-400/天" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="岗位链接">
              <input value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} className={inputCls} placeholder="https://..." />
            </Field>
            <Field label="内推人">
              <input value={referrer} onChange={(e) => setReferrer(e.target.value)} className={inputCls} placeholder="如：张三（可选）" />
            </Field>
          </div>

          <Field label="关联简历版本">
            <select value={resolvedResumeId} onChange={(e) => setResumeId(e.target.value)} className={inputCls}>
              <option value="">不关联</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>{r.name}{r.isPrimary ? '（主）' : ''}</option>
              ))}
            </select>
          </Field>
        </>
      )}

      <Field label={isQuick ? 'JD 原文（选填）' : 'JD 原文'}>
        <p className="text-xs text-gray-400 mb-2">
          可以粘贴原文，也可以上传或粘贴 JD 截图。识别在浏览器本地完成，图片不会上传。
        </p>
        <JdScreenshotOcr
          recognizeRef={ocrRecognizeRef}
          reusableImage={reusableImage}
          disabled={saving}
          onBusyChange={setOcrBusy}
          onRecognized={handleRecognized}
        />
        <textarea
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          className={cn(inputCls, 'h-40 resize-none mt-3')}
          placeholder={isQuick ? '留空也能先建档，之后再补 JD' : '粘贴岗位 JD 原文。没有也可以先保存'}
        />
        {structureNote && <p className="text-xs text-amber-700 mt-2">{structureNote}</p>}
      </Field>

      {activeStructured?.hardRequirements && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500 mb-2">提取的任职要求（供参考）</p>
          <ul className="space-y-1">
            {activeStructured.hardRequirements.slice(0, 5).map((item, index) => (
              <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>{item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isQuick && (
        <Field label="备注">
          <textarea value={remark} onChange={(e) => setRemark(e.target.value)} className={cn(inputCls, 'h-20 resize-none')} placeholder="特殊注意事项等" />
        </Field>
      )}

      {dup && (
        <div className="flex items-start gap-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 px-3 py-2.5 rounded-lg">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p>该岗位（{company} - {position}）已建档，是否仍要新建？</p>
            <div className="flex gap-2 mt-2">
              <button type="button" onClick={() => setDup(null)} className="px-3 py-1 bg-white border border-gray-200 rounded text-xs">取消</button>
              <button type="button" onClick={() => router.push(`/applications/${dup.id}`)} className="px-3 py-1 bg-white border border-orange-300 text-orange-600 rounded text-xs">去查看</button>
              <button type="button" onClick={() => void handleSave(true)} className="px-3 py-1 bg-orange-500 text-white rounded text-xs">仍要新建</button>
            </div>
          </div>
        </div>
      )}

      {saveError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4" />{saveError}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {onBack && (
          <button type="button" onClick={onBack} className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-sm">
            {mode === 'edit' ? '取消' : '重新解析'}
          </button>
        )}
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!company.trim() || !position.trim() || saving || ocrBusy}
          className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" />保存中...</> : mode === 'edit' ? '保存修改' : isQuick ? '保存到看板' : '保存投递'}
        </button>
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
