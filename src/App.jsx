import { useState, useMemo, useCallback } from 'react'
import { AlertTriangle, TrendingUp, Bitcoin, LayoutGrid, Search, X, BarChart3 } from 'lucide-react'
import Header from './components/Header'
import SummaryCards from './components/SummaryCards'
import AllocationChart from './components/AllocationChart'
import PositionsTable from './components/PositionsTable'
import PerformanceView from './components/PerformanceView'
import TransactionForm from './components/TransactionForm'
import ImportModal from './components/ImportModal'
import SettingsModal from './components/SettingsModal'
import HelpModal from './components/HelpModal'
import { useTransactions } from './hooks/useTransactions'
import { usePrices } from './hooks/usePrices'
import { LS_MANUAL_PRICES, ASSET_TYPES } from './constants'
import { toUsd } from './utils/calculations'
import {
  derivePositions,
  calcTotalsFromDerived,
  calcBestWorst,
  calcAllocationFromDerived,
  calcAllocationByType,
} from './utils/calculations'

const FILTERS = [
  { key: 'all',    label: 'Todo',           icon: LayoutGrid },
  { key: 'stocks', label: 'Acciones & ETFs', icon: TrendingUp },
  { key: 'crypto', label: 'Cripto',          icon: Bitcoin },
]

export default function App() {
  const [showForm, setShowForm] = useState(false)
  const [formInitial, setFormInitial] = useState(null)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [chartView, setChartView] = useState('type')
  const [filter, setFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'open' | 'closed'
  const [search, setSearch] = useState('')
  const [activeView, setActiveView] = useState('portfolio') // 'portfolio' | 'performance'
  const [editingPrice, setEditingPrice] = useState(null) // símbolo siendo editado

  const {
    transactions,
    displayCurrency,
    setDisplayCurrency,
    addTransaction,
    updateTransaction,
    removeTransaction,
    renameSymbol,
    priceableSymbols,
  } = useTransactions()

  const { prices, eurUsdRate, loading, error, lastRefresh, refresh } = usePrices(priceableSymbols)

  const derivedPositions = useMemo(
    () => derivePositions(transactions, prices, displayCurrency, eurUsdRate),
    [transactions, prices, displayCurrency, eurUsdRate],
  )

  // Posiciones filtradas por categoría + estado + búsqueda
  const visiblePositions = useMemo(() => {
    let list = derivedPositions

    if (filter === 'crypto') list = list.filter(p => p.type === ASSET_TYPES.CRYPTO)
    else if (filter === 'stocks') list = list.filter(p => p.type !== ASSET_TYPES.CRYPTO)

    if (statusFilter === 'open') list = list.filter(p => !p.isClosed)
    else if (statusFilter === 'closed') list = list.filter(p => p.isClosed)

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.symbol.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q)
      )
    }

    return list
  }, [derivedPositions, filter, statusFilter, search])

  const totals = useMemo(() => calcTotalsFromDerived(visiblePositions), [visiblePositions])
  const { best } = useMemo(() => calcBestWorst(visiblePositions), [visiblePositions])

  // Símbolos con precio manual — para indicador visual
  const manualPriceSymbols = useMemo(() => {
    try {
      const manual = JSON.parse(localStorage.getItem(LS_MANUAL_PRICES) ?? '{}')
      return new Set(Object.keys(manual))
    } catch {
      return new Set()
    }
  }, [])

  const allocationSegments = useMemo(
    () =>
      chartView === 'type'
        ? calcAllocationByType(visiblePositions)
        : calcAllocationFromDerived(visiblePositions),
    [chartView, visiblePositions],
  )

  // Header siempre muestra el total global (sin filtro)
  const globalTotals = useMemo(() => calcTotalsFromDerived(derivedPositions), [derivedPositions])
  const headerTotals = {
    totalValue: globalTotals.totalCurrentValue,
    totalPnl: globalTotals.totalPnl,
    totalPnlPercent: globalTotals.totalPnlPct ?? 0,
  }

  const handleManualPrice = useCallback((symbol, priceDisplay, currency) => {
    const priceUsd = toUsd(priceDisplay, currency === 'EUR' ? 'EUR' : 'USD', eurUsdRate)
    const entry = { price: priceUsd, updatedAt: new Date().toISOString(), manual: true }
    const stored = JSON.parse(localStorage.getItem(LS_MANUAL_PRICES) ?? '{}')
    stored[symbol.toUpperCase()] = entry
    localStorage.setItem(LS_MANUAL_PRICES, JSON.stringify(stored))
    refresh()
  }, [eurUsdRate, refresh])

  function handleAdd(formData) {
    addTransaction(formData, eurUsdRate)
    setTimeout(refresh, 500)
  }

  function openFormForPosition(pos) {
    setFormInitial({ symbol: pos.symbol, name: pos.name, type: pos.type })
    setShowForm(true)
  }

  function openNewForm() {
    setFormInitial(null)
    setShowForm(true)
  }

  const hasData = transactions.length > 0

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header
        totals={headerTotals}
        displayCurrency={displayCurrency}
        onToggleCurrency={setDisplayCurrency}
        onAddPosition={openNewForm}
        onImport={() => setShowImport(true)}
        onRefresh={refresh}
        onOpenSettings={() => setShowSettings(true)}
        onOpenHelp={() => setShowHelp(true)}
        loading={loading}
        lastRefresh={lastRefresh}
      />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Tabs de navegación */}
        <div className="flex gap-2 border-b border-zinc-800 -mx-4 px-4">
          <button
            onClick={() => setActiveView('portfolio')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-all ${
              activeView === 'portfolio'
                ? 'border-indigo-600 text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Cartera
          </button>
          <button
            onClick={() => setActiveView('performance')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeView === 'performance'
                ? 'border-indigo-600 text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <BarChart3 size={14} />
            Rendimiento
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-amber-900/30 border border-amber-700/50 rounded-xl px-4 py-3 text-sm text-amber-300">
            <AlertTriangle size={16} className="shrink-0" />
            <span>
              {error.includes('API key')
                ? 'Configura tu API key de Twelve Data en ajustes para ver precios de acciones y ETFs.'
                : `Error al obtener precios: ${error}. Mostrando últimos precios conocidos.`}
            </span>
          </div>
        )}

        {/* Vista Cartera */}
        {activeView === 'portfolio' && (
          <>
            {hasData && (
              <>
                {/* Barra de filtros */}
                <div className="flex flex-wrap items-center gap-2">
              {/* Categoría */}
              <div className="flex rounded-xl overflow-hidden border border-zinc-800">
                {FILTERS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all ${
                      filter === key
                        ? 'bg-indigo-600 text-white'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Estado abierta/cerrada */}
              <div className="flex rounded-xl overflow-hidden border border-zinc-800">
                {[
                  { key: 'all',    label: 'Todas' },
                  { key: 'open',   label: 'Abiertas' },
                  { key: 'closed', label: 'Cerradas' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key)}
                    className={`px-3 py-2 text-sm font-medium transition-all ${
                      statusFilter === key
                        ? 'bg-zinc-700 text-white'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Búsqueda */}
              <div className="relative flex-1 min-w-[180px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar activo…"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-8 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-600 transition-all"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Cards del segmento seleccionado */}
            <SummaryCards totals={totals} best={best} displayCurrency={displayCurrency} />
          </>
        )}

        {hasData ? (
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 items-start">
            <AllocationChart
              segments={allocationSegments}
              displayCurrency={displayCurrency}
              view={chartView}
              onToggleView={setChartView}
            />
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <PositionsTable
                derivedPositions={visiblePositions}
                displayCurrency={displayCurrency}
                onRemoveTransaction={removeTransaction}
                onEditTransaction={setEditingTransaction}
                onAddTransaction={openFormForPosition}
                onManualPrice={handleManualPrice}
                onRename={renameSymbol}
                manualPriceSymbols={manualPriceSymbols}
                editingPrice={editingPrice}
                setEditingPrice={setEditingPrice}
              />
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <PositionsTable
              derivedPositions={visiblePositions}
              displayCurrency={displayCurrency}
              onRemoveTransaction={removeTransaction}
              onEditTransaction={setEditingTransaction}
              onAddTransaction={openFormForPosition}
              onManualPrice={handleManualPrice}
              onRename={renameSymbol}
              manualPriceSymbols={manualPriceSymbols}
              editingPrice={editingPrice}
              setEditingPrice={setEditingPrice}
            />
          </div>
        )}
          </>
        )}

        {/* Vista Rendimiento */}
        {activeView === 'performance' && (
          <PerformanceView derivedPositions={derivedPositions} displayCurrency={displayCurrency} />
        )}
      </main>

      {showForm && (
        <TransactionForm
          mode="add"
          onAdd={handleAdd}
          onClose={() => setShowForm(false)}
          eurUsdRate={eurUsdRate}
          initialSymbol={formInitial}
        />
      )}

      {editingTransaction && (
        <TransactionForm
          mode="edit"
          transaction={editingTransaction}
          onSave={(id, formData) => {
            updateTransaction(id, formData, eurUsdRate)
            setEditingTransaction(null)
          }}
          onClose={() => setEditingTransaction(null)}
          eurUsdRate={eurUsdRate}
        />
      )}

      {showImport && (
        <ImportModal
          onImport={(formData) => addTransaction(formData, eurUsdRate)}
          onClose={() => { setShowImport(false); setTimeout(refresh, 800) }}
          existingTransactions={transactions}
        />
      )}

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onClearAll={() => {
            // Forzar recarga de transacciones desde localStorage (ya vacío)
            window.location.reload()
          }}
        />
      )}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  )
}
