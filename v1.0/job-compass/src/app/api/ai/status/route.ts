import { NextResponse } from 'next/server';
import { MSG_AI_NOT_CONFIGURED, MSG_LOGIN_AI } from '@/lib/demo-messages';
import { readPublicSupabase, readServerAi } from '@/lib/public-env';
import { readSessionUser } from '@/lib/supabase-server';

export async function GET() {
  if (!readPublicSupabase()) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: MSG_LOGIN_AI }, { status: 401 });
  }
  const user = await readSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: MSG_LOGIN_AI }, { status: 401 });
  }
  const ai = readServerAi();
  if (!ai) {
    return NextResponse.json({
      configured: false,
      providerLabel: '',
      model: '',
      host: '',
      message: MSG_AI_NOT_CONFIGURED,
    });
  }
  const providerLabel = ai.host === 'api.deepseek.com'
    ? 'DeepSeek'
    : ai.host === 'dashscope.aliyuncs.com'
      ? 'DashScope'
      : 'OpenAI';
  return NextResponse.json({
    configured: true,
    providerLabel,
    model: ai.model,
    host: ai.host,
    message: '浏览器没有保存供应商 Key。',
  });
}
