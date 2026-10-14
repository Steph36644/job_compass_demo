-- 公开演示用的用户级快照表。访客在自己的 Supabase 项目里执行。
-- 不包含生产项目地址，也不使用 service role。
-- 这不是私有仓库 P1-A migration 的原文；私有仓历史没有导入本演示仓库。

create table if not exists public.job_compass_snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.job_compass_snapshots enable row level security;

create policy "read own snapshot"
  on public.job_compass_snapshots
  for select
  using (auth.uid() = user_id);

create policy "insert own snapshot"
  on public.job_compass_snapshots
  for insert
  with check (auth.uid() = user_id);

create policy "update own snapshot"
  on public.job_compass_snapshots
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
