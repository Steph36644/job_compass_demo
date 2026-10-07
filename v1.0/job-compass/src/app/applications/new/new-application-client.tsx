'use client';

import { useRef, useState, type ClipboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, FileText, Loader2, AlertCircle, ChevronLeft, Zap } from 'lucide-react';
import Link from 'next/link';
import { parseJd } from '@/lib/mock-ai';
import { ApplicationForm } from '@/components/applications/ApplicationForm';
import { imageFromClipboardData, JdScreenshotOcr } from '@/components/applications/JdScreenshotOcr';
import { type StructuredJd } from '@/lib/types';
import { cn } from '@/lib/utils';

export type NewApplicationMode = 'quick' | 'parse' | 'manual';

export function NewApplicationClient({ initialMode }: { initialMode: NewApplicationMode }) {
  const router = useRouter();
  const [mode, setMode] = useState<NewApplicationMode>(initialMode);
  const onSaved = (id: string) => router.push(`/applications/${id}`);

  const subtitle = {
    quick: '只需公司和岗位。JD 可以稍后粘贴，或用截图识别。',
    parse: '粘贴岗位 JD，或上传截图识别后再解析。',
    manual: '自行填写投递信息。JD 可以留空，之后再补。',
  }[mode];

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ChevronLeft className="w-4 h-4" /> 返回看板
      </Link>

      <h1 className="text-xl font-bold text-gray-900 mb-1">新建投递</h1>
      <p className="text-sm text-gray-500 mb-5">{subtitle}</p>

      <div className="flex flex-wrap gap-2 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
        <ModeTab active={mode === 'quick'} onClick={() => setMode('quick')}>
          <Zap className="w-3.5 h-3.5 inline mr-1" />快速录入
        </ModeTab>
        <ModeTab active={mode === 'parse'} onClick={() => setMode('parse')}>
          <Sparkles className="w-3.5 h-3.5 inline mr-1" />AI 解析 JD
        </ModeTab>
        <ModeTab active={mode === 'manual'} onClick={() => setMode('manual')}>
          <FileText className="w-3.5 h-3.5 inline mr-1" />手动填写
        </ModeTab>
      </div>

      {mode === 'quick' && <ApplicationForm mode="create" variant="quick" onSaved={onSaved} />}
      {mode === 'parse' && <JdParseForm onSaved={onSaved} onQuick={() => setMode('quick')} />}
      {mode === 'manual' && <ApplicationForm mode="create" onSaved={onSaved} />}
    </div>
  );
}

function ModeTab({
  active, onClick, children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
        active ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500',
      )}
    >
      {children}
    </button>
  );
}

function JdParseForm({ onSaved, onQuick }: { onSaved: (id: string) => void; onQuick: () => void }) {
  const [jdText, setJdText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<StructuredJd | null>(null);
  const [error, setError] = useState('');
  const [screenshot, setScreenshot] = useState<Blob | null>(null);
  const ocrRecognizeRef = useRef<((file: Blob) => void) | null>(null);

  const handleParse = async (text = jdText) => {
    if (!text.trim()) return;
    setParsing(true);
    setError('');
    try {
      const result = await parseJd(text);
      setParsed(result);
    } catch {
      setError('解析失败，请重试或切换到手动填写');
    } finally {
      setParsing(false);
    }
  };

  const handleRecognized = async (text: string, image: Blob) => {
    setJdText(text);
    setScreenshot(image);
    setError('');
    setParsing(true);
    try {
      setParsed(await parseJd(text));
    } catch {
      setError('已识别出文字，但结构化失败。可以再点一次「AI 智能解析」，或切换到手动填写。');
    } finally {
      setParsing(false);
    }
  };

  const onPasteImage = (event: ClipboardEvent<HTMLDivElement>) => {
    const file = imageFromClipboardData(event.clipboardData);
    if (!file || !ocrRecognizeRef.current) return;
    event.preventDefault();
    ocrRecognizeRef.current(file);
  };

  if (!parsed) {
    return (
      <div className="space-y-4" onPaste={onPasteImage}>
        <JdScreenshotOcr
          recognizeRef={ocrRecognizeRef}
          reusableImage={screenshot}
          disabled={parsing}
          onRecognized={handleRecognized}
        />
        <textarea
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          placeholder="粘贴岗位 JD 文本到这里，或用上面的截图识别...&#10;&#10;例如：&#10;字节跳动 产品经理实习生&#10;工作地点：北京&#10;岗位职责：1. ...&#10;任职要求：1. ..."
          className="w-full h-72 p-4 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4" />{error}
          </div>
        )}
        <button
          type="button"
          onClick={() => void handleParse()}
          disabled={!jdText.trim() || parsing}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {parsing ? (
            <><Loader2 className="w-4 h-4 animate-spin" />处理中...</>
          ) : (
            <><Sparkles className="w-4 h-4" />AI 智能解析</>
          )}
        </button>
        <button type="button" onClick={onQuick} className="text-sm text-gray-500 hover:text-blue-600">
          复制不了全文？改用快速录入，只填公司和岗位
        </button>
      </div>
    );
  }

  return (
    <ApplicationForm
      mode="create"
      initialCompany={parsed.company}
      initialPosition={parsed.position}
      initialCities={parsed.cities}
      initialSalary={parsed.salary}
      jdRaw={jdText}
      jdStructured={parsed}
      initialScreenshot={screenshot}
      onSaved={onSaved}
      onBack={() => setParsed(null)}
    />
  );
}
