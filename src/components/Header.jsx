import { RefreshCw, Settings, Plus, Upload, HelpCircle } from 'lucide-react'
import { CURRENCIES } from '../constants'
import { formatCurrency, formatPercent } from '../utils/formatters'

export default function Header({
  totals,
  displayCurrency,
  onToggleCurrency,
  onAddPosition,
  onImport,
  onRefresh,
  onOpenSettings,
  onOpenHelp,
  loading,
  lastRefresh,
}) {
  const pnlPositive = totals.totalPnl >= 0

  return (
    <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center gap-6 flex-wrap">
        {/* Logo / título */}
        <div className="flex items-center gap-3 mr-auto">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
            G
          </div>
          <span className="font-semibold text-white text-base hidden sm:block">
            Gestión Inversiones
          </span>
        </div>

        {/* Resumen del portfolio */}
        {totals.totalValue > 0 && (
          <div className="flex items-center gap-6 text-sm">
            <div>
              <p className="text-zinc-500 text-xs">Valor total</p>
              <p className="text-white font-semibold">
                {formatCurrency(totals.totalValue, displayCurrency)}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs">P&L</p>
              <p className={`font-semibold ${pnlPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(totals.totalPnl, displayCurrency)}{' '}
                <span className="text-xs font-normal">
                  ({formatPercent(totals.totalPnlPercent)})
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-2">
          {/* Toggle EUR/USD */}
          <div className="flex rounded-lg overflow-hidden border border-zinc-700 text-sm">
            {Object.values(CURRENCIES).map((cur) => (
              <button
                key={cur}
                onClick={() => onToggleCurrency(cur)}
                className={`px-3 py-1.5 font-medium transition-all ${
                  displayCurrency === cur
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {cur === 'EUR' ? '€ EUR' : '$ USD'}
              </button>
            ))}
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            title={lastRefresh ? `Actualizado: ${lastRefresh.toLocaleTimeString()}` : 'Actualizar precios'}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={onOpenHelp}
            title="Ayuda"
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
          >
            <HelpCircle size={16} />
          </button>

          <button
            onClick={onOpenSettings}
            title="Ajustes"
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
          >
            <Settings size={16} />
          </button>

          <button
            onClick={onImport}
            title="Importar CSV"
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 text-sm font-medium transition-all"
          >
            <Upload size={15} />
            <span className="hidden sm:inline">Importar</span>
          </button>

          <button
            onClick={onAddPosition}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Añadir</span>
          </button>
        </div>
      </div>
    </header>
  )
}
