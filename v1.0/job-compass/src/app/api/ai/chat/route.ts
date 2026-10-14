import { NextResponse } from 'next/server';
import { containsByokField, sanitizeChatMessages } from '@/lib/ai-request';
import { MSG_AI_NOT_CONFIGURED, MSG_AI_RETRY, MSG_LOGIN_AI } from '@/lib/demo-messages';
import { redactSecrets } from '@/lib/redact';
import { readPublicSupabase, readServerAi } from '@/lib/public-env';
import { readSessionUser } from '@/lib/supabase-server';

export async function POST(request: Request) {
  if (!readPublicSupabase()) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: MSG_LOGIN_AI }, { status: 401 });
  }
  const user = await readSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: MSG_LOGIN_AI }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'BAD_REQUEST', message: '请求格式不正确。' }, { status: 400 });
  }
  if (containsByokField(body)) {
    return NextResponse.json(
      { error: 'BYOK_REJECTED', message: '供应商 Key 只在服务端，浏览器不能提交密钥。' },
      { status: 400 },
    );
  }
  const messages = sanitizeChatMessages(body);
  if (!messages) {
    return NextResponse.json({ error: 'BAD_REQUEST', message: '请提供有效的对话内容。' }, { status: 400 });
  }

  const ai = readServerAi();
  if (!ai) {
    return NextResponse.json(
      { error: 'AI_NOT_CONFIGURED', message: MSG_AI_NOT_CONFIGURED },
      { status: 503 },
    );
  }

  try {
    const upstream = await fetch(ai.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${ai.apiKey}`,
      },
      body: JSON.stringify({ model: ai.model, messages, temperature: 0.2 }),
      signal: AbortSignal.timeout(25_000),
    });
    if (upstream.status === 401 || upstream.status === 403) {
      return NextResponse.json(
        { error: 'UPSTREAM_AUTH', message: MSG_AI_NOT_CONFIGURED },
        { status: 503 },
      );
    }
    if (!upstream.ok) {
      return NextResponse.json({ error: 'UPSTREAM', message: MSG_AI_RETRY }, { status: 502 });
    }
    const payload = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim() ?? '';
    if (!content) {
      return NextResponse.json({ error: 'UPSTREAM', message: MSG_AI_RETRY }, { status: 502 });
    }
    return NextResponse.json({ content: redactSecrets(content).slice(0, 8000), model: ai.model });
  } catch {
    return NextResponse.json({ error: 'UPSTREAM', message: MSG_AI_RETRY }, { status: 502 });
  }
}
