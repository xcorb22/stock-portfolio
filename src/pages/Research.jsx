import { useCallback, useState } from 'react'
import AssetSearch from '../components/AssetSearch'
import { AssetDetailBody } from '../components/AssetDetail'
import { searchSymbols } from '../lib/finnhub'
import { searchCoins } from '../lib/coingecko'

const QUICK_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc' },
  { symbol: 'MSFT', name: 'Microsoft Corp' },
  { symbol: 'NVDA', name: 'NVIDIA Corp' },
  { symbol: 'TSLA', name: 'Tesla Inc' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF' },
]
const QUICK_COINS = [
  { symbol: 'BTC', name: 'Bitcoin', api_id: 'bitcoin' },
  { symbol: 'ETH', name: 'Ethereum', api_id: 'ethereum' },
  { symbol: 'SOL', name: 'Solana', api_id: 'solana' },
]

export default function Research() {
  const [mode, setMode] = useState('stock') // stock | crypto
  const [picked, setPicked] = useState(null)

  const searchFn = useCallback(
    (q) =>
      mode === 'crypto'
        ? searchCoins(q)
        : searchSymbols(q).then((rs) => rs.map((r) => ({ symbol: r.symbol, name: r.description }))),
    [mode]
  )

  const choose = (item) =>
    setPicked({
      symbol: item.symbol,
      name: item.name,
      asset_type: mode,
      api_id: item.api_id || null,
    })

  const quick = mode === 'crypto' ? QUICK_COINS : QUICK_STOCKS

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Research</h1>
          <span className="muted">Look up any stock, ETF or coin — no need to own it.</span>
        </div>
      </div>

      <section className="card">
        <div className="card-head">
          <h3>Find an asset</h3>
          <div className="seg">
            <button
              className={`seg-btn ${mode === 'stock' ? 'active' : ''}`}
              onClick={() => {
                setMode('stock')
                setPicked(null)
              }}
            >
              📈 Stocks / ETFs
            </button>
            <button
              className={`seg-btn ${mode === 'crypto' ? 'active' : ''}`}
              onClick={() => {
                setMode('crypto')
                setPicked(null)
              }}
            >
              🪙 Crypto
            </button>
          </div>
        </div>

        <AssetSearch
          key={mode}
          searchFn={searchFn}
          onSelect={choose}
          placeholder={mode === 'crypto' ? 'Search a coin (BTC, ETH…)' : 'Search ticker or company…'}
        />

        <div className="quick-picks">
          <span className="muted small">Popular:</span>
          {quick.map((q) => (
            <button key={q.symbol} className="chip-btn" onClick={() => choose(q)}>
              {q.symbol}
            </button>
          ))}
        </div>
      </section>

      {picked && (
        <section className="card">
          <AssetDetailBody key={`${picked.symbol}-${picked.api_id}`} asset={picked} />
        </section>
      )}
    </div>
  )
}
