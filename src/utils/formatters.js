import { CURRENCY_SYMBOLS } from '../constants'

// Extrae solo el ticker, quitando el exchange suffix (e.g. "SGLN:LSE" → "SGLN")
export function displaySymbol(symbol) {
  if (!symbol) return ''
  return symbol.split(':')[0]
}

export function formatCurrency(amount, currency = 'EUR', opts = {}) {
  if (amount == null || isNaN(amount)) return '—'
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency
  const decimals = opts.decimals ?? (Math.abs(amount) < 1 ? 4 : 2)
  const formatted = Math.abs(amount).toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return `${amount < 0 ? '-' : ''}${symbol}${formatted}`
}

export function formatPercent(value) {
  if (value == null || isNaN(value)) return '—'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatUnits(units) {
  if (units == null || isNaN(units)) return '—'
  return units.toLocaleString('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  })
}
