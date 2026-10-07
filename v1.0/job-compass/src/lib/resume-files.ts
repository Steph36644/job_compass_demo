// 简历原件可能有几 MB，放不进 localStorage，单独存在 IndexedDB。

import type { ResumeSourceFile } from './types';
import { RESUME_FILE_COPY } from './resume-file-kind';

const DB_NAME = 'job-compass-files';
const DB_VERSION = 1;
const STORE = 'resume-blobs';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error(RESUME_FILE_COPY.saveFailed));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(request.error ?? new Error(RESUME_FILE_COPY.saveFailed));
      };
    });
  }
  return dbPromise;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error(RESUME_FILE_COPY.saveFailed));
  });
}

export async function putResumeBlob(id: string, blob: Blob): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, id);
    await transactionDone(tx);
  } catch (error) {
    const name = (error as { name?: string } | null)?.name;
    if (name === 'QuotaExceededError') throw new Error(RESUME_FILE_COPY.quota);
    if (error instanceof Error && error.message === RESUME_FILE_COPY.saveFailed) throw error;
    throw new Error(RESUME_FILE_COPY.saveFailed);
  }
}

export async function getResumeBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readonly');
    const result = await requestToPromise(tx.objectStore(STORE).get(id));
    return result instanceof Blob ? result : null;
  } catch {
    return null;
  }
}

export async function deleteResumeBlob(id: string): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    await transactionDone(tx);
  } catch {
    // 记录已经删除时，原件清理失败不阻断界面
  }
}

export async function clearResumeBlobs(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).clear();
  await transactionDone(tx);
}

export async function downloadResumeSource(source: ResumeSourceFile): Promise<string | null> {
  const blob = await getResumeBlob(source.fileId);
  if (!blob) return RESUME_FILE_COPY.missingBlob;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = source.fileName || 'resume';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return null;
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error(RESUME_FILE_COPY.saveFailed));
    tx.onabort = () => reject(tx.error ?? new Error(RESUME_FILE_COPY.saveFailed));
  });
}
