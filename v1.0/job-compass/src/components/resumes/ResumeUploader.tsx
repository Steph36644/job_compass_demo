'use client';

import { useRef, useState } from 'react';
import { AlertCircle, Loader2, Upload } from 'lucide-react';
import { addResume } from '@/lib/store';
import { useResumes } from '@/lib/use-store';
import { deleteResumeBlob, putResumeBlob } from '@/lib/resume-files';
import { inspectResumeUpload } from '@/lib/resume-file-kind';
import { ResumeFileReject, parseResumeFile } from '@/lib/parse-resume-file';
import { resumeNameFromFile } from '@/lib/resume-structure';
import { uid } from '@/lib/utils';
import type { ResumeFileKind, ResumeSourceFile } from '@/lib/types';

type Phase = 'idle' | 'reading' | 'saving' | 'parsing';

const PHASE_LABEL: Record<Exclude<Phase, 'idle'>, string> = {
  reading: '正在读取文件…',
  saving: '正在把原件保存到本机…',
  parsing: '正在提取文字并识别栏目…',
};

export function ResumeUploader({
  onCreated,
  onClose,
}: {
  onCreated: (id: string) => void;
  onClose: () => void;
}) {
  const resumes = useResumes();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = phase !== 'idle';

  const takeFile = (list: FileList | null) => {
    const files = list ? Array.from(list) : [];
    if (inputRef.current) inputRef.current.value = '';
    if (files.length === 0 || busy) return;
    if (files.length > 1) {
      setError('一次请只上传一份简历。');
      return;
    }
    void ingest(files[0]);
  };

  const ingest = async (file: File) => {
    setError(null);
    setPhase('reading');
    let fileId: string | null = null;
    let accepted: { kind: ResumeFileKind; mimeType: string } | null = null;
    let created = false;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const inspected = inspectResumeUpload(file.name, file.size, bytes);
      if (!inspected.ok) {
        setError(inspected.message);
        return;
      }
      accepted = inspected;
      setPhase('saving');
      fileId = uid();
      await putResumeBlob(fileId, file);
      setPhase('parsing');
      const parsed = await parseResumeFile(file);
      const resume = addResume({
        name: parsed.suggestedName,
        isPrimary: resumes.length === 0,
        structured: parsed.structured,
        originalText: parsed.text,
        sourceFile: sourceOf(fileId, file, parsed.kind, parsed.mimeType),
        parseStatus: parsed.status,
        parseMessage: parsed.message,
      });
      created = true;
      onCreated(resume.id);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '解析失败，请换一份文件再试。';
      if (fileId && accepted && !(caught instanceof ResumeFileReject)) {
        const resume = addResume({
          name: resumeNameFromFile(file.name),
          isPrimary: resumes.length === 0,
          structured: {},
          originalText: '',
          sourceFile: sourceOf(fileId, file, accepted.kind, accepted.mimeType),
          parseStatus: 'error',
          parseMessage: message,
        });
        created = true;
        onCreated(resume.id);
        return;
      }
      if (fileId) void deleteResumeBlob(fileId);
      setError(message);
    } finally {
      if (!created) setPhase('idle');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">上传 Word / PDF</h3>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            支持 .docx 和带文字层的 PDF。旧版 .doc 请先另存为 .docx。扫描版 PDF 没有文字，无法识别。文件只保存在这台浏览器里，不会上传到服务器。
          </p>
        </div>
        <button type="button" onClick={onClose} disabled={busy} className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40">关闭</button>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          takeFile(event.dataTransfer.files);
        }}
        className={`rounded-xl border border-dashed px-4 py-8 text-center transition-colors ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".doc,.docx,.pdf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(event) => takeFile(event.target.files)}
        />
        {busy ? (
          <div className="flex items-center justify-center gap-2 text-sm text-blue-700">
            <Loader2 className="w-4 h-4 animate-spin" />
            {PHASE_LABEL[phase]}
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-600">把文件拖到这里，或选择一份简历</p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              选择文件
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

function sourceOf(fileId: string, file: File, kind: ResumeFileKind, mimeType: string): ResumeSourceFile {
  return {
    fileId,
    fileName: file.name,
    mimeType,
    size: file.size,
    kind,
    uploadedAt: new Date().toISOString(),
  };
}
