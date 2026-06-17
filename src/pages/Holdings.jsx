import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AssetSearch from '../components/AssetSearch'
import AssetDetail from '../components/AssetDetail'
import SellModal from '../components/SellModal'
import {
  addHolding,
  addWatch,
  deleteHolding,
  fetchHoldings,
  sellHolding,
  updateHolding,
} from '../lib/api'
import { searchSymbols } from '../lib/finnhub'
import { searchCoins } from '../lib/coingecko'
import { ASSET_TYPES } from '../lib/prices'
import { downloadCSV, parseCSV, toCSV } from '../lib/csv'
import { usePortfolios } from '../context/PortfolioContext'
import usePrices from '../hooks/usePrices'
import { arrow, gainClass, pct, today, usd } from '../lib/format'

const ASSET_ICON = { stock: '📈', crypto: '🪙', cash: '💵', other: '🏷️' }

const blankForm = (portfolioId) => ({
  asset_type: 'stock',
  portfolio_id: portfolioId || '',
  symbol: '',
  name: '',
  api_id: null,
  shares: '',
  buy_price: '',
  current_price: '',
  buy_date: today(),
  notes: '',
})

export default function Holdings() {
  const { portfolios, selectedId } = usePortfolios()
  const [holdings, setHoldings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(blankForm(selectedId))
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState(null)
  const [sellTarget, setSellTarget] = useState(null)

  const load = useCallback(
    () =>
      fetchHoldings(selectedId)
        .then(setHoldings)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false)),
    [selectedId]
  )

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  // Default the form's portfolio to the active filter (or the first portfolio).
  useEffect(() => {
    if (editingId) return
    setForm((f) => ({ ...f, portfolio_id: selectedId || portfolios[0]?.id || '' }))
  }, [selectedId, portfolios, editingId])

  const { prices } = usePrices(holdings)

  const portfolioName = useMemo(() => {
    const map = {}
    portfolios.forEach((p) => (map[p.id] = p.name))
    return map
  }, [portfolios])

  const setField = (patch) => setForm((f) => ({ ...f, ...patch }))
  const resetForm = () => {
    setForm(blankForm(selectedId || portfolios[0]?.id || ''))
    setEditingId(null)
  }

  const searchFn = useCallback(
    (q) =>
      form.asset_type === 'crypto'
        ? searchCoins(q)
        : searchSymbols(q).then((rs) => rs.map((r) => ({ symbol: r.symbol, name: r.description }))),
    [form.asset_type]
  )

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const t = form.asset_type

    let payload
    if (t === 'cash') {
      const amount = Number(form.shares)
      if (!(amount > 0)) return setError('Enter a cash amount greater than 0.')
      payload = {
        asset_type: 'cash',
        portfolio_id: form.portfolio_id,
        symbol: 'CASH',
        name: form.name?.trim() || 'Cash (USD)',
        api_id: null,
        shares: amount,
        buy_price: 1,
        current_price: 1,
        buy_date: form.buy_date,
        notes: form.notes || null,
      }
    } else if (t === 'other') {
      if (!form.name?.trim()) return setError('Give the asset a name.')
      const qty = Number(form.shares)
      if (!(qty > 0)) return setError('Quantity must be greater than 0.')
      payload = {
        asset_type: 'other',
        portfolio_id: form.portfolio_id,
        symbol: (form.symbol || form.name).slice(0, 16).toUpperCase(),
        name: form.name.trim(),
        api_id: null,
        shares: qty,
        buy_price: Number(form.buy_price) || 0,
        current_price: form.current_price === '' ? null : Number(form.current_price),
        buy_date: form.buy_date,
        notes: form.notes || null,
      }
    } else {
      // stock or crypto
      if (!form.symbol) return setError('Search and pick an asset first.')
      const shares = Number(form.shares)
      if (!(shares > 0)) return setError('Quantity must be greater than 0.')
      if (!(Number(form.buy_price) >= 0)) return setError('Buy price is invalid.')
      payload = {
        asset_type: t,
        portfolio_id: form.portfolio_id,
        symbol: form.symbol.toUpperCase(),
        name: form.name || null,
        api_id: t === 'crypto' ? form.api_id : null,
        shares,
        buy_price: Number(form.buy_price),
        current_price: null,
        buy_date: form.buy_date,
        notes: form.notes || null,
      }
    }

    if (!payload.portfolio_id) return setError('Choose a portfolio.')

    setSaving(true)
    try {
      if (editingId) await updateHolding(editingId, payload)
      else await addHolding(payload)
      resetForm()
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const onEdit = (h) => {
    setEditingId(h.id)
    setForm({
      asset_type: h.asset_type,
      portfolio_id: h.portfolio_id,
      symbol: h.symbol,
      name: h.name || '',
      api_id: h.api_id,
      shares: String(h.shares),
      buy_price: String(h.buy_price),
      current_price: h.current_price == null ? '' : String(h.current_price),
      buy_date: h.buy_date,
      notes: h.notes || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onDelete = async (id) => {
    if (!confirm('Delete this holding?')) return
    try {
      await deleteHolding(id)
      setHoldings((hs) => hs.filter((h) => h.id !== id))
    } catch (e) {
      setError(e.message)
    }
  }

  const onBookmark = async (h) => {
    try {
      await addWatch(h.symbol, h.name)
      alert(`${h.symbol} added to your watchlist.`)
    } catch (e) {
      if (e.code === '23505') alert(`${h.symbol} is already on your watchlist.`)
      else setError(e.message)
    }
  }

  const onSell = async (shares, price, date, notes) => {
    const res = await sellHolding(sellTarget, shares, price, date, notes)
    const target = sellTarget
    setSellTarget(null)
    await load()
    const verb = res.realized >= 0 ? 'gain' : 'loss'
    alert(`Sold ${shares} ${target.symbol} — realized ${verb} of ${usd(Math.abs(res.realized))}.`)
  }

  const onExport = () => {
    if (!holdings.length) return
    const cols = [
      { header: 'symbol', get: (h) => h.symbol },
      { header: 'name', get: (h) => h.name || '' },
      { header: 'asset_type', get: (h) => h.asset_type },
      { header: 'portfolio', get: (h) => portfolioName[h.portfolio_id] || '' },
      { header: 'shares', get: (h) => h.shares },
      { header: 'buy_price', get: (h) => h.buy_price },
      { header: 'buy_date', get: (h) => h.buy_date },
      { header: 'current_price', get: (h) => h.current_price ?? '' },
      { header: 'api_id', get: (h) => h.api_id ?? '' },
      { header: 'notes', get: (h) => h.notes || '' },
    ]
    downloadCSV(`holdings-${today()}.csv`, toCSV(holdings, cols))
  }

  const onImportFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    try {
      const rows = parseCSV(await file.text())
      if (!rows.length) return setError('That CSV had no data rows.')
      const byName = {}
      portfolios.forEach((p) => (byName[p.name.toLowerCase()] = p.id))
      const fallback = selectedId || portfolios[0]?.id
      let ok = 0
      let skip = 0
      for (const r of rows) {
        const at = (r.asset_type || 'stock').toLowerCase()
        const symbol = (r.symbol || '').toUpperCase()
        const shares = Number(r.shares)
        const pid = byName[(r.portfolio || '').toLowerCase()] || fallback
        if (!(shares > 0) || !pid || ((at === 'stock' || at === 'crypto') && !symbol)) {
          skip++
          continue
        }
        const payload = {
          asset_type: at,
          portfolio_id: pid,
          symbol: symbol || (r.name || 'ASSET').slice(0, 16).toUpperCase(),
          name: r.name || null,
          api_id: at === 'crypto' ? r.api_id || null : null,
          shares,
          buy_price: Number(r.buy_price) || (at === 'cash' ? 1 : 0),
          current_price:
            r.current_price !== '' && r.current_price != null
              ? Number(r.current_price)
              : at === 'cash'
                ? 1
                : null,
          buy_date: r.buy_date || today(),
          notes: r.notes || null,
        }
        try {
          await addHolding(payload)
          ok++
        } catch {
          skip++
        }
      }
      await load()
      alert(`Imported ${ok} holding(s)${skip ? `, skipped ${skip}` : ''}.`)
    } catch (err) {
      setError(err.message)
    }
  }

  if (portfolios.length === 0) {
    return (
      <div className="empty-state">
        <h2>No portfolios yet</h2>
        <p className="muted">Create a portfolio before adding holdings.</p>
        <Link to="/portfolios" className="btn primary">
          + New portfolio
        </Link>
      </div>
    )
  }

  const t = form.asset_type
  const isManual = t === 'cash' || t === 'other'

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Holdings</h1>
          <span className="muted">{selectedId ? portfolioName[selectedId] : 'All portfolios'}</span>
        </div>
        <div className="head-actions">
          <button className="btn ghost" onClick={onExport} disabled={!holdings.length}>
            ⭳ Export CSV
          </button>
          <label className="btn ghost import-label">
            ⭱ Import CSV
            <input type="file" accept=".csv,text/csv" hidden onChange={onImportFile} />
          </label>
        </div>
      </div>

      {error && <div className="banner error">{error}</div>}

      <section className="card">
        <h3>{editingId ? 'Edit holding' : 'Add a holding'}</h3>
        <form className="holding-form" onSubmit={onSubmit}>
          <div className="field">
            <label>Asset type</label>
            <select
              value={form.asset_type}
              disabled={!!editingId}
              onChange={(e) => setForm((f) => ({ ...blankForm(f.portfolio_id), asset_type: e.target.value }))}
            >
              {Object.entries(ASSET_TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {ASSET_ICON[k]} {v.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Portfolio</label>
            <select
              value={form.portfolio_id}
              onChange={(e) => setField({ portfolio_id: e.target.value })}
            >
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Asset identity */}
          {!isManual ? (
            <div className="field grow">
              <label>{t === 'crypto' ? 'Coin' : 'Stock / ETF'}</label>
              {editingId ? (
                <input value={`${form.symbol} — ${form.name}`} disabled />
              ) : (
                <>
                  <AssetSearch
                    searchFn={searchFn}
                    placeholder={t === 'crypto' ? 'Search coin (BTC, ETH…)' : 'Search ticker or company…'}
                    onSelect={(item) =>
                      setField({ symbol: item.symbol, name: item.name, api_id: item.api_id || null })
                    }
                  />
                  {form.symbol && (
                    <span className="picked">
                      Selected: <strong>{form.symbol}</strong> {form.name}
                    </span>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="field grow">
              <label>{t === 'cash' ? 'Label (optional)' : 'Asset name'}</label>
              <input
                type="text"
                placeholder={t === 'cash' ? 'e.g. Savings account' : 'e.g. Gold, Rolex, Real estate'}
                value={form.name}
                onChange={(e) => setField({ name: e.target.value })}
              />
            </div>
          )}

          {/* Quantity / amount */}
          <div className="field">
            <label>{t === 'cash' ? 'Amount (USD)' : 'Quantity'}</label>
            <input
              type="number"
              step="any"
              min="0"
              value={form.shares}
              onChange={(e) => setField({ shares: e.target.value })}
              required
            />
          </div>

          {/* Cost basis (hidden for cash, which is 1:1) */}
          {t !== 'cash' && (
            <div className="field">
              <label>{t === 'other' ? 'Cost (per unit)' : 'Buy price (per unit)'}</label>
              <input
                type="number"
                step="any"
                min="0"
                value={form.buy_price}
                onChange={(e) => setField({ buy_price: e.target.value })}
                required={!isManual}
              />
            </div>
          )}

          {/* Manual current value for "other" */}
          {t === 'other' && (
            <div className="field">
              <label>Current value (per unit)</label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="defaults to cost"
                value={form.current_price}
                onChange={(e) => setField({ current_price: e.target.value })}
              />
            </div>
          )}

          <div className="field">
            <label>{t === 'cash' ? 'As of date' : 'Buy date'}</label>
            <input
              type="date"
              value={form.buy_date}
              max={today()}
              onChange={(e) => setField({ buy_date: e.target.value })}
              required
            />
          </div>

          <div className="field grow">
            <label>Notes (optional)</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setField({ notes: e.target.value })}
            />
          </div>

          <div className="form-actions">
            <button className="btn primary" disabled={saving} type="submit">
              {saving ? 'Saving…' : editingId ? 'Save changes' : '+ Add holding'}
            </button>
            {editingId && (
              <button className="btn ghost" type="button" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="card">
        <h3>Holdings</h3>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : holdings.length === 0 ? (
          <p className="muted">No holdings yet — add one above.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  {!selectedId && <th>Portfolio</th>}
                  <th>Date</th>
                  <th className="num">Qty</th>
                  <th className="num">Cost</th>
                  <th className="num">Price</th>
                  <th className="num">Value</th>
                  <th className="num">Gain/Loss</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => {
                  const { price = 0 } = prices[h.id] || {}
                  const value = h.shares * price
                  const cost = h.shares * h.buy_price
                  const gain = value - cost
                  const canBookmark = h.asset_type === 'stock'
                  const canSell = h.asset_type !== 'cash'
                  return (
                    <tr key={h.id}>
                      <td>
                        {h.asset_type === 'stock' || h.asset_type === 'crypto' ? (
                          <button className="asset-link" onClick={() => setDetail(h)}>
                            {ASSET_ICON[h.asset_type] || ''} {h.symbol}
                          </button>
                        ) : (
                          <strong>
                            {ASSET_ICON[h.asset_type] || ''} {h.symbol}
                          </strong>
                        )}
                        <div className="muted small">{h.name}</div>
                      </td>
                      {!selectedId && (
                        <td className="muted small">{portfolioName[h.portfolio_id] || '—'}</td>
                      )}
                      <td>{h.buy_date}</td>
                      <td className="num">{h.shares}</td>
                      <td className="num">{usd(h.buy_price)}</td>
                      <td className="num">{usd(price)}</td>
                      <td className="num">{usd(value)}</td>
                      <td className={`num ${gainClass(gain)}`}>
                        {arrow(gain)} {usd(gain)}
                        <div className="small">{pct(cost ? (gain / cost) * 100 : 0)}</div>
                      </td>
                      <td className="row-actions">
                        {canSell && (
                          <button className="icon-btn sell" title="Sell" onClick={() => setSellTarget(h)}>
                            Sell
                          </button>
                        )}
                        {canBookmark && (
                          <button className="icon-btn" title="Bookmark" onClick={() => onBookmark(h)}>
                            ☆
                          </button>
                        )}
                        <button className="icon-btn" title="Edit" onClick={() => onEdit(h)}>
                          ✎
                        </button>
                        <button
                          className="icon-btn danger"
                          title="Delete"
                          onClick={() => onDelete(h.id)}
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detail && <AssetDetail asset={detail} onClose={() => setDetail(null)} />}
      {sellTarget && (
        <SellModal
          holding={sellTarget}
          currentPrice={prices[sellTarget.id]?.price}
          onClose={() => setSellTarget(null)}
          onConfirm={onSell}
        />
      )}
    </div>
  )
}
