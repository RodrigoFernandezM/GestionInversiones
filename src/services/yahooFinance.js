// Sufijos de Yahoo Finance por exchange de Twelve Data
const EXCHANGE_TO_YAHOO = {
  LSE: '.L',
  XLON: '.L',
  LON: '.L',
  XETR: '.DE',
  FRA: '.DE',
  EPA: '.PA',
  PAR: '.PA',
  BME: '.MC',
  MAD: '.MC',
  XAMS: '.AS',
  AMS: '.AS',
  MIL: '.MI',
  STO: '.ST',
  HEL: '.HE',
  CPH: '.CO',
  OSL: '.OL',
  VIE: '.VI',
  JSE: '.JO',
  TSX: '.TO',
  ASX: '.AX',
}

function toYahooSymbol(symbol) {
  const parts = symbol.split(':')
  if (parts.length < 2) return symbol  // sin exchange, usar tal cual
  const [ticker, exchange] = parts
  const suffix = EXCHANGE_TO_YAHOO[exchange.toUpperCase()]
  return suffix ? `${ticker}${suffix}` : symbol
}

/**
 * Obtiene el precio de cierre más reciente desde Yahoo Finance.
 * Devuelve el precio en la moneda local del mercado.
 */
export async function fetchYahooPrice(symbol) {
  const yahooSym = toYahooSymbol(symbol)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1d&range=1d`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status} para ${yahooSym}`)

  const data = await res.json()
  const result = data?.chart?.result?.[0]
  if (!result) throw new Error(`Sin datos Yahoo para ${yahooSym}`)

  const price =
    result.meta?.regularMarketPrice ??
    result.meta?.previousClose

  if (!price) throw new Error(`Precio no disponible en Yahoo para ${yahooSym}`)

  return { price, currency: result.meta?.currency ?? 'USD' }
}

/**
 * Intenta obtener precios para varios símbolos desde Yahoo Finance.
 * Devuelve { [SYMBOL_ORIGINAL]: priceUsd }
 */
export async function fetchYahooPrices(symbols, eurUsdRate = 1.08) {
  const result = {}

  await Promise.allSettled(
    symbols.map(async (sym) => {
      try {
        const { price, currency } = await fetchYahooPrice(sym)
        const priceUsd = convertToUsd(price, currency, eurUsdRate)
        result[sym.toUpperCase()] = priceUsd
      } catch (err) {
        console.warn(`Yahoo Finance no pudo obtener precio de ${sym}:`, err.message)
      }
    }),
  )

  return result
}

function convertToUsd(price, currency, eurUsdRate) {
  switch (currency?.toUpperCase()) {
    case 'USD': return price
    case 'EUR': return price * eurUsdRate
    case 'GBP': return price * 1.27
    case 'GBX':   // peniques
    case 'GBp': return price * 0.0127
    case 'JPY': return price * 0.0067
    case 'CHF': return price * 1.12
    case 'CAD': return price * 0.74
    case 'AUD': return price * 0.65
    case 'SEK': return price * 0.095
    case 'NOK': return price * 0.094
    case 'DKK': return price * 0.145
    default: return price
  }
}
