// JD 截图只放 IndexedDB。OCR 文本随投递记录进 localStorage，避免大图撑爆配额。

const DB_NAME = 'job-compass-jd-images';
const DB_VERSION = 1;
const STORE = 'screenshots';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('无法打开截图库'));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = run(tx.objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('截图读写失败'));
    });
  } finally {
    db.close();
  }
}

export async function saveJdScreenshot(applicationId: string, blob: Blob): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  await withStore('readwrite', (store) => store.put(blob, applicationId));
}

export async function loadJdScreenshot(applicationId: string): Promise<Blob | null> {
  if (typeof indexedDB === 'undefined') return null;
  const result = await withStore<Blob | undefined>('readonly', (store) => store.get(applicationId));
  return result ?? null;
}

export async function deleteJdScreenshot(applicationId: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    await withStore('readwrite', (store) => store.delete(applicationId));
  } catch {
    // 删投递时截图清理失败不影响主数据
  }
}
