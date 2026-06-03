/**
 * Utilidades para filtrar transacciones y calcular P&L por período de tiempo.
 */

export function getPeriodDates(period) {
  const today = new Date()
  let start, end

  switch (period) {
    case 'week': {
      // Últimos 7 días
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(today.getDate() - 7)
      start = formatDate(sevenDaysAgo)
      end = formatDate(today)
      break
    }
    case 'month': {
      // Desde el primer día del mes actual
      start = formatDate(new Date(today.getFullYear(), today.getMonth(), 1))
      end = formatDate(today)
      break
    }
    case 'year': {
      // Desde el primer día del año actual
      start = formatDate(new Date(today.getFullYear(), 0, 1))
      end = formatDate(today)
      break
    }
    case 'all':
    default:
      return { start: '1900-01-01', end: '2099-12-31' }
  }

  return { start, end }
}

/**
 * Formatea una fecha JS a 'YYYY-MM-DD'
 */
function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Filtra transacciones por rango de fechas
 */
export function filterTransactionsByPeriod(transactions, start, end) {
  return transactions.filter(tx => tx.date >= start && tx.date <= end)
}

/**
 * Calcula estadísticas de P&L para un período específico.
 * Retorna: { realizedPnl, realizedPnlPct, operationsCount, bestAsset, worstAsset, txList }
 */
export function calcPeriodStats(derivedPositions, start, end, displayCurrency) {
  let realizedPnl = 0
  let realizedPnlHistoricalCost = 0
  const operationsByType = { buy: 0, sell: 0 }
  const assetPnl = {} // symbol → realized pnl for best/worst
  const txList = [] // todas las tx del período

  // Iterar sobre posiciones y sus transacciones
  for (const pos of derivedPositions) {
    if (!pos.transactions) continue

    for (const tx of pos.transactions) {
      // Filtrar por fecha
      if (tx.date < start || tx.date > end) continue

      txList.push({
        date: tx.date,
        symbol: pos.symbol,
        name: pos.name,
        type: pos.type,
        operation: tx.operation,
        units: tx.units,
        priceRaw: tx.priceRaw,
        currency: tx.currency,
        commissionRaw: tx.commissionRaw,
        realizedPnl: tx._realizedPnl, // null si es buy
        realizedPnlPct: tx._realizedPnlPct,
      })

      // Contar operaciones
      operationsByType[tx.operation]++

      // Acumular P&L realizado (solo de ventas)
      if (tx.operation === 'sell' && tx._realizedPnl != null) {
        realizedPnl += tx._realizedPnl
        const costOfSoldUnits = tx.units * (tx._avgCostAtSale ?? 0)
        realizedPnlHistoricalCost += costOfSoldUnits

        // Track best/worst por activo
        const key = pos.symbol
        if (!assetPnl[key]) assetPnl[key] = { pnl: 0, pct: 0, name: pos.name }
        assetPnl[key].pnl += tx._realizedPnl
        if (costOfSoldUnits > 0) {
          assetPnl[key].pct = (assetPnl[key].pnl / costOfSoldUnits) * 100
        }
      }
    }
  }

  // Encontrar mejor y peor activo
  let bestAsset = null
  let worstAsset = null
  for (const [symbol, data] of Object.entries(assetPnl)) {
    if (!bestAsset || data.pct > bestAsset.pct) {
      bestAsset = { symbol, name: data.name, pct: data.pct, pnl: data.pnl }
    }
    if (!worstAsset || data.pct < worstAsset.pct) {
      worstAsset = { symbol, name: data.name, pct: data.pct, pnl: data.pnl }
    }
  }

  const realizedPnlPct = realizedPnlHistoricalCost > 0.000001
    ? (realizedPnl / realizedPnlHistoricalCost) * 100
    : null

  // Ordenar tx por fecha descendente
  txList.sort((a, b) => new Date(b.date) - new Date(a.date))

  return {
    realizedPnl,
    realizedPnlPct,
    operationsCount: operationsByType.buy + operationsByType.sell,
    operationsByType,
    bestAsset,
    worstAsset,
    txList,
  }
}

/**
 * Período label legible
 */
export function getPeriodLabel(period) {
  const labels = {
    week: 'Últimos 7 días',
    month: 'Mes actual',
    year: 'Año actual',
    all: 'Todo el tiempo',
  }
  return labels[period] ?? period
}
