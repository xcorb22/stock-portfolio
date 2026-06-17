import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteTransaction, fetchTransactions } from '../lib/api'
import { usePortfolios } from '../context/PortfolioContext'
import { arrow, gainClass, pct, usd } from '../lib/format'

const ASSET_ICON = { stock: '📈', crypto: '🪙', cash: '💵', other: '🏷️' }

export default function History() {
  const { portfolios, selectedId } = usePortfolios()
  const [txns, setTxns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () =>
    fetchTransactions(selectedId)
      .then(setTxns)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))

  useEffect(() => {
    setLoading(true)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const portfolioName = useMemo(() => {
    const map = {}
    portfolios.forEach((p) => (map[p.id] = p.name))
    return map
  }, [portfolios])

  const totals = useMemo(
    () =>
      txns.reduce(
        (acc, t) => {
          const proceeds = t.shares * t.sell_price
          const cost = t.shares * t.buy_price
          acc.proceeds += proceeds
          acc.cost += cost
          acc.realized += Number(t.realized_pnl)
          return acc
        },
        { proceeds: 0, cost: 0, realized: 0 }
      ),
    [txns]
  )
  const realizedPct = totals.cost ? (totals.realized / totals.cost) * 100 : 0

  const onDelete = async (id) => {
    if (!confirm('Delete this transaction record? (This does not restore the sold shares.)')) return
    try {
      await deleteTransaction(id)
      setTxns((xs) => xs.filter((x) => x.id !== id))
    } catch (e) {
      setError(e.message)
    }
  }

  if (loading) return <div className="centered muted">Loading…</div>

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>History</h1>
          <span className="muted">
            Realized gains · {selectedId ? portfolioName[selectedId] : 'All portfolios'}
          </span>
        </div>
      </div>

      {error && <div className="banner error">{error}</div>}

      <section className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Realized P&amp;L</span>
          <span className={`stat-value ${gainClass(totals.realized)}`}>
            {arrow(totals.realized)} {usd(totals.realized)} <small>({pct(realizedPct)})</small>
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total proceeds</span>
          <span className="stat-value">{usd(totals.proceeds)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Cost of sold</span>
          <span className="stat-value">{usd(totals.cost)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Sales recorded</span>
          <span className="stat-value">{txns.length}</span>
        </div>
      </section>

      <section className="card">
        <h3>Sales</h3>
        {txns.length === 0 ? (
          <p className="muted">
            No sales recorded yet. Sell a lot from your{' '}
            <Link to="/holdings" className="link">
              Holdings
            </Link>{' '}
            to record realized gains.
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Asset</th>
                  {!selectedId && <th>Portfolio</th>}
                  <th className="num">Qty</th>
                  <th className="num">Sell price</th>
                  <th className="num">Cost basis</th>
                  <th className="num">Proceeds</th>
                  <th className="num">Realized</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t) => {
                  const proceeds = t.shares * t.sell_price
                  const cost = t.shares * t.buy_price
                  const rpct = cost ? (Number(t.realized_pnl) / cost) * 100 : 0
                  return (
                    <tr key={t.id}>
                      <td>{t.txn_date}</td>
                      <td>
                        <strong>
                          {ASSET_ICON[t.asset_type] || ''} {t.symbol}
                        </strong>
                        <div className="muted small">{t.name}</div>
                      </td>
                      {!selectedId && (
                        <td className="muted small">{portfolioName[t.portfolio_id] || '—'}</td>
                      )}
                      <td className="num">{t.shares}</td>
                      <td className="num">{usd(t.sell_price)}</td>
                      <td className="num">{usd(t.buy_price)}</td>
                      <td className="num">{usd(proceeds)}</td>
                      <td className={`num ${gainClass(t.realized_pnl)}`}>
                        {arrow(t.realized_pnl)} {usd(t.realized_pnl)}
                        <div className="small">{pct(rpct)}</div>
                      </td>
                      <td className="row-actions">
                        <button
                          className="icon-btn danger"
                          title="Delete record"
                          onClick={() => onDelete(t.id)}
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
