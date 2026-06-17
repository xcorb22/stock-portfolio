-- ============================================================
--  Migration 03 — sell transactions + realized P&L
--  Run in the Supabase SQL Editor AFTER 02_portfolios_and_assets.sql.
--  Safe to run more than once.
-- ============================================================

create table if not exists public.transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  portfolio_id  uuid references public.portfolios (id) on delete cascade,
  symbol        text not null,
  name          text,
  asset_type    text not null default 'stock',
  shares        numeric(28, 10) not null check (shares > 0),
  sell_price    numeric(18, 6) not null,   -- price per unit at sale
  buy_price     numeric(18, 6) not null,   -- cost basis per unit (from the lot)
  realized_pnl  numeric(18, 6) not null default 0,
  txn_date      date not null,
  notes         text,
  created_at    timestamptz not null default now()
);

create index if not exists transactions_user_idx on public.transactions (user_id);
create index if not exists transactions_portfolio_idx on public.transactions (portfolio_id);

alter table public.transactions enable row level security;

drop policy if exists "own transactions - select" on public.transactions;
create policy "own transactions - select" on public.transactions
  for select using (auth.uid() = user_id);
drop policy if exists "own transactions - insert" on public.transactions;
create policy "own transactions - insert" on public.transactions
  for insert with check (auth.uid() = user_id);
drop policy if exists "own transactions - delete" on public.transactions;
create policy "own transactions - delete" on public.transactions
  for delete using (auth.uid() = user_id);
