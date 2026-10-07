'use client';

import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { downloadResumeSource } from '@/lib/resume-files';
import type { ResumeParseStatus, ResumeSourceFile } from '@/lib/types';
import { formatFileSize } from '@/lib/utils';

const STATUS_LABEL: Record<ResumeParseStatus, string> = {
  success: '已解析',
  partial: '部分解析',
  error: '解析失败',
};

const STATUS_CLASS: Record<ResumeParseStatus, string> = {
  success: 'bg-green-50 text-green-700',
  partial: 'bg-amber-50 text-amber-700',
  error: 'bg-red-50 text-red-600',
};

export function ResumeSourceBar({
  source,
  status,
  message,
}: {
  source?: ResumeSourceFile;
  status?: ResumeParseStatus;
  message?: string;
}) {
  if (!source && !message) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 mb-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {source && (
            <div className="flex items-center gap-2 flex-wrap">
              <FileText className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="text-sm text-gray-800 truncate max-w-[16rem]">{source.fileName}</span>
              <span className="text-xs text-gray-400">{source.kind === 'pdf' ? 'PDF' : 'Word'} · {formatFileSize(source.size)}</span>
              {status && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>
              )}
            </div>
          )}
          {message && <p className="text-xs text-gray-600 mt-1 leading-relaxed">{message}</p>}
        </div>
        {source && <DownloadResumeButton source={source} />}
      </div>
    </div>
  );
}

export function DownloadResumeButton({ source }: { source: ResumeSourceFile }) {
  const [hint, setHint] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="shrink-0 text-right">
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setHint(null);
          setHint(await downloadResumeSource(source));
          setPending(false);
        }}
        className="px-2 py-1 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded inline-flex items-center gap-1 disabled:opacity-50"
      >
        <Download className="w-3.5 h-3.5" />{pending ? '准备下载…' : '下载原件'}
      </button>
      {hint && <p className="text-[11px] text-red-500 mt-1 max-w-[14rem]">{hint}</p>}
    </div>
  );
}
