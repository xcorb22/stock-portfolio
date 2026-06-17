import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  createPortfolio as apiCreate,
  deletePortfolio as apiDelete,
  fetchPortfolios,
  updatePortfolio as apiUpdate,
} from '../lib/api'
import { useAuth } from './AuthContext'

const PortfolioContext = createContext(null)

export function PortfolioProvider({ children }) {
  const { user } = useAuth()
  const [portfolios, setPortfolios] = useState([])
  const [selectedId, setSelectedId] = useState(null) // null => All (aggregated)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    if (!user) {
      setPortfolios([])
      setLoading(false)
      return
    }
    try {
      const data = await fetchPortfolios()
      setPortfolios(data)
    } catch (e) {
      // Most likely the 02_portfolios migration hasn't been run yet.
      // eslint-disable-next-line no-console
      console.warn('[portfolios] could not load — did you run supabase/02_portfolios_and_assets.sql?', e.message)
      setPortfolios([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const createPortfolio = async (name, kind) => {
    const row = await apiCreate(name, kind)
    setPortfolios((p) => [...p, row])
    return row
  }
  const renamePortfolio = async (id, patch) => {
    const row = await apiUpdate(id, patch)
    setPortfolios((p) => p.map((x) => (x.id === id ? row : x)))
    return row
  }
  const deletePortfolio = async (id) => {
    await apiDelete(id)
    setPortfolios((p) => p.filter((x) => x.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const value = {
    portfolios,
    selectedId,
    setSelectedId,
    loading,
    refresh,
    createPortfolio,
    renamePortfolio,
    deletePortfolio,
  }

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>
}

export function usePortfolios() {
  const ctx = useContext(PortfolioContext)
  if (!ctx) throw new Error('usePortfolios must be used within a PortfolioProvider')
  return ctx
}
