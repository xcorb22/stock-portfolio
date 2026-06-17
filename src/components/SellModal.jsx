import { useEffect, useState } from 'react'
import { arrow, gainClass, today, usd } from '../lib/format'

// Records a sale of part (or all) of a single holding lot.
// onConfirm(shares, price, date, notes) is called by the parent, which performs
// the actual sellHolding() API call.
export default function SellModal({ holding, currentPrice, onClose, onConfirm }) {
  const available = Number(holding.shares)
  const [shares, setShares] = useState(String(available))
  const [price, setPrice] = useState(currentPrice ? String(currentPrice) : String(holding.buy_price))
  const [date, setDate] = useState(today())
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const qty = Number(shares)
  const px = Number(price)
  const proceeds = qty * px
  const costBasis = qty * Number(holding.buy_price)
  const realized = proceeds - costBasis
  const realizedPct = costBasis ? (realized / costBasis) * 100 : 0

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!(qty > 0)) return setError('Enter a quantity greater than 0.')
    if (qty > available + 1e-9) return setError(`You only hold ${available} units of this lot.`)
    if (!(px >= 0)) return setError('Sell price is invalid.')
    setBusy(true)
    try {
      await onConfirm(qty, px, date, notes || null)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal sell-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="Close (Esc)">
          ✕
        </button>
        <div className="modal-head">
          <div>
            <h2>Sell {holding.symbol}</h2>
            <span className="muted">{holding.name}</span>
          </div>
        </div>

        <p className="muted small">
          Lot bought {holding.buy_date} · {available} units @ {usd(holding.buy_price)} cost
        </p>

        <form className="holding-form" onSubmit={submit}>
          <div className="field">
            <label>Quantity to sell</label>
            <input
              type="number"
              step="any"
              min="0"
              max={available}
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Sell price (per unit)</label>
            <input
              type="number"
              step="any"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Sale date</label>
            <input
              type="date"
              value={date}
              max={today()}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="field grow">
            <label>Notes (optional)</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </form>

        <div className="sell-preview">
          <div>
            <span className="muted small">Proceeds</span>
            <strong>{usd(proceeds)}</strong>
          </div>
          <div>
            <span className="muted small">Cost basis</span>
            <strong>{usd(costBasis)}</strong>
          </div>
          <div>
            <span className="muted small">Realized P&amp;L</span>
            <strong className={gainClass(realized)}>
              {arrow(realized)} {usd(realized)} ({realizedPct >= 0 ? '+' : ''}
              {realizedPct.toFixed(2)}%)
            </strong>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button className="btn primary" disabled={busy} onClick={submit}>
            {busy ? 'Recording…' : 'Record sale'}
          </button>
          <button className="btn ghost" onClick={onClose} type="button">
            Cancel
          </button>
        </div>

        <p className="muted small modal-disclaimer">
          This records a sale and reduces (or closes) the lot. Realized gains appear under History.
        </p>
      </div>
    </div>
  )
}
