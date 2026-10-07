import assert from 'node:assert/strict';
import test from 'node:test';
import { RESUME_FILE_COPY, inspectResumeUpload } from './resume-file-kind';

test('按文件头识别 pdf 和 docx，不轻信后缀', () => {
  const pdf = inspectResumeUpload('简历.doc', 8, Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]));
  assert.equal(pdf.ok, true);
  if (pdf.ok) assert.equal(pdf.kind, 'pdf');

  const marker = new TextEncoder().encode('word/document.xml');
  const docx = new Uint8Array(4 + marker.length);
  docx.set([0x50, 0x4b, 0x03, 0x04]);
  docx.set(marker, 4);
  const asDoc = inspectResumeUpload('旧简历.doc', docx.length, docx);
  assert.equal(asDoc.ok, true);
  if (asDoc.ok) assert.equal(asDoc.kind, 'docx');
});

test('旧版 .doc 和无法识别的文件给出中文原因', () => {
  const ole = Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]);
  const doc = inspectResumeUpload('简历.doc', ole.length, ole);
  assert.equal(doc.ok, false);
  if (!doc.ok) assert.equal(doc.message, RESUME_FILE_COPY.unsupportedDoc);

  const text = new TextEncoder().encode('hello resume');
  const plain = inspectResumeUpload('简历.txt', text.length, text);
  assert.equal(plain.ok, false);
  if (!plain.ok) assert.equal(plain.message, RESUME_FILE_COPY.unsupportedType);
});

test('空文件和超大文件在读正文前就被拒绝', () => {
  const empty = inspectResumeUpload('a.pdf', 0, new Uint8Array());
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.equal(empty.message, RESUME_FILE_COPY.empty);

  const huge = inspectResumeUpload('a.pdf', 21 * 1024 * 1024, new Uint8Array([0x25, 0x50, 0x44, 0x46]));
  assert.equal(huge.ok, false);
  if (!huge.ok) assert.equal(huge.message, RESUME_FILE_COPY.tooLarge);
});
