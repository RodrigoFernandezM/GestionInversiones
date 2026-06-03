import { useState, useEffect, useRef } from 'react'
import { X, Search, TrendingUp, Bitcoin, BarChart2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { ASSET_TYPES, CURRENCIES, OPERATIONS } from '../constants'
import { searchCoins } from '../services/coinGecko'
import { searchSymbol } from '../services/twelveData'

const ASSET_OPTIONS = [
  { value: ASSET_TYPES.STOCK, label: 'Acción', icon: TrendingUp },
  { value: ASSET_TYPES.ETF, label: 'ETF', icon: BarChart2 },
  { value: ASSET_TYPES.CRYPTO, label: 'Cripto', icon: Bitcoin },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

const EMPTY = {
  operation: OPERATIONS.BUY,
  type: ASSET_TYPES.STOCK,
  symbol: '',
  name: '',
  units: '',
  price: '',
  currency: CURRENCIES.EUR,
  date: today(),
  commission: '',
  notes: '',
}

// mode: 'add' | 'edit'
export default function TransactionForm({ mode = 'add', transaction, onAdd, onSave, onClose, eurUsdRate, initialSymbol }) {
  const isEdit = mode === 'edit'

  const [form, setForm] = useState(() => {
    if (isEdit && transaction) {
      return {
        operation: transaction.operation,
        type: transaction.type,
        symbol: transaction.symbol,
        name: transaction.name,
        units: String(transaction.units),
        price: String(transaction.priceRaw),
        currency: transaction.currency,
        date: transaction.date,
        commission: transaction.commissionRaw ? String(transaction.commissionRaw) : '',
        notes: transaction.notes ?? '',
      }
    }
    if (initialSymbol) {
      return { ...EMPTY, symbol: initialSymbol.symbol, name: initialSymbol.name, type: initialSymbol.type }
    }
    return EMPTY
  })
  const [suggestions, setSuggestions] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [showNotes, setShowNotes] = useState(isEdit && !!transaction?.notes)
  const searchTimer = useRef(null)
  const suggestionsRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setSuggestions([])
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  async function handleSymbolInput(value) {
    set('symbol', value)
    clearTimeout(searchTimer.current)
    if (value.trim().length < 1) { setSuggestions([]); return }
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const results =
          form.type === ASSET_TYPES.CRYPTO
            ? await searchCoins(value)
            : await searchSymbol(value)
        setSuggestions(results)
      } catch {
        setSuggestions([])
      } finally {
        setSearchLoading(false)
      }
    }, 350)
  }

  function selectSuggestion(item) {
    setForm((f) => ({ ...f, symbol: item.symbol, name: item.name }))
    setSuggestions([])
  }

  function validate() {
    const errs = {}
    if (!form.symbol.trim()) errs.symbol = 'Introduce el símbolo'
    if (!form.name.trim()) errs.name = 'Introduce el nombre'
    const units = parseFloat(form.units)
    if (!form.units || isNaN(units) || units <= 0) errs.units = 'Cantidad inválida'
    const price = parseFloat(form.price)
    if (!form.price || isNaN(price) || price <= 0) errs.price = 'Precio inválido'
    if (!form.date) errs.date = 'Introduce la fecha'
    return errs
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    if (isEdit) {
      onSave(transaction.id, form, eurUsdRate)
    } else {
      onAdd(form, eurUsdRate)
    }
    onClose?.()
  }

  const isBuy = form.operation === OPERATIONS.BUY
  const total = parseFloat(form.units) * parseFloat(form.price)

  const inputCls = (field) =>
    `w-full bg-zinc-800 border rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 transition-all ${
      errors[field]
        ? 'border-red-500 focus:ring-red-500/30'
        : 'border-zinc-700 focus:ring-indigo-500/40 focus:border-indigo-500'
    }`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700 sticky top-0 bg-zinc-900 z-10">
          <h2 className="text-lg font-semibold text-white">
            {isEdit ? `Editar operación — ${transaction?.symbol}` : 'Registrar operación'}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors rounded-lg p-1 hover:bg-zinc-800">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* COMPRA / VENTA toggle — prominente */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => set('operation', OPERATIONS.BUY)}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                isBuy
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-500'
              }`}
            >
              <ArrowDownCircle size={16} />
              COMPRA
            </button>
            <button
              type="button"
              onClick={() => set('operation', OPERATIONS.SELL)}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                !isBuy
                  ? 'bg-red-600/20 border-red-500 text-red-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-500'
              }`}
            >
              <ArrowUpCircle size={16} />
              VENTA
            </button>
          </div>

          {/* Tipo de activo */}
          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2 block">Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {ASSET_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: value, symbol: '', name: '' }))}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    form.type === value
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Símbolo */}
          <div className="relative" ref={suggestionsRef}>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2 block">Símbolo</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={form.symbol}
                onChange={(e) => handleSymbolInput(e.target.value)}
                placeholder={form.type === ASSET_TYPES.CRYPTO ? 'BTC, ETH…' : 'AAPL, MSFT, SPY…'}
                className={`${inputCls('symbol')} pl-9`}
              />
              {searchLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            {errors.symbol && <p className="text-red-400 text-xs mt-1">{errors.symbol}</p>}
            {suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden shadow-xl">
                {suggestions.map((item, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => selectSuggestion(item)}
                      className="w-full text-left px-4 py-2.5 hover:bg-zinc-700 transition-colors flex items-center gap-3"
                    >
                      {item.thumb && <img src={item.thumb} alt="" className="w-5 h-5 rounded-full" />}
                      <span className="text-sm font-medium text-white">{item.symbol}</span>
                      <span className="text-xs text-zinc-400 truncate">{item.name}</span>
                      {item.exchange && <span className="ml-auto text-xs text-zinc-500 shrink-0">{item.exchange}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Nombre */}
          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2 block">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Apple Inc., Bitcoin…"
              className={inputCls('name')}
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Fecha */}
          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2 block">Fecha de la operación</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              className={`${inputCls('date')} [color-scheme:dark]`}
            />
            {errors.date && <p className="text-red-400 text-xs mt-1">{errors.date}</p>}
          </div>

          {/* Unidades + Precio */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2 block">Unidades</label>
              <input
                type="number"
                value={form.units}
                onChange={(e) => set('units', e.target.value)}
                placeholder="10"
                min="0"
                step="any"
                className={inputCls('units')}
              />
              {errors.units && <p className="text-red-400 text-xs mt-1">{errors.units}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2 block">Precio / unidad</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                placeholder="0.00"
                min="0"
                step="any"
                className={inputCls('price')}
              />
              {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price}</p>}
            </div>
          </div>

          {/* Moneda + total informativo */}
          <div className="flex items-center gap-3">
            <div className="flex rounded-xl overflow-hidden border border-zinc-700">
              {Object.values(CURRENCIES).map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => set('currency', cur)}
                  className={`px-4 py-2 text-sm font-medium transition-all ${
                    form.currency === cur
                      ? 'bg-indigo-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                  }`}
                >
                  {cur === 'EUR' ? '€ EUR' : '$ USD'}
                </button>
              ))}
            </div>
            {!isNaN(total) && total > 0 && (
              <p className="text-zinc-400 text-sm">
                Total:{' '}
                <span className={`font-semibold ${isBuy ? 'text-emerald-400' : 'text-red-400'}`}>
                  {form.currency === 'EUR' ? '€' : '$'}{total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </p>
            )}
          </div>

          {/* Comisión */}
          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2 block">
              Comisión del broker
              <span className="text-zinc-600 font-normal normal-case ml-1">(opcional)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={form.commission}
                onChange={(e) => set('commission', e.target.value)}
                placeholder="0.00"
                min="0"
                step="any"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-4 pr-16 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">
                {form.currency === 'EUR' ? '€' : '$'}
              </span>
            </div>
            {form.commission && parseFloat(form.commission) > 0 && (
              <p className="text-zinc-500 text-xs mt-1">
                {isBuy ? 'Se añadirá al coste base' : 'Se restará de los ingresos'}
              </p>
            )}
          </div>

          {/* Notas opcionales */}
          <div>
            <button
              type="button"
              onClick={() => setShowNotes((s) => !s)}
              className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
            >
              {showNotes ? '— Ocultar notas' : '+ Añadir nota (opcional)'}
            </button>
            {showNotes && (
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Motivo de la operación, broker, comisión…"
                rows={2}
                className="mt-2 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 resize-none transition-all"
              />
            )}
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 text-sm font-medium transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition-all ${
                isBuy ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
              }`}
            >
              {isEdit ? 'Guardar cambios' : `Registrar ${isBuy ? 'compra' : 'venta'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
