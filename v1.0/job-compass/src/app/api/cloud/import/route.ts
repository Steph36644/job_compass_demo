import { NextResponse } from 'next/server';
import { MSG_LOGIN_CLOUD_READ, MSG_MIGRATION } from '@/lib/demo-messages';
import { readPublicSupabase } from '@/lib/public-env';
import { createSupabaseServer, readSessionUser } from '@/lib/supabase-server';

export async function GET() {
  if (!readPublicSupabase()) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: MSG_LOGIN_CLOUD_READ }, { status: 401 });
  }
  const user = await readSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: MSG_LOGIN_CLOUD_READ }, { status: 401 });
  }
  const supabase = await createSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: MSG_LOGIN_CLOUD_READ }, { status: 401 });
  }
  const { data, error } = await supabase
    .from('job_compass_snapshots')
    .select('payload')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) {
    const missing = /relation|schema cache|does not exist|PGRST205|42P01/i.test(`${error.code} ${error.message}`);
    return NextResponse.json({
      ok: false,
      message: missing ? MSG_MIGRATION : '没有拉到云端数据。本地没有改动，主源仍是本地。',
    }, { status: missing ? 503 : 502 });
  }
  if (!data?.payload || typeof data.payload !== 'object') {
    return NextResponse.json({
      ok: false,
      message: '没有拉到云端数据。本地没有改动，主源仍是本地。',
    });
  }
  return NextResponse.json({ ok: true, data: data.payload });
}
