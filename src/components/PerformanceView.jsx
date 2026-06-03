import { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react'
import { formatCurrency, formatPercent, displaySymbol } from '../utils/formatters'
import { getPeriodDates, calcPeriodStats, getPeriodLabel } from '../utils/periodFilters'
import { ASSET_TYPES } from '../constants'

const PERIOD_OPTIONS = [
  { key: 'week', label: '7 días' },
  { key: 'month', label: 'Mes' },
  { key: 'year', label: 'Año' },
  { key: 'all', label: 'Todo' },
  { key: 'custom', label: 'Personalizado' },
]

const TYPE_COLORS = {
  [ASSET_TYPES.STOCK]: 'text-blue-400',
  [ASSET_TYPES.ETF]: 'text-violet-400',
  [ASSET_TYPES.CRYPTO]: 'text-amber-400',
}

export default function PerformanceView({ derivedPositions, displayCurrency }) {
  const [period, setPeriod] = useState('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  // Obtener rango de fechas para el período
  const dateRange = useMemo(() => {
    if (period === 'custom') {
      return { start: customStart || '1900-01-01', end: customEnd || '2099-12-31' }
    }
    return getPeriodDates(period)
  }, [period, customStart, customEnd])

  // Calcular estadísticas del período
  const stats = useMemo(() => {
    return calcPeriodStats(derivedPositions, dateRange.start, dateRange.end, displayCurrency)
  }, [derivedPositions, dateRange, displayCurrency])

  const pnlPositive = stats.realizedPnl >= 0

  return (
    <div className="space-y-6">
      {/* Selector de período */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex rounded-xl overflow-hidden border border-zinc-700">
          {PERIOD_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-3 py-2 text-sm font-medium transition-all ${
                period === key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Datepickers para período personalizado */}
        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm outline-none focus:border-indigo-500"
            />
            <span className="text-zinc-500 text-sm">—</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm outline-none focus:border-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Período actual */}
      <p className="text-xs text-zinc-500">
        <Calendar size={12} className="inline mr-1" />
        {getPeriodLabel(period)} ({dateRange.start} a {dateRange.end})
      </p>

      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* P&L Realizado */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">P&L Realizado</p>
          <div className="flex items-end justify-between">
            <div>
              <p className={`text-2xl font-bold ${pnlPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(stats.realizedPnl, displayCurrency)}
              </p>
              {stats.realizedPnlPct != null && (
                <p className={`text-xs mt-1 ${pnlPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                  {formatPercent(stats.realizedPnlPct)}
                </p>
              )}
            </div>
            {pnlPositive ? (
              <TrendingUp size={24} className="text-emerald-400 opacity-50" />
            ) : (
              <TrendingDown size={24} className="text-red-400 opacity-50" />
            )}
          </div>
        </div>

        {/* Operaciones */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Operaciones</p>
          <p className="text-2xl font-bold text-white">{stats.operationsCount}</p>
          <p className="text-xs text-zinc-500 mt-1">
            {stats.operationsByType.buy} compras · {stats.operationsByType.sell} ventas
          </p>
        </div>

        {/* Mejor activo */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Mejor Activo</p>
          {stats.bestAsset ? (
            <div>
              <p className="text-sm font-semibold text-white">{displaySymbol(stats.bestAsset.symbol)}</p>
              <p className="text-xs text-zinc-400 truncate">{stats.bestAsset.name}</p>
              <p className="text-lg font-bold text-emerald-400 mt-1">{formatPercent(stats.bestAsset.pct)}</p>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Sin operaciones</p>
          )}
        </div>

        {/* Peor activo */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Peor Activo</p>
          {stats.worstAsset ? (
            <div>
              <p className="text-sm font-semibold text-white">{displaySymbol(stats.worstAsset.symbol)}</p>
              <p className="text-xs text-zinc-400 truncate">{stats.worstAsset.name}</p>
              <p className="text-lg font-bold text-red-400 mt-1">{formatPercent(stats.worstAsset.pct)}</p>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Sin operaciones</p>
          )}
        </div>
      </div>

      {/* Tabla de operaciones */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <p className="text-sm font-semibold text-white">Operaciones del período ({stats.txList.length})</p>
        </div>
        {stats.txList.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <p>Sin operaciones en este período</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Activo</th>
                  <th className="px-4 py-3 text-right">Unidades</th>
                  <th className="px-4 py-3 text-right">Precio</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Comisión</th>
                  {/* P&L aparece solo si hay ventas */}
                  {stats.operationsByType.sell > 0 && (
                    <th className="px-4 py-3 text-right">P&L</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {stats.txList.map((tx, i) => {
                  const total = tx.units * tx.priceRaw
                  const isBuy = tx.operation === 'buy'
                  return (
                    <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                      <td className="px-4 py-3 text-zinc-400">{tx.date}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          isBuy
                            ? 'bg-emerald-900/40 text-emerald-400'
                            : 'bg-red-900/40 text-red-400'
                        }`}>
                          {isBuy ? 'Compra' : 'Venta'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className={`font-medium ${TYPE_COLORS[tx.type] || 'text-white'}`}>
                            {displaySymbol(tx.symbol)}
                          </p>
                          <p className="text-zinc-600 truncate max-w-[120px]">{tx.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-300">
                        {tx.units.toLocaleString('es-ES', { maximumFractionDigits: 6 })}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-300">
                        {tx.currency === 'EUR' ? '€' : '$'}{tx.priceRaw.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-300">
                        {tx.currency === 'EUR' ? '€' : '$'}{total.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-500">
                        {tx.commissionRaw > 0 ? (
                          <>
                            {tx.currency === 'EUR' ? '€' : '$'}{tx.commissionRaw.toFixed(2)}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      {stats.operationsByType.sell > 0 && (
                        <td className="px-4 py-3 text-right">
                          {isBuy ? (
                            <span className="text-zinc-600">—</span>
                          ) : tx.realizedPnl != null ? (
                            <div>
                              <p className={`font-medium ${tx.realizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {tx.realizedPnl >= 0 ? '+' : ''}{tx.realizedPnl.toFixed(2)}
                              </p>
                              {tx.realizedPnlPct != null && (
                                <p className={`text-xs ${tx.realizedPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {tx.realizedPnlPct >= 0 ? '+' : ''}{tx.realizedPnlPct.toFixed(2)}%
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
