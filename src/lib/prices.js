import { getQuotes } from './finnhub'
import { getCoinPrices } from './coingecko'

// Asset-type metadata used across the UI.
export const ASSET_TYPES = {
  stock: { label: 'Stock / ETF', live: true },
  crypto: { label: 'Crypto', live: true },
  cash: { label: 'Cash', live: false },
  other: { label: 'Other asset', live: false },
}

// Given a list of holdings (mixed asset types), fetch a price for each and
// return a map keyed by holding id: { price, dayPct }.
//   - stock  -> Finnhub quote (current price `c`, % change `dp`)
//   - crypto -> CoinGecko (usd, usd_24h_change)
//   - cash   -> always 1 (value == amount)
//   - other  -> manual current_price (falls back to buy_price)
export async function priceHoldings(holdings) {
  const stockSymbols = [
    ...new Set(holdings.filter((h) => h.asset_type === 'stock').map((h) => h.symbol.toUpperCase())),
  ]
  const coinIds = [
    ...new Set(holdings.filter((h) => h.asset_type === 'crypto' && h.api_id).map((h) => h.api_id)),
  ]

  const [quotes, coins] = await Promise.all([
    stockSymbols.length ? getQuotes(stockSymbols) : Promise.resolve({}),
    coinIds.length ? getCoinPrices(coinIds) : Promise.resolve({}),
  ])

  const out = {}
  for (const h of holdings) {
    if (h.asset_type === 'crypto') {
      const c = coins[h.api_id] || {}
      out[h.id] = { price: c.usd || 0, dayPct: c.usd_24h_change || 0 }
    } else if (h.asset_type === 'cash') {
      out[h.id] = { price: 1, dayPct: 0 }
    } else if (h.asset_type === 'other') {
      out[h.id] = { price: Number(h.current_price ?? h.buy_price) || 0, dayPct: 0 }
    } else {
      const q = quotes[h.symbol.toUpperCase()] || {}
      out[h.id] = { price: q.c || 0, dayPct: q.dp || 0 }
    }
  }
  return out
}
