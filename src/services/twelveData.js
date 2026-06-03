import { TWELVE_DATA_BASE_URL, LS_API_KEY } from '../constants'

function getApiKey() {
  return localStorage.getItem(LS_API_KEY) ?? ''
}

// Exchanges que devuelven precios en GBp (peniques) → dividir entre 100 para GBP
const GBP_PENCE_EXCHANGES = new Set(['LSE', 'LON', 'XLON'])

// Tipos de cambio aproximados a USD (fallback si no hay tasa live)
// Se actualizan desde priceService cuando sea posible
const CURRENCY_TO_USD = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  GBp: 0.0127, // peniques
  JPY: 0.0067,
  CHF: 1.12,
  CAD: 0.74,
  AUD: 0.65,
  SEK: 0.095,
  NOK: 0.094,
  DKK: 0.145,
}

function extractExchange(symbol) {
  const parts = symbol.split(':')
  return parts.length > 1 ? parts[1].toUpperCase() : null
}

/**
 * Construye la URL de Twelve Data SIN encodeURIComponent en el símbolo,
 * ya que el formato SYMBOL:EXCHANGE usa ":" que no debe codificarse.
 */
function buildUrl(endpoint, params) {
  const base = `${TWELVE_DATA_BASE_URL}/${endpoint}?`
  const qs = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  return base + qs
}

/**
 * Twelve Data devuelve precios en la moneda local del exchange.
 * Los convertimos a USD para que el resto de la app trabaje uniforme.
 */
function toUsdPrice(price, symbol, currency) {
  // Si la API nos dice la moneda, la usamos
  if (currency) {
    const rate = CURRENCY_TO_USD[currency] ?? CURRENCY_TO_USD[currency?.toUpperCase()]
    if (rate) return price * rate
  }
  // Fallback: inferir por exchange
  const exchange = extractExchange(symbol)
  if (exchange && GBP_PENCE_EXCHANGES.has(exchange)) {
    return price * CURRENCY_TO_USD['GBp']
  }
  return price // asumimos USD si no sabemos
}

/**
 * Obtiene precios para múltiples símbolos en una sola llamada batch.
 * Devuelve { [SYMBOL]: priceUsd }
 */
export async function fetchStockPrices(symbols) {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('API key de Twelve Data no configurada')

  const url = buildUrl('price', {
    symbol: symbols.join(','),
    apikey: apiKey,
  })

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Twelve Data HTTP ${res.status}`)
  const data = await res.json()

  // Respuesta de un solo símbolo: { price: "...", currency: "..." }
  if (symbols.length === 1) {
    if (data.status === 'error') {
      console.warn(`Twelve Data error para ${symbols[0]}:`, data.message)
      throw new Error(data.message ?? 'Error Twelve Data')
    }
    const raw = parseFloat(data.price)
    if (isNaN(raw)) throw new Error(`Precio inválido para ${symbols[0]}`)
    return { [symbols[0].toUpperCase()]: toUsdPrice(raw, symbols[0], data.currency) }
  }

  // Respuesta múltiple: { "AAPL": { price, currency }, "SGLN:LSE": { price, currency }, ... }
  const result = {}
  for (const sym of symbols) {
    // Twelve Data puede devolver la clave con o sin exchange
    const entry = data[sym.toUpperCase()] ?? data[sym.split(':')[0].toUpperCase()]
    if (!entry || entry.status === 'error') {
      console.warn(`Sin precio para ${sym}:`, entry?.message ?? 'no data')
      continue
    }
    const raw = parseFloat(entry.price)
    if (!isNaN(raw)) {
      result[sym.toUpperCase()] = toUsdPrice(raw, sym, entry.currency)
    }
  }
  return result
}

/**
 * Busca el ticker de un activo por su ISIN (mucho más preciso que por nombre).
 * Devuelve { symbol, exchange, type, name } o null si no encuentra.
 */
export async function lookupByIsin(isin) {
  const apiKey = getApiKey()
  if (!apiKey || !isin) return null

  const url = buildUrl('stocks', { isin, apikey: apiKey })
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    // Respuesta: { data: [ { symbol, name, exchange, type, ... } ] }
    const list = data.data ?? (data.symbol ? [data] : [])
    if (!list.length) return null
    // Preferir la entrada del mercado principal (NYSE/NASDAQ sobre OTC)
    const preferred = list.find(s =>
      ['NYSE', 'NASDAQ', 'XNGS', 'XNYS'].includes(s.exchange?.toUpperCase())
    ) ?? list[0]
    return {
      symbol: preferred.symbol,
      exchange: preferred.exchange,
      name: preferred.name,
      type: preferred.type,
    }
  } catch {
    return null
  }
}

/**
 * Busca símbolos en Twelve Data (autocompletado).
 */
export async function searchSymbol(query) {
  const apiKey = getApiKey()
  if (!apiKey) return []

  const url = buildUrl('symbol_search', {
    symbol: encodeURIComponent(query),
    apikey: apiKey,
  })

  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json()

  return (data.data ?? []).slice(0, 10).map((s) => ({
    symbol: s.symbol,
    name: s.instrument_name,
    exchange: s.exchange,
    type: s.instrument_type,
  }))
}
