import { useEffect, useState } from 'react'
import { getSectors } from '../lib/sectors'

// Returns a map of stock symbol -> sector. Fetches (cached) on symbol changes.
export default function useSectors(symbols) {
  const [sectors, setSectors] = useState({})
  const key = [...new Set(symbols.map((s) => s.toUpperCase()))].sort().join(',')

  useEffect(() => {
    if (!key) {
      setSectors({})
      return
    }
    let cancelled = false
    getSectors(key.split(','))
      .then((s) => !cancelled && setSectors(s))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [key])

  return sectors
}
