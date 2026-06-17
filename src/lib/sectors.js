import { getProfile } from './finnhub'

// Session cache of symbol -> sector/industry (from Finnhub profile2).
const cache = new Map()

// Resolve sectors for a list of stock symbols. Fetches only the missing ones.
export async function getSectors(symbols) {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))]
  const missing = unique.filter((s) => !cache.has(s))
  await Promise.all(
    missing.map(async (s) => {
      try {
        const p = await getProfile(s)
        // ETFs/funds have no `finnhubIndustry` on the free tier — they're not
        // single companies. Label them rather than lumping into "Unknown".
        cache.set(s, p.finnhubIndustry || 'ETF / Fund')
      } catch {
        cache.set(s, 'Unknown') // genuine lookup failure (network / rate limit)
      }
    })
  )
  const out = {}
  unique.forEach((s) => (out[s] = cache.get(s) || 'Unknown'))
  return out
}
