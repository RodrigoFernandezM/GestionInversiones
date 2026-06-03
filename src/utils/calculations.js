const EPSILON = 0.000001

// Convierte un precio en USD a la moneda de visualización (solo para precios de API)
export function convertPrice(priceUsd, displayCurrency, eurUsdRate = 1.08) {
  if (priceUsd == null) return null
  if (displayCurrency === 'EUR') return priceUsd / eurUsdRate
  return priceUsd
}

export function toUsd(price, priceCurrency, eurUsdRate = 1.08) {
  if (priceCurrency === 'EUR') return price * eurUsdRate
  return price
}

export function calcPnlPercent(pnl, cost) {
  if (pnl == null || !cost) return null
  return (pnl / cost) * 100
}

/**
 * Convierte el precio RAW de una transacción a la moneda de visualización.
 * Trabaja con priceRaw + currency para evitar errores por cambios en la tasa EUR/USD.
 */
function txPriceDisplay(priceRaw, txCurrency, displayCurrency, eurUsdRate) {
  if (txCurrency === displayCurrency) return priceRaw
  if (txCurrency === 'EUR' && displayCurrency === 'USD') return priceRaw * eurUsdRate
  if (txCurrency === 'USD' && displayCurrency === 'EUR') return priceRaw / eurUsdRate
  return priceRaw
}

/**
 * Deriva posiciones por símbolo a partir de transacciones.
 * Todo el cálculo se hace en la moneda de visualización usando priceRaw,
 * sin pasar por USD, para evitar distorsiones por variaciones del tipo de cambio.
 */
export function derivePositions(transactions, prices, displayCurrency, eurUsdRate) {
  const bySymbol = {}

  for (const tx of transactions) {
    if (!bySymbol[tx.symbol]) {
      bySymbol[tx.symbol] = { symbol: tx.symbol, name: tx.name, type: tx.type, txs: [] }
    }
    bySymbol[tx.symbol].txs.push(tx)
  }

  return Object.values(bySymbol).map(({ symbol, name, type, txs }) => {
    const sorted = [...txs].sort((a, b) => new Date(a.date) - new Date(b.date))

    let openUnits = 0
    let totalCost = 0       // en displayCurrency
    let realizedPnl = 0     // en displayCurrency
    let historicalCost = 0  // en displayCurrency

    const annotated = sorted.map((tx) => {
      const price = txPriceDisplay(tx.priceRaw, tx.currency, displayCurrency, eurUsdRate)
      const commission = txPriceDisplay(tx.commissionRaw ?? 0, tx.currency, displayCurrency, eurUsdRate)

      if (tx.operation === 'buy') {
        // Comisión de compra suma al coste base (criterio banco)
        totalCost += tx.units * price + commission
        historicalCost += tx.units * price + commission
        openUnits += tx.units
        return { ...tx, _realizedPnl: null }
      } else {
        // Venta: ingresos brutos − coste medio (sin restar comisión venta, igual que banco)
        const avgCostAtSale = openUnits > EPSILON ? totalCost / openUnits : 0
        const txRealized = tx.units * price - tx.units * avgCostAtSale
        const costOfSoldUnits = tx.units * avgCostAtSale
        const txRealizedPct = costOfSoldUnits > EPSILON
          ? (txRealized / costOfSoldUnits) * 100
          : null
        realizedPnl += txRealized
        totalCost -= tx.units * avgCostAtSale
        openUnits -= tx.units
        if (openUnits < EPSILON) { openUnits = 0; totalCost = 0 }
        return { ...tx, _realizedPnl: txRealized, _realizedPnlPct: txRealizedPct, _avgCostAtSale: avgCostAtSale }
      }
    })

    const avgCost = openUnits > EPSILON ? totalCost / openUnits : 0

    // Precio actual viene de la API en USD → convertir a displayCurrency
    const priceUsd = prices[symbol]?.price ?? null
    const currentPrice = convertPrice(priceUsd, displayCurrency, eurUsdRate)

    let unrealizedPnl = null
    let currentValue = null
    if (openUnits > EPSILON && currentPrice != null) {
      currentValue = openUnits * currentPrice
      unrealizedPnl = openUnits * (currentPrice - avgCost)
    }

    const costBasis = openUnits > EPSILON ? totalCost : 0
    const isClosed = openUnits < EPSILON

    // Posición abierta sin precio → P&L total incompleto, no mostramos 0
    const hasFullData = isClosed || currentPrice != null
    const totalPnl = hasFullData ? realizedPnl + (unrealizedPnl ?? 0) : realizedPnl
    const totalPnlPct = historicalCost > EPSILON && hasFullData
      ? (totalPnl / historicalCost) * 100
      : null

    return {
      symbol, name, type,
      transactions: annotated,
      openUnits,
      avgCost,
      currentPrice,
      currentValue,
      costBasis,
      historicalCost,
      realizedPnl,
      unrealizedPnl,
      totalPnl,
      totalPnlPct,
      isClosed,
      hasPrice: currentPrice != null,
    }
  })
}

export function calcTotalsFromDerived(derivedPositions) {
  let totalCurrentValue = 0
  let totalCostBasis = 0
  let totalRealizedPnl = 0
  let totalUnrealizedPnl = 0
  let totalHistoricalCost = 0

  for (const pos of derivedPositions) {
    totalRealizedPnl += pos.realizedPnl ?? 0
    totalHistoricalCost += pos.historicalCost ?? 0
    if (!pos.isClosed) {
      if (pos.currentValue != null) totalCurrentValue += pos.currentValue
      if (pos.costBasis != null) totalCostBasis += pos.costBasis
      if (pos.unrealizedPnl != null) totalUnrealizedPnl += pos.unrealizedPnl
    }
  }

  const totalPnl = totalRealizedPnl + totalUnrealizedPnl
  const totalPnlPct = totalHistoricalCost > EPSILON
    ? (totalPnl / totalHistoricalCost) * 100
    : null

  return {
    totalCurrentValue,
    totalCostBasis,
    totalRealizedPnl,
    totalUnrealizedPnl,
    totalPnl,
    totalPnlPct,
    totalHistoricalCost,
  }
}

export function calcBestWorst(derivedPositions) {
  let best = null
  let worst = null
  for (const pos of derivedPositions) {
    const pct = pos.totalPnlPct
    if (pct == null) continue
    if (!best || pct > best.pct) best = { symbol: pos.symbol, name: pos.name, pct }
    if (!worst || pct < worst.pct) worst = { symbol: pos.symbol, name: pos.name, pct }
  }
  return { best, worst }
}

export function calcAllocationFromDerived(derivedPositions) {
  const items = derivedPositions
    .filter((p) => !p.isClosed)
    .map((p) => ({ ...p, _chartValue: p.currentValue ?? p.costBasis }))
    .filter((p) => p._chartValue > 0)
    .sort((a, b) => b._chartValue - a._chartValue)

  const total = items.reduce((s, p) => s + p._chartValue, 0)
  if (!total) return []
  return items.map((p) => ({
    id: p.symbol,
    label: p.symbol,
    sublabel: p.name,
    type: p.type,
    value: p._chartValue,
    pct: (p._chartValue / total) * 100,
  }))
}

export function calcAllocationByType(derivedPositions) {
  const groups = {}
  for (const p of derivedPositions) {
    if (p.isClosed) continue
    const value = p.currentValue ?? p.costBasis // fallback a coste si no hay precio
    if (!value || value <= 0) continue
    groups[p.type] = (groups[p.type] ?? 0) + value
  }
  const total = Object.values(groups).reduce((s, v) => s + v, 0)
  if (!total) return []
  return Object.entries(groups)
    .sort((a, b) => b[1] - a[1])
    .map(([type, value]) => ({ id: type, label: type, value, pct: (value / total) * 100 }))
}
