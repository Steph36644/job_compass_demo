// 浏览器本地 OCR（tesseract.js）。语言包与 wasm 首次从 jsDelivr 下载并缓存在 IndexedDB，
// 识别过程不上传图片，也不调用付费云 OCR。

const MIN_OCR_CHARS = 6;
const MIN_CONFIDENCE_IF_SHORT = 25;
const SHORT_TEXT_CHARS = 24;

export class OcrEmptyError extends Error {
  constructor() {
    super('EMPTY_OCR');
    this.name = 'OcrEmptyError';
  }
}

export class OcrEngineError extends Error {
  constructor() {
    super('ENGINE');
    this.name = 'OcrEngineError';
  }
}

export interface OcrProgress {
  status: string;
  progress: number;
  label: string;
}

export function normalizeOcrText(raw: string): string {
  const cleaned = raw
    .replace(/\u000c/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  // Tesseract 会在汉字之间插入空格。去掉这些空格后，现有 JD 解析和阅读都更接近原文。
  return cleaned
    .replace(/([\u4e00-\u9fff])[ \t]+(?=[\u4e00-\u9fff])/g, '$1')
    .replace(/([\u4e00-\u9fff])[ \t]*([:：;；,，。])[ \t]*/g, '$1$2')
    .replace(/([:：;；,，。])[ \t]+(?=[\u4e00-\u9fff])/g, '$1');
}

export function isUsefulOcrText(text: string): boolean {
  return text.replace(/\s+/g, '').length >= MIN_OCR_CHARS;
}

export function ocrStatusLabel(status: string): string {
  switch (status) {
    case 'loading tesseract core':
      return '正在加载识别引擎';
    case 'initializing tesseract':
      return '正在初始化识别引擎';
    case 'loading language traineddata':
      return '正在加载中英文语言包（首次需要联网）';
    case 'initializing api':
      return '正在准备识别';
    case 'recognizing text':
      return '正在识别文字';
    default:
      return '正在处理';
  }
}

type TessWorker = {
  recognize: (
    image: Blob,
    options?: object,
    output?: { text?: boolean },
  ) => Promise<{ data: { text?: string; confidence?: number } }>;
  setParameters: (params: Record<string, string>) => Promise<unknown>;
  terminate: () => Promise<unknown>;
};

type CreateWorker = (
  langs?: string,
  oem?: number,
  options?: {
    logger?: (message: { status: string; progress: number }) => void;
  },
) => Promise<TessWorker>;

let workerPromise: Promise<TessWorker> | null = null;
let reportProgress: (status: string, progress: number) => void = () => {};
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function loadCreateWorker(): Promise<CreateWorker> {
  const mod = await import('tesseract.js');
  const createWorker =
    mod.createWorker ??
    (mod as unknown as { default?: { createWorker?: CreateWorker } }).default?.createWorker;
  if (!createWorker) throw new OcrEngineError();
  return createWorker;
}

async function getWorker(): Promise<TessWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const createWorker = await loadCreateWorker();
      // OEM.LSTM_ONLY = 1，中英混排截图走 LSTM 即可。
      return createWorker('chi_sim+eng', 1, {
        logger: (message) => reportProgress(message.status, message.progress ?? 0),
      });
    })().catch((error: unknown) => {
      workerPromise = null;
      throw error;
    });
  }
  return workerPromise;
}

async function resetWorker(): Promise<void> {
  const pending = workerPromise;
  workerPromise = null;
  if (!pending) return;
  try {
    const worker = await pending;
    await worker.terminate();
  } catch {
    // 引擎已经不可用，下次识别会重新创建
  }
}

/** 缩小大图、适度放大过小截图，并铺白底，减轻 OCR 耗时和透明底干扰。 */
export async function prepareJdImage(file: Blob): Promise<Blob> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;
  const bitmap = await createImageBitmap(file);
  try {
    const longEdge = Math.max(bitmap.width, bitmap.height);
    if (!longEdge) return file;
    let scale = 1;
    if (longEdge > 2000) scale = 2000 / longEdge;
    else if (longEdge < 1200) scale = Math.min(1200 / longEdge, 2.5);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.92);
    });
    return blob ?? file;
  } finally {
    bitmap.close();
  }
}

export async function recognizeJdImage(
  image: Blob,
  onProgress?: (progress: OcrProgress) => void,
): Promise<string> {
  if (typeof window === 'undefined') throw new OcrEngineError();

  return enqueue(async () => {
    reportProgress = (status, progress) => {
      onProgress?.({
        status,
        progress: Number.isFinite(progress) ? progress : 0,
        label: ocrStatusLabel(status),
      });
    };
    try {
      const worker = await getWorker();
      await worker.setParameters({ preserve_interword_spaces: '1' });
      const result = await worker.recognize(image, {}, { text: true });
      const text = normalizeOcrText(result.data.text ?? '');
      const confidence = result.data.confidence ?? -1;
      const compactLength = text.replace(/\s+/g, '').length;
      const lowConfidenceShort =
        confidence >= 0 && confidence < MIN_CONFIDENCE_IF_SHORT && compactLength < SHORT_TEXT_CHARS;
      if (!isUsefulOcrText(text) || lowConfidenceShort) throw new OcrEmptyError();
      return text;
    } catch (error) {
      if (error instanceof OcrEmptyError) throw error;
      await resetWorker();
      throw new OcrEngineError();
    } finally {
      reportProgress = () => {};
    }
  });
}
