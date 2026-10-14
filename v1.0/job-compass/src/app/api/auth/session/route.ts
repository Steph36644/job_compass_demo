import { NextResponse } from 'next/server';
import { readPublicSupabase } from '@/lib/public-env';
import { readSessionUser } from '@/lib/supabase-server';

export async function GET() {
  const configured = readPublicSupabase() !== null;
  if (!configured) {
    return NextResponse.json({ configured: false, user: null });
  }
  const user = await readSessionUser();
  return NextResponse.json({ configured: true, user });
}
