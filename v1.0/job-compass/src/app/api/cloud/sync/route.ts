import { NextResponse } from 'next/server';
import { MSG_CLOUD_WRITE_FAILED, MSG_LOGIN_CLOUD_WRITE, MSG_MIGRATION } from '@/lib/demo-messages';
import { readPublicSupabase } from '@/lib/public-env';
import { createSupabaseServer, readSessionUser } from '@/lib/supabase-server';

const MAX_BYTES = 1_500_000;

export async function POST(request: Request) {
  if (!readPublicSupabase()) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: MSG_LOGIN_CLOUD_WRITE }, { status: 401 });
  }
  const user = await readSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: MSG_LOGIN_CLOUD_WRITE }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: MSG_CLOUD_WRITE_FAILED }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ ok: false, message: MSG_CLOUD_WRITE_FAILED }, { status: 400 });
  }
  const serialized = JSON.stringify(body);
  if (serialized.length > MAX_BYTES) {
    return NextResponse.json({ ok: false, message: '备份太大，没有写入云端。本地记录还在。' }, { status: 413 });
  }

  const supabase = await createSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: MSG_LOGIN_CLOUD_WRITE }, { status: 401 });
  }
  const { error } = await supabase.from('job_compass_snapshots').upsert({
    user_id: user.id,
    payload: body,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    const missing = /relation|schema cache|does not exist|PGRST205|42P01/i.test(`${error.code} ${error.message}`);
    return NextResponse.json({
      ok: false,
      message: missing ? MSG_MIGRATION : MSG_CLOUD_WRITE_FAILED,
    }, { status: missing ? 503 : 502 });
  }
  return NextResponse.json({ ok: true });
}
