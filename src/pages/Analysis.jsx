import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { fetchHoldings } from '../lib/api'
import { usePortfolios } from '../context/PortfolioContext'
import usePrices from '../hooks/usePrices'
import useSectors from '../hooks/useSectors'
import { ASSET_TYPES } from '../lib/prices'
import { arrow, gainClass, pct, usd } from '../lib/format'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#a855f7', '#ef4444', '#84cc16', '#14b8a6', '#f97316']

// Bucket a holding into a sector/asset-class label.
const groupOf = (h, sectors) => {
  if (h.asset_type === 'stock') return sectors[h.symbol.toUpperCase()] || 'Unknown'
  if (h.asset_type === 'crypto') return 'Crypto'
  if (h.asset_type === 'cash') return 'Cash'
  return 'Other assets'
}

export default function Analysis() {
  const { portfolios, selectedId } = usePortfolios()
  const [holdings, setHoldings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'sector:NAME' | 'asset:SYMBOL'

  useEffect(() => {
    setLoading(true)
    fetchHoldings(selectedId)
      .then(setHoldings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [selectedId])

  const { prices } = usePrices(holdings)
  const stockSymbols = useMemo(
    () => holdings.filter((h) => h.asset_type === 'stock').map((h) => h.symbol),
    [holdings]
  )
  const sectors = useSectors(stockSymbols)

  const rows = useMemo(
    () =>
      holdings.map((h) => {
        const { price = 0 } = prices[h.id] || {}
        const marketValue = h.shares * price
        const cost = h.shares * h.buy_price
        return {
          ...h,
          price,
          marketValue,
          cost,
          gain: marketValue - cost,
          group: groupOf(h, sectors),
        }
      }),
    [holdings, prices, sectors]
  )

  const total = rows.reduce((s, r) => s + r.marketValue, 0)

  const buildAlloc = (keyFn) => {
    const g = {}
    rows.forEach((r) => {
      const k = keyFn(r)
      g[k] = (g[k] || 0) + r.marketValue
    })
    return Object.entries(g)
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
  }

  const sectorAlloc = useMemo(() => buildAlloc((r) => r.group), [rows])
  const assetAlloc = useMemo(
    () => buildAlloc((r) => ASSET_TYPES[r.asset_type]?.label || r.asset_type),
    [rows]
  )

  const sectorOptions = useMemo(() => sectorAlloc.map((s) => s.name), [sectorAlloc])
  const assetOptions = useMemo(() => [...new Set(rows.map((r) => r.symbol))].sort(), [rows])

  const tableRows = useMemo(() => {
    let list = rows
    if (filter.startsWith('sector:')) list = rows.filter((r) => r.group === filter.slice(7))
    else if (filter.startsWith('asset:')) list = rows.filter((r) => r.symbol === filter.slice(6))
    return [...list].sort((a, b) => b.marketValue - a.marketValue)
  }, [rows, filter])

  const filteredTotals = useMemo(
    () =>
      tableRows.reduce(
        (acc, r) => ({ value: acc.value + r.marketValue, gain: acc.gain + r.gain }),
        { value: 0, gain: 0 }
      ),
    [tableRows]
  )

  if (loading) return <div className="centered muted">Loading…</div>
  if (error) return <div className="banner error">{error}</div>
  if (portfolios.length === 0) {
    return (
      <div className="empty-state">
        <h2>Nothing to analyze yet</h2>
        <Link to="/portfolios" className="btn primary">
          + Create a portfolio
        </Link>
      </div>
    )
  }
  if (holdings.length === 0) {
    return (
      <div className="empty-state">
        <h2>No holdings to analyze</h2>
        <Link to="/holdings" className="btn primary">
          + Add a holding
        </Link>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Analysis</h1>
        <span className="muted">
          {selectedId ? portfolios.find((p) => p.id === selectedId)?.name : 'All portfolios'}
        </span>
      </div>

      <section className="dash-cols">
        <div className="card">
          <h3>By sector</h3>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={sectorAlloc} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {sectorAlloc.map((e, i) => (
                    <Cell key={e.name} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => usd(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="legend">
            {sectorAlloc.map((a, i) => (
              <li key={a.name}>
                <span className="dot" style={{ background: COLORS[i % COLORS.length] }} />
                {a.name}
                <span className="muted">{((a.value / total) * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h3>By asset class</h3>
          <ul className="bar-list">
            {assetAlloc.map((a, i) => (
              <li key={a.name}>
                <div className="bar-row">
                  <span>{a.name}</span>
                  <span className="muted">
                    {usd(a.value)} · {((a.value / total) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${(a.value / total) * 100}%`,
                      background: COLORS[i % COLORS.length],
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h3>Holdings</h3>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="portfolio-select">
            <option value="all">All holdings</option>
            <optgroup label="By sector">
              {sectorOptions.map((s) => (
                <option key={s} value={`sector:${s}`}>
                  {s}
                </option>
              ))}
            </optgroup>
            <optgroup label="By asset">
              {assetOptions.map((s) => (
                <option key={s} value={`asset:${s}`}>
                  {s}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Asset</th>
                <th>Sector</th>
                <th>Date</th>
                <th className="num">Value</th>
                <th className="num">Weight</th>
                <th className="num">Gain/Loss</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.symbol}</strong>
                    <div className="muted small">{r.name}</div>
                  </td>
                  <td className="muted small">{r.group}</td>
                  <td className="muted small">{r.buy_date}</td>
                  <td className="num">{usd(r.marketValue)}</td>
                  <td className="num">{total ? ((r.marketValue / total) * 100).toFixed(1) : '0.0'}%</td>
                  <td className={`num ${gainClass(r.gain)}`}>
                    {arrow(r.gain)} {usd(r.gain)}
                  </td>
                </tr>
              ))}
            </tbody>
            {filter !== 'all' && tableRows.length > 1 && (
              <tfoot>
                <tr>
                  <td colSpan={3}>
                    <strong>Total ({tableRows.length})</strong>
                  </td>
                  <td className="num">
                    <strong>{usd(filteredTotals.value)}</strong>
                  </td>
                  <td className="num">
                    {total ? ((filteredTotals.value / total) * 100).toFixed(1) : '0.0'}%
                  </td>
                  <td className={`num ${gainClass(filteredTotals.gain)}`}>
                    <strong>
                      {arrow(filteredTotals.gain)} {usd(filteredTotals.gain)}
                    </strong>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </div>
  )
}
