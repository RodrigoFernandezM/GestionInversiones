/**
 * Parser de CSV para Trade Republic y formatos genéricos.
 * Trade Republic exporta con ; como separador, decimales con coma y fechas DD.MM.YYYY
 */

const BUY_KEYWORDS  = ['kauf', 'purchase', 'buy', 'bought', 'compra', 'order_buy', 'sparplan']
const SELL_KEYWORDS = ['verkauf', 'sale', 'sell', 'sold', 'venta', 'order_sell']

// Palabras clave en el tipo o nombre que indican criptomoneda
const CRYPTO_TYPE_KEYWORDS = ['krypto', 'crypto', 'cryptocurrency', 'criptomoneda']

// Nombres y tickers de criptomonedas conocidas
const KNOWN_CRYPTO = new Set([
  'bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'sol', 'ripple', 'xrp',
  'cardano', 'ada', 'polkadot', 'dot', 'avalanche', 'avax', 'chainlink', 'link',
  'litecoin', 'ltc', 'dogecoin', 'doge', 'shiba inu', 'shib', 'uniswap', 'uni',
  'polygon', 'matic', 'cosmos', 'atom', 'near', 'tron', 'trx', 'binance coin',
  'bnb', 'toncoin', 'ton', 'sui', 'aptos', 'apt', 'arbitrum', 'arb',
  'optimism', 'op', 'pepe', 'floki', 'fantom', 'ftm', 'algorand', 'algo',
  'stellar', 'xlm', 'vechain', 'vet', 'filecoin', 'fil', 'aave', 'maker',
  'mkr', 'compound', 'comp', 'internet computer', 'icp', 'hedera', 'hbar',
])

function detectIsCrypto(typeName, assetName, isin) {
  // Si tiene ISIN no es cripto nativa (podría ser ETP de cripto, pero tratamos como ETF)
  if (isin?.trim()) return false
  const typeL = typeName?.toLowerCase() ?? ''
  const nameL = assetName?.toLowerCase() ?? ''
  if (CRYPTO_TYPE_KEYWORDS.some(k => typeL.includes(k))) return true
  // Comprobar si el nombre contiene alguna cripto conocida
  return [...KNOWN_CRYPTO].some(k => nameL.includes(k))
}

// Columnas reconocidas por nombre (minúsculas)
const COL_MAP = {
  date:       ['datum', 'date', 'fecha', 'trade date', 'time', 'uhrzeit', 'booking date'],
  type:       ['art', 'type', 'tipo', 'transaction type', 'transaction_type', 'buchungsart'],
  name:       ['wertpapiername', 'name', 'nombre', 'title', 'titel', 'security', 'instrument', 'wertpapier', 'description'],
  isin:       ['isin'],
  shares:     ['anzahl', 'shares', 'quantity', 'menge', 'stück', 'qty', 'amount', 'units'],
  price:      ['kurs', 'price', 'precio', 'share price', 'preis', 'unit price'],
  fee:        ['kommission', 'fee', 'fees', 'commission', 'comisión', 'gebühr', 'gebühren', 'kosten'],
  currency:   ['währung', 'currency', 'moneda', 'ccy'],
  total:      ['betrag', 'total', 'gesamt', 'amount', 'valor', 'net amount'],
}

function detectSeparator(text) {
  const firstLine = text.split('\n')[0]
  const semicolons = (firstLine.match(/;/g) ?? []).length
  const commas     = (firstLine.match(/,/g) ?? []).length
  return semicolons >= commas ? ';' : ','
}

function parseEuropeanNumber(str) {
  if (!str) return 0
  // Quitar símbolos de moneda, espacios y letras: "1.856,50 EUR" → "1856.50"
  const cleaned = str.replace(/[^0-9,.\-]/g, '').trim()
  if (!cleaned) return 0
  // Detectar si la coma es decimal (1.234,56) o el punto lo es (1,234.56)
  const lastComma = cleaned.lastIndexOf(',')
  const lastDot   = cleaned.lastIndexOf('.')
  if (lastComma > lastDot) {
    // Formato europeo: punto = miles, coma = decimal
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0
  }
  return parseFloat(cleaned.replace(/,/g, '')) || 0
}

function parseDate(str) {
  if (!str) return ''
  str = str.trim()
  // DD.MM.YYYY o DD/MM/YYYY
  let m = str.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  // YYYY-MM-DD (ya correcto)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10)
  // MM/DD/YYYY (formato americano)
  m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  return str.slice(0, 10)
}

function normalizeOperation(str) {
  if (!str) return null
  const low = str.toLowerCase().trim()
  if (BUY_KEYWORDS.some(k => low.includes(k)))  return 'buy'
  if (SELL_KEYWORDS.some(k => low.includes(k))) return 'sell'
  return null
}

function findColIndex(headers, candidates) {
  for (const name of candidates) {
    const idx = headers.findIndex(h => h.toLowerCase().trim() === name)
    if (idx !== -1) return idx
  }
  // Búsqueda parcial como fallback
  for (const name of candidates) {
    const idx = headers.findIndex(h => h.toLowerCase().trim().includes(name))
    if (idx !== -1) return idx
  }
  return -1
}

function parseCsvLines(text, sep) {
  return text
    .split('\n')
    .map(line => line.split(sep).map(c => c.replace(/^"|"$/g, '').trim()))
    .filter(row => row.some(c => c.length > 0))
}

/**
 * Parsea un CSV de Trade Republic (u otro broker compatible).
 * Devuelve { transactions, errors, headers }
 */
export function parseCSV(text) {
  const sep = detectSeparator(text)
  const rows = parseCsvLines(text, sep)
  if (rows.length < 2) return { transactions: [], errors: ['CSV vacío o sin cabecera'], headers: [] }

  const headers = rows[0]
  const dataRows = rows.slice(1)

  // Mapear índices de columnas
  const cols = {}
  for (const [key, candidates] of Object.entries(COL_MAP)) {
    cols[key] = findColIndex(headers, candidates)
  }

  // Necesitamos al menos tipo y fecha
  if (cols.type === -1 && cols.date === -1) {
    return {
      transactions: [],
      errors: ['No se reconoce el formato. Columnas encontradas: ' + headers.join(', ')],
      headers,
    }
  }

  const transactions = []
  const errors = []

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    if (row.every(c => !c)) continue // línea vacía

    const rawType = cols.type !== -1 ? row[cols.type] : ''
    const operation = normalizeOperation(rawType)

    // Ignorar todo lo que no sea compra/venta:
    // pagos con tarjeta, transferencias, nóminas, dividendos, etc.
    if (!operation) continue

    // Ignorar filas sin ISIN ni precio numérico (pagos bancarios normales)
    const rawIsinCheck = cols.isin !== -1 ? row[cols.isin] : ''
    const rawPriceCheck = cols.price !== -1 ? row[cols.price] : ''
    const rawSharesCheck = cols.shares !== -1 ? row[cols.shares] : ''
    if (!rawIsinCheck && !parseEuropeanNumber(rawPriceCheck) && !parseEuropeanNumber(rawSharesCheck)) continue

    const rawDate  = cols.date  !== -1 ? row[cols.date]  : ''
    const rawName  = cols.name  !== -1 ? row[cols.name]  : ''
    const rawIsin  = cols.isin  !== -1 ? row[cols.isin]  : ''
    const rawShares = cols.shares !== -1 ? row[cols.shares] : ''
    const rawPrice  = cols.price  !== -1 ? row[cols.price]  : ''
    const rawFee    = cols.fee    !== -1 ? row[cols.fee]    : ''
    const rawCurrency = cols.currency !== -1 ? row[cols.currency] : 'EUR'
    const rawTotal  = cols.total  !== -1 ? row[cols.total]  : ''

    const date   = parseDate(rawDate)
    const shares = Math.abs(parseEuropeanNumber(rawShares))
    let   price  = Math.abs(parseEuropeanNumber(rawPrice))
    const fee    = Math.abs(parseEuropeanNumber(rawFee))
    const currency = extractCurrency(rawCurrency || rawPrice || rawTotal) || 'EUR'

    // Si no hay precio pero sí total, calcular precio unitario
    if (!price && shares && rawTotal) {
      const total = Math.abs(parseEuropeanNumber(rawTotal))
      if (total && shares) price = (total - fee) / shares
    }

    if (!shares || !price) {
      errors.push(`Fila ${i + 2}: cantidad o precio no válidos — ignorada`)
      continue
    }

    const isCrypto = detectIsCrypto(rawType, rawName, rawIsin)
    // ETF: ISIN presente + nombre contiene "ETF", "ETC", "iShares", "Xtrackers", etc.
    const isEtf = !isCrypto && rawIsin && /etf|etc|ishares|xtrackers|amundi|vanguard|invesco|lyxor|spdr|wisdomtree/i.test(rawName)
    const assetType = isCrypto ? 'crypto' : isEtf ? 'etf' : 'stock'

    transactions.push({
      _id: `import-${i}`,
      operation,
      date: date || new Date().toISOString().slice(0, 10),
      name: rawName || rawIsin || 'Sin nombre',
      symbol: extractTicker(rawName, rawIsin),
      isin: rawIsin,
      units: shares,
      price: +price.toFixed(6),
      currency,
      commission: +fee.toFixed(4),
      notes: '',
      type: assetType,
    })
  }

  return { transactions, errors, headers }
}

/** Intenta deducir un ticker del nombre o ISIN */
function extractTicker(name, isin) {
  if (!name) return isin?.slice(0, 6) ?? ''
  // Muchos nombres de TR son "Apple Inc." → "AAPL" no se puede deducir sin API
  // Devolvemos las iniciales en mayúsculas como sugerencia editable
  return name
    .replace(/\s+(Inc\.?|Corp\.?|Ltd\.?|AG|SE|NV|SA|PLC|ETF|ETC)\.?$/i, '')
    .trim()
}

function extractCurrency(str) {
  if (!str) return null
  const m = str.match(/\b(EUR|USD|GBP|GBp|CHF|JPY|CAD|AUD|SEK|NOK|DKK)\b/i)
  return m ? m[1].toUpperCase() : null
}
