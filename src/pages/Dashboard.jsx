import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { fetchHoldings, fetchSnapshots, fetchTransactions, upsertSnapshots } from '../lib/api'
import { getQuote } from '../lib/finnhub'
import AssetDetail from '../components/AssetDetail'
import PerformanceChart from '../components/PerformanceChart'
import { usePortfolios } from '../context/PortfolioContext'
import usePrices from '../hooks/usePrices'
import useSectors from '../hooks/useSectors'
import { ASSET_TYPES } from '../lib/prices'
import { arrow, gainClass, pct, today, usd } from '../lib/format'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#a855f7', '#ef4444', '#84cc16', '#14b8a6', '#f97316']
const ASSET_ICON = { stock: '📈', crypto: '🪙', cash: '💵', other: '🏷️' }

export default function Dashboard() {
  const { portfolios, selectedId } = usePortfolios()
  const [holdings, setHoldings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null)
  const [spy, setSpy] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(Date.now())
  const [allocMode, setAllocMode] = useState('default') // default | sector | asset
  const [realized, setRealized] = useState(0)
  const [snapshots, setSnapshots] = useState([])
  const snappedRef = useRef('')

  useEffect(() => {
    setLoading(true)
    fetchHoldings(selectedId)
      .then(setHoldings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
    // Realized P&L from recorded sales (gracefully 0 if migration 03 not run).
    fetchTransactions(selectedId)
      .then((ts) => setRealized(ts.reduce((s, t) => s + Number(t.realized_pnl), 0)))
      .catch(() => setRealized(0))
  }, [selectedId])

  const { prices, loading: pricesLoading, refresh } = usePrices(holdings)
  const stockSymbols = useMemo(
    () => holdings.filter((h) => h.asset_type === 'stock').map((h) => h.symbol),
    [holdings]
  )
  const sectors = useSectors(stockSymbols)

  const loadSpy = () => getQuote('SPY').then(setSpy).catch(() => {})
  useEffect(() => {
    loadSpy()
  }, [])

  const refreshAll = () => {
    refresh()
    loadSpy()
    setUpdatedAt(Date.now())
  }

  const portfolioName = useMemo(() => {
    const map = {}
    portfolios.forEach((p) => (map[p.id] = p.name))
    return map
  }, [portfolios])

  const viewLabel = selectedId ? portfolioName[selectedId] || 'Portfolio' : 'All portfolios'

  const rows = useMemo(() => {
    return holdings.map((h) => {
      const { price = 0, dayPct = 0 } = prices[h.id] || {}
      const marketValue = h.shares * price
      const cost = h.shares * h.buy_price
      const gain = marketValue - cost
      const dayChange = dayPct ? marketValue - marketValue / (1 + dayPct / 100) : 0
      return {
        ...h,
        price,
        marketValue,
        cost,
        gain,
        gainPct: cost ? (gain / cost) * 100 : 0,
        dayChange,
        dayPct,
      }
    })
  }, [holdings, prices])

  const totals = useMemo(() => {
    const t = rows.reduce(
      (acc, r) => {
        acc.value += r.marketValue
        acc.cost += r.cost
        acc.day += r.dayChange
        return acc
      },
      { value: 0, cost: 0, day: 0 }
    )
    t.gain = t.value - t.cost
    t.gainPct = t.cost ? (t.gain / t.cost) * 100 : 0
    return t
  }, [rows])

  // ---- Performance history ----
  const loadSnapshots = () => {
    fetchSnapshots(selectedId)
      .then(setSnapshots)
      .catch(() => setSnapshots([]))
  }
  useEffect(() => {
    loadSnapshots()
    snappedRef.current = ''
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  // Record today's value once per load (per portfolio) after prices settle.
  useEffect(() => {
    if (pricesLoading || holdings.length === 0 || totals.value <= 0) return
    const date = today()
    const guard = `${selectedId || 'all'}:${date}`
    if (snappedRef.current === guard) return
    snappedRef.current = guard
    const byPortfolio = {}
    rows.forEach((r) => {
      if (!r.portfolio_id) return
      byPortfolio[r.portfolio_id] ??= { value: 0, cost: 0 }
      byPortfolio[r.portfolio_id].value += r.marketValue
      byPortfolio[r.portfolio_id].cost += r.cost
    })
    const payload = Object.entries(byPortfolio).map(([portfolio_id, v]) => ({
      portfolio_id,
      snapshot_date: date,
      value: Number(v.value.toFixed(4)),
      cost: Number(v.cost.toFixed(4)),
    }))
    upsertSnapshots(payload).then(loadSnapshots).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricesLoading, totals.value, holdings.length])

  const series = useMemo(() => {
    const byDate = {}
    snapshots.forEach((s) => {
      byDate[s.snapshot_date] ??= { date: s.snapshot_date, value: 0, cost: 0 }
      byDate[s.snapshot_date].value += Number(s.value)
      byDate[s.snapshot_date].cost += Number(s.cost)
    })
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
  }, [snapshots])

  // Benchmark: portfolio's day % vs S&P 500 (SPY) day %.
  const prevValue = totals.value - totals.day
  const portfolioDayPct = prevValue ? (totals.day / prevValue) * 100 : 0
  const spyPct = spy && Number.isFinite(spy.dp) ? spy.dp : null
  const vsSpy = spyPct != null ? portfolioDayPct - spyPct : null

  const groupKey = (r) => {
    if (allocMode === 'asset') return ASSET_TYPES[r.asset_type]?.label || r.asset_type
    if (allocMode === 'sector') {
      if (r.asset_type === 'stock') return sectors[r.symbol.toUpperCase()] || 'Unknown'
      if (r.asset_type === 'crypto') return 'Crypto'
      if (r.asset_type === 'cash') return 'Cash'
      return 'Other assets'
    }
    return selectedId ? r.symbol : portfolioName[r.portfolio_id] || 'Unassigned'
  }

  const allocation = useMemo(() => {
    const groups = {}
    rows.forEach((r) => {
      const k = groupKey(r)
      groups[k] = (groups[k] || 0) + r.marketValue
    })
    return Object.entries(groups)
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, allocMode, selectedId, portfolioName, sectors])

  const movers = useMemo(
    () =>
      [...rows]
        .filter((r) => r.price && r.dayPct)
        .sort((a, b) => Math.abs(b.dayPct) - Math.abs(a.dayPct))
        .slice(0, 5),
    [rows]
  )

  if (loading) return <div className="centered muted">Loading portfolio…</div>
  if (error) return <div className="banner error">{error}</div>

  if (portfolios.length === 0) {
    return (
      <div className="empty-state">
        <h2>Create your first portfolio</h2>
        <p className="muted">Group your assets into portfolios (stocks, crypto, cash…).</p>
        <Link to="/portfolios" className="btn primary">
          + New portfolio
        </Link>
      </div>
    )
  }

  if (holdings.length === 0) {
    return (
      <div className="empty-state">
        <h2>{viewLabel} is empty</h2>
        <p className="muted">Add your first holding to start tracking performance.</p>
        <Link to="/holdings" className="btn primary">
          + Add a holding
        </Link>
      </div>
    )
  }

  const defaultLabel = selectedId ? 'Holding' : 'Portfolio'

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <span className="muted">{viewLabel}</span>
        </div>
        <div className="head-actions">
          <span className="badge muted" title="Quotes may be delayed depending on the data provider">
            ⏱ Updated {new Date(updatedAt).toLocaleTimeString()} · may be delayed
          </span>
          <button className="btn ghost" onClick={refreshAll} disabled={pricesLoading}>
            {pricesLoading ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      <section className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Market value</span>
          <span className="stat-value">{usd(totals.value)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total cost</span>
          <span className="stat-value">{usd(totals.cost)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Unrealized gain / loss</span>
          <span className={`stat-value ${gainClass(totals.gain)}`}>
            {arrow(totals.gain)} {usd(totals.gain)} <small>({pct(totals.gainPct)})</small>
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Realized P&amp;L</span>
          <span className={`stat-value ${gainClass(realized)}`}>
            {arrow(realized)} {usd(realized)}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Today</span>
          <span className={`stat-value ${gainClass(totals.day)}`}>
            {arrow(totals.day)} {usd(totals.day)} <small>({pct(portfolioDayPct)})</small>
          </span>
        </div>
      </section>

      <section className="card benchmark">
        <h3>vs. S&amp;P 500 today</h3>
        {spyPct == null ? (
          <p className="muted small">Loading benchmark…</p>
        ) : (
          <div className="benchmark-row">
            <div>
              <span className="muted small">Your portfolio</span>
              <div className={`benchmark-val ${gainClass(portfolioDayPct)}`}>
                {arrow(portfolioDayPct)} {pct(portfolioDayPct)}
              </div>
            </div>
            <div>
              <span className="muted small">S&amp;P 500 (SPY)</span>
              <div className={`benchmark-val ${gainClass(spyPct)}`}>
                {arrow(spyPct)} {pct(spyPct)}
              </div>
            </div>
            <div>
              <span className="muted small">Difference</span>
              <div className={`benchmark-val ${gainClass(vsSpy)}`}>
                {vsSpy >= 0 ? 'Outperforming' : 'Lagging'} by {pct(Math.abs(vsSpy))}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h3>Portfolio value over time</h3>
          {series.length >= 2 && <span className="muted small">value vs. cost</span>}
        </div>
        <PerformanceChart data={series} />
      </section>

      <section className="dash-cols">
        <div className="card">
          <div className="card-head">
            <h3>Allocation</h3>
            <div className="seg">
              {[
                ['default', defaultLabel],
                ['sector', 'Sector'],
                ['asset', 'Asset class'],
              ].map(([m, label]) => (
                <button
                  key={m}
                  className={`seg-btn ${allocMode === m ? 'active' : ''}`}
                  onClick={() => setAllocMode(m)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={allocation} dataKey="value" nameKey="name" innerRadius={56} outerRadius={96} paddingAngle={2}>
                  {allocation.map((entry, i) => (
                    <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => usd(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="legend">
            {allocation.map((a, i) => (
              <li key={a.name}>
                <span className="dot" style={{ background: COLORS[i % COLORS.length] }} />
                {a.name}
                <span className="muted">{((a.value / totals.value) * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h3>Today&apos;s movers</h3>
          {movers.length === 0 ? (
            <p className="muted small">No live-priced movers yet.</p>
          ) : (
            <ul className="mover-list">
              {movers.map((m) => (
                <li key={m.id}>
                  <span className="ticker">{m.symbol}</span>
                  <span className="muted price">{usd(m.price)}</span>
                  <span className={`chip ${gainClass(m.dayPct)}`}>
                    {arrow(m.dayPct)} {pct(m.dayPct)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h3>Holdings</h3>
          <Link to="/holdings" className="link">
            Manage →
          </Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Asset</th>
                {!selectedId && <th>Portfolio</th>}
                <th className="num">Quantity</th>
                <th className="num">Avg cost</th>
                <th className="num">Price</th>
                <th className="num">Value</th>
                <th className="num">Gain/Loss</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.asset_type === 'stock' || r.asset_type === 'crypto' ? (
                      <button className="asset-link" onClick={() => setDetail(r)}>
                        {ASSET_ICON[r.asset_type] || ''} {r.symbol}
                      </button>
                    ) : (
                      <strong>
                        {ASSET_ICON[r.asset_type] || ''} {r.symbol}
                      </strong>
                    )}
                    <div className="muted small">{r.name}</div>
                  </td>
                  {!selectedId && (
                    <td className="muted small">{portfolioName[r.portfolio_id] || '—'}</td>
                  )}
                  <td className="num">{r.shares}</td>
                  <td className="num">{usd(r.buy_price)}</td>
                  <td className="num">{usd(r.price)}</td>
                  <td className="num">{usd(r.marketValue)}</td>
                  <td className={`num ${gainClass(r.gain)}`}>
                    {arrow(r.gain)} {usd(r.gain)}
                    <div className="small">{pct(r.gainPct)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {detail && <AssetDetail asset={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}
