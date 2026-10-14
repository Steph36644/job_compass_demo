import { MSG_LOGIN_CLOUD_READ } from './demo-messages';

export type PrimarySource = 'local' | 'cloud';

const KEY = 'job-compass-primary-source-v1';

export function readPrimarySource(): PrimarySource {
  if (typeof window === 'undefined') return 'local';
  try {
    return window.localStorage.getItem(KEY) === 'cloud' ? 'cloud' : 'local';
  } catch {
    return 'local';
  }
}

export function writePrimarySource(
  next: PrimarySource,
  loggedIn: boolean,
): { ok: true } | { ok: false; message: string } {
  if (next === 'cloud' && !loggedIn) {
    return { ok: false, message: MSG_LOGIN_CLOUD_READ };
  }
  if (typeof window === 'undefined') return { ok: false, message: MSG_LOGIN_CLOUD_READ };
  window.localStorage.setItem(KEY, next);
  return { ok: true };
}
