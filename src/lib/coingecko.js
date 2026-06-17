// Wrapper around CoinGecko's free public API (https://www.coingecko.com/api).
// No API key required. Used for crypto search + USD prices.
// Note: CoinGecko identifies coins by an "id" (e.g. "bitcoin"), not the ticker,
// so crypto holdings store that id in `api_id`.

const BASE = 'https://api.coingecko.com/api/v3'

async function cg(path, params = {}) {
  const query = new URLSearchParams(params).toString()
  const res = await fetch(`${BASE}${path}${query ? `?${query}` : ''}`)
  if (res.status === 429) throw new Error('CoinGecko rate limit hit — wait a moment and retry.')
  if (!res.ok) throw new Error(`CoinGecko request failed (${res.status})`)
  return res.json()
}

// Search coins by name/ticker. Returns normalized { symbol, name, api_id }.
export async function searchCoins(query) {
  const data = await cg('/search', { query })
  return (data.coins || []).slice(0, 12).map((c) => ({
    symbol: (c.symbol || '').toUpperCase(),
    name: c.name,
    api_id: c.id,
  }))
}

// Prices for a list of CoinGecko ids -> { id: { usd, usd_24h_change } }
export async function getCoinPrices(ids) {
  if (!ids.length) return {}
  return cg('/simple/price', {
    ids: ids.join(','),
    vs_currencies: 'usd',
    include_24hr_change: 'true',
  })
}

// Full detail for a single coin (market data, supply, ATH, links, description).
export async function getCoin(id) {
  return cg(`/coins/${id}`, {
    localization: 'false',
    tickers: 'false',
    market_data: 'true',
    community_data: 'false',
    developer_data: 'false',
  })
}
