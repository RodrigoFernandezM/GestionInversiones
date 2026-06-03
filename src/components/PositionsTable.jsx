import { useState } from 'react'
import {
  ChevronDown, ChevronRight, TrendingUp, TrendingDown,
  Bitcoin, BarChart2, ArrowDownCircle, ArrowUpCircle, Trash2, Plus, Pencil, AlertCircle
} from 'lucide-react'
import { ASSET_TYPES, OPERATIONS } from '../constants'
import { formatCurrency, formatPercent, formatUnits, displaySymbol } from '../utils/formatters'

const TYPE_ICONS = {
  [ASSET_TYPES.STOCK]: TrendingUp,
  [ASSET_TYPES.ETF]: BarChart2,
  [ASSET_TYPES.CRYPTO]: Bitcoin,
}

const TYPE_COLORS = {
  [ASSET_TYPES.STOCK]: 'text-blue-400 bg-blue-400/10',
  [ASSET_TYPES.ETF]: 'text-violet-400 bg-violet-400/10',
  [ASSET_TYPES.CRYPTO]: 'text-amber-400 bg-amber-400/10',
}

function ManualPriceInput({ symbol, displayCurrency, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')

  function handleKey(e) {
    if (e.key === 'Enter') submit()
    if (e.key === 'Escape') setEditing(false)
  }

  function submit() {
    const p = parseFloat(val)
    if (!isNaN(p) && p > 0) onSave(symbol, p, displayCurrency)
    setEditing(false)
    setVal('')
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={handleKey}
        onBlur={submit}
        placeholder="0.00"
        className="w-24 bg-zinc-800 border border-indigo-500 rounded px-2 py-1 text-sm text-white text-right outline-none"
      />
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-zinc-600 hover:text-indigo-400 text-xs transition-colors flex items-center gap-1 ml-auto"
      title="Introducir precio manual"
    >
      <Pencil size={11} /> precio
    </button>
  )
}

function PnlCell({ value, pct, dim }) {
  // Sin datos suficientes: valor 0 sin % significa que falta el precio
  if (value == null || (value === 0 && pct == null)) return <span className="text-zinc-600">—</span>
  const pos = value >= 0
  return (
    <div className={dim ? 'opacity-40' : ''}>
      <p className={`text-sm font-medium ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
        {formatCurrency(value)}
      </p>
      {pct != null && (
        <p className={`text-xs ${pos ? 'text-emerald-500' : 'text-red-500'}`}>
          {formatPercent(pct)}
        </p>
      )}
    </div>
  )
}

function TransactionSubRow({ tx, displayCurrency, onRemove, onEdit }) {
  const isBuy = tx.operation === OPERATIONS.BUY
  const total = tx.units * tx.priceRaw
  const realizedPnl = tx._realizedPnl ?? null

  return (
    <tr className="bg-zinc-950 border-b border-zinc-800/50 text-xs group/tx">
      <td className="pl-14 pr-3 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              isBuy ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'
            }`}
          >
            {isBuy ? <ArrowDownCircle size={10} /> : <ArrowUpCircle size={10} />}
            {isBuy ? 'Compra' : 'Venta'}
          </span>
          <span className="text-zinc-500">{tx.date}</span>
          {tx.commissionRaw > 0 && (
            <span className="text-zinc-600 text-xs">
              comis. {tx.currency === 'EUR' ? '€' : '$'}{tx.commissionRaw}
            </span>
          )}
          {tx.notes && <span className="text-zinc-600 truncate max-w-[100px]" title={tx.notes}>· {tx.notes}</span>}
        </div>
      </td>
      <td className="px-3 py-2.5 text-right text-zinc-400">{formatUnits(tx.units)}</td>
      <td className="px-3 py-2.5 text-right text-zinc-400">
        {tx.currency === 'EUR' ? '€' : '$'}{tx.priceRaw?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
      </td>
      <td className="px-3 py-2.5 text-right text-zinc-500">
        {tx.currency === 'EUR' ? '€' : '$'}{total?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td className="px-3 py-2.5 text-right" colSpan={2}>
        {!isBuy && realizedPnl != null ? (
          <div>
            <span className={`font-medium text-sm ${realizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(realizedPnl, displayCurrency)}
            </span>
            {tx._realizedPnlPct != null && (
              <p className={`text-xs ${realizedPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {formatPercent(tx._realizedPnlPct)}
              </p>
            )}
          </div>
        ) : (
          <span className="text-zinc-700">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-right">
        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover/tx:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(tx)}
            className="text-zinc-700 hover:text-indigo-400 transition-colors p-1"
            title="Editar operación"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => onRemove(tx.id)}
            className="text-zinc-700 hover:text-red-400 transition-colors p-1"
            title="Eliminar operación"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </td>
    </tr>
  )
}

function PositionRow({ pos, displayCurrency, onRemove, onEdit, onAddTransaction, onManualPrice, onRename, isManualPrice, expanded, onToggle, editingPrice, setEditingPrice }) {
  const [renaming, setRenaming] = useState(false)
  const [renameVal, setRenameVal] = useState('')
  const [editPriceVal, setEditPriceVal] = useState('')

  function startRename(e) {
    e.stopPropagation()
    setRenameVal(displaySymbol(pos.symbol))
    setRenaming(true)
  }

  function commitRename(e) {
    e.stopPropagation()
    if (renameVal.trim() && renameVal.trim().toUpperCase() !== pos.symbol) {
      onRename(pos.symbol, renameVal.trim())
    }
    setRenaming(false)
  }

  function onRenameKey(e) {
    e.stopPropagation()
    if (e.key === 'Enter') commitRename(e)
    if (e.key === 'Escape') setRenaming(false)
  }

  function submitPriceEdit(e) {
    e.stopPropagation()
    const p = parseFloat(editPriceVal)
    if (!isNaN(p) && p > 0) {
      onManualPrice(pos.symbol, p, displayCurrency)
    }
    setEditingPrice(null)
    setEditPriceVal('')
  }

  function onPriceKey(e) {
    e.stopPropagation()
    if (e.key === 'Enter') submitPriceEdit(e)
    if (e.key === 'Escape') {
      setEditingPrice(null)
      setEditPriceVal('')
    }
  }

  const Icon = TYPE_ICONS[pos.type] ?? TrendingUp
  const isClosed = pos.isClosed

  return (
    <>
      <tr
        className={`border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors cursor-pointer group ${isClosed ? 'opacity-60' : ''}`}
        onClick={onToggle}
      >
        {/* Expand chevron + activo */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-zinc-600 w-4 shrink-0">
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${TYPE_COLORS[pos.type]}`}>
              <Icon size={14} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {renaming ? (
                  <input
                    autoFocus
                    value={renameVal}
                    onChange={e => setRenameVal(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={onRenameKey}
                    onClick={e => e.stopPropagation()}
                    className="w-24 bg-zinc-800 border border-indigo-500 rounded px-2 py-0.5 text-sm text-white uppercase outline-none"
                  />
                ) : (
                  <button
                    onClick={startRename}
                    title="Clic para cambiar ticker"
                    className="text-white font-semibold text-sm hover:text-indigo-300 transition-colors"
                  >
                    {displaySymbol(pos.symbol)}
                  </button>
                )}
                {isClosed && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-normal">cerrada</span>
                )}
              </div>
              <p className="text-zinc-500 text-xs truncate max-w-[140px]">{pos.name}</p>
            </div>
          </div>
        </td>

        {/* Unidades */}
        <td className="px-3 py-3 text-right">
          <span className="text-zinc-300 text-sm">{isClosed ? '—' : formatUnits(pos.openUnits)}</span>
        </td>

        {/* Coste medio */}
        <td className="px-3 py-3 text-right">
          <span className="text-zinc-400 text-sm">{formatCurrency(pos.avgCost, displayCurrency)}</span>
        </td>

        {/* Precio actual */}
        <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
          {isClosed ? (
            <span className="text-zinc-600 text-sm">—</span>
          ) : pos.hasPrice ? (
            editingPrice === pos.symbol && isManualPrice ? (
              <input
                autoFocus
                type="number"
                value={editPriceVal}
                onChange={(e) => setEditPriceVal(e.target.value)}
                onKeyDown={onPriceKey}
                onBlur={submitPriceEdit}
                placeholder="0.00"
                className="w-24 bg-zinc-800 border border-indigo-500 rounded px-2 py-1 text-sm text-white text-right outline-none"
              />
            ) : (
              <div className="flex items-center justify-end gap-1.5 group">
                <span className="text-sm text-white">{formatCurrency(pos.currentPrice, displayCurrency)}</span>
                {isManualPrice && (
                  <>
                    <AlertCircle size={13} className="text-amber-500" title="Precio manual" />
                    <button
                      onClick={() => {
                        setEditingPrice(pos.symbol)
                        setEditPriceVal(pos.currentPrice.toString())
                      }}
                      className="text-zinc-600 hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100"
                      title="Editar precio manual"
                    >
                      <Pencil size={11} />
                    </button>
                  </>
                )}
              </div>
            )
          ) : (
            <ManualPriceInput symbol={pos.symbol} displayCurrency={displayCurrency} onSave={onManualPrice} />
          )}
        </td>

        {/* Valor actual */}
        <td className="px-3 py-3 text-right">
          <span className={`text-sm font-medium ${isClosed || !pos.hasPrice ? 'text-zinc-600' : 'text-white'}`}>
            {!isClosed && pos.currentValue != null ? formatCurrency(pos.currentValue, displayCurrency) : '—'}
          </span>
        </td>

        {/* P&L realizado */}
        <td className="px-3 py-3 text-right">
          <PnlCell value={pos.realizedPnl} />
        </td>

        {/* P&L no realizado */}
        <td className="px-3 py-3 text-right">
          <PnlCell value={isClosed ? null : pos.unrealizedPnl} dim={!pos.hasPrice} />
        </td>

        {/* P&L total */}
        <td className="px-3 py-3 text-right">
          <PnlCell value={pos.totalPnl} pct={pos.totalPnlPct} />
        </td>

        {/* Acciones */}
        <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onAddTransaction(pos)}
            className="text-zinc-600 hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100 p-1 rounded"
            title="Nueva operación sobre este activo"
          >
            <Plus size={14} />
          </button>
        </td>
      </tr>

      {/* Filas de transacciones expandidas */}
      {expanded && (
        <>
          <tr className="bg-zinc-950">
            <td colSpan={9} className="pl-14 pr-3 pt-2 pb-1">
              <p className="text-xs text-zinc-600 uppercase tracking-wider">Operaciones</p>
            </td>
          </tr>
          {pos.transactions.map((tx) => (
            <TransactionSubRow
              key={tx.id}
              tx={tx}
              displayCurrency={displayCurrency}
              onRemove={onRemove}
              onEdit={onEdit}
            />
          ))}
        </>
      )}
    </>
  )
}

export default function PositionsTable({
  derivedPositions,
  displayCurrency,
  onRemoveTransaction,
  onEditTransaction,
  onAddTransaction,
  onManualPrice,
  onRename,
  manualPriceSymbols,
  editingPrice,
  setEditingPrice,
}) {
  const [expanded, setExpanded] = useState(new Set())

  function toggle(symbol) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(symbol) ? next.delete(symbol) : next.add(symbol)
      return next
    })
  }

  if (derivedPositions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
          <span className="text-3xl">📊</span>
        </div>
        <p className="text-zinc-400 font-medium mb-1">Sin operaciones registradas</p>
        <p className="text-zinc-600 text-sm">Añade tu primera compra o venta con el botón de arriba</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px]">
        <thead>
          <tr className="border-b border-zinc-800">
            {[
              ['Activo', 'left'],
              ['Unidades', 'right'],
              ['Coste medio', 'right'],
              ['P. actual', 'right'],
              ['Valor', 'right'],
              ['P&L realiz.', 'right'],
              ['P&L abierto', 'right'],
              ['P&L total', 'right'],
              ['', 'right'],
            ].map(([label, align]) => (
              <th
                key={label}
                className={`px-3 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider ${
                  align === 'right' ? 'text-right' : 'text-left'
                } ${label === 'Activo' ? 'pl-10' : ''}`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {derivedPositions.map((pos) => (
            <PositionRow
              key={pos.symbol}
              pos={pos}
              displayCurrency={displayCurrency}
              onRemove={onRemoveTransaction}
              onEdit={onEditTransaction}
              onAddTransaction={onAddTransaction}
              onManualPrice={onManualPrice}
              onRename={onRename}
              isManualPrice={manualPriceSymbols?.has(pos.symbol)}
              expanded={expanded.has(pos.symbol)}
              onToggle={() => toggle(pos.symbol)}
              editingPrice={editingPrice}
              setEditingPrice={setEditingPrice}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
