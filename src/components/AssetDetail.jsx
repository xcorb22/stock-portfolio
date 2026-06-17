import { useEffect, useState } from 'react'
import { getCompanyNews, getMetrics, getProfile, getQuote } from '../lib/finnhub'
import { getCoin } from '../lib/coingecko'
import { compactUsd, fromUnix, gainClass, num, pct, usd } from '../lib/format'

// A row in the fundamentals grid (skips rendering if value is missing).
function Stat({ label, value }) {
  if (value === null || value === undefined || value === '' || value === '—') return null
  return (
    <div className="stat-item">
      <span className="muted small">{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

// The detail content (data fetching + rendering), usable inline or inside a modal.
export function AssetDetailBody({ asset }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError('')
      try {
        if (asset.asset_type === 'stock') {
          const [profile, metric, news, quote] = await Promise.all([
            getProfile(asset.symbol).catch(() => ({})),
            getMetrics(asset.symbol).catch(() => ({})),
            getCompanyNews(asset.symbol).catch(() => []),
            getQuote(asset.symbol).catch(() => ({})),
          ])
          if (!cancelled) setData({ kind: 'stock', profile, metric, news, quote })
        } else if (asset.asset_type === 'crypto' && asset.api_id) {
          const coin = await getCoin(asset.api_id)
          if (!cancelled) setData({ kind: 'crypto', coin })
        } else {
          if (!cancelled) setData({ kind: 'manual' })
        }
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [asset])

  return (
    <>
      <div className="modal-head">
        <div>
          <h2>{asset.symbol}</h2>
          <span className="muted">{asset.name}</span>
        </div>
      </div>

      {loading && <p className="muted">Loading…</p>}
      {error && <div className="banner error">{error}</div>}

      {!loading && data?.kind === 'stock' && <StockDetail {...data} />}
      {!loading && data?.kind === 'crypto' && <CryptoDetail coin={data.coin} />}
      {!loading && data?.kind === 'manual' && (
        <p className="muted">
          No external market data for {asset.asset_type} assets — this is a manually tracked holding.
        </p>
      )}

      <p className="muted small modal-disclaimer">
        Market data may be delayed. For informational purposes only — not financial advice.
      </p>
    </>
  )
}

// Modal wrapper around the detail body.
export default function AssetDetail({ asset, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="Close (Esc)">
          ✕
        </button>
        <AssetDetailBody asset={asset} />
      </div>
    </div>
  )
}

function StockDetail({ profile, metric, news, quote }) {
  const price = quote.c
  const dp = quote.dp
  return (
    <>
      <div className="detail-price">
        {price ? <span className="big">{usd(price)}</span> : null}
        {Number.isFinite(dp) && dp !== 0 ? (
          <span className={`chip ${gainClass(dp)}`}>{pct(dp)}</span>
        ) : null}
      </div>

      <div className="stat-item-grid">
        <Stat label="Sector" value={profile.finnhubIndustry} />
        <Stat label="Exchange" value={profile.exchange} />
        <Stat
          label="Market cap"
          value={profile.marketCapitalization ? compactUsd(profile.marketCapitalization * 1e6) : null}
        />
        <Stat label="P/E (TTM)" value={num(metric.peTTM)} />
        <Stat label="EPS (TTM)" value={metric.epsTTM ? usd(metric.epsTTM) : null} />
        <Stat label="Beta" value={num(metric.beta)} />
        <Stat label="P/B" value={num(metric.pbAnnual ?? metric.pbQuarterly)} />
        <Stat label="ROE (TTM)" value={metric.roeTTM ? `${num(metric.roeTTM)}%` : null} />
        <Stat
          label="Div yield"
          value={
            metric.dividendYieldIndicatedAnnual
              ? `${num(metric.dividendYieldIndicatedAnnual)}%`
              : null
          }
        />
        <Stat label="52-wk high" value={metric['52WeekHigh'] ? usd(metric['52WeekHigh']) : null} />
        <Stat label="52-wk low" value={metric['52WeekLow'] ? usd(metric['52WeekLow']) : null} />
        <Stat
          label="52-wk return"
          value={
            Number.isFinite(metric['52WeekPriceReturnDaily'])
              ? pct(metric['52WeekPriceReturnDaily'])
              : null
          }
        />
      </div>

      {profile.weburl && (
        <a className="link" href={profile.weburl} target="_blank" rel="noreferrer">
          Company website ↗
        </a>
      )}

      <h3 className="detail-section">Recent news</h3>
      {news.length === 0 ? (
        <p className="muted small">No recent news found.</p>
      ) : (
        <ul className="news-list">
          {news.map((n) => (
            <li key={n.id || n.url}>
              <a href={n.url} target="_blank" rel="noreferrer">
                {n.headline}
              </a>
              <span className="muted small">
                {n.source} · {fromUnix(n.datetime)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function CryptoDetail({ coin }) {
  const md = coin.market_data || {}
  const price = md.current_price?.usd
  const dp = md.price_change_percentage_24h
  const desc = (coin.description?.en || '').replace(/<[^>]+>/g, '').trim()
  return (
    <>
      <div className="detail-price">
        {price ? <span className="big">{usd(price)}</span> : null}
        {Number.isFinite(dp) ? <span className={`chip ${gainClass(dp)}`}>{pct(dp)}</span> : null}
      </div>

      <div className="stat-item-grid">
        <Stat label="Market cap rank" value={coin.market_cap_rank ? `#${coin.market_cap_rank}` : null} />
        <Stat label="Market cap" value={compactUsd(md.market_cap?.usd)} />
        <Stat label="24h high" value={md.high_24h?.usd ? usd(md.high_24h.usd) : null} />
        <Stat label="24h low" value={md.low_24h?.usd ? usd(md.low_24h.usd) : null} />
        <Stat label="All-time high" value={md.ath?.usd ? usd(md.ath.usd) : null} />
        <Stat
          label="From ATH"
          value={Number.isFinite(md.ath_change_percentage?.usd) ? pct(md.ath_change_percentage.usd) : null}
        />
        <Stat label="Circulating" value={md.circulating_supply ? num(md.circulating_supply, 0) : null} />
        <Stat label="Max supply" value={md.max_supply ? num(md.max_supply, 0) : null} />
      </div>

      {coin.links?.homepage?.[0] && (
        <a className="link" href={coin.links.homepage[0]} target="_blank" rel="noreferrer">
          Project website ↗
        </a>
      )}

      {desc && (
        <>
          <h3 className="detail-section">About</h3>
          <p className="muted small">
            {desc.slice(0, 360)}
            {desc.length > 360 ? '…' : ''}
          </p>
        </>
      )}
    </>
  )
}
