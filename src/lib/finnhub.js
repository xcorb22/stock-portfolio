// Thin wrapper around the Finnhub REST API (https://finnhub.io/docs/api).
// The free tier covers real-time US quotes, symbol search and company profiles.

const TOKEN = import.meta.env.VITE_FINNHUB_API_KEY
const BASE = 'https://finnhub.io/api/v1'

export const isFinnhubConfigured = Boolean(TOKEN)

async function get(path, params = {}) {
  if (!TOKEN) throw new Error('Finnhub API key is missing. Add VITE_FINNHUB_API_KEY to .env')
  const query = new URLSearchParams({ ...params, token: TOKEN }).toString()
  const res = await fetch(`${BASE}${path}?${query}`)
  if (res.status === 429) throw new Error('Finnhub rate limit hit — wait a moment and retry.')
  if (!res.ok) throw new Error(`Finnhub request failed (${res.status})`)
  return res.json()
}

// Real-time quote: { c: current, d: change, dp: %change, h, l, o, pc: prevClose }
export function getQuote(symbol) {
  return get('/quote', { symbol: symbol.toUpperCase() })
}

// Search symbols by name or ticker.
// Finnhub's free tier prices US stocks AND ETFs, so keep equity-like
// instruments (incl. ETFs/ETPs) and just drop noise like warrants/bonds.
// `type` comes back empty ('') for some valid US listings, so allow that too.
const SEARCHABLE_TYPES = ['Common Stock', 'ETP', 'ETF', 'REIT', 'ADR', 'Mutual Fund', '']
export async function searchSymbols(query) {
  const data = await get('/search', { q: query })
  return (data.result || [])
    .filter((r) => SEARCHABLE_TYPES.includes(r.type ?? ''))
    .slice(0, 12)
}

// Company profile (name, logo, industry, exchange, market cap, etc.)
export function getProfile(symbol) {
  return get('/stock/profile2', { symbol: symbol.toUpperCase() })
}

// Basic financials / fundamentals (P/E, beta, 52-week range, margins, etc.)
export async function getMetrics(symbol) {
  const data = await get('/stock/metric', { symbol: symbol.toUpperCase(), metric: 'all' })
  return data.metric || {}
}

// Recent company news (last ~2 weeks). Returns up to `limit` articles.
export async function getCompanyNews(symbol, limit = 8) {
  const to = new Date().toISOString().slice(0, 10)
  const from = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10)
  const data = await get('/company-news', { symbol: symbol.toUpperCase(), from, to })
  return Array.isArray(data) ? data.slice(0, limit) : []
}

// Fetch quotes for many symbols at once (sequential-ish via Promise.all).
export async function getQuotes(symbols) {
  const entries = await Promise.all(
    symbols.map(async (s) => {
      try {
        return [s, await getQuote(s)]
      } catch {
        return [s, null]
      }
    })
  )
  return Object.fromEntries(entries)
}
