/**
 * 公开演示只接受访客自己的 Supabase 项目。
 * 空值、占位符、service role / sb_secret 一律视为「未配置」，应用继续走本地台账。
 */

const PLACEHOLDER_URLS = new Set([
  '',
  'your-project-url',
  'https://your-project.supabase.co',
  'https://your-project-id.supabase.co',
]);

const PLACEHOLDER_KEYS = new Set(['', 'your-anon-key', 'your-publishable-key']);

export interface PublicSupabaseConfig {
  url: string;
  anonKey: string;
}

export function readPublicSupabase(
  env: Record<string, string | undefined> = process.env,
): PublicSupabaseConfig | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
  if (PLACEHOLDER_URLS.has(url) || PLACEHOLDER_KEYS.has(anonKey)) return null;
  if (looksLikeSecretKey(anonKey)) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  if (parsed.username || parsed.password) return null;
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return null;
  const supabaseHost = host.endsWith('.supabase.co') || host.endsWith('.supabase.in');
  if (!supabaseHost) return null;

  return { url: url.replace(/\/$/, ''), anonKey };
}

export function looksLikeSecretKey(value: string): boolean {
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  return (
    lower.startsWith('sb_secret_') ||
    lower.includes('service_role') ||
    lower.startsWith('sk-')
  );
}

const AI_HOSTS = new Set(['api.openai.com', 'api.deepseek.com', 'dashscope.aliyuncs.com']);

export interface AiUpstream {
  endpoint: string;
  host: string;
  model: string;
  apiKey: string;
}

/** 只在服务端调用。浏览器拿不到返回值里的 apiKey。 */
export function readServerAi(
  env: Record<string, string | undefined> = process.env,
): AiUpstream | null {
  const apiKey = env.JOB_COMPASS_AI_API_KEY?.trim() ?? '';
  if (!apiKey || apiKey === 'your-server-api-key') return null;
  if (apiKey.startsWith('sb_secret_') || apiKey.toLowerCase().includes('service_role')) return null;

  const upstream = resolveAiUpstream(env.JOB_COMPASS_AI_BASE_URL);
  if (!upstream) return null;
  const model = env.JOB_COMPASS_AI_MODEL?.trim() || 'gpt-4o-mini';
  if (model.length > 80 || /[\s/]/.test(model)) return null;
  return { ...upstream, model, apiKey };
}

export function resolveAiUpstream(baseUrl: string | undefined): { endpoint: string; host: string } | null {
  const raw = (baseUrl?.trim() || 'https://api.openai.com/v1').replace(/\/$/, '');
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (url.username || url.password) return null;
  if (!AI_HOSTS.has(url.hostname)) return null;
  const path = url.pathname === '/' ? '/v1' : url.pathname.replace(/\/$/, '');
  return {
    endpoint: `${url.origin}${path}/chat/completions`,
    host: url.hostname,
  };
}
