import { useEffect, useRef, useState } from 'react'
import { searchSymbols } from '../lib/finnhub'

// Debounced symbol search. Calls onSelect({ symbol, name }) when a result is picked.
export default function StockSearch({ onSelect, placeholder = 'Search ticker or company…' }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const boxRef = useRef(null)

  useEffect(() => {
    if (query.trim().length < 1) {
      setResults([])
      return
    }
    setLoading(true)
    setError('')
    const id = setTimeout(async () => {
      try {
        const r = await searchSymbols(query.trim())
        setResults(r)
        setOpen(true)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => clearTimeout(id)
  }, [query])

  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const pick = (r) => {
    onSelect({ symbol: r.symbol, name: r.description })
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <div className="search-box" ref={boxRef}>
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
      />
      {loading && <span className="search-spinner">…</span>}
      {open && (results.length > 0 || error) && (
        <ul className="search-results">
          {error && <li className="search-error">{error}</li>}
          {results.map((r) => (
            <li key={r.symbol} onClick={() => pick(r)}>
              <strong>{r.symbol}</strong>
              <span className="muted">{r.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
