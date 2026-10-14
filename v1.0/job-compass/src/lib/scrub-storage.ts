import { storageKeyLooksSecret } from './redact';

export function scrubSecretStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key) keys.push(key);
    }
    for (const key of keys) {
      if (storageKeyLooksSecret(key)) window.localStorage.removeItem(key);
    }
  } catch {
    // 隐私模式写不了存储时，本地台账本身也会失败，不在这里抛出。
  }
}
