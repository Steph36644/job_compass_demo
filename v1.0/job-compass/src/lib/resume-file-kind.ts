// 只靠文件名和文件头判断能不能在浏览器里解析，不读取正文。

export const RESUME_FILE_MAX_BYTES = 20 * 1024 * 1024;

export const RESUME_FILE_COPY = {
  unsupportedDoc: '暂不支持旧版 Word（.doc）。请用 Word 或 WPS 另存为 .docx 或 PDF 后再上传。',
  unsupportedType: '只支持 .docx 和 PDF。请先转换格式再上传。',
  empty: '文件是空的，请重新选择一份简历。',
  tooLarge: '文件超过 20MB，请导出更小的 PDF 或 Word 后再上传。',
  corruptPdf: '无法读取这份 PDF，文件可能已损坏。',
  corruptDocx: '无法读取这份 Word。请确认它是有效的 .docx，而不是把 .doc 改了后缀。',
  noTextPdf: '没有提取到文字。这份 PDF 可能是扫描件或纯图片，浏览器读不到文字层。请上传可以选中复制的 PDF，或改用 .docx。',
  noTextDocx: '这份 Word 里没有可提取的文字。',
  passwordPdf: '这份 PDF 有打开密码，浏览器里无法解析。请先取消密码后再上传。',
  saveFailed: '无法把原件保存到浏览器本地存储。请确认没有禁用站点数据。',
  quota: '浏览器存储空间不够，原件没有保存成功。可以删掉一些旧简历后再试。',
  missingBlob: '本地未找到原件，可能已被浏览器清理。',
} as const;

const PDF_MIME = 'application/pdf';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export type ResumeUploadInspection =
  | { ok: true; kind: 'pdf' | 'docx'; mimeType: string }
  | { ok: false; message: string };

export function inspectResumeUpload(fileName: string, size: number, bytes: Uint8Array): ResumeUploadInspection {
  if (!Number.isFinite(size) || size <= 0) return { ok: false, message: RESUME_FILE_COPY.empty };
  if (size > RESUME_FILE_MAX_BYTES) return { ok: false, message: RESUME_FILE_COPY.tooLarge };

  const ext = extensionOf(fileName);
  const kind = sniffKind(bytes);

  if (kind === 'ole') return { ok: false, message: RESUME_FILE_COPY.unsupportedDoc };
  if (kind === 'pdf') return { ok: true, kind: 'pdf', mimeType: PDF_MIME };
  if (kind === 'docx') return { ok: true, kind: 'docx', mimeType: DOCX_MIME };

  if (ext === 'doc') return { ok: false, message: RESUME_FILE_COPY.unsupportedDoc };
  if (ext === 'docx') return { ok: false, message: RESUME_FILE_COPY.corruptDocx };
  if (ext === 'pdf') return { ok: false, message: RESUME_FILE_COPY.corruptPdf };
  return { ok: false, message: RESUME_FILE_COPY.unsupportedType };
}

function extensionOf(fileName: string): string {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? '';
}

function sniffKind(bytes: Uint8Array): 'pdf' | 'docx' | 'ole' | 'unknown' {
  if (bytes.length >= 4 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
    return 'ole';
  }
  if (hasPdfMagic(bytes)) return 'pdf';
  if (hasZipMagic(bytes) && includesAscii(bytes, 'word/document.xml')) return 'docx';
  return 'unknown';
}

function hasPdfMagic(bytes: Uint8Array): boolean {
  const head = bytes.subarray(0, Math.min(bytes.length, 1024));
  for (let i = 0; i <= head.length - 4; i++) {
    if (head[i] === 0x25 && head[i + 1] === 0x50 && head[i + 2] === 0x44 && head[i + 3] === 0x46) return true;
  }
  return false;
}

function hasZipMagic(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && (
    (bytes[2] === 0x03 && bytes[3] === 0x04) ||
    (bytes[2] === 0x05 && bytes[3] === 0x06) ||
    (bytes[2] === 0x07 && bytes[3] === 0x08)
  );
}

function includesAscii(bytes: Uint8Array, needle: string): boolean {
  const pattern = new TextEncoder().encode(needle);
  if (pattern.length === 0 || bytes.length < pattern.length) return false;
  const last = bytes.length - pattern.length;
  for (let i = 0; i <= last; i++) {
    let matched = true;
    for (let j = 0; j < pattern.length; j++) {
      if (bytes[i + j] !== pattern[j]) {
        matched = false;
        break;
      }
    }
    if (matched) return true;
  }
  return false;
}
