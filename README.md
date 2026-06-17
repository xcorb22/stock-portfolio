# 📈 Portfolio — Multi-Asset Stock & Crypto Tracker

A full-stack personal portfolio tracker and analyzer for **stocks, ETFs, crypto, cash and other assets** — with live prices, fundamentals, news, sector analysis, realized/unrealized P&L, and a performance-over-time chart.

🔗 **Live demo:** https://enchanting-caramel-da5355.netlify.app

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3FCF8E?logo=supabase&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-charts-FF6384)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## Overview

This is a single-page web app that lets a user track everything they own in one place. It authenticates users, stores their holdings in Postgres with per-user row-level security, pulls **live market data** from public APIs, and turns it into an actionable dashboard: total value, gain/loss (realized vs unrealized), allocation, sector exposure, a benchmark against the S&P 500, and a value-over-time chart.

> ⚠️ Built for learning/portfolio purposes. Informational only — **not financial advice**.

## Screenshots

> _Add screenshots here, e.g. `docs/dashboard.png`, then reference them:_
>
> `![Dashboard](docs/dashboard.png)`

| Dashboard | Analysis | Asset detail |
| --- | --- | --- |
| _value, allocation, benchmark, history_ | _sector & asset-class breakdown_ | _fundamentals + news_ |

## Key features

**Accounts & data**
- Email/password auth with verification & password reset (Supabase Auth)
- Postgres **Row Level Security** — each user only ever reads/writes their own rows

**Portfolios & holdings**
- Multiple **portfolios** (e.g. Stocks, Crypto, Cash) with an app-wide filter, or an **aggregated** view
- Multi-asset holdings (full CRUD): **stocks/ETFs**, **crypto**, **cash**, **other** (manually priced)
- **Sell transactions** with **realized vs unrealized P&L**, and a **History** of every sale
- **CSV import / export** (export doubles as the import template)

**Market data & analysis**
- **Live prices** (auto-refresh): stocks/ETFs via Finnhub, crypto via CoinGecko
- **Asset detail panel**: fundamentals (P/E, beta, 52-wk range, market cap) + recent news, or crypto market data
- **Research page** to look up *any* ticker/coin you don't own
- **Allocation** donut (by portfolio / sector / asset class) and a sector + individual-asset filter
- **S&P 500 benchmark** for the day, today's movers, **value-over-time** chart (daily snapshots)
- **Watchlist** of bookmarked tickers with live quotes

**UX & trust**
- Dark, responsive UI; colorblind-safe ▲/▼ cues; delayed-data badge; not-advice disclaimer
- Graceful degradation if an API/migration is unavailable (no crashes)

## Tech stack

| Layer        | Technology                                  |
| ------------ | ------------------------------------------- |
| Frontend     | React 18, Vite, React Router 6              |
| Charts       | Recharts                                    |
| Auth + DB    | Supabase (PostgreSQL + Auth + RLS)          |
| Stock data   | Finnhub REST API                            |
| Crypto data  | CoinGecko REST API (no key required)        |
| Hosting      | Netlify (static) — also configured for Vercel |

## Architecture

- **Client-rendered SPA.** All market-data calls happen in the browser; Supabase is the only backend (auth + Postgres). Security comes from **Row Level Security**, not a custom server.
- **Pricing is unified** across asset types (`src/lib/prices.js`): stocks → Finnhub, crypto → CoinGecko, cash → 1:1, other → manual — so the rest of the UI treats every holding the same way.
- **Performance history** is built by upserting a daily value snapshot per portfolio whenever the dashboard loads (historical prices are paywalled, so it accrues forward).

```
src/
  context/     AuthContext (session) · PortfolioContext (portfolios + active filter)
  hooks/       usePrices · useQuotes · useSectors
  lib/         supabase · finnhub · coingecko · prices · sectors · csv · format · api
  components/  Navbar · Footer · ProtectedRoute · AssetSearch · StockSearch
               AssetDetail (modal + inline body) · SellModal · PerformanceChart
  pages/       Login · Signup · ForgotPassword · ResetPassword
               Dashboard · Holdings · Analysis · History · Research · Watchlist · Portfolios
supabase/
  schema.sql                    holdings + watchlist (+ RLS)
  02_portfolios_and_assets.sql  portfolios + multi-asset columns
  03_transactions.sql           sales / realized P&L
  04_snapshots.sql              daily value snapshots (history chart)
```

### Database schema (Supabase / Postgres)

| Table                 | Purpose                                                        |
| --------------------- | -------------------------------------------------------------- |
| `portfolios`          | Named buckets (stocks/crypto/cash/…) owned by a user           |
| `holdings`            | Open lots: symbol, asset type, shares, cost basis, buy date    |
| `transactions`        | Recorded sales with realized P&L                               |
| `portfolio_snapshots` | One value/cost row per portfolio per day (performance chart)   |
| `watchlist`           | Bookmarked tickers                                             |

Every table has RLS policies restricting access to `auth.uid() = user_id`.

## Getting started

### 1. Install

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at <https://supabase.com>.
2. In **SQL Editor**, run these in order:
   1. [`supabase/schema.sql`](supabase/schema.sql)
   2. [`supabase/02_portfolios_and_assets.sql`](supabase/02_portfolios_and_assets.sql)
   3. [`supabase/03_transactions.sql`](supabase/03_transactions.sql)
   4. [`supabase/04_snapshots.sql`](supabase/04_snapshots.sql)
3. Copy your **Project URL** and **anon public key** from **Project Settings → API**.

### 3. Get a free Finnhub key

Sign up at <https://finnhub.io> and copy the API key.

### 4. Configure environment

```bash
cp .env.example .env
```

```ini
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_FINNHUB_API_KEY=your-finnhub-key
```

### 5. Run

```bash
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
```

## Deployment

See [DEPLOY.md](DEPLOY.md) for free hosting (Netlify drag-and-drop or Vercel) and how to install it as a desktop app. After deploying, add your deployed URL to **Supabase → Authentication → URL Configuration** so email links resolve.

### CSV format

Header row (case-insensitive): `symbol, name, asset_type, portfolio, shares, buy_price, buy_date, current_price, api_id, notes`. Only `symbol` (stock/crypto), `shares` and `buy_price` are required. For crypto, include `api_id` (the CoinGecko id, e.g. `bitcoin`).

## Notes & limitations

- API keys are used client-side — fine for free personal keys; a production build would proxy them through a backend. Supabase data is still protected by RLS.
- Finnhub's free tier covers **US-listed** stocks/ETFs; other exchanges may return `0`. ETFs have no sector (shown as "ETF / Fund").
- The performance chart builds history **from first use forward** (historical prices are paywalled) and records on days you open the app.

## Roadmap

- Price/percent **alerts** (browser notifications + Supabase)
- **Dividend** tracking and multi-currency support
- Risk metrics (volatility, Sharpe) once historical data is available
- Code-splitting to shrink the initial bundle

## License

[MIT](LICENSE)
