-- ============================================================
--  Stock Portfolio — database schema
--  Run this in the Supabase SQL Editor (Dashboard -> SQL Editor).
--  It is safe to run more than once.
-- ============================================================

-- ---------- Holdings (your portfolio positions) ----------
create table if not exists public.holdings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  symbol      text not null,
  name        text,
  shares      numeric(18, 6) not null check (shares > 0),
  buy_price   numeric(18, 4) not null check (buy_price >= 0),
  buy_date    date not null,
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists holdings_user_idx on public.holdings (user_id);

-- ---------- Watchlist (favourite / bookmarked stocks) ----------
create table if not exists public.watchlist (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  symbol      text not null,
  name        text,
  created_at  timestamptz not null default now(),
  unique (user_id, symbol)
);

create index if not exists watchlist_user_idx on public.watchlist (user_id);

-- ============================================================
--  Row Level Security: each user can only touch their own rows
-- ============================================================
alter table public.holdings  enable row level security;
alter table public.watchlist enable row level security;

-- holdings policies
drop policy if exists "own holdings - select" on public.holdings;
create policy "own holdings - select" on public.holdings
  for select using (auth.uid() = user_id);

drop policy if exists "own holdings - insert" on public.holdings;
create policy "own holdings - insert" on public.holdings
  for insert with check (auth.uid() = user_id);

drop policy if exists "own holdings - update" on public.holdings;
create policy "own holdings - update" on public.holdings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own holdings - delete" on public.holdings;
create policy "own holdings - delete" on public.holdings
  for delete using (auth.uid() = user_id);

-- watchlist policies
drop policy if exists "own watchlist - select" on public.watchlist;
create policy "own watchlist - select" on public.watchlist
  for select using (auth.uid() = user_id);

drop policy if exists "own watchlist - insert" on public.watchlist;
create policy "own watchlist - insert" on public.watchlist
  for insert with check (auth.uid() = user_id);

drop policy if exists "own watchlist - delete" on public.watchlist;
create policy "own watchlist - delete" on public.watchlist
  for delete using (auth.uid() = user_id);
