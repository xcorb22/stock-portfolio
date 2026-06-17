-- ============================================================
--  Migration 04 — daily portfolio value snapshots (history chart)
--  Run in the Supabase SQL Editor AFTER 03_transactions.sql.
--  Safe to run more than once.
--
--  One row per (user, portfolio, day). The app upserts today's value when
--  you open the dashboard, building a performance history from today forward.
-- ============================================================

create table if not exists public.portfolio_snapshots (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  portfolio_id  uuid references public.portfolios (id) on delete cascade,
  snapshot_date date not null,
  value         numeric(20, 4) not null default 0,
  cost          numeric(20, 4) not null default 0,
  created_at    timestamptz not null default now(),
  unique (user_id, portfolio_id, snapshot_date)
);

create index if not exists snapshots_user_idx on public.portfolio_snapshots (user_id);
create index if not exists snapshots_user_date_idx on public.portfolio_snapshots (user_id, snapshot_date);

alter table public.portfolio_snapshots enable row level security;

drop policy if exists "own snapshots - select" on public.portfolio_snapshots;
create policy "own snapshots - select" on public.portfolio_snapshots
  for select using (auth.uid() = user_id);
drop policy if exists "own snapshots - insert" on public.portfolio_snapshots;
create policy "own snapshots - insert" on public.portfolio_snapshots
  for insert with check (auth.uid() = user_id);
drop policy if exists "own snapshots - update" on public.portfolio_snapshots;
create policy "own snapshots - update" on public.portfolio_snapshots
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own snapshots - delete" on public.portfolio_snapshots;
create policy "own snapshots - delete" on public.portfolio_snapshots
  for delete using (auth.uid() = user_id);
