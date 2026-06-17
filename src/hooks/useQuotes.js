import { useCallback, useEffect, useState } from 'react'
import { getQuotes } from '../lib/finnhub'

// Fetches (and periodically refreshes) quotes for a list of symbols.
export default function useQuotes(symbols, { refreshMs = 60000 } = {}) {
  const [quotes, setQuotes] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const key = [...new Set(symbols.map((s) => s.toUpperCase()))].sort().join(',')

  const refresh = useCallback(async () => {
    const list = key ? key.split(',') : []
    if (list.length === 0) {
      setQuotes({})
      return
    }
    setLoading(true)
    setError('')
    try {
      const q = await getQuotes(list)
      setQuotes(q)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [key])

  useEffect(() => {
    refresh()
    if (!refreshMs) return
    const id = setInterval(refresh, refreshMs)
    return () => clearInterval(id)
  }, [refresh, refreshMs])

  return { quotes, loading, error, refresh }
}
