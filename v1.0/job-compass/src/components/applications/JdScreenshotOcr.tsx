'use client';

import { useEffect, useId, useRef, useState, type ClipboardEvent, type DragEvent, type MutableRefObject } from 'react';
import { AlertCircle, ClipboardPaste, ImagePlus, Loader2, RotateCcw } from 'lucide-react';
import { OcrEmptyError, OcrEngineError, prepareJdImage, recognizeJdImage, type OcrProgress } from '@/lib/ocr';

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

export function imageFromClipboardData(data: DataTransfer | null): File | null {
  if (!data) return null;
  const item = Array.from(data.items).find((entry) => entry.kind === 'file' && entry.type.startsWith('image/'));
  return item?.getAsFile() ?? null;
}

interface JdScreenshotOcrProps {
  onRecognized: (text: string, image: Blob) => void | Promise<void>;
  onBusyChange?: (busy: boolean) => void;
  /** 父级把识别函数挂出去，方便 JD 文本框里的粘贴走同一条路径。 */
  recognizeRef?: MutableRefObject<((file: Blob) => void) | null>;
  reusableImage?: Blob | null;
  disabled?: boolean;
}

export function JdScreenshotOcr({
  onRecognized,
  onBusyChange,
  recognizeRef,
  reusableImage,
  disabled,
}: JdScreenshotOcrProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const [phase, setPhase] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [error, setError] = useState('');
  const [activeImage, setActiveImage] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const recognize = async (file: Blob) => {
    if (disabled || busyRef.current) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setPhase('error');
      setError('图片超过 12MB，请先裁剪再试。');
      return;
    }
    if (file.type && !file.type.startsWith('image/')) {
      setPhase('error');
      setError('请选择图片文件。');
      return;
    }

    busyRef.current = true;
    onBusyChange?.(true);
    setPhase('running');
    setError('');
    setProgress({ status: 'preparing', progress: 0.08, label: '正在处理图片' });
    setActiveImage(file);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextPreview = URL.createObjectURL(file);
    previewUrlRef.current = nextPreview;
    setPreviewUrl(nextPreview);

    try {
      const prepared = await prepareJdImage(file);
      setActiveImage(prepared);
      const text = await recognizeJdImage(prepared, setProgress);
      setProgress({ status: 'structuring', progress: 1, label: '正在把文字填进 JD' });
      await onRecognized(text, prepared);
      setPhase('done');
      setProgress({ status: 'done', progress: 1, label: '识别完成，请核对文字' });
    } catch (caught) {
      setPhase('error');
      setProgress(null);
      if (caught instanceof OcrEmptyError) {
        setError('没有识别到有效文字。截图可能是纯图片、过小、过糊，或字太小。请换一张更清晰、文字更大的截图，或直接手动输入。');
      } else if (caught instanceof OcrEngineError) {
        setError('识别引擎加载失败。请检查网络后重试。首次使用需要下载中英文语言包；识别在浏览器本地完成，不会上传图片。');
      } else {
        setError('这张图片读不出来，请换成 JPG 或 PNG。');
      }
    } finally {
      busyRef.current = false;
      onBusyChange?.(false);
    }
  };

  const recognizeRefHolder = useRef(recognize);
  useEffect(() => {
    recognizeRefHolder.current = recognize;
  });
  useEffect(() => {
    if (!recognizeRef) return;
    recognizeRef.current = (file: Blob) => {
      void recognizeRefHolder.current(file);
    };
    return () => {
      recognizeRef.current = null;
    };
  }, [recognizeRef]);

  const pasteFromClipboard = async () => {
    if (!navigator.clipboard?.read) {
      setPhase('error');
      setError('当前浏览器不能直接读取剪贴板图片。请在此区域按 Ctrl/⌘+V，或选择文件。');
      return;
    }
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((entry) => entry.startsWith('image/'));
        if (!type) continue;
        await recognize(await item.getType(type));
        return;
      }
      setPhase('error');
      setError('剪贴板里没有图片。请先截图并复制，或改用选择文件。');
    } catch {
      setPhase('error');
      setError('无法读取剪贴板。请允许权限，或在此区域直接粘贴，也可以选择图片文件。');
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const file = imageFromClipboardData(event.clipboardData);
    if (!file) return;
    event.preventDefault();
    event.stopPropagation();
    void recognize(file);
  };

  const percent = Math.round(Math.max(0, Math.min(1, progress?.progress ?? 0)) * 100);

  return (
    <div
      tabIndex={0}
      onPaste={onPaste}
      onDragOver={(event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        const file = event.dataTransfer.files?.[0];
        if (file) void recognize(file);
      }}
      className={`rounded-xl border border-dashed px-3 py-3 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50/80'
      }`}
      aria-label="JD 截图识别"
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || phase === 'running'}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-blue-300 hover:text-blue-600 disabled:opacity-50"
        >
          <ImagePlus className="w-4 h-4" />
          选择截图
        </button>
        <button
          type="button"
          disabled={disabled || phase === 'running'}
          onClick={() => void pasteFromClipboard()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-blue-300 hover:text-blue-600 disabled:opacity-50"
        >
          <ClipboardPaste className="w-4 h-4" />
          粘贴截图
        </button>
        {(activeImage || reusableImage) && (
          <button
            type="button"
            disabled={disabled || phase === 'running'}
            onClick={() => {
              const source = activeImage ?? reusableImage;
              if (source) void recognize(source);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-blue-300 hover:text-blue-600 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重新识别
          </button>
        )}
        <span className="text-xs text-gray-400">也可把图片拖进来，或聚焦后按 Ctrl/⌘+V</span>
      </div>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void recognize(file);
        }}
      />

      {phase === 'running' && progress && (
        <div className="mt-3">
          <div className="flex items-center gap-2 text-xs text-blue-700 mb-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {progress.label}
            {progress.status === 'recognizing text' ? ` ${percent}%` : ''}
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${Math.max(percent, 8)}%` }} />
          </div>
        </div>
      )}

      {phase === 'done' && progress && (
        <p className="mt-3 text-xs text-green-700">{progress.label}。截图里的按钮、导航文字也可以删掉。</p>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {!previewUrl && reusableImage && (
        <p className="mt-3 text-xs text-gray-500">已保存上一张截图，可直接重新识别。</p>
      )}

      {previewUrl && (
        // blob 预览不经过图片优化，避免把本地截图交给 next/image。
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="JD 截图预览"
          className="mt-3 max-h-36 rounded-lg border border-gray-200 bg-white object-contain"
        />
      )}
    </div>
  );
}
