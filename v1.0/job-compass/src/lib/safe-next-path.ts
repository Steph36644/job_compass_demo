/** 只允许站内相对路径，避免登录后被带到外部地址。 */
export function safeNextPath(value: string | null | undefined, fallback = '/'): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.includes('\\') ||
    trimmed.includes('://')
  ) {
    return fallback;
  }
  return trimmed;
}

export type LoginFeature = 'ai' | 'cloud' | 'devices' | 'general';

export function readLoginFeature(value: string | null | undefined): LoginFeature {
  if (value === 'ai' || value === 'cloud' || value === 'devices') return value;
  return 'general';
}

export function loginFeatureCopy(feature: LoginFeature): string {
  if (feature === 'ai') return '登录后才能使用 AI。本地台账现在就能改。';
  if (feature === 'cloud') return '登录后可以把台账复制到云端。未登录不能切换主源。';
  if (feature === 'devices') return '登录后才能对账、导入和切换主源。未登录不能拉取云端数据。';
  return '登录后可以使用云同步。导入和切换主源也要先登录。';
}

export function mapAuthError(message: string): string {
  const text = message.toLowerCase();
  if (text.includes('invalid login credentials')) return '邮箱或密码不正确';
  if (text.includes('already registered') || text.includes('already been registered')) {
    return '这个邮箱已经注册，请直接登录';
  }
  if (text.includes('email not confirmed')) return '请先到邮箱完成确认，再登录';
  if (text.includes('password')) return '密码不符合要求，请至少使用 6 位';
  if (text.includes('rate limit') || text.includes('too many')) return '操作太频繁，请稍后再试';
  if (text.includes('disabled')) return '当前项目没有开放邮箱注册，请在 Supabase 里打开';
  return '登录没有完成，请稍后再试';
}
