import { useState } from 'react'
import { usePortfolios } from '../context/PortfolioContext'

const KINDS = [
  { value: 'stocks', label: '📈 Stocks / ETFs' },
  { value: 'crypto', label: '🪙 Crypto' },
  { value: 'cash', label: '💵 Cash' },
  { value: 'other', label: '🏷️ Other assets' },
  { value: 'mixed', label: '🧺 Mixed' },
]

const kindLabel = (k) => KINDS.find((x) => x.value === k)?.label || k

export default function Portfolios() {
  const { portfolios, loading, createPortfolio, renamePortfolio, deletePortfolio } = usePortfolios()
  const [name, setName] = useState('')
  const [kind, setKind] = useState('stocks')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')

  const onCreate = async (e) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Give your portfolio a name.')
    setBusy(true)
    try {
      await createPortfolio(name.trim(), kind)
      setName('')
      setKind('stocks')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const saveRename = async (id) => {
    if (editName.trim()) await renamePortfolio(id, { name: editName.trim() })
    setEditId(null)
  }

  const onDelete = async (p) => {
    if (
      !confirm(`Delete "${p.name}"? All holdings inside it will also be deleted. This cannot be undone.`)
    )
      return
    try {
      await deletePortfolio(p.id)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Portfolios</h1>
      </div>

      {error && <div className="banner error">{error}</div>}

      <section className="card">
        <h3>Create a portfolio</h3>
        <form className="holding-form" onSubmit={onCreate}>
          <div className="field grow">
            <label>Name</label>
            <input
              type="text"
              placeholder="e.g. Long-term stocks, Crypto, Emergency cash…"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Type</label>
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <button className="btn primary" disabled={busy} type="submit">
              {busy ? 'Creating…' : '+ Create'}
            </button>
          </div>
        </form>
        <p className="muted small">
          The type is just a label — you can add any asset (stock, crypto, cash or other) to any
          portfolio.
        </p>
      </section>

      <section className="card">
        <h3>Your portfolios</h3>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : portfolios.length === 0 ? (
          <p className="muted">No portfolios yet — create one above to start adding holdings.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {portfolios.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {editId === p.id ? (
                        <input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveRename(p.id)}
                        />
                      ) : (
                        <strong>{p.name}</strong>
                      )}
                    </td>
                    <td className="muted">{kindLabel(p.kind)}</td>
                    <td className="row-actions">
                      {editId === p.id ? (
                        <>
                          <button className="icon-btn" onClick={() => saveRename(p.id)}>
                            ✓
                          </button>
                          <button className="icon-btn" onClick={() => setEditId(null)}>
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="icon-btn"
                            title="Rename"
                            onClick={() => {
                              setEditId(p.id)
                              setEditName(p.name)
                            }}
                          >
                            ✎
                          </button>
                          <button
                            className="icon-btn danger"
                            title="Delete"
                            onClick={() => onDelete(p)}
                          >
                            🗑
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
