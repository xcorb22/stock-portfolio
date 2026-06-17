export const usd = (n) =>
  (Number.isFinite(n) ? n : 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export const pct = (n) => `${n >= 0 ? '+' : ''}${(Number.isFinite(n) ? n : 0).toFixed(2)}%`

export const signed = (n) => `${n >= 0 ? '+' : ''}${usd(n).replace('$', '$')}`

export const gainClass = (n) => (n > 0 ? 'pos' : n < 0 ? 'neg' : 'flat')

// Colorblind-safe directional cue to pair with green/red.
export const arrow = (n) => (n > 0 ? '▲' : n < 0 ? '▼' : '→')

export const today = () => new Date().toISOString().slice(0, 10)

// Compact currency for big numbers (market cap, volume): $4.36T, $812.4B, $1.2M
export const compactUsd = (n) => {
  if (!Number.isFinite(n) || n === 0) return '—'
  const abs = Math.abs(n)
  const units = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ]
  for (const [v, s] of units) {
    if (abs >= v) return `$${(n / v).toFixed(2)}${s}`
  }
  return usd(n)
}

// Format a number nicely (handles undefined/null gracefully).
export const num = (n, digits = 2) =>
  Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: digits }) : '—'

// Unix seconds -> short date string.
export const fromUnix = (s) => (s ? new Date(s * 1000).toLocaleDateString('en-US') : '')
