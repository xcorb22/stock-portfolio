import { useEffect, useMemo, useState } from 'react'
import StockSearch from '../components/StockSearch'
import { addWatch, fetchWatchlist, removeWatch } from '../lib/api'
import useQuotes from '../hooks/useQuotes'
import { arrow, gainClass, pct, usd } from '../lib/format'

export default function Watchlist() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () =>
    fetchWatchlist()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
  }, [])

  const symbols = useMemo(() => items.map((i) => i.symbol), [items])
  const { quotes, loading: quotesLoading, refresh } = useQuotes(symbols)

  const onAdd = async ({ symbol, name }) => {
    setError('')
    try {
      const row = await addWatch(symbol, name)
      setItems((xs) => [row, ...xs])
    } catch (e) {
      if (e.code === '23505') setError(`${symbol} is already on your watchlist.`)
      else setError(e.message)
    }
  }

  const onRemove = async (id) => {
    try {
      await removeWatch(id)
      setItems((xs) => xs.filter((x) => x.id !== id))
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Watchlist</h1>
        <button className="btn ghost" onClick={refresh} disabled={quotesLoading}>
          {quotesLoading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {error && <div className="banner error">{error}</div>}

      <section className="card">
        <h3>Add to watchlist</h3>
        <StockSearch onSelect={onAdd} placeholder="Search a stock to bookmark…" />
      </section>

      <section className="card">
        <h3>Bookmarked stocks</h3>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : items.length === 0 ? (
          <p className="muted">Nothing bookmarked yet.</p>
        ) : (
          <div className="watch-grid">
            {items.map((it) => {
              const q = quotes[it.symbol.toUpperCase()] || {}
              return (
                <div className="watch-card" key={it.id}>
                  <div className="watch-top">
                    <div>
                      <strong className="ticker">{it.symbol}</strong>
                      <div className="muted small">{it.name}</div>
                    </div>
                    <button
                      className="icon-btn danger"
                      title="Remove"
                      onClick={() => onRemove(it.id)}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="watch-price">{usd(q.c || 0)}</div>
                  <div className={`chip ${gainClass(q.d || 0)}`}>
                    {arrow(q.d || 0)} {usd(q.d || 0)} ({pct(q.dp || 0)})
                  </div>
                  <div className="watch-meta muted small">
                    <span>O {usd(q.o || 0)}</span>
                    <span>H {usd(q.h || 0)}</span>
                    <span>L {usd(q.l || 0)}</span>
                    <span>Prev {usd(q.pc || 0)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
