/** 日志与界面回显用。匹配前缀后整段替换，仓库里不保存任何真实密钥。 */
export function redactSecrets(text: string): string {
  return text
    .replace(/sk-[A-Za-z0-9_-]{4,}/g, '[redacted]')
    .replace(/sb_secret_[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted]');
}

const SECRET_STORAGE = /api[-_]?key|ai-settings|provider-key/i;

export function storageKeyLooksSecret(key: string): boolean {
  return key === 'job-compass-ai-settings-v1' || SECRET_STORAGE.test(key);
}
