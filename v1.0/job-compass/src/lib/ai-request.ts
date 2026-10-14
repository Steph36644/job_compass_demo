import { MSG_AI_NOT_CONFIGURED, MSG_AI_RETRY, MSG_LOGIN_AI } from './demo-messages';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const FORBIDDEN_FIELDS = new Set([
  'apikey',
  'api_key',
  'authorization',
  'providerkey',
  'provider_key',
  'secret',
  'service_role',
]);

/** 浏览器不得提交供应商 Key。只检查字段名，不扫描正文，避免误伤示例文案。 */
export function containsByokField(value: unknown): boolean {
  const stack: unknown[] = [value];
  const seen = new Set<object>();
  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const [key, child] of Object.entries(current as Record<string, unknown>)) {
      if (FORBIDDEN_FIELDS.has(key.toLowerCase())) return true;
      if (child && typeof child === 'object') stack.push(child);
    }
  }
  return false;
}

export function sanitizeChatMessages(value: unknown): ChatMessage[] | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = (value as { messages?: unknown }).messages;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 20) return null;
  const messages: ChatMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== 'system' && role !== 'user' && role !== 'assistant') return null;
    if (typeof content !== 'string') return null;
    const text = content.trim();
    if (!text || text.length > 8000) return null;
    messages.push({ role, content: text });
  }
  return messages;
}

export function aiFailureMessage(status: number, errorCode: string | undefined): string {
  if (status === 401 || errorCode === 'UNAUTHORIZED') return MSG_LOGIN_AI;
  if (status === 503 || errorCode === 'AI_NOT_CONFIGURED' || errorCode === 'UPSTREAM_AUTH') {
    return MSG_AI_NOT_CONFIGURED;
  }
  return MSG_AI_RETRY;
}
