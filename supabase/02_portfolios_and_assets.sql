-- ============================================================
--  Migration 02 — multiple portfolios + asset types (crypto/cash/other)
--  Run this in the Supabase SQL Editor AFTER schema.sql.
--  Safe to run more than once. Existing holdings are kept and moved
--  into a default "My Stocks" portfolio.
-- ============================================================

-- ---------- Portfolios ----------
create table if not exists public.portfolios (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  kind        text not null default 'mixed', -- stocks | crypto | cash | other | mixed
  created_at  timestamptz not null default now()
);
create index if not exists portfolios_user_idx on public.portfolios (user_id);

alter table public.portfolios enable row level security;

drop policy if exists "own portfolios - select" on public.portfolios;
create policy "own portfolios - select" on public.portfolios
  for select using (auth.uid() = user_id);
drop policy if exists "own portfolios - insert" on public.portfolios;
create policy "own portfolios - insert" on public.portfolios
  for insert with check (auth.uid() = user_id);
drop policy if exists "own portfolios - update" on public.portfolios;
create policy "own portfolios - update" on public.portfolios
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own portfolios - delete" on public.portfolios;
create policy "own portfolios - delete" on public.portfolios
  for delete using (auth.uid() = user_id);

-- ---------- Extend holdings ----------
alter table public.holdings
  add column if not exists portfolio_id  uuid references public.portfolios (id) on delete cascade;
alter table public.holdings
  add column if not exists asset_type    text not null default 'stock'; -- stock | crypto | cash | other
alter table public.holdings
  add column if not exists api_id        text;            -- CoinGecko coin id for crypto
alter table public.holdings
  add column if not exists current_price numeric(18, 6);  -- manual price for "other" assets

-- crypto amounts can be very small / very precise
alter table public.holdings alter column shares type numeric(28, 10);

create index if not exists holdings_portfolio_idx on public.holdings (portfolio_id);

-- ---------- Backfill: give existing holdings a home ----------
do $$
declare
  u record;
  pid uuid;
begin
  for u in select distinct user_id from public.holdings where portfolio_id is null loop
    insert into public.portfolios (user_id, name, kind)
      values (u.user_id, 'My Stocks', 'stocks')
      returning id into pid;
    update public.holdings
      set portfolio_id = pid
      where user_id = u.user_id and portfolio_id is null;
  end loop;
end $$;
