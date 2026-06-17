import { useCallback, useEffect, useState } from 'react'
import { priceHoldings } from '../lib/prices'

// Prices a list of mixed-asset holdings and refreshes periodically.
// Returns { prices, loading, error, refresh } where prices[holding.id] = { price, dayPct }.
export default function usePrices(holdings, { refreshMs = 60000 } = {}) {
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Re-fetch only when the meaningful inputs change.
  const key = holdings
    .map((h) => `${h.id}:${h.asset_type}:${h.symbol}:${h.api_id || ''}:${h.current_price || ''}`)
    .sort()
    .join('|')

  const refresh = useCallback(async () => {
    if (holdings.length === 0) {
      setPrices({})
      return
    }
    setLoading(true)
    setError('')
    try {
      setPrices(await priceHoldings(holdings))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    refresh()
    if (!refreshMs) return
    const id = setInterval(refresh, refreshMs)
    return () => clearInterval(id)
  }, [refresh, refreshMs])

  return { prices, loading, error, refresh }
}
