import { fetchCryptoPrices } from './coinGecko'
import { fetchStockPrices } from './twelveData'
import { ASSET_TYPES, LS_LAST_PRICES, LS_EUR_USD_RATE } from '../constants'

function loadLastPrices() {
  try {
    return JSON.parse(localStorage.getItem(LS_LAST_PRICES) ?? '{}')
  } catch {
    return {}
  }
}

function saveLastPrices(prices) {
  try {
    localStorage.setItem(LS_LAST_PRICES, JSON.stringify(prices))
  } catch {}
}

export async function refreshPrices(positions) {
  const cryptoSymbols = positions
    .filter((p) => p.type === ASSET_TYPES.CRYPTO)
    .map((p) => p.symbol)

  const stockSymbols = positions
    .filter((p) => p.type === ASSET_TYPES.STOCK || p.type === ASSET_TYPES.ETF)
    .map((p) => p.symbol)

  const stored = loadLastPrices()
  const now = new Date().toISOString()
  const updated = { ...stored }

  // Cripto — CoinGecko (sin clave, sin límite práctico)
  if (cryptoSymbols.length > 0) {
    try {
      const prices = await fetchCryptoPrices(cryptoSymbols)
      for (const [sym, price] of Object.entries(prices)) {
        updated[sym] = { price, updatedAt: now }
      }
    } catch (err) {
      console.warn('CoinGecko falló:', err.message)
    }
  }

  // Acciones / ETFs
  if (stockSymbols.length > 0) {
    const unique = deduplicateSymbols(stockSymbols)

    // Solo actualizar los que tienen precio obsoleto (> 5 min)
    const stale = unique.filter((sym) => {
      const entry = stored[sym.toUpperCase()]
      if (!entry?.updatedAt) return true
      return Date.now() - new Date(entry.updatedAt).getTime() > 5 * 60 * 1000
    })

    if (stale.length > 0) {
      // Paso 1: intentar con Twelve Data en lotes
      const failedSymbols = []
      const chunks = chunkArray(stale, 8)

      for (let i = 0; i < chunks.length; i++) {
        if (i > 0) await sleep(8000)
        try {
          const prices = await fetchStockPrices(chunks[i])
          // Los que no vinieron en la respuesta → fallback Yahoo
          for (const sym of chunks[i]) {
            if (prices[sym.toUpperCase()] != null) {
              updated[sym.toUpperCase()] = { price: prices[sym.toUpperCase()], updatedAt: now }
            } else {
              failedSymbols.push(sym)
            }
          }
        } catch {
          // Chunk entero falló (429, plan, etc.) → todo va a Yahoo
          failedSymbols.push(...chunks[i])
        }
      }

      // Símbolos que fallaron — se usará precio manual si el usuario lo ha introducido
      if (failedSymbols.length > 0) {
        console.info('Sin precio automático para:', failedSymbols, '— usar precio manual en la app')
      }
    }
  }

  saveLastPrices(updated)
  return getLastKnownPrices() // incluye precios manuales
}

export function getLastKnownPrices() {
  const auto = loadLastPrices()
  // Mezclar con precios manuales (manual tiene menor prioridad que API)
  try {
    const manual = JSON.parse(localStorage.getItem('gestion_inv_manual_prices') ?? '{}')
    for (const [sym, entry] of Object.entries(manual)) {
      if (!auto[sym]) auto[sym] = entry  // solo si la API no tiene ese símbolo
    }
  } catch {}
  return auto
}

export async function fetchEurUsdRate() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    if (!res.ok) throw new Error('rate fetch failed')
    const data = await res.json()
    const rate = data.rates?.EUR
    if (!rate) throw new Error('no EUR rate')
    const eurUsdRate = 1 / rate
    localStorage.setItem(LS_EUR_USD_RATE, String(eurUsdRate))
    return eurUsdRate
  } catch {
    const cached = localStorage.getItem(LS_EUR_USD_RATE)
    return cached ? parseFloat(cached) : 1.08
  }
}

function chunkArray(arr, size) {
  const chunks = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function deduplicateSymbols(symbols) {
  const byBase = new Map()
  for (const sym of symbols) {
    const base = sym.split(':')[0].toUpperCase()
    if (!byBase.get(base) || sym.includes(':')) byBase.set(base, sym)
  }
  return [...byBase.values()]
}
