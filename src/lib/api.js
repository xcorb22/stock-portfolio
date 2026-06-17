import { supabase } from './supabase'

// ---------------- Portfolios ----------------
export async function fetchPortfolios() {
  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createPortfolio(name, kind = 'mixed') {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('portfolios')
    .insert({ name, kind, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePortfolio(id, patch) {
  const { data, error } = await supabase
    .from('portfolios')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePortfolio(id) {
  // Holdings cascade-delete via the FK.
  const { error } = await supabase.from('portfolios').delete().eq('id', id)
  if (error) throw error
}

// ---------------- Holdings ----------------
// Pass a portfolioId to scope to one portfolio, or omit/null for all.
export async function fetchHoldings(portfolioId = null) {
  let query = supabase.from('holdings').select('*').order('buy_date', { ascending: false })
  if (portfolioId) query = query.eq('portfolio_id', portfolioId)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function addHolding(holding) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('holdings')
    .insert({ ...holding, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateHolding(id, patch) {
  const { data, error } = await supabase
    .from('holdings')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteHolding(id) {
  const { error } = await supabase.from('holdings').delete().eq('id', id)
  if (error) throw error
}

// ---------------- Transactions (sells / realized P&L) ----------------
export async function fetchTransactions(portfolioId = null) {
  let query = supabase.from('transactions').select('*').order('txn_date', { ascending: false })
  if (portfolioId) query = query.eq('portfolio_id', portfolioId)
  const { data, error } = await query
  if (error) throw error
  return data
}

// Sell `sharesToSell` units out of a single holding (lot). Records a transaction
// with realized P&L and reduces (or closes) the lot. Not a DB transaction —
// fine for a personal app, but the insert happens before the lot is adjusted.
export async function sellHolding(holding, sharesToSell, sellPrice, txnDate, notes = null) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const shares = Number(sharesToSell)
  const price = Number(sellPrice)
  const realized = (price - Number(holding.buy_price)) * shares

  const { error: insertErr } = await supabase.from('transactions').insert({
    user_id: user.id,
    portfolio_id: holding.portfolio_id,
    symbol: holding.symbol,
    name: holding.name,
    asset_type: holding.asset_type,
    shares,
    sell_price: price,
    buy_price: holding.buy_price,
    realized_pnl: realized,
    txn_date: txnDate,
    notes,
  })
  if (insertErr) throw insertErr

  const remaining = Number(holding.shares) - shares
  if (remaining <= 1e-9) {
    const { error } = await supabase.from('holdings').delete().eq('id', holding.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('holdings').update({ shares: remaining }).eq('id', holding.id)
    if (error) throw error
  }
  return { realized, remaining: remaining <= 1e-9 ? 0 : remaining }
}

export async function deleteTransaction(id) {
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
}

// ---------------- Snapshots (performance history) ----------------
export async function fetchSnapshots(portfolioId = null) {
  let query = supabase
    .from('portfolio_snapshots')
    .select('*')
    .order('snapshot_date', { ascending: true })
  if (portfolioId) query = query.eq('portfolio_id', portfolioId)
  const { data, error } = await query
  if (error) throw error
  return data
}

// rows: [{ portfolio_id, snapshot_date, value, cost }]
export async function upsertSnapshots(rows) {
  if (!rows.length) return
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const payload = rows.map((r) => ({ ...r, user_id: user.id }))
  const { error } = await supabase
    .from('portfolio_snapshots')
    .upsert(payload, { onConflict: 'user_id,portfolio_id,snapshot_date' })
  if (error) throw error
}

// ---------------- Watchlist ----------------
export async function fetchWatchlist() {
  const { data, error } = await supabase
    .from('watchlist')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addWatch(symbol, name) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('watchlist')
    .insert({ symbol: symbol.toUpperCase(), name, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removeWatch(id) {
  const { error } = await supabase.from('watchlist').delete().eq('id', id)
  if (error) throw error
}
