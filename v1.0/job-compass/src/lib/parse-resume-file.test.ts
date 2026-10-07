import assert from 'node:assert/strict';
import test from 'node:test';
import JSZip from 'jszip';
import { RESUME_FILE_COPY } from './resume-file-kind';
import { ResumeFileReject, parseResumeFile } from './parse-resume-file';

test('docx 能抽出文字并填入栏目', async () => {
  const file = new File([await sampleDocx()], '张三-产品.pdf.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const parsed = await parseResumeFile(file);
  assert.equal(parsed.kind, 'docx');
  assert.equal(parsed.suggestedName, '张三-产品.pdf');
  assert.match(parsed.text, /北京大学/);
  assert.equal(parsed.structured.contact?.name, '张三');
  assert.equal(parsed.structured.education?.[0].school, '北京大学');
  assert.equal(parsed.status, 'success');
});

test('带文字层的 PDF 能抽出文字', async () => {
  const file = new File([pdfWithText('Hello PDF resume')], 'hello.pdf', { type: 'application/pdf' });
  const parsed = await parseResumeFile(file);
  assert.equal(parsed.kind, 'pdf');
  assert.match(parsed.text, /Hello PDF resume/);
  assert.equal(parsed.status, 'partial');
});

test('没有文字层的 PDF 用中文说明可能是扫描件', async () => {
  const file = new File([pdfWithText('')], 'scan.pdf', { type: 'application/pdf' });
  const parsed = await parseResumeFile(file);
  assert.equal(parsed.status, 'error');
  assert.match(parsed.message, /扫描件/);
});

test('旧版 doc 和损坏的 PDF 会拒绝或说明原因', async () => {
  const ole = Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 1, 2, 3, 4]);
  await assert.rejects(
    () => parseResumeFile(new File([ole], '简历.doc', { type: 'application/msword' })),
    (error: unknown) => error instanceof ResumeFileReject && error.message === RESUME_FILE_COPY.unsupportedDoc,
  );

  const broken = new TextEncoder().encode('%PDF-1.7\nthis is not a pdf');
  await assert.rejects(
    () => parseResumeFile(new File([broken], '坏.pdf', { type: 'application/pdf' })),
    (error: unknown) => error instanceof Error && error.message === RESUME_FILE_COPY.corruptPdf,
  );
});

async function sampleDocx(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  zip.folder('_rels')?.file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  const paragraphs = [
    '张三',
    '电话：13800138000',
    '邮箱：zhangsan@example.com',
    '教育背景',
    '北京大学 | 计算机科学与技术 | 本科 | 2020.09 - 2024.06',
    '工作经历',
    '字节跳动 | 产品实习生 | 2024.06 - 2024.09',
    '- 负责需求分析并推动上线',
    '专业技能',
    'Axure、Figma、SQL',
  ];
  const body = paragraphs.map((line) => `<w:p><w:r><w:t xml:space="preserve">${line}</w:t></w:r></w:p>`).join('');
  zip.folder('word')?.file('document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`);
  const bytes = await zip.generateAsync({ type: 'uint8array' });
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function pdfWithText(text: string): ArrayBuffer {
  const stream = text
    ? `BT /F1 24 Tf 72 720 Td (${escapePdfText(text)}) Tj ET`
    : 'BT ET';
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
    '2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj\n',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n',
    `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream\nendobj\n`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n',
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(body.length);
    body += object;
  }
  const xref = body.length;
  let table = `xref\n0 6\n0000000000 65535 f \n`;
  for (let index = 1; index <= 5; index++) {
    table += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  body += `${table}trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const encoded = new TextEncoder().encode(body);
  return encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength) as ArrayBuffer;
}

function escapePdfText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}
