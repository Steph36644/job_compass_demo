// 在浏览器里把 .docx / PDF 抽成纯文本，再做栏目识别。不上传到任何服务器。

import { getDocument, InvalidPDFException, PasswordResponses } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { RESUME_FILE_COPY, inspectResumeUpload } from './resume-file-kind';
import { resumeNameFromFile, structureResumeText, summarizeStructuredParse } from './resume-structure';
import type { ResumeFileKind, ResumeParseStatus, ResumeStructured } from './types';

export class ResumeFileReject extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResumeFileReject';
  }
}

export interface ParsedResumeFile {
  text: string;
  structured: ResumeStructured;
  status: ResumeParseStatus;
  message: string;
  kind: ResumeFileKind;
  mimeType: string;
  suggestedName: string;
}

interface PdfTextItem {
  str?: string;
  hasEOL?: boolean;
}

export async function parseResumeFile(file: File): Promise<ParsedResumeFile> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const inspected = inspectResumeUpload(file.name, file.size, bytes);
  if (!inspected.ok) throw new ResumeFileReject(inspected.message);

  try {
    const text = inspected.kind === 'pdf'
      ? await extractPdfText(bytes)
      : await extractDocxText(bytes);
    const structured = structureResumeText(text);
    const summary = summarizeStructuredParse(text, structured, inspected.kind);
    return {
      text: text.trim(),
      structured,
      status: summary.status,
      message: summary.message,
      kind: inspected.kind,
      mimeType: inspected.mimeType,
      suggestedName: resumeNameFromFile(file.name),
    };
  } catch (error) {
    if (error instanceof ResumeFileReject) throw error;
    console.error('简历解析失败', error);
    throw new Error(inspected.kind === 'pdf' ? pdfFailureMessage(error) : RESUME_FILE_COPY.corruptDocx);
  }
}

async function extractDocxText(bytes: Uint8Array): Promise<string> {
  const loaded = await import('mammoth');
  const mammoth = typeof loaded.extractRawText === 'function' ? loaded : loaded.default;
  if (!mammoth?.extractRawText) throw new Error(RESUME_FILE_COPY.corruptDocx);
  // Node 版认 buffer，浏览器版认 arrayBuffer。两边都带上，当前环境会用自己认识的那个。
  const arrayBuffer = toArrayBuffer(bytes);
  const nodeBuffer = (globalThis as { Buffer?: { from(data: Uint8Array): Buffer } }).Buffer?.from(bytes);
  const input = (nodeBuffer ? { buffer: nodeBuffer, arrayBuffer } : { arrayBuffer }) as Parameters<typeof mammoth.extractRawText>[0];
  const result = await mammoth.extractRawText(input);
  return result.value || '';
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  // 先把 worker 挂到主线程，避免再去拉一份独立的 worker 脚本。
  const worker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
  (globalThis as { pdfjsWorker?: { WorkerMessageHandler: typeof worker.WorkerMessageHandler } }).pdfjsWorker = {
    WorkerMessageHandler: worker.WorkerMessageHandler,
  };
  const task = getDocument({
    data: bytes.slice(),
    isEvalSupported: false,
    disableFontFace: true,
    verbosity: 0,
  });
  try {
    const doc = await task.promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(itemsToText(content.items as PdfTextItem[]));
    }
    await doc.destroy();
    return pages.join('\n\n');
  } catch (error) {
    await task.destroy().catch(() => undefined);
    throw error;
  }
}

function itemsToText(items: PdfTextItem[]): string {
  const lines: string[] = [];
  let line = '';
  for (const item of items) {
    if (!item || typeof item.str !== 'string') continue;
    line += item.str;
    if (item.hasEOL) {
      lines.push(line.trimEnd());
      line = '';
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines.join('\n');
}

function pdfFailureMessage(error: unknown): string {
  const name = (error as { name?: string } | null)?.name ?? '';
  const message = error instanceof Error ? error.message : '';
  if (name === 'PasswordException' || /password/i.test(message) || message.includes(String(PasswordResponses.NEED_PASSWORD))) {
    return RESUME_FILE_COPY.passwordPdf;
  }
  if (name === 'InvalidPDFException' || error instanceof InvalidPDFException) {
    return RESUME_FILE_COPY.corruptPdf;
  }
  return RESUME_FILE_COPY.corruptPdf;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
